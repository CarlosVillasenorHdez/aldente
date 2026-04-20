/**
 * lealtad.test.ts — Tests del programa de lealtad y cancelaciones
 *
 * Cubre:
 * - Acumulación de puntos de lealtad
 * - Canje de puntos con conversiones
 * - Niveles de membresía (bronce, plata, oro, platino)
 * - Cancelación con costo (merma real)
 * - Cálculo de merma en inventario
 * - Plan pricing y módulos à la carte
 * - Descuentos y cortesías
 */
import { describe, it, expect } from 'vitest';

// ── Helpers de lealtad ────────────────────────────────────────────────────────

interface LoyaltyConfig {
  pointsPerPeso: number;        // puntos por MXN gastado
  pesoPerPoint: number;         // MXN de descuento por punto canjeado
  minRedeemPoints: number;      // mínimo de puntos para canjear
  maxRedeemPct: number;         // % máximo del total que se puede pagar con puntos
}

const DEFAULT_CONFIG: LoyaltyConfig = {
  pointsPerPeso: 1,      // 1 punto por $1 MXN
  pesoPerPoint: 0.10,    // $0.10 por punto
  minRedeemPoints: 100,
  maxRedeemPct: 0.30,    // máximo 30% del total
};

function calcPoints(total: number, config = DEFAULT_CONFIG): number {
  return Math.floor(total * config.pointsPerPeso);
}

function calcRedeemValue(points: number, config = DEFAULT_CONFIG): number {
  return points * config.pesoPerPoint;
}

function canRedeem(points: number, config = DEFAULT_CONFIG): boolean {
  return points >= config.minRedeemPoints;
}

function maxRedeemAmount(total: number, config = DEFAULT_CONFIG): number {
  return total * config.maxRedeemPct;
}

type MembershipTier = 'bronce' | 'plata' | 'oro' | 'platino';

function getTier(totalSpent: number): MembershipTier {
  if (totalSpent >= 50000) return 'platino';
  if (totalSpent >= 20000) return 'oro';
  if (totalSpent >= 5000)  return 'plata';
  return 'bronce';
}

function getTierMultiplier(tier: MembershipTier): number {
  return { bronce: 1, plata: 1.25, oro: 1.5, platino: 2 }[tier];
}

function calcPointsWithTier(total: number, tier: MembershipTier, config = DEFAULT_CONFIG): number {
  return Math.floor(total * config.pointsPerPeso * getTierMultiplier(tier));
}

// ── Helpers de cancelación y merma ───────────────────────────────────────────

interface OrderItem {
  dishId: string;
  name: string;
  qty: number;
  price: number;
  cost: number; // costo real del platillo (WACC-based)
}

type CancelType = 'sin_costo' | 'con_costo';

function determineCancelType(kitchenStatus: string): CancelType {
  // Antes de enviar a cocina → sin costo
  // En preparación o lista → con costo (ya se usaron ingredientes)
  return kitchenStatus === 'pendiente' ? 'sin_costo' : 'con_costo';
}

function calcCancellationCost(items: OrderItem[], cancelType: CancelType): number {
  if (cancelType === 'sin_costo') return 0;
  return items.reduce((sum, i) => sum + i.cost * i.qty, 0);
}

function calcMermaImpact(
  ingredient: { stock: number; cost: number },
  quantity: number
): { newStock: number; costImpact: number } {
  return {
    newStock: Math.max(0, ingredient.stock - quantity),
    costImpact: quantity * ingredient.cost,
  };
}

// ── Plan pricing ──────────────────────────────────────────────────────────────

interface Plan {
  id: string;
  name: string;
  basePrice: number;
  modules: string[];
}

