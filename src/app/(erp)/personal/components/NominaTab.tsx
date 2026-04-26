'use client';
/**
 * NominaTab — Vista de costos laborales reales en el módulo de Personal
 *
 * Muestra para cada empleado y para el equipo completo:
 *   - Salario neto (lo que recibe el empleado)
 *   - Cuotas IMSS patronal (EM, IV, Guarderías, RT)
 *   - INFONAVIT (5% del SBC)
 *   - Prestaciones prorrateadas (aguinaldo + prima vac. + vacaciones)
 *   - Costo total mensual real para el patrón
 *
 * Basado en LFT + Ley del IMSS, tablas 2025
 */

import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Info, AlertTriangle } from 'lucide-react';
import { calcCostoEmpleado, calcResumenNomina } from '@/lib/laboralMX';

interface Employee {
  id: string;
  name: string;
  role: string;
  salary: number;
  salaryFrequency: string;
}

interface Props {
  employees: Employee[];
}

const fmt = (n: number) => `$${Math.round(n).toLocaleString('es-MX')}`;
const pct = (n: number, t: number) => t > 0 ? ` (${((n / t) * 100).toFixed(1)}%)` : '';

function Row({ label, value, sub, highlight, indent = false }: {
  label: string; value: string; sub?: string;
  highlight?: 'blue' | 'red' | 'green' | 'amber'; indent?: boolean;
}) {
  const colors = {
    blue:  'text-blue-700 font-bold',
    red:   'text-red-600 font-semibold',
    green: 'text-green-700 font-bold',
    amber: 'text-amber-700 font-semibold',
  };
  return (
    <div className={`flex items-center justify-between py-2 ${indent ? 'pl-4' : ''} border-b border-gray-100 last:border-0`}>
      <div>
        <span className="text-sm text-gray-700">{label}</span>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
      <span className={`text-sm ${highlight ? colors[highlight] : 'text-gray-900'}`}>{value}</span>
    </div>
  );
}

