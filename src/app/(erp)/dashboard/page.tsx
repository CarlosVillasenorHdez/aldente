import React from 'react';
import AppLayout from '@/components/AppLayout';
import DashboardKPIs from './components/DashboardKPIs';
import FirstStepsChecklist from './components/FirstStepsChecklist';
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
      <div className="flex flex-col gap-5">

        {/* 1. Primeros pasos — solo visible si faltan cosas */}
        <FirstStepsChecklist />

        {/* 2. Acciones rápidas */}
        <DashboardQuickActions />

        {/* 3. KPIs — ventas, equilibrio, margen */}
        <DashboardKPIs />

        {/* 4. Operaciones en vivo + alertas */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
          <div className="xl:col-span-2">
            <LiveOperations />
          </div>
          <div className="xl:col-span-1">
            <UpgradeGate
              feature="alarmas"
              requiredPlan="negocio"
              title="Alertas inteligentes"
              description="Stock bajo, órdenes demoradas, mesas sin atender."
              blurAmount={5}
            >
              <AlertsPanel />
            </UpgradeGate>
          </div>
        </div>

        {/* 5. Gráfica de ventas + actividad reciente */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
          <div className="xl:col-span-2">
            <SalesChart />
          </div>
          <div className="xl:col-span-1">
            <RecentActivity />
          </div>
        </div>

        {/* 6. Órdenes del día */}
        <RecentOrders />

      </div>
    </AppLayout>
  );
}
