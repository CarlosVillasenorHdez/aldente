'use client';

import { useState, useEffect } from 'react';
import AppLayout from '@/components/AppLayout';
import FeatureGate from '@/components/FeatureGate';
import InventarioManagement from './components/InventarioManagement';
import InventarioSimple from './components/InventarioSimple';
import InventarioMobile from './components/InventarioMobile';
import MobileGate from '@/components/MobileGate';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase/client';
import { getCurrentTenantId as getTenantId } from '@/lib/tenantStore';
import { Sparkles, SlidersHorizontal } from 'lucide-react';
import { toast } from 'sonner';

export default function InventarioPage() {
  const { appUser } = useAuth();
  const supabase = createClient();
  // El modo es a nivel RESTAURANTE (no por dispositivo). Lo define el dueño.
  const [mode, setMode] = useState<'simple' | 'avanzado'>('simple');
  const [loaded, setLoaded] = useState(false);

  // Solo dueño/gerente pueden cambiar el modo
  const canChangeMode = appUser?.appRole === 'admin' || appUser?.appRole === 'gerente';

  useEffect(() => {
    const tid = getTenantId();
    if (!tid) { setLoaded(true); return; }
    supabase.from('system_config').select('config_value')
      .eq('tenant_id', tid).eq('config_key', 'inventory_mode').maybeSingle()
      .then(({ data }) => {
        if (data?.config_value === 'avanzado' || data?.config_value === 'simple') {
          setMode(data.config_value);
        }
        setLoaded(true);
      });
  }, [supabase]);

  const changeMode = async (m: 'simple' | 'avanzado') => {
    setMode(m);
    const tid = getTenantId();
    if (!tid) return;
    try {
      const { error } = await supabase.from('system_config').upsert(
        { tenant_id: tid, config_key: 'inventory_mode', config_value: m, description: 'Modo de inventario del restaurante' },
        { onConflict: 'tenant_id,config_key' }
      );
      if (error) { toast.error('No se pudo guardar el modo: ' + error.message); return; }
      toast.success(m === 'simple' ? 'Modo Simple activado' : 'Modo Avanzado activado');
    } catch (e: any) {
      toast.error('Error: ' + e.message);
    }
  };

  const toggle = canChangeMode ? (
    <div style={{ display: 'flex', gap: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 10, padding: 3 }}>
      <button onClick={() => changeMode('simple')}
        style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer',
          background: mode === 'simple' ? '#f59e0b' : 'transparent', color: mode === 'simple' ? '#1B3A6B' : 'rgba(255,255,255,0.5)' }}>
        <Sparkles size={13} /> Simple
      </button>
      <button onClick={() => changeMode('avanzado')}
        style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer',
          background: mode === 'avanzado' ? '#60a5fa' : 'transparent', color: mode === 'avanzado' ? '#0f1e38' : 'rgba(255,255,255,0.5)' }}>
        <SlidersHorizontal size={13} /> Avanzado
      </button>
    </div>
  ) : undefined;

  return (
    <AppLayout title="Inventario" subtitle="Control de insumos" headerExtra={toggle}>
      <FeatureGate feature="inventario" title="Inventario">
        <MobileGate
          mobile={<InventarioMobile />}
          desktop={!loaded ? <div style={{ padding: 40, textAlign: 'center', color: 'rgba(255,255,255,0.4)' }}>Cargando...</div> : mode === 'simple' ? <InventarioSimple /> : <InventarioManagement />}
        />
      </FeatureGate>
    </AppLayout>
  );
}
