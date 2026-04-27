/**
 * exportUtils — utilidades de exportación a CSV y XLSX
 *
 * Usa SheetJS (xlsx) para generar archivos .xlsx nativos con múltiples hojas.
 * CSV con BOM UTF-8 para compatibilidad con Excel en español.
 */

import * as XLSX from 'xlsx';

// ── CSV ───────────────────────────────────────────────────────────────────────

function escapeCSV(val: unknown): string {
  if (val === null || val === undefined) return '';
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function downloadCSV(filename: string, rows: Record<string, unknown>[]): void {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const csvLines = [
    headers.map(escapeCSV).join(','),
    ...rows.map(row => headers.map(h => escapeCSV(row[h])).join(',')),
  ];
  const bom = '\uFEFF';
  const blob = new Blob([bom + csvLines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  triggerDownload(blob, filename);
}

// ── XLSX ──────────────────────────────────────────────────────────────────────

export async function downloadXLSX(
  filename: string,
  sheets: { name: string; rows: Record<string, unknown>[] }[],
): Promise<void> {
  const validSheets = sheets.filter(s => s.rows.length > 0);
  if (!validSheets.length) return;

  // Una sola hoja sin nombre específico → CSV es más simple
  if (validSheets.length === 1 && !filename.endsWith('.xlsx')) {
    downloadCSV(filename.replace('.xlsx', '.csv'), validSheets[0].rows);
    return;
  }

  const wb = XLSX.utils.book_new();

  validSheets.forEach(({ name, rows }) => {
    const ws = XLSX.utils.json_to_sheet(rows);

    // Autowidth de columnas
    const colWidths = Object.keys(rows[0]).map(key => ({
      wch: Math.max(
        key.length + 2,
        ...rows.map(r => String(r[key] ?? '').length),
      ),
    }));
    ws['!cols'] = colWidths;

    // Estilo de encabezado (solo SheetJS Pro soporta estilos completos,
    // pero el autowidth y la estructura sí funcionan en la versión libre)
    XLSX.utils.book_append_sheet(wb, ws, name.slice(0, 31));
  });

  XLSX.writeFile(wb, filename);
}

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ── Formateadores para reportes ───────────────────────────────────────────────

export function fmtDateMX(iso: string | null | undefined): string {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString('es-MX', {
      day: '2-digit', month: '2-digit', year: 'numeric',
    });
  } catch { return iso; }
}

export function fmtDateTimeMX(iso: string | null | undefined): string {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleString('es-MX', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch { return iso; }
}

export function fmtPeso(n: number | null | undefined): string {
  return `$${(Number(n) || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// ── Builders de reportes específicos ─────────────────────────────────────────

/** Convierte órdenes a filas para Excel */
export function ordenesToRows(orders: Record<string, unknown>[]) {
  return orders.map(o => ({
    'ID Orden':       o.id,
    'Fecha':          fmtDateTimeMX(o.closed_at as string || o.opened_at as string),
    'Mesa / Cliente': o.mesa,
    'Mesero':         o.mesero,
    'Tipo':           o.order_type === 'para_llevar' ? 'Para llevar' : 'Mesa',
    'Subtotal':       Number(o.subtotal || 0).toFixed(2),
    'IVA':            Number(o.iva || 0).toFixed(2),
    'Descuento':      Number(o.discount || 0).toFixed(2),
    'Total':          Number(o.total || 0).toFixed(2),
    'Propina':        Number((o as any).tip_amount || 0).toFixed(2),
    'Método pago':    o.pay_method,
    'Costo COGS':     Number(o.cost_actual || 0).toFixed(2),
    'Margen':         Number(o.margin_actual || 0).toFixed(2),
    'Sucursal':       (o as any).branch || '',
  }));
}

/** Convierte empleados a filas con carga patronal calculada */
export function empleadosToRows(
  employees: Record<string, unknown>[],
  flags = { incluyeIMSS: true, incluyeINFONAVIT: true, incluyePrestaciones: true },
) {
  return employees.map(e => {
    const sal = Number(e.salary || 0);
    const freq = String(e.salary_frequency || 'mensual');
    const salMes = freq === 'quincenal' ? sal * 2 : freq === 'semanal' ? sal * 4.33 : sal;
    const imss = flags.incluyeIMSS ? Math.round(salMes * 0.2545) : 0;
    const infon = flags.incluyeINFONAVIT ? Math.round(salMes * 0.05) : 0;
    const prest = flags.incluyePrestaciones ? Math.round(salMes * 0.045) : 0;
    return {
      'Nombre':            e.name,
      'Puesto':            e.role,
      'Departamento':      (e as any).departamento || '',
      'Tipo contrato':     (e as any).tipo_contrato || 'planta',
      'Fecha ingreso':     fmtDateMX((e as any).hire_date),
      'RFC':               (e as any).rfc || '',
      'NSS':               (e as any).nss || '',
      'Salario neto':      salMes.toFixed(2),
      'Frecuencia':        freq,
      'IMSS patronal':     imss.toFixed(2),
      'INFONAVIT':         infon.toFixed(2),
      'Prestaciones':      prest.toFixed(2),
      'Costo total/mes':   (salMes + imss + infon + prest).toFixed(2),
      'Teléfono':          e.phone || '',
      'Banco':             (e as any).banco || '',
      'CLABE':             (e as any).clabe || '',
    };
  });
}

/** Resumen de P&L para exportar */
export function plToRows(data: {
  label: string; value: number; indent?: number; tipo?: string;
}[]) {
  return data.map(row => ({
    'Concepto': (row.indent ? '  '.repeat(row.indent) : '') + row.label,
    'Monto MXN': row.value.toFixed(2),
    'Tipo': row.tipo || 'item',
  }));
}
