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

// ── Versión configurable (respeta los toggles del dueño) ─────────────────────

export interface NominaConfigFlags {
  incluyeIMSS:         boolean;
  incluyeINFONAVIT:    boolean;
  incluyePrestaciones: boolean;
}

export const NOMINA_COMPLETA: NominaConfigFlags = {
  incluyeIMSS: true, incluyeINFONAVIT: true, incluyePrestaciones: true,
};

export function calcCostoEmpleadoConConfig(
  salarioMensual: number,
  aniosAntiguedad = 1,
  flags: NominaConfigFlags = NOMINA_COMPLETA,
): CostoEmpleado {
  const sdi    = salarioDiarioIntegrado(salarioMensual, aniosAntiguedad);
  const sbcMes = sdi * 30.4;
  const imss   = flags.incluyeIMSS    ? calcCuotasIMSS(sbcMes)         : { enfermedadMaternidad:0, invalidezVida:0, guarderiasPrestacionesSociales:0, riesgosTrabajoAprox:0, retiro:0, cesantia:0, total:0 };
  const infon  = flags.incluyeINFONAVIT ? calcINFONAVIT(sbcMes)        : 0;
  const prest  = flags.incluyePrestaciones ? calcPrestaciones(salarioMensual, aniosAntiguedad) : { aguinaldo:0, primaVacacional:0, vacaciones:0, totalAnual:0, totalMensualProrrateado:0 };

  const totalMensual = salarioMensual + imss.total + infon + prest.totalMensualProrrateado;

  return {
    salarioNeto:             salarioMensual,
    sbcMensual:              Math.round(sbcMes),
    imss, infonavit: infon, prestaciones: prest,
    totalMensual:            Math.round(totalMensual),
    totalAnual:              Math.round(totalMensual * 12),
    factorCarga:             Math.round((totalMensual / salarioMensual) * 100) / 100,
    porcentajeSobreSalario:  Math.round(((totalMensual - salarioMensual) / salarioMensual) * 100),
  };
}

