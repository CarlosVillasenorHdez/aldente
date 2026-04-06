'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface Table {
  id: string;
  name: string;
  capacity: number;
  status: 'libre' | 'ocupada' | 'espera';
  current_order_id?: string | null;
}

export interface LayoutTablePosition {
  table_id: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

export function useTableState() {
  const { appUser } = useAuth();
  const [tables, setTables] = useState<Table[]>([]);
  const [layoutTables, setLayoutTables] = useState<LayoutTablePosition[]>([]);
  const [layoutId, setLayoutId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [reservedTables, setReservedTables] = useState<string[]>([]);

  const fetchTables = useCallback(async () => {
    if (!appUser?.tenantId) return;
    const supabase = createClient();

    const { data: tData } = await supabase
      .from('tables')
      .select('id, name, capacity, status, current_order_id')
      .eq('tenant_id', appUser.tenantId)
      .order('name');

    if (tData) setTables(tData as Table[]);

    const { data: lData } = await supabase
      .from('table_layouts')
      .select('id, positions')
      .eq('tenant_id', appUser.tenantId)
      .eq('is_active', true)
      .single();

    if (lData) {
      setLayoutId(lData.id);
      setLayoutTables((lData.positions as LayoutTablePosition[]) ?? []);
    }

    setLoading(false);
  }, [appUser?.tenantId]);

  const fetchReservations = useCallback(async () => {
    if (!appUser?.tenantId) return;
    const supabase = createClient();
    const now = new Date();
    const windowStart = new Date(now.getTime() - 30 * 60 * 1000).toISOString();
    const windowEnd = new Date(now.getTime() + 60 * 60 * 1000).toISOString();

    const { data } = await supabase
      .from('reservations')
      .select('table_id')
      .eq('tenant_id', appUser.tenantId)
      .eq('status', 'confirmed')
      .gte('reservation_time', windowStart)
      .lte('reservation_time', windowEnd);

    if (data) setReservedTables(data.map((r: { table_id: string }) => r.table_id));
  }, [appUser?.tenantId]);

  useEffect(() => { fetchTables(); fetchReservations(); }, [fetchTables, fetchReservations]);

  const updateTableStatus = useCallback(async (tableId: string, status: Table['status'], orderId?: string | null) => {
    const supabase = createClient();
    await supabase.from('tables').update({
      status,
      current_order_id: orderId ?? null,
    }).eq('id', tableId);
    setTables(prev => prev.map(t => t.id === tableId ? { ...t, status, current_order_id: orderId } : t));
  }, []);

  return { tables, setTables, layoutTables, setLayoutTables, layoutId, loading, reservedTables, fetchTables, updateTableStatus };
}
