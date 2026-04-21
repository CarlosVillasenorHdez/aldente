'use client';

/**
 * ExtrasInventario — Tab "Tienda de extras" dentro del módulo de Inventario
 *
 * Gestiona el stock de productos físicos de la tienda de extras
 * (termos, merch, suministros, etc.) con la misma lógica que los ingredientes:
 *   - Stock actual, mínimo, punto de reorden
 *   - Costo unitario → margen bruto en el P&L
 *   - Alertas de stock bajo
 *   - Registro de entradas de mercancía
 */

import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { getCurrentTenantId as getTenantId } from '@/lib/tenantStore';
import { toast } from 'sonner';
import { Package, Plus, Edit3, AlertTriangle, TrendingDown, ShoppingCart, Check, X } from 'lucide-react';

interface ExtraItem {
  id: string;
  name: string;
  type: string;
  price: number;
  costoUnitario: number;
  stockActual: number;
  stockMinimo: number;
  puntoReorden: number;
  unidad: string;
  tracksInventory: boolean;
  isActive: boolean;
}

const inp = "w-full border border-[#2a3f5f] rounded-lg px-3 py-2 text-sm bg-[#0f1923] text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-400";

function StockBadge({ item }: { item: ExtraItem }) {
  if (!item.tracksInventory) {
    return <span className="text-xs text-gray-500 italic">Sin control</span>;
  }
  const color = item.stockActual <= 0 ? 'text-red-400' :
    item.stockActual <= item.stockMinimo ? 'text-orange-400' :
    item.stockActual <= item.puntoReorden ? 'text-amber-400' : 'text-green-400';
  const label = item.stockActual <= 0 ? 'Agotado' :
    item.stockActual <= item.stockMinimo ? 'Crítico' :
    item.stockActual <= item.puntoReorden ? 'Reordenar' : 'OK';
  return (
    <span className={`text-xs font-semibold ${color}`}>
      {item.stockActual} {item.unidad} · {label}
    </span>
  );
}

