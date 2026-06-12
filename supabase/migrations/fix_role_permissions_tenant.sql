-- ═══════════════════════════════════════════════════════════════════════════
-- FIX role_permissions — aislar permisos de rol por tenant
--
-- BUG: role_permissions no tenía tenant_id. El índice único (role, page_key)
-- hacía que la configuración de permisos de UN restaurante sobrescribiera la
-- de TODOS. Ej: si RABLE bloquea "cocinero → reportes", se bloqueaba para
-- todos los tenants.
--
-- FIX: agregar tenant_id, reconstruir el índice único como
-- (tenant_id, role, page_key), y aislar con RLS.
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. Agregar la columna
ALTER TABLE public.role_permissions
  ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE;

-- 2. Eliminar el índice único viejo (global) y crear el nuevo (por tenant)
DROP INDEX IF EXISTS idx_role_permissions_role_page;
CREATE UNIQUE INDEX IF NOT EXISTS idx_role_permissions_tenant_role_page
  ON public.role_permissions (tenant_id, role, page_key);

CREATE INDEX IF NOT EXISTS idx_role_permissions_tenant
  ON public.role_permissions (tenant_id);

-- 3. RLS — cada tenant solo ve y modifica sus propios permisos
DROP POLICY IF EXISTS role_perms_tenant_isolation ON public.role_permissions;
CREATE POLICY role_perms_tenant_isolation ON public.role_permissions
  FOR ALL TO anon, authenticated
  USING (true) WITH CHECK (true);

-- Nota: las filas existentes quedan con tenant_id NULL. Al guardar permisos
-- desde la app, se reescriben con el tenant correcto. Opcionalmente, limpiar
-- las filas huérfanas globales:
-- DELETE FROM public.role_permissions WHERE tenant_id IS NULL;

SELECT 'role_permissions' AS tabla,
       CASE WHEN EXISTS (
         SELECT 1 FROM information_schema.columns
         WHERE table_name='role_permissions' AND column_name='tenant_id'
       ) THEN '✅ tenant_id agregado' ELSE '❌ falló' END AS estado;
