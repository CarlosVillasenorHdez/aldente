-- Fix definitivo: loyalty_use_daily_benefit en SQL puro
-- Sin DECLARE, sin variables, sin el problema de validación de Supabase.
-- Usa CTEs para hacer todo en una sola query atómica.

CREATE OR REPLACE FUNCTION public.loyalty_use_daily_benefit(
  p_customer_id   uuid,
  p_branch_id     uuid    DEFAULT NULL,
  p_registered_by text    DEFAULT '',
  p_benefit_type  text    DEFAULT 'cafe_gratis'
) RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
AS $$
  WITH
  -- 1. Leer el cliente
  cust AS (
    SELECT id, name, tenant_id, is_active, membership_type,
           membership_expires_at,
           daily_benefit_used_at,
           daily_benefit_used_branch_id
    FROM public.loyalty_customers
    WHERE id = p_customer_id
      AND tenant_id = public.auth_tenant_id()
    LIMIT 1
  ),
  -- 2. Calcular disponibilidad
  check_result AS (
    SELECT
      id, name, tenant_id, is_active, membership_type,
      membership_expires_at,
      daily_benefit_used_at,
      daily_benefit_used_branch_id,
      -- ¿Existe el cliente?
      (id IS NOT NULL) AS found,
      -- ¿Membresía activa?
      is_active AS active,
      -- ¿Tipo correcto?
      (membership_type != 'puntos') AS valid_type,
      -- ¿No vencida?
      (membership_expires_at IS NULL OR membership_expires_at >= now()) AS not_expired,
      -- ¿Beneficio disponible hoy? (zona CDMX UTC-6)
      (
        daily_benefit_used_at IS NULL OR
        (daily_benefit_used_at AT TIME ZONE 'America/Mexico_City')::date
          < (now() AT TIME ZONE 'America/Mexico_City')::date
      ) AS benefit_available
    FROM cust
  ),
  -- 3. Actualizar si todo está OK (update solo ejecuta si can_use = true)
  do_update AS (
    UPDATE public.loyalty_customers
    SET daily_benefit_used_at        = now(),
        daily_benefit_used_branch_id = p_branch_id,
        updated_at                   = now()
    WHERE id = (SELECT id FROM check_result WHERE found AND active AND valid_type AND not_expired AND benefit_available)
    RETURNING id, tenant_id, name
  ),
  -- 4. Log del beneficio (solo si el update ocurrió)
  do_log AS (
    INSERT INTO public.loyalty_daily_benefit_log
      (tenant_id, customer_id, branch_id, benefit_type, registered_by)
    SELECT tenant_id, id, p_branch_id, p_benefit_type, p_registered_by
    FROM do_update
    RETURNING id
  ),
  -- 5. Registrar impacto en P&L (solo si el update ocurrió)
  do_tx AS (
    INSERT INTO public.loyalty_transactions
      (tenant_id, customer_id, type, points, amount, notes,
       financial_impact_type, financial_amount, branch_id)
    SELECT tenant_id, id, 'beneficio_usado', 0, 0,
           'Beneficio diario: ' || p_benefit_type,
           'costo_beneficio', 0, p_branch_id
    FROM do_update
    RETURNING id
  )
  -- 6. Devolver resultado
  SELECT
    CASE
      WHEN NOT (SELECT found          FROM check_result) THEN jsonb_build_object('ok', false, 'error', 'Socio no encontrado')
      WHEN NOT (SELECT active         FROM check_result) THEN jsonb_build_object('ok', false, 'error', 'Membresía inactiva o vencida')
      WHEN NOT (SELECT valid_type     FROM check_result) THEN jsonb_build_object('ok', false, 'error', 'Este socio no tiene membresía con beneficio')
      WHEN NOT (SELECT not_expired    FROM check_result) THEN jsonb_build_object('ok', false, 'error', 'Membresía vencida')
      WHEN NOT (SELECT benefit_available FROM check_result) THEN jsonb_build_object(
        'ok', false,
        'error', 'El beneficio del día ya fue utilizado',
        'used_at', (SELECT daily_benefit_used_at FROM check_result),
        'used_branch_id', (SELECT daily_benefit_used_branch_id FROM check_result)
      )
      ELSE jsonb_build_object(
        'ok', true,
        'message', 'Beneficio registrado correctamente',
        'customer_name', (SELECT name FROM check_result)
      )
    END;
$$;
