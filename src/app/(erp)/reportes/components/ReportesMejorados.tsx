'use client';
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { TrendingUp, ShoppingCart, DollarSign, AlertTriangle, BarChart3, Package, Award, Users, ChevronDown } from 'lucide-react';
import { useReportesMejorados, Period } from '@/hooks/useReportesMejorados';

export default function ReportesMejorados() {
  const {
    period, setPeriod,
    loading, kpis, breakeven,
    salesTrend, waiterStats,
    topProducts, bottomProducts, lowStock,
  } = useReportesMejorados();

  const PERIOD_LABELS: Record<Period, string> = { dia: 'Hoy', semana: 'Esta Semana', mes: 'Este Mes' };


  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: '#f59e0b' }} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Period selector */}
      <div className="flex gap-2">
        {(['dia', 'semana', 'mes'] as Period[]).map(p => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${period === p ? 'text-white' : 'text-gray-600 bg-white border border-gray-200 hover:bg-gray-50'}`}
            style={period === p ? { backgroundColor: '#1B3A6B' } : {}}
          >
            {PERIOD_LABELS[p]}
          </button>
        ))}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Ventas Totales', value: `$${kpis.totalVentas.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`, icon: DollarSign, color: '#10b981' },
          ...(kpis.ventasExtras > 0 ? [
            { label: '↳ Restaurante', value: `$${kpis.ventasRestaurante.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`, icon: DollarSign, color: '#6ee7b7' },
            { label: '↳ Tienda extras', value: `$${kpis.ventasExtras.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`, icon: DollarSign, color: '#a78bfa' },
          ] : []),
          { label: 'Órdenes', value: kpis.totalOrdenes, icon: ShoppingCart, color: '#1B3A6B' },
          { label: 'Ticket Promedio', value: `$${kpis.ticketPromedio.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`, icon: TrendingUp, color: '#f59e0b' },
          { label: 'Utilidad Bruta', value: kpis.utilidadBruta > 0 ? `$${kpis.utilidadBruta.toFixed(2)}` : '—', icon: TrendingUp, color: '#16a34a' },
          { label: '⚠️ Merma', value: kpis.mermaTotal > 0 ? `$${kpis.mermaTotal.toFixed(2)}` : '$0.00', icon: TrendingUp, color: kpis.mermaTotal > 0 ? '#dc2626' : '#9ca3af' },
          { label: 'Alertas Inventario', value: lowStock.length, icon: AlertTriangle, color: lowStock.length > 0 ? '#ef4444' : '#6b7280' },
        ].map(k => (
          <div key={k.label} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: k.color + '15' }}>
              <k.icon size={20} style={{ color: k.color }} />
            </div>
            <div>
              <p className="text-xs text-gray-500">{k.label}</p>
              <p className="text-lg font-bold text-gray-800">{k.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Sales Trend Chart */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <BarChart3 size={18} style={{ color: '#1B3A6B' }} />
          Tendencia de Ventas — {(PERIOD_LABELS as any)[period]}
        </h3>
        {breakeven > 0 && <p className="text-xs mb-3" style={{color:'#9ca3af'}}>Meta de equilibrio: <strong style={{color:'#6b7280'}}>${breakeven.toLocaleString('es-MX')}</strong> — debes superar esto para ser rentable</p>}
        {salesTrend.length === 0 ? (
          <div className="h-48 flex items-center justify-center text-gray-400 text-sm">Sin datos para el período seleccionado</div>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={salesTrend}>
              <defs>
                <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#1B3A6B" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#1B3A6B" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: any) => [`$${Number(v).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`, 'Ventas']} />
              <Area type="monotone" dataKey="ventas" stroke="#1B3A6B" fill="url(#salesGrad)" strokeWidth={2} />
              {breakeven > 0 && <Area type="monotone" dataKey="meta" stroke="#9ca3af" fill="none" strokeWidth={1.5} strokeDasharray="5 5" dot={false} />}
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Waiter performance */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Users size={18} style={{ color: '#f59e0b' }} />
            Ticket Promedio por Mesero
          </h3>
          {waiterStats.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">Sin datos</p>
          ) : (
            <div className="space-y-3">
              {waiterStats.map((w, i) => (
                <div key={w.mesero} className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0" style={{ backgroundColor: i === 0 ? '#f59e0b' : i === 1 ? '#9ca3af' : '#cd7f32' }}>
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-800 truncate">{w.mesero}</span>
                      <span className="text-sm font-bold text-gray-800">${w.ticketPromedio.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                        <div className="h-1.5 rounded-full" style={{ width: `${Math.min(100, (w.total / (waiterStats[0]?.total || 1)) * 100)}%`, backgroundColor: '#1B3A6B' }} />
                      </div>
                      <span className="text-xs text-gray-400">{w.ordenes} órd.</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Low stock alerts */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
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
                    <p className="text-sm font-medium text-gray-800 truncate">{item.nombre}</p>
                    <p className="text-xs text-red-600">Stock: {item.stock} {item.unit} / Mín: {item.minStock} {item.unit}</p>
                  </div>
                  <div className="w-16 bg-gray-200 rounded-full h-1.5 flex-shrink-0">
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
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Award size={18} style={{ color: '#10b981' }} />
            Productos Más Vendidos
          </h3>
          {topProducts.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">Sin datos de ventas</p>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={topProducts.slice(0, 6)} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10 }} />
                <YAxis type="category" dataKey="nombre" tick={{ fontSize: 10 }} width={120} />
                <Tooltip formatter={(v: any) => [v, 'Unidades']} />
                <Bar dataKey="cantidad" fill="#10b981" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <ChevronDown size={18} className="text-red-500" />
            Productos Menos Vendidos
          </h3>
          {bottomProducts.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">Sin datos de ventas</p>
          ) : (
            <div className="space-y-2">
              {bottomProducts.map((p, i) => (
                <div key={p.nombre} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50">
                  <span className="text-xs font-bold text-gray-400 w-5">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-800 truncate">{p.nombre}</p>
                    <p className="text-xs text-gray-400">${p.ingresos.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</p>
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
