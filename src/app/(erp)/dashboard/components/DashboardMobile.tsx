'use client';
/**
 * DashboardMobile — Vista optimizada para teléfono
 * Responde: ¿Cómo está mi restaurante AHORA?
 */
import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { getCurrentTenantId as getTenantId } from '@/lib/tenantStore';
import { useBranch } from '@/hooks/useBranch';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import {
  TrendingUp, TrendingDown, ShoppingBag, AlertTriangle,
  ChefHat, RefreshCw, BarChart2, Package, Users,
  CreditCard, Utensils, ArrowRight,
} from 'lucide-react';

const fmt = (n: number) => n.toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
const fmtDec = (n: number) => n.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

interface LiveData {
  ventasHoy: number;
  ventasAyer: number;
  ordenes: number;
  ordenesAbiertas: number;
  ticket: number;
  margen: number;
  merma: number;
  mesasOcupadas: number;
  mesasTotal: number;
  stockCritico: number;
}

const QUICK_ACTIONS = [
  { label: 'Punto de Venta', icon: CreditCard, href: '/pos-punto-de-venta', color: '#f59e0b' },
  { label: 'Mesero', icon: Utensils, href: '/mesero', color: '#60a5fa' },
  { label: 'Cocina', icon: ChefHat, href: '/cocina', color: '#4ade80' },
  { label: 'Inventario', icon: Package, href: '/inventario', color: '#c084fc' },
  { label: 'Reportes', icon: BarChart2, href: '/reportes', color: '#f87171' },
  { label: 'Personal', icon: Users, href: '/personal', color: '#fb923c' },
];

