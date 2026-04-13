'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { ArrowLeft, Eye, EyeOff } from 'lucide-react';

type Step = 'restaurant' | 'branch' | 'user' | 'pin' | 'recover';

interface Restaurant { id: string; name: string; slug: string; }
interface Branch { id: string; name: string; address: string; }
interface LoginUser { id: string; fullName: string; appRole: string; }

const ROLE_LABELS: Record<string, string> = {
  admin:'Administrador',gerente:'Gerente',cajero:'Cajero',
  mesero:'Mesero',cocinero:'Cocinero',ayudante_cocina:'Ayudante de Cocina',repartidor:'Repartidor',
};
const ROLE_ICONS: Record<string, string> = {
  admin:'👑',gerente:'🧑‍💼',cajero:'💰',mesero:'🍽️',
  cocinero:'👨‍🍳',ayudante_cocina:'🔪',repartidor:'🛵',
};
const ROLE_COLORS: Record<string, string> = {
  admin:'#c9963a',gerente:'#a78bfa',cajero:'#34d399',
  mesero:'#60a5fa',cocinero:'#f97316',ayudante_cocina:'#fb923c',repartidor:'#e879f9',
};

const SLUG_KEY = 'aldente_last_slug';
const BRANCH_KEY = 'aldente_last_branch';

function slugify(s: string) {
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
}

