'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { ChefHat, Eye, EyeOff, ArrowLeft } from 'lucide-react';

type Step = 'restaurant' | 'user';

interface LoginUser {
  id: string;
  fullName: string;
  appRole: string;
}

interface Restaurant {
  id: string;
  name: string;
  slug: string;
}

const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrador',
  gerente: 'Gerente',
  cajero: 'Cajero',
  mesero: 'Mesero',
  cocinero: 'Cocinero',
  ayudante_cocina: 'Ayudante de Cocina',
  repartidor: 'Repartidor',
};

const SLUG_KEY = 'aldente_last_slug';

function slugify(str: string) {
  return str.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
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
  const [selectedUserId, setSelectedUserId] = useState('');
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Redirect if already logged in
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

  // Pre-fill slug from last session
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

    // Try by slug first, then by name (partial match)
    const slugQuery = slugify(query);
    const { data: bySlug } = await supabase
      .from('tenants')
      .select('id, name, slug')
      .eq('slug', slugQuery)
      .eq('is_active', true)
      .single();

    let found: Restaurant | null = bySlug as Restaurant | null;

    if (!found) {
      const { data: byName } = await supabase
        .from('tenants')
        .select('id, name, slug')
        .ilike('name', `%${query}%`)
        .eq('is_active', true)
        .limit(1)
        .single();
      found = byName as Restaurant | null;
    }

    setSearching(false);

    if (!found) {
      setSearchError('No encontramos ese restaurante. Verifica el nombre e intenta de nuevo.');
      return;
    }

    // Save slug for next time
    localStorage.setItem(SLUG_KEY, found.slug);
    setRestaurant(found);

    // Load users for this tenant
    const { data: usersData } = await supabase
      .from('app_users')
      .select('id, full_name, app_role')
      .eq('tenant_id', found.id)
      .eq('is_active', true)
      .order('app_role')
      .order('full_name');

    setUsers((usersData ?? []).map((u: Record<string, string>) => ({
      id: u.id,
      fullName: u.full_name,
      appRole: u.app_role,
    })));

    setStep('user');
  }

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!selectedUserId) { setError('Selecciona tu nombre'); return; }
    if (!pin) { setError('Ingresa tu PIN'); return; }

    setSubmitting(true);
    const result = await signIn(selectedUserId, pin);
    setSubmitting(false);

    if (result.error) {
      setError(result.error);
      setPin('');
    } else {
      // Redirect based on role
      const role = result.user?.appRole ?? 'mesero';
      const roleRedirects: Record<string, string> = {
        admin:           '/dashboard',
        gerente:         '/dashboard',
        cajero:          '/corte-caja',
        mesero:          '/mesero',
        cocinero:        '/cocina',
        ayudante_cocina: '/cocina',
        repartidor:      '/delivery',
      };
      router.replace(roleRedirects[role] ?? '/dashboard');
    }
  }

  function handleBack() {
    setStep('restaurant');
    setRestaurant(null);
    setUsers([]);
    setSelectedUserId('');
    setPin('');
    setError('');
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#0f1923' }}>
        <div className="w-8 h-8 rounded-full border-2 animate-spin" style={{ borderColor: 'rgba(245,158,11,0.3)', borderTopColor: '#f59e0b' }} />
      </div>
    );
  }

  // Group users by role
  const grouped = users.reduce<Record<string, LoginUser[]>>((acc, u) => {
    const label = ROLE_LABELS[u.appRole] ?? u.appRole;
    if (!acc[label]) acc[label] = [];
    acc[label].push(u);
    return acc;
  }, {});

  const inputStyle = {
    width: '100%', padding: '10px 14px', borderRadius: '12px',
    border: '1px solid #2a3f5f', backgroundColor: '#0f1923',
    color: '#f1f5f9', fontSize: '14px', outline: 'none', boxSizing: 'border-box' as const,
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: '#0f1923' }}>
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <img
            src="/assets/images/logo_aldente.png"
            alt="Aldente"
            className="object-contain mb-3"
            style={{ width: '80px', height: '80px' }}
          />
          <h1 className="text-2xl font-bold text-white">Aldente</h1>
          <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.45)' }}>
            Sistema de Gestión para Restaurantes
          </p>
        </div>

        {/* Card */}
        <div className="rounded-2xl p-6" style={{ backgroundColor: '#1a2535', border: '1px solid #2a3f5f' }}>

          {/* STEP 1 — Find restaurant */}
          {step === 'restaurant' && (
            <>
              <h2 className="text-base font-semibold text-white mb-1">¿En qué restaurante trabajas?</h2>
              <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)', marginBottom: '20px' }}>
                Escribe el nombre o código de tu restaurante
              </p>
              <form onSubmit={handleFindRestaurant} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <input
                  type="text"
                  value={slugInput}
                  onChange={e => { setSlugInput(e.target.value); setSearchError(''); }}
                  placeholder="Ej: Tacos El Güero"
                  autoFocus
                  autoComplete="off"
                  style={inputStyle}
                />
                {searchError && (
                  <p style={{ fontSize: '12px', color: '#f87171', margin: 0 }}>⚠️ {searchError}</p>
                )}
                <button
                  type="submit"
                  disabled={searching || !slugInput.trim()}
                  className="w-full py-3 rounded-xl text-sm font-bold disabled:opacity-50"
                  style={{ backgroundColor: '#f59e0b', color: '#1B3A6B', border: 'none', cursor: 'pointer' }}
                >
                  {searching ? 'Buscando...' : 'Continuar →'}
                </button>
              </form>
            </>
          )}

          {/* STEP 2 — Select user + PIN */}
          {step === 'user' && restaurant && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                <button onClick={handleBack} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)', padding: '2px', display: 'flex' }}>
                  <ArrowLeft size={16} />
                </button>
                <h2 className="text-base font-semibold text-white">{restaurant.name}</h2>
              </div>
              <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)', marginBottom: '20px', paddingLeft: '26px' }}>
                Selecciona tu nombre e ingresa tu PIN
              </p>

              <form onSubmit={handleSignIn} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

                {/* User selector */}
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.5)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    ¿Quién eres?
                  </label>
                  <select
                    value={selectedUserId}
                    onChange={e => { setSelectedUserId(e.target.value); setError(''); }}
                    style={{ ...inputStyle, appearance: 'none', color: selectedUserId ? '#f1f5f9' : 'rgba(255,255,255,0.35)' }}
                  >
                    <option value="" disabled>Selecciona tu nombre</option>
                    {Object.entries(grouped).map(([roleLabel, roleUsers]) => (
                      <optgroup key={roleLabel} label={`── ${roleLabel}`} style={{ color: '#f59e0b', backgroundColor: '#0f1923' }}>
                        {(roleUsers as typeof grouped[string]).map(u => (
                          <option key={u.id} value={u.id} style={{ color: '#f1f5f9', backgroundColor: '#1a2535' }}>
                            {u.fullName}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>

                {/* PIN */}
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.5)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    PIN
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showPin ? 'text' : 'password'}
                      value={pin}
                      onChange={e => { setPin(e.target.value); setError(''); }}
                      maxLength={8}
                      inputMode="numeric"
                      pattern="[0-9]*"
                      placeholder="••••••"
                      autoComplete="off"
                      style={{ ...inputStyle, paddingRight: '40px', letterSpacing: '6px', fontSize: '18px' }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPin(v => !v)}
                      style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.35)', display: 'flex' }}
                    >
                      {showPin ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>

                {error && (
                  <p style={{ fontSize: '12px', color: '#f87171', margin: 0 }}>⚠️ {error}</p>
                )}

                <button
                  type="submit"
                  disabled={submitting || !selectedUserId || !pin}
                  className="w-full py-3 rounded-xl text-sm font-bold disabled:opacity-50"
                  style={{ backgroundColor: '#f59e0b', color: '#1B3A6B', border: 'none', cursor: 'pointer' }}
                >
                  {submitting ? 'Verificando...' : 'Entrar'}
                </button>
              </form>
            </>
          )}
        </div>

        <p className="text-center text-xs mt-4" style={{ color: 'rgba(255,255,255,0.15)' }}>
          ¿Eres el administrador del sistema?{' '}
          <a href="/admin/login" style={{ color: 'rgba(255,255,255,0.25)', textDecoration: 'none' }}>Admin</a>
        </p>
      </div>
    </div>
  );
}
