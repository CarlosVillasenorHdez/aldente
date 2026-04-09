'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { ArrowLeft, Eye, EyeOff } from 'lucide-react';

type Step = 'restaurant' | 'user' | 'pin' | 'recover';

interface LoginUser { id: string; fullName: string; appRole: string; }
interface Restaurant { id: string; name: string; slug: string; }

const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrador', gerente: 'Gerente', cajero: 'Cajero',
  mesero: 'Mesero', cocinero: 'Cocinero',
  ayudante_cocina: 'Ayudante de Cocina', repartidor: 'Repartidor',
};
const ROLE_ICONS: Record<string, string> = {
  admin: '👑', gerente: '🧑‍💼', cajero: '💰',
  mesero: '🍽️', cocinero: '👨‍🍳', ayudante_cocina: '🔪', repartidor: '🛵',
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

  // Recovery
  const [recoverEmail, setRecoverEmail] = useState('');
  const [recoverSent, setRecoverSent] = useState(false);
  const [recoverLoading, setRecoverLoading] = useState(false);

  useEffect(() => {
    if (!loading && appUser) {
      const role = appUser.appRole ?? 'mesero';
      const roleRedirects: Record<string, string> = {
        admin: '/dashboard', gerente: '/dashboard', cajero: '/corte-caja',
        mesero: '/mesero', cocinero: '/cocina', ayudante_cocina: '/cocina', repartidor: '/delivery',
      };
      router.replace(roleRedirects[role] ?? '/dashboard');
    }
  }, [appUser, loading, router]);

  useEffect(() => {
    const saved = localStorage.getItem(SLUG_KEY);
    if (saved) setSlugInput(saved);
  }, []);

  async function handleFindRestaurant(e: { preventDefault(): void }) {
    e.preventDefault();
    setSearchError('');
    const query = slugInput.trim();
    if (!query) return;
    setSearching(true);

    const slugQuery = slugify(query);
    const { data: bySlug } = await supabase.from('tenants').select('id, name, slug').eq('slug', slugQuery).eq('is_active', true).single();
    let found: Restaurant | null = bySlug as Restaurant | null;

    if (!found) {
      const { data: byName } = await supabase.from('tenants').select('id, name, slug').ilike('name', `%${query}%`).eq('is_active', true).limit(1).single();
      found = byName as Restaurant | null;
    }

    setSearching(false);
    if (!found) { setSearchError('No encontramos ese restaurante. Verifica el nombre e intenta de nuevo.'); return; }

    localStorage.setItem(SLUG_KEY, found.slug);
    setRestaurant(found);
    const { data: usersData } = await supabase.from('app_users').select('id, full_name, app_role').eq('tenant_id', found.id).eq('is_active', true).order('app_role').order('full_name');
    setUsers((usersData ?? []).map((u: Record<string, string>) => ({ id: u.id, fullName: u.full_name, appRole: u.app_role })));
    setStep('user');
  }

  function handleSelectUser(user: LoginUser) {
    setSelectedUser(user);
    setPin('');
    setError('');
    setStep('pin');
  }

  async function handleSignIn(e: { preventDefault(): void }) {
    e.preventDefault();
    if (!selectedUser || !pin) return;
    setError('');
    setSubmitting(true);
    const result = await signIn(selectedUser.id, pin);
    setSubmitting(false);

    if (result.error) { setError(result.error); setPin(''); return; }

    const role = result.user?.appRole ?? 'mesero';
    const roleRedirects: Record<string, string> = {
      admin: '/dashboard', gerente: '/dashboard', cajero: '/corte-caja',
      mesero: '/mesero', cocinero: '/cocina', ayudante_cocina: '/cocina', repartidor: '/delivery',
    };
    router.replace(roleRedirects[role] ?? '/dashboard');
  }

  async function handleRecover(e: { preventDefault(): void }) {
    e.preventDefault();
    if (!recoverEmail.trim()) return;
    setRecoverLoading(true);
    await supabase.auth.resetPasswordForEmail(recoverEmail.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setRecoverLoading(false);
    setRecoverSent(true);
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#07090f' }}>
      <div style={{ width: 32, height: 32, borderRadius: '50%', border: '2px solid rgba(201,150,58,0.2)', borderTopColor: '#c9963a', animation: 'spin 1s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  const stepIndex = ['restaurant', 'user', 'pin'].indexOf(step);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: '#07090f', position: 'relative', overflow: 'hidden', fontFamily: "'Outfit', system-ui, sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=Outfit:wght@300;400;500;600;700&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        @keyframes fadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
        @keyframes spin{to{transform:rotate(360deg)}}
        input:-webkit-autofill{-webkit-box-shadow:0 0 0 1000px rgba(255,255,255,0.04) inset;-webkit-text-fill-color:#f0ece4;}
      `}</style>

      {/* Background grid */}
      <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(201,150,58,0.02) 1px,transparent 1px),linear-gradient(90deg,rgba(201,150,58,0.02) 1px,transparent 1px)', backgroundSize: '80px 80px', pointerEvents: 'none' }} />

      {/* Left panel — brand */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: 'clamp(32px,5vw,64px)', position: 'relative', borderRight: '1px solid rgba(255,255,255,0.05)' }}>
        {/* Glow */}
        <div style={{ position: 'absolute', bottom: '10%', left: '20%', width: 500, height: 400, background: 'radial-gradient(ellipse,rgba(201,150,58,0.06) 0%,transparent 65%)', pointerEvents: 'none' }} />

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, position: 'relative' }}>
          <img src="/assets/images/logo_aldente.png" alt="Aldente" style={{ width: 36, height: 36, objectFit: 'contain' }} />
          <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 700, color: '#c9963a', letterSpacing: '.03em' }}>Aldente</span>
        </div>

        {/* Hero text */}
        <div style={{ position: 'relative', maxWidth: 480 }}>
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase', color: '#c9963a', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ display: 'block', width: 24, height: 1, background: 'rgba(201,150,58,0.4)' }} />
            Sistema para restaurantes
          </p>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 'clamp(36px,4vw,56px)', fontWeight: 700, color: '#f0ece4', lineHeight: 1.08, marginBottom: 20 }}>
            Sabes exactamente<br /><em style={{ color: '#c9963a', fontStyle: 'italic' }}>qué pasa</em><br />en tu restaurante.
          </h1>
          <p style={{ fontSize: 15, fontWeight: 300, color: 'rgba(240,236,228,0.5)', lineHeight: 1.8 }}>
            P&L del día. Inventario vivo. Merma real.<br />Todo en tiempo real, sin esperar el corte.
          </p>

          {/* Micro-stats */}
          <div style={{ display: 'flex', gap: 32, marginTop: 40 }}>
            {[['30 seg', 'Corte de caja'], ['3 pasos', 'Configuración'], ['0 papel', 'En operación']].map(([v, l]) => (
              <div key={l}>
                <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 28, fontWeight: 700, color: '#c9963a', lineHeight: 1 }}>{v}</p>
                <p style={{ fontSize: 11, color: 'rgba(240,236,228,0.35)', marginTop: 4 }}>{l}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, position: 'relative' }}>
          <a href="/" style={{ fontSize: 12, color: 'rgba(240,236,228,0.3)', textDecoration: 'none', transition: 'color .2s' }}
            onMouseEnter={e => (e.currentTarget.style.color = 'rgba(240,236,228,0.7)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'rgba(240,236,228,0.3)')}>
            ← Volver al inicio
          </a>
          <span style={{ color: 'rgba(240,236,228,0.1)' }}>·</span>
          <a href="/funcionalidades" style={{ fontSize: 12, color: 'rgba(240,236,228,0.3)', textDecoration: 'none', transition: 'color .2s' }}
            onMouseEnter={e => (e.currentTarget.style.color = 'rgba(240,236,228,0.7)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'rgba(240,236,228,0.3)')}>
            Conocer el sistema
          </a>
        </div>
      </div>

      {/* Right panel — form */}
      <div style={{ width: 'min(480px, 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'clamp(24px,4vw,48px)', position: 'relative' }}>
        <div style={{ width: '100%', maxWidth: 380, animation: 'fadeUp .5s ease both' }}>

          {/* RECOVER PASSWORD */}
          {step === 'recover' && (
            <>
              <button onClick={() => { setStep('restaurant'); setRecoverSent(false); setRecoverEmail(''); }}
                style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', color: 'rgba(240,236,228,0.4)', fontSize: 13, cursor: 'pointer', marginBottom: 32, padding: 0 }}>
                <ArrowLeft size={15} /> Volver al acceso
              </button>
              {recoverSent ? (
                <div style={{ textAlign: 'center' }}>
                  <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(201,150,58,0.1)', border: '1px solid rgba(201,150,58,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontSize: 24 }}>✓</div>
                  <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 24, fontWeight: 700, color: '#f0ece4', marginBottom: 12 }}>Revisa tu correo</h2>
                  <p style={{ fontSize: 14, color: 'rgba(240,236,228,0.5)', lineHeight: 1.7 }}>
                    Si existe una cuenta con <strong style={{ color: '#f0ece4' }}>{recoverEmail}</strong>, recibirás un enlace para restablecer tu contraseña en los próximos minutos.
                  </p>
                  <p style={{ fontSize: 12, color: 'rgba(240,236,228,0.3)', marginTop: 16 }}>Revisa también tu carpeta de spam.</p>
                </div>
              ) : (
                <>
                  <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 28, fontWeight: 700, color: '#f0ece4', marginBottom: 8 }}>Recuperar acceso</h2>
                  <p style={{ fontSize: 14, color: 'rgba(240,236,228,0.5)', marginBottom: 28, lineHeight: 1.65 }}>
                    Ingresa el correo electrónico de tu cuenta de administrador. Te enviaremos un enlace para restablecer tu contraseña.
                  </p>
                  <form onSubmit={handleRecover} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <input type="email" placeholder="correo@ejemplo.com" value={recoverEmail}
                      onChange={e => setRecoverEmail(e.target.value)} autoFocus
                      style={{ padding: '13px 16px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', color: '#f0ece4', fontSize: 15, outline: 'none', width: '100%', fontFamily: 'inherit' }}
                      onFocus={e => (e.target.style.borderColor = 'rgba(201,150,58,0.5)')}
                      onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')} />
                    <button type="submit" disabled={recoverLoading || !recoverEmail.trim()}
                      style={{ padding: 13, borderRadius: 12, border: 'none', background: recoverEmail.trim() ? '#c9963a' : 'rgba(201,150,58,0.25)', color: '#07090f', fontSize: 15, fontWeight: 700, cursor: 'pointer', transition: 'all .2s', fontFamily: 'inherit' }}>
                      {recoverLoading ? 'Enviando...' : 'Enviar enlace →'}
                    </button>
                  </form>
                </>
              )}
            </>
          )}

          {/* MAIN FLOW */}
          {step !== 'recover' && (
            <>
              {/* Progress bar (steps 2 & 3) */}
              {step !== 'restaurant' && (
                <div style={{ display: 'flex', gap: 4, marginBottom: 28 }}>
                  {[0, 1, 2].map(i => (
                    <div key={i} style={{ flex: 1, height: 2, borderRadius: 1, background: stepIndex >= i ? '#c9963a' : 'rgba(255,255,255,0.08)', transition: 'background .3s' }} />
                  ))}
                </div>
              )}

              {/* STEP 1 */}
              {step === 'restaurant' && (
                <>
                  <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 28, fontWeight: 700, color: '#f0ece4', marginBottom: 6 }}>Bienvenido</h2>
                  <p style={{ fontSize: 14, color: 'rgba(240,236,228,0.45)', marginBottom: 28 }}>¿En qué restaurante trabajas?</p>
                  <form onSubmit={handleFindRestaurant} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <input type="text" value={slugInput} onChange={e => { setSlugInput(e.target.value); setSearchError(''); }}
                      placeholder="Nombre o código del restaurante" autoFocus autoComplete="off"
                      style={{ padding: '13px 16px', borderRadius: 12, border: searchError ? '1px solid rgba(248,113,113,0.5)' : '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', color: '#f0ece4', fontSize: 15, outline: 'none', width: '100%', fontFamily: 'inherit', transition: 'border-color .2s' }}
                      onFocus={e => { if (!searchError) e.target.style.borderColor = 'rgba(201,150,58,0.5)'; }}
                      onBlur={e => { if (!searchError) e.target.style.borderColor = 'rgba(255,255,255,0.1)'; }} />
                    {searchError && <p style={{ fontSize: 12, color: '#f87171' }}>⚠ {searchError}</p>}
                    <button type="submit" disabled={searching || !slugInput.trim()}
                      style={{ padding: '13px', borderRadius: 12, border: 'none', background: searching || !slugInput.trim() ? 'rgba(201,150,58,0.25)' : '#c9963a', color: '#07090f', fontSize: 15, fontWeight: 700, cursor: 'pointer', transition: 'all .2s', fontFamily: 'inherit' }}>
                      {searching ? 'Buscando...' : 'Continuar →'}
                    </button>
                  </form>
                  <div style={{ marginTop: 20, paddingTop: 20, borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <button onClick={() => setStep('recover')}
                      style={{ background: 'none', border: 'none', fontSize: 12, color: 'rgba(240,236,228,0.35)', cursor: 'pointer', fontFamily: 'inherit', padding: 0, transition: 'color .2s' }}
                      onMouseEnter={e => (e.currentTarget.style.color = 'rgba(240,236,228,0.7)')}
                      onMouseLeave={e => (e.currentTarget.style.color = 'rgba(240,236,228,0.35)')}>
                      ¿Olvidaste tu acceso?
                    </button>
                    <a href="/admin/login" style={{ fontSize: 12, color: 'rgba(240,236,228,0.35)', textDecoration: 'none', transition: 'color .2s' }}
                      onMouseEnter={e => (e.currentTarget.style.color = 'rgba(240,236,228,0.7)')}
                      onMouseLeave={e => (e.currentTarget.style.color = 'rgba(240,236,228,0.35)')}>
                      Acceso admin
                    </a>
                  </div>
                </>
              )}

              {/* STEP 2 — Users */}
              {step === 'user' && restaurant && (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                    <button onClick={() => { setStep('restaurant'); setRestaurant(null); setUsers([]); setSearchError(''); }}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(240,236,228,0.35)', padding: 4, display: 'flex' }}>
                      <ArrowLeft size={16} />
                    </button>
                    <div>
                      <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 700, color: '#f0ece4', margin: 0 }}>{restaurant.name}</h2>
                      <p style={{ fontSize: 12, color: 'rgba(240,236,228,0.4)', margin: 0 }}>¿Quién eres?</p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 400, overflowY: 'auto' }}>
                    {users.map(u => (
                      <button key={u.id} onClick={() => handleSelectUser(u)}
                        style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 14px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.03)', cursor: 'pointer', textAlign: 'left', width: '100%', transition: 'all .15s', fontFamily: 'inherit' }}
                        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.06)'; (e.currentTarget as HTMLButtonElement).style.borderColor = `${ROLE_COLORS[u.appRole] ?? '#c9963a'}50`; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.03)'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.07)'; }}>
                        <div style={{ width: 40, height: 40, borderRadius: 10, background: `${ROLE_COLORS[u.appRole] ?? '#c9963a'}15`, border: `1px solid ${ROLE_COLORS[u.appRole] ?? '#c9963a'}25`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>
                          {ROLE_ICONS[u.appRole] ?? '👤'}
                        </div>
                        <div style={{ flex: 1 }}>
                          <p style={{ fontSize: 14, fontWeight: 600, color: '#f0ece4', margin: '0 0 1px' }}>{u.fullName}</p>
                          <p style={{ fontSize: 11, color: ROLE_COLORS[u.appRole] ?? 'rgba(240,236,228,0.4)', margin: 0 }}>{ROLE_LABELS[u.appRole] ?? u.appRole}</p>
                        </div>
                        <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 16 }}>›</span>
                      </button>
                    ))}
                    {users.length === 0 && <p style={{ fontSize: 13, color: 'rgba(240,236,228,0.3)', textAlign: 'center', padding: '24px 0' }}>Sin usuarios activos en este restaurante.</p>}
                  </div>
                </>
              )}

              {/* STEP 3 — PIN */}
              {step === 'pin' && selectedUser && (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 28 }}>
                    <button onClick={() => { setStep('user'); setSelectedUser(null); setPin(''); setError(''); }}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(240,236,228,0.35)', padding: 4, display: 'flex' }}>
                      <ArrowLeft size={16} />
                    </button>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 36, height: 36, borderRadius: 10, background: `${ROLE_COLORS[selectedUser.appRole] ?? '#c9963a'}15`, border: `1px solid ${ROLE_COLORS[selectedUser.appRole] ?? '#c9963a'}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>
                        {ROLE_ICONS[selectedUser.appRole] ?? '👤'}
                      </div>
                      <div>
                        <p style={{ fontSize: 15, fontWeight: 700, color: '#f0ece4', margin: 0 }}>{selectedUser.fullName}</p>
                        <p style={{ fontSize: 11, color: ROLE_COLORS[selectedUser.appRole] ?? 'rgba(240,236,228,0.4)', margin: 0 }}>{ROLE_LABELS[selectedUser.appRole] ?? selectedUser.appRole}</p>
                      </div>
                    </div>
                  </div>

                  <p style={{ fontSize: 13, color: 'rgba(240,236,228,0.45)', textAlign: 'center', marginBottom: 16 }}>Ingresa tu PIN de acceso</p>

                  {/* PIN dots */}
                  <div style={{ display: 'flex', justifyContent: 'center', gap: 10, marginBottom: 18 }}>
                    {[0,1,2,3,4,5].map(i => (
                      <div key={i} style={{ width: 12, height: 12, borderRadius: '50%', background: i < pin.length ? (ROLE_COLORS[selectedUser.appRole] ?? '#c9963a') : 'rgba(255,255,255,0.1)', border: i < pin.length ? 'none' : '1px solid rgba(255,255,255,0.18)', transition: 'all .12s', transform: i < pin.length ? 'scale(1.2)' : 'scale(1)' }} />
                    ))}
                  </div>

                  <form onSubmit={handleSignIn} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div style={{ position: 'relative' }}>
                      <input type={showPin ? 'text' : 'password'} value={pin}
                        onChange={e => { setPin(e.target.value.replace(/\D/g, '')); setError(''); }}
                        maxLength={8} inputMode="numeric" pattern="[0-9]*" autoFocus autoComplete="off"
                        style={{ width: '100%', padding: '14px 48px 14px 20px', borderRadius: 12, border: error ? '1px solid rgba(248,113,113,0.4)' : '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', color: '#f0ece4', fontSize: 26, fontFamily: 'monospace', letterSpacing: 10, textAlign: 'center', outline: 'none', boxSizing: 'border-box', transition: 'border-color .2s' }} />
                      <button type="button" onClick={() => setShowPin(v => !v)}
                        style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.25)', display: 'flex' }}>
                        {showPin ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                    {error && <p style={{ fontSize: 12, color: '#f87171', textAlign: 'center' }}>⚠ {error}</p>}
                    <button type="submit" disabled={submitting || pin.length < 4}
                      style={{ padding: 14, borderRadius: 12, border: 'none', background: pin.length >= 4 ? (ROLE_COLORS[selectedUser.appRole] ?? '#c9963a') : 'rgba(201,150,58,0.2)', color: '#07090f', fontSize: 15, fontWeight: 700, cursor: pin.length >= 4 ? 'pointer' : 'not-allowed', transition: 'all .2s', fontFamily: 'inherit' }}>
                      {submitting ? 'Verificando...' : `Entrar como ${selectedUser.fullName.split(' ')[0]}`}
                    </button>
                    <button type="button" onClick={() => setStep('recover')}
                      style={{ background: 'none', border: 'none', fontSize: 12, color: 'rgba(240,236,228,0.3)', cursor: 'pointer', fontFamily: 'inherit', padding: '4px 0', transition: 'color .2s' }}
                      onMouseEnter={e => (e.currentTarget.style.color = 'rgba(240,236,228,0.6)')}
                      onMouseLeave={e => (e.currentTarget.style.color = 'rgba(240,236,228,0.3)')}>
                      ¿Olvidaste tu PIN? Contacta a tu administrador
                    </button>
                  </form>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
