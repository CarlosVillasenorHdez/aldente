-- close_order v9 — closed_at en formato ISO 8601 con T (compatible con dashboard)
-- Fix: to_char(v_now, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') en lugar de v_now::text

DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT oid::regprocedure::text AS sig FROM pg_proc
    WHERE proname = 'close_order' AND pronamespace = 'public'::regnamespace
  LOOP
    EXECUTE 'DROP FUNCTION IF EXISTS ' || r.sig || ' CASCADE';
  END LOOP;
END $$;

CREATE FUNCTION close_order(
  p_order_id            TEXT,
  p_tenant_id           TEXT,
  p_subtotal            NUMERIC,
  p_iva                 NUMERIC,
  p_discount            NUMERIC,
  p_total               NUMERIC,
  p_pay_method          TEXT,
  p_mesero              TEXT,
  p_branch              TEXT,
  p_opened_at           TEXT,
  p_loyalty_customer_id TEXT,
  p_loyalty_points      INTEGER,
  p_tip                 NUMERIC,
  p_table_ids           TEXT[]
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_now           TIMESTAMPTZ := now();
  v_now_iso       TEXT;           -- formato "2026-05-04T14:54:42.211Z" — compatible con dashboard
  v_tenant        UUID;
  v_loyalty       UUID;
  v_table_uuids   UUID[];
  v_pay_method    public.payment_method;
  v_cost_actual   NUMERIC := 0;
  v_margin_actual NUMERIC;
  v_margin_pct    NUMERIC;
  v_rec           RECORD;
  v_deduct        NUMERIC;
  v_cur_stock     NUMERIC;
  v_new_stock     NUMERIC;
  v_cost_unit     NUMERIC;
BEGIN

  -- ISO 8601 con T — el dashboard filtra por comparación de strings
  v_now_iso := to_char(v_now AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"');

  -- Casts de tipos
  v_tenant      := p_tenant_id::UUID;
  v_table_uuids := ARRAY(
    SELECT unnest(p_table_ids)::UUID
    FROM unnest(p_table_ids) AS t
    WHERE t ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  );

  IF p_loyalty_customer_id IS NOT NULL AND p_loyalty_customer_id <> '' THEN
    BEGIN
      v_loyalty := p_loyalty_customer_id::UUID;
    EXCEPTION WHEN invalid_text_representation THEN
      v_loyalty := NULL;
    END;
  END IF;

  BEGIN
    v_pay_method := p_pay_method::public.payment_method;
  EXCEPTION WHEN invalid_text_representation THEN
    v_pay_method := 'efectivo'::public.payment_method;
  END;

  -- PASO 1: Cerrar la orden — closed_at en formato ISO con T
  UPDATE orders SET
    subtotal       = p_subtotal,
    iva            = p_iva,
    discount       = p_discount,
    total          = p_total,
    status         = 'cerrada',
    kitchen_status = 'entregada',
    pay_method     = v_pay_method,
    mesero         = p_mesero,
    branch         = p_branch,
    opened_at      = COALESCE(p_opened_at, v_now_iso),
    closed_at      = v_now_iso,          -- "2026-05-04T14:54:42.211Z" ✓
    updated_at     = v_now_iso
  WHERE id = p_order_id AND tenant_id = v_tenant;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Orden % no encontrada', p_order_id;
  END IF;

  BEGIN
    UPDATE orders SET loyalty_customer_id = v_loyalty
    WHERE id = p_order_id AND tenant_id = v_tenant;
  EXCEPTION WHEN undefined_column THEN NULL; END;

  BEGIN
    UPDATE orders SET tip = NULLIF(p_tip, 0)
    WHERE id = p_order_id AND tenant_id = v_tenant;
  EXCEPTION WHEN undefined_column THEN NULL; END;

  -- PASO 2: Descontar inventario
  FOR v_rec IN
    SELECT
      oi.dish_id,
      oi.qty             AS item_qty,
      dr.ingredient_id,
      dr.quantity        AS recipe_qty,
      i.stock            AS ing_stock,
      COALESCE(i.cost,0) AS ing_cost,
      oi.name            AS dish_name
    FROM order_items  oi
    JOIN dish_recipes dr ON dr.dish_id   = oi.dish_id
                        AND dr.tenant_id = v_tenant
    JOIN ingredients  i  ON i.id         = dr.ingredient_id
                        AND i.tenant_id  = v_tenant
    WHERE oi.order_id  = p_order_id
      AND oi.tenant_id = v_tenant
      AND oi.dish_id  IS NOT NULL
  LOOP
    v_deduct      := v_rec.recipe_qty * v_rec.item_qty;
    v_cur_stock   := v_rec.ing_stock;
    v_new_stock   := GREATEST(0, v_cur_stock - v_deduct);
    v_cost_unit   := v_rec.ing_cost;
    v_cost_actual := v_cost_actual + (v_deduct * v_cost_unit);

    UPDATE ingredients SET stock = v_new_stock, updated_at = v_now
    WHERE id = v_rec.ingredient_id AND tenant_id = v_tenant;

    INSERT INTO stock_movements (
      tenant_id, ingredient_id, movement_type,
      quantity, previous_stock, new_stock,
      reason, created_by, unit_cost, total_cost, created_at
    ) VALUES (
      v_tenant, v_rec.ingredient_id, 'salida',
      v_deduct, v_cur_stock, v_new_stock,
      'Venta: ' || v_rec.dish_name || ' x' || v_rec.item_qty || ' — ' || p_order_id,
      'Sistema (close_order)', v_cost_unit, v_deduct * v_cost_unit, v_now
    );
  END LOOP;

  -- PASO 3: Margen
  v_margin_actual := p_total - v_cost_actual;
  v_margin_pct    := CASE WHEN p_total > 0 THEN (v_margin_actual / p_total) * 100 ELSE 0 END;

  UPDATE orders SET
    cost_actual = v_cost_actual, margin_actual = v_margin_actual, margin_pct = v_margin_pct
  WHERE id = p_order_id AND tenant_id = v_tenant;

  -- PASO 4: Liberar mesas (solo UUIDs reales, ignora takeout-xxx)
  IF v_table_uuids IS NOT NULL AND array_length(v_table_uuids, 1) > 0 THEN
    UPDATE restaurant_tables SET
      status = 'libre', current_order_id = NULL, waiter = NULL,
      opened_at = NULL, item_count = NULL, updated_at = v_now
    WHERE id = ANY(v_table_uuids) AND tenant_id = v_tenant;

    BEGIN
      UPDATE restaurant_tables SET partial_total = NULL, merge_group_id = NULL
      WHERE id = ANY(v_table_uuids) AND tenant_id = v_tenant;
    EXCEPTION WHEN undefined_column THEN NULL; END;
  END IF;

  -- PASO 5: Lealtad
  IF v_loyalty IS NOT NULL AND p_loyalty_points > 0 THEN
    UPDATE loyalty_customers SET
      points      = COALESCE(points, 0) + p_loyalty_points,
      total_spent = COALESCE(total_spent, 0) + p_total,
      last_visit  = v_now, updated_at = v_now
    WHERE id = v_loyalty AND tenant_id = v_tenant;

    INSERT INTO loyalty_transactions (
      tenant_id, customer_id, order_id, type, points, amount, notes, created_at
    ) VALUES (
      v_tenant, v_loyalty, p_order_id,
      'acumulacion', p_loyalty_points, p_total, 'Compra — ' || p_order_id, v_now
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true, 'cost_actual', v_cost_actual,
    'margin_actual', v_margin_actual, 'margin_pct', v_margin_pct
  );

EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'close_order[%]: % — Detalle: %', p_order_id, SQLERRM, SQLSTATE;
END;
$$;

GRANT EXECUTE ON FUNCTION close_order TO anon;
GRANT EXECUTE ON FUNCTION close_order TO authenticated;

SELECT proname, pg_get_function_identity_arguments(oid) AS firma
FROM pg_proc
WHERE proname = 'close_order' AND pronamespace = 'public'::regnamespace;
