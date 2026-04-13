'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

interface TenantRow {
  id: string; name: string; slug: string; plan: string; is_active: boolean;
  trial_ends_at: string | null; plan_valid_until: string | null;
  lat: number | null; lng: number | null; created_at: string;
  owner_email?: string;
  address?: string; colonia?: string; city?: string; state_region?: string; postal_code?: string;
  active_users?: number; active_branches?: number;
}

const PLAN_MXN: Record<string, number> = { operacion: 699, negocio: 1299, empresa: 2199 };
const PLAN_COLOR: Record<string, string> = { operacion: '#4a9eff', negocio: '#c9963a', empresa: '#a78bfa' };
const PLAN_LABEL: Record<string, string> = { operacion: 'Operación', negocio: 'Negocio', empresa: 'Empresa' };

function daysUntil(dateStr: string): number {
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000);
}
function fmt(n: number) { return n.toLocaleString('es-MX'); }
const S = { // shared styles
  card: { backgroundColor:'#1a2535', border:'1px solid #1e2d3d', borderRadius:12, padding:18 } as React.CSSProperties,
  h: { fontWeight:600, fontSize:13, color:'#f1f5f9', margin:0 } as React.CSSProperties,
  sub: { fontSize:11, color:'rgba(255,255,255,.35)' } as React.CSSProperties,
  row: { display:'flex', alignItems:'center', justifyContent:'space-between', padding:'9px 0', borderBottom:'1px solid rgba(255,255,255,.05)' } as React.CSSProperties,
};

// ── Leaflet Map ───────────────────────────────────────────────────────────────
function LeafletMap({ dots }: { dots: TenantRow[] }) {
  const mapRef = React.useRef<HTMLDivElement>(null);
  const mapInstRef = React.useRef<any>(null);

  const initMap = useCallback(() => {
    const L = (window as any).L;
    if (!L || !mapRef.current || mapInstRef.current) return;
    const map = L.map(mapRef.current, { center:[23.6,-102.5], zoom:5, zoomControl:true, attributionControl:false });
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', { maxZoom:19 }).addTo(map);
    mapInstRef.current = map;
    addMarkers(L, map, dots);
  }, [dots]);

  React.useEffect(() => {
    if (!mapRef.current || mapInstRef.current) return;
    if (!document.getElementById('leaflet-css')) {
      const lnk = document.createElement('link'); lnk.id='leaflet-css'; lnk.rel='stylesheet';
      lnk.href='https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'; document.head.appendChild(lnk);
    }
    if ((window as any).L) { initMap(); return; }
    const s = document.createElement('script'); s.src='https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    s.onload = initMap; document.head.appendChild(s);
    return () => { if (mapInstRef.current) { mapInstRef.current.remove(); mapInstRef.current=null; } };
  }, [initMap]);

  React.useEffect(() => {
    if (!mapInstRef.current || !(window as any).L) return;
    const L=(window as any).L; const map=mapInstRef.current;
    map.eachLayer((l:any) => { if (l instanceof L.CircleMarker) map.removeLayer(l); });
    addMarkers(L, map, dots);
  }, [dots]);

  return <div ref={mapRef} style={{ height:320, borderRadius:8, overflow:'hidden', background:'#0a1220' }} />;
}

function addMarkers(L:any, map:any, dots:TenantRow[]) {
  dots.filter(d=>d.lat&&d.lng).forEach(d=>{
    const color = PLAN_COLOR[d.plan]??'#6b7280';
    const m = L.circleMarker([d.lat!,d.lng!],{ radius:8, fillColor:color, color:'#0a1220', weight:2, fillOpacity: d.is_active?0.9:0.3 });
    const addr = [d.address,d.colonia,d.postal_code,d.city,d.state_region].filter(Boolean).join('<br>');
    m.bindPopup(`<div style="font-family:system-ui;min-width:180px">
      <b style="font-size:13px">${d.name}</b><br>
      <span style="font-size:11px;color:${color};font-weight:600">${PLAN_LABEL[d.plan]??d.plan}</span><br>
      <span style="font-size:11px;color:#6b7280">${d.is_active?'<span style="color:#4ade80">●</span> Activo':'<span style="color:#f87171">●</span> Inactivo'}</span>
      ${addr?`<div style="font-size:10px;color:#6b7280;margin-top:5px;line-height:1.5">${addr}</div>`:''}
      ${d.owner_email?`<div style="font-size:10px;color:#9ca3af;margin-top:3px">${d.owner_email}</div>`:''}
      <a href="/admin/tenants/${d.id}" style="font-size:11px;color:#c9963a;margin-top:6px;display:block">Ver ficha CRM →</a>
    </div>`,{ maxWidth:260 });
    m.addTo(map);
  });
}

