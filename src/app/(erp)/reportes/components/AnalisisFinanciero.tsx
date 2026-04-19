'use client';
import { getCurrentTenantId as getTenantId } from '@/lib/tenantStore';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Download, RefreshCw, TrendingUp, TrendingDown, AlertTriangle, CheckCircle, Info, BarChart2 } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────
type Period = 'mes_actual' | 'mes_anterior' | 'trimestre' | 'anio';

interface PLRow { concepto: string; monto: number; tipo: 'header'|'item'|'subtotal'|'total'|'divider'; indent?: number; note?: string; }
interface BSRow { concepto: string; monto: number; tipo: 'header'|'item'|'subtotal'|'total'|'divider'; indent?: number; }

const fmt = (n: number) => n.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtPct = (n: number) => (n >= 0 ? '+' : '') + n.toFixed(1) + '%';

// ─── KPI Card ─────────────────────────────────────────────────────────────────
function KPICard({ label, value, sub, color, trend }: { label: string; value: string; sub?: string; color?: string; trend?: number }) {
  return (
    <div style={{ background:'white', borderRadius:12, padding:'16px 20px', border:'1px solid #e5e7eb', flex:1, minWidth:140 }}>
      <div style={{ fontSize:11, color:'#6b7280', fontWeight:600, textTransform:'uppercase', letterSpacing:'.06em', marginBottom:6 }}>{label}</div>
      <div style={{ fontSize:22, fontWeight:800, color: color ?? '#1f2937', fontFamily:'monospace', marginBottom:2 }}>{value}</div>
      {sub && <div style={{ fontSize:11, color:'#9ca3af' }}>{sub}</div>}
      {trend !== undefined && (
        <div style={{ fontSize:11, color: trend >= 0 ? '#16a34a' : '#dc2626', display:'flex', alignItems:'center', gap:3, marginTop:4 }}>
          {trend >= 0 ? <TrendingUp size={11}/> : <TrendingDown size={11}/>}
          {fmtPct(trend)} vs mes anterior
        </div>
      )}
    </div>
  );
}

// ─── Table row ────────────────────────────────────────────────────────────────
function PLRowComp({ row, showSign = true }: { row: PLRow; showSign?: boolean }) {
  if (row.tipo === 'divider') return <tr><td colSpan={2} style={{ height:8 }} /></tr>;
  const isNeg = row.monto < 0;
  const amtColor = row.tipo === 'total' || row.tipo === 'subtotal'
    ? (row.monto >= 0 ? '#15803d' : '#dc2626')
    : (row.tipo === 'item' && row.monto < 0 ? '#dc2626' : '#1f2937');

  return (
    <tr style={{ borderBottom: row.tipo === 'subtotal' || row.tipo === 'total' ? '2px solid #e5e7eb' : '1px solid #f3f4f6', background: row.tipo === 'header' ? '#f8fafc' : row.tipo === 'total' ? '#f0fdf4' : 'white' }}>
      <td style={{ padding: row.tipo === 'header' ? '10px 16px 6px' : '8px 16px', paddingLeft: 16 + (row.indent ?? 0) * 20, fontSize: row.tipo === 'header' ? 11 : 13, fontWeight: row.tipo === 'header' ? 700 : row.tipo === 'total' ? 700 : 400, color: row.tipo === 'header' ? '#6b7280' : '#1f2937', letterSpacing: row.tipo === 'header' ? '.06em' : 0, textTransform: row.tipo === 'header' ? 'uppercase' : 'none' }}>
        {row.concepto}
        {row.note && <span style={{ fontSize:10, color:'#9ca3af', marginLeft:6 }}>{row.note}</span>}
      </td>
      <td style={{ padding:'8px 16px', textAlign:'right', fontSize:13, fontWeight: row.tipo === 'total' ? 700 : 400, color: amtColor, fontFamily:'monospace', whiteSpace:'nowrap' }}>
        {row.tipo === 'header' || row.monto === 0 && row.tipo !== 'item' ? '' : (showSign && row.tipo === 'item' && row.monto > 0 ? '' : '') + '$' + fmt(Math.abs(row.monto))}
      </td>
    </tr>
  );
}

function BSRowComp({ row }: { row: BSRow }) {
  if (row.tipo === 'divider') return <tr><td colSpan={2} style={{ height:8 }} /></tr>;
  return (
    <tr style={{ borderBottom: row.tipo === 'total' ? '2px solid #e5e7eb' : '1px solid #f3f4f6', background: row.tipo === 'header' ? '#f8fafc' : row.tipo === 'total' ? '#eff6ff' : 'white' }}>
      <td style={{ padding: row.tipo === 'header' ? '10px 16px 6px' : '8px 16px', paddingLeft: 16 + (row.indent ?? 0) * 20, fontSize: row.tipo === 'header' ? 11 : 13, fontWeight: row.tipo === 'header' ? 700 : row.tipo === 'total' ? 700 : 400, color: row.tipo === 'header' ? '#6b7280' : '#1f2937', textTransform: row.tipo === 'header' ? 'uppercase' : 'none', letterSpacing: row.tipo === 'header' ? '.06em' : 0 }}>
        {row.concepto}
      </td>
      <td style={{ padding:'8px 16px', textAlign:'right', fontSize:13, fontWeight: row.tipo === 'total' ? 700 : 400, color: row.tipo === 'total' ? '#1e40af' : '#1f2937', fontFamily:'monospace' }}>
        {row.tipo === 'header' || (row.monto === 0 && row.tipo !== 'item') ? '' : '$' + fmt(row.monto)}
      </td>
    </tr>
  );
}


// ─── Interfaces for horizontal P&L ───────────────────────────────────────────
interface MonthData {
  label: string;
  ventas: number; descuentos: number; iva: number;
  cogs: number; merma: number; nomina: number;
  gastosOp: number; depreciacion: number; financiero: number;
}
type HView = 'pesos' | 'pct' | 'delta' | 'y2y';

// ─── RowDef — shared type for PLHorizontal rows ──────────────────────────────
type RowDef = { label: string; key: keyof MonthData | null; tipo: 'header'|'line'|'sub'|'total'; derived?: (m: MonthData) => number; indent?: boolean; };

