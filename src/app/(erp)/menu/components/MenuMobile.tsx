'use client';
/**
 * MenuMobile — Vista optimizada para teléfono
 * Caso de uso: ver platillos y activar/desactivar disponibilidad en segundos
 */
import React, { useState, useCallback, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { getCurrentTenantId as getTenantId } from '@/lib/tenantStore';
import { useBranch } from '@/hooks/useBranch';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Search, RefreshCw, Eye, EyeOff } from 'lucide-react';

interface Dish {
  id: string; name: string; description: string;
  price: number; category: string; available: boolean;
  emoji: string; popular: boolean;
}

const CATEGORY_ICONS: Record<string, string> = {
  'Hamburguesas': '🍔', 'Tacos': '🌮', 'Entradas': '🥗', 'Platos Fuertes': '🍽️',
  'Bebidas': '🥤', 'Postres': '🍮', 'Desayunos': '🍳', 'Pizzas': '🍕',
  'Mariscos': '🦐', 'Ensaladas': '🥙', 'Sopas': '🍲', 'Extras': '⭐',
};
const fmt = (n: number) => n.toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

export default function MenuMobile() {
  const supabase = createClient();
  const { activeBranchId } = useBranch();
  const { appUser } = useAuth();
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'todos' | 'disponibles' | 'agotados'>('todos');

  const load = useCallback(async () => {
    setLoading(true);
    const tid = appUser?.tenantId ?? getTenantId();
    if (!tid) { setLoading(false); return; }
    const { data } = await supabase.from('dishes')
      .select('id,name,description,price,category,available,emoji,popular')
      .eq('tenant_id', tid)
      .order('category').order('name');
    setDishes((data ?? []).map((d: any) => ({ ...d, price: Number(d.price) })));
    setLoading(false);
  }, [appUser?.tenantId, supabase]);

  useEffect(() => { load(); }, [load]);

  async function toggleAvailable(dish: Dish) {
    setToggling(dish.id);
    const newVal = !dish.available;
    const { error } = await supabase.from('dishes')
      .update({ available: newVal, updated_at: new Date().toISOString() })
      .eq('id', dish.id);
    if (error) { toast.error('Error al actualizar'); }
    else {
      setDishes(prev => prev.map(d => d.id === dish.id ? { ...d, available: newVal } : d));
      toast.success(newVal ? `${dish.name} disponible` : `${dish.name} agotado`);
    }
    setToggling(null);
  }

  // Agrupar por categoría
  const filtered = dishes.filter(d => {
    const matchSearch = !search || d.name.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === 'todos' || (filter === 'disponibles' ? d.available : !d.available);
    return matchSearch && matchFilter;
  });

  const byCategory = filtered.reduce<Record<string, Dish[]>>((acc, d) => {
    if (!acc[d.category]) acc[d.category] = [];
    acc[d.category].push(d);
    return acc;
  }, {});

  const agotados = dishes.filter(d => !d.available).length;
  const disponibles = dishes.filter(d => d.available).length;

  return (
    <div style={{ background: '#0a1628', minHeight: '100vh', paddingBottom: 80 }}>

      {/* Header */}
      <div style={{ padding: '16px 16px 0', background: '#0f1e38', borderBottom: '1px solid rgba(255,255,255,0.06)', position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: 'white', margin: 0 }}>Menú</h1>
          <button onClick={load} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)' }}>
            <RefreshCw size={16} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
          </button>
        </div>

        {/* Buscador */}
        <div style={{ position: 'relative', marginBottom: 10 }}>
          <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.35)' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar platillo..."
            style={{ width: '100%', padding: '9px 12px 9px 34px', borderRadius: 10, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontSize: 14, outline: 'none', boxSizing: 'border-box' as const }} />
        </div>

        {/* Filtros */}
        <div style={{ display: 'flex', gap: 6, paddingBottom: 12, overflowX: 'auto' }}>
          {[
            { key: 'todos', label: `Todos (${dishes.length})` },
            { key: 'disponibles', label: `✅ Disponibles (${disponibles})` },
            { key: 'agotados', label: `❌ Agotados (${agotados})`, alert: agotados > 0 },
          ].map(f => (
            <button key={f.key} onClick={() => setFilter(f.key as any)}
              style={{ padding: '7px 14px', borderRadius: 20, border: `1px solid ${filter === f.key ? (f.alert ? 'rgba(248,113,113,0.5)' : 'rgba(245,158,11,0.4)') : 'rgba(255,255,255,0.1)'}`, background: filter === f.key ? (f.alert ? 'rgba(248,113,113,0.12)' : 'rgba(245,158,11,0.1)') : 'rgba(255,255,255,0.03)', color: filter === f.key ? (f.alert ? '#f87171' : '#f59e0b') : 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: filter === f.key ? 600 : 400, cursor: 'pointer', whiteSpace: 'nowrap' as const }}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: '12px 16px 0' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 60, color: 'rgba(255,255,255,0.3)' }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', border: '2px solid rgba(245,158,11,0.3)', borderTopColor: '#f59e0b', animation: 'spin 1s linear infinite', margin: '0 auto 10px' }} />
            Cargando menú...
          </div>
        ) : Object.keys(byCategory).length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'rgba(255,255,255,0.3)' }}>
            {search ? 'Sin resultados' : filter === 'agotados' ? '✅ Todos los platillos disponibles' : 'Sin platillos'}
          </div>
        ) : (
          Object.entries(byCategory).map(([cat, catDishes]) => (
            <div key={cat} style={{ marginBottom: 20 }}>
              {/* Encabezado de categoría */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, paddingBottom: 6, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <span style={{ fontSize: 16 }}>{CATEGORY_ICONS[cat] ?? '🍽️'}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{cat}</span>
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', marginLeft: 'auto' }}>{catDishes.length} platillos</span>
              </div>

              {/* Lista de platillos */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {catDishes.map(dish => (
                  <div key={dish.id}
                    style={{ background: dish.available ? '#162d55' : 'rgba(255,255,255,0.02)', border: `1px solid ${dish.available ? '#243f72' : 'rgba(248,113,113,0.2)'}`, borderRadius: 14, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12, opacity: dish.available ? 1 : 0.65 }}>

                    {/* Emoji */}
                    <div style={{ width: 42, height: 42, borderRadius: 12, background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>
                      {dish.emoji || CATEGORY_ICONS[dish.category] || '🍽️'}
                    </div>

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 14, fontWeight: 600, color: 'white', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{dish.name}</span>
                        {dish.popular && <span style={{ fontSize: 10, background: 'rgba(245,158,11,0.2)', color: '#f59e0b', padding: '1px 6px', borderRadius: 10, flexShrink: 0 }}>⭐</span>}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
                        <span style={{ fontSize: 15, fontWeight: 700, color: '#f59e0b', fontFamily: 'monospace' }}>${fmt(dish.price)}</span>
                        {!dish.available && <span style={{ fontSize: 11, color: '#f87171' }}>Agotado</span>}
                      </div>
                    </div>

                    {/* Toggle */}
                    <button onClick={() => toggleAvailable(dish)} disabled={toggling === dish.id}
                      style={{ width: 48, height: 48, borderRadius: 12, border: `1px solid ${dish.available ? 'rgba(74,222,128,0.3)' : 'rgba(248,113,113,0.3)'}`, background: dish.available ? 'rgba(74,222,128,0.1)' : 'rgba(248,113,113,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: toggling === dish.id ? 'wait' : 'pointer', flexShrink: 0, transition: 'all 0.15s' }}>
                      {toggling === dish.id
                        ? <RefreshCw size={16} style={{ color: 'rgba(255,255,255,0.4)', animation: 'spin 1s linear infinite' }} />
                        : dish.available
                          ? <Eye size={18} style={{ color: '#4ade80' }} />
                          : <EyeOff size={18} style={{ color: '#f87171' }} />}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
