-- Presupuestos y metas por período
-- Permite al gerente definir metas de ventas/costos y ver la desviación real

CREATE TABLE IF NOT EXISTS public.presupuestos (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  branch_id     uuid REFERENCES public.branches(id) ON DELETE SET NULL,

  -- Período (mes o semana)
  periodo_tipo  text NOT NULL DEFAULT 'mes' CHECK (periodo_tipo IN ('mes','semana','dia')),
  periodo_inicio date NOT NULL,
  periodo_fin    date NOT NULL,
  nombre        text DEFAULT '',          -- ej: "Octubre 2025" o "Meta Q4"

  -- Metas de ventas
  meta_ventas          numeric(12,2) DEFAULT 0,   -- ventas brutas objetivo
  meta_ticket_promedio numeric(10,2) DEFAULT 0,   -- ticket promedio objetivo
  meta_ordenes         integer       DEFAULT 0,   -- número de órdenes objetivo

  -- Metas de costos (opcionales)
  meta_cogs_pct        numeric(5,2)  DEFAULT 0,   -- % de costo de alimentos objetivo
  meta_nomina          numeric(12,2) DEFAULT 0,   -- nómina presupuestada
  meta_gastos_op       numeric(12,2) DEFAULT 0,   -- gastos operativos presupuestados
  meta_margen_pct      numeric(5,2)  DEFAULT 0,   -- margen bruto objetivo %

  -- Estado
  activo        boolean DEFAULT true,
  notas         text DEFAULT '',

  -- Auditoría
  created_by    text DEFAULT '',
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_presupuestos_tenant_periodo
  ON public.presupuestos (tenant_id, periodo_inicio DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_presupuestos_unique_periodo
  ON public.presupuestos (tenant_id, branch_id, periodo_inicio)
  WHERE branch_id IS NOT NULL;

ALTER TABLE public.presupuestos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_presupuestos" ON public.presupuestos
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
