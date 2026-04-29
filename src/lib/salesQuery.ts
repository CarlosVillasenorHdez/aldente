/**
 * salesQuery.ts — Fuente única de verdad para cálculo de ventas
 *
 * DEFINICIÓN CANÓNICA DE VENTA:
 *   orders WHERE status='cerrada' AND is_comanda=false
 *   filtradas por closed_at (fecha de cobro, no de creación)
 *   + extras_sales del mismo período
 *
 * El IVA se muestra separado en el P&L contable.
 * Nunca se descuenta del total operativo para comparaciones.
 *
 * TODOS los módulos deben usar estas funciones para garantizar
 * que el mismo período muestre el mismo número en cualquier pantalla.
 */

import { SupabaseClient } from '@supabase/supabase-js';

export interface SalesResult {
  totalVentas: number;        // restaurante + extras (lo que entró en caja)
  ventasRestaurante: number;  // solo órdenes del restaurante
  ventasExtras: number;       // solo tienda de extras
  totalOrdenes: number;       // número de órdenes cerradas
  totalCogs: number;          // costo real de ingredientes
  totalIva: number;           // IVA capturado (para P&L contable)
  totalDescuentos: number;    // descuentos otorgados
  ticketPromedio: number;     // ventas restaurante / órdenes
}

/**
 * Obtiene las ventas de un período usando la definición canónica.
 * @param supabase  Cliente de Supabase
 * @param tenantId  UUID del tenant
 * @param start     Fecha inicio ISO (YYYY-MM-DD o YYYY-MM-DDTHH:mm:ss)
 * @param end       Fecha fin ISO
 * @param branchId  UUID de sucursal (null = todas)
 */
export async function getSalesForPeriod(
  supabase: SupabaseClient,
  tenantId: string,
  start: string,
  end: string,
  branchId?: string | null,
): Promise<SalesResult> {
  if (!tenantId) return emptySales();

  // Normalizar fechas — siempre incluir todo el día final
  const startISO = start.length === 10 ? `${start}T00:00:00` : start;
  const endISO   = end.length === 10   ? `${end}T23:59:59`   : end;

  // Query de órdenes — SIEMPRE por closed_at, SIEMPRE filtrar comanda
  let ordersQuery = supabase
    .from('orders')
    .select('total, subtotal, cost_actual, iva, discount')
    .eq('tenant_id', tenantId)
    .eq('status', 'cerrada')
    .eq('is_comanda', false)
    .gte('closed_at', startISO)
    .lte('closed_at', endISO);

  if (branchId) ordersQuery = (ordersQuery as any).eq('branch_id', branchId);

  // Query de extras — por sold_at
  let extrasQuery = supabase
    .from('extras_sales')
    .select('price, qty, unit_cost')
    .eq('tenant_id', tenantId)
    .gte('sold_at', startISO)
    .lte('sold_at', endISO);

  if (branchId) extrasQuery = (extrasQuery as any).eq('branch_id', branchId);

  const [{ data: orders }, { data: extras }] = await Promise.all([
    ordersQuery,
    extrasQuery,
  ]);

  const orderList = orders ?? [];
  const extrasList = extras ?? [];

  const ventasRestaurante = orderList.reduce((s, o: any) => s + Number(o.total ?? 0), 0);
  const ventasExtras      = extrasList.reduce((s, e: any) => s + Number(e.price ?? 0) * Number(e.qty ?? 1), 0);
  const totalVentas       = ventasRestaurante + ventasExtras;
  const totalCogs         = orderList.reduce((s, o: any) => s + Number(o.cost_actual ?? 0), 0)
                          + extrasList.reduce((s, e: any) => s + Number(e.unit_cost ?? 0) * Number(e.qty ?? 1), 0);
  const totalIva          = orderList.reduce((s, o: any) => s + Number(o.iva ?? 0), 0);
  const totalDescuentos   = orderList.reduce((s, o: any) => s + Number(o.discount ?? 0), 0);
  const totalOrdenes      = orderList.length;
  const ticketPromedio    = totalOrdenes > 0 ? ventasRestaurante / totalOrdenes : 0;

  return { totalVentas, ventasRestaurante, ventasExtras, totalOrdenes, totalCogs, totalIva, totalDescuentos, ticketPromedio };
}

function emptySales(): SalesResult {
  return { totalVentas: 0, ventasRestaurante: 0, ventasExtras: 0, totalOrdenes: 0, totalCogs: 0, totalIva: 0, totalDescuentos: 0, ticketPromedio: 0 };
}

/**
 * Helper: obtiene el rango ISO de un período estándar
 */
export function getPeriodISO(period: 'hoy' | 'semana' | 'mes' | 'mes_anterior' | string): { start: string; end: string; label: string } {
  const now   = new Date();
  const today = now.toISOString().split('T')[0];

  if (period === 'hoy') {
    return { start: `${today}T00:00:00`, end: `${today}T23:59:59`, label: 'Hoy' };
  }
  if (period === 'semana') {
    const monday = new Date(now);
    monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
    return { start: `${monday.toISOString().split('T')[0]}T00:00:00`, end: `${today}T23:59:59`, label: 'Esta semana' };
  }
  if (period === 'mes') {
    const first = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    return { start: `${first}T00:00:00`, end: `${today}T23:59:59`, label: 'Este mes' };
  }
  if (period === 'mes_anterior') {
    const firstPrev = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0];
    const lastPrev  = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0];
    return { start: `${firstPrev}T00:00:00`, end: `${lastPrev}T23:59:59`, label: 'Mes anterior' };
  }
  // formato YYYY-MM-DD pasado directamente
  return { start: `${period}T00:00:00`, end: `${period}T23:59:59`, label: period };
}
