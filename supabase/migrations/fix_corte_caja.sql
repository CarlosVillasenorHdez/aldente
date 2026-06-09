-- ═══════════════════════════════════════════════════════════════════════════
-- FIX CORTE DE CAJA — corrige los 2 bugs que impedían cerrar caja
-- ═══════════════════════════════════════════════════════════════════════════

-- ── BUG #1: columnas faltantes en cortes_caja ──────────────────────────────
-- El cierre de caja escribe merma_total y ordenes_canceladas_count
-- pero esas columnas no existían → el cierre fallaba siempre.
ALTER TABLE public.cortes_caja
  ADD COLUMN IF NOT EXISTS merma_total              numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ordenes_canceladas_count integer DEFAULT 0;

-- ── BUG #2: tabla caja_movimientos faltante ────────────────────────────────
-- Los ingresos/egresos extra (ej: "saqué $500 para cambio") se intentaban
-- guardar aquí pero la tabla no existía → se perdían al recargar.
CREATE TABLE IF NOT EXISTS public.caja_movimientos (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  corte_id    uuid NOT NULL REFERENCES public.cortes_caja(id) ON DELETE CASCADE,
  tenant_id   uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  tipo        text NOT NULL CHECK (tipo IN ('ingreso','egreso')),
  monto       numeric NOT NULL DEFAULT 0,
  concepto    text NOT NULL DEFAULT '',
  created_at  timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_caja_mov_corte  ON public.caja_movimientos (corte_id);
CREATE INDEX IF NOT EXISTS idx_caja_mov_tenant ON public.caja_movimientos (tenant_id);

-- ── RLS para caja_movimientos ──────────────────────────────────────────────
ALTER TABLE public.caja_movimientos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS caja_mov_tenant_isolation ON public.caja_movimientos;
CREATE POLICY caja_mov_tenant_isolation ON public.caja_movimientos
  FOR ALL TO authenticated
  USING (tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id')::uuid
         OR tenant_id IN (SELECT tenant_id FROM public.app_users WHERE id = auth.uid()))
  WITH CHECK (true);

-- Permitir acceso anon (la app usa anon key con tenant_id en queries)
DROP POLICY IF EXISTS caja_mov_anon ON public.caja_movimientos;
CREATE POLICY caja_mov_anon ON public.caja_movimientos
  FOR ALL TO anon
  USING (true) WITH CHECK (true);

-- ── Verificación ───────────────────────────────────────────────────────────
SELECT 'cortes_caja' AS tabla, column_name
FROM information_schema.columns
WHERE table_name = 'cortes_caja'
  AND column_name IN ('merma_total','ordenes_canceladas_count')
UNION ALL
SELECT 'caja_movimientos', 'TABLA CREADA'
WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'caja_movimientos');
