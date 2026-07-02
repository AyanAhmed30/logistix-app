-- Logistix App — all migrations combined (001, 003–013)
-- For reference or one-shot setup. Individual files remain in supabase/migrations/.
-- Requires logistix web tables: leads, lead_inquiries, customers (same Supabase project).

-- =============================================================================
-- 001_customers.sql
-- =============================================================================

-- Legacy note: mobile app auth uses public.users (see 005+), not public.customers.
-- public.customers is owned by the logistix web schema (name, phone_number, lead_id, etc.).
-- Do not create or alter public.customers here â€” portal RPCs read the web table as-is.

-- =============================================================================
-- 003_drop_phone_otps.sql
-- =============================================================================

-- Remove OTP storage from projects that applied 002_phone_otps.sql

drop function if exists public.count_recent_otp_requests(text, int);
drop function if exists public.get_auth_user_id_by_phone(text);
drop table if exists public.phone_otps;

-- =============================================================================
-- 004_login_by_phone.sql
-- =============================================================================

-- Legacy: no longer required. Mobile auth uses public.users; portal RPCs use web public.customers.

-- =============================================================================
-- 005_custom_users_auth.sql
-- =============================================================================

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

-- =============================================================================
-- 006_fix_pgcrypto.sql
-- =============================================================================

-- Fix: pgcrypto lives in the "extensions" schema on Supabase.
-- Run this in Supabase SQL Editor if signup fails with "gen_salt does not exist".

create extension if not exists pgcrypto with schema extensions;

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

-- =============================================================================
-- 007_fix_pgcrypto_grants.sql
-- =============================================================================

-- Run this in Supabase SQL Editor (fixes "gen_salt does not exist" on signup).

create extension if not exists pgcrypto with schema extensions;

grant usage on schema extensions to postgres, anon, authenticated, service_role;

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
declare
  v_hash text;
