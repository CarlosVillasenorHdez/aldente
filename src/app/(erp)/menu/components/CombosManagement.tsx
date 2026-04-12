'use client';
import { getCurrentTenantId as getTenantId } from '@/lib/tenantStore';
import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Plus, X, Tag, Percent, Edit2, Trash2, ToggleLeft, ToggleRight, Package } from 'lucide-react';
import { toast } from 'sonner';
import type { Dish } from './MenuManagement';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ComboItem {
  dish_id: string;
  name: string;
  emoji: string;
  qty: number;
  original_price: number;
  discount_pct: number;    // 0–100
  final_price: number;     // original_price * qty * (1 - discount_pct/100)
}

export interface Combo {
  id: string;
  name: string;
  description: string;
  emoji: string;
  items: ComboItem[];
  total_price: number;
  savings: number;
  active: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function calcComboTotals(items: ComboItem[]) {
  const original = items.reduce((s, i) => s + i.original_price * i.qty, 0);
  const final    = items.reduce((s, i) => s + i.final_price, 0);
  return { total_price: final, savings: original - final };
}

// ─── ComboModal ───────────────────────────────────────────────────────────────

function ComboModal({ combo, dishes, onClose, onSave }: {
  combo: Combo | null;
  dishes: Dish[];
  onClose: () => void;
  onSave: (data: Omit<Combo, 'id'>) => void;
}) {
  const [name, setName] = useState(combo?.name ?? '');
  const [description, setDescription] = useState(combo?.description ?? '');
  const [emoji, setEmoji] = useState(combo?.emoji ?? '🎁');
  const [items, setItems] = useState<ComboItem[]>(combo?.items ?? []);
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);

  const filtered = dishes.filter(d =>
    d.available &&
    !items.find(i => i.dish_id === d.id) &&
    (search === '' || d.name.toLowerCase().includes(search.toLowerCase()))
  );

  const addDish = (dish: Dish) => {
    const item: ComboItem = {
      dish_id: dish.id, name: dish.name, emoji: dish.emoji ?? '🍽️',
      qty: 1, original_price: dish.price, discount_pct: 0,
      final_price: dish.price,
    };
    setItems(prev => [...prev, item]);
    setSearch('');
  };

  const updateItem = (idx: number, field: 'qty' | 'discount_pct', val: number) => {
    setItems(prev => prev.map((it, i) => {
      if (i !== idx) return it;
      const qty         = field === 'qty' ? Math.max(1, val) : it.qty;
      const discount_pct = field === 'discount_pct' ? Math.min(100, Math.max(0, val)) : it.discount_pct;
      const final_price  = it.original_price * qty * (1 - discount_pct / 100);
      return { ...it, qty, discount_pct, final_price };
    }));
  };

  const removeItem = (idx: number) => setItems(prev => prev.filter((_, i) => i !== idx));

  const { total_price, savings } = calcComboTotals(items);
  const originalTotal = items.reduce((s, i) => s + i.original_price * i.qty, 0);

  const handleSave = () => {
    if (!name.trim()) { toast.error('El combo necesita un nombre'); return; }
    if (items.length < 2) { toast.error('Un combo necesita al menos 2 productos'); return; }
    setSaving(true);
    onSave({ name: name.trim(), description, emoji, items, total_price, savings, active: combo?.active ?? true });
  };

