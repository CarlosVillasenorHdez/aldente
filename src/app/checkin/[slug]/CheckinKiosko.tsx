'use client';
/**
 * Pantalla kiosko de check-in / check-out
 * Ruta: /checkin/[slug]
 *
 * Flujo:
 *  1. Muestra todos los empleados del restaurante como tarjetas grandes
 *  2. Empleado toca su nombre/foto
 *  3. Ingresa PIN de 4 dígitos
 *  4. Sistema registra entrada o salida según el estado actual
 *  5. Confirmación visual 3 segundos → vuelve a la pantalla inicial
 *
 * Sin login requerido. Diseñada para tablet en la entrada del restaurante.
 * Sin sidebar, sin menú. Solo la pantalla de check-in.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { CheckCircle, X, Clock, LogIn, LogOut } from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Employee {
  id: string;
  name: string;
  role: string;
  initials: string;
  color: string;
  checkedInToday: boolean;
  checkedOutToday: boolean;
  checkInTime: string | null;
  attendanceId: string | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const AVATAR_COLORS = [
  '#f59e0b','#3b82f6','#10b981','#8b5cf6','#ef4444',
  '#06b6d4','#f97316','#84cc16','#ec4899','#6366f1',
];

function getInitials(name: string): string {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

function getColor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function nowTime(): string {
  return new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: true });
}

function todayDate(): string {
  return new Date().toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' });
}

function todayISO(): string {
  return new Date().toISOString().split('T')[0];
}

// ── Main Component ────────────────────────────────────────────────────────────

export function CheckinKiosko({ slug }: { slug: string }) {
  const supabase = createClient();

  // Estado global
  const [tenantId, setTenantId]         = useState<string | null>(null);
  const [restaurantName, setRestaurantName] = useState('');
  const [employees, setEmployees]       = useState<Employee[]>([]);
  const [loading, setLoading]           = useState(true);
  const [clock, setClock]               = useState(nowTime());

  // Flujo de check-in
  const [selected, setSelected]         = useState<Employee | null>(null);
  const [pin, setPin]                   = useState('');
  const [pinError, setPinError]         = useState(false);
  const [confirming, setConfirming]     = useState(false);
  const [result, setResult]             = useState<{
    type: 'in' | 'out'; name: string; time: string;
  } | null>(null);

  // Reloj en tiempo real
  useEffect(() => {
    const id = setInterval(() => setClock(nowTime()), 1000);
    return () => clearInterval(id);
  }, []);

  // Cargar tenant por slug
  const loadTenant = useCallback(async () => {
    const { data: tenant } = await supabase
      .from('tenants')
      .select('id, name')
      .eq('slug', slug)
      .single();
    if (!tenant) { setLoading(false); return; }
    setTenantId(tenant.id);
    setRestaurantName(tenant.name);
  }, [supabase, slug]);

  // Cargar empleados + asistencia de hoy
  const loadEmployees = useCallback(async () => {
    if (!tenantId) return;

    const [{ data: emps }, { data: attendance }] = await Promise.all([
      supabase.from('employees')
        .select('id, name, role')
        .eq('tenant_id', tenantId)
        .eq('status', 'activo')
        .order('name'),
      supabase.from('employee_attendance')
        .select('id, employee_id, check_in, check_out, check_in_ts, check_out_ts')
        .eq('tenant_id', tenantId)
        .eq('date', todayISO()),
    ]);

    const attMap: Record<string, { checkIn: string | null; checkOut: string | null; id: string }> = {};
    (attendance ?? []).forEach((a: any) => {
      attMap[a.employee_id] = {
        id: a.id,
        checkIn: a.check_in ?? null,
        checkOut: a.check_out ?? null,
      };
    });

    setEmployees((emps ?? []).map((e: any) => ({
      id: e.id,
      name: e.name,
      role: e.role,
      initials: getInitials(e.name),
      color: getColor(e.id),
      checkedInToday: !!attMap[e.id]?.checkIn,
      checkedOutToday: !!attMap[e.id]?.checkOut,
      checkInTime: attMap[e.id]?.checkIn ?? null,
      attendanceId: attMap[e.id]?.id ?? null,
    })));

    setLoading(false);
  }, [supabase, tenantId]);

  useEffect(() => { loadTenant(); }, [loadTenant]);
  useEffect(() => { if (tenantId) loadEmployees(); }, [tenantId, loadEmployees]);

  // ── PIN handling ───────────────────────────────────────────────────────────

  const handleDigit = (d: string) => {
    if (pin.length >= 4) return;
    const next = pin + d;
    setPin(next);
    setPinError(false);
    if (next.length === 4) setTimeout(() => handleConfirm(next), 100);
  };

  const handleConfirm = async (pinValue: string) => {
    if (!selected || !tenantId || confirming) return;
    setConfirming(true);

    // Verificar PIN
    const { data: emp } = await supabase
      .from('employees')
      .select('id, pin')
      .eq('id', selected.id)
      .eq('tenant_id', tenantId)
      .single();

    if (!emp || emp.pin !== pinValue) {
      setPinError(true);
      setPin('');
      setConfirming(false);
      return;
    }

    const now = new Date();
    const timeStr = now.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false });
    const type: 'in' | 'out' = selected.checkedInToday && !selected.checkedOutToday ? 'out' : 'in';

    if (type === 'in') {
      // Registrar entrada — crear o actualizar registro de hoy
      if (selected.attendanceId) {
        await supabase.from('employee_attendance')
          .update({ check_in: timeStr, check_in_ts: now.toISOString(), metodo: 'kiosko', updated_at: now.toISOString() })
          .eq('id', selected.attendanceId);
      } else {
        await supabase.from('employee_attendance').insert({
          tenant_id: tenantId,
          employee_id: selected.id,
          date: todayISO(),
          check_in: timeStr,
          check_in_ts: now.toISOString(),
          metodo: 'kiosko',
        });
      }
    } else {
      // Registrar salida
      const checkInTs = new Date(`${todayISO()}T${selected.checkInTime}:00`);
      const hoursWorked = Math.round(((now.getTime() - checkInTs.getTime()) / 3600000) * 100) / 100;
      await supabase.from('employee_attendance')
        .update({
          check_out: timeStr, check_out_ts: now.toISOString(),
          hours_worked: hoursWorked, updated_at: now.toISOString(),
        })
        .eq('id', selected.attendanceId!);
    }

    setResult({ type, name: selected.name, time: timeStr });
    setConfirming(false);
    setSelected(null);
    setPin('');

    // Volver a la pantalla principal después de 3 segundos
    setTimeout(() => {
      setResult(null);
      loadEmployees();
    }, 3000);
  };

  // ── Render ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div style={{ minHeight: '100svh', background: '#0f1923', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 40, height: 40, border: '3px solid rgba(245,158,11,0.3)', borderTop: '3px solid #f59e0b', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
      </div>
    );
  }

  if (!tenantId) {
    return (
      <div style={{ minHeight: '100svh', background: '#0f1923', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 16 }}>Restaurante no encontrado</p>
      </div>
    );
  }

  // ── Pantalla de confirmación ───────────────────────────────────────────────
  if (result) {
    const isIn = result.type === 'in';
    return (
      <div style={{ minHeight: '100svh', background: isIn ? '#052e16' : '#1c1917', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 24 }}>
        <div style={{ width: 100, height: 100, borderRadius: '50%', background: isIn ? '#22c55e' : '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {isIn ? <LogIn size={48} color="white" /> : <LogOut size={48} color="white" />}
        </div>
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: 32, fontWeight: 800, color: 'white', margin: 0 }}>
            {isIn ? '¡Bienvenido!' : '¡Hasta pronto!'}
          </p>
          <p style={{ fontSize: 22, color: isIn ? '#86efac' : '#fcd34d', margin: '8px 0 0', fontWeight: 600 }}>
            {result.name}
          </p>
          <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.5)', margin: '12px 0 0' }}>
            {isIn ? 'Entrada' : 'Salida'} registrada a las {result.time}
          </p>
        </div>
        <div style={{ marginTop: 8 }}>
          <CheckCircle size={24} color={isIn ? '#22c55e' : '#f59e0b'} />
        </div>
      </div>
    );
  }

  // ── Modal de PIN ───────────────────────────────────────────────────────────
  if (selected) {
    const isCheckout = selected.checkedInToday && !selected.checkedOutToday;
    return (
      <div style={{ minHeight: '100svh', background: '#0f1923', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <div style={{ background: '#1a2535', borderRadius: 24, padding: '40px 36px', maxWidth: 360, width: '100%', textAlign: 'center', border: '1px solid rgba(255,255,255,0.08)' }}>

          {/* Avatar */}
          <div style={{ width: 80, height: 80, borderRadius: '50%', background: selected.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, fontWeight: 800, color: '#1B3A6B', margin: '0 auto 16px' }}>
            {selected.initials}
          </div>

          <p style={{ fontSize: 22, fontWeight: 800, color: 'white', margin: '0 0 4px' }}>{selected.name}</p>
          <p style={{ fontSize: 14, color: '#f59e0b', fontWeight: 600, margin: '0 0 8px' }}>
            {isCheckout ? '🔴 Registrar salida' : '🟢 Registrar entrada'}
          </p>
          {isCheckout && selected.checkInTime && (
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', margin: '0 0 24px' }}>
              Entrada: {selected.checkInTime}
            </p>
          )}

          {/* Indicador PIN */}
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginBottom: 24 }}>
            {[0,1,2,3].map(i => (
              <div key={i} style={{
                width: 18, height: 18, borderRadius: '50%',
                background: i < pin.length ? '#f59e0b' : 'rgba(255,255,255,0.1)',
                border: pinError ? '2px solid #ef4444' : `2px solid ${i < pin.length ? '#f59e0b' : 'rgba(255,255,255,0.2)'}`,
                transition: 'all .15s',
              }} />
            ))}
          </div>

          {pinError && (
            <p style={{ fontSize: 13, color: '#f87171', marginBottom: 16, fontWeight: 600 }}>PIN incorrecto. Inténtalo de nuevo.</p>
          )}

          {/* Teclado numérico */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 20 }}>
            {[1,2,3,4,5,6,7,8,9,'',0,'⌫'].map((d, i) => (
              <button key={i}
                onClick={() => {
                  if (d === '⌫') setPin(p => p.slice(0, -1));
                  else if (d !== '') handleDigit(String(d));
                }}
                style={{
                  height: 64, borderRadius: 14, border: 'none',
                  background: d === '' ? 'transparent' : d === '⌫' ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.07)',
                  color: d === '⌫' ? '#f87171' : 'white',
                  fontSize: d === '⌫' ? 20 : 24, fontWeight: 700,
                  cursor: d === '' ? 'default' : 'pointer',
                  transition: 'all .1s',
                  opacity: confirming ? 0.5 : 1,
                }}
                disabled={confirming || d === ''}
              >
                {d}
              </button>
            ))}
          </div>

          <button onClick={() => { setSelected(null); setPin(''); setPinError(false); }}
            style={{ background: 'none', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, padding: '10px 24px', color: 'rgba(255,255,255,0.4)', fontSize: 14, cursor: 'pointer' }}>
            Cancelar
          </button>
        </div>
      </div>
    );
  }

  // ── Pantalla principal — selección de empleado ─────────────────────────────
  const present = employees.filter(e => e.checkedInToday && !e.checkedOutToday);
  const absent  = employees.filter(e => !e.checkedInToday);
  const out     = employees.filter(e => e.checkedInToday && e.checkedOutToday);

  return (
    <div style={{ minHeight: '100svh', background: '#0f1923', display: 'flex', flexDirection: 'column' }}>

      {/* Header */}
      <div style={{ padding: '24px 32px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <p style={{ fontSize: 22, fontWeight: 800, color: 'white', margin: 0 }}>{restaurantName}</p>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', margin: '2px 0 0', textTransform: 'capitalize' }}>{todayDate()}</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ fontSize: 32, fontWeight: 800, color: '#f59e0b', margin: 0, fontFamily: 'monospace' }}>{clock}</p>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', margin: '2px 0 0' }}>
            {present.length}/{employees.length} en turno
          </p>
        </div>
      </div>

      {/* Contenido */}
      <div style={{ flex: 1, padding: '32px', overflowY: 'auto' }}>

        {/* Empleados presentes */}
        {present.length > 0 && (
          <div style={{ marginBottom: 32 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#22c55e', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14 }}>
              🟢 En turno ({present.length})
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 12 }}>
              {present.map(emp => (
                <button key={emp.id} onClick={() => setSelected(emp)}
                  style={{ background: 'rgba(34,197,94,0.08)', border: '2px solid rgba(34,197,94,0.25)', borderRadius: 18, padding: '20px 12px', cursor: 'pointer', transition: 'all .15s', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 60, height: 60, borderRadius: '50%', background: emp.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 800, color: '#1B3A6B', position: 'relative' }}>
                    {emp.initials}
                    <div style={{ position: 'absolute', bottom: 2, right: 2, width: 14, height: 14, borderRadius: '50%', background: '#22c55e', border: '2px solid #0f1923' }} />
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <p style={{ fontSize: 13, fontWeight: 700, color: 'white', margin: 0 }}>{emp.name.split(' ')[0]}</p>
                    <p style={{ fontSize: 11, color: '#86efac', margin: '2px 0 0' }}>Desde {emp.checkInTime}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Empleados pendientes de llegar */}
        {absent.length > 0 && (
          <div style={{ marginBottom: 32 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14 }}>
              ⭕ Sin registrar ({absent.length})
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 12 }}>
              {absent.map(emp => (
                <button key={emp.id} onClick={() => setSelected(emp)}
                  style={{ background: 'rgba(255,255,255,0.03)', border: '2px solid rgba(255,255,255,0.08)', borderRadius: 18, padding: '20px 12px', cursor: 'pointer', transition: 'all .15s', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 60, height: 60, borderRadius: '50%', background: emp.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 800, color: '#1B3A6B', opacity: 0.5 }}>
                    {emp.initials}
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <p style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.5)', margin: 0 }}>{emp.name.split(' ')[0]}</p>
                    <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', margin: '2px 0 0' }}>Toca para registrar</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Empleados que ya salieron */}
        {out.length > 0 && (
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14 }}>
              ✓ Turno completado ({out.length})
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 12 }}>
              {out.map(emp => (
                <div key={emp.id} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 18, padding: '20px 12px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, opacity: 0.5 }}>
                  <div style={{ width: 60, height: 60, borderRadius: '50%', background: emp.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 800, color: '#1B3A6B', filter: 'grayscale(60%)' }}>
                    {emp.initials}
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.35)', margin: 0 }}>{emp.name.split(' ')[0]}</p>
                    <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', margin: '2px 0 0' }}>Salió hoy</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{ padding: '16px 32px', borderTop: '1px solid rgba(255,255,255,0.05)', textAlign: 'center' }}>
        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.15)', margin: 0 }}>
          Aldente ERP · Toca tu nombre para registrar entrada o salida
        </p>
      </div>
    </div>
  );
}
