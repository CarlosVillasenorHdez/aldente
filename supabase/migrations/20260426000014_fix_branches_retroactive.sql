-- Migración retroactiva: asegurar que cada tenant tiene al menos 1 branch
-- El primer restaurante (creado antes de la migración multi_tenant) nunca
-- tuvo una fila en branches. Esto lo corrige.

-- Para cada tenant sin branches activas, insertar una branch principal
-- usando el nombre del restaurante de system_config
INSERT INTO public.branches (tenant_id, name, address, phone, email, is_active, created_at)
SELECT
  t.id AS tenant_id,
  COALESCE(
    (SELECT config_value FROM public.system_config
     WHERE tenant_id = t.id AND config_key = 'restaurant_name' LIMIT 1),
    t.name
  ) AS name,
  COALESCE(
    (SELECT config_value FROM public.system_config
     WHERE tenant_id = t.id AND config_key = 'restaurant_address' LIMIT 1),
    ''
  ) AS address,
  COALESCE(
    (SELECT config_value FROM public.system_config
     WHERE tenant_id = t.id AND config_key = 'restaurant_phone' LIMIT 1),
    ''
  ) AS phone,
  '' AS email,
  true AS is_active,
  t.created_at
FROM public.tenants t
WHERE t.id != '00000000-0000-0000-0000-000000000001'  -- excluir superadmin
  AND NOT EXISTS (
    SELECT 1 FROM public.branches b
    WHERE b.tenant_id = t.id AND b.is_active = true
    LIMIT 1
  );

-- Actualizar app_users que no tienen branch_id asignado:
-- asignarles la primera branch activa de su tenant
UPDATE public.app_users u
SET branch_id = (
  SELECT b.id FROM public.branches b
  WHERE b.tenant_id = u.tenant_id AND b.is_active = true
  ORDER BY b.created_at ASC
  LIMIT 1
)
WHERE u.branch_id IS NULL
  AND u.app_role NOT IN ('admin', 'gerente', 'superadmin')
  AND u.tenant_id != '00000000-0000-0000-0000-000000000001';

-- Verificar resultado
SELECT
  t.name AS tenant,
  COUNT(b.id) AS branches_count
FROM public.tenants t
LEFT JOIN public.branches b ON b.tenant_id = t.id AND b.is_active = true
WHERE t.id != '00000000-0000-0000-0000-000000000001'
GROUP BY t.name
ORDER BY t.name;
