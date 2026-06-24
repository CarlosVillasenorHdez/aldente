-- ═══════════════════════════════════════════════════════════════════════════
-- Agregar 'transferencia' al enum payment_method
--
-- IMPORTANTE — córrelo en DOS PASOS separados (Postgres no deja agregar un
-- valor a un enum y usarlo en la misma transacción):
--
--   PASO 1: selecciona y corre SOLO la línea del ALTER (la de abajo).
--           Espera a que diga "Success".
--
--   PASO 2: ya después, si quieres verificar, corre el SELECT del final
--           por separado.
--
-- ALTER TYPE ... ADD VALUE es seguro: no afecta datos existentes.
-- ═══════════════════════════════════════════════════════════════════════════

-- ░░░ PASO 1 — corre SOLO esta línea ░░░
ALTER TYPE public.payment_method ADD VALUE IF NOT EXISTS 'transferencia';


-- ░░░ PASO 2 — corre esto APARTE, después de que el paso 1 termine ░░░
-- SELECT unnest(enum_range(NULL::public.payment_method)) AS metodos_de_pago;
