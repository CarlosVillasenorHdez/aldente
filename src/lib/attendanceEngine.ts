/**
 * attendanceEngine.ts — Motor de asistencia
 *
 * Centraliza toda la lógica de:
 * - Auto check-in al hacer login
 * - Cálculo de estados (a tiempo / retardo / falta)
 * - Cruce con horarios, vacaciones, permisos e incapacidades
 * - Cálculo de descuentos sugeridos
 */

import { createClient } from '@/lib/supabase/client';

const supabase = createClient();

// ── Tipos ─────────────────────────────────────────────────────────────────────

export type AttendanceStatus =
  | 'a_tiempo'
  | 'retardo_leve'    // 1-15 min
  | 'retardo_grave'   // 16-60 min
  | 'falta'           // >60 min o no llegó
  | 'vacaciones'
  | 'permiso_con_goce'
  | 'permiso_sin_goce'
  | 'incapacidad'
  | 'descanso'
  | 'sin_horario';    // empleado sin horario definido

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  role: string;
  date: string;
  // Horario esperado
  horaEntradaEsperada: string | null;
  horaSalidaEsperada: string | null;
  // Real
  checkIn: string | null;
  checkOut: string | null;
  // Cálculos
  status: AttendanceStatus;
  minutosRetardo: number;
  horasTrabajadas: number | null;
  // Cobertura
  tieneVacaciones: boolean;
  tienePermiso: boolean;
  tipoPermiso: string | null;
  tieneIncapacidad: boolean;
  // Descuento sugerido
  descuentoSugerido: number;    // en pesos
  descuentoMinutos: number;     // minutos a descontar
  resolucion: 'pendiente' | 'descontado' | 'repuesto' | 'justificado' | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function todayISO(): string {
  return new Date().toISOString().split('T')[0];
}

function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

function calcStatus(
  checkInTime: string | null,
  horaEntrada: string | null,
  tieneVacaciones: boolean,
  tienePermiso: boolean,
  tieneIncapacidad: boolean,
  esDescanso: boolean,
): { status: AttendanceStatus; minutosRetardo: number } {
  if (esDescanso)       return { status: 'descanso', minutosRetardo: 0 };
  if (tieneVacaciones)  return { status: 'vacaciones', minutosRetardo: 0 };
  if (tieneIncapacidad) return { status: 'incapacidad', minutosRetardo: 0 };
  if (tienePermiso)     return { status: 'permiso_con_goce', minutosRetardo: 0 };
  if (!horaEntrada)     return { status: 'sin_horario', minutosRetardo: 0 };
  if (!checkInTime)     return { status: 'falta', minutosRetardo: 0 };

  const esperado = timeToMinutes(horaEntrada);
  const llegada  = timeToMinutes(checkInTime);
  const retardo  = Math.max(0, llegada - esperado);

  if (retardo === 0)   return { status: 'a_tiempo', minutosRetardo: 0 };
  if (retardo <= 15)   return { status: 'retardo_leve', minutosRetardo: retardo };
  if (retardo <= 60)   return { status: 'retardo_grave', minutosRetardo: retardo };
  return { status: 'falta', minutosRetardo: retardo };
}

function calcDescuento(
  salarioMensual: number,
  status: AttendanceStatus,
  minutosRetardo: number,
  tipoPermiso: string | null,
): { pesos: number; minutos: number } {
  const salarioPorMinuto = salarioMensual / (30 * 8 * 60); // salario/mes ÷ días ÷ horas ÷ min

  if (status === 'falta') {
    return { pesos: Math.round(salarioMensual / 30), minutos: 8 * 60 };
  }
  if (status === 'retardo_grave') {
    return { pesos: Math.round(salarioPorMinuto * minutosRetardo), minutos: minutosRetardo };
  }
  if (status === 'permiso_sin_goce') {
    return { pesos: Math.round(salarioMensual / 30), minutos: 8 * 60 };
  }
  return { pesos: 0, minutos: 0 };
}

// ── Auto check-in al hacer login ──────────────────────────────────────────────