begin
  if length(p_password) < 8 then
    raise exception 'weak_password';
  end if;

  v_hash := extensions.crypt(p_password, extensions.gen_salt('bf'::text));

  return query
  insert into public.users (phone, email, first_name, last_name, password_hash)
  values (
    p_phone,
    lower(trim(p_email)),
    trim(p_first_name),
    trim(p_last_name),
    v_hash
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

-- =============================================================================
-- 008_direct_users_access.sql
-- =============================================================================

-- Direct table access for custom auth (no RPC, no Supabase Auth).
-- Run in Supabase SQL Editor.

drop function if exists public.register_user(text, text, text, text, text);
drop function if exists public.login_user(text, text);

grant select, insert on public.users to anon, authenticated;

drop policy if exists "anon can signup" on public.users;
create policy "anon can signup"
  on public.users
  for insert
  to anon, authenticated
  with check (true);

drop policy if exists "anon can login lookup" on public.users;
create policy "anon can login lookup"
  on public.users
  for select
  to anon, authenticated
  using (true);

-- =============================================================================
-- 009_mobile_customer_inquiry_access.sql
-- =============================================================================

-- Mobile customer portal: read-only access to own leads/inquiries by phone match.
-- Requires logistix web tables: leads, lead_inquiries, customers (same Supabase project).
-- Does NOT modify web schema â€” only adds helper functions and a security-definer RPC.

create or replace function public.normalize_phone_digits(p_phone text)
returns text
language sql
immutable
as $$
  select regexp_replace(coalesce(trim(p_phone), ''), '[^0-9]', '', 'g');
$$;

create or replace function public.phones_match(p_a text, p_b text)
returns boolean
language sql
immutable
as $$
  select
    length(a) > 0
    and length(b) > 0
    and (
      a = b
      or (
        length(a) >= 7
        and length(b) >= 7
        and (a like '%' || b or b like '%' || a)
      )
    )
  from (
    select
      public.normalize_phone_digits(p_a) as a,
      public.normalize_phone_digits(p_b) as b
  ) s;
$$;

-- Returns customer-safe lead + inquiry data for a registered mobile user phone.
-- Excludes internal costing, admin approvals, calculator values, and ops notes.
create or replace function public.get_customer_portal_by_phone(p_phone text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_exists boolean;
  v_result jsonb;
begin
  if public.normalize_phone_digits(p_phone) is null
     or length(public.normalize_phone_digits(p_phone)) < 7 then
    return jsonb_build_object('leads', '[]'::jsonb, 'inquiries', '[]'::jsonb);
  end if;

  select exists (
    select 1
    from public.users u
    where public.phones_match(u.phone, p_phone)
  )
  into v_user_exists;

  if not v_user_exists then
    raise exception 'unauthorized_phone' using errcode = '42501';
  end if;

  with matched_leads as (
    select distinct
      l.id,
      l.name,
      l.lead_id_formatted,
      l.status,
      l.created_at
    from public.leads l
    where public.phones_match(l.number, p_phone)

    union

    select distinct
      l.id,
      l.name,
      l.lead_id_formatted,
      l.status,
      l.created_at
    from public.customers c
    join public.leads l on l.id = c.lead_id
    where c.lead_id is not null
      and public.phones_match(c.phone_number, p_phone)
  ),
  matched_inquiries as (
    select
      li.id,
      li.lead_id,
      ml.lead_id_formatted,
      li.product_name,
      li.status,
      li.created_at,
      li.sent_at,
      li.version_number
    from public.lead_inquiries li
    join matched_leads ml on ml.id = li.lead_id
    where coalesce(li.is_current_version, true) = true
      and li.sent_to_accounting = true
    order by li.created_at desc
  )
  select jsonb_build_object(
    'leads',
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'id', ml.id,
            'name', ml.name,
            'lead_number', ml.lead_id_formatted,
            'status', ml.status,
            'created_at', ml.created_at
          )
          order by ml.created_at desc
        )
        from matched_leads ml
      ),
      '[]'::jsonb
    ),
    'inquiries',
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'id', mi.id,
            'lead_id', mi.lead_id,
            'lead_number', mi.lead_id_formatted,
            'inquiry_number',
              coalesce(
                nullif(mi.version_number::text, ''),
                upper(left(replace(mi.id::text, '-', ''), 8))
              ),
            'product_name', nullif(trim(mi.product_name), ''),
            'status', mi.status,
            'created_at', mi.created_at,
            'sent_at', mi.sent_at,
            'shipping_mark', null,
            'origin', null,
            'destination', null
          )
          order by mi.created_at desc
        )
        from matched_inquiries mi
      ),
      '[]'::jsonb
    )
  )
  into v_result;

  return v_result;
end;
$$;

revoke all on function public.get_customer_portal_by_phone(text) from public;
grant execute on function public.get_customer_portal_by_phone(text) to anon, authenticated;

-- =============================================================================
-- 010_fix_phone_match_pakistan.sql
-- =============================================================================

-- Fix phone matching between web leads (e.g. 03001234567) and mobile users (e.g. +923001234567).
-- Pakistan local numbers use a leading 0; mobile app stores E.164 with country code 92.

create or replace function public.phone_match_key(p_phone text)
returns text
language plpgsql
immutable
as $$
declare
  d text;
begin
  d := public.normalize_phone_digits(p_phone);

  if length(d) = 0 then
    return '';
  end if;

  -- Pakistan local: 03XXXXXXXXX or 0XXXXXXXXXX â†’ 92XXXXXXXXXX
  if length(d) = 11 and left(d, 1) = '0' then
    return '92' || substring(d from 2);
  end if;

  return d;
end;
$$;