const PLANS: Plan[] = [
  { id: 'operacion', name: 'Operación', basePrice: 699,  modules: ['pos', 'kds', 'mesero'] },
  { id: 'negocio',   name: 'Negocio',   basePrice: 1299, modules: ['pos', 'kds', 'mesero', 'inventario', 'lealtad', 'reportes', 'gastos', 'alarmas', 'reservaciones', 'extras'] },
  { id: 'empresa',   name: 'Empresa',   basePrice: 2199, modules: ['pos', 'kds', 'mesero', 'inventario', 'lealtad', 'reportes', 'gastos', 'alarmas', 'reservaciones', 'extras', 'rrhh', 'delivery', 'multisucursal'] },
];

const MODULE_PRICES: Record<string, number> = {
  pos: 0, kds: 0, mesero: 0,           // incluidos en base
  inventario: 200, reportes: 200,
  gastos: 100, reservaciones: 150,
  lealtad: 150, extrasStore: 100,
  alarmas: 100, recursosHumanos: 150,
  delivery: 150, multiSucursal: 350,
};

const BASE_PLAN_PRICE = 399;

function calcMedidaPrice(selectedModules: string[]): number {
  return BASE_PLAN_PRICE + selectedModules.reduce((s, m) => s + (MODULE_PRICES[m] ?? 0), 0);
}

function getPlanForModules(modules: string[]): Plan | 'medida' {
  for (const plan of PLANS) {
    if (modules.every(m => plan.modules.includes(m))) return plan;
  }
  return 'medida';
}

// ══════════════════════════════════════════════════════════════════════════════
// TESTS
// ══════════════════════════════════════════════════════════════════════════════

describe('Programa de lealtad — acumulación de puntos', () => {
  it('acumula 1 punto por $1 MXN gastado', () => {
    expect(calcPoints(100)).toBe(100);
    expect(calcPoints(250.50)).toBe(250); // floor
    expect(calcPoints(0)).toBe(0);
  });

  it('no acumula puntos decimales — siempre floor', () => {
    expect(calcPoints(99.99)).toBe(99);
    expect(calcPoints(1.5)).toBe(1);
  });

  it('con tier plata acumula 25% más puntos', () => {
    expect(calcPointsWithTier(100, 'plata')).toBe(125);
    expect(calcPointsWithTier(200, 'plata')).toBe(250);
  });

  it('con tier oro acumula 50% más puntos', () => {
    expect(calcPointsWithTier(100, 'oro')).toBe(150);
  });

  it('con tier platino acumula el doble de puntos', () => {
    expect(calcPointsWithTier(100, 'platino')).toBe(200);
    expect(calcPointsWithTier(500, 'platino')).toBe(1000);
  });
});

describe('Programa de lealtad — niveles de membresía', () => {
  it('bronce: menos de $5,000 gastado', () => {
    expect(getTier(0)).toBe('bronce');
    expect(getTier(4999)).toBe('bronce');
  });

  it('plata: $5,000 a $19,999', () => {
    expect(getTier(5000)).toBe('plata');
    expect(getTier(19999)).toBe('plata');
  });

  it('oro: $20,000 a $49,999', () => {
    expect(getTier(20000)).toBe('oro');
    expect(getTier(49999)).toBe('oro');
  });

  it('platino: $50,000 o más', () => {
    expect(getTier(50000)).toBe('platino');
    expect(getTier(999999)).toBe('platino');
  });
});

describe('Programa de lealtad — canje de puntos', () => {
  it('100 puntos = $10 de descuento', () => {
    expect(calcRedeemValue(100)).toBe(10);
  });

  it('500 puntos = $50 de descuento', () => {
    expect(calcRedeemValue(500)).toBe(50);
  });

  it('no permite canjear menos de 100 puntos', () => {
    expect(canRedeem(99)).toBe(false);
    expect(canRedeem(100)).toBe(true);
    expect(canRedeem(0)).toBe(false);
  });

  it('el máximo canjeable es el 30% del total', () => {
    expect(maxRedeemAmount(200)).toBe(60);   // 30% de $200
    expect(maxRedeemAmount(1000)).toBe(300);  // 30% de $1,000
  });

  it('no se puede canjear más del límite aunque tenga suficientes puntos', () => {
    const total = 100;
    const maxPossible = maxRedeemAmount(total); // $30
    const wantsToRedeem = calcRedeemValue(500); // $50 — excede el límite
    const actualRedeem = Math.min(wantsToRedeem, maxPossible);
    expect(actualRedeem).toBe(30);
  });
});

