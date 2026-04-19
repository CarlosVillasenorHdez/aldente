'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { ShieldCheck, Eye, EyeOff } from 'lucide-react';

export default function AdminLoginPage() {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw]     = useState(false);
  const [error, setError]       = useState('');
  const [status, setStatus]     = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setStatus('Verificando credenciales...');

    const supabase = createClient();

    // Paso 1 — Login con Supabase Auth
    const { data, error: authErr } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

    if (authErr || !data?.user) {
      setError(authErr?.message ?? 'Credenciales incorrectas');
      setStatus('');
      setPassword('');
      return;
    }

    setStatus('Verificando permisos...');

    // Paso 2 — Verificar rol superadmin
    const { data: row, error: rowErr } = await supabase
      .from('app_users')
      .select('app_role')
      .eq('auth_user_id', data.user.id)
      .maybeSingle();

    if (rowErr) {
      setError('Error al verificar permisos: ' + rowErr.message);
      setStatus('');
      await supabase.auth.signOut();
      return;
    }

    if (!row || row.app_role !== 'superadmin') {
      setError('No tienes permisos de superadministrador. Rol encontrado: ' + (row?.app_role ?? 'ninguno'));
      setStatus('');
      await supabase.auth.signOut();
      return;
    }

    setStatus('Entrando...');
    window.location.href = '/admin';
  };

  const busy = status !== '';

  return (
    <div style={{ position:'fixed', inset:0, backgroundColor:'#060d18', display:'flex', alignItems:'center', justifyContent:'center', zIndex:9999 }}>
      <div style={{ width:'100%', maxWidth:'400px', padding:'0 16px' }}>

        <div style={{ textAlign:'center', marginBottom:'32px' }}>
          <h1 style={{ color:'#f1f5f9', fontSize:'22px', fontWeight:700, margin:0 }}>Aldente</h1>
          <p style={{ color:'#64748b', fontSize:'14px', marginTop:'4px', display:'flex', alignItems:'center', justifyContent:'center', gap:'6px' }}>
            <ShieldCheck size={14} style={{ color:'#60a5fa' }} /> Panel de Superadministrador
          </p>
        </div>

        <div style={{ backgroundColor:'#0d1b2a', border:'1px solid #1e2d3d', borderRadius:'16px', padding:'28px' }}>
          <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:'16px' }}>

            <div>
              <label style={{ display:'block', color:'#94a3b8', fontSize:'13px', marginBottom:'6px' }}>Correo</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="admin@ejemplo.mx" disabled={busy}
                style={{ width:'100%', padding:'10px 12px', borderRadius:'10px', backgroundColor:'#0a0f1a', border:'1px solid #1e2d3d', color:'#f1f5f9', fontSize:'14px', outline:'none', boxSizing:'border-box' }} />
            </div>

            <div>
              <label style={{ display:'block', color:'#94a3b8', fontSize:'13px', marginBottom:'6px' }}>Contraseña</label>
              <div style={{ position:'relative' }}>
                <input type={showPw ? 'text' : 'password'} value={password}
                  onChange={e => setPassword(e.target.value)} disabled={busy}
                  style={{ width:'100%', padding:'10px 36px 10px 12px', borderRadius:'10px', backgroundColor:'#0a0f1a', border:'1px solid #1e2d3d', color:'#f1f5f9', fontSize:'14px', outline:'none', boxSizing:'border-box' }} />
                <button type="button" onClick={() => setShowPw(v => !v)}
                  style={{ position:'absolute', right:'10px', top:'50%', transform:'translateY(-50%)', background:'none', border:'none', color:'#64748b', cursor:'pointer', padding:0, display:'flex', alignItems:'center' }}>
                  {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {error && (
              <div style={{ backgroundColor:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.3)', borderRadius:'8px', padding:'10px 12px' }}>
                <p style={{ color:'#ef4444', fontSize:'13px', margin:0 }}>⚠️ {error}</p>
              </div>
            )}

            {status && !error && (
              <p style={{ color:'#60a5fa', fontSize:'13px', margin:0, textAlign:'center' }}>
                ⏳ {status}
              </p>
            )}

            <button type="submit" disabled={busy || !email || !password}
              style={{ width:'100%', padding:'11px', borderRadius:'10px', backgroundColor: busy || !email || !password ? '#1e2d3d' : '#2563eb', color: busy || !email || !password ? '#475569' : '#fff', fontSize:'14px', fontWeight:600, border:'none', cursor: busy ? 'not-allowed' : 'pointer' }}>
              {busy ? status : 'Entrar al panel'}
            </button>

          </form>
        </div>

        {/* Debug info — quitar en producción */}
        <p style={{ color:'#334155', fontSize:'11px', textAlign:'center', marginTop:'16px' }}>
          Si ves un error de permisos, abre F12 → Console y comparte el mensaje exacto
        </p>

      </div>
    </div>
  );
}
