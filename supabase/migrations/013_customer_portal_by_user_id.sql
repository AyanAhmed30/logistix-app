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
