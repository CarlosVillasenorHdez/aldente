'use client';

import AppLayout from '@/components/AppLayout';
import InventarioManagement from './components/InventarioManagement';
import InventarioMobile from './components/InventarioMobile';
import MobileGate from '@/components/MobileGate';

export default function InventarioPage() {
  return (
    <AppLayout title="Inventario" subtitle="Control de ingredientes y stock">
      <MobileGate
        mobile={<InventarioMobile />}
        desktop={<InventarioManagement />}
      />
    </AppLayout>
  );
}