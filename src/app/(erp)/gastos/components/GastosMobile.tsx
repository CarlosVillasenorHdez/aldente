'use client';
/**
 * GastosMobile — Vista optimizada para teléfono
 * Caso de uso: registrar gasto rápido y ver resumen del mes
 */
import React, { useState, useCallback, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { getCurrentTenantId as getTenantId } from '@/lib/tenantStore';
import { useBranch } from '@/hooks/useBranch';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Plus, RefreshCw, X, Check, TrendingDown } from 'lucide-react';

interface Gasto {
  id: string; nombre: string; monto: number;
  categoria: string; fecha: string; metodo_pago: string;
}

const CATEGORIAS = ['Insumos','Nómina','Renta','Servicios','Marketing','Mantenimiento','Equipo','Otros'];
const METODOS = ['efectivo','transferencia','tarjeta','cheque'];
const METODO_LABELS: Record<string,string> = { efectivo:'Efectivo', transferencia:'Transferencia', tarjeta:'Tarjeta', cheque:'Cheque' };
const CAT_COLORS: Record<string,string> = {
  Insumos:'#60a5fa', Nómina:'#a78bfa', Renta:'#f59e0b', Servicios:'#34d399',
  Marketing:'#f472b6', Mantenimiento:'#fb923c', Equipo:'#4ade80', Otros:'#9ca3af',
};
const fmt = (n: number) => n.toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

