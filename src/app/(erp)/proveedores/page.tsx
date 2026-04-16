import AppLayout from '@/components/AppLayout';
import SuppliersManagement from './components/SuppliersManagement';

export default function SuppliersPage() {
  return (
    <AppLayout title="Proveedores" subtitle="Gestión de proveedores y cuenta corriente">
      <SuppliersManagement />
    </AppLayout>
  );
}
