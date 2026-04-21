-- Fix: ampliar membership_type CHECK para incluir 'membresia' (tipo genérico)
-- 'puntos'   = programa de puntos clásico
-- 'termo'    = membresía física específica (legacy, compatibilidad)
-- 'membresia'= membresía configurable (nuevo tipo genérico)

ALTER TABLE public.loyalty_customers
  DROP CONSTRAINT IF EXISTS loyalty_customers_membership_type_check;

ALTER TABLE public.loyalty_customers
  ADD CONSTRAINT loyalty_customers_membership_type_check
  CHECK (membership_type IN ('puntos', 'termo', 'membresia'));

-- También actualizar la función loyalty_use_daily_benefit para aceptar ambos tipos
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

  -- Aceptar 'termo' y 'membresia' (cualquier tipo que no sea 'puntos')
  IF v_customer.membership_type = 'puntos' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Este socio no tiene membresía con beneficio diario');
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

  -- Registrar impacto financiero en loyalty_transactions
  INSERT INTO public.loyalty_transactions
    (tenant_id, customer_id, type, points, amount, notes,
     financial_impact_type, financial_amount, branch_id)
  VALUES
    (v_customer.tenant_id, p_customer_id, 'beneficio_usado', 0, 0,
     'Beneficio diario: ' || p_benefit_type,
     'costo_beneficio', 0,  -- El costo WACC se actualiza desde el frontend
     p_branch_id);

  RETURN jsonb_build_object(
    'ok', true,
    'message', 'Beneficio registrado correctamente',
    'customer_name', v_customer.name,
    'benefit_type', p_benefit_type
  );
END;
$$;
