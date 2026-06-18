'use client';
/**
 * ImpersonationBanner — visible solo cuando el superadmin entró a "Ver como
 * cliente" desde el panel admin. Deja claro que NO es tu propia sesión y
 * permite salir de la vista con un clic.
 */
import { useEffect, useState } from 'react';

export default function ImpersonationBanner() {
  const [info, setInfo] = useState<{ tenantName: string } | null>(null);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('aldente_impersonation');
      if (raw) setInfo(JSON.parse(raw));
    } catch { /* noop */ }
  }, []);

  if (!info) return null;

  const exit = () => {
    try {
      sessionStorage.removeItem('aldente_session');
      sessionStorage.removeItem('aldente_impersonation');
    } catch { /* noop */ }
    window.close(); // se abrió en pestaña nueva; si no cierra, va al admin
    window.location.href = '/admin';
  };

  return (
    <div style={{
      position: 'sticky', top: 0, zIndex: 100,
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
      padding: '7px 16px', background: '#7c3aed', color: 'white',
      fontSize: 13, fontWeight: 600,
    }}>
      <span>👁 Estás viendo Aldente como <strong>{info.tenantName}</strong> — modo soporte (superadmin)</span>
      <button onClick={exit} style={{
        padding: '3px 12px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.4)',
        background: 'rgba(255,255,255,0.15)', color: 'white', fontSize: 12, fontWeight: 700, cursor: 'pointer',
      }}>
        Salir de la vista
      </button>
    </div>
  );
}