export default function GastosMobile() {
  const supabase = createClient();
  const { activeBranchId } = useBranch();
  const { appUser } = useAuth();
  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form
  const [nombre, setNombre] = useState('');
  const [monto, setMonto] = useState('');
  const [categoria, setCategoria] = useState('Insumos');
  const [metodo, setMetodo] = useState('efectivo');
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0,10));

  const load = useCallback(async () => {
    setLoading(true);
    const tid = appUser?.tenantId ?? getTenantId();
    if (!tid) { setLoading(false); return; }
    const startOfMonth = new Date(); startOfMonth.setDate(1); startOfMonth.setHours(0,0,0,0);
    const { data } = await supabase.from('gastos_pagos')
      .select('id,nombre,monto,categoria,fecha,metodo_pago')
      .eq('tenant_id', tid)
      .gte('fecha', startOfMonth.toISOString().slice(0,10))
      .order('fecha', { ascending: false })
      .limit(30);
    setGastos((data ?? []).map((g: any) => ({ ...g, monto: Number(g.monto) })));
    setLoading(false);
  }, [appUser?.tenantId, supabase]);

  useEffect(() => { load(); }, [load]);

  async function saveGasto() {
    if (!nombre.trim() || !monto || parseFloat(monto) <= 0) {
      toast.error('Nombre y monto son obligatorios');
      return;
    }
    setSaving(true);
    const tid = appUser?.tenantId ?? getTenantId();
    const { error } = await supabase.from('gastos_pagos').insert({
      tenant_id: tid, branch_id: activeBranchId ?? null,
      nombre: nombre.trim(), monto: parseFloat(monto),
      categoria, fecha, metodo_pago: metodo,
      registrado_por: appUser?.fullName ?? 'App',
    });
    if (error) { toast.error('Error al registrar gasto'); }
    else {
      toast.success(`Gasto de $${fmt(parseFloat(monto))} registrado`);
      setNombre(''); setMonto(''); setCategoria('Insumos'); setMetodo('efectivo');
      setFecha(new Date().toISOString().slice(0,10));
      setShowForm(false);
      load();
    }
    setSaving(false);
  }

  const totalMes = gastos.reduce((s, g) => s + g.monto, 0);
  const porCategoria = gastos.reduce<Record<string,number>>((acc, g) => {
    acc[g.categoria] = (acc[g.categoria] ?? 0) + g.monto;
    return acc;
  }, {});

  const S = {
    card: { background: '#162d55', border: '1px solid #243f72', borderRadius: 14, padding: '12px 14px', marginBottom: 8 } as React.CSSProperties,
    inp: { width: '100%', padding: '10px 12px', borderRadius: 10, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.15)', color: 'white', fontSize: 14, outline: 'none', boxSizing: 'border-box' as const },
    label: { fontSize: 12, fontWeight: 600 as const, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' as const, letterSpacing: '.05em', display: 'block' as const, marginBottom: 5 },
  };

  return (
    <div style={{ background: '#0a1628', minHeight: '100vh', paddingBottom: 80 }}>

      {/* Header */}
      <div style={{ padding: '16px 16px 12px', background: '#0f1e38', borderBottom: '1px solid rgba(255,255,255,0.06)', position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: 'white', margin: 0 }}>Gastos</h1>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={load} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)' }}>
              <RefreshCw size={16} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
            </button>
            <button onClick={() => setShowForm(true)}
              style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '8px 14px', borderRadius: 10, background: '#f59e0b', border: 'none', color: '#1B3A6B', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
              <Plus size={14} /> Nuevo
            </button>
          </div>
        </div>
      </div>

      <div style={{ padding: '14px 16px 0' }}>
        {/* KPI total mes */}
        <div style={{ ...S.card, background: 'linear-gradient(135deg, #1B3A6B 0%, #162d55 100%)', border: '1px solid #2d4f8a', marginBottom: 14 }}>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '.06em', margin: '0 0 4px' }}>Gastos este mes</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <TrendingDown size={24} style={{ color: '#f87171' }} />
            <p style={{ fontSize: 38, fontWeight: 700, color: '#f87171', fontFamily: 'monospace', margin: 0 }}>${fmt(totalMes)}</p>
          </div>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', marginTop: 4 }}>{gastos.length} gastos registrados</p>
        </div>

        {/* Top categorías */}
        {Object.keys(porCategoria).length > 0 && (
          <div style={{ ...S.card, marginBottom: 14 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 10 }}>Por categoría</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {Object.entries(porCategoria).sort((a,b) => b[1]-a[1]).map(([cat, total]) => {
                const pct = totalMes > 0 ? (total / totalMes) * 100 : 0;
                return (
                  <div key={cat}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                      <span style={{ fontSize: 12, color: CAT_COLORS[cat] ?? '#9ca3af', fontWeight: 500 }}>{cat}</span>
                      <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', fontFamily: 'monospace' }}>${fmt(total)}</span>
                    </div>
                    <div style={{ height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 4 }}>
                      <div style={{ width: `${pct}%`, height: '100%', background: CAT_COLORS[cat] ?? '#9ca3af', borderRadius: 4 }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Lista de gastos */}
        <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 10 }}>Últimos gastos</p>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'rgba(255,255,255,0.3)' }}>
            <div style={{ width: 24, height: 24, borderRadius: '50%', border: '2px solid rgba(245,158,11,0.3)', borderTopColor: '#f59e0b', animation: 'spin 1s linear infinite', margin: '0 auto 8px' }} />
            Cargando...
          </div>
        ) : gastos.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 30, color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>Sin gastos este mes</div>
        ) : gastos.map(g => (
          <div key={g.id} style={S.card}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: `${CAT_COLORS[g.categoria] ?? '#9ca3af'}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <TrendingDown size={18} style={{ color: CAT_COLORS[g.categoria] ?? '#9ca3af' }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 14, fontWeight: 600, color: 'white', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{g.nombre}</p>
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', margin: '2px 0 0' }}>
                  {g.fecha} · {g.categoria} · {METODO_LABELS[g.metodo_pago] ?? g.metodo_pago}
                </p>
              </div>
              <span style={{ fontSize: 16, fontWeight: 700, color: '#f87171', fontFamily: 'monospace', flexShrink: 0 }}>${fmt(g.monto)}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Modal nuevo gasto — bottom sheet */}
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 100, display: 'flex', alignItems: 'flex-end' }}>
          <div style={{ background: '#162d55', border: '1px solid #243f72', borderRadius: '20px 20px 0 0', padding: '24px 20px 40px', width: '100%', maxWidth: 480, margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: 'white', margin: 0 }}>Nuevo gasto</h3>
              <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)' }}><X size={20} /></button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={S.label}>Descripción *</label>
                <input value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Ej: Compra de carne, Pago de luz..." style={S.inp} />
              </div>
              <div>
                <label style={S.label}>Monto ($) *</label>
                <input type="number" min="0" step="0.01" value={monto} onChange={e => setMonto(e.target.value)}
                  placeholder="0.00" inputMode="decimal" style={{ ...S.inp, fontSize: 24, fontWeight: 700, fontFamily: 'monospace', textAlign: 'center' }} autoFocus />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={S.label}>Categoría</label>
                  <select value={categoria} onChange={e => setCategoria(e.target.value)} style={{ ...S.inp, appearance: 'none' as const }}>
                    {CATEGORIAS.map(c => <option key={c} value={c} style={{ background: '#162d55' }}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label style={S.label}>Método</label>
                  <select value={metodo} onChange={e => setMetodo(e.target.value)} style={{ ...S.inp, appearance: 'none' as const }}>
                    {METODOS.map(m => <option key={m} value={m} style={{ background: '#162d55' }}>{METODO_LABELS[m]}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label style={S.label}>Fecha</label>
                <input type="date" value={fecha} onChange={e => setFecha(e.target.value)} style={S.inp} />
              </div>
            </div>

            <button onClick={saveGasto} disabled={saving || !nombre.trim() || !monto}
              style={{ marginTop: 16, width: '100%', padding: '14px', borderRadius: 14, border: 'none', background: (!nombre.trim() || !monto) ? 'rgba(74,222,128,0.3)' : '#16a34a', color: 'white', fontSize: 16, fontWeight: 700, cursor: (!nombre.trim() || !monto) ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              {saving ? <RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Check size={16} />}
              {saving ? 'Guardando...' : 'Registrar gasto'}
            </button>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
