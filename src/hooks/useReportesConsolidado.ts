'use client';
/**
 * useReportesConsolidado — lógica de datos para el reporte multisucursal.
 * Extrae de ReportesConsolidado.tsx todos los fetches y cálculos.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { getCurrentTenantId as getTenantId } from '@/lib/tenantStore';
import { getDateRangeISO, calcMonthlyPayroll, calcMonthlyGastos } from '@/lib/reportUtils';

export type DateRange = 'hoy' | 'semana' | 'mes' | 'personalizado';

export interface Branch { id: string; name: string }

export interface BranchMetrics {
  branchId: string; branchName: string;
  ventas: number; ordenes: number; ticket: number;
  topDish: string; topDishCount: number;
  hourlyData: { hora: string; ventas: number; ordenes: number }[];
  dailyData: { dia: string; ventas: number }[];
  dishData: { nombre: string; cantidad: number }[];
}

export interface GlobalPL {
  totalVentas: number; totalCogs: number; utilidadBruta: number;
  nominaMensual: number; gastosOp: { concepto: string; monto: number }[];
  depreciacion: number; gastosFinancieros: number; totalGastosOp: number;
  ebitda: number; ebit: number; uai: number; isr: number; utilidadNeta: number;
  margenBruto: number; margenNeto: number;
}

export interface BranchPL {
  branchId: string; branchName: string; color: string;
  ventas: number; cogs: number; utilidadBruta: number; margenBruto: number;
  nomina: number; gastosOp: number; ebitda: number;
  utilidadNeta: number; margenNeto: number;
}

const BRANCH_COLORS = ['#f59e0b','#3b82f6','#10b981','#8b5cf6','#ef4444','#06b6d4','#f97316','#84cc16','#ec4899','#6366f1'];
export const getBranchColor = (idx: number) => BRANCH_COLORS[idx % BRANCH_COLORS.length];

const FREQ: Record<string, number> = {
  diario: 1/30, semanal: 1/4.33, quincenal: 0.5,
  mensual: 1, bimestral: 2, trimestral: 3, semestral: 6, anual: 12,
};

export function useReportesConsolidado() {
  const supabase = createClient();

  // Filtros
  const [dateRange, setDateRange]       = useState<DateRange>('semana');
  const [customStart, setCustomStart]   = useState('');
  const [customEnd, setCustomEnd]       = useState('');
  const [selectedBranches, setSelectedBranches] = useState<string[]>([]);

  // Datos
  const [branches, setBranches]         = useState<Branch[]>([]);
  const [metricsMap, setMetricsMap]     = useState<Record<string, BranchMetrics>>({});
  const [loading, setLoading]           = useState(true);
  const [globalPL, setGlobalPL]         = useState<GlobalPL | null>(null);
  const [branchPLs, setBranchPLs]       = useState<BranchPL[]>([]);
  const [plLoading, setPlLoading]       = useState(true);

  // Cargar sucursales al montar
  useEffect(() => {
    supabase.from('branches').select('id, name')
      .eq('tenant_id', getTenantId()).eq('is_active', true).order('name')
      .then(({ data }) => setBranches((data ?? []).map((b: any) => ({ id: b.id, name: b.name }))));
  }, []);

  // Métricas por sucursal
  const fetchMetrics = useCallback(async () => {
    if (branches.length === 0) return;
    setLoading(true);
    const { start, end } = getDateRangeISO(dateRange, customStart, customEnd);
    const branchesToLoad = selectedBranches.length > 0
      ? branches.filter(b => selectedBranches.includes(b.id))
      : branches;

    const newMap: Record<string, BranchMetrics> = {};
    await Promise.all(branchesToLoad.map(async (branch) => {
      const { data: orders } = await supabase.from('orders')
        .select('id, total, created_at, closed_at, mesero')
        .eq('tenant_id', getTenantId()).eq('status', 'cerrada')
        .eq('branch_id', branch.id)
        .gte('created_at', start).lte('created_at', end).limit(2000);

      const orderList = orders ?? [];
      const orderIds = orderList.map((o: any) => o.id);
      const ventas = orderList.reduce((s, o: any) => s + Number(o.total), 0);
      const ordenes = orderList.length;

      // Hourly
      const hourBuckets: Record<string, { ventas: number; ordenes: number }> = {};
      for (let h = 8; h <= 23; h++) {
        hourBuckets[`${String(h).padStart(2,'0')}:00`] = { ventas: 0, ordenes: 0 };
      }
      orderList.forEach((o: any) => {
        const h = new Date(o.created_at).getHours();
        if (h >= 8 && h <= 23) {
          const label = `${String(h).padStart(2,'0')}:00`;
          hourBuckets[label].ventas  += Number(o.total);
          hourBuckets[label].ordenes += 1;
        }
      });
      const hourlyData = Object.entries(hourBuckets).map(([hora, v]) => ({
        hora, ventas: Math.round(v.ventas), ordenes: v.ordenes,
      }));

      // Daily
      const dayBuckets: Record<string, number> = {};
      orderList.forEach((o: any) => {
        const day = o.created_at.substring(0, 10);
        dayBuckets[day] = (dayBuckets[day] || 0) + Number(o.total);
      });
      const dailyData = Object.entries(dayBuckets)
        .sort(([a],[b]) => a.localeCompare(b))
        .map(([dia, ventas]) => ({
          dia: new Date(dia + 'T12:00:00').toLocaleDateString('es-MX', { day: 'numeric', month: 'short' }),
          ventas: Math.round(ventas),
        }));

      // Top dishes
      let topDish = '—', topDishCount = 0;
      let dishData: { nombre: string; cantidad: number }[] = [];
      if (orderIds.length > 0) {
        const { data: items } = await supabase.from('order_items')
          .select('name, qty').eq('tenant_id', getTenantId())
          .in('order_id', orderIds).limit(3000);
        if (items) {
          const dishMap: Record<string, number> = {};
          items.forEach((i: any) => { dishMap[i.name] = (dishMap[i.name] || 0) + Number(i.qty); });
          const sorted = Object.entries(dishMap).sort(([,a],[,b]) => b - a);
          if (sorted.length > 0) { topDish = sorted[0][0]; topDishCount = sorted[0][1]; }
          dishData = sorted.slice(0, 8).map(([nombre, cantidad]) => ({ nombre, cantidad }));
        }
      }

      newMap[branch.id] = {
        branchId: branch.id, branchName: branch.name,
        ventas: Math.round(ventas), ordenes, ticket: Math.round((ventas / Math.max(ordenes, 1)) * 100) / 100,
        topDish, topDishCount, hourlyData, dailyData, dishData,
      };
    }));

    setMetricsMap(newMap);
    setLoading(false);
  }, [branches, selectedBranches, dateRange, customStart, customEnd]);

  useEffect(() => { fetchMetrics(); }, [fetchMetrics]);

  // P&L global + por sucursal
  const fetchPL = useCallback(async () => {
    setPlLoading(true);
    const { start, end } = getDateRangeISO(dateRange, customStart, customEnd);

    const [
      { data: allOrders }, { data: allEmployees }, { data: allGastos },
      { data: allDeps }, { data: allRecipes }, { data: allItems }, { data: allExtras },
    ] = await Promise.all([
      supabase.from('orders').select('id, total, branch_id').eq('tenant_id', getTenantId()).eq('status', 'cerrada').gte('created_at', start).lte('created_at', end).limit(5000),
      supabase.from('employees').select('salary, salary_frequency, status, branch_id').eq('tenant_id', getTenantId()).eq('status', 'activo'),
      supabase.from('gastos_recurrentes').select('monto, frecuencia, categoria, branch_id, activo').eq('tenant_id', getTenantId()).eq('activo', true),
      supabase.from('depreciaciones').select('valor_original, valor_residual, vida_util_anios, activo, branch_id').eq('tenant_id', getTenantId()).eq('activo', true),
      supabase.from('dish_recipes').select('dish_id, quantity, ingredients(cost), dishes(price)').eq('tenant_id', getTenantId()),
      supabase.from('order_items').select('dish_id, qty, order_id').eq('tenant_id', getTenantId()).limit(8000),
      supabase.from('extras_sales').select('price,qty,unit_cost,branch_id').eq('tenant_id', getTenantId()).gte('sold_at', start).lte('sold_at', end),
    ]);

    const orders = allOrders ?? [];
    const extras = allExtras ?? [];
    const extrasVentas = extras.reduce((s, e: any) => s + Number(e.price) * Number(e.qty ?? 1), 0);
    const extrasCogs   = extras.reduce((s, e: any) => s + Number(e.unit_cost ?? 0) * Number(e.qty ?? 1), 0);
    const totalVentas  = orders.reduce((s, o: any) => s + Number(o.total), 0) + extrasVentas;

    // COGS via recetas
    const orderIds = new Set(orders.map((o: any) => o.id));
    const soldMap: Record<string, number> = {};
    (allItems ?? []).filter((i: any) => orderIds.has(i.order_id)).forEach((i: any) => {
      if (i.dish_id) soldMap[i.dish_id] = (soldMap[i.dish_id] || 0) + Number(i.qty);
    });
    const dishCost: Record<string, number> = {};
    (allRecipes ?? []).forEach((r: any) => {
      dishCost[r.dish_id] = (dishCost[r.dish_id] || 0) + Number(r.ingredients?.cost || 0) * Number(r.quantity || 0);
    });
    const totalCogs = Object.entries(soldMap).reduce((s, [did, qty]) => s + (dishCost[did] || 0) * qty, 0);

    // Payroll y gastos
    const nominaMensual = calcMonthlyPayroll(allEmployees ?? []);
    const gastosMap: Record<string, number> = {};
    (allGastos ?? []).forEach((g: any) => {
      const m = Number(g.monto) / (FREQ[g.frecuencia] ?? 1);
      gastosMap[g.categoria || 'otro'] = (gastosMap[g.categoria || 'otro'] || 0) + m;
    });
    const gastosOpItems = Object.entries(gastosMap)
      .filter(([cat]) => cat !== 'financiero')
      .map(([concepto, monto]) => ({ concepto, monto: Math.round(monto) }));
    const gastosFinancieros = gastosMap['financiero'] || 0;
    const depreciacion = (allDeps ?? []).reduce((s, d: any) => {
      return s + (Number(d.valor_original) - Number(d.valor_residual)) / (Number(d.vida_util_anios) || 1) / 12;
    }, 0);
    const totalGastosOp = nominaMensual + gastosOpItems.reduce((s, g) => s + g.monto, 0);
    const utilidadBruta = totalVentas - totalCogs - extrasCogs;
    const ebitda = utilidadBruta - totalGastosOp;
    const ebit = ebitda - depreciacion;
    const uai = ebit - gastosFinancieros;
    const isr = Math.round(Math.max(uai, 0) * 0.30);

    setGlobalPL({
      totalVentas: Math.round(totalVentas), totalCogs: Math.round(totalCogs),
      utilidadBruta: Math.round(utilidadBruta), nominaMensual: Math.round(nominaMensual),
      gastosOp: gastosOpItems, depreciacion: Math.round(depreciacion),
      gastosFinancieros: Math.round(gastosFinancieros), totalGastosOp: Math.round(totalGastosOp),
      ebitda: Math.round(ebitda), ebit: Math.round(ebit), uai: Math.round(uai),
      isr, utilidadNeta: Math.round(uai - isr),
      margenBruto: totalVentas > 0 ? Math.round((utilidadBruta / totalVentas) * 1000) / 10 : 0,
      margenNeto:  totalVentas > 0 ? Math.round(((uai - isr) / totalVentas) * 1000) / 10 : 0,
    });

    // P&L por sucursal
    const branchList = branches.filter(b => selectedBranches.length === 0 || selectedBranches.includes(b.id));
    setBranchPLs(branchList.map((branch, idx) => {
      const bOrders = orders.filter((o: any) => o.branch_id === branch.id);
      const bVentas = bOrders.reduce((s, o: any) => s + Number(o.total), 0);
      const bOrderIds = new Set(bOrders.map((o: any) => o.id));
      const bSold: Record<string, number> = {};
      (allItems ?? []).filter((i: any) => bOrderIds.has(i.order_id)).forEach((i: any) => {
        if (i.dish_id) bSold[i.dish_id] = (bSold[i.dish_id] || 0) + Number(i.qty);
      });
      const bCogs = Object.entries(bSold).reduce((s, [did, qty]) => s + (dishCost[did] || 0) * qty, 0);
      const n = Math.max(branchList.length, 1);
      const bNomina = (allEmployees ?? [])
        .filter((e: any) => !e.branch_id || e.branch_id === branch.id)
        .reduce((s, e: any) => s + Number(e.salary || 0) * (e.salary_frequency === 'quincenal' ? 2 : e.salary_frequency === 'semanal' ? 4.33 : 1), 0) / n;
      const bGastos = (allGastos ?? [])
        .filter((g: any) => !g.branch_id || g.branch_id === branch.id)
        .reduce((s, g: any) => s + Number(g.monto) / (FREQ[g.frecuencia] ?? 1), 0) / n;
      const bUtilidadBruta = bVentas - bCogs;
      const bEbitda = bUtilidadBruta - bNomina - bGastos;
      const bUtilNeta = bEbitda - (depreciacion / n);
      return {
        branchId: branch.id, branchName: branch.name, color: getBranchColor(idx),
        ventas: Math.round(bVentas), cogs: Math.round(bCogs),
        utilidadBruta: Math.round(bUtilidadBruta),
        margenBruto: bVentas > 0 ? Math.round((bUtilidadBruta / bVentas) * 1000) / 10 : 0,
        nomina: Math.round(bNomina), gastosOp: Math.round(bGastos),
        ebitda: Math.round(bEbitda), utilidadNeta: Math.round(bUtilNeta),
        margenNeto: bVentas > 0 ? Math.round((bUtilNeta / bVentas) * 1000) / 10 : 0,
      };
    }));
    setPlLoading(false);
  }, [branches, selectedBranches, dateRange, customStart, customEnd]);

  useEffect(() => { if (branches.length > 0) fetchPL(); }, [fetchPL]);

  // Derivados
  const activeBranches = useMemo(() => {
    const ids = selectedBranches.length > 0 ? selectedBranches : branches.map(b => b.id);
    return branches.filter(b => ids.includes(b.id));
  }, [branches, selectedBranches]);

  return {
    // Filtros
    dateRange, setDateRange, customStart, setCustomStart, customEnd, setCustomEnd,
    selectedBranches, setSelectedBranches,
    // Datos
    branches, metricsMap, loading,
    globalPL, branchPLs, plLoading,
    // Derivados
    activeBranches,
    // Refetch manual
    fetchMetrics, fetchPL,
  };
}
