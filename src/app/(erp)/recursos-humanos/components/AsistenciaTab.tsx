'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { getCurrentTenantId as getTenantId } from '@/lib/tenantStore';
import { getAttendanceReport, type AttendanceRecord, type AttendanceStatus } from '@/lib/attendanceEngine';
import { Download } from 'lucide-react';
import { downloadXLSX } from '@/lib/exportUtils';

// ── Config de estados ─────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<AttendanceStatus, { label: string; color: string; bg: string; emoji: string }> = {
  a_tiempo:          { label: 'A tiempo',       color: '#15803d', bg: '#f0fdf4', emoji: '✅' },
  retardo_leve:      { label: 'Retardo leve',   color: '#d97706', bg: '#fffbeb', emoji: '🟡' },
  retardo_grave:     { label: 'Retardo grave',  color: '#ea580c', bg: '#fff7ed', emoji: '🟠' },
  falta:             { label: 'Falta',          color: '#dc2626', bg: '#fef2f2', emoji: '🔴' },
  vacaciones:        { label: 'Vacaciones',     color: '#7c3aed', bg: '#f5f3ff', emoji: '📅' },
  permiso_con_goce:  { label: 'Permiso c/goce', color: '#2563eb', bg: '#eff6ff', emoji: '📋' },
  permiso_sin_goce:  { label: 'Permiso s/goce', color: '#dc2626', bg: '#fef2f2', emoji: '📋' },
  incapacidad:       { label: 'Incapacidad',    color: '#0891b2', bg: '#ecfeff', emoji: '🏥' },
  descanso:          { label: 'Descanso',       color: '#6b7280', bg: '#f9fafb', emoji: '🏖️' },
  sin_horario:       { label: 'Sin horario',    color: '#9ca3af', bg: '#f9fafb', emoji: '⚪' },
};

function fmtDate(iso: string) {
  return new Date(iso + 'T12:00:00').toLocaleDateString('es-MX', {
    weekday: 'short', day: 'numeric', month: 'short',
  });
}

function StatusBadge({ status }: { status: AttendanceStatus }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full"
      style={{ color: cfg.color, backgroundColor: cfg.bg }}>
      {cfg.emoji} {cfg.label}
    </span>
  );
}

// ── Resumen de un empleado ────────────────────────────────────────────────────

interface EmployeeSummary {
  id: string;
  name: string;
  role: string;
  totalDias: number;
  aTiempo: number;
  retardosLeves: number;
  retardosGraves: number;
  faltas: number;
  vacaciones: number;
  permisos: number;
  incapacidades: number;
  totalDescuento: number;
  minutosRetardoTotal: number;
}

