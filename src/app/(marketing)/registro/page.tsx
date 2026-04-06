'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

type Step = 'form' | 'success';

interface FormData {
  restaurantName: string;
  adminName: string;
  phone: string;
  email: string;
  pin: string;
  pinConfirm: string;
}

const INITIAL: FormData = { restaurantName: '', adminName: '', phone: '', email: '', pin: '', pinConfirm: '' };

function slugify(str: string) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').substring(0, 40);
}

const inp: React.CSSProperties = {
  width: '100%', padding: '10px 14px', borderRadius: '10px',
  border: '1px solid #2a3f5f', backgroundColor: '#0f1923',
  color: '#f1f5f9', fontSize: '14px', outline: 'none', boxSizing: 'border-box',
};
const lbl: React.CSSProperties = {
  display: 'block', fontSize: '12px', fontWeight: 600,
  color: 'rgba(255,255,255,0.45)', marginBottom: '6px',
  textTransform: 'uppercase', letterSpacing: '0.05em',
};

export default function RegistroPage() {
  const supabase = createClient();
  const router = useRouter();
  const [step, setStep] = useState<Step>('form');
  const [form, setForm] = useState<FormData>(INITIAL);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [pinRevealed, setPinRevealed] = useState(false);
  const [pinCopied, setPinCopied] = useState(false);
  const [savedPin, setSavedPin] = useState('');

  function setField(key: keyof FormData, value: string) {
    setForm(f => ({ ...f, [key]: value }));
  }

  async function sha256(text: string): Promise<string> {
    const salt = 'aldente_salt_2024';
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text + salt));
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (form.pin.length < 4 || !/^\d+$/.test(form.pin)) {
      setError('El PIN debe ser de al menos 4 dígitos numéricos.'); return;
    }
    if (form.pin !== form.pinConfirm) {
      setError('Los PINs no coinciden.'); return;
    }
    setLoading(true);
    try {
      const pinHash = await sha256(form.pin);
      const slug = slugify(form.restaurantName) || 'restaurante-' + Date.now();
      const { data, error: fnError } = await supabase.functions.invoke('create-tenant', {
        body: { restaurantName: form.restaurantName.trim(), slug, adminName: form.adminName.trim(), phone: form.phone.trim(), pinHash },
      });
      if (fnError) throw fnError;
      if (data?.error) throw new Error(data.error);
      setSavedPin(form.pin);
      setStep('success');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al crear el restaurante. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  }

  async function copyPin() {
    await navigator.clipboard.writeText(savedPin).catch(() => {});
    setPinCopied(true);
    setTimeout(() => setPinCopied(false), 2000);
  }

  if (step === 'success') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0f1923', fontFamily: 'DM Sans, system-ui, sans-serif', padding: '24px' }}>
        <div style={{ width: '100%', maxWidth: '420px', textAlign: 'center' }}>
          <div style={{ fontSize: '52px', marginBottom: '16px' }}>🎉</div>
          <h1 style={{ color: '#f1f5f9', fontSize: '22px', fontWeight: 700, margin: '0 0 6px' }}>¡Tu restaurante está listo!</h1>
          <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '14px', margin: '0 0 24px' }}>
            Tienes <strong style={{ color: '#34d399' }}>14 días de prueba gratuita</strong>.
          </p>

          {/* PIN — secure reveal */}
          <div style={{ padding: '18px 20px', borderRadius: '14px', backgroundColor: '#1a2535', border: '1px solid #1e2d3d', marginBottom: '12px', textAlign: 'left' }}>
            <p style={{ margin: '0 0 10px', fontSize: '12px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Tu PIN de acceso</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '28px', fontWeight: 700, fontFamily: 'monospace', letterSpacing: '8px', color: '#f59e0b', flex: 1 }}>
                {pinRevealed ? savedPin : '••••'}
              </span>
              <button onClick={() => setPinRevealed(v => !v)} style={{ padding: '6px 12px', borderRadius: '7px', border: '1px solid #2a3f5f', backgroundColor: 'transparent', color: 'rgba(255,255,255,0.5)', fontSize: '12px', cursor: 'pointer' }}>
                {pinRevealed ? 'Ocultar' : 'Ver'}
              </button>
              <button onClick={copyPin} style={{ padding: '6px 12px', borderRadius: '7px', border: '1px solid #2a3f5f', backgroundColor: pinCopied ? 'rgba(52,211,153,0.15)' : 'transparent', color: pinCopied ? '#34d399' : 'rgba(255,255,255,0.5)', fontSize: '12px', cursor: 'pointer' }}>
                {pinCopied ? '✓ Copiado' : 'Copiar'}
              </button>
            </div>
            <p style={{ margin: '10px 0 0', fontSize: '11px', color: '#f87171' }}>
              Guárdalo ahora — no podrás verlo de nuevo en esta pantalla.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
            <div style={{ padding: '12px 16px', borderRadius: '10px', backgroundColor: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.2)', textAlign: 'left' }}>
              <p style={{ margin: '0 0 2px', fontSize: '11px', color: 'rgba(255,255,255,0.35)' }}>Accede al sistema en:</p>
              <p style={{ margin: 0, fontSize: '13px', color: '#34d399', fontFamily: 'monospace' }}>
                {typeof window !== 'undefined' ? window.location.origin + '/login' : '/login'}
              </p>
            </div>
          </div>

          <button
            onClick={() => router.push('/login')}
            style={{ width: '100%', padding: '13px', borderRadius: '12px', border: 'none', backgroundColor: '#f59e0b', color: '#1B3A6B', fontWeight: 700, fontSize: '15px', cursor: 'pointer' }}
          >
            Entrar al sistema →
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0f1923', fontFamily: 'DM Sans, system-ui, sans-serif', padding: '24px' }}>
      <div style={{ width: '100%', maxWidth: '440px' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ fontSize: '36px', marginBottom: '12px' }}>🍽</div>
          <h1 style={{ color: '#f1f5f9', fontSize: '22px', fontWeight: 700, margin: '0 0 6px' }}>Registra tu restaurante</h1>
          <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '14px', margin: 0 }}>14 días gratis · Sin tarjeta de crédito</p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={lbl}>Nombre del restaurante</label>
            <input type="text" required value={form.restaurantName} onChange={e => setField('restaurantName', e.target.value)} placeholder="Tacos El Güero" style={inp} />
          </div>
          <div>
            <label style={lbl}>Tu nombre completo</label>
            <input type="text" required value={form.adminName} onChange={e => setField('adminName', e.target.value)} placeholder="María García López" style={inp} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label style={lbl}>Teléfono / WhatsApp</label>
              <input type="tel" value={form.phone} onChange={e => setField('phone', e.target.value)} placeholder="+52 55 1234 5678" style={inp} />
            </div>
            <div>
              <label style={lbl}>Email (opcional)</label>
              <input type="email" value={form.email} onChange={e => setField('email', e.target.value)} placeholder="tu@email.com" style={inp} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label style={lbl}>PIN de acceso</label>
              <input type="password" required maxLength={6} inputMode="numeric" value={form.pin} onChange={e => setField('pin', e.target.value.replace(/\D/g, ''))} placeholder="••••" style={{ ...inp, letterSpacing: '8px', fontSize: '20px' }} />
            </div>
            <div>
              <label style={lbl}>Confirmar PIN</label>
              <input type="password" required maxLength={6} inputMode="numeric" value={form.pinConfirm} onChange={e => setField('pinConfirm', e.target.value.replace(/\D/g, ''))} placeholder="••••" style={{ ...inp, letterSpacing: '8px', fontSize: '20px' }} />
            </div>
          </div>
          <p style={{ margin: 0, fontSize: '11px', color: 'rgba(255,255,255,0.25)' }}>
            El PIN es el acceso diario al sistema. Mínimo 4 dígitos numéricos.
          </p>

          {error && (
            <div style={{ padding: '10px 14px', borderRadius: '8px', backgroundColor: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)', color: '#f87171', fontSize: '13px' }}>
              {error}
            </div>
          )}

          <button type="submit" disabled={loading} style={{ padding: '13px', borderRadius: '10px', border: 'none', backgroundColor: loading ? 'rgba(245,158,11,0.5)' : '#f59e0b', color: '#1B3A6B', fontWeight: 700, fontSize: '15px', cursor: loading ? 'wait' : 'pointer', marginTop: '4px' }}>
            {loading ? 'Creando tu restaurante...' : 'Comenzar prueba gratuita →'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '20px', fontSize: '13px', color: 'rgba(255,255,255,0.3)' }}>
          ¿Ya tienes cuenta? <Link href="/login" style={{ color: '#f59e0b', textDecoration: 'none' }}>Inicia sesión</Link>
        </p>
      </div>
    </div>
  );
}
