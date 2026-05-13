'use client';
import React, { useState, useCallback, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { getCurrentTenantId as getTenantId } from '@/lib/tenantStore';
import { useBranch } from '@/hooks/useBranch';
import { TrendingUp, TrendingDown, ShoppingBag, Users, AlertTriangle, DollarSign, ChevronDown, RefreshCw } from 'lucide-react';

type Range = 'hoy' | 'semana' | 'mes';

const fmt = (n: number) => n.toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
const fmtDec = (n: number) => n.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

interface KPIs {
  ventas: number; ordenes: number; ticket: number;
  costo: number; merma: number; margenPct: number;
  descuentos: number; iva: number;
}
interface Dish { name: string; count: number; revenue: number; margin_pct: number }

const RANGE_LABELS: Record<Range, string> = { hoy: 'Hoy', semana: 'Esta semana', mes: 'Este mes' };

export default function ReportesMobile() {
  const supabase = createClient();
  const { activeBranchId } = useBranch();
  const [range, setRange] = useState<Range>('hoy');
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState<KPIs | null>(null);
  const [topDishes, setTopDishes] = useState<Dish[]>([]);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [showRange, setShowRange] = useState(false);

  const getBounds = useCallback(() => {
    const now = new Date();
    const end = new Date(now); end.setHours(23, 59, 59, 999);
    let start: Date;
    if (range === 'hoy') {
      start = new Date(now); start.setHours(0, 0, 0, 0);
    } else if (range === 'semana') {
      start = new Date(now);
      start.setDate(now.getDate() - ((now.getDay() + 6) % 7));
      start.setHours(0, 0, 0, 0);
    } else {
      start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    }
    return { start: start.toISOString(), end: end.toISOString() };
  }, [range]);

  const load = useCallback(async () => {
    setLoading(true);
    const tid = getTenantId();
    const { start, end } = getBounds();

    const [{ data: orders }, { data: canceladas }, { data: items }] = await Promise.all([
      supabase.from('orders').select('total,cost_actual,pay_method,discount,iva')
        .eq('tenant_id', tid).eq('status', 'cerrada').eq('is_comanda', false)
        .gte('closed_at', start).lte('closed_at', end),
      supabase.from('orders').select('waste_cost')
        .eq('tenant_id', tid).eq('status', 'cancelada').eq('cancel_type', 'con_costo')
        .gte('updated_at', start).lte('updated_at', end),
      supabase.from('order_items').select('name,quantity,price,cost')
        .eq('tenant_id', tid)
        .gte('created_at', start).lte('created_at', end),
    ]);

    const rows = orders ?? [];
    const ventas = rows.reduce((s, o) => s + Number(o.total ?? 0), 0);
    const costo = rows.reduce((s, o) => s + Number(o.cost_actual ?? 0), 0);
    const merma = (canceladas ?? []).reduce((s, o) => s + Number(o.waste_cost ?? 0), 0);
    const descuentos = rows.reduce((s, o) => s + Number(o.discount ?? 0), 0);
    const iva = rows.reduce((s, o) => s + Number(o.iva ?? 0), 0);
    const ordenes = rows.length;
    const ticket = ordenes > 0 ? ventas / ordenes : 0;
    const margenPct = ventas > 0 ? ((ventas - costo) / ventas) * 100 : 0;

    setKpis({ ventas, ordenes, ticket, costo, merma, margenPct, descuentos, iva });

    // Top platillos
    const dishMap: Record<string, { count: number; revenue: number; cost: number }> = {};
    (items ?? []).forEach((i: any) => {
      const n = i.name ?? 'Sin nombre';
      if (!dishMap[n]) dishMap[n] = { count: 0, revenue: 0, cost: 0 };
      dishMap[n].count += Number(i.quantity ?? 1);
      dishMap[n].revenue += Number(i.price ?? 0) * Number(i.quantity ?? 1);
      dishMap[n].cost += Number(i.cost ?? 0) * Number(i.quantity ?? 1);
    });
    const dishes = Object.entries(dishMap)
      .map(([name, d]) => ({ name, count: d.count, revenue: d.revenue, margin_pct: d.revenue > 0 ? ((d.revenue - d.cost) / d.revenue) * 100 : 0 }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 8);

    setTopDishes(dishes);
    setLastUpdated(new Date());
    setLoading(false);
  }, [getBounds, supabase]);

  useEffect(() => { load(); }, [load]);

  const S = {
    card: { background: '#162d55', border: '1px solid #243f72', borderRadius: 16, padding: '16px 18px', marginBottom: 12 } as React.CSSProperties,
    label: { fontSize: 12, color: 'rgba(255,255,255,0.45)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em' } as React.CSSProperties,
    value: { fontSize: 28, fontWeight: 700, color: 'white', fontFamily: 'monospace', lineHeight: 1.1 } as React.CSSProperties,
  };

  return (
    <div style={{ padding: '0 0 80px', background: '#0a1628', minHeight: '100vh' }}>

      {/* Header */}
      <div style={{ padding: '16px 16px 0', position: 'sticky', top: 0, background: '#0a1628', zIndex: 10, paddingBottom: 12, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: 'white', margin: 0 }}>Reportes</h1>
          <button onClick={load} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            {lastUpdated ? lastUpdated.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }) : ''}
          </button>
        </div>

        {/* Selector de período */}
        <div style={{ position: 'relative', marginTop: 10 }}>
          <button onClick={() => setShowRange(s => !s)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 10, background: '#162d55', border: '1px solid #243f72', color: '#f59e0b', fontSize: 14, fontWeight: 600, cursor: 'pointer', width: '100%', justifyContent: 'space-between' }}>
            <span>{RANGE_LABELS[range]}</span>
            <ChevronDown size={16} style={{ transform: showRange ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
          </button>
          {showRange && (
            <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#162d55', border: '1px solid #243f72', borderRadius: 10, marginTop: 4, zIndex: 20, overflow: 'hidden' }}>
              {(['hoy', 'semana', 'mes'] as Range[]).map(r => (
                <button key={r} onClick={() => { setRange(r); setShowRange(false); }}
                  style={{ display: 'block', width: '100%', padding: '12px 16px', background: r === range ? 'rgba(245,158,11,0.1)' : 'none', border: 'none', color: r === range ? '#f59e0b' : 'rgba(255,255,255,0.7)', fontSize: 14, fontWeight: r === range ? 600 : 400, cursor: 'pointer', textAlign: 'left', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  {RANGE_LABELS[r]}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div style={{ padding: '16px 16px 0' }}>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 60, color: 'rgba(255,255,255,0.3)' }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', border: '2px solid rgba(245,158,11,0.3)', borderTopColor: '#f59e0b', animation: 'spin 1s linear infinite', margin: '0 auto 12px' }} />
            Cargando datos...
          </div>
        ) : kpis ? (
          <>
            {/* KPI Principal: Ventas */}
            <div style={{ ...S.card, background: 'linear-gradient(135deg, #1B3A6B 0%, #162d55 100%)', border: '1px solid #2d4f8a' }}>
              <p style={S.label}>Ventas {RANGE_LABELS[range].toLowerCase()}</p>
              <p style={{ ...S.value, fontSize: 40, color: '#f59e0b' }}>${fmt(kpis.ventas)}</p>
              <div style={{ display: 'flex', gap: 20, marginTop: 8 }}>
                <div>
                  <p style={S.label}>Órdenes</p>
                  <p style={{ fontSize: 22, fontWeight: 700, color: 'white', fontFamily: 'monospace' }}>{kpis.ordenes}</p>
                </div>
                <div>
                  <p style={S.label}>Ticket promedio</p>
                  <p style={{ fontSize: 22, fontWeight: 700, color: 'white', fontFamily: 'monospace' }}>${fmtDec(kpis.ticket)}</p>
                </div>
              </div>
            </div>

            {/* KPI Grid 2x2 */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
              {[
                { label: 'Margen', value: `${kpis.margenPct.toFixed(1)}%`, color: kpis.margenPct >= 60 ? '#4ade80' : kpis.margenPct >= 40 ? '#f59e0b' : '#f87171', icon: TrendingUp, sub: `Costo: $${fmt(kpis.costo)}` },
                { label: 'Descuentos', value: `$${fmt(kpis.descuentos)}`, color: kpis.descuentos > 0 ? '#f87171' : '#4ade80', icon: TrendingDown, sub: kpis.descuentos > 0 ? 'Aplicados' : 'Sin descuentos' },
                { label: 'IVA', value: `$${fmt(kpis.iva)}`, color: '#60a5fa', icon: DollarSign, sub: 'Por remitir' },
                { label: 'Merma', value: `$${fmtDec(kpis.merma)}`, color: kpis.merma > 0 ? '#f87171' : '#4ade80', icon: AlertTriangle, sub: kpis.merma > 0 ? 'Platillos cancelados' : 'Sin mermas ✓' },
              ].map(card => (
                <div key={card.label} style={{ background: '#162d55', border: '1px solid #243f72', borderRadius: 14, padding: '14px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                    <card.icon size={14} style={{ color: card.color }} />
                    <p style={S.label}>{card.label}</p>
                  </div>
                  <p style={{ fontSize: 22, fontWeight: 700, color: card.color, fontFamily: 'monospace', margin: 0 }}>{card.value}</p>
                  <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 3 }}>{card.sub}</p>
                </div>
              ))}
            </div>

            {/* Top platillos */}
            {topDishes.length > 0 && (
              <div style={S.card}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 14 }}>
                  <ShoppingBag size={14} style={{ color: '#f59e0b' }} />
                  <p style={{ ...S.label, margin: 0 }}>Top platillos</p>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {topDishes.map((d, i) => {
                    const maxRev = topDishes[0]?.revenue ?? 1;
                    const pct = (d.revenue / maxRev) * 100;
                    return (
                      <div key={d.name}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
                            <span style={{ fontSize: 12, color: '#f59e0b', fontWeight: 700, minWidth: 18 }}>#{i + 1}</span>
                            <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.85)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.name}</span>
                          </div>
                          <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 12 }}>
                            <span style={{ fontSize: 14, fontWeight: 700, color: 'white', fontFamily: 'monospace' }}>${fmt(d.revenue)}</span>
                            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginLeft: 6 }}>{d.count}x</span>
                          </div>
                        </div>
                        <div style={{ height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 4, overflow: 'hidden' }}>
                          <div style={{ width: `${pct}%`, height: '100%', background: d.margin_pct >= 60 ? '#4ade80' : d.margin_pct >= 40 ? '#f59e0b' : '#f87171', borderRadius: 4 }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Resumen financiero */}
            <div style={S.card}>
              <p style={{ ...S.label, marginBottom: 12 }}>Resumen financiero</p>
              {[
                ['Ventas brutas', kpis.ventas, 'white'],
                ['− Descuentos', -kpis.descuentos, '#f87171'],
                ['− Costo ingredientes', -kpis.costo, '#f87171'],
                ['= Utilidad bruta', kpis.ventas - kpis.costo - kpis.descuentos, '#4ade80'],
                ['− Merma', -kpis.merma, '#f87171'],
              ].map(([label, val, color]) => (
                <div key={label as string} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)' }}>{label}</span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: color as string, fontFamily: 'monospace' }}>${fmt(Math.abs(val as number))}</span>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div style={{ textAlign: 'center', padding: 60, color: 'rgba(255,255,255,0.3)' }}>Sin datos para el período seleccionado</div>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
