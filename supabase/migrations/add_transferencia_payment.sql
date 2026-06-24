-- ═══════════════════════════════════════════════════════════════════════════
-- Agregar 'transferencia' como método de pago en la base de datos
--
-- El enum payment_method solo tenía ('efectivo','tarjeta'). El código ya
-- soporta transferencia (Jorge la acepta), pero la base de datos la
-- rechazaría. Esto la agrega. ALTER TYPE ... ADD VALUE es seguro y no
-- afecta los datos existentes.
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TYPE public.payment_method ADD VALUE IF NOT EXISTS 'transferencia';

-- Verificación
SELECT unnest(enum_range(NULL::public.payment_method)) AS metodos_de_pago;
