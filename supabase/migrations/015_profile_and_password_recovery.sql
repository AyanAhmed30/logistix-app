-- Step 2 remaining — Profile update, change password, forgot-password (identity-verified)
-- Prerequisites: 014_identity_hardening_sessions.sql
--
-- Forgot-password strategy (no SMS gateway in stack yet):
-- User must prove phone + account email, then receives a short-lived reset token
-- to set a new password. This avoids returning codes to anonymous callers who
-- only know a phone number.

create extension if not exists pgcrypto with schema extensions;

create table if not exists public.password_reset_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  token text not null unique,
  expires_at timestamptz not null,
  used_at timestamptz null,
  created_at timestamptz not null default now(),
  constraint password_reset_tokens_token_nonempty check (length(token) >= 32)
);

create index if not exists password_reset_tokens_user_id_idx
  on public.password_reset_tokens (user_id);
create index if not exists password_reset_tokens_token_idx
  on public.password_reset_tokens (token);

alter table public.password_reset_tokens enable row level security;
revoke all on public.password_reset_tokens from anon, authenticated;
grant all on public.password_reset_tokens to service_role;

-- ---------------------------------------------------------------------------
-- Profile update (session-bound). Phone is NOT updatable here — it drives
-- customer↔lead matching.
-- ---------------------------------------------------------------------------

create or replace function public.update_customer_profile(
  p_session_token text,
  p_first_name text,
  p_last_name text,
  p_email text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_user public.users%rowtype;
  v_email text;
begin
  v_user_id := public._resolve_session_user_id(p_session_token);

  v_email := lower(trim(coalesce(p_email, '')));
  if v_email = '' or position('@' in v_email) = 0 then
    raise exception 'invalid_email';
  end if;

  if length(trim(coalesce(p_first_name, ''))) < 1 then
    raise exception 'invalid_first_name';
  end if;

  if length(trim(coalesce(p_last_name, ''))) < 1 then
    raise exception 'invalid_last_name';
  end if;

  begin
    update public.users
    set
      first_name = trim(p_first_name),
      last_name = trim(p_last_name),
      email = v_email
    where id = v_user_id
    returning * into v_user;
  exception
    when unique_violation then
      raise exception 'duplicate_email';
  end;

  if not found then
    raise exception 'invalid_session' using errcode = '42501';
  end if;

  return jsonb_build_object(
    'user', jsonb_build_object(
      'id', v_user.id,
      'phone', v_user.phone,
      'email', v_user.email,
      'first_name', v_user.first_name,
      'last_name', v_user.last_name,
      'created_at', v_user.created_at
    )
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Change password (logged-in)
-- ---------------------------------------------------------------------------

create or replace function public.change_customer_password(
  p_session_token text,
  p_current_password text,
  p_new_password text
)
returns boolean
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_user_id uuid;
  v_user public.users%rowtype;
begin
  v_user_id := public._resolve_session_user_id(p_session_token);

  select * into v_user from public.users where id = v_user_id;
  if not found then
    raise exception 'invalid_session' using errcode = '42501';
  end if;

  if v_user.password_hash is distinct from extensions.crypt(p_current_password, v_user.password_hash) then
    raise exception 'invalid_credentials';
  end if;

  if length(coalesce(p_new_password, '')) < 8 then
    raise exception 'weak_password';
  end if;

  if p_new_password = p_current_password then
    raise exception 'password_unchanged';
  end if;

  update public.users
  set password_hash = extensions.crypt(p_new_password, extensions.gen_salt('bf'::text))
  where id = v_user_id;

  -- Revoke other sessions except current (optional hardening): leave current valid.
  update public.user_sessions
  set revoked_at = now()
  where user_id = v_user_id
    and token is distinct from trim(p_session_token)
    and revoked_at is null;

  return true;
end;
$$;

-- ---------------------------------------------------------------------------
-- Forgot password: phone + email verification → reset token → set password
-- ---------------------------------------------------------------------------

create or replace function public.request_password_reset(
  p_phone text,
  p_email text
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_user public.users%rowtype;
  v_token text;
  v_expires timestamptz;
  v_email text;
begin
  v_email := lower(trim(coalesce(p_email, '')));

  -- Anti-enumeration: always succeed from the client's perspective when inputs
  -- are well-formed; only issue a token when phone+email match an account.
  if p_phone is null or length(trim(p_phone)) < 7 or v_email = '' then
    return jsonb_build_object(
      'ok', true,
      'reset_token', encode(extensions.gen_random_bytes(32), 'hex'),
      'expires_at', now() + interval '20 minutes'
    );
  end if;

  select * into v_user
  from public.users
  where phone = trim(p_phone)
    and email = v_email
  limit 1;

  if not found then
    -- Same response shape as success (anti-enumeration). Token will not validate.
    return jsonb_build_object(
      'ok', true,
      'reset_token', encode(extensions.gen_random_bytes(32), 'hex'),
      'expires_at', now() + interval '20 minutes'
    );
  end if;

  -- Invalidate prior unused tokens for this user
  update public.password_reset_tokens
  set used_at = now()
  where user_id = v_user.id
    and used_at is null;

  v_token := encode(extensions.gen_random_bytes(32), 'hex');
  v_expires := now() + interval '20 minutes';

  insert into public.password_reset_tokens (user_id, token, expires_at)
  values (v_user.id, v_token, v_expires);

  return jsonb_build_object(
    'ok', true,
    'reset_token', v_token,
    'expires_at', v_expires
  );
end;
$$;

create or replace function public.complete_password_reset(
  p_reset_token text,
  p_new_password text
)
returns boolean
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_row public.password_reset_tokens%rowtype;
begin
  if p_reset_token is null or length(trim(p_reset_token)) < 32 then
    raise exception 'invalid_reset_token';
  end if;

  if length(coalesce(p_new_password, '')) < 8 then
    raise exception 'weak_password';
  end if;

  select * into v_row
  from public.password_reset_tokens
  where token = trim(p_reset_token)
    and used_at is null
    and expires_at > now()
  limit 1;

  if not found then
    raise exception 'invalid_reset_token';
  end if;

  update public.users
  set password_hash = extensions.crypt(p_new_password, extensions.gen_salt('bf'::text))
  where id = v_row.user_id;

  update public.password_reset_tokens
  set used_at = now()
  where id = v_row.id;

  -- Force re-login on all devices
  update public.user_sessions
  set revoked_at = now()
  where user_id = v_row.user_id
    and revoked_at is null;

  return true;
end;
$$;

revoke all on function public.update_customer_profile(text, text, text, text) from public;
revoke all on function public.change_customer_password(text, text, text) from public;
revoke all on function public.request_password_reset(text, text) from public;
revoke all on function public.complete_password_reset(text, text) from public;

grant execute on function public.update_customer_profile(text, text, text, text) to anon, authenticated;
grant execute on function public.change_customer_password(text, text, text) to anon, authenticated;
grant execute on function public.request_password_reset(text, text) to anon, authenticated;
grant execute on function public.complete_password_reset(text, text) to anon, authenticated;
