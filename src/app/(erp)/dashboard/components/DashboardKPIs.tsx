'use client';
import { getCurrentTenantId as getTenantId } from '@/lib/tenantStore';



import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  TrendingDown,
  ClipboardList,
  LayoutGrid,
  Star,
  Receipt,
  AlertTriangle,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useFeatures } from '@/hooks/useFeatures';
import { useAuth } from '@/contexts/AuthContext';
import Icon from '@/components/ui/AppIcon';



interface KPICardProps {
  title: string;
  value: string;
  subValue?: string;
  trend?: number;
  trendLabel?: string;
  icon: React.ElementType;
  color: 'amber' | 'green' | 'red' | 'blue' | 'purple' | 'orange';
  alert?: boolean;
  span?: 'normal' | 'wide';
  loading?: boolean;
}

const colorMap = {
  amber: { bg: '#fffbeb', iconBg: '#fef3c7', iconColor: '#d97706', border: '#fde68a' },
  green: { bg: '#f0fdf4', iconBg: '#dcfce7', iconColor: '#16a34a', border: '#86efac' },
  red: { bg: '#fef2f2', iconBg: '#fee2e2', iconColor: '#dc2626', border: '#fca5a5' },
  blue: { bg: '#eff6ff', iconBg: '#dbeafe', iconColor: '#2563eb', border: '#93c5fd' },
  purple: { bg: '#faf5ff', iconBg: '#ede9fe', iconColor: '#7c3aed', border: '#c4b5fd' },
  orange: { bg: '#fff7ed', iconBg: '#ffedd5', iconColor: '#ea580c', border: '#fdba74' },
};

function KPICard({ title, value, subValue, trend, trendLabel, icon: Icon, color, alert, span, loading }: KPICardProps) {
  const colors = colorMap[color];
  const isPositive = trend !== undefined && trend >= 0;

  return (
    <div
      className={`kpi-card relative ${alert ? 'ring-2 ring-red-300' : ''} ${span === 'wide' ? 'col-span-2' : ''}`}
      style={{ backgroundColor: alert ? '#fef2f2' : colors.bg, borderColor: alert ? '#fca5a5' : colors.border }}
    >
      {alert && (
        <div className="absolute top-3 right-3">
          <AlertTriangle size={16} className="text-red-500" />
        </div>
      )}
      <div className="flex items-start justify-between">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: colors.iconBg }}
        >
          <Icon size={20} style={{ color: colors.iconColor }} />
        </div>
        {trend !== undefined && (
          <div
            className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full"
            style={{
              backgroundColor: isPositive ? '#dcfce7' : '#fee2e2',
              color: isPositive ? '#166534' : '#991b1b',
              fontWeight: 600,
            }}
          >
            {isPositive ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
            {Math.abs(trend)}%
          </div>
        )}
      </div>

      <div className="mt-3">
        <p
          className="text-xs font-500 tracking-wide uppercase mb-1"
          style={{ color: '#6b7280', fontWeight: 500, letterSpacing: '0.05em' }}
        >
          {title}
        </p>
        {loading ? (
          <div className="h-8 w-20 rounded-lg animate-pulse bg-gray-200 mt-1" />
        ) : (
          <p
            className="text-3xl font-700 tabular-nums font-mono leading-none"
            style={{ color: '#111827', fontWeight: 700 }}
          >
            {value}
          </p>
        )}
        {subValue && !loading && (
          <p className="text-xs mt-1.5" style={{ color: '#6b7280' }}>
            {subValue}
          </p>
        )}
        {trendLabel && !loading && (
          <p className="text-xs mt-1" style={{ color: '#9ca3af' }}>
            {trendLabel}
          </p>
        )}
      </div>
    </div>
  );
}

