'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

/**
 * useAdminAuth — protects admin pages client-side.
 * Checks Supabase Auth session. If no session → redirect to /admin/login.
 * Much faster than middleware: no extra network round-trip on every request.
 */
export function useAdminAuth() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.replace('/admin/login');
      } else {
        setEmail(session.user.email ?? null);
        setChecking(false);
      }
    });
  }, [router]);

  return { checking, email };
}
