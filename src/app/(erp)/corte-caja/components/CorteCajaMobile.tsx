'use client';
/**
 * CorteCajaMobile — Vista optimizada para teléfono
 * Caso de uso: ver resumen del turno y hacer corte rápido
 */
import React, { useState, useCallback, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { getCurrentTenantId as getTenantId } from '@/lib/tenantStore';
import { useBranch } from '@/hooks/useBranch';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { RefreshCw, DollarSign, ShoppingBag, TrendingUp, CreditCard, Banknote, Smartphone } from 'lucide-react';

const fmt = (n: number) => n.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmt0 = (n: number) => n.toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

const METODO_ICONS: Record<string, React.ReactNode> = {
  efectivo: <Banknote size={14} />,
  tarjeta: <CreditCard size={14} />,
  transferencia: <Smartphone size={14} />,
};
const METODO_LABELS: Record<string, string> = {
  efectivo: 'Efectivo', tarjeta: 'Tarjeta', transferencia: 'Transferencia',
};

interface Resumen {
  ventas: number; ordenes: number; ticket: number;
  costo: number; merma: number; iva: number;
  porMetodo: Record<string, number>;
}

export default function CorteCajaMobile() {
  const supabase = createClient();
  const { activeBranchId } = useBranch();
  const { appUser } = useAuth();
  const [resumen, setResumen] = useState<Resumen | null>(null);
  const [loading, setLoading] = useState(true);
  const [turno, setTurno] = useState<'hoy' | 'turno'>('hoy');
  const [cortesAnteriores, setCortesAnteriores] = useState<any[]>([]);
  const [cerrando, setCerrando] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const tid = appUser?.tenantId ?? getTenantId();
    if (!tid) { setLoading(false); return; }
    const now = new Date();
    const inicio = new Date(now); inicio.setHours(0,0,0,0);

    let q = supabase.from('orders').select('total,cost_actual,iva,waste_cost,pay_method')
      .eq('tenant_id', tid).eq('status', 'cerrada').eq('is_comanda', false)
      .gte('closed_at', inicio.toISOString());
    if (activeBranchId) q = (q as any).eq('branch_id', activeBranchId);

    const [{ data: orders }, { data: cortes }] = await Promise.all([
      q,
      supabase.from('cortes_caja').select('id,fecha_inicio,fecha_fin,total_ventas,total_ordenes,cajero')
        .eq('tenant_id', tid).order('created_at', { ascending: false }).limit(5),
    ]);

    const rows = orders ?? [];
    const ventas = rows.reduce((s, o) => s + Number(o.total ?? 0), 0);
    const costo = rows.reduce((s, o) => s + Number(o.cost_actual ?? 0), 0);
    const iva = rows.reduce((s, o) => s + Number(o.iva ?? 0), 0);
    const merma = rows.reduce((s, o) => s + Number(o.waste_cost ?? 0), 0);
    const ordenes = rows.length;
    const ticket = ordenes > 0 ? ventas / ordenes : 0;
    const porMetodo: Record<string, number> = {};
    rows.forEach((o: any) => {
      const m = o.pay_method ?? 'efectivo';
      porMetodo[m] = (porMetodo[m] ?? 0) + Number(o.total ?? 0);
    });

    setResumen({ ventas, ordenes, ticket, costo, merma, iva, porMetodo });
    setCortesAnteriores(cortes ?? []);
    setLoading(false);
  }, [activeBranchId, appUser?.tenantId, supabase]);

  useEffect(() => { load(); }, [load]);

  async function hacerCorte() {
    if (!resumen || resumen.ordenes === 0) { toast.error('No hay órdenes para cortar'); return; }
    setCerrando(true);
    const tid = appUser?.tenantId ?? getTenantId();
    const now = new Date();
    const inicio = new Date(now); inicio.setHours(0,0,0,0);
    const { error } = await supabase.from('cortes_caja').insert({
      tenant_id: tid, branch_id: activeBranchId ?? null,
      fecha_inicio: inicio.toISOString(), fecha_fin: now.toISOString(),
      total_ventas: resumen.ventas, total_ordenes: resumen.ordenes,
      total_costo: resumen.costo, total_iva: resumen.iva,
      cajero: appUser?.fullName ?? 'App',
      desglose_metodos: resumen.porMetodo,
    });
    if (error) toast.error('Error al registrar corte');
    else { toast.success('Corte registrado'); load(); }
    setCerrando(false);
  }

  const S = {
    card: { background: '#162d55', border: '1px solid #243f72', borderRadius: 14, padding: '14px 16px', marginBottom: 10 } as React.CSSProperties,
  };

  return (
    <div style={{ background: '#0a1628', minHeight: '100vh', paddingBottom: 100 }}>

      {/* Header */}
      <div style={{ padding: '16px 16px 12px', background: '#0f1e38', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: 'white', margin: 0 }}>Corte de Caja</h1>
          <button onClick={load} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)' }}>
            <RefreshCw size={16} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
          </button>
        </div>
        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', marginTop: 4 }}>
          {new Date().toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
      </div>

      <div style={{ padding: '14px 16px 0' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 60, color: 'rgba(255,255,255,0.3)' }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', border: '2px solid rgba(245,158,11,0.3)', borderTopColor: '#f59e0b', animation: 'spin 1s linear infinite', margin: '0 auto 10px' }} />
            Cargando...
          </div>
        ) : resumen ? (
          <>
            {/* Ventas del día */}
            <div style={{ ...S.card, background: 'linear-gradient(135deg, #1B3A6B 0%, #162d55 100%)', border: '1px solid #2d4f8a' }}>
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '.06em', margin: '0 0 4px' }}>Total del día</p>
              <p style={{ fontSize: 42, fontWeight: 700, color: '#f59e0b', fontFamily: 'monospace', margin: '0 0 10px' }}>${fmt(resumen.ventas)}</p>
              <div style={{ display: 'flex', gap: 20 }}>
                <div>
                  <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', margin: '0 0 2px' }}>Órdenes</p>
                  <p style={{ fontSize: 20, fontWeight: 700, color: 'white', fontFamily: 'monospace', margin: 0 }}>{resumen.ordenes}</p>
                </div>
                <div>
                  <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', margin: '0 0 2px' }}>Ticket prom.</p>
                  <p style={{ fontSize: 20, fontWeight: 700, color: 'white', fontFamily: 'monospace', margin: 0 }}>${fmt(resumen.ticket)}</p>
                </div>
                <div>
                  <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', margin: '0 0 2px' }}>Margen</p>
                  <p style={{ fontSize: 20, fontWeight: 700, color: '#4ade80', fontFamily: 'monospace', margin: 0 }}>
                    {resumen.ventas > 0 ? (((resumen.ventas - resumen.costo) / resumen.ventas) * 100).toFixed(1) : '0'}%
                  </p>
                </div>
              </div>
            </div>

            {/* Por método de pago */}
            {Object.keys(resumen.porMetodo).length > 0 && (
              <div style={S.card}>
                <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 10 }}>Por método de pago</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {Object.entries(resumen.porMetodo).sort((a,b) => b[1]-a[1]).map(([m, total]) => (
                    <div key={m} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#60a5fa', flexShrink: 0 }}>
                        {METODO_ICONS[m] ?? <DollarSign size={14} />}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>{METODO_LABELS[m] ?? m}</span>
                          <span style={{ fontSize: 14, fontWeight: 700, color: 'white', fontFamily: 'monospace' }}>${fmt0(total)}</span>
                        </div>
                        <div style={{ height: 3, background: 'rgba(255,255,255,0.06)', borderRadius: 3, marginTop: 4 }}>
                          <div style={{ width: `${resumen.ventas > 0 ? (total/resumen.ventas)*100 : 0}%`, height: '100%', background: '#60a5fa', borderRadius: 3 }} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Resumen financiero */}
            <div style={S.card}>
              <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 10 }}>Resumen</p>
              {[
                { label: 'Ventas brutas', val: resumen.ventas, color: 'white' },
                { label: 'IVA', val: resumen.iva, color: 'rgba(255,255,255,0.5)' },
                { label: 'Costo ingredientes', val: resumen.costo, color: '#f87171' },
                { label: 'Merma', val: resumen.merma, color: resumen.merma > 0 ? '#f87171' : '#4ade80' },
                { label: 'Utilidad bruta', val: resumen.ventas - resumen.costo, color: '#4ade80' },
              ].map(row => (
                <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>{row.label}</span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: row.color, fontFamily: 'monospace' }}>${fmt(row.val)}</span>
                </div>
              ))}
            </div>

            {/* Cortes anteriores */}
            {cortesAnteriores.length > 0 && (
              <div style={S.card}>
                <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 10 }}>Cortes anteriores</p>
                {cortesAnteriores.slice(0,3).map(c => (
                  <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <div>
                      <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', margin: 0 }}>{c.cajero ?? 'Sin cajero'}</p>
                      <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', margin: '2px 0 0' }}>
                        {new Date(c.fecha_fin ?? c.created_at).toLocaleDateString('es-MX')} · {c.total_ordenes} órdenes
                      </p>
                    </div>
                    <span style={{ fontSize: 14, fontWeight: 700, color: '#4ade80', fontFamily: 'monospace' }}>${fmt(Number(c.total_ventas))}</span>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : null}
      </div>

      {/* Botón hacer corte — sticky al fondo */}
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, padding: '16px', background: 'linear-gradient(0deg, #0a1628 60%, transparent)', zIndex: 10 }}>
        <button onClick={hacerCorte} disabled={cerrando || !resumen || resumen.ordenes === 0}
          style={{ width: '100%', maxWidth: 480, margin: '0 auto', display: 'flex', padding: '16px', borderRadius: 16, border: 'none', background: (!resumen || resumen.ordenes === 0) ? 'rgba(245,158,11,0.3)' : '#f59e0b', color: '#1B3A6B', fontSize: 16, fontWeight: 700, cursor: (!resumen || resumen.ordenes === 0) ? 'not-allowed' : 'pointer', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          {cerrando ? <RefreshCw size={18} style={{ animation: 'spin 1s linear infinite' }} /> : <TrendingUp size={18} />}
          {cerrando ? 'Registrando...' : 'Hacer corte de caja'}
        </button>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
