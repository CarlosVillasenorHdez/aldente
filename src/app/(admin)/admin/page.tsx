'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

interface TenantRow {
  id: string; name: string; plan: string; is_active: boolean;
  trial_ends_at: string | null; plan_valid_until: string | null;
  lat: number | null; lng: number | null; created_at: string;
}

interface KPIs {
  total: number; active: number; trial: number; paid: number;
  mrr: number; expiringSoon: number; churnRisk: number;
}

const PLAN_MXN: Record<string, number> = { basico: 800, estandar: 1500, premium: 2500 };
const PLAN_COLOR: Record<string, string> = { basico: '#6b7280', estandar: '#f59e0b', premium: '#a78bfa' };

function worldToSVG(lat: number, lng: number, w = 640, h = 320): [number, number] {
  const x = ((lng + 180) / 360) * w;
  const latRad = (lat * Math.PI) / 180;
  const mercN = Math.log(Math.tan(Math.PI / 4 + latRad / 2));
  const y = (h / 2) - (w * mercN) / (2 * Math.PI);
  return [x, Math.max(0, Math.min(h, y))];
}

function daysUntil(dateStr: string): number {
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000);
}

export default function AdminDashboardPage() {
  const supabase = createClient();
  const [kpis, setKpis] = useState<KPIs | null>(null);
  const [tenants, setTenants] = useState<TenantRow[]>([]);
  const [tooltip, setTooltip] = useState<{ name: string; plan: string; x: number; y: number } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from('v_tenant_map')
      .select('id, name, plan, is_active, trial_ends_at, plan_valid_until, lat, lng, created_at')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        const rows = (data ?? []) as TenantRow[];
        setTenants(rows);
        const now = new Date();
        const soon = new Date(now.getTime() + 5 * 86400000);
        let active = 0, trial = 0, paid = 0, mrr = 0, expiringSoon = 0, churnRisk = 0;
        rows.forEach(r => {
          if (!r.is_active) return;
          active++;
          const inTrial = !r.plan_valid_until && r.trial_ends_at && new Date(r.trial_ends_at) > now;
          if (inTrial) {
            trial++;
            if (new Date(r.trial_ends_at!) <= soon) expiringSoon++;
          }
          if (r.plan_valid_until && new Date(r.plan_valid_until) > now) {
            paid++;
            mrr += PLAN_MXN[r.plan] ?? 0;
            if (new Date(r.plan_valid_until) <= soon) churnRisk++;
          }
        });
        setKpis({ total: rows.length, active, trial, paid, mrr, expiringSoon, churnRisk });
        setLoading(false);
      });
  }, []);

  const kpiCards = [
    { label: 'MRR', value: kpis ? `$${kpis.mrr.toLocaleString('es-MX')}` : '—', sub: 'MXN/mes', color: '#f59e0b' },
    { label: 'Pagados', value: kpis?.paid ?? '—', sub: 'suscripciones activas', color: '#34d399' },
    { label: 'En trial', value: kpis?.trial ?? '—', sub: 'período de prueba', color: '#60a5fa' },
    { label: 'Vencen pronto', value: kpis ? kpis.expiringSoon + kpis.churnRisk : '—', sub: 'en menos de 5 días', color: '#f87171' },
    { label: 'Total tenants', value: kpis?.total ?? '—', sub: 'registrados', color: 'rgba(255,255,255,0.5)' },
  ];

  const expiringTenants = tenants.filter(t => {
    if (!t.is_active) return false;
    const d = t.trial_ends_at ?? t.plan_valid_until;
    if (!d) return false;
    const days = daysUntil(d);
    return days >= 0 && days <= 7;
  }).sort((a, b) => {
    const da = a.trial_ends_at ?? a.plan_valid_until ?? '';
    const db = b.trial_ends_at ?? b.plan_valid_until ?? '';
    return da.localeCompare(db);
  });

  const recentTenants = tenants.slice(0, 5);
  const dots = tenants.filter(t => t.lat && t.lng);

  return (
    <div>
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#f1f5f9', margin: 0 }}>Dashboard</h1>
        <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', marginTop: '4px' }}>
          {new Date().toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px', marginBottom: '28px' }}>
        {kpiCards.map(k => (
          <div key={k.label} style={{ backgroundColor: '#1a2535', border: '1px solid #1e2d3d', borderRadius: '12px', padding: '18px' }}>
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>{k.label}</div>
            <div style={{ fontSize: '26px', fontWeight: 700, color: k.color, fontFamily: 'monospace' }}>{loading ? '…' : k.value}</div>
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', marginTop: '3px' }}>{k.sub}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>

        {/* Vencen pronto */}
        <div style={{ backgroundColor: '#1a2535', border: '1px solid #1e2d3d', borderRadius: '12px', padding: '18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <span style={{ fontWeight: 600, fontSize: '13px', color: '#f1f5f9' }}>Vencen pronto</span>
            <Link href="/admin/churn" style={{ fontSize: '12px', color: '#f59e0b', textDecoration: 'none' }}>Ver todos →</Link>
          </div>
          {loading ? <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '13px' }}>Cargando...</div>
          : expiringTenants.length === 0
          ? <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '13px', textAlign: 'center', padding: '16px 0' }}>Sin vencimientos próximos</div>
          : expiringTenants.map(t => {
            const expDate = t.trial_ends_at ?? t.plan_valid_until ?? '';
            const days = daysUntil(expDate);
            const isTrial = !!t.trial_ends_at;
            return (
              <div key={t.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <div>
                  <Link href={`/admin/tenants/${t.id}`} style={{ fontSize: '13px', fontWeight: 500, color: '#f1f5f9', textDecoration: 'none' }}>{t.name}</Link>
                  <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', marginTop: '1px' }}>{isTrial ? 'Trial' : t.plan}</div>
                </div>
                <span style={{ fontSize: '12px', fontWeight: 600, color: days <= 2 ? '#f87171' : '#fb923c', backgroundColor: days <= 2 ? 'rgba(248,113,113,0.1)' : 'rgba(251,146,60,0.1)', padding: '3px 8px', borderRadius: '6px' }}>
                  {days === 0 ? 'hoy' : `${days}d`}
                </span>
              </div>
            );
          })}
        </div>

        {/* Últimos registros */}
        <div style={{ backgroundColor: '#1a2535', border: '1px solid #1e2d3d', borderRadius: '12px', padding: '18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <span style={{ fontWeight: 600, fontSize: '13px', color: '#f1f5f9' }}>Últimos registros</span>
            <Link href="/admin/tenants" style={{ fontSize: '12px', color: '#f59e0b', textDecoration: 'none' }}>Ver todos →</Link>
          </div>
          {loading ? <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '13px' }}>Cargando...</div>
          : recentTenants.map(t => (
            <div key={t.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <div>
                <Link href={`/admin/tenants/${t.id}`} style={{ fontSize: '13px', fontWeight: 500, color: '#f1f5f9', textDecoration: 'none' }}>{t.name}</Link>
                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', marginTop: '1px' }}>
                  {new Date(t.created_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}
                </div>
              </div>
              <span style={{ fontSize: '11px', color: PLAN_COLOR[t.plan] ?? '#6b7280', backgroundColor: `${PLAN_COLOR[t.plan] ?? '#6b7280'}20`, padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>
                {t.plan}
              </span>
            </div>
          ))}
        </div>

      </div>

      {/* Heatmap */}
      <div style={{ backgroundColor: '#1a2535', border: '1px solid #1e2d3d', borderRadius: '12px', padding: '18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
          <span style={{ fontWeight: 600, fontSize: '13px', color: '#f1f5f9' }}>Distribución geográfica</span>
          <div style={{ display: 'flex', gap: '12px' }}>
            {Object.entries(PLAN_COLOR).map(([plan, color]) => (
              <span key={plan} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: color, display: 'inline-block' }} />{plan}
              </span>
            ))}
          </div>
        </div>
        <svg viewBox="0 0 640 280" width="100%" style={{ display: 'block', borderRadius: '8px', background: '#0d1720' }}>
          {[0,70,140,210,280].map(y => <line key={y} x1="0" y1={y} x2="640" y2={y} stroke="#1e2d3d" strokeWidth="0.5"/>)}
          {[0,128,256,384,512,640].map(x => <line key={x} x1={x} y1="0" x2={x} y2="280" stroke="#1e2d3d" strokeWidth="0.5"/>)}
          {dots.map(d => {
            const [x, y] = worldToSVG(d.lat!, d.lng!, 640, 280);
            const color = PLAN_COLOR[d.plan] ?? '#6b7280';
            return (
              <g key={d.id} style={{ cursor: 'pointer' }}
                onMouseEnter={() => setTooltip({ name: d.name, plan: d.plan, x, y })}
                onMouseLeave={() => setTooltip(null)}>
                <circle cx={x} cy={y} r="7" fill={color} fillOpacity={d.is_active ? 0.9 : 0.3} stroke="#0d1720" strokeWidth="1.5"/>
                <circle cx={x} cy={y} r="12" fill={color} fillOpacity={0.15}/>
              </g>
            );
          })}
          {tooltip && (() => {
            const tx = Math.min(tooltip.x + 12, 520);
            const ty = Math.max(tooltip.y - 36, 8);
            return (
              <g>
                <rect x={tx} y={ty} width="130" height="38" rx="6" fill="#1a2535" stroke="#2a3f5f" strokeWidth="0.5"/>
                <text x={tx+8} y={ty+15} fontSize="12" fill="#f1f5f9" fontWeight="500">{tooltip.name.slice(0,16)}</text>
                <text x={tx+8} y={ty+29} fontSize="11" fill={PLAN_COLOR[tooltip.plan] ?? '#6b7280'}>{tooltip.plan}</text>
              </g>
            );
          })()}
        </svg>
        {dots.length === 0 && !loading && (
          <div style={{ textAlign: 'center', padding: '24px', color: 'rgba(255,255,255,0.2)', fontSize: '13px' }}>
            Sin tenants con coordenadas aún
          </div>
        )}
      </div>
    </div>
  );
}
