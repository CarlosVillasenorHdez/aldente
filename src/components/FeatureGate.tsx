'use client';
/**
 * FeatureGate — Protege una ruta completa según el plan contratado.
 *
 * A diferencia de UpgradeGate (que difumina contenido), este intercepta
 * el acceso directo por URL. Si el cliente no tiene el feature activo en
 * su plan, muestra una pantalla de upgrade en lugar del módulo.
 *
 * Uso en page.tsx:
 *   <FeatureGate feature="inventario" title="Inventario" description="...">
 *     <InventarioManagement />
 *   </FeatureGate>
 */
import React from 'react';
import { Zap, ArrowRight, Lock } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useFeatures, type Features, MODULE_CATALOG } from '@/hooks/useFeatures';

interface FeatureGateProps {
  feature: keyof Features;
  title: string;
  description?: string;
  children: React.ReactNode;
}

export default function FeatureGate({ feature, title, description, children }: FeatureGateProps) {
  const { features, plan, loading } = useFeatures();
  const router = useRouter();

  // Mientras carga, no mostramos nada (evita flash del contenido bloqueado)
  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div style={{ width: 32, height: 32, borderRadius: '50%', border: '2px solid rgba(245,158,11,0.3)', borderTopColor: '#f59e0b', animation: 'spin 1s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // Si tiene acceso, renderiza el módulo normal
  if (features[feature]) return <>{children}</>;

  // Sin acceso — pantalla de upgrade
  const mod = MODULE_CATALOG.find(m => m.key === feature);
  const moduleDesc = description ?? mod?.desc ?? '';
  const modulePrice = mod?.price ?? 0;

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '70vh', padding: 24 }}>
      <div style={{
        textAlign: 'center', maxWidth: 440, padding: '40px 36px',
        background: '#162d55', border: '1px solid #243f72', borderRadius: 20,
      }}>
        <div style={{
          width: 64, height: 64, borderRadius: 18, margin: '0 auto 20px',
          background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Lock size={28} color="#f59e0b" />
        </div>

        <h2 style={{ fontSize: 20, fontWeight: 700, color: 'white', margin: '0 0 10px' }}>
          {title} no está en tu plan
        </h2>
        <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.55)', lineHeight: 1.6, margin: '0 0 8px' }}>
          {moduleDesc}
        </p>
        {mod && (
          <p style={{ fontSize: 13, color: '#f59e0b', fontWeight: 600, margin: '0 0 24px' }}>
            {mod.icon} Disponible desde ${modulePrice.toLocaleString('es-MX')}/mes como módulo individual
          </p>
        )}

        <button
          onClick={() => router.push('/configuracion?section=plan')}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '12px 28px', borderRadius: 12, border: 'none',
            background: '#f59e0b', color: '#1B3A6B', fontSize: 14,
            fontWeight: 700, cursor: 'pointer',
          }}>
          <Zap size={16} />
          Activar {title}
          <ArrowRight size={15} />
        </button>

        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', marginTop: 16 }}>
          Plan actual: <strong style={{ color: 'rgba(255,255,255,0.6)' }}>{plan}</strong>
        </p>
      </div>
    </div>
  );
}
