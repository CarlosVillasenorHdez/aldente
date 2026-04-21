-- Membresía Termo — Parte 2: funciones plpgsql
-- Corre DESPUÉS de haber corrido el script _part1

-- ── Función: verificar si el beneficio está disponible hoy ───────────────────
CREATE OR REPLACE FUNCTION public.loyalty_benefit_available_today(
  p_customer_id uuid
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_used_at timestamptz;
  v_tz      text := 'America/Mexico_City';
BEGIN
  SELECT lc.daily_benefit_used_at
  INTO v_used_at
  FROM public.loyalty_customers lc
  WHERE lc.id = p_customer_id;

  RETURN (
    v_used_at IS NULL OR
    (v_used_at AT TIME ZONE v_tz)::date < (now() AT TIME ZONE v_tz)::date
  );
END;
$$;

-- ── Función: marcar beneficio como usado ─────────────────────────────────────
CREATE OR REPLACE FUNCTION public.loyalty_use_daily_benefit(
  p_customer_id   uuid,
  p_branch_id     uuid    DEFAULT NULL,
  p_registered_by text    DEFAULT '',
  p_benefit_type  text    DEFAULT 'cafe_gratis'
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_customer  public.loyalty_customers%ROWTYPE;
  v_available boolean;
  v_tz        text := 'America/Mexico_City';
BEGIN
  SELECT * INTO v_customer
  FROM public.loyalty_customers
  WHERE id = p_customer_id
    AND tenant_id = public.auth_tenant_id();

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Socio no encontrado');
  END IF;

  IF NOT v_customer.is_active THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Membresía inactiva o vencida');
  END IF;

  IF v_customer.membership_type != 'termo' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Este socio no tiene membresía Termo');
  END IF;

  IF v_customer.membership_expires_at IS NOT NULL
     AND v_customer.membership_expires_at < now() THEN
    UPDATE public.loyalty_customers
      SET is_active = false, updated_at = now()
      WHERE id = p_customer_id;
    RETURN jsonb_build_object('ok', false, 'error', 'Membresía vencida');
  END IF;

  v_available := (
    v_customer.daily_benefit_used_at IS NULL OR
    (v_customer.daily_benefit_used_at AT TIME ZONE v_tz)::date
      < (now() AT TIME ZONE v_tz)::date
  );

  IF NOT v_available THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'El beneficio del día ya fue utilizado',
      'used_at', v_customer.daily_benefit_used_at,
      'used_branch_id', v_customer.daily_benefit_used_branch_id
    );
  END IF;

  UPDATE public.loyalty_customers
  SET daily_benefit_used_at        = now(),
      daily_benefit_used_branch_id = p_branch_id,
      updated_at                   = now()
  WHERE id = p_customer_id;

  INSERT INTO public.loyalty_daily_benefit_log
    (tenant_id, customer_id, branch_id, benefit_type, registered_by)
  VALUES
    (v_customer.tenant_id, p_customer_id, p_branch_id, p_benefit_type, p_registered_by);

  RETURN jsonb_build_object(
    'ok', true,
    'message', 'Beneficio registrado correctamente',
    'customer_name', v_customer.name,
    'benefit_type', p_benefit_type
  );
END;
$$;
