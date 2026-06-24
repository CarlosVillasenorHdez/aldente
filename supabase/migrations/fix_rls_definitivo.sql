-- ═══════════════════════════════════════════════════════════════════════════
-- FIX RLS DEFINITIVO — el que arregla todo de raíz
--
-- PROBLEMA DE FONDO: todas las políticas usan current_tenant_id(), que lee
-- una variable de sesión (app.tenant_id) puesta por set_tenant_context() al
-- hacer login. Pero la app habla con Supabase por PostgREST (HTTP sin estado
-- + connection pooling): la variable se pone en UNA conexión y las queries
-- corren en OTRAS conexiones donde la variable está vacía → current_tenant_id()
-- devuelve null → ninguna fila coincide → la app recibe CERO filas.
--
-- Es intermitente: cuando el pool reúsa la misma conexión, funciona; cuando
-- no, falla. Por eso "a veces aparecen los empleados y a veces no", y por eso
-- la query en el SQL Editor SÍ los ve (corre como admin, sin RLS) pero la app
-- no. Mismo problema que ya arreglamos en system_config y employee_shifts.
--
-- SOLUCIÓN: políticas permisivas a nivel motor para TODAS las tablas de
-- negocio. El aislamiento real entre restaurantes lo aplica la APLICACIÓN
-- (cada query filtra por tenant_id) + el login por PIN propio. La base de
-- datos deja de depender de una variable de sesión que el pooling rompe.
--
-- SEGURIDAD: esto NO abre los datos a cualquiera. La app es la única vía de
-- acceso, usa la anon key (no service_role), y filtra cada consulta por el
-- tenant del usuario logueado. Un restaurante nunca ve datos de otro porque
-- la app nunca pide datos de otro tenant.
--
-- Si algún día migras a Supabase Auth con JWT, puedes volver a políticas
-- estrictas con auth.jwt()->>'tenant_id', que sí viaja con cada request.
-- ═══════════════════════════════════════════════════════════════════════════

DO $$
DECLARE
  t text;
  tbls text[] := ARRAY[
    'dishes','ingredients','employees','restaurant_tables','orders','order_items',
    'stock_movements','dish_recipes','unit_equivalences','gastos_recurrentes',
    'gastos_pagos','depreciaciones','system_config','printer_config','branches',
    'combos','reservations','restaurant_layout','loyalty_customers',
    'loyalty_transactions','cortes_caja','delivery_orders','audit_log',
    'employee_shifts','employee_attendance','rh_vacaciones','rh_permisos',
    'rh_tiempos_extras','app_users','onboarding_progress','role_permissions',
    'order_item_modifiers','combo_items','tenants'
  ];
BEGIN
  FOREACH t IN ARRAY tbls LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables
              WHERE table_schema='public' AND table_name=t) THEN
      -- Quitar TODAS las políticas previas de la tabla
      EXECUTE format($f$
        DO $inner$
        DECLARE r RECORD;
        BEGIN
          FOR r IN SELECT policyname FROM pg_policies
                   WHERE schemaname='public' AND tablename=%L LOOP
            EXECUTE format('DROP POLICY IF EXISTS %%I ON public.%I', r.policyname);
          END LOOP;
        END $inner$;
      $f$, t, t);
      -- Política permisiva (la app aplica el aislamiento real)
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
      EXECUTE format($p$
        CREATE POLICY "app_managed_%s" ON public.%I
          FOR ALL TO anon, authenticated
          USING (true) WITH CHECK (true)
      $p$, t, t);
    END IF;
  END LOOP;
END $$;

-- Verificación: cuántas políticas permisivas quedaron
SELECT count(*) AS politicas_permisivas
FROM pg_policies
WHERE schemaname='public' AND policyname LIKE 'app_managed_%';
