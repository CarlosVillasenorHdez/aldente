-- ═══════════════════════════════════════════════════════════════════════════
-- Marcar registros de asistencia que necesitan revisión manual
--
-- Cuando un empleado no marca salida y el sistema no puede saber con certeza
-- a qué hora salió (ej: doble turno vs olvido de varios días), NO inventa la
-- hora. La marca "needs_review" para que el dueño la corrija a mano — solo él
-- sabe si fue doble turno o descuido.
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE public.employee_attendance
  ADD COLUMN IF NOT EXISTS needs_review boolean DEFAULT false;

SELECT 'employee_attendance.needs_review' AS columna,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name='employee_attendance' AND column_name='needs_review')
  THEN '✅ agregada' ELSE '❌ falló' END AS estado;