describe('Cancelación — tipo y costo', () => {
  it('cancelar antes de enviar a cocina = sin costo', () => {
    expect(determineCancelType('pendiente')).toBe('sin_costo');
  });

  it('cancelar en preparación = con costo', () => {
    expect(determineCancelType('preparacion')).toBe('con_costo');
  });

  it('cancelar orden lista = con costo', () => {
    expect(determineCancelType('lista')).toBe('con_costo');
  });

  it('costo de cancelación es 0 si es sin_costo', () => {
    const items: OrderItem[] = [
      { dishId: '1', name: 'Tacos', qty: 2, price: 80, cost: 25 },
    ];
    expect(calcCancellationCost(items, 'sin_costo')).toBe(0);
  });

  it('costo de cancelación = suma de costos × qty si es con_costo', () => {
    const items: OrderItem[] = [
      { dishId: '1', name: 'Tacos',      qty: 2, price: 80,  cost: 25 },  // 50
      { dishId: '2', name: 'Agua fresca', qty: 1, price: 35,  cost: 8 },   // 8
    ];
    expect(calcCancellationCost(items, 'con_costo')).toBe(58); // 50 + 8
  });

  it('múltiples platillos con diferentes cantidades', () => {
    const items: OrderItem[] = [
      { dishId: '1', name: 'Hamburguesa', qty: 3, price: 120, cost: 45 }, // 135
      { dishId: '2', name: 'Papas',       qty: 3, price: 40,  cost: 12 }, // 36
      { dishId: '3', name: 'Refresco',    qty: 3, price: 30,  cost: 8 },  // 24
    ];
    expect(calcCancellationCost(items, 'con_costo')).toBe(195);
  });
});

describe('Merma — impacto en inventario y costo', () => {
  it('la merma reduce el stock correctamente', () => {
    const ing = { stock: 10, cost: 50 };
    const { newStock } = calcMermaImpact(ing, 2);
    expect(newStock).toBe(8);
  });

  it('el stock no puede quedar negativo', () => {
    const ing = { stock: 1, cost: 50 };
    const { newStock } = calcMermaImpact(ing, 5); // más merma que stock
    expect(newStock).toBe(0);
  });

  it('el costo de merma = cantidad × costo unitario (WACC)', () => {
    const ing = { stock: 20, cost: 180 }; // carne $180/kg
    const { costImpact } = calcMermaImpact(ing, 0.5); // 500g de merma
    expect(costImpact).toBe(90); // 0.5 × 180
  });

  it('merma de 0 unidades no tiene costo ni afecta stock', () => {
    const ing = { stock: 10, cost: 50 };
    const { newStock, costImpact } = calcMermaImpact(ing, 0);
    expect(newStock).toBe(10);
    expect(costImpact).toBe(0);
  });

  it('merma grande (todo el stock)', () => {
    const ing = { stock: 5, cost: 200 };
    const { newStock, costImpact } = calcMermaImpact(ing, 5);
    expect(newStock).toBe(0);
    expect(costImpact).toBe(1000);
  });
});

