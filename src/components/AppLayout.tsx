'use client';

import React, { useState, useEffect, useRef } from 'react';
import TrialBanner from '@/components/TrialBanner';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase/client';
import { useDevice } from '@/hooks/useDevice';
import Sidebar from './Sidebar';
import { BranchProvider } from '@/contexts/BranchContext';
import Topbar from './Topbar';
import ImpersonationBanner from './ImpersonationBanner';
import OfflineIndicator from './OfflineIndicator';
import HelpDrawer from './HelpDrawer';
import {
  HELP_INVENTARIO, HELP_REPORTES, HELP_PROVEEDORES,
  HELP_MENU, HELP_CONFIGURACION,
} from '@/lib/helpContent';

const ROUTE_HELP: Record<string, any> = {
  '/inventario':    HELP_INVENTARIO,
  '/reportes':      HELP_REPORTES,
  '/proveedores':   HELP_PROVEEDORES,
  '/menu':          HELP_MENU,
  '/configuracion': HELP_CONFIGURACION,
};

interface AppLayoutProps {
  children?: React.ReactNode;
  title: string;
  subtitle?: string;
  headerExtra?: React.ReactNode;
}

export default function AppLayout({ children, title, subtitle, headerExtra }: AppLayoutProps) {
  const pathname = usePathname();
  // Detectar el módulo por la ruta y mostrar el HelpDrawer correspondiente
  const routeKey = Object.keys(ROUTE_HELP).find(k => pathname?.includes(k));
  const autoHelp = routeKey ? ROUTE_HELP[routeKey] : null;
  const { appUser, loading: authLoading } = useAuth();
  const router = useRouter();
  const device = useDevice();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !appUser) {
      router.replace('/login');
    }
  }, [appUser, authLoading, router]);

  // Redirect to onboarding for new tenants (admin only, not yet initialized)
  // Only runs once per mount — avoids race condition when onboarding just finished
  const onboardingChecked = useRef(false);
  useEffect(() => {
    if (authLoading || !appUser) return;
    if (appUser.appRole !== 'admin') return;
    if (typeof window === 'undefined') return;
    if (window.location.pathname.includes('/onboarding')) return;
    if (onboardingChecked.current) return;
    onboardingChecked.current = true;

    const supabase = createClient();
    supabase
      .from('system_config')
      .select('config_value')
      .eq('tenant_id', appUser.tenantId)
      .eq('config_key', 'initialized')
      .single()
      .then(({ data }) => {
        // Only redirect if explicitly 'false' — missing key or 'true' means skip
        if (data?.config_value === 'false') {
          router.replace('/onboarding');
        }
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appUser, authLoading]);

  // Auto-collapse sidebar on tablet/mobile
  useEffect(() => {
    if (device.isTablet || device.isMobile) {
      setSidebarCollapsed(true);
    }
  }, [device.type]);

  // Show spinner while checking auth
  if (authLoading || !appUser) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#0f1923' }}>
        <div className="w-8 h-8 rounded-full border-2 animate-spin"
          style={{ borderColor: 'rgba(245,158,11,0.3)', borderTopColor: '#f59e0b' }} />
      </div>
    );
  }

  return (
    <BranchProvider>
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: '#0a1628' }}>
      <OfflineIndicator />
      {/* Mobile overlay */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`
          fixed lg:relative z-50 lg:z-auto h-full
          transition-transform duration-300 ease-in-out
          ${mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        <Sidebar
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        />
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <ImpersonationBanner />
        <Topbar
          title={title}
          subtitle={subtitle}
          headerExtra={headerExtra ?? (autoHelp ? <HelpDrawer config={autoHelp} /> : undefined)}
          onMenuToggle={() => setMobileSidebarOpen(true)}
        />
        <main className="flex-1 overflow-y-auto scrollbar-thin">
          <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 py-6">
            {children}
          </div>
        </main>
      </div>
    </div>
    <TrialBanner />
    </BranchProvider>
  );
}