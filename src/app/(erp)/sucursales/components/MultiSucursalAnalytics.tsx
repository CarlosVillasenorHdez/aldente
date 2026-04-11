'use client';
/**
 * MultiSucursalAnalytics — dashboard del dueño multisucursal
 * 
 * Vista desde la perspectiva del dueño: compara el rendimiento de todas
 * sus sucursales y ve el consolidado global de su negocio.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { getCurrentTenantId as getTenantId } from '@/lib/tenantStore';
import { TrendingUp, TrendingDown, Building2, DollarSign, ShoppingBag, Users } from 'lucide-react';

interface Branch { id: string; name: string; address: string; }
interface BranchMetrics {
  id: string;
  name: string;
  ventas: number;
  ordenes: number;
  ticket: number;
  costos: number;
  margen: number;
  margenPct: number;
  empleados: number;
}

const PERIODS = [
  { label: 'Hoy',      days: 1 },
  { label: '7 días',   days: 7 },
  { label: '30 días',  days: 30 },
  { label: '90 días',  days: 90 },
];

const fmt = (n: number) => `$${Math.round(n).toLocaleString('es-MX')}`;
const pct = (n: number) => `${n.toFixed(1)}%`;

export default function MultiSucursalAnalytics() {
  const supabase = createClient();
  const { appUser } = useAuth();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [metrics, setMetrics] = useState<BranchMetrics[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState(30);

  const loadData = useCallback(async () => {
    if (!appUser?.tenantId) return;
    setLoading(true);

    const since = new Date();
    since.setDate(since.getDate() - period);
    const sinceStr = since.toISOString();

    // Load branches
    const { data: branchData } = await supabase
      .from('branches')
      .select('id, name, address')
      .eq('tenant_id', getTenantId())
      .eq('is_active', true)
      .order('name');

    const bList: Branch[] = (branchData || []).map((b: any) => ({
      id: b.id, name: b.name, address: b.address || ''
    }));
    setBranches(bList);

    if (bList.length === 0) { setLoading(false); return; }

    // Load metrics per branch in parallel
    const results = await Promise.all(bList.map(async (branch) => {
      const [{ data: orders }, { data: employees }] = await Promise.all([
        supabase
          .from('orders')
          .select('total, cost_actual, margin_actual, status')
          .eq('tenant_id', getTenantId())
          .eq('branch_id', branch.id)
          .eq('is_comanda', false)
          .eq('status', 'cerrada')
          .gte('created_at', sinceStr),
        supabase
          .from('employees')
          .select('id')
          .eq('tenant_id', getTenantId())
          .eq('branch_id', branch.id)
          .eq('status', 'activo'),
      ]);

      const ords = orders || [];
      const ventas = ords.reduce((s, o) => s + Number(o.total), 0);
      const costos = ords.reduce((s, o) => s + Number((o as any).cost_actual || 0), 0);
      const margen = ords.reduce((s, o) => s + Number((o as any).margin_actual || 0), 0);

      return {
        id: branch.id,
        name: branch.name,
        ventas,
        ordenes: ords.length,
        ticket: ords.length > 0 ? ventas / ords.length : 0,
        costos,
        margen,
        margenPct: ventas > 0 ? (margen / ventas) * 100 : 0,
        empleados: (employees || []).length,
      } as BranchMetrics;
    }));

    setMetrics(results.sort((a, b) => b.ventas - a.ventas));
    setLoading(false);
  }, [appUser?.tenantId, period, supabase]);

  useEffect(() => { loadData(); }, [loadData]);

  const total = metrics.reduce((acc, m) => ({
    ventas: acc.ventas + m.ventas,
    ordenes: acc.ordenes + m.ordenes,
    margen: acc.margen + m.margen,
    empleados: acc.empleados + m.empleados,
  }), { ventas: 0, ordenes: 0, margen: 0, empleados: 0 });

  const topBranch = metrics[0];
  const maxVentas = Math.max(...metrics.map(m => m.ventas), 1);

  const card = { backgroundColor: '#1a2535', border: '1px solid #243f72', borderRadius: 14, padding: '20px 24px' };

  if (loading) return (
    <div style={{ textAlign: 'center', padding: '60px 0', color: 'rgba(255,255,255,0.3)' }}>
      <div style={{ fontSize: 13 }}>Cargando análisis...</div>
    </div>
  );

  if (branches.length === 0) return (
    <div style={{ textAlign: 'center', padding: '60px 0' }}>
      <Building2 size={48} style={{ margin: '0 auto 16px', opacity: .3, display: 'block' }} />
      <p style={{ fontSize: 16, color: 'rgba(255,255,255,.5)', marginBottom: 8 }}>Sin sucursales configuradas</p>
      <p style={{ fontSize: 13, color: 'rgba(255,255,255,.3)' }}>
        Crea sucursales en la pestaña de gestión y asigna empleados para ver el análisis comparativo.
      </p>
    </div>
  );

  return (
    <div style={{ background: '#0b1827', borderRadius: 16, padding: '20px' }}>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Period selector */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <span style={{ fontSize: 12, color: 'rgba(255,255,255,.4)', marginRight: 4 }}>Período:</span>
        {PERIODS.map(p => (
          <button key={p.days} onClick={() => setPeriod(p.days)}
            style={{ padding: '6px 14px', borderRadius: 100, fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all .2s',
              background: period === p.days ? 'rgba(201,150,58,.15)' : 'transparent',
              border: `1px solid ${period === p.days ? '#c9963a' : 'rgba(255,255,255,.1)'}`,
              color: period === p.days ? '#c9963a' : 'rgba(255,255,255,.5)' }}>
            {p.label}
          </button>
        ))}
      </div>

      {/* Consolidado global */}
      <div style={card}>
        <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: '#c9963a', marginBottom: 16 }}>
          Consolidado — todas las sucursales
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 16 }}>
          {[
            { icon: DollarSign, label: 'Ventas totales', value: fmt(total.ventas), color: '#c9963a' },
            { icon: ShoppingBag, label: 'Órdenes', value: total.ordenes.toLocaleString('es-MX'), color: '#60a5fa' },
            { icon: TrendingUp, label: 'Margen global', value: total.ventas > 0 ? pct((total.margen / total.ventas) * 100) : '—', color: '#34d399' },
            { icon: Users, label: 'Empleados activos', value: total.empleados.toString(), color: '#a78bfa' },
          ].map(({ icon: Icon, label, value, color }) => (
            <div key={label}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <Icon size={14} style={{ color, flexShrink: 0 }} />
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,.45)', textTransform: 'uppercase', letterSpacing: '.06em' }}>{label}</span>
              </div>
              <p style={{ fontSize: 26, fontWeight: 700, color, margin: 0, fontFamily: 'monospace' }}>{value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Comparativa por sucursal */}
      <div style={card}>
        <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: '#c9963a', marginBottom: 16 }}>
          Comparativa por sucursal
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {metrics.map((m, i) => (
            <div key={m.id}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,.3)', minWidth: 20 }}>#{i + 1}</span>
                  <div>
                    <span style={{ fontSize: 14, fontWeight: 600, color: '#f1f5f9' }}>{m.name}</span>
                    {m.id === topBranch?.id && (
                      <span style={{ marginLeft: 8, fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 100,
                        background: 'rgba(201,150,58,.15)', color: '#c9963a', border: '1px solid rgba(201,150,58,.3)' }}>
                        Top
                      </span>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ fontSize: 15, fontWeight: 700, color: '#c9963a', margin: 0 }}>{fmt(m.ventas)}</p>
                    <p style={{ fontSize: 11, color: 'rgba(255,255,255,.35)', margin: 0 }}>{m.ordenes} órdenes</p>
                  </div>
                  <div style={{ textAlign: 'right', minWidth: 60 }}>
                    <p style={{ fontSize: 14, fontWeight: 600, color: m.margenPct >= 20 ? '#34d399' : m.margenPct >= 10 ? '#f59e0b' : '#f87171', margin: 0 }}>
                      {pct(m.margenPct)}
                    </p>
                    <p style={{ fontSize: 11, color: 'rgba(255,255,255,.35)', margin: 0 }}>margen</p>
                  </div>
                  <div style={{ textAlign: 'right', minWidth: 70 }}>
                    <p style={{ fontSize: 13, color: 'rgba(255,255,255,.6)', margin: 0 }}>{fmt(m.ticket)}</p>
                    <p style={{ fontSize: 11, color: 'rgba(255,255,255,.35)', margin: 0 }}>ticket prom.</p>
                  </div>
                </div>
              </div>
              {/* Revenue bar */}
              <div style={{ height: 6, borderRadius: 3, background: 'rgba(255,255,255,.06)' }}>
                <div style={{ height: '100%', borderRadius: 3, transition: 'width .5s ease',
                  width: `${(m.ventas / maxVentas) * 100}%`,
                  background: i === 0 ? '#c9963a' : `rgba(201,150,58,${0.6 - i * 0.12})` }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* P&L Comparativo */}
      <div style={card}>
        <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: '#c9963a', marginBottom: 16 }}>
          P&L comparativo
        </p>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,.08)' }}>
                {['Sucursal', 'Ventas', 'COGS', 'Margen $', 'Margen %', 'Ticket', 'Órdenes'].map(h => (
                  <th key={h} style={{ padding: '6px 12px', textAlign: h === 'Sucursal' ? 'left' : 'right',
                    fontSize: 11, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase',
                    color: 'rgba(255,255,255,.4)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {metrics.map((m, i) => (
                <tr key={m.id} style={{ borderBottom: '1px solid rgba(255,255,255,.04)',
                  background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,.02)' }}>
                  <td style={{ padding: '10px 12px', color: '#f1f5f9', fontWeight: 500 }}>{m.name}</td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', color: '#c9963a', fontWeight: 600 }}>{fmt(m.ventas)}</td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', color: 'rgba(255,255,255,.6)' }}>{fmt(m.costos)}</td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', color: m.margen > 0 ? '#34d399' : '#f87171' }}>{fmt(m.margen)}</td>
                  <td style={{ padding: '10px 12px', textAlign: 'right',
                    color: m.margenPct >= 20 ? '#34d399' : m.margenPct >= 10 ? '#f59e0b' : '#f87171',
                    fontWeight: 600 }}>{pct(m.margenPct)}</td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', color: 'rgba(255,255,255,.6)' }}>{fmt(m.ticket)}</td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', color: 'rgba(255,255,255,.6)' }}>{m.ordenes.toLocaleString('es-MX')}</td>
                </tr>
              ))}
              {/* Total row */}
              <tr style={{ borderTop: '2px solid rgba(255,255,255,.12)', background: 'rgba(201,150,58,.04)' }}>
                <td style={{ padding: '10px 12px', color: '#c9963a', fontWeight: 700 }}>Total</td>
                <td style={{ padding: '10px 12px', textAlign: 'right', color: '#c9963a', fontWeight: 700 }}>{fmt(total.ventas)}</td>
                <td style={{ padding: '10px 12px', textAlign: 'right', color: 'rgba(255,255,255,.6)', fontWeight: 600 }}>
                  {fmt(metrics.reduce((s, m) => s + m.costos, 0))}
                </td>
                <td style={{ padding: '10px 12px', textAlign: 'right', color: '#34d399', fontWeight: 700 }}>{fmt(total.margen)}</td>
                <td style={{ padding: '10px 12px', textAlign: 'right', color: '#34d399', fontWeight: 700 }}>
                  {total.ventas > 0 ? pct((total.margen / total.ventas) * 100) : '—'}
                </td>
                <td style={{ padding: '10px 12px', textAlign: 'right', color: 'rgba(255,255,255,.6)', fontWeight: 600 }}>
                  {fmt(total.ordenes > 0 ? total.ventas / total.ordenes : 0)}
                </td>
                <td style={{ padding: '10px 12px', textAlign: 'right', color: 'rgba(255,255,255,.6)', fontWeight: 600 }}>
                  {total.ordenes.toLocaleString('es-MX')}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
    </div>
  );
}
