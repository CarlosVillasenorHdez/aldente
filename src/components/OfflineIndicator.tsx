'use client';

import { useOfflineResilience } from '@/hooks/useOfflineResilience';
import { WifiOff } from 'lucide-react';

export default function OfflineIndicator() {
  const { isOnline, pendingCount } = useOfflineResilience();

  if (isOnline && pendingCount === 0) return null;

  return (
    <div style={{
      position: 'fixed', bottom: '16px', left: '50%', transform: 'translateX(-50%)',
      zIndex: 9999, display: 'flex', alignItems: 'center', gap: '8px',
      padding: '10px 18px', borderRadius: '12px',
      backgroundColor: isOnline ? '#1a2535' : '#7f1d1d',
      border: `1px solid ${isOnline ? '#f59e0b' : '#ef4444'}`,
      color: isOnline ? '#f59e0b' : '#fca5a5',
      fontSize: '13px', fontWeight: 600,
      boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
      pointerEvents: 'none',
    }}>
      <WifiOff size={14} />
      {isOnline
        ? `Reconectado — ${pendingCount} operación${pendingCount !== 1 ? 'es' : ''} pendiente${pendingCount !== 1 ? 's' : ''}`
        : 'Sin conexión — las órdenes se guardarán al reconectar'}
    </div>
  );
}
