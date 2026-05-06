'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { ChefHat, Delete, MapPin } from 'lucide-react';

interface LoginUser {
  id: string;
  fullName: string;
  appRole: string;
  initials: string;
  branchId: string | null;
}

interface Branch {
  id: string;
  name: string;
  address: string;
}

interface Restaurant {
  id: string;
  name: string;
  slug: string;
}

const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrador', gerente: 'Gerente', cajero: 'Cajero',
  mesero: 'Mesero', cocinero: 'Cocinero', ayudante_cocina: 'Ayudante', repartidor: 'Repartidor',
};

const ROLE_COLORS: Record<string, string> = {
  admin: '#f59e0b', gerente: '#a78bfa', cajero: '#34d399',
  mesero: '#60a5fa', cocinero: '#fb923c', ayudante_cocina: '#f472b6', repartidor: '#4ade80',
};

function getInitials(name: string) {
  return name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();
}

const CSS = `
  @keyframes spin { to { transform: rotate(360deg) } }
  @keyframes fadein { from { opacity:0; transform:translateY(8px) } to { opacity:1; transform:translateY(0) } }
  @keyframes shake { 0%,100%{transform:translateX(0)} 25%{transform:translateX(-7px)} 75%{transform:translateX(7px)} }
  @keyframes pulseglow { 0%,100%{opacity:0.4} 50%{opacity:1} }

  .key-btn:active { background: rgba(255,255,255,0.12) !important; transform: scale(0.93); }
  .key-btn { transition: all 0.1s; }

  .user-card { transition: all 0.15s; cursor: pointer; }
  .user-card:hover { transform: translateY(-2px); border-color: rgba(255,255,255,0.15) !important; background: rgba(255,255,255,0.07) !important; }
  .user-card:active { transform: scale(0.97); }

  .branch-card { transition: all 0.15s; }
  .branch-card:hover { border-color: rgba(245,158,11,0.4) !important; background: rgba(245,158,11,0.06) !important; }

  .connector-line {
    position: absolute;
    background: linear-gradient(to bottom, rgba(255,255,255,0.15), rgba(255,255,255,0.05));
    width: 1px;
    left: 50%;
  }

  @media (max-width: 900px) {
    .desktop-only { display: none !important; }
  }
`;

