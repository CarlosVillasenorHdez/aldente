'use client';

import * as Sentry from '@sentry/nextjs';
import { useState, useEffect } from 'react';

export default function SentryTestPage() {
  const [log, setLog] = useState<string[]>([]);
  const [dsn, setDsn] = useState('');

  useEffect(() => {
    const d = process.env.NEXT_PUBLIC_SENTRY_DSN ?? '';
    setDsn(d ? d.slice(0, 40) + '...' : 'NO CONFIGURADO');
    setLog(prev => [
      ...prev,
      d ? '✅ DSN encontrado' : '❌ NEXT_PUBLIC_SENTRY_DSN no disponible en el cliente',
      `NODE_ENV: ${process.env.NODE_ENV ?? 'undefined'}`,
      `VERCEL_ENV: ${process.env.NEXT_PUBLIC_VERCEL_ENV ?? 'undefined'}`,
      `Supabase URL: ${process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ presente' : '❌ ausente'}`,
      `SENTRY_TEST: ${(process.env as any).NEXT_PUBLIC_SENTRY_TEST ?? '❌ ausente'}`,
    ]);
  }, []);

  const addLog = (msg: string) => setLog(prev => [...prev, msg]);

  const testCapture = () => {
    try {
      addLog('⏳ Enviando error a Sentry...');
      const eventId = Sentry.captureException(
        new Error('Test Aldente ERP — ' + new Date().toISOString())
      );
      addLog(eventId
        ? `✅ Enviado — event ID: ${eventId}`
        : '❌ Sentry.captureException devolvió vacío — Sentry no inicializado');
    } catch (e: any) {
      addLog('❌ Error: ' + e.message);
    }
  };

  const testMessage = () => {
    addLog('⏳ Enviando mensaje...');
    const eventId = Sentry.captureMessage('Test message Aldente — ' + new Date().toISOString(), 'info');
    addLog(eventId ? `✅ Mensaje enviado — ${eventId}` : '❌ No enviado');
  };

  const testUnhandled = () => {
    addLog('⏳ Lanzando error no capturado...');
    setTimeout(() => { throw new Error('Unhandled test — Aldente Sentry'); }, 100);
  };

  const box: React.CSSProperties = {
    background: '#0d1b2a', border: '1px solid #1e2d3d',
    borderRadius: 12, padding: '20px 24px', width: '100%', maxWidth: 560,
  };

  return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center',
      background:'#060d18', flexDirection:'column', gap:16, padding:24 }}>
      <h1 style={{ color:'#f1f5f9', fontSize:20, fontWeight:700 }}>Sentry — Diagnóstico</h1>

      <div style={box}>
        <p style={{ color:'#64748b', fontSize:12, marginBottom:8 }}>DSN configurado:</p>
        <code style={{ color: dsn.includes('NO') ? '#ef4444':'#4ade80', fontSize:11 }}>{dsn}</code>
      </div>

      <div style={{ display:'flex', gap:8, flexWrap:'wrap', justifyContent:'center' }}>
        <button onClick={testCapture} style={{ padding:'10px 18px', borderRadius:8, background:'#2563eb',
          color:'#fff', fontSize:13, fontWeight:600, border:'none', cursor:'pointer' }}>
          captureException
        </button>
        <button onClick={testMessage} style={{ padding:'10px 18px', borderRadius:8, background:'#7c3aed',
          color:'#fff', fontSize:13, fontWeight:600, border:'none', cursor:'pointer' }}>
          captureMessage
        </button>
        <button onClick={testUnhandled} style={{ padding:'10px 18px', borderRadius:8, background:'#dc2626',
          color:'#fff', fontSize:13, fontWeight:600, border:'none', cursor:'pointer' }}>
          Error no capturado
        </button>
      </div>

      <div style={{ ...box, fontFamily:'monospace' }}>
        <p style={{ color:'#475569', fontSize:11, marginBottom:8 }}>Log:</p>
        {log.length === 0
          ? <p style={{ color:'#334155', fontSize:12 }}>Sin actividad aún</p>
          : log.map((l, i) => (
            <p key={i} style={{ color: l.startsWith('✅') ? '#4ade80' : l.startsWith('❌') ? '#ef4444' : '#94a3b8',
              fontSize:12, margin:'2px 0' }}>{l}</p>
          ))}
      </div>

      <p style={{ color:'#334155', fontSize:11, textAlign:'center', maxWidth:400 }}>
        Si el event ID aparece en el log, el error llegó a Sentry.<br/>
        Ve a sentry.io → Issues para confirmarlo.
      </p>
    </div>
  );
}
