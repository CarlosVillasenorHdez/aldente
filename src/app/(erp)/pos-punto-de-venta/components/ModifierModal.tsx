'use client';

/**
 * ModifierModal — per-item customization when adding a dish to an order.
 *
 * Each recipe ingredient can be:
 *   - Normal (included as-is)
 *   - Excluded "sin X" (not included, not deducted from inventory)
 *   - Extra "+X"  (double portion, deducts 2× from inventory)
 *   - Required 🔒 (cannot be removed — core ingredient)
 *
 * Multiple variations of the same dish can be added as separate lines.
 */

import React, { useState, useEffect } from 'react';
import { getCurrentTenantId as getTenantId } from '@/lib/tenantStore';
import { X, Minus, Plus, Lock } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface ModGroup {
  id: string; name: string; min_select: number; max_select: number; sort_order: number;
  options: { id: string; name: string; price_delta: number; is_default: boolean;
    ingredient_id: string | null; qty_delta: number;
    extra_ingredients?: { ingredient_id: string; qty_delta: number }[];
  }[];
}

interface RecipeIngredient {
  id: string;
  name: string;
  unit: string;
  quantity: number;
  isRequired: boolean;
}

interface MenuItem {
  id: string;
  name: string;
  price: number;
  emoji?: string;
}

interface ModifierModalProps {
  item: MenuItem;
  onConfirm: (lines: ModifierLine[]) => void;
  onCancel: () => void;
}

export interface ModifierLine {
  qty: number;
  excluded: string[];
  excludedIds: string[];
  extras: ExtraIngredient[];
  note: string;
  modifier: string;
  selectedOptions?: { groupId: string; optionId: string; name: string; price_delta: number; ingredient_id: string | null; qty_delta: number; }[];
}

export interface ExtraIngredient {
  ingredientId: string;
  name: string;
  quantity: number;   // extra quantity (on top of base recipe)
  unit: string;
}

type IngredientState = 'normal' | 'excluded' | 'extra';

const QUICK_NOTES = [
  'Sin sal', 'Poco picante', 'Muy picante', 'Sin hielo',
  'Bien cocido', 'Término medio', 'Sin salsa', 'Extra salsa',
];

