'use client';
/**
 * usePresupuesto — datos de presupuesto vs real para un período
 *
 * Carga el presupuesto del período y las ventas/costos reales,
 * calcula las desviaciones y el % de cumplimiento.
 */

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { getCurrentTenantId as getTenantId } from '@/lib/tenantStore';
import { useBranch } from '@/hooks/useBranch';

export interface Presupuesto {
  id: string;
  nombre: string;
  periodoInicio: string;
  periodoFin: string;
  periodoTipo: string;
  metaVentas: number;
  metaTicketPromedio: number;
  metaOrdenes: number;
  metaCogsPct: number;
  metaNomina: number;
  metaGastosOp: number;
  metaMargenPct: number;
  notas: string;
}

export interface RealData {
  ventas: number;
  ordenes: number;
  ticketPromedio: number;
  cogs: number;
  cogsPct: number;
  margenPct: number;
  nominaPagada: number;
  gastosOp: number;
}

export interface Desviacion {
  ventasDelta: number;       // real - meta
  ventasPct: number;         // % cumplimiento
  ordenesDelta: number;
  ordenesPct: number;
  ticketDelta: number;
  cogsPctDelta: number;      // cogsPct real - cogsPct meta (negativo = mejor)
  margenPctDelta: number;    // margenPct real - margenPct meta (positivo = mejor)
  nominaDelta: number;
  gastosOpDelta: number;
}

export function calcDesviacion(presupuesto: Presupuesto, real: RealData): Desviacion {
  return {
    ventasDelta:    real.ventas - presupuesto.metaVentas,
    ventasPct:      presupuesto.metaVentas > 0 ? (real.ventas / presupuesto.metaVentas) * 100 : 0,
    ordenesDelta:   real.ordenes - presupuesto.metaOrdenes,
    ordenesPct:     presupuesto.metaOrdenes > 0 ? (real.ordenes / presupuesto.metaOrdenes) * 100 : 0,
    ticketDelta:    real.ticketPromedio - presupuesto.metaTicketPromedio,
    cogsPctDelta:   real.cogsPct - presupuesto.metaCogsPct,
    margenPctDelta: real.margenPct - presupuesto.metaMargenPct,
    nominaDelta:    real.nominaPagada - presupuesto.metaNomina,
    gastosOpDelta:  real.gastosOp - presupuesto.metaGastosOp,
  };
}