export default function RestaurantLoginPage() {
  const { slug } = useParams<{ slug: string }>();
  const { signIn, appUser, loading: authLoading } = useAuth();
  const router = useRouter();
  const supabase = createClient();

  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [logoUrl, setLogoUrl] = useState('');
  const [branches, setBranches] = useState<Branch[]>([]);
  const [users, setUsers] = useState<LoginUser[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
  const [loadingRestaurant, setLoadingRestaurant] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [step, setStep] = useState<'diagram' | 'pin'>('diagram');
  const [selectedUser, setSelectedUser] = useState<LoginUser | null>(null);
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [shake, setShake] = useState(false);

  useEffect(() => {
    if (!authLoading && appUser) router.replace('/dashboard');
  }, [appUser, authLoading, router]);

  useEffect(() => {
    if (!slug) return;
    supabase.from('tenants').select('id, name, slug')
      .eq('slug', slug).eq('is_active', true).single()
      .then(async ({ data: tenant }) => {
        if (!tenant) { setNotFound(true); setLoadingRestaurant(false); return; }
        setRestaurant(tenant as Restaurant);

        // Logo, branches y users en paralelo
        const [logoRes, branchRes, usersRes] = await Promise.all([
          supabase.from('system_config').select('config_value')
            .eq('tenant_id', tenant.id).eq('config_key', 'brand_logo_url').single(),
          supabase.from('branches').select('id, name, address')
            .eq('tenant_id', tenant.id).eq('is_active', true).order('name'),
          supabase.from('app_users').select('id, full_name, app_role, branch_id')
            .eq('tenant_id', tenant.id).eq('is_active', true).order('app_role').order('full_name'),
        ]);

        if (logoRes.data?.config_value) setLogoUrl(logoRes.data.config_value);
        const branchList = (branchRes.data ?? []) as Branch[];
        setBranches(branchList);
        if (branchList.length === 1) setSelectedBranch(branchList[0]);

        setUsers((usersRes.data ?? []).map((u: any) => ({
          id: u.id, fullName: u.full_name, appRole: u.app_role,
          initials: getInitials(u.full_name), branchId: u.branch_id ?? null,
        })));
        setLoadingRestaurant(false);
      });
  }, [slug]);

  function handleSelectUser(u: LoginUser) {
    setSelectedUser(u); setPin(''); setError(''); setStep('pin');
  }

  function handleKeyPress(digit: string) {
    if (pin.length >= 8 || submitting) return;
    setPin(prev => prev + digit); setError('');
  }
  function handleDelete() { setPin(prev => prev.slice(0, -1)); setError(''); }

  async function submitPin(currentPin: string) {
    if (!selectedUser || submitting) return;
    setSubmitting(true);
    const result = await signIn(selectedUser.id, currentPin);
    setSubmitting(false);
    if (result.error) {
      setError('PIN incorrecto'); setPin('');
      setShake(true); setTimeout(() => setShake(false), 500);
    } else { router.replace('/dashboard'); }
  }

  useEffect(() => {
    if (pin.length >= 4 && !submitting) {
      const t = setTimeout(() => submitPin(pin), 150);
      return () => clearTimeout(t);
    }
  }, [pin]);

  // ── Loading ─────────────────────────────────────────────────────────────────
  if (authLoading || loadingRestaurant) {
    return (
      <div style={{ minHeight:'100dvh', display:'flex', alignItems:'center', justifyContent:'center', background:'#080b10' }}>
        <style>{CSS}</style>
        <div style={{ width:36, height:36, borderRadius:'50%', border:'2.5px solid rgba(245,158,11,0.12)', borderTopColor:'#f59e0b', animation:'spin .7s linear infinite' }} />
      </div>
    );
  }

  if (notFound) {
    return (
      <div style={{ minHeight:'100dvh', display:'flex', alignItems:'center', justifyContent:'center', background:'#080b10', padding:24 }}>
        <style>{CSS}</style>
        <div style={{ textAlign:'center' }}>
          <div style={{ fontSize:52, marginBottom:16 }}>🍽</div>
          <h1 style={{ color:'#f1f5f9', fontSize:20, fontWeight:700, margin:'0 0 8px' }}>Restaurante no encontrado</h1>
          <p style={{ color:'rgba(255,255,255,0.4)', fontSize:14 }}>El enlace no corresponde a ningún restaurante activo.</p>
        </div>
      </div>
    );
  }

  // ── PIN ──────────────────────────────────────────────────────────────────────
  if (step === 'pin' && selectedUser) {
    const color = ROLE_COLORS[selectedUser.appRole] ?? '#f59e0b';
    return (
      <div style={{ minHeight:'100dvh', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', background:'#080b10', padding:'24px 24px max(24px,env(safe-area-inset-bottom))', position:'relative' }}>
        <style>{CSS}</style>
        <button onClick={() => { setStep('diagram'); setPin(''); setError(''); }}
          style={{ position:'absolute', top:20, left:20, background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', color:'rgba(255,255,255,0.5)', cursor:'pointer', fontSize:13, padding:'8px 14px', borderRadius:10 }}>
          ← Volver
        </button>

        {/* Mini logo */}
        <div style={{ position:'absolute', top:16, left:'50%', transform:'translateX(-50%)', display:'flex', alignItems:'center', gap:8 }}>
          {logoUrl && <img src={logoUrl} alt="" style={{ width:28, height:28, borderRadius:8, objectFit:'contain', border:'1px solid rgba(255,255,255,0.08)' }} />}
          <span style={{ fontSize:12, color:'rgba(255,255,255,0.25)', fontWeight:600 }}>{restaurant?.name}</span>
        </div>

        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', marginBottom:32 }}>
          <div style={{ width:76, height:76, borderRadius:'50%', background:color+'18', border:`2px solid ${color}50`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:28, fontWeight:700, color, marginBottom:14, fontFamily:'system-ui', boxShadow:`0 0 32px ${color}25` }}>
            {selectedUser.initials}
          </div>
          <div style={{ fontSize:19, fontWeight:700, color:'#f1f5f9' }}>{selectedUser.fullName}</div>
          <div style={{ fontSize:12, color, marginTop:4, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.06em' }}>{ROLE_LABELS[selectedUser.appRole] ?? selectedUser.appRole}</div>
        </div>

        <p style={{ fontSize:11, color:'rgba(255,255,255,0.3)', marginBottom:20, letterSpacing:'0.08em', textTransform:'uppercase' }}>Ingresa tu PIN</p>

        <div style={{ display:'flex', gap:18, marginBottom:6, animation: shake ? 'shake 0.4s ease' : 'none' }}>
          {[0,1,2,3].map(i => (
            <div key={i} style={{ width:13, height:13, borderRadius:'50%', background: i < pin.length ? color : 'rgba(255,255,255,0.1)', transition:'background 0.15s', boxShadow: i < pin.length ? `0 0 12px ${color}80` : 'none' }} />
          ))}
        </div>
        {error
          ? <p style={{ fontSize:12, color:'#f87171', height:28, display:'flex', alignItems:'center' }}>{error}</p>
          : <div style={{ height:28 }} />}

        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12, width:'100%', maxWidth:272 }}>
          {[1,2,3,4,5,6,7,8,9].map(n => (
            <button key={n} className="key-btn" onClick={() => handleKeyPress(String(n))}
              style={{ height:68, borderRadius:20, border:'1px solid rgba(255,255,255,0.07)', background:'rgba(255,255,255,0.04)', color:'#f1f5f9', fontSize:26, fontWeight:400, cursor:'pointer', fontFamily:'system-ui' }}>
              {n}
            </button>
          ))}
          <div />
          <button className="key-btn" onClick={() => handleKeyPress('0')}
            style={{ height:68, borderRadius:20, border:'1px solid rgba(255,255,255,0.07)', background:'rgba(255,255,255,0.04)', color:'#f1f5f9', fontSize:26, fontWeight:400, cursor:'pointer', fontFamily:'system-ui' }}>
            0
          </button>
          <button className="key-btn" onClick={handleDelete}
            style={{ height:68, borderRadius:20, border:'none', background:'transparent', color:'rgba(255,255,255,0.3)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <Delete size={22} />
          </button>
        </div>

        {submitting && (
          <div style={{ marginTop:24, display:'flex', alignItems:'center', gap:8, color:'rgba(255,255,255,0.3)', fontSize:12 }}>
            <div style={{ width:14, height:14, borderRadius:'50%', border:`1.5px solid ${color}30`, borderTopColor:color, animation:'spin .7s linear infinite' }} />
            Verificando...
          </div>
        )}
      </div>
    );
  }

  // Usuarios filtrados por sucursal seleccionada (o todos si no hay filtro)
  const visibleUsers = selectedBranch
    ? users.filter(u => !u.branchId || u.branchId === selectedBranch.id)
    : users;

  // ── Diagrama ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight:'100dvh', background:'#080b10', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'40px 24px', overflow:'auto' }}>
      <style>{CSS}</style>

      {/* ── Nivel 1: Logo del restaurante ── */}
      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', animation:'fadein 0.3s ease' }}>
        <div style={{ width:100, height:100, borderRadius:28, background: logoUrl ? '#0f1923' : 'rgba(245,158,11,0.08)', border: logoUrl ? '1px solid rgba(255,255,255,0.1)' : '2px dashed rgba(245,158,11,0.3)', display:'flex', alignItems:'center', justifyContent:'center', overflow:'hidden', boxShadow:'0 0 0 8px rgba(245,158,11,0.04), 0 16px 48px rgba(0,0,0,0.5)', position:'relative' }}>
          {logoUrl
            ? <img src={logoUrl} alt={restaurant?.name} style={{ width:'100%', height:'100%', objectFit:'contain', padding:10 }} />
            : <ChefHat size={44} style={{ color:'#f59e0b' }} />}
        </div>
        <h1 style={{ fontSize:26, fontWeight:800, color:'#f1f5f9', margin:'16px 0 4px', letterSpacing:'-0.5px', textAlign:'center' }}>
          {restaurant?.name}
        </h1>
        <p style={{ fontSize:13, color:'rgba(255,255,255,0.28)', margin:0 }}>Sistema de gestión</p>
      </div>

      {/* ── Conector vertical ── */}
      <div style={{ width:1, height:36, background:'linear-gradient(to bottom, rgba(245,158,11,0.4), rgba(255,255,255,0.1))', margin:'4px 0' }} />

      {/* ── Nivel 2: Sucursales ── */}
      {branches.length > 0 && (
        <>
          <div style={{ display:'flex', gap:12, flexWrap:'wrap', justifyContent:'center', animation:'fadein 0.4s ease' }}>
            {branches.map(b => {
              const isSelected = selectedBranch?.id === b.id;
              return (
                <button key={b.id} className="branch-card"
                  onClick={() => setSelectedBranch(isSelected && branches.length > 1 ? null : b)}
                  style={{ display:'flex', alignItems:'center', gap:10, padding:'12px 20px', borderRadius:14, border: isSelected ? '1.5px solid rgba(245,158,11,0.5)' : '1px solid rgba(255,255,255,0.08)', background: isSelected ? 'rgba(245,158,11,0.08)' : 'rgba(255,255,255,0.03)', cursor:'pointer', minWidth:160 }}>
                  <div style={{ width:32, height:32, borderRadius:10, background: isSelected ? 'rgba(245,158,11,0.2)' : 'rgba(255,255,255,0.06)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <MapPin size={15} style={{ color: isSelected ? '#f59e0b' : 'rgba(255,255,255,0.4)' }} />
                  </div>
                  <div style={{ textAlign:'left' }}>
                    <div style={{ fontSize:13, fontWeight:600, color: isSelected ? '#f1f5f9' : 'rgba(255,255,255,0.7)' }}>{b.name}</div>
                    {b.address && <div style={{ fontSize:11, color:'rgba(255,255,255,0.3)', marginTop:1 }}>{b.address}</div>}
                  </div>
                </button>
              );
            })}
          </div>
          {/* Conector */}
          <div style={{ width:1, height:36, background:'linear-gradient(to bottom, rgba(255,255,255,0.15), rgba(255,255,255,0.05))', margin:'4px 0' }} />
        </>
      )}

      {/* ── Nivel 3: Empleados ── */}
      <div style={{ width:'100%', maxWidth:560, animation:'fadein 0.5s ease' }}>
        <p style={{ fontSize:11, color:'rgba(255,255,255,0.25)', textAlign:'center', margin:'0 0 16px', textTransform:'uppercase', letterSpacing:'0.08em' }}>
          {selectedBranch ? selectedBranch.name : 'Todos los empleados'} · {visibleUsers.length} personas
        </p>

        {/* Grid de empleados */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(260px, 1fr))', gap:10 }}>
          {visibleUsers.map((u, i) => {
            const color = ROLE_COLORS[u.appRole] ?? '#f59e0b';
            return (
              <button key={u.id} className="user-card" onClick={() => handleSelectUser(u)}
                style={{ display:'flex', alignItems:'center', gap:14, padding:'14px 16px', borderRadius:16, border:'1px solid rgba(255,255,255,0.07)', background:'rgba(255,255,255,0.03)', textAlign:'left', width:'100%', animationDelay:`${i*0.04}s` }}>
                <div style={{ width:50, height:50, borderRadius:'50%', background:color+'15', border:`2px solid ${color}35`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:17, fontWeight:700, color, flexShrink:0, fontFamily:'system-ui', boxShadow:`0 0 16px ${color}20` }}>
                  {u.initials}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:14, fontWeight:600, color:'#f1f5f9', lineHeight:1.3, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{u.fullName}</div>
                  <div style={{ fontSize:11, color, marginTop:3, fontWeight:600 }}>{ROLE_LABELS[u.appRole] ?? u.appRole}</div>
                </div>
                <div style={{ width:28, height:28, borderRadius:'50%', background:'rgba(255,255,255,0.04)', display:'flex', alignItems:'center', justifyContent:'center', color:'rgba(255,255,255,0.2)', fontSize:16, flexShrink:0 }}>›</div>
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ display:'flex', alignItems:'center', gap:16, marginTop:32 }}>
        <button onClick={() => router.push('/login')}
          style={{ background:'none', border:'none', color:'rgba(255,255,255,0.2)', cursor:'pointer', fontSize:12, padding:'6px 10px', borderRadius:8 }}>
          ← Cambiar restaurante
        </button>
        <span style={{ color:'rgba(255,255,255,0.06)' }}>·</span>
        <p style={{ fontSize:11, color:'rgba(255,255,255,0.07)', margin:0 }}>Powered by Aldente</p>
      </div>
    </div>
  );
}
