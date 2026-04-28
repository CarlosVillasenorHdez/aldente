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
import AttendanceWidget from './components/AttendanceWidget';
import UpgradeGate from '@/components/UpgradeGate';
import AhaMomentTour from './components/AhaMomentTour';

export default function DashboardPage() {
  return (
    <AppLayout
      title="Dashboard"
      subtitle="Tu restaurante en números reales — para que dirijas el negocio, no el caos."
    >
      <div className="flex flex-col gap-5">

        {/* 0. Aha Moment Tour — solo la primera vez, post-onboarding */}
        <AhaMomentTour />

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

        {/* 5. Asistencia + Gráfica de ventas + actividad reciente */}
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-5">
          <div className="xl:col-span-1">
            <AttendanceWidget />
          </div>
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