// ── Pipeline column ───────────────────────────────────────────────────────────
function PipelineCol({ title, color, bg, tenants, emptyText }: {
  title: string; color: string; bg: string;
  tenants: TenantRow[]; emptyText: string;
}) {
  return (
    <div style={{ flex:1, minWidth:200, background:'rgba(255,255,255,.025)', borderRadius:12, border:'1px solid rgba(255,255,255,.07)', overflow:'hidden' }}>
      <div style={{ padding:'12px 14px', borderBottom:'1px solid rgba(255,255,255,.06)', display:'flex', alignItems:'center', justifyContent:'space-between', background:bg }}>
        <span style={{ fontSize:12, fontWeight:700, color, letterSpacing:'.06em', textTransform:'uppercase' }}>{title}</span>
        <span style={{ fontSize:13, fontWeight:700, color, background:`${color}20`, padding:'2px 8px', borderRadius:6 }}>{tenants.length}</span>
      </div>
      <div style={{ padding:8, display:'flex', flexDirection:'column', gap:6, maxHeight:380, overflowY:'auto' }}>
        {tenants.length === 0 && <div style={{ fontSize:12, color:'rgba(255,255,255,.25)', textAlign:'center', padding:'20px 0' }}>{emptyText}</div>}
        {tenants.map(t => {
          const expDate = t.trial_ends_at ?? t.plan_valid_until;
          const days = expDate ? daysUntil(expDate) : null;
          const pc = PLAN_COLOR[t.plan]??'#6b7280';
          return (
            <Link key={t.id} href={`/admin/tenants/${t.id}`} style={{ textDecoration:'none' }}>
              <div style={{ padding:'10px 12px', borderRadius:9, background:'rgba(255,255,255,.03)', border:'1px solid rgba(255,255,255,.07)', transition:'all .15s', cursor:'pointer' }}
                onMouseEnter={e=>(e.currentTarget.style.background='rgba(255,255,255,.07)')}
                onMouseLeave={e=>(e.currentTarget.style.background='rgba(255,255,255,.03)')}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:4 }}>
                  <span style={{ fontSize:12, fontWeight:600, color:'#f1f5f9', lineHeight:1.3 }}>{t.name}</span>
                  <span style={{ fontSize:10, fontWeight:700, color:pc, background:`${pc}15`, padding:'1px 6px', borderRadius:4, flexShrink:0, marginLeft:4 }}>{PLAN_LABEL[t.plan]??t.plan}</span>
                </div>
                {t.city && <div style={{ fontSize:10, color:'rgba(255,255,255,.35)', marginBottom:3 }}>📍 {t.city}</div>}
                {days !== null && (
                  <div style={{ fontSize:10, fontWeight:600, color: days<=2?'#f87171':days<=7?'#fb923c':'#6b7280' }}>
                    {days<=0?'⚠ Venció':'⏰ '+days+'d restantes'}
                  </div>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function AdminDashboardPage() {
  const supabase = createClient();
  const [tenants, setTenants] = useState<TenantRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [view, setView] = useState<'pipeline'|'map'|'list'>('pipeline');

  useEffect(() => {
    supabase.from('v_tenant_map')
      .select('id,name,slug,plan,is_active,trial_ends_at,plan_valid_until,lat,lng,created_at,owner_email,address,colonia,city,state_region,postal_code,active_users,active_branches')
      .order('created_at', { ascending: false })
      .then(({ data }) => { setTenants((data??[]) as TenantRow[]); setLoading(false); });
  }, [supabase]);

  const now = new Date();
  const soon5 = new Date(now.getTime() + 5*86400000);

  // Buckets
  const active = tenants.filter(t => t.is_active);
  const trialBucket = active.filter(t => !t.plan_valid_until && t.trial_ends_at && new Date(t.trial_ends_at)>now);
  const paidBucket  = active.filter(t => t.plan_valid_until && new Date(t.plan_valid_until)>now);
  const riskBucket  = active.filter(t => {
    const d = t.trial_ends_at??t.plan_valid_until; if(!d) return false;
    const days = daysUntil(d); return days>=0&&days<=7;
  });
  const churnBucket = tenants.filter(t => {
    if(!t.is_active) return true;
    const d = t.trial_ends_at??t.plan_valid_until; if(!d) return false;
    return daysUntil(d)<0;
  });

  const mrr = paidBucket.reduce((s,t)=>s+(PLAN_MXN[t.plan]??0),0);
  const dots = tenants.filter(t=>t.lat&&t.lng);

  const filtered = search
    ? tenants.filter(t => t.name.toLowerCase().includes(search.toLowerCase()) || (t.city??'').toLowerCase().includes(search.toLowerCase()) || (t.owner_email??'').toLowerCase().includes(search.toLowerCase()))
    : tenants;

  const kpis = [
    { label:'MRR', value:`$${fmt(mrr)}`, sub:'MXN/mes', color:'#f59e0b' },
    { label:'Pagados', value:paidBucket.length, sub:'activos', color:'#34d399' },
    { label:'En trial', value:trialBucket.length, sub:'período de prueba', color:'#60a5fa' },
    { label:'En riesgo', value:riskBucket.length, sub:'vencen ≤7 días', color:'#fb923c' },
    { label:'Churned', value:churnBucket.length, sub:'inactivos o vencidos', color:'#f87171' },
    { label:'Con ubicación', value:dots.length, sub:`de ${tenants.length} totales`, color:'rgba(255,255,255,.5)' },
  ];

  return (
    <div>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', flexWrap:'wrap', gap:12, marginBottom:24 }}>
        <div>
          <h1 style={{ fontSize:22, fontWeight:700, color:'#f1f5f9', margin:0 }}>CRM · SuperAdmin</h1>
          <p style={{ fontSize:13, color:'rgba(255,255,255,.4)', marginTop:4 }}>
            {new Date().toLocaleDateString('es-MX',{weekday:'long',year:'numeric',month:'long',day:'numeric'})}
          </p>
        </div>
        <Link href="/admin/tenants/new" style={{ display:'flex', alignItems:'center', gap:6, padding:'9px 18px', borderRadius:10, background:'#c9963a', color:'#07090f', fontSize:13, fontWeight:700, textDecoration:'none' }}>
          + Nuevo restaurante
        </Link>
      </div>

      {/* KPI strip */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(130px,1fr))', gap:12, marginBottom:24 }}>
        {kpis.map(k=>(
          <div key={k.label} style={S.card}>
            <div style={{ fontSize:10, color:'rgba(255,255,255,.4)', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:6 }}>{k.label}</div>
            <div style={{ fontSize:24, fontWeight:700, color:k.color, fontFamily:'monospace' }}>{loading?'…':k.value}</div>
            <div style={{ fontSize:11, color:'rgba(255,255,255,.3)', marginTop:3 }}>{k.sub}</div>
          </div>
        ))}
      </div>

      {/* View toggle + search */}
      <div style={{ display:'flex', gap:10, marginBottom:18, flexWrap:'wrap', alignItems:'center' }}>
        <div style={{ display:'flex', gap:4, background:'rgba(255,255,255,.04)', borderRadius:9, padding:3, border:'1px solid rgba(255,255,255,.08)' }}>
          {(['pipeline','map','list'] as const).map(v=>(
            <button key={v} onClick={()=>setView(v)}
              style={{ padding:'6px 14px', borderRadius:7, fontSize:12, fontWeight:600, border:'none', cursor:'pointer', transition:'all .15s',
                background:view===v?'#c9963a':'transparent', color:view===v?'#07090f':'rgba(255,255,255,.5)' }}>
              {v==='pipeline'?'🏗 Pipeline':v==='map'?'🗺 Mapa':'📋 Lista'}
            </button>
          ))}
        </div>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar restaurante, ciudad, email…"
          style={{ flex:1, minWidth:200, padding:'8px 14px', borderRadius:9, background:'rgba(255,255,255,.05)', border:'1px solid rgba(255,255,255,.1)', color:'#f1f5f9', fontSize:13, outline:'none' }}/>
      </div>

      {/* ── PIPELINE VIEW ── */}
      {view==='pipeline' && (
        <div style={{ display:'flex', gap:12, overflowX:'auto', paddingBottom:8 }}>
          <PipelineCol title="Trial" color="#60a5fa" bg="rgba(96,165,250,.06)" tenants={search?filtered.filter(t=>trialBucket.includes(t)):trialBucket} emptyText="Sin trials activos" />
          <PipelineCol title="Pagados" color="#34d399" bg="rgba(52,211,153,.06)" tenants={search?filtered.filter(t=>paidBucket.includes(t)):paidBucket} emptyText="Sin suscripciones" />
          <PipelineCol title="En riesgo" color="#fb923c" bg="rgba(251,146,60,.06)" tenants={search?filtered.filter(t=>riskBucket.includes(t)):riskBucket} emptyText="Sin vencimientos próximos ✓" />
          <PipelineCol title="Churned" color="#f87171" bg="rgba(248,113,113,.06)" tenants={search?filtered.filter(t=>churnBucket.includes(t)):churnBucket} emptyText="Sin churns" />
        </div>
      )}

      {/* ── MAP VIEW ── */}
      {view==='map' && (
        <div style={S.card}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
            <span style={S.h}>Distribución geográfica</span>
            <div style={{ display:'flex', gap:12, alignItems:'center', flexWrap:'wrap' }}>
              {Object.entries(PLAN_COLOR).map(([plan,color])=>(
                <span key={plan} style={{ display:'flex', alignItems:'center', gap:4, fontSize:11, color:'rgba(255,255,255,.4)' }}>
                  <span style={{ width:8, height:8, borderRadius:'50%', background:color, display:'inline-block' }}/>
                  {PLAN_LABEL[plan]??plan}
                </span>
              ))}
              <span style={{ fontSize:11, color:'rgba(255,255,255,.3)' }}>{dots.length} ubicado{dots.length!==1?'s':''}</span>
            </div>
          </div>
          <LeafletMap dots={search?filtered.filter(t=>t.lat&&t.lng):dots} />
        </div>
      )}

      {/* ── LIST VIEW ── */}
      {view==='list' && (
        <div style={S.card}>
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
              <thead>
                <tr>
                  {['Restaurante','Plan','Estado','Ciudad','Email','Sucursales','Usuarios','Creado',''].map(h=>(
                    <th key={h} style={{ padding:'8px 14px', textAlign:'left', fontSize:10, fontWeight:700, color:'rgba(255,255,255,.35)', textTransform:'uppercase', letterSpacing:'.06em', borderBottom:'1px solid rgba(255,255,255,.08)', whiteSpace:'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(search?filtered:tenants).map(t=>{
                  const pc=PLAN_COLOR[t.plan]??'#6b7280';
                  const expDate=t.trial_ends_at??t.plan_valid_until;
                  const days=expDate?daysUntil(expDate):null;
                  const status = !t.is_active?{l:'Inactivo',c:'#f87171'} : days!==null&&days<=0?{l:'Vencido',c:'#f87171'} : days!==null&&days<=7?{l:`${days}d`,c:'#fb923c'} : t.plan_valid_until?{l:'Activo',c:'#34d399'} : {l:'Trial',c:'#60a5fa'};
                  return (
                    <tr key={t.id} style={{ borderBottom:'1px solid rgba(255,255,255,.05)', transition:'background .1s' }}
                      onMouseEnter={e=>(e.currentTarget.style.background='rgba(255,255,255,.03)')}
                      onMouseLeave={e=>(e.currentTarget.style.background='transparent')}>
                      <td style={{ padding:'10px 14px', fontWeight:600, color:'#f1f5f9', whiteSpace:'nowrap' }}>
                        <Link href={`/admin/tenants/${t.id}`} style={{ color:'#f1f5f9', textDecoration:'none' }}>{t.name}</Link>
                        <div style={{ fontSize:10, color:'rgba(255,255,255,.3)', fontFamily:'monospace', marginTop:1 }}>{t.slug}</div>
                      </td>
                      <td style={{ padding:'10px 14px' }}><span style={{ fontSize:11, fontWeight:700, color:pc, background:`${pc}15`, padding:'2px 8px', borderRadius:4 }}>{PLAN_LABEL[t.plan]??t.plan}</span></td>
                      <td style={{ padding:'10px 14px' }}><span style={{ fontSize:11, fontWeight:700, color:status.c }}>{status.l}</span></td>
                      <td style={{ padding:'10px 14px', color:'rgba(255,255,255,.55)', whiteSpace:'nowrap' }}>{t.city??'—'}</td>
                      <td style={{ padding:'10px 14px', color:'rgba(255,255,255,.45)', fontSize:11 }}>{t.owner_email??'—'}</td>
                      <td style={{ padding:'10px 14px', color:'rgba(255,255,255,.55)', textAlign:'center' }}>{t.active_branches??'—'}</td>
                      <td style={{ padding:'10px 14px', color:'rgba(255,255,255,.55)', textAlign:'center' }}>{t.active_users??'—'}</td>
                      <td style={{ padding:'10px 14px', color:'rgba(255,255,255,.35)', fontSize:11, whiteSpace:'nowrap' }}>{new Date(t.created_at).toLocaleDateString('es-MX',{day:'numeric',month:'short',year:'2-digit'})}</td>
                      <td style={{ padding:'10px 14px' }}>
                        <Link href={`/admin/tenants/${t.id}`} style={{ fontSize:11, color:'#c9963a', textDecoration:'none', whiteSpace:'nowrap' }}>Ver ficha →</Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {(search?filtered:tenants).length===0&&<div style={{ textAlign:'center', padding:32, color:'rgba(255,255,255,.3)', fontSize:13 }}>Sin resultados para "{search}"</div>}
          </div>
        </div>
      )}
    </div>
  );
}
