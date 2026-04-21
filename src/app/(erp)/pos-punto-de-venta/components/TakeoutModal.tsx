'use client';

/**
 * TakeoutModal — Modal "Nueva orden para llevar"
 *
 * Si el módulo de lealtad está activo, el cajero puede verificar
 * si el cliente tiene membresía buscando por teléfono.
 *
 * Flujo:
 *   1. Cajero pregunta "¿Ya cuentas con membresía?"
 *   2. Si sí → teclea teléfono → sistema muestra socio + beneficios activos
 *   3. Si no → solo pone el nombre → crea la orden normal
 *
 * El nombre del comensal se auto-rellena con el nombre del socio encontrado.
 */
import { useState, useCallback, useRef, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { getCurrentTenantId as getTenantId } from '@/lib/tenantStore';
import { Search, CheckCircle, XCircle, Clock, Phone, X } from 'lucide-react';

interface FoundMember {
  id:                  string;
  name:                string;
  isActive:            boolean;
  membershipExpiresAt: string | null;
  dailyBenefitUsedAt:  string | null;
  birthday:            string | null;
  tierName:            string | null;
  tierColor:           string | null;
}

function isBenefitAvailableToday(usedAt: string | null): boolean {
  if (!usedAt) return true;
  const toMexDate = (d: Date) => new Date(d.getTime() - 6 * 3600000).toISOString().slice(0, 10);
  return toMexDate(new Date(usedAt)) < toMexDate(new Date());
}

function isBirthdayToday(birthday: string | null): boolean {
  if (!birthday) return false;
  const b = new Date(birthday);
  const t = new Date();
  return b.getMonth() === t.getMonth() && b.getDate() === t.getDate();
}

function isExpired(expiresAt: string | null): boolean {
  return !!expiresAt && new Date(expiresAt) < new Date();
}

interface Props {
  loyaltyEnabled:   boolean;
  benefitLabel:     string;
  benefitProductId: string;        // UUID del producto gratis configurado
  onConfirm:        (name: string, memberId?: string, benefitProductId?: string) => void;
  onCancel:         () => void;
}

export default function TakeoutModal({ loyaltyEnabled, benefitLabel, benefitProductId, onConfirm, onCancel }: Props) {
  const supabase = createClient();
  const nameRef  = useRef<HTMLInputElement>(null);

  const [name,        setName]       = useState('');
  const [phone,       setPhone]      = useState('');
  const [searching,   setSearching]  = useState(false);
  const [member,      setMember]     = useState<FoundMember | null>(null);
  const [notFound,    setNotFound]   = useState(false);
  const [showLoyalty, setShowLoyalty]= useState(false);

  // Focus al nombre al abrir
  useEffect(() => { nameRef.current?.focus(); }, []);

  // Auto-rellena el nombre con el del socio encontrado
  useEffect(() => {
    if (member && !name.trim()) setName(member.name);
  }, [member, name]);

  const searchMember = useCallback(async (tel: string) => {
    const q = tel.replace(/\D/g, '');
    if (q.length < 10) return;
    setSearching(true);
    setMember(null);
    setNotFound(false);

    const { data } = await supabase
      .from('loyalty_customers')
      .select('id,name,is_active,membership_expires_at,daily_benefit_used_at,birthday,tier_id')
      .eq('tenant_id', getTenantId())
      .in('membership_type', ['membresia', 'termo'])
      .ilike('phone', `%${q}%`)
      .limit(1)
      .single();

    setSearching(false);

    if (!data) { setNotFound(true); return; }

    setMember({
      id:                  data.id,
      name:                data.name,
      isActive:            data.is_active,
      membershipExpiresAt: data.membership_expires_at ?? null,
      dailyBenefitUsedAt:  data.daily_benefit_used_at ?? null,
      birthday:            (data as any).birthday ?? null,
      tierName:            null,
      tierColor:           null,
    });
  }, [supabase]);

  const handlePhoneChange = (v: string) => {
    const clean = v.replace(/\D/g,'').slice(0, 10);
    setPhone(clean);
    setMember(null);
    setNotFound(false);
    if (clean.length === 10) searchMember(clean);
  };

  const handleConfirm = () => {
    const finalName = name.trim() || (member?.name ?? '');
    // Pasar benefitProductId solo si el socio está activo y el beneficio está disponible hoy
    const shouldAddBenefit = member && active && benefitAvail && benefitProductId;
    onConfirm(finalName, member?.id, shouldAddBenefit ? benefitProductId : undefined);
  };

  const active      = member?.isActive && !isExpired(member.membershipExpiresAt);
  const benefitAvail= member ? isBenefitAvailableToday(member.dailyBenefitUsedAt) : false;
  const isBday      = member ? isBirthdayToday(member.birthday) : false;

  const sty = {
    overlay:   { position:'fixed' as const, inset:0, zIndex:9999, background:'rgba(0,0,0,0.75)', backdropFilter:'blur(8px)', display:'flex', alignItems:'center', justifyContent:'center', padding:'16px' },
    card:      { background:'#0f1923', border:'1px solid rgba(96,165,250,0.25)', borderRadius:'20px', padding:'28px', maxWidth:'440px', width:'100%' },
    inp:       { width:'100%', background:'rgba(255,255,255,0.07)', border:'1px solid rgba(96,165,250,0.3)', borderRadius:'10px', padding:'12px 16px', color:'#f1f5f9', fontSize:'15px', outline:'none', boxSizing:'border-box' as const },
    inpSm:     { background:'rgba(255,255,255,0.07)', border:'1px solid rgba(96,165,250,0.2)', borderRadius:'8px', padding:'8px 12px', color:'#f1f5f9', fontSize:'14px', outline:'none', flex:1 } as React.CSSProperties,
    label:     { color:'rgba(255,255,255,0.45)', fontSize:'12px', marginBottom:'6px', display:'block', textTransform:'uppercase' as const, letterSpacing:'0.06em' },
    btnCancel: { flex:1, padding:'11px', borderRadius:'10px', background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', color:'rgba(255,255,255,0.5)', fontSize:'14px', fontWeight:600, cursor:'pointer' },
    btnMain:   { flex:2, padding:'11px', borderRadius:'10px', background:'#1e3a5f', border:'1px solid rgba(96,165,250,0.4)', color:'#60a5fa', fontSize:'14px', fontWeight:700, cursor:'pointer' },
  };

  return (
    <div style={sty.overlay} onClick={e => { if (e.target === e.currentTarget) onCancel(); }}>
      <div style={sty.card}>

        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'20px' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
            <span style={{ fontSize:'28px' }}>🥡</span>
            <div>
              <h3 style={{ color:'#f1f5f9', fontSize:'17px', fontWeight:700, margin:0 }}>Nueva orden para llevar</h3>
              <p style={{ color:'rgba(255,255,255,0.4)', fontSize:'12px', margin:0 }}>Nombre del cliente (opcional)</p>
            </div>
          </div>
          <button onClick={onCancel} style={{ background:'none', border:'none', color:'rgba(255,255,255,0.3)', cursor:'pointer', padding:'4px' }}>
            <X size={18} />
          </button>
        </div>

        {/* Nombre */}
        <div style={{ marginBottom:'16px' }}>
          <label style={sty.label}>Nombre del cliente</label>
          <input
            ref={nameRef}
            style={sty.inp}
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !showLoyalty) handleConfirm(); if (e.key === 'Escape') onCancel(); }}
            placeholder="¿A nombre de quién? (opcional)"
          />
        </div>

        {/* Sección de membresía — solo si lealtad está activa */}
        {loyaltyEnabled && (
          <div style={{ marginBottom:'16px' }}>
            {!showLoyalty ? (
              <button
                onClick={() => setShowLoyalty(true)}
                style={{ width:'100%', padding:'10px', borderRadius:'10px', background:'rgba(245,158,11,0.08)', border:'1px solid rgba(245,158,11,0.2)', color:'#F59E0B', fontSize:'13px', fontWeight:600, cursor:'pointer', textAlign:'left' }}
              >
                ⭐ ¿El cliente tiene membresía? Verificar
              </button>
            ) : (
              <div style={{ background:'rgba(245,158,11,0.06)', border:'1px solid rgba(245,158,11,0.15)', borderRadius:'12px', padding:'14px' }}>
                <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'10px' }}>
                  <Phone size={14} color="#F59E0B" />
                  <span style={{ color:'rgba(255,255,255,0.6)', fontSize:'12px', textTransform:'uppercase', letterSpacing:'0.06em' }}>Teléfono del socio</span>
                  <button onClick={() => { setShowLoyalty(false); setPhone(''); setMember(null); setNotFound(false); }} style={{ marginLeft:'auto', background:'none', border:'none', color:'rgba(255,255,255,0.3)', cursor:'pointer' }}>
                    <X size={14} />
                  </button>
                </div>
                <div style={{ display:'flex', gap:'8px', marginBottom:'10px' }}>
                  <input
                    autoFocus
                    style={sty.inpSm}
                    value={phone}
                    maxLength={10}
                    placeholder="10 dígitos — busca automáticamente"
                    onChange={e => handlePhoneChange(e.target.value)}
                  />
                  {searching && <span style={{ color:'rgba(255,255,255,0.4)', fontSize:'12px', alignSelf:'center' }}>Buscando...</span>}
                </div>

                {/* No encontrado */}
                {notFound && (
                  <div style={{ display:'flex', alignItems:'center', gap:'8px', padding:'8px 10px', background:'rgba(239,68,68,0.1)', borderRadius:'8px' }}>
                    <XCircle size={14} color="#F87171" />
                    <span style={{ color:'#F87171', fontSize:'12px' }}>Número no registrado como socio</span>
                  </div>
                )}

                {/* Socio encontrado */}
                {member && (
                  <div style={{ background:'rgba(0,0,0,0.2)', borderRadius:'10px', padding:'12px' }}>
                    {/* Nombre y estado */}
                    <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'8px' }}>
                      <div style={{ width:'34px', height:'34px', borderRadius:'50%', background: active ? '#16A34A' : '#6B7280', display:'flex', alignItems:'center', justifyContent:'center', color:'white', fontWeight:700, fontSize:'14px', flexShrink:0 }}>
                        {member.name.charAt(0).toUpperCase()}
                      </div>
                      <div style={{ flex:1 }}>
                        <p style={{ color:'#f1f5f9', fontSize:'14px', fontWeight:600, margin:0 }}>{member.name}</p>
                        <p style={{ color: active ? '#86EFAC' : '#FCA5A5', fontSize:'11px', margin:0 }}>
                          {active ? 'Membresía activa' : isExpired(member.membershipExpiresAt) ? 'Membresía vencida' : 'Inactivo'}
                          {member.membershipExpiresAt && (() => {
                            const exp = new Date(member.membershipExpiresAt);
                            const days = Math.ceil((exp.getTime() - Date.now()) / 86400000);
                            const dateStr = exp.toLocaleDateString('es-MX',{day:'2-digit',month:'short',year:'numeric'});
                            if (days <= 0) return ` · Vencida`;
                            if (days <= 30) return ` · ⚠️ Vence en ${days} días (${dateStr})`;
                            return ` · vence ${dateStr}`;
                          })()}
                        </p>
                      </div>
                      {active && <CheckCircle size={16} color="#4ADE80" />}
                    </div>

                    {/* Beneficios del día */}
                    {active && (
                      <div style={{ display:'flex', flexDirection:'column', gap:'4px' }}>
                        {benefitAvail && benefitLabel && (
                          <div style={{ display:'flex', alignItems:'center', gap:'6px', padding:'5px 8px', background:'rgba(245,158,11,0.15)', borderRadius:'6px' }}>
                            <span style={{ fontSize:'13px' }}>☕</span>
                            <span style={{ color:'#FCD34D', fontSize:'12px', fontWeight:600 }}>{benefitLabel} — DISPONIBLE HOY</span>
                          </div>
                        )}
                        {!benefitAvail && benefitLabel && (
                          <div style={{ display:'flex', alignItems:'center', gap:'6px', padding:'5px 8px', background:'rgba(255,255,255,0.05)', borderRadius:'6px' }}>
                            <Clock size={12} color="rgba(255,255,255,0.3)" />
                            <span style={{ color:'rgba(255,255,255,0.35)', fontSize:'12px' }}>{benefitLabel} — Ya usado hoy</span>
                          </div>
                        )}
                        {isBday && (
                          <div style={{ display:'flex', alignItems:'center', gap:'6px', padding:'5px 8px', background:'rgba(236,72,153,0.15)', borderRadius:'6px' }}>
                            <span style={{ fontSize:'13px' }}>🎂</span>
                            <span style={{ color:'#F9A8D4', fontSize:'12px', fontWeight:600 }}>HOY ES SU CUMPLEAÑOS</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Botones */}
        <div style={{ display:'flex', gap:'10px' }}>
          <button onClick={onCancel} style={sty.btnCancel}>Cancelar</button>
          <button onClick={handleConfirm} style={sty.btnMain}>
            🥡 Crear orden {name.trim() ? `— ${name.trim()}` : ''}
          </button>
        </div>

      </div>
    </div>
  );
}