export async function autoCheckIn(employeeId: string, tenantId: string, branchId?: string | null): Promise<void> {
  if (!employeeId || !tenantId) return;

  const today = todayISO();
  const now = new Date();
  const timeStr = now.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false });

  // Verificar si ya tiene entrada hoy
  const { data: existing } = await supabase
    .from('employee_attendance')
    .select('id, check_in')
    .eq('tenant_id', tenantId)
    .eq('employee_id', employeeId)
    .eq('date', today)
    .maybeSingle();

  if (existing?.check_in) return; // ya tiene entrada — no hacer nada

  // Crear o actualizar el registro de hoy
  if (existing?.id) {
    await supabase.from('employee_attendance')
      .update({ check_in: timeStr, check_in_ts: now.toISOString(), metodo: 'sidebar', updated_at: now.toISOString() })
      .eq('id', existing.id);
  } else {
    await supabase.from('employee_attendance').insert({
      tenant_id: tenantId,
      employee_id: employeeId,
      branch_id: branchId ?? null,
      date: today,
      check_in: timeStr,
      check_in_ts: now.toISOString(),
      metodo: 'sidebar',
    });
  }
}

// ── Check-out manual ──────────────────────────────────────────────────────────

export async function checkOut(employeeId: string, tenantId: string): Promise<'ok' | 'no_checkin' | 'already_out'> {
  const today = todayISO();
  const now = new Date();
  const timeStr = now.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false });

  const { data } = await supabase
    .from('employee_attendance')
    .select('id, check_in, check_out')
    .eq('tenant_id', tenantId)
    .eq('employee_id', employeeId)
    .eq('date', today)
    .maybeSingle();

  if (!data?.check_in) return 'no_checkin';
  if (data?.check_out)  return 'already_out';

  const checkInTs = new Date(`${today}T${data.check_in}:00`);
  const hoursWorked = Math.round(((now.getTime() - checkInTs.getTime()) / 3600000) * 100) / 100;

  await supabase.from('employee_attendance')
    .update({ check_out: timeStr, check_out_ts: now.toISOString(), hours_worked: hoursWorked, updated_at: now.toISOString() })
    .eq('id', data.id);

  return 'ok';
}

// ── Estado de hoy de un empleado ──────────────────────────────────────────────

export interface TodayStatus {
  hasCheckin: boolean;
  hasCheckout: boolean;
  checkInTime: string | null;
  checkOutTime: string | null;
}

export async function getTodayStatus(employeeId: string, tenantId: string): Promise<TodayStatus> {
  const { data } = await supabase
    .from('employee_attendance')
    .select('check_in, check_out')
    .eq('tenant_id', tenantId)
    .eq('employee_id', employeeId)
    .eq('date', todayISO())
    .maybeSingle();

  return {
    hasCheckin:   !!data?.check_in,
    hasCheckout:  !!data?.check_out,
    checkInTime:  data?.check_in ?? null,
    checkOutTime: data?.check_out ?? null,
  };
}

// ── Reporte de asistencia para el dueño ───────────────────────────────────────