  return (
    <div style={{ position:'fixed', inset:0, zIndex:9999, background:'rgba(0,0,0,0.75)', backdropFilter:'blur(6px)', display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}
      onClick={onClose}>
      <div style={{ background:'#162d55', border:'1px solid #243f72', borderRadius:20, width:'100%', maxWidth:600, maxHeight:'90vh', display:'flex', flexDirection:'column' }}
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ padding:'20px 24px 16px', borderBottom:'1px solid rgba(255,255,255,0.06)', display:'flex', alignItems:'center', gap:12 }}>
          <input value={emoji} onChange={e => setEmoji(e.target.value)} style={{ width:40, height:40, fontSize:24, textAlign:'center', background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.12)', borderRadius:10, color:'#f1f5f9' }} />
          <div style={{ flex:1 }}>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Nombre del combo (ej: Café + Croissant)"
              style={{ width:'100%', background:'none', border:'none', outline:'none', color:'#f1f5f9', fontSize:18, fontWeight:700 }} />
            <input value={description} onChange={e => setDescription(e.target.value)} placeholder="Descripción opcional"
              style={{ width:'100%', background:'none', border:'none', outline:'none', color:'rgba(255,255,255,0.45)', fontSize:12, marginTop:2 }} />
          </div>
          <button onClick={onClose} style={{ background:'none', border:'none', color:'rgba(255,255,255,0.4)', cursor:'pointer', padding:4 }}><X size={18}/></button>
        </div>

        <div style={{ flex:1, overflowY:'auto', padding:24 }}>
          {/* Items in combo */}
          {items.length > 0 && (
            <div style={{ marginBottom:20 }}>
              <div style={{ fontSize:11, fontWeight:700, color:'rgba(255,255,255,0.4)', letterSpacing:'.08em', textTransform:'uppercase', marginBottom:10 }}>Productos en el combo</div>
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {items.map((item, i) => (
                  <div key={item.dish_id} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px', borderRadius:12, background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)' }}>
                    <span style={{ fontSize:20 }}>{item.emoji}</span>
                    <span style={{ flex:1, fontSize:13, fontWeight:600, color:'#f1f5f9' }}>{item.name}</span>
                    {/* Qty */}
                    <div style={{ display:'flex', alignItems:'center', gap:4 }}>
                      <span style={{ fontSize:11, color:'rgba(255,255,255,0.35)' }}>×</span>
                      <input type="number" min={1} value={item.qty} onChange={e => updateItem(i, 'qty', parseInt(e.target.value)||1)}
                        style={{ width:40, textAlign:'center', background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.12)', borderRadius:6, color:'#f1f5f9', fontSize:13, padding:'3px 4px' }} />
                    </div>
                    {/* Discount % */}
                    <div style={{ display:'flex', alignItems:'center', gap:4, marginLeft:8 }}>
                      <Percent size={11} style={{ color:'#c9963a' }} />
                      <input type="number" min={0} max={100} value={item.discount_pct} onChange={e => updateItem(i, 'discount_pct', parseFloat(e.target.value)||0)}
                        style={{ width:46, textAlign:'center', background:'rgba(201,150,58,0.08)', border:'1px solid rgba(201,150,58,0.25)', borderRadius:6, color:'#c9963a', fontSize:13, padding:'3px 4px' }} />
                      <span style={{ fontSize:11, color:'#c9963a' }}>dto</span>
                    </div>
                    {/* Final price */}
                    <span style={{ fontSize:13, fontWeight:700, color:'#4ade80', fontFamily:'monospace', minWidth:60, textAlign:'right' }}>
                      ${item.final_price.toFixed(2)}
                    </span>
                    {item.discount_pct > 0 && (
                      <span style={{ fontSize:11, color:'rgba(255,255,255,0.3)', textDecoration:'line-through', fontFamily:'monospace' }}>
                        ${(item.original_price * item.qty).toFixed(2)}
                      </span>
                    )}
                    <button onClick={() => removeItem(i)} style={{ background:'none', border:'none', color:'rgba(239,68,68,0.5)', cursor:'pointer', padding:'0 2px' }}><X size={14}/></button>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div style={{ marginTop:14, padding:'12px 16px', borderRadius:12, background:'rgba(74,222,128,0.06)', border:'1px solid rgba(74,222,128,0.2)' }}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                  <span style={{ fontSize:12, color:'rgba(255,255,255,0.45)' }}>Precio original</span>
                  <span style={{ fontSize:12, color:'rgba(255,255,255,0.45)', fontFamily:'monospace', textDecoration:'line-through' }}>${originalTotal.toFixed(2)}</span>
                </div>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                  <span style={{ fontSize:12, color:'#4ade80' }}>Ahorro del cliente</span>
                  <span style={{ fontSize:12, color:'#4ade80', fontFamily:'monospace' }}>−${savings.toFixed(2)}</span>
                </div>
                <div style={{ display:'flex', justifyContent:'space-between', borderTop:'1px solid rgba(74,222,128,0.2)', paddingTop:8, marginTop:4 }}>
                  <span style={{ fontSize:14, fontWeight:700, color:'#f1f5f9' }}>Precio del combo</span>
                  <span style={{ fontSize:16, fontWeight:700, color:'#4ade80', fontFamily:'monospace' }}>${total_price.toFixed(2)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Add products */}
          <div>
            <div style={{ fontSize:11, fontWeight:700, color:'rgba(255,255,255,0.4)', letterSpacing:'.08em', textTransform:'uppercase', marginBottom:10 }}>
              {items.length === 0 ? 'Selecciona los productos del combo' : 'Agregar más productos'}
            </div>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar platillo..."
              style={{ width:'100%', padding:'9px 14px', borderRadius:10, background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', color:'#f1f5f9', fontSize:13, outline:'none', marginBottom:10 }} />
            <div style={{ display:'flex', flexDirection:'column', gap:6, maxHeight:180, overflowY:'auto' }}>
              {filtered.slice(0, 20).map(d => (
                <button key={d.id} onClick={() => addDish(d)}
                  style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 14px', borderRadius:10, background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.06)', cursor:'pointer', textAlign:'left', transition:'all .15s' }}
                  onMouseEnter={e => (e.currentTarget.style.background='rgba(255,255,255,0.07)')}
                  onMouseLeave={e => (e.currentTarget.style.background='rgba(255,255,255,0.03)')}>
                  <span style={{ fontSize:18 }}>{d.emoji || '🍽️'}</span>
                  <span style={{ flex:1, fontSize:13, color:'#f1f5f9' }}>{d.name}</span>
                  <span style={{ fontSize:13, color:'rgba(255,255,255,0.4)', fontFamily:'monospace' }}>${d.price.toFixed(0)}</span>
                  <Plus size={14} style={{ color:'#c9963a', flexShrink:0 }} />
                </button>
              ))}
              {filtered.length === 0 && <p style={{ fontSize:12, color:'rgba(255,255,255,0.25)', textAlign:'center', padding:'16px 0' }}>Sin resultados</p>}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding:'16px 24px', borderTop:'1px solid rgba(255,255,255,0.06)', display:'flex', gap:10 }}>
          <button onClick={onClose} style={{ flex:1, padding:'11px', borderRadius:12, background:'rgba(255,255,255,0.06)', border:'none', color:'rgba(255,255,255,0.5)', fontSize:14, cursor:'pointer' }}>
            Cancelar
          </button>
          <button onClick={handleSave} disabled={saving || items.length < 2 || !name.trim()}
            style={{ flex:2, padding:'11px', borderRadius:12, background: items.length < 2 || !name.trim() ? 'rgba(201,150,58,0.3)' : '#c9963a', border:'none', color:'#07090f', fontSize:14, fontWeight:700, cursor: items.length < 2 || !name.trim() ? 'not-allowed' : 'pointer' }}>
            {saving ? 'Guardando…' : combo ? 'Guardar cambios' : 'Crear combo'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function CombosManagement({ dishes }: { dishes: Dish[] }) {
  const supabase = createClient();
  const [combos, setCombos] = useState<Combo[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCombo, setEditingCombo] = useState<Combo | null>(null);

  const fetchCombos = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('combos')
      .select('*')
      .eq('tenant_id', getTenantId())
      .order('created_at', { ascending: false });
    setCombos((data ?? []) as Combo[]);
    setLoading(false);
  }, [supabase]);

  useEffect(() => { fetchCombos(); }, [fetchCombos]);

  const handleSave = async (data: Omit<Combo, 'id'>) => {
    try {
      if (editingCombo) {
        const { error } = await supabase.from('combos').update({ ...data, updated_at: new Date().toISOString() }).eq('id', editingCombo.id);
        if (error) throw error;
        toast.success('Combo actualizado');
      } else {
        const { error } = await supabase.from('combos').insert([{ ...data, tenant_id: getTenantId() }]);
        if (error) throw error;
        toast.success('Combo creado');
      }
      setShowModal(false);
      setEditingCombo(null);
      fetchCombos();
    } catch (err: any) {
      toast.error('Error al guardar: ' + (err?.message ?? 'Intenta de nuevo'));
    }
  };

  const handleToggle = async (combo: Combo) => {
    await supabase.from('combos').update({ active: !combo.active }).eq('id', combo.id);
    fetchCombos();
  };

  const handleDelete = async (id: string) => {
    await supabase.from('combos').delete().eq('id', id);
    toast.success('Combo eliminado');
    fetchCombos();
  };

  const openEdit = (combo: Combo) => { setEditingCombo(combo); setShowModal(true); };
  const openNew  = () => { setEditingCombo(null); setShowModal(true); };

  return (
    <div>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
        <div>
          <h2 style={{ fontSize:16, fontWeight:700, color:'#f1f5f9', margin:0 }}>Combos y Promociones</h2>
          <p style={{ fontSize:12, color:'rgba(255,255,255,0.4)', margin:'4px 0 0' }}>
            Vende 2 o más productos juntos con descuento. El cliente ve el ahorro en tiempo real.
          </p>
        </div>
        <button onClick={openNew}
          style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 18px', borderRadius:12, background:'#c9963a', border:'none', color:'#07090f', fontSize:14, fontWeight:700, cursor:'pointer' }}>
          <Plus size={15} /> Nuevo combo
        </button>
      </div>

      {/* Empty state */}
      {!loading && combos.length === 0 && (
        <div style={{ textAlign:'center', padding:'60px 20px', borderRadius:20, background:'rgba(255,255,255,0.02)', border:'2px dashed rgba(255,255,255,0.08)' }}>
          <div style={{ fontSize:48, marginBottom:12 }}>🎁</div>
          <h3 style={{ color:'#f1f5f9', fontSize:16, fontWeight:700, marginBottom:8 }}>Sin combos todavía</h3>
          <p style={{ color:'rgba(255,255,255,0.4)', fontSize:13, marginBottom:20, maxWidth:320, margin:'0 auto 20px' }}>
            Crea tu primer combo: "Café + Croissant a mitad de precio", "2×1 en Tacos los martes", o lo que se te ocurra.
          </p>
          <button onClick={openNew}
            style={{ padding:'10px 24px', borderRadius:12, background:'#c9963a', border:'none', color:'#07090f', fontSize:14, fontWeight:700, cursor:'pointer' }}>
            + Crear primer combo
          </button>
        </div>
      )}

      {/* Combos grid */}
      {combos.length > 0 && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(300px, 1fr))', gap:14 }}>
          {combos.map(combo => {
            const pctOff = combo.savings > 0 && (combo.total_price + combo.savings) > 0
              ? Math.round((combo.savings / (combo.total_price + combo.savings)) * 100)
              : 0;
            return (
              <div key={combo.id}
                style={{ borderRadius:16, background:'rgba(255,255,255,0.03)', border:`1px solid ${combo.active ? 'rgba(201,150,58,0.2)' : 'rgba(255,255,255,0.06)'}`, overflow:'hidden', opacity: combo.active ? 1 : 0.55 }}>
                {/* Card header */}
                <div style={{ padding:'16px 18px 12px', borderBottom:'1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ display:'flex', alignItems:'flex-start', gap:10, marginBottom:8 }}>
                    <span style={{ fontSize:28 }}>{combo.emoji}</span>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:15, fontWeight:700, color:'#f1f5f9' }}>{combo.name}</div>
                      {combo.description && <div style={{ fontSize:11, color:'rgba(255,255,255,0.35)', marginTop:2 }}>{combo.description}</div>}
                    </div>
                    {pctOff > 0 && (
                      <span style={{ background:'rgba(74,222,128,0.15)', color:'#4ade80', fontSize:11, fontWeight:700, padding:'3px 8px', borderRadius:8, flexShrink:0 }}>
                        −{pctOff}%
                      </span>
                    )}
                  </div>
                  {/* Items list */}
                  <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
                    {combo.items.map((item, i) => (
                      <div key={i} style={{ display:'flex', alignItems:'center', gap:6, fontSize:12 }}>
                        <span>{item.emoji}</span>
                        <span style={{ flex:1, color:'rgba(255,255,255,0.65)' }}>{item.qty > 1 ? `${item.qty}× ` : ''}{item.name}</span>
                        {item.discount_pct > 0 && (
                          <span style={{ color:'#c9963a', fontSize:10, fontWeight:700 }}>−{item.discount_pct}%</span>
                        )}
                        <span style={{ color:'rgba(255,255,255,0.45)', fontFamily:'monospace' }}>${item.final_price.toFixed(0)}</span>
                      </div>
                    ))}
                  </div>
                </div>
                {/* Card footer */}
                <div style={{ padding:'12px 18px', display:'flex', alignItems:'center', gap:8 }}>
                  <div style={{ flex:1 }}>
                    <span style={{ fontSize:18, fontWeight:800, color:'#f1f5f9', fontFamily:'monospace' }}>
                      ${combo.total_price.toFixed(2)}
                    </span>
                    {combo.savings > 0 && (
                      <span style={{ fontSize:11, color:'#4ade80', marginLeft:6 }}>
                        El cliente ahorra ${combo.savings.toFixed(0)}
                      </span>
                    )}
                  </div>
                  <button onClick={() => handleToggle(combo)} title={combo.active ? 'Desactivar' : 'Activar'}
                    style={{ background:'none', border:'none', cursor:'pointer', color: combo.active ? '#f59e0b' : 'rgba(255,255,255,0.3)' }}>
                    {combo.active ? <ToggleRight size={22}/> : <ToggleLeft size={22}/>}
                  </button>
                  <button onClick={() => openEdit(combo)}
                    style={{ width:30, height:30, borderRadius:8, background:'rgba(255,255,255,0.06)', border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'rgba(255,255,255,0.5)' }}>
                    <Edit2 size={13}/>
                  </button>
                  <button onClick={() => handleDelete(combo.id)}
                    style={{ width:30, height:30, borderRadius:8, background:'rgba(239,68,68,0.08)', border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'rgba(239,68,68,0.6)' }}>
                    <Trash2 size={13}/>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <ComboModal
          combo={editingCombo}
          dishes={dishes}
          onClose={() => { setShowModal(false); setEditingCombo(null); }}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
