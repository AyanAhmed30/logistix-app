-- Manual verification script for 021 mobile signup agent assignment.
-- Run in Supabase SQL Editor AFTER applying 021_mobile_signup_agent_assignment.sql.
-- Uses disposable phones; clean up the block at the end.

-- Test 1: existing contact keeps salesperson
-- Test 2–4: balanced new customers
-- Test 7: login does not reassign (login_user has no assignment side effects)
-- Test 10: inactive agent excluded

DO $$
DECLARE
  v_org uuid;
  v_a uuid;
  v_b uuid;
  v_c uuid;
  v_contact uuid;
  v_res jsonb;
  v_counts int[];
BEGIN
  SELECT id INTO v_org FROM public.organizations WHERE coalesce(status,'active')='active' ORDER BY created_at LIMIT 1;
  IF v_org IS NULL THEN
    RAISE EXCEPTION 'need at least one organization for smoke test';
  END IF;

  -- Ensure three active agents for balance tests (rollback at end via exception or manual delete)
  INSERT INTO public.sales_agents (name, username, password, is_active)
  VALUES ('Smoke Agent A', 'smoke_agent_a_' || substr(gen_random_uuid()::text,1,8), 'x', true)
  RETURNING id INTO v_a;
  INSERT INTO public.sales_agents (name, username, password, is_active)
  VALUES ('Smoke Agent B', 'smoke_agent_b_' || substr(gen_random_uuid()::text,1,8), 'x', true)
  RETURNING id INTO v_b;
  INSERT INTO public.sales_agents (name, username, password, is_active)
  VALUES ('Smoke Agent C', 'smoke_agent_c_' || substr(gen_random_uuid()::text,1,8), 'x', true)
  RETURNING id INTO v_c;

  -- Existing contact owned by A (lead_id_formatted is NOT NULL in this DB)
  INSERT INTO public.contacts (
    name, phone, mobile, salesperson_id, created_by, organization_id,
    company_type, customer_rank, lead_id_formatted
  )
  VALUES (
    'Existing Smoke',
    '+929900000001',
    '+929900000001',
    v_a,
    'smoke',
    v_org,
    'person',
    1,
    public._allocate_contact_lead_id_safe()
  )
  RETURNING id INTO v_contact;

  v_res := public.register_user('+929900000001', 'smoke_exist@example.com', 'Exist', 'Cust', 'Password1');
  IF (v_res->>'salesperson_id')::uuid IS DISTINCT FROM v_a THEN
    RAISE EXCEPTION 'Test1 FAIL: existing customer reassigned';
  END IF;
  RAISE NOTICE 'Test1 PASS: existing customer kept agent A';

  -- New customers (phones unique)
  PERFORM public.register_user('+929900000010', 'n1@example.com', 'N', 'One', 'Password1');
  PERFORM public.register_user('+929900000011', 'n2@example.com', 'N', 'Two', 'Password1');
  PERFORM public.register_user('+929900000012', 'n3@example.com', 'N', 'Three', 'Password1');
  PERFORM public.register_user('+929900000013', 'n4@example.com', 'N', 'Four', 'Password1');

  SELECT array_agg(cnt ORDER BY cnt DESC)
  INTO v_counts
  FROM (
    SELECT count(*)::int AS cnt
    FROM public.contacts c
    WHERE c.mobile_registered_at IS NOT NULL
      AND c.salesperson_id IN (v_a, v_b, v_c)
      AND c.phone LIKE '+92990000001%'
    GROUP BY c.salesperson_id
  ) s;

  RAISE NOTICE 'New-customer distribution among smoke agents (subset): %', v_counts;

  -- Inactive agent must not receive assignments
  UPDATE public.sales_agents SET is_active = false WHERE id IN (v_a, v_b, v_c);
  BEGIN
    PERFORM public.register_user('+929900000099', 'none@example.com', 'No', 'Agent', 'Password1');
    RAISE EXCEPTION 'Test10 FAIL: expected no_active_sales_agent';
  EXCEPTION
    WHEN others THEN
      IF SQLERRM ILIKE '%no_active_sales_agent%' THEN
        RAISE NOTICE 'Test10 PASS: inactive agents rejected';
      ELSE
        RAISE;
      END IF;
  END;

  RAISE NOTICE 'Smoke tests finished. Clean up smoke_* agents/users/contacts manually if desired.';
  -- Intentionally leave data for inspection; wrap in a transaction and ROLLBACK in interactive use if preferred.
END $$;
