-- Fix customer inquiry routing: resolve sales agent more reliably.
-- Root cause of no_sales_owner:
--   Contact matched by phone, but created_by was not sales_agents.username
--   (e.g. admin) and salesperson_id was null — even when a lead already
--   exists for that phone/contact with a sales_agent_id.

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
  v_created_by text;
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

  -- Prefer contact with an assigned salesperson, then newest
  select ct.*
  into v_contact
  from public.contacts ct
  where public.phones_match(ct.phone, v_phone)
     or public.phones_match(ct.mobile, v_phone)
  order by
    case when ct.salesperson_id is not null then 0 else 1 end,
    case
      when ct.created_by is not null
       and exists (
         select 1 from public.sales_agents sa0
         where lower(trim(sa0.username)) = lower(trim(ct.created_by))
       ) then 0
      else 1
    end,
    ct.created_at desc nulls last
  limit 1;

  if not found then
    raise exception 'no_matching_contact';
  end if;

  v_created_by := nullif(trim(coalesce(v_contact.created_by, '')), '');
  v_customer_id := nullif(trim(coalesce(v_contact.lead_id_formatted, '')), '');
  v_org_id := v_contact.organization_id;

  -- -------- Resolve sales agent (ordered fallbacks) --------
  -- 1) Explicit salesperson on the contact
  if v_contact.salesperson_id is not null then
    select sa.id, sa.username
    into v_agent_id, v_agent_username
    from public.sales_agents sa
    where sa.id = v_contact.salesperson_id
    limit 1;
  end if;

  -- 2) created_by matches sales agent username (case-insensitive)
  if v_agent_id is null and v_created_by is not null then
    select sa.id, sa.username
    into v_agent_id, v_agent_username
    from public.sales_agents sa
    where lower(trim(sa.username)) = lower(v_created_by)
    limit 1;
  end if;

  -- 3) created_by matches sales agent email
  if v_agent_id is null and v_created_by is not null then
    select sa.id, sa.username
    into v_agent_id, v_agent_username
    from public.sales_agents sa
    where sa.email is not null
      and lower(trim(sa.email)) = lower(v_created_by)
    limit 1;
  end if;

  -- 4) Existing lead already linked to this contact
  if v_agent_id is null then
    select sa.id, sa.username
    into v_agent_id, v_agent_username
    from public.leads l
    join public.sales_agents sa on sa.id = l.sales_agent_id
    where l.contact_id = v_contact.id
      and l.sales_agent_id is not null
    order by l.updated_at desc nulls last, l.created_at desc nulls last
    limit 1;
  end if;

  -- 5) Existing lead matching the customer phone
  if v_agent_id is null then
    select sa.id, sa.username
    into v_agent_id, v_agent_username
    from public.leads l
    join public.sales_agents sa on sa.id = l.sales_agent_id
    where public.phones_match(l.number, v_phone)
      and l.sales_agent_id is not null
    order by l.updated_at desc nulls last, l.created_at desc nulls last
    limit 1;
  end if;

  -- 6) Opportunity salesperson for this contact
  if v_agent_id is null then
    begin
      select sa.id, sa.username
      into v_agent_id, v_agent_username
      from public.crm_opportunities o
      join public.sales_agents sa on sa.id = o.salesperson_id
      where o.contact_id = v_contact.id
        and o.salesperson_id is not null
      order by o.updated_at desc nulls last, o.created_at desc nulls last
      limit 1;
    exception
      when undefined_table then
        null;
      when undefined_column then
        null;
    end;
  end if;

  if v_agent_id is null then
    raise exception 'no_sales_owner';
  end if;

  -- Prefer existing lead for contact+agent, then contact, then phone
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
    select l.*
    into v_lead
    from public.leads l
    where public.phones_match(l.number, v_phone)
    order by l.created_at desc
    limit 1;
  end if;

  if not found then
    if v_customer_id is null then
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
    update public.leads
    set
      contact_id = coalesce(contact_id, v_contact.id),
      sales_agent_id = coalesce(sales_agent_id, v_agent_id),
      organization_id = coalesce(organization_id, v_org_id),
      lead_id_formatted = coalesce(nullif(trim(lead_id_formatted), ''), v_customer_id)
    where id = v_lead.id
    returning * into v_lead;
  end if;

  -- Keep contact ownership in sync when it was empty (helps future submits)
  begin
    update public.contacts
    set
      salesperson_id = coalesce(salesperson_id, v_agent_id),
      created_by = coalesce(nullif(trim(created_by), ''), v_agent_username)
    where id = v_contact.id
      and (salesperson_id is null or created_by is null or btrim(created_by) = '');
  exception
    when others then
      null;
  end;

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
      inquiry_id, action, previous_values, new_values, performed_by
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
  exception when others then null;
  end;

  begin
    insert into public.lead_activity_logs (
      lead_id, inquiry_id, inquiry_version, action_type, action_label, new_values, performed_by
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
  exception when others then null;
  end;

  if v_agent_username is not null then
    begin
      insert into public.inquiry_lifecycle_notifications (
        lead_id, inquiry_id, confirmation_id,
        sender_role, sender_username, recipient_role, recipient_username,
        event_type, message
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
    exception when others then null;
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
