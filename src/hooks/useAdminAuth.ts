'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export function useAdminAuth() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session?.user) {
        router.replace('/admin/login');
        return;
      }

      // Verificar que tenga rol superadmin en app_users
      const { data: adminRow } = await supabase
        .from('app_users')
        .select('app_role')
        .eq('auth_user_id', session.user.id)
        .eq('app_role', 'superadmin')
        .maybeSingle();

      if (!adminRow) {
        await supabase.auth.signOut();
        router.replace('/admin/login');
        return;
      }

      setEmail(session.user.email ?? null);
      setChecking(false);
    });
  }, [router]);

  return { checking, email };
}
