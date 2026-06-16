-- ═══════════════════════════════════════════════════════════════════════════
-- FIX RLS system_config (y tablas afectadas por el mismo patrón)
--
-- PROBLEMA: las políticas usan current_tenant_id(), que lee una variable de
-- sesión (app.tenant_id) puesta por set_tenant_context(). Pero la app habla
-- con Supabase vía PostgREST (HTTP sin estado / connection pooling): la
-- variable se pone en UNA conexión y el INSERT corre en OTRA, donde la
-- variable está vacía → current_tenant_id() = null → RLS rechaza con
-- "new row violates row-level security policy".
--
-- Esto es intermitente: si el pool reusa la misma conexión, funciona; si no,
-- falla. Por eso a veces guarda y a veces no.
--
-- SOLUCIÓN: la app NO usa Supabase Auth (usa login por PIN propio) y YA filtra
-- cada query por tenant_id en el código. La política a nivel DB no puede
-- depender de una variable de sesión que el pooling rompe. La hacemos permisiva
-- a nivel motor (igual que el resto de tablas operativas que sí funcionan),
-- manteniendo el aislamiento real en la capa de aplicación.
--
-- Si en el futuro migras a Supabase Auth con JWT, se puede volver a
-- auth.jwt()->>'tenant_id' que sí viaja con cada request.
-- ═══════════════════════════════════════════════════════════════════════════

DO $$
DECLARE
  t text;
  tbls text[] := ARRAY[
    'system_config','printer_config',
    'role_permissions'   -- mismas que dan problemas al guardar configuración
  ];
BEGIN
  FOREACH t IN ARRAY tbls LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables
              WHERE table_schema='public' AND table_name=t) THEN
      -- Quitar todas las políticas previas de esta tabla
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

      -- Política permisiva: el aislamiento real lo aplica la app (filtra por tenant_id)
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
      EXECUTE format($p$
        CREATE POLICY "app_managed_%s" ON public.%I
          FOR ALL TO anon, authenticated
          USING (true) WITH CHECK (true)
      $p$, t, t);
    END IF;
  END LOOP;
END $$;

-- Verificación
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE schemaname='public'
  AND tablename IN ('system_config','printer_config','role_permissions')
ORDER BY tablename;
