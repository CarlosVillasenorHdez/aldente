'use client';
import AppLayout from '@/components/AppLayout';
import FeatureGate from '@/components/FeatureGate';
import DeliveryManagement from './components/DeliveryManagement';

export default function DeliveryPage() {
  return (
    <AppLayout title="Delivery" subtitle="Pedidos externos de plataformas de entrega">
      <FeatureGate feature="delivery" title="Delivery">
      <DeliveryManagement />
    </FeatureGate>
    </AppLayout>
  );
}
