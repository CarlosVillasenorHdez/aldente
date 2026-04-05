'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { LayoutDashboard, ShoppingBag, UtensilsCrossed, Users, BarChart3, Settings, ChefHat, ChevronLeft, ChevronRight, X, CreditCard, Package, LogOut,  } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface NavItem {
  id: string;
  label: string;
  href: string;
  icon: React.ReactNode;
  badge?: number;
  group: string;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'nav-dashboard', label: 'Dashboard', href: '/dashboard', icon: <LayoutDashboard size={18} />, group: 'operaciones' },
  { id: 'nav-ordenes', label: 'Órdenes', href: '/ordenes', icon: <ShoppingBag size={18} />, badge: 7, group: 'operaciones' },
  { id: 'nav-mesas', label: 'Mesas', href: '/mesas', icon: <UtensilsCrossed size={18} />, group: 'operaciones' },
  { id: 'nav-cocina', label: 'Cocina', href: '/cocina', icon: <ChefHat size={18} />, badge: 3, group: 'operaciones' },
  { id: 'nav-pagos', label: 'Pagos y Caja', href: '/pagos', icon: <CreditCard size={18} />, group: 'finanzas' },
  { id: 'nav-reportes', label: 'Reportes', href: '/reportes', icon: <BarChart3 size={18} />, group: 'finanzas' },
  { id: 'nav-menu', label: 'Menú', href: '/menu', icon: <Package size={18} />, group: 'configuracion' },
  { id: 'nav-personal', label: 'Personal', href: '/personal', icon: <Users size={18} />, group: 'configuracion' },
  { id: 'nav-configuracion', label: 'Configuración', href: '/configuracion', icon: <Settings size={18} />, group: 'configuracion' },
];

const GROUP_LABELS: Record<string, string> = {
  operaciones: 'Operaciones',
  finanzas: 'Finanzas',
  configuracion: 'Configuración',
};

interface SidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
}

