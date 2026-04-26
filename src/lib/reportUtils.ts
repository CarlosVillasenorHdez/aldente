/**
 * Utilidades compartidas para todos los módulos de reportes.
 * Centraliza la lógica de rangos de fechas y formateo.
 */

export type ReportPeriod = 'dia' | 'semana' | 'mes';
export type DateRange = 'hoy' | 'semana' | 'mes' | 'personalizado';

/** Retorna start/end ISO para un período simple */
export function getPeriodRange(period: ReportPeriod): { start: string; end: string } {
  const now = new Date();
  const end = now.toISOString();
  let start: string;

  if (period === 'dia') {
    const d = new Date(now);
    d.setHours(0, 0, 0, 0);
    start = d.toISOString();
  } else if (period === 'semana') {
    const d = new Date(now);
    d.setDate(d.getDate() - 7);
    start = d.toISOString();
  } else {
    const d = new Date(now);
    d.setDate(d.getDate() - 30);
    start = d.toISOString();
  }
  return { start, end };
}

/** Retorna start/end ISO para un DateRange estilo consolidado */
export function getDateRangeISO(
  dateRange: DateRange,
  customStart?: string,
  customEnd?: string,
): { start: string; end: string } {
  const now = new Date();
  let start: Date;
  let end: Date = now;

  if (dateRange === 'hoy') {
    start = new Date(now);
    start.setHours(0, 0, 0, 0);
  } else if (dateRange === 'semana') {
    start = new Date(now);
    start.setDate(now.getDate() - 6);
    start.setHours(0, 0, 0, 0);
  } else if (dateRange === 'mes') {
    start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
  } else {
    start = customStart
      ? new Date(customStart + 'T00:00:00')
      : new Date(now.getFullYear(), now.getMonth(), 1);
    end = customEnd ? new Date(customEnd + 'T23:59:59') : end;
  }

  return { start: start.toISOString(), end: end.toISOString() };
}

/** Calcula nómina mensual de una lista de empleados */
export function calcMonthlyPayroll(
  employees: { salary?: number | null; salary_frequency?: string | null }[],
): number {
  return employees.reduce((sum, e) => {
    const sal = Number(e.salary ?? 0);
    const freq = e.salary_frequency ?? 'mensual';
    const factor =
      freq === 'quincenal' ? 2 :
      freq === 'semanal'   ? 4.33 :
      1; // mensual default
    return sum + sal * factor;
  }, 0);
}

/** Calcula gasto mensual de gastos recurrentes */
const FREC_FACTOR: Record<string, number> = {
  diario: 30, semanal: 4.33, quincenal: 2,
  mensual: 1, bimestral: 0.5, trimestral: 1 / 3,
  semestral: 1 / 6, anual: 1 / 12,
};

export function calcMonthlyGastos(
  gastos: { monto?: number | null; frecuencia?: string | null }[],
): number {
  return gastos.reduce((sum, g) => {
    const factor = FREC_FACTOR[g.frecuencia ?? 'mensual'] ?? 1;
    return sum + Number(g.monto ?? 0) * factor;
  }, 0);
}

/** Formatea un número como moneda mexicana */
export function fmtMXN(n: number, decimals = 0): string {
  return `$${n.toLocaleString('es-MX', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
}
