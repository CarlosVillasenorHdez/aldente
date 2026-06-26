-- ═══════════════════════════════════════════════════════════════════════════
-- Agregar ventas_transferencia al registro de corte de caja
--
-- El corte ya calcula y muestra las ventas por transferencia, pero no las
-- guardaba en el histórico porque faltaba la columna. Esto la agrega para
-- que el registro de cada corte tenga el desglose completo de los 3 métodos.
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE public.cortes_caja
  ADD COLUMN IF NOT EXISTS ventas_transferencia numeric DEFAULT 0;

SELECT 'cortes_caja.ventas_transferencia' AS columna,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name='cortes_caja' AND column_name='ventas_transferencia')
  THEN '✅ agregada' ELSE '❌ falló' END AS estado;
