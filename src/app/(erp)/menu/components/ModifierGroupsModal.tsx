'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { getCurrentTenantId as getTenantId } from '@/lib/tenantStore';
import { toast } from 'sonner';
import { Plus, Trash2, GripVertical, X, ChevronDown, ChevronUp } from 'lucide-react';

interface Ingredient { id: string; name: string; unit: string; }
interface ModOptionIngredient { ingredient_id: string; qty_delta: number; }
interface ModOption {
  id: string; name: string; price_delta: number;
  is_default: boolean; ingredient_id: string | null;
  qty_delta: number; sort_order: number;
  extra_ingredients?: ModOptionIngredient[];
}
interface ModGroup {
  id: string; name: string; min_select: number;
  max_select: number; sort_order: number;
  options: ModOption[];
}
interface Dish { id: string; name: string; }

const S = {
  bg: '#0f1923', bg2: '#1a2535', border: '1px solid rgba(255,255,255,0.08)',
  text: '#f1f5f9', muted: 'rgba(241,245,249,0.45)', danger: '#f87171', gold: '#f59e0b',
};

function Inp({ value, onChange, placeholder, type = 'text', small }: any) {
  return (
    <input type={type} value={value} onChange={onChange} placeholder={placeholder}
      style={{ background: S.bg, border: S.border, borderRadius: 8, color: S.text,
        padding: small ? '5px 10px' : '8px 12px', fontSize: 13, outline: 'none', width: '100%',
        fontFamily: type === 'number' ? 'monospace' : 'inherit' }} />
  );
}