export function calcResumenNominaConConfig(
  empleados: { salary: number; salary_frequency?: string }[],
  flags: NominaConfigFlags = NOMINA_COMPLETA,
): ResumenNomina {
  let salarios = 0, imss = 0, infonavit = 0, prestaciones = 0;

  empleados.forEach(e => {
    const sal = Number(e.salary ?? 0);
    const freq = e.salary_frequency ?? 'mensual';
    const salMes = freq === 'quincenal' ? sal * 2 : freq === 'semanal' ? sal * 4.33 : sal;
    const costo = calcCostoEmpleadoConConfig(salMes, 1, flags);
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

// ── Liquidación y finiquito (LFT art. 48, 50, 76, 79, 80, 87) ────────────────

export type MotivoBaja =
  | 'renuncia_voluntaria'
  | 'despido_injustificado'
  | 'despido_justificado'
  | 'termino_contrato'
  | 'mutuo_acuerdo'
  | 'fallecimiento';

export interface CalculoFiniquito {
  diasVacacionesPendientes: number;
  vacaciones: number;              // pago por días de vacaciones pendientes
  primaVacacional: number;         // 25% sobre vacaciones
  aguinaldoProporcional: number;   // parte proporcional del año en curso
  totalFiniquito: number;
}

export interface CalculoLiquidacion {
  // Finiquito (siempre aplica)
  finiquito: CalculoFiniquito;
  // Indemnización (solo despido injustificado)
  tresMesesSalario: number;        // 90 días × salario diario
  veintieDiasPorAnio: number;      // 20 días × años de servicio × SD
  primaAntiguedad: number;         // 12 días × años (solo si >15 años o despido)
  totalIndemnizacion: number;
  // Total
  totalLiquidacion: number;
  // Desglose
  aniosServicio: number;
  salarioDiario: number;
  motivo: MotivoBaja;
}

/**
 * Calcula el finiquito (aplica a cualquier tipo de baja)
 * Incluye: vacaciones no tomadas + prima vacacional + aguinaldo proporcional
 */
export function calcFiniquito(
  salarioMensual: number,
  fechaIngreso: Date,
  fechaBaja: Date,
  diasVacacionesTomados = 0,
): CalculoFiniquito {
  const sd = salarioMensual / 30.4;
  const anios = Math.max(0, (fechaBaja.getTime() - fechaIngreso.getTime()) / (365.25 * 24 * 3600 * 1000));
  const aniosCompletos = Math.floor(anios);

  const diasVacCorresponden = diasVacacionesPorAntiguedad(Math.max(1, aniosCompletos));
  const diasVacPendientes = Math.max(0, diasVacCorresponden - diasVacacionesTomados);

  const vacaciones = Math.round(diasVacPendientes * sd);
  const primaVacacional = Math.round(vacaciones * 0.25);

  // Aguinaldo proporcional: días transcurridos del año / 365 × 15 días
  const inicioAnio = new Date(fechaBaja.getFullYear(), 0, 1);
  const diasDelAnio = Math.floor((fechaBaja.getTime() - inicioAnio.getTime()) / (24 * 3600 * 1000));
  const aguinaldoProporcional = Math.round((diasDelAnio / 365) * 15 * sd);

  return {
    diasVacacionesPendientes: diasVacPendientes,
    vacaciones, primaVacacional, aguinaldoProporcional,
    totalFiniquito: vacaciones + primaVacacional + aguinaldoProporcional,
  };
}

/**
 * Calcula liquidación completa según motivo de baja (LFT)
 *
 * Despido injustificado: finiquito + 3 meses + 20 días/año + prima antigüedad
 * Renuncia voluntaria:   finiquito + prima antigüedad (si >15 años)
 * Término de contrato:   finiquito
 * Despido justificado:   finiquito
 */
export function calcLiquidacion(
  salarioMensual: number,
  fechaIngreso: Date,
  fechaBaja: Date,
  motivo: MotivoBaja,
  diasVacacionesTomados = 0,
): CalculoLiquidacion {
  const sd = salarioMensual / 30.4;
  const anios = (fechaBaja.getTime() - fechaIngreso.getTime()) / (365.25 * 24 * 3600 * 1000);
  const aniosCompletos = Math.max(0, Math.floor(anios));
  const finiquito = calcFiniquito(salarioMensual, fechaIngreso, fechaBaja, diasVacacionesTomados);

  let tresMeses = 0, veintieDias = 0, primaAnt = 0;

  if (motivo === 'despido_injustificado' || motivo === 'mutuo_acuerdo') {
    tresMeses   = Math.round(90 * sd);
    veintieDias = Math.round(20 * aniosCompletos * sd);
    primaAnt    = Math.round(12 * aniosCompletos * sd);  // prima de antigüedad
  } else if (motivo === 'renuncia_voluntaria' && aniosCompletos >= 15) {
    primaAnt = Math.round(12 * aniosCompletos * sd);
  }

  const totalIndemnizacion = tresMeses + veintieDias + primaAnt;

  return {
    finiquito,
    tresMesesSalario: tresMeses,
    veintieDiasPorAnio: veintieDias,
    primaAntiguedad: primaAnt,
    totalIndemnizacion,
    totalLiquidacion: finiquito.totalFiniquito + totalIndemnizacion,
    aniosServicio: aniosCompletos,
    salarioDiario: Math.round(sd * 100) / 100,
    motivo,
  };
}

// ── Días festivos LFT art. 74 (2025) ─────────────────────────────────────────

export const DIAS_FESTIVOS_LFT_2025: { fecha: string; nombre: string }[] = [
  { fecha: '2025-01-01', nombre: 'Año Nuevo' },
  { fecha: '2025-02-03', nombre: 'Día de la Constitución (1er lunes feb)' },
  { fecha: '2025-03-17', nombre: 'Natalicio de Benito Juárez (3er lunes mar)' },
  { fecha: '2025-05-01', nombre: 'Día del Trabajo' },
  { fecha: '2025-09-16', nombre: 'Independencia de México' },
  { fecha: '2025-11-17', nombre: 'Revolución Mexicana (3er lunes nov)' },
  { fecha: '2025-12-25', nombre: 'Navidad' },
];

/** Verifica si una fecha es festivo oficial LFT */
export function esDiaFestivo(fecha: Date): string | null {
  const iso = fecha.toISOString().substring(0, 10);
  return DIAS_FESTIVOS_LFT_2025.find(d => d.fecha === iso)?.nombre ?? null;
}

/** Calcula si un día tiene prima dominical (domingo trabajado = +25%) */
export function tienePrimaDominical(fecha: Date): boolean {
  return fecha.getDay() === 0;  // 0 = domingo
}

// ── Vacaciones disponibles (control por empleado) ─────────────────────────────

export interface SaldoVacaciones {
  aniosCompletos: number;
  diasCorresponden: number;   // según tabla LFT
  diasTomados: number;
  diasPendientes: number;
  diasVencidos: number;       // si no tomó en el período (pierden vigencia a 1 año en MX)
}

export function calcSaldoVacaciones(
  fechaIngreso: Date,
  fechaReferencia: Date,
  diasTomados: number,
): SaldoVacaciones {
  const anios = (fechaReferencia.getTime() - fechaIngreso.getTime()) / (365.25 * 24 * 3600 * 1000);
  const aniosCompletos = Math.floor(Math.max(0, anios));
  const diasCorresponden = diasVacacionesPorAntiguedad(Math.max(1, aniosCompletos));
  const diasPendientes = Math.max(0, diasCorresponden - diasTomados);

  return {
    aniosCompletos,
    diasCorresponden,
    diasTomados,
    diasPendientes,
    diasVencidos: 0,  // requeriría historial año por año
  };
}