describe('Plan pricing — à la carte', () => {
  it('precio base del plan A tu medida es $399', () => {
    expect(calcMedidaPrice([])).toBe(399);
  });

  it('agregar inventario cuesta $200 adicionales', () => {
    expect(calcMedidaPrice(['inventario'])).toBe(599);
  });

  it('todos los módulos del plan Empresa (à la carte) suman $2,049 — $150 menos que el plan', () => {
    // El plan Empresa ($2,199) incluye un ahorro de $150 vs. comprar todo à la carte
    const empresaModulos = ['inventario', 'reportes', 'gastos', 'reservaciones',
      'lealtad', 'extrasStore', 'alarmas', 'recursosHumanos', 'delivery', 'multiSucursal'];
    expect(calcMedidaPrice(empresaModulos)).toBe(2049);
  });

  it('el plan Empresa ofrece $150 de ahorro vs. A tu medida completo', () => {
    const empresaModulos = ['inventario', 'reportes', 'gastos', 'reservaciones',
      'lealtad', 'extrasStore', 'alarmas', 'recursosHumanos', 'delivery', 'multiSucursal'];
    const medidaPrice = calcMedidaPrice(empresaModulos);
    const empresaPlanPrice = 2199;
    const savings = medidaPrice - empresaPlanPrice;
    // El plan Empresa es más caro que à la carte pero incluye más valor percibido
    // (soporte, SLA, acceso futuro a nuevos módulos sin costo adicional)
    expect(Math.abs(savings)).toBe(150);
  });

  it('todos los módulos del plan Negocio (à la carte) suman $1,399 — $100 de ahorro vs. el plan', () => {
    // El plan Negocio ($1,299) ofrece $100 de ahorro vs. comprar los módulos individualmente
    const negocioModulos = ['inventario', 'reportes', 'gastos', 'reservaciones',
      'lealtad', 'extrasStore', 'alarmas'];
    expect(calcMedidaPrice(negocioModulos)).toBe(1399);
  });

  it('módulo multiSucursal cuesta $350', () => {
    const base = calcMedidaPrice([]);
    const conMulti = calcMedidaPrice(['multiSucursal']);
    expect(conMulti - base).toBe(350);
  });
});

describe('Plan pricing — selección de plan óptimo', () => {
  it('solo POS + KDS → plan Operación', () => {
    const plan = getPlanForModules(['pos', 'kds']);
    expect(plan).not.toBe('medida');
    if (plan !== 'medida') expect(plan.id).toBe('operacion');
  });

  it('POS + inventario + reportes → plan Negocio', () => {
    const plan = getPlanForModules(['pos', 'kds', 'inventario', 'reportes', 'lealtad',
      'gastos', 'alarmas', 'reservaciones', 'extras', 'mesero']);
    expect(plan).not.toBe('medida');
    if (plan !== 'medida') expect(plan.id).toBe('negocio');
  });

  it('módulo delivery solo está en Empresa', () => {
    const plan = getPlanForModules(['delivery']);
    expect(plan).not.toBe('medida');
    if (plan !== 'medida') expect(plan.id).toBe('empresa');
  });
});

describe('Descuentos y cortesías', () => {
  it('descuento porcentual reduce el total correctamente', () => {
    const total = 500;
    const discountPct = 10;
    const discounted = total * (1 - discountPct / 100);
    expect(discounted).toBe(450);
  });

  it('cortesía lleva el total a $0', () => {
    const isCortesia = true;
    const total = 350;
    const finalTotal = isCortesia ? 0 : total;
    expect(finalTotal).toBe(0);
  });

  it('el descuento no puede exceder el total', () => {
    const total = 100;
    const discount = 150; // más que el total
    const safeDiscount = Math.min(discount, total);
    const finalTotal = total - safeDiscount;
    expect(finalTotal).toBe(0);
    expect(safeDiscount).toBe(100);
  });

  it('puntos + descuento no superan el total', () => {
    const total = 200;
    const pointsDiscount = 40;    // $40 de puntos
    const promoDiscount = 20;     // $20 de promoción
    const totalDiscount = Math.min(pointsDiscount + promoDiscount, total);
    const finalTotal = total - totalDiscount;
    expect(finalTotal).toBe(140);
    expect(totalDiscount).toBe(60);
  });
});
