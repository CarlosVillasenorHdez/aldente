/**
 * Cálculos de carga laboral mexicana
 * Basado en: Ley Federal del Trabajo + Ley del IMSS + LINFONAVIT
 * Actualizado con tablas 2025
 *
 * IMPORTANTE: Estos cálculos son aproximaciones para la planificación financiera.
 * Para el cálculo exacto del IMSS (cuota fija + proporcional + excedente)
 * y el ISR de nómina, consulta a un contador.
 */

// ── Tablas LFT 2025 ───────────────────────────────────────────────────────────

/** Días de vacaciones por antigüedad (LFT art. 76, reforma 2023) */
export const TABLA_VACACIONES: Record<number, number> = {
  1: 12,   // 1er año: 12 días
  2: 14,
  3: 16,
  4: 18,
  5: 20,
  // 6-10 años: 22
  // 11-15: 24
  // 16-20: 26
  // 21-25: 28
  // 26-30: 30
  // 31-35: 32
};

export function diasVacacionesPorAntiguedad(anios: number): number {
  if (anios <= 0) return 12;  // caso especial: recién ingresado
  if (anios <= 5) return TABLA_VACACIONES[anios] ?? 20;
  const grupo = Math.ceil(anios / 5) - 1;
  return 20 + grupo * 2;
}

// ── Salario Base de Cotización (SBC) ─────────────────────────────────────────

/**
 * Factor de integración del SBC
 * = 1 + partes_alícuotas_de_prestaciones
 *
 * Para prestaciones mínimas de ley:
 *   Aguinaldo: 15 días / 365 = 0.04110
 *   Prima vacacional: días_vac × 0.25 / 365
 *     - 1er año: 12 × 0.25 / 365 = 0.00822
 *   Total mínimo: ≈ 1.04932
 */
export function factorIntegracionSBC(aniosAntiguedad = 1): number {
  const diasVac = diasVacacionesPorAntiguedad(aniosAntiguedad);
  const alicuotaAguinaldo    = 15 / 365;
  const alicuotaPrimaVac     = (diasVac * 0.25) / 365;
  return 1 + alicuotaAguinaldo + alicuotaPrimaVac;
}

/** Salario diario integrado */
export function salarioDiarioIntegrado(salarioMensual: number, aniosAntiguedad = 1): number {
  const sdi = (salarioMensual / 30.4) * factorIntegracionSBC(aniosAntiguedad);
  return Math.round(sdi * 100) / 100;
}

// ── Cuotas IMSS 2025 ─────────────────────────────────────────────────────────

const UMA_2025 = 108.57;           // Valor UMA diario 2025
const UMA_MENSUAL = UMA_2025 * 30.4;

/**
 * Cuotas patronales IMSS (porcentajes sobre SBC mensual)
 * Fuente: Ley del Seguro Social + IMSS circular 2025
 */
export interface CuotasIMSS {
  enfermedadMaternidad: number;   // fija + proporcional (aprox.)
  invalidezVida: number;          // 1.75%
 guarderiasPrestacionesSociales: number;  // 1.00%
  riesgosTrabajoAprox: number;   // 0.50% promedio restaurantes (clase III)
  retiro: number;                 // 2.00%
  cesantia: number;               // 3.150%
  total: number;
}

/**
 * Calcula cuotas patronales IMSS aproximadas
 * La cuota de EM tiene una parte fija (por trabajador) + proporcional (20.40% del excedente sobre 3 UMAs)
 * Para simplificación financiera usamos el porcentaje efectivo aproximado.
 */
export function calcCuotasIMSS(sbcMensual: number): CuotasIMSS {
  // EM: cuota fija patronal ≈ 20.40% × (SBC - 3 UMA) + cuota fija por trabajador
  // Simplificado: ≈ 17.15% promedio efectivo para salarios típicos de restaurante
  const emPct  = sbcMensual > UMA_MENSUAL * 3 ? 0.1715 : 0.1400;
  const iv     = sbcMensual * 0.0175;
  const gpps   = sbcMensual * 0.0100;
  const rt     = sbcMensual * 0.0050;  // 0.5% promedio; restaurantes = actividad III
  const retiro = sbcMensual * 0.0200;
  const ces    = sbcMensual * 0.0315;
  const em     = sbcMensual * emPct;

  return {
    enfermedadMaternidad: Math.round(em),
    invalidezVida:        Math.round(iv),
    guarderiasPrestacionesSociales: Math.round(gpps),
    riesgosTrabajoAprox:  Math.round(rt),
    retiro:               Math.round(retiro),
    cesantia:             Math.round(ces),
    total:                Math.round(em + iv + gpps + rt + retiro + ces),
  };
}

