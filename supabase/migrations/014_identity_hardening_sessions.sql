-- Step 2 P0 — Identity hardening (Option B: opaque server sessions)
-- Prerequisites: migrations 005–007 (users + pgcrypto) and 009–013 (customer portal helper).
-- 1) Stop anon SELECT/INSERT on public.users (no password_hash to clients)
-- 2) Login/register via SECURITY DEFINER RPCs that issue session tokens
-- 3) Portal requires a valid session token (not a client-supplied user id)
-- 4) Revoke deprecated phone / user-id portal RPCs from anon

create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------------
-- Sessions
-- ---------------------------------------------------------------------------

create table if not exists public.user_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  token text not null unique,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  revoked_at timestamptz null,
  constraint user_sessions_token_nonempty check (length(token) >= 32)
);

create index if not exists user_sessions_user_id_idx on public.user_sessions (user_id);
create index if not exists user_sessions_token_idx on public.user_sessions (token);
create index if not exists user_sessions_expires_at_idx on public.user_sessions (expires_at);

alter table public.user_sessions enable row level security;

revoke all on public.user_sessions from anon, authenticated;
grant all on public.user_sessions to service_role;

-- ---------------------------------------------------------------------------
-- Lock down public.users (reverse 008 open policies)
-- ---------------------------------------------------------------------------

drop policy if exists "anon can signup" on public.users;
drop policy if exists "anon can login lookup" on public.users;

revoke all on public.users from anon, authenticated;
grant all on public.users to service_role;

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create or replace function public._issue_user_session(p_user_id uuid)
returns table (
  session_token text,
  expires_at timestamptz
)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_token text;
  v_expires timestamptz;
begin
  v_token := encode(extensions.gen_random_bytes(32), 'hex');
  v_expires := now() + interval '30 days';

  insert into public.user_sessions (user_id, token, expires_at)
  values (p_user_id, v_token, v_expires);

  session_token := v_token;
  expires_at := v_expires;
  return next;
end;
$$;