export default function Sidebar({ collapsed, onToggleCollapse, mobileOpen, onMobileClose }: SidebarProps) {
  const pathname = usePathname();
  const { appUser, signOut } = useAuth();

  const roleLabel: Record<string, string> = {
    admin: 'Administrador', gerente: 'Gerente', cajero: 'Cajero',
    mesero: 'Mesero', cocinero: 'Cocinero', ayudante_cocina: 'Ayudante de Cocina',
  };

  const groups = ['operaciones', 'finanzas', 'configuracion'];

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className="hidden lg:flex flex-col flex-shrink-0 sticky top-0 h-screen transition-all duration-300 ease-in-out"
        style={{
          width: collapsed ? 64 : 240,
          backgroundColor: '#111e2e',
          borderRight: '1px solid #1e3050',
        }}
      >
        {/* Logo */}
        <div className="flex items-center px-4 py-4 flex-shrink-0"
          style={{ borderBottom: '1px solid #1e3050', minHeight: 64 }}>
          <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)' }}>
            <ChefHat size={16} style={{ color: '#f59e0b' }} />
          </div>
          {!collapsed && (
            <span className="ml-3 text-base font-bold text-white whitespace-nowrap overflow-hidden transition-all duration-300">
              Aldente
            </span>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden py-3 px-2">
          {groups.map(group => {
            const items = NAV_ITEMS.filter(n => n.group === group);
            return (
              <div key={`group-${group}`} className="mb-4">
                {!collapsed && (
                  <p className="px-2 mb-1 text-xs font-semibold uppercase tracking-widest"
                    style={{ color: 'rgba(255,255,255,0.25)' }}>
                    {GROUP_LABELS[group]}
                  </p>
                )}
                {items.map(item => {
                  const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                  return (
                    <Link
                      key={item.id}
                      href={item.href}
                      title={collapsed ? item.label : undefined}
                      className="flex items-center gap-3 px-2 py-2.5 rounded-xl mb-0.5 transition-all duration-150 group relative"
                      style={{
                        backgroundColor: isActive ? 'rgba(245,158,11,0.12)' : 'transparent',
                        color: isActive ? '#f59e0b' : 'rgba(255,255,255,0.5)',
                      }}
                    >
                      <span className="flex-shrink-0"
                        style={{ color: isActive ? '#f59e0b' : 'rgba(255,255,255,0.45)' }}>
                        {item.icon}
                      </span>
                      {!collapsed && (
                        <span className="text-sm font-medium whitespace-nowrap flex-1 transition-all duration-300">
                          {item.label}
                        </span>
                      )}
                      {!collapsed && item.badge && (
                        <span className="text-xs font-bold px-1.5 py-0.5 rounded-full tabular-nums"
                          style={{ backgroundColor: 'rgba(239,68,68,0.2)', color: '#f87171' }}>
                          {item.badge}
                        </span>
                      )}
                      {collapsed && item.badge && (
                        <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500" />
                      )}
                      {/* Tooltip when collapsed */}
                      {collapsed && (
                        <span className="absolute left-full ml-3 px-2 py-1 rounded-lg text-xs font-semibold whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-150 z-50"
                          style={{ backgroundColor: '#0f1923', border: '1px solid #2a3f5f', color: 'rgba(255,255,255,0.8)' }}>
                          {item.label}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            );
          })}
        </nav>

        {/* User + collapse toggle */}
        <div className="flex-shrink-0 px-2 py-3" style={{ borderTop: '1px solid #1e3050' }}>
          {!collapsed && appUser && (
            <div className="flex items-center gap-2 px-2 py-2 mb-2 rounded-xl"
              style={{ backgroundColor: 'rgba(255,255,255,0.03)' }}>
              <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold"
                style={{ backgroundColor: 'rgba(245,158,11,0.2)', color: '#f59e0b' }}>
                {appUser.fullName.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-white truncate">{appUser.fullName}</p>
                <p className="text-xs truncate" style={{ color: 'rgba(255,255,255,0.35)' }}>
                  {roleLabel[appUser.appRole] ?? appUser.appRole}
                </p>
              </div>
              <button onClick={signOut} title="Cerrar sesión"
                className="p-1 rounded-lg transition-all hover:opacity-70"
                style={{ color: 'rgba(255,255,255,0.3)' }}>
                <LogOut size={13} />
              </button>
            </div>
          )}
          <button
            onClick={onToggleCollapse}
            className="w-full flex items-center justify-center py-2 rounded-xl transition-all hover:opacity-70"
            style={{ backgroundColor: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.35)' }}
            aria-label={collapsed ? 'Expandir sidebar' : 'Colapsar sidebar'}
          >
            {collapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
          </button>
        </div>
      </aside>

      {/* Mobile drawer */}
      <aside
        className="fixed inset-y-0 left-0 z-30 flex flex-col lg:hidden transition-transform duration-300 ease-in-out"
        style={{
          width: 260,
          backgroundColor: '#111e2e',
          borderRight: '1px solid #1e3050',
          transform: mobileOpen ? 'translateX(0)' : 'translateX(-100%)',
        }}
      >
        <div className="flex items-center justify-between px-4 py-4" style={{ borderBottom: '1px solid #1e3050' }}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)' }}>
              <ChefHat size={16} style={{ color: '#f59e0b' }} />
            </div>
            <span className="text-base font-bold text-white">Aldente</span>
          </div>
          <button onClick={onMobileClose} className="p-1.5 rounded-lg"
            style={{ color: 'rgba(255,255,255,0.4)' }} aria-label="Cerrar menú">
            <X size={16} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-3 px-2">
          {groups.map(group => {
            const items = NAV_ITEMS.filter(n => n.group === group);
            return (
              <div key={`mobile-group-${group}`} className="mb-4">
                <p className="px-2 mb-1 text-xs font-semibold uppercase tracking-widest"
                  style={{ color: 'rgba(255,255,255,0.25)' }}>
                  {GROUP_LABELS[group]}
                </p>
                {items.map(item => {
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={`mobile-${item.id}`}
                      href={item.href}
                      onClick={onMobileClose}
                      className="flex items-center gap-3 px-2 py-2.5 rounded-xl mb-0.5 transition-all duration-150"
                      style={{
                        backgroundColor: isActive ? 'rgba(245,158,11,0.12)' : 'transparent',
                        color: isActive ? '#f59e0b' : 'rgba(255,255,255,0.5)',
                      }}
                    >
                      <span style={{ color: isActive ? '#f59e0b' : 'rgba(255,255,255,0.45)' }}>
                        {item.icon}
                      </span>
                      <span className="text-sm font-medium flex-1">{item.label}</span>
                      {item.badge && (
                        <span className="text-xs font-bold px-1.5 py-0.5 rounded-full"
                          style={{ backgroundColor: 'rgba(239,68,68,0.2)', color: '#f87171' }}>
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            );
          })}
        </nav>

        {appUser && (
          <div className="px-2 py-3" style={{ borderTop: '1px solid #1e3050' }}>
            <div className="flex items-center gap-2 px-2 py-2 rounded-xl"
              style={{ backgroundColor: 'rgba(255,255,255,0.03)' }}>
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                style={{ backgroundColor: 'rgba(245,158,11,0.2)', color: '#f59e0b' }}>
                {appUser.fullName.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-white truncate">{appUser.fullName}</p>
                <p className="text-xs truncate" style={{ color: 'rgba(255,255,255,0.35)' }}>
                  {appUser.appRole}
                </p>
              </div>
              <button onClick={signOut} className="p-1 rounded-lg" style={{ color: 'rgba(255,255,255,0.3)' }}>
                <LogOut size={13} />
              </button>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}