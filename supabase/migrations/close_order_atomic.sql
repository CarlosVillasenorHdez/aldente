-- ══════════════════════════════════════════════════════════════════════════════
-- Aldente ERP — Función close_order atómica
-- Ejecutar en: Supabase → SQL Editor
-- Propósito: Cierra una orden en una sola transacción PostgreSQL.
--            Si cualquier paso falla, TODO se revierte automáticamente.
-- ══════════════════════════════════════════════════════════════════════════════

-- Primero eliminar si ya existe una versión anterior
DROP FUNCTION IF EXISTS close_order(
  TEXT, UUID, NUMERIC, NUMERIC, NUMERIC, NUMERIC,
  TEXT, TEXT, TEXT, TEXT, UUID, INTEGER, NUMERIC,
  TEXT[]
);

CREATE OR REPLACE FUNCTION close_order(
  -- ── Identificadores ──────────────────────────────────────────────────────
  p_order_id          TEXT,
  p_tenant_id         UUID,

  -- ── Importes de la orden ─────────────────────────────────────────────────
  p_subtotal          NUMERIC,
  p_iva               NUMERIC,
  p_discount          NUMERIC,
  p_total             NUMERIC,

  -- ── Metadatos operativos ─────────────────────────────────────────────────
  p_pay_method        TEXT,          -- 'efectivo' | 'tarjeta' | 'cortesia' | 'mixto'
  p_mesero            TEXT,
  p_branch            TEXT,
  p_opened_at         TEXT,          -- ISO timestamp string

  -- ── Lealtad (opcionales) ─────────────────────────────────────────────────
  p_loyalty_customer_id UUID,        -- NULL si no hay cliente vinculado
  p_loyalty_points      INTEGER,     -- 0 si no aplica

  -- ── Propina (opcional) ───────────────────────────────────────────────────
  p_tip               NUMERIC,       -- 0 si no aplica

  -- ── Mesas a liberar ──────────────────────────────────────────────────────
  p_table_ids         TEXT[]         -- array de IDs de restaurant_tables

)
RETURNS JSONB                        -- devuelve { success, cost_actual, margin_actual, margin_pct }
LANGUAGE plpgsql
SECURITY DEFINER                    -- ejecuta con permisos del propietario de la función
AS $$
DECLARE
  v_now               TIMESTAMPTZ := now();
  v_cost_actual       NUMERIC     := 0;
  v_margin_actual     NUMERIC;
  v_margin_pct        NUMERIC;

  -- Variables para iterar sobre ingredientes
  v_rec               RECORD;
  v_current_stock     NUMERIC;
  v_deduct_qty        NUMERIC;
  v_new_stock         NUMERIC;
  v_cost_per_unit     NUMERIC;
  v_line_cost         NUMERIC;

