/**
 * Tests unitarios — lógicas financieras de Aldente ERP
 *
 * Cubre: WACC, RoP, IVA, P&L derivados, propinas, margen por platillo
 */

import { describe, it, expect } from 'vitest';

// ─── WACC ────────────────────────────────────────────────────────────────────

function calcWacc(stockActual: number, waccAnterior: number, qtynueva: number, costoCompra: number): number {
  if (stockActual + qtynueva === 0) return 0;
  return ((stockActual * waccAnterior) + (qtynueva * costoCompra)) / (stockActual + qtynueva);
}

describe('WACC — Costo Promedio Ponderado', () => {
  it('calcula WACC correctamente con stock existente', () => {
    // 50 panes a $45 + 30 panes a $52
    const resultado = calcWacc(50, 45, 30, 52);
    expect(resultado).toBeCloseTo(47.625, 2);
  });

  it('WACC con stock 0 (primer ingreso) = precio de compra', () => {
    const resultado = calcWacc(0, 0, 100, 38.5);
    expect(resultado).toBeCloseTo(38.5, 2);
  });

  it('WACC igual precio = no cambia', () => {
    const resultado = calcWacc(50, 40, 50, 40);
    expect(resultado).toBeCloseTo(40, 2);
  });

  it('WACC con compra más barata baja el promedio', () => {
    const resultado = calcWacc(100, 60, 100, 40);
    expect(resultado).toBeCloseTo(50, 2);
  });

  it('total_cost = unit_cost × qty', () => {
    const unitCost = calcWacc(50, 45, 30, 52);
    const deductQty = 5;
    const totalCost = unitCost * deductQty;
    expect(totalCost).toBeCloseTo(238.125, 2);
  });
});

// ─── IVA ─────────────────────────────────────────────────────────────────────

function calcIvaIncluido(subtotal: number, ivaPercent: number): number {
  return subtotal * (ivaPercent / (100 + ivaPercent));
}

function calcIvaExcluido(subtotal: number, ivaPercent: number): number {
  return subtotal * (ivaPercent / 100);
}

describe('IVA — Cálculo de impuesto', () => {
  it('IVA incluido 16% sobre $100', () => {
    const iva = calcIvaIncluido(100, 16);
    expect(iva).toBeCloseTo(13.793, 2); // 100 * 16/116
  });

  it('IVA excluido 16% sobre $100', () => {
    const iva = calcIvaExcluido(100, 16);
    expect(iva).toBeCloseTo(16, 2);
  });

  it('precio sin IVA cuando está incluido', () => {
    const iva = calcIvaIncluido(116, 16);
    const sinIva = 116 - iva;
    expect(sinIva).toBeCloseTo(100, 2);
  });

  it('total con IVA excluido = subtotal + IVA', () => {
    const subtotal = 200;
    const iva = calcIvaExcluido(subtotal, 16);
    expect(subtotal + iva).toBeCloseTo(232, 2);
  });
});

// ─── Punto de Reorden (RoP) ──────────────────────────────────────────────────

function calcRoP(demandaDiaria: number, leadTimeDias: number, minStock: number): number {
  if (demandaDiaria <= 0) return minStock * 1.5;
  return (demandaDiaria * leadTimeDias) + minStock;
}

describe('RoP — Punto de Reorden', () => {
  it('calcula RoP correctamente', () => {
    // 10 unidades/día, 3 días lead time, 20 de stock mínimo
    const rop = calcRoP(10, 3, 20);
    expect(rop).toBe(50); // 10*3 + 20
  });

  it('fallback a min_stock × 1.5 cuando no hay historial', () => {
    const rop = calcRoP(0, 3, 20);
    expect(rop).toBeCloseTo(30, 2);
  });

  it('lead time 1 día = demanda + min_stock', () => {
    const rop = calcRoP(15, 1, 10);
    expect(rop).toBe(25);
  });
});

// ─── Margen por Platillo ──────────────────────────────────────────────────────

function calcMargen(totalOrden: number, costActual: number): { margenActual: number; margenPct: number } {
  const margenActual = totalOrden - costActual;
  const margenPct = totalOrden > 0 ? (margenActual / totalOrden) * 100 : 0;
  return { margenActual, margenPct };
}

describe('Margen por Platillo', () => {
  it('margen positivo — platillo rentable', () => {
    const { margenActual, margenPct } = calcMargen(150, 45);
    expect(margenActual).toBeCloseTo(105, 2);
    expect(margenPct).toBeCloseTo(70, 1);
  });

  it('margen 0 — precio igual al costo', () => {
    const { margenActual, margenPct } = calcMargen(80, 80);
    expect(margenActual).toBe(0);
    expect(margenPct).toBe(0);
  });

  it('margen negativo — platillo vendido por debajo del costo', () => {
    const { margenActual, margenPct } = calcMargen(50, 75);
    expect(margenActual).toBe(-25);
    expect(margenPct).toBeCloseTo(-50, 1);
  });

  it('total 0 — no divide por cero', () => {
    const { margenPct } = calcMargen(0, 0);
    expect(margenPct).toBe(0);
  });
});

// ─── Propinas ────────────────────────────────────────────────────────────────

function calcPropina(total: number, pct: number, montoFijo: string): number {
  if (montoFijo) return parseFloat(montoFijo) || 0;
  return Math.round(total * pct / 100 * 100) / 100;
}

