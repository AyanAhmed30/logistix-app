-- 027 — Strengthen mobile → CRM Opportunity on New board
-- Prerequisites: 021 (register_user), 024 (mobile_app opportunity helper + trigger)
--
-- Ensures:
--   * Opportunity created only for new mobile contacts (unique phone → new contact)
--   * Assigned to same salesperson_id after agent assignment
--   * Appears on agent's CRM org "New" stage (uses agent's portal default org when available)
--   * Idempotent on signup retry / first login repair (never duplicates)
--   * Login of existing users does not create a second opportunity

-- Prefer Sales Agent's portal default organization so the opp shows in their CRM switcher
CREATE OR REPLACE FUNCTION public._organization_id_for_sales_agent(p_agent_id uuid)
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org uuid;
  v_app_user_id uuid;
BEGIN
  IF p_agent_id IS NULL THEN
    RETURN public._default_organization_id_for_mobile();
  END IF;

  SELECT sa.app_user_id INTO v_app_user_id
  FROM public.sales_agents sa
  WHERE sa.id = p_agent_id;

  IF v_app_user_id IS NOT NULL THEN
    BEGIN
      SELECT coalesce(au.default_organization_id, au.default_organization)
      INTO v_org
      FROM public.app_users au
      WHERE au.id = v_app_user_id;
    EXCEPTION
      WHEN undefined_column THEN
        BEGIN
          SELECT au.default_organization INTO v_org
          FROM public.app_users au
          WHERE au.id = v_app_user_id;
        EXCEPTION
          WHEN others THEN
            v_org := NULL;
        END;
    END;

    IF v_org IS NOT NULL THEN
      RETURN v_org;
    END IF;

    BEGIN
      SELECT uo.organization_id INTO v_org
      FROM public.user_organizations uo
      WHERE uo.user_id = v_app_user_id
      ORDER BY uo.created_at ASC NULLS LAST
      LIMIT 1;
      IF v_org IS NOT NULL THEN
        RETURN v_org;
      END IF;
    EXCEPTION
      WHEN undefined_table THEN
        NULL;
    END;
  END IF;

  RETURN public._default_organization_id_for_mobile();
END;
$$;

