-- Registro de pagos de nómina
-- Vincula la nómina calculada (employees.salary) con el pago real realizado.
-- Permite al P&L mostrar nómina pagada vs estimada.

CREATE TABLE IF NOT EXISTS public.pagos_nomina (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  branch_id       uuid REFERENCES public.branches(id) ON DELETE SET NULL,

  -- Período de la nómina
  periodo_inicio  date NOT NULL,
  periodo_fin     date NOT NULL,
  frecuencia      text NOT NULL DEFAULT 'mensual'
                  CHECK (frecuencia IN ('mensual','quincenal','semanal')),

  -- Montos
  monto_estimado  numeric(12,2) NOT NULL DEFAULT 0,  -- calculado por el sistema (salarios + carga)
  monto_salarios  numeric(12,2) NOT NULL DEFAULT 0,  -- solo salarios netos
  monto_imss      numeric(12,2) NOT NULL DEFAULT 0,  -- cuotas patronales IMSS
  monto_infonavit numeric(12,2) NOT NULL DEFAULT 0,  -- INFONAVIT
  monto_prestaciones numeric(12,2) NOT NULL DEFAULT 0, -- aguinaldo, vacaciones, prima
  monto_pagado    numeric(12,2) NOT NULL DEFAULT 0,  -- lo que realmente se pagó
  diferencia      numeric(12,2) GENERATED ALWAYS AS (monto_pagado - monto_estimado) STORED,

  -- Detalles del pago
  fecha_pago      date NOT NULL DEFAULT CURRENT_DATE,
  metodo_pago     text DEFAULT 'transferencia'
                  CHECK (metodo_pago IN ('transferencia','efectivo','cheque','mixto')),
  banco_origen    text DEFAULT '',
  referencia      text DEFAULT '',        -- número de transferencia o cheque
  notas           text DEFAULT '',

  -- Empleados afectados (snapshot del período)
  num_empleados   integer NOT NULL DEFAULT 0,

  -- Estado
  status          text NOT NULL DEFAULT 'pagado'
                  CHECK (status IN ('pendiente','pagado','parcial')),

  -- Auditoría
  registrado_por  text DEFAULT '',
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_pagos_nomina_tenant_periodo
  ON public.pagos_nomina (tenant_id, periodo_inicio DESC);

CREATE INDEX IF NOT EXISTS idx_pagos_nomina_branch
  ON public.pagos_nomina (branch_id, periodo_inicio DESC)
  WHERE branch_id IS NOT NULL;

-- RLS
ALTER TABLE public.pagos_nomina ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_pagos_nomina" ON public.pagos_nomina;
CREATE POLICY "tenant_pagos_nomina" ON public.pagos_nomina
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Vista útil: nómina por mes para el P&L
CREATE OR REPLACE VIEW public.v_nomina_mensual AS
SELECT
  tenant_id,
  branch_id,
  date_trunc('month', periodo_inicio)::date AS mes,
  SUM(monto_pagado)    AS total_pagado,
  SUM(monto_estimado)  AS total_estimado,
  SUM(monto_salarios)  AS total_salarios,
  SUM(monto_imss)      AS total_imss,
  SUM(monto_infonavit) AS total_infonavit,
  SUM(monto_prestaciones) AS total_prestaciones,
  COUNT(*)             AS num_pagos,
  SUM(num_empleados)   AS total_empleados
FROM public.pagos_nomina
WHERE status IN ('pagado','parcial')
GROUP BY tenant_id, branch_id, date_trunc('month', periodo_inicio)::date;
