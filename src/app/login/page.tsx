'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { ArrowLeft, Eye, EyeOff } from 'lucide-react';

type Step = 'restaurant' | 'user' | 'pin';

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
  admin: '#f59e0b', gerente: '#a78bfa', cajero: '#34d399',
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

  async function handleFindRestaurant(e: React.FormEvent) {
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

  async function handleSignIn(e: React.FormEvent) {
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #0a1628 0%, #0f1e35 50%, #0a1628 100%)' }}>
        <div className="w-8 h-8 rounded-full border-2 animate-spin" style={{ borderColor: 'rgba(245,158,11,0.2)', borderTopColor: '#f59e0b' }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8" style={{ background: 'linear-gradient(135deg, #0a1628 0%, #0f1e35 50%, #0a1628 100%)', position: 'relative', overflow: 'hidden' }}>

      {/* Ambient glow */}
      <div style={{ position: 'absolute', top: '-20%', left: '50%', transform: 'translateX(-50%)', width: '600px', height: '400px', background: 'radial-gradient(ellipse, rgba(245,158,11,0.06) 0%, transparent 70%)', pointerEvents: 'none' }} />

      <div style={{ width: '100%', maxWidth: '440px', position: 'relative' }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <img src="/assets/images/logo_aldente.png" alt="Aldente" style={{ width: '72px', height: '72px', objectFit: 'contain', marginBottom: '12px' }} />
          <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#f1f5f9', margin: '0 0 4px' }}>Aldente</h1>
          <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.35)', margin: 0 }}>Sistema de Gestión para Restaurantes</p>
        </div>

        {/* Card */}
        <div style={{ background: 'rgba(26,37,53,0.9)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '20px', backdropFilter: 'blur(12px)', overflow: 'hidden' }}>

          {/* Progress indicator */}
          {step !== 'restaurant' && (
            <div style={{ display: 'flex', gap: '4px', padding: '16px 24px 0' }}>
              {['restaurant', 'user', 'pin'].map((s, i) => (
                <div key={s} style={{ flex: 1, height: '3px', borderRadius: '2px', background: ['restaurant', 'user', 'pin'].indexOf(step) >= i ? '#f59e0b' : 'rgba(255,255,255,0.08)', transition: 'background 0.3s' }} />
              ))}
            </div>
          )}

          <div style={{ padding: '28px 28px 32px' }}>

            {/* STEP 1 — Find restaurant */}
            {step === 'restaurant' && (
              <>
                <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#f1f5f9', margin: '0 0 6px' }}>¿En qué restaurante trabajas?</h2>
                <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', margin: '0 0 24px' }}>Escribe el nombre o código de acceso</p>
                <form onSubmit={handleFindRestaurant} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="text" value={slugInput}
                      onChange={e => { setSlugInput(e.target.value); setSearchError(''); }}
                      placeholder="Ej: Tacos El Güero"
                      autoFocus autoComplete="off"
                      style={{ width: '100%', padding: '13px 16px', borderRadius: '12px', border: searchError ? '1px solid rgba(248,113,113,0.5)' : '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.04)', color: '#f1f5f9', fontSize: '15px', outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.2s' }}
                      onFocus={e => { if (!searchError) e.target.style.borderColor = 'rgba(245,158,11,0.5)'; }}
                      onBlur={e => { if (!searchError) e.target.style.borderColor = 'rgba(255,255,255,0.12)'; }}
                    />
                  </div>
                  {searchError && <p style={{ fontSize: '12px', color: '#f87171', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>⚠️ {searchError}</p>}
                  <button type="submit" disabled={searching || !slugInput.trim()}
                    style={{ padding: '13px', borderRadius: '12px', border: 'none', background: searching || !slugInput.trim() ? 'rgba(245,158,11,0.3)' : '#f59e0b', color: '#1B3A6B', fontSize: '15px', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s' }}>
                    {searching ? 'Buscando...' : 'Continuar →'}
                  </button>
                </form>
              </>
            )}

            {/* STEP 2 — Select user (card-based, not dropdown) */}
            {step === 'user' && restaurant && (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                  <button onClick={() => { setStep('restaurant'); setRestaurant(null); setUsers([]); setSearchError(''); }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.35)', padding: '4px', display: 'flex', borderRadius: '6px', transition: 'color 0.2s' }}>
                    <ArrowLeft size={16} />
                  </button>
                  <h2 style={{ fontSize: '17px', fontWeight: 700, color: '#f1f5f9', margin: 0 }}>{restaurant.name}</h2>
                </div>
                <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.35)', margin: '0 0 20px', paddingLeft: '30px' }}>¿Quién eres? Toca tu nombre</p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '380px', overflowY: 'auto' }}>
                  {users.map(u => (
                    <button key={u.id} onClick={() => handleSelectUser(u)}
                      style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '13px 16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.03)', cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s', width: '100%' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.06)'; (e.currentTarget as HTMLButtonElement).style.borderColor = `${ROLE_COLORS[u.appRole] ?? '#f59e0b'}40`; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.03)'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.07)'; }}>
                      <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: `${ROLE_COLORS[u.appRole] ?? '#f59e0b'}15`, border: `1px solid ${ROLE_COLORS[u.appRole] ?? '#f59e0b'}25`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', flexShrink: 0 }}>
                        {ROLE_ICONS[u.appRole] ?? '👤'}
                      </div>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: '15px', fontWeight: 600, color: '#f1f5f9', margin: '0 0 2px' }}>{u.fullName}</p>
                        <p style={{ fontSize: '12px', color: ROLE_COLORS[u.appRole] ?? 'rgba(255,255,255,0.4)', margin: 0 }}>{ROLE_LABELS[u.appRole] ?? u.appRole}</p>
                      </div>
                      <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: '18px' }}>›</span>
                    </button>
                  ))}
                  {users.length === 0 && (
                    <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: '13px', padding: '24px 0' }}>Sin usuarios activos en este restaurante</p>
                  )}
                </div>
              </>
            )}

            {/* STEP 3 — PIN entry */}
            {step === 'pin' && selectedUser && (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
                  <button onClick={() => { setStep('user'); setSelectedUser(null); setPin(''); setError(''); }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.35)', padding: '4px', display: 'flex', borderRadius: '6px' }}>
                    <ArrowLeft size={16} />
                  </button>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: `${ROLE_COLORS[selectedUser.appRole] ?? '#f59e0b'}15`, border: `1px solid ${ROLE_COLORS[selectedUser.appRole] ?? '#f59e0b'}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>
                      {ROLE_ICONS[selectedUser.appRole] ?? '👤'}
                    </div>
                    <div>
                      <p style={{ fontSize: '15px', fontWeight: 700, color: '#f1f5f9', margin: 0 }}>{selectedUser.fullName}</p>
                      <p style={{ fontSize: '12px', color: ROLE_COLORS[selectedUser.appRole] ?? 'rgba(255,255,255,0.4)', margin: 0 }}>{ROLE_LABELS[selectedUser.appRole] ?? selectedUser.appRole}</p>
                    </div>
                  </div>
                </div>

                <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.5)', margin: '0 0 16px', textAlign: 'center' }}>Ingresa tu PIN de acceso</p>

                {/* Large PIN dots */}
                <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', marginBottom: '20px' }}>
                  {[0,1,2,3,4,5].map(i => (
                    <div key={i} style={{ width: '14px', height: '14px', borderRadius: '50%', background: i < pin.length ? (ROLE_COLORS[selectedUser.appRole] ?? '#f59e0b') : 'rgba(255,255,255,0.12)', border: i < pin.length ? 'none' : '1px solid rgba(255,255,255,0.2)', transition: 'all 0.15s', transform: i < pin.length ? 'scale(1.1)' : 'scale(1)' }} />
                  ))}
                </div>

                <form onSubmit={handleSignIn} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showPin ? 'text' : 'password'}
                      value={pin}
                      onChange={e => { setPin(e.target.value.replace(/\D/g, '')); setError(''); }}
                      maxLength={8} inputMode="numeric" pattern="[0-9]*"
                      autoFocus autoComplete="off"
                      style={{ width: '100%', padding: '14px 48px 14px 20px', borderRadius: '12px', border: error ? '1px solid rgba(248,113,113,0.5)' : '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.04)', color: '#f1f5f9', fontSize: '28px', fontFamily: 'monospace', letterSpacing: '10px', textAlign: 'center', outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.2s' }}
                    />
                    <button type="button" onClick={() => setShowPin(v => !v)}
                      style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.25)', display: 'flex' }}>
                      {showPin ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>

                  {error && <p style={{ fontSize: '12px', color: '#f87171', margin: 0, textAlign: 'center' }}>⚠️ {error}</p>}

                  <button type="submit" disabled={submitting || pin.length < 4}
                    style={{ padding: '14px', borderRadius: '12px', border: 'none', background: submitting || pin.length < 4 ? 'rgba(245,158,11,0.3)' : (ROLE_COLORS[selectedUser.appRole] ?? '#f59e0b'), color: '#1B3A6B', fontSize: '15px', fontWeight: 700, cursor: pin.length >= 4 ? 'pointer' : 'not-allowed', transition: 'all 0.2s' }}>
                    {submitting ? 'Verificando...' : `Entrar como ${selectedUser.fullName.split(' ')[0]}`}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>

        <p style={{ textAlign: 'center', fontSize: '12px', color: 'rgba(255,255,255,0.15)', marginTop: '20px' }}>
          ¿Eres el administrador?{' '}
          <a href="/admin/login" style={{ color: 'rgba(255,255,255,0.25)', textDecoration: 'none' }}>Acceso admin</a>
        </p>
      </div>
    </div>
  );
}