create or replace function public.phones_match(p_a text, p_b text)
returns boolean
language sql
immutable
as $$
  with normalized as (
    select
      public.phone_match_key(p_a) as ka,
      public.phone_match_key(p_b) as kb,
      public.normalize_phone_digits(p_a) as da,
      public.normalize_phone_digits(p_b) as db
  )
  select
    length(ka) > 0
    and length(kb) > 0
    and (
      ka = kb
      or (
        length(da) >= 10
        and length(db) >= 10
        and right(da, 10) = right(db, 10)
      )
      or (
        length(ka) >= 7
        and length(kb) >= 7
        and (ka like '%' || kb or kb like '%' || ka)
      )
    )
  from normalized;
$$;

-- Re-create RPC so it picks up the updated phones_match (function body unchanged).
create or replace function public.get_customer_portal_by_phone(p_phone text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_exists boolean;
  v_result jsonb;
begin
  if public.normalize_phone_digits(p_phone) is null
     or length(public.normalize_phone_digits(p_phone)) < 7 then
    return jsonb_build_object('leads', '[]'::jsonb, 'inquiries', '[]'::jsonb);
  end if;

  select exists (
    select 1
    from public.users u
    where public.phones_match(u.phone, p_phone)
  )
  into v_user_exists;

  if not v_user_exists then
    raise exception 'unauthorized_phone' using errcode = '42501';
  end if;

  with matched_leads as (
    select distinct
      l.id,
      l.name,
      l.lead_id_formatted,
      l.status,
      l.created_at
    from public.leads l
    where public.phones_match(l.number, p_phone)

    union

    select distinct
      l.id,
      l.name,
      l.lead_id_formatted,
      l.status,
      l.created_at
    from public.customers c
    join public.leads l on l.id = c.lead_id
    where c.lead_id is not null
      and public.phones_match(c.phone_number, p_phone)
  ),
  matched_inquiries as (
    select
      li.id,
      li.lead_id,
      ml.lead_id_formatted,
      li.product_name,
      li.status,
      li.created_at,
      li.sent_at,
      li.version_number
    from public.lead_inquiries li
    join matched_leads ml on ml.id = li.lead_id
    where coalesce(li.is_current_version, true) = true
      and li.sent_to_accounting = true
    order by li.created_at desc
  )
  select jsonb_build_object(
    'leads',
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'id', ml.id,
            'name', ml.name,
            'lead_number', ml.lead_id_formatted,
            'status', ml.status,
            'created_at', ml.created_at
          )
          order by ml.created_at desc
        )
        from matched_leads ml
      ),
      '[]'::jsonb
    ),
    'inquiries',
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'id', mi.id,
            'lead_id', mi.lead_id,
            'lead_number', mi.lead_id_formatted,
            'inquiry_number',
              coalesce(
                nullif(mi.version_number::text, ''),
                upper(left(replace(mi.id::text, '-', ''), 8))
              ),
            'product_name', nullif(trim(mi.product_name), ''),
            'status', mi.status,
            'created_at', mi.created_at,
            'sent_at', mi.sent_at,
            'shipping_mark', null,
            'origin', null,
            'destination', null
          )
          order by mi.created_at desc
        )
        from matched_inquiries mi
      ),
      '[]'::jsonb
    )
  )
  into v_result;

  return v_result;
end;
$$;

revoke all on function public.get_customer_portal_by_phone(text) from public;
grant execute on function public.get_customer_portal_by_phone(text) to anon, authenticated;

-- =============================================================================
-- 011_customer_inquiry_product_details.sql
-- =============================================================================

-- Extend customer portal RPC with full product information from lead_inquiries.
-- Excludes internal fields: calculator_values, approval_status, ops confirmations.

