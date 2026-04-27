'use client';

import { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { createClient } from '../lib/supabase/client';
import { setCurrentTenantId } from '../lib/tenantStore';

// AppRole is a string — supports both the 7 built-in roles and custom profiles
export type AppRole = string;
export const BUILTIN_ROLES = ['admin', 'gerente', 'cajero', 'mesero', 'cocinero', 'ayudante_cocina', 'repartidor'] as const;

export interface AppUser {
  id: string;
  username: string;
  fullName: string;
  appRole: AppRole;
  employeeId: string | null;
  isActive: boolean;
  tenantId: string | null;
  branchId: string | null;
  branchName: string | null;
}

interface BrandConfig {
  primaryColor: string;
  accentColor: string;
  logoUrl: string;
  restaurantName: string;
  theme: 'dark' | 'light';
}

interface AuthContextValue {
  appUser: AppUser | null;
  loading: boolean;
  brandConfig: BrandConfig;
  reloadBrandConfig: () => Promise<void>;
  tenantId: string | null;
  branchId: string | null;
  signIn: (userId: string, pin: string) => Promise<{ error?: string; user?: AppUser }>;
  signOut: () => Promise<void>;
  createUser: (
    username: string,
    password: string,
    fullName: string,
    role: AppRole,
    employeeId?: string,
    branchId?: string | null,
  ) => Promise<void>;
  updateUserPassword: (authUserId: string, newPassword: string) => Promise<void>;
  listUsers: () => Promise<AppUser[]>;
  toggleUserActive: (userId: string, isActive: boolean) => Promise<void>;
  updateUserRole: (userId: string, role: AppRole) => Promise<void>;
}

const DEFAULT_BRAND_CONFIG = {
  primaryColor: '#1B3A6B',
  accentColor: '#f59e0b',
  logoUrl: '',
  restaurantName: 'Mi Restaurante',
  theme: 'dark' as const,
};

const AuthContext = createContext<AuthContextValue>({
  appUser: null,
  loading: true,
  brandConfig: DEFAULT_BRAND_CONFIG,
  reloadBrandConfig: async () => {},
  tenantId: null,
  branchId: null,
  signIn: async () => ({}),
  signOut: async () => {},
  createUser: async () => {},
  updateUserPassword: async () => {},
  listUsers: async () => [],
  toggleUserActive: async () => {},
  updateUserRole: async () => {},
});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

// ── Session key in sessionStorage ────────────────────────────────────────────
const SESSION_KEY = 'aldente_session';
const BRAND_CACHE_KEY = 'sistemarest_brand_config';
const DEFAULT_TENANT = '00000000-0000-0000-0000-000000000001';

function loadSession(): AppUser | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as AppUser) : null;
  } catch {
    return null;
  }
}

function saveSession(user: AppUser) {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(user));
}

function clearSession() {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(SESSION_KEY);
}


