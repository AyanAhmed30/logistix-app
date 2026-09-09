-- 026 — Repair orphaned Sales Agents after portal user delete
-- + harden assignment RPC to skip agents with no portal login
--
-- Problem: Settings → Users delete only removed app_users; sales_agents rows
-- (e.g. "check user") remained, so customers stayed assigned to a dead agent.
--
-- This migration:
-- 1) Reassigns contacts/leads/opportunities off orphaned sales agents
-- 2) Deletes those orphaned sales_agent rows (when safe)
-- 3) Updates get_customer_assigned_sales_agent to ignore inactive orphans

-- Identify orphaned sales agents: no app_user_id match AND username not in app_users
CREATE OR REPLACE FUNCTION public._is_orphaned_sales_agent(p_agent_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_app_user_id uuid;
  v_username text;
  v_exists boolean := false;
BEGIN
  SELECT sa.app_user_id, sa.username
  INTO v_app_user_id, v_username
  FROM public.sales_agents sa
  WHERE sa.id = p_agent_id;

  IF NOT FOUND THEN
    RETURN true;
  END IF;

  IF v_app_user_id IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM public.app_users au WHERE au.id = v_app_user_id
    ) INTO v_exists;
    IF v_exists THEN
      RETURN false;
    END IF;
  END IF;

  IF nullif(btrim(coalesce(v_username, '')), '') IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1
      FROM public.app_users au
      WHERE lower(trim(au.username)) = lower(trim(v_username))
    ) INTO v_exists;
    IF v_exists THEN
      RETURN false;
    END IF;
  END IF;

  -- No matching portal user → orphaned
  RETURN true;
EXCEPTION
  WHEN undefined_table THEN
    RETURN false;
  WHEN undefined_column THEN
    RETURN false;
END;
$$;

-- Repair: reassign then delete orphaned sales agents that still own customers
CREATE OR REPLACE FUNCTION public.repair_orphaned_sales_agent_assignments()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_agent record;
  v_reassigned int := 0;
  v_deleted int := 0;
  v_blocked int := 0;
  v_result jsonb;
BEGIN
  FOR v_agent IN
    SELECT sa.id, sa.name, sa.username
    FROM public.sales_agents sa
    WHERE public._is_orphaned_sales_agent(sa.id)
    ORDER BY sa.created_at ASC NULLS LAST
  LOOP
    BEGIN
      v_result := public.reassign_customers_before_sales_agent_delete(v_agent.id);
      v_reassigned := v_reassigned + coalesce((v_result->>'reassigned_contacts')::int, 0);

      DELETE FROM public.sales_agents WHERE id = v_agent.id;
      v_deleted := v_deleted + 1;
    EXCEPTION
      WHEN others THEN
        IF SQLERRM ILIKE '%cannot_delete_sales_agent_no_replacement%'
           OR SQLERRM ILIKE '%no other active sales agent%' THEN
          -- Mark inactive so new assignments skip them; leave row if delete blocked
          BEGIN
            UPDATE public.sales_agents
            SET is_active = false, updated_at = now()
            WHERE id = v_agent.id;
          EXCEPTION
            WHEN undefined_column THEN
              NULL;
          END;
          v_blocked := v_blocked + 1;
        ELSE
          RAISE WARNING 'repair orphan agent % failed: %', v_agent.id, SQLERRM;
          v_blocked := v_blocked + 1;
        END IF;
    END;
  END LOOP;

  RETURN jsonb_build_object(
    'reassigned_contacts', v_reassigned,
    'deleted_agents', v_deleted,
    'blocked_agents', v_blocked
  );
END;
$$;

