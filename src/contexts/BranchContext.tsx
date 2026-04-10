'use client';
/**
 * BranchContext — gestión de la sucursal activa
 *
 * Reglas de negocio:
 * - Admin/Gerente: pueden cambiar de sucursal. Ven datos de la sucursal activa.
 * - Mesero/Cocinero/Cajero/Repartidor: solo ven su sucursal asignada (branch_id en app_users).
 * - Sin sucursales configuradas: activeBranchId = null (sin filtro, modo tenant completo).
 *
 * El hook useBranch() expone:
 *   activeBranchId    — ID de la sucursal activa (null = todas / sin sucursales)
 *   activeBranchName  — Nombre para mostrar
 *   branches          — Lista de sucursales disponibles (solo para admin/gerente)
 *   canSwitch         — true si el usuario puede cambiar de sucursal
 *   setActiveBranch   — función para cambiar (solo si canSwitch)
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface BranchOption { id: string; name: string; address?: string; }

interface BranchContextValue {
  activeBranchId: string | null;
  activeBranchName: string;
  branches: BranchOption[];
  canSwitch: boolean;
  setActiveBranch: (branch: BranchOption | null) => void;
  loading: boolean;
}

const BranchContext = createContext<BranchContextValue>({
  activeBranchId: null,
  activeBranchName: '',
  branches: [],
  canSwitch: false,
  setActiveBranch: () => {},
  loading: true,
});

const CAN_SWITCH_ROLES = ['admin', 'gerente'];
const ACTIVE_BRANCH_KEY = 'aldente_active_branch';

export function BranchProvider({ children }: { children: React.ReactNode }) {
  const { appUser } = useAuth();
  const supabase = createClient();

  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [activeBranch, setActiveBranchState] = useState<BranchOption | null>(null);
  const [loading, setLoading] = useState(true);

  const canSwitch = CAN_SWITCH_ROLES.includes(appUser?.appRole ?? '');

  const load = useCallback(async () => {
    if (!appUser?.tenantId) { setLoading(false); return; }
    setLoading(true);

    const { data } = await supabase
      .from('branches')
      .select('id, name, address')
      .eq('is_active', true)
      .order('name');

    const list: BranchOption[] = (data ?? []).map((b: any) => ({ id: b.id, name: b.name, address: b.address || '' }));
    setBranches(list);

    if (canSwitch) {
      // Admin/gerente: restore last selected branch from localStorage
      const stored = localStorage.getItem(ACTIVE_BRANCH_KEY + '_' + appUser.tenantId);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          // Verify it still exists
          const found = list.find(b => b.id === parsed.id);
          if (found) { setActiveBranchState(found); setLoading(false); return; }
        } catch {}
      }
      // Default to first branch if exists
      setActiveBranchState(list[0] ?? null);
    } else {
      // Non-admin: use their assigned branch_id
      const userBranchId = appUser.branchId;
      if (userBranchId) {
        const found = list.find(b => b.id === userBranchId);
        setActiveBranchState(found ?? list[0] ?? null);
      } else {
        // No branch assigned — no filter
        setActiveBranchState(null);
      }
    }

    setLoading(false);
  }, [appUser?.tenantId, appUser?.branchId, canSwitch]);

  useEffect(() => { load(); }, [load]);

  function setActiveBranch(branch: BranchOption | null) {
    if (!canSwitch) return;
    setActiveBranchState(branch);
    if (appUser?.tenantId) {
      try {
        if (branch) localStorage.setItem(ACTIVE_BRANCH_KEY + '_' + appUser.tenantId, JSON.stringify(branch));
        else localStorage.removeItem(ACTIVE_BRANCH_KEY + '_' + appUser.tenantId);
      } catch {}
    }
  }

  return (
    <BranchContext.Provider value={{
      activeBranchId: activeBranch?.id ?? null,
      activeBranchName: activeBranch?.name ?? (branches.length === 0 ? '' : 'Todas las sucursales'),
      branches,
      canSwitch,
      setActiveBranch,
      loading,
    }}>
      {children}
    </BranchContext.Provider>
  );
}

export function useBranch() {
  return useContext(BranchContext);
}
