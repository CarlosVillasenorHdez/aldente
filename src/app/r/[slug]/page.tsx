'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { ChefHat, Eye, EyeOff } from 'lucide-react';

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
  admin:           'Administrador',
  gerente:         'Gerente',
  cajero:          'Cajero',
  mesero:          'Mesero',
  cocinero:        'Cocinero',
  ayudante_cocina: 'Ayudante de Cocina',
  repartidor:      'Repartidor',
};

export default function RestaurantLoginPage() {
  const { slug } = useParams<{ slug: string }>();
  const { signIn, appUser, loading: authLoading } = useAuth();
  const router = useRouter();
  const supabase = createClient();

  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [loadingRestaurant, setLoadingRestaurant] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [users, setUsers] = useState<LoginUser[]>([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Redirect if already logged in
  useEffect(() => {
    if (!authLoading && appUser) router.replace('/dashboard');
  }, [appUser, authLoading, router]);

  // Load restaurant and users from slug
  useEffect(() => {
    if (!slug) return;
    supabase
      .from('tenants')
      .select('id, name, slug')
      .eq('slug', slug)
      .eq('is_active', true)
      .single()
      .then(async ({ data: tenant }) => {
        if (!tenant) { setNotFound(true); setLoadingRestaurant(false); return; }
        setRestaurant(tenant as Restaurant);

        const { data: usersData } = await supabase
          .from('app_users')
          .select('id, full_name, app_role')
          .eq('tenant_id', tenant.id)
          .eq('is_active', true)
          .order('app_role')
          .order('full_name');

        setUsers((usersData ?? []).map((u: Record<string, string>) => ({
          id: u.id,
          fullName: u.full_name,
          appRole: u.app_role,
        })));
        setLoadingRestaurant(false);
      });
  }, [slug]);

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!selectedUserId) { setError('Selecciona tu nombre'); return; }
    if (!pin) { setError('Ingresa tu PIN'); return; }
    setSubmitting(true);
    const result = await signIn(selectedUserId, pin);
    setSubmitting(false);
    if (result.error) { setError(result.error); setPin(''); }
    else router.replace('/dashboard');
  }

  // Safe area insets for iOS notch
  const safeStyle = {
    paddingTop: 'env(safe-area-inset-top)',
    paddingBottom: 'env(safe-area-inset-bottom)',
  };

  const inp = {
    width: '100%', padding: '10px 14px', borderRadius: '12px',
    border: '1px solid #2a3f5f', backgroundColor: '#0f1923',
    color: '#f1f5f9', fontSize: '14px', outline: 'none',
    boxSizing: 'border-box' as const,
  };

  // Loading
  if (authLoading || loadingRestaurant) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0f1923' }}>
        <div style={{ width: '32px', height: '32px', borderRadius: '50%', border: '2px solid rgba(245,158,11,0.2)', borderTopColor: '#f59e0b', animation: 'spin .7s linear infinite' }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  // Not found
  if (notFound) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0f1923', padding: '24px' }}>
        <div style={{ textAlign: 'center', maxWidth: '360px' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🍽</div>
          <h1 style={{ color: '#f1f5f9', fontSize: '20px', fontWeight: 700, margin: '0 0 8px' }}>Restaurante no encontrado</h1>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '14px', margin: '0 0 24px' }}>
            El link <code style={{ color: '#f59e0b' }}>/r/{slug}</code> no corresponde a ningún restaurante activo.
          </p>
          <button onClick={() => router.push('/login')} style={{ padding: '10px 24px', borderRadius: '10px', border: '1px solid #2a3f5f', backgroundColor: 'transparent', color: 'rgba(255,255,255,0.5)', fontSize: '14px', cursor: 'pointer' }}>
            ← Volver al inicio
          </button>
        </div>
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

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'max(16px, env(safe-area-inset-top)) 16px max(16px, env(safe-area-inset-bottom))', backgroundColor: '#0a0c0f' }}>
      <div style={{ width: '100%', maxWidth: '360px' }}>

        {/* Logo */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '28px' }}>
          <div style={{ width: '56px', height: '56px', borderRadius: '16px', backgroundColor: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px' }}>
            <ChefHat size={26} style={{ color: '#f59e0b' }} />
          </div>
          <h1 style={{ fontSize: '20px', fontWeight: 700, color: '#f1f5f9', margin: 0 }}>{restaurant?.name}</h1>
          <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.35)', marginTop: '4px' }}>Selecciona tu nombre e ingresa tu PIN</p>
        </div>

        {/* Form */}
        <div style={{ backgroundColor: '#1a2535', borderRadius: '18px', padding: '24px', border: '1px solid #2a3f5f' }}>
          <form onSubmit={handleSignIn} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.45)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                ¿Quién eres?
              </label>
              <select
                value={selectedUserId}
                onChange={e => { setSelectedUserId(e.target.value); setError(''); }}
                style={{ ...inp, appearance: 'none', color: selectedUserId ? '#f1f5f9' : 'rgba(255,255,255,0.35)' }}
              >
                <option value="" disabled>Selecciona tu nombre</option>
                {Object.entries(grouped).map(([roleLabel, roleUsers]) => (
                  <optgroup key={roleLabel} label={`── ${roleLabel}`} style={{ color: '#f59e0b', backgroundColor: '#0f1923' }}>
                    {roleUsers.map(u => (
                      <option key={u.id} value={u.id} style={{ color: '#f1f5f9', backgroundColor: '#1a2535' }}>
                        {u.fullName}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.45)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
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
                  placeholder="••••"
                  autoComplete="off"
                  style={{ ...inp, paddingRight: '44px', letterSpacing: '8px', fontSize: '20px' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPin(v => !v)}
                  style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.35)', display: 'flex', padding: 0 }}
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
              style={{ width: '100%', padding: '12px', borderRadius: '12px', border: 'none', backgroundColor: submitting || !selectedUserId || !pin ? 'rgba(245,158,11,0.4)' : '#f59e0b', color: '#1B3A6B', fontWeight: 700, fontSize: '15px', cursor: 'pointer' }}
            >
              {submitting ? 'Verificando...' : 'Entrar'}
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', fontSize: '12px', color: 'rgba(255,255,255,0.15)', marginTop: '16px' }}>
          Powered by Aldente
        </p>
      </div>
    </div>
  );
}
