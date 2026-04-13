import { createClient as createSupabaseClient } from '@supabase/supabase-js';

export function wipeAuthStorage() {
  if (typeof window === 'undefined') return;
  try {
    Object.keys(localStorage)
      .filter((k) => k.startsWith('sb_') || k.startsWith('sb-') || k.toLowerCase().startsWith('supabase'))
      .forEach((k) => localStorage.removeItem(k));
  } catch { /* SSR */ }
  try {
    document.cookie.split(';').forEach((c) => {
      const name = c.trim().split('=')[0].trim();
      if (name.startsWith('sb-') || name.startsWith('sb_') || name.toLowerCase().startsWith('supabase')) {
        document.cookie = name + '=; Path=/; Max-Age=0; SameSite=None; Secure';
        document.cookie = name + '=; Path=/; Max-Age=0';
      }
    });
  } catch { /* SSR */ }
}

export const clearSupabaseSession = wipeAuthStorage;

function createNewClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: false,
        detectSessionInUrl: false,
        storageKey: 'aldente_auth',
      },
    }
  );
}

type SupabaseClient = ReturnType<typeof createNewClient>;
declare global { interface Window { __aldente_supabase?: SupabaseClient; } }

export function createClient(): SupabaseClient {
  if (typeof window !== 'undefined') {
    if (!window.__aldente_supabase) {
      window.__aldente_supabase = createNewClient();
    }
    return window.__aldente_supabase;
  }
  return createNewClient();
}
/**
 * Establece el tenant_id en la sesión de Supabase para que RLS funcione.
 * DEBE llamarse después de cada login y al restaurar sesión.
 * Las políticas RLS usan current_setting('app.tenant_id') para filtrar.
 */
export async function setSupabaseTenantContext(
  supabase: ReturnType<typeof createNewClient>,
  tenantId: string
): Promise<void> {
  if (!tenantId) return;
  try {
    await supabase.rpc('set_tenant_context', { p_tenant_id: tenantId });
  } catch {
    // Silencioso: compatibilidad si la migración RLS no se ha aplicado aún
  }
}
