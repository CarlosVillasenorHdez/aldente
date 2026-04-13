'use client';

import React, { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { CheckCircle, ChevronRight, ChevronLeft, Store, LayoutGrid, Users, Rocket } from 'lucide-react';
import { getCurrentTenantId as getTenantId } from '@/lib/tenantStore';

// ─── Forever Transaction philosophy:
// El objetivo NO es completar todos los pasos — es que el restaurante
// procese su primera orden lo antes posible. Todo lo demás es secundario.
// Pasos: 1) Nombre  2) Mesas  3) Primer empleado → Dashboard
// Menú y recetas se hacen DESPUÉS, cuando el sistema ya está vivo.

interface Step { id: number; title: string; subtitle: string; icon: React.ElementType; }

const STEPS: Step[] = [
  { id: 1, title: 'Tu restaurante', subtitle: 'Nombre y tipo de negocio', icon: Store },
  { id: 2, title: 'Mesas',          subtitle: 'Cuántas mesas tienes',      icon: LayoutGrid },
  { id: 3, title: 'Primer acceso',  subtitle: 'Un empleado para arrancar', icon: Users },
];

const ESTABLISHMENT_TYPES = [
  { key: 'restaurante', label: 'Restaurante',  emoji: '🍽️' },
  { key: 'cafeteria',   label: 'Cafetería',    emoji: '☕' },
  { key: 'bar',         label: 'Bar / Cantina', emoji: '🍺' },
  { key: 'mixto',       label: 'Mixto',         emoji: '🏪' },
];

const EMPLOYEE_ROLES = ['Cajero','Mesero','Cocinero','Gerente','Ayudante de Cocina'];

export default function OnboardingFlow() {
  const { appUser } = useAuth();
  const supabase = createClient();
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);

  // Step 1
  const [restaurantName, setRestaurantName] = useState('');
  const [type, setType] = useState<string>('restaurante');

  // Step 2
  const [tableCount, setTableCount] = useState(6);

  // Step 3
  const [empName, setEmpName] = useState('');
  const [empRole, setEmpRole] = useState('Cajero');
  const [empPin, setEmpPin] = useState('');
  const [pinError, setPinError] = useState('');

  // ── Navigation ──────────────────────────────────────────────────────────────
  const next = async () => {
    if (step === 1) {
      if (!restaurantName.trim()) { toast.error('Ingresa el nombre de tu restaurante'); return; }
    }
    if (step === 3) { await handleFinish(); return; }
    setStep(s => s + 1);
  };
  const back = () => setStep(s => Math.max(1, s - 1));

  // ── Final save ───────────────────────────────────────────────────────────────
  const handleFinish = async () => {
    // PIN validation (only if employee added)
    if (empName.trim()) {
      if (empPin.length < 4 || !/^\d+$/.test(empPin)) {
        setPinError('PIN mínimo 4 dígitos numéricos'); return;
      }
    }
    setPinError('');
    setSaving(true);
    try {
      const tid = appUser?.tenantId ?? getTenantId();

      // 1. Restaurant name + type
      await supabase.from('system_config').upsert([
        { config_key: 'restaurant_name',   config_value: restaurantName.trim(), tenant_id: tid },
        { config_key: 'establishment_type', config_value: type,                  tenant_id: tid },
        { config_key: 'initialized',        config_value: 'true',               tenant_id: tid },
      ], { onConflict: 'tenant_id,config_key' });

      // 2. Tables — delete old, insert new
      await supabase.from('restaurant_tables').delete().eq('tenant_id', tid);
      if (tableCount > 0) {
        await supabase.from('restaurant_tables').insert(
          Array.from({ length: tableCount }, (_, i) => ({
            number: i + 1, name: `Mesa ${i + 1}`,
            capacity: 4, status: 'libre', tenant_id: tid,
          }))
        );
      }

      // 3. First employee (optional but encouraged)
      if (empName.trim() && empPin.trim()) {
        const { data: existing } = await supabase.from('employees')
          .select('id').eq('tenant_id', tid).eq('name', empName.trim()).single();
        if (!existing) {
          const { data: emp } = await supabase.from('employees')
            .insert({ name: empName.trim(), role: empRole.toLowerCase(), status: 'activo', tenant_id: tid })
            .select().single();
          if (emp) {
            const hashed = await sha256(empPin);
            await supabase.from('app_users').insert({
              full_name: empName.trim(), app_role: empRole.toLowerCase(),
              pin: hashed, is_active: true, employee_id: emp.id, tenant_id: tid,
            });
          }
        }
      }

      toast.success('¡Sistema listo!');
      router.push('/dashboard');
    } catch (err: any) {
      toast.error('Error: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  async function sha256(text: string) {
    const buf = await crypto.subtle.digest('SHA-256',
      new TextEncoder().encode(text + 'aldente_salt_2024'));
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,'0')).join('');
  }

  const progress = ((step - 1) / (STEPS.length - 1)) * 100;
  const C = { blue: '#1B3A6B', gold: '#f59e0b', green: '#10b981' };

  return (
    <div style={{ maxWidth: 560, margin: '0 auto', padding: '0 16px' }}>

      {/* Progress strip */}
      <div style={{ marginBottom: 36 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            const done = step > s.id;
            const active = step === s.id;
            return (
              <React.Fragment key={s.id}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: '50%', display: 'flex',
                    alignItems: 'center', justifyContent: 'center', transition: 'all .3s',
                    background: done ? C.green : active ? C.blue : '#e5e7eb',
                    color: done || active ? 'white' : '#9ca3af',
                  }}>
                    {done ? <CheckCircle size={20} /> : <Icon size={20} />}
                  </div>
                  <span style={{ fontSize: 11, color: active ? C.blue : '#9ca3af', fontWeight: active ? 600 : 400 }}>
                    {s.title}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div style={{ flex: 1, height: 2, margin: '0 8px', marginBottom: 20,
                    background: step > s.id ? C.green : '#e5e7eb', transition: 'background .4s' }} />
                )}
              </React.Fragment>
            );
          })}
        </div>
        <div style={{ fontSize: 12, color: '#9ca3af', textAlign: 'center' }}>
          Paso {step} de {STEPS.length} · ~{[2, 1, 1][step-1]} min
        </div>
      </div>

      {/* Card */}
      <div style={{ background: 'white', borderRadius: 20, padding: '32px 28px',
        border: '1px solid #e5e7eb', boxShadow: '0 4px 24px rgba(0,0,0,.06)', marginBottom: 20 }}>

        {/* ── STEP 1: Restaurante ── */}
        {step === 1 && (
          <div>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#1f2937', marginBottom: 6 }}>
              ¿Cómo se llama tu restaurante?
            </div>
            <p style={{ color: '#6b7280', fontSize: 14, marginBottom: 28, lineHeight: 1.6 }}>
              Con esto ya puedes empezar a tomar órdenes. El menú, recetas e inventario lo subes después.
            </p>

            <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>
              Nombre del restaurante
            </label>
            <input
              autoFocus
              value={restaurantName}
              onChange={e => setRestaurantName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && next()}
              placeholder="ej. Barista Coffee Club"
              style={{ width: '100%', padding: '12px 16px', borderRadius: 12, fontSize: 15,
                border: '2px solid #e5e7eb', outline: 'none', marginBottom: 24, boxSizing: 'border-box',
                fontWeight: 600, color: '#1f2937', transition: 'border-color .2s' }}
              onFocus={e => e.target.style.borderColor = C.blue}
              onBlur={e => e.target.style.borderColor = '#e5e7eb'}
            />

            <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 10 }}>
              Tipo de negocio
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {ESTABLISHMENT_TYPES.map(t => (
                <button key={t.key} onClick={() => setType(t.key)}
                  style={{ padding: '12px 16px', borderRadius: 12, border: `2px solid ${type === t.key ? C.blue : '#e5e7eb'}`,
                    background: type === t.key ? '#eff6ff' : 'white', cursor: 'pointer', transition: 'all .2s',
                    display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 22 }}>{t.emoji}</span>
                  <span style={{ fontSize: 13, fontWeight: type === t.key ? 700 : 400, color: type === t.key ? C.blue : '#6b7280' }}>
                    {t.label}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── STEP 2: Mesas ── */}
        {step === 2 && (
          <div>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#1f2937', marginBottom: 6 }}>
              ¿Cuántas mesas tienes?
            </div>
            <p style={{ color: '#6b7280', fontSize: 14, marginBottom: 32, lineHeight: 1.6 }}>
              Las mesas se crean automáticamente en el mapa del POS. Puedes agregar más o reorganizarlas después.
            </p>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 24, marginBottom: 28 }}>
              <button onClick={() => setTableCount(Math.max(1, tableCount - 1))}
                style={{ width: 48, height: 48, borderRadius: '50%', border: `2px solid ${C.blue}`,
                  background: 'white', fontSize: 24, cursor: 'pointer', color: C.blue, fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 64, fontWeight: 900, color: C.blue, lineHeight: 1 }}>{tableCount}</div>
                <div style={{ fontSize: 13, color: '#9ca3af', marginTop: 4 }}>mesas</div>
              </div>
              <button onClick={() => setTableCount(Math.min(50, tableCount + 1))}
                style={{ width: 48, height: 48, borderRadius: '50%', border: `2px solid ${C.blue}`,
                  background: C.blue, fontSize: 24, cursor: 'pointer', color: 'white', fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
            </div>

            {/* Quick presets */}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
              {[4, 6, 8, 10, 12, 16, 20].map(n => (
                <button key={n} onClick={() => setTableCount(n)}
                  style={{ padding: '6px 16px', borderRadius: 20, fontSize: 13, border: `1px solid ${tableCount === n ? C.blue : '#e5e7eb'}`,
                    background: tableCount === n ? '#eff6ff' : 'white', color: tableCount === n ? C.blue : '#6b7280',
                    cursor: 'pointer', fontWeight: tableCount === n ? 700 : 400 }}>
                  {n}
                </button>
              ))}
            </div>

            <div style={{ marginTop: 24, padding: '12px 16px', borderRadius: 10, background: '#f8fafc',
              border: '1px solid #e5e7eb', fontSize: 12, color: '#6b7280' }}>
              💡 Si manejas Para Llevar, no necesitas mesas físicas — el POS tiene un flujo especial para eso.
            </div>
          </div>
        )}

        {/* ── STEP 3: Primer empleado ── */}
        {step === 3 && (
          <div>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#1f2937', marginBottom: 6 }}>
              Registra a alguien de tu equipo
            </div>
            <p style={{ color: '#6b7280', fontSize: 14, marginBottom: 24, lineHeight: 1.6 }}>
              Opcional pero recomendado. Este usuario podrá entrar al sistema con su PIN.
              Puedes agregar más empleados después desde Configuración.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>
                  Nombre completo
                </label>
                <input value={empName} onChange={e => setEmpName(e.target.value)}
                  placeholder="ej. María González"
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 10, fontSize: 14,
                    border: '1.5px solid #e5e7eb', outline: 'none', boxSizing: 'border-box', color: '#1f2937' }}
                  onFocus={e => e.target.style.borderColor = C.blue}
                  onBlur={e => e.target.style.borderColor = '#e5e7eb'} />
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>
                  Rol
                </label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {EMPLOYEE_ROLES.map(r => (
                    <button key={r} onClick={() => setEmpRole(r)}
                      style={{ padding: '6px 14px', borderRadius: 20, fontSize: 12, cursor: 'pointer',
                        border: `1.5px solid ${empRole === r ? C.blue : '#e5e7eb'}`,
                        background: empRole === r ? '#eff6ff' : 'white',
                        color: empRole === r ? C.blue : '#6b7280',
                        fontWeight: empRole === r ? 700 : 400 }}>
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>
                  PIN de acceso (mínimo 4 dígitos)
                </label>
                <input value={empPin} onChange={e => { setEmpPin(e.target.value.replace(/\D/g,'')); setPinError(''); }}
                  placeholder="0000" maxLength={8} type="password" inputMode="numeric"
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 10, fontSize: 18,
                    border: `1.5px solid ${pinError ? '#ef4444' : '#e5e7eb'}`, outline: 'none',
                    boxSizing: 'border-box', letterSpacing: 8, color: '#1f2937', fontFamily: 'monospace' }}
                  onFocus={e => e.target.style.borderColor = pinError ? '#ef4444' : C.blue}
                  onBlur={e => e.target.style.borderColor = pinError ? '#ef4444' : '#e5e7eb'} />
                {pinError && <p style={{ fontSize: 11, color: '#ef4444', marginTop: 4 }}>{pinError}</p>}
              </div>
            </div>

            {/* Skip option */}
            <div style={{ marginTop: 16, padding: '10px 14px', borderRadius: 10, background: '#fafafa',
              border: '1px solid #e5e7eb', fontSize: 12, color: '#9ca3af' }}>
              Si dejas el nombre vacío, se omite este paso. Puedes agregar empleados desde{' '}
              <strong style={{ color: '#6b7280' }}>Configuración → Usuarios & Roles</strong>.
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        {step > 1 && (
          <button onClick={back} disabled={saving}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '12px 20px', borderRadius: 12,
              border: '1.5px solid #e5e7eb', background: 'white', color: '#6b7280', fontSize: 14,
              fontWeight: 600, cursor: 'pointer' }}>
            <ChevronLeft size={16} /> Atrás
          </button>
        )}
        <button onClick={next} disabled={saving}
          style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            padding: '13px 28px', borderRadius: 12, border: 'none', fontSize: 15, fontWeight: 700,
            cursor: saving ? 'not-allowed' : 'pointer', transition: 'all .2s',
            background: saving ? '#9ca3af' : step === STEPS.length ? C.green : C.blue, color: 'white' }}>
          {saving ? 'Guardando…' :
           step === STEPS.length ? '🚀 Ir al dashboard' :
           <><span>Siguiente</span><ChevronRight size={16} /></>}
        </button>
      </div>

      {/* Forever transaction note */}
      {step === STEPS.length && (
        <p style={{ textAlign: 'center', fontSize: 11, color: '#9ca3af', marginTop: 16, lineHeight: 1.5 }}>
          El menú y las recetas las subes después, a tu ritmo.<br />
          Lo importante es que hoy proceses tu primera orden.
        </p>
      )}
    </div>
  );
}
