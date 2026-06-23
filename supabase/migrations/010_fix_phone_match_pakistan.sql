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

  -- Pakistan local: 03XXXXXXXXX or 0XXXXXXXXXX → 92XXXXXXXXXX
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