export default function ExtrasInventario() {
  const supabase = createClient();
  const [items, setItems] = useState<ExtraItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<ExtraItem | null>(null);
  const [showEntry, setShowEntry] = useState<ExtraItem | null>(null); // Entrada de mercancía
  const [entryQty, setEntryQty] = useState(0);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState<Partial<ExtraItem>>({});

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('extras_catalog')
      .select('id,name,type,price,costo_unitario,stock_actual,stock_minimo,punto_reorden,unidad,tracks_inventory,is_active')
      .eq('tenant_id', getTenantId())
      .eq('is_active', true)
      .order('name');
    setItems((data || []).map((r: any) => ({
      id: r.id, name: r.name, type: r.type, price: Number(r.price),
      costoUnitario: Number(r.costo_unitario ?? 0),
      stockActual:   Number(r.stock_actual   ?? 0),
      stockMinimo:   Number(r.stock_minimo   ?? 0),
      puntoReorden:  Number(r.punto_reorden  ?? 0),
      unidad:        r.unidad ?? 'pieza',
      tracksInventory: r.tracks_inventory ?? false,
      isActive:      r.is_active,
    })));
    setLoading(false);
  }, [supabase]);

  useEffect(() => { load(); }, [load]);

  const alertItems = items.filter(i => i.tracksInventory && i.stockActual <= i.stockMinimo);
  const reorderItems = items.filter(i => i.tracksInventory && i.stockActual > i.stockMinimo && i.stockActual <= i.puntoReorden);

  async function saveEdit() {
    if (!editing) return;
    setSaving(true);
    const { error } = await supabase.from('extras_catalog').update({
      costo_unitario:   editForm.costoUnitario,
      stock_actual:     editForm.stockActual,
      stock_minimo:     editForm.stockMinimo,
      punto_reorden:    editForm.puntoReorden,
      unidad:           editForm.unidad,
      tracks_inventory: editForm.tracksInventory,
      updated_at:       new Date().toISOString(),
    }).eq('id', editing.id);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(`${editing.name} actualizado`);
    setEditing(null);
    await load();
  }

  async function registerEntry() {
    if (!showEntry || entryQty <= 0) return;
    setSaving(true);
    const newStock = showEntry.stockActual + entryQty;
    const { error } = await supabase.from('extras_catalog').update({
      stock_actual: newStock, updated_at: new Date().toISOString(),
    }).eq('id', showEntry.id);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(`✅ +${entryQty} ${showEntry.unidad}(s) de ${showEntry.name} — nuevo stock: ${newStock}`);
    setShowEntry(null);
    setEntryQty(0);
    await load();
  }

  if (loading) return <div className="text-sm text-gray-400 py-12 text-center">Cargando...</div>;

  return (
    <div className="p-6 space-y-5">

      {/* Alertas */}
      {(alertItems.length > 0 || reorderItems.length > 0) && (
        <div className="grid grid-cols-2 gap-4">
          {alertItems.length > 0 && (
            <div className="flex items-center gap-3 px-4 py-3 bg-red-900/20 border border-red-800 rounded-xl">
              <AlertTriangle size={16} className="text-red-400 flex-shrink-0" />
              <p className="text-sm text-red-300">
                <strong>{alertItems.length}</strong> producto(s) en stock crítico o agotados
              </p>
            </div>
          )}
          {reorderItems.length > 0 && (
            <div className="flex items-center gap-3 px-4 py-3 bg-amber-900/20 border border-amber-800 rounded-xl">
              <TrendingDown size={16} className="text-amber-400 flex-shrink-0" />
              <p className="text-sm text-amber-300">
                <strong>{reorderItems.length}</strong> producto(s) en punto de reorden
              </p>
            </div>
          )}
        </div>
      )}

      {/* Tabla */}
      <div className="bg-[#132240] border border-[#243f72] rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#243f72] text-xs text-gray-400 uppercase tracking-wide">
              <th className="text-left px-5 py-3 font-semibold">Producto</th>
              <th className="text-left px-4 py-3 font-semibold">Tipo</th>
              <th className="text-right px-4 py-3 font-semibold">Precio venta</th>
              <th className="text-right px-4 py-3 font-semibold">Costo unit.</th>
              <th className="text-right px-4 py-3 font-semibold">Margen</th>
              <th className="text-center px-4 py-3 font-semibold">Stock</th>
              <th className="text-center px-4 py-3 font-semibold">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-12 text-gray-500">
                No hay productos en la tienda de extras.<br/>
                <span className="text-xs">Agrégalos desde Tienda de Extras → Catálogo.</span>
              </td></tr>
            ) : items.map(item => {
              const margin = item.price > 0 ? ((item.price - item.costoUnitario) / item.price * 100) : 0;
              const isAlert = item.tracksInventory && item.stockActual <= item.stockMinimo;
              const isReorder = item.tracksInventory && item.stockActual > item.stockMinimo && item.stockActual <= item.puntoReorden;
              return (
                <tr key={item.id} className={`border-b border-[#1a3060] hover:bg-[#1a2f55] transition-colors ${isAlert ? 'bg-red-900/10' : isReorder ? 'bg-amber-900/10' : ''}`}>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      {isAlert && <AlertTriangle size={13} className="text-red-400 flex-shrink-0" />}
                      {isReorder && <TrendingDown size={13} className="text-amber-400 flex-shrink-0" />}
                      <span className="font-medium text-gray-100">{item.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-400 capitalize">{item.type === 'membership' ? 'Membresía' : item.type === 'product' ? 'Producto' : 'Otro'}</td>
                  <td className="px-4 py-3 text-right text-gray-200 font-mono">${item.price.toFixed(2)}</td>
                  <td className="px-4 py-3 text-right font-mono">
                    {item.costoUnitario > 0
                      ? <span className="text-gray-200">${item.costoUnitario.toFixed(2)}</span>
                      : <span className="text-gray-600 text-xs">No definido</span>}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {item.costoUnitario > 0 && item.price > 0 ? (
                      <span className={`font-semibold text-xs ${margin >= 40 ? 'text-green-400' : margin >= 20 ? 'text-amber-400' : 'text-red-400'}`}>
                        {margin.toFixed(0)}%
                      </span>
                    ) : <span className="text-gray-600 text-xs">—</span>}
                  </td>
                  <td className="px-4 py-3 text-center"><StockBadge item={item} /></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-2">
                      {item.tracksInventory && (
                        <button onClick={() => { setShowEntry(item); setEntryQty(0); }}
                          className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg font-semibold transition-colors"
                          style={{ background:'rgba(16,185,129,0.12)', color:'#4ade80', border:'1px solid rgba(16,185,129,0.2)' }}>
                          <Plus size={11} /> Entrada
                        </button>
                      )}
                      <button onClick={() => { setEditing(item); setEditForm({ ...item }); }}
                        className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg font-semibold transition-colors"
                        style={{ background:'rgba(96,165,250,0.1)', color:'#60a5fa', border:'1px solid rgba(96,165,250,0.2)' }}>
                        <Edit3 size={11} /> Editar
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Modal: editar inventario del extra */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-[#0f1923] border border-[#2a3f5f] rounded-2xl p-6 w-full max-w-md space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-gray-100">{editing.name}</h3>
              <button onClick={() => setEditing(null)} className="text-gray-500 hover:text-gray-300"><X size={18}/></button>
            </div>

            {/* Toggle de control de inventario */}
            <label className="flex items-center gap-3 cursor-pointer">
              <div onClick={() => setEditForm(f => ({ ...f, tracksInventory: !f.tracksInventory }))}
                className={`relative w-11 h-6 rounded-full transition-colors ${editForm.tracksInventory ? 'bg-amber-500' : 'bg-gray-700'}`}>
                <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${editForm.tracksInventory ? 'translate-x-5' : 'translate-x-0.5'}`} />
              </div>
              <span className="text-sm text-gray-300">Controla inventario físico</span>
            </label>

            {editForm.tracksInventory ? (
              <div className="grid grid-cols-2 gap-3">
                {[
                  { lbl:'Stock actual', key:'stockActual' },
                  { lbl:'Costo unitario ($)', key:'costoUnitario' },
                  { lbl:'Stock mínimo (alerta crítica)', key:'stockMinimo' },
                  { lbl:'Punto de reorden (alerta compra)', key:'puntoReorden' },
                ].map(({ lbl, key }) => (
                  <div key={key}>
                    <label className="text-xs text-gray-400 block mb-1">{lbl}</label>
                    <input type="number" min={0} className={inp}
                      value={(editForm as any)[key] ?? 0}
                      onChange={e => setEditForm(f => ({ ...f, [key]: Number(e.target.value) }))} />
                  </div>
                ))}
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Unidad</label>
                  <select className={inp} value={editForm.unidad ?? 'pieza'}
                    onChange={e => setEditForm(f => ({ ...f, unidad: e.target.value }))}>
                    {['pieza','caja','paquete','kit','unidad','par','set','rollo'].map(u =>
                      <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
                {(editForm.costoUnitario ?? 0) > 0 && (editForm.costoUnitario ?? 0) < editing.price && (
                  <div className="col-span-2 px-3 py-2 bg-green-900/20 border border-green-800 rounded-lg">
                    <p className="text-xs text-green-400">
                      Margen bruto: ${(editing.price - (editForm.costoUnitario ?? 0)).toFixed(2)} ({((editing.price - (editForm.costoUnitario ?? 0)) / editing.price * 100).toFixed(0)}%)
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs text-gray-500 italic">
                Sin control de inventario — no descuenta stock al vender. Útil para membresías digitales o servicios.
              </p>
            )}

            <div className="flex gap-3 pt-2">
              <button onClick={() => setEditing(null)} className="flex-1 py-2.5 rounded-xl text-sm text-gray-400 border border-[#2a3f5f] hover:bg-[#1a2535]">Cancelar</button>
              <button onClick={saveEdit} disabled={saving} className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-amber-500 hover:bg-amber-600 text-[#1B3A6B] disabled:opacity-50">
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: entrada de mercancía */}
      {showEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-[#0f1923] border border-[#2a3f5f] rounded-2xl p-6 w-full max-w-sm space-y-4">
            <div className="flex items-center gap-3">
              <ShoppingCart size={20} className="text-green-400" />
              <h3 className="text-base font-bold text-gray-100">Entrada de mercancía</h3>
            </div>
            <p className="text-sm text-gray-400">{showEntry.name}</p>
            <p className="text-xs text-gray-500">Stock actual: <strong className="text-gray-300">{showEntry.stockActual} {showEntry.unidad}(s)</strong></p>
            <div>
              <label className="text-xs text-gray-400 block mb-1">¿Cuántas unidades llegaron?</label>
              <input type="number" min={1} className={inp} value={entryQty}
                onChange={e => setEntryQty(Number(e.target.value))} autoFocus />
            </div>
            {entryQty > 0 && (
              <p className="text-xs text-green-400 flex items-center gap-1">
                <Check size={12} /> Nuevo stock: {showEntry.stockActual + entryQty} {showEntry.unidad}(s)
              </p>
            )}
            <div className="flex gap-3">
              <button onClick={() => setShowEntry(null)} className="flex-1 py-2.5 rounded-xl text-sm text-gray-400 border border-[#2a3f5f]">Cancelar</button>
              <button onClick={registerEntry} disabled={saving || entryQty <= 0}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-green-600 hover:bg-green-700 text-white disabled:opacity-50">
                {saving ? 'Registrando...' : `+ ${entryQty} ${showEntry.unidad}(s)`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
