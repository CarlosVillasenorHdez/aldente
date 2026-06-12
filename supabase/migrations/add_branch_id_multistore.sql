-- ═══════════════════════════════════════════════════════════════════════════
-- MULTI-SUCURSAL — agregar branch_id a las tablas que faltaban
--
-- Modelo: branch_id NULL = COMPARTIDO entre todas las sucursales del tenant.
--         branch_id = X    = ESPECÍFICO de esa sucursal.
-- (mismo patrón que ya usan dishes/ingredients/orders)
--
-- Aplica a: employees, gastos_recurrentes, stock_movements, cortes_caja,
--           restaurant_sections.
--
-- Reglas de negocio acordadas:
--   - Personal: por sucursal por defecto; gerentes pueden ser compartidos (NULL)
--   - Gastos recurrentes: por sucursal por defecto
--   - Stock movements: heredan la sucursal del ingrediente
--   - Cortes de caja: por sucursal (cada local cierra su propia caja)
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. employees ───────────────────────────────────────────────────────────
ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_employees_branch ON public.employees (branch_id);

-- ── 2. gastos_recurrentes ──────────────────────────────────────────────────
ALTER TABLE public.gastos_recurrentes
  ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_gastos_rec_branch ON public.gastos_recurrentes (branch_id);

-- ── 3. stock_movements ─────────────────────────────────────────────────────
ALTER TABLE public.stock_movements
  ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_stock_mov_branch ON public.stock_movements (branch_id);

-- ── 4. cortes_caja ─────────────────────────────────────────────────────────
ALTER TABLE public.cortes_caja
  ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_cortes_caja_branch ON public.cortes_caja (branch_id);

-- ── 5. restaurant_sections (si existe) ─────────────────────────────────────
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='restaurant_sections' AND table_schema='public') THEN
    ALTER TABLE public.restaurant_sections
      ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS idx_rest_sections_branch ON public.restaurant_sections (branch_id);
  END IF;
END $$;

-- ── 6. Backfill — asignar los datos existentes a la sucursal principal ──────
-- Para cada tenant, su primera sucursal (la más antigua) recibe los datos
-- que hoy están sin branch_id. Así RABLE/Barista no pierden nada.
-- NOTA: los gerentes (app_role gerente/admin) se dejan como compartidos (NULL).
DO $$
DECLARE
  r RECORD;
  v_main_branch uuid;
BEGIN
  FOR r IN SELECT DISTINCT id FROM public.tenants LOOP
    SELECT id INTO v_main_branch FROM public.branches
      WHERE tenant_id = r.id AND is_active = true
      ORDER BY created_at ASC LIMIT 1;

    IF v_main_branch IS NOT NULL THEN
      -- Empleados operativos → sucursal principal; gerentes/admin → compartidos
      UPDATE public.employees SET branch_id = v_main_branch
        WHERE tenant_id = r.id AND branch_id IS NULL
          AND COALESCE(app_role::text, 'mesero') NOT IN ('gerente','admin');

      UPDATE public.gastos_recurrentes SET branch_id = v_main_branch
        WHERE tenant_id = r.id AND branch_id IS NULL;

      UPDATE public.stock_movements SET branch_id = v_main_branch
        WHERE tenant_id = r.id AND branch_id IS NULL;

      UPDATE public.cortes_caja SET branch_id = v_main_branch
        WHERE tenant_id = r.id AND branch_id IS NULL;
    END IF;
  END LOOP;
END $$;

-- ── Verificación ───────────────────────────────────────────────────────────
SELECT table_name,
       CASE WHEN EXISTS (
         SELECT 1 FROM information_schema.columns
         WHERE columns.table_name = t.table_name AND column_name='branch_id' AND table_schema='public'
       ) THEN '✅ branch_id' ELSE '❌ falta' END AS estado
FROM (VALUES ('employees'),('gastos_recurrentes'),('stock_movements'),('cortes_caja'),('restaurant_sections')) AS t(table_name);
