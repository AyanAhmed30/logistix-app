-- STEP 6 — Send Sales quotation PDF to customer mobile app
-- Reuses sales quotations + existing jsPDF artifact (uploaded once on send).
-- Prerequisites: portal helpers (014+), quotations / quotation_lines, lead_inquiries

-- -------- Sales quotation → customer delivery fields --------
alter table public.quotations
  add column if not exists linked_inquiry_id uuid,
  add column if not exists customer_pdf_path text,
  add column if not exists customer_pdf_url text,
  add column if not exists sent_to_customer_at timestamptz,
  add column if not exists sent_to_customer_by text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'quotations_linked_inquiry_id_fkey'
  ) then
    alter table public.quotations
      add constraint quotations_linked_inquiry_id_fkey
      foreign key (linked_inquiry_id) references public.lead_inquiries(id)
      on delete set null;
  end if;
exception
  when undefined_table then null;
  when duplicate_object then null;
end $$;

create index if not exists quotations_linked_inquiry_sent_idx
  on public.quotations (linked_inquiry_id, sent_to_customer_at desc)
  where sent_to_customer_at is not null;

create index if not exists quotations_sent_to_customer_at_idx
  on public.quotations (sent_to_customer_at desc)
  where sent_to_customer_at is not null;

comment on column public.quotations.linked_inquiry_id is
  'Customer freight inquiry this sales quotation was sent against (mobile visibility).';
comment on column public.quotations.customer_pdf_path is
  'Storage path of the same PDF staff generate/download (customer-quotes/).';
comment on column public.quotations.customer_pdf_url is
  'Public URL for the stored customer PDF artifact (only returned after ownership check).';
comment on column public.quotations.sent_to_customer_at is
  'When staff sent this quotation PDF to the customer mobile app.';

-- Allow customer quotation notification event (optional; ignore if table missing)
do $$
begin
  alter table public.inquiry_lifecycle_notifications
    drop constraint if exists inquiry_lifecycle_notifications_event_type_check;
  alter table public.inquiry_lifecycle_notifications
    add constraint inquiry_lifecycle_notifications_event_type_check
    check (
      event_type in (
        'inquiry_sent',
        'sent_for_admin_approval',
        'approved',
        'rejected',
        'lead_transferred',
        'customer_submitted',
        'quotation_sent_to_customer'
      )
    );
exception
  when undefined_table then null;
  when undefined_object then null;
end $$;

-- Storage: reuse inquiry-images; staff uploads via service role. Customers only get URLs via RPC.
insert into storage.buckets (id, name, public, file_size_limit)
values ('inquiry-images', 'inquiry-images', true, 52428800)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = coalesce(storage.buckets.file_size_limit, excluded.file_size_limit);

-- -------- Portal: include quote summary when a quotation was sent for the inquiry --------
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

    union

    select distinct
      l.id,
      l.name,
      l.lead_id_formatted,
      l.status,
      l.created_at
    from public.contacts ct
    join public.leads l on l.contact_id = ct.id
    where public.phones_match(ct.phone, p_user_phone)
       or public.phones_match(ct.mobile, p_user_phone)
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
      li.version_number,
      li.customer_submitted,
      li.approval_status,
      li.sent_to_accounting,
      cq.quotation_id,
      cq.quotation_number,
      cq.quote_total,
      cq.quote_sent_at
    from public.lead_inquiries li
    join matched_leads ml on ml.id = li.lead_id
    left join lateral (
      select
        q.id as quotation_id,
        q.quotation_number,
        q.total_amount as quote_total,
        q.sent_to_customer_at as quote_sent_at
      from public.quotations q
      where q.linked_inquiry_id = li.id
        and q.sent_to_customer_at is not null
        and nullif(trim(coalesce(q.customer_pdf_url, '')), '') is not null
      order by q.sent_to_customer_at desc nulls last
      limit 1
    ) cq on true
    where li.sent_to_accounting = true
       or li.customer_submitted = true
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
            'customer_submitted', mi.customer_submitted,
            'approval_status', mi.approval_status,
            'sent_to_accounting', mi.sent_to_accounting,
            'has_quote', mi.quotation_id is not null,
            'quote_total', mi.quote_total,
            'quote_number', mi.quotation_number,
            'quote_sent_at', mi.quote_sent_at,
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

-- -------- Customer-safe quote fetch (ownership enforced server-side) --------
create or replace function public.get_customer_quote(
  p_session_token text,
  p_inquiry_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_phone text;
  v_portal jsonb;
  v_inquiry jsonb;
  v_quote record;
begin
  v_user_id := public._resolve_session_user_id(p_session_token);

  select u.phone into v_phone
  from public.users u
  where u.id = v_user_id;

  if v_phone is null then
    raise exception 'unauthorized_user' using errcode = '42501';
  end if;

  if p_inquiry_id is null then
    raise exception 'inquiry_required';
  end if;

  v_portal := public._customer_portal_for_user_phone(v_phone);

  select elem
  into v_inquiry
  from jsonb_array_elements(coalesce(v_portal->'inquiries', '[]'::jsonb)) elem
  where (elem->>'id')::uuid = p_inquiry_id
  limit 1;

  if v_inquiry is null then
    raise exception 'quote_not_found' using errcode = '42501';
  end if;

  select
    q.id,
    q.quotation_number,
    q.total_amount,
    q.quotation_date,
    q.expiration_date,
    q.payment_terms,
    q.customer_notes,
    q.customer_pdf_url,
    q.sent_to_customer_at,
    q.status
  into v_quote
  from public.quotations q
  where q.linked_inquiry_id = p_inquiry_id
    and q.sent_to_customer_at is not null
    and nullif(trim(coalesce(q.customer_pdf_url, '')), '') is not null
  order by q.sent_to_customer_at desc nulls last
  limit 1;

  if not found then
    raise exception 'quote_not_available';
  end if;

  return jsonb_build_object(
    'inquiry_id', p_inquiry_id,
    'quotation_id', v_quote.id,
    'quotation_number', v_quote.quotation_number,
    'total_amount', v_quote.total_amount,
    'quotation_date', v_quote.quotation_date,
    'expiration_date', v_quote.expiration_date,
    'payment_terms', v_quote.payment_terms,
    'customer_notes', v_quote.customer_notes,
    'pdf_url', v_quote.customer_pdf_url,
    'sent_at', v_quote.sent_to_customer_at,
    'status', 'quote_ready'
  );
end;
$$;

revoke all on function public.get_customer_quote(text, uuid) from public;
grant execute on function public.get_customer_quote(text, uuid) to anon, authenticated;