export function usePresupuesto(periodoInicio: string, periodoFin: string) {
  const supabase = createClient();
  const { activeBranchId } = useBranch();

  const [presupuesto, setPresupuesto] = useState<Presupuesto | null>(null);
  const [real, setReal] = useState<RealData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const tid = getTenantId();

    // 1. Cargar presupuesto del período
    let qp = supabase.from('presupuestos').select('*')
      .eq('tenant_id', tid)
      .eq('periodo_inicio', periodoInicio)
      .eq('activo', true)
      .limit(1);
    if (activeBranchId) qp = (qp as any).eq('branch_id', activeBranchId);
    const { data: presData } = await qp.maybeSingle();

    if (presData) {
      setPresupuesto({
        id: presData.id,
        nombre: presData.nombre ?? '',
        periodoInicio: presData.periodo_inicio,
        periodoFin: presData.periodo_fin,
        periodoTipo: presData.periodo_tipo ?? 'mes',
        metaVentas: Number(presData.meta_ventas ?? 0),
        metaTicketPromedio: Number(presData.meta_ticket_promedio ?? 0),
        metaOrdenes: Number(presData.meta_ordenes ?? 0),
        metaCogsPct: Number(presData.meta_cogs_pct ?? 0),
        metaNomina: Number(presData.meta_nomina ?? 0),
        metaGastosOp: Number(presData.meta_gastos_op ?? 0),
        metaMargenPct: Number(presData.meta_margen_pct ?? 0),
        notas: presData.notas ?? '',
      });
    } else {
      setPresupuesto(null);
    }

    // 2. Cargar datos reales del período
    const start = periodoInicio + 'T00:00:00';
    const end   = periodoFin   + 'T23:59:59';

    let qo = supabase.from('orders')
      .select('total, cost_actual, margin_actual')
      .eq('tenant_id', tid)
      .eq('status', 'cerrada').eq('is_comanda', false)
      .gte('closed_at', start).lte('closed_at', end);
    if (activeBranchId) qo = (qo as any).eq('branch_id', activeBranchId);

    let qg = supabase.from('gastos_recurrentes')
      .select('monto, frecuencia')
      .eq('tenant_id', tid).eq('activo', true);
    if (activeBranchId) qg = (qg as any).eq('branch_id', activeBranchId);

    let qn = supabase.from('pagos_nomina')
      .select('monto_pagado')
      .eq('tenant_id', tid).in('status', ['pagado', 'parcial'])
      .gte('periodo_inicio', periodoInicio).lte('periodo_fin', periodoFin);
    if (activeBranchId) qn = (qn as any).eq('branch_id', activeBranchId);

    let qe = supabase.from('extras_sales')
      .select('price, qty')
      .eq('tenant_id', tid)
      .gte('sold_at', start).lte('sold_at', end);
    if (activeBranchId) qe = (qe as any).eq('branch_id', activeBranchId);

    const [{ data: orders }, { data: gastos }, { data: nominaPagos }, { data: extrasData }] = await Promise.all([qo, qg, qn, qe]);

    const orderList = orders ?? [];
    const extrasVentas = (extrasData ?? []).reduce((s: number, e: any) => s + Number(e.price ?? 0) * Number(e.qty ?? 1), 0);
    const ventas  = orderList.reduce((s, o) => s + Number(o.total ?? 0), 0) + extrasVentas;
    const cogs    = orderList.reduce((s, o) => s + Number(o.cost_actual ?? 0), 0);
    const ordenes = orderList.length;

    // Gastos operativos del período (prorratear a días del período)
    const diasPeriodo = Math.ceil((new Date(periodoFin).getTime() - new Date(periodoInicio).getTime()) / 86400000) + 1;
    const freqFactor: Record<string, number> = {
      diario: 1, semanal: 7, quincenal: 15, mensual: 30,
      bimestral: 60, trimestral: 90, semestral: 180, anual: 365,
    };
    const gastosOpTotal = (gastos ?? []).reduce((s, g) => {
      const diasCiclo = freqFactor[g.frecuencia ?? 'mensual'] ?? 30;
      return s + Number(g.monto ?? 0) * (diasPeriodo / diasCiclo);
    }, 0);

    const nominaPagada = (nominaPagos ?? []).reduce((s, p) => s + Number(p.monto_pagado ?? 0), 0);

    setReal({
      ventas: Math.round(ventas * 100) / 100,
      ordenes,
      ticketPromedio: ordenes > 0 ? Math.round((ventas / ordenes) * 100) / 100 : 0,
      cogs: Math.round(cogs * 100) / 100,
      cogsPct: ventas > 0 ? Math.round((cogs / ventas) * 1000) / 10 : 0,
      margenPct: ventas > 0 ? Math.round(((ventas - cogs) / ventas) * 1000) / 10 : 0,
      nominaPagada: Math.round(nominaPagada * 100) / 100,
      gastosOp: Math.round(gastosOpTotal * 100) / 100,
    });

    setLoading(false);
  }, [supabase, activeBranchId, periodoInicio, periodoFin]);

  useEffect(() => { load(); }, [load]);

  return { presupuesto, real, loading, reload: load };
}

export function useListaPresupuestos() {
  const supabase = createClient();
  const { activeBranchId } = useBranch();
  const [lista, setLista] = useState<Presupuesto[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    let q = supabase.from('presupuestos').select('*')
      .eq('tenant_id', getTenantId())
      .eq('activo', true)
      .order('periodo_inicio', { ascending: false })
      .limit(24);
    if (activeBranchId) q = (q as any).eq('branch_id', activeBranchId);
    const { data } = await q;
    setLista((data ?? []).map((p: any) => ({
      id: p.id, nombre: p.nombre ?? '',
      periodoInicio: p.periodo_inicio, periodoFin: p.periodo_fin,
      periodoTipo: p.periodo_tipo ?? 'mes',
      metaVentas: Number(p.meta_ventas ?? 0),
      metaTicketPromedio: Number(p.meta_ticket_promedio ?? 0),
      metaOrdenes: Number(p.meta_ordenes ?? 0),
      metaCogsPct: Number(p.meta_cogs_pct ?? 0),
      metaNomina: Number(p.meta_nomina ?? 0),
      metaGastosOp: Number(p.meta_gastos_op ?? 0),
      metaMargenPct: Number(p.meta_margen_pct ?? 0),
      notas: p.notas ?? '',
    })));
    setLoading(false);
  }, [supabase, activeBranchId]);

  useEffect(() => { load(); }, [load]);
  return { lista, loading, reload: load };
}
