'use client';
import React, { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { getCurrentTenantId as getTenantId } from '@/lib/tenantStore';
import { ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { toast } from 'sonner';

// ─── Filosofía ────────────────────────────────────────────────────────────────
// Cada pregunta cambia algo en el sistema.
// Si no haríamos nada con la respuesta, no la preguntamos.
// Paso 1: mesas   → crea restaurant_layout y restaurant_tables
// Paso 2: equipo  → saber cuántos usuarios hay para mostrarlo
// Paso 3: plan    → elegir suscripción o continuar trial

const C = { gold: '#d4922a', goldHover: '#e8ac4a', blue: '#1B3A6B', bg: '#0f1923', bg2: '#1a2535', border: 'rgba(255,255,255,0.08)', text: '#f1f5f9', muted: 'rgba(241,245,249,0.45)' };

const PLANS = [
  { key: 'medida',    name: 'A tu medida', price: 399,  color: '#60a5fa', desc: 'Solo lo que necesitas — elige módulos desde $100/mes', tag: 'Nuevo' },
  { key: 'operacion', name: 'Operación',   price: 699,  color: '#4a9eff', desc: 'POS · KDS · Mesero Móvil — todo incluido', tag: '' },
  { key: 'negocio',   name: 'Negocio',     price: 1299, color: '#d4922a', desc: 'Todo + P&L · Inventario · Reportes · Lealtad', tag: 'Más popular' },
  { key: 'empresa',   name: 'Empresa',     price: 2199, color: '#a78bfa', desc: 'Todo + Multi-sucursal · RRHH · Delivery', tag: '' },
];

export default function OnboardingFlow() {
  const { appUser } = useAuth();
  const supabase = createClient();
  const router = useRouter();

  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);

  // Step 1 — Mesas
  const [tableCount, setTableCount] = useState(8);

  // Step 2 — Equipo
  const [teamSize, setTeamSize] = useState<string>('1-5');

  // Step 3 — Plan
  const [chosenPlan, setChosenPlan] = useState<string | null>(null);

  const TEAM_OPTIONS = ['Solo yo', '1-5', '6-15', '16-30', 'Más de 30'];

  async function finish(skipPlan = false) {
    setSaving(true);
    try {
      const tid = appUser?.tenantId ?? getTenantId();

      // ── Mesas ────────────────────────────────────────────────────────────
      await supabase.from('restaurant_tables').delete().eq('tenant_id', tid);
      if (tableCount > 0) {
        await supabase.from('restaurant_tables').insert(
          Array.from({ length: tableCount }, (_, i) => ({
            number: i + 1, name: `Mesa ${i + 1}`,
            capacity: 4, status: 'libre', tenant_id: tid,
          }))
        );
      }

      // Update layout grid
      const cols = Math.min(4, Math.ceil(Math.sqrt(tableCount)));
      const tablesLayout = Array.from({ length: tableCount }, (_, i) => ({
        id: `mesa-${i + 1}`, number: i + 1, name: `Mesa ${i + 1}`,
        x: (i % cols) * 3, y: Math.floor(i / cols) * 3,
        w: 2, h: 2, capacity: 4, elementType: 'mesa',
      }));
      const { data: existingLayout } = await supabase.from('restaurant_layout')
        .select('id').eq('tenant_id', tid).single();
      if (existingLayout?.id) {
        await supabase.from('restaurant_layout').update({ tables_layout: tablesLayout }).eq('id', existingLayout.id);
      } else {
        await supabase.from('restaurant_layout').insert({
          name: 'Planta Principal', width: 12, height: 8,
          tables_layout: tablesLayout, tenant_id: tid, is_active: true,
        });
      }

      // ── Team size config ─────────────────────────────────────────────────
      await supabase.from('system_config').upsert([
        { config_key: 'team_size', config_value: teamSize, tenant_id: tid },
        { config_key: 'initialized', config_value: 'true', tenant_id: tid },
      ], { onConflict: 'tenant_id,config_key' });

      // ── Plan (si eligió uno) ─────────────────────────────────────────────
      if (chosenPlan && !skipPlan) {
        await supabase.from('tenants').update({ plan: chosenPlan }).eq('id', tid);
        toast.success('Plan activado');
      }

      await new Promise(r => setTimeout(r, 400));
      router.push('/dashboard');
    } catch (err: any) {
      toast.error('Error al guardar: ' + err.message);
      setSaving(false);
    }
  }

  // ─── Progress bar ─────────────────────────────────────────────────────────
  function ProgressBar() {
    return (
      <div style={{ display: 'flex', gap: 6, marginBottom: 36 }}>
        {[1, 2, 3].map(n => (
          <div key={n} style={{ flex: 1, height: 3, borderRadius: 2,
            background: n <= step ? C.gold : C.border,
            transition: 'background .3s' }} />
        ))}
      </div>
    );
  }

  const containerStyle: React.CSSProperties = {
    maxWidth: 520, margin: '0 auto', padding: '0 16px 48px',
  };

  // ─── STEP 1: Mesas ────────────────────────────────────────────────────────
  if (step === 1) return (
    <div style={containerStyle}>
      <ProgressBar />
      <div style={{ marginBottom: 32 }}>
        <p style={{ fontSize: 12, fontWeight: 600, color: C.gold, letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 8 }}>
          Paso 1 de 3
        </p>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: C.text, margin: '0 0 10px', lineHeight: 1.2 }}>
          ¿Cuántas mesas tienes?
        </h1>
        <p style={{ fontSize: 14, color: C.muted, lineHeight: 1.65 }}>
          Creamos tu mapa de mesas automáticamente. Puedes reorganizarlo después en Configuración.
        </p>
      </div>

      {/* Counter */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 28, marginBottom: 28 }}>
        <button onClick={() => setTableCount(c => Math.max(0, c - 1))}
          disabled={tableCount === 0}
          style={{ width: 52, height: 52, borderRadius: '50%', border: `1.5px solid ${C.border}`, background: 'rgba(255,255,255,0.04)', color: C.text, fontSize: 26, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: tableCount === 0 ? 0.3 : 1 }}>
          −
        </button>
        <div style={{ textAlign: 'center', minWidth: 80 }}>
          <div style={{ fontSize: 72, fontWeight: 900, color: C.gold, lineHeight: 1 }}>{tableCount}</div>
          <div style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>
            {tableCount === 0 ? 'Solo para llevar' : tableCount === 1 ? 'mesa' : 'mesas'}
          </div>
        </div>
        <button onClick={() => setTableCount(c => Math.min(60, c + 1))}
          style={{ width: 52, height: 52, borderRadius: '50%', border: 'none', background: C.gold, color: '#080b10', fontSize: 26, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
          +
        </button>
      </div>

      {/* Presets */}
      <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 32 }}>
        {[0, 4, 6, 8, 10, 12, 16, 20, 24].map(n => (
          <button key={n} onClick={() => setTableCount(n)}
            style={{ padding: '6px 16px', borderRadius: 20, fontSize: 13, cursor: 'pointer', border: `1px solid ${tableCount === n ? C.gold : C.border}`, background: tableCount === n ? `${C.gold}18` : 'transparent', color: tableCount === n ? C.gold : C.muted, fontWeight: tableCount === n ? 700 : 400 }}>
            {n === 0 ? 'Solo llevar' : n}
          </button>
        ))}
      </div>

      {tableCount === 0 && (
        <div style={{ padding: '12px 16px', borderRadius: 10, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', fontSize: 13, color: '#fcd34d', marginBottom: 24, textAlign: 'center' }}>
          Perfecto — el POS tiene un flujo especial para órdenes para llevar.
        </div>
      )}

      <button onClick={() => setStep(2)}
        style={{ width: '100%', padding: '14px', borderRadius: 12, border: 'none', background: C.gold, color: '#080b10', fontWeight: 700, fontSize: 15, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
        Siguiente <ChevronRight size={17} />
      </button>
    </div>
  );

  // ─── STEP 2: Equipo ───────────────────────────────────────────────────────
  if (step === 2) return (
    <div style={containerStyle}>
      <ProgressBar />
      <div style={{ marginBottom: 32 }}>
        <p style={{ fontSize: 12, fontWeight: 600, color: C.gold, letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 8 }}>
          Paso 2 de 3
        </p>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: C.text, margin: '0 0 10px', lineHeight: 1.2 }}>
          ¿Cuántas personas trabajan contigo?
        </h1>
        <p style={{ fontSize: 14, color: C.muted, lineHeight: 1.65 }}>
          Esto nos ayuda a configurar los accesos correctamente. Puedes agregar a cada uno desde Personal.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 32 }}>
        {TEAM_OPTIONS.map(opt => {
          const active = teamSize === opt;
          return (
            <button key={opt} onClick={() => setTeamSize(opt)}
              style={{ padding: '14px 20px', borderRadius: 12, border: `1.5px solid ${active ? C.gold : C.border}`, background: active ? `${C.gold}12` : 'rgba(255,255,255,0.02)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 14, transition: 'all .15s' }}>
              <div style={{ width: 22, height: 22, borderRadius: '50%', border: `1.5px solid ${active ? C.gold : C.border}`, background: active ? C.gold : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all .15s' }}>
                {active && <Check size={12} color="#080b10" strokeWidth={3} />}
              </div>
              <span style={{ fontSize: 15, fontWeight: active ? 600 : 400, color: active ? C.gold : C.text }}>
                {opt === 'Solo yo' ? 'Solo yo — soy el dueño y operador' : `${opt} personas`}
              </span>
            </button>
          );
        })}
      </div>

      <div style={{ display: 'flex', gap: 10 }}>
        <button onClick={() => setStep(1)}
          style={{ padding: '13px 20px', borderRadius: 12, border: `1px solid ${C.border}`, background: 'transparent', color: C.muted, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
          <ChevronLeft size={15} /> Atrás
        </button>
        <button onClick={() => setStep(3)}
          style={{ flex: 1, padding: '14px', borderRadius: 12, border: 'none', background: C.gold, color: '#080b10', fontWeight: 700, fontSize: 15, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          Siguiente <ChevronRight size={17} />
        </button>
      </div>
    </div>
  );

  // ─── STEP 3: Plan ─────────────────────────────────────────────────────────
  return (
    <div style={containerStyle}>
      <ProgressBar />
      <div style={{ marginBottom: 28 }}>
        <p style={{ fontSize: 12, fontWeight: 600, color: C.gold, letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 8 }}>
          Paso 3 de 3
        </p>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: C.text, margin: '0 0 10px', lineHeight: 1.2 }}>
          ¿Qué plan te conviene?
        </h1>
        <p style={{ fontSize: 14, color: C.muted, lineHeight: 1.65 }}>
          Los 14 días de prueba incluyen todo. Elige tu plan para cuando termine el trial, o décidelo después.
        </p>
      </div>

      {/* Plan cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
        {PLANS.map(p => {
          const active = chosenPlan === p.key;
          return (
            <button key={p.key} onClick={() => setChosenPlan(active ? null : p.key)}
              style={{ padding: '16px 20px', borderRadius: 14, border: `1.5px solid ${active ? p.color : C.border}`, background: active ? `${p.color}10` : 'rgba(255,255,255,0.02)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 16, transition: 'all .15s', position: 'relative' }}>
              {p.tag && (
                <span style={{ position: 'absolute', top: -10, right: 16, fontSize: 10, fontWeight: 700, padding: '2px 10px', borderRadius: 10, background: p.color, color: '#080b10', letterSpacing: '.04em' }}>
                  {p.tag}
                </span>
              )}
              <div style={{ width: 22, height: 22, borderRadius: '50%', border: `1.5px solid ${active ? p.color : C.border}`, background: active ? p.color : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all .15s' }}>
                {active && <Check size={12} color="#080b10" strokeWidth={3} />}
              </div>
              <div style={{ flex: 1, textAlign: 'left' }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 3 }}>
                  <span style={{ fontSize: 15, fontWeight: 700, color: active ? p.color : C.text }}>{p.name}</span>
                  <span style={{ fontSize: 13, color: C.muted }}>${p.price.toLocaleString('es-MX')}/mes</span>
                </div>
                <span style={{ fontSize: 12, color: C.muted }}>{p.desc}</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
        <button onClick={() => setStep(2)}
          style={{ padding: '13px 20px', borderRadius: 12, border: `1px solid ${C.border}`, background: 'transparent', color: C.muted, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
          <ChevronLeft size={15} /> Atrás
        </button>
        <button onClick={() => finish(false)} disabled={saving}
          style={{ flex: 1, padding: '14px', borderRadius: 12, border: 'none', background: saving ? 'rgba(212,146,42,0.35)' : C.gold, color: '#080b10', fontWeight: 700, fontSize: 15, cursor: saving ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          {saving ? 'Configurando…' : chosenPlan ? `Elegir plan ${PLANS.find(p => p.key === chosenPlan)?.name} →` : 'Entrar al sistema →'}
        </button>
      </div>

      {!chosenPlan && (
        <p style={{ textAlign: 'center', marginTop: 14, fontSize: 12, color: 'rgba(241,245,249,0.25)' }}>
          Puedes elegir tu plan en cualquier momento desde Configuración.
        </p>
      )}
    </div>
  );
}
