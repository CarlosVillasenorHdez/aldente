'use client';

/**
 * ModifierModal — per-item customization when adding a dish to an order.
 *
 * Shows:
 * 1. How many of this dish the user wants (1–9 default)
 * 2. Which ingredients from the recipe to exclude ("sin X")
 * 3. A free-text note for extra instructions
 *
 * For each unique combination of excluded ingredients, a separate order line
 * is created so the kitchen sees each variation clearly and inventory is
 * deducted accurately (only included ingredients count).
 */

import React, { useState, useEffect } from 'react';
import { X, Minus, Plus, ChevronDown } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface RecipeIngredient {
  id: string;
  name: string;
  unit: string;
  quantity: number;
}

interface MenuItem {
  id: string;
  name: string;
  price: number;
  emoji?: string;
  description?: string;
}

interface ModifierModalProps {
  item: MenuItem;
  onConfirm: (lines: ModifierLine[]) => void;
  onCancel: () => void;
}

export interface ModifierLine {
  qty: number;
  excluded: string[];        // ingredient names removed
  excludedIds: string[];     // ingredient ids (for inventory deduction)
  note: string;
  modifier: string;          // human-readable summary for kitchen
}

const QUICK_NOTES = [
  'Sin sal', 'Poco picante', 'Muy picante', 'Sin hielo',
  'Bien cocido', 'Término medio', 'Sin salsa', 'Extra salsa',
];

