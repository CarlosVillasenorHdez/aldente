'use client';

import React, { useState, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { getCurrentTenantId as getTenantId } from '@/lib/tenantStore';
import { useBranch } from '@/hooks/useBranch';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Plus, Edit3, Target, TrendingUp, TrendingDown, Minus, AlertTriangle, CheckCircle, X } from 'lucide-react';
import {
  usePresupuesto, useListaPresupuestos,
  calcDesviacion, type Presupuesto,
} from '@/hooks/usePresupuesto';

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmt  = (n: number) => `$${Math.round(n).toLocaleString('es-MX')}`;
const fmtP = (n: number) => `${n.toFixed(1)}%`;

function mesActual() {
  const d = new Date();
  return {
    inicio: new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0],
    fin:    new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split('T')[0],
    label:  d.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' }),
  };
}

// ── Delta badge ───────────────────────────────────────────────────────────────

function Delta({ valor, positiveIsGood = true, suffix = '' }: {
  valor: number; positiveIsGood?: boolean; suffix?: string;
}) {
  if (Math.abs(valor) < 0.5 && !suffix.includes('%')) return (
    <span className="flex items-center gap-1 text-xs font-semibold text-gray-400">
      <Minus size={11} /> En meta
    </span>
  );
  const good = positiveIsGood ? valor > 0 : valor < 0;
  const Icon = valor > 0 ? TrendingUp : TrendingDown;
  return (
    <span className={`flex items-center gap-1 text-xs font-semibold ${good ? 'text-green-600' : 'text-red-600'}`}>
      <Icon size={11} />
      {valor > 0 ? '+' : ''}{suffix === '$' ? fmt(valor) : fmtP(valor)}
      {suffix !== '$' && suffix}
    </span>
  );
}

// ── Barra de progreso ─────────────────────────────────────────────────────────

function ProgressBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
      <div className="h-full rounded-full transition-all duration-500"
        style={{ width: `${pct}%`, backgroundColor: color }} />
    </div>
  );
}

// ── KPI Card ──────────────────────────────────────────────────────────────────

function KPICard({ label, real, meta, delta, positiveIsGood = true, suffix = '$', color }: {
  label: string; real: number; meta: number; delta: number;
  positiveIsGood?: boolean; suffix?: string; color: string;
}) {
  const pct = meta > 0 ? Math.round((real / meta) * 100) : 0;
  const achieved = pct >= 95;

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-5">
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</p>
          <p className="text-2xl font-black text-gray-900 mt-1">
            {suffix === '$' ? fmt(real) : fmtP(real)}
          </p>
        </div>
        {achieved
          ? <CheckCircle size={18} className="text-green-500 flex-shrink-0 mt-1" />
          : pct < 80
          ? <AlertTriangle size={18} className="text-amber-500 flex-shrink-0 mt-1" />
          : <Target size={18} className="text-blue-400 flex-shrink-0 mt-1" />}
      </div>

      <ProgressBar value={real} max={meta} color={color} />

      <div className="flex items-center justify-between mt-2">
        <span className="text-xs text-gray-400">
          Meta: {suffix === '$' ? fmt(meta) : fmtP(meta)}
        </span>
        <div className="flex items-center gap-2">
          <span className={`text-xs font-bold ${achieved ? 'text-green-600' : pct < 80 ? 'text-amber-600' : 'text-blue-600'}`}>
            {pct}%
          </span>
          <Delta valor={delta} positiveIsGood={positiveIsGood} suffix={suffix} />
        </div>
      </div>
    </div>
  );
}

// ── Modal de crear/editar presupuesto ─────────────────────────────────────────

