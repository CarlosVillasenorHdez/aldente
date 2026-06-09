'use client';
import AppLayout from '@/components/AppLayout';
import FeatureGate from '@/components/FeatureGate';
import ReservacionesManagement from './components/ReservacionesManagement';

export default function ReservacionesPage() {
  return (
    <AppLayout title="Reservaciones" subtitle="Calendario de reservas y lista de espera">
      <FeatureGate feature="reservaciones" title="Reservaciones">
      <ReservacionesManagement />
    </FeatureGate>
    </AppLayout>
  );
}
