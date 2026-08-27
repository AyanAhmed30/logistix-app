-- Step 5 — Customer inquiry submit → Sales agent (Contact owner) → draft for CRM send → Ops
-- Prerequisites: 013 (portal helper + phones_match), 014 (sessions)
--
-- Flow:
--   1) Customer submits via app (same product fields as CRM inquiry form)
--   2) Resolve Contact by phone → sales agent who owns/added that contact
--   3) Attach/create lead under that sales_agent_id
--   4) Insert lead_inquiries as DRAFT (NOT sent_to_accounting)
--   5) Sales reviews in CRM / sales-agent workspace and uses existing Send → Operations

alter table public.lead_inquiries
  add column if not exists customer_submitted boolean not null default false;

create index if not exists lead_inquiries_customer_submitted_idx
  on public.lead_inquiries (customer_submitted)
  where customer_submitted = true;

comment on column public.lead_inquiries.customer_submitted is
  'True when the inquiry was created by the customer mobile app (awaiting Sales send to Operations).';

-- Allow customer → sales notifications
do $$
begin
  alter table public.inquiry_lifecycle_notifications
    drop constraint if exists inquiry_lifecycle_notifications_sender_role_check;
  alter table public.inquiry_lifecycle_notifications
    add constraint inquiry_lifecycle_notifications_sender_role_check
    check (sender_role in ('sales_agent', 'operations', 'admin', 'customer'));

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
        'customer_submitted'
      )
    );
exception
  when undefined_table then
    null;
  when undefined_object then
    null;
end $$;

-- Portal: show sent inquiries OR customer-submitted drafts for this phone
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

    -- Leads linked via CRM contacts matching the mobile phone
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
      li.sent_to_accounting
    from public.lead_inquiries li
    join matched_leads ml on ml.id = li.lead_id
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