function PresupuestoModal({ initial, onSave, onClose, isSugerencia = false }: {
  initial?: Partial<Presupuesto>;
  onSave: () => void;
  onClose: () => void;
  isSugerencia?: boolean;
}) {
  const supabase = createClient();
  const { activeBranchId } = useBranch();
  const { appUser } = useAuth();
  const mes = mesActual();

  const [form, setForm] = useState({
    nombre:             initial?.nombre ?? mes.label,
    periodoInicio:      initial?.periodoInicio ?? mes.inicio,
    periodoFin:         initial?.periodoFin ?? mes.fin,
    periodoTipo:        initial?.periodoTipo ?? 'mes',
    metaVentas:         initial?.metaVentas?.toString() ?? '',
    metaTicketPromedio: initial?.metaTicketPromedio?.toString() ?? '',
    metaOrdenes:        initial?.metaOrdenes?.toString() ?? '',
    metaCogsPct:        initial?.metaCogsPct?.toString() ?? '',
    metaMargenPct:      initial?.metaMargenPct?.toString() ?? '',
    metaNomina:         initial?.metaNomina?.toString() ?? '',
    metaGastosOp:       initial?.metaGastosOp?.toString() ?? '',
    notas:              initial?.notas ?? '',
  });

  const [saving, setSaving] = useState(false);
  const upd = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.metaVentas || Number(form.metaVentas) <= 0) {
      toast.error('La meta de ventas es requerida');
      return;
    }
    setSaving(true);

    const payload = {
      tenant_id:            getTenantId(),
      branch_id:            activeBranchId ?? null,
      nombre:               form.nombre.trim(),
      periodo_tipo:         form.periodoTipo,
      periodo_inicio:       form.periodoInicio,
      periodo_fin:          form.periodoFin,
      meta_ventas:          Number(form.metaVentas) || 0,
      meta_ticket_promedio: Number(form.metaTicketPromedio) || 0,
      meta_ordenes:         Number(form.metaOrdenes) || 0,
      meta_cogs_pct:        Number(form.metaCogsPct) || 0,
      meta_margen_pct:      Number(form.metaMargenPct) || 0,
      meta_nomina:          Number(form.metaNomina) || 0,
      meta_gastos_op:       Number(form.metaGastosOp) || 0,
      notas:                form.notas.trim(),
      created_by:           appUser?.fullName ?? '',
      updated_at:           new Date().toISOString(),
    };

    const { error } = initial?.id
      ? await supabase.from('presupuestos').update(payload).eq('id', initial.id)
      : await supabase.from('presupuestos').insert(payload);

    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(initial?.id ? 'Presupuesto actualizado' : '✅ Presupuesto creado');
    onSave();
    onClose();
  };

  const inp = "w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-blue-400";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-base font-bold text-gray-900">
            {initial?.id ? 'Editar presupuesto' : isSugerencia ? '✨ Meta sugerida (+10% mes anterior)' : 'Nuevo presupuesto'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><X size={20} /></button>
        </div>
        {isSugerencia && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800">
            Metas pre-llenadas con base en el mes anterior <strong>+10%</strong>. Puedes editarlas antes de guardar.
          </div>
        )}

        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Nombre</label>
              <input className={inp} value={form.nombre} onChange={e => upd('nombre', e.target.value)} placeholder="Ej: Octubre 2025" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Período inicio</label>
              <input type="date" className={inp} value={form.periodoInicio} onChange={e => upd('periodoInicio', e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Período fin</label>
              <input type="date" className={inp} value={form.periodoFin} onChange={e => upd('periodoFin', e.target.value)} />
            </div>
          </div>

          <div className="pt-2 pb-1">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Metas de ventas</p>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Meta de ventas *', key: 'metaVentas', placeholder: '80,000' },
              { label: 'Ticket promedio', key: 'metaTicketPromedio', placeholder: '350' },
              { label: 'Núm. de órdenes', key: 'metaOrdenes', placeholder: '250' },
            ].map(f => (
              <div key={f.key}>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">{f.label}</label>
                <input type="number" className={inp} placeholder={f.placeholder}
                  value={(form as any)[f.key]} onChange={e => upd(f.key, e.target.value)} />
              </div>
            ))}
          </div>

          <div className="pt-2 pb-1">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Metas de costos (opcional)</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: '% COGS objetivo', key: 'metaCogsPct', placeholder: '28', suffix: '%' },
              { label: '% Margen objetivo', key: 'metaMargenPct', placeholder: '65', suffix: '%' },
              { label: 'Nómina presupuestada', key: 'metaNomina', placeholder: '45,000', suffix: '$' },
              { label: 'Gastos op. presupuestados', key: 'metaGastosOp', placeholder: '12,000', suffix: '$' },
            ].map(f => (
              <div key={f.key}>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                  {f.label}
                  <span className="text-gray-400 font-normal ml-1">{f.suffix}</span>
                </label>
                <input type="number" className={inp} placeholder={f.placeholder}
                  value={(form as any)[f.key]} onChange={e => upd(f.key, e.target.value)} />
              </div>
            ))}
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Notas</label>
            <input className={inp} value={form.notas} onChange={e => upd('notas', e.target.value)}
              placeholder="Contexto del presupuesto..." />
          </div>
        </div>

        <div className="flex gap-3 px-6 py-4 border-t border-gray-200">
          <button onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50">
            Cancelar
          </button>
          <button onClick={handleSave} disabled={saving || !form.metaVentas}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-50"
            style={{ backgroundColor: '#1B3A6B' }}>
            {saving ? 'Guardando...' : initial?.id ? 'Guardar cambios' : '+ Crear presupuesto'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function PresupuestoVsReal() {
  const mes = mesActual();
  const [selectedInicio, setSelectedInicio] = useState(mes.inicio);
  const [selectedFin, setSelectedFin]       = useState(mes.fin);
  const [showModal, setShowModal]           = useState(false);
  const [sugerencia, setSugerencia]         = useState<Record<string, number> | null>(null);
  const [loadingSug, setLoadingSug]         = useState(false);
  const supabase = createClient();

  // Calcular sugerencia automática basada en el mes anterior
  const calcularSugerencia = async () => {
    setLoadingSug(true);
    const mesAnterior = new Date(new Date(selectedInicio + 'T12:00:00').setMonth(
      new Date(selectedInicio + 'T12:00:00').getMonth() - 1
    ));
    const inicioAnterior = new Date(mesAnterior.getFullYear(), mesAnterior.getMonth(), 1).toISOString().split('T')[0];
    const finAnterior    = new Date(mesAnterior.getFullYear(), mesAnterior.getMonth() + 1, 0).toISOString().split('T')[0];

    // Ventas del mes anterior
    const { data: orders } = await supabase.from('orders')
      .select('total, cost_actual')
      .eq('tenant_id', getTenantId()).eq('status', 'cerrada').eq('is_comanda', false)
      .gte('closed_at', inicioAnterior + 'T00:00:00').lte('closed_at', finAnterior + 'T23:59:59');

    const ventasAnt = (orders ?? []).reduce((s, o) => s + Number(o.total ?? 0), 0);
    const cogsAnt   = (orders ?? []).reduce((s, o) => s + Number(o.cost_actual ?? 0), 0);
    const ordenesAnt = (orders ?? []).length;
    const ticketAnt  = ordenesAnt > 0 ? ventasAnt / ordenesAnt : 0;

    // También revisar si hay presupuesto del mes anterior para usar como referencia
    const presAnterior = lista.find(p => p.periodoInicio === inicioAnterior);
    
    const factor = 1.1; // sugerir +10% sobre el mes anterior
    setSugerencia({
      metaVentas:          Math.round(ventasAnt * factor),
      metaTicketPromedio:  Math.round(ticketAnt * factor),
      metaOrdenes:         Math.round(ordenesAnt * factor),
      metaCogsPct:         ventasAnt > 0 ? Math.round((cogsAnt / ventasAnt) * 100 * 10) / 10 : 30,
      metaMargenPct:       ventasAnt > 0 ? Math.round(((ventasAnt - cogsAnt) / ventasAnt) * 100 * 10) / 10 : 65,
      metaNomina:          presAnterior?.metaNomina ?? 0,
      metaGastosOp:        presAnterior?.metaGastosOp ?? 0,
    });
    setLoadingSug(false);
  };
  const [editing, setEditing]               = useState<Presupuesto | undefined>();

  const { presupuesto, real, loading, reload } = usePresupuesto(selectedInicio, selectedFin);
  const { lista, reload: reloadLista }         = useListaPresupuestos();

  const desv = useMemo(() => {
    if (!presupuesto || !real) return null;
    return calcDesviacion(presupuesto, real);
  }, [presupuesto, real]);

  // Meses disponibles — último año
  const meses = useMemo(() => {
    const result = [];
    const d = new Date();
    for (let i = 0; i < 12; i++) {
      const inicio = new Date(d.getFullYear(), d.getMonth() - i, 1);
      const fin    = new Date(d.getFullYear(), d.getMonth() - i + 1, 0);
      result.push({
        inicio: inicio.toISOString().split('T')[0],
        fin:    fin.toISOString().split('T')[0],
        label:  inicio.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' }),
      });
    }
    return result;
  }, []);

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-12 bg-gray-100 rounded-xl" />
        <div className="grid grid-cols-3 gap-4">
          {[1,2,3].map(i => <div key={i} className="h-32 bg-gray-100 rounded-2xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">

      {/* Selector de período */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <select
            value={selectedInicio}
            onChange={e => {
              const found = meses.find(m => m.inicio === e.target.value);
              if (found) { setSelectedInicio(found.inicio); setSelectedFin(found.fin); }
            }}
            className="px-4 py-2 rounded-xl border border-gray-200 text-sm font-medium bg-white focus:outline-none focus:border-blue-400"
          >
            {meses.map(m => (
              <option key={m.inicio} value={m.inicio}>{m.label}</option>
            ))}
          </select>
          {presupuesto && (
            <button onClick={() => { setEditing(presupuesto); setShowModal(true); }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50">
              <Edit3 size={13} /> Editar presupuesto
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={async () => { await calcularSugerencia(); setEditing(undefined); setShowModal(true); }}
            disabled={loadingSug}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border"
            style={{ borderColor: '#1B3A6B', color: '#1B3A6B', backgroundColor: 'white' }}
          >
            {loadingSug ? '⏳ Calculando...' : '✨ Sugerir metas'}
          </button>
          <button
            onClick={() => { setSugerencia(null); setEditing(undefined); setShowModal(true); }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white"
            style={{ backgroundColor: '#1B3A6B' }}
          >
            <Plus size={15} /> Nuevo presupuesto
          </button>
        </div>
      </div>

      {/* Sin presupuesto */}
      {!presupuesto && real && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 text-center">
          <Target size={32} className="mx-auto text-amber-400 mb-3" />
          <p className="text-base font-bold text-amber-800 mb-1">Sin presupuesto para este período</p>
          <p className="text-sm text-amber-700 mb-4">
            Define las metas de ventas para ver qué tan lejos estás de ellas.
            Las ventas reales del mes ya están disponibles.
          </p>
          <div className="text-sm text-amber-900 font-semibold mb-4">
            Ventas reales: {fmt(real.ventas)} · {real.ordenes} órdenes
          </div>
          <button onClick={() => { setEditing(undefined); setShowModal(true); }}
            className="px-6 py-2.5 rounded-xl text-sm font-bold text-white"
            style={{ backgroundColor: '#1B3A6B' }}>
            + Crear presupuesto para este mes
          </button>
        </div>
      )}

      {/* KPIs de comparación */}
      {presupuesto && real && desv && (
        <>
          {/* Resumen ejecutivo */}
          <div className={`flex items-center gap-4 p-4 rounded-2xl border ${
            desv.ventasPct >= 95 ? 'bg-green-50 border-green-200' :
            desv.ventasPct >= 75 ? 'bg-amber-50 border-amber-200' :
            'bg-red-50 border-red-200'
          }`}>
            <div className={`text-4xl font-black ${
              desv.ventasPct >= 95 ? 'text-green-700' :
              desv.ventasPct >= 75 ? 'text-amber-700' : 'text-red-700'
            }`}>
              {Math.round(desv.ventasPct)}%
            </div>
            <div>
              <p className={`text-sm font-bold ${
                desv.ventasPct >= 95 ? 'text-green-800' :
                desv.ventasPct >= 75 ? 'text-amber-800' : 'text-red-800'
              }`}>
                {desv.ventasPct >= 100 ? '🎉 Meta superada' :
                 desv.ventasPct >= 95  ? '✓ Prácticamente en meta' :
                 desv.ventasPct >= 75  ? '⚠️ Ligeramente por debajo' :
                 '🚨 Lejos de la meta'}
              </p>
              <p className="text-xs text-gray-600 mt-0.5">
                {fmt(real.ventas)} de {fmt(presupuesto.metaVentas)} — {desv.ventasDelta >= 0 ? '+' : ''}{fmt(desv.ventasDelta)} vs meta
              </p>
            </div>
          </div>

          {/* Grid de KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            <KPICard
              label="Ventas del período"
              real={real.ventas} meta={presupuesto.metaVentas} delta={desv.ventasDelta}
              suffix="$" color="#1d4ed8" />

            {presupuesto.metaOrdenes > 0 && (
              <KPICard
                label="Número de órdenes"
                real={real.ordenes} meta={presupuesto.metaOrdenes} delta={desv.ordenesDelta}
                suffix="órdenes" color="#7c3aed" />
            )}

            {presupuesto.metaTicketPromedio > 0 && (
              <KPICard
                label="Ticket promedio"
                real={real.ticketPromedio} meta={presupuesto.metaTicketPromedio} delta={desv.ticketDelta}
                suffix="$" color="#0891b2" />
            )}

            {presupuesto.metaCogsPct > 0 && (
              <KPICard
                label="COGS %"
                real={real.cogsPct} meta={presupuesto.metaCogsPct} delta={desv.cogsPctDelta}
                positiveIsGood={false} suffix="%" color="#dc2626" />
            )}

            {presupuesto.metaMargenPct > 0 && (
              <KPICard
                label="Margen bruto %"
                real={real.margenPct} meta={presupuesto.metaMargenPct} delta={desv.margenPctDelta}
                suffix="%" color="#16a34a" />
            )}

            {presupuesto.metaNomina > 0 && (
              <KPICard
                label="Nómina pagada"
                real={real.nominaPagada} meta={presupuesto.metaNomina} delta={desv.nominaDelta}
                positiveIsGood={false} suffix="$" color="#d97706" />
            )}

            {presupuesto.metaGastosOp > 0 && (
              <KPICard
                label="Gastos operativos"
                real={real.gastosOp} meta={presupuesto.metaGastosOp} delta={desv.gastosOpDelta}
                positiveIsGood={false} suffix="$" color="#7c3aed" />
            )}
          </div>

          {/* Datos reales adicionales */}
          <div className="bg-gray-50 border border-gray-200 rounded-2xl p-5">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Datos reales del período</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Ventas reales', value: fmt(real.ventas) },
                { label: 'Órdenes', value: real.ordenes.toString() },
                { label: 'Ticket promedio', value: fmt(real.ticketPromedio) },
                { label: 'Margen bruto', value: fmtP(real.margenPct) },
                { label: 'COGS', value: fmt(real.cogs) },
                { label: 'COGS %', value: fmtP(real.cogsPct) },
                { label: 'Nómina pagada', value: fmt(real.nominaPagada) },
                { label: 'Gastos op.', value: fmt(real.gastosOp) },
              ].map(item => (
                <div key={item.label}>
                  <p className="text-xs text-gray-500">{item.label}</p>
                  <p className="text-sm font-bold text-gray-900 mt-0.5">{item.value}</p>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Lista de presupuestos anteriores */}
      {lista.length > 0 && (
        <div>
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Historial de presupuestos</p>
          <div className="space-y-2">
            {lista.map(p => {
              const isCurrent = p.periodoInicio === selectedInicio;
              return (
                <button key={p.id}
                  onClick={() => { setSelectedInicio(p.periodoInicio); setSelectedFin(p.periodoFin); }}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border text-left transition-colors ${
                    isCurrent ? 'border-blue-300 bg-blue-50' : 'border-gray-200 bg-white hover:bg-gray-50'
                  }`}>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{p.nombre}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{p.periodoInicio} — {p.periodoFin}</p>
                  </div>
                  <p className="text-sm font-bold text-gray-700">{fmt(p.metaVentas)}</p>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <PresupuestoModal
          initial={editing ?? (sugerencia ? {
            nombre: new Date(selectedInicio + 'T12:00:00').toLocaleDateString('es-MX', { month: 'long', year: 'numeric' }),
            periodoInicio: selectedInicio, periodoFin: selectedFin, periodoTipo: 'mes',
            ...sugerencia,
          } as any : undefined)}
          isSugerencia={!!sugerencia && !editing}
          onSave={() => { reload(); reloadLista(); setSugerencia(null); }}
          onClose={() => { setShowModal(false); setEditing(undefined); setSugerencia(null); }}
        />
      )}
    </div>
  );
}
