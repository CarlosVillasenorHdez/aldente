'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { getCurrentTenantId as getTenantId } from '@/lib/tenantStore';
import { TrendingUp, TrendingDown, Package, ChefHat, DollarSign, AlertTriangle, Star, BarChart2 } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface IngredientAnalytics {
  id: string;
  name: string;
  unit: string;
  category: string;
  stock: number;
  minStock: number;
  cost: number;
  supplier: string;
  totalConsumed: number;       // unidades consumidas en período
  totalWasted: number;         // unidades desperdiciadas
  wasteRate: number;           // % desperdicio
  stockValue: number;          // stock actual × costo
  dishCount: number;           // cuántos platillos lo usan
  avgDailyUse: number;         // uso promedio diario
  daysOfStock: number;         // días de stock restantes
  costImpact: number;          // costo total consumido en período
}

interface DishAnalytics {
  id: string;
  name: string;
  category: string;
  emoji: string;
  price: number;
  foodCost: number;            // costo de ingredientes
  margin: number;              // margen bruto
  marginPct: number;           // % margen
  ingredientCount: number;
  unitsSold: number;           // vendidos en período (desde order_items)
  revenue: number;             // ingreso generado
  profitGenerated: number;     // utilidad generada
  topIngredient: string;       // ingrediente de mayor costo
}

type Period = '7d' | '30d' | '90d';

