'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { ChefHat, Delete } from 'lucide-react';

interface LoginUser {
  id: string;
  fullName: string;
  appRole: string;
  initials: string;
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

export default function RestaurantLoginPage() {
  const { slug } = useParams<{ slug: string }>();
  const { signIn, appUser, loading: authLoading } = useAuth();
  const router = useRouter();
  const supabase = createClient();

  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [logoUrl, setLogoUrl] = useState('');
  const [loadingRestaurant, setLoadingRestaurant] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [users, setUsers] = useState<LoginUser[]>([]);
  const [step, setStep] = useState<'select' | 'pin'>('select');
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
        supabase.from('system_config').select('config_value')
          .eq('tenant_id', tenant.id).eq('config_key', 'brand_logo_url')
          .single().then(({ data }) => { if (data?.config_value) setLogoUrl(data.config_value); });
        const { data: usersData } = await supabase.from('app_users')
          .select('id, full_name, app_role').eq('tenant_id', tenant.id)
          .eq('is_active', true).order('app_role').order('full_name');
        setUsers((usersData ?? []).map((u: Record<string,string>) => ({
          id: u.id, fullName: u.full_name, appRole: u.app_role, initials: getInitials(u.full_name),
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

  const CSS = `
    @keyframes spin { to { transform: rotate(360deg) } }
    @keyframes fadein { from { opacity:0; transform:translateY(10px) } to { opacity:1; transform:translateY(0) } }
    @keyframes shake { 0%,100%{transform:translateX(0)} 25%{transform:translateX(-8px)} 75%{transform:translateX(8px)} }
    .key-btn { transition: background 0.1s, transform 0.1s; }
    .key-btn:active { background: rgba(255,255,255,0.12) !important; transform: scale(0.95); }
    .user-btn { transition: background 0.15s, border-color 0.15s; }
    .user-btn:hover { background: rgba(255,255,255,0.07) !important; }
  `;

  if (authLoading || loadingRestaurant) {
    return (
      <div style={{ minHeight:'100dvh', display:'flex', alignItems:'center', justifyContent:'center', background:'#080b10' }}>
        <style>{CSS}</style>
        <div style={{ width:36, height:36, borderRadius:'50%', border:'2.5px solid rgba(245,158,11,0.15)', borderTopColor:'#f59e0b', animation:'spin .7s linear infinite' }} />
      </div>
    );
  }

  if (notFound) {
    return (
      <div style={{ minHeight:'100dvh', display:'flex', alignItems:'center', justifyContent:'center', background:'#080b10', padding:24 }}>
        <div style={{ textAlign:'center' }}>
          <div style={{ fontSize:56, marginBottom:16 }}>🍽</div>
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
        <button onClick={() => { setStep('select'); setPin(''); setError(''); }}
          style={{ position:'absolute', top:24, left:24, background:'none', border:'none', color:'rgba(255,255,255,0.35)', cursor:'pointer', fontSize:13, padding:'8px 12px', borderRadius:8 }}>
          ← Volver
        </button>

        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', marginBottom:36 }}>
          <div style={{ width:72, height:72, borderRadius:'50%', background:color+'18', border:`2px solid ${color}50`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:26, fontWeight:700, color, marginBottom:12, fontFamily:'system-ui', boxShadow:`0 0 24px ${color}30` }}>
            {selectedUser.initials}
          </div>
          <div style={{ fontSize:18, fontWeight:700, color:'#f1f5f9' }}>{selectedUser.fullName}</div>
          <div style={{ fontSize:12, color, marginTop:3, fontWeight:600 }}>{ROLE_LABELS[selectedUser.appRole] ?? selectedUser.appRole}</div>
        </div>

        <p style={{ fontSize:12, color:'rgba(255,255,255,0.35)', marginBottom:20, letterSpacing:'0.05em', textTransform:'uppercase' }}>Ingresa tu PIN</p>

        <div style={{ display:'flex', gap:16, marginBottom:6, animation: shake ? 'shake 0.4s ease' : 'none' }}>
          {[0,1,2,3].map(i => (
            <div key={i} style={{ width:14, height:14, borderRadius:'50%', background: i < pin.length ? color : 'rgba(255,255,255,0.1)', transition:'background 0.15s', boxShadow: i < pin.length ? `0 0 10px ${color}80` : 'none' }} />
          ))}
        </div>

        {error
          ? <p style={{ fontSize:12, color:'#f87171', height:24, display:'flex', alignItems:'center' }}>{error}</p>
          : <div style={{ height:24 }} />}

        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12, width:'100%', maxWidth:280, marginTop:8 }}>
          {[1,2,3,4,5,6,7,8,9].map(n => (
            <button key={n} className="key-btn" onClick={() => handleKeyPress(String(n))}
              style={{ height:64, borderRadius:18, border:'1px solid rgba(255,255,255,0.08)', background:'rgba(255,255,255,0.04)', color:'#f1f5f9', fontSize:24, fontWeight:500, cursor:'pointer', fontFamily:'system-ui' }}>
              {n}
            </button>
          ))}
          <div />
          <button className="key-btn" onClick={() => handleKeyPress('0')}
            style={{ height:64, borderRadius:18, border:'1px solid rgba(255,255,255,0.08)', background:'rgba(255,255,255,0.04)', color:'#f1f5f9', fontSize:24, fontWeight:500, cursor:'pointer', fontFamily:'system-ui' }}>
            0
          </button>
          <button className="key-btn" onClick={handleDelete}
            style={{ height:64, borderRadius:18, border:'none', background:'transparent', color:'rgba(255,255,255,0.3)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <Delete size={22} />
          </button>
        </div>

        {submitting && (
          <div style={{ marginTop:24, display:'flex', alignItems:'center', gap:8, color:'rgba(255,255,255,0.3)', fontSize:12 }}>
            <div style={{ width:14, height:14, borderRadius:'50%', border:`1.5px solid ${color}40`, borderTopColor:color, animation:'spin .7s linear infinite' }} />
            Verificando...
          </div>
        )}
      </div>
    );
  }

  // ── Selector ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight:'100dvh', display:'flex', background:'#080b10' }}>
      <style>{CSS}</style>

      {/* Panel izquierdo — branding (oculto en móvil) */}
      <div className="brand-panel" style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', borderRight:'1px solid rgba(255,255,255,0.05)', padding:48, position:'relative', overflow:'hidden' }}>
        {/* Glow de fondo */}
        <div style={{ position:'absolute', width:400, height:400, borderRadius:'50%', background:'radial-gradient(circle, rgba(245,158,11,0.08) 0%, transparent 70%)', top:'50%', left:'50%', transform:'translate(-50%,-50%)', pointerEvents:'none' }} />
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', position:'relative', zIndex:1 }}>
          <div style={{ width:120, height:120, borderRadius:32, background: logoUrl ? '#111827' : 'rgba(245,158,11,0.08)', border: logoUrl ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(245,158,11,0.2)', display:'flex', alignItems:'center', justifyContent:'center', marginBottom:24, overflow:'hidden', boxShadow:'0 20px 60px rgba(0,0,0,0.6)' }}>
            {logoUrl
              ? <img src={logoUrl} alt={restaurant?.name ?? 'Logo'} style={{ width:'100%', height:'100%', objectFit:'contain', padding:14 }} />
              : <ChefHat size={52} style={{ color:'#f59e0b' }} />}
          </div>
          <h1 style={{ fontSize:32, fontWeight:800, color:'#f1f5f9', margin:'0 0 8px', textAlign:'center', letterSpacing:'-0.5px' }}>
            {restaurant?.name}
          </h1>
          <p style={{ fontSize:14, color:'rgba(255,255,255,0.3)', margin:'0 0 48px' }}>Sistema de gestión de restaurante</p>
          <div style={{ display:'flex', flexDirection:'column', gap:12, width:'100%', maxWidth:280 }}>
            {['POS · Mesas · Para llevar','Cocina · KDS · Mesero móvil','Inventario · P&L · Reportes'].map((txt,i) => (
              <div key={i} style={{ display:'flex', alignItems:'center', gap:10, color:'rgba(255,255,255,0.35)', fontSize:13 }}>
                <div style={{ width:6, height:6, borderRadius:'50%', background:'#f59e0b', flexShrink:0 }} />
                {txt}
              </div>
            ))}
          </div>
        </div>
        <p style={{ position:'absolute', bottom:24, fontSize:11, color:'rgba(255,255,255,0.1)' }}>Powered by Aldente</p>
      </div>

      {/* Panel derecho — selector */}
      <div style={{ width:'100%', maxWidth:480, display:'flex', flexDirection:'column', justifyContent:'center', padding:'max(32px,env(safe-area-inset-top)) 32px max(32px,env(safe-area-inset-bottom))' }}>

        {/* Logo móvil (solo visible en pantallas pequeñas) */}
        <div className="mobile-logo" style={{ display:'none', flexDirection:'column', alignItems:'center', marginBottom:32 }}>
          <div style={{ width:72, height:72, borderRadius:20, background: logoUrl ? '#111827' : 'rgba(245,158,11,0.08)', border:'1px solid rgba(255,255,255,0.08)', display:'flex', alignItems:'center', justifyContent:'center', marginBottom:12, overflow:'hidden' }}>
            {logoUrl ? <img src={logoUrl} alt="" style={{ width:'100%', height:'100%', objectFit:'contain', padding:8 }} /> : <ChefHat size={30} style={{ color:'#f59e0b' }} />}
          </div>
          <h2 style={{ fontSize:18, fontWeight:700, color:'#f1f5f9', margin:0 }}>{restaurant?.name}</h2>
        </div>

        <h2 style={{ fontSize:22, fontWeight:700, color:'#f1f5f9', margin:'0 0 4px' }}>¿Quién eres?</h2>
        <p style={{ fontSize:13, color:'rgba(255,255,255,0.35)', margin:'0 0 28px' }}>Selecciona tu perfil para continuar</p>

        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {users.map((u, i) => {
            const color = ROLE_COLORS[u.appRole] ?? '#f59e0b';
            return (
              <button key={u.id} className="user-btn" onClick={() => handleSelectUser(u)}
                style={{ display:'flex', alignItems:'center', gap:16, padding:'16px 20px', borderRadius:16, border:'1px solid rgba(255,255,255,0.07)', background:'rgba(255,255,255,0.03)', cursor:'pointer', textAlign:'left', width:'100%' }}>
                <div style={{ width:52, height:52, borderRadius:'50%', background:color+'15', border:`2px solid ${color}35`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, fontWeight:700, color, flexShrink:0, fontFamily:'system-ui' }}>
                  {u.initials}
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:16, fontWeight:600, color:'#f1f5f9', lineHeight:1.3 }}>{u.fullName}</div>
                  <div style={{ fontSize:12, color, marginTop:3, fontWeight:600 }}>{ROLE_LABELS[u.appRole] ?? u.appRole}</div>
                </div>
                <div style={{ width:32, height:32, borderRadius:'50%', background:'rgba(255,255,255,0.05)', display:'flex', alignItems:'center', justifyContent:'center', color:'rgba(255,255,255,0.3)', fontSize:18 }}>›</div>
              </button>
            );
          })}
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .brand-panel { display: none !important; }
          .mobile-logo { display: flex !important; }
        }
      `}</style>
    </div>
  );
}
