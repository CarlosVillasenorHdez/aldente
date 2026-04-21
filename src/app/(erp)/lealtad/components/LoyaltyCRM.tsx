'use client';

/**
 * LoyaltyCRM — análisis del programa de lealtad
 *
 * Métricas agnósticas al trigger:
 * No importa si la membresía se activó por un termo, un paquete,
 * un pago directo o manual. Los indicadores miden el programa, no el producto.
 */
import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { getCurrentTenantId as getTenantId } from '@/lib/tenantStore';
import { Users, TrendingUp, Coffee, AlertTriangle, RefreshCw, Calendar, DollarSign } from 'lucide-react';

// ── Tipos ─────────────────────────────────────────────────────────────────────
interface LoyaltySummary {
  totalSocios:       number;
  sociosActivos:     number;
  sociosVencidos:    number;
  sociosPorVencer:   number;  // vencen en los próximos 30 días
  sociosEnRiesgo:    number;  // activos pero sin usar beneficio en 7+ días
  beneficiosHoy:     number;  // beneficios usados hoy
  beneficiosMes:     number;  // beneficios usados este mes
  costoBeneficios:   number;  // costo WACC acumulado este mes
  ingresoMembresias: number;  // membresías de pago este mes
  // Conversión (solo si hay trigger=venta_producto configurado)
  conversionRate:    number | null;
}

interface SocioResumen {
  id:                   string;
  name:                 string;
  phone:                string;
  isActive:             boolean;
  membershipExpiresAt:  string | null;
  dailyBenefitUsedAt:   string | null;
  totalVisits:          number;
  createdAt:            string;
  diasSinUsar:          number;
  estado:               'activo' | 'en_riesgo' | 'por_vencer' | 'vencido';
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function diasRestantes(expiresAt: string | null): number {
  if (!expiresAt) return 9999;
  return Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 86400000);
}

function diasSinUsar(usedAt: string | null): number {
  if (!usedAt) return 9999;
  return Math.floor((Date.now() - new Date(usedAt).getTime()) / 86400000);
}

function estadoSocio(s: { isActive: boolean; membershipExpiresAt: string | null; dailyBenefitUsedAt: string | null }): SocioResumen['estado'] {
  if (!s.isActive || diasRestantes(s.membershipExpiresAt) < 0) return 'vencido';
  if (diasRestantes(s.membershipExpiresAt) <= 30) return 'por_vencer';
  if (diasSinUsar(s.dailyBenefitUsedAt) >= 7) return 'en_riesgo';
  return 'activo';
}

