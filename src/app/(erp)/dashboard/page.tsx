import React from 'react';
import AppLayout from '@/components/AppLayout';
import DashboardKPIs from './components/DashboardKPIs';
import SalesChart from './components/SalesChart';
import RecentOrders from './components/RecentOrders';
import DashboardQuickActions from './components/DashboardQuickActions';
import AlertsPanel from './components/AlertsPanel';
import LiveOperations from './components/LiveOperations';
import RecentActivity from './components/RecentActivity';
import UpgradeGate from '@/components/UpgradeGate';

export default function DashboardPage() {
  return (
    <AppLayout
      title="Dashboard"
      subtitle="Resumen operativo del día"
    >
      <div className="flex flex-col gap-6">

        {/* Quick actions — always visible */}
        <DashboardQuickActions />

        {/* Live operations — always visible (POS is in all plans) */}
        <LiveOperations />

        {/* KPI Bento Grid — always visible, but inventory KPI is gated inside */}
        <DashboardKPIs />

        {/* Charts + Alerts row */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2">
            {/* Sales chart — always visible */}
            <SalesChart />
          </div>
          <div className="xl:col-span-1 flex flex-col gap-6">
            {/* Alerts panel — gated: stock alerts need inventario */}
            <UpgradeGate
              feature="alarmas"
              requiredPlan="negocio"
              title="Alertas inteligentes"
              description="Stock bajo, órdenes demoradas, mesas sin atender. Recibe avisos en tiempo real antes de que afecten tu servicio."
              blurAmount={5}
            >
              <AlertsPanel />
            </UpgradeGate>

            {/* Recent activity — always visible */}
            <RecentActivity />
          </div>
        </div>

        {/* Recent orders — always visible */}
        <RecentOrders />
      </div>
    </AppLayout>
  );
}
