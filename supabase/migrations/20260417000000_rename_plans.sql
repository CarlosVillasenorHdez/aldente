-- Rename plan values: basico→operacion, estandar→negocio, premium→empresa, starter→operacion
UPDATE public.tenants SET plan = 'operacion' WHERE plan IN ('basico','starter');
UPDATE public.tenants SET plan = 'negocio'   WHERE plan = 'estandar';
UPDATE public.tenants SET plan = 'empresa'   WHERE plan = 'premium';
UPDATE public.tenants SET plan = 'profesional' WHERE plan = 'profesional'; -- keep as is
