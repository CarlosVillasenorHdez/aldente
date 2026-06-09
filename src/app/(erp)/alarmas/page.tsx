'use client';

import AppLayout from '@/components/AppLayout';
import FeatureGate from '@/components/FeatureGate';
import AlarmasManagement from './components/AlarmasManagement';

export default function AlarmasPage() {
  return (
    <AppLayout title="Alarmas" subtitle="Alertas del sistema">
      <FeatureGate feature="alarmas" title="Alarmas">
      <AlarmasManagement />
    </FeatureGate>
    </AppLayout>
  );
}