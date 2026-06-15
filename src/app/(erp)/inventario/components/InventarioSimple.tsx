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
  // Valor total del inventario (lo que tienes en la bodega, en dinero)
  const valorTotal = items.reduce((s, i) => s + i.stock * i.cost, 0);

  return (
    <div className="flex flex-col h-full" style={{ backgroundColor: '#0f1e38' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0" style={{ borderColor: '#243f72' }}>
        <div>
          <h1 className="text-xl font-bold text-white">Mi Inventario</h1>
          <p className="text-sm mt-0.5" style={{ color: 'rgba(255,255,255,0.45)' }}>
            Registra lo que compras y cuenta lo que te queda. El sistema te avisa antes de que se acabe.
          </p>
        </div>
        <button onClick={() => setModal({ type: 'nuevo' })}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold"
          style={{ backgroundColor: '#f59e0b', color: '#1B3A6B', border: 'none' }}>
          <Plus size={15} /> Agregar insumo
        </button>
      </div>

      <div className="px-6 py-5 space-y-5 overflow-y-auto flex-1">
        {/* Resumen */}
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-xl p-4" style={{ background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.25)' }}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium" style={{ color: 'rgba(255,255,255,0.5)' }}>Valor en bodega</span>
              <Package size={15} style={{ color: '#4ade80' }} />
            </div>
            <p className="text-2xl font-bold" style={{ color: '#4ade80', fontFamily: 'monospace' }}>{fmtMXN(valorTotal)}</p>
            <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>Dinero que tienes en insumos</p>
          </div>
          <div className="rounded-xl p-4" style={{ background: seAcaban.length > 0 ? 'rgba(248,113,113,0.08)' : 'rgba(255,255,255,0.04)', border: `1px solid ${seAcaban.length > 0 ? 'rgba(248,113,113,0.3)' : '#243f72'}` }}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium" style={{ color: 'rgba(255,255,255,0.5)' }}>Se acaban pronto</span>
              <AlertTriangle size={15} style={{ color: seAcaban.length > 0 ? '#f87171' : 'rgba(255,255,255,0.3)' }} />
            </div>
            <p className="text-2xl font-bold" style={{ color: seAcaban.length > 0 ? '#f87171' : 'rgba(255,255,255,0.4)', fontFamily: 'monospace' }}>{seAcaban.length}</p>
            <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>
              {seAcaban.length > 0 ? 'Hay que comprar' : 'Todo en orden'}
            </p>
          </div>
        </div>

        {/* Alerta de los que se acaban */}
        {seAcaban.length > 0 && (
          <div className="rounded-xl p-4" style={{ background: 'rgba(248,113,113,0.06)', border: '1px solid rgba(248,113,113,0.2)' }}>
            <p className="text-sm font-semibold mb-2" style={{ color: '#f87171' }}>⚠️ Necesitas comprar:</p>
            <div className="flex flex-wrap gap-2">
              {seAcaban.map(i => (
                <span key={i.id} className="text-xs px-2.5 py-1 rounded-full" style={{ background: 'rgba(248,113,113,0.15)', color: '#fca5a5' }}>
                  {i.name} ({fmt(i.stock)} {i.unit})
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Lista de insumos */}
        {loading ? (
          <p className="text-center py-12 text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>Cargando...</p>
        ) : items.length === 0 ? (
          <div className="text-center py-16">
            <Package size={40} style={{ color: 'rgba(255,255,255,0.2)', margin: '0 auto 12px' }} />
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>Aún no tienes insumos.</p>
            <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.35)' }}>
              Agrega lo que compras seguido: tortillas, carne, refrescos, etc.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {items.map(i => {
              const low = i.minStock > 0 && i.stock <= i.minStock;
              return (
                <div key={i.id} className="rounded-xl p-4" style={{ background: '#162d55', border: `1px solid ${low ? 'rgba(248,113,113,0.3)' : '#243f72'}` }}>
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="text-sm font-bold text-white">{i.name}</p>
                      <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>{i.category}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold font-mono" style={{ color: low ? '#f87171' : '#4ade80' }}>{fmt(i.stock)}</p>
                      <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>{i.unit}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setModal({ type: 'compra', item: i })}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold"
                      style={{ background: 'rgba(74,222,128,0.12)', color: '#4ade80', border: '1px solid rgba(74,222,128,0.25)' }}>
                      <ShoppingCart size={13} /> Compré
                    </button>
                    <button onClick={() => setModal({ type: 'conteo', item: i })}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold"
                      style={{ background: 'rgba(96,165,250,0.12)', color: '#60a5fa', border: '1px solid rgba(96,165,250,0.25)' }}>
                      <ClipboardCheck size={13} /> Conté
                    </button>
                  </div>
                  {low && <p className="text-xs mt-2 text-center" style={{ color: '#f87171' }}>⚠️ Se está acabando</p>}
                </div>
              );
            })}
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
