/**
 * tiempoExtra.test.ts — Cálculo de tiempo extra según Ley Federal del Trabajo.
 * LFT Art. 66-68: primeras 9 hrs extra/semana al DOBLE, resto al TRIPLE.
 */
import { describe, it, expect } from 'vitest';

// Réplica de la lógica de reparto dobles/triples de saveTiempoExtra
function repartirTiempoExtra(horasPrevias: number, horasNuevas: number) {
  const restanteDobles = Math.max(0, 9 - horasPrevias);
  const horasDobles = Math.min(horasNuevas, restanteDobles);
  const horasTriples = horasNuevas - horasDobles;
  const factorEfectivo = horasNuevas > 0
    ? (horasDobles * 2 + horasTriples * 3) / horasNuevas
    : 2;
  return { horasDobles, horasTriples, factorEfectivo };
}

// Monto: horas × tarifa/hora × factor
function montoTiempoExtra(salarioMensual: number, horas: number, factor: number) {
  const tarifaHora = salarioMensual / (30 * 8);
  return Math.round(horas * tarifaHora * factor);
}

describe('Tiempo extra — Ley Federal del Trabajo', () => {
  it('primeras 9 horas de la semana van al doble (2x)', () => {
    const r = repartirTiempoExtra(0, 3);
    expect(r.horasDobles).toBe(3);
    expect(r.horasTriples).toBe(0);
    expect(r.factorEfectivo).toBe(2);
  });

  it('a partir de la hora 10 va al triple (3x)', () => {
    // Ya llevaba 9 esta semana, registra 2 más → ambas al triple
    const r = repartirTiempoExtra(9, 2);
    expect(r.horasDobles).toBe(0);
    expect(r.horasTriples).toBe(2);
    expect(r.factorEfectivo).toBe(3);
  });

  it('registro que cruza el umbral: parte doble, parte triple', () => {
    // Llevaba 8, registra 3 → 1 al doble (completa 9), 2 al triple
    const r = repartirTiempoExtra(8, 3);
    expect(r.horasDobles).toBe(1);
    expect(r.horasTriples).toBe(2);
    // factor efectivo ponderado: (1*2 + 2*3) / 3 = 8/3 ≈ 2.67
    expect(r.factorEfectivo).toBeCloseTo(2.667, 2);
  });

  it('monto correcto: Mari (cocinera $1500/sem ≈ $6495/mes), 3h al doble', () => {
    const mensual = 1500 * 4.33; // 6495
    const { factorEfectivo } = repartirTiempoExtra(0, 3);
    const monto = montoTiempoExtra(mensual, 3, factorEfectivo);
    // tarifa/hora = 6495/240 ≈ 27.06; × 3h × 2 ≈ 162
    expect(monto).toBe(162);
  });

  it('el doble turno (muchas horas) se paga escalando a triple tras 9h', () => {
    // Turno normal 8h + doble turno: registra 8h extra habiendo 0 previas
    // (caso extremo, supera límite legal pero el cálculo debe ser correcto)
    const r = repartirTiempoExtra(0, 8);
    expect(r.horasDobles).toBe(8); // todas caben en las primeras 9
    const r2 = repartirTiempoExtra(0, 12);
    expect(r2.horasDobles).toBe(9);
    expect(r2.horasTriples).toBe(3);
  });
});
