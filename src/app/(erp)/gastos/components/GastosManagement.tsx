'use client';
import { getCurrentTenantId as getTenantId } from '@/lib/tenantStore';




import React, { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Plus, Edit2, Trash2, CheckCircle, Clock, AlertTriangle, X, Save, Zap, Home, Shield, Megaphone, Wrench, DollarSign, TrendingDown, RefreshCw, Calendar, Tag } from 'lucide-react';
import { toast } from 'sonner';

// ─── Types ────────────────────────────────────────────────────────────────────

type GastoFrecuencia = 'diario' | 'semanal' | 'quincenal' | 'mensual' | 'bimestral' | 'trimestral' | 'semestral' | 'anual' | 'unico';
type GastoEstado = 'pendiente' | 'pagado';
type GastoCategoria = 'servicios' | 'renta' | 'nomina' | 'marketing' | 'mantenimiento' | 'suministros' | 'financiero' | 'impuestos' | 'otro';
type DepreciacionMetodo = 'linea_recta' | 'saldo_decreciente' | 'unidades_produccion';

interface GastoPago {
  id: string;
  gasto_id: string;
  fecha_pago: string;
  monto_pagado: number;
  periodo_inicio: string | null;
  periodo_fin: string | null;
  notas: string | null;
  created_at: string;
}

interface GastoRecurrente {
  id: string;
  nombre: string;
  descripcion: string | null;
  monto: number;
  categoria: GastoCategoria;
  frecuencia: GastoFrecuencia;
  dia_pago: number;
  proximo_pago: string | null;
  estado: GastoEstado;
  activo: boolean;
  notas: string | null;
  metodo_pago: 'efectivo' | 'transferencia' | 'credito' | 'tarjeta_empresa' | 'cheque';
  proveedor: string;
  dias_credito: number;
  created_at: string;
}

interface Depreciacion {
  id: string;
  nombre: string;
  descripcion: string | null;
  tipo: string;
  valor_original: number;
  valor_residual: number;
  vida_util_anios: number;
  fecha_adquisicion: string;
  metodo: DepreciacionMetodo;
  activo: boolean;
  notas: string | null;
  proveedor?: string | null;
  metodo_pago?: string | null;
}

type ActiveTab = 'gastos' | 'depreciaciones' | 'calendario';

// ─── Constants ────────────────────────────────────────────────────────────────

const FRECUENCIA_LABELS: Partial<Record<GastoFrecuencia, string>> & Record<string,string> = {
  unico: 'Único (extraordinario)', diario: 'Diario', semanal: 'Semanal', quincenal: 'Quincenal',
  mensual: 'Mensual', bimestral: 'Bimestral', trimestral: 'Trimestral',
  semestral: 'Semestral', anual: 'Anual',
};

const FRECUENCIA_MESES: Partial<Record<GastoFrecuencia, number>> & Record<string,number> = {
  unico: 0, diario: 1/30, semanal: 1/4.33, quincenal: 0.5,
  mensual: 1, bimestral: 2, trimestral: 3, semestral: 6, anual: 12,
};

const CATEGORIA_LABELS: Record<GastoCategoria, string> = {
  servicios: 'Servicios', renta: 'Renta', nomina: 'Nómina',
  marketing: 'Marketing', mantenimiento: 'Mantenimiento', suministros: 'Suministros',
  financiero: 'Financiero', impuestos: 'Impuestos', otro: 'Otro',
};

const CATEGORIA_ICONS: Record<GastoCategoria, React.ElementType> = {
  servicios: Zap, renta: Home, nomina: DollarSign, marketing: Megaphone,
  mantenimiento: Wrench, suministros: Tag, financiero: TrendingDown,
  impuestos: Shield, otro: DollarSign,
};

const CATEGORIA_COLORS: Record<GastoCategoria, string> = {
  servicios: '#f59e0b', renta: '#3b82f6', nomina: '#8b5cf6', marketing: '#ec4899',
  mantenimiento: '#f97316', suministros: '#14b8a6', financiero: '#ef4444',
  impuestos: '#6b7280', otro: '#9ca3af',
};

const METODO_LABELS: Record<DepreciacionMetodo, string> = {
  linea_recta: 'Línea Recta', saldo_decreciente: 'Saldo Decreciente', unidades_produccion: 'Unidades de Producción',
};

const EMPTY_GASTO: Omit<GastoRecurrente, 'id' | 'created_at'> = {
  nombre: '', descripcion: '', monto: 0, categoria: 'servicios', frecuencia: 'mensual', metodo_pago: 'efectivo' as const, proveedor: '', dias_credito: 0,
  dia_pago: 1, proximo_pago: '', estado: 'pendiente', activo: true, notas: '',
};

const EMPTY_DEP: Omit<Depreciacion, 'id'> = {
  nombre: '', descripcion: '', tipo: 'depreciacion', valor_original: 0, valor_residual: 0,
  vida_util_anios: 5, fecha_adquisicion: new Date().toISOString().split('T')[0],
  metodo: 'linea_recta', activo: true, notas: '',
  proveedor: '', metodo_pago: 'efectivo', dias_credito: 0,
};

// ─── Helper ───────────────────────────────────────────────────────────────────

function calcDepreciacionMensual(dep: Depreciacion): number {
  const base = dep.valor_original - dep.valor_residual;
  const anual = base / dep.vida_util_anios;
  return anual / 12;
}

function calcDepreciacionAcumulada(dep: Depreciacion): number {
  const inicio = new Date(dep.fecha_adquisicion);
  const hoy = new Date();
  const meses = Math.max(0, (hoy.getFullYear() - inicio.getFullYear()) * 12 + (hoy.getMonth() - inicio.getMonth()));
  const mensual = calcDepreciacionMensual(dep);
  const total = dep.valor_original - dep.valor_residual;
  return Math.min(meses * mensual, total);
}

