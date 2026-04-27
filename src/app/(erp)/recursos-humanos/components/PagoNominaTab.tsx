'use client';
/**
 * PagoNominaTab — Registro y recordatorio de pagos de nómina
 *
 * Integra la nómina calculada (Personal → Nómina y costos) con
 * el registro real de pagos, para que el P&L muestre lo pagado
 * en lugar de lo estimado.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { getCurrentTenantId as getTenantId } from '@/lib/tenantStore';
import { useBranch } from '@/hooks/useBranch';
import { useAuth } from '@/contexts/AuthContext';
import { useNominaConfig } from '@/hooks/useNominaConfig';
import { calcResumenNominaConConfig } from '@/lib/laboralMX';
import { toast } from 'sonner';
import {
  CheckCircle, Clock, AlertTriangle, Plus, Calendar,
  DollarSign, TrendingUp, ChevronDown, ChevronUp
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

interface PagoNomina {
  id: string;
  periodoInicio: string;
  periodoFin: string;
  frecuencia: string;
  montoEstimado: number;
  montoPagado: number;
  diferencia: number;
  fechaPago: string;
  metodoPago: string;
  referencia: string;
  notas: string;
  numEmpleados: number;
  status: 'pendiente' | 'pagado' | 'parcial';
}

interface Employee {
  salary: number;
  salary_frequency: string;
  status: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmt = (n: number) => `$${Math.round(n).toLocaleString('es-MX')}`;
const fmtDate = (iso: string) => {
  if (!iso) return '—';
  return new Date(iso + 'T12:00:00').toLocaleDateString('es-MX', {
    day: 'numeric', month: 'long', year: 'numeric',
  });
};

function calcPeriodo(frecuencia: string): { inicio: string; fin: string; label: string } {
  const hoy = new Date();
  if (frecuencia === 'mensual') {
    const inicio = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    const fin    = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0);
    return {
      inicio: inicio.toISOString().split('T')[0],
      fin:    fin.toISOString().split('T')[0],
      label:  inicio.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' }),
    };
  } else if (frecuencia === 'quincenal') {
    const dia = hoy.getDate();
    const inicio = new Date(hoy.getFullYear(), hoy.getMonth(), dia <= 15 ? 1 : 16);
    const fin    = new Date(hoy.getFullYear(), hoy.getMonth(), dia <= 15 ? 15 : 0 + 1);
    fin.setMonth(fin.getMonth() + (dia <= 15 ? 0 : 1), dia <= 15 ? 15 : 0);
    const finReal = dia <= 15
      ? new Date(hoy.getFullYear(), hoy.getMonth(), 15)
      : new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0);
    return {
      inicio: inicio.toISOString().split('T')[0],
      fin:    finReal.toISOString().split('T')[0],
      label:  `${dia <= 15 ? '1ª' : '2ª'} quincena ${hoy.toLocaleDateString('es-MX', { month: 'long' })}`,
    };
  } else {
    // semanal
    const lunes = new Date(hoy);
    lunes.setDate(hoy.getDate() - hoy.getDay() + 1);
    const domingo = new Date(lunes); domingo.setDate(lunes.getDate() + 6);
    return {
      inicio: lunes.toISOString().split('T')[0],
      fin:    domingo.toISOString().split('T')[0],
      label:  `Semana del ${lunes.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}`,
    };
  }
}

// ── Componente ────────────────────────────────────────────────────────────────

export default function PagoNominaTab() {
  const supabase = createClient();
  const { activeBranchId } = useBranch();
  const { appUser } = useAuth();
  const nominaConfig = useNominaConfig();

  const [pagos, setPagos] = useState<PagoNomina[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  // Determinar la frecuencia dominante del equipo
  const freqDominante = (() => {
    const freqs = employees.map(e => e.salary_frequency ?? 'mensual');
    const counts = freqs.reduce((acc, f) => ({ ...acc, [f]: (acc[f] || 0) + 1 }), {} as Record<string, number>);
    return Object.entries(counts).sort(([,a],[,b]) => b - a)[0]?.[0] ?? 'mensual';
  })();

  const periodo = calcPeriodo(freqDominante);

  // Calcular nómina estimada
  const flags = {
    incluyeIMSS: nominaConfig.incluyeIMSS,
    incluyeINFONAVIT: nominaConfig.incluyeINFONAVIT,
    incluyePrestaciones: nominaConfig.incluyePrestaciones,
  };
  const resumen = calcResumenNominaConConfig(employees, flags);

  // Form
  const [form, setForm] = useState({
    periodoInicio: periodo.inicio,
    periodoFin:    periodo.fin,
    frecuencia:    freqDominante,
    montoPagado:   '',
    fechaPago:     new Date().toISOString().split('T')[0],
    metodoPago:    'transferencia',
    referencia:    '',
    notas:         '',
    status:        'pagado' as const,
  });

  // Cargar datos
  const load = useCallback(async () => {
    setLoading(true);
    const tid = getTenantId();

    const [{ data: empData }, { data: pagosData }] = await Promise.all([
      supabase.from('employees').select('salary, salary_frequency, status')
        .eq('tenant_id', tid).eq('status', 'activo'),
      supabase.from('pagos_nomina').select('*')
        .eq('tenant_id', tid)
        .order('periodo_inicio', { ascending: false })
        .limit(12),
    ]);

    setEmployees((empData ?? []).map((e: any) => ({
      salary: Number(e.salary ?? 0),
      salary_frequency: e.salary_frequency ?? 'mensual',
      status: e.status,
    })));

    setPagos((pagosData ?? []).map((p: any) => ({
      id: p.id,
      periodoInicio: p.periodo_inicio,
      periodoFin:    p.periodo_fin,
      frecuencia:    p.frecuencia,
      montoEstimado: Number(p.monto_estimado ?? 0),
      montoPagado:   Number(p.monto_pagado ?? 0),
      diferencia:    Number(p.diferencia ?? 0),
      fechaPago:     p.fecha_pago,
      metodoPago:    p.metodo_pago ?? 'transferencia',
      referencia:    p.referencia ?? '',
      notas:         p.notas ?? '',
      numEmpleados:  p.num_empleados ?? 0,
      status:        p.status as PagoNomina['status'],
    })));

    setLoading(false);
  }, [supabase, activeBranchId]);

  useEffect(() => { load(); }, [load]);

  // Sincronizar form con cálculo
  useEffect(() => {
    if (resumen.totalNomina > 0 && !form.montoPagado) {
      setForm(f => ({ ...f, montoPagado: Math.round(resumen.totalNomina).toString() }));
    }
  }, [resumen.totalNomina]);

  // Guardar pago
  const handleSave = async () => {
    if (!form.montoPagado || Number(form.montoPagado) <= 0) {
      toast.error('El monto pagado es requerido');
      return;
    }
    setSaving(true);

    const { error } = await supabase.from('pagos_nomina').insert({
      tenant_id:        getTenantId(),
      branch_id:        activeBranchId ?? null,
      periodo_inicio:   form.periodoInicio,
      periodo_fin:      form.periodoFin,
      frecuencia:       form.frecuencia,
      monto_estimado:   resumen.totalNomina,
      monto_salarios:   resumen.salariosBrutos,
      monto_imss:       resumen.cuotasIMSS,
      monto_infonavit:  resumen.cuotasINFONAVIT,
      monto_prestaciones: resumen.prestacionesMensuales,
      monto_pagado:     Number(form.montoPagado),
      fecha_pago:       form.fechaPago,
      metodo_pago:      form.metodoPago,
      referencia:       form.referencia.trim(),
      notas:            form.notas.trim(),
      num_empleados:    resumen.empleados,
      status:           form.status,
      registrado_por:   appUser?.fullName ?? 'Admin',
    });

    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success('✅ Pago de nómina registrado');
    setShowForm(false);
    await load();
  };

  // ── Próximo pago ──────────────────────────────────────────────────────────

  const ultimoPago = pagos[0];
  const diasDesdeUltimoPago = ultimoPago
    ? Math.floor((Date.now() - new Date(ultimoPago.fechaPago).getTime()) / 86400000)
    : null;

  const diasParaProximoPago = (() => {
    const diasCiclo = freqDominante === 'semanal' ? 7 : freqDominante === 'quincenal' ? 15 : 30;
    if (diasDesdeUltimoPago === null) return 0;
    return Math.max(0, diasCiclo - diasDesdeUltimoPago);
  })();

  const urgente = diasParaProximoPago <= 3;
  const proximoVence = new Date();
  proximoVence.setDate(proximoVence.getDate() + diasParaProximoPago);

  // ── Render ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="p-6 space-y-3">
        {[1,2,3].map(i => <div key={i} className="h-20 rounded-xl animate-pulse bg-white border border-gray-100" />)}
      </div>
    );
  }

  return (
    <div className="p-6 space-y-5 max-w-2xl">

      {/* Recordatorio próximo pago */}
      <div className={`flex items-start gap-4 p-4 rounded-2xl border ${
        urgente ? 'bg-red-50 border-red-200' : 'bg-blue-50 border-blue-200'
      }`}>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
          urgente ? 'bg-red-100' : 'bg-blue-100'
        }`}>
          {urgente
            ? <AlertTriangle size={18} className="text-red-600" />
            : <Clock size={18} className="text-blue-600" />}
        </div>
        <div className="flex-1">
          <p className={`text-sm font-bold ${urgente ? 'text-red-800' : 'text-blue-800'}`}>
            {diasParaProximoPago === 0
              ? '🚨 Hoy vence el pago de nómina'
              : `Próximo pago de nómina: ${diasParaProximoPago} día${diasParaProximoPago > 1 ? 's' : ''}`}
          </p>
          <p className={`text-xs mt-0.5 ${urgente ? 'text-red-600' : 'text-blue-600'}`}>
            {periodo.label} · {resumen.empleados} empleados · Estimado: {fmt(resumen.totalNomina)}
          </p>
          {ultimoPago && (
            <p className="text-xs text-gray-500 mt-1">
              Último pago: {fmtDate(ultimoPago.fechaPago)} — {fmt(ultimoPago.montoPagado)}
            </p>
          )}
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex-shrink-0 px-4 py-2 rounded-xl text-sm font-bold text-white"
          style={{ backgroundColor: urgente ? '#dc2626' : '#1d4ed8' }}
        >
          Registrar pago
        </button>
      </div>

      {/* Resumen de la nómina actual */}
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <p className="text-sm font-bold text-gray-900">Nómina estimada — {periodo.label}</p>
          <p className="text-xs text-gray-500 mt-0.5">
            Basada en {resumen.empleados} empleados activos
            {nominaConfig.modelo !== 'formal' && ` · Modelo: ${nominaConfig.modelo}`}
          </p>
        </div>
        <div className="p-5 grid grid-cols-2 gap-4">
          {[
            { label: 'Salarios y sueldos', value: resumen.salariosBrutos, color: '#1d4ed8' },
            { label: 'IMSS patronal', value: resumen.cuotasIMSS, color: '#dc2626' },
            { label: 'INFONAVIT', value: resumen.cuotasINFONAVIT, color: '#d97706' },
            { label: 'Prestaciones (prorrata)', value: resumen.prestacionesMensuales, color: '#d97706' },
          ].map(item => (
            <div key={item.label}>
              <p className="text-xs text-gray-500">{item.label}</p>
              <p className="text-lg font-bold" style={{ color: item.color }}>{fmt(item.value)}</p>
            </div>
          ))}
          <div className="col-span-2 pt-3 border-t border-gray-100 flex justify-between items-center">
            <span className="text-sm font-semibold text-gray-700">Total a pagar</span>
            <span className="text-2xl font-black text-gray-900">{fmt(resumen.totalNomina)}</span>
          </div>
        </div>
      </div>

      {/* Form de registro */}
      {showForm && (
        <div className="bg-white border-2 border-blue-200 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 bg-blue-50 border-b border-blue-100 flex items-center justify-between">
            <p className="text-sm font-bold text-blue-900">Registrar pago de nómina</p>
            <button onClick={() => setShowForm(false)} className="text-blue-400 hover:text-blue-600 text-lg">✕</button>
          </div>
          <div className="p-5 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Período inicio</label>
                <input type="date" value={form.periodoInicio}
                  onChange={e => setForm(f => ({ ...f, periodoInicio: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-blue-400" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Período fin</label>
                <input type="date" value={form.periodoFin}
                  onChange={e => setForm(f => ({ ...f, periodoFin: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-blue-400" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                  Monto pagado *
                  <span className="text-gray-400 font-normal ml-1">(estimado: {fmt(resumen.totalNomina)})</span>
                </label>
                <input type="number" value={form.montoPagado}
                  onChange={e => setForm(f => ({ ...f, montoPagado: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-blue-400 font-mono"
                  placeholder={Math.round(resumen.totalNomina).toString()} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Fecha de pago</label>
                <input type="date" value={form.fechaPago}
                  onChange={e => setForm(f => ({ ...f, fechaPago: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-blue-400" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Método de pago</label>
                <select value={form.metodoPago}
                  onChange={e => setForm(f => ({ ...f, metodoPago: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-blue-400">
                  <option value="transferencia">Transferencia bancaria</option>
                  <option value="efectivo">Efectivo</option>
                  <option value="cheque">Cheque</option>
                  <option value="mixto">Mixto</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Referencia / folio</label>
                <input type="text" value={form.referencia}
                  onChange={e => setForm(f => ({ ...f, referencia: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-blue-400"
                  placeholder="Número de transferencia..." />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Estado</label>
                <select value={form.status}
                  onChange={e => setForm(f => ({ ...f, status: e.target.value as any }))}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-blue-400">
                  <option value="pagado">Pagado completo</option>
                  <option value="parcial">Pago parcial</option>
                  <option value="pendiente">Pendiente</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Notas</label>
                <input type="text" value={form.notas}
                  onChange={e => setForm(f => ({ ...f, notas: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-blue-400"
                  placeholder="Opcional..." />
              </div>
            </div>

            {/* Diferencia estimado vs pagado */}
            {form.montoPagado && Number(form.montoPagado) !== resumen.totalNomina && (
              <div className={`flex items-center justify-between p-3 rounded-xl text-sm ${
                Number(form.montoPagado) > resumen.totalNomina ? 'bg-red-50 border border-red-200' : 'bg-amber-50 border border-amber-200'
              }`}>
                <span className="text-gray-700">Diferencia vs estimado</span>
                <span className={`font-bold ${Number(form.montoPagado) > resumen.totalNomina ? 'text-red-700' : 'text-amber-700'}`}>
                  {Number(form.montoPagado) > resumen.totalNomina ? '+' : ''}{fmt(Number(form.montoPagado) - resumen.totalNomina)}
                </span>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowForm(false)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50">
                Cancelar
              </button>
              <button onClick={handleSave} disabled={saving}
                className="flex-2 px-6 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-50"
                style={{ backgroundColor: '#1d4ed8', flex: 2 }}>
                {saving ? 'Guardando...' : '✓ Registrar pago'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Historial de pagos */}
      <div>
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Historial de pagos</p>
        {pagos.length === 0 ? (
          <div className="text-center py-10 text-gray-400">
            <DollarSign size={32} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm">Sin pagos de nómina registrados</p>
            <p className="text-xs mt-1">El primer pago quedará aquí como referencia</p>
          </div>
        ) : (
          <div className="space-y-2">
            {pagos.map(p => {
              const diff = p.montoPagado - p.montoEstimado;
              const pct = p.montoEstimado > 0 ? ((p.montoPagado / p.montoEstimado) * 100).toFixed(1) : '100';
              return (
                <div key={p.id} className="bg-white border border-gray-200 rounded-xl px-5 py-3.5 flex items-center gap-4">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    p.status === 'pagado' ? 'bg-green-100' : p.status === 'parcial' ? 'bg-amber-100' : 'bg-gray-100'
                  }`}>
                    {p.status === 'pagado'
                      ? <CheckCircle size={15} className="text-green-600" />
                      : <Clock size={15} className="text-amber-600" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900">
                      {fmtDate(p.periodoInicio)} — {fmtDate(p.periodoFin)}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {p.numEmpleados} empleados · Pagado el {fmtDate(p.fechaPago)}
                      {p.referencia && ` · Ref: ${p.referencia}`}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-bold text-gray-900">{fmt(p.montoPagado)}</p>
                    {Math.abs(diff) > 1 && (
                      <p className={`text-xs ${diff > 0 ? 'text-red-500' : 'text-green-600'}`}>
                        {diff > 0 ? '+' : ''}{fmt(diff)} vs estimado
                      </p>
                    )}
                    {Math.abs(diff) <= 1 && (
                      <p className="text-xs text-green-500">= estimado</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
