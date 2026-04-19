-- Agregar campos de presentación y cantidad a ingredient_suppliers
alter table ingredient_suppliers
  add column if not exists purchase_qty  numeric(10,4) not null default 1,
  add column if not exists purchase_unit text;

comment on column ingredient_suppliers.purchase_qty  is 'Unidades base por presentación (ej: 25 para costal de 25kg)';
comment on column ingredient_suppliers.purchase_unit is 'Nombre de la presentación (ej: costal 25kg, bolsa 1kg, caja 12pz)';

-- Vista calculada para comparar proveedores por costo unitario real
-- costo_por_unidad_base = price_per_unit / purchase_qty