create or replace function public.get_customer_portal_by_phone(p_phone text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_exists boolean;
  v_result jsonb;
begin
  if public.normalize_phone_digits(p_phone) is null
     or length(public.normalize_phone_digits(p_phone)) < 7 then
    return jsonb_build_object('leads', '[]'::jsonb, 'inquiries', '[]'::jsonb);
  end if;

  select exists (
    select 1
    from public.users u
    where public.phones_match(u.phone, p_phone)
  )
  into v_user_exists;

  if not v_user_exists then
    raise exception 'unauthorized_phone' using errcode = '42501';
  end if;

  with matched_leads as (
    select distinct
      l.id,
      l.name,
      l.lead_id_formatted,
      l.status,
      l.created_at
    from public.leads l
    where public.phones_match(l.number, p_phone)

    union

    select distinct
      l.id,
      l.name,
      l.lead_id_formatted,
      l.status,
      l.created_at
    from public.customers c
    join public.leads l on l.id = c.lead_id
    where c.lead_id is not null
      and public.phones_match(c.phone_number, p_phone)
  ),
  matched_inquiries as (
    select
      li.id,
      li.lead_id,
      ml.lead_id_formatted,
      li.product_name,
      li.description,
      li.quantity,
      li.total_weight,
      li.cbm,
      li.link_url,
      li.image_url,
      coalesce(li.additional_image_urls, '[]'::jsonb) as additional_image_urls,
      li.status,
      li.created_at,
      li.sent_at,
      li.updated_at,
      li.version_number
    from public.lead_inquiries li
    join matched_leads ml on ml.id = li.lead_id
    where coalesce(li.is_current_version, true) = true
      and li.sent_to_accounting = true
    order by li.created_at desc
  )
  select jsonb_build_object(
    'leads',
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'id', ml.id,
            'name', ml.name,
            'lead_number', ml.lead_id_formatted,
            'status', ml.status,
            'created_at', ml.created_at
          )
          order by ml.created_at desc
        )
        from matched_leads ml
      ),
      '[]'::jsonb
    ),
    'inquiries',
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'id', mi.id,
            'lead_id', mi.lead_id,
            'lead_number', mi.lead_id_formatted,
            'inquiry_number',
              coalesce(
                nullif(mi.version_number::text, ''),
                upper(left(replace(mi.id::text, '-', ''), 8))
              ),
            'product_name', nullif(trim(mi.product_name), ''),
            'description', nullif(trim(mi.description), ''),
            'quantity', nullif(trim(mi.quantity), ''),
            'total_weight', nullif(trim(mi.total_weight), ''),
            'cbm', nullif(trim(mi.cbm), ''),
            'link_url', nullif(trim(mi.link_url), ''),
            'image_url', nullif(trim(mi.image_url), ''),
            'additional_image_urls', mi.additional_image_urls,
            'status', mi.status,
            'created_at', mi.created_at,
            'sent_at', mi.sent_at,
            'updated_at', mi.updated_at,
            'shipping_mark', null,
            'origin', null,
            'destination', null
          )
          order by mi.created_at desc
        )
        from matched_inquiries mi
      ),
      '[]'::jsonb
    )
  )
  into v_result;

  return v_result;
end;
$$;

revoke all on function public.get_customer_portal_by_phone(text) from public;
grant execute on function public.get_customer_portal_by_phone(text) to anon, authenticated;

-- =============================================================================
-- 012_show_all_sent_inquiries.sql
-- =============================================================================

-- Show every sent inquiry for a lead on the customer portal (one lead â†’ many inquiries).
-- Previously only is_current_version = true rows were returned, which hid older inquiries
-- after a second inquiry was created on the same lead.

update public.lead_inquiries
set is_current_version = true,
    updated_at = now()
where sent_to_accounting = true
  and coalesce(is_current_version, true) = false;

