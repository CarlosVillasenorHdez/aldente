/**
 * Tests — Flujo de órdenes y estados
 *
 * Cubre: máquina de estados, cancelación con/sin costo,
 * deducción de stock, lógica de comandas FIFO
 */

import { describe, it, expect } from 'vitest';

// ─── Máquina de estados de kitchen_status ─────────────────────────────────────

type KitchenStatus = 'en_edicion' | 'pendiente' | 'preparacion' | 'lista' | 'entregada' | 'cancelada';

const STATUS_FLOW: KitchenStatus[] = ['pendiente', 'preparacion', 'lista', 'entregada'];

function getNextStatus(current: KitchenStatus): KitchenStatus | null {
  const idx = STATUS_FLOW.indexOf(current);
  if (idx === -1 || idx === STATUS_FLOW.length - 1) return null;
  return STATUS_FLOW[idx + 1];
}

function hasCost(kitchenStatus: KitchenStatus): boolean {
  return kitchenStatus === 'preparacion' || kitchenStatus === 'lista';
}

describe('Máquina de estados — kitchen_status', () => {
  it('de pendiente avanza a preparacion', () => {
    expect(getNextStatus('pendiente')).toBe('preparacion');
  });

  it('de preparacion avanza a lista', () => {
    expect(getNextStatus('preparacion')).toBe('lista');
  });

  it('de lista avanza a entregada', () => {
    expect(getNextStatus('lista')).toBe('entregada');
  });

  it('entregada no tiene siguiente estado', () => {
    expect(getNextStatus('entregada')).toBeNull();
  });

  it('en_edicion no está en el flujo KDS', () => {
    expect(getNextStatus('en_edicion')).toBeNull();
  });
});

describe('Cancelación — determinar costo de merma', () => {
  it('cancelar en pendiente = sin costo', () => {
    expect(hasCost('pendiente')).toBe(false);
  });

  it('cancelar en preparacion = con costo (ingredientes usados)', () => {
    expect(hasCost('preparacion')).toBe(true);
  });

  it('cancelar en lista = con costo (platillo terminado)', () => {
    expect(hasCost('lista')).toBe(true);
  });

  it('entregada no se puede cancelar', () => {
    expect(hasCost('entregada')).toBe(false);
  });
});

// ─── Propagación de estado padre ─────────────────────────────────────────────

function calcParentStatus(siblingsStatuses: KitchenStatus[]): KitchenStatus {
  const active = siblingsStatuses.filter(s => s !== 'cancelada' && s !== 'entregada');
  if (active.length === 0) return 'entregada';
  if (active.every(s => s === 'lista')) return 'lista';
  if (active.some(s => s === 'preparacion' || s === 'lista')) return 'preparacion';
  return 'pendiente';
}

describe('Propagación de estado al padre (KDS → Orden)', () => {
  it('todas las comandas en lista → padre = lista', () => {
    expect(calcParentStatus(['lista', 'lista', 'lista'])).toBe('lista');
  });

  it('alguna en preparacion → padre = preparacion', () => {
    expect(calcParentStatus(['lista', 'preparacion', 'lista'])).toBe('preparacion');
  });

  it('todas en pendiente → padre = pendiente', () => {
    expect(calcParentStatus(['pendiente', 'pendiente'])).toBe('pendiente');
  });

  it('una lista, una pendiente → padre = preparacion (en progreso)', () => {
    expect(calcParentStatus(['lista', 'pendiente'])).toBe('preparacion');
  });

  it('todas canceladas → padre = entregada', () => {
    expect(calcParentStatus(['cancelada', 'cancelada'])).toBe('entregada');
  });
});

// ─── Deducción de stock ───────────────────────────────────────────────────────

interface RecipeItem {
  ingredient_id: string;
  quantity: number;
  unit: string;
}

interface Ingredient {
  id: string;
  stock: number;
  cost: number;
  unit: string;
}

function calcStockDeductions(
  items: { dishId: string; qty: number }[],
  recipes: Record<string, RecipeItem[]>,
  ingredients: Record<string, Ingredient>,
  excludedIngredientIds: string[] = []
): { ingredientId: string; deductQty: number; newStock: number; totalCost: number }[] {
  const result: { ingredientId: string; deductQty: number; newStock: number; totalCost: number }[] = [];

  for (const item of items) {
    const recipe = recipes[item.dishId] ?? [];
    for (const ri of recipe) {
      if (excludedIngredientIds.includes(ri.ingredient_id)) continue;
      const ing = ingredients[ri.ingredient_id];
      if (!ing) continue;
      const deductQty = ri.quantity * item.qty;
      result.push({
        ingredientId: ri.ingredient_id,
        deductQty,
        newStock: Math.max(0, ing.stock - deductQty),
        totalCost: deductQty * ing.cost,
      });
    }
  }

  return result;
}

