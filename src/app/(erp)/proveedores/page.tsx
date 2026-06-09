import AppLayout from '@/components/AppLayout';
import FeatureGate from '@/components/FeatureGate';
import SuppliersManagement from './components/SuppliersManagement';

export default function SuppliersPage() {
  return (
    <AppLayout title="Proveedores" subtitle="Gestión de proveedores y cuenta corriente">
      <FeatureGate feature="gastos" title="Proveedores">
      <SuppliersManagement />
    </FeatureGate>
    </AppLayout>
  );
}