create or replace function public.get_customer_portal_by_phone(p_phone text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_exists boolean;
  v_result jsonb;
begin
  if public.normalize_phone_digits(p_phone) is null
     or length(public.normalize_phone_digits(p_phone)) < 7 then
    return jsonb_build_object('leads', '[]'::jsonb, 'inquiries', '[]'::jsonb);
  end if;

  select exists (
    select 1
    from public.users u
    where public.phones_match(u.phone, p_phone)
  )
  into v_user_exists;

  if not v_user_exists then
    raise exception 'unauthorized_phone' using errcode = '42501';
  end if;

  with matched_leads as (
    select distinct
      l.id,
      l.name,
      l.lead_id_formatted,
      l.status,
      l.created_at
    from public.leads l
    where public.phones_match(l.number, p_phone)

    union

    select distinct
      l.id,
      l.name,
      l.lead_id_formatted,
      l.status,
      l.created_at
    from public.customers c
    join public.leads l on l.id = c.lead_id
    where c.lead_id is not null
      and public.phones_match(c.phone_number, p_phone)
  ),
  matched_inquiries as (
    select
      li.id,
      li.lead_id,
      ml.lead_id_formatted,
      li.product_name,
      li.description,
      li.quantity,
      li.total_weight,
      li.cbm,
      li.link_url,
      li.image_url,
      coalesce(li.additional_image_urls, '[]'::jsonb) as additional_image_urls,
      li.status,
      li.created_at,
      li.sent_at,
      li.updated_at,
      li.version_number
    from public.lead_inquiries li
    join matched_leads ml on ml.id = li.lead_id
    where li.sent_to_accounting = true
    order by li.created_at desc
  )
  select jsonb_build_object(
    'leads',
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'id', ml.id,
            'name', ml.name,
            'lead_number', ml.lead_id_formatted,
            'status', ml.status,
            'created_at', ml.created_at
          )
          order by ml.created_at desc
        )
        from matched_leads ml
      ),
      '[]'::jsonb
    ),
    'inquiries',
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'id', mi.id,
            'lead_id', mi.lead_id,
            'lead_number', mi.lead_id_formatted,
            'inquiry_number',
              coalesce(
                nullif(mi.version_number::text, ''),
                upper(left(replace(mi.id::text, '-', ''), 8))
              ),
            'product_name', nullif(trim(mi.product_name), ''),
            'description', nullif(trim(mi.description), ''),
            'quantity', nullif(trim(mi.quantity), ''),
            'total_weight', nullif(trim(mi.total_weight), ''),
            'cbm', nullif(trim(mi.cbm), ''),
            'link_url', nullif(trim(mi.link_url), ''),
            'image_url', nullif(trim(mi.image_url), ''),
            'additional_image_urls', mi.additional_image_urls,
            'status', mi.status,
            'created_at', mi.created_at,
            'sent_at', mi.sent_at,
            'updated_at', mi.updated_at,
            'shipping_mark', null,
            'origin', null,
            'destination', null
          )
          order by mi.created_at desc
        )
        from matched_inquiries mi
      ),
      '[]'::jsonb
    )
  )
  into v_result;

  return v_result;
end;
$$;

revoke all on function public.get_customer_portal_by_phone(text) from public;
grant execute on function public.get_customer_portal_by_phone(text) to anon, authenticated;

-- =============================================================================
-- 013_customer_portal_by_user_id.sql
-- =============================================================================

-- Customer portal: resolve inquiries from the logged-in mobile user id (not client-supplied phone).
-- Tightens phone matching to prevent cross-customer leakage from loose suffix matching.

create or replace function public.phones_match(p_a text, p_b text)
returns boolean
language sql
immutable
as $$
  with normalized as (
    select
      public.phone_match_key(p_a) as ka,
      public.phone_match_key(p_b) as kb,
      public.normalize_phone_digits(p_a) as da,
      public.normalize_phone_digits(p_b) as db
  )
  select
    length(ka) > 0
    and length(kb) > 0
    and (
      ka = kb
      or (
        length(da) >= 10
        and length(db) >= 10
        and right(da, 10) = right(db, 10)
      )
    )
  from normalized;
$$;

