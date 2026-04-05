'use client';

import { TrendingUp, TrendingDown, ShoppingBag, Users, Clock, CreditCard, UtensilsCrossed, Star } from 'lucide-react';

// Backend integration point: replace with real-time data from Supabase or API
const kpiData = {
  ventasHoy: { value: 18_420, target: 22_000, change: +8.4, trend: 'up' as const },
  ordenesActivas: { value: 7, total: 12, change: -2, trend: 'down' as const },
  ocupacionMesas: { value: 68, totalMesas: 16, ocupadas: 11, trend: 'up' as const, change: +5 },
  ticketPromedio: { value: 312, change: +12.1, trend: 'up' as const },
  tiempoCocinaProm: { value: 18, target: 15, change: +3, trend: 'down' as const },
  ordenesEntregadas: { value: 59, change: +14, trend: 'up' as const },
};

function formatMXN(value: number) {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(value);
}

function TrendBadge({ change, trend, suffix = '' }: { change: number; trend: 'up' | 'down'; suffix?: string }) {
  const isPositive = trend === 'up';
  return (
    <span className="inline-flex items-center gap-0.5 text-xs font-semibold px-1.5 py-0.5 rounded-md"
      style={{
        backgroundColor: isPositive ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
        color: isPositive ? '#4ade80' : '#f87171',
      }}>
      {isPositive ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
      {change > 0 ? '+' : ''}{change}{suffix}
    </span>
  );
}

export default function KPIBentoGrid() {
  const progress = (kpiData.ventasHoy.value / kpiData.ventasHoy.target) * 100;

  return (
    // Grid plan: 6 cards → grid-cols-4 (2xl) 
    // Row 1: hero card spans 2 cols + 2 regular = 4 cols
    // Row 2: 4 regular cards = 4 cols
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-4 gap-4">

      {/* HERO: Ventas del Día — spans 2 cols */}
      <div className="sm:col-span-2 lg:col-span-2 rounded-2xl p-5 relative overflow-hidden"
        style={{ backgroundColor: '#1a2535', border: '1px solid rgba(245,158,11,0.25)' }}>
        <div className="absolute top-0 right-0 w-40 h-40 rounded-full opacity-5"
          style={{ background: 'radial-gradient(circle, #f59e0b 0%, transparent 70%)', transform: 'translate(30%, -30%)' }} />
        <div className="flex items-start justify-between mb-3">
          <div>
            <p className="text-xs font-semibold tracking-wide uppercase" style={{ color: 'rgba(255,255,255,0.45)' }}>
              Ventas del Día
            </p>
            <p className="text-3xl font-bold mt-1 tabular-nums text-white">
              {formatMXN(kpiData.ventasHoy.value)}
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)' }}>
            <CreditCard size={18} style={{ color: '#f59e0b' }} />
          </div>
        </div>
        <div className="mb-2">
          <div className="flex justify-between text-xs mb-1.5" style={{ color: 'rgba(255,255,255,0.45)' }}>
            <span>Meta: {formatMXN(kpiData.ventasHoy.target)}</span>
            <span className="font-semibold" style={{ color: '#f59e0b' }}>{progress.toFixed(0)}%</span>
          </div>
          <div className="w-full h-1.5 rounded-full" style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}>
            <div className="h-1.5 rounded-full transition-all duration-700"
              style={{ width: `${Math.min(progress, 100)}%`, background: 'linear-gradient(90deg, #f59e0b, #fbbf24)' }} />
          </div>
        </div>
        <div className="flex items-center gap-2 mt-3">
          <TrendBadge change={kpiData.ventasHoy.change} trend={kpiData.ventasHoy.trend} suffix="% vs ayer" />
          <span className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>vs mismo periodo ayer</span>
        </div>
      </div>

      {/* Órdenes Activas */}
      <div className="rounded-2xl p-5" style={{ backgroundColor: '#1a2535', border: '1px solid #2a3f5f' }}>
        <div className="flex items-start justify-between mb-3">
          <p className="text-xs font-semibold tracking-wide uppercase" style={{ color: 'rgba(255,255,255,0.45)' }}>
            Órdenes Activas
          </p>
          <div className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.25)' }}>
            <ShoppingBag size={16} style={{ color: '#60a5fa' }} />
          </div>
        </div>
        <p className="text-3xl font-bold tabular-nums text-white">{kpiData.ordenesActivas.value}</p>
        <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.35)' }}>
          de {kpiData.ordenesActivas.total} abiertas hoy
        </p>
        <div className="mt-3">
          <TrendBadge change={kpiData.ordenesActivas.change} trend={kpiData.ordenesActivas.trend} suffix=" vs hora anterior" />
        </div>
      </div>

      {/* Ocupación de Mesas */}
      <div className="rounded-2xl p-5" style={{ backgroundColor: '#1a2535', border: '1px solid #2a3f5f' }}>
        <div className="flex items-start justify-between mb-3">
          <p className="text-xs font-semibold tracking-wide uppercase" style={{ color: 'rgba(255,255,255,0.45)' }}>
            Ocupación Mesas
          </p>
          <div className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.2)' }}>
            <Users size={16} style={{ color: '#4ade80' }} />
          </div>
        </div>
        <div className="flex items-end gap-2">
          <p className="text-3xl font-bold tabular-nums text-white">{kpiData.ocupacionMesas.value}%</p>
          <p className="text-sm mb-1 font-medium" style={{ color: 'rgba(255,255,255,0.4)' }}>
            {kpiData.ocupacionMesas.ocupadas}/{kpiData.ocupacionMesas.totalMesas}
          </p>
        </div>
        <div className="mt-3">
          <TrendBadge change={kpiData.ocupacionMesas.change} trend={kpiData.ocupacionMesas.trend} suffix="% vs ayer" />
        </div>
      </div>

      {/* Ticket Promedio */}
      <div className="rounded-2xl p-5" style={{ backgroundColor: '#1a2535', border: '1px solid #2a3f5f' }}>
        <div className="flex items-start justify-between mb-3">
          <p className="text-xs font-semibold tracking-wide uppercase" style={{ color: 'rgba(255,255,255,0.45)' }}>
            Ticket Promedio
          </p>
          <div className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: 'rgba(168,85,247,0.12)', border: '1px solid rgba(168,85,247,0.2)' }}>
            <Star size={16} style={{ color: '#c084fc' }} />
          </div>
        </div>
        <p className="text-3xl font-bold tabular-nums text-white">{formatMXN(kpiData.ticketPromedio.value)}</p>
        <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.35)' }}>por mesa</p>
        <div className="mt-3">
          <TrendBadge change={kpiData.ticketPromedio.change} trend={kpiData.ticketPromedio.trend} suffix="% vs ayer" />
        </div>
      </div>

      {/* Tiempo Cocina — ALERT state */}
      <div className="rounded-2xl p-5" style={{ backgroundColor: '#1a2535', border: '1px solid rgba(239,68,68,0.3)' }}>
        <div className="flex items-start justify-between mb-3">
          <p className="text-xs font-semibold tracking-wide uppercase" style={{ color: 'rgba(255,255,255,0.45)' }}>
            Tiempo Cocina
          </p>
          <div className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)' }}>
            <Clock size={16} style={{ color: '#f87171' }} />
          </div>
        </div>
        <div className="flex items-end gap-2">
          <p className="text-3xl font-bold tabular-nums" style={{ color: '#f87171' }}>{kpiData.tiempoCocinaProm.value}</p>
          <p className="text-lg mb-0.5 font-semibold" style={{ color: 'rgba(255,255,255,0.4)' }}>min</p>
        </div>
        <p className="text-xs mt-1" style={{ color: 'rgba(239,68,68,0.7)' }}>Meta: {kpiData.tiempoCocinaProm.target} min — ⚠️ por encima</p>
        <div className="mt-3">
          <TrendBadge change={kpiData.tiempoCocinaProm.change} trend={kpiData.tiempoCocinaProm.trend} suffix=" min vs meta" />
        </div>
      </div>

      {/* Órdenes Entregadas */}
      <div className="rounded-2xl p-5" style={{ backgroundColor: '#1a2535', border: '1px solid #2a3f5f' }}>
        <div className="flex items-start justify-between mb-3">
          <p className="text-xs font-semibold tracking-wide uppercase" style={{ color: 'rgba(255,255,255,0.45)' }}>
            Órdenes Entregadas
          </p>
          <div className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.2)' }}>
            <UtensilsCrossed size={16} style={{ color: '#fbbf24' }} />
          </div>
        </div>
        <p className="text-3xl font-bold tabular-nums text-white">{kpiData.ordenesEntregadas.value}</p>
        <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.35)' }}>órdenes hoy</p>
        <div className="mt-3">
          <TrendBadge change={kpiData.ordenesEntregadas.change} trend={kpiData.ordenesEntregadas.trend} suffix=" vs ayer" />
        </div>
      </div>
    </div>
  );
}