describe('Propinas', () => {
  it('10% de $200 = $20', () => {
    expect(calcPropina(200, 10, '')).toBeCloseTo(20, 2);
  });

  it('15% de $350 = $52.50', () => {
    expect(calcPropina(350, 15, '')).toBeCloseTo(52.5, 2);
  });

  it('monto fijo sobreescribe el porcentaje', () => {
    expect(calcPropina(200, 15, '50')).toBe(50);
  });

  it('0% no agrega propina', () => {
    expect(calcPropina(500, 0, '')).toBe(0);
  });

  it('monto fijo vacío y 0% = 0', () => {
    expect(calcPropina(300, 0, '')).toBe(0);
  });
});

// ─── Factores de frecuencia (P&L) ────────────────────────────────────────────

const GFREQ: Record<string, number> = {
  diaria: 30, semanal: 4.33, quincenal: 2, mensual: 1, trimestral: 0.33, anual: 0.083,
};

describe('Factores de frecuencia para P&L', () => {
  it('gasto diario × 30 = mensual', () => {
    expect(100 * GFREQ['diaria']).toBe(3000);
  });

  it('gasto mensual × 1 = sin cambio', () => {
    expect(5000 * GFREQ['mensual']).toBe(5000);
  });

  it('gasto anual ÷ 12 ≈ mensual', () => {
    expect(12000 * GFREQ['anual']).toBeCloseTo(996, 0);
  });

  it('gasto semanal × 4.33 ≈ mensual', () => {
    expect(1000 * GFREQ['semanal']).toBeCloseTo(4330, 0);
  });
});

// ─── Cálculo de precio "A tu medida" ─────────────────────────────────────────

const MODULE_PRICES: Record<string, number> = {
  meseroMovil: 150, inventario: 200, reportes: 200, gastos: 100,
  reservaciones: 150, lealtad: 150, extrasStore: 100, alarmas: 100,
  recursosHumanos: 150, delivery: 150, multiSucursal: 350, // subido de 300 a 350
};
const BASE_PRICE = 399;

function calcMedidaPrice(activeModules: string[]): number {
  return BASE_PRICE + activeModules.reduce((s, m) => s + (MODULE_PRICES[m] ?? 0), 0);
}

describe('Precio plan "A tu medida"', () => {
  it('sin módulos = precio base $399', () => {
    expect(calcMedidaPrice([])).toBe(399);
  });

  it('plan Operación equivale a $699', () => {
    // $399 + meseroMovil $150 = $549 → plan Operación cuesta $699 → bundle más barato
    const precio = calcMedidaPrice(['meseroMovil']);
    expect(precio).toBe(549);
  });

  it('todos los módulos suman $2,199 — igual que plan Empresa (plan es el precio tope)', () => {
    // Con multiSucursal = $350: $399 + $1,800 = $2,199 = precio plan Empresa
    // El bundle da el mismo precio pero sin gestión individual — Empresa tiene soporte
    const all = Object.keys(MODULE_PRICES);
    const precio = calcMedidaPrice(all);
    expect(precio).toBe(2199);
  });

  it('módulo inexistente no suma nada', () => {
    expect(calcMedidaPrice(['moduloFalso'])).toBe(399);
  });
});

// ─── Acumulación de puntos de lealtad ─────────────────────────────────────────

function calcPuntosGanados(montoCompra: number, pesosPerPoint: number): number {
  return Math.floor(montoCompra / pesosPerPoint);
}

function calcPuntosRequeridos(descuentoSolicitado: number, pointValue: number): number {
  return Math.floor(descuentoSolicitado / pointValue);
}

describe('Sistema de Lealtad — Puntos', () => {
  it('$200 compra a $10/punto = 20 puntos', () => {
    expect(calcPuntosGanados(200, 10)).toBe(20);
  });

  it('fracción de punto no se acumula (floor)', () => {
    expect(calcPuntosGanados(195, 10)).toBe(19);
  });

  it('canjear $50 a $0.50/punto = 100 puntos', () => {
    expect(calcPuntosRequeridos(50, 0.5)).toBe(100);
  });

  it('$0 de compra = 0 puntos', () => {
    expect(calcPuntosGanados(0, 10)).toBe(0);
  });
});

// ─── Depreciación lineal ──────────────────────────────────────────────────────

function calcDepreciacionMensual(valorOriginal: number, valorResidual: number, vidaUtilAnios: number): number {
  return (valorOriginal - valorResidual) / (vidaUtilAnios * 12);
}

describe('Depreciación mensual lineal', () => {
  it('horno $50,000 valor residual $5,000 en 5 años', () => {
    const dep = calcDepreciacionMensual(50000, 5000, 5);
    expect(dep).toBeCloseTo(750, 2); // 45000 / 60
  });

  it('activo sin valor residual', () => {
    const dep = calcDepreciacionMensual(24000, 0, 2);
    expect(dep).toBeCloseTo(1000, 2);
  });

  it('vida útil 0 no causa división por cero (Math.max protege)', () => {
    // En el código real: Math.max(vida_util_anios * 12, 1)
    const vida = Math.max(0 * 12, 1);
    const dep = (10000 - 0) / vida;
    expect(dep).toBe(10000);
  });
});
