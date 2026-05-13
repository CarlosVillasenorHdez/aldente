'use client';
/**
 * InventarioMobile — Vista optimizada para teléfono
 * Enfoque: ver stock crítico, buscar ingrediente, registrar entrada rápida
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { getCurrentTenantId as getTenantId } from '@/lib/tenantStore';
import { useBranch } from '@/hooks/useBranch';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Search, Plus, AlertTriangle, Package, RefreshCw, X, ChevronRight, ArrowUpCircle } from 'lucide-react';

interface Ing {
  id: string; name: string; category: string;
  stock: number; unit: string; minStock: number;
  cost: number; notes: string | null;
}

const fmt = (n: number) => n.toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
const CATS = ['Todas', 'Crítico'] as const;

export default function InventarioMobile() {
  const supabase = createClient();
  const { activeBranchId } = useBranch();
  const { appUser } = useAuth();
  const [ingredients, setIngredients] = useState<Ing[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'Todas' | 'Crítico'>('Todas');
  const [selected, setSelected] = useState<Ing | null>(null);
  const [quickEntry, setQuickEntry] = useState(false);
  const [entryQty, setEntryQty] = useState('');
  const [saving, setSaving] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const tid = appUser?.tenantId ?? getTenantId();
    if (!tid) { setLoading(false); return; }
    let q = supabase.from('ingredients').select('id,name,category,stock,unit,min_stock,cost,notes')
      .eq('tenant_id', tid).order('name');
    if (activeBranchId) q = (q as any).or(`branch_id.is.null,branch_id.eq.${activeBranchId}`);
    const { data } = await q;
    setIngredients((data ?? []).map((i: any) => ({
      id: i.id, name: i.name, category: i.category ?? 'Otros',
      stock: Number(i.stock ?? 0), unit: i.unit ?? 'kg',
      minStock: Number(i.min_stock ?? 0), cost: Number(i.cost ?? 0),
      notes: i.notes ?? null,
    })));
    setLoading(false);
  }, [activeBranchId, appUser?.tenantId, supabase]);

  useEffect(() => { load(); }, [load]);

  async function handleQuickEntry() {
    if (!selected || !entryQty || Number(entryQty) <= 0 || saving) return;
    setSaving(true);
    const qty = Number(entryQty);
    const newStock = selected.stock + qty;
    const tid = appUser?.tenantId ?? getTenantId();
    await Promise.all([
      supabase.from('stock_movements').insert({
        tenant_id: tid, ingredient_id: selected.id,
        movement_type: 'entrada', quantity: qty,
        previous_stock: selected.stock, new_stock: newStock,
        reason: 'Entrada rápida (mobile)', created_by: appUser?.fullName ?? 'App',
        branch_id: activeBranchId ?? null,
      }),
      supabase.from('ingredients').update({ stock: newStock, updated_at: new Date().toISOString() }).eq('id', selected.id),
    ]);
    toast.success(`+${qty} ${selected.unit} de ${selected.name}`);
    setIngredients(prev => prev.map(i => i.id === selected.id ? { ...i, stock: newStock } : i));
    setSelected(prev => prev ? { ...prev, stock: newStock } : null);
    setEntryQty('');
    setQuickEntry(false);
    setSaving(false);
  }

  const filtered = ingredients.filter(i => {
    const matchSearch = !search || i.name.toLowerCase().includes(search.toLowerCase()) || i.category.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === 'Todas' || (filter === 'Crítico' && i.stock < i.minStock && i.minStock > 0);
    return matchSearch && matchFilter;
  });

  const critico = ingredients.filter(i => i.stock < i.minStock && i.minStock > 0).length;
  const totalValue = ingredients.reduce((s, i) => s + i.stock * i.cost, 0);

  const stockColor = (i: Ing) => {
    if (i.minStock > 0 && i.stock === 0) return '#ef4444';
    if (i.minStock > 0 && i.stock < i.minStock) return '#f59e0b';
    return '#4ade80';
  };

  const S = {
    card: { background: '#162d55', border: '1px solid #243f72', borderRadius: 14, padding: '14px 16px', marginBottom: 8 } as React.CSSProperties,
  };

  return (
    <div style={{ background: '#0a1628', minHeight: '100vh', paddingBottom: 80 }}>

      {/* Header fijo */}
      <div style={{ position: 'sticky', top: 0, background: '#0f1e38', borderBottom: '1px solid rgba(255,255,255,0.06)', zIndex: 20, padding: '14px 16px 12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: 'white', margin: 0 }}>Inventario</h1>
          <button onClick={load} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)', padding: 4 }}>
            <RefreshCw size={16} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
          </button>
        </div>

        {/* Búsqueda */}
        <div style={{ position: 'relative', marginBottom: 10 }}>
          <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)' }} />
          <input ref={searchRef} value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar ingrediente..."
            style={{ width: '100%', padding: '9px 36px 9px 34px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: 'white', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
          {search && <button onClick={() => setSearch('')} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.3)', padding: 2 }}><X size={13} /></button>}
        </div>

        {/* Filtros */}
        <div style={{ display: 'flex', gap: 8 }}>
          {CATS.map(cat => (
            <button key={cat} onClick={() => setFilter(cat)}
              style={{ padding: '6px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, background: filter === cat ? (cat === 'Crítico' ? '#ef4444' : '#f59e0b') : 'rgba(255,255,255,0.06)', color: filter === cat ? (cat === 'Crítico' ? 'white' : '#1B3A6B') : 'rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center', gap: 5 }}>
              {cat === 'Crítico' && critico > 0 && <AlertTriangle size={11} />}
              {cat}{cat === 'Crítico' && critico > 0 ? ` (${critico})` : ''}
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: '12px 16px 0' }}>

        {/* KPI mini */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
          <div style={{ background: '#162d55', border: '1px solid #243f72', borderRadius: 12, padding: '10px 14px' }}>
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', margin: '0 0 3px', textTransform: 'uppercase', letterSpacing: '.05em' }}>Ingredientes</p>
            <p style={{ fontSize: 22, fontWeight: 700, color: 'white', fontFamily: 'monospace', margin: 0 }}>{ingredients.length}</p>
          </div>
          <div style={{ background: critico > 0 ? 'rgba(239,68,68,0.1)' : '#162d55', border: `1px solid ${critico > 0 ? 'rgba(239,68,68,0.3)' : '#243f72'}`, borderRadius: 12, padding: '10px 14px' }}>
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', margin: '0 0 3px', textTransform: 'uppercase', letterSpacing: '.05em' }}>Stock crítico</p>
            <p style={{ fontSize: 22, fontWeight: 700, color: critico > 0 ? '#ef4444' : '#4ade80', fontFamily: 'monospace', margin: 0 }}>{critico}</p>
          </div>
        </div>

        {/* Lista */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'rgba(255,255,255,0.3)' }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', border: '2px solid rgba(245,158,11,0.3)', borderTopColor: '#f59e0b', animation: 'spin 1s linear infinite', margin: '0 auto 10px' }} />
            Cargando...
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <Package size={32} style={{ color: 'rgba(255,255,255,0.15)', marginBottom: 10 }} />
            <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 14 }}>{search ? 'Sin resultados' : 'Sin ingredientes'}</p>
          </div>
        ) : (
          <div>
            {filtered.map(ing => {
              const color = stockColor(ing);
              const pct = ing.minStock > 0 ? Math.min((ing.stock / ing.minStock) * 100, 100) : 100;
              return (
                <div key={ing.id} onClick={() => setSelected(ing)}
                  style={{ ...S.card, display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}
                  onTouchStart={e => (e.currentTarget.style.background = '#1e3a6e')}
                  onTouchEnd={e => (e.currentTarget.style.background = '#162d55')}>
                  {/* Indicador de color */}
                  <div style={{ width: 4, height: 44, borderRadius: 4, background: color, flexShrink: 0 }} />
                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
                      <span style={{ fontSize: 14, fontWeight: 600, color: 'white', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '65%' }}>{ing.name}</span>
                      <span style={{ fontSize: 15, fontWeight: 700, color, fontFamily: 'monospace', flexShrink: 0 }}>{fmt(ing.stock)} {ing.unit}</span>
                    </div>
                    <div style={{ height: 3, background: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 3 }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 3 }}>
                      <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>{ing.category}</span>
                      {ing.minStock > 0 && <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>mín: {ing.minStock} {ing.unit}</span>}
                    </div>
                  </div>
                  <ChevronRight size={14} style={{ color: 'rgba(255,255,255,0.2)', flexShrink: 0 }} />
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Panel de detalle del ingrediente */}
      {selected && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.7)', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
          <div style={{ background: '#162d55', borderRadius: '20px 20px 0 0', padding: '20px 20px 40px', maxHeight: '85vh', overflowY: 'auto', border: '1px solid #243f72' }}>
            {/* Handle */}
            <div style={{ width: 36, height: 4, background: 'rgba(255,255,255,0.2)', borderRadius: 4, margin: '0 auto 16px' }} />

            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 700, color: 'white', margin: '0 0 4px' }}>{selected.name}</h2>
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>{selected.category}</span>
              </div>
              <button onClick={() => { setSelected(null); setQuickEntry(false); setEntryQty(''); }}
                style={{ background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: 8, padding: 8, cursor: 'pointer', color: 'rgba(255,255,255,0.6)' }}>
                <X size={16} />
              </button>
            </div>

            {/* Stock visual */}
            <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: '16px', marginBottom: 16, textAlign: 'center' }}>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', margin: '0 0 4px' }}>Stock actual</p>
              <p style={{ fontSize: 44, fontWeight: 700, color: stockColor(selected), fontFamily: 'monospace', margin: 0 }}>
                {fmt(selected.stock)} <span style={{ fontSize: 20 }}>{selected.unit}</span>
              </p>
              {selected.minStock > 0 && (
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 6 }}>
                  Mínimo: {selected.minStock} {selected.unit}
                  {selected.stock < selected.minStock && <span style={{ color: '#f87171', marginLeft: 6 }}>⚠ Por debajo del mínimo</span>}
                </p>
              )}
            </div>

            {/* Datos rápidos */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
              {[
                ['Costo unitario', `$${fmt(selected.cost)}/${selected.unit}`],
                ['Valor en stock', `$${fmt(selected.stock * selected.cost)}`],
              ].map(([label, value]) => (
                <div key={label} style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: '10px 12px' }}>
                  <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', margin: '0 0 3px', textTransform: 'uppercase', letterSpacing: '.05em' }}>{label}</p>
                  <p style={{ fontSize: 15, fontWeight: 700, color: 'white', fontFamily: 'monospace', margin: 0 }}>{value}</p>
                </div>
              ))}
            </div>

            {/* Entrada rápida */}
            {!quickEntry ? (
              <button onClick={() => setQuickEntry(true)}
                style={{ width: '100%', padding: '14px', borderRadius: 12, background: '#f59e0b', border: 'none', color: '#1B3A6B', fontSize: 15, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <ArrowUpCircle size={18} /> Registrar entrada
              </button>
            ) : (
              <div>
                <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', marginBottom: 8 }}>¿Cuánto {selected.unit} entró?</p>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input type="number" value={entryQty} onChange={e => setEntryQty(e.target.value)}
                    placeholder={`Ej: 5`} autoFocus
                    style={{ flex: 1, padding: '12px 14px', borderRadius: 10, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: 'white', fontSize: 18, fontFamily: 'monospace', outline: 'none', textAlign: 'center' }} />
                  <button onClick={handleQuickEntry} disabled={!entryQty || Number(entryQty) <= 0 || saving}
                    style={{ padding: '12px 20px', borderRadius: 10, background: (!entryQty || Number(entryQty) <= 0) ? 'rgba(245,158,11,0.3)' : '#f59e0b', border: 'none', color: '#1B3A6B', fontSize: 14, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                    {saving ? '...' : 'Confirmar'}
                  </button>
                </div>
                {entryQty && Number(entryQty) > 0 && (
                  <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 8, textAlign: 'center' }}>
                    {fmt(selected.stock)} → {fmt(selected.stock + Number(entryQty))} {selected.unit}
                  </p>
                )}
                <button onClick={() => { setQuickEntry(false); setEntryQty(''); }}
                  style={{ width: '100%', marginTop: 8, padding: '10px', borderRadius: 10, background: 'none', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)', fontSize: 13, cursor: 'pointer' }}>
                  Cancelar
                </button>
              </div>
            )}

            {selected.notes && (
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', marginTop: 12, padding: '10px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: 8 }}>
                📝 {selected.notes}
              </p>
            )}
          </div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
