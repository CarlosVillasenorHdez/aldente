-- ═══════════════════════════════════════════════════════════════════════════
-- SIMULAR UN DÍA EN RABLE BURGUER HOUSE
--
-- Crea un día completo de operación: apertura con fondo, ~28 ventas a lo largo
-- del día (efectivo y tarjeta, con propinas en efectivo), listo para hacer el
-- CORTE DE CAJA y ver el cuadre + los reportes.
--
-- CÓMO USAR:
--   1. Si el ID de RABLE es distinto, cámbialo en v_tenant.
--   2. Corre este script completo en el SQL Editor de Supabase.
--   3. Aldente → Corte de Caja: verás el resumen del día. Captura el efectivo
--      esperado (que el script te dice al final) para ver el cuadre en cero.
--   4. Reportes → Ventas y P&L: el día aparece reflejado.
--
-- Para BORRAR la simulación, corre la sección LIMPIAR del final.
-- ═══════════════════════════════════════════════════════════════════════════

DO $$
DECLARE
  v_tenant   uuid := '8ee22a3f-da31-495c-982b-01f1a1ee5d69';  -- RABLE
  v_branch   uuid;
  v_hoy      date := CURRENT_DATE;
  v_apertura timestamptz := v_hoy + TIME '11:00';
  v_order_id text;
  v_t        timestamptz;
  v_i        int;
  v_j        int;
  v_n_items  int;
  v_subtotal numeric;
  v_cost     numeric;
  v_pay      text;
  v_tip      numeric;
  v_mesa     int;
  v_k        int;
  v_name     text;
  v_price    numeric;
  v_unitcost numeric;
  v_qty      int;
  -- Menú de hamburguesería: nombre | precio | costo
  v_menu     text[][] := ARRAY[
    ARRAY['Hamburguesa Clásica','135','47'],
    ARRAY['Hamburguesa BBQ','155','55'],
    ARRAY['Hamburguesa Doble','185','70'],
    ARRAY['Papas a la Francesa','65','18'],
    ARRAY['Papas Gajo','75','22'],
    ARRAY['Aros de Cebolla','70','20'],
    ARRAY['Refresco','35','9'],
    ARRAY['Malteada','65','20'],
    ARRAY['Agua Fresca','30','8'],
    ARRAY['Boneless','125','45']
  ];
  v_meseros  text[] := ARRAY['Jorge','Ana','Luis'];
BEGIN
  SELECT id INTO v_branch FROM branches
    WHERE tenant_id = v_tenant AND is_active = true
    ORDER BY created_at LIMIT 1;

  -- 1. Abrir caja con fondo de $1,000
  INSERT INTO cortes_caja (tenant_id, branch_id, fondo_inicial, apertura_at, status, apertura_por)
  VALUES (v_tenant, v_branch, 1000, v_apertura, 'abierto', 'Jorge (simulacion)');

  -- 2. Generar 28 ventas distribuidas en el día
  FOR v_i IN 1..28 LOOP
    v_order_id := 'SIM-' || v_hoy || '-' || LPAD(v_i::text, 3, '0');
    v_t := v_apertura + (INTERVAL '24 minutes' * v_i) + (random() * INTERVAL '15 minutes');
    v_mesa := 1 + FLOOR(random() * 10)::int;
    v_pay := CASE WHEN random() < 0.6 THEN 'efectivo' ELSE 'tarjeta' END;
    v_n_items := 2 + FLOOR(random() * 4)::int;
    v_subtotal := 0;
    v_cost := 0;

    INSERT INTO orders (
      id, tenant_id, branch_id, mesa, mesa_num, mesero,
      subtotal, iva, discount, total, cost_actual,
      status, is_comanda, pay_method, tip_amount,
      opened_at, closed_at, notes
    ) VALUES (
      v_order_id, v_tenant, v_branch,
      'Mesa ' || v_mesa, v_mesa, v_meseros[1 + FLOOR(random() * 3)::int],
      0, 0, 0, 0, 0,
      'cerrada', false, v_pay, 0,
      v_t::text, (v_t + INTERVAL '40 minutes')::text, 'SIMULACION'
    );

    -- Productos de la orden
    FOR v_j IN 1..v_n_items LOOP
      v_k := 1 + FLOOR(random() * array_length(v_menu, 1))::int;
      v_name     := v_menu[v_k][1];
      v_price    := v_menu[v_k][2]::numeric;
      v_unitcost := v_menu[v_k][3]::numeric;
      v_qty      := 1 + FLOOR(random() * 2)::int;

      INSERT INTO order_items (order_id, tenant_id, name, qty, price, created_at)
      VALUES (v_order_id, v_tenant, v_name, v_qty, v_price, v_t);

      v_subtotal := v_subtotal + (v_price * v_qty);
      v_cost     := v_cost + (v_unitcost * v_qty);
    END LOOP;

    -- Propina en ~50% de las ventas ($10-$30)
    v_tip := CASE WHEN random() < 0.5 THEN (10 + FLOOR(random() * 21))::numeric ELSE 0 END;

    UPDATE orders SET
      subtotal = v_subtotal,
      iva = ROUND(v_subtotal * 0.16, 2),
      total = v_subtotal,
      cost_actual = v_cost,
      tip_amount = v_tip
    WHERE id = v_order_id;
  END LOOP;

  RAISE NOTICE 'Simulacion lista: 28 ventas para % en RABLE', v_hoy;
END $$;

-- RESUMEN — esto es lo que verás en el Corte de Caja
SELECT
  COUNT(*)                                                  AS ventas,
  SUM(total)                                               AS venta_total,
  SUM(total) FILTER (WHERE pay_method = 'efectivo')        AS en_efectivo,
  SUM(total) FILTER (WHERE pay_method = 'tarjeta')         AS en_tarjeta,
  SUM(tip_amount)                                          AS propinas_total,
  SUM(tip_amount) FILTER (WHERE pay_method = 'efectivo')   AS propinas_efectivo,
  1000                                                     AS fondo_inicial,
  1000
    + SUM(total) FILTER (WHERE pay_method = 'efectivo')
    + SUM(tip_amount) FILTER (WHERE pay_method = 'efectivo') AS efectivo_esperado_en_caja
FROM orders
WHERE tenant_id = '8ee22a3f-da31-495c-982b-01f1a1ee5d69'
  AND notes = 'SIMULACION'
  AND closed_at::date = CURRENT_DATE;

-- ═══════════════════════════════════════════════════════════════════════════
-- LIMPIAR (descomenta las 3 líneas y corre para borrar la simulación):
-- ═══════════════════════════════════════════════════════════════════════════
-- DELETE FROM order_items WHERE order_id IN (SELECT id FROM orders WHERE tenant_id='8ee22a3f-da31-495c-982b-01f1a1ee5d69' AND notes='SIMULACION');
-- DELETE FROM orders WHERE tenant_id='8ee22a3f-da31-495c-982b-01f1a1ee5d69' AND notes='SIMULACION';
-- DELETE FROM cortes_caja WHERE tenant_id='8ee22a3f-da31-495c-982b-01f1a1ee5d69' AND apertura_por = 'Jorge (simulacion)';