REVOKE ALL ON FUNCTION public._is_orphaned_sales_agent(uuid) FROM public;
REVOKE ALL ON FUNCTION public.repair_orphaned_sales_agent_assignments() FROM public;
GRANT EXECUTE ON FUNCTION public._is_orphaned_sales_agent(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.repair_orphaned_sales_agent_assignments() TO service_role;

-- Exclude orphaned / inactive agents from auto assignment pool
CREATE OR REPLACE FUNCTION public._pick_least_loaded_sales_agent_excluding(
  p_exclude_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_agent_id uuid;
BEGIN
  SELECT sa.id
  INTO v_agent_id
  FROM public.sales_agents sa
  WHERE coalesce(sa.is_active, true) = true
    AND nullif(btrim(coalesce(sa.username, '')), '') IS NOT NULL
    AND (p_exclude_id IS NULL OR sa.id IS DISTINCT FROM p_exclude_id)
    AND NOT public._is_orphaned_sales_agent(sa.id)
  ORDER BY (
    SELECT count(*)::bigint
    FROM public.contacts c
    WHERE c.salesperson_id = sa.id
      AND c.mobile_registered_at IS NOT NULL
      AND coalesce(c.is_active, true) = true
  ) ASC,
  sa.last_mobile_auto_assigned_at ASC NULLS FIRST,
  sa.id ASC
  LIMIT 1;

  RETURN v_agent_id;
END;
$$;

-- Mobile Support: if current agent is orphaned, fall through to a living agent? 
-- Prefer NOT silently switching on read — repair migration fixes data.
-- Still: resolve agent only if not orphaned; otherwise return null phone path
-- by treating orphan as missing so UI can recover after repair.
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
  v_replacement uuid;
  v_replacement_username text;
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

  -- If assigned agent is orphaned (portal user deleted), reassign now
  IF v_agent.id IS NOT NULL AND public._is_orphaned_sales_agent(v_agent.id) THEN
    PERFORM pg_advisory_xact_lock(872314001);
    v_replacement := public._pick_least_loaded_sales_agent_excluding(v_agent.id);
    IF v_replacement IS NOT NULL THEN
      SELECT sa.username INTO v_replacement_username
      FROM public.sales_agents sa
      WHERE sa.id = v_replacement;

      UPDATE public.contacts
      SET
        salesperson_id = v_replacement,
        created_by = coalesce(nullif(btrim(coalesce(v_replacement_username, '')), ''), created_by),
        updated_at = now()
      WHERE id = v_contact.id;

      BEGIN
        PERFORM public._record_contact_sales_assignment(
          v_contact.id,
          v_replacement,
          v_agent.id,
          'automatic',
          'orphaned_agent_repair',
          'reassigned_on_support_lookup'
        );
      EXCEPTION
        WHEN others THEN NULL;
      END;

      BEGIN
        UPDATE public.crm_opportunities
        SET salesperson_id = v_replacement, updated_at = now()
        WHERE contact_id = v_contact.id
          AND salesperson_id IS NOT DISTINCT FROM v_agent.id;
      EXCEPTION
        WHEN others THEN NULL;
      END;

      SELECT sa.* INTO v_agent FROM public.sales_agents sa WHERE sa.id = v_replacement;
    ELSE
      -- No replacement available — do not show dead agent as contactable
      RETURN jsonb_build_object('agent', NULL);
    END IF;
  END IF;

  IF v_agent.id IS NULL THEN
    RETURN jsonb_build_object('agent', NULL);
  END IF;

  v_display_phone := nullif(trim(coalesce(v_agent.phone_number, '')), '');

  IF v_display_phone IS NULL THEN
    BEGIN
      IF v_agent.app_user_id IS NOT NULL THEN
        SELECT nullif(trim(coalesce(au.phone, '')), '')
        INTO v_profile_phone
        FROM public.app_users au
        WHERE au.id = v_agent.app_user_id
        LIMIT 1;
      END IF;

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
      WHEN undefined_column THEN NULL;
      WHEN undefined_table THEN NULL;
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

-- One-shot repair for already-orphaned agents (e.g. "check user")
SELECT public.repair_orphaned_sales_agent_assignments();