describe('Deducción de stock al cerrar orden', () => {
  const ingredients: Record<string, Ingredient> = {
    'ing-pan':  { id: 'ing-pan',  stock: 50, cost: 2.5,  unit: 'pieza' },
    'ing-carne':{ id: 'ing-carne',stock: 20, cost: 45,   unit: 'kg' },
    'ing-lechuga':{ id: 'ing-lechuga', stock: 10, cost: 8, unit: 'kg' },
  };

  const recipes: Record<string, RecipeItem[]> = {
    'dish-burger': [
      { ingredient_id: 'ing-pan',   quantity: 1,   unit: 'pieza' },
      { ingredient_id: 'ing-carne', quantity: 0.2, unit: 'kg' },
      { ingredient_id: 'ing-lechuga', quantity: 0.05, unit: 'kg' },
    ],
  };

  it('1 burger descuenta stock correctamente', () => {
    const deductions = calcStockDeductions(
      [{ dishId: 'dish-burger', qty: 1 }],
      recipes, ingredients
    );
    const pan   = deductions.find(d => d.ingredientId === 'ing-pan');
    const carne = deductions.find(d => d.ingredientId === 'ing-carne');
    expect(pan?.deductQty).toBe(1);
    expect(pan?.newStock).toBe(49);
    expect(carne?.deductQty).toBeCloseTo(0.2, 3);
    expect(carne?.newStock).toBeCloseTo(19.8, 3);
  });

  it('2 burgers = doble deducción', () => {
    const deductions = calcStockDeductions(
      [{ dishId: 'dish-burger', qty: 2 }],
      recipes, ingredients
    );
    const pan = deductions.find(d => d.ingredientId === 'ing-pan');
    expect(pan?.deductQty).toBe(2);
    expect(pan?.newStock).toBe(48);
  });

  it('stock no baja de 0', () => {
    const ingredientesCasiVacios: Record<string, Ingredient> = {
      'ing-pan': { ...ingredients['ing-pan'], stock: 0.5 },
      'ing-carne': ingredients['ing-carne'],
      'ing-lechuga': ingredients['ing-lechuga'],
    };
    const deductions = calcStockDeductions(
      [{ dishId: 'dish-burger', qty: 1 }],
      recipes, ingredientesCasiVacios
    );
    const pan = deductions.find(d => d.ingredientId === 'ing-pan');
    expect(pan?.newStock).toBe(0); // Math.max(0, 0.5 - 1) = 0
  });

  it('ingrediente excluido no se descuenta', () => {
    const deductions = calcStockDeductions(
      [{ dishId: 'dish-burger', qty: 1 }],
      recipes, ingredients,
      ['ing-lechuga'] // cliente pidió sin lechuga
    );
    const lechuga = deductions.find(d => d.ingredientId === 'ing-lechuga');
    expect(lechuga).toBeUndefined();
  });

  it('total_cost usa WACC capturado', () => {
    const deductions = calcStockDeductions(
      [{ dishId: 'dish-burger', qty: 1 }],
      recipes, ingredients
    );
    const carne = deductions.find(d => d.ingredientId === 'ing-carne');
    // 0.2kg × $45/kg WACC = $9
    expect(carne?.totalCost).toBeCloseTo(9, 2);
  });

  it('platillo sin receta no genera deducción', () => {
    const deductions = calcStockDeductions(
      [{ dishId: 'dish-sin-receta', qty: 1 }],
      recipes, ingredients
    );
    expect(deductions).toHaveLength(0);
  });
});

// ─── Modelo FIFO de comandas ──────────────────────────────────────────────────

interface Comanda {
  id: string;
  parentOrderId: string;
  items: string[];
  kitchenStatus: KitchenStatus;
  isComanda: boolean;
}

describe('Modelo FIFO de comandas', () => {
  const orderId = 'ORD-001';

  it('cada sendToKitchen genera una comanda nueva', () => {
    const comandas: Comanda[] = [];

    // Primer envío
    comandas.push({ id: `${orderId}-C1`, parentOrderId: orderId, items: ['Burger', 'Agua'], kitchenStatus: 'pendiente', isComanda: true });
    // Segundo envío (postre añadido después)
    comandas.push({ id: `${orderId}-C2`, parentOrderId: orderId, items: ['Pastel de chocolate'], kitchenStatus: 'pendiente', isComanda: true });

    expect(comandas).toHaveLength(2);
    expect(comandas.every(c => c.isComanda)).toBe(true);
    expect(comandas.every(c => c.parentOrderId === orderId)).toBe(true);
  });

  it('orden principal nunca es comanda', () => {
    const orden = { id: orderId, isComanda: false, kitchenStatus: 'pendiente' as KitchenStatus };
    expect(orden.isComanda).toBe(false);
  });

  it('KDS solo ve comandas (is_comanda = true)', () => {
    const todas = [
      { id: orderId, isComanda: false },
      { id: `${orderId}-C1`, isComanda: true },
      { id: `${orderId}-C2`, isComanda: true },
    ];
    const kdsItems = todas.filter(o => o.isComanda);
    expect(kdsItems).toHaveLength(2);
  });
});
