'use client';
import { useBranch } from '@/hooks/useBranch';
import { getCurrentTenantId as getTenantId } from '@/lib/tenantStore';



import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { TrendingUp, ShoppingCart, DollarSign, Users, AlertTriangle, BarChart3, Package, Award, ChevronDown } from 'lucide-react';

type Period = 'dia' | 'semana' | 'mes';

interface SalesTrend {
  label: string;
  ventas: number;
  ordenes: number;
}

interface WaiterStats {
  mesero: string;
  ordenes: number;
  total: number;
  ticketPromedio: number;
}

interface ProductStats {
  nombre: string;
  cantidad: number;
  ingresos: number;
}

interface LowStockItem {
  nombre: string;
  stock: number;
  minStock: number;
  unit: string;
}

export default function ReportesMejorados() {
  const supabase = createClient();
  const [period, setPeriod] = useState<Period>('semana');
  const [loading, setLoading] = useState(true);
  const [breakeven, setBreakeven] = useState(0);
  const [salesTrend, setSalesTrend] = useState<SalesTrend[]>([]);
  const [waiterStats, setWaiterStats] = useState<WaiterStats[]>([]);
  const [topProducts, setTopProducts] = useState<ProductStats[]>([]);
  const [bottomProducts, setBottomProducts] = useState<ProductStats[]>([]);
  const [lowStock, setLowStock] = useState<LowStockItem[]>([]);
  const [kpis, setKpis] = useState({ totalVentas: 0, ventasRestaurante: 0, ventasExtras: 0, totalOrdenes: 0, ticketPromedio: 0, totalClientes: 0, utilidadBruta: 0, mermaTotal: 0, margenPct: 0 });

  const getDateRange = useCallback((p: Period) => {
    const now = new Date();
    const end = now.toISOString();
    let start: string;
    if (p === 'dia') {
      const d = new Date(now); d.setHours(0, 0, 0, 0);
      start = d.toISOString();
    } else if (p === 'semana') {
      const d = new Date(now); d.setDate(d.getDate() - 7);
      start = d.toISOString();
    } else {
      const d = new Date(now); d.setDate(d.getDate() - 30);
      start = d.toISOString();
    }
    return { start, end };
  }, []);

  const { activeBranchId } = useBranch();

  const loadData = useCallback(async (p: Period) => {
    setLoading(true);
    try {
      const { start, end } = getDateRange(p);

      // Load closed orders
      let rpQ = supabase
        .from('orders')
        .select('id, mesero, total, subtotal, created_at, closed_at, cost_actual, margin_actual, waste_cost')
        .eq('tenant_id', getTenantId())
        .eq('status', 'cerrada')
        .eq('is_comanda', false)
        .gte('created_at', start)
        .lte('created_at', end);
      if (activeBranchId) rpQ = rpQ.eq('branch_id', activeBranchId);
      const [{ data: orders, error }, { data: extrasRows }] = await Promise.all([
        rpQ,
        supabase.from('extras_sales').select('price,qty,unit_cost').eq('tenant_id', getTenantId())
          .gte('sold_at', start).lte('sold_at', end),
      ]);
      if (error) throw error;

      const orderList = orders || [];
      const extrasList = extrasRows || [];

      // KPIs — incluye ventas de extras
      const extrasVentas = extrasList.reduce((s, e) => s + Number(e.price) * Number(e.qty ?? 1), 0);
      const extrasCogs   = extrasList.reduce((s, e) => s + Number(e.unit_cost ?? 0) * Number(e.qty ?? 1), 0);
      const totalVentas  = orderList.reduce((s, o) => s + Number(o.total), 0) + extrasVentas;
      const totalOrdenes = orderList.length;
      const ticketPromedio = totalOrdenes > 0 ? totalVentas / totalOrdenes : 0;
      const utilidadBruta = orderList.reduce((s, o) => s + Number((o as any).margin_actual ?? 0), 0) + (extrasVentas - extrasCogs);
      // Merma comes from cancelled comandas, not from closed orders
      const { data: mermaRows } = await supabase
        .from('orders')
        .select('waste_cost')
        .eq('tenant_id', getTenantId())
        .eq('status', 'cancelada')
        .eq('cancel_type', 'con_costo')
        .gte('updated_at', start)
        .lte('updated_at', end + 'T23:59:59');
      const mermaTotal = (mermaRows || []).reduce((s, o) => s + Number((o as any).waste_cost ?? 0), 0);
      const margenPct = totalVentas > 0 ? (utilidadBruta / totalVentas) * 100 : 0;
      const ventasRestaurante = orderList.reduce((s, o) => s + Number(o.total), 0);
      setKpis({ totalVentas, ventasRestaurante, ventasExtras: extrasVentas, totalOrdenes, ticketPromedio, totalClientes: totalOrdenes, utilidadBruta, mermaTotal, margenPct });

      // Sales trend
      const trendMap: Record<string, { ventas: number; ordenes: number }> = {};
      orderList.forEach(o => {
        const date = new Date(o.created_at);
        let key: string;
        if (p === 'dia') {
          key = `${String(date.getHours()).padStart(2, '0')}:00`;
        } else if (p === 'semana') {
          key = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'][date.getDay()];
        } else {
          key = `${date.getDate()}/${date.getMonth() + 1}`;
        }
        if (!trendMap[key]) trendMap[key] = { ventas: 0, ordenes: 0 };
        trendMap[key].ventas += Number(o.total);
        trendMap[key].ordenes += 1;
      });
      // Breakeven: sum fixed costs for the period
      const { data: empData } = await supabase.from('employees').select('salary, salary_frequency').eq('tenant_id', getTenantId()).eq('status', 'activo');
      const { data: gastosData } = await supabase.from('gastos_recurrentes').select('monto, frecuencia').eq('tenant_id', getTenantId()).eq('activo', true);
      const monthlyPayroll = (empData || []).reduce((s: number, e: any) => {
        const sal = Number(e.salary ?? 0);
        const freq = e.salary_frequency ?? 'mensual';
        return s + (freq === 'mensual' ? sal : freq === 'quincenal' ? sal*2 : sal*4.33);
      }, 0);
      const FREC: Record<string, number> = { diario:1/30, semanal:1/4.33, quincenal:0.5, mensual:1, bimestral:2, trimestral:3, semestral:6, anual:12 };
      const monthlyGastos = (gastosData || []).reduce((s: number, g: any) => s + Number(g.monto) / (FREC[g.frecuencia] ?? 1), 0);
      const days = (period as string) === 'hoy' ? 1 : (period as string) === 'semana' ? 7 : 30;
      const periodFactor = days / 30;
      const totalFixedCosts = Math.round((monthlyPayroll + monthlyGastos) * periodFactor);
      const avgCogsRatio = totalVentas > 0 ? (orderList.reduce((s,o)=>s+Number((o as any).cost_actual??0),0) / totalVentas) : 0.20;
      const breakevenVal = totalFixedCosts > 0 ? Math.round(totalFixedCosts / Math.max(0.1, 1 - avgCogsRatio)) : 0;
      setBreakeven(breakevenVal);
      setSalesTrend(Object.entries(trendMap).map(([label, v]) => ({ label, ...v, meta: Math.round(breakevenVal / (trendMap[label] ? Object.keys(trendMap).length : 1)) })));

      // Waiter stats
      const waiterMap: Record<string, { ordenes: number; total: number }> = {};
      orderList.forEach(o => {
        const w = o.mesero || 'Sin asignar';
        if (!waiterMap[w]) waiterMap[w] = { ordenes: 0, total: 0 };
        waiterMap[w].ordenes += 1;
        waiterMap[w].total += Number(o.total);
      });
      setWaiterStats(
        Object.entries(waiterMap)
          .map(([mesero, v]) => ({ mesero, ...v, ticketPromedio: v.ordenes > 0 ? v.total / v.ordenes : 0 }))
          .sort((a, b) => b.total - a.total)
      );

      // Product stats from order_items
      const orderIds = orderList.map(o => o.id);
      if (orderIds.length > 0) {
        const { data: items } = await supabase
          .from('order_items')
          .select('name, qty, price')
        .eq('tenant_id', getTenantId())
          .in('order_id', orderIds.slice(0, 100)); // limit for performance

        const productMap: Record<string, { cantidad: number; ingresos: number }> = {};
        (items || []).forEach((item: any) => {
          const n = item.name;
          if (!productMap[n]) productMap[n] = { cantidad: 0, ingresos: 0 };
          productMap[n].cantidad += item.qty;
          productMap[n].ingresos += item.qty * Number(item.price);
        });
        const sorted = Object.entries(productMap)
          .map(([nombre, v]) => ({ nombre, ...v }))
          .sort((a, b) => b.cantidad - a.cantidad);
        setTopProducts(sorted.slice(0, 8));
        setBottomProducts(sorted.slice(-5).reverse());
      } else {
        setTopProducts([]);
        setBottomProducts([]);
      }

      // Low stock
      const { data: ingredients } = await supabase
        .from('ingredients')
        .select('name, stock, min_stock, unit')
        .eq('tenant_id', getTenantId())
        .order('stock');
      const low = (ingredients || [])
        .filter((i: any) => Number(i.stock) <= Number(i.min_stock))
        .map((i: any) => ({ nombre: i.name, stock: Number(i.stock), minStock: Number(i.min_stock), unit: i.unit }));
      setLowStock(low);
    } catch (err: any) {
      toast.error('Error al cargar reportes: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [supabase, getDateRange]);

  useEffect(() => { loadData(period); }, [period, loadData]);

  const PERIOD_LABELS: Record<Period, string> = { dia: 'Hoy', semana: 'Esta Semana', mes: 'Este Mes' };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: '#f59e0b' }} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Period selector */}
      <div className="flex gap-2">
        {(['dia', 'semana', 'mes'] as Period[]).map(p => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${period === p ? 'text-white' : 'text-gray-600 bg-white border border-gray-200 hover:bg-gray-50'}`}
            style={period === p ? { backgroundColor: '#1B3A6B' } : {}}
          >
            {PERIOD_LABELS[p]}
          </button>
        ))}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Ventas Totales', value: `$${kpis.totalVentas.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`, icon: DollarSign, color: '#10b981' },
          ...(kpis.ventasExtras > 0 ? [
            { label: '↳ Restaurante', value: `$${kpis.ventasRestaurante.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`, icon: DollarSign, color: '#6ee7b7' },
            { label: '↳ Tienda extras', value: `$${kpis.ventasExtras.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`, icon: DollarSign, color: '#a78bfa' },
          ] : []),
          { label: 'Órdenes', value: kpis.totalOrdenes, icon: ShoppingCart, color: '#1B3A6B' },
          { label: 'Ticket Promedio', value: `$${kpis.ticketPromedio.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`, icon: TrendingUp, color: '#f59e0b' },
          { label: 'Utilidad Bruta', value: kpis.utilidadBruta > 0 ? `$${kpis.utilidadBruta.toFixed(2)}` : '—', icon: TrendingUp, color: '#16a34a' },
          { label: '⚠️ Merma', value: kpis.mermaTotal > 0 ? `$${kpis.mermaTotal.toFixed(2)}` : '$0.00', icon: TrendingUp, color: kpis.mermaTotal > 0 ? '#dc2626' : '#9ca3af' },
          { label: 'Alertas Inventario', value: lowStock.length, icon: AlertTriangle, color: lowStock.length > 0 ? '#ef4444' : '#6b7280' },
        ].map(k => (
          <div key={k.label} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: k.color + '15' }}>
              <k.icon size={20} style={{ color: k.color }} />
            </div>
            <div>
              <p className="text-xs text-gray-500">{k.label}</p>
              <p className="text-lg font-bold text-gray-800">{k.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Sales Trend Chart */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <BarChart3 size={18} style={{ color: '#1B3A6B' }} />
          Tendencia de Ventas — {(PERIOD_LABELS as any)[period]}
        </h3>
        {breakeven > 0 && <p className="text-xs mb-3" style={{color:'#9ca3af'}}>Meta de equilibrio: <strong style={{color:'#6b7280'}}>${breakeven.toLocaleString('es-MX')}</strong> — debes superar esto para ser rentable</p>}
        {salesTrend.length === 0 ? (
          <div className="h-48 flex items-center justify-center text-gray-400 text-sm">Sin datos para el período seleccionado</div>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={salesTrend}>
              <defs>
                <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#1B3A6B" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#1B3A6B" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: any) => [`$${Number(v).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`, 'Ventas']} />
              <Area type="monotone" dataKey="ventas" stroke="#1B3A6B" fill="url(#salesGrad)" strokeWidth={2} />
              {breakeven > 0 && <Area type="monotone" dataKey="meta" stroke="#9ca3af" fill="none" strokeWidth={1.5} strokeDasharray="5 5" dot={false} />}
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Waiter performance */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Users size={18} style={{ color: '#f59e0b' }} />
            Ticket Promedio por Mesero
          </h3>
          {waiterStats.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">Sin datos</p>
          ) : (
            <div className="space-y-3">
              {waiterStats.map((w, i) => (
                <div key={w.mesero} className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0" style={{ backgroundColor: i === 0 ? '#f59e0b' : i === 1 ? '#9ca3af' : '#cd7f32' }}>
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-800 truncate">{w.mesero}</span>
                      <span className="text-sm font-bold text-gray-800">${w.ticketPromedio.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                        <div className="h-1.5 rounded-full" style={{ width: `${Math.min(100, (w.total / (waiterStats[0]?.total || 1)) * 100)}%`, backgroundColor: '#1B3A6B' }} />
                      </div>
                      <span className="text-xs text-gray-400">{w.ordenes} órd.</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Low stock alerts */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <AlertTriangle size={18} className="text-red-500" />
            Alertas de Inventario Bajo
            {lowStock.length > 0 && (
              <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-red-50 text-red-600 font-medium">{lowStock.length} alertas</span>
            )}
          </h3>
          {lowStock.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Package size={32} className="text-green-400 mb-2" />
              <p className="text-sm text-green-600 font-medium">Inventario en niveles óptimos</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {lowStock.map(item => (
                <div key={item.nombre} className="flex items-center gap-3 p-2 rounded-lg bg-red-50">
                  <AlertTriangle size={14} className="text-red-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{item.nombre}</p>
                    <p className="text-xs text-red-600">Stock: {item.stock} {item.unit} / Mín: {item.minStock} {item.unit}</p>
                  </div>
                  <div className="w-16 bg-gray-200 rounded-full h-1.5 flex-shrink-0">
                    <div className="h-1.5 rounded-full bg-red-500" style={{ width: `${Math.min(100, (item.stock / (item.minStock || 1)) * 100)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Top & Bottom products */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Award size={18} style={{ color: '#10b981' }} />
            Productos Más Vendidos
          </h3>
          {topProducts.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">Sin datos de ventas</p>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={topProducts.slice(0, 6)} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10 }} />
                <YAxis type="category" dataKey="nombre" tick={{ fontSize: 10 }} width={120} />
                <Tooltip formatter={(v: any) => [v, 'Unidades']} />
                <Bar dataKey="cantidad" fill="#10b981" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <ChevronDown size={18} className="text-red-500" />
            Productos Menos Vendidos
          </h3>
          {bottomProducts.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">Sin datos de ventas</p>
          ) : (
            <div className="space-y-2">
              {bottomProducts.map((p, i) => (
                <div key={p.nombre} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50">
                  <span className="text-xs font-bold text-gray-400 w-5">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-800 truncate">{p.nombre}</p>
                    <p className="text-xs text-gray-400">${p.ingresos.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</p>
                  </div>
                  <span className="text-sm font-medium text-red-500">{p.cantidad} uds.</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
