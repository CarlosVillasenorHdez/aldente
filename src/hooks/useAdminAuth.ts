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

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user) {
        router.replace('/admin/login');
        return;
      }
      // La verificación de rol superadmin ya la hizo la página de login
      // antes de redirigir. Aquí solo verificamos que haya sesión activa.
      setEmail(session.user.email ?? null);
      setChecking(false);
    });
  }, [router]);

  return { checking, email };
}
