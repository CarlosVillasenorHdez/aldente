'use client';
import AppLayout from '@/components/AppLayout';
import ExtrasStore from './components/ExtrasStore';

export default function ExtrasStorePage() {
  return (
    <AppLayout title="Tienda de Extras" subtitle="Membresías, merch y otros ingresos">
      <ExtrasStore />
    </AppLayout>
  );
}
