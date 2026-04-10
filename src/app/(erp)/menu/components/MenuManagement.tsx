'use client';
function getTenantId(): string | null { try { return JSON.parse(sessionStorage.getItem('aldente_session') || '{}')?.tenantId || null; } catch { return null; } }


import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Plus, Search, Pencil, Trash2, X, Upload, ImageOff, ToggleLeft, ToggleRight,
  ChevronDown, UtensilsCrossed, BookOpen, FlaskConical, Minus, Lock,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAudit } from '@/hooks/useAudit';

// ─── Types ───────────────────────────────────────────────────────────────────

export type Category =
  | 'Todas' | 'Entradas' | 'Platos Fuertes' | 'Postres' | 'Bebidas' | 'Extras';

export interface Dish {
  id: string;
  name: string;
  description: string;
  price: number;
  category: Exclude<Category, 'Todas'>;
  available: boolean;
  image: string | null;
  imageAlt: string;
  emoji: string;
  popular: boolean;
  preparationTimeMin?: number;
}

export interface Ingredient {
  id: string;
  name: string;
  unit: string;
  category: string;
  cost: number;
}

export interface RecipeItem {
  id?: string;
  ingredientId: string;
  ingredientName: string;
  isRequired: boolean;
  quantity: number;
  unit: string;
  notes: string;
}

const CATEGORIES: Category[] = [
  'Todas', 'Entradas', 'Platos Fuertes', 'Postres', 'Bebidas', 'Extras',
];

const CATEGORY_COLORS: Record<Exclude<Category, 'Todas'>, string> = {
  Entradas: 'bg-green-900/40 text-green-300 border border-green-700/40',
  'Platos Fuertes': 'bg-amber-900/40 text-amber-300 border border-amber-700/40',
  Postres: 'bg-pink-900/40 text-pink-300 border border-pink-700/40',
  Bebidas: 'bg-blue-900/40 text-blue-300 border border-blue-700/40',
  Extras: 'bg-purple-900/40 text-purple-300 border border-purple-700/40',
};

const emptyForm = (): Omit<Dish, 'id'> => ({
  name: '', description: '', price: 0, category: 'Entradas',
  available: true, image: null, imageAlt: '', emoji: '', popular: false, preparationTimeMin: 15,
});

// ─── Skeleton ────────────────────────────────────────────────────────────────

function DishSkeleton() {
  return (
    <div className="rounded-2xl overflow-hidden animate-pulse" style={{ backgroundColor: '#162d55', border: '1px solid #243f72' }}>
      <div className="h-36" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }} />
      <div className="p-4 space-y-3">
        <div className="h-4 rounded-lg w-3/4" style={{ backgroundColor: 'rgba(255,255,255,0.08)' }} />
        <div className="h-3 rounded-lg w-full" style={{ backgroundColor: 'rgba(255,255,255,0.05)' }} />
        <div className="h-3 rounded-lg w-2/3" style={{ backgroundColor: 'rgba(255,255,255,0.05)' }} />
        <div className="h-8 rounded-lg w-full mt-4" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }} />
      </div>
    </div>
  );
}

// ─── Empty State ─────────────────────────────────────────────────────────────

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="rounded-2xl flex flex-col items-center justify-center py-20 gap-4" style={{ backgroundColor: '#162d55', border: '2px dashed rgba(255,255,255,0.12)' }}>
      <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ backgroundColor: 'rgba(245,158,11,0.12)' }}>
        <UtensilsCrossed size={28} style={{ color: '#f59e0b' }} />
      </div>
      <div className="text-center">
        <p className="text-base font-semibold text-white mb-1">No hay platillos en el menú</p>
        <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>Agrega tu primer platillo para comenzar a construir el menú del restaurante.</p>
      </div>
      <button onClick={onAdd} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all hover:brightness-110" style={{ backgroundColor: '#f59e0b', color: '#1B3A6B' }}>
        <Plus size={16} />Agregar primer platillo
      </button>
    </div>
  );
}

// ─── Delete Confirm Modal ─────────────────────────────────────────────────────

function DeleteConfirmModal({ dish, onConfirm, onCancel }: { dish: Dish; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative w-full max-w-sm rounded-2xl p-6 shadow-2xl" style={{ backgroundColor: '#162d55', border: '1px solid #243f72' }}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(239,68,68,0.15)' }}>
            <Trash2 size={18} className="text-red-400" />
          </div>
          <div>
            <h3 className="font-bold text-white">Eliminar platillo</h3>
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>Esta acción no se puede deshacer</p>
          </div>
        </div>
        <p className="text-sm mb-6" style={{ color: 'rgba(255,255,255,0.75)' }}>
          ¿Estás seguro de que deseas eliminar <span className="font-semibold text-white">"{dish.name}"</span>?
        </p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 py-2.5 rounded-xl text-sm font-semibold" style={{ backgroundColor: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.7)' }}>Cancelar</button>
          <button onClick={onConfirm} className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-red-600 hover:bg-red-500 text-white">Eliminar</button>
        </div>
      </div>
    </div>
  );
}

// ─── Recipe Modal ─────────────────────────────────────────────────────────────

