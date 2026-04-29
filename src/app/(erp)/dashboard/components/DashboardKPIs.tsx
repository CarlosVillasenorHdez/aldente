'use client';
import { getCurrentTenantId as getTenantId } from '@/lib/tenantStore';
import { useBranch } from '@/hooks/useBranch';
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
  const supabase = createClient();
  const { activeBranchId } = useBranch();
  const [proximaNomina, setProximaNomina] = useState<{ diasPara: number; monto: number; frecuencia: string } | null>(null);

  const [kpis, setKpis] = useState({
    ventasHoy: 0, ventasAyer: 0,
    ordenesAbiertas: 0, totalMesas: 0, mesasOcupadas: 0,
    platilloTop: '—', platilloTopQty: 0,
    ticketPromedio: 0,
    utilidadHoy: 0, mermaHoy: 0, margenHoy: 0,
    alertasInventario: [] as string[],
    gastosPorPagar: [] as {nombre:string;monto:number;proximo_pago:string}[],
    totalGastosPorPagar: 0,
    puntoEquilibrioHoy: 0,   // cuánto necesita vender hoy para cubrir costos fijos
    proyeccionCierre: 0,      // proyección de ventas al cierre del día
    horasTranscurridas: 0,
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

        const [
          { data: cerradasHoy },
          { data: extrasHoy },
          { data: mermaOrdersRaw },
          { data: cerradasAyer },
          { data: abiertas },
          { data: mesas },
          { data: topItems },
          { data: ingAlerta },
          { data: gastosAlert },
        ] = await Promise.all([
          (activeBranchId
            ? supabase.from('orders').select('id, total, cost_actual, margin_actual, waste_cost').eq('tenant_id', getTenantId()).eq('branch_id', activeBranchId).eq('status', 'cerrada').eq('is_comanda', false).gte('closed_at', todayUTC)
            : supabase.from('orders').select('id, total, cost_actual, margin_actual, waste_cost').eq('tenant_id', getTenantId()).eq('status', 'cerrada').eq('is_comanda', false).gte('closed_at', todayUTC)),
          supabase.from('extras_sales').select('price, qty').eq('tenant_id', getTenantId()).gte('sold_at', todayUTC),
          supabase.from('orders').select('waste_cost').eq('tenant_id', getTenantId()).eq('status', 'cancelada').eq('cancel_type', 'con_costo').gte('updated_at', todayUTC),
          supabase.from('orders').select('total, cost_actual, margin_actual').eq('tenant_id', getTenantId()).eq('status', 'cerrada').eq('is_comanda', false).gte('closed_at', yesterdayUTC).lt('closed_at', sameHourYesterdayUTC),
          supabase.from('orders').select('id').eq('tenant_id', getTenantId()).in('status', ['abierta', 'preparacion', 'lista']),
          supabase.from('restaurant_tables').select('status').eq('tenant_id', getTenantId()),
          supabase.from('order_items').select('name, qty, order_id').eq('tenant_id', getTenantId()).gte('created_at', todayUTC),
          supabase.from('ingredients').select('name, stock, min_stock').eq('tenant_id', getTenantId()),
          supabase.from('gastos_recurrentes')
            .select('nombre, monto, proximo_pago, frecuencia')
            .eq('tenant_id', getTenantId())
            .eq('activo', true)
            .eq('estado', 'pendiente'),
        ]);

        const ventasRestaurante = (cerradasHoy || []).reduce((s, o) => s + Number(o.total), 0);
        const ventasExtrasHoy   = (extrasHoy || []).reduce((s: number, e: any) => s + Number(e.price ?? 0) * Number(e.qty ?? 1), 0);
        const ventasHoy  = ventasRestaurante + ventasExtrasHoy;
        const ventasAyer = (cerradasAyer || []).reduce((s, o) => s + Number(o.total), 0);
        const ticketPromedio = cerradasHoy?.length ? ventasHoy / cerradasHoy.length : 0;
        const utilidadHoy = (cerradasHoy || []).reduce((s, o) => s + Number((o as any).margin_actual ?? 0), 0);
        // Merma lives on cancelled comandas, NOT on closed orders
        const mermaHoy = (mermaOrdersRaw || []).reduce((s: number, o: any) => s + Number(o.waste_cost ?? 0), 0);
        const margenHoy = ventasHoy > 0 ? (utilidadHoy / ventasHoy) * 100 : 0;
        const mesasOcupadas = (mesas || []).filter((m) => m.status === 'ocupada').length;
        const totalMesas = (mesas || []).length;

        // Only count items from closed billing orders (not comandas)
        const closedOrderIds = new Set((cerradasHoy || []).map((o: any) => o.id));
        const itemMap: Record<string, number> = {};
        (topItems || [])
          .filter((i: any) => closedOrderIds.has(i.order_id))
          .forEach((i: any) => { itemMap[i.name] = (itemMap[i.name] || 0) + Number(i.qty); });
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

        // Próximo pago de nómina
        const { data: ultimoPagoNom } = await supabase.from('pagos_nomina')
          .select('fecha_pago, frecuencia, monto_pagado')
          .eq('tenant_id', getTenantId()).eq('status', 'pagado')
          .order('fecha_pago', { ascending: false }).limit(1).maybeSingle();
        
        if (ultimoPagoNom) {
          const freq = ultimoPagoNom.frecuencia ?? 'mensual';
          const diasCiclo = freq === 'semanal' ? 7 : freq === 'quincenal' ? 15 : 30;
          const diasDesde = Math.floor((Date.now() - new Date(ultimoPagoNom.fecha_pago).getTime()) / 86400000);
          const diasPara = Math.max(0, diasCiclo - diasDesde);
          setProximaNomina({ diasPara, monto: Number(ultimoPagoNom.monto_pagado), frecuencia: freq });
        }

        // Punto de equilibrio diario (gastos fijos ÷ 30)
        // Usar nómina + gastos recurrentes del tenant
        const { data: empData } = await supabase.from('employees').select('salary, salary_frequency').eq('tenant_id', getTenantId()).eq('status', 'activo');
        const { data: gastosData } = await supabase.from('gastos_recurrentes').select('monto, frecuencia').eq('tenant_id', getTenantId()).eq('activo', true);
        const nominaMes = (empData ?? []).reduce((s: number, e: any) => {
          const sal = Number(e.salary ?? 0);
          const freq = e.salary_frequency ?? 'mensual';
          return s + (freq === 'quincenal' ? sal * 2 : freq === 'semanal' ? sal * 4.33 : sal);
        }, 0);
        const gastosMes = (gastosData ?? []).reduce((s: number, g: any) => {
          const f = g.frecuencia ?? 'mensual';
          const factor = f==='diario'?30 : f==='semanal'?4.33 : f==='quincenal'?2 : f==='mensual'?1 : f==='bimestral'?0.5 : f==='trimestral'?1/3 : f==='semestral'?1/6 : 1/12;
          return s + Number(g.monto ?? 0) * factor;
        }, 0);
        const costosFijosMes = nominaMes + gastosMes;
        const puntoEquilibrioHoy = costosFijosMes > 0 ? Math.round(costosFijosMes / 30) : 0;

        // Proyección de cierre (extrapolación lineal por hora del día)
        const horasTranscurridas = nowMX.getHours() + nowMX.getMinutes() / 60;
        const proyeccionCierre = horasTranscurridas > 1
          ? Math.round((ventasHoy / horasTranscurridas) * 24 * 0.6) // factor 0.6 = no lineal, hay horas pico
          : 0;

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
          puntoEquilibrioHoy, proyeccionCierre,
          horasTranscurridas,
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
  }, []);

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-4 gap-4">
      {/* Hero KPI — col-span-2 */}
      <div className="col-span-2">
        <KPICard
          title="Ventas del Día"
          value={`$${kpis.ventasHoy.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`}
          trend={kpis.ventasAyer > 0 ? ((kpis.ventasHoy - kpis.ventasAyer) / kpis.ventasAyer) * 100 : undefined}
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
        subValue={`${kpis.totalMesas > 0 ? Math.round((kpis.mesasOcupadas / kpis.totalMesas) * 100) : 0}% de ocupación`}
        icon={LayoutGrid}
        color="green"
        loading={loading}
      />

      <KPICard
        title="Platillo Top del Día"
        value={kpis.platilloTop}
        subValue={`${kpis.platilloTopQty} vendidos hoy`}
        icon={Star}
        color="purple"
        loading={loading}
      />

      <KPICard
        title="Ticket Promedio"
        value={`$${Math.round(kpis.ticketPromedio).toLocaleString('es-MX')}`}
        icon={Receipt}
        color="green"
        loading={loading}
      />

      <KPICard
        title="Utilidad del Día"
        value={kpis.utilidadHoy > 0 ? `$${kpis.utilidadHoy.toFixed(2)}` : '—'}
        subValue={kpis.margenHoy > 0 ? `${kpis.margenHoy.toFixed(1)}% margen bruto` : 'Sin datos de costo'}
        icon={TrendingUp}
        color="green"
        loading={loading}
      />

      <KPICard
        title="Merma del Día"
        value={kpis.mermaHoy > 0 ? `$${kpis.mermaHoy.toFixed(2)}` : '$0.00'}
        subValue={kpis.mermaHoy > 0 ? 'Platillos cancelados con costo' : 'Sin mermas registradas ✓'}
        icon={AlertTriangle}
        color={kpis.mermaHoy > 0 ? 'red' : 'green'}
        alert={kpis.mermaHoy > 0}
        loading={loading}
      />

      {/* Recordatorio próxima nómina */}
      {proximaNomina !== null && (
        <div className="kpi-card">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Nómina</span>
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${proximaNomina.diasPara <= 3 ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
              {proximaNomina.diasPara === 0 ? '¡Hoy!' : `${proximaNomina.diasPara}d`}
            </span>
          </div>
          <p className="text-xl font-black text-gray-900">${Math.round(proximaNomina.monto).toLocaleString('es-MX')}</p>
          <p className="text-xs text-gray-400 mt-0.5">
            {proximaNomina.diasPara === 0 ? 'Vence hoy — ' : `En ${proximaNomina.diasPara} días — `}
            <a href="/recursos-humanos" className="text-blue-600 underline">Registrar pago</a>
          </p>
        </div>
      )}

      {/* Punto de equilibrio */}
      {kpis.puntoEquilibrioHoy > 0 && (
        <div className="kpi-card col-span-2">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Punto de equilibrio hoy</span>
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${kpis.ventasHoy >= kpis.puntoEquilibrioHoy ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
              {kpis.ventasHoy >= kpis.puntoEquilibrioHoy ? '✓ Cubierto' : `Faltan $${(kpis.puntoEquilibrioHoy - kpis.ventasHoy).toLocaleString('es-MX', { maximumFractionDigits: 0 })}`}
            </span>
          </div>
          <div className="flex items-end gap-3 mb-3">
            <span className="text-2xl font-black text-gray-900">${kpis.ventasHoy.toLocaleString('es-MX', { maximumFractionDigits: 0 })}</span>
            <span className="text-sm text-gray-400 mb-0.5">de ${kpis.puntoEquilibrioHoy.toLocaleString('es-MX', { maximumFractionDigits: 0 })} necesarios</span>
          </div>
          <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${Math.min(100, (kpis.ventasHoy / kpis.puntoEquilibrioHoy) * 100)}%`,
                backgroundColor: kpis.ventasHoy >= kpis.puntoEquilibrioHoy ? '#22c55e' : '#f59e0b',
              }}
            />
          </div>
          <p className="text-xs text-gray-400 mt-1.5">
            {Math.round((kpis.ventasHoy / kpis.puntoEquilibrioHoy) * 100)}% del punto de equilibrio diario
            {kpis.proyeccionCierre > 0 && ` · Proyección cierre: $${kpis.proyeccionCierre.toLocaleString('es-MX', { maximumFractionDigits: 0 })}`}
          </p>
        </div>
      )}

      {/* Gastos por pagar alert */}
      {/* Gastos por pagar — prominent card with list */}
      {kpis.gastosPorPagar.length > 0 && (
        <div className="col-span-2 md:col-span-4">
          <div className="kpi-card" style={{
            backgroundColor: kpis.gastosPorPagar.some(g => new Date(g.proximo_pago) < new Date()) ? '#fef2f2' : '#fffbeb',
            borderColor: kpis.gastosPorPagar.some(g => new Date(g.proximo_pago) < new Date()) ? '#fca5a5' : '#fde68a',
          }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'12px' }}>
              <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                <span style={{ fontSize:'18px' }}>💳</span>
                <div>
                  <p style={{ fontSize:'11px', fontWeight:600, color: '#92400e', textTransform:'uppercase', letterSpacing:'0.05em' }}>
                    {kpis.gastosPorPagar.some(g => new Date(g.proximo_pago) < new Date()) ? '⚠️ Pagos vencidos' : 'Pagos próximos'}
                  </p>
                  <p style={{ fontSize:'18px', fontWeight:700, color: '#92400e' }}>
                    ${kpis.totalGastosPorPagar.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
              <a href="/gastos" style={{ fontSize:'12px', fontWeight:600, color:'#d97706', textDecoration:'none', padding:'6px 12px', borderRadius:'8px', backgroundColor:'rgba(245,158,11,0.1)', border:'1px solid rgba(245,158,11,0.3)' }}>
                Ver gastos →
              </a>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:'6px' }}>
              {kpis.gastosPorPagar.slice(0, 4).map(g => {
                const isOverdue = new Date(g.proximo_pago) < new Date();
                return (
                  <div key={g.nombre} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'6px 10px', borderRadius:'8px', backgroundColor: isOverdue ? 'rgba(239,68,68,0.08)' : 'rgba(255,255,255,0.6)' }}>
                    <span style={{ fontSize:'13px', color: isOverdue ? '#dc2626' : '#92400e', fontWeight: isOverdue ? 600 : 400 }}>
                      {isOverdue ? '🔴' : '🟡'} {g.nombre}
                    </span>
                    <div style={{ textAlign:'right' }}>
                      <span style={{ fontSize:'13px', fontWeight:700, color: isOverdue ? '#dc2626' : '#92400e', fontFamily:'monospace' }}>
                        ${Number(g.monto).toLocaleString('es-MX')}
                      </span>
                      <span style={{ fontSize:'11px', color:'#9ca3af', marginLeft:'6px' }}>{g.proximo_pago}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Inventory alert — gated for Estándar plan */}
      {/* Gate: basico has no alarmas/inventario features */}
      {(!features.inventario && !features.alarmas) ? (
        <div className="col-span-2" style={{ backgroundColor: '#fffbeb', border: '1px solid #fde68a', borderRadius: '12px', padding: '16px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '12px', backgroundColor: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '18px' }}>🔒</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '11px', fontWeight: 600, color: '#92400e', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '3px' }}>Alertas de inventario</div>
            <div style={{ fontSize: '13px', color: '#b45309' }}>Disponible en el plan Estándar — activa el inventario para recibir alertas de stock bajo antes de que afecten tu servicio.</div>
          </div>
          <a href="/configuracion" style={{ padding: '7px 14px', borderRadius: '8px', backgroundColor: '#d97706', color: '#fff', fontSize: '12px', fontWeight: 600, textDecoration: 'none', whiteSpace: 'nowrap', flexShrink: 0 }}>Ver plan →</a>
        </div>
      ) : kpis.alertasInventario.length > 0 && (
        <div className="col-span-2">
          <KPICard
            title={`Alerta de Inventario (${kpis.alertasInventario.length})`}
            value={`${kpis.alertasInventario.length} items`}
            subValue={kpis.alertasInventario.length > 0 ? kpis.alertasInventario.slice(0, 3).join(' · ') + ' bajo mínimo' : 'Sin alertas activas'}
            icon={AlertTriangle}
            color="red"
            alert
            span="wide"
            loading={loading}
          />
        </div>
      )}
    </div>
  );
}