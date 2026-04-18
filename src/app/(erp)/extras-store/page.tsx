'use client';
import AppLayout from '@/components/AppLayout';
import ExtrasStore from './components/ExtrasStore';
import UpgradeGate from '@/components/UpgradeGate';

export default function ExtrasStorePage() {
  return (
    <AppLayout title="Tienda de Extras" subtitle="Membresías, merch y otros ingresos">
      <UpgradeGate feature="extrasStore" requiredPlan="negocio" title="Tienda de Extras" description="Vende membresías, productos de merch y cualquier cosa fuera del menú. Todo entra al P&L como ingresos adicionales." blurAmount={6}>
        <ExtrasStore />
      </UpgradeGate>
    </AppLayout>
  );
}
