-- ═══════════════════════════════════════════════════════════════════════════
-- Resetear el PIN del admin de Barista
--
-- POR QUÉ NO FUNCIONABA: el panel de SuperAdmin hasheaba el PIN SIN la sal
-- del sistema, así que guardaba un hash que el login jamás reconocía. Ya
-- está corregido en el código, pero el PIN que guardaste quedó mal — hay que
-- reescribirlo con el hash correcto.
--
-- PASO 1 — Ver qué usuarios admin tiene Barista:
-- ═══════════════════════════════════════════════════════════════════════════

SELECT id, username, full_name, app_role, is_active
FROM app_users
WHERE tenant_id = '6e915d0a-6ebc-4629-a030-2f5d332581d8'
ORDER BY app_role, full_name;


-- ═══════════════════════════════════════════════════════════════════════════
-- PASO 2 — Poner PIN 1111 a TODOS los admins de Barista.
-- (El hash de abajo ya está calculado correctamente, con la sal.)
-- Descomenta y corre:
-- ═══════════════════════════════════════════════════════════════════════════

-- UPDATE app_users
-- SET pin = '1ee7151bec2b80bc67c9126a5fafe9fcf75e3aeddda8c0ac9f05aa723b008ca2',
--     is_active = true
-- WHERE tenant_id = '6e915d0a-6ebc-4629-a030-2f5d332581d8'
--   AND app_role = 'admin';

-- Entras en: aldente-erp.com/r/barista  con PIN 1111

-- ── Otros PINs ya calculados, por si prefieres:
--    1234 → 563a1216dac583751b9461ec56db3f24094d56a5985e1b108dc66cc21de9fa68
--    0000 → de83e384b10b447222f2af4a6d8cc9cd355c796a3ed2e2ebc2c99549613dd8d3
