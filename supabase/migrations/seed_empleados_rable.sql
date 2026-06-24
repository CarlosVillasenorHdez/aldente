-- ═══════════════════════════════════════════════════════════════════════════
-- CONFIGURACIÓN DEL EQUIPO DE RABLE BURGUER HOUSE
--
-- Crea los 5 empleados con su acceso (PIN), rol, sucursal, salario y turnos.
--
-- EQUIPO:
--   Jorge  — Dueño/Administrador        — PIN 1111
--   Rosa   — Cocinera, turno mañana     — PIN 2222 — $1,500/semana
--   Diana  — Mesera/Caja, turno mañana  — PIN 3333 — $1,200/semana
--   Arleth — Mesera/Caja, turno tarde   — PIN 4444 — $1,200/semana
--   Mari   — Cocinera, turno tarde      — PIN 5555 — $1,500/semana
--
-- Turnos: mañana = matutino, tarde = vespertino (todos los días).
-- Las meseras son CAJERO (toman pedidos Y hacen corte de caja), como pediste.
--
-- IMPORTANTE: cada turno abre y cierra su propia caja (Opción A: la tarde
-- abre con fondo limpio; el efectivo de la mañana se retira al cerrar).
--
-- CÓMO USAR: cambia v_tenant si el ID de RABLE es distinto, y corre el script.
-- Los PINs ya están listos para entrar. Diles que los cambien en su primer login.
-- ═══════════════════════════════════════════════════════════════════════════

DO $$
DECLARE
  v_tenant uuid := '8ee22a3f-da31-495c-982b-01f1a1ea5d69';  -- RABLE
  v_branch uuid;
  v_jorge  uuid; v_rosa uuid; v_diana uuid; v_arleth uuid; v_mari uuid;
  v_dias   text[] := ARRAY['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo'];
  v_dia    text;
BEGIN
  -- Sucursal principal
  SELECT id INTO v_branch FROM branches
    WHERE tenant_id = v_tenant AND is_active = true
    ORDER BY created_at LIMIT 1;

  -- ── 1. EMPLEADOS (registro de RH) ──
  INSERT INTO employees (tenant_id, branch_id, name, role, status, hire_date, salary, salary_frequency)
  VALUES (v_tenant, v_branch, 'Jorge', 'Administrador', 'activo', CURRENT_DATE, 0, 'semanal')
  RETURNING id INTO v_jorge;

  INSERT INTO employees (tenant_id, branch_id, name, role, status, hire_date, salary, salary_frequency)
  VALUES (v_tenant, v_branch, 'Rosa', 'Cocinero', 'activo', CURRENT_DATE, 1500, 'semanal')
  RETURNING id INTO v_rosa;

  INSERT INTO employees (tenant_id, branch_id, name, role, status, hire_date, salary, salary_frequency)
  VALUES (v_tenant, v_branch, 'Diana', 'Cajero', 'activo', CURRENT_DATE, 1200, 'semanal')
  RETURNING id INTO v_diana;

  INSERT INTO employees (tenant_id, branch_id, name, role, status, hire_date, salary, salary_frequency)
  VALUES (v_tenant, v_branch, 'Arleth', 'Cajero', 'activo', CURRENT_DATE, 1200, 'semanal')
  RETURNING id INTO v_arleth;

  INSERT INTO employees (tenant_id, branch_id, name, role, status, hire_date, salary, salary_frequency)
  VALUES (v_tenant, v_branch, 'Mari', 'Cocinero', 'activo', CURRENT_DATE, 1500, 'semanal')
  RETURNING id INTO v_mari;

  -- ── 2. ACCESOS (app_users con PIN — ya hasheados SHA-256) ──
  INSERT INTO app_users (tenant_id, branch_id, employee_id, full_name, username, pin, app_role, is_active) VALUES
    (v_tenant, v_branch, v_jorge,  'Jorge',  'jorge',  '0ffe1abd1a08215353c233d6e009613e95eec4253832a761af28ff37ac5a150c', 'admin',   true),
    (v_tenant, v_branch, v_rosa,   'Rosa',   'rosa',   'edee29f882543b956620b26d0ee0e7e950399b1c4222f5de05e06425b4c995e9', 'cocinero', true),
    (v_tenant, v_branch, v_diana,  'Diana',  'diana',  '318aee3fed8c9d040d35a7fc1fa776fb31303833aa2de885354ddf3d44d8fb69', 'cajero',   true),
    (v_tenant, v_branch, v_arleth, 'Arleth', 'arleth', '79f06f8fde333461739f220090a23cb2a79f6d714bee100d0e4b4af249294619', 'cajero',   true),
    (v_tenant, v_branch, v_mari,   'Mari',   'mari',   'c1f330d0aff31c1c87403f1e4347bcc21aff7c179908723535f2b31723702525', 'cocinero', true);

  -- ── 3. TURNOS (todos los días que abre el restaurante) ──
  -- Mañana: Rosa (cocina) + Diana (caja) = matutino
  -- Tarde:  Arleth (caja) + Mari (cocina) = vespertino
  FOREACH v_dia IN ARRAY v_dias LOOP
    INSERT INTO employee_shifts (employee_id, day, shift) VALUES
      (v_rosa,   v_dia, 'matutino'),
      (v_diana,  v_dia, 'matutino'),
      (v_arleth, v_dia, 'vespertino'),
      (v_mari,   v_dia, 'vespertino')
    ON CONFLICT (employee_id, day) DO UPDATE SET shift = EXCLUDED.shift;
  END LOOP;

  RAISE NOTICE 'Equipo de RABLE configurado: 5 empleados, accesos y turnos.';
END $$;

-- VERIFICACIÓN — ver el equipo configurado
SELECT e.name, e.role, e.salary, e.salary_frequency, u.username, u.app_role
FROM employees e
JOIN app_users u ON u.employee_id = e.id
WHERE e.tenant_id = '8ee22a3f-da31-495c-982b-01f1a1ea5d69'
ORDER BY e.name;