export default function LoginPage() {
  const { signIn, appUser, loading } = useAuth();
  const router = useRouter();
  const supabase = createClient();

  const [step, setStep]               = useState<Step>('restaurant');
  const [slugInput, setSlugInput]     = useState('');
  const [restaurant, setRestaurant]   = useState<Restaurant | null>(null);
  const [branches, setBranches]       = useState<Branch[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
  const [users, setUsers]             = useState<LoginUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<LoginUser | null>(null);
  const [pin, setPin]                 = useState('');
  const [showPin, setShowPin]         = useState(false);
  const [searching, setSearching]     = useState(false);
  const [searchError, setSearchError] = useState('');
  const [error, setError]             = useState('');
  const [submitting, setSubmitting]   = useState(false);
  const [recoverEmail, setRecoverEmail] = useState('');
  const [recoverSent, setRecoverSent] = useState(false);
  const [recoverLoading, setRecoverLoading] = useState(false);

  useEffect(() => {
    if (!loading && appUser) {
      const role = appUser.appRole ?? 'mesero';
      const routes: Record<string,string> = {
        admin:'/dashboard',gerente:'/dashboard',cajero:'/corte-caja',
        mesero:'/mesero',cocinero:'/cocina',ayudante_cocina:'/cocina',repartidor:'/delivery',
      };
      router.replace(routes[role] ?? '/dashboard');
    }
  }, [appUser, loading, router]);

  useEffect(() => {
    const s = localStorage.getItem(SLUG_KEY);
    if (s) setSlugInput(s);
  }, []);

  async function handleFindRestaurant(e: { preventDefault(): void }) {
    e.preventDefault();
    setSearchError('');
    const q = slugInput.trim();
    if (!q) return;
    setSearching(true);

    const { data: bySlug } = await supabase.from('tenants').select('id,name,slug').eq('slug', slugify(q)).eq('is_active',true).single();
    let found: Restaurant | null = bySlug as Restaurant | null;
    if (!found) {
      const { data: byName } = await supabase.from('tenants').select('id,name,slug').ilike('name',`%${q}%`).eq('is_active',true).limit(1).single();
      found = byName as Restaurant | null;
    }
    setSearching(false);
    if (!found) { setSearchError('No encontramos ese restaurante. Verifica el nombre e intenta de nuevo.'); return; }

    localStorage.setItem(SLUG_KEY, found.slug);
    setRestaurant(found);

    // Load branches
    const { data: branchData } = await supabase.from('branches').select('id,name,address').eq('tenant_id', found.id).eq('is_active',true).order('name');
    const bList = (branchData ?? []) as Branch[];

    if (bList.length <= 1) {
      // Single branch or no branches — skip branch step
      const branch = bList[0] ?? null;
      setSelectedBranch(branch);
      await loadUsers(found.id, branch?.id ?? null);
      setStep('user');
    } else {
      setBranches(bList);
      // Pre-select last branch if remembered
      const lastBranchId = localStorage.getItem(BRANCH_KEY);
      const lastBranch = bList.find(b => b.id === lastBranchId) ?? null;
      if (lastBranch) setSelectedBranch(lastBranch);
      setStep('branch');
    }
  }

  async function handleSelectBranch(branch: Branch) {
    setSelectedBranch(branch);
    localStorage.setItem(BRANCH_KEY, branch.id);
    await loadUsers(restaurant!.id, branch.id);
    setStep('user');
  }

  async function loadUsers(tenantId: string, branchId: string | null) {
    let q = supabase.from('app_users').select('id,full_name,app_role').eq('tenant_id', tenantId).eq('is_active',true);
    // Admins see all branches; other roles filter by branch
    // We load all active users — branch filter is cosmetic at login
    const { data } = await q.order('app_role').order('full_name');
    setUsers((data ?? []).map((u: Record<string,string>) => ({ id:u.id, fullName:u.full_name, appRole:u.app_role })));
  }

  function handleSelectUser(user: LoginUser) {
    setSelectedUser(user); setPin(''); setError(''); setStep('pin');
  }

  async function handleSignIn(e: { preventDefault(): void }) {
    e.preventDefault();
    if (!selectedUser || !pin) return;
    setError(''); setSubmitting(true);
    const result = await signIn(selectedUser.id, pin);
    setSubmitting(false);
    if (result.error) { setError(result.error); setPin(''); return; }
    const role = result.user?.appRole ?? 'mesero';
    const routes: Record<string,string> = {
      admin:'/dashboard',gerente:'/dashboard',cajero:'/corte-caja',
      mesero:'/mesero',cocinero:'/cocina',ayudante_cocina:'/cocina',repartidor:'/delivery',
    };
    router.replace(routes[role] ?? '/dashboard');
  }

  async function handleRecover(e: { preventDefault(): void }) {
    e.preventDefault();
    if (!recoverEmail.trim()) return;
    setRecoverLoading(true);
    await supabase.auth.resetPasswordForEmail(recoverEmail.trim(), { redirectTo: `${window.location.origin}/reset-password` });
    setRecoverLoading(false);
    setRecoverSent(true);
  }

  if (loading) return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#07090f' }}>
      <div style={{ width:32, height:32, borderRadius:'50%', border:'2px solid rgba(201,150,58,0.2)', borderTopColor:'#c9963a', animation:'spin 1s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  const stepIndex = ['restaurant','branch','user','pin'].indexOf(step);
  const totalSteps = branches.length > 0 ? 4 : 3;

  return (
    <div style={{ minHeight:'100vh', display:'flex', background:'#07090f', fontFamily:"'Outfit',system-ui,sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=Outfit:wght@300;400;500;600;700&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        @keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
        @keyframes spin{to{transform:rotate(360deg)}}
        input:-webkit-autofill{-webkit-box-shadow:0 0 0 1000px rgba(255,255,255,0.04) inset;-webkit-text-fill-color:#f0ece4;}
        .login-brand{display:flex}
        .login-form-panel{width:min(460px,100%)}
        @media(max-width:768px){
          .login-brand{display:none!important}
          .login-form-panel{width:100%!important;min-height:100vh;padding:32px 24px!important}
        }
      `}</style>

      {/* BG grid */}
      <div style={{ position:'fixed', inset:0, backgroundImage:'linear-gradient(rgba(201,150,58,.02) 1px,transparent 1px),linear-gradient(90deg,rgba(201,150,58,.02) 1px,transparent 1px)', backgroundSize:'80px 80px', pointerEvents:'none' }} />

      {/* LEFT panel — brand */}
      <div className="login-brand" style={{ flex:1, display:'flex', flexDirection:'column', justifyContent:'space-between', padding:'clamp(32px,5vw,64px)', borderRight:'1px solid rgba(255,255,255,.05)', position:'relative' }}>
        <div style={{ position:'absolute', bottom:'10%', left:'20%', width:500, height:400, background:'radial-gradient(ellipse,rgba(201,150,58,.05) 0%,transparent 65%)', pointerEvents:'none' }} />
        {/* Logo */}
        <div style={{ display:'flex', alignItems:'center', gap:12, position:'relative' }}>
          <img src="/assets/images/logo_aldente.png" alt="Aldente" style={{ width:40, height:40, objectFit:'contain' }} />
          <span style={{ fontFamily:"'Playfair Display',serif", fontSize:22, fontWeight:700, color:'#c9963a', letterSpacing:'.03em' }}>Aldente</span>
        </div>
        {/* Hero */}
        <div style={{ position:'relative', maxWidth:440 }}>
          <p style={{ fontSize:11, fontWeight:700, letterSpacing:'.14em', textTransform:'uppercase', color:'#c9963a', marginBottom:18, display:'flex', alignItems:'center', gap:10 }}>
            <span style={{ display:'block', width:24, height:1, background:'rgba(201,150,58,.4)' }} />Sistema para restaurantes
          </p>
          <h1 style={{ fontFamily:"'Playfair Display',serif", fontSize:'clamp(34px,4vw,54px)', fontWeight:700, color:'#f0ece4', lineHeight:1.08, marginBottom:18 }}>
            Sabes exactamente<br /><em style={{ color:'#c9963a', fontStyle:'italic' }}>qué pasa</em><br />en tu restaurante.
          </h1>
          <p style={{ fontSize:15, fontWeight:300, color:'rgba(240,236,228,.5)', lineHeight:1.8 }}>P&L del día. Inventario vivo.<br />Merma real. En tiempo real.</p>
          <div style={{ display:'flex', gap:32, marginTop:36 }}>
            {[['30 seg','Corte de caja'],['Multi','Sucursal'],['0 papel','En operación']].map(([v,l])=>(
              <div key={l}>
                <p style={{ fontFamily:"'Playfair Display',serif", fontSize:26, fontWeight:700, color:'#c9963a', lineHeight:1 }}>{v}</p>
                <p style={{ fontSize:11, color:'rgba(240,236,228,.35)', marginTop:4 }}>{l}</p>
              </div>
            ))}
          </div>
        </div>
        <div style={{ display:'flex', gap:20, position:'relative' }}>
          {[['← Inicio','/'],['Funcionalidades','/funcionalidades']].map(([l,h])=>(
            <a key={l} href={h} style={{ fontSize:12, color:'rgba(240,236,228,.3)', textDecoration:'none', transition:'color .2s' }}
              onMouseEnter={e=>(e.currentTarget.style.color='rgba(240,236,228,.7)')}
              onMouseLeave={e=>(e.currentTarget.style.color='rgba(240,236,228,.3)')}>{l}</a>
          ))}
        </div>
      </div>

      {/* RIGHT panel — form */}
      <div className="login-form-panel" style={{ width:'min(460px,100%)', display:'flex', alignItems:'center', justifyContent:'center', padding:'clamp(24px,4vw,48px)', position:'relative' }}>
        <div style={{ width:'100%', maxWidth:380, animation:'fadeUp .5s ease both' }}>

          {/* Progress bar */}
          {step !== 'restaurant' && step !== 'recover' && (
            <div style={{ display:'flex', gap:4, marginBottom:28 }}>
              {Array.from({ length: totalSteps }).map((_,i)=>(
                <div key={i} style={{ flex:1, height:2, borderRadius:1, background: stepIndex > 0 && i < stepIndex ? '#c9963a' : i === stepIndex - 1 ? '#c9963a' : 'rgba(255,255,255,.08)', transition:'background .3s' }} />
              ))}
            </div>
          )}

          {/* RECOVER */}
          {step === 'recover' && (
            <>
              <button onClick={()=>{ setStep('restaurant'); setRecoverSent(false); setRecoverEmail(''); }}
                style={{ display:'flex', alignItems:'center', gap:8, background:'none', border:'none', color:'rgba(240,236,228,.4)', fontSize:13, cursor:'pointer', marginBottom:28, padding:0 }}>
                <ArrowLeft size={15}/> Volver
              </button>
              {recoverSent ? (
                <div style={{ textAlign:'center' }}>
                  <div style={{ width:52, height:52, borderRadius:'50%', background:'rgba(201,150,58,.1)', border:'1px solid rgba(201,150,58,.3)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 16px', fontSize:22 }}>✓</div>
                  <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:22, fontWeight:700, color:'#f0ece4', marginBottom:10 }}>Revisa tu correo</h2>
                  <p style={{ fontSize:13, color:'rgba(240,236,228,.5)', lineHeight:1.7 }}>Si existe una cuenta con <strong style={{ color:'#f0ece4' }}>{recoverEmail}</strong>, recibirás un enlace para restablecer tu contraseña.</p>
                </div>
              ) : (
                <>
                  <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:26, fontWeight:700, color:'#f0ece4', marginBottom:8 }}>Recuperar acceso</h2>
                  <p style={{ fontSize:13, color:'rgba(240,236,228,.5)', marginBottom:24, lineHeight:1.65 }}>Ingresa el correo de tu cuenta de administrador.</p>
                  <form onSubmit={handleRecover} style={{ display:'flex', flexDirection:'column', gap:12 }}>
                    <input type="email" placeholder="correo@ejemplo.com" value={recoverEmail} onChange={e=>setRecoverEmail(e.target.value)} autoFocus
                      style={{ padding:'13px 16px', borderRadius:12, border:'1px solid rgba(255,255,255,.1)', background:'rgba(255,255,255,.04)', color:'#f0ece4', fontSize:15, outline:'none', width:'100%', fontFamily:'inherit' }}
                      onFocus={e=>(e.target.style.borderColor='rgba(201,150,58,.5)')} onBlur={e=>(e.target.style.borderColor='rgba(255,255,255,.1)')} />
                    <button type="submit" disabled={recoverLoading||!recoverEmail.trim()}
                      style={{ padding:13, borderRadius:12, border:'none', background:recoverEmail.trim()?'#c9963a':'rgba(201,150,58,.25)', color:'#07090f', fontSize:15, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
                      {recoverLoading?'Enviando...':'Enviar enlace →'}
                    </button>
                  </form>
                </>
              )}
            </>
          )}

          {/* STEP 1 — Restaurant */}
          {step === 'restaurant' && (
            <>
              <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:28, fontWeight:700, color:'#f0ece4', marginBottom:6 }}>Bienvenido</h2>
              <p style={{ fontSize:14, color:'rgba(240,236,228,.45)', marginBottom:24 }}>¿En qué restaurante trabajas?</p>
              <form onSubmit={handleFindRestaurant} style={{ display:'flex', flexDirection:'column', gap:12 }}>
                <input type="text" value={slugInput} onChange={e=>{ setSlugInput(e.target.value); setSearchError(''); }}
                  placeholder="Nombre o código del restaurante" autoFocus autoComplete="off"
                  style={{ padding:'13px 16px', borderRadius:12, border: searchError?'1px solid rgba(248,113,113,.5)':'1px solid rgba(255,255,255,.1)', background:'rgba(255,255,255,.04)', color:'#f0ece4', fontSize:15, outline:'none', width:'100%', fontFamily:'inherit', transition:'border-color .2s' }}
                  onFocus={e=>{ if(!searchError) e.target.style.borderColor='rgba(201,150,58,.5)'; }}
                  onBlur={e=>{ if(!searchError) e.target.style.borderColor='rgba(255,255,255,.1)'; }} />
                {searchError && <p style={{ fontSize:12, color:'#f87171' }}>⚠ {searchError}</p>}
                <button type="submit" disabled={searching||!slugInput.trim()}
                  style={{ padding:13, borderRadius:12, border:'none', background:searching||!slugInput.trim()?'rgba(201,150,58,.25)':'#c9963a', color:'#07090f', fontSize:15, fontWeight:700, cursor:'pointer', fontFamily:'inherit', transition:'all .2s' }}>
                  {searching?'Buscando...':'Continuar →'}
                </button>
              </form>
              <div style={{ marginTop:20, paddingTop:20, borderTop:'1px solid rgba(255,255,255,.06)', display:'flex', justifyContent:'space-between' }}>
                <button onClick={()=>setStep('recover')}
                  style={{ background:'none', border:'none', fontSize:12, color:'rgba(240,236,228,.35)', cursor:'pointer', fontFamily:'inherit', padding:0, transition:'color .2s' }}
                  onMouseEnter={e=>(e.currentTarget.style.color='rgba(240,236,228,.7)')} onMouseLeave={e=>(e.currentTarget.style.color='rgba(240,236,228,.35)')}>
                  ¿Olvidaste tu acceso?
                </button>
                <a href="/admin/login" style={{ fontSize:12, color:'rgba(240,236,228,.35)', textDecoration:'none', transition:'color .2s' }}
                  onMouseEnter={e=>(e.currentTarget.style.color='rgba(240,236,228,.7)')} onMouseLeave={e=>(e.currentTarget.style.color='rgba(240,236,228,.35)')}>
                  Acceso admin
                </a>
              </div>
            </>
          )}

          {/* STEP 2 — Branch (solo si hay múltiples) */}
          {step === 'branch' && restaurant && (
            <>
              <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:20 }}>
                <button onClick={()=>{ setStep('restaurant'); setRestaurant(null); setBranches([]); }}
                  style={{ background:'none', border:'none', cursor:'pointer', color:'rgba(240,236,228,.35)', padding:4, display:'flex' }}><ArrowLeft size={16}/></button>
                <div>
                  <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:22, fontWeight:700, color:'#f0ece4', margin:0 }}>{restaurant.name}</h2>
                  <p style={{ fontSize:12, color:'rgba(240,236,228,.4)', margin:0 }}>¿En qué sucursal trabajas hoy?</p>
                </div>
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                {branches.map(b=>(
                  <button key={b.id} onClick={()=>handleSelectBranch(b)}
                    style={{ display:'flex', alignItems:'center', gap:14, padding:'14px 16px', borderRadius:12, border:'1px solid rgba(255,255,255,.07)', background: selectedBranch?.id===b.id?'rgba(201,150,58,.08)':'rgba(255,255,255,.03)', cursor:'pointer', textAlign:'left', width:'100%', transition:'all .15s', fontFamily:'inherit' }}
                    onMouseEnter={e=>{ (e.currentTarget as HTMLButtonElement).style.background='rgba(255,255,255,.06)'; (e.currentTarget as HTMLButtonElement).style.borderColor='rgba(201,150,58,.4)'; }}
                    onMouseLeave={e=>{ (e.currentTarget as HTMLButtonElement).style.background=selectedBranch?.id===b.id?'rgba(201,150,58,.08)':'rgba(255,255,255,.03)'; (e.currentTarget as HTMLButtonElement).style.borderColor=selectedBranch?.id===b.id?'rgba(201,150,58,.4)':'rgba(255,255,255,.07)'; }}>
                    <div style={{ width:40, height:40, borderRadius:10, background:'rgba(201,150,58,.12)', border:'1px solid rgba(201,150,58,.25)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, flexShrink:0 }}>🏢</div>
                    <div style={{ flex:1 }}>
                      <p style={{ fontSize:14, fontWeight:600, color:'#f0ece4', margin:'0 0 2px' }}>{b.name}</p>
                      {b.address && <p style={{ fontSize:11, color:'rgba(240,236,228,.4)', margin:0 }}>{b.address}</p>}
                    </div>
                    <span style={{ color:'rgba(255,255,255,.2)', fontSize:16 }}>›</span>
                  </button>
                ))}
              </div>
            </>
          )}

          {/* STEP 3 — User */}
          {step === 'user' && restaurant && (
            <>
              <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:20 }}>
                <button onClick={()=>{ setStep(branches.length>1?'branch':'restaurant'); setUsers([]); }}
                  style={{ background:'none', border:'none', cursor:'pointer', color:'rgba(240,236,228,.35)', padding:4, display:'flex' }}><ArrowLeft size={16}/></button>
                <div>
                  <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:22, fontWeight:700, color:'#f0ece4', margin:0 }}>
                    {selectedBranch ? selectedBranch.name : restaurant.name}
                  </h2>
                  <p style={{ fontSize:12, color:'rgba(240,236,228,.4)', margin:0 }}>¿Quién eres?</p>
                </div>
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:6, maxHeight:400, overflowY:'auto' }}>
                {users.map(u=>(
                  <button key={u.id} onClick={()=>handleSelectUser(u)}
                    style={{ display:'flex', alignItems:'center', gap:14, padding:'12px 14px', borderRadius:12, border:'1px solid rgba(255,255,255,.07)', background:'rgba(255,255,255,.03)', cursor:'pointer', textAlign:'left', width:'100%', transition:'all .15s', fontFamily:'inherit' }}
                    onMouseEnter={e=>{ (e.currentTarget as HTMLButtonElement).style.background='rgba(255,255,255,.06)'; (e.currentTarget as HTMLButtonElement).style.borderColor=`${ROLE_COLORS[u.appRole]??'#c9963a'}50`; }}
                    onMouseLeave={e=>{ (e.currentTarget as HTMLButtonElement).style.background='rgba(255,255,255,.03)'; (e.currentTarget as HTMLButtonElement).style.borderColor='rgba(255,255,255,.07)'; }}>
                    <div style={{ width:40, height:40, borderRadius:10, background:`${ROLE_COLORS[u.appRole]??'#c9963a'}15`, border:`1px solid ${ROLE_COLORS[u.appRole]??'#c9963a'}25`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, flexShrink:0 }}>
                      {ROLE_ICONS[u.appRole]??'👤'}
                    </div>
                    <div style={{ flex:1 }}>
                      <p style={{ fontSize:14, fontWeight:600, color:'#f0ece4', margin:'0 0 1px' }}>{u.fullName}</p>
                      <p style={{ fontSize:11, color:ROLE_COLORS[u.appRole]??'rgba(240,236,228,.4)', margin:0 }}>{ROLE_LABELS[u.appRole]??u.appRole}</p>
                    </div>
                    <span style={{ color:'rgba(255,255,255,.2)', fontSize:16 }}>›</span>
                  </button>
                ))}
                {users.length===0 && <p style={{ fontSize:13, color:'rgba(240,236,228,.3)', textAlign:'center', padding:'24px 0' }}>Sin usuarios activos.</p>}
              </div>
            </>
          )}

          {/* STEP 4 — PIN */}
          {step === 'pin' && selectedUser && (
            <>
              <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:28 }}>
                <button onClick={()=>{ setStep('user'); setSelectedUser(null); setPin(''); setError(''); }}
                  style={{ background:'none', border:'none', cursor:'pointer', color:'rgba(240,236,228,.35)', padding:4, display:'flex' }}><ArrowLeft size={16}/></button>
                <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <div style={{ width:36, height:36, borderRadius:10, background:`${ROLE_COLORS[selectedUser.appRole]??'#c9963a'}15`, border:`1px solid ${ROLE_COLORS[selectedUser.appRole]??'#c9963a'}30`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:18 }}>
                    {ROLE_ICONS[selectedUser.appRole]??'👤'}
                  </div>
                  <div>
                    <p style={{ fontSize:15, fontWeight:700, color:'#f0ece4', margin:0 }}>{selectedUser.fullName}</p>
                    <p style={{ fontSize:11, color:ROLE_COLORS[selectedUser.appRole]??'rgba(240,236,228,.4)', margin:0 }}>{ROLE_LABELS[selectedUser.appRole]??selectedUser.appRole}</p>
                  </div>
                </div>
              </div>
              <p style={{ fontSize:13, color:'rgba(240,236,228,.45)', textAlign:'center', marginBottom:16 }}>Ingresa tu PIN de acceso</p>
              <div style={{ display:'flex', justifyContent:'center', gap:10, marginBottom:18 }}>
                {[0,1,2,3,4,5].map(i=>(
                  <div key={i} style={{ width:12, height:12, borderRadius:'50%', background: i<pin.length?(ROLE_COLORS[selectedUser.appRole]??'#c9963a'):'rgba(255,255,255,.1)', border: i<pin.length?'none':'1px solid rgba(255,255,255,.18)', transition:'all .12s', transform: i<pin.length?'scale(1.2)':'scale(1)' }} />
                ))}
              </div>
              <form onSubmit={handleSignIn} style={{ display:'flex', flexDirection:'column', gap:12 }}>
                <div style={{ position:'relative' }}>
                  <input type={showPin?'text':'password'} value={pin} onChange={e=>{ setPin(e.target.value.replace(/\D/g,'')); setError(''); }}
                    maxLength={8} inputMode="numeric" pattern="[0-9]*" autoFocus autoComplete="off"
                    style={{ width:'100%', padding:'14px 48px 14px 20px', borderRadius:12, border: error?'1px solid rgba(248,113,113,.4)':'1px solid rgba(255,255,255,.1)', background:'rgba(255,255,255,.04)', color:'#f0ece4', fontSize:26, fontFamily:'monospace', letterSpacing:10, textAlign:'center', outline:'none', boxSizing:'border-box', transition:'border-color .2s' }} />
                  <button type="button" onClick={()=>setShowPin(v=>!v)}
                    style={{ position:'absolute', right:14, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'rgba(255,255,255,.25)', display:'flex' }}>
                    {showPin?<EyeOff size={15}/>:<Eye size={15}/>}
                  </button>
                </div>
                {error && <p style={{ fontSize:12, color:'#f87171', textAlign:'center' }}>⚠ {error}</p>}
                <button type="submit" disabled={submitting||pin.length<4}
                  style={{ padding:14, borderRadius:12, border:'none', background: pin.length>=4?(ROLE_COLORS[selectedUser.appRole]??'#c9963a'):'rgba(201,150,58,.2)', color:'#07090f', fontSize:15, fontWeight:700, cursor: pin.length>=4?'pointer':'not-allowed', transition:'all .2s', fontFamily:'inherit' }}>
                  {submitting?'Verificando...':`Entrar como ${selectedUser.fullName.split(' ')[0]}`}
                </button>
                <button type="button" onClick={()=>setStep('recover')}
                  style={{ background:'none', border:'none', fontSize:12, color:'rgba(240,236,228,.3)', cursor:'pointer', fontFamily:'inherit', padding:'4px 0', transition:'color .2s' }}
                  onMouseEnter={e=>(e.currentTarget.style.color='rgba(240,236,228,.6)')} onMouseLeave={e=>(e.currentTarget.style.color='rgba(240,236,228,.3)')}>
                  ¿Olvidaste tu PIN? Contacta a tu administrador
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
