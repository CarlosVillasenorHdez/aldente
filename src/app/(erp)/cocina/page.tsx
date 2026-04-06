import AppLayout from '@/components/AppLayout';
import KitchenModule from './components/KitchenModule';

export default function CocinaPage() {
  return (
    <AppLayout title="Cocina" subtitle="KDS — Control de tiempos de preparación">
      <KitchenModule />
    </AppLayout>
  );
}