const PERIOD_LABELS: Record<Period, string> = {
  '7d': '7 días', '30d': '30 días', '90d': '90 días',
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function AnalyticaInventario() {
  const supabase = createClient();
  const [period, setPeriod] = useState<Period>('30d');
  const [activeView, setActiveView] = useState<'insumos' | 'platillos'>('insumos');
  const [ingData, setIngData] = useState<IngredientAnalytics[]>([]);
  const [dishData, setDishData] = useState<DishAnalytics[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortIng, setSortIng] = useState<keyof IngredientAnalytics>('costImpact');
  const [sortDish, setSortDish] = useState<keyof DishAnalytics>('profitGenerated');
  const [sortDir, setSortDir] = useState<'desc' | 'asc'>('desc');

  const getDaysBack = (p: Period) => p === '7d' ? 7 : p === '30d' ? 30 : 90;

  const fetchData = useCallback(async () => {
    setLoading(true);
    const tid = getTenantId();
    const since = new Date(Date.now() - getDaysBack(period) * 86400000).toISOString();

    // ── Ingredientes ──────────────────────────────────────────────────────────
    const [{ data: ings }, { data: movements }, { data: recipes }, { data: orderItems }] = await Promise.all([
      supabase.from('ingredients').select('id, name, unit, category, stock, min_stock, cost, supplier').eq('tenant_id', tid).order('name'),
      supabase.from('stock_movements').select('ingredient_id, movement_type, quantity').eq('tenant_id', tid).gte('created_at', since),
      supabase.from('recipe_ingredients').select('ingredient_id, dish_id, quantity').eq('tenant_id', tid),
      supabase.from('order_items').select('dish_id, qty, price').eq('tenant_id', tid).gte('created_at', since),
    ]);

    const ingMap = new Map<string, { consumed: number; wasted: number }>();
    (movements || []).forEach((m: any) => {
      const cur = ingMap.get(m.ingredient_id) ?? { consumed: 0, wasted: 0 };
      if (m.movement_type === 'salida') cur.consumed += Number(m.quantity);
      if (m.movement_type === 'merma') cur.wasted += Number(m.quantity);
      ingMap.set(m.ingredient_id, cur);
    });

    // Count dishes per ingredient
    const ingDishCount = new Map<string, Set<string>>();
    (recipes || []).forEach((r: any) => {
      if (!ingDishCount.has(r.ingredient_id)) ingDishCount.set(r.ingredient_id, new Set());
      ingDishCount.get(r.ingredient_id)!.add(r.dish_id);
    });

    const days = getDaysBack(period);
    const ingAnalytics: IngredientAnalytics[] = (ings || []).map((i: any) => {
      const mv = ingMap.get(i.id) ?? { consumed: 0, wasted: 0 };
      const total = mv.consumed + mv.wasted;
      const wasteRate = total > 0 ? (mv.wasted / total) * 100 : 0;
      const avgDaily = mv.consumed / days;
      const daysLeft = avgDaily > 0 ? Math.floor(i.stock / avgDaily) : 999;
      return {
        id: i.id, name: i.name, unit: i.unit, category: i.category,
        stock: Number(i.stock), minStock: Number(i.min_stock), cost: Number(i.cost),
        supplier: i.supplier || '—',
        totalConsumed: mv.consumed, totalWasted: mv.wasted,
        wasteRate, stockValue: Number(i.stock) * Number(i.cost),
        dishCount: ingDishCount.get(i.id)?.size ?? 0,
        avgDailyUse: avgDaily, daysOfStock: daysLeft,
        costImpact: mv.consumed * Number(i.cost),
      };
    });

    setIngData(ingAnalytics);

    // ── Platillos ─────────────────────────────────────────────────────────────
    const { data: dishes } = await supabase.from('dishes').select('id, name, category, emoji, price').eq('tenant_id', tid).order('name');

    // Sales per dish
    const salesMap = new Map<string, { qty: number; revenue: number }>();
    (orderItems || []).forEach((oi: any) => {
      const cur = salesMap.get(oi.dish_id) ?? { qty: 0, revenue: 0 };
      cur.qty += Number(oi.qty);
      cur.revenue += Number(oi.price) * Number(oi.qty);
      salesMap.set(oi.dish_id, cur);
    });

    // Recipe cost per dish
    const recipeMap = new Map<string, { cost: number; topIng: string; count: number }>();
    (recipes || []).forEach((r: any) => {
      const ing = (ings || []).find((i: any) => i.id === r.ingredient_id);
      if (!ing) return;
      const ingCost = Number(r.quantity) * Number(ing.cost);
      const cur = recipeMap.get(r.dish_id) ?? { cost: 0, topIng: '', count: 0 };
      cur.cost += ingCost;
      cur.count += 1;
      if (!cur.topIng || ingCost > (recipeMap.get(r.dish_id)?.cost ?? 0) / 2) cur.topIng = ing.name;
      recipeMap.set(r.dish_id, cur);
    });

    const dishAnalytics: DishAnalytics[] = (dishes || []).map((d: any) => {
      const recipe = recipeMap.get(d.id) ?? { cost: 0, topIng: '—', count: 0 };
      const sales = salesMap.get(d.id) ?? { qty: 0, revenue: 0 };
      const margin = Number(d.price) - recipe.cost;
      const marginPct = Number(d.price) > 0 ? (margin / Number(d.price)) * 100 : 0;
      return {
        id: d.id, name: d.name, category: d.category, emoji: d.emoji || '🍽️',
        price: Number(d.price), foodCost: recipe.cost,
        margin, marginPct, ingredientCount: recipe.count,
        unitsSold: sales.qty, revenue: sales.revenue,
        profitGenerated: sales.qty * margin,
        topIngredient: recipe.topIng,
      };
    });

    setDishData(dishAnalytics);
    setLoading(false);
  }, [supabase, period]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── KPIs ──────────────────────────────────────────────────────────────────

  const totalStockValue = ingData.reduce((s, i) => s + i.stockValue, 0);
  const totalCostImpact = ingData.reduce((s, i) => s + i.costImpact, 0);
  const avgWasteRate = ingData.length ? ingData.reduce((s, i) => s + i.wasteRate, 0) / ingData.length : 0;
  const criticalStock = ingData.filter(i => i.daysOfStock < 3 && i.avgDailyUse > 0).length;

  const totalRevenue = dishData.reduce((s, d) => s + d.revenue, 0);
  const totalProfit = dishData.reduce((s, d) => s + d.profitGenerated, 0);
  const avgMarginPct = dishData.filter(d => d.price > 0).length
    ? dishData.filter(d => d.price > 0).reduce((s, d) => s + d.marginPct, 0) / dishData.filter(d => d.price > 0).length : 0;
  const totalUnitsSold = dishData.reduce((s, d) => s + d.unitsSold, 0);

  // ── Sort ──────────────────────────────────────────────────────────────────

  const sortedIngs = [...ingData].sort((a, b) => {
    const av = a[sortIng] as number, bv = b[sortIng] as number;
    return sortDir === 'desc' ? bv - av : av - bv;
  });

  const sortedDishes = [...dishData].sort((a, b) => {
    const av = a[sortDish] as number, bv = b[sortDish] as number;
    return sortDir === 'desc' ? bv - av : av - bv;
  });

  function toggleSort(key: any) {
    if (activeView === 'insumos') {
      if (sortIng === key) setSortDir(d => d === 'desc' ? 'asc' : 'desc');
      else { setSortIng(key); setSortDir('desc'); }
    } else {
      if (sortDish === key) setSortDir(d => d === 'desc' ? 'asc' : 'desc');
      else { setSortDish(key); setSortDir('desc'); }
    }
  }

  const fmt = (n: number) => n.toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  const fmtDec = (n: number) => n.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: '#f59e0b' }} />
    </div>
  );

  return (
    <div style={{ padding: '0 0 32px' }}>

      {/* Controls */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        {/* View toggle */}
        <div style={{ display: 'flex', gap: 4, background: '#0f1923', borderRadius: 10, padding: 4 }}>
          {([
            { key: 'insumos', label: 'Insumos', icon: <Package size={14} /> },
            { key: 'platillos', label: 'Platillos', icon: <ChefHat size={14} /> },
          ] as const).map(v => (
            <button key={v.key} onClick={() => setActiveView(v.key)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 16px', borderRadius: 7, fontSize: 13, fontWeight: 600, cursor: 'pointer', border: 'none', transition: 'all .15s', background: activeView === v.key ? '#1e2d3d' : 'transparent', color: activeView === v.key ? '#f1f5f9' : 'rgba(255,255,255,0.4)' }}>
              {v.icon}{v.label}
            </button>
          ))}
        </div>

        {/* Period selector */}
        <div style={{ display: 'flex', gap: 6 }}>
          {(['7d', '30d', '90d'] as Period[]).map(p => (
            <button key={p} onClick={() => setPeriod(p)}
              style={{ padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: `1px solid ${period === p ? 'rgba(245,158,11,0.4)' : 'rgba(255,255,255,0.1)'}`, background: period === p ? 'rgba(245,158,11,0.1)' : 'transparent', color: period === p ? '#f59e0b' : 'rgba(255,255,255,0.5)' }}>
              {PERIOD_LABELS[p]}
            </button>
          ))}
        </div>
      </div>

      {/* ── INSUMOS ── */}
      {activeView === 'insumos' && (
        <>
          {/* KPIs */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 20 }}>
            {[
              { label: 'Valor en stock', value: `$${fmt(totalStockValue)}`, icon: <DollarSign size={16} />, color: '#10b981' },
              { label: `Costo consumido (${PERIOD_LABELS[period]})`, value: `$${fmt(totalCostImpact)}`, icon: <TrendingDown size={16} />, color: '#f59e0b' },
              { label: 'Tasa de desperdicio', value: `${avgWasteRate.toFixed(1)}%`, icon: <AlertTriangle size={16} />, color: avgWasteRate > 10 ? '#ef4444' : '#f59e0b' },
              { label: 'Stock crítico (<3 días)', value: criticalStock, icon: <Package size={16} />, color: criticalStock > 0 ? '#ef4444' : '#10b981' },
            ].map(k => (
              <div key={k.label} style={{ background: '#1a2535', border: '1px solid #1e2d3d', borderRadius: 12, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: 9, background: k.color + '22', display: 'flex', alignItems: 'center', justifyContent: 'center', color: k.color, flexShrink: 0 }}>{k.icon}</div>
                <div>
                  <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>{k.label}</p>
                  <p style={{ fontSize: 20, fontWeight: 700, color: '#f1f5f9' }}>{k.value}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Top 5 highlights */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 20 }}>
            {/* Mayor costo */}
            <div style={{ background: '#1a2535', border: '1px solid #1e2d3d', borderRadius: 12, padding: '14px 16px' }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>🔥 Mayor impacto en costo</p>
              {[...ingData].sort((a, b) => b.costImpact - a.costImpact).slice(0, 5).map((ing, i) => (
                <div key={ing.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0', borderBottom: i < 4 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                  <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', width: 14, flexShrink: 0 }}>{i + 1}</span>
                  <span style={{ fontSize: 12, color: '#f1f5f9', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ing.name}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#f59e0b', flexShrink: 0 }}>${fmt(ing.costImpact)}</span>
                </div>
              ))}
            </div>
            {/* Mayor desperdicio */}
            <div style={{ background: '#1a2535', border: '1px solid #1e2d3d', borderRadius: 12, padding: '14px 16px' }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: '#ef4444', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>⚠️ Mayor desperdicio</p>
              {[...ingData].filter(i => i.totalWasted > 0).sort((a, b) => b.wasteRate - a.wasteRate).slice(0, 5).map((ing, i) => (
                <div key={ing.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0', borderBottom: i < 4 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                  <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', width: 14, flexShrink: 0 }}>{i + 1}</span>
                  <span style={{ fontSize: 12, color: '#f1f5f9', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ing.name}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#ef4444', flexShrink: 0 }}>{ing.wasteRate.toFixed(1)}%</span>
                </div>
              ))}
              {ingData.filter(i => i.totalWasted > 0).length === 0 && (
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', fontStyle: 'italic' }}>Sin desperdicios en el período</p>
              )}
            </div>
            {/* Por acabarse */}
            <div style={{ background: '#1a2535', border: '1px solid #1e2d3d', borderRadius: 12, padding: '14px 16px' }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: '#8b5cf6', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>⏰ Por acabarse</p>
              {[...ingData].filter(i => i.avgDailyUse > 0 && i.daysOfStock < 30).sort((a, b) => a.daysOfStock - b.daysOfStock).slice(0, 5).map((ing, i) => (
                <div key={ing.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0', borderBottom: i < 4 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                  <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', width: 14, flexShrink: 0 }}>{i + 1}</span>
                  <span style={{ fontSize: 12, color: '#f1f5f9', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ing.name}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: ing.daysOfStock < 3 ? '#ef4444' : ing.daysOfStock < 7 ? '#f59e0b' : '#8b5cf6', flexShrink: 0 }}>{ing.daysOfStock}d</span>
                </div>
              ))}
              {ingData.filter(i => i.avgDailyUse > 0 && i.daysOfStock < 30).length === 0 && (
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', fontStyle: 'italic' }}>Stock suficiente en todos</p>
              )}
            </div>
          </div>

          {/* Tabla completa */}
          <div style={{ background: '#1a2535', border: '1px solid #1e2d3d', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 80px 90px 90px 90px 80px 80px 80px', gap: 8, padding: '10px 16px', background: '#0f1923', fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              {[
                { key: 'name', label: 'Insumo' },
                { key: 'stockValue', label: 'Val. stock' },
                { key: 'costImpact', label: 'Costo uso' },
                { key: 'totalConsumed', label: 'Consumido' },
                { key: 'totalWasted', label: 'Desperd.' },
                { key: 'wasteRate', label: '% Desperd' },
                { key: 'daysOfStock', label: 'Días stock' },
                { key: 'dishCount', label: 'Platillos' },
              ].map(col => (
                <button key={col.key} onClick={() => toggleSort(col.key as any)}
                  style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', cursor: 'pointer', textAlign: 'left' }}>
                  {col.label} {(sortIng === col.key) ? (sortDir === 'desc' ? '↓' : '↑') : ''}
                </button>
              ))}
            </div>
            <div style={{ maxHeight: 480, overflowY: 'auto' }}>
              {sortedIngs.map((ing, idx) => (
                <div key={ing.id} style={{ display: 'grid', gridTemplateColumns: '1.5fr 80px 90px 90px 90px 80px 80px 80px', gap: 8, padding: '10px 16px', borderTop: '1px solid #1e2d3d', alignItems: 'center', background: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)' }}>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 600, color: '#f1f5f9', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ing.name}</p>
                    <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>{ing.category} · {ing.supplier}</p>
                  </div>
                  <span style={{ fontSize: 12, color: '#34d399' }}>${fmt(ing.stockValue)}</span>
                  <span style={{ fontSize: 12, color: '#f59e0b', fontWeight: 600 }}>${fmt(ing.costImpact)}</span>
                  <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)' }}>{fmtDec(ing.totalConsumed)} {ing.unit}</span>
                  <span style={{ fontSize: 12, color: ing.totalWasted > 0 ? '#f87171' : 'rgba(255,255,255,0.3)' }}>{fmtDec(ing.totalWasted)} {ing.unit}</span>
                  <span style={{ fontSize: 12, fontWeight: ing.wasteRate > 10 ? 700 : 400, color: ing.wasteRate > 15 ? '#ef4444' : ing.wasteRate > 5 ? '#f59e0b' : 'rgba(255,255,255,0.4)' }}>{ing.wasteRate.toFixed(1)}%</span>
                  <span style={{ fontSize: 12, fontWeight: ing.daysOfStock < 7 ? 700 : 400, color: ing.daysOfStock < 3 ? '#ef4444' : ing.daysOfStock < 7 ? '#f59e0b' : 'rgba(255,255,255,0.5)' }}>
                    {ing.avgDailyUse > 0 ? (ing.daysOfStock > 365 ? '365+d' : `${ing.daysOfStock}d`) : '—'}
                  </span>
                  <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>{ing.dishCount}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* ── PLATILLOS ── */}
      {activeView === 'platillos' && (
        <>
          {/* KPIs */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 20 }}>
            {[
              { label: `Ingresos (${PERIOD_LABELS[period]})`, value: `$${fmt(totalRevenue)}`, icon: <DollarSign size={16} />, color: '#10b981' },
              { label: 'Utilidad bruta', value: `$${fmt(totalProfit)}`, icon: <TrendingUp size={16} />, color: '#f59e0b' },
              { label: 'Margen promedio', value: `${avgMarginPct.toFixed(1)}%`, icon: <BarChart2 size={16} />, color: '#8b5cf6' },
              { label: 'Platillos vendidos', value: fmt(totalUnitsSold), icon: <ChefHat size={16} />, color: '#60a5fa' },
            ].map(k => (
              <div key={k.label} style={{ background: '#1a2535', border: '1px solid #1e2d3d', borderRadius: 12, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: 9, background: k.color + '22', display: 'flex', alignItems: 'center', justifyContent: 'center', color: k.color, flexShrink: 0 }}>{k.icon}</div>
                <div>
                  <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>{k.label}</p>
                  <p style={{ fontSize: 20, fontWeight: 700, color: '#f1f5f9' }}>{k.value}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Top highlights */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 20 }}>
            {/* Más rentables */}
            <div style={{ background: '#1a2535', border: '1px solid #1e2d3d', borderRadius: 12, padding: '14px 16px' }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>⭐ Mayor utilidad generada</p>
              {[...dishData].sort((a, b) => b.profitGenerated - a.profitGenerated).slice(0, 5).map((d, i) => (
                <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0', borderBottom: i < 4 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                  <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', width: 14 }}>{i + 1}</span>
                  <span style={{ fontSize: 13 }}>{d.emoji}</span>
                  <span style={{ fontSize: 12, color: '#f1f5f9', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.name}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#10b981' }}>${fmt(d.profitGenerated)}</span>
                </div>
              ))}
            </div>

            {/* Mejor margen */}
            <div style={{ background: '#1a2535', border: '1px solid #1e2d3d', borderRadius: 12, padding: '14px 16px' }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: '#8b5cf6', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>📈 Mejor margen %</p>
              {[...dishData].filter(d => d.price > 0 && d.foodCost > 0).sort((a, b) => b.marginPct - a.marginPct).slice(0, 5).map((d, i) => (
                <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0', borderBottom: i < 4 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                  <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', width: 14 }}>{i + 1}</span>
                  <span style={{ fontSize: 13 }}>{d.emoji}</span>
                  <span style={{ fontSize: 12, color: '#f1f5f9', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.name}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#8b5cf6' }}>{d.marginPct.toFixed(0)}%</span>
                </div>
              ))}
            </div>

            {/* Más vendidos */}
            <div style={{ background: '#1a2535', border: '1px solid #1e2d3d', borderRadius: 12, padding: '14px 16px' }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>🔥 Más vendidos</p>
              {[...dishData].sort((a, b) => b.unitsSold - a.unitsSold).slice(0, 5).map((d, i) => (
                <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0', borderBottom: i < 4 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                  <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', width: 14 }}>{i + 1}</span>
                  <span style={{ fontSize: 13 }}>{d.emoji}</span>
                  <span style={{ fontSize: 12, color: '#f1f5f9', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.name}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#f59e0b' }}>{fmt(d.unitsSold)} pz</span>
                </div>
              ))}
              {dishData.every(d => d.unitsSold === 0) && (
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', fontStyle: 'italic' }}>Sin ventas en el período</p>
              )}
            </div>
          </div>

          {/* Tabla completa */}
          <div style={{ background: '#1a2535', border: '1px solid #1e2d3d', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 70px 80px 80px 80px 70px 80px 1fr', gap: 8, padding: '10px 16px', background: '#0f1923', fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              {[
                { key: 'name', label: 'Platillo' },
                { key: 'price', label: 'Precio' },
                { key: 'foodCost', label: 'Food cost' },
                { key: 'margin', label: 'Margen $' },
                { key: 'marginPct', label: 'Margen %' },
                { key: 'unitsSold', label: 'Vendidos' },
                { key: 'profitGenerated', label: 'Utilidad' },
                { key: 'topIngredient', label: 'Ing. principal' },
              ].map(col => (
                <button key={col.key} onClick={() => col.key !== 'name' && col.key !== 'topIngredient' && toggleSort(col.key as any)}
                  style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', cursor: col.key === 'name' || col.key === 'topIngredient' ? 'default' : 'pointer', textAlign: 'left' }}>
                  {col.label} {(sortDish === col.key) ? (sortDir === 'desc' ? '↓' : '↑') : ''}
                </button>
              ))}
            </div>
            <div style={{ maxHeight: 480, overflowY: 'auto' }}>
              {sortedDishes.map((d, idx) => {
                const marginColor = d.marginPct > 60 ? '#10b981' : d.marginPct > 40 ? '#f59e0b' : d.marginPct > 20 ? '#f97316' : '#ef4444';
                return (
                  <div key={d.id} style={{ display: 'grid', gridTemplateColumns: '1.5fr 70px 80px 80px 80px 70px 80px 1fr', gap: 8, padding: '10px 16px', borderTop: '1px solid #1e2d3d', alignItems: 'center', background: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7, minWidth: 0 }}>
                      <span style={{ fontSize: 16, flexShrink: 0 }}>{d.emoji}</span>
                      <div style={{ minWidth: 0 }}>
                        <p style={{ fontSize: 13, fontWeight: 600, color: '#f1f5f9', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.name}</p>
                        <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>{d.category}</p>
                      </div>
                    </div>
                    <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>${fmtDec(d.price)}</span>
                    <span style={{ fontSize: 12, color: '#f87171' }}>${fmtDec(d.foodCost)}</span>
                    <span style={{ fontSize: 12, color: marginColor, fontWeight: 600 }}>${fmtDec(d.margin)}</span>
                    <div>
                      <span style={{ fontSize: 12, fontWeight: 700, color: marginColor }}>{d.marginPct.toFixed(0)}%</span>
                      <div style={{ height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.1)', marginTop: 3, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${Math.min(100, d.marginPct)}%`, background: marginColor, borderRadius: 2 }} />
                      </div>
                    </div>
                    <span style={{ fontSize: 12, color: d.unitsSold > 0 ? '#f59e0b' : 'rgba(255,255,255,0.3)', fontWeight: d.unitsSold > 0 ? 600 : 400 }}>{fmt(d.unitsSold)}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: d.profitGenerated > 0 ? '#10b981' : 'rgba(255,255,255,0.3)' }}>${fmt(d.profitGenerated)}</span>
                    <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.topIngredient}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
