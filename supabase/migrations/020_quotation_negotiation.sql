-- STEP 7 — Quotation negotiation (same quotation number, immutable history)
-- Customer requests amounts; sales controls commercial values + PDF.
-- Prerequisites: 014+ sessions, 019 send quotation to customer

-- -------- Quotation negotiation state --------
alter table public.quotations
  add column if not exists negotiation_status text,
  add column if not exists original_offer_amount numeric(14, 2),
  add column if not exists previous_offer_amount numeric(14, 2),
  add column if not exists pending_customer_request_amount numeric(14, 2),
  add column if not exists pending_customer_request_message text,
  add column if not exists pending_customer_request_at timestamptz,
  add column if not exists pending_counter_amount numeric(14, 2),
  add column if not exists pending_counter_message text,
  add column if not exists pending_counter_at timestamptz,
  add column if not exists pending_counter_by text,
  add column if not exists customer_accepted_at timestamptz,
  add column if not exists customer_declined_at timestamptz,
  add column if not exists customer_decline_reason text;

do $$
begin
  alter table public.quotations
    drop constraint if exists quotations_negotiation_status_check;
  alter table public.quotations
    add constraint quotations_negotiation_status_check
    check (
      negotiation_status is null
      or negotiation_status in (
        'none',
        'awaiting_sales',
        'awaiting_customer',
        'accepted',
        'declined',
        'closed'
      )
    );
exception
  when undefined_table then null;
end $$;

comment on column public.quotations.negotiation_status is
  'Customer negotiation lifecycle for this quotation (same quotation_number).';
comment on column public.quotations.original_offer_amount is
  'First customer-facing offer total; never overwritten by later counters.';

-- -------- Immutable negotiation event log --------
create table if not exists public.quotation_negotiation_events (
  id uuid primary key default gen_random_uuid(),
  quotation_id uuid not null references public.quotations(id) on delete cascade,
  inquiry_id uuid references public.lead_inquiries(id) on delete set null,
  event_type text not null,
  actor_role text not null,
  actor_user_id uuid,
  actor_username text,
  previous_amount numeric(14, 2),
  offered_amount numeric(14, 2),
  requested_amount numeric(14, 2),
  message text,
  pdf_url text,
  pdf_path text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint quotation_negotiation_events_type_check check (
    event_type in (
      'original_offer',
      'customer_request',
      'customer_message',
      'sales_message',
      'sales_counter_draft',
      'sales_counter_sent',
      'sales_accepted_request',
      'sales_rejected_request',
      'customer_accepted',
      'customer_declined',
      'resent_offer'
    )
  ),
  constraint quotation_negotiation_events_actor_check check (
    actor_role in ('customer', 'sales', 'system')
  )
);

create index if not exists quotation_negotiation_events_quotation_idx
  on public.quotation_negotiation_events (quotation_id, created_at asc);

create index if not exists quotation_negotiation_events_inquiry_idx
  on public.quotation_negotiation_events (inquiry_id, created_at desc);

alter table public.quotation_negotiation_events enable row level security;

drop policy if exists "quotation_negotiation_events_service_role" on public.quotation_negotiation_events;
create policy "quotation_negotiation_events_service_role"
  on public.quotation_negotiation_events
  for all
  using (true)
  with check (true);

revoke all on public.quotation_negotiation_events from anon, authenticated;
grant all on public.quotation_negotiation_events to service_role;

-- Expand quotation_logs actions for negotiation timeline in web chatter
do $$
begin
  alter table public.quotation_logs
    drop constraint if exists quotation_logs_action_check;
  alter table public.quotation_logs
    add constraint quotation_logs_action_check
    check (
      action in (
        'created',
        'updated',
        'deleted',
        'status_changed',
        'printed',
        'log_note',
        'activity',
        'duplicated',
        'locked',
        'unlocked',
        'emailed',
        'previewed',
        'sent_to_customer',
        'resent_to_customer',
        'customer_negotiation_request',
        'sales_negotiation_counter_draft',
        'sales_negotiation_counter_sent',
        'sales_negotiation_accepted',
        'sales_negotiation_rejected',
        'customer_accepted_quotation',
        'customer_declined_quotation'
      )
    );
exception
  when undefined_table then null;
end $$;

-- Lifecycle notification event types for negotiation
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
        'quotation_sent_to_customer',
        'quotation_negotiation_request',
        'quotation_counter_offer',
        'quotation_customer_accepted',
        'quotation_customer_declined'
      )
    );
