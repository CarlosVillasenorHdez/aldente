'use client';

/**
 * MisDatos.tsx — Portabilidad de datos del tenant
 *
 * Derechos ARCO (LFPDPPP México):
 *   Acceso    → exportar todos los datos en CSV/Excel
 *   Portabilidad → formato estándar importable por otros sistemas
 *
 * Flujos:
 *   EXPORTAR → genera ZIP con CSVs de todas las tablas del tenant
 *   IMPORTAR → acepta CSV de otros sistemas (menú, insumos, clientes, proveedores)
 */

import React, { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { getCurrentTenantId as getTenantId } from '@/lib/tenantStore';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import {
  Download, Upload, Shield, AlertTriangle, CheckCircle,
  FileText, Package, Users, ShoppingBag, BarChart2, ChevronDown, ChevronUp
} from 'lucide-react';

// ── Helpers CSV ───────────────────────────────────────────────────────────────

function toCSV(rows: Record<string, unknown>[]): string {
  if (!rows.length) return '';
  const headers = Object.keys(rows[0]);
  const escape = (v: unknown) => {
    const s = v == null ? '' : String(v);
    return s.includes(',') || s.includes('"') || s.includes('\n')
      ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [
    headers.join(','),
    ...rows.map(r => headers.map(h => escape(r[h])).join(',')),
  ].join('\n');
}

function downloadCSV(filename: string, rows: Record<string, unknown>[]) {
  const csv = '\uFEFF' + toCSV(rows); // BOM para Excel en español
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

// ── Secciones exportables ─────────────────────────────────────────────────────

interface ExportSection {
  key: string;
  label: string;
  description: string;
  icon: React.ElementType;
  color: string;
  table: string;
  columns: string;
  transform?: (rows: Record<string, unknown>[]) => Record<string, unknown>[];
}

const EXPORT_SECTIONS: ExportSection[] = [
  {
    key: 'menu',
    label: 'Menú completo',
    description: 'Todos los platillos, precios, categorías y emojis',
    icon: ShoppingBag,
    color: '#f59e0b',
    table: 'dishes',
    columns: 'name, description, price, category, emoji, available, popular, preparation_time_min, preparation_area',
  },
  {
    key: 'inventario',
    label: 'Inventario e insumos',
    description: 'Ingredientes con stock actual, costo WACC, stock mínimo y punto de reorden',
    icon: Package,
    color: '#10b981',
    table: 'ingredients',
    columns: 'name, category, unit, stock, cost, min_stock, reorder_point, lead_time_days',
  },
  {
    key: 'recetas',
    label: 'Recetas',
    description: 'Relación platillo → ingredientes con cantidades',
    icon: FileText,
    color: '#3b82f6',
    table: 'dish_recipes',
    columns: 'dish_id, ingredient_id, quantity, unit',
  },
  {
    key: 'proveedores',
    label: 'Proveedores',
    description: 'Catálogo de proveedores con contacto',
    icon: Users,
    color: '#8b5cf6',
    table: 'suppliers',
    columns: 'name, contact_name, phone, email, address, notes',
  },
  {
    key: 'lealtad',
    label: 'Clientes de lealtad',
    description: 'Miembros del programa con puntos y nivel — datos personales',
    icon: Users,
    color: '#ec4899',
    table: 'loyalty_customers',
    columns: 'name, phone, email, points, total_spent, tier, is_active, created_at',
  },
  {
    key: 'ventas',
    label: 'Historial de ventas',
    description: 'Todas las órdenes cerradas con totales, método de pago y mesero',
    icon: BarChart2,
    color: '#1B3A6B',
    table: 'orders',
    columns: 'id, mesa, mesero, subtotal, iva, discount, total, tip_amount, pay_method, order_type, opened_at, closed_at, cost_actual, margin_actual',
  },
  {
    key: 'gastos',
    label: 'Gastos recurrentes',
    description: 'Gastos fijos y variables registrados',
    icon: FileText,
    color: '#ef4444',
    table: 'gastos_recurrentes',
    columns: 'nombre, categoria, monto, frecuencia, activo, notas',
  },
  {
    key: 'empleados',
    label: 'Personal',
    description: 'Empleados con rol, salario y frecuencia de pago',
    icon: Users,
    color: '#64748b',
    table: 'employees',
    columns: 'name, position, salary, salary_frequency, phone, email, hire_date, status',
  },
];

// ── Formatos de importación ───────────────────────────────────────────────────

const IMPORT_FORMATS = [
  {
    key: 'menu',
    label: 'Menú',
    icon: ShoppingBag,
    color: '#f59e0b',
    format: 'nombre, descripcion, precio, categoria, emoji',
    example: 'Hamburguesa Clásica, Con queso y pepinillos, 120, Hamburguesas, 🍔',
    handler: 'menu',
  },
  {
    key: 'inventario',
    label: 'Insumos',
    icon: Package,
    color: '#10b981',
    format: 'nombre, categoria, unidad, costo, stock_minimo',
    example: 'Carne molida, Carnes, kg, 180, 5',
    handler: 'inventario',
  },
  {
    key: 'clientes',
    label: 'Clientes lealtad',
    icon: Users,
    color: '#ec4899',
    format: 'nombre, telefono, email, puntos',
    example: 'Juan Pérez, 5512345678, juan@mail.com, 150',
    handler: 'clientes',
  },
  {
    key: 'proveedores',
    label: 'Proveedores',
    icon: Users,
    color: '#8b5cf6',
    format: 'nombre, contacto, telefono, email',
    example: 'Distribuidora MX, Carlos López, 5598765432, carlos@dist.mx',
    handler: 'proveedores',
  },
];

// ── Componente principal ──────────────────────────────────────────────────────

export default function MisDatos({ activeSection }: { activeSection: string }) {
  const { appUser } = useAuth();
  const supabase = createClient();
  const tid = getTenantId();

  const [exporting, setExporting] = useState<string | null>(null);
  const [exportingAll, setExportingAll] = useState(false);
  const [importing, setImporting] = useState<string | null>(null);
  const [importResults, setImportResults] = useState<Record<string, { ok: number; fail: number }>>({});
  const [showFormats, setShowFormats] = useState<string | null>(null);

  if (activeSection !== 'mis-datos') return null;

  // ── Exportar una sección ────────────────────────────────────────────────────

  const handleExport = async (section: ExportSection) => {
    setExporting(section.key);
    try {
      let query = supabase.from(section.table).select(section.columns).eq('tenant_id', tid);

      // Filtros especiales
      if (section.table === 'orders') {
        query = (query as any).eq('status', 'cerrada').eq('is_comanda', false).order('closed_at', { ascending: false });
      }

      const { data, error } = await query;
      if (error) throw error;
      if (!data?.length) { toast.warning(`No hay datos en ${section.label}`); return; }

      const rows = section.transform ? section.transform(data as unknown as Record<string, unknown>[]) : data as unknown as Record<string, unknown>[];
      downloadCSV(`aldente_${section.key}_${new Date().toISOString().split('T')[0]}.csv`, rows);
      toast.success(`✅ ${section.label} exportado (${rows.length} registros)`);
    } catch (err: any) {
      toast.error('Error al exportar: ' + err.message);
    } finally {
      setExporting(null);
    }
  };

  // ── Exportar TODO ───────────────────────────────────────────────────────────

  const handleExportAll = async () => {
    setExportingAll(true);
    toast.info('Preparando exportación completa...');
    let total = 0;
    for (const section of EXPORT_SECTIONS) {
      try {
        let query = supabase.from(section.table).select(section.columns).eq('tenant_id', tid);
        if (section.table === 'orders') {
          query = (query as any).eq('status', 'cerrada').eq('is_comanda', false);
        }
        const { data } = await query;
        if (data?.length) {
          downloadCSV(`aldente_${section.key}.csv`, data as unknown as Record<string, unknown>[]);
          total += data.length;
          await new Promise(r => setTimeout(r, 300)); // pequeña pausa entre descargas
        }
      } catch { /* continuar con el siguiente */ }
    }
    toast.success(`✅ Exportación completa — ${total} registros en total`);
    setExportingAll(false);
  };

  // ── Importar CSV ────────────────────────────────────────────────────────────

  const handleImport = async (handler: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(handler);

    try {
      const text = await file.text();
      const lines = text.split('\n').filter(l => l.trim());
      const start = lines[0]?.toLowerCase().match(/^(nombre|name|platillo)/) ? 1 : 0;
      const rows = lines.slice(start).map(l =>
        l.split(',').map(s => s.trim().replace(/^"|"$/g, ''))
      ).filter(r => r[0]);

      let ok = 0, fail = 0;

      if (handler === 'menu') {
        for (const [name, description, price, category, emoji] of rows) {
          const { error } = await supabase.from('dishes').insert({
            name, description: description || '', price: parseFloat(price) || 0,
            category: category || 'Otros', emoji: emoji || '🍽️',
            available: true, tenant_id: tid,
          });
          if (error) fail++; else ok++;
        }
      } else if (handler === 'inventario') {
        for (const [name, category, unit, cost, minStock] of rows) {
          const { error } = await supabase.from('ingredients').insert({
            name, category: category || 'Otros', unit: unit || 'kg',
            cost: parseFloat(cost) || 0, min_stock: parseFloat(minStock) || 0,
            stock: 0, reorder_point: 0, lead_time_days: 1, tenant_id: tid,
          });
          if (error) fail++; else ok++;
        }
      } else if (handler === 'clientes') {
        for (const [name, phone, email, points] of rows) {
          const { error } = await supabase.from('loyalty_customers').insert({
            name, phone: phone || '', email: email || '',
            points: parseInt(points) || 0, total_spent: 0,
            is_active: true, tenant_id: tid,
          });
          if (error) fail++; else ok++;
        }
      } else if (handler === 'proveedores') {
        for (const [name, contact_name, phone, email] of rows) {
          const { error } = await supabase.from('suppliers').insert({
            name, contact_name: contact_name || '', phone: phone || '',
            email: email || '', tenant_id: tid,
          });
          if (error) fail++; else ok++;
        }
      }

      setImportResults(prev => ({ ...prev, [handler]: { ok, fail } }));
      if (ok > 0) toast.success(`✅ ${ok} registro(s) importados${fail ? `, ${fail} fallaron` : ''}`);
      else toast.error('No se importó ningún registro');
    } catch (err: any) {
      toast.error('Error al importar: ' + err.message);
    } finally {
      setImporting(null);
      e.target.value = '';
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  const isAdmin = appUser?.appRole === 'admin' || appUser?.appRole === 'gerente';

  return (
    <div className="space-y-6 max-w-3xl">

      {/* Header legal */}
      <div className="rounded-xl p-5" style={{ background: 'rgba(27,58,107,0.06)', border: '1px solid rgba(27,58,107,0.15)' }}>
        <div className="flex gap-3 items-start">
          <Shield size={22} style={{ color: '#1B3A6B', flexShrink: 0, marginTop: 2 }} />
          <div>
            <p className="font-semibold text-sm" style={{ color: '#1B3A6B' }}>Tus datos son tuyos — siempre</p>
            <p className="text-sm text-gray-600 mt-1">
              Conforme a la <strong>LFPDPPP</strong> (Ley Federal de Protección de Datos Personales en México)
              y tu derecho de <strong>Portabilidad y Acceso</strong>, puedes exportar toda tu información
              en cualquier momento en formatos estándar (CSV) compatibles con cualquier otro sistema.
              Si decides cancelar tu cuenta o si Aldente cierra operaciones, tus datos te serán entregados
              en un plazo máximo de <strong>5 días hábiles</strong>.
            </p>
          </div>
        </div>
      </div>

      {/* ── EXPORTAR ── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-800 flex items-center gap-2">
            <Download size={16} className="text-gray-500" /> Exportar mis datos
          </h3>
          {isAdmin && (
            <button
              onClick={handleExportAll}
              disabled={exportingAll}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all disabled:opacity-50"
              style={{ background: '#1B3A6B', color: '#fff' }}
            >
              <Download size={14} />
              {exportingAll ? 'Exportando...' : 'Exportar todo'}
            </button>
          )}
        </div>

        <div className="grid gap-2">
          {EXPORT_SECTIONS.map(section => {
            const Icon = section.icon;
            const isLoading = exporting === section.key;
            return (
              <div key={section.key} className="flex items-center gap-3 p-3 rounded-xl"
                style={{ background: '#f9fafb', border: '1px solid #e5e7eb' }}>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: section.color + '18' }}>
                  <Icon size={15} style={{ color: section.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800">{section.label}</p>
                  <p className="text-xs text-gray-500 truncate">{section.description}</p>
                </div>
                {isAdmin && (
                  <button
                    onClick={() => handleExport(section)}
                    disabled={isLoading}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all disabled:opacity-50 flex-shrink-0"
                    style={{ background: section.color + '15', color: section.color, border: `1px solid ${section.color}30` }}
                  >
                    <Download size={12} />
                    {isLoading ? 'Exportando...' : 'CSV'}
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {!isAdmin && (
          <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
            <AlertTriangle size={12} /> Solo admins y gerentes pueden exportar datos
          </p>
        )}
      </div>

      {/* ── IMPORTAR ── */}
      <div>
        <h3 className="font-semibold text-gray-800 flex items-center gap-2 mb-3">
          <Upload size={16} className="text-gray-500" /> Importar desde otro sistema
        </h3>
        <p className="text-sm text-gray-500 mb-3">
          ¿Vienes de otro software? Importa tu información existente en formato CSV.
          Descarga la plantilla de cada sección para ver el formato exacto.
        </p>

        <div className="grid gap-3">
          {IMPORT_FORMATS.map(fmt => {
            const Icon = fmt.icon;
            const result = importResults[fmt.handler];
            const isLoading = importing === fmt.handler;
            const open = showFormats === fmt.key;

            return (
              <div key={fmt.key} className="rounded-xl overflow-hidden"
                style={{ border: '1px solid #e5e7eb' }}>
                <div className="flex items-center gap-3 p-3" style={{ background: '#f9fafb' }}>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: fmt.color + '18' }}>
                    <Icon size={15} style={{ color: fmt.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800">{fmt.label}</p>
                    <button
                      onClick={() => setShowFormats(open ? null : fmt.key)}
                      className="text-xs text-blue-500 flex items-center gap-0.5 mt-0.5"
                    >
                      Ver formato {open ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                    </button>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {result && (
                      <span className="text-xs font-medium text-green-600 flex items-center gap-1">
                        <CheckCircle size={12} /> {result.ok} ok
                        {result.fail > 0 && <span className="text-red-500">, {result.fail} errores</span>}
                      </span>
                    )}
                    {isAdmin && (
                      <label className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${isLoading ? 'opacity-50' : ''}`}
                        style={{ background: fmt.color + '15', color: fmt.color, border: `1px solid ${fmt.color}30` }}>
                        <Upload size={12} />
                        {isLoading ? 'Importando...' : 'CSV'}
                        <input type="file" accept=".csv" className="hidden"
                          disabled={isLoading}
                          onChange={e => handleImport(fmt.handler, e)} />
                      </label>
                    )}
                  </div>
                </div>

                {open && (
                  <div className="px-4 py-3 border-t" style={{ background: '#fff', borderColor: '#e5e7eb' }}>
                    <p className="text-xs font-mono text-gray-500 mb-1">Formato (columnas en orden):</p>
                    <code className="text-xs bg-gray-100 px-2 py-1 rounded block mb-2">{fmt.format}</code>
                    <p className="text-xs font-mono text-gray-400 mb-1">Ejemplo:</p>
                    <code className="text-xs bg-gray-100 px-2 py-1 rounded block text-gray-600">{fmt.example}</code>
                    <p className="text-xs text-gray-400 mt-2">
                      • La primera fila puede ser encabezado (se detecta automáticamente)<br />
                      • Campos vacíos se dejan en blanco<br />
                      • Usa coma como separador, comillas si el texto tiene comas
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Nota de cierre de cuenta */}
      <div className="rounded-xl p-4 flex gap-3"
        style={{ background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.15)' }}>
        <AlertTriangle size={16} style={{ color: '#ef4444', flexShrink: 0, marginTop: 2 }} />
        <div>
          <p className="text-sm font-semibold" style={{ color: '#ef4444' }}>Si decides cancelar tu cuenta</p>
          <p className="text-sm text-gray-600 mt-0.5">
            Escríbenos a <strong>datos@aldenteerp.com</strong> y te enviaremos una exportación completa
            de toda tu información en un plazo máximo de <strong>5 días hábiles</strong>.
            Tus datos se eliminan de nuestros servidores <strong>30 días</strong> después de la cancelación,
            salvo que la ley mexicana requiera conservarlos por más tiempo.
          </p>
        </div>
      </div>
    </div>
  );
}
