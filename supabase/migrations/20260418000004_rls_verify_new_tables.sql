-- ─── Verificar RLS en tablas nuevas ────────────────────────────────────────────
-- Tablas agregadas recientemente que pueden no tener RLS activo

ALTER TABLE IF EXISTS ingredient_suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS extras_catalog        ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS extras_sales          ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS loyalty_whatsapp_log  ENABLE ROW LEVEL SECURITY;

-- Políticas para ingredient_suppliers
DROP POLICY IF EXISTS "tenant_isolation_ingredient_suppliers" ON ingredient_suppliers;
CREATE POLICY "tenant_isolation_ingredient_suppliers" ON ingredient_suppliers
  USING (tenant_id = (SELECT tenants.id FROM tenants WHERE tenants.id = tenant_id LIMIT 1)
         AND auth.uid() IS NOT NULL);

-- Políticas para extras_catalog
DROP POLICY IF EXISTS "tenant_isolation_extras_catalog" ON extras_catalog;
CREATE POLICY "tenant_isolation_extras_catalog" ON extras_catalog
  USING (tenant_id IN (
    SELECT au.tenant_id FROM app_users au WHERE au.auth_user_id = auth.uid()
  ));

-- Políticas para extras_sales
DROP POLICY IF EXISTS "tenant_isolation_extras_sales" ON extras_sales;
CREATE POLICY "tenant_isolation_extras_sales" ON extras_sales
  USING (tenant_id IN (
    SELECT au.tenant_id FROM app_users au WHERE au.auth_user_id = auth.uid()
  ));

-- Políticas para loyalty_whatsapp_log
DROP POLICY IF EXISTS "tenant_isolation_loyalty_whatsapp_log" ON loyalty_whatsapp_log;
CREATE POLICY "tenant_isolation_loyalty_whatsapp_log" ON loyalty_whatsapp_log
  USING (tenant_id IN (
    SELECT au.tenant_id FROM app_users au WHERE au.auth_user_id = auth.uid()
  ));

-- Asegurar que stock_movements tiene tenant_id en todos los registros
-- (algunos movimientos legacy pueden no tenerlo)
UPDATE stock_movements sm
SET tenant_id = (
  SELECT i.tenant_id FROM ingredients i WHERE i.id = sm.ingredient_id LIMIT 1
)
WHERE sm.tenant_id IS NULL
  AND sm.ingredient_id IS NOT NULL;
