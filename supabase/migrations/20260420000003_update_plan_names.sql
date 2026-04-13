-- ============================================================================
-- Actualiza nombres de planes legacy en la tabla tenants
-- basico → operacion | estandar → negocio | premium → empresa
-- starter → operacion | profesional → negocio | enterprise → empresa
-- ============================================================================

UPDATE public.tenants SET plan = 'operacion'
  WHERE plan IN ('basico','starter','basic');

UPDATE public.tenants SET plan = 'negocio'
  WHERE plan IN ('estandar','profesional','standard','pro');

UPDATE public.tenants SET plan = 'empresa'
  WHERE plan IN ('premium','enterprise','advanced');

-- Verify
SELECT plan, COUNT(*) FROM public.tenants GROUP BY plan ORDER BY plan;
