'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function AdminGroupLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserEmail(data.user?.email ?? null);
    });
  }, []);

  async function handleSignOut() {
    setSigningOut(true);
    await supabase.auth.signOut();
    router.replace('/admin/login');
  }

  const isLogin = pathname === '/admin/login';
  if (isLogin) return <>{children}</>;

  const navLinks = [
    { href: '/admin',          label: 'Dashboard' },
    { href: '/admin/tenants',  label: 'Restaurantes' },
    { href: '/admin/mrr',      label: 'MRR & Ingresos' },
    { href: '/admin/churn',    label: 'Churn & Trials' },
  ];

  const s = {
    wrap: {
      minHeight: '100vh',
      backgroundColor: '#0a0f1a',
      color: '#f1f5f9',
      fontFamily: 'DM Sans, system-ui, sans-serif',
    } as React.CSSProperties,
    header: {
      borderBottom: '1px solid #1e2d3d',
      padding: '0 24px',
      height: '56px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: '#0d1720',
      position: 'sticky' as const,
      top: 0,
      zIndex: 50,
    },
    logo: { display: 'flex', alignItems: 'center', gap: '10px' } as React.CSSProperties,
    logoIcon: {
      width: '28px', height: '28px', borderRadius: '8px',
      backgroundColor: 'rgba(245,158,11,0.2)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px',
    } as React.CSSProperties,
    nav: { display: 'flex', alignItems: 'center', gap: '4px' } as React.CSSProperties,
    right: { display: 'flex', alignItems: 'center', gap: '16px' } as React.CSSProperties,
  };

  return (
    <div style={s.wrap}>
      <header style={s.header}>
        <div style={s.logo}>
          <div style={s.logoIcon}>🛡</div>
          <span style={{ fontWeight: 700, fontSize: '15px', color: '#f59e0b' }}>Aldente</span>
          <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.25)', marginLeft: '2px' }}>admin</span>
        </div>

        <nav style={s.nav}>
          {navLinks.map(link => {
            const active = pathname === link.href || (link.href !== '/admin' && pathname.startsWith(link.href));
            return (
              <Link key={link.href} href={link.href} style={{
                padding: '6px 14px', borderRadius: '8px', fontSize: '13px', fontWeight: 500,
                textDecoration: 'none',
                color: active ? '#f59e0b' : 'rgba(255,255,255,0.5)',
                backgroundColor: active ? 'rgba(245,158,11,0.1)' : 'transparent',
              }}>
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div style={s.right}>
          {userEmail && (
            <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)', fontFamily: 'monospace' }}>
              {userEmail}
            </span>
          )}
          <button onClick={handleSignOut} disabled={signingOut} style={{
            padding: '6px 14px', borderRadius: '8px', border: '1px solid #2a3f5f',
            backgroundColor: 'transparent', color: 'rgba(255,255,255,0.45)',
            fontSize: '13px', cursor: 'pointer', fontWeight: 500,
          }}>
            {signingOut ? '...' : 'Salir'}
          </button>
        </div>
      </header>

      <main style={{ padding: '32px 24px', maxWidth: '1400px', margin: '0 auto' }}>
        {children}
      </main>
    </div>
  );
}
