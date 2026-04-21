-- Migración: registrar costo WACC real del beneficio diario
-- El costo del platillo regalado debe fluir al P&L para que
-- el estado de resultados sea correcto.

-- Actualizar loyalty_use_daily_benefit para leer el WACC real
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
  check_result AS (
    SELECT
      id, name, tenant_id, is_active, membership_type,
      membership_expires_at, daily_benefit_used_at, daily_benefit_used_branch_id,
      (id IS NOT NULL) AS found,
      is_active AS active,
      (membership_type != 'puntos') AS valid_type,
      (membership_expires_at IS NULL OR membership_expires_at >= now()) AS not_expired,
      (
        daily_benefit_used_at IS NULL OR
        (daily_benefit_used_at AT TIME ZONE 'America/Mexico_City')::date
          < (now() AT TIME ZONE 'America/Mexico_City')::date
      ) AS benefit_available
    FROM cust
  ),
  -- Leer el producto configurado como beneficio y su costo WACC
  benefit_config AS (
    SELECT
      (SELECT config_value FROM public.system_config
       WHERE tenant_id = public.auth_tenant_id()
         AND config_key = 'loyalty_benefit_free_product_id' LIMIT 1) AS product_id
  ),
  benefit_cost AS (
    SELECT
      COALESCE(
        (SELECT
           COALESCE(ingredient_cost, 0) + COALESCE(labor_cost, 0)
         FROM public.v_dish_cost_summary
         WHERE dish_id = (SELECT product_id::uuid FROM benefit_config WHERE product_id != '' AND product_id IS NOT NULL)
         LIMIT 1),
        0
      ) AS wacc_cost,
      COALESCE(
        (SELECT price FROM public.dishes
         WHERE id = (SELECT product_id::uuid FROM benefit_config WHERE product_id != '' AND product_id IS NOT NULL)
         LIMIT 1),
        0
      ) AS sale_price
  ),
  do_update AS (
    UPDATE public.loyalty_customers
    SET daily_benefit_used_at        = now(),
        daily_benefit_used_branch_id = p_branch_id,
        updated_at                   = now()
    WHERE id = (SELECT id FROM check_result
                WHERE found AND active AND valid_type AND not_expired AND benefit_available)
    RETURNING id, tenant_id, name
  ),
  do_log AS (
    INSERT INTO public.loyalty_daily_benefit_log
      (tenant_id, customer_id, branch_id, benefit_type, registered_by)
    SELECT tenant_id, id, p_branch_id, p_benefit_type, p_registered_by
    FROM do_update
    RETURNING id
  ),
  do_tx AS (
    INSERT INTO public.loyalty_transactions
      (tenant_id, customer_id, type, points, amount, notes,
       financial_impact_type, financial_amount, branch_id)
    SELECT
      u.tenant_id,
      u.id,
      'beneficio_usado',
      0,
      bc.sale_price,           -- precio de venta del platillo (referencia)
      'Beneficio diario: ' || p_benefit_type,
      'costo_beneficio',
      bc.wacc_cost,            -- COSTO REAL WACC del platillo regalado
      p_branch_id
    FROM do_update u
    CROSS JOIN benefit_cost bc
    RETURNING id
  )
  SELECT
    CASE
      WHEN NOT (SELECT found             FROM check_result)
        THEN jsonb_build_object('ok', false, 'error', 'Socio no encontrado')
      WHEN NOT (SELECT active            FROM check_result)
        THEN jsonb_build_object('ok', false, 'error', 'Membresía inactiva o vencida')
      WHEN NOT (SELECT valid_type        FROM check_result)
        THEN jsonb_build_object('ok', false, 'error', 'Este socio no tiene membresía con beneficio')
      WHEN NOT (SELECT not_expired       FROM check_result)
        THEN jsonb_build_object('ok', false, 'error', 'Membresía vencida')
      WHEN NOT (SELECT benefit_available FROM check_result)
        THEN jsonb_build_object(
          'ok', false,
          'error', 'El beneficio del día ya fue utilizado',
          'used_at', (SELECT daily_benefit_used_at FROM check_result)
        )
      ELSE jsonb_build_object(
        'ok', true,
        'message', 'Beneficio registrado correctamente',
        'customer_name', (SELECT name FROM check_result),
        'wacc_cost', (SELECT wacc_cost FROM benefit_cost)
      )
    END;
$$;
