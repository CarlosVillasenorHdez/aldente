/**
 * reciboNomina.ts — Genera un recibo de nómina simplificado en HTML
 *
 * No es un CFDI timbrado por el SAT.
 * Es un comprobante interno para firma del empleado — válido para
 * el control interno del restaurante y para el empleado como referencia.
 *
 * Para generar un CFDI de nómina timbrado, se requiere un PAC
 * (Proveedor Autorizado de Certificación) como Facturama, Edicom o SW SapienS.
 */

export interface DatosRecibo {
  // Empleado
  nombreEmpleado:  string;
  puesto:          string;
  rfc:             string;
  nss:             string;
  tipoContrato:    string;
  fechaIngreso:    string;
  departamento:    string;
  // Restaurante
  nombreRestaurante: string;
  rfcRestaurante:    string;
  // Período
  fechaInicio:     string;  // YYYY-MM-DD
  fechaFin:        string;  // YYYY-MM-DD
  frecuencia:      string;  // mensual | quincenal | semanal
  // Importes
  salarioDiario:   number;
  diasLaborados:   number;
  salarioBruto:    number;
  // Percepciones adicionales
  horasExtra:      number;
  importeHorasExtra: number;
  bonos:           number;
  valesDespensa:   number;
  // Deducciones
  imssObrero:      number;  // cuota del trabajador (no del patrón)
  isrRetenido:     number;
  faltas:          number;
  importeFaltas:   number;
  otros:           number;
  // Neto
  totalPercepciones: number;
  totalDeducciones:  number;
  netoAPagar:      number;
  // Firma
  banco:           string;
  clabe:           string;
  metodoPago:      string; // transferencia | efectivo | cheque
  fechaPago:       string;
}