CREATE OR REPLACE FUNCTION public._ensure_mobile_app_crm_opportunity(
  p_contact_id uuid,
  p_organization_id uuid,
  p_salesperson_id uuid,
  p_contact_name text,
  p_email text,
  p_phone text,
  p_created_by text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_opp_id uuid;
  v_stage_id uuid;
  v_name text;
  v_prob int := 10;
  v_org uuid;
BEGIN
  IF p_contact_id IS NULL OR p_salesperson_id IS NULL THEN
    RETURN NULL;
  END IF;

  v_org := coalesce(
    p_organization_id,
    public._organization_id_for_sales_agent(p_salesperson_id)
  );
  IF v_org IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT o.id
  INTO v_opp_id
  FROM public.crm_opportunities o
  WHERE o.contact_id = p_contact_id
    AND o.source = 'mobile_app'
  LIMIT 1;

  IF v_opp_id IS NOT NULL THEN
    UPDATE public.crm_opportunities
    SET
      salesperson_id = coalesce(salesperson_id, p_salesperson_id),
      updated_at = now()
    WHERE id = v_opp_id
      AND salesperson_id IS NULL;
    RETURN v_opp_id;
  END IF;

  v_stage_id := public._ensure_crm_new_stage_for_org(v_org);
  IF v_stage_id IS NULL THEN
    RETURN NULL;
  END IF;

  BEGIN
    SELECT coalesce(s.default_probability, 10)
    INTO v_prob
    FROM public.crm_pipeline_stages s
    WHERE s.id = v_stage_id;
  EXCEPTION
    WHEN undefined_column THEN
      v_prob := 10;
  END;

  v_name := nullif(btrim(coalesce(p_contact_name, '')), '');
  IF v_name IS NULL THEN
    v_name := 'Mobile App Customer';
  END IF;
  v_name := v_name || '''s Opportunity';

  UPDATE public.contacts
  SET organization_id = coalesce(organization_id, v_org), updated_at = now()
  WHERE id = p_contact_id
    AND organization_id IS NULL;

  BEGIN
    INSERT INTO public.crm_opportunities (
      organization_id,
      stage_id,
      name,
      contact_id,
      expected_revenue,
      probability,
      priority,
      salesperson_id,
      source,
      email,
      phone,
      mobile,
      created_by,
      updated_at
    ) VALUES (
      v_org,
      v_stage_id,
      v_name,
      p_contact_id,
      0,
      v_prob,
      0,
      p_salesperson_id,
      'mobile_app',
      nullif(btrim(coalesce(p_email, '')), ''),
      nullif(btrim(coalesce(p_phone, '')), ''),
      nullif(btrim(coalesce(p_phone, '')), ''),
      coalesce(nullif(btrim(coalesce(p_created_by, '')), ''), 'mobile_register'),
      now()
    )
    RETURNING id INTO v_opp_id;
  EXCEPTION
    WHEN unique_violation THEN
      SELECT o.id INTO v_opp_id
      FROM public.crm_opportunities o
      WHERE o.contact_id = p_contact_id
        AND o.source = 'mobile_app'
      LIMIT 1;
    WHEN undefined_table THEN
      RETURN NULL;
    WHEN others THEN
      RAISE WARNING 'mobile_app opportunity create failed for contact %: %', p_contact_id, SQLERRM;
      RETURN NULL;
  END;

  RETURN v_opp_id;
END;
$$;

CREATE OR REPLACE FUNCTION public._ensure_mobile_app_opportunity_for_user(p_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_phone text;
  v_contact public.contacts%rowtype;
  v_org uuid;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT u.phone INTO v_phone FROM public.users u WHERE u.id = p_user_id;
  IF v_phone IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT ct.*
  INTO v_contact
  FROM public.contacts ct
  WHERE ct.mobile_user_id = p_user_id
     OR public.phones_match(ct.phone, v_phone)
     OR public.phones_match(ct.mobile, v_phone)
  ORDER BY
    CASE WHEN ct.mobile_user_id = p_user_id THEN 0 ELSE 1 END,
    CASE WHEN lower(coalesce(ct.source, '')) = 'mobile_app' THEN 0 ELSE 1 END,
    CASE WHEN ct.mobile_registered_at IS NOT NULL THEN 0 ELSE 1 END,
    ct.created_at DESC NULLS LAST
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  IF lower(coalesce(v_contact.source, '')) <> 'mobile_app'
     AND v_contact.mobile_registered_at IS NULL THEN
    RETURN NULL;
  END IF;

  IF v_contact.salesperson_id IS NULL THEN
    RETURN NULL;
  END IF;

  v_org := coalesce(
    v_contact.organization_id,
    public._organization_id_for_sales_agent(v_contact.salesperson_id)
  );

  RETURN public._ensure_mobile_app_crm_opportunity(
    v_contact.id,
    v_org,
    v_contact.salesperson_id,
    v_contact.name,
    v_contact.email,
    coalesce(v_contact.phone, v_contact.mobile, v_phone),
    coalesce(v_contact.created_by, 'mobile_register')
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_contacts_create_mobile_app_opportunity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org uuid;
BEGIN
  IF TG_OP = 'INSERT'
     AND lower(coalesce(NEW.source, '')) = 'mobile_app'
     AND NEW.salesperson_id IS NOT NULL THEN
    v_org := coalesce(
      NEW.organization_id,
      public._organization_id_for_sales_agent(NEW.salesperson_id)
    );
    PERFORM public._ensure_mobile_app_crm_opportunity(
      NEW.id,
      v_org,
      NEW.salesperson_id,
      NEW.name,
      NEW.email,
      coalesce(NEW.phone, NEW.mobile),
      coalesce(NEW.created_by, 'mobile_register')
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_contacts_create_mobile_app_opportunity ON public.contacts;
CREATE TRIGGER trg_contacts_create_mobile_app_opportunity
  AFTER INSERT ON public.contacts
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_contacts_create_mobile_app_opportunity();

CREATE OR REPLACE FUNCTION public.trg_contacts_mobile_app_opportunity_on_assign()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org uuid;
BEGIN
  IF TG_OP = 'UPDATE'
     AND lower(coalesce(NEW.source, '')) = 'mobile_app'
     AND NEW.salesperson_id IS NOT NULL
     AND OLD.salesperson_id IS NULL THEN
    v_org := coalesce(
      NEW.organization_id,
      public._organization_id_for_sales_agent(NEW.salesperson_id)
    );
    PERFORM public._ensure_mobile_app_crm_opportunity(
      NEW.id,
      v_org,
      NEW.salesperson_id,
      NEW.name,
      NEW.email,
      coalesce(NEW.phone, NEW.mobile),
      coalesce(NEW.created_by, 'mobile_register')
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_contacts_mobile_app_opportunity_on_assign ON public.contacts;
CREATE TRIGGER trg_contacts_mobile_app_opportunity_on_assign
  AFTER UPDATE OF salesperson_id ON public.contacts
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_contacts_mobile_app_opportunity_on_assign();

CREATE OR REPLACE FUNCTION public.login_user(p_phone text, p_password text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_user public.users%rowtype;
  v_session record;
BEGIN
  SELECT * INTO v_user
  FROM public.users u
  WHERE public.phones_match(u.phone, trim(p_phone))
     OR u.phone = trim(p_phone)
  ORDER BY CASE WHEN u.phone = trim(p_phone) THEN 0 ELSE 1 END, u.created_at ASC
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'invalid_credentials';
  END IF;

  IF v_user.password_hash IS DISTINCT FROM extensions.crypt(p_password, v_user.password_hash) THEN
    RAISE EXCEPTION 'invalid_credentials';
  END IF;

  SELECT * INTO v_session FROM public._issue_user_session(v_user.id);

  BEGIN
    PERFORM public._ensure_mobile_app_opportunity_for_user(v_user.id);
  EXCEPTION
    WHEN others THEN
      NULL;
  END;

  RETURN jsonb_build_object(
    'user', jsonb_build_object(
      'id', v_user.id,
      'phone', v_user.phone,
      'email', v_user.email,
      'first_name', v_user.first_name,
      'last_name', v_user.last_name,
      'created_at', v_user.created_at
    ),
    'session_token', v_session.session_token,
    'expires_at', v_session.expires_at
  );
END;
$$;

REVOKE ALL ON FUNCTION public.login_user(text, text) FROM public;
GRANT EXECUTE ON FUNCTION public.login_user(text, text) TO anon, authenticated, service_role;

REVOKE ALL ON FUNCTION public._organization_id_for_sales_agent(uuid) FROM public;
REVOKE ALL ON FUNCTION public._ensure_mobile_app_opportunity_for_user(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public._organization_id_for_sales_agent(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public._ensure_mobile_app_opportunity_for_user(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public._ensure_mobile_app_crm_opportunity(uuid, uuid, uuid, text, text, text, text) TO service_role;
