'use client';
/**
 * DashboardInsights — Panel accionable
 * Analiza los KPIs del día y genera insights con acción concreta
 */
import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { getCurrentTenantId as getTenantId } from '@/lib/tenantStore';
import { useBranch } from '@/hooks/useBranch';
import { useRouter } from 'next/navigation';
import {
  TrendingUp, TrendingDown, AlertTriangle, CheckCircle,
  ArrowRight, Zap, Package, DollarSign, Users, ShoppingBag,
} from 'lucide-react';

interface Insight {
  id: string;
  type: 'warning' | 'success' | 'info' | 'urgent';
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: { label: string; href: string };
}

const COLORS = {
  warning: { bg: 'rgba(251,191,36,0.08)', border: 'rgba(251,191,36,0.25)', icon: '#fbbf24', text: 'rgba(255,255,255,0.8)' },
  urgent:  { bg: 'rgba(248,113,113,0.08)', border: 'rgba(248,113,113,0.3)',  icon: '#f87171', text: 'rgba(255,255,255,0.8)' },
  success: { bg: 'rgba(74,222,128,0.06)',  border: 'rgba(74,222,128,0.2)',   icon: '#4ade80', text: 'rgba(255,255,255,0.8)' },
  info:    { bg: 'rgba(96,165,250,0.07)',  border: 'rgba(96,165,250,0.2)',   icon: '#60a5fa', text: 'rgba(255,255,255,0.8)' },
};

const fmt = (n: number) => n.toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