// ── Simple PIN hash using Web Crypto (no external deps) ─────────────────────
async function hashPin(pin: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(pin + 'aldente_salt_2024');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

export const AuthProvider = ({ children }: { children?: React.ReactNode }) => {
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [brandConfig, setBrandConfig] = useState<BrandConfig>({
    primaryColor: '#1B3A6B',
    accentColor: '#f59e0b',
    logoUrl: '',
    restaurantName: '',
    theme: 'dark',
  });

  const supabaseRef = useRef(createClient());
  const supabase = supabaseRef.current;

  // ── Load session on mount ────────────────────────────────────────────────
  useEffect(() => {
    const stored = loadSession();
    if (stored?.tenantId) {
      setCurrentTenantId(stored.tenantId); // restore into module store immediately

    }
    setAppUser(stored);
    setLoading(false);
  }, []);

  // ── Load brand config — depends on appUser so tenant is correct ─────────
  useEffect(() => {
    const realTenantId = appUser?.tenantId;
    if (!realTenantId) return; // wait until user is logged in

    const cacheKey = BRAND_CACHE_KEY + '_' + realTenantId;
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
      try {
        setBrandConfig(JSON.parse(cached));
        return;
      } catch {
        sessionStorage.removeItem(cacheKey);
      }
    }

    // Filter by tenant_id explicitly — never rely on RLS alone for brand config
    supabase
      .from('system_config')
      .select('config_key, config_value')
      .eq('tenant_id', realTenantId)
      .in('config_key', [
        'brand_primary_color',
        'brand_accent_color',
        'brand_logo_url',
        'restaurant_name',
        'brand_theme',
      ])
      .then(({ data }) => {
        if (!data || data.length === 0) return;
        const map: Record<string, string> = {};
        data.forEach((r: { config_key: string; config_value: string }) => {
          map[r.config_key] = r.config_value;
        });
        const config: BrandConfig = {
          primaryColor: map.brand_primary_color || '#1B3A6B',
          accentColor: map.brand_accent_color || '#f59e0b',
          logoUrl: map.brand_logo_url || '',
          restaurantName: map.restaurant_name || '',
          theme: (map.brand_theme as 'dark' | 'light') || 'dark',
        };
        setBrandConfig(config);
        sessionStorage.setItem(cacheKey, JSON.stringify(config));
      });
  // Re-run when tenant changes (e.g. switching restaurants)
  }, [appUser?.tenantId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Sign in: verify PIN against app_users ────────────────────────────────
  const signIn = useCallback(
    async (userId: string, pin: string): Promise<{ error?: string; user?: AppUser }> => {
      if (!userId || !pin) return { error: 'Selecciona un usuario e ingresa el PIN' };

      const { data, error } = await supabase
        .from('app_users')
        .select('id, full_name, app_role, employee_id, tenant_id, branch_id, is_active, pin, auth_user_id')
        .eq('id', userId)
        .single();

      if (error || !data) return { error: 'Usuario no encontrado' };
      if (!data.is_active) return { error: 'Usuario inactivo. Contacta al administrador.' };
      // Support both plain text (legacy) and SHA-256 hashed PINs
      const hashed = await hashPin(pin);
      const pinMatch = data.pin === pin || data.pin === hashed;
      if (!pinMatch) return { error: 'PIN incorrecto' };

      // ── Sign into Supabase Auth so auth.uid() works for RLS ──────────────
      // Each ERP user gets a Supabase Auth account with a stable password
      // derived from their UUID (not their PIN, so PIN changes don't break auth)
      const emailForAuth = `u.${data.id}@aldente.local`;
      const stablePassword = `ald_${data.id}`; // stable, never changes

      let supabaseAuthId: string | null = null;

      // Try sign in with stable password
      const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
        email: emailForAuth,
        password: stablePassword,
      });

      if (!signInErr && signInData?.user) {
        supabaseAuthId = signInData.user.id;
      } else {
        // First time: create the auth account
        const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
          email: emailForAuth,
          password: stablePassword,
          options: { emailRedirectTo: undefined },
        });
        if (!signUpErr && signUpData?.user) {
          supabaseAuthId = signUpData.user.id;
        } else {
          // Try legacy password (PIN) for backwards compatibility
          const { data: legacyData } = await supabase.auth.signInWithPassword({
            email: emailForAuth,
            password: pin,
          });
          if (legacyData?.user) supabaseAuthId = legacyData.user.id;
        }
      }

      // ── Critical: link auth_user_id so RLS get_my_tenant_id() works ──────
      if (supabaseAuthId && supabaseAuthId !== data.auth_user_id) {
        await supabase
          .from('app_users')
          .update({ auth_user_id: supabaseAuthId })
          .eq('id', data.id);
      }

      const user: AppUser = {
        id: data.id,
        username: data.full_name,
        fullName: data.full_name,
        appRole: data.app_role as AppRole,
        employeeId: data.employee_id,
        isActive: data.is_active,
        tenantId: data.tenant_id,
        branchId: data.branch_id ?? null,
        branchName: null,
      };

      saveSession(user);
      setCurrentTenantId(user.tenantId);
      setAppUser(user);

      // Auto check-in: si el empleado tiene employee_id y es su primer acceso del día
      if (user.employeeId && user.tenantId) {
        // Fire-and-forget — no bloquea el login
        import('@/lib/attendanceEngine').then(({ autoCheckIn }) => {
          autoCheckIn(user.employeeId ?? '', user.tenantId ?? '', user.branchId ?? null).catch(() => {});
        });
      }

      return { user };
    },
    [supabase]
  );

  // ── Sign out ─────────────────────────────────────────────────────────────
  const signOut = useCallback(async () => {
    await supabase.auth.signOut().catch(() => { /* ignore */ });
    clearSession();
        setCurrentTenantId(null);
    setAppUser(null);
    // Clear ALL caches on logout — next login gets fresh data for their tenant
    Object.keys(sessionStorage).forEach(k => sessionStorage.removeItem(k));
    setBrandConfig({ primaryColor: '#1B3A6B', accentColor: '#f59e0b', logoUrl: '', restaurantName: '', theme: 'dark' });
  }, [supabase]);

  // ── Admin functions (kept for compatibility) ──────────────────────────────
  const createUser = useCallback(
    async (
      username: string,
      password: string,
      fullName: string,
      role: AppRole,
      employeeId?: string,
      branchId?: string | null,
    ) => {
      const { data, error } = await supabase.functions.invoke('create-app-user', {
        body: {
          username: username.trim().toLowerCase(),
          password,
          fullName,
          role,
          employeeId: employeeId || null,
          tenantId: appUser?.tenantId,
          branchId: branchId || null,
        },
      });
      if (error) throw new Error(error.message || 'Error al crear usuario');
      if (data?.error) throw new Error(data.error);
    },
    [supabase, appUser?.tenantId]
  );

  const updateUserPassword = useCallback(
    async (authUserId: string, newPassword: string) => {
      const { error } = await supabase.functions.invoke('update-user-password', {
        body: { auth_user_id: authUserId, new_password: newPassword },
      });
      if (error) throw error;
    },
    [supabase]
  );

  const listUsers = useCallback(async (): Promise<AppUser[]> => {
    const tenantId = appUser?.tenantId;
    if (!tenantId) return [];
    const { data, error } = await supabase
      .from('app_users')
      .select('*')
      .eq('tenant_id', tenantId)
      .neq('app_role', 'superadmin')
      .order('full_name');
    if (error) throw error;
    return (data || []).map((u: Record<string, unknown>) => ({
      id: u.id as string,
      username: u.username as string,
      fullName: u.full_name as string,
      appRole: u.app_role as AppRole,
      employeeId: u.employee_id as string | null,
      isActive: u.is_active as boolean,
      tenantId: u.tenant_id as string | null,
      branchId: u.branch_id as string | null,
      branchName: null,
    }));
  }, [supabase]);

  const toggleUserActive = useCallback(
    async (userId: string, isActive: boolean) => {
      const { error } = await supabase
        .from('app_users')
        .update({ is_active: isActive })
        .eq('id', userId);
      if (error) throw error;
    },
    [supabase]
  );

  const updateUserRole = useCallback(
    async (userId: string, role: AppRole) => {
      const { error } = await supabase
        .from('app_users')
        .update({ app_role: role })
        .eq('id', userId);
      if (error) throw error;
    },
    [supabase]
  );

  // ── Reload brand config (call after saving logo/name in Config) ─────────
  const reloadBrandConfig = useCallback(async () => {
    const tenantId = appUser?.tenantId;
    if (!tenantId) return;
    // Clear ALL brand caches to avoid stale data from other tenants
    Object.keys(sessionStorage)
      .filter(k => k.startsWith(BRAND_CACHE_KEY))
      .forEach(k => sessionStorage.removeItem(k));
    // Reload from DB — always filter by tenant_id explicitly
    const { data } = await supabase
      .from('system_config')
      .select('config_key, config_value')
      .eq('tenant_id', tenantId)
      .in('config_key', ['brand_primary_color','brand_accent_color','brand_logo_url','restaurant_name','brand_theme']);
    if (!data || data.length === 0) return;
    const map: Record<string,string> = {};
    data.forEach((r: { config_key: string; config_value: string }) => { map[r.config_key] = r.config_value; });
    const config: BrandConfig = {
      primaryColor: map.brand_primary_color || '#1B3A6B',
      accentColor: map.brand_accent_color || '#f59e0b',
      logoUrl: map.brand_logo_url || '',
      restaurantName: map.restaurant_name || '',
      theme: (map.brand_theme as 'dark' | 'light') || 'dark',
    };
    setBrandConfig(config);
    sessionStorage.setItem(BRAND_CACHE_KEY + '_' + tenantId, JSON.stringify(config));
  }, [appUser?.tenantId, supabase]);

  return (
    <AuthContext.Provider
      value={{
        appUser,
        loading,
        brandConfig,
        tenantId: appUser?.tenantId ?? null,
        branchId: appUser?.branchId ?? null,
        reloadBrandConfig,
        signIn,
        signOut,
        createUser,
        updateUserPassword,
        listUsers,
        toggleUserActive,
        updateUserRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;