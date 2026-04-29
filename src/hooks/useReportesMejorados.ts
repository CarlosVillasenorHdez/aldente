'use client';
/**
 * useReportesMejorados — lógica de datos para el reporte de operaciones.
 * Extrae de ReportesMejorados.tsx todos los fetches y cálculos,
 * dejando el componente solo con JSX.
 */

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { getCurrentTenantId as getTenantId } from '@/lib/tenantStore';
import { useBranch } from '@/hooks/useBranch';
import { toast } from 'sonner';
import { getPeriodRange, calcMonthlyPayroll, calcMonthlyGastos } from '@/lib/reportUtils';

export type Period = 'dia' | 'semana' | 'mes';

export interface KPIs {
  totalVentas: number;
  ventasRestaurante: number;
  ventasExtras: number;
  totalOrdenes: number;
  ticketPromedio: number;
  totalClientes: number;
  utilidadBruta: number;
  mermaTotal: number;
  margenPct: number;
}

export interface SalesTrend {
  label: string;
  ventas: number;
  ordenes: number;
  meta?: number;
}

export interface WaiterStats {
  mesero: string;
  ordenes: number;
  total: number;
  ticketPromedio: number;
}

export interface ProductStats {
  nombre: string;
  cantidad: number;
  ingresos: number;
}

export interface LowStockItem {
  nombre: string;
  stock: number;
  minStock: number;
  unit: string;
}

const emptyKpis: KPIs = {
  totalVentas: 0, ventasRestaurante: 0, ventasExtras: 0,
  totalOrdenes: 0, ticketPromedio: 0, totalClientes: 0,
  utilidadBruta: 0, mermaTotal: 0, margenPct: 0,
};