// ─── PLHorizontal ─────────────────────────────────────────────────────────────
function PLHorizontal({ tenantId, numMonths, onDataReady }: { tenantId: string; numMonths: number; onDataReady?: (months: MonthData[], rows: RowDef[], getVal: (r: RowDef, m: MonthData) => number) => void }) {
  const supabase = createClient();
  const [months, setMonths] = useState<MonthData[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<HView>('pesos');
  const [prevYearMonths, setPrevYearMonths] = useState<MonthData[]>([]);
  const [loadingY2Y, setLoadingY2Y] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const results: MonthData[] = [];
      const now = new Date();

      for (let i = numMonths - 1; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const start = new Date(d.getFullYear(), d.getMonth(), 1).toISOString();
        const end   = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59).toISOString();
        const label = d.toLocaleString('es-MX', { month: 'short', year: '2-digit' });

        const [ordRes, gastosRes, nomRes, depRes] = await Promise.all([
          supabase.from('orders').select('total, subtotal, discount, iva')
            .eq('tenant_id', tenantId).eq('status', 'cerrada').eq('is_comanda', false)
            .gte('closed_at', start).lte('closed_at', end),
          supabase.from('gastos_recurrentes').select('monto, frecuencia, categoria')
            .eq('tenant_id', tenantId),
          supabase.from('employees').select('salary, salary_frequency')
            .eq('tenant_id', tenantId).eq('status', 'activo'),
          supabase.from('depreciaciones').select('valor_original, vida_util_anios, valor_residual, fecha_adquisicion')
            .eq('tenant_id', tenantId),
        ]);

        const orders = ordRes.data ?? [];
        const ventas = orders.reduce((s, o) => s + Number(o.total ?? 0), 0);
        const descuentos = orders.reduce((s, o) => s + Number(o.discount ?? 0), 0);
        const ivaAmt = orders.reduce((s, o) => s + Number(o.iva ?? 0), 0);

        // Nomina mensual
        const FREQ: Record<string, number> = { diario: 30, semanal: 4.33, quincenal: 2, mensual: 1, bimestral: 0.5 };
        const nomina = (nomRes.data ?? []).reduce((s, e) => {
          const sal = Number(e.salary ?? 0);
          const freq = FREQ[e.salary_frequency ?? 'mensual'] ?? 1;
          return s + sal * freq;
        }, 0);

        // Gastos operativos mensual
        const GFREQ: Record<string, number> = { diaria: 30, semanal: 4.33, quincenal: 2, mensual: 1, trimestral: 0.33, anual: 0.083 };
        const gastosOp = (gastosRes.data ?? [])
          .filter((g: any) => g.categoria !== 'nomina')
          .reduce((s: number, g: any) => s + Number(g.monto) * (GFREQ[g.frecuencia] ?? 1), 0);

        // Depreciacion mensual
        const depreciacion = (depRes.data ?? []).reduce((s: number, a: any) => {
          const meses = Number(a.vida_util_anios) * 12;
          return s + (Number(a.valor_original) - Number(a.valor_residual)) / Math.max(meses, 1);
        }, 0);

        // COGS desde stock_movements.total_cost (WACC real)
        // Prioridad: si el movimiento tiene total_cost (nuevo), usarlo. Si no, fallback a cost_actual de órdenes.
        const { data: stockMovData } = await supabase.from('stock_movements')
          .select('total_cost, quantity, unit_cost')
          .eq('tenant_id', tenantId).eq('movement_type', 'salida')
          .gte('created_at', start).lte('created_at', end);

        const cogsFromMovements = (stockMovData ?? []).reduce((s, m) => {
          // Si tiene total_cost (WACC preciso), usarlo; si no, quantity × unit_cost como fallback
          const tc = m.total_cost != null ? Number(m.total_cost) : (Number(m.quantity) * Number(m.unit_cost ?? 0));
          return s + tc;
        }, 0);

        // Merma — desde stock_movements tipo 'merma' con total_cost
        const { data: mermaMovData } = await supabase.from('stock_movements')
          .select('total_cost, quantity, unit_cost')
          .eq('tenant_id', tenantId).eq('movement_type', 'merma')
          .gte('created_at', start).lte('created_at', end);

        const mermaFromMovements = (mermaMovData ?? []).reduce((s, m) => {
          const tc = m.total_cost != null ? Number(m.total_cost) : (Number(m.quantity) * Number(m.unit_cost ?? 0));
          return s + tc;
        }, 0);

        // Fallback: si no hay movimientos con total_cost, usar cost_actual de órdenes
        const { data: cogsOrdersData } = await supabase.from('orders')
          .select('cost_actual')
          .eq('tenant_id', tenantId).eq('status', 'cerrada').eq('is_comanda', false)
          .gte('closed_at', start).lte('closed_at', end);
        const cogsFromOrders = (cogsOrdersData ?? []).reduce((s, o) => s + Number(o.cost_actual ?? 0), 0);

        const { data: mermaOrdersData } = await supabase.from('orders')
          .select('cost_actual')
          .eq('tenant_id', tenantId).eq('is_comanda', false)
          .in('status', ['cancelada'])
          .gte('created_at', start).lte('created_at', end);
        const mermaFromOrders = (mermaOrdersData ?? []).reduce((s, o) => s + Number(o.cost_actual ?? 0), 0);

        // Usar WACC si hay datos, sino fallback a cost_actual
        const cogs = cogsFromMovements > 0 ? cogsFromMovements : cogsFromOrders;
        const merma = mermaFromMovements > 0 ? mermaFromMovements : mermaFromOrders;

        results.push({
          label, ventas, descuentos, iva: ivaAmt, cogs, merma,
          nomina, gastosOp, depreciacion, financiero: 0,
        });
      }

      setMonths(results);
      setLoading(false);
    }
    load();
  }, [tenantId, numMonths]); // eslint-disable-line

  const rows: RowDef[] = [
    { label: 'Ingresos', key: null, tipo: 'header' },
    { label: 'Ventas brutas', key: 'ventas', tipo: 'line' },
    { label: '(-) Descuentos', key: 'descuentos', tipo: 'line', indent: true },
    { label: '(-) IVA', key: 'iva', tipo: 'line', indent: true },
    { label: 'Ventas netas', key: null, tipo: 'sub', derived: m => m.ventas - m.descuentos - m.iva },
    { label: 'Costos directos', key: null, tipo: 'header' },
    { label: 'COGS (ingredientes)', key: 'cogs', tipo: 'line', indent: true },
    { label: 'Merma y cancelaciones', key: 'merma', tipo: 'line', indent: true },
    { label: 'Utilidad bruta', key: null, tipo: 'sub', derived: m => (m.ventas - m.descuentos - m.iva) - m.cogs - m.merma },
    { label: 'Gastos operativos', key: null, tipo: 'header' },
    { label: 'Nómina', key: 'nomina', tipo: 'line', indent: true },
    { label: 'Gastos fijos/var', key: 'gastosOp', tipo: 'line', indent: true },
    { label: 'EBITDA', key: null, tipo: 'sub', derived: m => (m.ventas - m.descuentos - m.iva) - m.cogs - m.merma - m.nomina - m.gastosOp },
    { label: 'Otros', key: null, tipo: 'header' },
    { label: 'Depreciación', key: 'depreciacion', tipo: 'line', indent: true },
    { label: 'Gastos financieros', key: 'financiero', tipo: 'line', indent: true },
    { label: 'Utilidad neta', key: null, tipo: 'total',
      derived: m => (m.ventas - m.descuentos - m.iva) - m.cogs - m.merma - m.nomina - m.gastosOp - m.depreciacion - m.financiero
    },
  ];

  function getVal(row: RowDef, m: MonthData): number {
    return row.derived ? row.derived(m) : Number(m[row.key as keyof MonthData] ?? 0);
  }

  const [showDetail, setShowDetail] = React.useState(false);

  // Fetch previous year data for Y2Y comparison
  async function fetchPrevYear() {
    if (prevYearMonths.length > 0 || loadingY2Y) return; // already loaded
    setLoadingY2Y(true);
    const results: MonthData[] = [];
    const now = new Date();
    for (let i = numMonths - 1; i >= 0; i--) {
      // Same months as current period but 1 year back
      const d = new Date(now.getFullYear() - 1, now.getMonth() - i, 1);
      const start = new Date(d.getFullYear(), d.getMonth(), 1).toISOString();
      const end   = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59).toISOString();
      const label = d.toLocaleString('es-MX', { month: 'short', year: '2-digit' });

      const [ordRes, gastosRes, nomRes, depRes, cogsData, mermaData] = await Promise.all([
        supabase.from('orders').select('total, discount, iva')
          .eq('tenant_id', tenantId).eq('status', 'cerrada').eq('is_comanda', false)
          .gte('closed_at', start).lte('closed_at', end),
        supabase.from('gastos_recurrentes').select('monto, frecuencia, categoria').eq('tenant_id', tenantId),
        supabase.from('employees').select('salary, salary_frequency').eq('tenant_id', tenantId).eq('status', 'activo'),
        supabase.from('depreciaciones').select('valor_original, vida_util_anios, valor_residual, fecha_adquisicion').eq('tenant_id', tenantId),
        supabase.from('stock_movements').select('total_cost, unit_cost, quantity')
          .eq('tenant_id', tenantId).eq('movement_type', 'salida')
          .gte('created_at', start).lte('created_at', end),
        supabase.from('stock_movements').select('total_cost, unit_cost, quantity')
          .eq('tenant_id', tenantId).eq('movement_type', 'merma')
          .gte('created_at', start).lte('created_at', end),
      ]);
      const orders = ordRes.data ?? [];
      const ventas = orders.reduce((s, o) => s + Number(o.total ?? 0), 0);
      const descuentos = orders.reduce((s, o) => s + Number(o.discount ?? 0), 0);
      const ivaAmt = orders.reduce((s, o) => s + Number(o.iva ?? 0), 0);
      const FREQ: Record<string, number> = { diario:30, semanal:4.33, quincenal:2, mensual:1, bimestral:0.5 };
      const nomina = (nomRes.data ?? []).reduce((s, e) => s + Number(e.salary ?? 0) * (FREQ[(e as any).salary_frequency ?? 'mensual'] ?? 1), 0);
      const GFREQ: Record<string, number> = { diaria:30, semanal:4.33, quincenal:2, mensual:1, trimestral:0.33, anual:0.083 };
      const gastosOp = (gastosRes.data ?? []).filter((g: any) => g.categoria !== 'nomina').reduce((s: number, g: any) => s + Number(g.monto) * (GFREQ[g.frecuencia] ?? 1), 0);
      const depreciacion = (depRes.data ?? []).reduce((s: number, a: any) => s + (Number(a.valor_original) - Number(a.valor_residual)) / Math.max(Number(a.vida_util_anios) * 12, 1), 0);
      // COGS — priorizar WACC real de stock_movements
      const cogsFromMovements = (cogsData.data ?? []).reduce((s: number, m: any) => {
        const tc = m.total_cost != null ? Number(m.total_cost) : Number(m.quantity) * Number(m.unit_cost ?? 0);
        return s + tc;
      }, 0);
      const mermaFromMovements = (mermaData.data ?? []).reduce((s: number, m: any) => {
        const tc = m.total_cost != null ? Number(m.total_cost) : Number(m.quantity) * Number(m.unit_cost ?? 0);
        return s + tc;
      }, 0);
      const cogs = cogsFromMovements; // ya incluye WACC real
      const merma = mermaFromMovements;
      results.push({ label, ventas, descuentos, iva: ivaAmt, cogs, merma, nomina, gastosOp, depreciacion, financiero: 0 });
    }
    setPrevYearMonths(results);
    setLoadingY2Y(false);
  }

  // Notify parent when data is loaded (for CSV/PDF export)
  useEffect(() => {
    if (!loading && months.length > 0 && onDataReady) {
      onDataReady(months, rows, getVal);
    }
  }, [loading, months]); // eslint-disable-line

  if (loading) return (
    <div style={{ textAlign: 'center', padding: 48, color: '#9ca3af', fontSize: 13 }}>
      Cargando comparativa de {numMonths} meses…
    </div>
  );

  const fmtMXN = (n: number) => n === 0 ? '—' : '$' + n.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fmtP   = (n: number, base: number) => base > 0 ? (n / base * 100).toFixed(1) + '%' : '—';
  const fmtD   = (cur: number, prev: number) => {
    if (prev === 0) return '—';
    const d = ((cur - prev) / Math.abs(prev)) * 100;
    const s = d >= 0 ? '▲' : '▼';
    const col = d >= 0 ? '#16a34a' : '#dc2626';
    return { text: s + ' ' + Math.abs(d).toFixed(1) + '%', color: col };
  };

  // ── Derived summary metrics ──────────────────────────────────────────────────
  const last = months[months.length - 1];
  const prev = months[months.length - 2];

  function getRowDerived(key: string, m: MonthData): number {
    const vn = m.ventas - m.descuentos - m.iva;
    if (key === 'ventas_netas') return vn;
    if (key === 'margen_bruto') return vn - m.cogs - m.merma;
    if (key === 'ebitda')       return vn - m.cogs - m.merma - m.nomina - m.gastosOp;
    if (key === 'utilidad_neta') return vn - m.cogs - m.merma - m.nomina - m.gastosOp - m.depreciacion - m.financiero;
    if (key === 'prime_cost')   return vn > 0 ? (m.cogs + m.nomina) / vn * 100 : 0;
    return 0;
  }

  const SUMMARY_METRICS = [
    { key: 'ventas_netas',  label: 'Ventas netas',  isMoney: true,  goodUp: true },
    { key: 'margen_bruto',  label: 'Margen bruto',  isMoney: true,  goodUp: true },
    { key: 'ebitda',        label: 'EBITDA',         isMoney: true,  goodUp: true },
    { key: 'utilidad_neta', label: 'Utilidad neta',  isMoney: true,  goodUp: true },
    { key: 'prime_cost',    label: 'Prime Cost',     isMoney: false, goodUp: false },
  ];

  const C = { hdr:'#f9fafb', border:'#e5e7eb', text:'#1f2937', muted:'#6b7280', blue:'#1B3A6B' };
  const thStyle: React.CSSProperties = { padding: '9px 10px', fontSize: 11, fontWeight: 600, color: C.muted, textAlign: 'right', background: C.hdr, borderBottom: `1px solid ${C.border}`, whiteSpace: 'nowrap' };
  const TOTAL_COL_STYLE: React.CSSProperties = { fontWeight: 700, color: C.blue, background: '#f0f4ff' };

  const totals: MonthData = months.reduce((acc, m) => ({
    label: 'Total', ventas: acc.ventas + m.ventas, descuentos: acc.descuentos + m.descuentos,
    iva: acc.iva + m.iva, cogs: acc.cogs + m.cogs, merma: acc.merma + m.merma,
    nomina: acc.nomina + m.nomina, gastosOp: acc.gastosOp + m.gastosOp,
    depreciacion: acc.depreciacion + m.depreciacion, financiero: acc.financiero + m.financiero,
  }), { label:'Total', ventas:0, descuentos:0, iva:0, cogs:0, merma:0, nomina:0, gastosOp:0, depreciacion:0, financiero:0 });

  // Sparkline SVG for a metric across months
  function Sparkline({ values, goodUp }: { values: number[]; goodUp: boolean }) {
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;
    const W = 80; const H = 28; const pad = 3;
    const pts = values.map((v, i) => {
      const x = pad + (i / Math.max(values.length - 1, 1)) * (W - pad * 2);
      const y = H - pad - ((v - min) / range) * (H - pad * 2);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');
    const lastVal = values[values.length - 1];
    const prevVal = values[values.length - 2] ?? lastVal;
    const trending = lastVal >= prevVal;
    const color = (trending === goodUp) ? '#16a34a' : '#dc2626';
    return (
      <svg width={W} height={H} style={{ display: 'block' }}>
        <polyline points={pts} fill="none" stroke={color} strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />
        {values.map((v, i) => {
          const x = pad + (i / Math.max(values.length - 1, 1)) * (W - pad * 2);
          const y = H - pad - ((v - min) / range) * (H - pad * 2);
          return i === values.length - 1
            ? <circle key={i} cx={x} cy={y} r={2.5} fill={color} />
            : null;
        })}
      </svg>
    );
  }

  return (
    <div>
      {/* ── View toggle ───────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
        {([['pesos','$ Pesos'], ['pct','% sobre ventas'], ['delta','Δ vs mes ant.'], ['y2y','↕ vs año ant.']] as [HView,string][]).map(([v, lbl]) => (
          <button key={v} onClick={() => { setView(v); if (v === 'y2y') fetchPrevYear(); }}
            style={{ padding: '5px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer',
              background: view === v ? C.blue : '#f3f4f6', color: view === v ? 'white' : C.muted }}>
            {lbl}
          </button>
        ))}
      </div>

      {/* ── Summary cards — 5 métricas clave ─────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: 10, marginBottom: 20 }}>
        {SUMMARY_METRICS.map(metric => {
          const lastVal = last ? getRowDerived(metric.key, last) : 0;
          const prevVal = prev ? getRowDerived(metric.key, prev) : null;
          const delta = prevVal !== null && prevVal !== 0
            ? ((lastVal - prevVal) / Math.abs(prevVal)) * 100
            : null;
          const trending = delta !== null ? delta >= 0 : null;
          const isGood = trending === null ? null : trending === metric.goodUp;
          const sparkVals = months.map(m => getRowDerived(metric.key, m));

          return (
            <div key={metric.key} style={{ background: 'white', border: `1px solid ${C.border}`,
              borderRadius: 12, padding: '14px 16px' }}>
              <p style={{ fontSize: 11, color: C.muted, margin: '0 0 6px',
                textTransform: 'uppercase', letterSpacing: '.05em', fontWeight: 600 }}>
                {metric.label}
              </p>
              <p style={{ fontSize: 18, fontWeight: 700, color: C.text, margin: '0 0 4px',
                fontFamily: 'monospace' }}>
                {metric.isMoney
                  ? '$' + lastVal.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                  : lastVal.toFixed(1) + '%'}
              </p>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                {delta !== null ? (
                  <p style={{ fontSize: 11, margin: 0, fontWeight: 600,
                    color: isGood ? '#16a34a' : '#dc2626' }}>
                    {delta >= 0 ? '▲' : '▼'} {Math.abs(delta).toFixed(1)}% vs {prev?.label}
                  </p>
                ) : <p style={{ fontSize: 11, margin: 0, color: C.muted }}>—</p>}
                {months.length > 1 && (
                  <Sparkline values={sparkVals} goodUp={metric.goodUp} />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Detalle colapsable ────────────────────────────────────────────── */}
      <button
        onClick={() => setShowDetail(d => !d)}
        style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px',
          borderRadius: 8, border: `1px solid ${C.border}`, background: C.hdr,
          color: C.muted, fontSize: 12, fontWeight: 600, cursor: 'pointer',
          marginBottom: showDetail ? 14 : 0, width: '100%', justifyContent: 'space-between' }}>
        <span>{showDetail ? '▲ Ocultar detalle completo' : '▼ Ver estado de resultados completo mes a mes'}</span>
        <span style={{ fontSize: 10, color: '#9ca3af' }}>{months.length} meses · {rows.filter(r => r.tipo !== 'header').length} líneas</span>
      </button>

      {showDetail && (
        <div style={{ overflowX: 'auto', borderRadius: 12, border: `1px solid ${C.border}` }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr>
                <th style={{ ...thStyle, textAlign: 'left', width: 180, minWidth: 160 }}>Concepto</th>
                {months.map(m => <th key={m.label} style={thStyle}>{m.label}</th>)}
                <th style={{ ...thStyle, ...TOTAL_COL_STYLE }}>{numMonths}m</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, ri) => {
                if (row.tipo === 'header') {
                  return (
                    <tr key={ri}>
                      <td colSpan={months.length + 2}
                        style={{ padding: '6px 10px', fontSize: 10, fontWeight: 600, color: C.muted,
                          letterSpacing: '.08em', textTransform: 'uppercase', background: C.hdr,
                          borderTop: `1px solid ${C.border}` }}>
                        {row.label}
                      </td>
                    </tr>
                  );
                }

                const vals = months.map(m => getVal(row, m));
                const totVal = getVal(row, totals);
                const maxVal = Math.max(...vals.map(Math.abs), 1);
                const isTotal = row.tipo === 'total';
                const isSub   = row.tipo === 'sub';

                return (
                  <tr key={ri} style={{ borderTop: (isTotal || isSub) ? `1px solid ${C.border}` : undefined }}>
                    <td style={{ padding: '9px 10px', paddingLeft: row.indent ? 22 : 10,
                      fontWeight: isTotal || isSub ? 600 : 400, color: C.text,
                      background: isTotal ? '#eff6ff' : 'transparent',
                      borderBottom: `1px solid ${C.border}` }}>
                      {row.label}
                    </td>
                    {months.map((m, mi) => {
                      const val = vals[mi];
                      const prevVal2 = mi > 0 ? vals[mi - 1] : null;
                      const isMax = row.tipo === 'line' && val === Math.max(...vals);
                      const isMin = row.tipo === 'line' && val === Math.min(...vals) && val !== Math.max(...vals);
                      const cellBg = isMax ? 'rgba(22,163,74,0.05)' : isMin ? 'rgba(220,38,38,0.05)' : isTotal ? '#eff6ff' : 'transparent';

                      let display: React.ReactNode;
                      if (view === 'pesos') {
                        const barW = Math.round(Math.min(Math.abs(val) / maxVal * 32, 32));
                        display = (
                          <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4 }}>
                            {(isSub || isTotal) && barW > 0 && (
                              <span style={{ display: 'inline-block', height: 3, width: barW,
                                borderRadius: 2, background: val >= 0 ? '#1d4ed8' : '#dc2626', flexShrink: 0 }} />
                            )}
                            <span style={{ color: isTotal ? (val >= 0 ? '#15803d' : '#dc2626') : C.text }}>
                              {fmtMXN(val)}
                            </span>
                          </span>
                        );
                      } else if (view === 'pct') {
                        const base = months[mi].ventas || 1;
                        const pct  = val / base * 100;
                        display = <span style={{ color: (isSub||isTotal) && pct < 0 ? '#dc2626' : C.text }}>{fmtP(val, base)}</span>;
                      } else if (view === 'y2y') {
                        const pyMonth = prevYearMonths[mi];
                        const pyVal = pyMonth ? getVal(row, pyMonth) : null;
                        if (!pyVal || pyVal === 0 || loadingY2Y) {
                          display = <span style={{ color: '#d1d5db' }}>{loadingY2Y ? '…' : '—'}</span>;
                        } else {
                          const pct = ((val - pyVal) / Math.abs(pyVal)) * 100;
                          const goodDir = row.tipo !== 'line' || !row.label.toLowerCase().includes('cost');
                          const isGood = goodDir ? pct >= 0 : pct <= 0;
                          const col = isGood ? '#16a34a' : '#dc2626';
                          const s = pct >= 0 ? '▲' : '▼';
                          display = (
                            <div style={{ textAlign: 'right' }}>
                              <div style={{ color: col, fontWeight: 500, fontSize: 11 }}>{s} {Math.abs(pct).toFixed(1)}%</div>
                              <div style={{ color: '#9ca3af', fontSize: 10 }}>{fmtMXN(pyVal)}</div>
                            </div>
                          );
                        }
                      } else {
                        if (prevVal2 === null || prevVal2 === 0) {
                          display = <span style={{ color: '#d1d5db' }}>—</span>;
                        } else {
                          const result = fmtD(val, prevVal2);
                          if (typeof result === 'string') {
                            display = <span style={{ color: '#d1d5db' }}>{result}</span>;
                          } else {
                            display = <span style={{ color: result.color, fontWeight: 500 }}>{result.text}</span>;
                          }
                        }
                      }

                      return (
                        <td key={mi}
                          style={{ padding: '9px 10px', textAlign: 'right', fontWeight: isTotal || isSub ? 600 : 400,
                            background: cellBg, borderBottom: `1px solid ${C.border}` }}>
                          {display}
                        </td>
                      );
                    })}
                    <td style={{ ...TOTAL_COL_STYLE, padding: '9px 10px', textAlign: 'right',
                      fontWeight: isTotal || isSub ? 700 : 400, borderBottom: `1px solid ${C.border}` }}>
                      <span style={{ color: isTotal ? (totVal >= 0 ? '#15803d' : '#dc2626') : C.blue }}>
                        {view === 'pesos' ? fmtMXN(totVal) :
                         view === 'pct'   ? fmtP(totVal, totals.ventas) :
                         view === 'y2y'   ? (() => {
                           const pyTot = prevYearMonths.reduce((s, m) => s + getVal(row, m), 0);
                           if (!pyTot) return '—';
                           const pct = ((totVal - pyTot) / Math.abs(pyTot)) * 100;
                           return (pct >= 0 ? '▲' : '▼') + ' ' + Math.abs(pct).toFixed(1) + '%';
                         })() : '—'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {!showDetail && (
        <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 8 }}>
          Verde = mejor mes · Rojo = peor mes · Sparklines muestran tendencia del período
        </p>
      )}
    </div>
  );
}


