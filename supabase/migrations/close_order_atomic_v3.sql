-- ══════════════════════════════════════════════════════════════════════════════
-- Aldente ERP — close_order v3
-- Fix: cast TEXT → payment_method enum + agregar valor 'mixto' al enum
-- Ejecutar en: Supabase → SQL Editor
-- ══════════════════════════════════════════════════════════════════════════════

-- 1. Agregar 'mixto' al enum si no existe (para pagos divididos)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'mixto'
      AND enumtypid = 'public.payment_method'::regtype
  ) THEN
    ALTER TYPE public.payment_method ADD VALUE 'mixto';
  END IF;
END $$;

-- 2. Reemplazar la función con cast correcto
DROP FUNCTION IF EXISTS close_order(TEXT, UUID, NUMERIC, NUMERIC, NUMERIC, NUMERIC, TEXT, TEXT, TEXT, TEXT, UUID, INTEGER, NUMERIC, TEXT[]);

CREATE OR REPLACE FUNCTION close_order(
  p_order_id            TEXT,
  p_tenant_id           UUID,
  p_subtotal            NUMERIC,
  p_iva                 NUMERIC,
  p_discount            NUMERIC,
  p_total               NUMERIC,
  p_pay_method          TEXT,       -- cast a payment_method dentro de la función
  p_mesero              TEXT,
  p_branch              TEXT,
  p_opened_at           TEXT,
  p_loyalty_customer_id UUID,
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
  v_cost_actual   NUMERIC     := 0;
  v_margin_actual NUMERIC;
  v_margin_pct    NUMERIC;
  v_rec           RECORD;
  v_deduct_qty    NUMERIC;
  v_cur_stock     NUMERIC;
  v_new_stock     NUMERIC;
  v_cost_unit     NUMERIC;
  v_pay_method    public.payment_method;
BEGIN

  -- Cast seguro de TEXT → payment_method
  -- Si el valor no existe en el enum, usar 'efectivo' como fallback
  BEGIN
    v_pay_method := p_pay_method::public.payment_method;
  EXCEPTION WHEN invalid_text_representation THEN
    v_pay_method := 'efectivo'::public.payment_method;
  END;

  -- ── PASO 1: Cerrar la orden ────────────────────────────────────────────────
  UPDATE orders
  SET
    subtotal       = p_subtotal,
    iva            = p_iva,
    discount       = p_discount,
    total          = p_total,
    status         = 'cerrada',
    kitchen_status = 'entregada',
    pay_method     = v_pay_method,       -- tipo correcto
    mesero         = p_mesero,
    branch         = p_branch,
    opened_at      = COALESCE(p_opened_at::TIMESTAMPTZ, v_now),
    closed_at      = v_now,
    updated_at     = v_now
  WHERE id        = p_order_id
    AND tenant_id = p_tenant_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Orden % no encontrada para tenant %', p_order_id, p_tenant_id;
  END IF;

  -- Columnas opcionales (pueden no existir en todas las instancias)
  BEGIN
    UPDATE orders SET loyalty_customer_id = p_loyalty_customer_id
    WHERE id = p_order_id AND tenant_id = p_tenant_id;
  EXCEPTION WHEN undefined_column THEN NULL; END;

  BEGIN
    UPDATE orders SET tip = NULLIF(p_tip, 0)
    WHERE id = p_order_id AND tenant_id = p_tenant_id;
  EXCEPTION WHEN undefined_column THEN NULL; END;

  -- ── PASO 2: Descontar inventario + calcular COGS ───────────────────────────
  FOR v_rec IN
    SELECT
      oi.dish_id,
      oi.qty                 AS item_qty,
      dr.ingredient_id,
      dr.quantity            AS recipe_qty,
      i.stock                AS ing_stock,
      COALESCE(i.cost, 0)    AS ing_cost,
      oi.name                AS dish_name
    FROM order_items  oi
    JOIN dish_recipes dr ON dr.dish_id   = oi.dish_id
                        AND dr.tenant_id = p_tenant_id
    JOIN ingredients  i  ON i.id         = dr.ingredient_id
                        AND i.tenant_id  = p_tenant_id
    WHERE oi.order_id   = p_order_id
      AND oi.tenant_id  = p_tenant_id
      AND oi.dish_id   IS NOT NULL
  LOOP
    v_deduct_qty  := v_rec.recipe_qty * v_rec.item_qty;
    v_cur_stock   := v_rec.ing_stock;
    v_new_stock   := GREATEST(0, v_cur_stock - v_deduct_qty);
    v_cost_unit   := v_rec.ing_cost;
    v_cost_actual := v_cost_actual + (v_deduct_qty * v_cost_unit);

    UPDATE ingredients
    SET stock      = v_new_stock,
        updated_at = v_now
    WHERE id       = v_rec.ingredient_id
      AND tenant_id= p_tenant_id;

    INSERT INTO stock_movements (
      tenant_id, ingredient_id, movement_type,
      quantity, previous_stock, new_stock,
      reason, created_by, unit_cost, total_cost, created_at
    ) VALUES (
      p_tenant_id, v_rec.ingredient_id, 'salida',
      v_deduct_qty, v_cur_stock, v_new_stock,
      'Venta: ' || v_rec.dish_name || ' x' || v_rec.item_qty || ' — ' || p_order_id,
      'Sistema (close_order)', v_cost_unit, v_deduct_qty * v_cost_unit, v_now
    );
  END LOOP;

  -- ── PASO 3: Guardar COGS y margen ─────────────────────────────────────────
  v_margin_actual := p_total - v_cost_actual;
  v_margin_pct    := CASE WHEN p_total > 0 THEN (v_margin_actual / p_total) * 100 ELSE 0 END;

  UPDATE orders
  SET cost_actual   = v_cost_actual,
      margin_actual = v_margin_actual,
      margin_pct    = v_margin_pct
  WHERE id        = p_order_id
    AND tenant_id = p_tenant_id;

  -- ── PASO 4: Liberar mesas ──────────────────────────────────────────────────
  UPDATE restaurant_tables
  SET
    status           = 'libre',
    current_order_id = NULL,
    waiter           = NULL,
    opened_at        = NULL,
    item_count       = NULL,
    updated_at       = v_now
  WHERE id        = ANY(p_table_ids)
    AND tenant_id = p_tenant_id;

  BEGIN
    UPDATE restaurant_tables
    SET partial_total = NULL, merge_group_id = NULL
    WHERE id = ANY(p_table_ids) AND tenant_id = p_tenant_id;
  EXCEPTION WHEN undefined_column THEN NULL; END;

  -- ── PASO 5: Puntos de lealtad ──────────────────────────────────────────────
  IF p_loyalty_customer_id IS NOT NULL AND p_loyalty_points > 0 THEN
    UPDATE loyalty_customers
    SET
      points      = COALESCE(points, 0) + p_loyalty_points,
      total_spent = COALESCE(total_spent, 0) + p_total,
      last_visit  = v_now,
      updated_at  = v_now
    WHERE id        = p_loyalty_customer_id
      AND tenant_id = p_tenant_id;

    INSERT INTO loyalty_transactions (
      tenant_id, customer_id, order_id,
      type, points, amount, notes, created_at
    ) VALUES (
      p_tenant_id, p_loyalty_customer_id, p_order_id,
      'acumulacion', p_loyalty_points, p_total,
      'Compra — Orden ' || p_order_id, v_now
    );
  END IF;

  RETURN jsonb_build_object(
    'success',       true,
    'cost_actual',   v_cost_actual,
    'margin_actual', v_margin_actual,
    'margin_pct',    v_margin_pct
  );

EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'close_order[%]: % — Detalle: %', p_order_id, SQLERRM, SQLSTATE;
END;
$$;

GRANT EXECUTE ON FUNCTION close_order TO anon;
GRANT EXECUTE ON FUNCTION close_order TO authenticated;

-- Verificación
SELECT routine_name, routine_type, data_type AS returns
FROM information_schema.routines
WHERE routine_name = 'close_order' AND routine_schema = 'public';
