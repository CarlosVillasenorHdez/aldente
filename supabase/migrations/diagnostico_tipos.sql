-- ══════════════════════════════════════════════════════════════════════════════
-- DIAGNÓSTICO — ejecutar ANTES de instalar close_order v6
-- Muestra el tipo real de cada columna relevante en tu DB
-- ══════════════════════════════════════════════════════════════════════════════

SELECT
  table_name,
  column_name,
  data_type,
  udt_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('orders', 'ingredients', 'restaurant_tables',
                     'order_items', 'dish_recipes', 'stock_movements',
                     'loyalty_customers', 'loyalty_transactions')
  AND column_name IN ('tenant_id', 'id', 'loyalty_customer_id')
ORDER BY table_name, column_name;