BEGIN

  -- ══════════════════════════════════════════════════════════════════════════
  -- PASO 1: Cerrar la orden principal
  -- ══════════════════════════════════════════════════════════════════════════
  UPDATE orders
  SET
    subtotal        = p_subtotal,
    iva             = p_iva,
    discount        = p_discount,
    total           = p_total,
    status          = 'cerrada',
    kitchen_status  = 'entregada',
    pay_method      = p_pay_method,
    mesero          = p_mesero,
    branch          = p_branch,
    opened_at       = COALESCE(p_opened_at::TIMESTAMPTZ, v_now),
    closed_at       = v_now,
    updated_at      = v_now,
    loyalty_customer_id = p_loyalty_customer_id,
    tip             = NULLIF(p_tip, 0)
  WHERE id = p_order_id
    AND tenant_id = p_tenant_id;

  -- Verificar que la orden existía y era del tenant correcto
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Orden % no encontrada para tenant %', p_order_id, p_tenant_id;
  END IF;

  -- ══════════════════════════════════════════════════════════════════════════
  -- PASO 2: Descontar inventario + calcular COGS
  --
  -- Itera sobre dish_recipes para cada order_item de esta orden.
  -- Descuenta de ingredients.stock y registra el stock_movement.
  -- ══════════════════════════════════════════════════════════════════════════
  FOR v_rec IN
    SELECT
      oi.dish_id,
      oi.qty                          AS item_qty,
      dr.ingredient_id,
      dr.quantity                     AS recipe_qty,
      i.stock                         AS ing_stock,
      COALESCE(i.cost, 0)             AS ing_cost,
      i.name                          AS ing_name,
      oi.name                         AS dish_name
    FROM order_items  oi
    JOIN dish_recipes dr ON dr.dish_id   = oi.dish_id
                        AND dr.tenant_id = p_tenant_id
    JOIN ingredients  i  ON i.id         = dr.ingredient_id
                        AND i.tenant_id  = p_tenant_id
    WHERE oi.order_id  = p_order_id
      AND oi.tenant_id = p_tenant_id
      AND oi.dish_id IS NOT NULL
  LOOP
    v_deduct_qty   := v_rec.recipe_qty * v_rec.item_qty;
    v_current_stock:= v_rec.ing_stock;
    v_new_stock    := GREATEST(0, v_current_stock - v_deduct_qty);
    v_cost_per_unit:= v_rec.ing_cost;
    v_line_cost    := v_deduct_qty * v_cost_per_unit;

    -- Acumular COGS
    v_cost_actual  := v_cost_actual + v_line_cost;

    -- Descontar stock
    UPDATE ingredients
    SET stock      = v_new_stock,
        updated_at = v_now
    WHERE id       = v_rec.ingredient_id
      AND tenant_id= p_tenant_id;

    -- Registrar movimiento (historial inmutable)
    INSERT INTO stock_movements (
      tenant_id,
      ingredient_id,
      movement_type,
      quantity,
      previous_stock,
      new_stock,
      reason,
      created_by,
      unit_cost,
      total_cost,
      created_at
    ) VALUES (
      p_tenant_id,
      v_rec.ingredient_id,
      'salida',
      v_deduct_qty,
      v_current_stock,
      v_new_stock,
      'Venta: ' || v_rec.dish_name || ' x' || v_rec.item_qty || ' — Orden ' || p_order_id,
      'Sistema (close_order)',
      v_cost_per_unit,
      v_line_cost,
      v_now
    );
  END LOOP;

  -- ══════════════════════════════════════════════════════════════════════════
  -- PASO 3: Guardar COGS y margen en la orden
  -- ══════════════════════════════════════════════════════════════════════════
  v_margin_actual := p_total - v_cost_actual;
  v_margin_pct    := CASE WHEN p_total > 0
                         THEN (v_margin_actual / p_total) * 100
                         ELSE 0
                    END;

  UPDATE orders
  SET cost_actual   = v_cost_actual,
      margin_actual = v_margin_actual,
      margin_pct    = v_margin_pct
  WHERE id          = p_order_id
    AND tenant_id   = p_tenant_id;

  -- ══════════════════════════════════════════════════════════════════════════
  -- PASO 4: Liberar mesas
  -- ══════════════════════════════════════════════════════════════════════════
  UPDATE restaurant_tables
  SET
    status          = 'libre',
    current_order_id= NULL,
    waiter          = NULL,
    opened_at       = NULL,
    item_count      = NULL,
    partial_total   = NULL,
    merge_group_id  = NULL,
    updated_at      = v_now
  WHERE id          = ANY(p_table_ids)
    AND tenant_id   = p_tenant_id;

  -- ══════════════════════════════════════════════════════════════════════════
  -- PASO 5: Puntos de lealtad (solo si hay cliente vinculado)
  -- ══════════════════════════════════════════════════════════════════════════
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
      tenant_id,
      customer_id,
      order_id,
      type,
      points,
      amount,
      notes,
      created_at
    ) VALUES (
      p_tenant_id,
      p_loyalty_customer_id,
      p_order_id,
      'acumulacion',
      p_loyalty_points,
      p_total,
      'Compra — Orden ' || p_order_id,
      v_now
    );

  END IF;

  -- ══════════════════════════════════════════════════════════════════════════
  -- RETORNO: datos calculados para actualizar el estado del cliente
  -- ══════════════════════════════════════════════════════════════════════════
  RETURN jsonb_build_object(
    'success',        true,
    'cost_actual',    v_cost_actual,
    'margin_actual',  v_margin_actual,
    'margin_pct',     v_margin_pct
  );

EXCEPTION
  WHEN OTHERS THEN
    -- Cualquier error revierte TODA la transacción automáticamente (PostgreSQL)
    RAISE EXCEPTION 'close_order falló en orden %: %', p_order_id, SQLERRM;
END;
$$;

-- ── Permisos ────────────────────────────────────────────────────────────────
-- Permitir que el rol anon (Supabase client-side) llame la función
GRANT EXECUTE ON FUNCTION close_order TO anon;
GRANT EXECUTE ON FUNCTION close_order TO authenticated;

-- ── Verificación de que se creó correctamente ───────────────────────────────
SELECT
  routine_name,
  routine_type,
  data_type AS returns
FROM information_schema.routines
WHERE routine_name = 'close_order'
  AND routine_schema = 'public';
