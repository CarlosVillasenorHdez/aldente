-- ============================================================================
-- Agrega tenant_id a tablas que lo faltaban
-- printer_config y onboarding_progress no tenían tenant_id,
-- lo que significa que sus datos eran compartidos entre todos los tenants.
-- ============================================================================

-- printer_config: configuración de impresora por restaurante
ALTER TABLE public.printer_config
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;

-- Poblar tenant_id para registros existentes con el tenant default
UPDATE public.printer_config
  SET tenant_id = '00000000-0000-0000-0000-000000000001'::uuid
  WHERE tenant_id IS NULL;

ALTER TABLE public.printer_config
  ALTER COLUMN tenant_id SET NOT NULL;

-- onboarding_progress: vincular al tenant vía employee/app_user
ALTER TABLE public.onboarding_progress
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;

UPDATE public.onboarding_progress
  SET tenant_id = '00000000-0000-0000-0000-000000000001'::uuid
  WHERE tenant_id IS NULL;

-- No hacemos NOT NULL aquí porque hay registros con user_id de auth que
-- pueden no tener tenant — los dejamos nullable por compatibilidad