export async function getAttendanceReport(
  tenantId: string,
  startDate: string,
  endDate: string,
  employeeId?: string,
): Promise<AttendanceRecord[]> {

  // 1. Traer empleados
  let qEmp = supabase.from('employees')
    .select('id, name, role, salary, salary_frequency')
    .eq('tenant_id', tenantId).eq('status', 'activo');
  if (employeeId) qEmp = qEmp.eq('id', employeeId);
  const { data: employees } = await qEmp;

  // 2. Asistencia del período
  const { data: attendance } = await supabase
    .from('employee_attendance')
    .select('employee_id, date, check_in, check_out, hours_worked')
    .eq('tenant_id', tenantId)
    .gte('date', startDate).lte('date', endDate);

  // 3. Horarios
  const { data: schedules } = await supabase
    .from('employee_schedules')
    .select('employee_id, dia_semana, hora_entrada, hora_salida')
    .eq('tenant_id', tenantId).eq('activo', true);

  // 4. Vacaciones, permisos, incapacidades del período
  const [{ data: vacaciones }, { data: permisos }, { data: incapacidades }] = await Promise.all([
    supabase.from('rh_vacaciones').select('employee_id, fecha_inicio, fecha_fin')
      .eq('tenant_id', tenantId).eq('status', 'aprobada')
      .gte('fecha_inicio', startDate).lte('fecha_fin', endDate),
    supabase.from('rh_permisos').select('employee_id, fecha_inicio, fecha_fin, tipo')
      .eq('tenant_id', tenantId).eq('status', 'aprobado')
      .gte('fecha_inicio', startDate).lte('fecha_fin', endDate),
    supabase.from('rh_incapacidades').select('employee_id, fecha_inicio, fecha_fin')
      .eq('tenant_id', tenantId)
      .gte('fecha_inicio', startDate).lte('fecha_fin', endDate),
  ]);

  // Indexar por employee_id + fecha para lookup O(1)
  const attMap: Record<string, { checkIn: string | null; checkOut: string | null; horasTrabajadas: number | null }> = {};
  (attendance ?? []).forEach((a: any) => {
    attMap[`${a.employee_id}__${a.date}`] = {
      checkIn: a.check_in, checkOut: a.check_out, horasTrabajadas: a.hours_worked,
    };
  });

  const schedMap: Record<string, { entrada: string; salida: string }> = {};
  (schedules ?? []).forEach((s: any) => {
    schedMap[`${s.employee_id}__${s.dia_semana}`] = { entrada: s.hora_entrada, salida: s.hora_salida };
  });

  // Función para verificar si una fecha cae en un rango
  const inRange = (fecha: string, inicio: string, fin: string) => fecha >= inicio && fecha <= fin;

  const records: AttendanceRecord[] = [];

  // Generar un registro por cada día del período para cada empleado
  const start = new Date(startDate + 'T12:00:00');
  const end   = new Date(endDate + 'T12:00:00');

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split('T')[0];
    const diaSemana = d.getDay(); // 0=dom, 1=lun...

    for (const emp of employees ?? []) {
      const att = attMap[`${emp.id}__${dateStr}`];
      const sched = schedMap[`${emp.id}__${diaSemana}`];

      // Verificar cobertura
      const tieneVacaciones = (vacaciones ?? []).some((v: any) =>
        v.employee_id === emp.id && inRange(dateStr, v.fecha_inicio, v.fecha_fin));
      const permiso = (permisos ?? []).find((p: any) =>
        p.employee_id === emp.id && inRange(dateStr, p.fecha_inicio, p.fecha_fin));
      const tieneIncapacidad = (incapacidades ?? []).some((i: any) =>
        i.employee_id === emp.id && inRange(dateStr, i.fecha_inicio, i.fecha_fin));
      const esDescanso = !sched && !att?.checkIn; // no tiene horario ese día

      const { status, minutosRetardo } = calcStatus(
        att?.checkIn ?? null,
        sched?.entrada ?? null,
        tieneVacaciones,
        !!permiso,
        tieneIncapacidad,
        esDescanso,
      );

      // Calcular salario mensual
      const salBase = Number(emp.salary ?? 0);
      const salMes = emp.salary_frequency === 'quincenal' ? salBase * 2
        : emp.salary_frequency === 'semanal' ? salBase * 4.33 : salBase;

      const { pesos, minutos } = calcDescuento(salMes, status, minutosRetardo, permiso?.tipo ?? null);

      records.push({
        id: `${emp.id}__${dateStr}`,
        employeeId: emp.id,
        employeeName: emp.name,
        role: emp.role,
        date: dateStr,
        horaEntradaEsperada: sched?.entrada ?? null,
        horaSalidaEsperada: sched?.salida ?? null,
        checkIn: att?.checkIn ?? null,
        checkOut: att?.checkOut ?? null,
        status,
        minutosRetardo,
        horasTrabajadas: att?.horasTrabajadas ?? null,
        tieneVacaciones,
        tienePermiso: !!permiso,
        tipoPermiso: permiso?.tipo ?? null,
        tieneIncapacidad,
        descuentoSugerido: pesos,
        descuentoMinutos: minutos,
        resolucion: null,
      });
    }
  }

  return records.sort((a, b) => a.date.localeCompare(b.date) || a.employeeName.localeCompare(b.employeeName));
}