/** Formatea un número como moneda mexicana */
function $$(n: number): string {
  return n.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** Formatea una fecha ISO a formato legible */
function fmtFecha(iso: string): string {
  if (!iso) return '—';
  try {
    return new Date(iso + 'T12:00:00').toLocaleDateString('es-MX', {
      day: '2-digit', month: 'long', year: 'numeric',
    });
  } catch { return iso; }
}

/** Genera el HTML del recibo de nómina */
export function generarHTMLRecibo(d: DatosRecibo): string {
  const freqLabel = d.frecuencia === 'quincenal' ? 'Quincenal'
    : d.frecuencia === 'semanal' ? 'Semanal' : 'Mensual';

  const tipoLabel: Record<string, string> = {
    planta: 'Planta (Indefinido)', temporal: 'Temporal',
    tiempo_parcial: 'Tiempo Parcial', confianza: 'Confianza',
    honorarios: 'Honorarios', otro: 'Otro',
  };

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Recibo de Nómina — ${d.nombreEmpleado}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 11px; color: #1a1a1a; background: white; padding: 20px; }
    .page { max-width: 720px; margin: 0 auto; }
    
    /* Header */
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; padding-bottom: 16px; border-bottom: 2px solid #1B3A6B; }
    .logo-area { flex: 1; }
    .empresa { font-size: 18px; font-weight: 800; color: #1B3A6B; }
    .rfc-empresa { font-size: 10px; color: #666; margin-top: 2px; }
    .doc-info { text-align: right; }
    .doc-titulo { font-size: 14px; font-weight: 700; color: #1B3A6B; }
    .doc-nota { font-size: 9px; color: #999; margin-top: 2px; max-width: 200px; text-align: right; }
    
    /* Secciones */
    .section { margin-bottom: 16px; }
    .section-title { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #888; margin-bottom: 8px; padding-bottom: 4px; border-bottom: 1px solid #eee; }
    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
    .grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; }
    .field { }
    .field-label { font-size: 9px; color: #888; margin-bottom: 1px; }
    .field-value { font-size: 11px; font-weight: 600; color: #1a1a1a; }
    
    /* Tabla de conceptos */
    table { width: 100%; border-collapse: collapse; }
    th { background: #f4f6f9; font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #555; padding: 6px 10px; text-align: left; }
    th.right { text-align: right; }
    td { padding: 5px 10px; border-bottom: 1px solid #f0f0f0; font-size: 11px; }
    td.right { text-align: right; font-family: monospace; }
    td.positive { color: #15803d; font-weight: 600; }
    td.negative { color: #dc2626; font-weight: 600; }
    tr:last-child td { border-bottom: none; }
    
    /* Totales */
    .totales { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 16px; }
    .total-box { padding: 10px 14px; border-radius: 8px; }
    .total-box.percepciones { background: #f0fdf4; border: 1px solid #bbf7d0; }
    .total-box.deducciones  { background: #fef2f2; border: 1px solid #fecaca; }
    .total-box.neto         { background: #1B3A6B; border: 1px solid #1B3A6B; grid-column: 1 / -1; }
    .total-label { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; }
    .total-label.per { color: #15803d; }
    .total-label.ded { color: #dc2626; }
    .total-label.net { color: rgba(255,255,255,0.7); }
    .total-value { font-size: 20px; font-weight: 800; font-family: monospace; margin-top: 2px; }
    .total-value.per { color: #15803d; }
    .total-value.ded { color: #dc2626; }
    .total-value.net { color: #f59e0b; }
    
    /* Pago */
    .pago-info { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 14px; margin-top: 12px; }
    .pago-row { display: flex; justify-content: space-between; align-items: center; font-size: 10px; }
    .pago-row + .pago-row { margin-top: 4px; }
    
    /* Firmas */
    .firmas { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 40px; }
    .firma-box { text-align: center; }
    .firma-linea { border-top: 1px solid #1a1a1a; padding-top: 6px; margin-top: 36px; }
    .firma-nombre { font-size: 10px; font-weight: 700; }
    .firma-cargo { font-size: 9px; color: #666; }
    
    /* Footer */
    .footer { margin-top: 20px; padding-top: 12px; border-top: 1px solid #eee; text-align: center; font-size: 9px; color: #aaa; }
    
    @media print {
      body { padding: 10px; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
<div class="page">

  <!-- Botón imprimir (no se imprime) -->
  <div class="no-print" style="text-align:right; margin-bottom:16px;">
    <button onclick="window.print()" style="padding:8px 20px; background:#1B3A6B; color:white; border:none; border-radius:8px; font-size:13px; font-weight:700; cursor:pointer;">
      🖨️ Imprimir / Guardar PDF
    </button>
  </div>

  <!-- Header -->
  <div class="header">
    <div class="logo-area">
      <div class="empresa">${d.nombreRestaurante}</div>
      ${d.rfcRestaurante ? `<div class="rfc-empresa">RFC: ${d.rfcRestaurante}</div>` : ''}
    </div>
    <div class="doc-info">
      <div class="doc-titulo">Recibo de Nómina</div>
      <div style="font-size:11px; color:#444; margin-top:4px;">${freqLabel}</div>
      <div style="font-size:10px; color:#666; margin-top:2px;">${fmtFecha(d.fechaInicio)} — ${fmtFecha(d.fechaFin)}</div>
      <div class="doc-nota">Documento interno. No válido como CFDI timbrado por el SAT.</div>
    </div>
  </div>

  <!-- Datos del empleado -->
  <div class="section">
    <div class="section-title">Datos del empleado</div>
    <div class="grid-3">
      <div class="field">
        <div class="field-label">Nombre</div>
        <div class="field-value">${d.nombreEmpleado}</div>
      </div>
      <div class="field">
        <div class="field-label">Puesto</div>
        <div class="field-value">${d.puesto}</div>
      </div>
      <div class="field">
        <div class="field-label">Departamento</div>
        <div class="field-value">${d.departamento || '—'}</div>
      </div>
      <div class="field">
        <div class="field-label">RFC</div>
        <div class="field-value">${d.rfc || '—'}</div>
      </div>
      <div class="field">
        <div class="field-label">NSS</div>
        <div class="field-value">${d.nss || '—'}</div>
      </div>
      <div class="field">
        <div class="field-label">Tipo de contrato</div>
        <div class="field-value">${tipoLabel[d.tipoContrato] || d.tipoContrato || '—'}</div>
      </div>
      <div class="field">
        <div class="field-label">Fecha de ingreso</div>
        <div class="field-value">${fmtFecha(d.fechaIngreso)}</div>
      </div>
      <div class="field">
        <div class="field-label">Salario diario</div>
        <div class="field-value">$${$$(d.salarioDiario)}</div>
      </div>
      <div class="field">
        <div class="field-label">Días laborados</div>
        <div class="field-value">${d.diasLaborados}</div>
      </div>
    </div>
  </div>

  <!-- Percepciones -->
  <div class="section">
    <div class="section-title">Percepciones</div>
    <table>
      <thead>
        <tr><th>Concepto</th><th class="right">Importe</th></tr>
      </thead>
      <tbody>
        <tr><td>Salario base (${d.diasLaborados} días × $${$$(d.salarioDiario)})</td><td class="right positive">$${$$(d.salarioBruto)}</td></tr>
        ${d.horasExtra > 0 ? `<tr><td>Horas extras (${d.horasExtra} hrs)</td><td class="right positive">$${$$(d.importeHorasExtra)}</td></tr>` : ''}
        ${d.bonos > 0 ? `<tr><td>Bonos y comisiones</td><td class="right positive">$${$$(d.bonos)}</td></tr>` : ''}
        ${d.valesDespensa > 0 ? `<tr><td>Vales de despensa</td><td class="right positive">$${$$(d.valesDespensa)}</td></tr>` : ''}
      </tbody>
    </table>
  </div>

  <!-- Deducciones -->
  <div class="section">
    <div class="section-title">Deducciones</div>
    <table>
      <thead>
        <tr><th>Concepto</th><th class="right">Importe</th></tr>
      </thead>
      <tbody>
        ${d.imssObrero > 0 ? `<tr><td>IMSS — Cuota obrera</td><td class="right negative">-$${$$(d.imssObrero)}</td></tr>` : ''}
        ${d.isrRetenido > 0 ? `<tr><td>ISR retenido (estimado)</td><td class="right negative">-$${$$(d.isrRetenido)}</td></tr>` : ''}
        ${d.faltas > 0 ? `<tr><td>Descuento por ${d.faltas} falta${d.faltas > 1 ? 's' : ''}</td><td class="right negative">-$${$$(d.importeFaltas)}</td></tr>` : ''}
        ${d.otros > 0 ? `<tr><td>Otras deducciones</td><td class="right negative">-$${$$(d.otros)}</td></tr>` : ''}
        ${(d.imssObrero + d.isrRetenido + d.faltas + d.otros) === 0 ? '<tr><td colspan="2" style="color:#aaa; font-style:italic;">Sin deducciones este período</td></tr>' : ''}
      </tbody>
    </table>
  </div>

  <!-- Totales -->
  <div class="totales">
    <div class="total-box percepciones">
      <div class="total-label per">Total percepciones</div>
      <div class="total-value per">$${$$(d.totalPercepciones)}</div>
    </div>
    <div class="total-box deducciones">
      <div class="total-label ded">Total deducciones</div>
      <div class="total-value ded">$${$$(d.totalDeducciones)}</div>
    </div>
    <div class="total-box neto">
      <div class="total-label net">Neto a pagar</div>
      <div class="total-value net">$${$$(d.netoAPagar)}</div>
    </div>
  </div>

  <!-- Información de pago -->
  <div class="pago-info">
    <div class="pago-row">
      <span style="font-weight:700; font-size:11px;">Método de pago:</span>
      <span>${d.metodoPago === 'transferencia' ? '🏦 Transferencia bancaria'
               : d.metodoPago === 'efectivo' ? '💵 Efectivo'
               : '📋 Cheque'}</span>
    </div>
    ${d.banco ? `<div class="pago-row"><span style="color:#666;">Banco:</span><span>${d.banco}</span></div>` : ''}
    ${d.clabe ? `<div class="pago-row"><span style="color:#666;">CLABE:</span><span style="font-family:monospace;">${d.clabe}</span></div>` : ''}
    <div class="pago-row"><span style="color:#666;">Fecha de pago:</span><span>${fmtFecha(d.fechaPago)}</span></div>
  </div>

  <!-- Firmas -->
  <div class="firmas">
    <div class="firma-box">
      <div class="firma-linea">
        <div class="firma-nombre">${d.nombreEmpleado}</div>
        <div class="firma-cargo">Firma del empleado</div>
      </div>
    </div>
    <div class="firma-box">
      <div class="firma-linea">
        <div class="firma-nombre">${d.nombreRestaurante}</div>
        <div class="firma-cargo">Representante del patrón</div>
      </div>
    </div>
  </div>

  <!-- Footer -->
  <div class="footer">
    Recibo generado el ${new Date().toLocaleString('es-MX')} · Aldente ERP ·
    Este documento es de uso interno y no constituye un CFDI de nómina.
    Para efectos fiscales y del IMSS, consulta a tu contador o despacho de nómina.
  </div>

</div>
</body>
</html>`;
}

/** Abre el recibo en una nueva ventana para imprimir o guardar como PDF */
export function imprimirReciboNomina(datos: DatosRecibo): void {
  const html = generarHTMLRecibo(datos);
  const win = window.open('', '_blank', 'width=800,height=700');
  if (!win) return;
  win.document.write(html);
  win.document.close();
}
