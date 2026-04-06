import AppLayout from '@/components/AppLayout';
import POSClient from './components/POSClient';

export default function POSPage() {
  return (
    <AppLayout title="Punto de Venta" subtitle="POS — Gestión de mesas y órdenes">
      <POSClient />
    </AppLayout>
  );
}