export default function DashboardInsights() {
  const supabase = createClient();
  const { activeBranchId } = useBranch();
  const router = useRouter();
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const tid = getTenantId();
    if (!tid) { setLoading(false); return; }

    const now = new Date();
    const todayUTC = new Date(now); todayUTC.setHours(0, 0, 0, 0);
    const yest = new Date(todayUTC); yest.setDate(yest.getDate() - 1);
    const sameHourYest = new Date(yest); sameHourYest.setHours(now.getHours(), now.getMinutes());

    let qOrders = supabase.from('orders')
      .select('total, cost_actual, pay_method, discount')
      .eq('tenant_id', tid).eq('status', 'cerrada').eq('is_comanda', false)
      .gte('closed_at', todayUTC.toISOString());
    if (activeBranchId) qOrders = (qOrders as any).eq('branch_id', activeBranchId);

    const [
      { data: orders },
      { data: ordersYest },
      { data: abiertas },
      { data: canceladas },
      { data: lowStock },
      { data: gastos },
      { data: employees },
    ] = await Promise.all([
      qOrders,
      supabase.from('orders').select('total').eq('tenant_id', tid).eq('status', 'cerrada')
        .eq('is_comanda', false).gte('closed_at', yest.toISOString()).lt('closed_at', sameHourYest.toISOString()),
      supabase.from('orders').select('id, created_at').eq('tenant_id', tid)
        .in('status', ['abierta', 'preparacion']).order('created_at', { ascending: true }),
      supabase.from('orders').select('waste_cost').eq('tenant_id', tid)
        .eq('status', 'cancelada').eq('cancel_type', 'con_costo').gte('updated_at', todayUTC.toISOString()),
      supabase.from('ingredients').select('name, stock, min_stock')
        .eq('tenant_id', tid).gt('min_stock', 0),
      supabase.from('gastos_recurrentes').select('nombre, monto, proximo_pago')
        .eq('tenant_id', tid).eq('activo', true)
        .lte('proximo_pago', new Date(now.getTime() + 7 * 86400000).toISOString().slice(0, 10)),
      supabase.from('employees').select('id').eq('tenant_id', tid).eq('status', 'activo'),
    ]);

    const ventasHoy = (orders ?? []).reduce((s, o) => s + Number(o.total ?? 0), 0);
    const ventasAyer = (ordersYest ?? []).reduce((s, o) => s + Number(o.total ?? 0), 0);
    const costoHoy = (orders ?? []).reduce((s, o) => s + Number(o.cost_actual ?? 0), 0);
    const mermaHoy = (canceladas ?? []).reduce((s, o) => s + Number(o.waste_cost ?? 0), 0);
    const margen = ventasHoy > 0 ? ((ventasHoy - costoHoy) / ventasHoy) * 100 : 0;
    const tendencia = ventasAyer > 0 ? ((ventasHoy - ventasAyer) / ventasAyer) * 100 : null;
    const criticos = (lowStock ?? []).filter(i => Number(i.stock) <= Number(i.min_stock));
    const descuentos = (orders ?? []).reduce((s, o) => s + Number(o.discount ?? 0), 0);

    // Órdenes demoradas (abiertas > 30 min)
    const demoradas = (abiertas ?? []).filter(o => {
      const mins = (now.getTime() - new Date(o.created_at).getTime()) / 60000;
      return mins > 30;
    });

    const nextInsights: Insight[] = [];

    // 1. Tendencia de ventas negativa
    if (tendencia !== null && tendencia < -10) {
      nextInsights.push({
        id: 'ventas-bajas', type: 'warning',
        icon: <TrendingDown size={16} />,
        title: `Ventas ${Math.abs(tendencia).toFixed(0)}% por debajo de ayer`,
        description: `A esta hora ayer llevabas $${fmt(ventasAyer)}. Hoy vas en $${fmt(ventasHoy)}.`,
        action: { label: 'Ver reportes', href: '/reportes' },
      });
    }

    // 2. Tendencia positiva
    if (tendencia !== null && tendencia > 15) {
      nextInsights.push({
        id: 'ventas-altas', type: 'success',
        icon: <TrendingUp size={16} />,
        title: `Buen ritmo — ${tendencia.toFixed(0)}% más que ayer a esta hora`,
        description: `$${fmt(ventasHoy)} vs $${fmt(ventasAyer)} ayer. Sigue así.`,
      });
    }

    // 3. Stock crítico
    if (criticos.length > 0) {
      nextInsights.push({
        id: 'stock-critico', type: 'urgent',
        icon: <Package size={16} />,
        title: `${criticos.length} ingrediente${criticos.length > 1 ? 's' : ''} en nivel crítico`,
        description: criticos.slice(0, 3).map(i => i.name).join(', ') + (criticos.length > 3 ? ` y ${criticos.length - 3} más` : ''),
        action: { label: 'Ver inventario', href: '/inventario' },
      });
    }

    // 4. Margen bajo
    if (ventasHoy > 0 && margen < 40) {
      nextInsights.push({
        id: 'margen-bajo', type: 'warning',
        icon: <DollarSign size={16} />,
        title: `Margen del día en ${margen.toFixed(1)}% — por debajo del objetivo`,
        description: `El costo de ingredientes está consumiendo más de lo esperado. Revisa las recetas o los costos.`,
        action: { label: 'Ver P&L', href: '/reportes' },
      });
    }

    // 5. Órdenes demoradas
    if (demoradas.length > 0) {
      nextInsights.push({
        id: 'ordenes-demoradas', type: 'urgent',
        icon: <ShoppingBag size={16} />,
        title: `${demoradas.length} orden${demoradas.length > 1 ? 'es' : ''} lleva${demoradas.length > 1 ? 'n' : ''} más de 30 min abierta${demoradas.length > 1 ? 's' : ''}`,
        description: 'Revisa si hay órdenes olvidadas o mesas que necesitan atención.',
        action: { label: 'Ver cocina', href: '/cocina' },
      });
    }

    // 6. Merma significativa
    if (mermaHoy > ventasHoy * 0.03 && mermaHoy > 0) {
      nextInsights.push({
        id: 'merma-alta', type: 'warning',
        icon: <AlertTriangle size={16} />,
        title: `Merma de $${fmt(mermaHoy)} — ${((mermaHoy / ventasHoy) * 100).toFixed(1)}% de las ventas`,
        description: 'Las cancelaciones con costo están impactando tu rentabilidad del día.',
        action: { label: 'Ver reportes', href: '/reportes' },
      });
    }

    // 7. Gastos próximos a vencer
    if ((gastos ?? []).length > 0) {
      const totalGastos = (gastos ?? []).reduce((s, g) => s + Number(g.monto), 0);
      nextInsights.push({
        id: 'gastos-proximos', type: 'info',
        icon: <DollarSign size={16} />,
        title: `${gastos!.length} gasto${gastos!.length > 1 ? 's' : ''} por pagar en los próximos 7 días`,
        description: `Total: $${fmt(totalGastos)}. ${gastos![0].nombre}${gastos!.length > 1 ? ` y ${gastos!.length - 1} más` : ''}.`,
        action: { label: 'Ver gastos', href: '/gastos' },
      });
    }

    // 8. Descuentos altos
    if (descuentos > ventasHoy * 0.05 && ventasHoy > 0) {
      nextInsights.push({
        id: 'descuentos-altos', type: 'warning',
        icon: <AlertTriangle size={16} />,
        title: `Descuentos altos: $${fmt(descuentos)} (${((descuentos / ventasHoy) * 100).toFixed(1)}% de ventas)`,
        description: 'Verifica que los descuentos aplicados estén autorizados.',
      });
    }

    // 9. Todo bien
    if (nextInsights.length === 0 && ventasHoy > 0) {
      nextInsights.push({
        id: 'todo-bien', type: 'success',
        icon: <CheckCircle size={16} />,
        title: 'Todo en orden — buen día hasta ahora',
        description: `$${fmt(ventasHoy)} en ventas, margen del ${margen.toFixed(1)}%, sin alertas críticas.`,
      });
    }

    // Ordenar: urgentes primero
    const order = { urgent: 0, warning: 1, info: 2, success: 3 };
    nextInsights.sort((a, b) => order[a.type] - order[b.type]);
    setInsights(nextInsights.slice(0, 5));
    setLoading(false);
  }, [activeBranchId, supabase]);

  useEffect(() => { load(); }, [load]);

  // Refresh cada 3 minutos
  useEffect(() => {
    const t = setInterval(load, 3 * 60 * 1000);
    return () => clearInterval(t);
  }, [load]);

  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {[1, 2, 3].map(i => (
        <div key={i} style={{ height: 64, borderRadius: 12, background: 'rgba(255,255,255,0.03)', animation: 'pulse 1.5s infinite' }} />
      ))}
    </div>
  );

  if (insights.length === 0) return null;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <Zap size={15} style={{ color: '#f59e0b' }} />
        <span style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Insights del día
        </span>
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', marginLeft: 4 }}>
          actualizado cada 3 min
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {insights.map(insight => {
          const colors = COLORS[insight.type];
          return (
            <div key={insight.id} style={{
              background: colors.bg, border: `1px solid ${colors.border}`,
              borderRadius: 12, padding: '12px 16px',
              display: 'flex', alignItems: 'center', gap: 12,
            }}>
              <div style={{ color: colors.icon, flexShrink: 0 }}>{insight.icon}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: 'white', margin: 0 }}>
                  {insight.title}
                </p>
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', margin: '2px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {insight.description}
                </p>
              </div>
              {insight.action && (
                <button
                  onClick={() => router.push(insight.action!.href)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 4,
                    padding: '5px 12px', borderRadius: 8, flexShrink: 0,
                    border: `1px solid ${colors.border}`, background: 'rgba(255,255,255,0.06)',
                    color: colors.icon, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                    whiteSpace: 'nowrap',
                  }}>
                  {insight.action.label} <ArrowRight size={11} />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