export default function ModifierGroupsModal({ dish, onClose }: { dish: Dish; onClose: () => void }) {
  const supabase = createClient();
  const [groups, setGroups] = useState<ModGroup[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: grps }, { data: ings }, { data: optIngs }] = await Promise.all([
      supabase.from('modifier_groups')
        .select('*, modifier_options(*)')
        .eq('dish_id', dish.id).eq('tenant_id', getTenantId())
        .order('sort_order'),
      supabase.from('ingredients')
        .select('id, name, unit').eq('tenant_id', getTenantId()).order('name'),
      supabase.from('modifier_option_ingredients')
        .select('option_id, ingredient_id, qty_delta').eq('tenant_id', getTenantId()),
    ]);
    const optIngMap: Record<string, ModOptionIngredient[]> = {};
    (optIngs ?? []).forEach((oi: any) => {
      if (!optIngMap[oi.option_id]) optIngMap[oi.option_id] = [];
      optIngMap[oi.option_id].push({ ingredient_id: oi.ingredient_id, qty_delta: oi.qty_delta });
    });
    setGroups((grps ?? []).map((g: any) => ({
      ...g,
      options: (g.modifier_options ?? [])
        .sort((a: any, b: any) => a.sort_order - b.sort_order)
        .map((o: any) => ({ ...o, extra_ingredients: optIngMap[o.id] ?? [] })),
    })));
    setIngredients(ings ?? []);
    setLoading(false);
  }, [dish.id, supabase]);

  useEffect(() => { load(); }, [load]);

  // ── Group helpers ─────────────────────────────────────────────────────────
  function addGroup() {
    const tempId = 'new-' + Date.now();
    setGroups(prev => [...prev, {
      id: tempId, name: '', min_select: 0, max_select: 1, sort_order: prev.length, options: [],
    }]);
  }

  function updateGroup(id: string, patch: Partial<ModGroup>) {
    setGroups(prev => prev.map(g => g.id === id ? { ...g, ...patch } : g));
  }

  async function deleteGroup(id: string) {
    if (!id.startsWith('new-')) {
      await supabase.from('modifier_groups').delete().eq('id', id);
    }
    setGroups(prev => prev.filter(g => g.id !== id));
  }

  // ── Option helpers ────────────────────────────────────────────────────────
  function addOption(groupId: string) {
    setGroups(prev => prev.map(g => g.id === groupId ? {
      ...g,
      options: [...g.options, {
        id: 'new-' + Date.now(), name: '', price_delta: 0,
        is_default: false, ingredient_id: null, qty_delta: 0,
        sort_order: g.options.length, extra_ingredients: [],
      }],
    } : g));
  }

  function updateOption(groupId: string, optId: string, patch: Partial<ModOption>) {
    setGroups(prev => prev.map(g => g.id === groupId ? {
      ...g, options: g.options.map(o => o.id === optId ? { ...o, ...patch } : o),
    } : g));
  }

  function deleteOption(groupId: string, optId: string) {
    setGroups(prev => prev.map(g => g.id === groupId ? {
      ...g, options: g.options.filter(o => o.id !== optId),
    } : g));
  }

  // ── Save ─────────────────────────────────────────────────────────────────
  async function handleSave() {
    for (const g of groups) {
      if (!g.name.trim()) { toast.error('Todos los grupos necesitan un nombre'); return; }
    }
    setSaving(true);
    try {
      // Track all saved option IDs per group to clean up removed ones
      const savedOptionIdsByGroup: Record<string, string[]> = {};

      for (let gi = 0; gi < groups.length; gi++) {
        const g = groups[gi];
        let groupId = g.id;

        // 1. Upsert group
        if (g.id.startsWith('new-')) {
          const { data, error } = await supabase.from('modifier_groups').insert({
            dish_id: dish.id, tenant_id: getTenantId(),
            name: g.name.trim(), min_select: g.min_select,
            max_select: g.max_select, sort_order: gi,
          }).select('id').single();
          if (error) throw new Error('Grupo: ' + error.message);
          groupId = data.id;
        } else {
          const { error } = await supabase.from('modifier_groups').update({
            name: g.name.trim(), min_select: g.min_select,
            max_select: g.max_select, sort_order: gi, updated_at: new Date().toISOString(),
          }).eq('id', groupId);
          if (error) throw new Error('Grupo update: ' + error.message);
        }

        savedOptionIdsByGroup[groupId] = [];

        // 2. Upsert each option
        for (let oi = 0; oi < g.options.length; oi++) {
          const o = g.options[oi];
          const payload = {
            group_id: groupId, tenant_id: getTenantId(),
            name: o.name.trim() || 'Opción',
            price_delta: Number(o.price_delta) || 0,
            is_default: o.is_default,
            ingredient_id: o.ingredient_id || null,
            qty_delta: Number(o.qty_delta) || 0,
            sort_order: oi,
          };

          let optionId: string;
          if (o.id.startsWith('new-')) {
            const { data: newOpt, error } = await supabase
              .from('modifier_options').insert(payload).select('id').single();
            if (error) throw new Error('Opción insert: ' + error.message);
            optionId = newOpt.id;
          } else {
            const { error } = await supabase.from('modifier_options')
              .update(payload).eq('id', o.id);
            if (error) throw new Error('Opción update: ' + error.message);
            optionId = o.id;
          }

          savedOptionIdsByGroup[groupId].push(optionId);

          // 3. Save extra ingredients
          await supabase.from('modifier_option_ingredients').delete().eq('option_id', optionId);
          const extras = (o.extra_ingredients ?? []).filter(ei => ei.ingredient_id && ei.qty_delta > 0);
          if (extras.length > 0) {
            await supabase.from('modifier_option_ingredients').insert(
              extras.map((ei, idx) => ({
                option_id: optionId, tenant_id: getTenantId(),
                ingredient_id: ei.ingredient_id, qty_delta: ei.qty_delta, sort_order: idx,
              }))
            );
          }
        }

        // 4. Delete options removed from UI (only those that existed in DB before)
        const savedIds = savedOptionIdsByGroup[groupId];
        if (savedIds.length > 0) {
          await supabase.from('modifier_options')
            .delete().eq('group_id', groupId)
            .not('id', 'in', `(${savedIds.join(',')})`);
        } else if (!g.id.startsWith('new-')) {
          // Group existed but now has no options → delete all its options
          await supabase.from('modifier_options').delete().eq('group_id', groupId);
        }
      }

      toast.success('Modificadores guardados');
      onClose(); // ← cierra automáticamente al guardar
    } catch (e: any) {
      toast.error('Error: ' + e.message);
    }
    setSaving(false);
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9000, background: 'rgba(0,0,0,0.75)',
      display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
      padding: '24px 16px', overflowY: 'auto' }}>
      <div style={{ background: S.bg, borderRadius: 20, width: '100%', maxWidth: 780,
        border: S.border, marginTop: 20 }}>

        {/* Header */}
        <div style={{ padding: '20px 28px', borderBottom: S.border,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h3 style={{ fontSize: 17, fontWeight: 700, color: S.text, margin: 0 }}>
              Modificadores — {dish.name}
            </h3>
            <p style={{ fontSize: 12, color: S.muted, margin: '3px 0 0' }}>
              Opciones que el cliente puede elegir al pedir este platillo
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: S.muted, cursor: 'pointer', padding: 4 }}>
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '20px 28px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {loading ? (
            <div style={{ textAlign: 'center', color: S.muted, padding: 32 }}>Cargando…</div>
          ) : groups.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 0' }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>⊕</div>
              <p style={{ color: S.muted, fontSize: 13 }}>Sin modificadores. Agrega un grupo para empezar.</p>
            </div>
          ) : groups.map((g) => {
            const isCol = collapsed.has(g.id);
            return (
              <div key={g.id} style={{ background: S.bg2, borderRadius: 14, border: S.border, overflow: 'hidden' }}>

                {/* Group header */}
                <div style={{ padding: '14px 18px', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <GripVertical size={14} color={S.muted} style={{ marginTop: 3, flexShrink: 0 }} />
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <input value={g.name}
                      onChange={e => updateGroup(g.id, { name: e.target.value })}
                      placeholder="Nombre del grupo — ej: Tipo de Leche, Término, Acompañamiento"
                      style={{ background: S.bg, border: S.border, borderRadius: 8, color: S.text,
                        padding: '8px 12px', fontSize: 14, outline: 'none', width: '100%' }} />
                    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 12, color: S.muted }}>
                        <input type="checkbox" checked={g.min_select > 0}
                          onChange={e => updateGroup(g.id, { min_select: e.target.checked ? 1 : 0 })}
                          style={{ accentColor: S.gold }} />
                        Obligatorio
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 12, color: S.muted }}>
                        <input type="checkbox" checked={g.max_select > 1}
                          onChange={e => updateGroup(g.id, { max_select: e.target.checked ? 99 : 1 })}
                          style={{ accentColor: S.gold }} />
                        Selección múltiple
                      </label>
                      {g.max_select > 1 && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: S.muted }}>
                          <span>Máx.</span>
                          <input type="number" min={1} max={20}
                            value={g.max_select === 99 ? '' : g.max_select} placeholder="∞"
                            onChange={e => updateGroup(g.id, { max_select: parseInt(e.target.value) || 99 })}
                            style={{ width: 50, background: S.bg, border: S.border, borderRadius: 6,
                              color: S.text, padding: '3px 8px', fontSize: 12, outline: 'none', textAlign: 'center' }} />
                        </div>
                      )}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    <button onClick={() => setCollapsed(prev => {
                      const n = new Set(prev); isCol ? n.delete(g.id) : n.add(g.id); return n;
                    })} style={{ background: 'none', border: 'none', color: S.muted, cursor: 'pointer', padding: 4 }}>
                      {isCol ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                    </button>
                    <button onClick={() => deleteGroup(g.id)}
                      style={{ background: 'none', border: 'none', color: S.danger, cursor: 'pointer', padding: 4 }}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* Options */}
                {!isCol && (
                  <div style={{ borderTop: S.border }}>
                    {/* Column headers */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px 72px 1fr 32px',
                      gap: 8, padding: '8px 18px 4px', fontSize: 10, fontWeight: 600,
                      color: S.muted, letterSpacing: '.05em', textTransform: 'uppercase' }}>
                      <span>Opción</span>
                      <span style={{ textAlign: 'right' }}>+Precio</span>
                      <span style={{ textAlign: 'center' }}>Default</span>
                      <span>Ingredientes del inventario</span>
                      <span />
                    </div>

                    {g.options.map(o => (
                      <div key={o.id} style={{ display: 'grid',
                        gridTemplateColumns: '1fr 100px 72px 1fr 32px',
                        gap: 8, padding: '8px 18px', alignItems: 'start',
                        borderTop: '1px solid rgba(255,255,255,0.04)' }}>

                        {/* Name */}
                        <Inp value={o.name} small
                          onChange={(e: any) => updateOption(g.id, o.id, { name: e.target.value })}
                          placeholder="Nombre de la opción" />

                        {/* Price */}
                        <div style={{ position: 'relative' }}>
                          <span style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)',
                            fontSize: 11, color: S.muted, pointerEvents: 'none' }}>$</span>
                          <input type="number" value={o.price_delta} step={0.5}
                            onChange={e => updateOption(g.id, o.id, { price_delta: parseFloat(e.target.value) || 0 })}
                            style={{ background: S.bg, border: S.border, borderRadius: 8, color: S.text,
                              padding: '5px 8px 5px 20px', fontSize: 12, outline: 'none',
                              width: '100%', fontFamily: 'monospace', textAlign: 'right' }} />
                        </div>

                        {/* Default */}
                        <div style={{ textAlign: 'center', paddingTop: 6 }}>
                          <input
                            type={g.max_select === 1 ? 'radio' : 'checkbox'}
                            name={`default-${g.id}`}
                            checked={o.is_default}
                            onChange={() => {
                              if (g.max_select === 1) {
                                setGroups(prev => prev.map(grp => grp.id !== g.id ? grp : {
                                  ...grp, options: grp.options.map(op => ({ ...op, is_default: op.id === o.id }))
                                }));
                              } else {
                                updateOption(g.id, o.id, { is_default: !o.is_default });
                              }
                            }}
                            style={{ accentColor: S.gold, cursor: 'pointer' }} />
                        </div>

                        {/* Ingredients */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                          {/* Primary ingredient */}
                          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                            <select value={o.ingredient_id ?? ''}
                              onChange={e => updateOption(g.id, o.id, {
                                ingredient_id: e.target.value || null,
                                qty_delta: e.target.value ? (o.qty_delta || 0) : 0
                              })}
                              style={{ background: S.bg, border: S.border, borderRadius: 6,
                                color: o.ingredient_id ? S.text : S.muted,
                                padding: '4px 8px', fontSize: 12, outline: 'none', flex: 1, minWidth: 0 }}>
                              <option value="">Sin ingrediente</option>
                              {ingredients.map(i => <option key={i.id} value={i.id}>{i.name} ({i.unit})</option>)}
                            </select>
                            {o.ingredient_id && (
                              <input type="number" min={0} step={0.01} value={o.qty_delta}
                                onChange={e => updateOption(g.id, o.id, { qty_delta: parseFloat(e.target.value) || 0 })}
                                style={{ background: S.bg, border: S.border, borderRadius: 6, color: S.text,
                                  padding: '4px 6px', fontSize: 11, outline: 'none', width: 56,
                                  fontFamily: 'monospace', textAlign: 'right', flexShrink: 0 }} />
                            )}
                          </div>

                          {/* Extra ingredients */}
                          {(o.extra_ingredients ?? []).map((ei, eiIdx) => (
                            <div key={eiIdx} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                              <select value={ei.ingredient_id}
                                onChange={e => {
                                  const updated = [...(o.extra_ingredients ?? [])];
                                  updated[eiIdx] = { ...ei, ingredient_id: e.target.value };
                                  updateOption(g.id, o.id, { extra_ingredients: updated });
                                }}
                                style={{ background: S.bg, border: S.border, borderRadius: 6, color: S.text,
                                  padding: '4px 8px', fontSize: 12, outline: 'none', flex: 1, minWidth: 0 }}>
                                <option value="">— ingrediente —</option>
                                {ingredients.map(i => <option key={i.id} value={i.id}>{i.name} ({i.unit})</option>)}
                              </select>
                              <input type="number" min={0} step={0.01} value={ei.qty_delta}
                                onChange={e => {
                                  const updated = [...(o.extra_ingredients ?? [])];
                                  updated[eiIdx] = { ...ei, qty_delta: parseFloat(e.target.value) || 0 };
                                  updateOption(g.id, o.id, { extra_ingredients: updated });
                                }}
                                style={{ background: S.bg, border: S.border, borderRadius: 6, color: S.text,
                                  padding: '4px 6px', fontSize: 11, outline: 'none', width: 56,
                                  fontFamily: 'monospace', textAlign: 'right', flexShrink: 0 }} />
                              <button onClick={() => {
                                const updated = (o.extra_ingredients ?? []).filter((_, i) => i !== eiIdx);
                                updateOption(g.id, o.id, { extra_ingredients: updated });
                              }} style={{ background: 'none', border: 'none', color: S.danger, cursor: 'pointer', padding: 2, flexShrink: 0 }}>
                                <X size={11} />
                              </button>
                            </div>
                          ))}

                          {/* Add extra ingredient */}
                          <button onClick={() => updateOption(g.id, o.id, {
                            extra_ingredients: [...(o.extra_ingredients ?? []), { ingredient_id: '', qty_delta: 0 }]
                          })} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11,
                            color: 'rgba(245,158,11,0.55)', background: 'none', border: 'none',
                            cursor: 'pointer', padding: 0, marginTop: 1 }}>
                            <Plus size={10} /> + ingrediente
                          </button>
                        </div>

                        {/* Delete option */}
                        <button onClick={() => deleteOption(g.id, o.id)}
                          style={{ background: 'none', border: 'none', color: S.danger, cursor: 'pointer', padding: 4, paddingTop: 6 }}>
                          <X size={13} />
                        </button>
                      </div>
                    ))}

                    <div style={{ padding: '10px 18px 14px' }}>
                      <button onClick={() => addOption(g.id)}
                        style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13,
                          color: S.gold, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                        <Plus size={14} /> Agregar opción
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          <button onClick={addGroup}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              padding: '13px', borderRadius: 12, border: `1px dashed rgba(245,158,11,0.3)`,
              background: 'rgba(245,158,11,0.04)', color: S.gold, fontSize: 13,
              cursor: 'pointer', fontWeight: 500 }}>
            <Plus size={15} /> Agregar grupo de modificadores
          </button>
        </div>

        {/* Footer */}
        <div style={{ padding: '16px 28px', borderTop: S.border,
          display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={onClose}
            style={{ padding: '10px 22px', borderRadius: 10, border: S.border,
              background: 'transparent', color: S.muted, fontSize: 13, cursor: 'pointer' }}>
            Cancelar
          </button>
          <button onClick={handleSave} disabled={saving}
            style={{ padding: '10px 26px', borderRadius: 10, border: 'none',
              background: saving ? 'rgba(245,158,11,0.4)' : S.gold,
              color: '#0a0c10', fontSize: 13, fontWeight: 700,
              cursor: saving ? 'wait' : 'pointer' }}>
            {saving ? 'Guardando…' : 'Guardar modificadores'}
          </button>
        </div>
      </div>
    </div>
  );
}
