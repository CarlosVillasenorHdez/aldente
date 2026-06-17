'use client';
/**
 * InventarioSimple — El inventario como lo piensa un restaurantero real.
 *
 * No pregunta "cuántos gramos de ketchup por hamburguesa". Pregunta:
 *   - ¿Qué compraste? (registrar compra → sube stock y costo)
 *   - ¿Cuánto te queda? (conteo → ajusta stock)
 *   - Y avisa: "esto se acaba pronto" ANTES de que el cocinero llame.
 *
 * Consumo = compras − lo que queda. Costo real sin saber recetas.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { getCurrentTenantId as getTenantId } from '@/lib/tenantStore';
import { useBranch } from '@/hooks/useBranch';
import { toast } from 'sonner';
import { Plus, Package, AlertTriangle, ShoppingCart, ClipboardCheck, X, Check } from 'lucide-react';

interface SimpleItem {
  id: string;
  name: string;
  category: string;
  stock: number;
  minStock: number;
  unit: string;
  cost: number;
}

const fmt = (n: number) => n.toLocaleString('es-MX', { maximumFractionDigits: 1 });
const fmtMXN = (n: number) => '$' + n.toLocaleString('es-MX', { maximumFractionDigits: 0 });

export default function InventarioSimple() {
  const supabase = createClient();
  const { activeBranchId } = useBranch();
  const [items, setItems] = useState<SimpleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<{ type: 'compra' | 'conteo' | 'nuevo'; item?: SimpleItem } | null>(null);

  const load = useCallback(async () => {
    const tid = getTenantId();
    if (!tid) { setLoading(false); return; }
    let q = supabase.from('ingredients')
      .select('id, name, category, stock, min_stock, unit, cost')
      .eq('tenant_id', tid).order('name');
    if (activeBranchId) q = (q as any).or(`branch_id.is.null,branch_id.eq.${activeBranchId}`);
    const { data } = await q;
    setItems((data ?? []).map((i: any) => ({
      id: i.id, name: i.name, category: i.category ?? 'Otros',
      stock: Number(i.stock ?? 0), minStock: Number(i.min_stock ?? 0),
      unit: i.unit ?? 'pza', cost: Number(i.cost ?? 0),
    })));
    setLoading(false);
  }, [supabase, activeBranchId]);

  useEffect(() => { load(); }, [load]);

  // Items que se acaban pronto (stock <= mínimo)
  const seAcaban = items.filter(i => i.minStock > 0 && i.stock <= i.minStock);
  const valorTotal = items.reduce((s, i) => s + i.stock * i.cost, 0);

  // Agrupar por categoría para una lista ordenada
  const grouped = items.reduce<Record<string, SimpleItem[]>>((acc, i) => {
    (acc[i.category] ??= []).push(i);
    return acc;
  }, {});
  const categories = Object.keys(grouped).sort();

  return (
    <div className="flex flex-col h-full" style={{ backgroundColor: '#0f1e38' }}>
      {/* Barra de resumen — stats inline, no tarjetas gigantes */}
      <div className="flex items-stretch border-b flex-shrink-0" style={{ borderColor: '#243f72' }}>
        <div className="flex-1 px-6 py-4">
          <p className="text-xs font-medium uppercase tracking-wide" style={{ color: 'rgba(255,255,255,0.4)', letterSpacing: '0.06em' }}>Valor en bodega</p>
          <p className="text-2xl font-bold mt-1" style={{ color: '#4ade80', fontFamily: 'ui-monospace, monospace' }}>{fmtMXN(valorTotal)}</p>
          <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>Dinero invertido en insumos</p>
        </div>
        <div className="w-px" style={{ background: '#243f72' }} />
        <div className="flex-1 px-6 py-4">
          <p className="text-xs font-medium uppercase tracking-wide" style={{ color: 'rgba(255,255,255,0.4)', letterSpacing: '0.06em' }}>Se acaban pronto</p>
          <p className="text-2xl font-bold mt-1" style={{ color: seAcaban.length > 0 ? '#f87171' : '#4ade80', fontFamily: 'ui-monospace, monospace' }}>
            {seAcaban.length}<span className="text-sm font-normal" style={{ color: 'rgba(255,255,255,0.35)' }}> de {items.length}</span>
          </p>
          <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>{seAcaban.length > 0 ? 'Necesitas comprar' : 'Todo en orden'}</p>
        </div>
        <div className="flex items-center pr-6">
          <button onClick={() => setModal({ type: 'nuevo' })}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold transition-opacity hover:opacity-90"
            style={{ backgroundColor: '#f59e0b', color: '#1B3A6B', border: 'none' }}>
            <Plus size={16} /> Agregar insumo
          </button>
        </div>
      </div>

      <div className="px-6 py-5 overflow-y-auto flex-1">
        {/* Banda de compra urgente */}
        {seAcaban.length > 0 && (
          <div className="rounded-lg px-4 py-3 mb-5 flex items-center gap-3" style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)' }}>
            <AlertTriangle size={16} style={{ color: '#f87171', flexShrink: 0 }} />
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.8)' }}>
              <span style={{ fontWeight: 600 }}>Lista de compras:</span>{' '}
              {seAcaban.map(i => i.name).join(', ')}
            </p>
          </div>
        )}

        {loading ? (
          <p className="text-center py-16 text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>Cargando insumos...</p>
        ) : items.length === 0 ? (
          <div className="text-center py-20 max-w-md mx-auto">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4" style={{ background: 'rgba(245,158,11,0.1)' }}>
              <Package size={26} style={{ color: '#f59e0b' }} />
            </div>
            <p className="text-base font-semibold text-white">Empieza tu inventario</p>
            <p className="text-sm mt-2 mb-5" style={{ color: 'rgba(255,255,255,0.45)', lineHeight: 1.5 }}>
              Agrega lo que compras seguido — carne, tortillas, refrescos, papas. Sin pesar nada: registras lo que compras y cuentas lo que te queda.
            </p>
            <button onClick={() => setModal({ type: 'nuevo' })}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold"
              style={{ backgroundColor: '#f59e0b', color: '#1B3A6B', border: 'none' }}>
              <Plus size={16} /> Agregar mi primer insumo
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {categories.map(cat => (
              <div key={cat}>
                <p className="text-xs font-semibold uppercase mb-2 px-1" style={{ color: 'rgba(255,255,255,0.35)', letterSpacing: '0.06em' }}>{cat}</p>
                <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #243f72' }}>
                  {grouped[cat].map((i, idx) => {
                    const low = i.minStock > 0 && i.stock <= i.minStock;
                    return (
                      <div key={i.id} className="flex items-center gap-4 px-4 py-3"
                        style={{ background: idx % 2 === 0 ? '#162d55' : '#15294d', borderTop: idx > 0 ? '1px solid #243f72' : 'none' }}>
                        {/* Indicador de estado */}
                        <div className="w-1.5 h-10 rounded-full flex-shrink-0" style={{ background: low ? '#f87171' : '#4ade80' }} />
                        {/* Nombre + estado */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-white truncate">{i.name}</p>
                          {low ? (
                            <p className="text-xs mt-0.5" style={{ color: '#f87171' }}>Se está acabando — hay que comprar</p>
                          ) : (
                            <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>
                              {i.minStock > 0 ? `Te aviso al llegar a ${fmt(i.minStock)} ${i.unit}` : 'Sin alerta configurada'}
                            </p>
                          )}
                        </div>
                        {/* Stock actual */}
                        <div className="text-right flex-shrink-0 mr-2">
                          <p className="text-lg font-bold font-mono leading-none" style={{ color: low ? '#f87171' : 'white' }}>{fmt(i.stock)}</p>
                          <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>{i.unit}</p>
                        </div>
                        {/* Acciones */}
                        <div className="flex gap-2 flex-shrink-0">
                          <button onClick={() => setModal({ type: 'compra', item: i })}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-opacity hover:opacity-80"
                            style={{ background: 'rgba(74,222,128,0.12)', color: '#4ade80', border: '1px solid rgba(74,222,128,0.2)' }}>
                            <ShoppingCart size={13} /> Compré
                          </button>
                          <button onClick={() => setModal({ type: 'conteo', item: i })}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-opacity hover:opacity-80"
                            style={{ background: 'rgba(96,165,250,0.12)', color: '#60a5fa', border: '1px solid rgba(96,165,250,0.2)' }}>
                            <ClipboardCheck size={13} /> Conté
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {modal && (
        <SimpleModal
          modal={modal}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); load(); }}
          supabase={supabase}
          activeBranchId={activeBranchId}
        />
      )}
    </div>
  );
}

// ─── Modal de compra / conteo / nuevo ─────────────────────────────────────────
function SimpleModal({ modal, onClose, onSaved, supabase, activeBranchId }: any) {
  const { type, item } = modal;
  const [qty, setQty] = useState('');
  const [cost, setCost] = useState('');
  const [name, setName] = useState('');
  const [unit, setUnit] = useState('kg');
  const [minStock, setMinStock] = useState('');
  const [saving, setSaving] = useState(false);

  const title = type === 'compra' ? `Registrar compra: ${item?.name}`
    : type === 'conteo' ? `Conté: ${item?.name}`
    : 'Nuevo insumo';

  const handleSave = async () => {
    setSaving(true);
    const tid = getTenantId();
    try {
      if (type === 'nuevo') {
        if (!name.trim()) { toast.error('Ponle nombre al insumo'); setSaving(false); return; }
        const { error } = await supabase.from('ingredients').insert({
          tenant_id: tid, branch_id: activeBranchId ?? null,
          name: name.trim(), category: 'Otros', unit,
          stock: 0, min_stock: Number(minStock) || 0, reorder_point: 0, cost: 0,
        });
        if (error) throw error;
        toast.success(`${name} agregado`);
      } else if (type === 'compra') {
        const q = Number(qty); const c = Number(cost);
        if (!q || q <= 0) { toast.error('¿Cuánto compraste?'); setSaving(false); return; }
        const nuevoStock = item.stock + q;
        // Costo promedio ponderado (WACC) si dieron el costo de la compra
        let nuevoCosto = item.cost;
        if (c > 0) {
          const costoUnitario = c / q;
          const valorPrevio = item.stock * item.cost;
          nuevoCosto = (valorPrevio + c) / nuevoStock;
        }
        const { error } = await supabase.from('ingredients')
          .update({ stock: nuevoStock, cost: nuevoCosto, updated_at: new Date().toISOString() })
          .eq('id', item.id).eq('tenant_id', tid);
        if (error) throw error;
        await supabase.from('stock_movements').insert({
          tenant_id: tid, branch_id: activeBranchId ?? null, ingredient_id: item.id,
          movement_type: 'entrada', quantity: q, previous_stock: item.stock, new_stock: nuevoStock,
          reason: `Compra${c > 0 ? ` — ${fmtMXN(c)}` : ''}`, created_by: 'Dueño',
          unit_cost: c > 0 ? c / q : item.cost, total_cost: c > 0 ? c : q * item.cost,
        });
        toast.success(`+${fmt(q)} ${item.unit} de ${item.name}`);
      } else if (type === 'conteo') {
        const q = Number(qty);
        if (qty === '' || q < 0) { toast.error('¿Cuánto te queda?'); setSaving(false); return; }
        const diff = q - item.stock;
        const { error } = await supabase.from('ingredients')
          .update({ stock: q, updated_at: new Date().toISOString() })
          .eq('id', item.id).eq('tenant_id', tid);
        if (error) throw error;
        await supabase.from('stock_movements').insert({
          tenant_id: tid, branch_id: activeBranchId ?? null, ingredient_id: item.id,
          movement_type: 'ajuste', quantity: Math.abs(diff), previous_stock: item.stock, new_stock: q,
          reason: `Conteo físico (${diff >= 0 ? '+' : ''}${fmt(diff)})`, created_by: 'Dueño',
          unit_cost: item.cost, total_cost: Math.abs(diff) * item.cost,
        });
        toast.success(`${item.name}: ${fmt(q)} ${item.unit}`);
      }
      onSaved();
    } catch (e: any) {
      toast.error('Error: ' + e.message);
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)' }} onClick={onClose}>
      <div className="w-full max-w-sm rounded-2xl p-6" style={{ background: '#162d55', border: '1px solid #243f72' }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-white">{title}</h3>
          <button onClick={onClose}><X size={18} style={{ color: 'rgba(255,255,255,0.5)' }} /></button>
        </div>

        {type === 'nuevo' ? (
          <div className="space-y-3">
            <div>
              <label className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.5)' }}>¿Qué compras seguido?</label>
              <input value={name} onChange={e => setName(e.target.value)} autoFocus placeholder="Ej: Carne molida, Tortillas, Refrescos"
                className="w-full mt-1 px-3 py-2 rounded-lg text-sm" style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid #243f72', color: 'white' }} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.5)' }}>Unidad</label>
                <select value={unit} onChange={e => setUnit(e.target.value)}
                  className="w-full mt-1 px-3 py-2 rounded-lg text-sm" style={{ background: '#0f1e38', border: '1px solid #243f72', color: 'white' }}>
                  <option value="kg">kg</option><option value="g">gramos</option><option value="l">litros</option>
                  <option value="ml">ml</option><option value="pza">piezas</option><option value="caja">cajas</option>
                  <option value="bolsa">bolsas</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.5)' }}>Avísame en</label>
                <input value={minStock} onChange={e => setMinStock(e.target.value)} type="number" placeholder="Ej: 5"
                  className="w-full mt-1 px-3 py-2 rounded-lg text-sm" style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid #243f72', color: 'white' }} />
              </div>
            </div>
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>
              "Avísame en" = cuando te queden menos de esa cantidad, el sistema te alerta.
            </p>
          </div>
        ) : type === 'compra' ? (
          <div className="space-y-3">
            <div>
              <label className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.5)' }}>¿Cuánto compraste? (en {item.unit})</label>
              <input value={qty} onChange={e => setQty(e.target.value)} type="number" autoFocus placeholder="0"
                className="w-full mt-1 px-3 py-3 rounded-lg text-lg font-mono" style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid #243f72', color: 'white' }} />
            </div>
            <div>
              <label className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.5)' }}>¿Cuánto pagaste en total? (opcional)</label>
              <input value={cost} onChange={e => setCost(e.target.value)} type="number" placeholder="$0"
                className="w-full mt-1 px-3 py-2 rounded-lg text-sm font-mono" style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid #243f72', color: 'white' }} />
              <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.35)' }}>
                Si lo pones, el sistema calcula tu costo real y tu ganancia.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>
              Cuenta lo que te queda físicamente en la bodega y ponlo aquí. El sistema se ajusta solo.
            </p>
            <div>
              <label className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.5)' }}>¿Cuánto te queda? (en {item.unit})</label>
              <input value={qty} onChange={e => setQty(e.target.value)} type="number" autoFocus placeholder={fmt(item.stock)}
                className="w-full mt-1 px-3 py-3 rounded-lg text-lg font-mono" style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid #243f72', color: 'white' }} />
              <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.35)' }}>El sistema dice que tienes {fmt(item.stock)} {item.unit}.</p>
            </div>
          </div>
        )}

        <button onClick={handleSave} disabled={saving}
          className="w-full mt-5 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold"
          style={{ background: '#f59e0b', color: '#1B3A6B', border: 'none', opacity: saving ? 0.6 : 1 }}>
          <Check size={16} /> {saving ? 'Guardando...' : 'Guardar'}
        </button>
      </div>
    </div>
  );
}