function EmployeeCard({ emp }: { emp: Employee }) {
  const [open, setOpen] = useState(false);

  const salMes = emp.salaryFrequency === 'quincenal' ? emp.salary * 2
    : emp.salaryFrequency === 'semanal' ? emp.salary * 4.33
    : emp.salary;

  const costo = calcCostoEmpleado(salMes);

  const roleLabel = (r: string) => r === 'admin' ? 'Admin' : r === 'cajero' ? 'Cajero' : r === 'mesero' ? 'Mesero'
    : r === 'cocinero' ? 'Cocinero' : r === 'gerente' ? 'Gerente' : r;

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-4 p-4 bg-white hover:bg-gray-50 transition-colors text-left"
      >
        <div className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center text-sm font-bold text-amber-700 flex-shrink-0">
          {emp.name.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900">{emp.name}</p>
          <p className="text-xs text-gray-500">{roleLabel(emp.role)} · {fmt(salMes)}/mes neto</p>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-sm font-bold text-blue-700">{fmt(costo.totalMensual)}/mes</p>
          <p className="text-xs text-gray-400">+{costo.porcentajeSobreSalario}% carga</p>
        </div>
        <div className="text-gray-400 flex-shrink-0">
          {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </button>

      {open && (
        <div className="px-4 pb-4 bg-gray-50 space-y-0.5">
          <div className="pt-2 pb-1">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Desglose mensual</p>
          </div>

          <Row label="Salario neto al empleado" value={fmt(costo.salarioNeto)}
            sub={`SBC mensual: ${fmt(costo.sbcMensual)}`} />

          <div className="pt-2 pb-1">
            <p className="text-xs font-bold text-red-500 uppercase tracking-wide">Cuotas patronales IMSS</p>
          </div>
          <Row label="Enfermedades y Maternidad" value={fmt(costo.imss.enfermedadMaternidad)} indent highlight="red" />
          <Row label="Invalidez y Vida (1.75%)" value={fmt(costo.imss.invalidezVida)} indent />
          <Row label="Guarderías y PS (1%)" value={fmt(costo.imss.guarderiasPrestacionesSociales)} indent />
          <Row label="Riesgos de Trabajo (~0.5%)" value={fmt(costo.imss.riesgosTrabajoAprox)} indent
            sub="Clase III — restaurante/cafetería" />
          <Row label="Retiro / SAR (2%)" value={fmt(costo.imss.retiro)} indent />
          <Row label="Cesantía en edad avanzada" value={fmt(costo.imss.cesantia)} indent />
          <Row label="Total IMSS patronal" value={fmt(costo.imss.total)} highlight="red" />

          <div className="pt-1" />
          <Row label="INFONAVIT (5% del SBC)" value={fmt(costo.infonavit)} highlight="amber" />

          <div className="pt-2 pb-1">
            <p className="text-xs font-bold text-amber-600 uppercase tracking-wide">Prestaciones (LFT mínimas)</p>
          </div>
          <Row label="Aguinaldo (15 días)" value={fmt(costo.prestaciones.aguinaldo / 12)} indent
            sub={`${fmt(costo.prestaciones.aguinaldo)}/año ÷ 12`} />
          <Row label="Prima vacacional (25%)" value={fmt(costo.prestaciones.primaVacacional / 12)} indent />
          <Row label="Vacaciones (provisión)" value={fmt(costo.prestaciones.vacaciones / 12)} indent />

          <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-blue-800">Costo total mensual real</p>
                <p className="text-xs text-blue-600">Lo que realmente cuesta este empleado</p>
              </div>
              <p className="text-xl font-black text-blue-800">{fmt(costo.totalMensual)}</p>
            </div>
            <div className="mt-2 flex items-center justify-between text-xs text-blue-500">
              <span>Factor de carga: {costo.factorCarga}×</span>
              <span>+{costo.porcentajeSobreSalario}% sobre el salario</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function NominaTab({ employees }: Props) {
  const activos = employees.filter(e => e.salary > 0);

  const empleadosParaCalculo = activos.map(e => ({
    salary: e.salaryFrequency === 'quincenal' ? e.salary * 2
      : e.salaryFrequency === 'semanal' ? e.salary * 4.33
      : e.salary,
    salary_frequency: 'mensual',
  }));

  const resumen = calcResumenNomina(empleadosParaCalculo);

  return (
    <div className="space-y-6 max-w-3xl">

      {/* Aviso */}
      <div className="flex gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
        <Info size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-amber-800">Cálculos estimados</p>
          <p className="text-xs text-amber-700 mt-0.5">
            Los montos de IMSS, INFONAVIT y prestaciones son aproximaciones basadas en la LFT y tablas IMSS 2025
            (UMA: $108.57/día). El cálculo exacto del IMSS depende de la clase de riesgo y otros factores.
            Confirma con tu contador o despacho de nómina.
          </p>
        </div>
      </div>

      {/* Resumen del equipo */}
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-white">
          <h3 className="text-base font-bold text-gray-900">Resumen del equipo — {resumen.empleados} empleados</h3>
          <p className="text-xs text-gray-500 mt-0.5">Costo mensual total para el negocio</p>
        </div>

        <div className="p-5 space-y-0.5">
          <Row label="Salarios y sueldos" value={fmt(resumen.salariosBrutos)} />
          <Row label="Cuotas IMSS patronal" value={fmt(resumen.cuotasIMSS)} highlight="red"
            sub="EM + IV + Guarderías + Riesgos de trabajo + Retiro + Cesantía" />
          <Row label="INFONAVIT (5% SBC)" value={fmt(resumen.cuotasINFONAVIT)} highlight="amber" />
          <Row label="Prestaciones (aguinaldo + prima vac.)" value={fmt(resumen.prestacionesMensuales)} highlight="amber"
            sub="Prorrateadas mensualmente" />

          <div className="mt-3 pt-3 border-t border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-base font-bold text-gray-900">Total nómina mensual real</p>
                <p className="text-xs text-gray-500">
                  Factor promedio del equipo: {resumen.factorPromedioEquipo}× el salario base
                </p>
              </div>
              <p className="text-2xl font-black text-blue-700">{fmt(resumen.totalNomina)}</p>
            </div>

            {/* Barra de desglose */}
            <div className="space-y-1.5">
              {[
                { label: 'Salarios', monto: resumen.salariosBrutos, color: 'bg-blue-500' },
                { label: 'IMSS', monto: resumen.cuotasIMSS, color: 'bg-red-400' },
                { label: 'INFONAVIT', monto: resumen.cuotasINFONAVIT, color: 'bg-amber-400' },
                { label: 'Prestaciones', monto: resumen.prestacionesMensuales, color: 'bg-amber-300' },
              ].map(item => (
                <div key={item.label} className="flex items-center gap-3">
                  <div className="w-20 text-xs text-gray-500 text-right">{item.label}</div>
                  <div className="flex-1 h-5 bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-full ${item.color} rounded-full transition-all`}
                      style={{ width: `${resumen.totalNomina > 0 ? (item.monto / resumen.totalNomina) * 100 : 0}%` }} />
                  </div>
                  <div className="w-24 text-xs text-gray-700 font-semibold">{fmt(item.monto)}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Alerta si la carga es muy alta */}
        {resumen.factorPromedioEquipo > 1.45 && (
          <div className="mx-5 mb-4 flex gap-2 p-3 bg-red-50 border border-red-200 rounded-xl">
            <AlertTriangle size={14} className="text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-red-700">
              La carga patronal supera el 45% del salario base. Verifica que los salarios en el sistema
              reflejen el salario neto y no el salario integrado.
            </p>
          </div>
        )}
      </div>

      {/* Por empleado */}
      <div>
        <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-3">
          Desglose por empleado
        </h3>
        {activos.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <p>No hay empleados con salario registrado</p>
            <p className="text-xs mt-1">Configura el salario en la pestaña Empleados</p>
          </div>
        ) : (
          <div className="space-y-3">
            {activos.map(emp => <EmployeeCard key={emp.id} emp={emp} />)}
          </div>
        )}
      </div>

      {/* Referencia LFT */}
      <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl space-y-2">
        <p className="text-xs font-bold text-gray-600 uppercase tracking-wide">Referencia — Prestaciones mínimas LFT 2025</p>
        <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-xs text-gray-600">
          <span>Aguinaldo:</span><span className="font-semibold">15 días de salario</span>
          <span>Vacaciones (1er año):</span><span className="font-semibold">12 días (reforma 2023)</span>
          <span>Prima vacacional:</span><span className="font-semibold">25% sobre días de vacaciones</span>
          <span>Jornada máxima:</span><span className="font-semibold">8h diurna, 7h nocturna</span>
          <span>Descanso semanal:</span><span className="font-semibold">1 día por 6 trabajados</span>
          <span>UMA 2025 (diario):</span><span className="font-semibold">$108.57</span>
        </div>
      </div>
    </div>
  );
}
