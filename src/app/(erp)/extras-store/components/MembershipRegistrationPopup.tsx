'use client';

/**
 * MembershipRegistrationPopup
 *
 * Aparece justo después de vender el produto_trigger (ej: el termo).
 * El cajero registra al cliente en el mismo flujo, sin salir a otro módulo.
 *
 * Escenarios:
 *   A — Cliente nuevo  → captura nombre, tel, cumpleaños → crea socio
 *   B — Ya tiene membresía activa → muestra estado → opción renovar
 *   C — No quiere membresía → skip
 */
import { useState, useCallback } from 'react';
import { X, Phone, Search, CheckCircle, XCircle, Calendar, Star } from 'lucide-react';
import { getCurrentTenantId as getTenantId } from '@/lib/tenantStore';
import { toast } from 'sonner';
import type { FullLoyaltyConfig } from '@/hooks/useLoyaltyConfig';
import type { SupabaseClient } from '@supabase/supabase-js';

interface ExistingMember {
  id: string; name: string; isActive: boolean;
  membershipExpiresAt: string | null;
}

type Scene = 'ask' | 'search' | 'register_new' | 'existing' | 'done';

interface Props {
  loyaltyConfig: FullLoyaltyConfig;
  supabase: SupabaseClient;
  onDone: () => Promise<void>;
  onSkip: () => Promise<void>;
}

