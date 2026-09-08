-- 022 — Customer mobile: fetch assigned Sales Agent for Profile → Support
-- Prerequisites: 014 (sessions), 010/013 (phones_match), contacts + sales_agents
-- Returns only safe public fields (name, phone). Never returns passwords or secrets.

CREATE OR REPLACE FUNCTION public.get_customer_assigned_sales_agent(
  p_session_token text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_phone text;
  v_contact public.contacts%rowtype;
  v_agent public.sales_agents%rowtype;
  v_created_by text;
BEGIN
  v_user_id := public._resolve_session_user_id(p_session_token);

  SELECT u.phone
  INTO v_phone
  FROM public.users u
  WHERE u.id = v_user_id;

  IF v_phone IS NULL THEN
    RAISE EXCEPTION 'unauthorized_user' USING errcode = '42501';
  END IF;

  SELECT ct.*
  INTO v_contact
  FROM public.contacts ct
  WHERE public.phones_match(ct.phone, v_phone)
     OR public.phones_match(ct.mobile, v_phone)
  ORDER BY
    CASE WHEN ct.salesperson_id IS NOT NULL THEN 0 ELSE 1 END,
    CASE
      WHEN ct.created_by IS NOT NULL
       AND EXISTS (
         SELECT 1 FROM public.sales_agents sa0
         WHERE lower(trim(sa0.username)) = lower(trim(ct.created_by))
       ) THEN 0
      ELSE 1
    END,
    ct.created_at DESC NULLS LAST
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('agent', NULL);
  END IF;

  v_created_by := nullif(trim(coalesce(v_contact.created_by, '')), '');

  IF v_contact.salesperson_id IS NOT NULL THEN
    SELECT sa.*
    INTO v_agent
    FROM public.sales_agents sa
    WHERE sa.id = v_contact.salesperson_id
    LIMIT 1;
  END IF;

  IF v_agent.id IS NULL AND v_created_by IS NOT NULL THEN
    SELECT sa.*
    INTO v_agent
    FROM public.sales_agents sa
    WHERE lower(trim(sa.username)) = lower(v_created_by)
    LIMIT 1;
  END IF;

  IF v_agent.id IS NULL AND v_created_by IS NOT NULL THEN
    SELECT sa.*
    INTO v_agent
    FROM public.sales_agents sa
    WHERE sa.email IS NOT NULL
      AND lower(trim(sa.email)) = lower(v_created_by)
    LIMIT 1;
  END IF;

  IF v_agent.id IS NULL THEN
    SELECT sa.*
    INTO v_agent
    FROM public.leads l
    JOIN public.sales_agents sa ON sa.id = l.sales_agent_id
    WHERE l.contact_id = v_contact.id
      AND l.sales_agent_id IS NOT NULL
    ORDER BY l.updated_at DESC NULLS LAST, l.created_at DESC NULLS LAST
    LIMIT 1;
  END IF;

  IF v_agent.id IS NULL THEN
    SELECT sa.*
    INTO v_agent
    FROM public.leads l
    JOIN public.sales_agents sa ON sa.id = l.sales_agent_id
    WHERE public.phones_match(l.number, v_phone)
      AND l.sales_agent_id IS NOT NULL
    ORDER BY l.updated_at DESC NULLS LAST, l.created_at DESC NULLS LAST
    LIMIT 1;
  END IF;

  IF v_agent.id IS NULL THEN
    RETURN jsonb_build_object('agent', NULL);
  END IF;

  RETURN jsonb_build_object(
    'agent', jsonb_build_object(
      'id', v_agent.id,
      'name', v_agent.name,
      'phone', nullif(trim(coalesce(v_agent.phone_number, '')), '')
    )
  );
END;
$$;

-- NOTE: Phone resolution was corrected in 023_fix_assigned_sales_agent_phone.sql
-- (falls back to app_users.phone from My Profile). Always run 023 after 022.

REVOKE ALL ON FUNCTION public.get_customer_assigned_sales_agent(text) FROM public;
GRANT EXECUTE ON FUNCTION public.get_customer_assigned_sales_agent(text)
  TO anon, authenticated, service_role;

COMMENT ON FUNCTION public.get_customer_assigned_sales_agent(text) IS
  'Returns the logged-in mobile customer''s assigned sales agent (name + phone) for Profile Support.';
