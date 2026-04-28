/**
 * GET /api/alerts/attendance
 * 
 * Verifica empleados que debieron llegar y no han hecho check-in.
 * Se llama desde el dashboard del dueño al cargar.
 * Retorna una lista de empleados "ausentes" según su horario del día.
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tenantId = searchParams.get('tenant_id');
  if (!tenantId) return NextResponse.json({ alerts: [] });

  const supabase = await createClient();
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0=dom, 1=lun...
  const todayISO = today.toISOString().split('T')[0];
  const nowMinutes = today.getHours() * 60 + today.getMinutes();

  // Empleados activos con horario hoy
  const { data: schedules } = await supabase
    .from('employee_schedules')
    .select('employee_id, hora_entrada, employees(id, name, role)')
    .eq('tenant_id', tenantId)
    .eq('dia_semana', dayOfWeek)
    .eq('activo', true);

  if (!schedules?.length) return NextResponse.json({ alerts: [] });

  // Asistencia de hoy
  const { data: attendance } = await supabase
    .from('employee_attendance')
    .select('employee_id, check_in')
    .eq('tenant_id', tenantId)
    .eq('date', todayISO);

  const checkedIn = new Set((attendance ?? []).map((a: any) => a.employee_id));

  const alerts = [];
  for (const sched of schedules) {
    if (checkedIn.has(sched.employee_id)) continue;

    // Calcular si ya debería haber llegado (+15 min de gracia)
    const [h, m] = (sched.hora_entrada as string).split(':').map(Number);
    const expectedMin = h * 60 + m;
    const minsLate = nowMinutes - expectedMin;

    if (minsLate >= 15) {
      const emp = (sched as any).employees;
      alerts.push({
        employeeId: sched.employee_id,
        name: emp?.name ?? 'Empleado',
        role: emp?.role ?? '',
        horaEntrada: sched.hora_entrada,
        minutosRetraso: minsLate,
        severity: minsLate >= 60 ? 'falta' : minsLate >= 30 ? 'grave' : 'leve',
      });
    }
  }

  return NextResponse.json({ alerts, checkedAt: today.toISOString() });
}
