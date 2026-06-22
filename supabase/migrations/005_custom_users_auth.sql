-- Custom auth: Supabase is database-only (no Supabase Auth).
-- Passwords are hashed server-side with bcrypt via pgcrypto.

create extension if not exists pgcrypto with schema extensions;

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  phone text not null,
  email text not null,
  first_name text not null,
  last_name text not null,
  password_hash text not null,
  created_at timestamptz not null default now(),
  constraint users_phone_key unique (phone),
  constraint users_email_key unique (email)
);

alter table public.users enable row level security;

-- No direct table access for clients; use RPC functions below.
revoke all on public.users from anon, authenticated;
grant all on public.users to service_role;

create or replace function public.register_user(
  p_phone text,
  p_email text,
  p_first_name text,
  p_last_name text,
  p_password text
)
returns table (
  id uuid,
  phone text,
  email text,
  first_name text,
  last_name text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if length(p_password) < 8 then
    raise exception 'weak_password';
  end if;

  return query
  insert into public.users (phone, email, first_name, last_name, password_hash)
  values (
    p_phone,
    lower(trim(p_email)),
    trim(p_first_name),
    trim(p_last_name),
    extensions.crypt(p_password, extensions.gen_salt('bf'))
  )
  returning
    users.id,
    users.phone,
    users.email,
    users.first_name,
    users.last_name,
    users.created_at;
exception
  when unique_violation then
    raise exception 'duplicate_account';
end;
$$;

create or replace function public.login_user(p_phone text, p_password text)
returns table (
  id uuid,
  phone text,
  email text,
  first_name text,
  last_name text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_user public.users%rowtype;
begin
  select * into v_user from public.users where phone = p_phone limit 1;

  if not found then
    raise exception 'invalid_credentials';
  end if;

  if v_user.password_hash is distinct from extensions.crypt(p_password, v_user.password_hash) then
    raise exception 'invalid_credentials';
  end if;

  return query
  select
    v_user.id,
    v_user.phone,
    v_user.email,
    v_user.first_name,
    v_user.last_name,
    v_user.created_at;
end;
$$;

revoke all on function public.register_user(text, text, text, text, text) from public;
revoke all on function public.login_user(text, text) from public;
grant execute on function public.register_user(text, text, text, text, text) to anon, authenticated;
grant execute on function public.login_user(text, text) to anon, authenticated;
