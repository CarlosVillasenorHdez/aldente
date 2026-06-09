'use client';

import AppLayout from '@/components/AppLayout';
import FeatureGate from '@/components/FeatureGate';
import RHManagement from './components/RHManagement';

export default function RecursosHumanosPage() {
  return (
    <AppLayout title="Recursos Humanos" subtitle="Vacaciones y permisos">
      <FeatureGate feature="recursosHumanos" title="Recursos Humanos">
      <RHManagement />
    </FeatureGate>
    </AppLayout>
  );
}