/** Cuota INFONAVIT patronal: 5% del SBC */
export function calcINFONAVIT(sbcMensual: number): number {
  return Math.round(sbcMensual * 0.05);
}

// ── Prestaciones anuales ──────────────────────────────────────────────────────

export interface Prestaciones {
  aguinaldo: number;         // 15 días de salario diario
  primaVacacional: number;   // 25% sobre días de vacaciones × salario diario
  vacaciones: number;        // costo de pagar los días de vacaciones
  totalAnual: number;
  totalMensualProrrateado: number;
}

export function calcPrestaciones(salarioMensual: number, aniosAntiguedad = 1): Prestaciones {
  const sd = salarioMensual / 30.4;
  const diasVac = diasVacacionesPorAntiguedad(aniosAntiguedad);
  const aguinaldo       = Math.round(15 * sd);
  const primaVacacional = Math.round(diasVac * 0.25 * sd);
  const vacaciones      = Math.round(diasVac * sd);
  const totalAnual      = aguinaldo + primaVacacional + vacaciones;
  return {
    aguinaldo, primaVacacional, vacaciones, totalAnual,
    totalMensualProrrateado: Math.round(totalAnual / 12),
  };
}

// ── Costo total del empleado ──────────────────────────────────────────────────

export interface CostoEmpleado {
  salarioNeto: number;
  sbcMensual: number;
  imss: CuotasIMSS;
  infonavit: number;
  prestaciones: Prestaciones;
  totalMensual: number;
  totalAnual: number;
  factorCarga: number;         // totalMensual / salarioNeto
  porcentajeSobreSalario: number;  // (totalMensual - salarioNeto) / salarioNeto × 100
}

export function calcCostoEmpleado(
  salarioMensual: number,
  aniosAntiguedad = 1,
): CostoEmpleado {
  const sdi     = salarioDiarioIntegrado(salarioMensual, aniosAntiguedad);
  const sbcMes  = sdi * 30.4;
  const imss    = calcCuotasIMSS(sbcMes);
  const infon   = calcINFONAVIT(sbcMes);
  const prest   = calcPrestaciones(salarioMensual, aniosAntiguedad);

  const totalMensual = salarioMensual + imss.total + infon + prest.totalMensualProrrateado;

  return {
    salarioNeto:             salarioMensual,
    sbcMensual:              Math.round(sbcMes),
    imss,
    infonavit:               infon,
    prestaciones:            prest,
    totalMensual:            Math.round(totalMensual),
    totalAnual:              Math.round(totalMensual * 12),
    factorCarga:             Math.round((totalMensual / salarioMensual) * 100) / 100,
    porcentajeSobreSalario:  Math.round(((totalMensual - salarioMensual) / salarioMensual) * 100),
  };
}

// ── Resumen de nómina para el P&L ────────────────────────────────────────────

export interface ResumenNomina {
  empleados: number;
  salariosBrutos: number;
  cuotasIMSS: number;
  cuotasINFONAVIT: number;
  prestacionesMensuales: number;
  totalCargaPatronal: number;   // todo excepto salario
  totalNomina: number;          // salario + todo
  factorPromedioEquipo: number;
}

export function calcResumenNomina(
  empleados: { salary: number; salary_frequency?: string }[],
): ResumenNomina {
  let salarios = 0, imss = 0, infonavit = 0, prestaciones = 0;

  empleados.forEach(e => {
    const sal = Number(e.salary ?? 0);
    const freq = e.salary_frequency ?? 'mensual';
    const salMes = freq === 'quincenal' ? sal * 2 : freq === 'semanal' ? sal * 4.33 : sal;
    const costo = calcCostoEmpleado(salMes);
    salarios    += costo.salarioNeto;
    imss        += costo.imss.total;
    infonavit   += costo.infonavit;
    prestaciones += costo.prestaciones.totalMensualProrrateado;
  });

  const total = salarios + imss + infonavit + prestaciones;

  return {
    empleados:             empleados.length,
    salariosBrutos:        Math.round(salarios),
    cuotasIMSS:            Math.round(imss),
    cuotasINFONAVIT:       Math.round(infonavit),
    prestacionesMensuales: Math.round(prestaciones),
    totalCargaPatronal:    Math.round(imss + infonavit + prestaciones),
    totalNomina:           Math.round(total),
    factorPromedioEquipo:  salarios > 0 ? Math.round((total / salarios) * 100) / 100 : 1,
  };
}
