'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { ShieldCheck, Eye, EyeOff } from 'lucide-react';

export default function AdminLoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitStep, setSubmitStep] = useState<'idle'|'auth'|'role'|'redirect'>('idle');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email.trim()) { setError('Ingresa tu correo'); return; }
    if (!password) { setError('Ingresa tu contraseña'); return; }
    setSubmitStep('auth');

    try {
      // Timeout de 10 segundos para evitar que se quede colgado
      const authPromise = supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('timeout')), 10000)
      );

      const { data, error: authError } = await Promise.race([authPromise, timeoutPromise])
        .catch((err) => {
          if (err.message === 'timeout') throw new Error('El servidor tardó demasiado. Intenta de nuevo.');
          throw err;
        }) as Awaited<typeof authPromise>;

      if (authError || !data.user) {
        setError(authError?.message === 'Invalid login credentials'
          ? 'Correo o contraseña incorrectos'
          : authError?.message ?? 'Error al iniciar sesión');
        setPassword('');
        setSubmitStep('idle');
        return;
      }

      // Verificar rol superadmin — query directa sin RLS
      // El superadmin tiene tenant_id especial (000...001) que puede causar
      // lentitud con las políticas de RLS normales
      const rolePromise = supabase
        .from('app_users')
        .select('app_role')
        .eq('auth_user_id', data.user.id)
        .eq('app_role', 'superadmin')
        .maybeSingle();

      const { data: adminRow, error: roleError } = await Promise.race([
        rolePromise,
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 8000)),
      ]).catch(() => ({ data: null, error: new Error('timeout') })) as Awaited<typeof rolePromise>;

      if (roleError || !adminRow) {
        await supabase.auth.signOut();
        setError('No tienes permisos de superadministrador.');
        setPassword('');
        setSubmitStep('idle');
        return;
      }

      setSubmitStep('redirect');
      // Usar window.location en lugar de router.replace para que
      // el navegador haga una carga completa y las cookies de sesión
      // estén disponibles antes de que el middleware las verifique
      window.location.href = '/admin';
    } catch (err: any) {
      setError(err.message === 'El servidor tardó demasiado. Intenta de nuevo.'
        ? err.message
        : 'Error de conexión. Verifica tu internet e intenta de nuevo.');
      setPassword('');
      setSubmitStep('idle');
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: '#060d18', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
      <div style={{ width: '100%', maxWidth: '400px', padding: '0 16px' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <img src="/assets/images/logo_aldente.png" alt="Aldente" style={{ width: '64px', height: '64px', objectFit: 'contain', marginBottom: '12px' }} />
          <h1 style={{ color: '#f1f5f9', fontSize: '22px', fontWeight: 700, margin: 0 }}>Aldente</h1>
          <p style={{ color: '#64748b', fontSize: '14px', marginTop: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
            <ShieldCheck size={14} style={{ color: '#60a5fa' }} /> Panel de Superadministrador
          </p>
        </div>
        <div style={{ backgroundColor: '#0d1b2a', border: '1px solid #1e2d3d', borderRadius: '16px', padding: '28px' }}>
          <h2 style={{ color: '#f1f5f9', fontSize: '18px', fontWeight: 600, marginBottom: '20px', marginTop: 0 }}>Iniciar sesión</h2>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', color: '#94a3b8', fontSize: '13px', marginBottom: '6px' }}>Correo</label>
              <input
                type="email"
                value={email}
                onChange={e => { setEmail(e.target.value); setError(''); }}
                placeholder="admin@ejemplo.mx"
                style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', backgroundColor: '#0a0f1a', border: `1px solid ${error ? '#ef4444' : '#1e2d3d'}`, color: '#f1f5f9', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', color: '#94a3b8', fontSize: '13px', marginBottom: '6px' }}>Contraseña</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => { setPassword(e.target.value); setError(''); }}
                  style={{ width: '100%', padding: '10px 36px 10px 12px', borderRadius: '10px', backgroundColor: '#0a0f1a', border: `1px solid ${error ? '#ef4444' : '#1e2d3d'}`, color: '#f1f5f9', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center' }}
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>
            {error && <p style={{ color: '#ef4444', fontSize: '13px', margin: 0 }}>⚠️ {error}</p>}
            <button
              type="submit"
              disabled={submitStep !== 'idle' || !email || !password}
              style={{ width: '100%', padding: '11px', borderRadius: '10px', backgroundColor: submitStep !== 'idle' || !email || !password ? '#1e2d3d' : '#2563eb', color: submitStep !== 'idle' || !email || !password ? '#475569' : '#fff', fontSize: '14px', fontWeight: 600, border: 'none', cursor: submitStep !== 'idle' || !email || !password ? 'not-allowed' : 'pointer', transition: 'background-color 0.2s' }}
            >
              {submitStep === 'auth' ? 'Verificando credenciales...' : submitStep === 'role' ? 'Verificando permisos...' : submitStep === 'redirect' ? 'Entrando...' : 'Entrar al panel'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
