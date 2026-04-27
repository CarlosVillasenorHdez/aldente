'use client';

/**
 * GoLive — Preparar lanzamiento
 *
 * Antes de abrir el restaurante con datos reales, el dueño
 * debe limpiar todos los datos de prueba que generó durante
 * la configuración. Este módulo:
 *
 * 1. Diagnostica cuántos datos de prueba hay por categoría
 * 2. Muestra un checklist de configuración completada
 * 3. Ejecuta la limpieza con doble confirmación
 * 4. Marca el tenant como "en producción"
 */

import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { getCurrentTenantId as getTenantId } from '@/lib/tenantStore';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import {
  CheckCircle, AlertTriangle, Trash2, RefreshCw,
  ChevronRight, Rocket, Shield, Database, X
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

interface DataCount {
  table: string;
  label: string;
  count: number;
  willDelete: boolean; // true = se borra en go-live, false = se conserva
}

interface ConfigCheck {
  id: string;
  label: string;
  description: string;
  done: boolean;
  href?: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmt = (n: number) => n.toLocaleString('es-MX');

// ── Main Component ────────────────────────────────────────────────────────────

export default function GoLive() {
  const supabase = createClient();
  const { appUser } = useAuth();

  const [loading, setLoading]         = useState(true);
  const [cleaning, setCleaning]       = useState(false);
  const [counts, setCounts]           = useState<DataCount[]>([]);
  const [checks, setChecks]           = useState<ConfigCheck[]>([]);
  const [isLive, setIsLive]           = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [step, setStep]               = useState<'diagnose' | 'confirm' | 'done'>('diagnose');

  // ── Diagnóstico ─────────────────────────────────────────────────────────────

  const diagnose = useCallback(async () => {
    setLoading(true);
    const tid = getTenantId();

    // Tablas operativas (se limpian)
    const operativeTables: { table: string; label: string }[] = [
      { table: 'orders',              label: 'Órdenes de prueba' },
      { table: 'order_items',         label: 'Items de órdenes' },
      { table: 'extras_sales',        label: 'Ventas de extras' },
      { table: 'loyalty_customers',   label: 'Socios de lealtad' },
      { table: 'loyalty_transactions',label: 'Transacciones de lealtad' },
      { table: 'reservations',        label: 'Reservaciones' },
      { table: 'stock_movements',     label: 'Movimientos de inventario' },
      { table: 'employee_attendance', label: 'Asistencia de empleados' },
      { table: 'rh_vacaciones',       label: 'Registros de vacaciones' },
      { table: 'rh_permisos',         label: 'Registros de permisos' },
      { table: 'rh_incapacidades',    label: 'Registros de incapacidades' },
      { table: 'rh_tiempos_extras',   label: 'Tiempos extras' },
      { table: 'cortes_caja',         label: 'Cortes de caja' },
    ];

    const results = await Promise.all(
      operativeTables.map(async ({ table, label }) => {
        try {
          const { count } = await supabase
            .from(table)
            .select('id', { count: 'exact', head: true })
            .eq('tenant_id', tid);
          return { table, label, count: count ?? 0, willDelete: true };
        } catch {
          return { table, label, count: 0, willDelete: true };
        }
      })
    );

    setCounts(results);

    // Checks de configuración
    const [
      { data: dishes },
      { data: employees },
      { data: tables },
      { data: config },
      { data: branches },
    ] = await Promise.all([
      supabase.from('dishes').select('id', { count: 'exact', head: true }).eq('tenant_id', tid).eq('available', true),
      supabase.from('employees').select('id', { count: 'exact', head: true }).eq('tenant_id', tid).eq('status', 'activo'),
      supabase.from('restaurant_tables').select('id', { count: 'exact', head: true }).eq('tenant_id', tid).gt('number', 0),
      supabase.from('system_config').select('config_key, config_value').eq('tenant_id', tid)
        .in('config_key', ['restaurant_name', 'business_hours', 'nomina_modelo']),
      supabase.from('branches').select('id', { count: 'exact', head: true }).eq('tenant_id', tid).eq('is_active', true),
    ]);

    const configMap: Record<string, string> = {};
    (config ?? []).forEach((r: any) => { configMap[r.config_key] = r.config_value; });

    const hasName    = !!(configMap['restaurant_name']?.trim());
    const hasHours   = !!(configMap['business_hours']);
    const hasNomina  = !!(configMap['nomina_modelo']);
    const hasDishes  = (dishes as any)?.length > 0 || false;
    const hasEmp     = (employees as any)?.length > 0 || false;
    const hasTables  = (tables as any)?.length > 0 || false;
    const hasBranch  = (branches as any)?.length > 0 || false;

    setChecks([
      { id: 'name',    label: 'Nombre del restaurante configurado',   description: 'Configuración → Restaurante', done: hasName,   href: '/configuracion' },
      { id: 'branch',  label: 'Sucursal principal creada',             description: 'Sucursales → Gestión',       done: hasBranch, href: '/sucursales' },
      { id: 'dishes',  label: 'Al menos un platillo en el menú',       description: 'Menú → Platillos',           done: hasDishes, href: '/menu' },
      { id: 'tables',  label: 'Mesas configuradas',                    description: 'Configuración → Layout Mesas', done: hasTables, href: '/configuracion' },
      { id: 'hours',   label: 'Horarios de apertura definidos',        description: 'Configuración → Horarios',   done: hasHours,  href: '/configuracion' },
      { id: 'emp',     label: 'Al menos un empleado registrado',       description: 'Personal → Empleados',       done: hasEmp,    href: '/personal' },
      { id: 'nomina',  label: 'Modelo de nómina configurado',          description: 'Configuración → Costos MO',  done: hasNomina, href: '/configuracion' },
    ]);

    // Ver si ya está en producción
    const { data: liveFlag } = await supabase.from('system_config')
      .select('config_value').eq('tenant_id', tid).eq('config_key', 'is_live').single();
    setIsLive(liveFlag?.config_value === 'true');

    setLoading(false);
  }, [supabase]);

  useEffect(() => { diagnose(); }, [diagnose]);

  // ── Limpieza ─────────────────────────────────────────────────────────────────

  const executeCleanup = async () => {
    if (confirmText !== 'LIMPIAR') {
      toast.error('Escribe LIMPIAR para confirmar');
      return;
    }

    setCleaning(true);
    const tid = getTenantId();
    let errors = 0;

    const tables = counts.filter(c => c.willDelete && c.count > 0).map(c => c.table);

    for (const table of tables) {
      try {
        const { error } = await supabase.from(table).delete().eq('tenant_id', tid);
        if (error) {
          console.error(`Error limpiando ${table}:`, error.message);
          errors++;
        }
      } catch (e) {
        errors++;
      }
    }

    // Marcar como producción
    await supabase.from('system_config').upsert(
      [{ tenant_id: tid, config_key: 'is_live', config_value: 'true' }],
      { onConflict: 'tenant_id,config_key' }
    );

    // Registrar en audit_log
    await supabase.from('audit_log').insert({
      tenant_id:   tid,
      user_id:     appUser?.id ?? null,
      user_name:   appUser?.fullName ?? 'Admin',
      action:      'go_live_cleanup',
      entity:      'system',
      entity_name: 'go-live',
      details:     `Limpieza de datos de prueba ejecutada. Tablas: ${tables.join(', ')}. Errores: ${errors}`,
    });

    setCleaning(false);
    setShowConfirm(false);
    setConfirmText('');
    setStep('done');
    setIsLive(true);
    toast.success('✅ Sistema listo para producción');
  };

  // ── Render ────────────────────────────────────────────────────────────────

  const totalTestData = counts.reduce((s, c) => s + c.count, 0);
  const checksOk      = checks.filter(c => c.done).length;
  const allChecksOk   = checksOk === checks.length;

  if (loading) {
    return (
      <div className="max-w-2xl space-y-4 animate-pulse">
        {[1,2,3].map(i => <div key={i} className="h-24 bg-gray-100 rounded-2xl" />)}
      </div>
    );
  }

  if (step === 'done' || isLive) {
    return (
      <div className="max-w-2xl">
        <div className="flex flex-col items-center text-center py-16 gap-4">
          <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center">
            <Rocket size={36} className="text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">¡Restaurante en producción!</h2>
          <p className="text-gray-500 max-w-md">
            Los datos de prueba fueron eliminados. A partir de ahora, todas las ventas, órdenes
            y reportes serán datos reales de tu negocio.
          </p>
          <div className="flex gap-4 mt-4">
            <a href="/pos-punto-de-venta"
              className="px-6 py-3 rounded-xl text-sm font-bold text-white"
              style={{ backgroundColor: '#1B3A6B' }}>
              Ir al POS →
            </a>
            <button onClick={() => { setIsLive(false); setStep('diagnose'); diagnose(); }}
              className="px-6 py-3 rounded-xl text-sm font-semibold text-gray-600 border border-gray-200 hover:bg-gray-50">
              Ver diagnóstico de nuevo
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6">

      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <Rocket size={22} className="text-amber-500" />
          Preparar lanzamiento
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          Antes de abrir tu restaurante con clientes reales, verifica que todo esté configurado
          y limpia los datos de prueba. Este proceso es irreversible.
        </p>
      </div>

      {/* Checklist de configuración */}
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-gray-900">Lista de verificación</h3>
            <p className="text-xs text-gray-500 mt-0.5">{checksOk} de {checks.length} completados</p>
          </div>
          <div className={`px-3 py-1 rounded-full text-xs font-bold ${allChecksOk ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
            {allChecksOk ? '✓ Listo' : `${checks.length - checksOk} pendientes`}
          </div>
        </div>
        <div className="divide-y divide-gray-50">
          {checks.map(check => (
            <div key={check.id} className={`flex items-center gap-4 px-5 py-3.5 ${check.done ? '' : 'bg-amber-50/50'}`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${check.done ? 'bg-green-100' : 'bg-amber-100'}`}>
                {check.done
                  ? <CheckCircle size={14} className="text-green-600" />
                  : <AlertTriangle size={13} className="text-amber-600" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${check.done ? 'text-gray-700' : 'text-gray-900'}`}>
                  {check.label}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">{check.description}</p>
              </div>
              {!check.done && check.href && (
                <a href={check.href}
                  className="flex items-center gap-1 text-xs font-semibold text-amber-600 hover:text-amber-700 flex-shrink-0">
                  Configurar <ChevronRight size={12} />
                </a>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Datos de prueba a limpiar */}
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-gray-900">Datos de prueba detectados</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              {totalTestData === 0
                ? 'No hay datos de prueba — el sistema está limpio'
                : `${fmt(totalTestData)} registros serán eliminados permanentemente`}
            </p>
          </div>
          <button onClick={diagnose} className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100">
            <RefreshCw size={14} />
          </button>
        </div>

        <div className="divide-y divide-gray-50">
          {counts.map(item => (
            <div key={item.table} className={`flex items-center justify-between px-5 py-3 ${item.count > 0 ? 'bg-red-50/40' : ''}`}>
              <div className="flex items-center gap-3">
                <Database size={14} className={item.count > 0 ? 'text-red-400' : 'text-gray-300'} />
                <span className="text-sm text-gray-700">{item.label}</span>
              </div>
              <span className={`text-sm font-mono font-semibold ${item.count > 0 ? 'text-red-600' : 'text-gray-300'}`}>
                {item.count > 0 ? `${fmt(item.count)} registros` : 'Sin datos'}
              </span>
            </div>
          ))}
        </div>

        <div className="px-5 py-3 bg-gray-50 border-t border-gray-100">
          <p className="text-xs text-gray-500">
            <strong>Se conserva:</strong> menú, ingredientes, empleados, mesas, proveedores,
            configuración, gastos recurrentes y depreciaciones.
          </p>
        </div>
      </div>

      {/* Botón de acción */}
      {!showConfirm ? (
        <button
          onClick={() => setShowConfirm(true)}
          disabled={!allChecksOk && totalTestData > 0}
          className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl text-base font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ backgroundColor: '#1B3A6B', color: '#f59e0b' }}
        >
          <Rocket size={20} />
          {totalTestData === 0
            ? 'Activar modo producción'
            : `Limpiar ${fmt(totalTestData)} registros y activar producción`}
        </button>
      ) : (
        /* Confirmación de doble paso */
        <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-6 space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
              <Trash2 size={18} className="text-red-600" />
            </div>
            <div>
              <h3 className="text-base font-bold text-red-800">Esta acción es irreversible</h3>
              <p className="text-sm text-red-600 mt-1">
                Se eliminarán permanentemente <strong>{fmt(totalTestData)} registros</strong> de prueba.
                Esta acción quedará registrada en la auditoría del sistema.
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-semibold text-red-700">
              Escribe <code className="bg-red-100 px-1.5 py-0.5 rounded font-mono">LIMPIAR</code> para confirmar:
            </label>
            <input
              autoFocus
              value={confirmText}
              onChange={e => setConfirmText(e.target.value.toUpperCase())}
              onKeyDown={e => { if (e.key === 'Enter' && confirmText === 'LIMPIAR') executeCleanup(); }}
              className="w-full border-2 border-red-300 rounded-xl px-4 py-3 text-sm font-mono focus:outline-none focus:border-red-500 bg-white"
              placeholder="Escribe LIMPIAR aquí..."
            />
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => { setShowConfirm(false); setConfirmText(''); }}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-gray-600 bg-white border border-gray-200 hover:bg-gray-50">
              <X size={15} /> Cancelar
            </button>
            <button
              onClick={executeCleanup}
              disabled={cleaning || confirmText !== 'LIMPIAR'}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-white disabled:opacity-40"
              style={{ backgroundColor: '#dc2626' }}>
              {cleaning
                ? <><RefreshCw size={15} className="animate-spin" /> Limpiando...</>
                : <><Trash2 size={15} /> Sí, limpiar y activar producción</>}
            </button>
          </div>
        </div>
      )}

      {/* Aviso de seguridad */}
      <div className="flex gap-3 p-4 bg-blue-50 border border-blue-200 rounded-xl">
        <Shield size={15} className="text-blue-500 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-blue-700">
          La limpieza queda registrada en <strong>Auditoría</strong> con la fecha, hora y usuario que la ejecutó.
          Los datos de configuración (menú, empleados, mesas) <strong>no se tocan</strong>.
        </p>
      </div>
    </div>
  );
}