function RecipeModal({ dish, onClose, onPriceUpdate }: { dish: Dish; onClose: () => void; onPriceUpdate: (dishId: string, newPrice: number) => void }) {
  const supabase = createClient();
  const { log: auditLog } = useAudit();
  const [recipe, setRecipe] = useState<RecipeItem[]>([]);
  const [allIngredients, setAllIngredients] = useState<Ingredient[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedIngId, setSelectedIngId] = useState('');
  const [addQty, setAddQty] = useState<number>(0);
  const [addNotes, setAddNotes] = useState('');
  const [simulatorPrice, setSimulatorPrice] = useState<number>(dish.price);
  const [laborCost, setLaborCost]       = useState<number>(0);
  const [overheadCost, setOverheadCost]   = useState<number>(0);
  const [overheadPct, setOverheadPct]     = useState<number>(35);
  const [costConfigLoaded, setCostConfigLoaded] = useState(false);

  const fetchRecipe = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('dish_recipes')
      .select('*, ingredients(name, unit, cost)')
      .eq('dish_id', dish.id)
      .order('created_at');
    if (data) {
      setRecipe(data.map((r: any) => ({
        id: r.id,
        ingredientId: r.ingredient_id,
        ingredientName: r.ingredients?.name ?? '',
        isRequired: Boolean(r.is_required),
        quantity: Number(r.quantity),
        unit: r.unit || r.ingredients?.unit || '',
        notes: r.notes ?? '',
        costPerUnit: Number(r.ingredients?.cost ?? 0),
      })));
    }
    setLoading(false);
  }, [dish.id]);

  // Load labor + overhead costs from pre-calculated view
  const fetchCostBreakdown = useCallback(async () => {
    const { data } = await supabase
      .from('v_dish_cost_summary')
      .select('labor_cost, overhead_cost, overhead_pct, ingredient_cost')
      .eq('dish_id', dish.id)
      .single();
    if (data) {
      setLaborCost(Number((data as any).labor_cost ?? 0));
      setOverheadPct(Number((data as any).overhead_pct ?? 35));
      // Overhead recalculated dynamically from current simulatorPrice below
    }
    setCostConfigLoaded(true);
  }, [dish.id, supabase]);

  useEffect(() => {
    fetchRecipe();
    fetchCostBreakdown();
    supabase.from('ingredients').select('id, name, unit, category, cost').eq('tenant_id', getTenantId()).order('name').then(({ data }) => {
      if (data) setAllIngredients(data.map((i: any) => ({ id: i.id, name: i.name, unit: i.unit, category: i.category, cost: Number(i.cost ?? 0) })));
    });
  }, [fetchRecipe]);

  const selectedIng = allIngredients.find((i) => i.id === selectedIngId);

  // Cost calculations
  const totalCost = recipe.reduce((sum, item) => {
    const costPerUnit = (item as any).costPerUnit ?? 0;
    return sum + costPerUnit * item.quantity;
  }, 0);

  const primeCost  = totalCost + laborCost;                           // food + MO directa
  const dynamicOverhead = simulatorPrice > 0 ? simulatorPrice * (overheadPct / 100) : overheadCost;
  const totalRealCost = primeCost + dynamicOverhead;                 // costo total real
  const currentMargin = simulatorPrice > 0 ? ((simulatorPrice - totalCost) / simulatorPrice) * 100 : 0;
  const realMargin    = simulatorPrice > 0 ? ((simulatorPrice - totalRealCost) / simulatorPrice) * 100 : 0;
  const currentProfit = simulatorPrice - totalCost;
  const realProfit    = simulatorPrice - totalRealCost;
  const foodCostPct   = simulatorPrice > 0 ? (totalCost / simulatorPrice) * 100 : 0;
  const primeCostPct  = simulatorPrice > 0 ? (primeCost / simulatorPrice) * 100 : 0;

  const handleApplyPrice = async () => {
    if (simulatorPrice <= 0) return;
    try {
      const supabase = (await import('@/lib/supabase/client')).createClient();
      const { error } = await supabase
        .from('dishes')
        .update({ price: simulatorPrice, updated_at: new Date().toISOString() })
        .eq('id', dish.id);
      if (error) throw error;
      await auditLog({
        action: 'precio_cambiado', entity: 'dishes', entityId: dish.id,
        entityName: dish.name,
        oldValue: { price: dish.price },
        newValue: { price: simulatorPrice },
        details: `Precio cambiado de $${dish.price.toFixed(2)} a $${simulatorPrice.toFixed(2)}`,
      });
      onPriceUpdate(dish.id, simulatorPrice);
      alert(`Precio de ${dish.name} actualizado a $${simulatorPrice.toFixed(2)} en el menú.`);
    } catch (err: any) {
      alert('Error al actualizar precio: ' + (err?.message ?? 'Intenta de nuevo'));
    }
  };

  const getMarginColor = (pct: number) => {
    if (pct >= 65) return '#34d399';
    if (pct >= 45) return '#f59e0b';
    return '#f87171';
  };
  const getMarginLabel = (pct: number) => {
    if (pct >= 65) return 'Excelente';
    if (pct >= 45) return 'Aceptable';
    if (pct >= 25) return 'Bajo';
    return 'Crítico';
  };

  // Suggested prices: solve for price that gives target REAL margin
  // Formula: price = primeCost / (1 - overheadPct/100 - targetMargin/100)
  // This ensures overhead % and margin % are both respected
  function priceForRealMargin(targetMarginPct: number): number {
    const denominator = 1 - (overheadPct / 100) - (targetMarginPct / 100);
    if (denominator <= 0) return 0;
    return Math.ceil(primeCost / denominator);
  }
  const suggestedPrices = [
    { label: '15% margen real', targetMargin: 15, color: '#f59e0b' },
    { label: '25% margen real', targetMargin: 25, color: '#34d399' },
    { label: '35% margen real', targetMargin: 35, color: '#22c55e' },
  ];

  const handleAddIngredient = async () => {
    if (!selectedIngId || addQty <= 0) return;
    const already = recipe.find((r) => r.ingredientId === selectedIngId);
    if (already) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('dish_recipes').insert({ tenant_id: getTenantId(),
        dish_id: dish.id,
        ingredient_id: selectedIngId,
        quantity: addQty,
        unit: selectedIng?.unit ?? '',
        notes: addNotes,
      });
      if (error) throw error;
      setSelectedIngId('');
      setAddQty(0);
      setAddNotes('');
      await fetchRecipe();
    } catch (err: any) {
      // toast not available inside RecipeModal scope — use alert as fallback
      alert('Error al agregar ingrediente: ' + (err?.message ?? 'Intenta de nuevo'));
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateQty = async (recipeId: string, qty: number) => {
    if (qty <= 0) return;
    const { error } = await supabase.from('dish_recipes').update({ quantity: qty, updated_at: new Date().toISOString() }).eq('id', recipeId);
    if (error) { alert('Error al actualizar cantidad: ' + error.message); return; }
    setRecipe((prev) => prev.map((r) => r.id === recipeId ? { ...r, quantity: qty } : r));
  };

  const handleToggleRequired = async (recipeId: string, current: boolean) => {
    const { error } = await supabase.from('dish_recipes')
      .update({ is_required: !current })
      .eq('id', recipeId);
    if (error) { alert('Error al actualizar ingrediente: ' + error.message); return; }
    setRecipe(prev => prev.map(r => r.id === recipeId ? { ...r, isRequired: !current } : r));
  };

  const handleRemove = async (recipeId: string, isRequired: boolean) => {
    if (isRequired) {
      alert('Este ingrediente es requerido y no se puede eliminar de la receta. Primero desmárcalo como requerido.');
      return;
    }
    const { error } = await supabase.from('dish_recipes').delete().eq('id', recipeId);
    if (error) { alert('Error al eliminar ingrediente: ' + error.message); return; }
    setRecipe((prev) => prev.filter((r) => r.id !== recipeId));
  };

  const availableIngredients = allIngredients.filter((i) => !recipe.find((r) => r.ingredientId === i.id));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[92vh]" style={{ backgroundColor: '#162d55', border: '1px solid #243f72' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0" style={{ borderColor: '#243f72' }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'rgba(245,158,11,0.15)' }}>
              <FlaskConical size={18} style={{ color: '#f59e0b' }} />
            </div>
            <div>
              <h2 className="font-bold text-white text-base">Receta & Costos: {dish.name}</h2>
              <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.45)' }}>Ingredientes, porciones y simulador de precio</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/10" style={{ color: 'rgba(255,255,255,0.5)' }}>
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Add ingredient row */}
          <div className="rounded-xl p-4 space-y-3" style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'rgba(255,255,255,0.5)' }}>Agregar ingrediente a la receta</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs mb-1" style={{ color: 'rgba(255,255,255,0.5)' }}>Ingrediente</label>
                <div className="relative">
                  <select
                    value={selectedIngId}
                    onChange={(e) => { setSelectedIngId(e.target.value); setAddQty(0); }}
                    className="w-full px-3 py-2 rounded-lg text-sm outline-none appearance-none"
                    style={{ backgroundColor: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', color: 'white' }}
                  >
                    <option value="" style={{ backgroundColor: '#162d55' }}>— Seleccionar —</option>
                    {availableIngredients.map((i) => (
                      <option key={i.id} value={i.id} style={{ backgroundColor: '#162d55' }}>{i.name} ({i.unit}) — ${i.cost.toFixed(2)}/{i.unit}</option>
                    ))}
                  </select>
                  <ChevronDown size={13} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'rgba(255,255,255,0.4)' }} />
                </div>
              </div>
              <div>
                <label className="block text-xs mb-1" style={{ color: 'rgba(255,255,255,0.5)' }}>
                  Cantidad {selectedIng ? `(${selectedIng.unit})` : ''}
                  {selectedIng && addQty > 0 && (
                    <span className="ml-2" style={{ color: '#f59e0b' }}>= ${(selectedIng.cost * addQty).toFixed(2)}</span>
                  )}
                </label>
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={addQty || ''}
                  onChange={(e) => setAddQty(parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                  style={{ backgroundColor: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', color: 'white' }}
                />
              </div>
            </div>
            <div>
              <label className="block text-xs mb-1" style={{ color: 'rgba(255,255,255,0.5)' }}>Notas (opcional)</label>
              <input
                type="text"
                value={addNotes}
                onChange={(e) => setAddNotes(e.target.value)}
                placeholder="Ej. finamente picado, sin semillas..."
                className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                style={{ backgroundColor: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', color: 'white' }}
              />
            </div>
            <button
              onClick={handleAddIngredient}
              disabled={!selectedIngId || addQty <= 0 || saving}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all disabled:opacity-40"
              style={{ backgroundColor: '#f59e0b', color: '#1B3A6B' }}
            >
              <Plus size={14} />
              {saving ? 'Guardando...' : 'Agregar a receta'}
            </button>
          </div>

          {/* Recipe list */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: 'rgba(255,255,255,0.5)' }}>
              Ingredientes de la receta ({recipe.length})
            </p>
            {loading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-12 rounded-xl animate-pulse" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }} />
                ))}
              </div>
            ) : recipe.length === 0 ? (
              <div className="rounded-xl py-10 flex flex-col items-center gap-2" style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '2px dashed rgba(255,255,255,0.1)' }}>
                <FlaskConical size={24} style={{ color: 'rgba(255,255,255,0.2)' }} />
                <p className="text-sm" style={{ color: 'rgba(255,255,255,0.35)' }}>Sin ingredientes en la receta</p>
                <p className="text-xs" style={{ color: 'rgba(255,255,255,0.2)' }}>Agrega ingredientes para calcular el costo del platillo</p>
              </div>
            ) : (
              <div className="space-y-2">
                {recipe.map((item) => {
                  const itemCost = ((item as any).costPerUnit ?? 0) * item.quantity;
                  return (
                    <div key={item.id} className="flex items-center gap-3 px-4 py-3 rounded-xl" style={{ backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white truncate">{item.ingredientName}</p>
                        {item.notes && <p className="text-xs mt-0.5 truncate" style={{ color: 'rgba(255,255,255,0.4)' }}>{item.notes}</p>}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => item.id && handleUpdateQty(item.id, Math.max(0.01, item.quantity - 0.1))}
                          className="w-6 h-6 rounded flex items-center justify-center hover:bg-white/10"
                          style={{ color: 'rgba(255,255,255,0.5)' }}
                        >
                          <Minus size={11} />
                        </button>
                        <input
                          type="number"
                          min={0.01}
                          step={0.01}
                          value={item.quantity}
                          onChange={(e) => {
                            const v = parseFloat(e.target.value) || 0;
                            setRecipe((prev) => prev.map((r) => r.id === item.id ? { ...r, quantity: v } : r));
                          }}
                          onBlur={(e) => item.id && handleUpdateQty(item.id, parseFloat(e.target.value) || 0)}
                          className="w-16 text-center text-sm rounded-lg px-1 py-1 outline-none"
                          style={{ backgroundColor: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', color: 'white' }}
                        />
                        <button
                          onClick={() => item.id && handleUpdateQty(item.id, item.quantity + 0.1)}
                          className="w-6 h-6 rounded flex items-center justify-center hover:bg-white/10"
                          style={{ color: 'rgba(255,255,255,0.5)' }}
                        >
                          <Plus size={11} />
                        </button>
                        <span className="text-xs w-8 text-center" style={{ color: 'rgba(255,255,255,0.5)' }}>{item.unit}</span>
                      </div>
                      {/* Cost per line */}
                      <div className="text-right flex-shrink-0 w-16">
                        <p className="text-xs font-semibold" style={{ color: '#f59e0b' }}>${itemCost.toFixed(2)}</p>
                        <p className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>${((item as any).costPerUnit ?? 0).toFixed(2)}/{item.unit}</p>
                      </div>
                      {/* Required toggle */}
                      <button
                        onClick={() => item.id && handleToggleRequired(item.id, item.isRequired)}
                        title={item.isRequired ? 'Ingrediente requerido — toca para desmarcar' : 'Marcar como requerido (no se puede quitar en el pedido)'}
                        className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ background: item.isRequired ? 'rgba(245,158,11,0.15)' : 'transparent', color: item.isRequired ? '#f59e0b' : 'rgba(255,255,255,0.2)', border: item.isRequired ? '1px solid rgba(245,158,11,0.3)' : '1px solid transparent' }}
                      >
                        <Lock size={11} />
                      </button>
                      {/* Remove */}
                      <button
                        onClick={() => item.id && handleRemove(item.id, item.isRequired)}
                        className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-red-500/20 flex-shrink-0"
                        style={{ color: item.isRequired ? 'rgba(239,68,68,0.2)' : 'rgba(239,68,68,0.6)' }}
                        title={item.isRequired ? 'No se puede eliminar un ingrediente requerido' : 'Eliminar ingrediente'}
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── Cost Summary & Price Simulator ── */}
          {recipe.length > 0 && (
            <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(245,158,11,0.25)' }}>

              {/* ── Bloque 1: Resumen de Costos ── */}
              <div className="px-5 pt-4 pb-3" style={{ backgroundColor: 'rgba(255,255,255,0.03)' }}>
                <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: 'rgba(255,255,255,0.4)' }}>¿Cuánto te cuesta hacerlo?</p>

                {/* Costo de ingredientes — siempre visible */}
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-sm font-semibold text-white">🥩 Ingredientes</p>
                    <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>Materias primas de la receta</p>
                  </div>
                  <p className="text-lg font-bold font-mono" style={{ color: '#f87171' }}>${totalCost.toFixed(2)}</p>
                </div>

                {/* Breakdown de ingredientes colapsable */}
                <div className="space-y-1 mb-3 pl-2 border-l" style={{ borderColor: 'rgba(248,113,113,0.3)' }}>
                  {recipe.map((item) => {
                    const itemCost = ((item as any).costPerUnit ?? 0) * item.quantity;
                    const pct = totalCost > 0 ? (itemCost / totalCost) * 100 : 0;
                    return (
                      <div key={item.id} className="flex items-center gap-2">
                        <span className="text-xs flex-1 truncate" style={{ color: 'rgba(255,255,255,0.5)' }}>{item.ingredientName}</span>
                        <div className="w-16 h-1 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}>
                          <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: 'rgba(248,113,113,0.7)' }} />
                        </div>
                        <span className="text-xs font-mono w-12 text-right" style={{ color: 'rgba(255,255,255,0.45)' }}>${itemCost.toFixed(2)}</span>
                      </div>
                    );
                  })}
                </div>

                {/* MO Directa */}
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-sm font-semibold text-white">👨‍🍳 Mano de Obra</p>
                    <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>Cocinero · {(dish as any).preparationTimeMin ?? 15} min de preparación</p>
                  </div>
                  <p className="text-lg font-bold font-mono" style={{ color: '#fb923c' }}>
                    {costConfigLoaded ? `$${laborCost.toFixed(2)}` : '…'}
                  </p>
                </div>

                {/* Divisor Prime Cost */}
                <div className="flex items-center justify-between py-2 px-3 rounded-lg mb-2" style={{ backgroundColor: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}>
                  <p className="text-sm font-bold" style={{ color: '#f59e0b' }}>Costo directo total</p>
                  <p className="text-base font-bold font-mono" style={{ color: '#f59e0b' }}>${primeCost.toFixed(2)}</p>
                </div>

                {/* Gastos indirectos */}
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-sm font-semibold text-white">🏠 Gastos del negocio</p>
                    <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>Renta, servicios, marketing · {overheadPct.toFixed(0)}% del precio de venta</p>
                  </div>
                  <p className="text-lg font-bold font-mono" style={{ color: '#a78bfa' }}>
                    {costConfigLoaded ? `$${dynamicOverhead.toFixed(2)}` : '…'}
                  </p>
                </div>

                {/* Costo Real Total — destacado */}
                <div className="flex items-center justify-between px-4 py-3 rounded-xl" style={{ backgroundColor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)' }}>
                  <div>
                    <p className="text-base font-bold text-white">Costo real total</p>
                    <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>Lo mínimo que debes cobrar para no perder</p>
                  </div>
                  <p className="text-2xl font-bold font-mono text-white">${totalRealCost.toFixed(2)}</p>
                </div>
              </div>

              {/* ── Bloque 2: Simulador de Precio ── */}
              <div className="px-5 pt-4 pb-5 border-t space-y-5" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
                <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.4)' }}>¿A cuánto lo vendes?</p>

                {/* Precio selector */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>Precio de venta</span>
                    <div className="flex items-center gap-1">
                      <span className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>$</span>
                      <input
                        type="number" min={0} step={1}
                        value={simulatorPrice || ''}
                        onChange={(e) => setSimulatorPrice(parseFloat(e.target.value) || 0)}
                        className="w-24 text-right px-2 py-1.5 rounded-lg text-lg font-bold outline-none"
                        style={{ backgroundColor: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: 'white' }}
                      />
                    </div>
                  </div>
                  <input
                    type="range"
                    min={totalRealCost > 0 ? Math.round(totalRealCost) : 0}
                    max={Math.max(totalRealCost * 4, dish.price * 2, 300)}
                    step={1}
                    value={simulatorPrice}
                    onChange={(e) => setSimulatorPrice(parseFloat(e.target.value))}
                    className="w-full h-2 rounded-full appearance-none cursor-pointer"
                    style={{ accentColor: realMargin >= 20 ? '#22c55e' : realMargin >= 10 ? '#f59e0b' : '#ef4444' }}
                  />
                </div>

                {/* Resultado principal — Lo que se lleva */}
                <div className="rounded-xl px-4 py-4" style={{
                  backgroundColor: realMargin >= 20 ? 'rgba(34,197,94,0.1)' : realMargin >= 10 ? 'rgba(245,158,11,0.1)' : 'rgba(239,68,68,0.1)',
                  border: `1px solid ${realMargin >= 20 ? 'rgba(34,197,94,0.3)' : realMargin >= 10 ? 'rgba(245,158,11,0.3)' : 'rgba(239,68,68,0.3)'}`
                }}>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-bold" style={{ color: realMargin >= 20 ? '#22c55e' : realMargin >= 10 ? '#f59e0b' : '#ef4444' }}>
                      {realMargin >= 20 ? '✅ Buen precio' : realMargin >= 10 ? '⚠️ Margen ajustado' : realMargin >= 0 ? '🔴 Margen muy bajo' : '❌ Perdiendo dinero'}
                    </p>
                    <p className="text-2xl font-bold font-mono" style={{ color: realMargin >= 20 ? '#22c55e' : realMargin >= 10 ? '#f59e0b' : '#ef4444' }}>
                      {realMargin.toFixed(1)}%
                    </p>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span style={{ color: 'rgba(255,255,255,0.5)' }}>Te quedas de ganancia:</span>
                    <span className="font-bold font-mono text-white">${realProfit.toFixed(2)} por platillo</span>
                  </div>
                  {/* Visual bar */}
                  <div className="mt-3">
                    <div className="w-full h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}>
                      <div className="h-full rounded-full transition-all duration-300"
                        style={{
                          width: `${Math.min(Math.max(realMargin, 0), 100)}%`,
                          backgroundColor: realMargin >= 20 ? '#22c55e' : realMargin >= 10 ? '#f59e0b' : '#ef4444'
                        }} />
                    </div>
                    <div className="flex justify-between mt-1 text-xs" style={{ color: 'rgba(255,255,255,0.2)' }}>
                      <span>0%</span><span>10%</span><span>20%</span><span>35%</span><span>50%+</span>
                    </div>
                  </div>
                </div>

                {/* Desglose de hacia dónde va cada peso */}
                {simulatorPrice > 0 && (
                  <div>
                    <p className="text-xs font-semibold mb-2" style={{ color: 'rgba(255,255,255,0.4)' }}>De cada ${simulatorPrice.toFixed(0)} que cobras:</p>
                    <div className="space-y-1.5">
                      {[
                        { label: 'Ingredientes', amount: totalCost, pct: foodCostPct, color: '#f87171' },
                        { label: 'Mano de obra', amount: laborCost, pct: simulatorPrice > 0 ? (laborCost/simulatorPrice)*100 : 0, color: '#fb923c' },
                        { label: 'Gastos del negocio', amount: dynamicOverhead, pct: overheadPct, color: '#a78bfa' },
                        { label: 'Tu ganancia', amount: realProfit, pct: realMargin, color: realMargin >= 0 ? '#22c55e' : '#ef4444' },
                      ].map(row => (
                        <div key={row.label} className="flex items-center gap-3">
                          <span className="text-xs w-32 flex-shrink-0" style={{ color: 'rgba(255,255,255,0.6)' }}>{row.label}</span>
                          <div className="flex-1 h-3 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}>
                            <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(Math.max(row.pct, 0), 100)}%`, backgroundColor: row.color }} />
                          </div>
                          <span className="text-xs font-mono w-10 text-right" style={{ color: row.color }}>{Math.max(row.pct, 0).toFixed(0)}%</span>
                          <span className="text-xs font-mono w-14 text-right" style={{ color: 'rgba(255,255,255,0.5)' }}>${Math.max(row.amount, 0).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Precios sugeridos */}
                {primeCost > 0 && (
                  <div>
                    <p className="text-xs font-semibold mb-2" style={{ color: 'rgba(255,255,255,0.4)' }}>Precios recomendados:</p>
                    <div className="grid grid-cols-3 gap-2">
                      {suggestedPrices.map((s) => {
                        const price = priceForRealMargin(s.targetMargin);
                        if (price <= 0) return null;
                        return (
                          <button
                            key={s.label}
                            onClick={() => setSimulatorPrice(price)}
                            className="flex flex-col items-center py-2.5 px-2 rounded-xl text-center transition-all hover:brightness-110"
                            style={{ backgroundColor: `${s.color}18`, border: `1px solid ${s.color}40` }}
                          >
                            <span className="text-base font-bold font-mono" style={{ color: s.color }}>${price}</span>
                            <span className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.5)' }}>{s.targetMargin}% ganancia</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Precio actual vs recomendado */}
                {dish.price > 0 && totalRealCost > 0 && (
                  <div className="rounded-xl px-4 py-3" style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>Precio actual en menú</p>
                        <p className="text-lg font-bold font-mono text-white">${dish.price.toFixed(2)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>Ganancia real actual</p>
                        {(() => {
                          const currentOverhead = dish.price * (overheadPct / 100);
                          const currentRealCost = primeCost + currentOverhead;
                          const currentRealMargin = ((dish.price - currentRealCost) / dish.price) * 100;
                          const currentRealProfit = dish.price - currentRealCost;
                          return (
                            <div>
                              <p className="text-lg font-bold font-mono" style={{ color: currentRealMargin >= 20 ? '#22c55e' : currentRealMargin >= 10 ? '#f59e0b' : '#ef4444' }}>
                                {currentRealMargin.toFixed(1)}% · ${currentRealProfit.toFixed(2)}
                              </p>
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-3 px-6 py-4 border-t flex-shrink-0" style={{ borderColor: '#243f72' }}>
          <p className="text-xs flex-1 self-center" style={{ color: 'rgba(255,255,255,0.35)' }}>
            Costo real = ingredientes + mano de obra directa (salario cocineros ÷ tiempo prep) + gastos indirectos prorateados. Configurable en Parámetros de Operación.
          </p>
          {simulatorPrice !== dish.price && simulatorPrice > 0 && (
            <button
              onClick={handleApplyPrice}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 transition-all hover:brightness-110"
              style={{ backgroundColor: '#22c55e', color: 'white' }}
            >
              ✓ Aplicar ${simulatorPrice.toFixed(2)} al menú
            </button>
          )}
          <button onClick={onClose} className="px-5 py-2.5 rounded-xl text-sm font-semibold" style={{ backgroundColor: '#f59e0b', color: '#1B3A6B' }}>
            Listo
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Dish Form Modal ──────────────────────────────────────────────────────────


// ─── Inline Recipe Editor (wizard step 2) ────────────────────────────────────
function InlineRecipeEditor({ dish, onFinish }: { dish: Dish; onFinish: (finalPrice: number) => void }) {
  const supabase = createClient();
  const [recipe, setRecipe] = useState<RecipeItem[]>([]);
  const [allIngredients, setAllIngredients] = useState<{ id: string; name: string; unit: string; category: string; cost: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedIngId, setSelectedIngId] = useState('');
  const [addQty, setAddQty] = useState(0);
  const [ingSearch, setIngSearch] = useState('');
  const [ingDropOpen, setIngDropOpen] = useState(false);
  const [finalPrice, setFinalPrice] = useState(dish.price || 0);
  const [targetMargin, setTargetMargin] = useState(65); // % default target

  useEffect(() => {
    supabase.from('ingredients').select('id, name, unit, category, cost').eq('tenant_id', getTenantId()).order('name').then(({ data }) => {
      if (data) setAllIngredients(data.map((i: any) => ({ id: i.id, name: i.name, unit: i.unit, category: i.category, cost: Number(i.cost ?? 0) })));
      setLoading(false);
    });
  }, []);

  const totalIngCost = recipe.reduce((s, r) => s + (r.costPerUnit ?? 0) * r.quantity, 0);
  // Suggested price based on target margin: price = cost / (1 - margin%)
  const suggestedPrice = totalIngCost > 0 ? Math.ceil(totalIngCost / (1 - targetMargin / 100)) : 0;
  const actualMargin = finalPrice > 0 ? ((finalPrice - totalIngCost) / finalPrice) * 100 : 0;
  const selectedIng = allIngredients.find(i => i.id === selectedIngId);
  const availableIngs = allIngredients.filter(i => !recipe.find(r => r.ingredientId === i.id));
  const filteredIngs = availableIngs.filter(i =>
    i.name.toLowerCase().includes(ingSearch.toLowerCase()) ||
    i.category.toLowerCase().includes(ingSearch.toLowerCase())
  );

  const handleAdd = async () => {
    if (!selectedIngId || addQty <= 0) return;
    setSaving(true);
    const { error } = await supabase.from('dish_recipes').insert({ tenant_id: getTenantId(),
      dish_id: dish.id, ingredient_id: selectedIngId, quantity: addQty, unit: selectedIng?.unit ?? '', notes: '',
    });
    if (!error) {
      setRecipe(prev => [...prev, {
        id: Date.now().toString(), ingredientId: selectedIngId,
        ingredientName: selectedIng?.name ?? '', isRequired: false,
        quantity: addQty, unit: selectedIng?.unit ?? '',
        notes: '', costPerUnit: selectedIng?.cost ?? 0,
      }]);
      setSelectedIngId(''); setAddQty(0); setIngSearch(''); setIngDropOpen(false);
    }
    setSaving(false);
  };

  const handleRemove = async (recipeId: string) => {
    await supabase.from('dish_recipes').delete().eq('id', recipeId);
    setRecipe(prev => prev.filter(r => r.id !== recipeId));
  };

  const marginColor = actualMargin >= 65 ? '#4ade80' : actualMargin >= 50 ? '#f59e0b' : '#f87171';

  if (loading) return <div style={{ padding: '32px', textAlign: 'center', color: 'rgba(255,255,255,0.4)' }}>Cargando...</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0, minHeight: '420px' }}>
        {/* LEFT: Add ingredients */}
        <div style={{ padding: '20px 24px', borderRight: '1px solid rgba(255,255,255,0.08)' }}>
          <p style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '14px' }}>Ingredientes de la receta</p>

          {/* Search + add */}
          <div style={{ marginBottom: '12px' }}>
            <div style={{ position: 'relative', marginBottom: '8px' }}>
              {selectedIngId && !ingDropOpen ? (
                <button onClick={() => { setIngDropOpen(true); setIngSearch(''); }}
                  style={{ width: '100%', padding: '9px 12px', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(245,158,11,0.4)', borderRadius: '10px', color: 'white', textAlign: 'left', fontSize: '13px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 500 }}>{selectedIng?.name}</span>
                  <span style={{ color: '#f59e0b', fontSize: '11px' }}>cambiar ✎</span>
                </button>
              ) : (
                <>
                  <input type="text" placeholder="🔍 Buscar ingrediente..." value={ingSearch}
                    onChange={e => { setIngSearch(e.target.value); setIngDropOpen(true); }}
                    onFocus={() => setIngDropOpen(true)}
                    style={{ width: '100%', padding: '9px 12px', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '10px', color: 'white', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }} />
                  {ingDropOpen && (
                    <div style={{ position: 'absolute', left: 0, right: 0, zIndex: 100, maxHeight: '200px', overflowY: 'auto', background: '#0d1d38', border: '1px solid #243f72', borderRadius: '10px', marginTop: '4px', boxShadow: '0 12px 32px rgba(0,0,0,0.6)' }}>
                      {filteredIngs.slice(0, 20).map(i => (
                        <button key={i.id} onClick={() => { setSelectedIngId(i.id); setIngDropOpen(false); setIngSearch(''); }}
                          style={{ width: '100%', padding: '9px 14px', textAlign: 'left', border: 'none', background: 'none', color: 'white', cursor: 'pointer', fontSize: '13px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span>{i.name} <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: '11px' }}>({i.category})</span></span>
                          <span style={{ color: '#f59e0b', fontSize: '12px', fontFamily: 'monospace' }}>${i.cost.toFixed(2)}/{i.unit}</span>
                        </button>
                      ))}
                      {filteredIngs.length === 0 && <p style={{ padding: '12px', color: 'rgba(255,255,255,0.35)', fontSize: '12px', textAlign: 'center' }}>Sin resultados</p>}
                    </div>
                  )}
                </>
              )}
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: '4px' }}>
                  Cantidad {selectedIng ? `(${selectedIng.unit})` : ''}
                  {selectedIng && addQty > 0 && <span style={{ color: '#f59e0b', marginLeft: '6px' }}> = ${(selectedIng.cost * addQty).toFixed(2)}</span>}
                </label>
                <input type="number" min={0} step={0.01} value={addQty || ''} onChange={e => setAddQty(parseFloat(e.target.value) || 0)}
                  placeholder="0.00" style={{ width: '100%', padding: '8px 10px', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '9px', color: 'white', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <button onClick={handleAdd} disabled={saving || !selectedIngId || addQty <= 0}
                style={{ padding: '8px 16px', borderRadius: '9px', border: 'none', background: selectedIngId && addQty > 0 ? '#f59e0b' : 'rgba(255,255,255,0.08)', color: selectedIngId && addQty > 0 ? '#1B3A6B' : 'rgba(255,255,255,0.25)', fontSize: '13px', fontWeight: 700, cursor: 'pointer', flexShrink: 0, whiteSpace: 'nowrap' }}>
                + Agregar
              </button>
            </div>
          </div>

          {/* Recipe list */}
          {recipe.length === 0 ? (
            <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: '13px', textAlign: 'center', padding: '24px 0' }}>
              Sin ingredientes. Agrégalos para calcular el costo y precio sugerido.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '220px', overflowY: 'auto' }}>
              {recipe.map(r => (
                <div key={r.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', background: 'rgba(255,255,255,0.04)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <div>
                    <span style={{ color: 'white', fontSize: '13px', fontWeight: 500 }}>{r.ingredientName}</span>
                    <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px', marginLeft: '8px' }}>{r.quantity} {r.unit}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ color: '#f87171', fontSize: '12px', fontFamily: 'monospace', fontWeight: 600 }}>
                      ${((r.costPerUnit ?? 0) * r.quantity).toFixed(2)}
                    </span>
                    <button onClick={() => handleRemove(r.id)} style={{ background: 'none', border: 'none', color: 'rgba(239,68,68,0.5)', cursor: 'pointer', fontSize: '14px', padding: '2px 4px' }}>✕</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* RIGHT: Cost summary + price calculator */}
        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <p style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '-4px' }}>Costo y precio sugerido</p>

          {/* Cost breakdown */}
          <div style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)', borderRadius: '10px', padding: '14px' }}>
            <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginBottom: '6px' }}>Costo total de ingredientes</p>
            <p style={{ fontSize: '28px', fontWeight: 700, color: '#f87171', fontFamily: 'monospace' }}>
              ${totalIngCost.toFixed(2)}
            </p>
            {recipe.length > 0 && <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', marginTop: '4px' }}>{recipe.length} ingrediente{recipe.length !== 1 ? 's' : ''}</p>}
          </div>

          {/* Target margin slider */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
              <label style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>Margen objetivo</label>
              <span style={{ fontSize: '14px', fontWeight: 700, color: '#f59e0b' }}>{targetMargin}%</span>
            </div>
            <input type="range" min={20} max={85} step={5} value={targetMargin} onChange={e => setTargetMargin(Number(e.target.value))}
              style={{ width: '100%', accentColor: '#f59e0b' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'rgba(255,255,255,0.25)', marginTop: '2px' }}>
              <span>20% (bajo)</span><span>65% (ideal)</span><span>85% (premium)</span>
            </div>
          </div>

          {/* Suggested price */}
          {suggestedPrice > 0 && (
            <div style={{ background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.2)', borderRadius: '10px', padding: '12px 14px' }}>
              <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginBottom: '4px' }}>Precio sugerido ({targetMargin}% margen)</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <p style={{ fontSize: '22px', fontWeight: 700, color: '#4ade80', fontFamily: 'monospace' }}>${suggestedPrice}</p>
                <button onClick={() => setFinalPrice(suggestedPrice)}
                  style={{ padding: '4px 10px', borderRadius: '7px', border: 'none', background: 'rgba(74,222,128,0.15)', color: '#4ade80', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}>
                  Usar este
                </button>
              </div>
            </div>
          )}

          {/* Final price input */}
          <div>
            <label style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', fontWeight: 600, display: 'block', marginBottom: '6px' }}>Precio final del platillo ($) *</label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.35)', fontSize: '15px' }}>$</span>
              <input type="number" min={0} step={0.5} value={finalPrice || ''} onChange={e => setFinalPrice(parseFloat(e.target.value) || 0)} placeholder="0.00"
                style={{ width: '100%', padding: '11px 12px 11px 26px', background: 'rgba(255,255,255,0.07)', border: `1.5px solid ${finalPrice > 0 ? 'rgba(245,158,11,0.5)' : 'rgba(255,255,255,0.12)'}`, borderRadius: '10px', color: 'white', fontSize: '20px', fontWeight: 700, outline: 'none', boxSizing: 'border-box' }} />
            </div>
            {finalPrice > 0 && totalIngCost > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', padding: '8px 12px', background: 'rgba(255,255,255,0.04)', borderRadius: '8px' }}>
                <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>Margen bruto real</span>
                <span style={{ fontSize: '14px', fontWeight: 700, color: marginColor }}>{actualMargin.toFixed(1)}%</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{ display: 'flex', gap: '12px', padding: '16px 24px', borderTop: '1px solid rgba(255,255,255,0.08)', flexShrink: 0 }}>
        <button onClick={() => onFinish(0)} style={{ padding: '10px 20px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.12)', background: 'transparent', color: 'rgba(255,255,255,0.5)', fontSize: '13px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
          Sin precio ahora
        </button>
        <button onClick={() => onFinish(finalPrice)} disabled={finalPrice <= 0}
          style={{ flex: 1, padding: '12px', borderRadius: '10px', border: 'none', background: finalPrice > 0 ? '#10b981' : 'rgba(255,255,255,0.08)', color: finalPrice > 0 ? 'white' : 'rgba(255,255,255,0.25)', fontSize: '14px', fontWeight: 700, cursor: finalPrice > 0 ? 'pointer' : 'not-allowed' }}>
          ✓ Guardar platillo con precio ${finalPrice > 0 ? finalPrice.toFixed(2) : '—'}
          {finalPrice > 0 && actualMargin > 0 && <span style={{ opacity: 0.75, marginLeft: '8px', fontSize: '12px' }}>({actualMargin.toFixed(1)}% margen)</span>}
        </button>
      </div>
    </div>
  );
}


function DishFormModal({ dish, onSave, onClose }: { dish: Dish | null; onSave: (data: Omit<Dish, 'id'>) => void; onClose: () => void }) {
  const supabase = createClient();
  const isEdit = dish !== null;
  const [step, setStep] = useState<1|2>(1);
  const [savedDish, setSavedDish] = useState<Dish | null>(null);
  const [form, setForm] = useState<Omit<Dish, 'id'>>(
    dish ? { name: dish.name, description: dish.description, price: dish.price, category: dish.category, available: dish.available, image: dish.image, imageAlt: dish.imageAlt, emoji: dish.emoji, popular: dish.popular, preparationTimeMin: (dish as any).preparationTimeMin ?? 15 }
      : emptyForm()
  );
  const [errors, setErrors] = useState<Partial<Record<keyof Omit<Dish, 'id'>, string>>>({});
  const [imagePreview, setImagePreview] = useState<string | null>(dish?.image ?? null);
  const [savingStep1, setSavingStep1] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const set = <K extends keyof typeof form>(key: K, value: typeof form[K]) => {
    setForm(prev => ({ ...prev, [key]: value }));
    setErrors(prev => ({ ...prev, [key]: undefined }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result as string;
      setImagePreview(result);
      set('image', result);
    };
    reader.readAsDataURL(file);
  };

  const validate = () => {
    const errs: typeof errors = {};
    if (!form.name.trim()) errs.name = 'El nombre es requerido';
    if (!form.description.trim()) errs.description = 'La descripción es requerida';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleStep1 = async () => {
    if (!validate()) return;
    if (isEdit) { onSave(form); return; }
    setSavingStep1(true);
    try {
      const { data, error } = await supabase.from('dishes').insert({
        name: form.name, description: form.description,
        price: form.price || 0,
        category: form.category, available: form.available, image: form.image,
        image_alt: form.imageAlt, emoji: form.emoji, popular: form.popular,
        preparation_time_min: (form as any).preparationTimeMin ?? 15,
        tenant_id: getTenantId(),
      }).select().single();
      if (error) throw error;
      setSavedDish(data as Dish);
      setStep(2);
    } catch (err: any) {
      alert('Error al guardar: ' + (err?.message ?? 'Intenta de nuevo'));
    } finally { setSavingStep1(false); }
  };

  const handleFinish = async (finalPrice: number) => {
    if (savedDish) {
      await supabase.from('dishes').update({ price: finalPrice, updated_at: new Date().toISOString() }).eq('id', savedDish.id);
    }
    onSave({ ...form, price: finalPrice });
    onClose();
  };

  const EMOJI_OPTIONS = ['🍔','🌮','🍕','🍜','🥗','🍱','🥩','🍗','🐟','🦐','🍝','🥘','🫕','🍲','🥙','🌯','🍞','🧀','🥚','🥓','🍟','🌭','🍿','🧆','🫔','🥧','🍰','🎂','☕','🧃'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={step === 2 ? undefined : onClose} />
      <div className="relative w-full rounded-2xl shadow-2xl flex flex-col" style={{ backgroundColor: '#162d55', border: '1px solid #243f72', maxWidth: step === 2 ? '780px' : '520px', maxHeight: '92vh' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0" style={{ borderColor: '#243f72' }}>
          <div className="flex-1">
            <h2 className="font-bold text-white text-lg">
              {isEdit ? `Editar: ${dish?.name}` : step === 1 ? 'Nuevo platillo' : savedDish?.name}
            </h2>
            {!isEdit && (
              <div className="flex items-center gap-3 mt-1.5">
                {[{ n: 1, label: 'Información' }, { n: 2, label: 'Receta y precio' }].map((s, i) => (
                  <React.Fragment key={s.n}>
                    {i > 0 && <div className="w-6 h-px" style={{ backgroundColor: 'rgba(255,255,255,0.15)' }} />}
                    <div className="flex items-center gap-1.5">
                      <div className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                        style={{ backgroundColor: step >= s.n ? '#f59e0b' : 'rgba(255,255,255,0.1)', color: step >= s.n ? '#1B3A6B' : 'rgba(255,255,255,0.35)' }}>{s.n}</div>
                      <span className="text-xs" style={{ color: step === s.n ? '#f59e0b' : 'rgba(255,255,255,0.35)', fontWeight: step === s.n ? 600 : 400 }}>{s.label}</span>
                    </div>
                  </React.Fragment>
                ))}
              </div>
            )}
          </div>
          {step === 1 && (
            <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/10" style={{ color: 'rgba(255,255,255,0.4)' }}><X size={16} /></button>
          )}
        </div>

        {/* STEP 1: Dish info */}
        {step === 1 && (
          <>
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
              {/* Image */}
              <div className="relative w-full h-32 rounded-xl overflow-hidden flex items-center justify-center cursor-pointer group" style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '2px dashed rgba(255,255,255,0.12)' }} onClick={() => fileRef.current?.click()}>
                {imagePreview ? (
                  <><img src={imagePreview} alt="" className="w-full h-full object-cover" /><div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-2"><Upload size={16} className="text-white" /><span className="text-white text-sm">Cambiar</span></div></>
                ) : (
                  <div className="flex flex-col items-center gap-1.5" style={{ color: 'rgba(255,255,255,0.25)' }}>
                    <ImageOff size={24} /><span className="text-xs">Clic para subir imagen</span>
                  </div>
                )}
              </div>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageChange} />

              {/* Emoji picker */}
              <div>
                <label className="block text-xs font-semibold mb-2" style={{ color: 'rgba(255,255,255,0.5)' }}>Emoji del platillo</label>
                <div className="flex flex-wrap gap-1.5">
                  {EMOJI_OPTIONS.map(e => (
                    <button key={e} type="button" onClick={() => set('emoji', e)}
                      className="w-8 h-8 rounded-lg text-lg flex items-center justify-center transition-all"
                      style={{ backgroundColor: form.emoji === e ? 'rgba(245,158,11,0.2)' : 'rgba(255,255,255,0.05)', border: form.emoji === e ? '1.5px solid #f59e0b' : '1px solid rgba(255,255,255,0.08)' }}>
                      {e}
                    </button>
                  ))}
                </div>
              </div>

              {/* Name */}
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: 'rgba(255,255,255,0.6)' }}>Nombre del platillo <span className="text-red-400">*</span></label>
                <input type="text" value={form.name} onChange={e => set('name', e.target.value)} placeholder="Ej. Hamburguesa de Res" className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={{ backgroundColor: 'rgba(255,255,255,0.07)', border: errors.name ? '1px solid #f87171' : '1px solid rgba(255,255,255,0.12)', color: 'white' }} />
                {errors.name && <p className="text-xs text-red-400 mt-1">{errors.name}</p>}
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: 'rgba(255,255,255,0.6)' }}>Descripción <span className="text-red-400">*</span></label>
                <textarea value={form.description} onChange={e => set('description', e.target.value)} placeholder="Describe el platillo: ingredientes principales, preparación..." rows={2} className="w-full px-3 py-2.5 rounded-xl text-sm outline-none resize-none" style={{ backgroundColor: 'rgba(255,255,255,0.07)', border: errors.description ? '1px solid #f87171' : '1px solid rgba(255,255,255,0.12)', color: 'white' }} />
                {errors.description && <p className="text-xs text-red-400 mt-1">{errors.description}</p>}
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Category */}
                <div>
                  <label className="block text-xs font-semibold mb-1" style={{ color: 'rgba(255,255,255,0.6)' }}>Categoría</label>
                  <div className="relative">
                    <select value={form.category} onChange={e => set('category', e.target.value as Dish['category'])} className="w-full px-3 py-2.5 rounded-xl text-sm outline-none appearance-none" style={{ backgroundColor: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', color: 'white' }}>
                      {CATEGORIES.filter(c => c !== 'Todas').map(c => <option key={c} value={c} style={{ backgroundColor: '#162d55' }}>{c}</option>)}
                    </select>
                    <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'rgba(255,255,255,0.4)' }} />
                  </div>
                </div>
                {/* Prep time */}
                <div>
                  <label className="block text-xs font-semibold mb-1" style={{ color: 'rgba(255,255,255,0.6)' }}>⏱ Tiempo prep. (min)</label>
                  <input type="number" min={1} max={120} step={1} value={(form as any).preparationTimeMin ?? 15} onChange={e => set('preparationTimeMin' as any, parseInt(e.target.value) || 15)} className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={{ backgroundColor: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', color: 'white' }} />
                </div>
              </div>

              {/* Available toggle */}
              <button type="button" onClick={() => set('available', !form.available)} className="w-full flex items-center justify-between px-4 py-3 rounded-xl" style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div>
                  <p className="text-sm font-semibold text-white text-left">Disponible en menú</p>
                  <p className="text-xs text-left" style={{ color: 'rgba(255,255,255,0.4)' }}>Visible para los clientes</p>
                </div>
                {form.available ? <ToggleRight size={28} style={{ color: '#f59e0b' }} /> : <ToggleLeft size={28} style={{ color: 'rgba(255,255,255,0.25)' }} />}
              </button>

              {/* Popular toggle */}
              <button type="button" onClick={() => set('popular', !form.popular)} className="w-full flex items-center justify-between px-4 py-3 rounded-xl" style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div>
                  <p className="text-sm font-semibold text-white text-left">⭐ Platillo popular</p>
                  <p className="text-xs text-left" style={{ color: 'rgba(255,255,255,0.4)' }}>Aparece destacado en el menú</p>
                </div>
                {form.popular ? <ToggleRight size={28} style={{ color: '#f59e0b' }} /> : <ToggleLeft size={28} style={{ color: 'rgba(255,255,255,0.25)' }} />}
              </button>
            </div>
            <div className="flex gap-3 px-6 py-4 border-t flex-shrink-0" style={{ borderColor: '#243f72' }}>
              <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-xl text-sm font-semibold" style={{ backgroundColor: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.6)' }}>Cancelar</button>
              <button type="button" onClick={handleStep1} disabled={savingStep1} className="flex-1 py-2.5 rounded-xl text-sm font-bold disabled:opacity-50 flex items-center justify-center gap-2" style={{ backgroundColor: '#f59e0b', color: '#1B3A6B' }}>
                {savingStep1 ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Continuar → Agregar receta'}
              </button>
            </div>
          </>
        )}

        {/* STEP 2: Recipe + price */}
        {step === 2 && savedDish && (
          <div className="flex-1 overflow-y-auto">
            <InlineRecipeEditor dish={savedDish} onFinish={handleFinish} />
          </div>
        )}
      </div>
    </div>
  );
}


// ─── Dish Card ────────────────────────────────────────────────────────────────

function DishCard({ dish, recipeCount, onEdit, onDelete, onToggle, onRecipe }: {
  dish: Dish;
  recipeCount: number;
  onEdit: (d: Dish) => void;
  onDelete: (d: Dish) => void;
  onToggle: (id: string) => void | Promise<void>;
  onRecipe: (d: Dish) => void;
  [key: string]: unknown;
}) {
  return (
    <div className="rounded-2xl overflow-hidden flex flex-col transition-all duration-200 hover:translate-y-[-2px]" style={{ backgroundColor: '#162d55', border: '1px solid #243f72', opacity: dish.available ? 1 : 0.65 }}>
      <div className="relative h-36 flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'rgba(255,255,255,0.04)' }}>
        {dish.image ? (
          <img src={dish.image} alt={dish.imageAlt} className="w-full h-full object-cover" />
        ) : (
          <div className="flex flex-col items-center gap-1.5" style={{ color: 'rgba(255,255,255,0.2)' }}>
            <span className="text-4xl">{dish.emoji}</span>
          </div>
        )}
        <span className={`absolute top-2 left-2 text-xs px-2 py-0.5 rounded-full font-semibold ${CATEGORY_COLORS[dish.category]}`} style={{ fontSize: '10px' }}>{dish.category}</span>
        {recipeCount > 0 && (
          <span className="absolute top-2 right-2 text-xs px-2 py-0.5 rounded-full font-semibold" style={{ backgroundColor: 'rgba(16,185,129,0.2)', color: '#34d399', border: '1px solid rgba(16,185,129,0.3)', fontSize: '10px' }}>
            {recipeCount} ing.
          </span>
        )}
        {!dish.available && (
          <div className="absolute inset-0 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}>
            <span className="text-xs font-bold px-3 py-1 rounded-full" style={{ backgroundColor: 'rgba(239,68,68,0.85)', color: 'white' }}>No disponible</span>
          </div>
        )}
      </div>
      <div className="flex flex-col flex-1 p-4">
        <div className="flex items-start justify-between gap-2 mb-1.5">
          <h3 className="font-bold text-white text-sm leading-snug flex-1">{dish.name}</h3>
          <span className="font-bold flex-shrink-0" style={{ color: '#f59e0b', fontSize: '15px' }}>${dish.price.toFixed(0)}</span>
        </div>
        <p className="text-xs leading-relaxed flex-1 mb-3 line-clamp-2" style={{ color: 'rgba(255,255,255,0.5)' }}>{dish.description}</p>
        {/* Recipe button */}
        <button
          onClick={() => onRecipe(dish)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all mb-2 w-full justify-center"
          style={{ backgroundColor: recipeCount > 0 ? 'rgba(16,185,129,0.1)' : 'rgba(255,255,255,0.05)', color: recipeCount > 0 ? '#34d399' : 'rgba(255,255,255,0.4)', border: recipeCount > 0 ? '1px solid rgba(16,185,129,0.2)' : '1px solid rgba(255,255,255,0.08)' }}
        >
          <BookOpen size={12} />
          {recipeCount > 0 ? `Receta (${recipeCount} ingredientes)` : 'Agregar receta'}
        </button>
        <div className="flex items-center gap-2 mt-auto">
          <button onClick={() => onToggle(dish.id)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex-1 justify-center" style={{ backgroundColor: dish.available ? 'rgba(245,158,11,0.12)' : 'rgba(255,255,255,0.06)', color: dish.available ? '#f59e0b' : 'rgba(255,255,255,0.4)', border: dish.available ? '1px solid rgba(245,158,11,0.25)' : '1px solid rgba(255,255,255,0.08)' }}>
            {dish.available ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
            {dish.available ? 'Disponible' : 'No disponible'}
          </button>
          <button onClick={() => onEdit(dish)} className="w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:bg-white/10" style={{ color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.1)' }} title="Editar platillo"><Pencil size={13} /></button>
          <button onClick={() => onDelete(dish)} className="w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:bg-red-500/20" style={{ color: 'rgba(239,68,68,0.6)', border: '1px solid rgba(239,68,68,0.15)' }} title="Eliminar platillo"><Trash2 size={13} /></button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function MenuManagement() {
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<Category>('Todas');
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editingDish, setEditingDish] = useState<Dish | null>(null);
  const [deletingDish, setDeletingDish] = useState<Dish | null>(null);
  const [recipeDish, setRecipeDish] = useState<Dish | null>(null);
  const [recipeCounts, setRecipeCounts] = useState<Record<string, number>>({});

  const supabase = createClient();

  const fetchDishes = useCallback(async () => {
    setLoading(true);
    const _session = JSON.parse(sessionStorage.getItem('aldente_session') || '{}');
    const _tenantId = _session?.tenantId;
    const _q1 = supabase.from('dishes').select('*').eq('tenant_id', getTenantId());
    const { data, error } = await (_tenantId ? _q1.eq('tenant_id', _tenantId) : _q1).order('category').order('name');
    if (error) {
      alert('Error al cargar el menú: ' + error.message);
      setLoading(false);
      return;
    }
    if (data) {
      const mapped = data.map((d) => ({
        id: d.id, name: d.name, description: d.description, price: Number(d.price),
        category: d.category as Exclude<Category, 'Todas'>, available: d.available,
        image: d.image, imageAlt: d.image_alt, emoji: d.emoji, popular: d.popular,
      }));
      setDishes(mapped);
      // Fetch recipe counts
      const { data: recipeData } = await supabase.from('dish_recipes').select('dish_id').eq('tenant_id', getTenantId());
      if (recipeData) {
        const counts: Record<string, number> = {};
        recipeData.forEach((r: any) => { counts[r.dish_id] = (counts[r.dish_id] || 0) + 1; });
        setRecipeCounts(counts);
      }
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => { fetchDishes(); }, [fetchDishes]);

  const filtered = dishes.filter((d) => {
    const matchCat = activeCategory === 'Todas' || d.category === activeCategory;
    const matchSearch = !search || d.name.toLowerCase().includes(search.toLowerCase()) || d.description.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const counts: Record<Category, number> = {
    Todas: dishes.length,
    Entradas: dishes.filter((d) => d.category === 'Entradas').length,
    'Platos Fuertes': dishes.filter((d) => d.category === 'Platos Fuertes').length,
    Postres: dishes.filter((d) => d.category === 'Postres').length,
    Bebidas: dishes.filter((d) => d.category === 'Bebidas').length,
    Extras: dishes.filter((d) => d.category === 'Extras').length,
  };

  const availableCount = dishes.filter((d) => d.available).length;
  const dishesWithRecipe = Object.keys(recipeCounts).length;

  const [saving, setSaving] = useState(false);

  const handleSave = async (data: Omit<Dish, 'id'>) => {
    // For new dishes: the wizard already inserted in step 1 — just refresh
    if (!editingDish) {
      setFormOpen(false);
      setEditingDish(null);
      await fetchDishes();
      return;
    }
    // For edits: update the existing dish
    setSaving(true);
    try {
      const { error } = await supabase.from('dishes').update({
        name: data.name, description: data.description, price: data.price,
        category: data.category, available: data.available, image: data.image,
        image_alt: data.imageAlt, emoji: data.emoji, popular: data.popular,
        preparation_time_min: (data as any).preparationTimeMin ?? 15,
        updated_at: new Date().toISOString(),
      }).eq('id', editingDish.id);
      if (error) throw error;
      setFormOpen(false);
      setEditingDish(null);
      await fetchDishes();
    } catch (err: any) {
      alert('Error al actualizar platillo: ' + (err?.message ?? 'Intenta de nuevo'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingDish) return;
    const { error } = await supabase.from('dishes').delete().eq('id', deletingDish.id);
    if (error) { alert('Error al eliminar platillo: ' + error.message); return; }
    setDeletingDish(null);
    await fetchDishes();
  };

  const { log: auditLog } = useAudit();

  const handleToggle = async (id: string) => {
    const dish = dishes.find((d) => d.id === id);
    if (!dish) return;
    // Optimistic update
    setDishes((prev) => prev.map((d) => d.id === id ? { ...d, available: !d.available } : d));
    const { error } = await supabase.from('dishes').update({ available: !dish.available, updated_at: new Date().toISOString() }).eq('id', id);
    if (error) {
      // Revert on failure
      setDishes((prev) => prev.map((d) => d.id === id ? { ...d, available: dish.available } : d));
      alert('Error al cambiar disponibilidad: ' + error.message);
    }
  };

  const openAdd = () => { setEditingDish(null); setFormOpen(true); };
  const openEdit = (dish: Dish) => { setEditingDish(dish); setFormOpen(true); };

  return (
    <div className="space-y-6">
      {/* Stats bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total platillos', value: loading ? '—' : String(dishes.length), color: '#f59e0b' },
          { label: 'Disponibles', value: loading ? '—' : String(availableCount), color: '#34d399' },
          { label: 'Con receta', value: loading ? '—' : String(dishesWithRecipe), color: '#818cf8' },
          { label: 'Sin receta', value: loading ? '—' : String(dishes.length - dishesWithRecipe), color: '#f87171' },
        ].map((stat) => (
          <div key={stat.label} className="rounded-2xl px-5 py-4" style={{ backgroundColor: '#162d55', border: '1px solid #243f72' }}>
            <p className="text-2xl font-bold" style={{ color: stat.color }}>{stat.value}</p>
            <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.5)' }}>{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="relative w-full sm:w-72">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'rgba(255,255,255,0.35)' }} />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar platillo..." className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm outline-none" style={{ backgroundColor: '#162d55', border: '1px solid #243f72', color: 'white' }} />
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all hover:brightness-110 flex-shrink-0" style={{ backgroundColor: '#f59e0b', color: '#1B3A6B' }}>
          <Plus size={16} />Agregar platillo
        </button>
      </div>

      {/* Category tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
        {CATEGORIES.map((cat) => (
          <button key={cat} onClick={() => setActiveCategory(cat)} className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-all flex-shrink-0" style={{ backgroundColor: activeCategory === cat ? '#f59e0b' : 'rgba(255,255,255,0.06)', color: activeCategory === cat ? '#1B3A6B' : 'rgba(255,255,255,0.6)', border: activeCategory === cat ? 'none' : '1px solid rgba(255,255,255,0.1)' }}>
            {cat}
            <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ backgroundColor: activeCategory === cat ? 'rgba(27,58,107,0.3)' : 'rgba(255,255,255,0.1)', color: activeCategory === cat ? '#1B3A6B' : 'rgba(255,255,255,0.5)', fontWeight: 700, fontSize: '10px' }}>
              {loading ? '…' : counts[cat]}
            </span>
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => <DishSkeleton key={i} />)}
        </div>
      ) : dishes.length === 0 ? (
        <EmptyState onAdd={openAdd} />
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl flex flex-col items-center justify-center py-20 gap-3" style={{ backgroundColor: '#162d55', border: '1px solid #243f72' }}>
          <ImageOff size={36} style={{ color: 'rgba(255,255,255,0.2)' }} />
          <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
            {search ? `Sin resultados para "${search}"` : 'No hay platillos en esta categoría'}
          </p>
          {!search && (
            <button onClick={openAdd} className="mt-2 flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all" style={{ backgroundColor: 'rgba(245,158,11,0.15)', color: '#f59e0b' }}>
              <Plus size={14} />Agregar el primero
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((dish) => (
            <DishCard
              key={dish.id}
              dish={dish as Dish}
              recipeCount={recipeCounts[dish.id] || 0}
              onEdit={openEdit}
              onDelete={setDeletingDish}
              onToggle={handleToggle}
              onRecipe={setRecipeDish}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      {formOpen && <DishFormModal dish={editingDish} onSave={handleSave} onClose={() => { setFormOpen(false); setEditingDish(null); }} />}
      {deletingDish && <DeleteConfirmModal dish={deletingDish} onConfirm={handleDelete} onCancel={() => setDeletingDish(null)} />}
      {recipeDish && (
        <RecipeModal
          dish={recipeDish}
          onClose={() => { setRecipeDish(null); fetchDishes(); }}
          onPriceUpdate={(dishId, newPrice) => {
            setDishes(prev => prev.map(d => d.id === dishId ? { ...d, price: newPrice } : d));
            setRecipeDish(null);
            fetchDishes();
          }}
        />
      )}
    </div>
  );
}