export default function ModifierModal({ item, onConfirm, onCancel }: ModifierModalProps) {
  const supabase = createClient();
  const [recipe, setRecipe] = useState<RecipeIngredient[]>([]);
  const [loadingRecipe, setLoadingRecipe] = useState(true);

  // Per-unit rows: each row is one "version" of this dish
  const [rows, setRows] = useState<ModifierLine[]>([
    { qty: 1, excluded: [], excludedIds: [], note: '', modifier: '' }
  ]);
  const [expandedRow, setExpandedRow] = useState<number | null>(null);

  useEffect(() => {
    supabase
      .from('dish_recipes')
      .select('ingredient_id, quantity, ingredients(name, unit)')
      .eq('dish_id', item.id)
      .then(({ data }) => {
        if (data && data.length > 0) {
          setRecipe(data.map((r: Record<string, unknown>) => {
            const ing = r.ingredients as { name: string; unit: string } | null;
            return {
              id: r.ingredient_id as string,
              name: ing?.name ?? '',
              unit: ing?.unit ?? '',
              quantity: Number(r.quantity),
            };
          }));
        }
        setLoadingRecipe(false);
      });
  }, [item.id]);

  function addRow() {
    setRows(prev => [...prev, { qty: 1, excluded: [], excludedIds: [], note: '', modifier: '' }]);
    setExpandedRow(rows.length);
  }

  function removeRow(idx: number) {
    setRows(prev => prev.filter((_, i) => i !== idx));
  }

  function updateRowQty(idx: number, delta: number) {
    setRows(prev => prev.map((r, i) => i === idx
      ? { ...r, qty: Math.max(1, Math.min(20, r.qty + delta)) }
      : r
    ));
  }

  function toggleExclude(rowIdx: number, ing: RecipeIngredient) {
    setRows(prev => prev.map((r, i) => {
      if (i !== rowIdx) return r;
      const isExcluded = r.excludedIds.includes(ing.id);
      const excludedIds = isExcluded
        ? r.excludedIds.filter(id => id !== ing.id)
        : [...r.excludedIds, ing.id];
      const excluded = isExcluded
        ? r.excluded.filter(n => n !== ing.name)
        : [...r.excluded, ing.name];
      return { ...r, excluded, excludedIds };
    }));
  }

  function updateNote(rowIdx: number, note: string) {
    setRows(prev => prev.map((r, i) => i === rowIdx ? { ...r, note } : r));
  }

  function appendQuickNote(rowIdx: number, note: string) {
    setRows(prev => prev.map((r, i) => {
      if (i !== rowIdx) return r;
      const existing = r.note.trim();
      return { ...r, note: existing ? `${existing}, ${note}` : note };
    }));
  }

  function buildModifier(row: ModifierLine): string {
    const parts: string[] = [];
    if (row.excluded.length > 0) parts.push(`Sin: ${row.excluded.join(', ')}`);
    if (row.note.trim()) parts.push(row.note.trim());
    return parts.join(' — ');
  }

  function handleConfirm() {
    const finalLines = rows
      .filter(r => r.qty > 0)
      .map(r => ({ ...r, modifier: buildModifier(r) }));
    onConfirm(finalLines);
  }

  const totalQty = rows.reduce((s, r) => s + r.qty, 0);

  const s = {
    overlay: { position:'fixed' as const, inset:0, zIndex:9999, background:'rgba(0,0,0,0.72)', backdropFilter:'blur(4px)', display:'flex', alignItems:'center', justifyContent:'center', padding:'16px' },
    modal: { background:'#1a2535', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'20px', width:'100%', maxWidth:'440px', maxHeight:'90svh', display:'flex', flexDirection:'column' as const, overflow:'hidden' },
    header: { padding:'20px 20px 16px', borderBottom:'1px solid rgba(255,255,255,0.07)', display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:'12px' },
    body: { flex:1, overflowY:'auto' as const, padding:'16px 20px' },
    footer: { padding:'16px 20px', borderTop:'1px solid rgba(255,255,255,0.07)', display:'flex', gap:'10px' },
    row: { background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:'14px', marginBottom:'10px', overflow:'hidden' },
    rowHeader: { display:'flex', alignItems:'center', gap:'10px', padding:'12px 14px', cursor:'pointer' },
    btn: { background:'rgba(255,255,255,0.08)', border:'none', borderRadius:'8px', width:'30px', height:'30px', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', color:'rgba(255,255,255,0.7)' },
    ingBtn: (excluded: boolean) => ({
      display:'flex', alignItems:'center', gap:'6px',
      padding:'7px 12px', borderRadius:'8px', border:'none', cursor:'pointer', fontSize:'13px',
      background: excluded ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.06)',
      color: excluded ? '#f87171' : 'rgba(255,255,255,0.65)',
      textDecoration: excluded ? 'line-through' as const : 'none',
    }),
    quickNote: { padding:'6px 12px', borderRadius:'8px', border:'1px solid rgba(255,255,255,0.1)', background:'transparent', color:'rgba(255,255,255,0.5)', fontSize:'12px', cursor:'pointer', whiteSpace:'nowrap' as const },
  };

  return (
    <div style={s.overlay} onClick={e => e.target === e.currentTarget && onCancel()}>
      <div style={s.modal}>
        {/* Header */}
        <div style={s.header}>
          <div>
            <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'4px' }}>
              {item.emoji && <span style={{fontSize:'20px'}}>{item.emoji}</span>}
              <span style={{ fontSize:'17px', fontWeight:600, color:'#f1f5f9' }}>{item.name}</span>
            </div>
            <span style={{ fontSize:'13px', color:'rgba(255,255,255,0.4)' }}>
              ${item.price.toFixed(2)} c/u · {totalQty} en total
            </span>
          </div>
          <button onClick={onCancel} style={{ ...s.btn, flexShrink:0 }}>
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div style={s.body}>
          {loadingRecipe ? (
            <div style={{ textAlign:'center', padding:'24px', color:'rgba(255,255,255,0.3)', fontSize:'13px' }}>
              Cargando ingredientes...
            </div>
          ) : (
            <>
              {/* Rows */}
              {rows.map((row, idx) => (
                <div key={idx} style={s.row}>
                  {/* Row header — qty + expand */}
                  <div style={s.rowHeader} onClick={() => setExpandedRow(expandedRow === idx ? null : idx)}>
                    <div style={{ display:'flex', alignItems:'center', gap:'8px', flex:1 }}>
                      <button style={s.btn} onClick={e => { e.stopPropagation(); updateRowQty(idx, -1); }}>
                        <Minus size={13} />
                      </button>
                      <span style={{ fontSize:'16px', fontWeight:600, color:'#f1f5f9', minWidth:'20px', textAlign:'center' }}>{row.qty}</span>
                      <button style={s.btn} onClick={e => { e.stopPropagation(); updateRowQty(idx, 1); }}>
                        <Plus size={13} />
                      </button>
                      <span style={{ fontSize:'13px', color:'rgba(255,255,255,0.5)', marginLeft:'4px' }}>
                        {row.excluded.length > 0 ? `Sin: ${row.excluded.join(', ')}` : row.note || 'Sin modificaciones'}
                      </span>
                    </div>
                    <div style={{ display:'flex', gap:'6px', alignItems:'center' }}>
                      {rows.length > 1 && (
                        <button
                          style={{ ...s.btn, background:'rgba(239,68,68,0.12)', color:'#f87171' }}
                          onClick={e => { e.stopPropagation(); removeRow(idx); }}
                        >
                          <X size={13} />
                        </button>
                      )}
                      <ChevronDown size={14} style={{ color:'rgba(255,255,255,0.3)', transform: expandedRow === idx ? 'rotate(180deg)' : 'none', transition:'transform .2s' }} />
                    </div>
                  </div>

                  {/* Expanded detail */}
                  {expandedRow === idx && (
                    <div style={{ padding:'0 14px 14px', borderTop:'1px solid rgba(255,255,255,0.06)' }}>
                      {/* Ingredients to exclude */}
                      {recipe.length > 0 && (
                        <div style={{ marginBottom:'14px', paddingTop:'12px' }}>
                          <div style={{ fontSize:'11px', fontWeight:600, color:'rgba(255,255,255,0.4)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:'10px' }}>
                            Quitar ingredientes
                          </div>
                          <div style={{ display:'flex', flexWrap:'wrap', gap:'6px' }}>
                            {recipe.map(ing => (
                              <button
                                key={ing.id}
                                style={s.ingBtn(row.excludedIds.includes(ing.id))}
                                onClick={() => toggleExclude(idx, ing)}
                              >
                                {row.excludedIds.includes(ing.id) && <X size={11} />}
                                {ing.name}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Quick notes */}
                      <div style={{ marginBottom:'10px' }}>
                        <div style={{ fontSize:'11px', fontWeight:600, color:'rgba(255,255,255,0.4)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:'8px' }}>
                          Notas rápidas
                        </div>
                        <div style={{ display:'flex', flexWrap:'wrap', gap:'6px' }}>
                          {QUICK_NOTES.map(n => (
                            <button key={n} style={s.quickNote} onClick={() => appendQuickNote(idx, n)}>{n}</button>
                          ))}
                        </div>
                      </div>

                      {/* Free text note */}
                      <textarea
                        value={row.note}
                        onChange={e => updateNote(idx, e.target.value)}
                        placeholder="Instrucción especial para cocina..."
                        rows={2}
                        style={{ width:'100%', background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'10px', padding:'10px 12px', color:'#f1f5f9', fontSize:'13px', resize:'none', outline:'none', fontFamily:'inherit' }}
                      />
                    </div>
                  )}
                </div>
              ))}

              {/* Add variation */}
              <button
                onClick={addRow}
                style={{ width:'100%', padding:'10px', borderRadius:'12px', border:'1px dashed rgba(255,255,255,0.15)', background:'transparent', color:'rgba(255,255,255,0.4)', fontSize:'13px', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:'6px' }}
              >
                <Plus size={14} /> Agregar variación diferente
              </button>

              {recipe.length === 0 && !loadingRecipe && (
                <p style={{ fontSize:'12px', color:'rgba(255,255,255,0.25)', textAlign:'center', marginTop:'12px' }}>
                  Este platillo no tiene receta registrada — el inventario no se descontará por ingrediente.
                </p>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div style={s.footer}>
          <button onClick={onCancel} style={{ flex:1, padding:'12px', borderRadius:'11px', border:'1px solid rgba(255,255,255,0.1)', background:'transparent', color:'rgba(255,255,255,0.5)', fontSize:'14px', cursor:'pointer' }}>
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            style={{ flex:2, padding:'12px', borderRadius:'11px', border:'none', background:'#f59e0b', color:'#1B3A6B', fontSize:'14px', fontWeight:600, cursor:'pointer' }}
          >
            Agregar {totalQty} × {item.name} — ${(item.price * totalQty).toFixed(2)}
          </button>
        </div>
      </div>
    </div>
  );
}