export default function DashboardMobile() {
  const supabase = createClient();
  const { activeBranchId } = useBranch();
  const { appUser } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<LiveData | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [greeting, setGreeting] = useState('Buenos días');

  useEffect(() => {
    const h = new Date().getHours();
    setGreeting(h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches');
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    const tid = getTenantId();
    const now = new Date();
    const todayUTC = new Date(now); todayUTC.setHours(0, 0, 0, 0);
    const yest = new Date(todayUTC); yest.setDate(yest.getDate() - 1);
    const sameHourYest = new Date(yest); sameHourYest.setHours(now.getHours(), now.getMinutes());

    let qOrders = supabase.from('orders').select('total,cost_actual,waste_cost')
      .eq('tenant_id', tid).eq('status', 'cerrada').eq('is_comanda', false)
      .gte('closed_at', todayUTC.toISOString());
    if (activeBranchId) qOrders = (qOrders as any).eq('branch_id', activeBranchId);

    const [
      { data: orders },
      { data: ayerOrders },
      { data: abiertas },
      { data: canceladas },
      { data: mesas },
      { data: ingredients },
    ] = await Promise.all([
      qOrders,
      supabase.from('orders').select('total').eq('tenant_id', tid).eq('status', 'cerrada')
        .eq('is_comanda', false).gte('closed_at', yest.toISOString()).lt('closed_at', sameHourYest.toISOString()),
      supabase.from('orders').select('id').eq('tenant_id', tid)
        .in('status', ['abierta', 'preparacion', 'lista']),
      supabase.from('orders').select('waste_cost').eq('tenant_id', tid)
        .eq('status', 'cancelada').eq('cancel_type', 'con_costo').gte('updated_at', todayUTC.toISOString()),
      supabase.from('restaurant_tables').select('status').eq('tenant_id', tid),
      supabase.from('ingredients').select('stock,min_stock').eq('tenant_id', tid),
    ]);

    const rows = orders ?? [];
    const ventasHoy = rows.reduce((s, o) => s + Number(o.total ?? 0), 0);
    const costoHoy = rows.reduce((s, o) => s + Number(o.cost_actual ?? 0), 0);
    const merma = (canceladas ?? []).reduce((s, o) => s + Number(o.waste_cost ?? 0), 0);
    const ventasAyer = (ayerOrders ?? []).reduce((s, o) => s + Number(o.total ?? 0), 0);
    const ordenes = rows.length;
    const ticket = ordenes > 0 ? ventasHoy / ordenes : 0;
    const margen = ventasHoy > 0 ? ((ventasHoy - costoHoy) / ventasHoy) * 100 : 0;
    const mesasList = mesas ?? [];
    const mesasOcupadas = mesasList.filter((m: any) => m.status === 'ocupada').length;
    const stockCritico = (ingredients ?? []).filter((i: any) => Number(i.stock) < Number(i.min_stock) && Number(i.min_stock) > 0).length;

    setData({ ventasHoy, ventasAyer, ordenes, ordenesAbiertas: (abiertas ?? []).length, ticket, margen, merma, mesasOcupadas, mesasTotal: mesasList.length, stockCritico });
    setLastUpdated(new Date());
    setLoading(false);
  }, [activeBranchId, supabase]);

  useEffect(() => { load(); }, [load]);

  // Auto-refresh cada 2 minutos
  useEffect(() => {
    const t = setInterval(load, 120_000);
    return () => clearInterval(t);
  }, [load]);

  const trend = data && data.ventasAyer > 0
    ? ((data.ventasHoy - data.ventasAyer) / data.ventasAyer) * 100
    : null;

  const S = {
    card: { background: '#162d55', border: '1px solid #243f72', borderRadius: 16, padding: '16px 18px', marginBottom: 12 } as React.CSSProperties,
  };

  return (
    <div style={{ padding: '0 0 100px', background: '#0a1628', minHeight: '100vh' }}>

      {/* Header */}
      <div style={{ padding: '20px 16px 16px', background: 'linear-gradient(180deg, #0f1e38 0%, #0a1628 100%)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', margin: '0 0 2px' }}>{greeting},</p>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: 'white', margin: 0 }}>
              {appUser?.fullName?.split(' ')[0] ?? 'Bienvenido'} 👋
            </h1>
          </div>
          <button onClick={load} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer', color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>
            <RefreshCw size={13} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
            {lastUpdated ? lastUpdated.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }) : 'Actualizar'}
          </button>
        </div>
      </div>

      <div style={{ padding: '14px 16px 0' }}>

        {loading && !data ? (
          <div style={{ textAlign: 'center', padding: 60, color: 'rgba(255,255,255,0.3)' }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', border: '2px solid rgba(245,158,11,0.3)', borderTopColor: '#f59e0b', animation: 'spin 1s linear infinite', margin: '0 auto 12px' }} />
            Cargando...
          </div>
        ) : data ? (
          <>
            {/* Ventas del día — KPI principal */}
            <div style={{ ...S.card, background: 'linear-gradient(135deg, #1B3A6B 0%, #162d55 100%)', border: '1px solid #2d4f8a', marginBottom: 10 }}>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 4px' }}>Ventas hoy</p>
              <p style={{ fontSize: 42, fontWeight: 700, color: '#f59e0b', fontFamily: 'monospace', lineHeight: 1, margin: '0 0 10px' }}>${fmt(data.ventasHoy)}</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                {trend !== null && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    {trend >= 0
                      ? <TrendingUp size={14} style={{ color: '#4ade80' }} />
                      : <TrendingDown size={14} style={{ color: '#f87171' }} />}
                    <span style={{ fontSize: 13, fontWeight: 600, color: trend >= 0 ? '#4ade80' : '#f87171' }}>{trend >= 0 ? '+' : ''}{trend.toFixed(1)}%</span>
                    <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>vs. ayer a esta hora</span>
                  </div>
                )}
                <div style={{ display: 'flex', gap: 16 }}>
                  <div>
                    <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>Órdenes </span>
                    <span style={{ fontSize: 15, fontWeight: 700, color: 'white', fontFamily: 'monospace' }}>{data.ordenes}</span>
                  </div>
                  <div>
                    <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>Ticket </span>
                    <span style={{ fontSize: 15, fontWeight: 700, color: 'white', fontFamily: 'monospace' }}>${fmtDec(data.ticket)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Grid de estado operacional */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
              {/* Margen */}
              <div style={{ ...S.card, margin: 0, padding: '14px 16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                  <TrendingUp size={13} style={{ color: data.margen >= 60 ? '#4ade80' : data.margen >= 40 ? '#f59e0b' : '#f87171' }} />
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '.05em' }}>Margen</span>
                </div>
                <p style={{ fontSize: 26, fontWeight: 700, color: data.margen >= 60 ? '#4ade80' : data.margen >= 40 ? '#f59e0b' : '#f87171', fontFamily: 'monospace', margin: 0 }}>{data.margen.toFixed(1)}%</p>
              </div>

              {/* Órdenes abiertas */}
              <div style={{ ...S.card, margin: 0, padding: '14px 16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                  <ShoppingBag size={13} style={{ color: '#60a5fa' }} />
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '.05em' }}>En curso</span>
                </div>
                <p style={{ fontSize: 26, fontWeight: 700, color: '#60a5fa', fontFamily: 'monospace', margin: 0 }}>{data.ordenesAbiertas}</p>
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 3 }}>órdenes activas</p>
              </div>

              {/* Mesas */}
              <div style={{ ...S.card, margin: 0, padding: '14px 16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                  <Utensils size={13} style={{ color: '#c084fc' }} />
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '.05em' }}>Mesas</span>
                </div>
                <p style={{ fontSize: 26, fontWeight: 700, color: '#c084fc', fontFamily: 'monospace', margin: 0 }}>
                  {data.mesasOcupadas}<span style={{ fontSize: 14, color: 'rgba(255,255,255,0.35)' }}>/{data.mesasTotal}</span>
                </p>
                {data.mesasTotal > 0 && (
                  <div style={{ marginTop: 6, height: 4, background: 'rgba(255,255,255,0.08)', borderRadius: 4 }}>
                    <div style={{ width: `${(data.mesasOcupadas / data.mesasTotal) * 100}%`, height: '100%', background: '#c084fc', borderRadius: 4 }} />
                  </div>
                )}
              </div>

              {/* Alertas */}
              <div style={{ ...S.card, margin: 0, padding: '14px 16px', border: data.stockCritico > 0 ? '1px solid rgba(248,113,113,0.4)' : '1px solid #243f72', background: data.stockCritico > 0 ? 'rgba(248,113,113,0.08)' : '#162d55' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                  <AlertTriangle size={13} style={{ color: data.stockCritico > 0 ? '#f87171' : '#4ade80' }} />
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '.05em' }}>Alertas</span>
                </div>
                <p style={{ fontSize: 26, fontWeight: 700, color: data.stockCritico > 0 ? '#f87171' : '#4ade80', fontFamily: 'monospace', margin: 0 }}>{data.stockCritico}</p>
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 3 }}>
                  {data.stockCritico > 0 ? 'stock crítico' : 'sin alertas ✓'}
                </p>
              </div>
            </div>

            {/* Merma — solo si hay */}
            {data.merma > 0 && (
              <div style={{ ...S.card, background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.3)', display: 'flex', alignItems: 'center', gap: 12 }}>
                <AlertTriangle size={20} style={{ color: '#f87171', flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 13, color: '#f87171', fontWeight: 600, margin: 0 }}>Merma hoy: ${fmtDec(data.merma)}</p>
                  <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>Platillos cancelados con costo</p>
                </div>
              </div>
            )}

            {/* Acciones rápidas */}
            <div style={{ marginBottom: 12 }}>
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 10, fontWeight: 600 }}>Acceso rápido</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                {QUICK_ACTIONS.map(action => (
                  <button key={action.href} onClick={() => router.push(action.href)}
                    style={{ background: '#162d55', border: '1px solid #243f72', borderRadius: 14, padding: '14px 8px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, cursor: 'pointer', transition: 'background 0.15s' }}
                    onTouchStart={e => (e.currentTarget.style.background = '#243f72')}
                    onTouchEnd={e => (e.currentTarget.style.background = '#162d55')}>
                    <div style={{ width: 40, height: 40, borderRadius: 12, background: `${action.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <action.icon size={18} style={{ color: action.color }} />
                    </div>
                    <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', fontWeight: 500, textAlign: 'center', lineHeight: 1.2 }}>{action.label}</span>
                  </button>
                ))}
              </div>
            </div>

          </>
        ) : null}

        {/* Ver reportes completos */}
        <button onClick={() => router.push('/reportes')}
          style={{ width: '100%', padding: '14px', borderRadius: 14, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', color: '#f59e0b', fontSize: 14, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          Ver reportes completos <ArrowRight size={16} />
        </button>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