// ─── Main Component ───────────────────────────────────────────────────────────
export default function AnalisisFinanciero() {
  const supabase = createClient();
  const { appUser } = useAuth();
  const [period, setPeriod] = useState<Period>('mes_actual');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'pl'|'bs'|'flujo'>('pl');
  const [plView, setPlView] = useState<'vertical'|'horizontal'>('vertical');
  const [numMonths, setNumMonths] = useState(6);
  const [hData, setHData] = useState<{ months: MonthData[]; rows: RowDef[]; getVal: (r: RowDef, m: MonthData) => number } | null>(null);

  // Raw data
  const [ventas,       setVentas]       = useState(0);
  const [cogs,         setCogs]         = useState(0);
  const [merma,        setMerma]        = useState(0);
  const [descuentos,   setDescuentos]   = useState(0);
  const [iva,          setIva]          = useState(0);
  const [ventasEfec,   setVentasEfec]   = useState(0);
  const [ventasTarj,   setVentasTarj]   = useState(0);
  const [cortesias,    setCortesias]    = useState(0);
  const [nomina,       setNomina]       = useState(0);
  const [gastosOp,     setGastosOp]     = useState<{nombre:string;monto:number;cat:string;metodo:string;proveedor:string;dias_credito:number}[]>([]);
  const [depTotal,     setDepTotal]     = useState(0);
  const [actFijos,     setActFijos]     = useState<{nombre:string;valor_original:number;valor_residual:number;vida_util_anios:number;fecha_adquisicion:string}[]>([]);
  const [inventario,   setInventario]   = useState(0);
  const [ordAbiertas,  setOrdAbiertas]  = useState(0);

  // Period helpers
  const dateRange = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear(), m = now.getMonth();
    if (period === 'mes_actual') return {
      start: new Date(y, m, 1).toISOString(),
      end:   new Date(y, m + 1, 0, 23, 59, 59).toISOString(),
      label: now.toLocaleString('es-MX', { month: 'long', year: 'numeric' }),
    };
    if (period === 'mes_anterior') return {
      start: new Date(y, m - 1, 1).toISOString(),
      end:   new Date(y, m, 0, 23, 59, 59).toISOString(),
      label: new Date(y, m-1, 1).toLocaleString('es-MX', { month: 'long', year: 'numeric' }),
    };
    if (period === 'trimestre') return {
      start: new Date(y, m - 2, 1).toISOString(),
      end:   new Date(y, m + 1, 0, 23, 59, 59).toISOString(),
      label: 'Últimos 3 meses',
    };
    return {
      start: new Date(y, 0, 1).toISOString(),
      end:   new Date(y, 11, 31, 23, 59, 59).toISOString(),
      label: `Año ${y}`,
    };
  }, [period]);

  const periodFactor = useMemo(() => {
    if (period === 'mes_actual' || period === 'mes_anterior') return 1;
    if (period === 'trimestre') return 3;
    return 12;
  }, [period]);

  const load = useCallback(async () => {
    setLoading(true);
    const tid = getTenantId();
    const { start, end } = dateRange;

    const [
      { data: ordersData },
      { data: mermaData },
      { data: gastosData },
      { data: depData },
      { data: actData },
      { data: ingData },
      { data: abiertasData },
      { data: usersData },
    ] = await Promise.all([
      supabase.from('orders').select('total,cost_actual,pay_method,discount,iva,is_cortesia')
        .eq('tenant_id', tid).eq('status', 'cerrada').eq('is_comanda', false)
        .gte('created_at', start).lte('created_at', end),
      supabase.from('orders').select('waste_cost')
        .eq('tenant_id', tid).eq('status', 'cancelada').eq('cancel_type', 'con_costo')
        .gte('updated_at', start).lte('updated_at', end),
      supabase.from('gastos_recurrentes').select('nombre,monto,categoria,frecuencia,metodo_pago,proveedor,dias_credito,activo')
        .eq('tenant_id', tid).eq('activo', true),
      supabase.from('depreciaciones').select('nombre,valor_original,valor_residual,vida_util_anios,fecha_adquisicion,activo')
        .eq('tenant_id', tid).eq('activo', true),
      supabase.from('depreciaciones').select('nombre,valor_original,valor_residual,vida_util_anios,fecha_adquisicion')
        .eq('tenant_id', tid).eq('activo', true),
      supabase.from('ingredients').select('stock,cost').eq('tenant_id', tid),
      supabase.from('orders').select('id').eq('tenant_id', tid).in('status', ['abierta','preparacion','lista']),
      supabase.from('app_users').select('salary,salary_frequency').eq('tenant_id', tid).eq('is_active', true),
    ]);

    // Ventas
    const rows = ordersData ?? [];
    const totalVentas = rows.reduce((s, o) => s + Number(o.total ?? 0), 0);
    const totalCogs   = rows.reduce((s, o) => s + Number(o.cost_actual ?? 0), 0);
    const totalDesc   = rows.reduce((s, o) => s + Number(o.discount ?? 0), 0);
    const totalIva    = rows.reduce((s, o) => s + Number(o.iva ?? 0), 0);
    const totalEfec   = rows.filter(o => (o as any).pay_method === 'efectivo' && !o.is_cortesia).reduce((s, o) => s + Number(o.total), 0);
    const totalTarj   = rows.filter(o => (o as any).pay_method === 'tarjeta' && !o.is_cortesia).reduce((s, o) => s + Number(o.total), 0);
    const totalCort   = rows.filter(o => o.is_cortesia).length;
    setVentas(totalVentas); setCogs(totalCogs); setDescuentos(totalDesc); setIva(totalIva);
    setVentasEfec(totalEfec); setVentasTarj(totalTarj); setCortesias(totalCort);

    // Merma
    const totalMerma = (mermaData ?? []).reduce((s, o) => s + Number(o.waste_cost ?? 0), 0);
    setMerma(totalMerma);

    // Nómina mensual → scaled
    const nominaMensual = (usersData ?? []).reduce((s, u) => {
      const sal = Number(u.salary ?? 0);
      const freq = (u as any).salary_frequency ?? 'mensual';
      return s + (freq === 'quincenal' ? sal * 2 : freq === 'semanal' ? sal * 4.33 : sal);
    }, 0);
    setNomina(nominaMensual * periodFactor);

    // Gastos operativos
    const FREQ_FACTOR: Record<string, number> = {
      diario: 30, semanal: 4.33, quincenal: 2, mensual: 1,
      bimestral: 0.5, trimestral: 0.333, semestral: 0.167, anual: 0.083, unico: 0,
    };
    const gastosList = (gastosData ?? []).map((g: any) => ({
      nombre: g.nombre,
      monto: Number(g.monto) * (FREQ_FACTOR[g.frecuencia] ?? 1) * periodFactor,
      cat: g.categoria ?? 'otro',
      metodo: g.metodo_pago ?? 'efectivo',
      proveedor: g.proveedor ?? '',
      dias_credito: Number(g.dias_credito ?? 0),
    }));
    setGastosOp(gastosList);

    // Depreciaciones — valor libros y dep mensual
    let totalDepMes = 0;
    const activos = (actData ?? []).map((d: any) => {
      const meses = Number(d.vida_util_anios ?? 5) * 12;
      const depMes = (Number(d.valor_original) - Number(d.valor_residual)) / Math.max(meses, 1);
      totalDepMes += depMes;
      return { nombre: d.nombre, valor_original: Number(d.valor_original), valor_residual: Number(d.valor_residual), vida_util_anios: Number(d.vida_util_anios), fecha_adquisicion: d.fecha_adquisicion };
    });
    setDepTotal(totalDepMes * periodFactor);
    setActFijos(activos);

    // Inventario valorado (stock × cost)
    const invVal = (ingData ?? []).reduce((s, i) => s + Number(i.stock ?? 0) * Number(i.cost ?? 0), 0);
    setInventario(invVal);

    setOrdAbiertas((abiertasData ?? []).length);
    setLoading(false);
  }, [supabase, dateRange, periodFactor]);

  useEffect(() => { load(); }, [load]);

  // ── P&L derived ──────────────────────────────────────────────────────────────
  const utilidadBruta  = ventas - cogs;
  const utilBrutaNeta  = utilidadBruta - merma;
  const totalGastosOp  = nomina + gastosOp.reduce((s, g) => s + g.monto, 0);
  const ebitda         = utilBrutaNeta - totalGastosOp;
  const ebit           = ebitda - depTotal;
  const gastosFinanc   = gastosOp.filter(g => g.cat === 'financiero').reduce((s, g) => s + g.monto, 0);
  const ebitdaClean    = ebitda + gastosFinanc; // EBITDA before financing
  const uai            = ebit - gastosFinanc;
  const isr            = Math.max(uai * 0.30, 0);
  const utilidadNeta   = uai - isr;
  const margenBruto    = ventas > 0 ? (utilidadBruta / ventas) * 100 : 0;
  const margenNeto     = ventas > 0 ? (utilidadNeta / ventas) * 100 : 0;
  const margenEbitda   = ventas > 0 ? (ebitda / ventas) * 100 : 0;

  const plRows: PLRow[] = [
    { concepto: 'INGRESOS',                                 monto: 0,            tipo: 'header' },
    { concepto: 'Ventas netas (sin IVA)',                   monto: ventas,        tipo: 'item',     indent:1 },
    { concepto: 'Descuentos otorgados',                     monto: -descuentos,   tipo: 'item',     indent:1, note: descuentos>0?`(${fmt(descuentos)} descontados)`:''},
    { concepto: 'IVA trasladado',                           monto: iva,           tipo: 'item',     indent:1, note:'(no es ingreso real)' },
    { concepto: 'TOTAL INGRESOS NETOS',                     monto: ventas,        tipo: 'total' },
    { concepto: '',                                         monto: 0,            tipo: 'divider' },
    { concepto: 'COSTO DE VENTAS (COGS)',                   monto: 0,            tipo: 'header' },
    { concepto: 'Costo de ingredientes (recetas)',          monto: cogs,          tipo: 'item',     indent:1 },
    { concepto: 'TOTAL COGS',                               monto: cogs,          tipo: 'subtotal' },
    { concepto: 'UTILIDAD BRUTA',                           monto: utilidadBruta, tipo: 'total' },
    ...(merma > 0 ? [
      { concepto: '',                                       monto: 0,            tipo: 'divider' as const },
      { concepto: 'OTROS COSTOS',                          monto: 0,            tipo: 'header'   as const },
      { concepto: 'Merma registrada (cancelaciones)',       monto: merma,         tipo: 'item'     as const, indent:1 },
      { concepto: 'UTILIDAD BRUTA NETA',                   monto: utilBrutaNeta, tipo: 'total'    as const },
    ] : []),
    { concepto: '',                                         monto: 0,            tipo: 'divider' },
    { concepto: 'GASTOS OPERATIVOS',                        monto: 0,            tipo: 'header' },
    { concepto: 'Nómina y prestaciones',                    monto: nomina,        tipo: 'item',     indent:1 },
    ...gastosOp.filter(g => g.cat !== 'financiero').map(g => ({ concepto: g.nombre, monto: g.monto, tipo: 'item' as const, indent:1 })),
    { concepto: 'TOTAL GASTOS OPERATIVOS',                  monto: totalGastosOp, tipo: 'subtotal' },
    { concepto: '',                                         monto: 0,            tipo: 'divider' },
    { concepto: 'EBITDA',                                   monto: ebitda,        tipo: 'total' },
    { concepto: `Margen EBITDA: ${margenEbitda.toFixed(1)}%`, monto: 0,          tipo: 'divider' },
    { concepto: '',                                         monto: 0,            tipo: 'divider' },
    { concepto: 'AJUSTES',                                  monto: 0,            tipo: 'header' },
    { concepto: 'Depreciación y amortización',              monto: depTotal,      tipo: 'item',     indent:1 },
    { concepto: 'UTILIDAD OPERATIVA (EBIT)',                monto: ebit,          tipo: 'total' },
    { concepto: '',                                         monto: 0,            tipo: 'divider' },
    { concepto: 'RESULTADO FINANCIERO',                     monto: 0,            tipo: 'header' },
    { concepto: 'Gastos financieros (intereses)',           monto: gastosFinanc,  tipo: 'item',     indent:1 },
    { concepto: 'UTILIDAD ANTES DE IMPUESTOS',             monto: uai,           tipo: 'total' },
    { concepto: '',                                         monto: 0,            tipo: 'divider' },
    { concepto: 'IMPUESTOS',                                monto: 0,            tipo: 'header' },
    { concepto: 'ISR estimado (30%)',                       monto: isr,           tipo: 'item',     indent:1, note:'(estimado, consulta a tu contador)' },
    { concepto: '🏆 UTILIDAD NETA',                        monto: utilidadNeta,  tipo: 'total' },
  ];

  // ── Balance Sheet ─────────────────────────────────────────────────────────────
  // ACTIVOS
  const efectivoVentas   = ventasEfec; // cash from sales (proxy for cash on hand)
  const cuentasBanco     = ventasTarj; // card sales go to bank (proxy)
  const totalActCirc     = efectivoVentas + cuentasBanco + inventario;

  // Activos fijos — libro value
  const totalValorOrig   = actFijos.reduce((s, a) => s + a.valor_original, 0);
  const depAcumulada     = actFijos.reduce((s, a) => {
    const mesesVida = a.vida_util_anios * 12;
    const depMes = (a.valor_original - a.valor_residual) / Math.max(mesesVida, 1);
    const mesesTransc = Math.max(0, Math.floor((Date.now() - new Date(a.fecha_adquisicion).getTime()) / (30.44 * 86400000)));
    return s + Math.min(depMes * mesesTransc, a.valor_original - a.valor_residual);
  }, 0);
  const valorLibros      = totalValorOrig - depAcumulada;
  const totalActivos     = totalActCirc + valorLibros;

  // PASIVOS
  const cxpCredito = gastosOp.filter(g => g.metodo === 'credito').reduce((s, g) => s + g.monto, 0);
  const nominaPor  = nomina; // payroll accrual
  const ivaXPagar  = iva;    // IVA collected but not yet remitted
  const totalPasivoCirc = cxpCredito + nominaPor + ivaXPagar;
  const totalPasivos = totalPasivoCirc;

  // CAPITAL
  const capitalContable = totalActivos - totalPasivos;

  const bsActivos: BSRow[] = [
    { concepto: 'ACTIVOS',                              monto: 0,             tipo: 'header' },
    { concepto: 'ACTIVO CIRCULANTE',                    monto: 0,             tipo: 'header', indent:1 },
    { concepto: 'Efectivo (ventas en efectivo)',         monto: efectivoVentas, tipo: 'item',  indent:2 },
    { concepto: 'Banco / TPV (ventas con tarjeta)',     monto: cuentasBanco,   tipo: 'item',  indent:2 },
    { concepto: 'Inventario valorado',                  monto: inventario,     tipo: 'item',  indent:2, },
    { concepto: 'TOTAL ACTIVO CIRCULANTE',              monto: totalActCirc,   tipo: 'subtotal', indent:1 },
    { concepto: '',                                     monto: 0,             tipo: 'divider' },
    { concepto: 'ACTIVO FIJO',                          monto: 0,             tipo: 'header', indent:1 },
    ...actFijos.map(a => ({ concepto: a.nombre, monto: a.valor_original, tipo: 'item' as const, indent:2 })),
    { concepto: 'Depreciación acumulada',               monto: -depAcumulada,  tipo: 'item',  indent:2 },
    { concepto: 'TOTAL ACTIVO FIJO (valor libro)',      monto: valorLibros,    tipo: 'subtotal', indent:1 },
    { concepto: '',                                     monto: 0,             tipo: 'divider' },
    { concepto: 'TOTAL ACTIVOS',                        monto: totalActivos,   tipo: 'total' },
  ];

  const bsPasivos: BSRow[] = [
    { concepto: 'PASIVOS',                              monto: 0,             tipo: 'header' },
    { concepto: 'PASIVO CIRCULANTE',                    monto: 0,             tipo: 'header', indent:1 },
    { concepto: 'Cuentas por pagar (CxP crédito)',      monto: cxpCredito,     tipo: 'item',  indent:2 },
    { concepto: 'Nómina por pagar (acumulada)',         monto: nominaPor,      tipo: 'item',  indent:2 },
    { concepto: 'IVA por entregar a SHCP',              monto: ivaXPagar,      tipo: 'item',  indent:2 },
    { concepto: 'TOTAL PASIVO CIRCULANTE',              monto: totalPasivoCirc, tipo: 'subtotal', indent:1 },
    { concepto: '',                                     monto: 0,             tipo: 'divider' },
    { concepto: 'TOTAL PASIVOS',                        monto: totalPasivos,   tipo: 'total' },
    { concepto: '',                                     monto: 0,             tipo: 'divider' },
    { concepto: 'CAPITAL CONTABLE',                     monto: 0,             tipo: 'header' },
    { concepto: 'Capital / Patrimonio neto',            monto: capitalContable, tipo: 'item', indent:1 },
    { concepto: 'TOTAL PASIVO + CAPITAL',               monto: totalActivos,   tipo: 'total' },
  ];

  const ratioLiquidez  = totalPasivoCirc > 0 ? totalActCirc / totalPasivoCirc : null;
  const foodCostPct    = ventas > 0 ? (cogs / ventas) * 100 : 0;
  const laborCostPct   = ventas > 0 ? (nomina / ventas) * 100 : 0;
  const primeCost      = foodCostPct + laborCostPct;

  // ── Flujo de caja simplificado ──────────────────────────────────────────────
  const flujoOp       = ebitda - isr;
  const flujoInv      = -depTotal; // proxy: dep ~ cap expenditures
  const flujoFin      = -gastosFinanc;
  const flujoNeto     = flujoOp + flujoInv + flujoFin;

  // ── Export CSV ───────────────────────────────────────────────────────────────
  const exportCSV = () => {
    let rows: string[][];
    if (plView === 'horizontal' && hData) {
      const { months: hMonths, rows: hRows, getVal: hGetVal } = hData;
      const totals: MonthData = hMonths.reduce((acc, m) => ({
        label:'Total', ventas:acc.ventas+m.ventas, descuentos:acc.descuentos+m.descuentos,
        iva:acc.iva+m.iva, cogs:acc.cogs+m.cogs, merma:acc.merma+m.merma,
        nomina:acc.nomina+m.nomina, gastosOp:acc.gastosOp+m.gastosOp,
        depreciacion:acc.depreciacion+m.depreciacion, financiero:acc.financiero+m.financiero,
      }), { label:'Total', ventas:0, descuentos:0, iva:0, cogs:0, merma:0, nomina:0, gastosOp:0, depreciacion:0, financiero:0 });
      const header = ['Concepto', ...hMonths.map(m => m.label), `Total ${numMonths}m`];
      const dataRows = hRows
        .filter(r => r.tipo !== 'header')
        .map(r => [r.label, ...hMonths.map(m => hGetVal(r, m).toFixed(2)), hGetVal(r, totals).toFixed(2)]);
      rows = [header, ...dataRows];
    } else {
      rows = [
        ['Concepto','Monto'],
        ...plRows.filter(r=>r.tipo!=='divider').map(r=>[r.concepto, r.monto.toFixed(2)]),
        ['---','---'],
        ['BALANCE SHEET',''],
        ...bsActivos.filter(r=>r.tipo!=='divider').map(r=>[r.concepto, r.monto.toFixed(2)]),
        ...bsPasivos.filter(r=>r.tipo!=='divider').map(r=>[r.concepto, r.monto.toFixed(2)]),
      ];
    }
    const csv = rows.map(r=>r.join(',')).join('\n');
    const a = document.createElement('a');
    a.href = 'data:text/csv;charset=utf-8,\uFEFF' + encodeURIComponent(csv);
    a.download = plView === 'horizontal'
      ? `pl-horizontal-${numMonths}m-${new Date().toISOString().slice(0,7)}.csv`
      : `analisis-financiero-${dateRange.label.replace(/ /g,'-')}.csv`;
    a.click();
  };

  // ── Export PDF ───────────────────────────────────────────────────────────────
  const exportPDF = () => {
    // Build printable HTML document and open print dialog
    const restaurantLabel = dateRange.label;
    const fmt2 = (n: number) => n.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const color = (n: number) => n >= 0 ? '#15803d' : '#dc2626';
    const pct = (n: number) => (n >= 0 ? '+' : '') + n.toFixed(1) + '%';

    const kpiRow = (label: string, value: string, sub: string, col: string) =>
      `<div class="kpi"><div class="kpi-label">${label}</div><div class="kpi-value" style="color:${col}">$${value}</div><div class="kpi-sub">${sub}</div></div>`;

    const plHtml = plRows.filter(r => r.tipo !== 'divider').map(r => {
      if (r.tipo === 'header') return `<tr class="tr-header"><td colspan="2">${r.concepto}</td></tr>`;
      const amt = r.monto === 0 && r.tipo !== 'item' ? '' : `$${fmt2(Math.abs(r.monto))}`;
      const cls = r.tipo === 'total' ? 'tr-total' : r.tipo === 'subtotal' ? 'tr-sub' : '';
      const col = r.tipo === 'total' || r.tipo === 'subtotal' ? color(r.monto) : r.monto < 0 ? '#dc2626' : '#1f2937';
      const pad = 8 + (r.indent ?? 0) * 16;
      return `<tr class="${cls}"><td style="padding-left:${pad}px">${r.concepto}${r.note ? ` <span class="note">${r.note}</span>` : ''}</td><td style="color:${col}">${amt}</td></tr>`;
    }).join('');

    const bsHtml = (rows: typeof bsActivos) => rows.filter(r => r.tipo !== 'divider').map(r => {
      if (r.tipo === 'header') return `<tr class="tr-header"><td colspan="2">${r.concepto}</td></tr>`;
      const amt = r.monto === 0 && r.tipo !== 'item' ? '' : `$${fmt2(r.monto)}`;
      const cls = r.tipo === 'total' ? 'tr-total' : '';
      const col = r.tipo === 'total' ? '#1e40af' : '#1f2937';
      const pad = 8 + (r.indent ?? 0) * 16;
      return `<tr class="${cls}"><td style="padding-left:${pad}px">${r.concepto}</td><td style="color:${col}">${amt}</td></tr>`;
    }).join('');

    // Build horizontal P&L section if active
    let horizontalHtml = '';
    if (plView === 'horizontal' && hData) {
      const { months: hMonths, rows: hRows, getVal: hGetVal } = hData;
      const fmt2h = (n: number) => n.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      const totH: MonthData = hMonths.reduce((acc, m) => ({
        label:'Total', ventas:acc.ventas+m.ventas, descuentos:acc.descuentos+m.descuentos,
        iva:acc.iva+m.iva, cogs:acc.cogs+m.cogs, merma:acc.merma+m.merma,
        nomina:acc.nomina+m.nomina, gastosOp:acc.gastosOp+m.gastosOp,
        depreciacion:acc.depreciacion+m.depreciacion, financiero:acc.financiero+m.financiero,
      }), { label:'Total', ventas:0, descuentos:0, iva:0, cogs:0, merma:0, nomina:0, gastosOp:0, depreciacion:0, financiero:0 });
      const thH = ['Concepto', ...hMonths.map((m: MonthData) => m.label), 'Total'].map(h => '<th style="padding:5px 8px;text-align:right;background:#f8fafc;font-size:10px;border-bottom:1px solid #e5e7eb">' + h + '</th>').join('');
      const bodyH = hRows.map((r: RowDef) => {
        if (r.tipo === 'header') return '<tr><td colspan="' + (hMonths.length+2) + '" style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#6b7280;padding:5px 8px;background:#f8fafc">' + r.label + '</td></tr>';
        const isTotal = r.tipo === 'total'; const isSub = r.tipo === 'sub';
        const rowStyle = isTotal ? 'background:#eff6ff;font-weight:700' : isSub ? 'font-weight:600;border-top:1px solid #d1d5db' : '';
        const indent = r.indent ? 'padding-left:18px' : 'padding:5px 8px';
        const cells = [...hMonths.map((m: MonthData) => {
          const v = hGetVal(r, m);
          const col = (isTotal || isSub) && v < 0 ? '#dc2626' : '';
          return '<td style="text-align:right;padding:5px 8px;font-size:10px' + (col ? ';color:'+col : '') + '">' + (v===0&&r.tipo!=='line'?'—':'$'+fmt2h(v)) + '</td>';
        }), '<td style="text-align:right;padding:5px 8px;font-size:10px;font-weight:700;color:#1B3A6B">$' + fmt2h(hGetVal(r, totH)) + '</td>'].join('');
        return '<tr style="' + rowStyle + '"><td style="' + indent + ';font-size:10px">' + r.label + '</td>' + cells + '</tr>';
      }).join('');
      horizontalHtml = '<h2>P&amp;L Horizontal — Últimos ' + numMonths + ' meses</h2><div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse"><thead><tr>' + thH + '</tr></thead><tbody>' + bodyH + '</tbody></table></div>';
    }

    const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>Análisis Financiero — ${restaurantLabel}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 12px; color: #1f2937; background: white; padding: 32px; }
  h1 { font-size: 22px; font-weight: 800; color: #1B3A6B; margin-bottom: 2px; }
  .subtitle { color: #6b7280; font-size: 12px; margin-bottom: 24px; }
  .kpis { display: flex; gap: 12px; margin-bottom: 28px; flex-wrap: wrap; }
  .kpi { flex: 1; min-width: 100px; border: 1px solid #e5e7eb; border-radius: 10px; padding: 12px 14px; }
  .kpi-label { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: .06em; color: #6b7280; margin-bottom: 4px; }
  .kpi-value { font-size: 18px; font-weight: 800; font-family: monospace; margin-bottom: 2px; }
  .kpi-sub { font-size: 10px; color: #9ca3af; }
  h2 { font-size: 13px; font-weight: 700; color: #1B3A6B; margin: 24px 0 10px; padding-bottom: 6px; border-bottom: 2px solid #1B3A6B; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
  td { padding: 6px 8px; font-size: 11px; border-bottom: 1px solid #f3f4f6; }
  td:last-child { text-align: right; font-family: monospace; white-space: nowrap; }
  .tr-header td { background: #f8fafc; font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: .06em; color: #6b7280; padding: 8px 8px 4px; border-bottom: none; }
  .tr-total td { background: #f0fdf4; font-weight: 700; font-size: 12px; border-top: 2px solid #e5e7eb; border-bottom: 2px solid #e5e7eb; }
  .tr-sub td { font-weight: 600; border-top: 1px solid #d1d5db; }
  .note { font-size: 9px; color: #9ca3af; }
  .cols { display: flex; gap: 16px; }
  .col { flex: 1; }
  .footer { margin-top: 32px; padding-top: 12px; border-top: 1px solid #e5e7eb; font-size: 10px; color: #9ca3af; display: flex; justify-content: space-between; }
  @media print { body { padding: 20px; } @page { margin: 15mm; size: A4; } }
</style>
</head>
<body>
<h1>Análisis Financiero</h1>
<div class="subtitle">${restaurantLabel} · Generado ${new Date().toLocaleDateString('es-MX', { weekday:'long', year:'numeric', month:'long', day:'numeric' })}</div>

<div class="kpis">
  ${kpiRow('Ventas netas', fmt2(ventas), '', '#1f2937')}
  ${kpiRow('Utilidad bruta', fmt2(utilidadBruta), pct(margenBruto) + ' margen', color(utilidadBruta))}
  ${kpiRow('EBITDA', fmt2(ebitda), pct(margenEbitda) + ' margen', color(ebitda))}
  ${kpiRow('Utilidad neta', fmt2(utilidadNeta), pct(margenNeto) + ' margen', color(utilidadNeta))}
  ${kpiRow('Prime Cost', fmt2(primeCost), foodCostPct.toFixed(1) + '% food + ' + laborCostPct.toFixed(1) + '% labor', primeCost > ventas * 0.65 ? '#dc2626' : '#15803d')}
</div>

<h2>Estado de Resultados (P&L)</h2>
<table><tbody>${plHtml}</tbody></table>

<h2>Balance General</h2>
<div class="cols">
  <div class="col">
    <strong style="font-size:11px;color:#374151">ACTIVOS</strong>
    <table><tbody>${bsHtml(bsActivos)}</tbody></table>
  </div>
  <div class="col">
    <strong style="font-size:11px;color:#374151">PASIVOS Y CAPITAL</strong>
    <table><tbody>${bsHtml(bsPasivos)}</tbody></table>
  </div>
</div>

<div class="footer">
  <span>Aldente ERP · Análisis Financiero</span>
  <span>Período: ${restaurantLabel}</span>
</div>

${horizontalHtml}

<script>window.onload = () => { window.print(); }</script>
</body>
</html>`;

    const win = window.open('', '_blank', 'width=900,height=700');
    if (win) { win.document.write(html); win.document.close(); }
  };

  const TABS = [
    { id:'pl'    as const, label:'📊 P&L — Estado de Resultados' },
    { id:'bs'    as const, label:'⚖️ Balance General' },
    { id:'flujo' as const, label:'💧 Flujo de Caja' },
  ];

  const PERIODS: { id: Period; label: string }[] = [
    { id:'mes_actual',   label:'Este mes' },
    { id:'mes_anterior', label:'Mes anterior' },
    { id:'trimestre',    label:'Trimestre' },
    { id:'anio',         label:'Este año' },
  ];

  return (
    <div style={{ background:'#f8fafc', minHeight:'100vh' }}>
      {/* ── Header ── */}
      <div style={{ background:'white', borderBottom:'1px solid #e5e7eb', padding:'20px 24px' }}>
        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', flexWrap:'wrap', gap:12 }}>
          <div>
            <h1 style={{ fontSize:20, fontWeight:800, color:'#1f2937', margin:0 }}>Análisis Financiero</h1>
            <p style={{ fontSize:13, color:'#6b7280', marginTop:4 }}>
              {dateRange.label} · Datos en tiempo real desde Supabase
            </p>
          </div>
          <div style={{ display:'flex', gap:8, alignItems:'center' }}>
            {/* Period selector */}
            <div style={{ display:'flex', gap:4, background:'#f3f4f6', borderRadius:10, padding:3 }}>
              {PERIODS.map(p => (
                <button key={p.id} onClick={() => setPeriod(p.id)}
                  style={{ padding:'6px 12px', borderRadius:8, fontSize:12, fontWeight:600, border:'none', cursor:'pointer', transition:'all .15s',
                    background: period === p.id ? '#1B3A6B' : 'transparent',
                    color: period === p.id ? 'white' : '#6b7280' }}>
                  {p.label}
                </button>
              ))}
            </div>
            <button onClick={load} style={{ padding:'8px 12px', borderRadius:8, background:'#f3f4f6', border:'none', cursor:'pointer' }}>
              <RefreshCw size={14} style={{ color:'#6b7280' }} />
            </button>
            <button onClick={exportCSV} style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 14px', borderRadius:8, background:'#16a34a', border:'none', color:'white', fontSize:12, fontWeight:600, cursor:'pointer' }}>
              <Download size={13} /> CSV
            </button>
            <button onClick={exportPDF} style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 14px', borderRadius:8, background:'#1B3A6B', border:'none', color:'white', fontSize:12, fontWeight:600, cursor:'pointer' }}>
              <Download size={13} /> PDF
            </button>
          </div>
        </div>

        {/* KPI strip */}
        <div style={{ display:'flex', gap:12, marginTop:20, flexWrap:'wrap' }}>
          <KPICard label="Ventas netas" value={`$${fmt(ventas)}`} color={ventas>0?'#15803d':'#6b7280'} />
          <KPICard label="Utilidad bruta" value={`$${fmt(utilidadBruta)}`} sub={`${margenBruto.toFixed(1)}% margen`} color={utilidadBruta>0?'#1d4ed8':'#dc2626'} />
          <KPICard label="EBITDA" value={`$${fmt(ebitda)}`} sub={`${margenEbitda.toFixed(1)}% margen`} color={ebitda>0?'#7c3aed':'#dc2626'} />
          <KPICard label="Utilidad neta" value={`$${fmt(utilidadNeta)}`} sub={`${margenNeto.toFixed(1)}% margen`} color={utilidadNeta>0?'#15803d':'#dc2626'} />
          <KPICard label="Prime Cost" value={`${primeCost.toFixed(1)}%`} sub={`Food ${foodCostPct.toFixed(1)}% + Labor ${laborCostPct.toFixed(1)}%`} color={primeCost<65?'#15803d':primeCost<75?'#d97706':'#dc2626'} />
        </div>

        {/* Alerts */}
        <div style={{ display:'flex', gap:8, marginTop:12, flexWrap:'wrap' }}>
          {primeCost > 75 && (
            <div style={{ display:'flex', alignItems:'center', gap:6, padding:'6px 12px', borderRadius:8, background:'#fef2f2', border:'1px solid #fecaca', fontSize:11, color:'#dc2626' }}>
              <AlertTriangle size={11} /> Prime Cost alto ({primeCost.toFixed(1)}%) — industria ideal: 55–65%
            </div>
          )}
          {margenNeto < 5 && ventas > 0 && (
            <div style={{ display:'flex', alignItems:'center', gap:6, padding:'6px 12px', borderRadius:8, background:'#fef2f2', border:'1px solid #fecaca', fontSize:11, color:'#dc2626' }}>
              <AlertTriangle size={11} /> Margen neto muy bajo ({margenNeto.toFixed(1)}%) — restaurantes saludables: 10–15%
            </div>
          )}
          {margenNeto >= 10 && ventas > 0 && (
            <div style={{ display:'flex', alignItems:'center', gap:6, padding:'6px 12px', borderRadius:8, background:'#f0fdf4', border:'1px solid #bbf7d0', fontSize:11, color:'#15803d' }}>
              <CheckCircle size={11} /> Margen neto saludable ({margenNeto.toFixed(1)}%) — buen control de costos
            </div>
          )}
          {cortesias > 0 && (
            <div style={{ display:'flex', alignItems:'center', gap:6, padding:'6px 12px', borderRadius:8, background:'#f5f3ff', border:'1px solid #ddd6fe', fontSize:11, color:'#7c3aed' }}>
              <Info size={11} /> {cortesias} cortesías registradas en el período
            </div>
          )}
        </div>
      </div>

      {/* ── Sub-tabs ── */}
      <div style={{ background:'white', borderBottom:'1px solid #e5e7eb', padding:'0 24px', display:'flex', gap:0 }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            style={{ padding:'12px 20px', fontSize:13, fontWeight:600, border:'none', borderBottom: activeTab===t.id ? '2px solid #1B3A6B' : '2px solid transparent', background:'none', color: activeTab===t.id ? '#1B3A6B' : '#6b7280', cursor:'pointer', transition:'all .15s' }}>
            {t.label}
          </button>
        ))}
      </div>

      {loading && (
        <div style={{ textAlign:'center', padding:'60px 0', color:'#9ca3af', fontSize:13 }}>
          Cargando datos financieros…
        </div>
      )}

      {!loading && (
        <div style={{ padding:24 }}>

          {/* ── P&L ── */}
          {activeTab === 'pl' && (
            <div style={{ display:'grid', gridTemplateColumns:'1fr 340px', gap:20, alignItems:'start' }}>
              <div style={{ background:'white', borderRadius:12, border:'1px solid #e5e7eb', overflow:'hidden' }}>
                <div style={{ padding:'16px 20px', borderBottom:'1px solid #e5e7eb', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                  <div>
                    <h2 style={{ fontSize:15, fontWeight:700, color:'#1f2937', margin:0 }}>Estado de Resultados</h2>
                    <p style={{ fontSize:11, color:'#9ca3af', marginTop:2 }}>{plView === 'vertical' ? dateRange.label + ' · NIF B-3' : 'Últimos 6 meses · análisis horizontal'}</p>
                  </div>
                  <div style={{ display:'flex', gap:4, background:'#f3f4f6', borderRadius:8, padding:3 }}>
                    <button onClick={() => setPlView('vertical')}
                      style={{ display:'flex', alignItems:'center', gap:5, padding:'5px 12px', borderRadius:6, fontSize:11, fontWeight:600, border:'none', cursor:'pointer', transition:'all .15s',
                        background: plView==='vertical' ? '#1B3A6B' : 'transparent',
                        color: plView==='vertical' ? 'white' : '#6b7280' }}>
                      <span style={{ fontSize:12 }}>≡</span> Vertical
                    </button>
                    <button onClick={() => setPlView('horizontal')}
                      style={{ display:'flex', alignItems:'center', gap:5, padding:'5px 12px', borderRadius:6, fontSize:11, fontWeight:600, border:'none', cursor:'pointer', transition:'all .15s',
                        background: plView==='horizontal' ? '#1B3A6B' : 'transparent',
                        color: plView==='horizontal' ? 'white' : '#6b7280' }}>
                      <BarChart2 size={11} /> Horizontal
                    </button>
                  </div>
                  {plView === 'horizontal' && (
                    <div style={{ display:'flex', gap:4, background:'#f3f4f6', borderRadius:8, padding:3 }}>
                      {[3,6,12,24].map(n => (
                        <button key={n} onClick={() => setNumMonths(n)}
                          style={{ padding:'4px 10px', borderRadius:6, fontSize:11, fontWeight:600, border:'none', cursor:'pointer',
                            background: numMonths===n ? '#1B3A6B' : 'transparent',
                            color: numMonths===n ? 'white' : '#6b7280' }}>
                          {n}m
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {plView === 'vertical' ? (
                  <table style={{ width:'100%', borderCollapse:'collapse' }}>
                    <tbody>
                      {plRows.map((row, i) => <React.Fragment key={i}><PLRowComp row={row as PLRow} /></React.Fragment>)}
                    </tbody>
                  </table>
                ) : (
                  <div style={{ padding:20 }}>
                    <PLHorizontal tenantId={appUser?.tenantId ?? getTenantId() ?? ''} numMonths={numMonths} onDataReady={(m, r, g) => setHData({ months: m, rows: r, getVal: g })} />
                  </div>
                )}
              </div>

              {/* Sidebar: ratios & breakdown */}
              <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
                <div style={{ background:'white', borderRadius:12, border:'1px solid #e5e7eb', padding:16 }}>
                  <div style={{ fontSize:12, fontWeight:700, color:'#6b7280', marginBottom:12, textTransform:'uppercase', letterSpacing:'.06em' }}>Estructura de costos</div>
                  {[
                    { label:'Food Cost',   pct: foodCostPct,  ideal:'28–35%', ok: foodCostPct<=35 },
                    { label:'Labor Cost',  pct: laborCostPct, ideal:'25–35%', ok: laborCostPct<=35 },
                    { label:'Prime Cost',  pct: primeCost,    ideal:'55–65%', ok: primeCost<=65 },
                    { label:'Overhead',    pct: ventas>0?(totalGastosOp-nomina)/ventas*100:0, ideal:'<20%', ok: ventas>0&&(totalGastosOp-nomina)/ventas*100<=20 },
                    { label:'Margen EBITDA', pct: margenEbitda, ideal:'>15%', ok: margenEbitda>=15 },
                    { label:'Margen neto', pct: margenNeto,   ideal:'>10%', ok: margenNeto>=10 },
                  ].map(({ label, pct, ideal, ok }) => (
                    <div key={label} style={{ marginBottom:10 }}>
                      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:3 }}>
                        <span style={{ fontSize:12, color:'#374151' }}>{label}</span>
                        <span style={{ fontSize:12, fontWeight:700, color: ok?'#15803d':'#dc2626', fontFamily:'monospace' }}>{pct.toFixed(1)}%</span>
                      </div>
                      <div style={{ height:5, borderRadius:3, background:'#f3f4f6', overflow:'hidden' }}>
                        <div style={{ height:'100%', width:`${Math.min(pct,100)}%`, background: ok?'#16a34a':'#dc2626', borderRadius:3 }} />
                      </div>
                      <div style={{ fontSize:10, color:'#9ca3af', marginTop:1 }}>Ideal: {ideal}</div>
                    </div>
                  ))}
                </div>

                <div style={{ background:'white', borderRadius:12, border:'1px solid #e5e7eb', padding:16 }}>
                  <div style={{ fontSize:12, fontWeight:700, color:'#6b7280', marginBottom:12, textTransform:'uppercase', letterSpacing:'.06em' }}>Forma de cobro</div>
                  {[
                    { label:'Efectivo', monto: ventasEfec, color:'#16a34a' },
                    { label:'Tarjeta',  monto: ventasTarj, color:'#1d4ed8' },
                    { label:'Cortesías (sin cobro)', monto: cortesias, color:'#7c3aed', isCnt: true },
                  ].map(({ label, monto, color, isCnt }) => (
                    <div key={label} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'6px 0', borderBottom:'1px solid #f3f4f6' }}>
                      <span style={{ fontSize:12, color:'#374151' }}>{label}</span>
                      <span style={{ fontSize:13, fontWeight:700, color, fontFamily:'monospace' }}>{isCnt ? `${monto} veces` : `$${fmt(monto as number)}`}</span>
                    </div>
                  ))}
                </div>

                {gastosOp.filter(g => g.metodo === 'credito').length > 0 && (
                  <div style={{ background:'#fffbeb', borderRadius:12, border:'1px solid #fde68a', padding:16 }}>
                    <div style={{ fontSize:12, fontWeight:700, color:'#92400e', marginBottom:8, display:'flex', alignItems:'center', gap:6 }}>
                      <AlertTriangle size={12}/> Cuentas por pagar (CxP)
                    </div>
                    {gastosOp.filter(g => g.metodo === 'credito').map((g, i) => (
                      <div key={i} style={{ display:'flex', justifyContent:'space-between', fontSize:11, color:'#78350f', padding:'3px 0' }}>
                        <span>{g.proveedor || g.nombre}</span>
                        <span style={{ fontFamily:'monospace' }}>${fmt(g.monto)} · {g.dias_credito}d</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Balance Sheet ── */}
          {activeTab === 'bs' && (
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20, alignItems:'start' }}>
              <div style={{ background:'white', borderRadius:12, border:'1px solid #e5e7eb', overflow:'hidden' }}>
                <div style={{ padding:'14px 18px', borderBottom:'1px solid #e5e7eb', background:'#eff6ff' }}>
                  <div style={{ fontSize:13, fontWeight:700, color:'#1e40af' }}>ACTIVOS</div>
                  <div style={{ fontSize:11, color:'#6b7280', marginTop:2 }}>Lo que tiene el negocio</div>
                </div>
                <table style={{ width:'100%', borderCollapse:'collapse' }}>
                  <tbody>{bsActivos.map((r, i) => <React.Fragment key={i}><BSRowComp row={r as BSRow} /></React.Fragment>)}</tbody>
                </table>
              </div>
              <div style={{ background:'white', borderRadius:12, border:'1px solid #e5e7eb', overflow:'hidden' }}>
                <div style={{ padding:'14px 18px', borderBottom:'1px solid #e5e7eb', background:'#fef2f2' }}>
                  <div style={{ fontSize:13, fontWeight:700, color:'#dc2626' }}>PASIVOS Y CAPITAL</div>
                  <div style={{ fontSize:11, color:'#6b7280', marginTop:2 }}>Lo que debe + patrimonio</div>
                </div>
                <table style={{ width:'100%', borderCollapse:'collapse' }}>
                  <tbody>{bsPasivos.map((r, i) => <React.Fragment key={i}><BSRowComp row={r as BSRow} /></React.Fragment>)}</tbody>
                </table>
              </div>

              {/* Ratios card */}
              <div style={{ gridColumn:'1/-1', background:'white', borderRadius:12, border:'1px solid #e5e7eb', padding:20 }}>
                <div style={{ fontSize:12, fontWeight:700, color:'#6b7280', marginBottom:16, textTransform:'uppercase', letterSpacing:'.06em' }}>Razones financieras</div>
                <div style={{ display:'flex', gap:20, flexWrap:'wrap' }}>
                  {[
                    { label:'Liquidez corriente', value: ratioLiquidez, format: (v:number)=>v.toFixed(2)+'x', ok: (v:number)=>v>=1.5, ideal:'≥ 1.5x — cubres deudas corto plazo' },
                    { label:'Capital de trabajo', value: totalActCirc - totalPasivoCirc, format: (v:number)=>'$'+fmt(v), ok:(v:number)=>v>=0, ideal:'Positivo = margen de maniobra' },
                    { label:'Apalancamiento', value: totalPasivos>0?totalPasivos/totalActivos:0, format:(v:number)=>(v*100).toFixed(1)+'%', ok:(v:number)=>v<0.6, ideal:'<60% — deuda manejable' },
                    { label:'Margen neto', value: margenNeto, format:(v:number)=>v.toFixed(1)+'%', ok:(v:number)=>v>=10, ideal:'≥10% — restaurante saludable' },
                  ].map(({ label, value, format, ok, ideal }) => (
                    <div key={label} style={{ flex:1, minWidth:160, padding:'12px 16px', borderRadius:10, background: value !== null && ok(value as number) ? '#f0fdf4' : '#fef2f2', border:`1px solid ${value!==null&&ok(value as number)?'#bbf7d0':'#fecaca'}` }}>
                      <div style={{ fontSize:11, color:'#6b7280', marginBottom:4 }}>{label}</div>
                      <div style={{ fontSize:20, fontWeight:800, fontFamily:'monospace', color: value!==null&&ok(value as number)?'#15803d':'#dc2626' }}>
                        {value !== null ? format(value as number) : '—'}
                      </div>
                      <div style={{ fontSize:10, color:'#9ca3af', marginTop:4 }}>{ideal}</div>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop:14, padding:'10px 14px', borderRadius:8, background:'#f8fafc', fontSize:11, color:'#6b7280', border:'1px solid #e5e7eb' }}>
                  <strong>Nota:</strong> El Balance Sheet usa ventas en efectivo/tarjeta como proxy de caja y banco, e inventario valorado a costo. Para un Balance Sheet auditado, complementa con saldos bancarios reales, cuentas por cobrar y pasivos a largo plazo con tu contador.
                </div>
              </div>
            </div>
          )}

          {/* ── Flujo de Caja ── */}
          {activeTab === 'flujo' && (
            <div style={{ display:'grid', gridTemplateColumns:'1fr 340px', gap:20, alignItems:'start' }}>
              <div style={{ background:'white', borderRadius:12, border:'1px solid #e5e7eb', overflow:'hidden' }}>
                <div style={{ padding:'14px 18px', borderBottom:'1px solid #e5e7eb' }}>
                  <h2 style={{ fontSize:15, fontWeight:700, color:'#1f2937', margin:0 }}>Flujo de Caja Simplificado</h2>
                  <p style={{ fontSize:11, color:'#9ca3af', marginTop:2 }}>Método indirecto · {dateRange.label}</p>
                </div>
                <table style={{ width:'100%', borderCollapse:'collapse' }}>
                  <tbody>
                    {[
                      { concepto:'ACTIVIDADES OPERATIVAS', monto:0, tipo:'header' as const },
                      { concepto:'EBITDA (resultado operativo)', monto: ebitda, tipo:'item' as const, indent:1 },
                      { concepto:'ISR estimado pagado', monto: -isr, tipo:'item' as const, indent:1 },
                      { concepto:'Flujo operativo neto', monto: flujoOp, tipo:'total' as const },
                      { concepto:'', monto:0, tipo:'divider' as const },
                      { concepto:'ACTIVIDADES DE INVERSIÓN', monto:0, tipo:'header' as const },
                      { concepto:'Depreciación (ajuste no-caja)', monto: depTotal, tipo:'item' as const, indent:1 },
                      { concepto:'Flujo de inversión', monto: flujoInv, tipo:'total' as const },
                      { concepto:'', monto:0, tipo:'divider' as const },
                      { concepto:'ACTIVIDADES FINANCIERAS', monto:0, tipo:'header' as const },
                      { concepto:'Gastos financieros (intereses)', monto: -gastosFinanc, tipo:'item' as const, indent:1 },
                      { concepto:'Flujo financiero', monto: flujoFin, tipo:'total' as const },
                      { concepto:'', monto:0, tipo:'divider' as const },
                      { concepto:'💧 FLUJO DE CAJA NETO', monto: flujoNeto, tipo:'total' as const },
                    ].map((row, i) => <React.Fragment key={i}><PLRowComp row={row as PLRow} /></React.Fragment>)}
                  </tbody>
                </table>
              </div>

              <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
                <div style={{ background: flujoNeto >= 0 ? '#f0fdf4' : '#fef2f2', borderRadius:12, border:`1px solid ${flujoNeto>=0?'#bbf7d0':'#fecaca'}`, padding:20 }}>
                  <div style={{ fontSize:11, color:'#6b7280', marginBottom:6 }}>Flujo neto del período</div>
                  <div style={{ fontSize:32, fontWeight:800, fontFamily:'monospace', color: flujoNeto>=0?'#15803d':'#dc2626' }}>
                    {flujoNeto >= 0 ? '+' : ''}${fmt(flujoNeto)}
                  </div>
                  <div style={{ fontSize:12, color: flujoNeto>=0?'#166534':'#991b1b', marginTop:8 }}>
                    {flujoNeto >= 0
                      ? '✓ El negocio genera más caja de la que consume.'
                      : '⚠ El negocio está consumiendo más caja de la que genera. Revisa gastos.'}
                  </div>
                </div>

                <div style={{ background:'white', borderRadius:12, border:'1px solid #e5e7eb', padding:16 }}>
                  <div style={{ fontSize:12, fontWeight:700, color:'#6b7280', marginBottom:10, textTransform:'uppercase', letterSpacing:'.06em' }}>Ventas por forma de pago</div>
                  {ventas > 0 && [
                    { label:'💵 Efectivo', monto: ventasEfec, pct: ventasEfec/ventas*100 },
                    { label:'💳 Tarjeta',  monto: ventasTarj, pct: ventasTarj/ventas*100 },
                  ].map(({ label, monto, pct }) => (
                    <div key={label} style={{ marginBottom:10 }}>
                      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:3, fontSize:12, color:'#374151' }}>
                        <span>{label}</span>
                        <span style={{ fontFamily:'monospace' }}>${fmt(monto)} ({pct.toFixed(0)}%)</span>
                      </div>
                      <div style={{ height:4, borderRadius:2, background:'#f3f4f6', overflow:'hidden' }}>
                        <div style={{ height:'100%', width:`${pct}%`, background:'#1B3A6B', borderRadius:2 }} />
                      </div>
                    </div>
                  ))}
                </div>

                <div style={{ background:'white', borderRadius:12, border:'1px solid #e5e7eb', padding:16, fontSize:11, color:'#6b7280', lineHeight:1.6 }}>
                  <strong style={{ color:'#374151' }}>Nota metodológica:</strong> Este flujo es una aproximación usando el método indirecto partiendo de EBITDA. Para el Estado de Flujo de Efectivo completo (NIF B-2) se requieren los movimientos reales de cuentas bancarias. Comparte este reporte con tu contador para el cierre fiscal.
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