-- Internal: build portal payload for a canonical mobile-user phone stored in public.users.
create or replace function public._customer_portal_for_user_phone(p_user_phone text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_result jsonb;
begin
  if public.normalize_phone_digits(p_user_phone) is null
     or length(public.normalize_phone_digits(p_user_phone)) < 7 then
    return jsonb_build_object('leads', '[]'::jsonb, 'inquiries', '[]'::jsonb);
  end if;

  with matched_leads as (
    select distinct
      l.id,
      l.name,
      l.lead_id_formatted,
      l.status,
      l.created_at
    from public.leads l
    where public.phones_match(l.number, p_user_phone)

    union

    select distinct
      l.id,
      l.name,
      l.lead_id_formatted,
      l.status,
      l.created_at
    from public.customers c
    join public.leads l on l.id = c.lead_id
    where c.lead_id is not null
      and public.phones_match(c.phone_number, p_user_phone)
  ),
  matched_inquiries as (
    select
      li.id,
      li.lead_id,
      ml.lead_id_formatted,
      li.product_name,
      li.description,
      li.quantity,
      li.total_weight,
      li.cbm,
      li.link_url,
      li.image_url,
      coalesce(li.additional_image_urls, '[]'::jsonb) as additional_image_urls,
      li.status,
      li.created_at,
      li.sent_at,
      li.updated_at,
      li.version_number
    from public.lead_inquiries li
    join matched_leads ml on ml.id = li.lead_id
    where li.sent_to_accounting = true
    order by li.created_at desc
  )
  select jsonb_build_object(
    'leads',
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'id', ml.id,
            'name', ml.name,
            'lead_number', ml.lead_id_formatted,
            'status', ml.status,
            'created_at', ml.created_at
          )
          order by ml.created_at desc
        )
        from matched_leads ml
      ),
      '[]'::jsonb
    ),
    'inquiries',
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'id', mi.id,
            'lead_id', mi.lead_id,
            'lead_number', mi.lead_id_formatted,
            'inquiry_number',
              coalesce(
                nullif(mi.version_number::text, ''),
                upper(left(replace(mi.id::text, '-', ''), 8))
              ),
            'product_name', nullif(trim(mi.product_name), ''),
            'description', nullif(trim(mi.description), ''),
            'quantity', nullif(trim(mi.quantity), ''),
            'total_weight', nullif(trim(mi.total_weight), ''),
            'cbm', nullif(trim(mi.cbm), ''),
            'link_url', nullif(trim(mi.link_url), ''),
            'image_url', nullif(trim(mi.image_url), ''),
            'additional_image_urls', mi.additional_image_urls,
            'status', mi.status,
            'created_at', mi.created_at,
            'sent_at', mi.sent_at,
            'updated_at', mi.updated_at,
            'shipping_mark', null,
            'origin', null,
            'destination', null
          )
          order by mi.created_at desc
        )
        from matched_inquiries mi
      ),
      '[]'::jsonb
    )
  )
  into v_result;

  return v_result;
end;
$$;

-- Preferred entry point for the mobile app: uses the registered user's stored phone server-side.
create or replace function public.get_customer_portal_by_user_id(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_phone text;
begin
  if p_user_id is null then
    raise exception 'unauthorized_user' using errcode = '42501';
  end if;

  select u.phone
  into v_phone
  from public.users u
  where u.id = p_user_id;

  if v_phone is null then
    raise exception 'unauthorized_user' using errcode = '42501';
  end if;

  return public._customer_portal_for_user_phone(v_phone);
end;
$$;

-- Backward-compatible phone entry point (uses canonical phone from users table).
create or replace function public.get_customer_portal_by_phone(p_phone text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_phone text;
begin
  select u.phone
  into v_phone
  from public.users u
  where public.phones_match(u.phone, p_phone)
  limit 1;

  if v_phone is null then
    raise exception 'unauthorized_phone' using errcode = '42501';
  end if;

  return public._customer_portal_for_user_phone(v_phone);
end;
$$;

revoke all on function public._customer_portal_for_user_phone(text) from public;
revoke all on function public.get_customer_portal_by_user_id(uuid) from public;
revoke all on function public.get_customer_portal_by_phone(text) from public;

grant execute on function public.get_customer_portal_by_user_id(uuid) to anon, authenticated;
grant execute on function public.get_customer_portal_by_phone(text) to anon, authenticated;

