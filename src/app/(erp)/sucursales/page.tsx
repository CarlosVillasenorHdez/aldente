'use client';
import AppLayout from '@/components/AppLayout';
import SucursalesManagement from './components/SucursalesManagement';
import MultiSucursalAnalytics from './components/MultiSucursalAnalytics';
import { useState } from 'react';
import { useFeatures } from '@/hooks/useFeatures';

type Tab = 'gestion' | 'analitica';

export default function SucursalesPage() {
  const { features } = useFeatures();
  const [tab, setTab] = useState<Tab>('analitica');

  const tabs: { id: Tab; label: string }[] = [
    { id: 'analitica', label: '📊 Análisis multisucursal' },
    { id: 'gestion',   label: '🏢 Gestión de sucursales' },
  ];

  return (
    <AppLayout title="Multi-Sucursal" subtitle="Gestión y análisis de todas tus sucursales">
      <div className="space-y-4">
        {/* Tab bar */}
        <div style={{ display: 'flex', gap: 8, borderBottom: '1px solid rgba(0,0,0,.08)', paddingBottom: 0 }}>
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              style={{
                padding: '8px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                borderBottom: `2px solid ${tab === t.id ? '#c9963a' : 'transparent'}`,
                color: tab === t.id ? '#c9963a' : 'rgba(0,0,0,.4)',
                background: 'transparent', border: 'none',
                transition: 'all .15s',
              }}>
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'analitica' && <MultiSucursalAnalytics />}
        {tab === 'gestion'   && <SucursalesManagement />}
      </div>
    </AppLayout>
  );
}