export default function MembershipRegistrationPopup({ loyaltyConfig, supabase, onDone, onSkip }: Props) {
  const [scene,    setScene]   = useState<Scene>('ask');
  const [phone,    setPhone]   = useState('');
  const [name,     setName]    = useState('');
  const [email,    setEmail]   = useState('');
  const [birthday, setBirthday]= useState('');
  const [found,    setFound]   = useState<ExistingMember | null>(null);
  const [searching,setSearching]= useState(false);
  const [saving,   setSaving]  = useState(false);

  const months = loyaltyConfig.membership.durationMonths || 12;
  const benefitLabel = loyaltyConfig.membership.freeProductLabel || 'Beneficio del día';

  const inp = {
    width:'100%', background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.15)',
    borderRadius:10, padding:'10px 14px', color:'#f1f5f9', fontSize:14, outline:'none',
    boxSizing:'border-box' as const,
  };
  const lbl = { color:'rgba(255,255,255,0.45)', fontSize:11, textTransform:'uppercase' as const,
    letterSpacing:'0.06em', marginBottom:5, display:'block' };
  const btnPrimary = { padding:'11px', borderRadius:10, background:'#f59e0b', border:'none',
    color:'#1B3A6B', fontSize:14, fontWeight:700, cursor:'pointer', width:'100%' };
  const btnSecondary = { padding:'10px', borderRadius:10, background:'rgba(255,255,255,0.06)',
    border:'1px solid rgba(255,255,255,0.1)', color:'rgba(255,255,255,0.5)', fontSize:13,
    fontWeight:600, cursor:'pointer', width:'100%' };

  const searchPhone = useCallback(async (tel: string) => {
    const q = tel.replace(/\D/g,'');
    if (q.length < 10) return;
    setSearching(true);
    const { data } = await supabase
      .from('loyalty_customers')
      .select('id,name,is_active,membership_expires_at')
      .eq('tenant_id', getTenantId())
      .in('membership_type', ['membresia','termo'])
      .ilike('phone', `%${q}%`)
      .limit(1).single();
    setSearching(false);
    if (data) {
      setFound({ id:data.id, name:data.name, isActive:data.is_active,
        membershipExpiresAt:data.membership_expires_at ?? null });
      setScene('existing');
    } else {
      setScene('register_new');
    }
  }, [supabase]);

  const handleRegister = useCallback(async () => {
    if (!name.trim()) { toast.error('El nombre es requerido'); return; }
    setSaving(true);
    const expires = months > 0 ? (() => {
      const d = new Date(); d.setMonth(d.getMonth() + months); return d.toISOString();
    })() : null;

    const { error } = await supabase.from('loyalty_customers').insert({
      tenant_id: getTenantId(), name: name.trim(),
      phone: phone.replace(/\D/g,''), email: email.trim(),
      membership_type: 'membresia', is_active: true,
      membership_expires_at: expires,
      birthday: birthday || null,
      points: 0, total_spent: 0, total_visits: 0,
    });
    setSaving(false);
    if (error) { toast.error('Error al registrar: ' + error.message); return; }
    toast.success(`⭐ ${name.trim()} registrado como socio`);
    setScene('done');
    await onDone();
  }, [name, phone, email, birthday, months, supabase, onDone]);

  const handleRenew = useCallback(async () => {
    if (!found) return;
    setSaving(true);
    const base = found.membershipExpiresAt && new Date(found.membershipExpiresAt) > new Date()
      ? new Date(found.membershipExpiresAt) : new Date();
    base.setMonth(base.getMonth() + months);
    await supabase.from('loyalty_customers').update({
      is_active: true, membership_expires_at: base.toISOString(), updated_at: new Date().toISOString(),
    }).eq('id', found.id);
    setSaving(false);
    toast.success(`Membresía de ${found.name} renovada +${months} meses`);
    setScene('done');
    await onDone();
  }, [found, months, supabase, onDone]);

  const isExpired = found?.membershipExpiresAt && new Date(found.membershipExpiresAt) < new Date();

  return (
    <div style={{ position:'fixed', inset:0, zIndex:9999, background:'rgba(0,0,0,0.75)',
      backdropFilter:'blur(6px)', display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
      <div style={{ background:'#0f1923', border:'1px solid rgba(245,158,11,0.3)', borderRadius:20,
        padding:28, maxWidth:440, width:'100%' }}>

        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:20 }}>
          <div style={{ width:44, height:44, borderRadius:12, background:'rgba(245,158,11,0.15)',
            display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            <Star size={22} color="#f59e0b" />
          </div>
          <div>
            <p style={{ color:'#f1f5f9', fontSize:16, fontWeight:700, margin:0 }}>
              ¡Este producto incluye membresía!
            </p>
            <p style={{ color:'rgba(255,255,255,0.45)', fontSize:12, margin:0 }}>
              {benefitLabel} · {months > 0 ? `${months} meses` : 'Sin vencimiento'}
            </p>
          </div>
        </div>

        {/* ── ESCENA: preguntar ── */}
        {scene === 'ask' && (
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            <p style={{ color:'rgba(255,255,255,0.6)', fontSize:13, marginBottom:4 }}>
              ¿El cliente quiere registrar su membresía?
            </p>
            <button onClick={() => setScene('search')} style={btnPrimary}>
              ⭐ Sí — registrar membresía ahora
            </button>
            <button onClick={onSkip} style={btnSecondary}>
              No quiere membresía — solo la venta
            </button>
          </div>
        )}

        {/* ── ESCENA: buscar por teléfono ── */}
        {scene === 'search' && (
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <div>
              <label style={lbl}><Phone size={11} style={{display:'inline',marginRight:4}} />
                Teléfono del cliente
              </label>
              <div style={{ display:'flex', gap:8 }}>
                <input
                  autoFocus style={inp}
                  placeholder="10 dígitos — busca automáticamente"
                  value={phone} maxLength={10}
                  onChange={e => {
                    const v = e.target.value.replace(/\D/g,'').slice(0,10);
                    setPhone(v);
                    if (v.length === 10) searchPhone(v);
                  }}
                />
                {searching && (
                  <div style={{ display:'flex', alignItems:'center', color:'rgba(255,255,255,0.4)', fontSize:12, whiteSpace:'nowrap' }}>
                    Buscando...
                  </div>
                )}
              </div>
              <p style={{ color:'rgba(255,255,255,0.35)', fontSize:11, marginTop:4 }}>
                Al ingresar 10 dígitos busca automáticamente
              </p>
            </div>
            <button onClick={() => setScene('ask')} style={btnSecondary}>← Atrás</button>
          </div>
        )}

        {/* ── ESCENA: registrar nuevo ── */}
        {scene === 'register_new' && (
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            <div style={{ padding:'8px 12px', background:'rgba(16,185,129,0.1)', borderRadius:8,
              border:'1px solid rgba(16,185,129,0.2)', color:'#6ee7b7', fontSize:12 }}>
              ✓ Número nuevo — completar datos para activar
            </div>
            {[
              { lbl:'Nombre completo *', val:name, set:setName, ph:'Ana García López', type:'text' },
              { lbl:'Teléfono', val:phone, set:setPhone, ph:'—', type:'tel', readOnly:true },
              { lbl:'Email (opcional)', val:email, set:setEmail, ph:'ana@correo.com', type:'email' },
            ].map(f => (
              <div key={f.lbl}>
                <label style={lbl}>{f.lbl}</label>
                <input style={inp} type={f.type} placeholder={f.ph} value={f.val}
                  readOnly={(f as any).readOnly}
                  onChange={e => f.set(e.target.value)} />
              </div>
            ))}
            <div>
              <label style={lbl}><Calendar size={11} style={{display:'inline',marginRight:4}} />
                Fecha de nacimiento (opcional — para beneficio de cumpleaños)
              </label>
              <input type="date" style={inp} value={birthday} onChange={e => setBirthday(e.target.value)} />
            </div>
            <div style={{ display:'flex', gap:10, marginTop:4 }}>
              <button onClick={() => setScene('search')} style={{...btnSecondary, flex:1}}>← Atrás</button>
              <button onClick={handleRegister} disabled={saving || !name.trim()}
                style={{...btnPrimary, flex:2, opacity: saving || !name.trim() ? 0.5 : 1}}>
                {saving ? 'Registrando...' : '⭐ Activar membresía'}
              </button>
            </div>
          </div>
        )}

        {/* ── ESCENA: socio existente ── */}
        {scene === 'existing' && found && (
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            <div style={{ padding:'12px 14px', background:'rgba(96,165,250,0.1)', borderRadius:12,
              border:'1px solid rgba(96,165,250,0.2)', display:'flex', alignItems:'center', gap:10 }}>
              <div style={{ width:36, height:36, borderRadius:'50%', background: found.isActive && !isExpired ? '#16A34A' : '#6B7280',
                display:'flex', alignItems:'center', justifyContent:'center', color:'white', fontWeight:700, fontSize:14, flexShrink:0 }}>
                {found.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <p style={{ color:'#f1f5f9', fontSize:14, fontWeight:600, margin:0 }}>{found.name}</p>
                <p style={{ color: found.isActive && !isExpired ? '#86EFAC' : '#FCA5A5', fontSize:11, margin:0 }}>
                  {found.isActive && !isExpired
                    ? `Membresía activa · vence ${found.membershipExpiresAt ? new Date(found.membershipExpiresAt).toLocaleDateString('es-MX',{day:'2-digit',month:'short',year:'numeric'}) : 'sin fecha'}`
                    : isExpired ? 'Membresía vencida' : 'Membresía inactiva'}
                </p>
              </div>
              {found.isActive && !isExpired
                ? <CheckCircle size={18} color="#4ADE80" style={{ marginLeft:'auto' }} />
                : <XCircle size={18} color="#F87171" style={{ marginLeft:'auto' }} />}
            </div>

            <p style={{ color:'rgba(255,255,255,0.55)', fontSize:13 }}>
              {found.isActive && !isExpired
                ? '¿Qué deseas hacer?'
                : 'La membresía está vencida o inactiva. ¿Renovar?'}
            </p>

            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              <button onClick={handleRenew} disabled={saving}
                style={{...btnPrimary, opacity: saving ? 0.5 : 1}}>
                {saving ? 'Renovando...' : `🔄 Renovar membresía +${months} meses`}
              </button>
              <button onClick={onDone} style={btnSecondary}>
                Solo la venta — no modificar membresía
              </button>
            </div>
          </div>
        )}

        {/* Cerrar */}
        {scene !== 'done' && (
          <button onClick={onSkip}
            style={{ position:'absolute', top:16, right:16, background:'none', border:'none',
              color:'rgba(255,255,255,0.3)', cursor:'pointer', padding:4 }}>
            <X size={18} />
          </button>
        )}
      </div>
    </div>
  );
}