create or replace function public.submit_customer_inquiry(
  p_session_token text,
  p_product_name text,
  p_quantity text,
  p_total_weight text,
  p_cbm text,
  p_description text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_user_id uuid;
  v_phone text;
  v_user_name text;
  v_contact public.contacts%rowtype;
  v_agent_id uuid;
  v_agent_username text;
  v_lead public.leads%rowtype;
  v_next_version integer;
  v_group_id uuid;
  v_inquiry public.lead_inquiries%rowtype;
  v_customer_id text;
  v_org_id uuid;
  v_product text;
  v_qty text;
  v_weight text;
  v_cbm text;
  v_desc text;
begin
  v_user_id := public._resolve_session_user_id(p_session_token);

  select u.phone, trim(both from (u.first_name || ' ' || u.last_name))
  into v_phone, v_user_name
  from public.users u
  where u.id = v_user_id;

  if v_phone is null then
    raise exception 'unauthorized_user' using errcode = '42501';
  end if;

  v_product := trim(coalesce(p_product_name, ''));
  v_qty := trim(coalesce(p_quantity, ''));
  v_weight := trim(coalesce(p_total_weight, ''));
  v_cbm := trim(coalesce(p_cbm, ''));
  v_desc := nullif(trim(coalesce(p_description, '')), '');

  -- Same required product fields as CRM "Send Inquiry"
  if v_product = '' then
    raise exception 'product_name_required';
  end if;
  if v_qty = '' or v_qty !~ '^\d+$' then
    raise exception 'quantity_invalid';
  end if;
  if v_weight = '' or v_weight !~ '^(?:\d+|\d+\.\d+|\d*\.\d+)$' then
    raise exception 'total_weight_invalid';
  end if;
  if v_cbm = '' or v_cbm !~ '^(?:\d+|\d+\.\d+|\d*\.\d+)$' then
    raise exception 'cbm_invalid';
  end if;

  -- Contact whose phone/mobile matches (prefer salesperson assigned, then newest)
  select ct.*
  into v_contact
  from public.contacts ct
  where public.phones_match(ct.phone, v_phone)
     or public.phones_match(ct.mobile, v_phone)
  order by
    case when ct.salesperson_id is not null then 0 else 1 end,
    ct.created_at desc nulls last
  limit 1;

  if not found then
    raise exception 'no_matching_contact';
  end if;

  -- Sales agent who owns/added the contact phone
  -- 1) created_by username → sales_agents
  if v_contact.created_by is not null and length(trim(v_contact.created_by)) > 0 then
    select sa.id, sa.username
    into v_agent_id, v_agent_username
    from public.sales_agents sa
    where sa.username = trim(v_contact.created_by)
    limit 1;
  end if;

  -- 2) fallback salesperson_id
  if v_agent_id is null and v_contact.salesperson_id is not null then
    select sa.id, sa.username
    into v_agent_id, v_agent_username
    from public.sales_agents sa
    where sa.id = v_contact.salesperson_id
    limit 1;
  end if;

  if v_agent_id is null then
    raise exception 'no_sales_owner';
  end if;

  v_customer_id := nullif(trim(coalesce(v_contact.lead_id_formatted, '')), '');
  v_org_id := v_contact.organization_id;

  -- Existing lead for this contact under the same agent
  select l.*
  into v_lead
  from public.leads l
  where l.contact_id = v_contact.id
    and l.sales_agent_id = v_agent_id
  order by l.created_at desc
  limit 1;

  if not found then
    select l.*
    into v_lead
    from public.leads l
    where l.contact_id = v_contact.id
    order by l.created_at desc
    limit 1;
  end if;

  if not found then
    select l.*
    into v_lead
    from public.leads l
    where public.phones_match(l.number, v_phone)
      and l.sales_agent_id = v_agent_id
    order by l.created_at desc
    limit 1;
  end if;

  if not found then
    if v_customer_id is null then
      -- Soft Customer ID if contact never received one
      v_customer_id := upper(left(replace(v_contact.id::text, '-', ''), 8));
      begin
        update public.contacts
        set lead_id_formatted = v_customer_id
        where id = v_contact.id
          and (lead_id_formatted is null or btrim(lead_id_formatted) = '');
      exception
        when others then
          null;
      end;
    end if;

    insert into public.leads (
      name,
      number,
      source,
      status,
      sales_agent_id,
      created_by_sales_agent_id,
      contact_id,
      organization_id,
      converted,
      lead_id_formatted
    )
    values (
      coalesce(nullif(trim(v_contact.name), ''), nullif(v_user_name, ''), 'Customer'),
      coalesce(nullif(trim(v_contact.phone), ''), nullif(trim(v_contact.mobile), ''), v_phone),
      'Others',
      'Inquiry Received',
      v_agent_id,
      v_agent_id,
      v_contact.id,
      v_org_id,
      false,
      v_customer_id
    )
    returning * into v_lead;
  else
    -- Ensure lead stays linked to contact / agent when possible
    update public.leads
    set
      contact_id = coalesce(contact_id, v_contact.id),
      sales_agent_id = coalesce(sales_agent_id, v_agent_id),
      organization_id = coalesce(organization_id, v_org_id),
      lead_id_formatted = coalesce(nullif(trim(lead_id_formatted), ''), v_customer_id)
    where id = v_lead.id
    returning * into v_lead;
  end if;

  select coalesce(max(li.version_number), 0) + 1
  into v_next_version
  from public.lead_inquiries li
  where li.lead_id = v_lead.id;

  v_group_id := gen_random_uuid();

  insert into public.lead_inquiries (
    lead_id,
    inquiry_group_id,
    version_number,
    is_current_version,
    product_name,
    quantity,
    total_weight,
    cbm,
    description,
    image_url,
    additional_image_urls,
    status,
    sent_to_accounting,
    sent_to_operations,
    approval_status,
    approved_at,
    organization_id,
    created_by,
    customer_submitted
  )
  values (
    v_lead.id,
    v_group_id,
    v_next_version,
    true,
    v_product,
    v_qty,
    v_weight,
    v_cbm,
    v_desc,
    null,
    '[]'::jsonb,
    'pending',
    false,
    false,
    'draft',
    null,
    coalesce(v_lead.organization_id, v_org_id),
    'customer_app',
    true
  )
  returning * into v_inquiry;

  begin
    insert into public.inquiry_logs (
      inquiry_id,
      action,
      previous_values,
      new_values,
      performed_by
    )
    values (
      v_inquiry.id,
      'inquiry_created_draft',
      null,
      jsonb_build_object(
        'product_name', v_product,
        'total_weight', v_weight,
        'cbm', v_cbm,
        'quantity', v_qty,
        'description', v_desc,
        'customer_submitted', true
      ),
      'customer_app'
    );
  exception
    when others then
      null;
  end;

  begin
    insert into public.lead_activity_logs (
      lead_id,
      inquiry_id,
      inquiry_version,
      action_type,
      action_label,
      new_values,
      performed_by
    )
    values (
      v_lead.id,
      v_inquiry.id,
      v_next_version,
      'inquiry_created_draft',
      'Customer submitted inquiry (mobile app)',
      jsonb_build_object(
        'product_name', v_product,
        'quantity', v_qty,
        'total_weight', v_weight,
        'cbm', v_cbm,
        'customer_submitted', true
      ),
      'customer_app'
    );
  exception
    when others then
      null;
  end;

  if v_agent_username is not null then
    begin
      insert into public.inquiry_lifecycle_notifications (
        lead_id,
        inquiry_id,
        confirmation_id,
        sender_role,
        sender_username,
        recipient_role,
        recipient_username,
        event_type,
        message
      )
      values (
        v_lead.id,
        v_inquiry.id,
        null,
        'customer',
        'customer_app',
        'sales_agent',
        v_agent_username,
        'customer_submitted',
        format(
          'Customer submitted a new inquiry via mobile app for Lead #%s (%s). Review and send to Operations when ready.',
          coalesce(v_lead.lead_id_formatted, 'N/A'),
          v_product
        )
      );
    exception
      when others then
        null;
    end;
  end if;

  return jsonb_build_object(
    'inquiry', jsonb_build_object(
      'id', v_inquiry.id,
      'lead_id', v_inquiry.lead_id,
      'lead_number', v_lead.lead_id_formatted,
      'inquiry_number', coalesce(v_inquiry.version_number::text, upper(left(replace(v_inquiry.id::text, '-', ''), 8))),
      'product_name', v_inquiry.product_name,
      'quantity', v_inquiry.quantity,
      'total_weight', v_inquiry.total_weight,
      'cbm', v_inquiry.cbm,
      'description', v_inquiry.description,
      'status', v_inquiry.status,
      'approval_status', v_inquiry.approval_status,
      'customer_submitted', true,
      'sent_to_accounting', false,
      'created_at', v_inquiry.created_at
    ),
    'sales_agent_username', v_agent_username,
    'message', 'Request submitted to your sales agent for review.'
  );
end;
$$;

revoke all on function public.submit_customer_inquiry(text, text, text, text, text, text) from public;
grant execute on function public.submit_customer_inquiry(text, text, text, text, text, text) to anon, authenticated;
