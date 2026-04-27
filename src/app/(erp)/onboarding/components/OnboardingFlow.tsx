'use client';
/**
 * OnboardingFlow — Wizard de 6 pasos para configurar el restaurante
 *
 * Pasos:
 * 1. Nombre y tipo del restaurante
 * 2. Mesas y layout
 * 3. Primer platillo del menú
 * 4. Primer empleado
 * 5. Modelo de nómina
 * 6. Plan y lanzamiento
 *
 * Cada paso guarda algo real en la DB.
 * Al terminar: redirige al POS listo para operar.
 */

import React, { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { getCurrentTenantId as getTenantId } from '@/lib/tenantStore';
import { toast } from 'sonner';
import { Check, ChevronRight, ChevronLeft, Rocket, Store, Grid3X3, UtensilsCrossed, Users, DollarSign } from 'lucide-react';

const C = {
  gold: '#f59e0b', blue: '#1B3A6B',
  bg: '#ffffff', bg2: '#f8fafc', border: '#e5e7eb',
  text: '#111827', muted: '#6b7280',
};

const TOTAL_STEPS = 6;

const STEP_INFO = [
  { icon: Store,           label: 'Tu restaurante' },
  { icon: Grid3X3,         label: 'Mesas' },
  { icon: UtensilsCrossed, label: 'Menú' },
  { icon: Users,           label: 'Equipo' },
  { icon: DollarSign,      label: 'Nómina' },
  { icon: Rocket,          label: 'Lanzar' },
];

const inp = "w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-amber-400 bg-white";
const sel = "w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-amber-400 bg-white";

export default function OnboardingFlow() {
  const { appUser } = useAuth();
  const supabase = createClient();
  const router = useRouter();

  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);

  // Paso 1 — Restaurante
  const [restaurantName, setRestaurantName] = useState('');
  const [tipoRestaurante, setTipoRestaurante] = useState('casual');
  const [ciudad, setCiudad] = useState('');

  // Paso 2 — Mesas
  const [tableCount, setTableCount] = useState(8);
  const [capacidadPorMesa, setCapacidadPorMesa] = useState(4);
  const [tieneParaLlevar, setTieneParaLlevar] = useState(true);

  // Paso 3 — Menú (platillo inicial)
  const [dishName, setDishName] = useState('');
  const [dishPrice, setDishPrice] = useState('');
  const [dishCategory, setDishCategory] = useState('Platos fuertes');
  const [dishEmoji, setDishEmoji] = useState('🍽️');

  // Paso 4 — Equipo
  const [numEmpleados, setNumEmpleados] = useState(3);
  const [tieneChef, setTieneChef] = useState(true);
  const [tieneMeseros, setTieneMeseros] = useState(true);

  // Paso 5 — Nómina
  const [modeloNomina, setModeloNomina] = useState<'formal' | 'minimo' | 'outsourcing' | 'mixto'>('formal');
  const [salarioPromedio, setSalarioPromedio] = useState('');

  // ── Guardados ─────────────────────────────────────────────────────────────

  async function saveStep1() {
    const tid = getTenantId();
    await supabase.from('system_config').upsert([
      { tenant_id: tid, config_key: 'restaurant_name', config_value: restaurantName },
      { tenant_id: tid, config_key: 'restaurant_type', config_value: tipoRestaurante },
      { tenant_id: tid, config_key: 'city',            config_value: ciudad },
    ], { onConflict: 'tenant_id,config_key' });
  }

  async function saveStep2() {
    const tid = getTenantId();
    // Crear mesas
    const tables = Array.from({ length: tableCount }, (_, i) => ({
      tenant_id: tid, number: i + 1,
      name: `Mesa ${i + 1}`,
      capacity: capacidadPorMesa,
      status: 'libre',
    }));
    if (tables.length > 0) {
      await supabase.from('restaurant_tables').upsert(tables, { onConflict: 'tenant_id,number' });
    }
    if (tieneParaLlevar) {
      // Mesa 0 = para llevar
      await supabase.from('restaurant_tables').upsert({
        tenant_id: tid, number: 0,
        name: 'Para llevar', capacity: 0, status: 'libre',
      }, { onConflict: 'tenant_id,number' });
    }
    await supabase.from('system_config').upsert(
      [{ tenant_id: tid, config_key: 'table_count', config_value: String(tableCount) }],
      { onConflict: 'tenant_id,config_key' }
    );
  }

  async function saveStep3() {
    if (!dishName.trim() || !dishPrice) return;
    const tid = getTenantId();
    // Crear categoría si no existe
    const { data: cats } = await supabase.from('dish_categories')
      .select('id').eq('tenant_id', tid).eq('name', dishCategory).limit(1);
    let catId = cats?.[0]?.id;
    if (!catId) {
      const { data: newCat } = await supabase.from('dish_categories')
        .insert({ tenant_id: tid, name: dishCategory, emoji: '🍽️', order_index: 1 })
        .select('id').single();
      catId = newCat?.id;
    }
    await supabase.from('dishes').insert({
      tenant_id: tid, name: dishName.trim(),
      price: Number(dishPrice), category: dishCategory,
      emoji: dishEmoji, available: true,
    });
  }

  async function saveStep5() {
    const tid = getTenantId();
    await supabase.from('system_config').upsert([
      { tenant_id: tid, config_key: 'nomina_modelo',              config_value: modeloNomina },
      { tenant_id: tid, config_key: 'nomina_incluye_imss',         config_value: modeloNomina === 'formal' ? 'true' : 'false' },
      { tenant_id: tid, config_key: 'nomina_incluye_infonavit',    config_value: modeloNomina === 'formal' ? 'true' : 'false' },
      { tenant_id: tid, config_key: 'nomina_incluye_prestaciones', config_value: modeloNomina !== 'outsourcing' ? 'true' : 'false' },
    ], { onConflict: 'tenant_id,config_key' });
  }

  async function saveStep6() {
    const tid = getTenantId();
    await supabase.from('system_config').upsert(
      [{ tenant_id: tid, config_key: 'onboarding_completed', config_value: 'true' }],
      { onConflict: 'tenant_id,config_key' }
    );
  }

  // ── Navegación ────────────────────────────────────────────────────────────

  async function handleNext() {
    setSaving(true);
    try {
      if (step === 1) await saveStep1();
      if (step === 2) await saveStep2();
      if (step === 3) await saveStep3();
      if (step === 5) await saveStep5();
      if (step === 6) {
        await saveStep6();
        toast.success('🎉 ¡Tu restaurante está listo!');
        router.push('/pos-punto-de-venta');
        return;
      }
      setStep(s => s + 1);
    } catch (e) {
      toast.error('Error al guardar, intenta de nuevo');
    } finally {
      setSaving(false);
    }
  }

  // ── UI helpers ────────────────────────────────────────────────────────────

  const btn = (label: string, disabled = false) => (
    <button onClick={handleNext} disabled={disabled || saving}
      style={{ background: disabled ? '#e5e7eb' : C.blue, color: disabled ? '#9ca3af' : '#f59e0b', border: 'none', borderRadius: 12, padding: '14px 28px', fontSize: 15, fontWeight: 700, cursor: disabled ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
      {saving ? 'Guardando...' : label}
      {!saving && <ChevronRight size={18} />}
    </button>
  );

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div style={{ maxWidth: 560, margin: '0 auto', padding: '0 20px' }}>

      {/* Progress */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 40 }}>
        {STEP_INFO.map((s, i) => {
          const n = i + 1;
          const done = n < step;
          const active = n === step;
          const Icon = s.icon;
          return (
            <React.Fragment key={n}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: done ? '#22c55e' : active ? C.blue : '#f3f4f6',
                  border: `2px solid ${done ? '#22c55e' : active ? C.blue : '#e5e7eb'}`,
                  transition: 'all .3s',
                }}>
                  {done ? <Check size={16} color="white" /> : <Icon size={15} color={active ? C.gold : '#9ca3af'} />}
                </div>
                <span style={{ fontSize: 10, color: active ? C.blue : '#9ca3af', fontWeight: active ? 700 : 400, whiteSpace: 'nowrap' }}>
                  {s.label}
                </span>
              </div>
              {i < STEP_INFO.length - 1 && (
                <div style={{ flex: 1, height: 2, background: i < step - 1 ? '#22c55e' : '#e5e7eb', margin: '0 4px', marginBottom: 20, transition: 'background .3s' }} />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* ── PASO 1: Restaurante ── */}
      {step === 1 && (
        <div>
          <h2 style={{ fontSize: 24, fontWeight: 800, color: C.text, marginBottom: 6 }}>Cuéntanos sobre tu restaurante</h2>
          <p style={{ fontSize: 14, color: C.muted, marginBottom: 28 }}>Esta información aparece en tus reportes y recibos.</p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 6 }}>Nombre del restaurante *</label>
              <input className={inp} placeholder="Barista Coffee Club" value={restaurantName}
                onChange={e => setRestaurantName(e.target.value)} autoFocus />
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 6 }}>Tipo de negocio</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {[
                  ['casual', '🍽️', 'Restaurante casual'],
                  ['rapida', '⚡', 'Comida rápida'],
                  ['cafe', '☕', 'Café / Cafetería'],
                  ['bar', '🍺', 'Bar / Cantina'],
                  ['fine', '🥂', 'Alta cocina'],
                  ['otro', '🏪', 'Otro'],
                ].map(([val, emoji, label]) => (
                  <label key={val} style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 10, cursor: 'pointer',
                    border: `2px solid ${tipoRestaurante === val ? C.blue : '#e5e7eb'}`,
                    background: tipoRestaurante === val ? '#eff6ff' : 'white',
                  }}>
                    <input type="radio" value={val} checked={tipoRestaurante === val}
                      onChange={() => setTipoRestaurante(val)} style={{ display: 'none' }} />
                    <span style={{ fontSize: 20 }}>{emoji}</span>
                    <span style={{ fontSize: 13, fontWeight: 500, color: tipoRestaurante === val ? C.blue : C.text }}>{label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 6 }}>Ciudad</label>
              <input className={inp} placeholder="Ciudad de México" value={ciudad}
                onChange={e => setCiudad(e.target.value)} />
            </div>
          </div>

          <div style={{ marginTop: 32, display: 'flex', justifyContent: 'flex-end' }}>
            {btn('Siguiente', !restaurantName.trim())}
          </div>
        </div>
      )}

      {/* ── PASO 2: Mesas ── */}
      {step === 2 && (
        <div>
          <h2 style={{ fontSize: 24, fontWeight: 800, color: C.text, marginBottom: 6 }}>¿Cómo está tu local?</h2>
          <p style={{ fontSize: 14, color: C.muted, marginBottom: 28 }}>Creamos tu mapa de mesas automáticamente. Lo puedes editar después.</p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: C.text, display: 'block', marginBottom: 12 }}>
                ¿Cuántas mesas tienes? <span style={{ color: C.gold, fontSize: 22, fontWeight: 800 }}>{tableCount === 0 ? 'Ninguna' : tableCount}</span>
              </label>
              <input type="range" min={0} max={40} value={tableCount} onChange={e => setTableCount(Number(e.target.value))}
                style={{ width: '100%', accentColor: C.blue }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: C.muted, marginTop: 4 }}>
                <span>Solo para llevar</span><span>40 mesas</span>
              </div>
            </div>

            {tableCount > 0 && (
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: C.text, display: 'block', marginBottom: 12 }}>
                  Capacidad promedio por mesa: <span style={{ color: C.gold, fontSize: 22, fontWeight: 800 }}>{capacidadPorMesa} personas</span>
                </label>
                <input type="range" min={2} max={12} value={capacidadPorMesa} onChange={e => setCapacidadPorMesa(Number(e.target.value))}
                  style={{ width: '100%', accentColor: C.blue }} />
              </div>
            )}

            <label style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderRadius: 12, cursor: 'pointer', border: `2px solid ${tieneParaLlevar ? '#22c55e' : '#e5e7eb'}`, background: tieneParaLlevar ? '#f0fdf4' : 'white' }}>
              <input type="checkbox" checked={tieneParaLlevar} onChange={e => setTieneParaLlevar(e.target.checked)}
                style={{ width: 18, height: 18, accentColor: '#22c55e' }} />
              <div>
                <p style={{ fontSize: 14, fontWeight: 600, color: C.text, margin: 0 }}>Tengo órdenes para llevar</p>
                <p style={{ fontSize: 12, color: C.muted, margin: '2px 0 0' }}>Se crea un flujo especial para pedidos sin mesa</p>
              </div>
            </label>

            {tableCount > 0 && (
              <div style={{ background: '#eff6ff', borderRadius: 12, padding: '14px 16px', border: '1px solid #bfdbfe' }}>
                <p style={{ fontSize: 13, color: '#1d4ed8', fontWeight: 600, margin: '0 0 4px' }}>Tu local</p>
                <p style={{ fontSize: 12, color: '#3b82f6', margin: 0 }}>
                  {tableCount} mesas × {capacidadPorMesa} personas = capacidad de <strong>{tableCount * capacidadPorMesa} comensales</strong>
                  {tieneParaLlevar && ' + órdenes para llevar'}
                </p>
              </div>
            )}
          </div>

          <div style={{ marginTop: 32, display: 'flex', justifyContent: 'space-between' }}>
            <button onClick={() => setStep(s => s - 1)} style={{ background: 'none', border: '1px solid #e5e7eb', borderRadius: 12, padding: '14px 20px', fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, color: C.muted }}>
              <ChevronLeft size={16} /> Atrás
            </button>
            {btn('Siguiente')}
          </div>
        </div>
      )}

      {/* ── PASO 3: Menú ── */}
      {step === 3 && (
        <div>
          <h2 style={{ fontSize: 24, fontWeight: 800, color: C.text, marginBottom: 6 }}>Agrega tu primer platillo</h2>
          <p style={{ fontSize: 14, color: C.muted, marginBottom: 28 }}>Solo uno para arrancar. Puedes agregar el menú completo después desde Menú → Platillos.</p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 6 }}>Nombre del platillo</label>
              <input className={inp} placeholder="Ej: Americano, Hamburguesa clásica, Tacos al pastor" value={dishName}
                onChange={e => setDishName(e.target.value)} autoFocus />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 6 }}>Precio (MXN)</label>
                <input type="number" className={inp} placeholder="150" value={dishPrice}
                  onChange={e => setDishPrice(e.target.value)} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 6 }}>Emoji</label>
                <input className={inp} placeholder="🍽️" value={dishEmoji} maxLength={2}
                  onChange={e => setDishEmoji(e.target.value)} style={{ fontSize: 22, textAlign: 'center' }} />
              </div>
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 6 }}>Categoría</label>
              <select className={sel} value={dishCategory} onChange={e => setDishCategory(e.target.value)}>
                {['Entradas', 'Platos fuertes', 'Postres', 'Bebidas calientes', 'Bebidas frías', 'Antojitos', 'Desayunos', 'Especialidades'].map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ marginTop: 32, display: 'flex', justifyContent: 'space-between' }}>
            <button onClick={() => setStep(s => s - 1)} style={{ background: 'none', border: '1px solid #e5e7eb', borderRadius: 12, padding: '14px 20px', fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, color: C.muted }}>
              <ChevronLeft size={16} /> Atrás
            </button>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setStep(s => s + 1)} style={{ background: 'none', border: '1px solid #e5e7eb', borderRadius: 12, padding: '14px 20px', fontSize: 14, cursor: 'pointer', color: C.muted }}>
                Omitir
              </button>
              {btn('Siguiente', !dishName.trim() || !dishPrice)}
            </div>
          </div>
        </div>
      )}

      {/* ── PASO 4: Equipo ── */}
      {step === 4 && (
        <div>
          <h2 style={{ fontSize: 24, fontWeight: 800, color: C.text, marginBottom: 6 }}>¿Cómo es tu equipo?</h2>
          <p style={{ fontSize: 14, color: C.muted, marginBottom: 28 }}>Nos ayuda a pre-configurar los roles. Agregas a cada persona con su PIN desde Personal.</p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: C.text, display: 'block', marginBottom: 12 }}>
                ¿Cuántas personas trabajan en tu restaurante? <span style={{ color: C.gold, fontSize: 22, fontWeight: 800 }}>{numEmpleados}</span>
              </label>
              <input type="range" min={1} max={50} value={numEmpleados} onChange={e => setNumEmpleados(Number(e.target.value))}
                style={{ width: '100%', accentColor: C.blue }} />
            </div>

            {[
              [tieneChef, setTieneChef, '👨‍🍳', 'Tengo cocinero / chef', 'Se activará la pantalla de Cocina (KDS)'],
              [tieneMeseros, setTieneMeseros, '🛎️', 'Tengo meseros', 'Se activará la vista móvil para meseros'],
            ].map(([val, setter, emoji, label, desc]) => (
              <label key={label as string} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderRadius: 12, cursor: 'pointer', border: `2px solid ${val ? C.blue : '#e5e7eb'}`, background: val ? '#eff6ff' : 'white' }}>
                <input type="checkbox" checked={val as boolean} onChange={e => (setter as Function)(e.target.checked)}
                  style={{ width: 18, height: 18, accentColor: C.blue }} />
                <span style={{ fontSize: 20 }}>{emoji as string}</span>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 600, color: C.text, margin: 0 }}>{label as string}</p>
                  <p style={{ fontSize: 12, color: C.muted, margin: '2px 0 0' }}>{desc as string}</p>
                </div>
              </label>
            ))}
          </div>

          <div style={{ marginTop: 32, display: 'flex', justifyContent: 'space-between' }}>
            <button onClick={() => setStep(s => s - 1)} style={{ background: 'none', border: '1px solid #e5e7eb', borderRadius: 12, padding: '14px 20px', fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, color: C.muted }}>
              <ChevronLeft size={16} /> Atrás
            </button>
            {btn('Siguiente')}
          </div>
        </div>
      )}

      {/* ── PASO 5: Nómina ── */}
      {step === 5 && (
        <div>
          <h2 style={{ fontSize: 24, fontWeight: 800, color: C.text, marginBottom: 6 }}>¿Cómo pagas a tu equipo?</h2>
          <p style={{ fontSize: 14, color: C.muted, marginBottom: 28 }}>Esto afecta cómo calculamos el costo real de tu nómina en los reportes. Lo puedes cambiar después.</p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
            {([
              ['formal', '📋', 'Nómina formal con IMSS', 'Pagas IMSS, INFONAVIT y todas las prestaciones de ley'],
              ['minimo', '📄', 'Solo mínimos de ley', 'Pagas aguinaldo y vacaciones, pero sin IMSS'],
              ['outsourcing', '🏢', 'Outsourcing / Honorarios', 'Personal externo. La factura va a gastos operativos'],
              ['mixto', '⚖️', 'Mixto', 'Algunos en nómina formal, otros en outsourcing'],
            ] as const).map(([val, emoji, label, desc]) => (
              <label key={val} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '14px 16px', borderRadius: 12, cursor: 'pointer', border: `2px solid ${modeloNomina === val ? C.blue : '#e5e7eb'}`, background: modeloNomina === val ? '#eff6ff' : 'white' }}>
                <input type="radio" value={val} checked={modeloNomina === val}
                  onChange={() => setModeloNomina(val)} style={{ marginTop: 3, width: 16, height: 16, accentColor: C.blue }} />
                <span style={{ fontSize: 20, marginTop: 1 }}>{emoji}</span>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 600, color: C.text, margin: 0 }}>{label}</p>
                  <p style={{ fontSize: 12, color: C.muted, margin: '3px 0 0' }}>{desc}</p>
                </div>
              </label>
            ))}
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 6 }}>
              Salario promedio mensual (opcional)
            </label>
            <input type="number" className={inp} placeholder="Ej: 8000" value={salarioPromedio}
              onChange={e => setSalarioPromedio(e.target.value)} />
            <p style={{ fontSize: 11, color: C.muted, marginTop: 6 }}>Para calcular el punto de equilibrio en el Dashboard. Lo puedes configurar por empleado en Personal.</p>
          </div>

          <div style={{ marginTop: 32, display: 'flex', justifyContent: 'space-between' }}>
            <button onClick={() => setStep(s => s - 1)} style={{ background: 'none', border: '1px solid #e5e7eb', borderRadius: 12, padding: '14px 20px', fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, color: C.muted }}>
              <ChevronLeft size={16} /> Atrás
            </button>
            {btn('Siguiente')}
          </div>
        </div>
      )}

      {/* ── PASO 6: Lanzar ── */}
      {step === 6 && (
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 64, marginBottom: 16 }}>🚀</div>
          <h2 style={{ fontSize: 28, fontWeight: 800, color: C.text, marginBottom: 8 }}>
            ¡{restaurantName || 'Tu restaurante'} está listo!
          </h2>
          <p style={{ fontSize: 15, color: C.muted, marginBottom: 32, lineHeight: 1.6 }}>
            Configuramos tus {tableCount} mesas, el primer platillo del menú y el modelo de nómina.
            Ahora abre el POS y haz tu primera venta.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 32 }}>
            {[
              ['🍽️', `${tableCount} mesas`, 'Listas en el POS'],
              [dishEmoji || '🍽️', dishName || 'Menú', 'Primer platillo'],
              ['📊', 'Dashboard', 'Listo para monitorear'],
            ].map(([emoji, label, sub]) => (
              <div key={label} style={{ background: '#f8fafc', borderRadius: 12, padding: '14px 10px', border: '1px solid #e5e7eb' }}>
                <div style={{ fontSize: 24, marginBottom: 6 }}>{emoji}</div>
                <p style={{ fontSize: 13, fontWeight: 700, color: C.text, margin: 0 }}>{label}</p>
                <p style={{ fontSize: 11, color: C.muted, margin: '2px 0 0' }}>{sub}</p>
              </div>
            ))}
          </div>

          <button onClick={handleNext} disabled={saving}
            style={{ background: C.blue, color: C.gold, border: 'none', borderRadius: 14, padding: '16px 40px', fontSize: 16, fontWeight: 800, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 10, width: '100%', justifyContent: 'center' }}>
            {saving ? 'Iniciando...' : '🚀 Abrir el punto de venta'}
          </button>

          <button onClick={() => setStep(s => s - 1)}
            style={{ background: 'none', border: 'none', color: C.muted, fontSize: 13, cursor: 'pointer', marginTop: 16, display: 'flex', alignItems: 'center', gap: 4, margin: '16px auto 0' }}>
            <ChevronLeft size={14} /> Regresar
          </button>
        </div>
      )}
    </div>
  );
}
