'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useAdminAuth } from '@/hooks/useAdminAuth';

export default function AdminGroupLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const isLogin = pathname === '/admin/login';

  // useAdminAuth handles session check + redirect for all non-login pages
  const { checking, email } = useAdminAuth();

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.replace('/admin/login');
  }

  // Login page renders immediately — no auth check needed
  if (isLogin) return <>{children}</>;

  // Show minimal spinner while checking session (usually < 100ms from cache)
  if (checking) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#0a0f1a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: '28px', height: '28px', borderRadius: '50%', border: '2px solid rgba(245,158,11,0.2)', borderTopColor: '#f59e0b', animation: 'spin 0.7s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  const navLinks = [
    { href: '/admin',         label: 'Dashboard' },
    { href: '/admin/tenants', label: 'Restaurantes' },
    { href: '/admin/mrr',     label: 'MRR & Ingresos' },
    { href: '/admin/churn',   label: 'Churn & Trials' },
  ];

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0a0f1a', color: '#f1f5f9', fontFamily: 'DM Sans, system-ui, sans-serif' }}>
      <header style={{ borderBottom: '1px solid #1e2d3d', padding: '0 24px', height: '56px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#0d1720', position: 'sticky', top: 0, zIndex: 50 }}>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <img src="/assets/images/logo_aldente.png" alt="Aldente" style={{ width: '28px', height: '28px', objectFit: 'contain' }} />
          <span style={{ fontWeight: 700, fontSize: '15px', color: '#f59e0b' }}>Aldente</span>
          <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.25)', marginLeft: '2px' }}>admin</span>
        </div>

        <nav style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          {navLinks.map(link => {
            const active = pathname === link.href || (link.href !== '/admin' && pathname.startsWith(link.href));
            return (
              <Link key={link.href} href={link.href} style={{ padding: '6px 14px', borderRadius: '8px', fontSize: '13px', fontWeight: 500, textDecoration: 'none', color: active ? '#f59e0b' : 'rgba(255,255,255,0.5)', backgroundColor: active ? 'rgba(245,158,11,0.1)' : 'transparent' }}>
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {email && <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)', fontFamily: 'monospace' }}>{email}</span>}
          <button onClick={handleSignOut} style={{ padding: '6px 14px', borderRadius: '8px', border: '1px solid #2a3f5f', backgroundColor: 'transparent', color: 'rgba(255,255,255,0.45)', fontSize: '13px', cursor: 'pointer', fontWeight: 500 }}>
            Salir
          </button>
        </div>
      </header>

      <main style={{ padding: '32px 24px', maxWidth: '1400px', margin: '0 auto' }}>
        {children}
      </main>
    </div>
  );
}