export default function DashboardKPIs() {
  const { features } = useFeatures();
  const { tenantId } = useAuth();
  const supabase = createClient();
  const [kpis, setKpis] = useState({
    ventasHoy: 0, ventasAyer: 0,
    ordenesAbiertas: 0, totalMesas: 0, mesasOcupadas: 0,
    platilloTop: '—', platilloTopQty: 0,
    ticketPromedio: 0,
    utilidadHoy: 0, mermaHoy: 0, margenHoy: 0,
    alertasInventario: [] as string[],
    gastosPorPagar: [] as {nombre:string;monto:number;proximo_pago:string}[],
    totalGastosPorPagar: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        // Use Mexico City timezone (UTC-6 / UTC-5 DST) for day boundaries
        const nowMX = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Mexico_City' }));
        const startOfTodayMX = new Date(nowMX);
        startOfTodayMX.setHours(0, 0, 0, 0);
        const startOfYesterdayMX = new Date(startOfTodayMX);
        startOfYesterdayMX.setDate(startOfYesterdayMX.getDate() - 1);
        // Yesterday up to the same hour as right now (apples-to-apples)
        const sameHourYesterdayMX = new Date(startOfYesterdayMX);
        sameHourYesterdayMX.setHours(nowMX.getHours(), nowMX.getMinutes(), nowMX.getSeconds());

        // Convert back to UTC ISO strings for Supabase queries
        const todayUTC = startOfTodayMX.toISOString();
        const yesterdayUTC = startOfYesterdayMX.toISOString();
        const sameHourYesterdayUTC = sameHourYesterdayMX.toISOString();

        // Helper: apply tenant filter to any query (defense-in-depth alongside RLS)
        const withTenant = (q: any): Promise<{ data: any[] | null; error: any }> =>
          tenantId ? q.eq('tenant_id', tenantId) : q;

        const [
          { data: cerradasHoy },
          { data: mermaOrdersRaw },
          { data: cerradasAyer },
          { data: abiertas },
          { data: mesas },
          { data: topItems },
          { data: ingAlerta },
          { data: gastosAlert },
        ] = await Promise.all([
          supabase.from('orders').select('total, cost_actual, margin_actual, waste_cost').eq('tenant_id', getTenantId()).eq('status', 'cerrada').eq('is_comanda', false).gte('created_at', todayUTC),
          supabase.from('orders').select('waste_cost').eq('tenant_id', getTenantId()).eq('status', 'cancelada').eq('cancel_type', 'con_costo').gte('updated_at', todayUTC),
          supabase.from('orders').select('total, cost_actual, margin_actual').eq('tenant_id', getTenantId()).eq('status', 'cerrada').eq('is_comanda', false).gte('created_at', yesterdayUTC).lt('created_at', sameHourYesterdayUTC),
          supabase.from('orders').select('id').eq('tenant_id', getTenantId()).in('status', ['abierta', 'preparacion', 'lista']),
          supabase.from('restaurant_tables').select('status').eq('tenant_id', getTenantId()),
          supabase.from('order_items').select('name, qty').eq('tenant_id', getTenantId()).gte('created_at', todayUTC),
          supabase.from('ingredients').select('name, stock, min_stock').eq('tenant_id', getTenantId()),
          supabase.from('gastos_recurrentes')
            .select('nombre, monto, proximo_pago, frecuencia')
            .eq('activo', true)
            .eq('estado', 'pendiente'),
        ]);

        const ventasHoy = (cerradasHoy || []).reduce((s: number, o: any) => s + Number(o.total), 0);
        const ventasAyer = (cerradasAyer || []).reduce((s: number, o: any) => s + Number(o.total), 0);
        const ticketPromedio = cerradasHoy?.length ? ventasHoy / cerradasHoy.length : 0;
        const utilidadHoy = (cerradasHoy || []).reduce((s: number, o: any) => s + Number(o.margin_actual ?? 0), 0);
        // Merma lives on cancelled comandas, NOT on closed orders
        const mermaHoy = (mermaOrdersRaw || []).reduce((s: number, o: any) => s + Number(o.waste_cost ?? 0), 0);
        const margenHoy = ventasHoy > 0 ? (utilidadHoy / ventasHoy) * 100 : 0;
        const mesasOcupadas = (mesas || []).filter((m) => m.status === 'ocupada').length;
        const totalMesas = (mesas || []).length;

        const itemMap: Record<string, number> = {};
        (topItems || []).forEach((i) => { itemMap[i.name] = (itemMap[i.name] || 0) + i.qty; });
        const topEntry = Object.entries(itemMap).sort((a, b) => b[1] - a[1])[0] ?? ['—', 0];

        const alertasInventario = (ingAlerta || [])
          .filter((i) => Number(i.stock) <= Number(i.min_stock))
          .map((i) => i.name);

        const today = new Date();
        const gastosPorPagar = (gastosAlert || []).filter((g: any) => {
          if (!g.proximo_pago) return false;
          const proxPago = new Date(g.proximo_pago);
          const diffDias = Math.ceil((proxPago.getTime() - today.getTime()) / 86400000);
          return diffDias <= 7; // due in 7 days or overdue
        });
        const totalGastosPorPagar = gastosPorPagar.reduce((s: number, g: any) => s + Number(g.monto), 0);

        setKpis({
          ventasHoy, ventasAyer,
          ordenesAbiertas: (abiertas || []).length,
          totalMesas, mesasOcupadas,
          platilloTop: topEntry[0] as string,
          platilloTopQty: topEntry[1] as number,
          ticketPromedio,
          utilidadHoy, mermaHoy, margenHoy,
          alertasInventario,
          gastosPorPagar: gastosPorPagar as {nombre:string;monto:number;proximo_pago:string}[],
          totalGastosPorPagar,
        });
      } catch (err) {
        console.error('Dashboard KPI fetch error:', err);
      } finally {
        setLoading(false);
      }
    }
    load();

    // Real-time subscriptions: refresh KPIs whenever orders or ingredients change
    const channel = supabase
      .channel('dashboard-kpis-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => { load(); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'order_items' }, () => { load(); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ingredients' }, () => { load(); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'restaurant_tables' }, () => { load(); })
      .subscribe();

    // Fallback polling every 60s in case Realtime disconnects
    const interval = setInterval(() => { load(); }, 60000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [tenantId]);

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-4 gap-4">
      {/* Hero KPI — col-span-2 */}
      <div className="col-span-2">
        <KPICard
          title="Ventas del Día"
          value={`$${kpis.ventasHoy.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`}
          trend={kpis.ventasAyer > 0 ? Math.round(((kpis.ventasHoy - kpis.ventasAyer) / kpis.ventasAyer) * 100) : undefined}
          trendLabel={`vs. ayer a esta hora ($${kpis.ventasAyer.toLocaleString('es-MX', { minimumFractionDigits: 0 })})`}
          icon={TrendingUp}
          color="amber"
          span="wide"
          loading={loading}
        />
      </div>

      <KPICard
        title="Órdenes Abiertas"
        value={`${kpis.ordenesAbiertas}`}
        icon={ClipboardList}
        color="blue"
        loading={loading}
      />

      <KPICard
        title="Mesas Ocupadas"
        value={`${kpis.mesasOcupadas}/${kpis.totalMesas}`}
        icon={LayoutGrid}
        color="purple"
        loading={loading}
      />

      <KPICard
        title="Platillo Top"
        value={kpis.platilloTop}
        subValue={kpis.platilloTopQty > 0 ? `${kpis.platilloTopQty} vendidos hoy` : undefined}
        icon={Star}
        color="orange"
        loading={loading}
      />

      <KPICard
        title="Ticket Promedio"
        value={`$${kpis.ticketPromedio.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`}
        icon={Receipt}
        color="green"
        loading={loading}
      />

      {features.gastos && (
        <KPICard
          title="Gastos por Pagar"
          value={`$${kpis.totalGastosPorPagar.toLocaleString('es-MX', { minimumFractionDigits: 0 })}`}
          subValue={kpis.gastosPorPagar.length > 0 ? `${kpis.gastosPorPagar.length} pago(s) próximos` : 'Sin pagos próximos'}
          icon={AlertTriangle}
          color={kpis.totalGastosPorPagar > 0 ? 'red' : 'green'}
          alert={kpis.totalGastosPorPagar > 0}
          loading={loading}
        />
      )}

      {kpis.alertasInventario.length > 0 && (
        <KPICard
          title="Alertas Inventario"
          value={`${kpis.alertasInventario.length}`}
          subValue={kpis.alertasInventario.slice(0, 2).join(', ')}
          icon={AlertTriangle}
          color="red"
          alert
          loading={loading}
        />
      )}
    </div>
  );
}