-- ─── WACC / COGS preciso ──────────────────────────────────────────────────────
-- Agrega campos a stock_movements para capturar costo al momento de cada
-- operación. Esto permite calcular COGS exacto (no basado en costo estático).

alter table stock_movements
  add column if not exists supplier_id   uuid references suppliers(id) on delete set null,
  add column if not exists unit_cost     numeric(12,6),   -- costo por unidad base en este movimiento
  add column if not exists purchase_unit text,            -- presentación comprada (ej. costal 25kg)
  add column if not exists purchase_qty  numeric(10,4),   -- unidades base por presentación
  add column if not exists total_cost    numeric(14,4),   -- unit_cost × quantity (calculado al guardar)
  add column if not exists wacc_before   numeric(12,6),   -- costo promedio ANTES de esta entrada
  add column if not exists wacc_after    numeric(12,6);   -- costo promedio DESPUÉS (solo entradas)

-- Índice para consultas de COGS por período
create index if not exists idx_stock_movements_cogs
  on stock_movements (tenant_id, ingredient_id, movement_type, created_at)
  where movement_type = 'salida';

comment on column stock_movements.unit_cost   is 'Costo unitario en el momento del movimiento (WACC para salidas, precio compra para entradas)';
comment on column stock_movements.total_cost  is 'Costo total = unit_cost × quantity. Fuente del COGS real.';
comment on column stock_movements.wacc_after  is 'WACC resultante tras esta entrada. Histórico del costo promedio.';
