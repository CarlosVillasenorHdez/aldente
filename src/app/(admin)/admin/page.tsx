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

const PLAN_MXN: Record<string, number> = { gratis: 0, operacion: 699, negocio: 1299, empresa: 2199 };
const PLAN_COLOR: Record<string, string> = { gratis: '#34d399', operacion: '#4a9eff', negocio: '#c9963a', empresa: '#a78bfa' };
const PLAN_LABEL: Record<string, string> = { gratis: 'Gratis', operacion: 'Operación', negocio: 'Negocio', empresa: 'Empresa' };


function daysUntil(dateStr: string): number {
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000);
}


// Leaflet map component — loads map tiles and places tenant markers
function LeafletMap({ dots, planColors }: { dots: TenantRow[]; planColors: Record<string, string> }) {
  const mapRef = React.useRef<HTMLDivElement>(null);
  const mapInstanceRef = React.useRef<any>(null);

  React.useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    // Dynamically load Leaflet CSS
    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link');
      link.id = 'leaflet-css';
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }

    // Dynamically load Leaflet JS
    const loadLeaflet = () => {
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.onload = () => initMap();
      document.head.appendChild(script);
    };

    const initMap = () => {
      const L = (window as any).L;
      if (!L || !mapRef.current || mapInstanceRef.current) return;

      const map = L.map(mapRef.current, {
        center: [23.6, -102.5],
        zoom: 5,
        zoomControl: true,
        attributionControl: false,
      });

      // Dark tile layer — CartoDB Dark Matter
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        maxZoom: 19,
      }).addTo(map);

      mapInstanceRef.current = map;

      // Add markers
      addMarkers(L, map, dots, planColors);
    };

    if ((window as any).L) {
      initMap();
    } else {
      loadLeaflet();
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update markers when dots change
  React.useEffect(() => {
    if (!mapInstanceRef.current || !(window as any).L) return;
    const L = (window as any).L;
    const map = mapInstanceRef.current;
    // Remove existing markers
    map.eachLayer((layer: any) => { if (layer instanceof L.CircleMarker) map.removeLayer(layer); });
    addMarkers(L, map, dots, planColors);
  }, [dots]);

  return (
    <div ref={mapRef} style={{ height: '340px', borderRadius: '8px', overflow: 'hidden', background: '#0a1220' }} />
  );
}

function addMarkers(L: any, map: any, dots: TenantRow[], planColors: Record<string, string>) {
  const PLAN_NAMES: Record<string, string> = { operacion: 'Operación', negocio: 'Negocio', empresa: 'Empresa' };
  dots.filter(d => d.lat && d.lng).forEach(d => {
    const color = planColors[d.plan] ?? '#6b7280';
    const marker = L.circleMarker([d.lat!, d.lng!], {
      radius: 8,
      fillColor: color,
      color: '#0a1220',
      weight: 2,
      opacity: 1,
      fillOpacity: d.is_active ? 0.9 : 0.3,
    });
    const planName = PLAN_NAMES[d.plan] ?? d.plan;
    const statusDot = d.is_active ? '<span style="color:#4ade80">●</span>' : '<span style="color:#f87171">●</span>';
    marker.bindPopup(`
      <div style="font-family:system-ui;min-width:160px">
        <div style="font-weight:700;font-size:14px;margin-bottom:4px">${d.name}</div>
        <div style="font-size:12px;color:${color};font-weight:600">${planName}</div>
        <div style="font-size:11px;color:#6b7280;margin-top:4px">${statusDot} ${d.is_active ? 'Activo' : 'Inactivo'}</div>
      </div>
    `, { maxWidth: 200 });
    marker.addTo(map);
  });
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

      {/* Mapa interactivo — Leaflet.js */}
      <div style={{ backgroundColor: '#1a2535', border: '1px solid #1e2d3d', borderRadius: '12px', padding: '18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
          <span style={{ fontWeight: 600, fontSize: '13px', color: '#f1f5f9' }}>Distribución geográfica</span>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            {Object.entries(PLAN_COLOR).map(([plan, color]) => (
              <span key={plan} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: color, display: 'inline-block' }} />
                {PLAN_LABEL[plan] ?? plan}
              </span>
            ))}
            <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>{dots.length} ubicado{dots.length !== 1 ? 's' : ''}</span>
          </div>
        </div>
        <LeafletMap dots={dots} planColors={PLAN_COLOR} />
      </div>
    </div>
  );
}
