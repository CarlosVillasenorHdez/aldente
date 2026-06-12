'use client';
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { TrendingUp, ShoppingCart, DollarSign, AlertTriangle, BarChart3, Package, Award, Users, ChevronDown } from 'lucide-react';
import { useReportesMejorados, Period } from '@/hooks/useReportesMejorados';

import { downloadXLSX } from '@/lib/exportUtils';
import { createClient } from '@/lib/supabase/client';
import { getCurrentTenantId as getTenantId } from '@/lib/tenantStore';
import { ordenesToRows } from '@/lib/exportUtils';
import { Download } from 'lucide-react';

export default function ReportesMejorados() {
  const {
    period, setPeriod,
    loading, kpis, breakeven,
    salesTrend, waiterStats,
    topProducts, bottomProducts, lowStock,
  } = useReportesMejorados();

  const supabase = createClient();
  const [exporting, setExporting] = React.useState(false);

  const PERIOD_LABELS: Record<Period, string> = { dia: 'Hoy', semana: 'Esta Semana', mes: 'Este Mes' };

  const handleExport = async () => {
    setExporting(true);
    try {
      const { start, end } = (() => {
        const now = new Date();
        if (period === 'dia') {
          const s = new Date(now); s.setHours(0,0,0,0);
          return { start: s.toISOString(), end: now.toISOString() };
        } else if (period === 'semana') {
          const s = new Date(now); s.setDate(now.getDate() - 7);
          return { start: s.toISOString(), end: now.toISOString() };
        } else {
          const s = new Date(now); s.setDate(now.getDate() - 30);
          return { start: s.toISOString(), end: now.toISOString() };
        }
      })();

      const { data: orders } = await supabase
        .from('orders').select('*')
        .eq('tenant_id', getTenantId())
        .eq('status', 'cerrada')
        .gte('closed_at', start)
        .lte('closed_at', end)
        .order('closed_at', { ascending: false });

      const fecha = new Date().toISOString().split('T')[0];
      await downloadXLSX(`aldente_ventas_${PERIOD_LABELS[period].toLowerCase().replace(' ', '_')}_${fecha}.xlsx`, [
        {
          name: 'Ventas',
          rows: ordenesToRows(orders ?? []),
        },
        {
          name: 'KPIs',
          rows: [
            { 'Indicador': 'Total ventas',     'Valor': kpis.totalVentas.toFixed(2) },
            { 'Indicador': 'Ventas restaurante','Valor': kpis.ventasRestaurante.toFixed(2) },
            { 'Indicador': 'Ventas extras',    'Valor': kpis.ventasExtras.toFixed(2) },
            { 'Indicador': 'Órdenes',          'Valor': kpis.totalOrdenes },
            { 'Indicador': 'Ticket promedio',  'Valor': kpis.ticketPromedio.toFixed(2) },
            { 'Indicador': 'Utilidad bruta',   'Valor': kpis.utilidadBruta.toFixed(2) },
            { 'Indicador': 'Margen %',         'Valor': kpis.margenPct.toFixed(1) + '%' },
            { 'Indicador': 'Merma',            'Valor': kpis.mermaTotal.toFixed(2) },
            { 'Indicador': 'Punto de equilibrio', 'Valor': breakeven.toFixed(2) },
          ],
        },
        {
          name: 'Por mesero',
          rows: waiterStats.map(w => ({
            'Mesero': w.mesero,
            'Órdenes': w.ordenes,
            'Total ventas': w.total.toFixed(2),
            'Ticket promedio': w.ticketPromedio.toFixed(2),
          })),
        },
        {
          name: 'Top platillos',
          rows: topProducts.map((p, i) => ({
            'Posición': i + 1,
            'Platillo': p.nombre,
            'Cantidad vendida': p.cantidad,
            'Ingresos': p.ingresos.toFixed(2),
          })),
        },
      ]);
    } finally {
      setExporting(false);
    }
  };


  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: '#f59e0b' }} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Period selector + Export */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex gap-2">
          {(['dia', 'semana', 'mes'] as Period[]).map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${period === p ? 'text-white' : 'text-white/60 bg-[#162d55] border border-[#243f72] hover:bg-[#0f1e38]'}`}
              style={period === p ? { backgroundColor: '#f59e0b', color: '#1B3A6B' } : {}}
          >
            {PERIOD_LABELS[p]}
          </button>
        ))}
        </div>
        <button
          onClick={handleExport}
          disabled={exporting || loading}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold border transition-colors disabled:opacity-50"
          style={{ borderColor: '#f59e0b', color: '#f59e0b', backgroundColor: '#162d55' }}
        >
          <Download size={15} />
          {exporting ? 'Exportando...' : 'Excel / CSV'}
        </button>
      </div>

      {/* Barra de interpretación — qué significan los números */}
      {(() => {
        const reads: { tone: 'good' | 'warn' | 'bad' | 'info'; text: string }[] = [];
        // Margen
        if (kpis.utilidadBruta > 0 && kpis.totalVentas > 0) {
          const m = kpis.margenPct;
          if (m >= 65) reads.push({ tone: 'good', text: `Margen bruto de ${m.toFixed(0)}% — saludable para restaurante (lo ideal es 60-70%).` });
          else if (m >= 55) reads.push({ tone: 'info', text: `Margen bruto de ${m.toFixed(0)}% — aceptable, pero hay espacio para optimizar costos o precios.` });
          else reads.push({ tone: 'warn', text: `Margen bruto de ${m.toFixed(0)}% — por debajo del objetivo. Revisa los costos de tus platillos más vendidos.` });
        }
        // Ticket promedio
        if (kpis.ticketPromedio > 0) {
          reads.push({ tone: 'info', text: `Ticket promedio de $${kpis.ticketPromedio.toFixed(0)}. Sugerir bebidas o postres puede subirlo sin más clientes.` });
        }
        // Merma
        if (kpis.mermaTotal > 0 && kpis.totalVentas > 0) {
          const mermaPct = (kpis.mermaTotal / kpis.totalVentas) * 100;
          if (mermaPct > 3) reads.push({ tone: 'bad', text: `Merma de $${kpis.mermaTotal.toFixed(0)} (${mermaPct.toFixed(1)}% de ventas) — alta. Cada peso de merma sale directo de tu utilidad.` });
          else reads.push({ tone: 'good', text: `Merma de $${kpis.mermaTotal.toFixed(0)} (${mermaPct.toFixed(1)}%) — bajo control.` });
        }
        // Break-even
        if (breakeven > 0) {
          if (kpis.totalVentas >= breakeven) reads.push({ tone: 'good', text: `Superaste tu punto de equilibrio ($${breakeven.toLocaleString('es-MX')}). Lo que vendas de más es ganancia.` });
          else reads.push({ tone: 'warn', text: `Aún no llegas al punto de equilibrio ($${breakeven.toLocaleString('es-MX')}). Te faltan $${(breakeven - kpis.totalVentas).toLocaleString('es-MX')}.` });
        }
        if (reads.length === 0) return null;
        const toneColor = { good: '#34d399', warn: '#fbbf24', bad: '#f87171', info: '#60a5fa' };
        return (
          <div className="rounded-xl p-4" style={{ background: '#162d55', border: '1px solid #243f72' }}>
            <p className="text-xs font-semibold mb-3" style={{ color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              💡 Qué dicen tus números
            </p>
            <div className="space-y-2">
              {reads.map((r, i) => (
                <div key={i} className="flex items-start gap-2.5">
                  <span style={{ color: toneColor[r.tone], fontSize: 16, lineHeight: '20px', flexShrink: 0 }}>•</span>
                  <p className="text-sm" style={{ color: 'rgba(255,255,255,0.8)', margin: 0, lineHeight: 1.5 }}>{r.text}</p>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Ventas Totales', value: `$${kpis.totalVentas.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`, icon: DollarSign, color: '#34d399' },
          ...(kpis.ventasExtras > 0 ? [
            { label: '↳ Restaurante', value: `$${kpis.ventasRestaurante.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`, icon: DollarSign, color: '#6ee7b7' },
            { label: '↳ Tienda extras', value: `$${kpis.ventasExtras.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`, icon: DollarSign, color: '#a78bfa' },
          ] : []),
          { label: 'Órdenes', value: kpis.totalOrdenes, icon: ShoppingCart, color: '#60a5fa' },
          { label: 'Ticket Promedio', value: `$${kpis.ticketPromedio.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`, icon: TrendingUp, color: '#f59e0b' },
          { label: 'Utilidad Bruta', value: kpis.utilidadBruta > 0 ? `$${kpis.utilidadBruta.toFixed(2)}` : '—', icon: TrendingUp, color: '#4ade80' },
          { label: '⚠️ Merma', value: kpis.mermaTotal > 0 ? `$${kpis.mermaTotal.toFixed(2)}` : '$0.00', icon: TrendingUp, color: kpis.mermaTotal > 0 ? '#f87171' : 'rgba(255,255,255,0.3)' },
          { label: 'Alertas Inventario', value: lowStock.length, icon: AlertTriangle, color: lowStock.length > 0 ? '#f87171' : 'rgba(255,255,255,0.3)' },
        ].map(k => (
          <div key={k.label} className="bg-[#162d55] rounded-xl p-4 shadow-sm border border-[#243f72] flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: k.color + '15' }}>
              <k.icon size={20} style={{ color: k.color }} />
            </div>
            <div>
              <p className="text-xs text-white/45">{k.label}</p>
              <p className="text-lg font-bold text-white">{k.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Sales Trend Chart */}
      <div className="bg-[#162d55] rounded-xl shadow-sm border border-[#243f72] p-6">
        <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
          <BarChart3 size={18} style={{ color: '#f59e0b' }} />
          Tendencia de Ventas — {(PERIOD_LABELS as any)[period]}
        </h3>
        {breakeven > 0 && <p className="text-xs mb-3" style={{color:'rgba(255,255,255,0.5)'}}>Meta de equilibrio: <strong style={{color:'#f59e0b'}}>${breakeven.toLocaleString('es-MX')}</strong> — debes superar esto para ser rentable</p>}
        {salesTrend.length === 0 ? (
          <div className="h-48 flex items-center justify-center text-white/40 text-sm">Sin datos para el período seleccionado</div>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={salesTrend}>
              <defs>
                <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#34d399" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#34d399" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: any) => [`$${Number(v).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`, 'Ventas']} />
              <Area type="monotone" dataKey="ventas" stroke="#34d399" fill="url(#salesGrad)" strokeWidth={2.5} />
              {breakeven > 0 && <Area type="monotone" dataKey="meta" stroke="rgba(255,255,255,0.35)" fill="none" strokeWidth={1.5} strokeDasharray="5 5" dot={false} />}
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Waiter performance */}
        <div className="bg-[#162d55] rounded-xl shadow-sm border border-[#243f72] p-6">
          <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
            <Users size={18} style={{ color: '#f59e0b' }} />
            Ticket Promedio por Mesero
          </h3>
          {waiterStats.length === 0 ? (
            <p className="text-sm text-white/40 text-center py-8">Sin datos</p>
          ) : (
            <div className="space-y-3">
              {waiterStats.map((w, i) => (
                <div key={w.mesero} className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0" style={{ backgroundColor: i === 0 ? '#f59e0b' : i === 1 ? '#9ca3af' : '#cd7f32' }}>
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-white truncate">{w.mesero}</span>
                      <span className="text-sm font-bold text-white">${w.ticketPromedio.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <div className="flex-1 bg-[#0f1e38] rounded-full h-1.5">
                        <div className="h-1.5 rounded-full" style={{ width: `${Math.min(100, (w.total / (waiterStats[0]?.total || 1)) * 100)}%`, backgroundColor: '#1B3A6B' }} />
                      </div>
                      <span className="text-xs text-white/40">{w.ordenes} órd.</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Low stock alerts */}
        <div className="bg-[#162d55] rounded-xl shadow-sm border border-[#243f72] p-6">
          <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
            <AlertTriangle size={18} className="text-red-500" />
            Alertas de Inventario Bajo
            {lowStock.length > 0 && (
              <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-red-50 text-red-600 font-medium">{lowStock.length} alertas</span>
            )}
          </h3>
          {lowStock.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Package size={32} className="text-green-400 mb-2" />
              <p className="text-sm text-green-600 font-medium">Inventario en niveles óptimos</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {lowStock.map(item => (
                <div key={item.nombre} className="flex items-center gap-3 p-2 rounded-lg bg-red-50">
                  <AlertTriangle size={14} className="text-red-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{item.nombre}</p>
                    <p className="text-xs text-red-600">Stock: {item.stock} {item.unit} / Mín: {item.minStock} {item.unit}</p>
                  </div>
                  <div className="w-16 bg-[#243f72] rounded-full h-1.5 flex-shrink-0">
                    <div className="h-1.5 rounded-full bg-red-500" style={{ width: `${Math.min(100, (item.stock / (item.minStock || 1)) * 100)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Top & Bottom products */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-[#162d55] rounded-xl shadow-sm border border-[#243f72] p-6">
          <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
            <Award size={18} style={{ color: '#10b981' }} />
            Productos Más Vendidos
          </h3>
          {topProducts.length === 0 ? (
            <p className="text-sm text-white/40 text-center py-8">Sin datos de ventas</p>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={topProducts.slice(0, 6)} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10 }} />
                <YAxis type="category" dataKey="nombre" tick={{ fontSize: 10 }} width={120} />
                <Tooltip formatter={(v: any) => [v, 'Unidades']} />
                <Bar dataKey="cantidad" fill="#f59e0b" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="bg-[#162d55] rounded-xl shadow-sm border border-[#243f72] p-6">
          <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
            <ChevronDown size={18} className="text-red-500" />
            Productos Menos Vendidos
          </h3>
          {bottomProducts.length === 0 ? (
            <p className="text-sm text-white/40 text-center py-8">Sin datos de ventas</p>
          ) : (
            <div className="space-y-2">
              {bottomProducts.map((p, i) => (
                <div key={p.nombre} className="flex items-center gap-3 p-2 rounded-lg hover:bg-[#0f1e38]">
                  <span className="text-xs font-bold text-white/40 w-5">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white truncate">{p.nombre}</p>
                    <p className="text-xs text-white/40">${p.ingresos.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</p>
                  </div>
                  <span className="text-sm font-medium text-red-500">{p.cantidad} uds.</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
