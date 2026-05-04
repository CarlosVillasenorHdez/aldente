'use client';
/**
 * HealthScore — Score de salud del restaurante 0–100
 * Aparece en el dashboard como una tarjeta compacta.
 *
 * Dimensiones (cada una contribuye puntos):
 *  - Ventas (25pts): vs promedio últimos 7 días
 *  - Margen (25pts): % margen del día
 *  - Inventario (20pts): % ingredientes por encima del min_stock
 *  - Equipo (15pts): tasa de asistencia hoy
 *  - Operación (15pts): órdenes completadas vs abiertas hace >45min
 */

import React, { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { getCurrentTenantId as getTenantId } from '@/lib/tenantStore';
import { useBranch } from '@/hooks/useBranch';
import { Activity } from 'lucide-react';

interface ScoreDetail {
  label: string;
  pts: number;
  max: number;
  note: string;
}

interface HealthData {
  score: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  details: ScoreDetail[];
  loading: boolean;
}

function grade(score: number): 'A' | 'B' | 'C' | 'D' | 'F' {
  if (score >= 85) return 'A';
  if (score >= 70) return 'B';
  if (score >= 55) return 'C';
  if (score >= 40) return 'D';
  return 'F';
}

function gradeColor(g: string) {
  return g === 'A' ? '#16a34a' : g === 'B' ? '#2563eb' : g === 'C' ? '#d97706' : g === 'D' ? '#ea580c' : '#dc2626';
}

function gradeBg(g: string) {
  return g === 'A' ? '#f0fdf4' : g === 'B' ? '#eff6ff' : g === 'C' ? '#fffbeb' : g === 'D' ? '#fff7ed' : '#fef2f2';
}

export default function HealthScore() {
  const supabase = createClient();
  const { activeBranchId } = useBranch();
  const [health, setHealth] = useState<HealthData>({ score: 0, grade: 'C', details: [], loading: true });

  const load = useCallback(async () => {
    const tid = getTenantId();
    if (!tid) return;

    const nowMX = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Mexico_City' }));
    const todayStart = new Date(nowMX); todayStart.setHours(0, 0, 0, 0);
    const todayUTC = todayStart.toISOString();

    // Últimos 7 días (para promedio de ventas)
    const last7 = new Date(todayStart); last7.setDate(last7.getDate() - 7);
    const last7UTC = last7.toISOString();

    // 45 minutos atrás (para órdenes lentas)
    const slowThreshold = new Date(); slowThreshold.setMinutes(slowThreshold.getMinutes() - 45);

    const [
      { data: ordersHoy },
      { data: orders7d },
      { data: ingredientes },
      { data: empleados },
      { data: asistencias },
      { data: ordenesLentas },
    ] = await Promise.all([
      (activeBranchId
        ? supabase.from('orders').select('total, cost_actual, margin_actual').eq('tenant_id', tid).eq('branch_id', activeBranchId).eq('status', 'cerrada').eq('is_comanda', false).gte('closed_at', todayUTC)
        : supabase.from('orders').select('total, cost_actual, margin_actual').eq('tenant_id', tid).eq('status', 'cerrada').eq('is_comanda', false).gte('closed_at', todayUTC)),
      supabase.from('orders').select('total, closed_at').eq('tenant_id', tid).eq('status', 'cerrada').eq('is_comanda', false).gte('closed_at', last7UTC).lt('closed_at', todayUTC),
      supabase.from('ingredients').select('stock, min_stock').eq('tenant_id', tid),
      supabase.from('employees').select('id').eq('tenant_id', tid).eq('status', 'activo'),
      supabase.from('attendance_logs').select('employee_id').eq('tenant_id', tid).gte('check_in', todayUTC).is('check_out', null),
      supabase.from('orders').select('id').eq('tenant_id', tid).in('status', ['abierta', 'preparacion']).lt('created_at', slowThreshold.toISOString()),
    ]);

    const details: ScoreDetail[] = [];
    let totalScore = 0;

    // ── Ventas (25 pts) ───────────────────────────────────────────────────────
    const ventasHoy = (ordersHoy || []).reduce((s, o) => s + Number(o.total), 0);
    let ventasPts = 0;
    let ventasNote = 'Sin datos de referencia';
    if ((orders7d || []).length > 0) {
      // Promedio diario de últimos 7 días
      const diasConVentas = new Set((orders7d || []).map((o) => o.closed_at?.slice(0, 10))).size || 7;
      const totalWeek = (orders7d || []).reduce((s, o) => s + Number(o.total), 0);
      const promDiario = totalWeek / diasConVentas;
      const ratio = promDiario > 0 ? ventasHoy / promDiario : 0;
      ventasPts = Math.min(25, Math.round(ratio * 25));
      ventasNote = promDiario > 0
        ? `${Math.round(ratio * 100)}% del promedio semanal ($${Math.round(promDiario).toLocaleString('es-MX')})`
        : 'Sin promedio calculado';
    } else {
      ventasPts = ventasHoy > 0 ? 15 : 5; // Si no hay historial pero sí ventas, da puntos parciales
      ventasNote = ventasHoy > 0 ? 'Sin historial previo — acumulando datos' : 'Sin ventas hoy';
    }
    totalScore += ventasPts;
    details.push({ label: 'Ventas', pts: ventasPts, max: 25, note: ventasNote });

    // ── Margen (25 pts) ────────────────────────────────────────────────────────
    const utilidad = (ordersHoy || []).reduce((s, o) => s + Number((o as any).margin_actual ?? 0), 0);
    const margen = ventasHoy > 0 ? (utilidad / ventasHoy) * 100 : -1;
    let margenPts = 0;
    let margenNote = 'Sin ventas para calcular margen';
    if (margen >= 0) {
      // Restaurante saludable: margen >30% = full points. <10% = 0 pts.
      margenPts = Math.min(25, Math.max(0, Math.round((margen / 30) * 25)));
      margenNote = `${margen.toFixed(1)}% de margen hoy`;
    }
    totalScore += margenPts;
    details.push({ label: 'Margen', pts: margenPts, max: 25, note: margenNote });

    // ── Inventario (20 pts) ────────────────────────────────────────────────────
    let inventarioPts = 0;
    let inventarioNote = 'Sin ingredientes configurados';
    if ((ingredientes || []).length > 0) {
      const total = (ingredientes || []).length;
      const sobre = (ingredientes || []).filter((i) => Number(i.stock) > Number(i.min_stock)).length;
      const ratio = sobre / total;
      inventarioPts = Math.round(ratio * 20);
      const bajos = total - sobre;
      inventarioNote = bajos === 0 ? 'Todo el inventario sobre mínimo' : `${bajos} ingrediente${bajos > 1 ? 's' : ''} bajo mínimo`;
    } else {
      inventarioPts = 10; // Neutral si no hay ingredientes cargados
      inventarioNote = 'Inventario no configurado';
    }
    totalScore += inventarioPts;
    details.push({ label: 'Inventario', pts: inventarioPts, max: 20, note: inventarioNote });

    // ── Equipo (15 pts) ────────────────────────────────────────────────────────
    let equipoPts = 0;
    let equipoNote = 'Sin empleados activos';
    const totalEmp = (empleados || []).length;
    const presentesHoy = (asistencias || []).length;
    if (totalEmp > 0) {
      const ratio = presentesHoy / totalEmp;
      equipoPts = Math.min(15, Math.round(ratio * 15));
      equipoNote = `${presentesHoy}/${totalEmp} empleados presentes`;
    } else {
      equipoPts = 8; // Neutral
      equipoNote = 'Sin control de asistencia activo';
    }
    totalScore += equipoPts;
    details.push({ label: 'Equipo', pts: equipoPts, max: 15, note: equipoNote });

    // ── Operación (15 pts) ─────────────────────────────────────────────────────
    const lentas = (ordenesLentas || []).length;
    const operacionPts = lentas === 0 ? 15 : lentas <= 2 ? 10 : lentas <= 5 ? 5 : 0;
    const operacionNote = lentas === 0 ? 'Sin órdenes demoradas' : `${lentas} orden${lentas > 1 ? 'es' : ''} con +45 min`;
    totalScore += operacionPts;
    details.push({ label: 'Operación', pts: operacionPts, max: 15, note: operacionNote });

    const g = grade(totalScore);
    setHealth({ score: totalScore, grade: g, details, loading: false });
  }, [activeBranchId]); // eslint-disable-line

  useEffect(() => {
    load();
    const interval = setInterval(load, 5 * 60_000); // refresh cada 5 min
    return () => clearInterval(interval);
  }, [load]);

  const { score, grade: g, details, loading } = health;
  const color = gradeColor(g);
  const bg = gradeBg(g);
  const [expanded, setExpanded] = useState(false);

  if (loading) {
    return (
      <div style={{ backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 16, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12, minHeight: 80 }}>
        <div style={{ width: 48, height: 48, borderRadius: 12, background: '#e5e7eb', animation: 'pulse 1.5s infinite' }} />
        <div style={{ flex: 1 }}>
          <div style={{ height: 12, width: '40%', background: '#e5e7eb', borderRadius: 6, marginBottom: 8 }} />
          <div style={{ height: 8, width: '60%', background: '#f3f4f6', borderRadius: 4 }} />
        </div>
      </div>
    );
  }

  return (
    <div
      style={{ backgroundColor: bg, border: `1px solid ${color}30`, borderRadius: 16, padding: '16px 20px', cursor: 'pointer', transition: 'box-shadow .15s' }}
      onClick={() => setExpanded(!expanded)}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        {/* Score circle */}
        <div style={{ width: 56, height: 56, borderRadius: 14, backgroundColor: color, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <span style={{ fontSize: 20, fontWeight: 700, color: '#fff', lineHeight: 1 }}>{score}</span>
          <span style={{ fontSize: 10, color: 'rgba(255,255,255,.75)', fontWeight: 500 }}>/100</span>
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <Activity size={14} color={color} />
            <span style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.05em', color: '#6b7280' }}>Salud del restaurante</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span style={{ fontSize: 22, fontWeight: 700, color, letterSpacing: '-0.5px' }}>
              {{A:'Excelente',B:'Bien',C:'Regular',D:'Atención',F:'Crítico'}[g]}
            </span>
            <span style={{ fontSize: 12, fontWeight: 600, color, backgroundColor: `${color}18`, padding: '2px 8px', borderRadius: 20 }}>Grado {g}</span>
          </div>
        </div>

        <div style={{ fontSize: 18, color, opacity: .6, transition: 'transform .2s', transform: expanded ? 'rotate(180deg)' : 'none' }}>▾</div>
      </div>

      {/* Bar */}
      <div style={{ marginTop: 12, height: 6, borderRadius: 3, backgroundColor: `${color}20`, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${score}%`, backgroundColor: color, borderRadius: 3, transition: 'width .6s ease' }} />
      </div>

      {/* Expanded details */}
      {expanded && (
        <div style={{ marginTop: 14, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {details.map((d) => (
            <div key={d.label} style={{ backgroundColor: 'rgba(255,255,255,.5)', borderRadius: 10, padding: '10px 12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: '#374151' }}>{d.label}</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: d.pts >= d.max * 0.7 ? '#16a34a' : d.pts >= d.max * 0.4 ? '#d97706' : '#dc2626' }}>
                  {d.pts}/{d.max}
                </span>
              </div>
              <div style={{ height: 4, borderRadius: 2, backgroundColor: '#e5e7eb', overflow: 'hidden', marginBottom: 4 }}>
                <div style={{ height: '100%', width: `${(d.pts / d.max) * 100}%`, backgroundColor: d.pts >= d.max * 0.7 ? '#16a34a' : d.pts >= d.max * 0.4 ? '#d97706' : '#dc2626', borderRadius: 2 }} />
              </div>
              <p style={{ fontSize: 10, color: '#9ca3af', margin: 0, lineHeight: 1.4 }}>{d.note}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
