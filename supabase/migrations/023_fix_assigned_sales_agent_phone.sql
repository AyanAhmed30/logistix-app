-- 023 — Fix Support phone: use portal profile phone (app_users.phone)
-- Root cause: Sales Agents save phone on My Profile → app_users.phone,
-- while 022 only returned sales_agents.phone_number (often empty).

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
  v_display_phone text;
  v_profile_phone text;
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

  -- Prefer sales_agents.phone_number; fall back to portal profile (app_users.phone)
  v_display_phone := nullif(trim(coalesce(v_agent.phone_number, '')), '');

  IF v_display_phone IS NULL THEN
    BEGIN
      -- Link via app_user_id when present
      IF v_agent.app_user_id IS NOT NULL THEN
        SELECT nullif(trim(coalesce(au.phone, '')), '')
        INTO v_profile_phone
        FROM public.app_users au
        WHERE au.id = v_agent.app_user_id
        LIMIT 1;
      END IF;

      -- Fallback: username match (portal login username = sales_agents.username)
      IF v_profile_phone IS NULL
         AND nullif(trim(coalesce(v_agent.username, '')), '') IS NOT NULL THEN
        SELECT nullif(trim(coalesce(au.phone, '')), '')
        INTO v_profile_phone
        FROM public.app_users au
        WHERE lower(trim(au.username)) = lower(trim(v_agent.username))
        LIMIT 1;
      END IF;

      v_display_phone := v_profile_phone;
    EXCEPTION
      WHEN undefined_column THEN
        NULL;
      WHEN undefined_table THEN
        NULL;
    END;
  END IF;

  RETURN jsonb_build_object(
    'agent', jsonb_build_object(
      'id', v_agent.id,
      'name', v_agent.name,
      'phone', v_display_phone
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_customer_assigned_sales_agent(text) FROM public;
GRANT EXECUTE ON FUNCTION public.get_customer_assigned_sales_agent(text)
  TO anon, authenticated, service_role;

COMMENT ON FUNCTION public.get_customer_assigned_sales_agent(text) IS
  'Returns assigned sales agent name + phone (sales_agents.phone_number or app_users.phone).';
