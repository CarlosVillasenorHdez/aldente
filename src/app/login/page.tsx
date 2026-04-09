'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { ArrowLeft, Eye, EyeOff, ChevronRight } from 'lucide-react';

type Step = 'restaurant' | 'user' | 'pin' | 'recovery';

interface LoginUser { id: string; fullName: string; appRole: string; }
interface Restaurant { id: string; name: string; slug: string; }

const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrador', gerente: 'Gerente', cajero: 'Cajero',
  mesero: 'Mesero', cocinero: 'Cocinero',
  ayudante_cocina: 'Ayudante de Cocina', repartidor: 'Repartidor',
};
const ROLE_ICONS: Record<string, string> = {
  admin: '👑', gerente: '🧑‍💼', cajero: '💰', mesero: '🍽️',
  cocinero: '👨‍🍳', ayudante_cocina: '🔪', repartidor: '🛵',
};
const ROLE_COLORS: Record<string, string> = {
  admin: '#c9963a', gerente: '#a78bfa', cajero: '#34d399',
  mesero: '#60a5fa', cocinero: '#f97316', ayudante_cocina: '#fb923c', repartidor: '#e879f9',
};

const SLUG_KEY = 'aldente_last_slug';
function slugify(str: string) {
  return str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export default function LoginPage() {
  const { signIn, appUser, loading } = useAuth();
  const router = useRouter();
  const supabase = createClient();

  const [step, setStep] = useState<Step>('restaurant');
  const [slugInput, setSlugInput] = useState('');
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [users, setUsers] = useState<LoginUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<LoginUser | null>(null);
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Recovery state
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [recoverySent, setRecoverySent] = useState(false);
  const [recoverySending, setRecoverySending] = useState(false);
  const [recoveryError, setRecoveryError] = useState('');

  useEffect(() => {
    if (!loading && appUser) {
      const role = appUser.appRole ?? 'mesero';
      const rd: Record<string, string> = {
        admin: '/dashboard', gerente: '/dashboard', cajero: '/corte-caja',
        mesero: '/mesero', cocinero: '/cocina', ayudante_cocina: '/cocina', repartidor: '/delivery',
      };
      router.replace(rd[role] ?? '/dashboard');
    }
  }, [appUser, loading, router]);

  useEffect(() => {
    const saved = localStorage.getItem(SLUG_KEY);
    if (saved) setSlugInput(saved);
  }, []);

  async function handleFindRestaurant(e: React.FormEvent) {
    e.preventDefault();
    setSearchError('');
    const query = slugInput.trim();
    if (!query) return;
    setSearching(true);
    const { data: bySlug } = await supabase.from('tenants').select('id,name,slug').eq('slug', slugify(query)).eq('is_active', true).single();
    let found = bySlug as Restaurant | null;
    if (!found) {
      const { data: byName } = await supabase.from('tenants').select('id,name,slug').ilike('name', `%${query}%`).eq('is_active', true).limit(1).single();
      found = byName as Restaurant | null;
    }
    setSearching(false);
    if (!found) { setSearchError('No encontramos ese restaurante. Verifica el nombre e intenta de nuevo.'); return; }
    localStorage.setItem(SLUG_KEY, found.slug);
    setRestaurant(found);
    const { data: usersData } = await supabase.from('app_users').select('id,full_name,app_role').eq('tenant_id', found.id).eq('is_active', true).order('app_role').order('full_name');
    setUsers((usersData ?? []).map((u: Record<string, string>) => ({ id: u.id, fullName: u.full_name, appRole: u.app_role })));
    setStep('user');
  }

  function handleSelectUser(user: LoginUser) {
    setSelectedUser(user);
    setPin(''); setError('');
    setStep('pin');
  }

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedUser || !pin) return;
    setError(''); setSubmitting(true);
    const result = await signIn(selectedUser.id, pin);
    setSubmitting(false);
    if (result.error) { setError(result.error); setPin(''); return; }
    const role = result.user?.appRole ?? 'mesero';
    const rd: Record<string, string> = {
      admin: '/dashboard', gerente: '/dashboard', cajero: '/corte-caja',
      mesero: '/mesero', cocinero: '/cocina', ayudante_cocina: '/cocina', repartidor: '/delivery',
    };
    router.replace(rd[role] ?? '/dashboard');
  }

  async function handleRecovery(e: React.FormEvent) {
    e.preventDefault();
    if (!recoveryEmail.trim()) return;
    setRecoveryError(''); setRecoverySending(true);
    const { error: err } = await supabase.auth.resetPasswordForEmail(recoveryEmail.trim(), {
      redirectTo: `${window.location.origin}/login`,
    });
    setRecoverySending(false);
    if (err) { setRecoveryError('No pudimos enviar el correo. Verifica la dirección e intenta de nuevo.'); return; }
    setRecoverySent(true);
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#07090f' }}>
        <div style={{ width: 28, height: 28, borderRadius: '50%', border: '2px solid rgba(201,150,58,0.2)', borderTopColor: '#c9963a', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  const accentColor = selectedUser ? (ROLE_COLORS[selectedUser.appRole] ?? '#c9963a') : '#c9963a';

  return (
    <div style={{ minHeight: '100vh', display: 'flex', fontFamily: "'Outfit', system-ui, sans-serif", background: '#07090f', position: 'relative', overflow: 'hidden' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=Outfit:wght@300;400;500;600;700&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        a{text-decoration:none;color:inherit}
        button{cursor:pointer;font-family:inherit}
        input{font-family:inherit}
        @keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes dot{0%,80%,100%{transform:scale(0)}40%{transform:scale(1)}}
        .inp{width:100%;padding:13px 16px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);border-radius:12px;color:#f0ece4;font-size:15px;font-family:inherit;outline:none;transition:border-color .2s}
        .inp:focus{border-color:rgba(201,150,58,0.5)}
        .inp::placeholder{color:rgba(240,236,228,0.25)}
        .inp.error{border-color:rgba(239,68,68,0.5)}
        .btn-gold{width:100%;padding:14px;border-radius:12px;border:none;background:#c9963a;color:#07090f;font-size:15px;font-weight:700;font-family:inherit;cursor:pointer;transition:all .2s}
        .btn-gold:hover:not(:disabled){background:#dba84a;transform:translateY(-1px)}
        .btn-gold:disabled{opacity:0.4;cursor:not-allowed}
        .user-card{display:flex;align-items:center;gap:14px;padding:14px 16px;border-radius:14px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07);cursor:pointer;transition:all .2s;width:100%;text-align:left}
        .user-card:hover{background:rgba(255,255,255,0.06);transform:translateX(3px)}
      `}</style>

      {/* Left panel — brand */}
      <div style={{ display: 'none', flex: '0 0 420px', background: '#0d0f17', borderRight: '1px solid rgba(255,255,255,0.05)', padding: '48px', flexDirection: 'column', justifyContent: 'space-between' }} className="brand-panel">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 64 }}>
            <img src="/assets/images/logo_aldente.png" alt="Aldente" style={{ width: 32, height: 32, objectFit: 'contain' }} />
            <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, fontWeight: 700, color: '#c9963a', letterSpacing: '.03em' }}>Aldente</span>
          </div>
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 40, fontWeight: 700, color: '#f0ece4', lineHeight: 1.1, marginBottom: 16 }}>
            Por primera vez,<br /><em style={{ color: '#c9963a' }}>sabes exactamente</em><br />qué pasa.
          </h2>
          <p style={{ fontSize: 15, color: 'rgba(240,236,228,0.5)', lineHeight: 1.75 }}>Sin esperar el corte. Sin llamar al cajero. El restaurante en tiempo real.</p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {['P&L del día en tiempo real', 'Merma real por ingrediente', 'Nómina LFT compliant', 'Multi-sucursal sin módulos extra'].map(f => (
            <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: 'rgba(240,236,228,0.55)' }}>
              <span style={{ color: '#c9963a', fontSize: 10 }}>✓</span> {f}
            </div>
          ))}
        </div>
      </div>

      {/* Right panel — form */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', position: 'relative' }}>
        {/* Background grid */}
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(201,150,58,0.02) 1px,transparent 1px),linear-gradient(90deg,rgba(201,150,58,0.02) 1px,transparent 1px)', backgroundSize: '60px 60px', pointerEvents: 'none' }} />
        {/* Center glow */}
        <div style={{ position: 'absolute', top: '40%', left: '50%', transform: 'translate(-50%,-50%)', width: 500, height: 400, background: `radial-gradient(ellipse,${accentColor}06 0%,transparent 65%)`, pointerEvents: 'none', transition: 'all 0.6s' }} />

        <div style={{ width: '100%', maxWidth: 400, position: 'relative', animation: 'fadeUp .5s ease both' }}>
          {/* Logo */}
          <div style={{ textAlign: 'center', marginBottom: 36 }}>
            <a href="/" style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
              <img src="/assets/images/logo_aldente.png" alt="Aldente" style={{ width: 52, height: 52, objectFit: 'contain' }} />
              <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 700, color: '#c9963a', letterSpacing: '.04em' }}>Aldente</span>
            </a>
          </div>

          {/* Progress dots */}
          {step !== 'recovery' && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 32 }}>
              {(['restaurant','user','pin'] as const).map((s, i) => {
                const steps = ['restaurant','user','pin'];
                const current = steps.indexOf(step);
                const done = current > i;
                const active = current === i;
                return (
                  <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: active ? 24 : 8, height: 8, borderRadius: 4, background: done ? '#c9963a' : active ? accentColor : 'rgba(255,255,255,0.1)', transition: 'all 0.3s' }} />
                  </div>
                );
              })}
            </div>
          )}

          {/* Card */}
          <div style={{ background: 'rgba(13,15,23,0.9)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 20, backdropFilter: 'blur(16px)', padding: '32px 28px' }}>

            {/* STEP 1 — Restaurant */}
            {step === 'restaurant' && (
              <>
                <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 700, color: '#f0ece4', marginBottom: 6 }}>¿En qué restaurante trabajas?</h2>
                <p style={{ fontSize: 13, color: 'rgba(240,236,228,0.4)', marginBottom: 24 }}>Escribe el nombre o código de tu restaurante</p>
                <form onSubmit={handleFindRestaurant} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <input className={`inp${searchError ? ' error' : ''}`} type="text" value={slugInput}
                    onChange={e => { setSlugInput(e.target.value); setSearchError(''); }}
                    placeholder="Ej: Tacos El Güero" autoFocus autoComplete="off" />
                  {searchError && <p style={{ fontSize: 12, color: '#f87171' }}>{searchError}</p>}
                  <button className="btn-gold" type="submit" disabled={searching || !slugInput.trim()}>
                    {searching ? 'Buscando...' : 'Continuar'}
                  </button>
                </form>
              </>
            )}

            {/* STEP 2 — Select user */}
            {step === 'user' && restaurant && (
              <>
                <button onClick={() => { setStep('restaurant'); setRestaurant(null); setUsers([]); }}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: 'rgba(240,236,228,0.35)', fontSize: 12, marginBottom: 20, padding: 0 }}>
                  <ArrowLeft size={13} /> Cambiar restaurante
                </button>
                <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 700, color: '#f0ece4', marginBottom: 4 }}>{restaurant.name}</h2>
                <p style={{ fontSize: 13, color: 'rgba(240,236,228,0.4)', marginBottom: 20 }}>Toca tu nombre para continuar</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 340, overflowY: 'auto' }}>
                  {users.map(u => (
                    <button key={u.id} className="user-card" onClick={() => handleSelectUser(u)}
                      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = `${ROLE_COLORS[u.appRole] ?? '#c9963a'}40`; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.07)'; }}>
                      <div style={{ width: 42, height: 42, borderRadius: 12, background: `${ROLE_COLORS[u.appRole] ?? '#c9963a'}15`, border: `1px solid ${ROLE_COLORS[u.appRole] ?? '#c9963a'}25`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>
                        {ROLE_ICONS[u.appRole] ?? '👤'}
                      </div>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: 15, fontWeight: 600, color: '#f0ece4', marginBottom: 2 }}>{u.fullName}</p>
                        <p style={{ fontSize: 12, color: ROLE_COLORS[u.appRole] ?? 'rgba(240,236,228,0.4)' }}>{ROLE_LABELS[u.appRole] ?? u.appRole}</p>
                      </div>
                      <ChevronRight size={16} style={{ color: 'rgba(240,236,228,0.2)', flexShrink: 0 }} />
                    </button>
                  ))}
                  {users.length === 0 && <p style={{ textAlign: 'center', color: 'rgba(240,236,228,0.3)', fontSize: 13, padding: '20px 0' }}>Sin usuarios activos en este restaurante</p>}
                </div>
              </>
            )}

            {/* STEP 3 — PIN */}
            {step === 'pin' && selectedUser && (
              <>
                <button onClick={() => { setStep('user'); setSelectedUser(null); setPin(''); setError(''); }}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: 'rgba(240,236,228,0.35)', fontSize: 12, marginBottom: 20, padding: 0 }}>
                  <ArrowLeft size={13} /> Cambiar usuario
                </button>
                {/* User chip */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: `${accentColor}10`, border: `1px solid ${accentColor}25`, borderRadius: 14, marginBottom: 24 }}>
                  <div style={{ width: 38, height: 38, borderRadius: 10, background: `${accentColor}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>
                    {ROLE_ICONS[selectedUser.appRole] ?? '👤'}
                  </div>
                  <div>
                    <p style={{ fontSize: 15, fontWeight: 700, color: '#f0ece4' }}>{selectedUser.fullName}</p>
                    <p style={{ fontSize: 12, color: accentColor }}>{ROLE_LABELS[selectedUser.appRole] ?? selectedUser.appRole}</p>
                  </div>
                </div>

                {/* PIN dots */}
                <p style={{ fontSize: 13, color: 'rgba(240,236,228,0.45)', textAlign: 'center', marginBottom: 16 }}>Ingresa tu PIN</p>
                <div style={{ display: 'flex', justifyContent: 'center', gap: 10, marginBottom: 20 }}>
                  {[0,1,2,3,4,5].map(i => (
                    <div key={i} style={{ width: 12, height: 12, borderRadius: '50%', background: i < pin.length ? accentColor : 'rgba(255,255,255,0.12)', border: i < pin.length ? 'none' : '1px solid rgba(255,255,255,0.2)', transition: 'all 0.15s', transform: i < pin.length ? 'scale(1.15)' : 'scale(1)' }} />
                  ))}
                </div>

                <form onSubmit={handleSignIn} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ position: 'relative' }}>
                    <input className={`inp${error ? ' error' : ''}`} type={showPin ? 'text' : 'password'}
                      value={pin} onChange={e => { setPin(e.target.value.replace(/\D/g, '')); setError(''); }}
                      maxLength={8} inputMode="numeric" autoFocus autoComplete="off"
                      style={{ textAlign: 'center', letterSpacing: '10px', fontSize: 24, paddingRight: 44 }} />
                    <button type="button" onClick={() => setShowPin(v => !v)}
                      style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'rgba(240,236,228,0.3)', display: 'flex' }}>
                      {showPin ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                  {error && <p style={{ fontSize: 12, color: '#f87171', textAlign: 'center' }}>{error}</p>}
                  <button className="btn-gold" type="submit" disabled={submitting || pin.length < 4}
                    style={{ background: pin.length >= 4 ? accentColor : 'rgba(255,255,255,0.08)', color: pin.length >= 4 ? '#07090f' : 'rgba(240,236,228,0.3)' }}>
                    {submitting ? 'Verificando...' : `Entrar como ${selectedUser.fullName.split(' ')[0]}`}
                  </button>
                </form>
                <button onClick={() => { setStep('recovery'); setRecoveryEmail(''); setRecoverySent(false); setRecoveryError(''); }}
                  style={{ display: 'block', width: '100%', textAlign: 'center', marginTop: 16, background: 'none', border: 'none', fontSize: 12, color: 'rgba(240,236,228,0.3)', transition: 'color .2s' }}
                  onMouseEnter={e => (e.currentTarget.style.color = 'rgba(240,236,228,0.6)')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'rgba(240,236,228,0.3)')}>
                  ¿Olvidaste tu PIN? Contacta a tu administrador
                </button>
              </>
            )}

            {/* STEP RECOVERY */}
            {step === 'recovery' && (
              <>
                <button onClick={() => setStep('restaurant')}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: 'rgba(240,236,228,0.35)', fontSize: 12, marginBottom: 20, padding: 0 }}>
                  <ArrowLeft size={13} /> Volver al inicio
                </button>
                <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 700, color: '#f0ece4', marginBottom: 6 }}>Recuperar acceso</h2>

                {!recoverySent ? (
                  <>
                    <p style={{ fontSize: 13, color: 'rgba(240,236,228,0.45)', marginBottom: 24, lineHeight: 1.65 }}>
                      Si eres administrador del sistema, ingresa tu correo y te enviaremos un enlace para restablecer tu contraseña.
                    </p>
                    <form onSubmit={handleRecovery} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      <input className="inp" type="email" value={recoveryEmail}
                        onChange={e => { setRecoveryEmail(e.target.value); setRecoveryError(''); }}
                        placeholder="tu@correo.com" autoFocus />
                      {recoveryError && <p style={{ fontSize: 12, color: '#f87171' }}>{recoveryError}</p>}
                      <button className="btn-gold" type="submit" disabled={recoverySending || !recoveryEmail.trim()}>
                        {recoverySending ? 'Enviando...' : 'Enviar enlace de recuperación'}
                      </button>
                    </form>
                    <div style={{ marginTop: 20, padding: '14px', background: 'rgba(201,150,58,0.06)', border: '1px solid rgba(201,150,58,0.15)', borderRadius: 10 }}>
                      <p style={{ fontSize: 12, color: 'rgba(240,236,228,0.5)', lineHeight: 1.65 }}>
                        <strong style={{ color: 'rgba(240,236,228,0.75)' }}>¿Olvidaste tu PIN?</strong> El PIN lo gestiona el administrador de tu restaurante. Pídele que lo cambie desde la configuración del sistema.
                      </p>
                    </div>
                  </>
                ) : (
                  <div style={{ textAlign: 'center', padding: '20px 0' }}>
                    <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(201,150,58,0.1)', border: '1px solid rgba(201,150,58,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, margin: '0 auto 16px' }}>✓</div>
                    <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, fontWeight: 700, color: '#f0ece4', marginBottom: 8 }}>Correo enviado</h3>
                    <p style={{ fontSize: 13, color: 'rgba(240,236,228,0.5)', lineHeight: 1.7 }}>
                      Si {recoveryEmail} tiene una cuenta, recibirá el enlace en los próximos minutos.
                    </p>
                    <button onClick={() => setStep('restaurant')} style={{ marginTop: 24, background: 'none', border: 'none', fontSize: 13, color: '#c9963a', cursor: 'pointer' }}>
                      Volver al inicio de sesión
                    </button>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Admin link */}
          <p style={{ textAlign: 'center', fontSize: 12, color: 'rgba(240,236,228,0.2)', marginTop: 20 }}>
            ¿Eres el administrador?{' '}
            <a href="/admin/login" style={{ color: 'rgba(240,236,228,0.35)', transition: 'color .2s' }}
              onMouseEnter={e => (e.currentTarget.style.color = 'rgba(240,236,228,0.6)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'rgba(240,236,228,0.35)')}>
              Acceso SuperAdmin
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