function diasParaProximoPago(fecha: string | null): number | null {
  if (!fecha) return null;
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const pago = new Date(fecha);
  pago.setHours(0, 0, 0, 0);
  return Math.ceil((pago.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
}

function montoMensual(gasto: GastoRecurrente): number {
  if (gasto.frecuencia === 'unico') return 0; // unique expenses don't contribute to monthly total
  const meses = FRECUENCIA_MESES[gasto.frecuencia] ?? 1;
  return gasto.monto / meses;
}

// ─── Modal de Gasto ───────────────────────────────────────────────────────────

interface GastoModalProps {
  gasto: Omit<GastoRecurrente, 'id' | 'created_at'> | null;
  onClose: () => void;
  onSave: (data: Omit<GastoRecurrente, 'id' | 'created_at'>) => void;
  isUnico?: boolean;
}

function GastoModal({ gasto, onClose, onSave, isUnico = false }: GastoModalProps) {
  const [form, setForm] = useState<Omit<GastoRecurrente, 'id' | 'created_at'>>(gasto ?? { ...EMPTY_GASTO, ...(isUnico ? { frecuencia: 'unico' as GastoFrecuencia, dia_pago: 0, proximo_pago: new Date().toISOString().split('T')[0] } : {}) });

  function handleChange(field: string, value: any) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: '#e5e7eb' }}>
          <h2 className="text-base font-700 text-gray-900" style={{ fontWeight: 700 }}>
            {gasto ? 'Editar Gasto' : 'Nuevo Gasto Recurrente'}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <X size={18} className="text-gray-500" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-600 text-gray-600 mb-1" style={{ fontWeight: 600 }}>Nombre del Gasto *</label>
            <input
              type="text"
              value={form.nombre}
              onChange={e => handleChange('nombre', e.target.value)}
              placeholder="Ej: Luz (CFE), Agua, Gas LP..."
              className="w-full border rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-amber-400"
              style={{ borderColor: '#d1d5db' }}
            />
          </div>
          {isUnico && (
            <div style={{ background: '#fef3c7', border: '1px solid #f59e0b', borderRadius: 8, padding: '10px 14px' }}>
              <p style={{ fontSize: 12, color: '#92400e', margin: 0, lineHeight: 1.5 }}>
                <strong>Gasto extraordinario:</strong> Ocurre una sola vez. No se repite automáticamente. Ideal para reparaciones, compras especiales o imprevistos.
              </p>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-600 text-gray-600 mb-1" style={{ fontWeight: 600 }}>Categoría</label>
              <select
                value={form.categoria}
                onChange={e => handleChange('categoria', e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-amber-400"
                style={{ borderColor: '#d1d5db' }}
              >
                {(Object.keys(CATEGORIA_LABELS) as GastoCategoria[]).map(k => (
                  <option key={k} value={k}>{CATEGORIA_LABELS[k]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-600 text-gray-600 mb-1" style={{ fontWeight: 600 }}>Frecuencia</label>
              <select
                value={form.frecuencia}
                onChange={e => handleChange('frecuencia', e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-amber-400"
                style={{ borderColor: '#d1d5db' }}
              >
                {(Object.keys(FRECUENCIA_LABELS) as GastoFrecuencia[]).map(k => (
                  <option key={k} value={k}>{FRECUENCIA_LABELS[k]}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-600 text-gray-600 mb-1" style={{ fontWeight: 600 }}>Monto (MXN) *</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.monto}
                onChange={e => handleChange('monto', parseFloat(e.target.value) || 0)}
                className="w-full border rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-amber-400"
                style={{ borderColor: '#d1d5db' }}
              />
            </div>
            {!isUnico && <div>
              <label className="block text-xs font-600 text-gray-600 mb-1" style={{ fontWeight: 600 }}>Día del mes para pagar</label>
              <input
                type="number"
                min="1"
                max="31"
                value={form.dia_pago}
                onChange={e => {
                  const dia = parseInt(e.target.value) || 1;
                  handleChange('dia_pago', dia);
                  // Auto-calculate próximo pago based on día
                  const now = new Date();
                  const d = new Date(now.getFullYear(), now.getMonth(), dia);
                  if (d <= now) d.setMonth(d.getMonth() + 1);
                  handleChange('proximo_pago', d.toISOString().split('T')[0]);
                }}
                className="w-full border rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-amber-400"
                style={{ borderColor: '#d1d5db' }}
              />
              <p style={{fontSize:10,color:'#9ca3af',marginTop:2}}>Ej: 1 = cada primero · 15 = quincena · 31 = fin de mes</p>
            </div>}
          </div>
          <div>
            <label className="block text-xs font-600 text-gray-600 mb-1" style={{ fontWeight: 600 }}>{isUnico ? 'Fecha del gasto' : 'Fecha del próximo pago'}</label>
            <input
              type="date"
              value={form.proximo_pago ?? ''}
              onChange={e => handleChange('proximo_pago', e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-amber-400"
              style={{ borderColor: '#d1d5db' }}
            />
            <p style={{fontSize:10,color:'#9ca3af',marginTop:2}}>Se actualiza automáticamente al cambiar el día de pago</p>
          </div>
          {/* Proveedor y método de pago */}
          <div>
            <label className="block text-xs font-600 text-gray-600 mb-1" style={{ fontWeight: 600 }}>Proveedor / Acreedor</label>
            <input
              type="text"
              value={form.proveedor ?? ''}
              onChange={e => handleChange('proveedor', e.target.value)}
              placeholder="Ej: Bimbo, CFE, Arrendador García"
              className="w-full border rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-amber-400"
              style={{ borderColor: '#d1d5db' }}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-600 text-gray-600 mb-1" style={{ fontWeight: 600 }}>Método de pago</label>
              <select
                value={form.metodo_pago ?? 'efectivo'}
                onChange={e => handleChange('metodo_pago', e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-amber-400"
                style={{ borderColor: '#d1d5db' }}
              >
                <option value="efectivo">💵 Efectivo</option>
                <option value="transferencia">🏦 Transferencia</option>
                <option value="credito">📄 Crédito (CxP)</option>
                <option value="tarjeta_empresa">💳 Tarjeta empresa</option>
                <option value="cheque">📝 Cheque</option>
              </select>
              <p style={{fontSize:10,color:'#9ca3af',marginTop:2}}>
                {(form.metodo_pago==='credito')?'Se registra como Cuenta por Pagar':'Egreso directo de efectivo/banco'}
              </p>
            </div>
            <div>
              <label className="block text-xs font-600 text-gray-600 mb-1" style={{ fontWeight: 600 }}>Días de crédito</label>
              <input
                type="number" min={0} max={180}
                value={form.dias_credito ?? 0}
                onChange={e => handleChange('dias_credito', parseInt(e.target.value)||0)}
                disabled={form.metodo_pago !== 'credito'}
                placeholder="0"
                className="w-full border rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-amber-400"
                style={{ borderColor: '#d1d5db', opacity: form.metodo_pago === 'credito' ? 1 : 0.4 }}
              />
              <p style={{fontSize:10,color:'#9ca3af',marginTop:2}}>Solo aplica a pagos en crédito</p>
            </div>
          </div>
          <div>
            <label className="block text-xs font-600 text-gray-600 mb-1" style={{ fontWeight: 600 }}>Notas</label>
            <textarea
              value={form.notas ?? ''}
              onChange={e => handleChange('notas', e.target.value)}
              rows={2}
              className="w-full border rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none"
              style={{ borderColor: '#d1d5db' }}
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="activo"
              checked={form.activo}
              onChange={e => handleChange('activo', e.target.checked)}
              className="w-4 h-4 rounded"
            />
            <label htmlFor="activo" className="text-sm text-gray-700">Gasto activo (se incluye en P&L)</label>
          </div>
        </div>
        <div className="flex gap-3 p-5 border-t" style={{ borderColor: '#e5e7eb' }}>
          <button onClick={onClose} className="flex-1 px-4 py-2 rounded-lg text-sm font-600 border transition-colors hover:bg-gray-50" style={{ fontWeight: 600, borderColor: '#d1d5db', color: '#374151' }}>
            Cancelar
          </button>
          <button
            onClick={() => { if (form.nombre.trim()) onSave(form); }}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-600 transition-colors"
            style={{ fontWeight: 600, backgroundColor: '#f59e0b', color: '#1B3A6B' }}
          >
            <Save size={15} />
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Modal de Depreciación ────────────────────────────────────────────────────

interface DepModalProps {
  dep: Omit<Depreciacion, 'id'> | null;
  onClose: () => void;
  onSave: (data: Omit<Depreciacion, 'id'>) => void;
}

function DepModal({ dep, onClose, onSave }: DepModalProps) {
  const [form, setForm] = useState<Omit<Depreciacion, 'id'>>(dep ?? { ...EMPTY_DEP });

  function handleChange(field: string, value: any) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  const mensual = useMemo(() => {
    const base = form.valor_original - form.valor_residual;
    return form.vida_util_anios > 0 ? base / form.vida_util_anios / 12 : 0;
  }, [form.valor_original, form.valor_residual, form.vida_util_anios]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: '#e5e7eb' }}>
          <h2 className="text-base font-700 text-gray-900" style={{ fontWeight: 700 }}>
            {dep ? 'Editar Activo' : 'Nuevo Activo / Amortización'}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <X size={18} className="text-gray-500" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-600 text-gray-600 mb-1" style={{ fontWeight: 600 }}>Nombre del Activo *</label>
            <input
              type="text"
              value={form.nombre}
              onChange={e => handleChange('nombre', e.target.value)}
              placeholder="Ej: Estufa Industrial, Refrigerador..."
              className="w-full border rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-amber-400"
              style={{ borderColor: '#d1d5db' }}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-600 text-gray-600 mb-1" style={{ fontWeight: 600 }}>Tipo</label>
              <select
                value={form.tipo}
                onChange={e => handleChange('tipo', e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-amber-400"
                style={{ borderColor: '#d1d5db' }}
              >
                <option value="depreciacion">Depreciación (Activo Fijo)</option>
                <option value="amortizacion">Amortización (Activo Intangible)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-600 text-gray-600 mb-1" style={{ fontWeight: 600 }}>Método</label>
              <select
                value={form.metodo}
                onChange={e => handleChange('metodo', e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-amber-400"
                style={{ borderColor: '#d1d5db' }}
              >
                {(Object.keys(METODO_LABELS) as DepreciacionMetodo[]).map(k => (
                  <option key={k} value={k}>{METODO_LABELS[k]}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-600 text-gray-600 mb-1" style={{ fontWeight: 600 }}>Valor Original (MXN)</label>
              <input
                type="number" min="0" step="0.01"
                value={form.valor_original}
                onChange={e => handleChange('valor_original', parseFloat(e.target.value) || 0)}
                className="w-full border rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-amber-400"
                style={{ borderColor: '#d1d5db' }}
              />
            </div>
            <div>
              <label className="block text-xs font-600 text-gray-600 mb-1" style={{ fontWeight: 600 }}>Valor Residual (MXN)</label>
              <input
                type="number" min="0" step="0.01"
                value={form.valor_residual}
                onChange={e => handleChange('valor_residual', parseFloat(e.target.value) || 0)}
                className="w-full border rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-amber-400"
                style={{ borderColor: '#d1d5db' }}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-600 text-gray-600 mb-1" style={{ fontWeight: 600 }}>Vida Útil (años)</label>
              <input
                type="number" min="1" max="50"
                value={form.vida_util_anios}
                onChange={e => handleChange('vida_util_anios', parseInt(e.target.value) || 1)}
                className="w-full border rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-amber-400"
                style={{ borderColor: '#d1d5db' }}
              />
            </div>
            <div>
              <label className="block text-xs font-600 text-gray-600 mb-1" style={{ fontWeight: 600 }}>Fecha de Adquisición</label>
              <input
                type="date"
                value={form.fecha_adquisicion}
                onChange={e => handleChange('fecha_adquisicion', e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-amber-400"
                style={{ borderColor: '#d1d5db' }}
              />
            </div>
          </div>
          {mensual > 0 && (
            <div className="p-3 rounded-lg text-sm" style={{ backgroundColor: '#eff6ff', border: '1px solid #bfdbfe' }}>
              <span className="text-blue-700 font-600" style={{ fontWeight: 600 }}>
                Depreciación mensual calculada: ${mensual.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MXN
              </span>
            </div>
          )}
          {/* Proveedor y método de pago */}
          <div>
            <label className="block text-xs font-600 text-gray-600 mb-1" style={{ fontWeight: 600 }}>Proveedor / Acreedor</label>
            <input
              type="text"
              value={form.proveedor ?? ''}
              onChange={e => handleChange('proveedor', e.target.value)}
              placeholder="Ej: Bimbo, CFE, Arrendador García"
              className="w-full border rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-amber-400"
              style={{ borderColor: '#d1d5db' }}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-600 text-gray-600 mb-1" style={{ fontWeight: 600 }}>Método de pago</label>
              <select
                value={form.metodo_pago ?? 'efectivo'}
                onChange={e => handleChange('metodo_pago', e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-amber-400"
                style={{ borderColor: '#d1d5db' }}
              >
                <option value="efectivo">💵 Efectivo</option>
                <option value="transferencia">🏦 Transferencia</option>
                <option value="credito">📄 Crédito (CxP)</option>
                <option value="tarjeta_empresa">💳 Tarjeta empresa</option>
                <option value="cheque">📝 Cheque</option>
              </select>
              <p style={{fontSize:10,color:'#9ca3af',marginTop:2}}>
                {(form.metodo_pago==='credito')?'Se registra como Cuenta por Pagar':'Egreso directo de efectivo/banco'}
              </p>
            </div>
            <div>
              <label className="block text-xs font-600 text-gray-600 mb-1" style={{ fontWeight: 600 }}>Días de crédito</label>
              <input
                type="number" min={0} max={180}
                value={form.dias_credito ?? 0}
                onChange={e => handleChange('dias_credito', parseInt(e.target.value)||0)}
                disabled={form.metodo_pago !== 'credito'}
                placeholder="0"
                className="w-full border rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-amber-400"
                style={{ borderColor: '#d1d5db', opacity: form.metodo_pago === 'credito' ? 1 : 0.4 }}
              />
              <p style={{fontSize:10,color:'#9ca3af',marginTop:2}}>Solo aplica a pagos en crédito</p>
            </div>
          </div>
          <div>
            <label className="block text-xs font-600 text-gray-600 mb-1" style={{ fontWeight: 600 }}>Notas</label>
            <textarea
              value={form.notas ?? ''}
              onChange={e => handleChange('notas', e.target.value)}
              rows={2}
              className="w-full border rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none"
              style={{ borderColor: '#d1d5db' }}
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="dep_activo"
              checked={form.activo}
              onChange={e => handleChange('activo', e.target.checked)}
              className="w-4 h-4 rounded"
            />
            <label htmlFor="dep_activo" className="text-sm text-gray-700">Activo vigente (se incluye en P&L)</label>
          </div>
        </div>
        <div className="flex gap-3 p-5 border-t" style={{ borderColor: '#e5e7eb' }}>
          <button onClick={onClose} className="flex-1 px-4 py-2 rounded-lg text-sm font-600 border transition-colors hover:bg-gray-50" style={{ fontWeight: 600, borderColor: '#d1d5db', color: '#374151' }}>
            Cancelar
          </button>
          <button
            onClick={() => { if (form.nombre.trim()) onSave(form); }}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-600 transition-colors"
            style={{ fontWeight: 600, backgroundColor: '#f59e0b', color: '#1B3A6B' }}
          >
            <Save size={15} />
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function GastosManagement() {
  const supabase = createClient();
  const [activeTab, setActiveTab] = useState<ActiveTab>('gastos');
  const [gastos, setGastos] = useState<GastoRecurrente[]>([]);
  const [depreciaciones, setDepreciaciones] = useState<Depreciacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [showGastoModal, setShowGastoModal] = useState(false);
  const [showGastoUnicoModal, setShowGastoUnicoModal] = useState(false);
  const [editingGasto, setEditingGasto] = useState<GastoRecurrente | null>(null);
  const [showDepModal, setShowDepModal] = useState(false);
  const [editingDep, setEditingDep] = useState<Depreciacion | null>(null);
  const [filterCategoria, setFilterCategoria] = useState<GastoCategoria | 'todas'>('todas');
  const [gastosPagos, setGastosPagos] = useState<GastoPago[]>([]);
  const [showPagoModal, setShowPagoModal] = useState<GastoRecurrente | null>(null);
  const [pagoForm, setPagoForm] = useState({ fecha_pago: new Date().toISOString().split('T')[0], monto_pagado: 0, notas: '' });
  const [savingPago, setSavingPago] = useState(false);

  // ── Fetch ──────────────────────────────────────────────────────────────────

  async function fetchGastos() {
    const { data } = await supabase
      .from('gastos_recurrentes')
      .select('*')
        .eq('tenant_id', getTenantId())
      .order('created_at', { ascending: false });
    if (data) setGastos(data as GastoRecurrente[]);
  }

  async function fetchGastosPagos() {
    const { data } = await supabase
      .from('gastos_pagos')
      .select('*')
        .eq('tenant_id', getTenantId())
      .order('fecha_pago', { ascending: false });
    if (data) setGastosPagos(data as GastoPago[]);
  }

  async function fetchDepreciaciones() {
    const { data } = await supabase
      .from('depreciaciones')
      .select('*')
        .eq('tenant_id', getTenantId())
      .order('created_at', { ascending: false });
    if (data) setDepreciaciones(data as Depreciacion[]);
  }

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchGastos(), fetchDepreciaciones(), fetchGastosPagos()]).finally(() => setLoading(false));
  }, []);

  // ── KPIs ───────────────────────────────────────────────────────────────────

  const gastosActivos = useMemo(() => gastos.filter(g => g.activo), [gastos]);
  const totalMensualGastos = useMemo(() =>
    gastosActivos.reduce((sum, g) => sum + montoMensual(g), 0), [gastosActivos]);
  const gastosPendientes = useMemo(() => gastosActivos.filter(g => g.estado === 'pendiente'), [gastosActivos]);
  const gastosProximos = useMemo(() =>
    gastosActivos.filter(g => {
      const dias = diasParaProximoPago(g.proximo_pago);
      return dias !== null && dias >= 0 && dias <= 7;
    }), [gastosActivos]);

  const depActivas = useMemo(() => depreciaciones.filter(d => d.activo), [depreciaciones]);
  const totalDepMensual = useMemo(() =>
    depActivas.reduce((sum, d) => sum + calcDepreciacionMensual(d), 0), [depActivas]);

  // ── CRUD Gastos ────────────────────────────────────────────────────────────

  async function handleSaveGasto(data: Omit<GastoRecurrente, 'id' | 'created_at'>) {
    try {
      if (editingGasto) {
        const { error } = await supabase.from('gastos_recurrentes').update(data).eq('id', editingGasto.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('gastos_recurrentes').insert([{ ...data, tenant_id: getTenantId() }]);
        if (error) throw error;
      }
      setShowGastoModal(false);
      setEditingGasto(null);
      fetchGastos();
    } catch (err: any) {
      toast.error('Error al guardar gasto: ' + (err?.message ?? 'Intenta de nuevo'));
    }
  }

  async function handleDeleteGasto(id: string) {
    // inline delete — user already clicked delete button
    const { error } = await supabase.from('gastos_recurrentes').delete().eq('id', id);
    if (error) { toast.error('Error al eliminar gasto: ' + error.message); return; }
    fetchGastos();
  }

  // Calculate how many payments are pending (overdue) for a gasto
  function pagosPendientes(gasto: GastoRecurrente): number {
    const pagos = gastosPagos.filter(p => p.gasto_id === gasto.id);
    if (!gasto.proximo_pago) return 0;
    const today = new Date();
    const proximo = new Date(gasto.proximo_pago);
    if (proximo > today) return 0; // not due yet
    // Calculate months/periods overdue
    const FREC_DIAS: Record<GastoFrecuencia, number> = {
      unico:0, diario:1, semanal:7, quincenal:15, mensual:30, bimestral:60, trimestral:90, semestral:180, anual:365
    };
    const diasVencido = Math.floor((today.getTime() - proximo.getTime()) / 86400000);
    return Math.max(1, Math.ceil(diasVencido / FREC_DIAS[gasto.frecuencia]));
  }

  function ultimoPago(gastoId: string): GastoPago | null {
    const pagos = gastosPagos.filter(p => p.gasto_id === gastoId);
    if (!pagos.length) return null;
    return pagos.sort((a, b) => b.fecha_pago.localeCompare(a.fecha_pago))[0];
  }

  function calcProximoPago(frecuencia: GastoFrecuencia, desde: Date): string {
    const FREC_DIAS: Record<GastoFrecuencia, number> = {
      unico:0, diario:1, semanal:7, quincenal:15, mensual:30, bimestral:60, trimestral:90, semestral:180, anual:365
    };
    const next = new Date(desde);
    next.setDate(next.getDate() + FREC_DIAS[frecuencia]);
    return next.toISOString().split('T')[0];
  }

  async function handleRegistrarPago() {
    if (!showPagoModal) return;
    setSavingPago(true);
    const gasto = showPagoModal;

    // Insert into gastos_pagos
    const { error } = await supabase.from('gastos_pagos').insert({ tenant_id: getTenantId(),
      gasto_id: gasto.id,
      fecha_pago: pagoForm.fecha_pago,
      monto_pagado: pagoForm.monto_pagado || gasto.monto,
      notas: pagoForm.notas || null,
      periodo_inicio: gasto.proximo_pago || pagoForm.fecha_pago,
      periodo_fin: calcProximoPago(gasto.frecuencia, new Date(gasto.proximo_pago || pagoForm.fecha_pago)),
    });

    if (error) { toast.error('Error al registrar pago: ' + error.message); setSavingPago(false); return; }

    // Update gasto: next payment date + status
    const nextPago = calcProximoPago(gasto.frecuencia, new Date(pagoForm.fecha_pago));
    await supabase.from('gastos_recurrentes').update({
      estado: 'pagado',
      proximo_pago: nextPago,
      updated_at: new Date().toISOString(),
    }).eq('id', gasto.id);

    toast.success(`Pago registrado. Próximo vencimiento: ${nextPago}`);
    setSavingPago(false);
    setShowPagoModal(null);
    setPagoForm({ fecha_pago: new Date().toISOString().split('T')[0], monto_pagado: 0, notas: '' });
    Promise.all([fetchGastos(), fetchGastosPagos()]);
  }

  // ── CRUD Depreciaciones ────────────────────────────────────────────────────

  async function handleSaveDep(data: Omit<Depreciacion, 'id'>) {
    try {
      if (editingDep) {
        const { error } = await supabase.from('depreciaciones').update(data).eq('id', editingDep.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('depreciaciones').insert([{ ...data, tenant_id: getTenantId() }]);
        if (error) throw error;
      }
      setShowDepModal(false);
      setEditingDep(null);
      fetchDepreciaciones();
    } catch (err: any) {
      toast.error('Error al guardar depreciación: ' + (err?.message ?? 'Intenta de nuevo'));
    }
  }

  async function handleDeleteDep(id: string) {
    // inline delete — user already clicked delete button
    const { error } = await supabase.from('depreciaciones').delete().eq('id', id);
    if (error) { toast.error('Error al eliminar activo: ' + error.message); return; }
    fetchDepreciaciones();
  }

  // ── Filtered gastos ────────────────────────────────────────────────────────

  const filteredGastos = useMemo(() =>
    filterCategoria === 'todas' ? gastos : gastos.filter(g => g.categoria === filterCategoria),
    [gastos, filterCategoria]
  );

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f8fafc' }}>
      {/* Header */}
      <div className="bg-white border-b px-6 py-4 flex items-center justify-between" style={{ borderColor: '#e5e7eb' }}>
        <div>
          <h1 className="text-xl font-700 text-gray-900" style={{ fontWeight: 700 }}>Gastos y Depreciaciones</h1>
          <p className="text-sm text-gray-500 mt-0.5">Gestión de gastos recurrentes, depreciaciones y amortizaciones</p>
        </div>
        <div className="flex items-center gap-2">
          {activeTab === 'gastos' && (
            <button
              onClick={() => setShowGastoUnicoModal(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-600 transition-all"
              style={{ fontWeight: 600, backgroundColor: '#f3f4f6', color: '#374151', border: '1px solid #e5e7eb' }}
            >
              <Zap size={16} />
              Gasto Extraordinario
            </button>
          )}
          <button
            onClick={() => activeTab === 'gastos' ? setShowGastoModal(true) : setShowDepModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-600 transition-all"
            style={{ fontWeight: 600, backgroundColor: '#f59e0b', color: '#1B3A6B' }}
          >
            <Plus size={16} />
            {activeTab === 'gastos' ? 'Nuevo Gasto Recurrente' : 'Nuevo Activo'}
          </button>
        </div>
      </div>

      <div className="px-6 py-5 space-y-5">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Gastos Mensuales', value: `$${totalMensualGastos.toLocaleString('es-MX', { maximumFractionDigits: 0 })}`, icon: DollarSign, color: '#ef4444', bg: '#fef2f2', sub: 'Total activos/mes' },
            { label: 'Pendientes de Pago', value: gastosPendientes.length.toString(), icon: Clock, color: '#f59e0b', bg: '#fffbeb', sub: `${gastosPendientes.length} gastos` },
            { label: 'Vencen en 7 días', value: gastosProximos.length.toString(), icon: AlertTriangle, color: '#f97316', bg: '#fff7ed', sub: 'Próximos pagos' },
            { label: 'Depreciación/mes', value: `$${totalDepMensual.toLocaleString('es-MX', { maximumFractionDigits: 0 })}`, icon: TrendingDown, color: '#8b5cf6', bg: '#f5f3ff', sub: `${depActivas.length} activos` },
          ].map(kpi => {
            const KpiIcon = kpi.icon;
            return (
              <div key={kpi.label} className="bg-white rounded-xl border p-4" style={{ borderColor: '#e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-gray-500">{kpi.label}</span>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: kpi.bg }}>
                    <KpiIcon size={16} style={{ color: kpi.color }} />
                  </div>
                </div>
                <p className="text-xl font-700 text-gray-900" style={{ fontWeight: 700 }}>{kpi.value}</p>
                <p className="text-xs text-gray-400 mt-0.5">{kpi.sub}</p>
              </div>
            );
          })}
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl border overflow-hidden" style={{ borderColor: '#e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <div className="flex border-b" style={{ borderColor: '#e5e7eb' }}>
            {([
              { key: 'gastos', label: 'Gastos Recurrentes', icon: RefreshCw },
              { key: 'depreciaciones', label: 'Depreciaciones y Amortizaciones', icon: TrendingDown },
            ] as { key: ActiveTab; label: string; icon: React.ElementType }[]).map(tab => {
              const TabIcon = tab.icon;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className="flex items-center gap-2 px-5 py-3.5 text-sm font-600 transition-all border-b-2"
                  style={{
                    fontWeight: 600,
                    borderBottomColor: activeTab === tab.key ? '#f59e0b' : 'transparent',
                    color: activeTab === tab.key ? '#1B3A6B' : '#6b7280',
                    backgroundColor: activeTab === tab.key ? '#fffbeb' : 'transparent',
                  }}
                >
                  <TabIcon size={15} />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* ── Tab: Gastos Recurrentes ── */}
          {activeTab === 'gastos' && (
            <div className="p-5">
              {/* Filter bar */}
              <div className="flex flex-wrap items-center gap-2 mb-4">
                <span className="text-xs font-600 text-gray-500 mr-1" style={{ fontWeight: 600 }}>Categoría:</span>
                {(['todas', ...Object.keys(CATEGORIA_LABELS)] as (GastoCategoria | 'todas')[]).map(cat => (
                  <button
                    key={cat}
                    onClick={() => setFilterCategoria(cat)}
                    className="px-3 py-1 rounded-full text-xs font-600 transition-all"
                    style={{
                      fontWeight: 600,
                      backgroundColor: filterCategoria === cat ? '#1B3A6B' : '#f3f4f6',
                      color: filterCategoria === cat ? 'white' : '#374151',
                    }}
                  >
                    {cat === 'todas' ? 'Todas' : CATEGORIA_LABELS[cat as GastoCategoria]}
                  </button>
                ))}
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-12 text-gray-400 text-sm">Cargando gastos...</div>
              ) : filteredGastos.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                  <DollarSign size={40} className="mb-3 opacity-30" />
                  <p className="text-sm">No hay gastos registrados</p>
                  <button onClick={() => setShowGastoModal(true)} className="mt-3 text-sm text-amber-600 hover:underline">+ Agregar primer gasto</button>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredGastos.map(gasto => {
                    const CatIcon = CATEGORIA_ICONS[gasto.categoria as GastoCategoria];
                    const catColor = CATEGORIA_COLORS[gasto.categoria as GastoCategoria];
                    const dias = diasParaProximoPago(gasto.proximo_pago);
                    const esUrgente = dias !== null && dias >= 0 && dias <= 3;
                    const esProximo = dias !== null && dias >= 0 && dias <= 7;
                    const vencido = dias !== null && dias < 0;

                    return (
                      <div
                        key={gasto.id}
                        className="flex items-center gap-3 p-3.5 rounded-xl border transition-all"
                        style={{
                          borderColor: esUrgente ? '#fca5a5' : esProximo ? '#fde68a' : '#e5e7eb',
                          backgroundColor: esUrgente ? '#fff5f5' : esProximo ? '#fffdf0' : 'white',
                          opacity: gasto.activo ? 1 : 0.5,
                        }}
                      >
                        {/* Category icon */}
                        <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${catColor}15` }}>
                          <CatIcon size={16} style={{ color: catColor }} />
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-600 text-gray-900 truncate" style={{ fontWeight: 600 }}>{gasto.nombre}</span>
                            <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: `${catColor}15`, color: catColor }}>
                              {CATEGORIA_LABELS[gasto.categoria as GastoCategoria]}
                            </span>
                            <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                              {FRECUENCIA_LABELS[gasto.frecuencia]}
                            </span>
                            {!gasto.activo && <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-400">Inactivo</span>}
                          </div>
                          <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                            <span className="text-sm font-700 text-gray-800" style={{ fontWeight: 700 }}>
                              ${gasto.monto.toLocaleString('es-MX')}
                            </span>
                            <span className="text-xs text-gray-400">
                              ≈ ${montoMensual(gasto).toLocaleString('es-MX', { maximumFractionDigits: 0 })}/mes
                            </span>
                            {gasto.proximo_pago && (
                              <span className={`text-xs flex items-center gap-1 ${vencido ? 'text-red-500' : esUrgente ? 'text-orange-500' : esProximo ? 'text-amber-600' : 'text-gray-400'}`}>
                                <Calendar size={11} />
                                {vencido ? `Vencido hace ${Math.abs(dias!)} días` : dias === 0 ? 'Vence hoy' : `${dias} días`}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Estado toggle */}
                        <button
                          onClick={() => { setPagoForm({ fecha_pago: new Date().toISOString().split('T')[0], monto_pagado: gasto.monto, notas: '' }); setShowPagoModal(gasto); }}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-600 transition-all flex-shrink-0"
                          style={{
                            fontWeight: 600,
                            backgroundColor: gasto.estado === 'pagado' ? '#ecfdf5' : '#fef2f2',
                            color: gasto.estado === 'pagado' ? '#10b981' : '#ef4444',
                          }}
                        >
                          {gasto.estado === 'pagado' ? <CheckCircle size={13} /> : pagosPendientes(gasto) > 1 ? <AlertTriangle size={13} /> : <Clock size={13} />}
                          {gasto.estado === 'pagado'
                            ? `Pagado ${ultimoPago(gasto.id)?.fecha_pago ? '· ' + ultimoPago(gasto.id)!.fecha_pago.slice(0,10) : ''}`
                            : pagosPendientes(gasto) > 1
                              ? `⚠️ ${pagosPendientes(gasto)} pagos vencidos`
                              : gasto.proximo_pago && new Date(gasto.proximo_pago) < new Date()
                                ? 'Vencido'
                                : 'Pendiente'}
                        </button>

                        {/* Actions */}
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button
                            onClick={() => { setEditingGasto(gasto); setShowGastoModal(true); }}
                            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                          >
                            <Edit2 size={14} className="text-gray-400" />
                          </button>
                          <button
                            onClick={() => handleDeleteGasto(gasto.id)}
                            className="p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                          >
                            <Trash2 size={14} className="text-red-400" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── Tab: Depreciaciones ── */}
          {activeTab === 'depreciaciones' && (
            <div className="p-5">
              {/* Summary */}
              <div className="grid grid-cols-2 gap-3 mb-5">
                <div className="p-3 rounded-xl border" style={{ borderColor: '#e5e7eb', backgroundColor: '#f5f3ff' }}>
                  <p className="text-xs text-purple-600 mb-1">Depreciación mensual total</p>
                  <p className="text-lg font-700 text-purple-800" style={{ fontWeight: 700 }}>
                    ${totalDepMensual.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                  <p className="text-xs text-purple-500 mt-0.5">Se refleja en el P&L</p>
                </div>
                <div className="p-3 rounded-xl border" style={{ borderColor: '#e5e7eb', backgroundColor: '#eff6ff' }}>
                  <p className="text-xs text-blue-600 mb-1">Depreciación anual total</p>
                  <p className="text-lg font-700 text-blue-800" style={{ fontWeight: 700 }}>
                    ${(totalDepMensual * 12).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                  <p className="text-xs text-blue-500 mt-0.5">{depActivas.length} activos vigentes</p>
                </div>
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-12 text-gray-400 text-sm">Cargando activos...</div>
              ) : depreciaciones.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                  <TrendingDown size={40} className="mb-3 opacity-30" />
                  <p className="text-sm">No hay activos registrados</p>
                  <button onClick={() => setShowDepModal(true)} className="mt-3 text-sm text-amber-600 hover:underline">+ Agregar primer activo</button>
                </div>
              ) : (
                <div className="space-y-2">
                  {depreciaciones.map(dep => {
                    const mensual = calcDepreciacionMensual(dep);
                    const acumulada = calcDepreciacionAcumulada(dep);
                    const base = dep.valor_original - dep.valor_residual;
                    const pct = base > 0 ? Math.min((acumulada / base) * 100, 100) : 0;
                    const isAmort = dep.tipo === 'amortizacion';

                    return (
                      <div
                        key={dep.id}
                        className="p-4 rounded-xl border transition-all"
                        style={{ borderColor: '#e5e7eb', backgroundColor: 'white', opacity: dep.activo ? 1 : 0.5 }}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <span className="text-sm font-600 text-gray-900" style={{ fontWeight: 600 }}>{dep.nombre}</span>
                              <span className="text-xs px-2 py-0.5 rounded-full" style={{
                                backgroundColor: isAmort ? '#eff6ff' : '#f5f3ff',
                                color: isAmort ? '#3b82f6' : '#8b5cf6',
                              }}>
                                {isAmort ? 'Amortización' : 'Depreciación'}
                              </span>
                              <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                                {METODO_LABELS[dep.metodo as DepreciacionMetodo]}
                              </span>
                              {!dep.activo && <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-400">Inactivo</span>}
                            </div>
                            <div className="flex items-center gap-4 text-xs text-gray-500 flex-wrap">
                              <span>Valor original: <strong className="text-gray-700">${dep.valor_original.toLocaleString('es-MX')}</strong></span>
                              <span>Vida útil: <strong className="text-gray-700">{dep.vida_util_anios} años</strong></span>
                              <span>Adquisición: <strong className="text-gray-700">{dep.fecha_adquisicion}</strong></span>
                            </div>
                            {/* Progress bar */}
                            <div className="mt-2">
                              <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
                                <span>Depreciado: ${acumulada.toLocaleString('es-MX', { maximumFractionDigits: 0 })}</span>
                                <span>{pct.toFixed(1)}%</span>
                              </div>
                              <div className="w-full h-1.5 rounded-full bg-gray-100">
                                <div
                                  className="h-1.5 rounded-full transition-all"
                                  style={{ width: `${pct}%`, backgroundColor: isAmort ? '#3b82f6' : '#8b5cf6' }}
                                />
                              </div>
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="text-base font-700" style={{ fontWeight: 700, color: isAmort ? '#3b82f6' : '#8b5cf6' }}>
                              ${mensual.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </p>
                            <p className="text-xs text-gray-400">por mes</p>
                            <div className="flex items-center gap-1 mt-2 justify-end">
                              <button
                                onClick={() => { setEditingDep(dep); setShowDepModal(true); }}
                                className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                              >
                                <Edit2 size={14} className="text-gray-400" />
                              </button>
                              <button
                                onClick={() => handleDeleteDep(dep.id)}
                                className="p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                              >
                                <Trash2 size={14} className="text-red-400" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* P&L Connection note */}
        <div className="p-4 rounded-xl border text-sm" style={{ backgroundColor: '#ecfdf5', borderColor: '#a7f3d0' }}>
          <div className="flex items-start gap-2">
            <CheckCircle size={16} className="text-green-600 mt-0.5 flex-shrink-0" />
            <div>
              <strong className="text-green-800">Conectado al P&L:</strong>
              <span className="text-green-700 ml-1">
                Los gastos recurrentes activos (${totalMensualGastos.toLocaleString('es-MX', { maximumFractionDigits: 0 })}/mes) y la depreciación mensual (${totalDepMensual.toLocaleString('es-MX', { maximumFractionDigits: 0 })}/mes) se reflejan automáticamente en el Estado de Resultados en la sección de Reportes.
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      {/* ── Registrar Pago Modal ── */}
      {showPagoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <div>
                <h3 className="font-bold text-gray-900">Registrar pago</h3>
                <p className="text-sm text-gray-500 mt-0.5">{showPagoModal.nombre}</p>
              </div>
              <button onClick={() => setShowPagoModal(null)} className="p-2 rounded-xl hover:bg-gray-100"><X size={18} /></button>
            </div>
            <div className="p-5 space-y-4">
              {pagosPendientes(showPagoModal) > 1 && (
                <div className="rounded-xl p-3 flex items-center gap-2" style={{ background: '#fef2f2', border: '1px solid #fca5a5' }}>
                  <AlertTriangle size={16} style={{ color: '#dc2626' }} />
                  <p className="text-sm font-medium" style={{ color: '#dc2626' }}>
                    Tienes <strong>{pagosPendientes(showPagoModal)} pagos vencidos</strong> de este gasto
                  </p>
                </div>
              )}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Monto pagado</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-medium">$</span>
                  <input type="number" value={pagoForm.monto_pagado} min={0} step={0.01}
                    onChange={e => setPagoForm(f => ({ ...f, monto_pagado: Number(e.target.value) }))}
                    className="w-full pl-7 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
                </div>
                <p className="text-xs text-gray-400 mt-1">Monto programado: ${showPagoModal.monto.toLocaleString('es-MX')}</p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Fecha de pago</label>
                <input type="date" value={pagoForm.fecha_pago}
                  onChange={e => setPagoForm(f => ({ ...f, fecha_pago: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Notas (opcional)</label>
                <input type="text" value={pagoForm.notas} placeholder="Referencia bancaria, comprobante..."
                  onChange={e => setPagoForm(f => ({ ...f, notas: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
              </div>
              {/* Payment history */}
              {gastosPagos.filter(p => p.gasto_id === showPagoModal.id).length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-600 mb-2">Historial de pagos</p>
                  <div className="space-y-1.5 max-h-32 overflow-y-auto">
                    {gastosPagos.filter(p => p.gasto_id === showPagoModal.id).slice(0, 6).map(p => (
                      <div key={p.id} className="flex justify-between items-center text-xs py-1.5 px-2.5 rounded-lg" style={{ background: '#f9fafb' }}>
                        <span className="text-gray-500">{p.fecha_pago}</span>
                        <span className="font-mono font-semibold text-gray-800">${Number(p.monto_pagado).toLocaleString('es-MX')}</span>
                        {p.notas && <span className="text-gray-400 truncate max-w-24">{p.notas}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="flex gap-3 p-5 border-t border-gray-100">
              <button onClick={() => setShowPagoModal(null)} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50">
                Cancelar
              </button>
              <button onClick={handleRegistrarPago} disabled={savingPago}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-50"
                style={{ backgroundColor: '#1B3A6B' }}>
                {savingPago ? 'Guardando...' : 'Confirmar pago'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showGastoModal && (
        <GastoModal
          gasto={editingGasto ? { ...editingGasto } : null}
          onClose={() => { setShowGastoModal(false); setEditingGasto(null); }}
          onSave={handleSaveGasto}
        />
      )}
      {showDepModal && (
        <DepModal
          dep={editingDep ? { ...editingDep } : null}
          onClose={() => { setShowDepModal(false); setEditingDep(null); }}
          onSave={handleSaveDep}
        />
      )}

      {/* Gasto Extraordinario / Único modal */}
      {showGastoUnicoModal && (
        <GastoModal
          gasto={{ ...EMPTY_GASTO, frecuencia: 'unico', dia_pago: 0, proximo_pago: new Date().toISOString().split('T')[0] }}
          onClose={() => setShowGastoUnicoModal(false)}
          onSave={async (data) => {
            await handleSaveGasto(data);
            setShowGastoUnicoModal(false);
          }}
          isUnico
        />
      )}
    </div>
  );
}