-- ═══════════════════════════════════════════════════════════════════════════
-- CONFIGURACIÓN DEL EQUIPO DE RABLE BURGUER HOUSE
--
-- Crea los 5 empleados con su acceso (PIN), rol, sucursal, salario y turnos.
--
-- EQUIPO:
--   Jorge  — Dueño/Administrador        — PIN 1111
--   Rosa   — Cocinera, turno mañana     — PIN 2222 — $1,500/semana
--   Diana  — Mesera (+caja), turno mañana  — PIN 3333 — $1,200/semana
--   Arleth — Mesera (+caja), turno tarde   — PIN 4444 — $1,200/semana
--   Mari   — Cocinera, turno tarde      — PIN 5555 — $1,500/semana
--
-- Turnos: mañana = matutino, tarde = vespertino (todos los días).
-- Las meseras (Diana, Arleth) son rol MESERO pero con permiso de Corte de Caja:
--
-- IMPORTANTE: cada turno abre y cierra su propia caja (Opción A: la tarde
-- abre con fondo limpio; el efectivo de la mañana se retira al cerrar).
--
-- CÓMO USAR: cambia v_tenant si el ID de RABLE es distinto, y corre el script.
-- Los PINs ya están listos para entrar. Diles que los cambien en su primer login.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 0. LIMPIEZA IDEMPOTENTE ──
-- Borra el equipo de RABLE (si existe de corridas previas) para poder
-- recrearlo limpio. Se borra en orden de dependencias: primero turnos y
-- accesos, luego empleados. Así este script se puede correr las veces que
-- haga falta sin chocar con "ya existe".
DO $$
DECLARE
  v_tenant uuid := '8ee22a3f-da31-495c-982b-01f1a1ea5d69';  -- RABLE
  v_emp_ids uuid[];
BEGIN
  -- IDs de los empleados de RABLE que vamos a recrear (por nombre)
  SELECT array_agg(id) INTO v_emp_ids FROM employees
    WHERE tenant_id = v_tenant
      AND name IN ('Jorge','Rosa','Diana','Arleth','Mari');

  -- Borrar turnos de esos empleados
  IF v_emp_ids IS NOT NULL THEN
    DELETE FROM employee_shifts WHERE employee_id = ANY(v_emp_ids);
  END IF;

  -- Borrar accesos: tanto de esos empleados como cualquier huérfano o demo
  DELETE FROM app_users
    WHERE tenant_id = v_tenant
      AND (
        username IN ('jorge','rosa','diana','arleth','mari')
        OR employee_id IS NULL
        OR employee_id = ANY(COALESCE(v_emp_ids, ARRAY[]::uuid[]))
        OR full_name ILIKE '%demo%'
      );

  -- Borrar los empleados de RABLE y cualquier demo que haya quedado
  DELETE FROM employees
    WHERE tenant_id = v_tenant
      AND (name IN ('Jorge','Rosa','Diana','Arleth','Mari') OR name ILIKE '%demo%' OR name = '');
END $$;

DO $$
DECLARE
  v_tenant uuid := '8ee22a3f-da31-495c-982b-01f1a1ea5d69';  -- RABLE
  v_branch uuid;
  v_jorge  uuid; v_rosa uuid; v_diana uuid; v_arleth uuid; v_mari uuid;
  v_dias   text[] := ARRAY['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo'];
  v_dia    text;
BEGIN
  -- Sucursal principal
  -- Empleados compartidos (branch_id NULL): visibles en cualquier sucursal.
  -- RABLE tiene un solo local, así que esto es lo correcto y evita que el
  -- filtro por sucursal los esconda.
  v_branch := NULL;

  -- ── 1. EMPLEADOS (registro de RH) ──
  INSERT INTO employees (tenant_id, branch_id, name, role, status, hire_date, salary, salary_frequency)
  VALUES (v_tenant, v_branch, 'Jorge', 'Administrador', 'activo', CURRENT_DATE, 0, 'semanal')
  RETURNING id INTO v_jorge;

  INSERT INTO employees (tenant_id, branch_id, name, role, status, hire_date, salary, salary_frequency)
  VALUES (v_tenant, v_branch, 'Rosa', 'Cocinero', 'activo', CURRENT_DATE, 1500, 'semanal')
  RETURNING id INTO v_rosa;

  INSERT INTO employees (tenant_id, branch_id, name, role, status, hire_date, salary, salary_frequency)
  VALUES (v_tenant, v_branch, 'Diana', 'Mesero', 'activo', CURRENT_DATE, 1200, 'semanal')
  RETURNING id INTO v_diana;

  INSERT INTO employees (tenant_id, branch_id, name, role, status, hire_date, salary, salary_frequency)
  VALUES (v_tenant, v_branch, 'Arleth', 'Mesero', 'activo', CURRENT_DATE, 1200, 'semanal')
  RETURNING id INTO v_arleth;

  INSERT INTO employees (tenant_id, branch_id, name, role, status, hire_date, salary, salary_frequency)
  VALUES (v_tenant, v_branch, 'Mari', 'Cocinero', 'activo', CURRENT_DATE, 1500, 'semanal')
  RETURNING id INTO v_mari;

  -- ── 2. ACCESOS (app_users con PIN — ya hasheados SHA-256) ──
  INSERT INTO app_users (tenant_id, branch_id, employee_id, full_name, username, pin, app_role, is_active) VALUES
    (v_tenant, v_branch, v_jorge,  'Jorge',  'jorge',  '1ee7151bec2b80bc67c9126a5fafe9fcf75e3aeddda8c0ac9f05aa723b008ca2', 'admin',   true),
    (v_tenant, v_branch, v_rosa,   'Rosa',   'rosa',   'a54a039a34caa4084f08badb87816f2f7b96c28c124cdeb9801aba27432024b0', 'cocinero', true),
    (v_tenant, v_branch, v_diana,  'Diana',  'diana',  'bfc9404f1322930fefe0a753d9fdba2251ecd32bc8d406eed43210b498e00f0b', 'mesero',   true),
    (v_tenant, v_branch, v_arleth, 'Arleth', 'arleth', '7e6a21bd034102eef35436933e539add417581cdd3590e1946bf9b4c8f948060', 'mesero',   true),
    (v_tenant, v_branch, v_mari,   'Mari',   'mari',   '27ee3dbf5a49bdcceb95dbb4aa26404d41793a5f503c185274684ada067f44d6', 'cocinero', true);

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


-- ── Permiso: el rol 'mesero' puede hacer Corte de Caja (en RABLE la mesera
--    es también cajera, como en muchos restaurantes familiares) ──
INSERT INTO role_permissions (tenant_id, role, page_key, can_access)
VALUES
  ('8ee22a3f-da31-495c-982b-01f1a1ea5d69', 'mesero', 'corte', true),
  ('8ee22a3f-da31-495c-982b-01f1a1ea5d69', 'mesero', 'pos', true),
  ('8ee22a3f-da31-495c-982b-01f1a1ea5d69', 'mesero', 'orders', true)
ON CONFLICT (tenant_id, role, page_key) DO UPDATE SET can_access = EXCLUDED.can_access;

-- VERIFICACIÓN — ver el equipo configurado
SELECT e.name, e.role, e.salary, e.salary_frequency, u.username, u.app_role
FROM employees e
JOIN app_users u ON u.employee_id = e.id
WHERE e.tenant_id = '8ee22a3f-da31-495c-982b-01f1a1ea5d69'
ORDER BY e.name;
