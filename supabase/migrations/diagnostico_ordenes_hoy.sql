-- Buscar las órdenes cerradas de hoy (últimas 2 horas)
SELECT
  id,
  status,
  is_comanda,
  total,
  pay_method,
  tenant_id,
  closed_at,
  created_at
FROM orders
WHERE closed_at >= now() - interval '2 hours'
   OR created_at >= now() - interval '2 hours'
ORDER BY created_at DESC
LIMIT 20;
