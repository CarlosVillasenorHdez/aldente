'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { getCurrentTenantId as getTenantId } from '@/lib/tenantStore';
import { useBranch } from '@/hooks/useBranch';

interface BranchStock {
  branchId: string;
  branchName: string;
  ingredients: IngredientRow[];
}

interface IngredientRow {
  id: string;
  name: string;
  category: string;
  stock: number;
  unit: string;
  min_stock: number;
  cost: number;
}

const LEVEL_COLOR = (stock: number, min: number) => {
  const ratio = min > 0 ? stock / min : 1;
  if (ratio <= 0) return '#ef4444';
  if (ratio <= 0.5) return '#f97316';
  if (ratio <= 1) return '#eab308';
  return '#22c55e';
};

export default function InventarioConsolidado() {
  const supabase = createClient();
  const { branches } = useBranch();
  const [loading, setLoading] = useState(true);
  const [branchStocks, setBranchStocks] = useState<BranchStock[]>([]);
  const [viewMode, setViewMode] = useState<'global' | 'por_sucursal'>('por_sucursal');
  const [selectedBranch, setSelectedBranch] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [showCriticalOnly, setShowCriticalOnly] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const tid = getTenantId();

    // Cargar ingredientes de todas las sucursales en paralelo
    const results = await Promise.all(
      branches.map(async b => {
        const { data } = await supabase
          .from('ingredients')
          .select('id, name, category, stock, unit, min_stock, cost')
          .eq('tenant_id', tid)
          .eq('branch_id', b.id)
          .order('category')
          .order('name');
        return {
          branchId: b.id,
          branchName: b.name,
          ingredients: (data ?? []) as IngredientRow[],
        };
      })
    );

    setBranchStocks(results);
    if (results.length > 0) setSelectedBranch(results[0].branchId);
    setLoading(false);
  }, [branches]);

  useEffect(() => { load(); }, [load]);

  // Vista global: todos los ingredientes de todas las sucursales combinados
  const globalView = () => {
    const map = new Map<string, { name: string; category: string; unit: string; branches: { name: string; stock: number; min_stock: number; cost: number }[] }>();
    branchStocks.forEach(bs => {
      bs.ingredients.forEach(ing => {
        if (!map.has(ing.name)) {
          map.set(ing.name, { name: ing.name, category: ing.category, unit: ing.unit, branches: [] });
        }
        map.get(ing.name)!.branches.push({ name: bs.branchName, stock: ing.stock, min_stock: ing.min_stock, cost: ing.cost });
      });
    });
    return Array.from(map.values()).filter(i =>
      (!search || i.name.toLowerCase().includes(search.toLowerCase())) &&
      (!showCriticalOnly || i.branches.some(b => b.stock <= b.min_stock))
    );
  };

  const currentBranchStock = branchStocks.find(bs => bs.branchId === selectedBranch);
  const filteredIngredients = (currentBranchStock?.ingredients ?? []).filter(i =>
    (!search || i.name.toLowerCase().includes(search.toLowerCase())) &&
    (!showCriticalOnly || i.stock <= i.min_stock)
  );

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
        <div style={{ width: 32, height: 32, borderRadius: '50%', border: '2px solid rgba(201,150,58,0.2)', borderTopColor: '#c9963a', animation: 'spin .7s linear infinite' }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', background: '#0b1827', borderRadius: 16, color: '#f1f5f9' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: '#f1f5f9', margin: '0 0 4px' }}>Inventario consolidado</h2>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', margin: 0 }}>
            {branches.length} sucursal{branches.length !== 1 ? 'es' : ''} · stock en tiempo real
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setViewMode('por_sucursal')}
            style={{ padding: '8px 16px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)', background: viewMode === 'por_sucursal' ? 'rgba(201,150,58,0.15)' : 'rgba(255,255,255,0.04)', color: viewMode === 'por_sucursal' ? '#c9963a' : 'rgba(255,255,255,0.6)', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
            Por sucursal
          </button>
          <button onClick={() => setViewMode('global')}
            style={{ padding: '8px 16px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)', background: viewMode === 'global' ? 'rgba(201,150,58,0.15)' : 'rgba(255,255,255,0.04)', color: viewMode === 'global' ? '#c9963a' : 'rgba(255,255,255,0.6)', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
            Vista global
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar ingrediente..."
          style={{ flex: 1, minWidth: 200, padding: '8px 14px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.08)', color: '#f1f5f9', fontSize: 13, outline: 'none' }}
        />
        <button onClick={() => setShowCriticalOnly(!showCriticalOnly)}
          style={{ padding: '8px 16px', borderRadius: 10, border: `1px solid ${showCriticalOnly ? 'rgba(239,68,68,0.5)' : 'rgba(255,255,255,0.1)'}`, background: showCriticalOnly ? 'rgba(239,68,68,0.1)' : 'rgba(255,255,255,0.04)', color: showCriticalOnly ? '#ef4444' : 'rgba(255,255,255,0.6)', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
          ⚠ Solo críticos
        </button>
      </div>

      {/* Vista por sucursal */}
      {viewMode === 'por_sucursal' && (
        <>
          {/* Selector de sucursal */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
            {branchStocks.map(bs => (
              <button key={bs.branchId} onClick={() => setSelectedBranch(bs.branchId)}
                style={{ padding: '8px 16px', borderRadius: 10, border: `1px solid ${selectedBranch === bs.branchId ? 'rgba(201,150,58,0.5)' : 'rgba(255,255,255,0.08)'}`, background: selectedBranch === bs.branchId ? 'rgba(201,150,58,0.1)' : 'rgba(255,255,255,0.03)', color: selectedBranch === bs.branchId ? '#c9963a' : 'rgba(255,255,255,0.6)', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                📍 {bs.branchName}
                <span style={{ marginLeft: 6, fontSize: 11, opacity: 0.7 }}>{bs.ingredients.length} items</span>
              </button>
            ))}
          </div>

          {/* Tabla de ingredientes */}
          <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 14, border: '1px solid rgba(255,255,255,0.08)', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', color: '#f1f5f9' }}>
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.04)' }}>
                  {['Ingrediente', 'Categoría', 'Stock', 'Nivel', 'Mínimo', 'Costo/U'].map(h => (
                    <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredIngredients.length === 0 ? (
                  <tr><td colSpan={6} style={{ textAlign: 'center', padding: 32, color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>
                    {search || showCriticalOnly ? 'No hay ingredientes con ese filtro' : 'Esta sucursal no tiene ingredientes asignados'}
                  </td></tr>
                ) : filteredIngredients.map(ing => {
                  const color = LEVEL_COLOR(ing.stock, ing.min_stock);
                  const pct = ing.min_stock > 0 ? Math.min(100, (ing.stock / (ing.min_stock * 2)) * 100) : 100;
                  return (
                    <tr key={ing.id} style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                      <td style={{ padding: '10px 14px', fontSize: 13, fontWeight: 600, color: '#f1f5f9' }}>{ing.name}</td>
                      <td style={{ padding: '10px 14px' }}>
                        <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 100, background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.6)' }}>{ing.category}</span>
                      </td>
                      <td style={{ padding: '10px 14px', fontSize: 13, color: color, fontWeight: 700 }}>{ing.stock} {ing.unit}</td>
                      <td style={{ padding: '10px 14px', width: 120 }}>
                        <div style={{ height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 3, transition: 'width 0.3s' }} />
                        </div>
                      </td>
                      <td style={{ padding: '10px 14px', fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>{ing.min_stock} {ing.unit}</td>
                      <td style={{ padding: '10px 14px', fontSize: 13, color: '#c9963a', fontWeight: 600 }}>${ing.cost.toFixed(2)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Vista global */}
      {viewMode === 'global' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {globalView().map(item => (
            <div key={item.name} style={{ background: 'rgba(255,255,255,0.02)', borderRadius: 14, border: '1px solid rgba(255,255,255,0.06)', padding: '14px 18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: '#f1f5f9' }}>{item.name}</span>
                <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 100, background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.5)' }}>{item.category}</span>
              </div>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                {item.branches.map(b => {
                  const color = LEVEL_COLOR(b.stock, b.min_stock);
                  return (
                    <div key={b.name} style={{ padding: '8px 14px', borderRadius: 10, background: 'rgba(255,255,255,0.04)', border: `1px solid ${color}30` }}>
                      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 3 }}>📍 {b.name}</div>
                      <div style={{ fontSize: 16, fontWeight: 700, color }}>{b.stock} {item.unit}</div>
                      <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>mín: {b.min_stock} {item.unit}</div>
                    </div>
                  );
                })}
                {/* Total consolidado */}
                <div style={{ padding: '8px 14px', borderRadius: 10, background: 'rgba(201,150,58,0.08)', border: '1px solid rgba(201,150,58,0.2)' }}>
                  <div style={{ fontSize: 11, color: 'rgba(201,150,58,0.7)', marginBottom: 3 }}>📊 Total</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#c9963a' }}>
                    {item.branches.reduce((s, b) => s + b.stock, 0).toFixed(2)} {item.unit}
                  </div>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>
                    ${item.branches.reduce((s,b) => s + b.stock * b.cost, 0).toFixed(0)} valor
                  </div>
                </div>
              </div>
            </div>
          ))}
          {globalView().length === 0 && (
            <div style={{ textAlign: 'center', padding: 48, color: 'rgba(255,255,255,0.3)', fontSize: 14 }}>
              No se encontraron ingredientes con esos filtros
            </div>
          )}
        </div>
      )}
    </div>
  );
}