export default function ModifierModal({ item, onConfirm, onCancel }: ModifierModalProps) {
  const supabase = createClient();
  const [modGroups, setModGroups] = useState<ModGroup[]>([]);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string[]>>({}); // groupId → optionIds[]
  const [recipe, setRecipe] = useState<RecipeIngredient[]>([]);
  const [loadingRecipe, setLoadingRecipe] = useState(true);

  // ingState[rowIdx][ingredientId] = 'normal' | 'excluded' | 'extra'
  const [ingStates, setIngStates] = useState<Record<number, Record<string, IngredientState>>>({});
  const [rows, setRows] = useState([{ qty: 1, note: '' }]);
  const [expandedRow, setExpandedRow] = useState<number | null>(null);

  useEffect(() => {
    // Load modifier groups
    Promise.all([
      supabase.from('modifier_groups')
        .select('*, modifier_options(*)')
        .eq('dish_id', item.id).eq('tenant_id', getTenantId())
        .order('sort_order'),
      supabase.from('modifier_option_ingredients')
        .select('option_id, ingredient_id, qty_delta')
        .eq('tenant_id', getTenantId()),
    ]).then(([{ data }, { data: optIngs }]) => {
        const optIngMap: Record<string, { ingredient_id: string; qty_delta: number }[]> = {};
        (optIngs ?? []).forEach((oi: any) => {
          if (!optIngMap[oi.option_id]) optIngMap[oi.option_id] = [];
          optIngMap[oi.option_id].push({ ingredient_id: oi.ingredient_id, qty_delta: oi.qty_delta });
        });
        const grps = (data ?? []).map((g: any) => ({
          ...g,
          options: (g.modifier_options ?? [])
            .sort((a: any, b: any) => a.sort_order - b.sort_order)
            .map((o: any) => ({ ...o, extra_ingredients: optIngMap[o.id] ?? [] })),
        }));
        setModGroups(grps);
        // Pre-select defaults
        const defaults: Record<string, string[]> = {};
        grps.forEach((g: ModGroup) => {
          const def = g.options.filter(o => o.is_default).map(o => o.id);
          if (def.length > 0) defaults[g.id] = def;
        });
        setSelectedOptions(defaults);
      });

    supabase
      .from('dish_recipes')
      .select('ingredient_id, quantity, unit, is_required, ingredients(name, unit)')
        .eq('tenant_id', getTenantId())
      .eq('dish_id', item.id)
      .then(({ data }) => {
        if (data && data.length > 0) {
          setRecipe(data.map((r: Record<string, unknown>) => {
            const ing = r.ingredients as { name: string; unit: string } | null;
            return {
              id: r.ingredient_id as string,
              name: ing?.name ?? '',
              unit: (r.unit as string) || ing?.unit || '',
              quantity: Number(r.quantity),
              isRequired: Boolean(r.is_required),
            };
          }));
        }
        setLoadingRecipe(false);
      });
  }, [item.id]);

  function getIngState(rowIdx: number, ingId: string): IngredientState {
    return ingStates[rowIdx]?.[ingId] ?? 'normal';
  }

  function cycleIngState(rowIdx: number, ing: RecipeIngredient) {
    if (ing.isRequired) return; // locked — cannot change
    setIngStates(prev => {
      const rowStates = prev[rowIdx] ?? {};
      const current = rowStates[ing.id] ?? 'normal';
      const next: IngredientState =
        current === 'normal'   ? 'excluded' :
        current === 'excluded' ? 'extra'    : 'normal';
      return { ...prev, [rowIdx]: { ...rowStates, [ing.id]: next } };
    });
  }

  function addRow() {
    const newIdx = rows.length;
    setRows(prev => [...prev, { qty: 1, note: '' }]);
    setIngStates(prev => ({ ...prev, [newIdx]: {} }));
    setExpandedRow(newIdx);
  }

  function removeRow(idx: number) {
    setRows(prev => prev.filter((_, i) => i !== idx));
    setIngStates(prev => {
      const next = { ...prev };
      delete next[idx];
      return next;
    });
  }

  function updateQty(idx: number, delta: number) {
    setRows(prev => prev.map((r, i) => i === idx
      ? { ...r, qty: Math.max(1, Math.min(20, r.qty + delta)) }
      : r
    ));
  }

  function updateNote(idx: number, note: string) {
    setRows(prev => prev.map((r, i) => i === idx ? { ...r, note } : r));
  }


  function appendQuickNote(idx: number, note: string) {
    setRows(prev => prev.map((r, i) => {
      if (i !== idx) return r;
      const existing = r.note.trim();
      return { ...r, note: existing ? `${existing}, ${note}` : note };
    }));
  }

  function buildLine(rowIdx: number, row: { qty: number; note: string }): ModifierLine {
    const states = ingStates[rowIdx] ?? {};
    const excluded: string[] = [];
    const excludedIds: string[] = [];
    const extras: ExtraIngredient[] = [];
    const modParts: string[] = [];

    for (const ing of recipe) {
      const state = states[ing.id] ?? 'normal';
      if (state === 'excluded') {
        excluded.push(ing.name);
        excludedIds.push(ing.id);
      } else if (state === 'extra') {
        extras.push({ ingredientId: ing.id, name: ing.name, quantity: ing.quantity, unit: ing.unit });
      }
    }

    if (excluded.length > 0) modParts.push(`Sin: ${excluded.join(', ')}`);
    if (extras.length > 0) modParts.push(`Extra: ${extras.map(e => e.name).join(', ')}`);
    if (row.note.trim()) modParts.push(row.note.trim());

    // Build selectedOptions from modifier group selections
    const chosenOptions = (Object.entries(selectedOptions) as [string, string[]][]).flatMap(([gid, oids]) =>
      oids.map(oid => {
        const grp = modGroups.find(g => g.id === gid);
        const opt = grp?.options.find(o => o.id === oid);
        if (!opt) return null;
        // NOTE: do NOT add to modParts — OrderPanel renders options separately
        // to avoid double display in the order list and KDS
        return {
          groupId: gid, optionId: oid,
          name: opt.name, price_delta: opt.price_delta,
          ingredient_id: opt.ingredient_id, qty_delta: opt.qty_delta,
          extra_ingredients: opt.extra_ingredients ?? [],
        };
      }).filter(Boolean)
    ) as { groupId: string; optionId: string; name: string; price_delta: number; ingredient_id: string | null; qty_delta: number; }[];

    return {
      qty: row.qty, excluded, excludedIds, extras,
      note: row.note, modifier: modParts.join(' — '),
      selectedOptions: chosenOptions.length > 0 ? chosenOptions : undefined,
    };
  }

  function handleConfirm() {
    const lines = rows.filter(r => r.qty > 0).map((r, idx) => buildLine(idx, r));
    onConfirm(lines);
  }

  const totalQty = rows.reduce((s, r) => s + r.qty, 0);

  // Style helpers
  const s = {
    overlay: { position:'fixed' as const, inset:0, zIndex:9999, background:'rgba(0,0,0,0.75)', backdropFilter:'blur(6px)', display:'flex', alignItems:'center', justifyContent:'center', padding:'16px' },
    modal: { background:'#141c2b', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'22px', width:'100%', maxWidth:'460px', maxHeight:'90svh', display:'flex', flexDirection:'column' as const, overflow:'hidden', boxShadow:'0 24px 64px rgba(0,0,0,0.6)' },
    header: { padding:'20px 20px 16px', borderBottom:'1px solid rgba(255,255,255,0.07)', display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:'12px' },
    body: { flex:1, overflowY:'auto' as const, padding:'16px 20px', display:'flex', flexDirection:'column' as const, gap:'10px' },
    footer: { padding:'14px 20px', borderTop:'1px solid rgba(255,255,255,0.07)', display:'flex', gap:'10px' },
    rowBox: { background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:'14px', overflow:'hidden' },
    rowHead: { display:'flex', alignItems:'center', gap:'8px', padding:'12px 14px', cursor:'pointer' },
    iconBtn: { background:'rgba(255,255,255,0.08)', border:'none', borderRadius:'8px', width:'30px', height:'30px', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', color:'rgba(255,255,255,0.7)', flexShrink:0 as const },
  };

  function ingBtnStyle(state: IngredientState, isRequired: boolean) {
    if (isRequired) return { padding:'7px 12px', borderRadius:'8px', border:'1px solid rgba(255,255,255,0.08)', background:'rgba(255,255,255,0.04)', color:'rgba(255,255,255,0.3)', fontSize:'12px', cursor:'not-allowed' as const, display:'flex', alignItems:'center', gap:'5px' };
    if (state === 'excluded') return { padding:'7px 12px', borderRadius:'8px', border:'1px solid rgba(239,68,68,0.35)', background:'rgba(239,68,68,0.12)', color:'#f87171', fontSize:'12px', cursor:'pointer' as const, display:'flex', alignItems:'center', gap:'5px', textDecoration:'line-through' as const };
    if (state === 'extra') return { padding:'7px 12px', borderRadius:'8px', border:'1px solid rgba(245,158,11,0.4)', background:'rgba(245,158,11,0.12)', color:'#fbbf24', fontSize:'12px', cursor:'pointer' as const, display:'flex', alignItems:'center', gap:'5px', fontWeight:600 };
    return { padding:'7px 12px', borderRadius:'8px', border:'1px solid rgba(255,255,255,0.1)', background:'transparent', color:'rgba(255,255,255,0.6)', fontSize:'12px', cursor:'pointer' as const, display:'flex', alignItems:'center', gap:'5px' };
  }

  function ingBtnLabel(state: IngredientState, name: string, isRequired: boolean) {
    if (isRequired) return <><Lock size={10} />{name}</>;
    if (state === 'excluded') return <><X size={10} />Sin {name}</>;
    if (state === 'extra') return <>+{name}</>;
    return <>{name}</>;
  }

  return (
    <div style={s.overlay} onClick={e => e.target === e.currentTarget && onCancel()}>
      <div style={s.modal}>
        {/* Header */}
        <div style={s.header}>
          <div style={{flex:1}}>
            <div style={{display:'flex', alignItems:'center', gap:'10px', marginBottom:'4px'}}>
              {item.emoji && <span style={{fontSize:'22px'}}>{item.emoji}</span>}
              <span style={{fontSize:'17px', fontWeight:600, color:'#f1f5f9', lineHeight:1.2}}>{item.name}</span>
            </div>
            <div style={{display:'flex', alignItems:'center', gap:'12px'}}>
              <span style={{fontSize:'13px', color:'rgba(255,255,255,0.4)'}}>${item.price.toFixed(2)} c/u</span>
              <span style={{fontSize:'13px', color:'rgba(255,255,255,0.25)'}}>·</span>
              <span style={{fontSize:'13px', color:'#f59e0b', fontWeight:500}}>{totalQty} en total</span>
            </div>
          </div>
          <button onClick={onCancel} style={s.iconBtn}><X size={16}/></button>
        </div>

        {/* ── Modifier Groups — obligatorios y opcionales ─────────────────── */}
        {modGroups.length > 0 && (
          <div style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '14px 20px 10px' }}>
            {modGroups.map(g => {
              const isRequired = g.min_select > 0;
              const isMulti = g.max_select > 1;
              const sel = selectedOptions[g.id] ?? [];
              return (
                <div key={g.id} style={{ marginBottom: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: '#f1f5f9' }}>{g.name}</span>
                    {isRequired && (
                      <span style={{ fontSize: 10, fontWeight: 600, padding: '1px 6px', borderRadius: 10,
                        background: 'rgba(248,113,113,0.15)', color: '#f87171' }}>Requerido</span>
                    )}
                    {!isRequired && (
                      <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>Opcional</span>
                    )}
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {g.options.map(opt => {
                      const active = sel.includes(opt.id);
                      return (
                        <button key={opt.id}
                          onClick={() => {
                            setSelectedOptions(prev => {
                              const current = prev[g.id] ?? [];
                              if (isMulti) {
                                // checkbox: toggle
                                const next = current.includes(opt.id)
                                  ? current.filter(id => id !== opt.id)
                                  : current.length < g.max_select
                                    ? [...current, opt.id]
                                    : current;
                                return { ...prev, [g.id]: next };
                              } else {
                                // radio: select only this one (click again = deselect if optional)
                                return { ...prev, [g.id]: current[0] === opt.id && !isRequired ? [] : [opt.id] };
                              }
                            });
                          }}
                          style={{
                            padding: '6px 14px', borderRadius: 20, fontSize: 12, cursor: 'pointer',
                            border: `1px solid ${active ? 'rgba(245,158,11,0.6)' : 'rgba(255,255,255,0.12)'}`,
                            background: active ? 'rgba(245,158,11,0.15)' : 'rgba(255,255,255,0.04)',
                            color: active ? '#f59e0b' : 'rgba(255,255,255,0.55)',
                            fontWeight: active ? 600 : 400, transition: 'all .12s',
                          }}>
                          {opt.name}
                          {opt.price_delta !== 0 && (
                            <span style={{ marginLeft: 4, fontSize: 11, opacity: 0.8 }}>
                              {opt.price_delta > 0 ? '+' : ''}{opt.price_delta < 0 ? '-' : ''}${Math.abs(opt.price_delta)}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Legend */}
        {recipe.length > 0 && (
          <div style={{padding:'10px 20px 0', display:'flex', gap:'14px', flexWrap:'wrap' as const}}>
            {[
              {color:'rgba(255,255,255,0.5)', label:'Normal'},
              {color:'#f87171', label:'Quitar'},
              {color:'#fbbf24', label:'Extra (doble)'},
              {color:'rgba(255,255,255,0.25)', label:'🔒 Requerido'},
            ].map(l => (
              <div key={l.label} style={{display:'flex', alignItems:'center', gap:'5px', fontSize:'11px', color:l.color}}>
                <div style={{width:'7px', height:'7px', borderRadius:'50%', background:l.color}}/>{l.label}
              </div>
            ))}
          </div>
        )}

        {/* Body */}
        <div style={s.body}>
          {loadingRecipe ? (
            <div style={{textAlign:'center', padding:'24px', color:'rgba(255,255,255,0.3)', fontSize:'13px'}}>Cargando ingredientes...</div>
          ) : (
            <>
              {rows.map((row, idx) => (
                <div key={idx} style={s.rowBox}>
                  {/* Row header */}
                  <div style={s.rowHead} onClick={() => setExpandedRow(expandedRow === idx ? null : idx)}>
                    <button style={s.iconBtn} onClick={e => {e.stopPropagation(); updateQty(idx,-1);}}>
                      <Minus size={13}/>
                    </button>
                    <span style={{fontSize:'18px', fontWeight:700, color:'#f1f5f9', minWidth:'22px', textAlign:'center'}}>{row.qty}</span>
                    <button style={s.iconBtn} onClick={e => {e.stopPropagation(); updateQty(idx,1);}}>
                      <Plus size={13}/>
                    </button>
                    <span style={{fontSize:'13px', color:'rgba(255,255,255,0.4)', flex:1, marginLeft:'4px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' as const}}>
                      {buildLine(idx, row).modifier || 'Sin modificaciones'}
                    </span>
                    {rows.length > 1 && (
                      <button
                        style={{...s.iconBtn, background:'rgba(239,68,68,0.12)', color:'#f87171'}}
                        onClick={e => {e.stopPropagation(); removeRow(idx);}}
                      ><X size={13}/></button>
                    )}
                    <span style={{color:'rgba(255,255,255,0.25)', fontSize:'12px', marginLeft:'4px'}}>{expandedRow===idx?'▲':'▼'}</span>
                  </div>

                  {/* Expanded */}
                  {expandedRow === idx && (
                    <div style={{padding:'12px 14px 14px', borderTop:'1px solid rgba(255,255,255,0.06)'}}>

                      {recipe.length > 0 && (
                        <div style={{marginBottom:'14px'}}>
                          <div style={{fontSize:'11px', fontWeight:600, color:'rgba(255,255,255,0.35)', textTransform:'uppercase' as const, letterSpacing:'0.07em', marginBottom:'10px'}}>
                            Toca para modificar · toca dos veces para pedir extra
                          </div>
                          <div style={{display:'flex', flexWrap:'wrap' as const, gap:'7px'}}>
                            {recipe.map(ing => {
                              const state = getIngState(idx, ing.id);
                              return (
                                <button
                                  key={ing.id}
                                  style={ingBtnStyle(state, ing.isRequired)}
                                  onClick={() => cycleIngState(idx, ing)}
                                  title={ing.isRequired ? 'Ingrediente requerido — no se puede quitar' : undefined}
                                >
                                  {ingBtnLabel(state, ing.name, ing.isRequired)}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Quick notes */}
                      <div style={{marginBottom:'10px'}}>
                        <div style={{fontSize:'11px', fontWeight:600, color:'rgba(255,255,255,0.35)', textTransform:'uppercase' as const, letterSpacing:'0.07em', marginBottom:'8px'}}>Notas rápidas</div>
                        <div style={{display:'flex', flexWrap:'wrap' as const, gap:'6px'}}>
                          {QUICK_NOTES.map(n => (
                            <button key={n} onClick={() => appendQuickNote(idx, n)}
                              style={{padding:'5px 11px', borderRadius:'7px', border:'1px solid rgba(255,255,255,0.1)', background:'transparent', color:'rgba(255,255,255,0.45)', fontSize:'12px', cursor:'pointer'}}>
                              {n}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Free text */}
                      <textarea
                        value={row.note}
                        onChange={e => updateNote(idx, e.target.value)}
                        placeholder="Instrucción especial para cocina..."
                        rows={2}
                        style={{width:'100%', background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'10px', padding:'9px 12px', color:'#f1f5f9', fontSize:'13px', resize:'none' as const, outline:'none', fontFamily:'inherit'}}
                      />
                    </div>
                  )}
                </div>
              ))}

              <button onClick={addRow}
                style={{width:'100%', padding:'10px', borderRadius:'12px', border:'1px dashed rgba(255,255,255,0.12)', background:'transparent', color:'rgba(255,255,255,0.35)', fontSize:'13px', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:'6px'}}>
                <Plus size={14}/> Agregar variación diferente
              </button>

              {recipe.length === 0 && !loadingRecipe && (
                <p style={{fontSize:'12px', color:'rgba(255,255,255,0.2)', textAlign:'center'}}>
                  Sin receta registrada — los modificadores solo agregarán notas al cocinero.
                </p>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div style={s.footer}>
          <button onClick={onCancel}
            style={{flex:1, padding:'12px', borderRadius:'11px', border:'1px solid rgba(255,255,255,0.1)', background:'transparent', color:'rgba(255,255,255,0.5)', fontSize:'14px', cursor:'pointer'}}>
            Cancelar
          </button>
          <button onClick={handleConfirm}
            style={{flex:2, padding:'12px', borderRadius:'11px', border:'none', background:'#f59e0b', color:'#1B3A6B', fontSize:'14px', fontWeight:700, cursor:'pointer'}}>
            Agregar {totalQty} × {item.name} — ${(item.price * totalQty).toFixed(2)}
          </button>
        </div>
      </div>
    </div>
  );
}
