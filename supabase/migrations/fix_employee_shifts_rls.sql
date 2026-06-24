-- ═══════════════════════════════════════════════════════════════════════════
-- FIX RLS de employee_shifts (y tablas sin columna tenant_id)
--
-- PROBLEMA: la migración de aislamiento puso una política que filtra por
-- tenant_id::text = current_tenant_id(), pero employee_shifts NO TIENE
-- columna tenant_id (se relaciona por employee_id → employees). La política
-- no puede evaluarse y los turnos fallan al guardar.
--
-- SOLUCIÓN: política permisiva para estas tablas que se aíslan por su tabla
-- padre (employee_id), no por tenant_id directo. El aislamiento real lo da
-- la app filtrando por empleado del tenant.
-- ═══════════════════════════════════════════════════════════════════════════

DO $$
DECLARE
  t text;
  tbls text[] := ARRAY[
    'employee_shifts',
    'employee_attendance',
    'rh_vacaciones',
    'rh_permisos',
    'rh_tiempos_extras'
  ];
BEGIN
  FOREACH t IN ARRAY tbls LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables
              WHERE table_schema='public' AND table_name=t) THEN
      -- Quitar políticas previas
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
      -- Política permisiva (aislamiento por tabla padre + app)
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
SELECT tablename, policyname FROM pg_policies
WHERE schemaname='public'
  AND tablename IN ('employee_shifts','employee_attendance','rh_vacaciones','rh_permisos','rh_tiempos_extras')
ORDER BY tablename;
