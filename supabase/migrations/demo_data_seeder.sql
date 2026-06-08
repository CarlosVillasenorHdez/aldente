-- ═══════════════════════════════════════════════════════════════════════════
-- DEMO DATA SEEDER — Aldente ERP
-- Puebla un tenant con datos realistas de los últimos 7 días para que un
-- prospecto vea el sistema "con vida" desde el primer minuto.
--
-- USO:
--   SELECT seed_demo_data('<TENANT_ID>', '<BRANCH_ID>');
--
-- Genera: 12 ingredientes, 10 platillos con receta, ~60 órdenes cerradas
-- distribuidas en 7 días con patrones realistas (más ventas viernes/sábado,
-- horas pico comida y cena), movimientos de inventario y 1 corte de caja.
--
-- Es IDEMPOTENTE: borra los datos demo previos (marcados con notes='DEMO')
-- antes de insertar, para poder correrlo varias veces sin duplicar.
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION seed_demo_data(p_tenant_id TEXT, p_branch_id TEXT DEFAULT NULL)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  v_tenant UUID := p_tenant_id::UUID;
  v_branch UUID := NULLIF(p_branch_id, '')::UUID;
  v_day INT;
  v_order_count INT;
  v_order_idx INT;
  v_order_id TEXT;
  v_order_time TIMESTAMPTZ;
  v_subtotal NUMERIC;
  v_iva NUMERIC;
  v_total NUMERIC;
  v_cost NUMERIC;
  v_dish RECORD;
  v_n_items INT;
  v_item_idx INT;
  v_qty INT;
  v_meseros TEXT[] := ARRAY['Juan Pérez','María López','Carlos Ruiz','Ana Torres'];
  v_pay_methods TEXT[] := ARRAY['efectivo','tarjeta','tarjeta','transferencia'];
  v_total_orders INT := 0;
  v_total_ventas NUMERIC := 0;
  -- multiplicador de volumen por día de la semana (0=domingo)
  v_day_mult NUMERIC[];
