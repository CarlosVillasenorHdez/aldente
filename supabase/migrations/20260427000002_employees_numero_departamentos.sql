-- Número de empleado y departamentos como catálogo

-- 1. Número de empleado auto-incremental por tenant
ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS numero_empleado integer DEFAULT NULL;

-- Función para asignar número único por tenant
CREATE OR REPLACE FUNCTION public.assign_employee_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.numero_empleado IS NULL THEN
    SELECT COALESCE(MAX(numero_empleado), 0) + 1
    INTO NEW.numero_empleado
    FROM public.employees
    WHERE tenant_id = NEW.tenant_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_employee_number ON public.employees;
CREATE TRIGGER trg_employee_number
  BEFORE INSERT ON public.employees
  FOR EACH ROW EXECUTE FUNCTION public.assign_employee_number();

-- 2. Tabla de departamentos por tenant (catálogo configurable)
CREATE TABLE IF NOT EXISTS public.departamentos (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  nombre      text NOT NULL,
  color       text DEFAULT '#6b7280',
  orden       integer DEFAULT 0,
  activo      boolean DEFAULT true,
  created_at  timestamptz DEFAULT now()
);

ALTER TABLE public.departamentos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_departamentos" ON public.departamentos
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_departamentos_tenant
  ON public.departamentos (tenant_id, activo, orden);

-- Departamentos predeterminados para restaurante (se insertan por trigger en go-live o manualmente)
-- El restaurantero puede agregar/editar en Configuración
-- Ejemplos: Cocina, Bar, Sala, Caja, Administración, Entrega, Limpieza

COMMENT ON TABLE public.departamentos IS 
  'Catálogo de departamentos por tenant. Permite clasificar empleados por área.';
COMMENT ON COLUMN public.employees.numero_empleado IS 
  'Número único de empleado dentro del tenant. Auto-asignado al crear, editable.';
