-- Mobile customer portal: read-only access to own leads/inquiries by phone match.
-- Requires logistix web tables: leads, lead_inquiries, customers (same Supabase project).
-- Does NOT modify web schema — only adds helper functions and a security-definer RPC.

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
