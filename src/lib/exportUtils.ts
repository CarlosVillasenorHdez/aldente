/**
 * exportUtils — utilidades de exportación a CSV y Excel-compatible
 *
 * Genera CSV con BOM UTF-8 que Excel abre correctamente (con acentos).
 * Para múltiples hojas genera un ZIP de CSVs o un HTML tabular.
 * Sin dependencias externas — funciona en cualquier entorno.
 */

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

/**
 * Descarga múltiples hojas como un archivo HTML que Excel puede abrir.
 * Cada hoja aparece como una tabla en el archivo.
 * Si solo hay una hoja, descarga directamente como CSV.
 */
export async function downloadXLSX(
  filename: string,
  sheets: { name: string; rows: Record<string, unknown>[] }[],
): Promise<void> {
  const validSheets = sheets.filter(s => s.rows.length > 0);
  if (!validSheets.length) return;

  // Una sola hoja → CSV directo (más compatible)
  if (validSheets.length === 1) {
    downloadCSV(filename.replace('.xlsx', '.csv'), validSheets[0].rows);
    return;
  }

  // Múltiples hojas → HTML con tablas que Excel puede leer
  const tablesHTML = validSheets.map(sheet => {
    const headers = Object.keys(sheet.rows[0]);
    const headerRow = headers.map(h => `<th style="background:#1B3A6B;color:#f59e0b;padding:6px 10px;font-size:11px;text-align:left;white-space:nowrap;">${escapeHTML(h)}</th>`).join('');
    const bodyRows = sheet.rows.map((row, i) =>
      `<tr style="background:${i % 2 === 0 ? '#fff' : '#f9fafb'};">${
        headers.map(h => `<td style="padding:5px 10px;font-size:11px;border-bottom:1px solid #eee;">${escapeHTML(String(row[h] ?? ''))}</td>`).join('')
      }</tr>`
    ).join('');
    return `
      <h3 style="font-family:Arial,sans-serif;font-size:13px;font-weight:700;color:#1B3A6B;margin:24px 0 8px;">${escapeHTML(sheet.name)}</h3>
      <table style="border-collapse:collapse;width:100%;font-family:Arial,sans-serif;">
        <thead><tr>${headerRow}</tr></thead>
        <tbody>${bodyRows}</tbody>
      </table>`;
  }).join('');

  const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">
<head><meta charset="UTF-8">
<style>body{font-family:Arial,sans-serif;padding:20px;}h2{color:#1B3A6B;}</style>
</head><body>
<h2 style="font-family:Arial,sans-serif;font-size:16px;color:#1B3A6B;">${escapeHTML(filename.replace('.xlsx', ''))}</h2>
<p style="font-size:10px;color:#888;">Generado por Aldente ERP · ${new Date().toLocaleString('es-MX')}</p>
${tablesHTML}
</body></html>`;

  const blob = new Blob(['\uFEFF' + html], { type: 'application/vnd.ms-excel;charset=utf-8;' });
  triggerDownload(blob, filename.replace('.xlsx', '.xls'));
}

function escapeHTML(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
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
