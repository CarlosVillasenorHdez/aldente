-- ═══════════════════════════════════════════════════════════════════════════
-- DIAGNÓSTICO — ¿Qué tablas referenciadas por el código existen en la DB?
-- Corre esto en Supabase SQL Editor. Las que digan FALTA son bugs potenciales.
-- ═══════════════════════════════════════════════════════════════════════════
WITH expected(tabla) AS (
  VALUES
    ('caja_movimientos'), ('attendance_logs'), ('audit_logs'),
    ('dish_categories'), ('expense_payments'), ('extras_catalog'),
    ('extras_sales'), ('ingredient_suppliers'), ('restaurant_sections'),
    ('rh_incapacidades'), ('table_layouts'), ('tables')
)
SELECT
  e.tabla,
  CASE WHEN t.table_name IS NOT NULL THEN '✅ existe' ELSE '❌ FALTA' END AS estado
FROM expected e
LEFT JOIN information_schema.tables t
  ON t.table_name = e.tabla AND t.table_schema = 'public'
ORDER BY estado, e.tabla;
