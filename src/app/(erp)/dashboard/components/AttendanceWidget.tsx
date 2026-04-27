'use client';
/**
 * AttendanceWidget — Panel de asistencia del día para el dueño
 * Muestra en tiempo real quién está en el restaurante y quién no
 */

import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { getCurrentTenantId as getTenantId } from '@/lib/tenantStore';
import { Users, ExternalLink } from 'lucide-react';

interface EmpStatus {
  id: string;
  name: string;
  role: string;
  initials: string;
  color: string;
  status: 'present' | 'absent' | 'left';
  checkInTime: string | null;
  checkOutTime: string | null;
}

const COLORS = ['#f59e0b','#3b82f6','#10b981','#8b5cf6','#ef4444','#06b6d4','#f97316'];

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}
function getColor(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = id.charCodeAt(i) + ((h << 5) - h);
  return COLORS[Math.abs(h) % COLORS.length];
}

const roleLabel = (r: string) =>
  r === 'cocinero' ? 'Cocinero' : r === 'mesero' ? 'Mesero' : r === 'cajero' ? 'Cajero'
  : r === 'gerente' ? 'Gerente' : r === 'admin' ? 'Admin' : r;

export default function AttendanceWidget() {
  const supabase = createClient();
  const [employees, setEmployees] = useState<EmpStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [slug, setSlug] = useState('');

  const today = new Date().toISOString().split('T')[0];

  const load = useCallback(async () => {
    const tid = getTenantId();
    if (!tid) return;

    const [{ data: emps }, { data: att }, { data: tenant }] = await Promise.all([
      supabase.from('employees').select('id, name, role')
        .eq('tenant_id', tid).eq('status', 'activo').order('name'),
      supabase.from('employee_attendance')
        .select('employee_id, check_in, check_out')
        .eq('tenant_id', tid).eq('date', today),
      supabase.from('tenants').select('slug').eq('id', tid).single(),
    ]);

    setSlug(tenant?.slug ?? '');

    const attMap: Record<string, { in: string | null; out: string | null }> = {};
    (att ?? []).forEach((a: any) => {
      attMap[a.employee_id] = { in: a.check_in, out: a.check_out };
    });

    setEmployees((emps ?? []).map((e: any) => {
      const a = attMap[e.id];
      const status: EmpStatus['status'] = !a?.in ? 'absent' : a?.out ? 'left' : 'present';
      return {
        id: e.id, name: e.name, role: e.role,
        initials: getInitials(e.name), color: getColor(e.id),
        status, checkInTime: a?.in ?? null, checkOutTime: a?.out ?? null,
      };
    }));
    setLoading(false);
  }, [supabase, today]);

  useEffect(() => { load(); }, [load]);

  // Realtime
  useEffect(() => {
    const tid = getTenantId();
    if (!tid) return;
    const ch = supabase.channel(`attendance-${tid}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'employee_attendance',
        filter: `tenant_id=eq.${tid}`,
      }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [supabase, load]);

  const present = employees.filter(e => e.status === 'present');
  const absent  = employees.filter(e => e.status === 'absent');
  const left    = employees.filter(e => e.status === 'left');

  if (loading) {
    return (
      <div className="bg-white border border-gray-200 rounded-2xl p-5 animate-pulse">
        <div className="h-4 bg-gray-100 rounded w-1/3 mb-4" />
        <div className="flex gap-2">
          {[1,2,3].map(i => <div key={i} className="w-12 h-12 bg-gray-100 rounded-full" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users size={16} className="text-gray-500" />
          <span className="text-sm font-bold text-gray-900">Asistencia hoy</span>
          <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
            style={{ backgroundColor: 'rgba(34,197,94,0.1)', color: '#15803d' }}>
            {present.length}/{employees.length} presentes
          </span>
        </div>
        {slug && (
          <a href={`/checkin/${slug}`} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium">
            Kiosko <ExternalLink size={11} />
          </a>
        )}
      </div>

      <div className="p-5 space-y-4">
        {/* Presentes */}
        {present.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-green-600 uppercase tracking-wide mb-2">🟢 En turno</p>
            <div className="space-y-2">
              {present.map(e => (
                <div key={e.id} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                    style={{ backgroundColor: e.color, color: '#1B3A6B' }}>
                    {e.initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{e.name}</p>
                    <p className="text-xs text-gray-400">{roleLabel(e.role)}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs font-mono text-green-600 font-semibold">{e.checkInTime}</p>
                    <p className="text-xs text-gray-400">entrada</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Ausentes */}
        {absent.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">⭕ Sin registrar</p>
            <div className="flex flex-wrap gap-2">
              {absent.map(e => (
                <div key={e.id} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-50 border border-gray-100">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 opacity-50"
                    style={{ backgroundColor: e.color, color: '#1B3A6B' }}>
                    {e.initials}
                  </div>
                  <span className="text-xs text-gray-500 font-medium">{e.name.split(' ')[0]}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Que ya salieron */}
        {left.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-gray-300 uppercase tracking-wide mb-2">✓ Turno completado</p>
            <div className="flex flex-wrap gap-2">
              {left.map(e => (
                <div key={e.id} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-50 border border-gray-100 opacity-50">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                    style={{ backgroundColor: e.color, color: '#1B3A6B' }}>
                    {e.initials}
                  </div>
                  <span className="text-xs text-gray-400 font-medium">{e.name.split(' ')[0]}</span>
                  <span className="text-xs text-gray-300 font-mono">{e.checkOutTime}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {employees.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-4">
            No hay empleados registrados.<br />
            <a href="/personal" className="text-blue-600 underline text-xs">Agregar en Personal →</a>
          </p>
        )}
      </div>
    </div>
  );
}