function buildSummaries(records: AttendanceRecord[]): EmployeeSummary[] {
  const map: Record<string, EmployeeSummary> = {};
  records.forEach(r => {
    if (r.status === 'descanso' || r.status === 'sin_horario') return;
    if (!map[r.employeeId]) {
      map[r.employeeId] = {
        id: r.employeeId, name: r.employeeName, role: r.role,
        totalDias: 0, aTiempo: 0, retardosLeves: 0, retardosGraves: 0,
        faltas: 0, vacaciones: 0, permisos: 0, incapacidades: 0,
        totalDescuento: 0, minutosRetardoTotal: 0,
      };
    }
    const s = map[r.employeeId];
    s.totalDias++;
    if (r.status === 'a_tiempo')         s.aTiempo++;
    if (r.status === 'retardo_leve')     s.retardosLeves++;
    if (r.status === 'retardo_grave')    s.retardosGraves++;
    if (r.status === 'falta')            s.faltas++;
    if (r.status === 'vacaciones')       s.vacaciones++;
    if (r.status === 'permiso_con_goce' || r.status === 'permiso_sin_goce') s.permisos++;
    if (r.status === 'incapacidad')      s.incapacidades++;
    s.totalDescuento     += r.descuentoSugerido;
    s.minutosRetardoTotal += r.minutosRetardo;
  });
  return Object.values(map).sort((a, b) => b.faltas - a.faltas || b.retardosGraves - a.retardosGraves);
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function AsistenciaTab() {
  const supabase = createClient();
  const [records, setRecords]     = useState<AttendanceRecord[]>([]);
  const [employees, setEmployees] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading]     = useState(true);
  const [exporting, setExporting] = useState(false);

  // Filtros
  const now = new Date();
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const today = now.toISOString().split('T')[0];

  const [startDate, setStartDate]   = useState(firstOfMonth);
  const [endDate, setEndDate]       = useState(today);
  const [filterEmp, setFilterEmp]   = useState('');
  const [view, setView]             = useState<'resumen' | 'detalle'>('resumen');
  const [filterStatus, setFilterStatus] = useState<AttendanceStatus | ''>('');

  const load = useCallback(async () => {
    setLoading(true);
    const tid = getTenantId() ?? '';
    const data = await getAttendanceReport(tid, startDate, endDate, filterEmp || undefined);
    setRecords(data);
    setLoading(false);
  }, [startDate, endDate, filterEmp]);

  // Cargar lista de empleados para el filtro
  useEffect(() => {
    supabase.from('employees').select('id, name')
      .eq('tenant_id', getTenantId()).eq('status', 'activo').order('name')
      .then(({ data }) => setEmployees((data ?? []).map((e: any) => ({ id: String(e.id), name: String(e.name) }))));
  }, [supabase]);

  useEffect(() => { load(); }, [load]);

  const summaries = useMemo(() => buildSummaries(records), [records]);

  const filteredRecords = useMemo(() => {
    let r = records.filter(rec => rec.status !== 'descanso' && rec.status !== 'sin_horario');
    if (filterStatus) r = r.filter(rec => rec.status === filterStatus);
    return r;
  }, [records, filterStatus]);

  // Totales globales
  const totals = useMemo(() => ({
    faltas: records.filter(r => r.status === 'falta').length,
    retardos: records.filter(r => r.status === 'retardo_leve' || r.status === 'retardo_grave').length,
    descuento: records.reduce((s, r) => s + r.descuentoSugerido, 0),
  }), [records]);

  const handleExport = async () => {
    setExporting(true);
    await downloadXLSX(`asistencia_${startDate}_${endDate}.xlsx`, [
      {
        name: 'Resumen',
        rows: summaries.map(s => ({
          'Empleado': s.name, 'Puesto': s.role,
          'Días laborables': s.totalDias,
          'A tiempo': s.aTiempo,
          'Retardos leves': s.retardosLeves,
          'Retardos graves': s.retardosGraves,
          'Faltas': s.faltas,
          'Vacaciones': s.vacaciones,
          'Permisos': s.permisos,
          'Incapacidades': s.incapacidades,
          'Min. retardo total': s.minutosRetardoTotal,
          'Descuento sugerido ($)': s.totalDescuento.toFixed(2),
        })),
      },
      {
        name: 'Detalle',
        rows: filteredRecords.map(r => ({
          'Fecha': r.date,
          'Empleado': r.employeeName,
          'Puesto': r.role,
          'Hora esperada': r.horaEntradaEsperada ?? '—',
          'Check-in': r.checkIn ?? '—',
          'Check-out': r.checkOut ?? '—',
          'Horas trabajadas': r.horasTrabajadas?.toFixed(1) ?? '—',
          'Estado': STATUS_CONFIG[r.status].label,
          'Minutos retardo': r.minutosRetardo,
          'Descuento ($)': r.descuentoSugerido.toFixed(2),
        })),
      },
    ]);
    setExporting(false);
  };

  const inp = "px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-blue-400 bg-white";

  return (
    <div className="space-y-5">

      {/* Filtros */}
      <div className="flex items-center gap-3 flex-wrap">
        <input type="date" className={inp} value={startDate} onChange={e => setStartDate(e.target.value)} />
        <span className="text-gray-400 text-sm">—</span>
        <input type="date" className={inp} value={endDate} onChange={e => setEndDate(e.target.value)} />
        <select className={inp} value={filterEmp} onChange={e => setFilterEmp(e.target.value)}>
          <option value="">Todos los empleados</option>
          {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
        </select>
        <div className="flex gap-1 ml-auto">
          {(['resumen', 'detalle'] as const).map(v => (
            <button key={v} onClick={() => setView(v)}
              className={`px-3 py-2 rounded-lg text-xs font-semibold capitalize ${view === v ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
              {v}
            </button>
          ))}
          <button onClick={handleExport} disabled={exporting}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border border-gray-200 text-gray-600 hover:bg-gray-50 ml-2">
            <Download size={13} /> {exporting ? '...' : 'Excel'}
          </button>
        </div>
      </div>

      {/* KPIs rápidos */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Faltas', value: totals.faltas, color: '#dc2626', bg: '#fef2f2' },
          { label: 'Retardos', value: totals.retardos, color: '#d97706', bg: '#fffbeb' },
          { label: 'Descuento total', value: `$${Math.round(totals.descuento).toLocaleString('es-MX')}`, color: '#7c3aed', bg: '#f5f3ff' },
        ].map(k => (
          <div key={k.label} className="rounded-xl p-4 text-center border"
            style={{ backgroundColor: k.bg, borderColor: k.color + '33' }}>
            <p className="text-2xl font-black" style={{ color: k.color }}>{k.value}</p>
            <p className="text-xs font-semibold mt-0.5" style={{ color: k.color }}>{k.label}</p>
            <p className="text-xs text-gray-400 mt-0.5">{startDate} — {endDate}</p>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />)}
        </div>
      ) : view === 'resumen' ? (

        /* ── Vista resumen por empleado ── */
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {['Empleado', 'A tiempo', 'Ret. leve', 'Ret. grave', 'Faltas', 'Vac/Perm/Inc', 'Min. retardo', 'Descuento'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {summaries.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-12 text-gray-400">Sin datos para el período seleccionado</td></tr>
              ) : summaries.map(s => (
                <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <p className="text-sm font-semibold text-gray-900">{s.name}</p>
                    <p className="text-xs text-gray-400">{s.role}</p>
                  </td>
                  <td className="px-4 py-3 text-sm font-semibold text-green-600">{s.aTiempo}</td>
                  <td className="px-4 py-3 text-sm font-semibold text-amber-600">{s.retardosLeves || '—'}</td>
                  <td className="px-4 py-3 text-sm font-semibold text-orange-600">{s.retardosGraves || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`text-sm font-bold ${s.faltas > 0 ? 'text-red-600' : 'text-gray-300'}`}>
                      {s.faltas || '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {s.vacaciones > 0 && `📅${s.vacaciones} `}
                    {s.permisos > 0 && `📋${s.permisos} `}
                    {s.incapacidades > 0 && `🏥${s.incapacidades}`}
                    {s.vacaciones + s.permisos + s.incapacidades === 0 && '—'}
                  </td>
                  <td className="px-4 py-3 text-sm font-mono text-gray-600">
                    {s.minutosRetardoTotal > 0 ? `${s.minutosRetardoTotal}min` : '—'}
                  </td>
                  <td className="px-4 py-3">
                    {s.totalDescuento > 0
                      ? <span className="text-sm font-bold text-red-600">${Math.round(s.totalDescuento).toLocaleString('es-MX')}</span>
                      : <span className="text-sm text-gray-300">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      ) : (

        /* ── Vista detalle por día ── */
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
          {/* Filtro de estado */}
          <div className="px-4 py-3 border-b border-gray-100 flex gap-2 flex-wrap">
            <button onClick={() => setFilterStatus('')}
              className={`px-2.5 py-1 rounded-full text-xs font-semibold ${!filterStatus ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
              Todos
            </button>
            {(['falta', 'retardo_grave', 'retardo_leve', 'vacaciones', 'incapacidad', 'permiso_con_goce'] as AttendanceStatus[]).map(s => {
              const cfg = STATUS_CONFIG[s];
              return (
                <button key={s} onClick={() => setFilterStatus(s === filterStatus ? '' : s)}
                  className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-colors`}
                  style={{ backgroundColor: filterStatus === s ? cfg.color : cfg.bg, color: filterStatus === s ? 'white' : cfg.color }}>
                  {cfg.emoji} {cfg.label}
                </button>
              );
            })}
          </div>

          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {['Fecha', 'Empleado', 'Esperado', 'Llegó', 'Salió', 'Horas', 'Estado', 'Descuento'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredRecords.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-12 text-gray-400">Sin incidencias en el período</td></tr>
              ) : filteredRecords.map(r => (
                <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-sm font-mono text-gray-600 whitespace-nowrap">{fmtDate(r.date)}</td>
                  <td className="px-4 py-3">
                    <p className="text-sm font-semibold text-gray-900">{r.employeeName}</p>
                    <p className="text-xs text-gray-400">{r.role}</p>
                  </td>
                  <td className="px-4 py-3 text-sm font-mono text-gray-500">{r.horaEntradaEsperada ?? '—'}</td>
                  <td className="px-4 py-3 text-sm font-mono font-semibold"
                    style={{ color: r.checkIn ? (r.minutosRetardo > 0 ? '#d97706' : '#15803d') : '#dc2626' }}>
                    {r.checkIn ?? 'Sin registro'}
                    {r.minutosRetardo > 0 && <span className="text-xs ml-1 font-normal text-orange-500">+{r.minutosRetardo}min</span>}
                  </td>
                  <td className="px-4 py-3 text-sm font-mono text-gray-500">{r.checkOut ?? '—'}</td>
                  <td className="px-4 py-3 text-sm font-mono text-gray-600">
                    {r.horasTrabajadas != null ? `${r.horasTrabajadas.toFixed(1)}h` : '—'}
                  </td>
                  <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                  <td className="px-4 py-3">
                    {r.descuentoSugerido > 0
                      ? <span className="text-sm font-bold text-red-600">${Math.round(r.descuentoSugerido).toLocaleString('es-MX')}</span>
                      : <span className="text-sm text-gray-300">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Nota de descuentos */}
      <div className="flex gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
        <span className="text-amber-600 flex-shrink-0">⚠️</span>
        <p className="text-xs text-amber-800">
          Los descuentos son <strong>sugeridos</strong> — falta grave descuenta 1 día, retardo grave descuenta el tiempo exacto.
          La decisión final (descontar, reponer o justificar) es del patrón.
          Retardos leves no generan descuento automático.
        </p>
      </div>
    </div>
  );
}