// ── Componente de métrica ─────────────────────────────────────────────────────
function MetricCard({ icon: Icon, label, value, sub, color = '#1B3A6B', alert = false }:
  { icon: any; label: string; value: string | number; sub?: string; color?: string; alert?: boolean }) {
  return (
    <div className={`bg-white dark:bg-gray-900 rounded-xl border p-5 ${alert ? 'border-amber-300 dark:border-amber-700' : 'border-gray-100 dark:border-gray-800'}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">{label}</p>
          <p className="text-3xl font-bold" style={{ color }}>{value}</p>
          {sub && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{sub}</p>}
        </div>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: color + '15' }}>
          <Icon size={20} style={{ color }} />
        </div>
      </div>
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────
export default function LoyaltyCRM() {
  const supabase = createClient();
  const [summary, setSummary]   = useState<LoyaltySummary | null>(null);
  const [socios, setSocios]     = useState<SocioResumen[]>([]);
  const [loading, setLoading]   = useState(true);
  const [filtro, setFiltro]     = useState<'todos' | 'en_riesgo' | 'por_vencer' | 'vencido'>('todos');

  const load = useCallback(async () => {
    setLoading(true);
    const tid = getTenantId();
    const now = new Date();
    const inicioMes = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const en30dias = new Date(now.getTime() + 30 * 86400000).toISOString();

    // Cargar todos los socios con membresía
    const { data: rawSocios } = await supabase
      .from('loyalty_customers')
      .select('id,name,phone,is_active,membership_expires_at,daily_benefit_used_at,total_visits,created_at')
      .eq('tenant_id', tid)
      .in('membership_type', ['membresia', 'termo'])
      .order('created_at', { ascending: false });

    // Beneficios usados hoy y este mes
    const { data: beneficiosHoy } = await supabase
      .from('loyalty_daily_benefit_log')
      .select('id', { count: 'exact' })
      .eq('tenant_id', tid)
      .gte('used_at', new Date().toISOString().slice(0, 10));

    const { data: beneficiosMes } = await supabase
      .from('loyalty_daily_benefit_log')
      .select('id', { count: 'exact' })
      .eq('tenant_id', tid)
      .gte('used_at', inicioMes);

    // Impacto financiero del mes
    const { data: txMes } = await supabase
      .from('loyalty_transactions')
      .select('financial_impact_type,financial_amount')
      .eq('tenant_id', tid)
      .gte('created_at', inicioMes);

    const costoBeneficios = (txMes ?? [])
      .filter(t => t.financial_impact_type === 'costo_beneficio')
      .reduce((s, t) => s + (t.financial_amount ?? 0), 0);

    const ingresoMembresias = (txMes ?? [])
      .filter(t => t.financial_impact_type === 'ingreso_membresia')
      .reduce((s, t) => s + (t.financial_amount ?? 0), 0);

    // Calcular estados
    const procesados: SocioResumen[] = (rawSocios ?? []).map(s => ({
      id:                  s.id,
      name:                s.name,
      phone:               s.phone ?? '',
      isActive:            s.is_active,
      membershipExpiresAt: s.membership_expires_at ?? null,
      dailyBenefitUsedAt:  s.daily_benefit_used_at ?? null,
      totalVisits:         s.total_visits ?? 0,
      createdAt:           s.created_at,
      diasSinUsar:         diasSinUsar(s.daily_benefit_used_at ?? null),
      estado:              estadoSocio({
        isActive: s.is_active,
        membershipExpiresAt: s.membership_expires_at ?? null,
        dailyBenefitUsedAt: s.daily_benefit_used_at ?? null,
      }),
    }));

    const activos    = procesados.filter(s => s.estado === 'activo').length;
    const enRiesgo   = procesados.filter(s => s.estado === 'en_riesgo').length;
    const porVencer  = procesados.filter(s => s.estado === 'por_vencer').length;
    const vencidos   = procesados.filter(s => s.estado === 'vencido').length;

    setSocios(procesados);
    setSummary({
      totalSocios:       procesados.length,
      sociosActivos:     activos,
      sociosVencidos:    vencidos,
      sociosPorVencer:   porVencer,
      sociosEnRiesgo:    enRiesgo,
      beneficiosHoy:     (beneficiosHoy as any)?.length ?? 0,
      beneficiosMes:     (beneficiosMes as any)?.length ?? 0,
      costoBeneficios,
      ingresoMembresias,
      conversionRate:    null, // se calcula si hay trigger=venta_producto
    });
    setLoading(false);
  }, [supabase]);

  useEffect(() => { load(); }, [load]);

  const sociosFiltrados = filtro === 'todos'
    ? socios
    : socios.filter(s => s.estado === filtro);

  if (loading) return (
    <div className="flex items-center justify-center py-16 text-sm text-gray-600 dark:text-gray-400">
      Cargando análisis...
    </div>
  );

  if (!summary) return null;

  const ESTADO_CONFIG = {
    activo:     { label: 'Activo',          color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' },
    en_riesgo:  { label: 'En riesgo',       color: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300' },
    por_vencer: { label: 'Por vencer',      color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' },
    vencido:    { label: 'Vencido',         color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300' },
  };

  return (
    <div className="space-y-6 max-w-4xl">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Análisis del programa</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
            Indicadores de salud del programa de membresía
          </p>
        </div>
        <button onClick={load} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
          <RefreshCw size={15} /> Actualizar
        </button>
      </div>

      {/* Métricas principales */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <MetricCard icon={Users}       label="Socios activos"     value={summary.sociosActivos}   sub={`de ${summary.totalSocios} registrados`} color="#1B3A6B" />
        <MetricCard icon={AlertTriangle} label="En riesgo"        value={summary.sociosEnRiesgo}  sub="7+ días sin usar beneficio" color="#D97706" alert={summary.sociosEnRiesgo > 0} />
        <MetricCard icon={Calendar}    label="Por vencer"         value={summary.sociosPorVencer} sub="próximos 30 días" color="#7C3AED" alert={summary.sociosPorVencer > 0} />
        <MetricCard icon={TrendingUp}  label="Vencidos"           value={summary.sociosVencidos}  sub="sin renovar" color="#DC2626" />
      </div>

      {/* Uso del beneficio */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <MetricCard icon={Coffee}      label="Beneficios hoy"     value={summary.beneficiosHoy}   sub="usos del beneficio diario" color="#065F46" />
        <MetricCard icon={Coffee}      label="Beneficios este mes" value={summary.beneficiosMes}  sub="total del mes" color="#065F46" />
        <MetricCard icon={DollarSign}  label="Costo beneficios"   value={`$${summary.costoBeneficios.toLocaleString('es-MX', { maximumFractionDigits: 0 })}`} sub="costo WACC acumulado" color="#6B7280" />
      </div>

      {/* Insight de retención */}
      {summary.sociosEnRiesgo > 0 && (
        <div className="flex gap-3 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
          <AlertTriangle size={18} className="text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
              {summary.sociosEnRiesgo} socio{summary.sociosEnRiesgo > 1 ? 's' : ''} en riesgo de no renovar
            </p>
            <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
              Llevan 7+ días sin usar su beneficio. Un recordatorio por WhatsApp puede reactivarlos antes de que venzan.
            </p>
          </div>
        </div>
      )}

      {summary.sociosPorVencer > 0 && (
        <div className="flex gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
          <Calendar size={18} className="text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-blue-900 dark:text-blue-200">
              {summary.sociosPorVencer} membresía{summary.sociosPorVencer > 1 ? 's' : ''} por vencer en 30 días
            </p>
            <p className="text-xs text-blue-700 dark:text-blue-400 mt-0.5">
              Es el momento ideal para ofrecer renovación anticipada.
            </p>
          </div>
        </div>
      )}

      {/* Lista de socios */}
      <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900 dark:text-white text-sm">Lista de socios</h3>
          <div className="flex gap-1">
            {(['todos', 'en_riesgo', 'por_vencer', 'vencido'] as const).map(f => (
              <button key={f} onClick={() => setFiltro(f)}
                className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
                  filtro === f
                    ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}>
                {f === 'todos' ? `Todos (${socios.length})`
                  : f === 'en_riesgo'  ? `En riesgo (${summary.sociosEnRiesgo})`
                  : f === 'por_vencer' ? `Por vencer (${summary.sociosPorVencer})`
                  : `Vencidos (${summary.sociosVencidos})`}
              </button>
            ))}
          </div>
        </div>

        {sociosFiltrados.length === 0 ? (
          <div className="py-12 text-center text-sm text-gray-500 dark:text-gray-400">
            No hay socios en esta categoría
          </div>
        ) : (
          <div className="divide-y divide-gray-50 dark:divide-gray-800">
            {sociosFiltrados.slice(0, 50).map(s => (
              <div key={s.id} className="px-5 py-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-xs font-semibold text-gray-600 dark:text-gray-400">
                    {s.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{s.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{s.phone}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-right">
                  <div className="hidden sm:block">
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {s.membershipExpiresAt
                        ? `Vence ${new Date(s.membershipExpiresAt).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })}`
                        : 'Sin vencimiento'}
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">
                      {s.diasSinUsar === 9999
                        ? 'Nunca ha usado el beneficio'
                        : s.diasSinUsar === 0
                        ? 'Usó el beneficio hoy'
                        : `Hace ${s.diasSinUsar} día${s.diasSinUsar > 1 ? 's' : ''} sin usar`}
                    </p>
                  </div>
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${ESTADO_CONFIG[s.estado].color}`}>
                    {ESTADO_CONFIG[s.estado].label}
                  </span>
                </div>
              </div>
            ))}
            {sociosFiltrados.length > 50 && (
              <div className="px-5 py-3 text-center text-xs text-gray-500 dark:text-gray-400">
                Mostrando 50 de {sociosFiltrados.length} socios
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
