'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

type Step = 'form' | 'success';

interface FormData {
  restaurantName: string;
  adminName: string;
  phone: string;
  email: string;
  pin: string;
  pinConfirm: string;
  establishmentType: string;
  yearsOperating: string;
}

const INITIAL: FormData = {
  restaurantName: '', adminName: '', phone: '', email: '',
  pin: '', pinConfirm: '', establishmentType: 'restaurante', yearsOperating: '',
};

const TYPES = [
  { key: 'restaurante', label: 'Restaurante',   icon: '🍽️' },
  { key: 'cafeteria',   label: 'Cafetería',      icon: '☕' },
  { key: 'bar',         label: 'Bar / Cantina',  icon: '🍺' },
  { key: 'mixto',       label: 'Mixto',          icon: '🏪' },
];

function slugify(str: string) {
  return str.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 40);
}

async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text + 'aldente_salt_2024'));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=DM+Sans:wght@300;400;500;600&display=swap');
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  body{background:#080b10;color:#f0ede8;font-family:'DM Sans',sans-serif;-webkit-font-smoothing:antialiased}
  .inp{width:100%;padding:11px 14px;border-radius:10px;border:1px solid rgba(255,255,255,0.1);background:rgba(255,255,255,0.04);color:#f0ede8;font-size:14px;outline:none;transition:border-color .15s;font-family:'DM Sans',sans-serif}
  .inp:focus{border-color:rgba(212,146,42,0.5)}
  .inp::placeholder{color:rgba(240,237,232,0.25)}
  .lbl{display:block;font-size:11px;font-weight:500;color:rgba(240,237,232,0.45);margin-bottom:6px;letter-spacing:.04em;text-transform:uppercase}
  .inp-pin{letter-spacing:10px;font-size:22px;font-family:monospace;text-align:center}
  .btn-primary{width:100%;padding:14px;border-radius:12px;border:none;background:#d4922a;color:#080b10;font-weight:700;font-size:15px;cursor:pointer;font-family:'DM Sans',sans-serif;transition:opacity .15s}
  .btn-primary:hover{opacity:.9}
  .btn-primary:disabled{background:rgba(212,146,42,0.35);color:rgba(8,11,16,0.5);cursor:wait}
`;

export default function RegistroPage() {
  const supabase = createClient();
  const [step, setStep] = useState<Step>('form');
  const [form, setForm] = useState<FormData>(INITIAL);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [pinVisible, setPinVisible] = useState(false);
  const [pinCopied, setPinCopied] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [tenantSlug, setTenantSlug] = useState('');

  const set = (k: keyof FormData, v: string) => setForm(f => ({ ...f, [k]: v }));
  const slug = slugify(form.restaurantName) || 'mi-restaurante';

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!form.restaurantName.trim()) { setError('Ingresa el nombre de tu restaurante'); return; }
    if (!form.adminName.trim()) { setError('Ingresa tu nombre completo'); return; }
    if (form.pin.length < 4 || !/^\d+$/.test(form.pin)) { setError('El PIN debe ser de al menos 4 dígitos'); return; }
    if (form.pin !== form.pinConfirm) { setError('Los PINs no coinciden'); return; }
    setLoading(true);
    try {
      const pinHash = await sha256(form.pin);
      const { data, error: fnError } = await supabase.functions.invoke('create-tenant', {
        body: {
          restaurantName: form.restaurantName.trim(),
          slug,
          adminName: form.adminName.trim(),
          phone: form.phone.trim(),
          email: form.email.trim(),
          pinHash,
          establishmentType: form.establishmentType,
          yearsOperating: form.yearsOperating,
        },
        headers: { Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}` },
      });
      if (fnError) {
        const detail = (fnError as any)?.context?.json?.error || (fnError as any)?.message || JSON.stringify(fnError);
        throw new Error(detail);
      }
      if (data?.error) throw new Error(data.error);
      setTenantSlug(slug);
      setStep('success');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al crear el restaurante. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  }

  function copyPin() {
    navigator.clipboard.writeText(form.pin).catch(() => {});
    setPinCopied(true); setTimeout(() => setPinCopied(false), 2000);
  }
  function copyLink() {
    const url = `${window.location.origin}/r/${tenantSlug}`;
    navigator.clipboard.writeText(url).catch(() => {});
    setLinkCopied(true); setTimeout(() => setLinkCopied(false), 2000);
  }
  function shareWhatsApp() {
    const url = `${window.location.origin}/r/${tenantSlug}`;
    const msg = encodeURIComponent(`Tu acceso a Aldente:\n\nURL: ${url}\nPIN: ${form.pin}\n\nGuarda este mensaje.`);
    window.open(`https://wa.me/?text=${msg}`, '_blank');
  }

  // ── SUCCESS SCREEN ─────────────────────────────────────────────────────────
  if (step === 'success') {
    const accessUrl = typeof window !== 'undefined' ? `${window.location.origin}/r/${tenantSlug}` : `/r/${tenantSlug}`;
    return (
      <>
        <style>{CSS}</style>
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', background: '#080b10' }}>
          <div style={{ width: '100%', maxWidth: 480 }}>
            {/* Header */}
            <div style={{ textAlign: 'center', marginBottom: 36 }}>
              <div style={{ width: 64, height: 64, borderRadius: 20, background: 'rgba(212,146,42,0.12)', border: '1px solid rgba(212,146,42,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontSize: 28 }}>🎉</div>
              <h1 style={{ fontFamily: 'Instrument Serif, serif', fontSize: 32, letterSpacing: '-0.5px', color: '#f0ede8', marginBottom: 8 }}>
                ¡{form.restaurantName} está listo!
              </h1>
              <p style={{ fontSize: 14, color: 'rgba(240,237,232,0.45)', fontWeight: 300, lineHeight: 1.6 }}>
                Tienes <strong style={{ color: '#e8ac4a', fontWeight: 500 }}>14 días de prueba gratuita</strong>.<br />
                Guarda estos datos — los necesitarás para entrar.
              </p>
            </div>

            {/* PIN card */}
            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: 24, marginBottom: 12 }}>
              <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '.1em', color: 'rgba(240,237,232,0.3)', marginBottom: 12 }}>
                Tu PIN de administrador
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                <span style={{ fontFamily: 'monospace', fontSize: 34, fontWeight: 600, letterSpacing: 12, color: '#d4922a', flex: 1 }}>
                  {pinVisible ? form.pin : '•'.repeat(form.pin.length)}
                </span>
                <button onClick={() => setPinVisible(v => !v)} style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: 'rgba(240,237,232,0.4)', fontSize: 12, cursor: 'pointer' }}>
                  {pinVisible ? 'Ocultar' : 'Ver'}
                </button>
                <button onClick={copyPin} style={{ padding: '6px 12px', borderRadius: 8, border: `1px solid ${pinCopied ? 'rgba(212,146,42,0.4)' : 'rgba(255,255,255,0.1)'}`, background: pinCopied ? 'rgba(212,146,42,0.1)' : 'transparent', color: pinCopied ? '#e8ac4a' : 'rgba(240,237,232,0.4)', fontSize: 12, cursor: 'pointer' }}>
                  {pinCopied ? '✓ Copiado' : 'Copiar'}
                </button>
              </div>
              <p style={{ fontSize: 12, color: '#f87171', display: 'flex', alignItems: 'center', gap: 6 }}>
                ⚠ Esta es la única vez que puedes verlo aquí
              </p>
            </div>

            {/* Access URL card */}
            <div style={{ background: 'rgba(212,146,42,0.04)', border: '1px solid rgba(212,146,42,0.2)', borderRadius: 16, padding: 24, marginBottom: 20 }}>
              <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '.1em', color: 'rgba(212,146,42,0.6)', marginBottom: 10 }}>
                URL de acceso para ti y tu equipo
              </div>
              <div style={{ fontFamily: 'monospace', fontSize: 14, color: '#f0ede8', marginBottom: 14, wordBreak: 'break-all' }}>
                <span style={{ color: 'rgba(240,237,232,0.3)' }}>{typeof window !== 'undefined' ? window.location.origin : ''}/r/</span>
                <span style={{ color: '#e8ac4a', fontWeight: 500 }}>{tenantSlug}</span>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={copyLink} style={{ flex: 1, padding: '8px 12px', borderRadius: 8, border: `1px solid ${linkCopied ? 'rgba(212,146,42,0.4)' : 'rgba(255,255,255,0.1)'}`, background: linkCopied ? 'rgba(212,146,42,0.1)' : 'transparent', color: linkCopied ? '#e8ac4a' : 'rgba(240,237,232,0.45)', fontSize: 13, cursor: 'pointer', fontWeight: 500 }}>
                  {linkCopied ? '✓ Copiado' : 'Copiar link'}
                </button>
                <button onClick={shareWhatsApp} style={{ flex: 1, padding: '8px 12px', borderRadius: 8, border: '1px solid rgba(37,211,102,0.3)', background: 'rgba(37,211,102,0.08)', color: '#25d366', fontSize: 13, cursor: 'pointer', fontWeight: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  <span style={{ fontSize: 15 }}>📱</span> Enviar por WhatsApp
                </button>
              </div>
            </div>

            <button
              onClick={() => window.location.href = `/r/${tenantSlug}`}
              style={{ width: '100%', padding: '15px', borderRadius: 12, border: 'none', background: '#d4922a', color: '#080b10', fontWeight: 700, fontSize: 15, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
              Comenzar la configuración →
            </button>
            <p style={{ textAlign: 'center', marginTop: 14, fontSize: 12, color: 'rgba(240,237,232,0.2)' }}>
              O accede después en <span style={{ color: '#e8ac4a' }}>/r/{tenantSlug}</span>
            </p>
          </div>
        </div>
      </>
    );
  }

  // ── FORM ───────────────────────────────────────────────────────────────────
  return (
    <>
      <style>{CSS}</style>
      <div style={{ minHeight: '100vh', display: 'grid', gridTemplateColumns: '1fr 1fr', background: '#080b10' }} className="reg-grid">
        <style>{`@media(max-width:768px){.reg-grid{grid-template-columns:1fr!important}.reg-left{display:none!important}}`}</style>

        {/* LEFT — Brand */}
        <div className="reg-left" style={{ background: '#0d1117', borderRight: '1px solid rgba(255,255,255,0.06)', padding: '48px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <a href="/" style={{ fontFamily: 'Instrument Serif, serif', fontSize: 22, color: '#d4922a', textDecoration: 'none' }}>Aldente</a>
          <div>
            <h1 style={{ fontFamily: 'Instrument Serif, serif', fontSize: 42, lineHeight: 1.1, letterSpacing: '-1px', color: '#f0ede8', marginBottom: 16 }}>
              14 días para<br /><em style={{ fontStyle: 'italic', color: '#d4922a' }}>convencerte.</em>
            </h1>
            <p style={{ fontSize: 15, color: 'rgba(240,237,232,0.45)', lineHeight: 1.7, fontWeight: 300, marginBottom: 36 }}>
              Sin tarjeta de crédito. Sin compromisos.<br />Si no te convence, cancelas y listo.
            </p>
            {/* Value props */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {[
                ['🍽️', 'POS + KDS + Mesero Móvil sincronizados'],
                ['📊', 'P&L real — sabes exactamente si ganaste'],
                ['📦', 'Inventario vivo por receta — sin sorpresas'],
                ['💬', 'Soporte directo por WhatsApp en español'],
              ].map(([icon, text]) => (
                <div key={text} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <span style={{ fontSize: 16, marginTop: 1 }}>{icon}</span>
                  <span style={{ fontSize: 14, color: 'rgba(240,237,232,0.55)', fontWeight: 300, lineHeight: 1.5 }}>{text}</span>
                </div>
              ))}
            </div>
          </div>
          <p style={{ fontSize: 13, color: 'rgba(240,237,232,0.2)' }}>
            ¿Ya tienes cuenta?{' '}
            <Link href="/login" style={{ color: 'rgba(212,146,42,0.6)', textDecoration: 'none' }}>Inicia sesión</Link>
          </p>
        </div>

        {/* RIGHT — Form */}
        <div style={{ padding: 'clamp(32px,6vw,60px)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflowY: 'auto' }}>
          <div style={{ width: '100%', maxWidth: 420 }}>
            <div style={{ marginBottom: 32 }}>
              <h2 style={{ fontFamily: 'Instrument Serif, serif', fontSize: 26, letterSpacing: '-0.4px', color: '#f0ede8', marginBottom: 6 }}>
                Registra tu restaurante
              </h2>
              <p style={{ fontSize: 14, color: 'rgba(240,237,232,0.35)', fontWeight: 300 }}>Listo en menos de 2 minutos</p>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

              {/* Tipo de negocio — first, sets context */}
              <div>
                <label className="lbl">Tipo de negocio</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {TYPES.map(t => (
                    <button key={t.key} type="button" onClick={() => set('establishmentType', t.key)}
                      style={{ padding: '10px 14px', borderRadius: 10, border: `1px solid ${form.establishmentType === t.key ? 'rgba(212,146,42,0.6)' : 'rgba(255,255,255,0.08)'}`, background: form.establishmentType === t.key ? 'rgba(212,146,42,0.1)' : 'rgba(255,255,255,0.03)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, transition: 'all .15s' }}>
                      <span style={{ fontSize: 16 }}>{t.icon}</span>
                      <span style={{ fontSize: 13, fontWeight: form.establishmentType === t.key ? 600 : 400, color: form.establishmentType === t.key ? '#e8ac4a' : 'rgba(240,237,232,0.5)' }}>{t.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Restaurant name */}
              <div>
                <label className="lbl">Nombre del restaurante</label>
                <input className="inp" type="text" required value={form.restaurantName}
                  onChange={e => set('restaurantName', e.target.value)}
                  placeholder="Tacos El Güero" autoFocus />
                {form.restaurantName && (
                  <p style={{ fontSize: 11, color: 'rgba(212,146,42,0.55)', marginTop: 5, fontFamily: 'monospace' }}>
                    aldente.app/r/{slug}
                  </p>
                )}
              </div>

              {/* Admin name */}
              <div>
                <label className="lbl">Tu nombre completo</label>
                <input className="inp" type="text" required value={form.adminName}
                  onChange={e => set('adminName', e.target.value)}
                  placeholder="María García López" />
              </div>

              {/* Years operating */}
              <div>
                <label className="lbl">¿Cuánto tiempo llevas operando? <span style={{ color: 'rgba(212,146,42,0.4)', fontWeight: 400 }}>(opcional)</span></label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {[
                    { key: '',       label: 'No aplica / Nuevo' },
                    { key: '0-1',    label: 'Menos de 1 año' },
                    { key: '1-3',    label: '1 – 3 años' },
                    { key: '3-5',    label: '3 – 5 años' },
                    { key: '5-10',   label: '5 – 10 años' },
                    { key: '10+',    label: 'Más de 10 años' },
                  ].map(opt => (
                    <button key={opt.key} type="button"
                      onClick={() => set('yearsOperating', opt.key)}
                      style={{ padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer', transition: 'all .15s',
                        background: form.yearsOperating === opt.key ? 'rgba(212,146,42,0.2)' : 'rgba(255,255,255,0.06)',
                        color: form.yearsOperating === opt.key ? '#d4922a' : 'rgba(240,236,228,0.5)',
                        outline: form.yearsOperating === opt.key ? '1px solid rgba(212,146,42,0.4)' : 'none' }}>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Phone + email */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label className="lbl">WhatsApp</label>
                  <input className="inp" type="tel" value={form.phone}
                    onChange={e => set('phone', e.target.value)}
                    placeholder="+52 55 1234 5678" />
                </div>
                <div>
                  <label className="lbl">Email (opcional)</label>
                  <input className="inp" type="email" value={form.email}
                    onChange={e => set('email', e.target.value)}
                    placeholder="tu@email.com" />
                </div>
              </div>

              {/* PIN */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label className="lbl">PIN de acceso</label>
                  <input className="inp inp-pin" type="password" required maxLength={6}
                    inputMode="numeric" value={form.pin}
                    onChange={e => set('pin', e.target.value.replace(/\D/g, ''))}
                    placeholder="••••" />
                </div>
                <div>
                  <label className="lbl">Confirmar PIN</label>
                  <input className="inp inp-pin" type="password" required maxLength={6}
                    inputMode="numeric" value={form.pinConfirm}
                    onChange={e => set('pinConfirm', e.target.value.replace(/\D/g, ''))}
                    placeholder="••••" />
                </div>
              </div>
              <p style={{ fontSize: 11, color: 'rgba(240,237,232,0.25)', lineHeight: 1.6, marginTop: -8 }}>
                El PIN es tu acceso diario al sistema. Mínimo 4 dígitos numéricos.
              </p>

              {error && (
                <div style={{ padding: '12px 14px', borderRadius: 10, background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)', color: '#f87171', fontSize: 13, lineHeight: 1.5 }}>
                  {error}
                </div>
              )}

              <button type="submit" disabled={loading} className="btn-primary" style={{ marginTop: 4 }}>
                {loading ? 'Creando tu restaurante…' : 'Comenzar prueba gratuita →'}
              </button>
            </form>

            <p style={{ textAlign: 'center', marginTop: 20, fontSize: 11, color: 'rgba(240,237,232,0.2)', lineHeight: 1.6 }}>
              Al registrarte aceptas los{' '}
              <a href="/terminos" target="_blank" style={{ color: 'rgba(212,146,42,0.6)', textDecoration: 'underline' }}>Términos de Servicio</a>
              {' '}y el{' '}
              <a href="/privacidad" target="_blank" style={{ color: 'rgba(212,146,42,0.6)', textDecoration: 'underline' }}>Aviso de Privacidad</a>
              {' '}de Aldente.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
