-- Show every sent inquiry for a lead on the customer portal (one lead → many inquiries).
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
