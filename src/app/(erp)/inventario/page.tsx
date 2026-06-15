'use client';

import { useState, useEffect } from 'react';
import AppLayout from '@/components/AppLayout';
import FeatureGate from '@/components/FeatureGate';
import InventarioManagement from './components/InventarioManagement';
import InventarioSimple from './components/InventarioSimple';
import InventarioMobile from './components/InventarioMobile';
import MobileGate from '@/components/MobileGate';
import { Sparkles, SlidersHorizontal } from 'lucide-react';

export default function InventarioPage() {
  const [mode, setMode] = useState<'simple' | 'avanzado'>('simple');

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem('inv_mode');
      if (saved === 'avanzado' || saved === 'simple') setMode(saved);
    } catch { /* noop */ }
  }, []);

  const setModeP = (m: 'simple' | 'avanzado') => {
    setMode(m);
    try { window.localStorage.setItem('inv_mode', m); } catch { /* noop */ }
  };

  const toggle = (
    <div style={{ display: 'flex', gap: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 10, padding: 3 }}>
      <button onClick={() => setModeP('simple')}
        style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer',
          background: mode === 'simple' ? '#f59e0b' : 'transparent', color: mode === 'simple' ? '#1B3A6B' : 'rgba(255,255,255,0.5)' }}>
        <Sparkles size={13} /> Simple
      </button>
      <button onClick={() => setModeP('avanzado')}
        style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer',
          background: mode === 'avanzado' ? '#60a5fa' : 'transparent', color: mode === 'avanzado' ? '#0f1e38' : 'rgba(255,255,255,0.5)' }}>
        <SlidersHorizontal size={13} /> Avanzado
      </button>
    </div>
  );

  return (
    <AppLayout title="Inventario" subtitle="Control de insumos" headerExtra={toggle}>
      <FeatureGate feature="inventario" title="Inventario">
        <MobileGate
          mobile={<InventarioMobile />}
          desktop={mode === 'simple' ? <InventarioSimple /> : <InventarioManagement />}
        />
      </FeatureGate>
    </AppLayout>
  );
}