create or replace function public._resolve_session_user_id(p_session_token text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
begin
  if p_session_token is null or length(trim(p_session_token)) < 32 then
    raise exception 'invalid_session' using errcode = '42501';
  end if;

  select s.user_id
  into v_user_id
  from public.user_sessions s
  where s.token = trim(p_session_token)
    and s.revoked_at is null
    and s.expires_at > now()
  limit 1;

  if v_user_id is null then
    raise exception 'invalid_session' using errcode = '42501';
  end if;

  return v_user_id;
end;
$$;

revoke all on function public._issue_user_session(uuid) from public;
revoke all on function public._resolve_session_user_id(text) from public;

-- ---------------------------------------------------------------------------
-- Auth RPCs (password verified in DB; never return password_hash)
-- Return type changed from TABLE → JSONB, so drop first.
-- ---------------------------------------------------------------------------

drop function if exists public.register_user(text, text, text, text, text);
drop function if exists public.login_user(text, text);

create or replace function public.register_user(
  p_phone text,
  p_email text,
  p_first_name text,
  p_last_name text,
  p_password text
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_user public.users%rowtype;
begin
  if p_phone is null or length(trim(p_phone)) < 7 then
    raise exception 'invalid_phone';
  end if;

  if length(coalesce(p_password, '')) < 8 then
    raise exception 'weak_password';
  end if;

  begin
    insert into public.users (phone, email, first_name, last_name, password_hash)
    values (
      trim(p_phone),
      lower(trim(p_email)),
      trim(p_first_name),
      trim(p_last_name),
      extensions.crypt(p_password, extensions.gen_salt('bf'::text))
    )
    returning * into v_user;
  exception
    when unique_violation then
      if SQLERRM ilike '%users_phone_key%' or SQLERRM ilike '%phone%' then
        raise exception 'duplicate_phone';
      elsif SQLERRM ilike '%users_email_key%' or SQLERRM ilike '%email%' then
        raise exception 'duplicate_email';
      else
        raise exception 'duplicate_account';
      end if;
  end;

  -- No session here — customer signs in after signup (issues a session then).
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

create or replace function public.login_user(p_phone text, p_password text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_user public.users%rowtype;
  v_session record;
begin
  select * into v_user
  from public.users
  where phone = trim(p_phone)
  limit 1;

  if not found then
    raise exception 'invalid_credentials';
  end if;

  -- Works for pgcrypto bf hashes and existing client bcryptjs hashes.
  if v_user.password_hash is distinct from extensions.crypt(p_password, v_user.password_hash) then
    raise exception 'invalid_credentials';
  end if;

  select * into v_session from public._issue_user_session(v_user.id);

  return jsonb_build_object(
    'user', jsonb_build_object(
      'id', v_user.id,
      'phone', v_user.phone,
      'email', v_user.email,
      'first_name', v_user.first_name,
      'last_name', v_user.last_name,
      'created_at', v_user.created_at
    ),
    'session_token', v_session.session_token,
    'expires_at', v_session.expires_at
  );
end;
$$;

create or replace function public.logout_user(p_session_token text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_session_token is null or length(trim(p_session_token)) < 32 then
    return false;
  end if;

  update public.user_sessions
  set revoked_at = now()
  where token = trim(p_session_token)
    and revoked_at is null;

  return found;
end;
$$;

create or replace function public.validate_user_session(p_session_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_user public.users%rowtype;
  v_expires timestamptz;
begin
  v_user_id := public._resolve_session_user_id(p_session_token);

  select s.expires_at into v_expires
  from public.user_sessions s
  where s.token = trim(p_session_token)
    and s.revoked_at is null
  limit 1;

  select * into v_user from public.users where id = v_user_id;

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
    ),
    'session_token', trim(p_session_token),
    'expires_at', v_expires
  );
end;
$$;

-- Lightweight connectivity probe (does not touch users table as anon).
create or replace function public.auth_ping()
returns timestamptz
language sql
security definer
set search_path = public
as $$
  select now();
$$;

-- ---------------------------------------------------------------------------
-- Portal: session-bound entry point
-- ---------------------------------------------------------------------------

create or replace function public.get_customer_portal_by_session(p_session_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_phone text;
begin
  v_user_id := public._resolve_session_user_id(p_session_token);

  select u.phone into v_phone
  from public.users u
  where u.id = v_user_id;

  if v_phone is null then
    raise exception 'unauthorized_user' using errcode = '42501';
  end if;

  return public._customer_portal_for_user_phone(v_phone);
end;
$$;

-- Keep legacy function for service_role/admin only — do not grant to anon.
revoke all on function public.get_customer_portal_by_user_id(uuid) from public;
revoke all on function public.get_customer_portal_by_user_id(uuid) from anon, authenticated;
grant execute on function public.get_customer_portal_by_user_id(uuid) to service_role;

revoke all on function public.get_customer_portal_by_phone(text) from public;
revoke all on function public.get_customer_portal_by_phone(text) from anon, authenticated;
grant execute on function public.get_customer_portal_by_phone(text) to service_role;

revoke all on function public.register_user(text, text, text, text, text) from public;
revoke all on function public.login_user(text, text) from public;
revoke all on function public.logout_user(text) from public;
revoke all on function public.validate_user_session(text) from public;
revoke all on function public.get_customer_portal_by_session(text) from public;
revoke all on function public.auth_ping() from public;

grant execute on function public.register_user(text, text, text, text, text) to anon, authenticated;
grant execute on function public.login_user(text, text) to anon, authenticated;
grant execute on function public.logout_user(text) to anon, authenticated;
grant execute on function public.validate_user_session(text) to anon, authenticated;
grant execute on function public.get_customer_portal_by_session(text) to anon, authenticated;
grant execute on function public.auth_ping() to anon, authenticated;
