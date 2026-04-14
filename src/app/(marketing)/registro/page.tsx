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
  return str.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 40);
}

export default function RegistroPage() {
  const supabase = createClient();
  const router = useRouter();
  const [step, setStep] = useState<Step>('form');
  const [form, setForm] = useState<FormData>(INITIAL);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [pinRevealed, setPinRevealed] = useState(false);
  const [pinCopied, setPinCopied] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [tenantSlug, setTenantSlug] = useState('');

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
      if (fnError) {
        // fnError.message often contains the raw HTTP error — show it for diagnosis
        const detail = (fnError as any)?.context?.json?.error
          || (fnError as any)?.message
          || JSON.stringify(fnError);
        throw new Error(detail);
      }
      if (data?.error) throw new Error(data.error);
      setTenantSlug(slug);
      setStep('success');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : JSON.stringify(err);
      setError('Error: ' + msg);
    } finally {
      setLoading(false);
    }
  }

  async function copyPin() {
    await navigator.clipboard.writeText(form.pin).catch(() => {});
    setPinCopied(true);
    setTimeout(() => setPinCopied(false), 2000);
  }

  async function copyLink() {
    const link = `${window.location.origin}/r/${tenantSlug}`;
    await navigator.clipboard.writeText(link).catch(() => {});
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  }

  if (step === 'success') {
    const accessUrl = typeof window !== 'undefined' ? `${window.location.origin}/r/${tenantSlug}` : `/r/${tenantSlug}`;
    return (
      <>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=DM+Sans:wght@300;400;500;600&display=swap');
          *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
          :root { --bg: #0a0c0f; --bg2: #0f1318; --bg3: #151a22; --border: rgba(255,255,255,0.07); --border-strong: rgba(255,255,255,0.12); --text: #f0ede8; --text-2: rgba(240,237,232,0.55); --text-3: rgba(240,237,232,0.3); --amber: #d4922a; --amber-light: #e8ac4a; --amber-dim: rgba(212,146,42,0.12); --amber-border: rgba(212,146,42,0.25); }
          body { background: var(--bg); color: var(--text); font-family: 'DM Sans', sans-serif; -webkit-font-smoothing: antialiased; }
        `}</style>
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', background: '#0a0c0f' }}>
          <div style={{ width: '100%', maxWidth: '480px' }}>
            <div style={{ textAlign: 'center', marginBottom: '40px' }}>
              <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: 'rgba(212,146,42,0.12)', border: '1px solid rgba(212,146,42,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontSize: '24px' }}>🎉</div>
              <h1 style={{ fontFamily: 'Instrument Serif, serif', fontSize: '32px', letterSpacing: '-0.5px', color: '#f0ede8', marginBottom: '8px' }}>¡Tu restaurante está listo!</h1>
              <p style={{ fontSize: '15px', color: 'rgba(240,237,232,0.5)', fontWeight: 300, lineHeight: 1.6 }}>
                Tienes <strong style={{ color: '#e8ac4a', fontWeight: 500 }}>14 días de prueba gratuita</strong>.<br />Guarda estos datos — los necesitarás.
              </p>
            </div>

            {/* PIN */}
            <div style={{ background: '#0f1318', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '16px', padding: '24px', marginBottom: '12px' }}>
              <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(240,237,232,0.35)', marginBottom: '14px' }}>Tu PIN de administrador</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontFamily: 'monospace', fontSize: '32px', fontWeight: 600, letterSpacing: '10px', color: '#d4922a', flex: 1 }}>
                  {pinRevealed ? form.pin : '•'.repeat(form.pin.length)}
                </span>
                <button onClick={() => setPinRevealed(v => !v)} style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: 'rgba(240,237,232,0.4)', fontSize: '12px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                  {pinRevealed ? 'Ocultar' : 'Ver'}
                </button>
                <button onClick={copyPin} style={{ padding: '6px 12px', borderRadius: '8px', border: `1px solid ${pinCopied ? 'rgba(212,146,42,0.3)' : 'rgba(255,255,255,0.1)'}`, background: pinCopied ? 'rgba(212,146,42,0.1)' : 'transparent', color: pinCopied ? '#e8ac4a' : 'rgba(240,237,232,0.4)', fontSize: '12px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                  {pinCopied ? '✓ Copiado' : 'Copiar'}
                </button>
              </div>
              <p style={{ fontSize: '12px', color: '#f87171', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>⚠</span> Esta es la única vez que puedes verlo aquí
              </p>
            </div>

            {/* Access URL */}
            <div style={{ background: '#0f1318', border: '1px solid rgba(212,146,42,0.2)', borderRadius: '16px', padding: '24px', marginBottom: '24px' }}>
              <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(212,146,42,0.7)', marginBottom: '14px' }}>Tu URL de acceso para empleados</div>
              <div style={{ fontFamily: 'monospace', fontSize: '15px', color: '#f0ede8', marginBottom: '14px', wordBreak: 'break-all' }}>
                <span style={{ color: 'rgba(240,237,232,0.35)' }}>{typeof window !== 'undefined' ? window.location.origin : ''}/r/</span>
                <span style={{ color: '#e8ac4a', fontWeight: 500 }}>{tenantSlug}</span>
              </div>
              <p style={{ fontSize: '13px', color: 'rgba(240,237,232,0.4)', marginBottom: '14px', lineHeight: 1.6, fontWeight: 300 }}>
                Comparte este link con tu equipo. Solo verán los usuarios de tu restaurante.
              </p>
              <button onClick={copyLink} style={{ padding: '8px 16px', borderRadius: '8px', border: `1px solid ${linkCopied ? 'rgba(212,146,42,0.4)' : 'rgba(255,255,255,0.1)'}`, background: linkCopied ? 'rgba(212,146,42,0.1)' : 'transparent', color: linkCopied ? '#e8ac4a' : 'rgba(240,237,232,0.5)', fontSize: '13px', cursor: 'pointer', fontWeight: 500 }}>
                {linkCopied ? '✓ Link copiado' : 'Copiar link de acceso'}
              </button>
            </div>

            <button onClick={() => router.push('/dashboard')} style={{ width: '100%', padding: '14px', borderRadius: '12px', border: 'none', background: '#d4922a', color: '#0a0c0f', fontWeight: 600, fontSize: '15px', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
              Entrar al sistema →
            </button>

            <p style={{ textAlign: 'center', marginTop: '16px', fontSize: '13px', color: 'rgba(240,237,232,0.25)' }}>
              O accede más tarde en <span style={{ color: '#e8ac4a' }}>/r/{tenantSlug}</span>
            </p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=DM+Sans:wght@300;400;500;600&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        :root { --bg: #0a0c0f; --bg2: #0f1318; --bg3: #151a22; --border: rgba(255,255,255,0.07); --border-strong: rgba(255,255,255,0.12); --text: #f0ede8; --text-2: rgba(240,237,232,0.55); --text-3: rgba(240,237,232,0.3); --amber: #d4922a; --amber-light: #e8ac4a; --amber-dim: rgba(212,146,42,0.12); --amber-border: rgba(212,146,42,0.25); }
        body { background: var(--bg); color: var(--text); font-family: 'DM Sans', sans-serif; -webkit-font-smoothing: antialiased; }
        .inp { width: 100%; padding: 11px 14px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.1); background: #0a0c0f; color: #f0ede8; font-size: 14px; outline: none; transition: border-color .15s; font-family: 'DM Sans', sans-serif; }
        .inp:focus { border-color: rgba(212,146,42,0.4); }
        .inp::placeholder { color: rgba(240,237,232,0.25); }
        .lbl { display: block; font-size: 12px; font-weight: 500; color: rgba(240,237,232,0.4); margin-bottom: 7px; letter-spacing: 0.02em; }
        .inp-pin { letter-spacing: 8px; font-size: 20px; font-family: monospace; }
      `}</style>

      <div style={{ minHeight: '100vh', display: 'grid', gridTemplateColumns: '1fr 1fr', background: '#0a0c0f' }}>

        {/* LEFT — Brand */}
        <div style={{ background: '#0f1318', borderRight: '1px solid rgba(255,255,255,0.07)', padding: '48px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <a href="/" style={{ fontFamily: 'Instrument Serif, serif', fontSize: '22px', color: '#d4922a', textDecoration: 'none' }}>Aldente</a>

          <div>
            <h1 style={{ fontFamily: 'Instrument Serif, serif', fontSize: '42px', lineHeight: 1.1, letterSpacing: '-1px', color: '#f0ede8', marginBottom: '16px' }}>
              14 días para<br />
              <span style={{ fontStyle: 'italic', color: '#d4922a' }}>convencerte</span>
            </h1>
            <p style={{ fontSize: '15px', color: 'rgba(240,237,232,0.5)', lineHeight: 1.7, fontWeight: 300, marginBottom: '36px' }}>
              Sin tarjeta de crédito. Sin compromisos.<br />
              Si no te convence, cancelas y listo.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {['POS con mapa de mesas drag & drop', 'Cocina digital con semáforo de tiempos', 'Tu URL única para tu equipo', 'Soporte directo por WhatsApp'].map(f => (
                <div key={f} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                  <span style={{ color: '#d4922a', fontSize: '14px', marginTop: '2px' }}>✓</span>
                  <span style={{ fontSize: '14px', color: 'rgba(240,237,232,0.6)', fontWeight: 300 }}>{f}</span>
                </div>
              ))}
            </div>
          </div>

          <p style={{ fontSize: '13px', color: 'rgba(240,237,232,0.2)' }}>
            ¿Ya tienes cuenta?{' '}
            <Link href="/login" style={{ color: 'rgba(212,146,42,0.7)', textDecoration: 'none' }}>Inicia sesión</Link>
          </p>
        </div>

        {/* RIGHT — Form */}
        <div style={{ padding: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: '100%', maxWidth: '400px' }}>
            <h2 style={{ fontFamily: 'Instrument Serif, serif', fontSize: '26px', letterSpacing: '-0.4px', color: '#f0ede8', marginBottom: '6px' }}>Registra tu restaurante</h2>
            <p style={{ fontSize: '14px', color: 'rgba(240,237,232,0.4)', marginBottom: '32px', fontWeight: 300 }}>Listo en menos de 2 minutos</p>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label className="lbl">Nombre del restaurante</label>
                <input className="inp" type="text" required value={form.restaurantName} onChange={e => setField('restaurantName', e.target.value)} placeholder="Tacos El Güero" />
                {form.restaurantName && (
                  <p style={{ fontSize: '12px', color: 'rgba(212,146,42,0.6)', marginTop: '5px', fontFamily: 'monospace' }}>
                    Tu URL: /r/{slugify(form.restaurantName)}
                  </p>
                )}
              </div>
              <div>
                <label className="lbl">Tu nombre completo</label>
                <input className="inp" type="text" required value={form.adminName} onChange={e => setField('adminName', e.target.value)} placeholder="María García López" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label className="lbl">Teléfono / WhatsApp</label>
                  <input className="inp" type="tel" value={form.phone} onChange={e => setField('phone', e.target.value)} placeholder="+52 55 1234 5678" />
                </div>
                <div>
                  <label className="lbl">Email (opcional)</label>
                  <input className="inp" type="email" value={form.email} onChange={e => setField('email', e.target.value)} placeholder="tu@email.com" />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label className="lbl">PIN de acceso</label>
                  <input className="inp inp-pin" type="password" required maxLength={6} inputMode="numeric" value={form.pin} onChange={e => setField('pin', e.target.value.replace(/\D/g, ''))} placeholder="••••" />
                </div>
                <div>
                  <label className="lbl">Confirmar PIN</label>
                  <input className="inp inp-pin" type="password" required maxLength={6} inputMode="numeric" value={form.pinConfirm} onChange={e => setField('pinConfirm', e.target.value.replace(/\D/g, ''))} placeholder="••••" />
                </div>
              </div>
              <p style={{ fontSize: '12px', color: 'rgba(240,237,232,0.3)', lineHeight: 1.6, fontWeight: 300 }}>
                El PIN es el acceso diario al sistema para ti y tu equipo. Mínimo 4 dígitos.
              </p>

              {error && (
                <div style={{ padding: '12px 14px', borderRadius: '10px', background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)', color: '#f87171', fontSize: '13px', lineHeight: 1.5 }}>
                  {error}
                </div>
              )}

              <button type="submit" disabled={loading} style={{ padding: '14px', borderRadius: '12px', border: 'none', background: loading ? 'rgba(212,146,42,0.4)' : '#d4922a', color: '#0a0c0f', fontWeight: 600, fontSize: '15px', cursor: loading ? 'wait' : 'pointer', marginTop: '4px', fontFamily: 'DM Sans, sans-serif', transition: 'background .15s' }}>
                {loading ? 'Creando tu restaurante...' : 'Comenzar prueba gratuita →'}
              </button>
            </form>

            <p style={{ textAlign: 'center', marginTop: '20px', fontSize: '12px', color: 'rgba(240,237,232,0.2)' }}>
              Al registrarte aceptas los términos de servicio de Aldente
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
