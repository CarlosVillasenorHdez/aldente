'use client';
/**
 * ConteoFisico — Módulo de conteo físico guiado de inventario
 * 
 * Permite al encargado hacer un conteo real del stock y registrar
 * las diferencias vs lo que dice el sistema. Genera ajustes automáticos.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useBranch } from '@/hooks/useBranch';
import { toast } from 'sonner';
import { CheckCircle, Save, RefreshCw } from 'lucide-react';

interface Ingredient {
  id: string;
  name: string;
  category: string;
  unit: string;
  stockSistema: number;
  stockFisico: string;  // lo que el encargado cuenta
  cost: number;
}

const fmt = (n: number, unit: string) =>
  `${Number(n).toFixed(n % 1 === 0 ? 0 : 2)} ${unit}`;

export default function ConteoFisico({ tenantId }: { tenantId: string }) {
  const supabase = createClient();
  const { activeBranchId } = useBranch();
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState('Todas');
  const [showOnlyDiffs, setShowOnlyDiffs] = useState(false);

  const load = useCallback(async () => {
    if (!tenantId) return;

    setLoading(true);
    let q = supabase.from('ingredients')
      .select('id, name, category, unit, stock, cost')
      .eq('tenant_id', tenantId)
      .order('category').order('name');
    if (activeBranchId) q = (q as any).eq('branch_id', activeBranchId);

    const { data, error } = await q;

    if (error) {
      toast.error('Error al cargar ingredientes: ' + error.message);
      setLoading(false);
      return;
    }

    setIngredients((data ?? []).map((i: any) => ({
      id: i.id, name: i.name, category: i.category,
      unit: i.unit, stockSistema: Number(i.stock ?? 0),
      stockFisico: '', cost: Number(i.cost ?? 0),
    })));
    setLoading(false);
    setSaved(false);
  }, [supabase, activeBranchId, tenantId]);

  useEffect(() => { load(); }, [load]);

  const updateFisico = (id: string, val: string) => {
    setIngredients(prev => prev.map(i => i.id === id ? { ...i, stockFisico: val } : i));
  };

  const categories = ['Todas', ...Array.from(new Set(ingredients.map(i => i.category).filter(Boolean)))];

  const filtered = ingredients.filter(i => {
    const matchCat = categoryFilter === 'Todas' || i.category === categoryFilter;
    const hasDiff = showOnlyDiffs
      ? i.stockFisico !== '' && Number(i.stockFisico) !== i.stockSistema
      : true;
    return matchCat && hasDiff;
  });

  // Diferencias
  const diffs = ingredients.filter(i => i.stockFisico !== '' && Number(i.stockFisico) !== i.stockSistema);
  const totalValorDiff = diffs.reduce((s, i) => {
    const diff = Number(i.stockFisico) - i.stockSistema;
    return s + diff * i.cost;
  }, 0);
  const contados = ingredients.filter(i => i.stockFisico !== '').length;

  const handleGuardar = async () => {
    if (diffs.length === 0) { toast.info('Sin diferencias que ajustar'); return; }
    setSaving(true);
    const now = new Date().toISOString();

    const results = await Promise.allSettled(diffs.map(async ing => {
      const newStock = Number(ing.stockFisico);
      const diff = newStock - ing.stockSistema;

      // 1. Actualizar stock del ingrediente
      const { error: updateErr } = await supabase
        .from('ingredients')
        .update({ stock: newStock, updated_at: now })
        .eq('id', ing.id);

      if (updateErr) throw updateErr;

      // 2. Registrar movimiento — solo campos que existen en la DB
      const { error: movErr } = await supabase
        .from('stock_movements')
        .insert({
          tenant_id: tenantId,
          ingredient_id: ing.id,
          movement_type: 'ajuste',          // 'entrada' | 'salida' | 'ajuste'
          quantity: Math.abs(diff),
          previous_stock: ing.stockSistema,
          new_stock: newStock,
          reason: `Conteo físico — ${diff > 0 ? '+' : ''}${diff.toFixed(2)} ${ing.unit}`,
          created_by: 'Conteo físico',
        });

      if (movErr) throw movErr;
    }));

    const ok = results.filter(r => r.status === 'fulfilled').length;
    const fail = results.filter(r => r.status === 'rejected').length;

    setSaving(false);
    if (fail > 0) {
      toast.error(`${fail} ajuste(s) fallaron`);
    } else {
      toast.success(`✅ ${ok} ajuste(s) guardados correctamente`);
      setSaved(true);
      load();
    }
  };

  if (loading) {
    return (
      <div className="p-6 space-y-3">
        {[1,2,3,4,5].map(i => (
          <div key={i} className="h-12 rounded-xl animate-pulse" style={{ background: 'rgba(255,255,255,0.05)' }} />
        ))}
      </div>
    );
  }

  return (
    <div className="p-6 space-y-5">

      {/* Header con instrucciones */}
      <div className="flex items-start gap-4 p-4 rounded-xl" style={{ background: 'rgba(96,165,250,0.08)', border: '1px solid rgba(96,165,250,0.2)' }}>
        <div className="text-2xl flex-shrink-0">📋</div>
        <div>
          <p className="text-sm font-bold text-white mb-1">Conteo físico de inventario</p>
          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>
            Cuenta físicamente cada ingrediente e ingresa la cantidad real.
            Al guardar, el sistema ajusta el stock automáticamente y registra las diferencias.
          </p>
        </div>
      </div>

      {/* Controles */}
      <div className="flex items-center gap-3 flex-wrap">
        <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}
          className="px-3 py-2 rounded-lg text-sm"
          style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', color: 'white' }}>
          {categories.map(c => <option key={c} value={c} style={{ background: '#1a2535' }}>{c}</option>)}
        </select>

        <label className="flex items-center gap-2 text-xs cursor-pointer" style={{ color: 'rgba(255,255,255,0.6)' }}>
          <input type="checkbox" checked={showOnlyDiffs} onChange={e => setShowOnlyDiffs(e.target.checked)}
            style={{ accentColor: '#f59e0b' }} />
          Solo con diferencias
        </label>

        <div className="ml-auto flex items-center gap-3">
          <span className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
            {contados}/{ingredients.length} contados
          </span>
          {diffs.length > 0 && (
            <span className="text-xs font-semibold px-2 py-1 rounded-full"
              style={{ background: totalValorDiff < 0 ? 'rgba(239,68,68,0.15)' : 'rgba(34,197,94,0.15)', color: totalValorDiff < 0 ? '#f87171' : '#86efac' }}>
              Diferencia: {totalValorDiff >= 0 ? '+' : ''}{totalValorDiff.toLocaleString('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 })}
            </span>
          )}
        </div>
      </div>

      {/* Tabla de conteo */}
      <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
        <table className="w-full">
          <thead>
            <tr style={{ background: 'rgba(255,255,255,0.04)' }}>
              {['Ingrediente', 'Unidad', 'Sistema', 'Conteo real', 'Diferencia'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide"
                  style={{ color: 'rgba(255,255,255,0.4)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(ing => {
              const fisico = ing.stockFisico !== '' ? Number(ing.stockFisico) : null;
              const diff = fisico !== null ? fisico - ing.stockSistema : null;
              const hasDiff = diff !== null && diff !== 0;
              return (
                <tr key={ing.id} style={{ borderTop: '1px solid rgba(255,255,255,0.05)', background: hasDiff ? (diff! > 0 ? 'rgba(34,197,94,0.04)' : 'rgba(239,68,68,0.04)') : 'transparent' }}>
                  <td className="px-4 py-3">
                    <p className="text-sm font-semibold text-white">{ing.name}</p>
                    <p className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>{ing.category}</p>
                  </td>
                  <td className="px-4 py-3 text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>{ing.unit}</td>
                  <td className="px-4 py-3 text-sm font-mono text-white">{ing.stockSistema.toFixed(2)}</td>
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={ing.stockFisico}
                      onChange={e => updateFisico(ing.id, e.target.value)}
                      placeholder={ing.stockSistema.toFixed(2)}
                      className="w-24 px-2 py-1.5 rounded-lg text-sm font-mono text-center focus:outline-none"
                      style={{
                        background: ing.stockFisico !== '' ? (hasDiff ? (diff! > 0 ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)') : 'rgba(34,197,94,0.1)') : 'rgba(255,255,255,0.07)',
                        border: ing.stockFisico !== '' ? (hasDiff ? (diff! > 0 ? '1px solid rgba(34,197,94,0.4)' : '1px solid rgba(239,68,68,0.4)') : '1px solid rgba(34,197,94,0.3)') : '1px solid rgba(255,255,255,0.12)',
                        color: 'white',
                      }}
                    />
                  </td>
                  <td className="px-4 py-3 text-sm font-mono font-semibold">
                    {diff !== null ? (
                      <span style={{ color: diff === 0 ? '#86efac' : diff > 0 ? '#86efac' : '#f87171' }}>
                        {diff === 0 ? '✓' : (diff > 0 ? '+' : '')}{diff.toFixed(2)}
                      </span>
                    ) : <span style={{ color: 'rgba(255,255,255,0.2)' }}>—</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {filtered.length === 0 && (
          <div className="p-8 text-center" style={{ color: 'rgba(255,255,255,0.3)' }}>
            <p className="text-sm">Sin ingredientes en esta categoría</p>
          </div>
        )}
      </div>

      {/* Resumen y botón guardar */}
      {diffs.length > 0 && (
        <div className="flex items-center justify-between p-4 rounded-xl" style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}>
          <div>
            <p className="text-sm font-bold text-amber-400">{diffs.length} diferencia{diffs.length > 1 ? 's' : ''} encontrada{diffs.length > 1 ? 's' : ''}</p>
            <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.5)' }}>
              Al guardar se ajustará el stock y se registrará en el historial de movimientos
            </p>
          </div>
          <button onClick={handleGuardar} disabled={saving || saved}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-50"
            style={{ backgroundColor: saved ? '#15803d' : '#f59e0b', color: saved ? 'white' : '#1B3A6B' }}>
            {saving ? <RefreshCw size={14} className="animate-spin" /> : saved ? <CheckCircle size={14} /> : <Save size={14} />}
            {saving ? 'Guardando...' : saved ? 'Guardado' : 'Aplicar ajustes'}
          </button>
        </div>
      )}

      {contados === ingredients.length && diffs.length === 0 && contados > 0 && (
        <div className="flex items-center gap-3 p-4 rounded-xl" style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)' }}>
          <CheckCircle size={18} className="text-green-400 flex-shrink-0" />
          <div>
            <p className="text-sm font-bold text-green-400">Stock verificado sin diferencias</p>
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>El conteo físico coincide exactamente con el sistema</p>
          </div>
        </div>
      )}
    </div>
  );
}
