-- ─── Backfill: actualizar stock_movements históricos sin unit_cost ───────────
-- Los movimientos de tipo 'salida' creados antes del fix no tienen unit_cost
-- Usamos el costo actual del ingrediente como aproximación

UPDATE stock_movements sm
SET
  unit_cost  = COALESCE(sm.unit_cost,  i.cost),
  total_cost = COALESCE(sm.total_cost, sm.quantity * i.cost)
FROM ingredients i
WHERE sm.ingredient_id = i.id
  AND sm.movement_type IN ('salida', 'merma')
  AND (sm.unit_cost IS NULL OR sm.total_cost IS NULL)
  AND i.cost IS NOT NULL
  AND i.cost > 0;

-- ─── Verificación ─────────────────────────────────────────────────────────────
-- SELECT COUNT(*) FROM stock_movements WHERE movement_type IN ('salida','merma') AND unit_cost IS NULL;
-- Debería retornar 0 después del UPDATE.
