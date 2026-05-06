'use client';

import { useState, useEffect } from 'react';
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

const ROLE_LABELS: Record<string,string> = {
  admin:'Administrador', gerente:'Gerente', cajero:'Cajero',
  mesero:'Mesero', cocinero:'Cocinero', ayudante_cocina:'Ayudante', repartidor:'Repartidor',
};
const ROLE_COLORS: Record<string,string> = {
  admin:'#f59e0b', gerente:'#a78bfa', cajero:'#34d399',
  mesero:'#60a5fa', cocinero:'#fb923c', ayudante_cocina:'#f472b6', repartidor:'#4ade80',
};
// Roles que tienen acceso global (no están asignados a una sucursal específica)
const GLOBAL_ROLES = ['admin', 'gerente'];

function getInitials(name: string) {
  return name.split(' ').slice(0,2).map(n=>n[0]).join('').toUpperCase();
}

const CSS = `
  @keyframes spin{to{transform:rotate(360deg)}}
  @keyframes fadein{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
  @keyframes shake{0%,100%{transform:translateX(0)}25%{transform:translateX(-7px)}75%{transform:translateX(7px)}}
  .key-btn:active{background:rgba(255,255,255,0.12)!important;transform:scale(0.93);}
  .key-btn{transition:all 0.1s;}
  .user-card{transition:all 0.15s;cursor:pointer;}
  .user-card:hover{transform:translateY(-2px);border-color:rgba(255,255,255,0.18)!important;background:rgba(255,255,255,0.07)!important;}
  .branch-col{transition:all 0.35s cubic-bezier(0.4,0,0.2,1);overflow:hidden;}
  .branch-header{transition:all 0.2s;cursor:pointer;}
  .branch-header:hover{background:rgba(255,255,255,0.07)!important;}
  .users-list{transition:max-height 0.4s cubic-bezier(0.4,0,0.2,1),opacity 0.3s ease;}
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
  const [loadingRestaurant, setLoadingRestaurant] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [step, setStep] = useState<'diagram'|'pin'>('diagram');
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
    supabase.from('tenants').select('id,name,slug')
      .eq('slug', slug).eq('is_active', true).single()
      .then(async ({ data: tenant }) => {
        if (!tenant) { setNotFound(true); setLoadingRestaurant(false); return; }
        setRestaurant(tenant as Restaurant);
        const [logoRes, branchRes, usersRes] = await Promise.all([
          supabase.from('system_config').select('config_value').eq('tenant_id', tenant.id).eq('config_key','brand_logo_url').single(),
          supabase.from('branches').select('id,name,address').eq('tenant_id', tenant.id).eq('is_active',true).order('name'),
          supabase.from('app_users').select('id,full_name,app_role,branch_id').eq('tenant_id', tenant.id).eq('is_active',true).order('app_role').order('full_name'),
        ]);
        if (logoRes.data?.config_value) setLogoUrl(logoRes.data.config_value);
        setBranches((branchRes.data ?? []) as Branch[]);
        setUsers((usersRes.data ?? []).map((u:any) => ({
          id:u.id, fullName:u.full_name, appRole:u.app_role,
          initials:getInitials(u.full_name), branchId:u.branch_id ?? null,
        })));
        setLoadingRestaurant(false);
      });
  }, [slug]);

  function handleSelectUser(u: LoginUser) {
    setSelectedUser(u); setPin(''); setError(''); setStep('pin');
  }
  function handleKeyPress(digit: string) { if (pin.length < 8 && !submitting) { setPin(p=>p+digit); setError(''); } }
  function handleDelete() { setPin(p=>p.slice(0,-1)); setError(''); }

  async function submitPin(currentPin: string) {
    if (!selectedUser || submitting) return;
    setSubmitting(true);
    const result = await signIn(selectedUser.id, currentPin);
    setSubmitting(false);
    if (result.error) {
      setError('PIN incorrecto'); setPin('');
      setShake(true); setTimeout(()=>setShake(false), 500);
    } else { router.replace('/dashboard'); }
  }

  useEffect(() => {
    if (pin.length >= 4 && !submitting) {
      const t = setTimeout(()=>submitPin(pin), 150);
      return ()=>clearTimeout(t);
    }
  }, [pin]);

  useEffect(() => {
    if (step !== 'pin') return;
    function onKey(e: KeyboardEvent) {
      if (e.key >= '0' && e.key <= '9') handleKeyPress(e.key);
      else if (e.key === 'Backspace') handleDelete();
      else if (e.key === 'Escape') { setStep('diagram'); setPin(''); setError(''); }
    }
    window.addEventListener('keydown', onKey);
    return ()=>window.removeEventListener('keydown', onKey);
  }, [step, pin, submitting]);

  const [expandedBranch, setExpandedBranch] = useState<string | null>(null);
  // Usuarios globales (admin/gerente sin sucursal específica)
  const globalUsers = users.filter(u => GLOBAL_ROLES.includes(u.appRole));
  // Usuarios por sucursal
  function branchUsers(branchId: string) {
    return users.filter(u => !GLOBAL_ROLES.includes(u.appRole) && (u.branchId === branchId || u.branchId === null));
  }

  if (authLoading || loadingRestaurant) {
    return (
      <div style={{minHeight:'100dvh',display:'flex',alignItems:'center',justifyContent:'center',background:'#080b10'}}>
        <style>{CSS}</style>
        <div style={{width:36,height:36,borderRadius:'50%',border:'2.5px solid rgba(245,158,11,0.12)',borderTopColor:'#f59e0b',animation:'spin .7s linear infinite'}} />
      </div>
    );
  }

  if (notFound) {
    return (
      <div style={{minHeight:'100dvh',display:'flex',alignItems:'center',justifyContent:'center',background:'#080b10',padding:24}}>
        <div style={{textAlign:'center'}}>
          <div style={{fontSize:52,marginBottom:16}}>🍽</div>
          <h1 style={{color:'#f1f5f9',fontSize:20,fontWeight:700,margin:'0 0 8px'}}>Restaurante no encontrado</h1>
        </div>
      </div>
    );
  }

  // ── PIN ──────────────────────────────────────────────────────────────────────
  if (step === 'pin' && selectedUser) {
    const color = ROLE_COLORS[selectedUser.appRole] ?? '#f59e0b';
    return (
      <div style={{minHeight:'100dvh',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',background:'#080b10',padding:'24px 24px max(24px,env(safe-area-inset-bottom))',position:'relative'}}>
        <style>{CSS}</style>
        <button onClick={()=>{setStep('diagram');setPin('');setError('');}}
          style={{position:'absolute',top:20,left:20,background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)',color:'rgba(255,255,255,0.5)',cursor:'pointer',fontSize:13,padding:'8px 14px',borderRadius:10}}>
          ← Volver
        </button>
        <div style={{position:'absolute',top:16,left:'50%',transform:'translateX(-50%)',display:'flex',alignItems:'center',gap:8}}>
          {logoUrl && <img src={logoUrl} alt="" style={{width:26,height:26,borderRadius:7,objectFit:'contain',border:'1px solid rgba(255,255,255,0.08)'}} />}
          <span style={{fontSize:12,color:'rgba(255,255,255,0.25)',fontWeight:600}}>{restaurant?.name}</span>
        </div>
        <div style={{display:'flex',flexDirection:'column',alignItems:'center',marginBottom:32}}>
          <div style={{width:76,height:76,borderRadius:'50%',background:color+'18',border:`2px solid ${color}50`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:28,fontWeight:700,color,marginBottom:14,fontFamily:'system-ui',boxShadow:`0 0 32px ${color}25`}}>
            {selectedUser.initials}
          </div>
          <div style={{fontSize:19,fontWeight:700,color:'#f1f5f9'}}>{selectedUser.fullName}</div>
          <div style={{fontSize:12,color,marginTop:4,fontWeight:600,textTransform:'uppercase',letterSpacing:'0.06em'}}>{ROLE_LABELS[selectedUser.appRole]??selectedUser.appRole}</div>
        </div>
        <p style={{fontSize:11,color:'rgba(255,255,255,0.3)',marginBottom:20,letterSpacing:'0.08em',textTransform:'uppercase'}}>Ingresa tu PIN</p>
        <div style={{display:'flex',gap:18,marginBottom:6,animation:shake?'shake 0.4s ease':'none'}}>
          {[0,1,2,3].map(i=>(
            <div key={i} style={{width:13,height:13,borderRadius:'50%',background:i<pin.length?color:'rgba(255,255,255,0.1)',transition:'background 0.15s',boxShadow:i<pin.length?`0 0 12px ${color}80`:'none'}} />
          ))}
        </div>
        {error?<p style={{fontSize:12,color:'#f87171',height:28,display:'flex',alignItems:'center'}}>{error}</p>:<div style={{height:28}} />}
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12,width:'100%',maxWidth:272}}>
          {[1,2,3,4,5,6,7,8,9].map(n=>(
            <button key={n} className="key-btn" onClick={()=>handleKeyPress(String(n))}
              style={{height:68,borderRadius:20,border:'1px solid rgba(255,255,255,0.07)',background:'rgba(255,255,255,0.04)',color:'#f1f5f9',fontSize:26,fontWeight:400,cursor:'pointer',fontFamily:'system-ui'}}>
              {n}
            </button>
          ))}
          <div />
          <button className="key-btn" onClick={()=>handleKeyPress('0')}
            style={{height:68,borderRadius:20,border:'1px solid rgba(255,255,255,0.07)',background:'rgba(255,255,255,0.04)',color:'#f1f5f9',fontSize:26,fontWeight:400,cursor:'pointer',fontFamily:'system-ui'}}>
            0
          </button>
          <button className="key-btn" onClick={handleDelete}
            style={{height:68,borderRadius:20,border:'none',background:'transparent',color:'rgba(255,255,255,0.3)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>
            <Delete size={22} />
          </button>
        </div>
        {submitting&&(
          <div style={{marginTop:24,display:'flex',alignItems:'center',gap:8,color:'rgba(255,255,255,0.3)',fontSize:12}}>
            <div style={{width:14,height:14,borderRadius:'50%',border:`1.5px solid ${color}30`,borderTopColor:color,animation:'spin .7s linear infinite'}} />
            Verificando...
          </div>
        )}
      </div>
    );
  }

  // ── Diagrama ─────────────────────────────────────────────────────────────────
  return (
    <div style={{minHeight:'100dvh',background:'#080b10',display:'flex',flexDirection:'column',alignItems:'center',padding:'40px 20px 32px',overflow:'auto'}}>
      <style>{CSS}</style>

      {/* Nivel 1: Logo + nombre */}
      <div style={{display:'flex',flexDirection:'column',alignItems:'center',animation:'fadein 0.3s ease'}}>
        <div style={{width:96,height:96,borderRadius:26,background:logoUrl?'#0f1923':'rgba(245,158,11,0.08)',border:logoUrl?'1px solid rgba(255,255,255,0.1)':'2px dashed rgba(245,158,11,0.3)',display:'flex',alignItems:'center',justifyContent:'center',overflow:'hidden',boxShadow:'0 0 0 8px rgba(245,158,11,0.04),0 16px 48px rgba(0,0,0,0.5)'}}>
          {logoUrl?<img src={logoUrl} alt={restaurant?.name} style={{width:'100%',height:'100%',objectFit:'contain',padding:10}} />:<ChefHat size={42} style={{color:'#f59e0b'}} />}
        </div>
        <h1 style={{fontSize:24,fontWeight:800,color:'#f1f5f9',margin:'14px 0 4px',letterSpacing:'-0.5px',textAlign:'center'}}>{restaurant?.name}</h1>
        <p style={{fontSize:12,color:'rgba(255,255,255,0.25)',margin:0}}>Sistema de gestión</p>
      </div>

      {/* Admins/Gerentes — nivel global, sin sucursal */}
      {globalUsers.length > 0 && (
        <>
          <div style={{width:1,height:28,background:'linear-gradient(to bottom,rgba(245,158,11,0.5),rgba(255,255,255,0.1))',margin:'6px 0'}} />
          <div style={{display:'flex',gap:10,flexWrap:'wrap',justifyContent:'center',animation:'fadein 0.35s ease'}}>
            {globalUsers.map(u=>{
              const color=ROLE_COLORS[u.appRole]??'#f59e0b';
              return (
                <button key={u.id} className="user-card" onClick={()=>handleSelectUser(u)}
                  style={{display:'flex',alignItems:'center',gap:12,padding:'12px 16px',borderRadius:14,border:`1px solid ${color}25`,background:`${color}08`,minWidth:180}}>
                  <div style={{width:44,height:44,borderRadius:'50%',background:color+'20',border:`2px solid ${color}50`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,fontWeight:700,color,flexShrink:0,fontFamily:'system-ui',boxShadow:`0 0 16px ${color}30`}}>
                    {u.initials}
                  </div>
                  <div>
                    <div style={{fontSize:14,fontWeight:600,color:'#f1f5f9',lineHeight:1.2}}>{u.fullName}</div>
                    <div style={{fontSize:11,color,marginTop:3,fontWeight:600}}>{ROLE_LABELS[u.appRole]??u.appRole}</div>
                  </div>
                  <div style={{color:'rgba(255,255,255,0.2)',fontSize:16,marginLeft:'auto'}}>›</div>
                </button>
              );
            })}
          </div>
        </>
      )}

      {/* Conector hacia sucursales */}
      <div style={{width:1,height:32,background:'linear-gradient(to bottom,rgba(255,255,255,0.15),rgba(255,255,255,0.05))',margin:'6px 0'}} />

      {/* Nivel 2+3: Sucursales con acordeón */}
      <div style={{display:'flex',gap:12,flexWrap:'wrap',justifyContent:'center',width:'100%',maxWidth:860,animation:'fadein 0.4s ease'}}>
        {branches.map(b=>{
          const bUsers = branchUsers(b.id);
          const isExpanded = expandedBranch === b.id;
          const isCollapsed = expandedBranch !== null && expandedBranch !== b.id;
          return (
            <div key={b.id} className="branch-col"
              style={{
                flex: isCollapsed ? '0 1 180px' : '1 1 300px',
                maxWidth: isCollapsed ? 220 : 420,
                minWidth: isCollapsed ? 160 : 280,
                display:'flex',flexDirection:'column',alignItems:'center',
                opacity: isCollapsed ? 0.45 : 1,
              }}>
              {/* Header sucursal — clickeable */}
              <button className="branch-header" onClick={()=>setExpandedBranch(isExpanded ? null : b.id)}
                style={{
                  display:'flex',alignItems:'center',gap:10,padding:'13px 16px',
                  borderRadius:14,
                  border: isExpanded ? '1.5px solid rgba(245,158,11,0.4)' : '1px solid rgba(255,255,255,0.1)',
                  background: isExpanded ? 'rgba(245,158,11,0.07)' : 'rgba(255,255,255,0.04)',
                  width:'100%',cursor:'pointer',textAlign:'left',
                }}>
                <div style={{width:32,height:32,borderRadius:9,background:isExpanded?'rgba(245,158,11,0.2)':'rgba(255,255,255,0.06)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,transition:'background 0.2s'}}>
                  <MapPin size={14} style={{color:isExpanded?'#f59e0b':'rgba(255,255,255,0.35)',transition:'color 0.2s'}} />
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:13,fontWeight:700,color: isExpanded ? '#f1f5f9' : 'rgba(255,255,255,0.65)'}}>{b.name}</div>
                  {!isCollapsed && b.address && <div style={{fontSize:10,color:'rgba(255,255,255,0.28)',marginTop:1,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{b.address}</div>}
                </div>
                <div style={{
                  width:22,height:22,borderRadius:'50%',
                  background:isExpanded?'rgba(245,158,11,0.15)':'rgba(255,255,255,0.05)',
                  display:'flex',alignItems:'center',justifyContent:'center',
                  flexShrink:0,fontSize:13,
                  color:isExpanded?'#f59e0b':'rgba(255,255,255,0.25)',
                  transform: isExpanded?'rotate(90deg)':'rotate(0deg)',
                  transition:'all 0.25s',
                }}>›</div>
              </button>

              {/* Empleados — expand/collapse con max-height */}
              <div className="users-list" style={{
                maxHeight: isExpanded ? `${bUsers.length * 80 + 40}px` : '0px',
                opacity: isExpanded ? 1 : 0,
                width:'100%',
                pointerEvents: isExpanded ? 'auto' : 'none',
                overflow:'hidden',
              }}>
                <div style={{width:1,height:14,background:'rgba(255,255,255,0.08)',margin:'0 auto'}} />
                <div style={{display:'flex',flexDirection:'column',gap:8}}>
                  {bUsers.length === 0
                    ? <div style={{textAlign:'center',fontSize:11,color:'rgba(255,255,255,0.2)',padding:'14px 0'}}>Sin empleados asignados</div>
                    : bUsers.map(u=>{
                      const color=ROLE_COLORS[u.appRole]??'#f59e0b';
                      return (
                        <button key={u.id} className="user-card" onClick={()=>handleSelectUser(u)}
                          style={{display:'flex',alignItems:'center',gap:12,padding:'12px 16px',borderRadius:14,border:'1px solid rgba(255,255,255,0.07)',background:'rgba(255,255,255,0.03)',textAlign:'left',width:'100%'}}>
                          <div style={{width:44,height:44,borderRadius:'50%',background:color+'15',border:`1.5px solid ${color}35`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,fontWeight:700,color,flexShrink:0,fontFamily:'system-ui'}}>
                            {u.initials}
                          </div>
                          <div style={{flex:1}}>
                            <div style={{fontSize:14,fontWeight:600,color:'#f1f5f9',lineHeight:1.3}}>{u.fullName}</div>
                            <div style={{fontSize:11,color,marginTop:2,fontWeight:600}}>{ROLE_LABELS[u.appRole]??u.appRole}</div>
                          </div>
                          <div style={{color:'rgba(255,255,255,0.18)',fontSize:16}}>›</div>
                        </button>
                      );
                    })
                  }
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div style={{display:'flex',alignItems:'center',gap:16,marginTop:32}}>
        <button onClick={()=>router.push('/login')}
          style={{background:'none',border:'none',color:'rgba(255,255,255,0.2)',cursor:'pointer',fontSize:12,padding:'6px 10px',borderRadius:8}}
          onMouseEnter={e=>(e.currentTarget.style.color='rgba(255,255,255,0.5)')}
          onMouseLeave={e=>(e.currentTarget.style.color='rgba(255,255,255,0.2)')}>
          ← Cambiar restaurante
        </button>
        <span style={{color:'rgba(255,255,255,0.06)'}}>·</span>
        <p style={{fontSize:11,color:'rgba(255,255,255,0.07)',margin:0}}>Powered by Aldente</p>
      </div>
    </div>
  );
}
