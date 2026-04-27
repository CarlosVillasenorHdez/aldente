-- Mejoras al sistema de asistencia para check-in/out por PIN
-- Agrega timestamps precisos, tipo de registro y notificaciones

ALTER TABLE public.employee_attendance
  ADD COLUMN IF NOT EXISTS check_in_ts  timestamptz DEFAULT NULL,  -- timestamp exacto de entrada
  ADD COLUMN IF NOT EXISTS check_out_ts timestamptz DEFAULT NULL,  -- timestamp exacto de salida
  ADD COLUMN IF NOT EXISTS branch_id    uuid REFERENCES public.branches(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS metodo       text DEFAULT 'kiosko'      -- 'kiosko' | 'manual' | 'sidebar'
                            CHECK (metodo IN ('kiosko','manual','sidebar')),
  ADD COLUMN IF NOT EXISTS lat          numeric(10,7) DEFAULT NULL, -- geolocalización opcional
  ADD COLUMN IF NOT EXISTS lng          numeric(10,7) DEFAULT NULL;

-- Índice para la pantalla del dueño (quién está hoy)
CREATE INDEX IF NOT EXISTS idx_attendance_today
  ON public.employee_attendance (tenant_id, date, check_in_ts)
  WHERE check_in_ts IS NOT NULL;

-- Tabla de configuración de horarios esperados por empleado
-- (para saber si llegaron tarde)
CREATE TABLE IF NOT EXISTS public.employee_schedules (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  employee_id   uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  dia_semana    integer NOT NULL CHECK (dia_semana BETWEEN 0 AND 6), -- 0=dom, 1=lun...
  hora_entrada  time NOT NULL,
  hora_salida   time NOT NULL,
  activo        boolean DEFAULT true
);

ALTER TABLE public.employee_schedules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_schedules" ON public.employee_schedules
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE UNIQUE INDEX IF NOT EXISTS idx_schedules_emp_dia
  ON public.employee_schedules (employee_id, dia_semana)
  WHERE activo = true;
