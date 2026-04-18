-- Agregar lead_time_days a ingredients para cálculo automático de RoP
alter table ingredients
  add column if not exists lead_time_days int not null default 1;

comment on column ingredients.lead_time_days is 
  'Días de entrega del proveedor. Usado para calcular RoP = (demanda_diaria × lead_time) + min_stock';
