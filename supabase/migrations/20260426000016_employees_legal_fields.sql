-- Campos legales y laborales en la tabla employees
-- Requeridos por LFT, IMSS e INFONAVIT

ALTER TABLE public.employees
  -- Identificación legal
  ADD COLUMN IF NOT EXISTS rfc              text DEFAULT '',
  ADD COLUMN IF NOT EXISTS nss              text DEFAULT '',   -- Número de Seguridad Social
  ADD COLUMN IF NOT EXISTS curp             text DEFAULT '',
  ADD COLUMN IF NOT EXISTS fecha_nacimiento date DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS direccion        text DEFAULT '',

  -- Contrato
  ADD COLUMN IF NOT EXISTS tipo_contrato    text DEFAULT 'planta'
    CHECK (tipo_contrato IN ('planta','temporal','tiempo_parcial','confianza','honorarios','otro')),
  ADD COLUMN IF NOT EXISTS fecha_baja       date DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS motivo_baja      text DEFAULT '',  -- renuncia/despido/termino/etc.

  -- Pago
  ADD COLUMN IF NOT EXISTS banco            text DEFAULT '',
  ADD COLUMN IF NOT EXISTS cuenta_bancaria  text DEFAULT '',
  ADD COLUMN IF NOT EXISTS clabe            text DEFAULT '',

  -- Emergencias
  ADD COLUMN IF NOT EXISTS contacto_emergencia_nombre text DEFAULT '',
  ADD COLUMN IF NOT EXISTS contacto_emergencia_tel    text DEFAULT '',

  -- Departamento/área
  ADD COLUMN IF NOT EXISTS departamento     text DEFAULT '',
  ADD COLUMN IF NOT EXISTS branch_id        uuid REFERENCES public.branches(id) ON DELETE SET NULL;

-- Índice para búsquedas por RFC/NSS
CREATE INDEX IF NOT EXISTS idx_employees_rfc ON public.employees (tenant_id, rfc)
  WHERE rfc != '';
CREATE INDEX IF NOT EXISTS idx_employees_nss ON public.employees (tenant_id, nss)
  WHERE nss != '';
