import AppLayout from '@/components/AppLayout';
import FeatureGate from '@/components/FeatureGate';
import GastosManagement from './components/GastosManagement';

export default function GastosPage() {
  return (
    <AppLayout title="Gastos" subtitle="Gastos recurrentes y depreciaciones">
      <FeatureGate feature="gastos" title="Gastos">
      <GastosManagement />
    </FeatureGate>
    </AppLayout>
  );
}