export function useReportesMejorados() {
  const supabase = createClient();
  const { activeBranchId } = useBranch();

  const [period, setPeriod] = useState<Period>('semana');
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState<KPIs>(emptyKpis);
  const [breakeven, setBreakeven] = useState(0);
  const [salesTrend, setSalesTrend] = useState<SalesTrend[]>([]);
  const [waiterStats, setWaiterStats] = useState<WaiterStats[]>([]);
  const [topProducts, setTopProducts] = useState<ProductStats[]>([]);
  const [bottomProducts, setBottomProducts] = useState<ProductStats[]>([]);
  const [lowStock, setLowStock] = useState<LowStockItem[]>([]);

  const loadData = useCallback(async (p: Period) => {
    setLoading(true);
    try {
      const { start, end } = getPeriodRange(p);

      // Órdenes cerradas
      let q = supabase
        .from('orders')
        .select('id, mesero, total, subtotal, closed_at, cost_actual, margin_actual, waste_cost')
        .eq('tenant_id', getTenantId())
        .eq('status', 'cerrada')
        .eq('is_comanda', false)
        .gte('closed_at', start)
        .lte('closed_at', end);
      if (activeBranchId) q = (q as any).eq('branch_id', activeBranchId);

      const [{ data: orders, error }, { data: extrasRows }] = await Promise.all([
        q,
        supabase.from('extras_sales')
          .select('price,qty,unit_cost')
          .eq('tenant_id', getTenantId())
          .gte('sold_at', start)
          .lte('sold_at', end),
      ]);
      if (error) throw error;

      const orderList = orders ?? [];
      const extrasList = extrasRows ?? [];

      // KPIs
      const extrasVentas = extrasList.reduce((s, e: any) => s + Number(e.price) * Number(e.qty ?? 1), 0);
      const extrasCogs   = extrasList.reduce((s, e: any) => s + Number(e.unit_cost ?? 0) * Number(e.qty ?? 1), 0);
      const totalVentas  = orderList.reduce((s, o: any) => s + Number(o.total), 0) + extrasVentas;
      const totalOrdenes = orderList.length;
      const utilidadBruta = orderList.reduce((s, o: any) => s + Number(o.margin_actual ?? 0), 0) + (extrasVentas - extrasCogs);

      const { data: mermaRows } = await supabase
        .from('orders').select('waste_cost')
        .eq('tenant_id', getTenantId())
        .eq('status', 'cancelada')
        .eq('cancel_type', 'con_costo')
        .gte('updated_at', start)
        .lte('updated_at', end + 'T23:59:59');
      const mermaTotal = (mermaRows ?? []).reduce((s, o: any) => s + Number(o.waste_cost ?? 0), 0);
      const margenPct  = totalVentas > 0 ? (utilidadBruta / totalVentas) * 100 : 0;

      setKpis({
        totalVentas, ventasRestaurante: orderList.reduce((s, o: any) => s + Number(o.total), 0),
        ventasExtras: extrasVentas, totalOrdenes,
        ticketPromedio: totalOrdenes > 0 ? totalVentas / totalOrdenes : 0,
        totalClientes: totalOrdenes, utilidadBruta, mermaTotal, margenPct,
      });

      // Tendencia de ventas
      const trendMap: Record<string, { ventas: number; ordenes: number }> = {};
      orderList.forEach((o: any) => {
        const date = new Date(o.closed_at ?? o.created_at);
        const key = p === 'dia'
          ? `${String(date.getHours()).padStart(2, '0')}:00`
          : p === 'semana'
            ? ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'][date.getDay()]
            : `${date.getDate()}/${date.getMonth() + 1}`;
        if (!trendMap[key]) trendMap[key] = { ventas: 0, ordenes: 0 };
        trendMap[key].ventas  += Number(o.total);
        trendMap[key].ordenes += 1;
      });

      // Breakeven
      const [{ data: empData }, { data: gastosData }] = await Promise.all([
        supabase.from('employees').select('salary,salary_frequency').eq('tenant_id', getTenantId()).eq('status', 'activo'),
        supabase.from('gastos_recurrentes').select('monto,frecuencia').eq('tenant_id', getTenantId()).eq('activo', true),
      ]);
      const monthlyPayroll = calcMonthlyPayroll(empData ?? []);
      const monthlyGastos  = calcMonthlyGastos(gastosData ?? []);
      const days = p === 'dia' ? 1 : p === 'semana' ? 7 : 30;
      const periodFactor = days / 30;
      const totalFixed = Math.round((monthlyPayroll + monthlyGastos) * periodFactor);
      const avgCogsRatio = totalVentas > 0
        ? orderList.reduce((s, o: any) => s + Number(o.cost_actual ?? 0), 0) / totalVentas
        : 0.20;
      const breakevenVal = totalFixed > 0
        ? Math.round(totalFixed / Math.max(0.1, 1 - avgCogsRatio))
        : 0;
      setBreakeven(breakevenVal);
      const trendKeys = Object.keys(trendMap).length;
      setSalesTrend(Object.entries(trendMap).map(([label, v]) => ({
        label, ...v,
        meta: breakevenVal > 0 && trendKeys > 0 ? Math.round(breakevenVal / trendKeys) : 0,
      })));

      // Rendimiento por mesero
      const waiterMap: Record<string, { ordenes: number; total: number }> = {};
      orderList.forEach((o: any) => {
        const w = o.mesero || 'Sin asignar';
        if (!waiterMap[w]) waiterMap[w] = { ordenes: 0, total: 0 };
        waiterMap[w].ordenes += 1;
        waiterMap[w].total   += Number(o.total);
      });
      setWaiterStats(Object.entries(waiterMap)
        .map(([mesero, v]) => ({ mesero, ...v, ticketPromedio: v.ordenes > 0 ? v.total / v.ordenes : 0 }))
        .sort((a, b) => b.total - a.total));

      // Productos más/menos vendidos
      const orderIds = orderList.map((o: any) => o.id);
      if (orderIds.length > 0) {
        const { data: items } = await supabase
          .from('order_items').select('name, qty, price')
          .eq('tenant_id', getTenantId())
          .in('order_id', orderIds.slice(0, 100));
        const productMap: Record<string, { cantidad: number; ingresos: number }> = {};
        (items ?? []).forEach((item: any) => {
          if (!productMap[item.name]) productMap[item.name] = { cantidad: 0, ingresos: 0 };
          productMap[item.name].cantidad += item.qty;
          productMap[item.name].ingresos += item.qty * Number(item.price);
        });
        const sorted = Object.entries(productMap)
          .map(([nombre, v]) => ({ nombre, ...v }))
          .sort((a, b) => b.cantidad - a.cantidad);
        setTopProducts(sorted.slice(0, 8));
        setBottomProducts(sorted.slice(-5).reverse());
      } else {
        setTopProducts([]); setBottomProducts([]);
      }

      // Stock bajo
      const { data: ingredients } = await supabase
        .from('ingredients').select('name, stock, min_stock, unit')
        .eq('tenant_id', getTenantId()).order('stock');
      setLowStock((ingredients ?? [])
        .filter((i: any) => Number(i.stock) <= Number(i.min_stock))
        .map((i: any) => ({ nombre: i.name, stock: Number(i.stock), minStock: Number(i.min_stock), unit: i.unit })));

    } catch (err: any) {
      toast.error('Error al cargar reportes: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [supabase, activeBranchId]);

  useEffect(() => { loadData(period); }, [period, loadData]);

  return {
    period, setPeriod,
    loading, kpis, breakeven,
    salesTrend, waiterStats,
    topProducts, bottomProducts, lowStock,
  };
}
