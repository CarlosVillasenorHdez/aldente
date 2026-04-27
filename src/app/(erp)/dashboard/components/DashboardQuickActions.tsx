'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { getCurrentTenantId as getTenantId } from '@/lib/tenantStore';
import {
  ShoppingCart, ChefHat, Package, Calendar,
  AlertTriangle, CheckCircle, Clock
} from 'lucide-react';

interface Counts {
  ordenesListas: number;
  stockCritico: number;
  reservasHoy: number;
  ordenesAbiertas: number;
}

export default function DashboardQuickActions() {
  const supabase = createClient();
  const [counts, setCounts] = useState<Counts>({
    ordenesListas: 0, stockCritico: 0, reservasHoy: 0, ordenesAbiertas: 0,
  });

  useEffect(() => {
    const load = async () => {
      const tid = getTenantId();
      const hoy = new Date(); hoy.setHours(0,0,0,0);
      const manana = new Date(hoy); manana.setDate(manana.getDate() + 1);

      const [
        { count: listas },
        { count: critico },
        { count: reservas },
        { count: abiertas },
      ] = await Promise.all([
        supabase.from('orders').select('id', { count: 'exact', head: true })
          .eq('tenant_id', tid).eq('kitchen_status', 'lista').eq('is_comanda', true).neq('status', 'cancelada'),
        supabase.from('ingredients').select('id', { count: 'exact', head: true })
          .eq('tenant_id', tid).filter('stock', 'lte', 'min_stock').gt('min_stock', 0),
        supabase.from('reservations').select('id', { count: 'exact', head: true })
          .eq('tenant_id', tid).in('status', ['confirmada', 'pendiente'])
          .gte('reserved_for', hoy.toISOString()).lt('reserved_for', manana.toISOString()),
        supabase.from('orders').select('id', { count: 'exact', head: true })
          .eq('tenant_id', tid).eq('status', 'abierta').eq('is_comanda', false),
      ]);

      setCounts({
        ordenesListas: listas ?? 0,
        stockCritico:  critico ?? 0,
        reservasHoy:   reservas ?? 0,
        ordenesAbiertas: abiertas ?? 0,
      });
    };
    load();
  }, [supabase]);

  const actions = [
    {
      href:    '/pos-punto-de-venta',
      label:   'Punto de Venta',
      icon:    ShoppingCart,
      primary: true,
      badge:   null,
      color:   '#1B3A6B',
    },
    {
      href:    '/cocina',
      label:   'Cocina',
      icon:    ChefHat,
      primary: false,
      badge:   counts.ordenesListas > 0 ? counts.ordenesListas : null,
      badgeColor: '#22c55e',
      badgeTitle: `${counts.ordenesListas} orden${counts.ordenesListas > 1 ? 'es' : ''} lista${counts.ordenesListas > 1 ? 's' : ''} para servir`,
      color:   counts.ordenesListas > 0 ? '#15803d' : undefined,
    },
    {
      href:    '/inventario',
      label:   'Inventario',
      icon:    Package,
      primary: false,
      badge:   counts.stockCritico > 0 ? counts.stockCritico : null,
      badgeColor: '#ef4444',
      badgeTitle: `${counts.stockCritico} ingrediente${counts.stockCritico > 1 ? 's' : ''} con stock crítico`,
      color:   counts.stockCritico > 0 ? '#dc2626' : undefined,
    },
    {
      href:    '/reservaciones',
      label:   'Reservaciones',
      icon:    Calendar,
      primary: false,
      badge:   counts.reservasHoy > 0 ? counts.reservasHoy : null,
      badgeColor: '#3b82f6',
      badgeTitle: `${counts.reservasHoy} reserva${counts.reservasHoy > 1 ? 's' : ''} hoy`,
      color:   undefined,
    },
  ];

  return (
    <div className="flex flex-wrap items-center gap-3">
      {actions.map(action => {
        const Icon = action.icon;
        return (
          <Link key={action.href} href={action.href}>
            <button
              className="relative flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-90 active:scale-95"
              style={{
                backgroundColor: action.primary ? '#1B3A6B' : 'white',
                color:           action.color ?? (action.primary ? '#f59e0b' : '#374151'),
                border:          action.primary ? 'none' : '1px solid #e5e7eb',
                boxShadow:       action.primary ? '0 2px 8px rgba(27,58,107,0.3)' : '0 1px 3px rgba(0,0,0,0.08)',
              }}
              title={action.badgeTitle}
            >
              <Icon size={16} />
              {action.label}
              {action.badge !== null && action.badge !== undefined && (
                <span
                  className="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 px-1 rounded-full text-xs font-bold text-white flex items-center justify-center"
                  style={{ backgroundColor: action.badgeColor }}
                >
                  {action.badge}
                </span>
              )}
            </button>
          </Link>
        );
      })}

      {/* Indicador de órdenes abiertas */}
      {counts.ordenesAbiertas > 0 && (
        <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm"
          style={{ backgroundColor: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}>
          <Clock size={13} className="text-amber-500" />
          <span className="text-amber-700 font-medium">
            {counts.ordenesAbiertas} mesa{counts.ordenesAbiertas > 1 ? 's' : ''} activa{counts.ordenesAbiertas > 1 ? 's' : ''}
          </span>
        </div>
      )}
    </div>
  );
}