exception
  when undefined_table then null;
  when undefined_object then null;
end $$;

-- -------- Helper: resolve owned quotation for inquiry --------
create or replace function public._customer_owned_sent_quotation(
  p_phone text,
  p_inquiry_id uuid
)
returns public.quotations
language plpgsql
security definer
set search_path = public
as $$
declare
  v_portal jsonb;
  v_inquiry jsonb;
  v_quote public.quotations%rowtype;
begin
  if p_inquiry_id is null then
    raise exception 'inquiry_required';
  end if;

  v_portal := public._customer_portal_for_user_phone(p_phone);

  select elem
  into v_inquiry
  from jsonb_array_elements(coalesce(v_portal->'inquiries', '[]'::jsonb)) elem
  where (elem->>'id')::uuid = p_inquiry_id
  limit 1;

  if v_inquiry is null then
    raise exception 'quote_not_found' using errcode = '42501';
  end if;

  select q.*
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

  return v_quote;
end;
$$;

revoke all on function public._customer_owned_sent_quotation(text, uuid) from public;

-- -------- Customer: submit negotiation request --------
create or replace function public.submit_quotation_negotiation(
  p_session_token text,
  p_inquiry_id uuid,
  p_requested_amount numeric,
  p_message text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_phone text;
  v_user_name text;
  v_quote public.quotations%rowtype;
  v_amount numeric(14, 2);
  v_msg text;
  v_event_id uuid;
begin
  v_user_id := public._resolve_session_user_id(p_session_token);

  select u.phone, trim(both from (u.first_name || ' ' || u.last_name))
  into v_phone, v_user_name
  from public.users u
  where u.id = v_user_id;

  if v_phone is null then
    raise exception 'unauthorized_user' using errcode = '42501';
  end if;

  v_quote := public._customer_owned_sent_quotation(v_phone, p_inquiry_id);

  if v_quote.status in ('sales_order', 'cancelled') or coalesce(v_quote.is_locked, false) then
    raise exception 'negotiation_not_allowed';
  end if;

  if v_quote.negotiation_status in ('accepted', 'declined', 'closed') then
    raise exception 'negotiation_closed';
  end if;

  if v_quote.customer_accepted_at is not null or v_quote.customer_declined_at is not null then
    raise exception 'negotiation_closed';
  end if;

  v_amount := round(coalesce(p_requested_amount, 0)::numeric, 2);
  if v_amount <= 0 then
    raise exception 'invalid_requested_amount';
  end if;

  if v_amount >= coalesce(v_quote.total_amount, 0) then
    raise exception 'request_must_be_lower';
  end if;

  v_msg := nullif(trim(coalesce(p_message, '')), '');
  if v_msg is not null and length(v_msg) > 2000 then
    raise exception 'message_too_long';
  end if;

  -- Snapshot original offer once
  if v_quote.original_offer_amount is null then
    update public.quotations
    set original_offer_amount = v_quote.total_amount
    where id = v_quote.id;
    v_quote.original_offer_amount := v_quote.total_amount;
  end if;

  insert into public.quotation_negotiation_events (
    quotation_id,
    inquiry_id,
    event_type,
    actor_role,
    actor_user_id,
    actor_username,
    previous_amount,
    requested_amount,
    message,
    metadata
  ) values (
    v_quote.id,
    p_inquiry_id,
    'customer_request',
    'customer',
    v_user_id,
    v_user_name,
    v_quote.total_amount,
    v_amount,
    v_msg,
    jsonb_build_object('quotation_number', v_quote.quotation_number)
  )
  returning id into v_event_id;

  update public.quotations
  set
    negotiation_status = 'awaiting_sales',
    pending_customer_request_amount = v_amount,
    pending_customer_request_message = v_msg,
    pending_customer_request_at = now(),
    pending_counter_amount = null,
    pending_counter_message = null,
    pending_counter_at = null,
    pending_counter_by = null,
    updated_at = now()
  where id = v_quote.id;

  insert into public.quotation_logs (
    quotation_id,
    action,
    previous_status,
    new_status,
    performed_by,
    details
  ) values (
    v_quote.id,
    'customer_negotiation_request',
    v_quote.status,
    v_quote.status,
    coalesce(nullif(v_user_name, ''), 'Customer'),
    jsonb_build_object(
      'requested_amount', v_amount,
      'current_amount', v_quote.total_amount,
      'message', v_msg,
      'inquiry_id', p_inquiry_id,
      'event_id', v_event_id
    )
  );

  -- Notify salesperson (best-effort)
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
    select
      li.lead_id,
      p_inquiry_id,
      null,
      'customer',
      coalesce(nullif(v_user_name, ''), 'Customer'),
      'sales_agent',
      sa.username,
      'quotation_negotiation_request',
      format(
        'Customer requested negotiation for quotation %s (requested %s).',
        coalesce(v_quote.quotation_number, ''),
        v_amount::text
      )
    from public.lead_inquiries li
    join public.quotations q on q.id = v_quote.id
    left join public.sales_agents sa on sa.id = q.salesperson_id
    where li.id = p_inquiry_id
      and sa.username is not null;
  exception
    when others then null;
  end;

  return jsonb_build_object(
    'ok', true,
    'quotation_id', v_quote.id,
    'quotation_number', v_quote.quotation_number,
    'negotiation_status', 'awaiting_sales',
    'requested_amount', v_amount,
    'current_amount', v_quote.total_amount,
    'event_id', v_event_id
  );
end;
$$;

revoke all on function public.submit_quotation_negotiation(text, uuid, numeric, text) from public;
grant execute on function public.submit_quotation_negotiation(text, uuid, numeric, text) to anon, authenticated;

-- -------- Customer: accept current offer --------
create or replace function public.accept_customer_quotation(
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
  v_user_name text;
  v_quote public.quotations%rowtype;
  v_event_id uuid;
begin
  v_user_id := public._resolve_session_user_id(p_session_token);

  select u.phone, trim(both from (u.first_name || ' ' || u.last_name))
  into v_phone, v_user_name
  from public.users u
  where u.id = v_user_id;

  if v_phone is null then
    raise exception 'unauthorized_user' using errcode = '42501';
  end if;

  v_quote := public._customer_owned_sent_quotation(v_phone, p_inquiry_id);

  if v_quote.status in ('sales_order', 'cancelled') or coalesce(v_quote.is_locked, false) then
    raise exception 'negotiation_not_allowed';
  end if;

  if v_quote.customer_accepted_at is not null then
    return jsonb_build_object(
      'ok', true,
      'already', true,
      'quotation_id', v_quote.id,
      'negotiation_status', 'accepted',
      'total_amount', v_quote.total_amount
    );
  end if;

  if v_quote.customer_declined_at is not null or v_quote.negotiation_status = 'declined' then
    raise exception 'negotiation_closed';
  end if;

  if v_quote.negotiation_status = 'awaiting_sales' then
    raise exception 'waiting_for_sales';
  end if;

  insert into public.quotation_negotiation_events (
    quotation_id,
    inquiry_id,
    event_type,
    actor_role,
    actor_user_id,
    actor_username,
    previous_amount,
    offered_amount,
    message,
    metadata
  ) values (
    v_quote.id,
    p_inquiry_id,
    'customer_accepted',
    'customer',
    v_user_id,
    v_user_name,
    v_quote.total_amount,
    v_quote.total_amount,
    'Customer accepted the current offer',
    jsonb_build_object('quotation_number', v_quote.quotation_number)
  )
  returning id into v_event_id;

  update public.quotations
  set
    negotiation_status = 'accepted',
    customer_accepted_at = now(),
    pending_customer_request_amount = null,
    pending_customer_request_message = null,
    pending_customer_request_at = null,
    pending_counter_amount = null,
    pending_counter_message = null,
    pending_counter_at = null,
    pending_counter_by = null,
    updated_at = now()
  where id = v_quote.id;

  insert into public.quotation_logs (
    quotation_id,
    action,
    previous_status,
    new_status,
    performed_by,
    details
  ) values (
    v_quote.id,
    'customer_accepted_quotation',
    v_quote.status,
    v_quote.status,
    coalesce(nullif(v_user_name, ''), 'Customer'),
    jsonb_build_object(
      'accepted_amount', v_quote.total_amount,
      'inquiry_id', p_inquiry_id,
      'event_id', v_event_id
    )
  );

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
    select
      li.lead_id,
      p_inquiry_id,
      null,
      'customer',
      coalesce(nullif(v_user_name, ''), 'Customer'),
      'sales_agent',
      sa.username,
      'quotation_customer_accepted',
      format(
        'Customer accepted quotation %s for %s.',
        coalesce(v_quote.quotation_number, ''),
        v_quote.total_amount::text
      )
    from public.lead_inquiries li
    join public.quotations q on q.id = v_quote.id
    left join public.sales_agents sa on sa.id = q.salesperson_id
    where li.id = p_inquiry_id
      and sa.username is not null;
  exception
    when others then null;
  end;

  return jsonb_build_object(
    'ok', true,
    'quotation_id', v_quote.id,
    'quotation_number', v_quote.quotation_number,
    'negotiation_status', 'accepted',
    'total_amount', v_quote.total_amount,
    'event_id', v_event_id
  );
end;
$$;

revoke all on function public.accept_customer_quotation(text, uuid) from public;
grant execute on function public.accept_customer_quotation(text, uuid) to anon, authenticated;

-- -------- Customer: decline quotation --------
create or replace function public.decline_customer_quotation(
  p_session_token text,
  p_inquiry_id uuid,
  p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_phone text;
  v_user_name text;
  v_quote public.quotations%rowtype;
  v_reason text;
  v_event_id uuid;
begin
  v_user_id := public._resolve_session_user_id(p_session_token);

  select u.phone, trim(both from (u.first_name || ' ' || u.last_name))
  into v_phone, v_user_name
  from public.users u
  where u.id = v_user_id;

  if v_phone is null then
    raise exception 'unauthorized_user' using errcode = '42501';
  end if;

  v_quote := public._customer_owned_sent_quotation(v_phone, p_inquiry_id);

  if v_quote.status in ('sales_order', 'cancelled') or coalesce(v_quote.is_locked, false) then
    raise exception 'negotiation_not_allowed';
  end if;

  if v_quote.customer_declined_at is not null then
    return jsonb_build_object(
      'ok', true,
      'already', true,
      'quotation_id', v_quote.id,
      'negotiation_status', 'declined'
    );
  end if;

  if v_quote.customer_accepted_at is not null or v_quote.negotiation_status = 'accepted' then
    raise exception 'negotiation_closed';
  end if;

  v_reason := nullif(trim(coalesce(p_reason, '')), '');
  if v_reason is not null and length(v_reason) > 2000 then
    raise exception 'message_too_long';
  end if;

  insert into public.quotation_negotiation_events (
    quotation_id,
    inquiry_id,
    event_type,
    actor_role,
    actor_user_id,
    actor_username,
    previous_amount,
    offered_amount,
    message,
    metadata
  ) values (
    v_quote.id,
    p_inquiry_id,
    'customer_declined',
    'customer',
    v_user_id,
    v_user_name,
    v_quote.total_amount,
    v_quote.total_amount,
    v_reason,
    jsonb_build_object('quotation_number', v_quote.quotation_number)
  )
  returning id into v_event_id;

  update public.quotations
  set
    negotiation_status = 'declined',
    customer_declined_at = now(),
    customer_decline_reason = v_reason,
    pending_customer_request_amount = null,
    pending_customer_request_message = null,
    pending_customer_request_at = null,
    pending_counter_amount = null,
    pending_counter_message = null,
    pending_counter_at = null,
    pending_counter_by = null,
    updated_at = now()
  where id = v_quote.id;

  insert into public.quotation_logs (
    quotation_id,
    action,
    previous_status,
    new_status,
    performed_by,
    details
  ) values (
    v_quote.id,
    'customer_declined_quotation',
    v_quote.status,
    v_quote.status,
    coalesce(nullif(v_user_name, ''), 'Customer'),
    jsonb_build_object(
      'declined_amount', v_quote.total_amount,
      'reason', v_reason,
      'inquiry_id', p_inquiry_id,
      'event_id', v_event_id
    )
  );

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
    select
      li.lead_id,
      p_inquiry_id,
      null,
      'customer',
      coalesce(nullif(v_user_name, ''), 'Customer'),
      'sales_agent',
      sa.username,
      'quotation_customer_declined',
      format(
        'Customer declined quotation %s%s',
        coalesce(v_quote.quotation_number, ''),
        case when v_reason is null then '.' else format(': %s', v_reason) end
      )
    from public.lead_inquiries li
    join public.quotations q on q.id = v_quote.id
    left join public.sales_agents sa on sa.id = q.salesperson_id
    where li.id = p_inquiry_id
      and sa.username is not null;
  exception
    when others then null;
  end;

  return jsonb_build_object(
    'ok', true,
    'quotation_id', v_quote.id,
    'quotation_number', v_quote.quotation_number,
    'negotiation_status', 'declined',
    'event_id', v_event_id
  );
end;
$$;

revoke all on function public.decline_customer_quotation(text, uuid, text) from public;
grant execute on function public.decline_customer_quotation(text, uuid, text) to anon, authenticated;

-- -------- Extend get_customer_quote with negotiation payload --------
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
  v_quote public.quotations%rowtype;
  v_events jsonb;
  v_status text;
begin
  v_user_id := public._resolve_session_user_id(p_session_token);

  select u.phone into v_phone
  from public.users u
  where u.id = v_user_id;

  if v_phone is null then
    raise exception 'unauthorized_user' using errcode = '42501';
  end if;

  v_quote := public._customer_owned_sent_quotation(v_phone, p_inquiry_id);

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', e.id,
        'event_type', e.event_type,
        'actor_role', e.actor_role,
        'actor_name', coalesce(e.actor_username, e.actor_role),
        'previous_amount', e.previous_amount,
        'offered_amount', e.offered_amount,
        'requested_amount', e.requested_amount,
        'message', e.message,
        'created_at', e.created_at
      )
      order by e.created_at asc
    ),
    '[]'::jsonb
  )
  into v_events
  from public.quotation_negotiation_events e
  where e.quotation_id = v_quote.id
    and e.event_type not in ('sales_counter_draft');

  v_status := case
    when v_quote.customer_accepted_at is not null or v_quote.negotiation_status = 'accepted'
      then 'accepted'
    when v_quote.customer_declined_at is not null or v_quote.negotiation_status = 'declined'
      then 'declined'
    when v_quote.negotiation_status = 'awaiting_sales'
      then 'awaiting_sales'
    when v_quote.negotiation_status = 'awaiting_customer'
      then 'awaiting_customer'
    when v_quote.status in ('sales_order', 'cancelled')
      then 'closed'
    else 'quote_ready'
  end;

  return jsonb_build_object(
    'inquiry_id', p_inquiry_id,
    'quotation_id', v_quote.id,
    'quotation_number', v_quote.quotation_number,
    'total_amount', v_quote.total_amount,
    'original_offer_amount', coalesce(v_quote.original_offer_amount, v_quote.total_amount),
    'previous_offer_amount', v_quote.previous_offer_amount,
    'quotation_date', v_quote.quotation_date,
    'expiration_date', v_quote.expiration_date,
    'payment_terms', v_quote.payment_terms,
    'customer_notes', v_quote.customer_notes,
    'pdf_url', v_quote.customer_pdf_url,
    'sent_at', v_quote.sent_to_customer_at,
    'status', v_status,
    'negotiation_status', coalesce(v_quote.negotiation_status, 'none'),
    'pending_request_amount', v_quote.pending_customer_request_amount,
    'pending_request_message', v_quote.pending_customer_request_message,
    'can_negotiate', (
      v_quote.status not in ('sales_order', 'cancelled')
      and coalesce(v_quote.is_locked, false) = false
      and v_quote.customer_accepted_at is null
      and v_quote.customer_declined_at is null
      and coalesce(v_quote.negotiation_status, 'none') not in ('accepted', 'declined', 'closed', 'awaiting_sales')
    ),
    'can_accept', (
      v_quote.status not in ('sales_order', 'cancelled')
      and coalesce(v_quote.is_locked, false) = false
      and v_quote.customer_accepted_at is null
      and v_quote.customer_declined_at is null
      and coalesce(v_quote.negotiation_status, 'none') not in ('accepted', 'declined', 'closed', 'awaiting_sales')
    ),
    'can_decline', (
      v_quote.status not in ('sales_order', 'cancelled')
      and coalesce(v_quote.is_locked, false) = false
      and v_quote.customer_accepted_at is null
      and v_quote.customer_declined_at is null
      and coalesce(v_quote.negotiation_status, 'none') not in ('accepted', 'declined', 'closed')
    ),
    'history', v_events
  );
end;
$$;

revoke all on function public.get_customer_quote(text, uuid) from public;
grant execute on function public.get_customer_quote(text, uuid) to anon, authenticated;

notify pgrst, 'reload schema';