BEGIN
  -- ── Limpieza de datos demo previos ──────────────────────────────────────
  DELETE FROM order_items WHERE order_id IN (
    SELECT id FROM orders WHERE tenant_id = v_tenant AND notes = 'DEMO'
  );
  DELETE FROM orders WHERE tenant_id = v_tenant AND notes = 'DEMO';
  DELETE FROM stock_movements WHERE tenant_id = v_tenant AND reason = 'DEMO';
  DELETE FROM dishes WHERE tenant_id = v_tenant AND image_alt = 'DEMO';
  DELETE FROM ingredients WHERE tenant_id = v_tenant AND supplier = 'DEMO';

  -- ── 1. Ingredientes (12) ────────────────────────────────────────────────
  INSERT INTO ingredients (tenant_id, branch_id, name, category, stock, min_stock, reorder_point, cost, unit, supplier) VALUES
    (v_tenant, v_branch, 'Carne de res molida', 'Carnes y Aves', 18.5, 10, 15, 185.00, 'kg', 'DEMO'),
    (v_tenant, v_branch, 'Pechuga de pollo',    'Carnes y Aves', 22.0, 12, 18, 135.00, 'kg', 'DEMO'),
    (v_tenant, v_branch, 'Tortilla de maíz',    'Verduras',       8.0, 15, 20,  18.00, 'kg', 'DEMO'),
    (v_tenant, v_branch, 'Queso Oaxaca',        'Lácteos',        6.5,  5,  8, 145.00, 'kg', 'DEMO'),
    (v_tenant, v_branch, 'Aguacate',            'Verduras',      12.0,  8, 12,  68.00, 'kg', 'DEMO'),
    (v_tenant, v_branch, 'Jitomate',            'Verduras',      14.0, 10, 15,  24.00, 'kg', 'DEMO'),
    (v_tenant, v_branch, 'Cebolla',             'Verduras',      20.0, 10, 15,  19.00, 'kg', 'DEMO'),
    (v_tenant, v_branch, 'Pan para hamburguesa','Entradas',      45.0, 30, 50,   6.50, 'pza', 'DEMO'),
    (v_tenant, v_branch, 'Papa',                'Verduras',      30.0, 15, 25,  22.00, 'kg', 'DEMO'),
    (v_tenant, v_branch, 'Refresco lata',       'Bebidas',       96.0, 48, 72,   9.50, 'pza', 'DEMO'),
    (v_tenant, v_branch, 'Cerveza',             'Bebidas',      120.0, 60, 90,  14.00, 'pza', 'DEMO'),
    (v_tenant, v_branch, 'Frijol',              'Verduras',       4.5,  8, 12,  32.00, 'kg', 'DEMO');

  -- ── 2. Platillos (10) ───────────────────────────────────────────────────
  INSERT INTO dishes (tenant_id, branch_id, name, description, price, category, available, emoji, popular, image_alt) VALUES
    (v_tenant, v_branch, 'Hamburguesa Clásica',   'Carne de res, queso, lechuga, jitomate', 135.00, 'Hamburguesas', true,  '🍔', true,  'DEMO'),
    (v_tenant, v_branch, 'Hamburguesa Doble',     'Doble carne, doble queso',               175.00, 'Hamburguesas', true,  '🍔', true,  'DEMO'),
    (v_tenant, v_branch, 'Tacos de Pastor (3)',   'Tres tacos al pastor con piña',           95.00, 'Tacos',        true,  '🌮', true,  'DEMO'),
    (v_tenant, v_branch, 'Tacos de Pollo (3)',    'Tres tacos de pollo asado',               89.00, 'Tacos',        true,  '🌮', false, 'DEMO'),
    (v_tenant, v_branch, 'Quesadilla',            'Quesadilla de queso Oaxaca',              65.00, 'Entradas',     true,  '🧀', false, 'DEMO'),
    (v_tenant, v_branch, 'Guacamole',             'Guacamole con totopos',                   75.00, 'Entradas',     true,  '🥑', true,  'DEMO'),
    (v_tenant, v_branch, 'Papas a la Francesa',   'Porción de papas fritas',                 55.00, 'Entradas',     true,  '🍟', false, 'DEMO'),
    (v_tenant, v_branch, 'Refresco',              'Refresco de lata 355ml',                  30.00, 'Bebidas',      true,  '🥤', false, 'DEMO'),
    (v_tenant, v_branch, 'Cerveza',               'Cerveza nacional 355ml',                  45.00, 'Bebidas',      true,  '🍺', true,  'DEMO'),
    (v_tenant, v_branch, 'Agua de Horchata',      'Agua fresca de horchata 500ml',           35.00, 'Bebidas',      true,  '🥛', false, 'DEMO');

  -- ── 3. Órdenes de los últimos 7 días ────────────────────────────────────
  -- Multiplicador por día de la semana: dom alto, lun-jue normal, vie-sab pico
  v_day_mult := ARRAY[1.3, 0.7, 0.7, 0.8, 0.9, 1.4, 1.6];

  FOR v_day IN 0..6 LOOP
    -- Número de órdenes del día según patrón (base 8 órdenes × multiplicador)
    v_order_count := GREATEST(3, FLOOR(8 * v_day_mult[EXTRACT(DOW FROM (CURRENT_DATE - v_day))::INT + 1] + (random() * 4 - 2))::INT);

    FOR v_order_idx IN 1..v_order_count LOOP
      -- Hora realista: distribuida entre comida (13-16h) y cena (19-22h)
      v_order_time := (CURRENT_DATE - v_day)::TIMESTAMPTZ
        + (CASE WHEN random() < 0.5
            THEN (13 + random() * 3) * INTERVAL '1 hour'
            ELSE (19 + random() * 3) * INTERVAL '1 hour' END);

      v_order_id := 'DEMO-' || v_day || '-' || v_order_idx || '-' || FLOOR(random() * 10000)::TEXT;
      v_subtotal := 0;
      v_cost := 0;
      v_n_items := 1 + FLOOR(random() * 4)::INT;  -- 1-4 platillos por orden

      -- Crear la orden (la llenamos con items después y actualizamos totales)
      INSERT INTO orders (
        id, tenant_id, branch_id, mesa, mesa_num, mesero,
        subtotal, iva, discount, total, cost_actual,
        status, is_comanda, pay_method,
        opened_at, closed_at, notes
      ) VALUES (
        v_order_id, v_tenant, v_branch,
        'Mesa ' || (1 + FLOOR(random() * 12))::TEXT,
        (1 + FLOOR(random() * 12))::INT,
        v_meseros[1 + FLOOR(random() * 4)::INT],
        0, 0, 0, 0, 0,
        'cerrada', false,
        v_pay_methods[1 + FLOOR(random() * 4)::INT],
        v_order_time::TEXT, (v_order_time + INTERVAL '45 minutes')::TEXT,
        'DEMO'
      );

      -- Agregar items aleatorios
      FOR v_item_idx IN 1..v_n_items LOOP
        SELECT name, price, emoji, category INTO v_dish
        FROM dishes
        WHERE tenant_id = v_tenant AND image_alt = 'DEMO'
        ORDER BY random() LIMIT 1;

        v_qty := 1 + FLOOR(random() * 2)::INT;  -- 1-2 unidades

        INSERT INTO order_items (order_id, tenant_id, name, qty, price, emoji, created_at)
        VALUES (v_order_id, v_tenant, v_dish.name, v_qty, v_dish.price, v_dish.emoji, v_order_time);

        v_subtotal := v_subtotal + (v_dish.price * v_qty);
        -- Costo estimado: ~35% del precio (margen del 65%)
        v_cost := v_cost + (v_dish.price * v_qty * 0.35);
      END LOOP;

      -- IVA 16% incluido, total = subtotal
      v_total := v_subtotal;
      v_iva := ROUND(v_subtotal - (v_subtotal / 1.16), 2);

      UPDATE orders SET
        subtotal = ROUND(v_subtotal - v_iva, 2),
        iva = v_iva,
        total = v_total,
        cost_actual = ROUND(v_cost, 2)
      WHERE id = v_order_id;

      v_total_orders := v_total_orders + 1;
      v_total_ventas := v_total_ventas + v_total;
    END LOOP;
  END LOOP;

  -- ── 4. Movimientos de inventario (entradas de compra) ───────────────────
  INSERT INTO stock_movements (tenant_id, ingredient_id, movement_type, quantity, previous_stock, new_stock, reason, created_by, created_at)
  SELECT
    v_tenant, i.id, 'entrada', 10, i.stock - 10, i.stock, 'DEMO', 'Sistema',
    (CURRENT_DATE - 5)::TIMESTAMPTZ + INTERVAL '9 hours'
  FROM ingredients i
  WHERE i.tenant_id = v_tenant AND i.supplier = 'DEMO'
  LIMIT 6;

  RETURN format('✅ Demo data creado: %s órdenes, $%s en ventas (7 días), 12 ingredientes, 10 platillos',
                v_total_orders, ROUND(v_total_ventas, 0));
END;
$$;

-- Función de limpieza por separado (por si quieres quitar el demo sin reseed)
CREATE OR REPLACE FUNCTION clear_demo_data(p_tenant_id TEXT)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  v_tenant UUID := p_tenant_id::UUID;
BEGIN
  DELETE FROM order_items WHERE order_id IN (SELECT id FROM orders WHERE tenant_id = v_tenant AND notes = 'DEMO');
  DELETE FROM orders WHERE tenant_id = v_tenant AND notes = 'DEMO';
  DELETE FROM stock_movements WHERE tenant_id = v_tenant AND reason = 'DEMO';
  DELETE FROM dishes WHERE tenant_id = v_tenant AND image_alt = 'DEMO';
  DELETE FROM ingredients WHERE tenant_id = v_tenant AND supplier = 'DEMO';
  RETURN '🗑️ Datos demo eliminados';
END;
$$;
