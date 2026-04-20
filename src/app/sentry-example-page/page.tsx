'use client';

import { useEffect, useState } from 'react';

const SENTRY_DSN = 'https://c484992d71784b7a0f6fd00c75d2078a@o4511253102788608.ingest.us.sentry.io/4511254691512320';

export default function SentryTestPage() {
  const [log, setLog] = useState<string[]>([]);

  const add = (msg: string) => setLog(prev => [...prev, msg]);

  useEffect(() => {
    add(`NODE_ENV: ${process.env.NODE_ENV}`);
    add(`DSN hardcodeado: ${SENTRY_DSN.slice(0, 50)}...`);
  }, []);

  const testFetch = async () => {
    add('⏳ Enviando evento directo a la API de Sentry...');
    try {
      // Enviar evento directo a la API de Sentry sin SDK
      const projectId = '4511254691512320';
      const key = 'c484992d71784b7a0f6fd00c75d2078a';
      const url = `https://o4511253102788608.ingest.us.sentry.io/api/${projectId}/envelope/`;

      const envelope = `{"dsn":"${SENTRY_DSN}","sdk":{"name":"sentry.javascript.nextjs","version":"10.0.0"}}
{"type":"event"}
{"event_id":"${crypto.randomUUID().replace(/-/g,'')}","level":"error","message":"Test directo Aldente ERP ${new Date().toISOString()}","platform":"javascript","environment":"production"}`;

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-sentry-envelope',
          'X-Sentry-Auth': `Sentry sentry_version=7,sentry_client=aldente/1.0,sentry_key=${key}`,
        },
        body: envelope,
      });

      add(res.ok ? `✅ HTTP ${res.status} — evento enviado directo a Sentry` : `❌ HTTP ${res.status} — ${await res.text()}`);
    } catch (e: any) {
      add('❌ Error: ' + e.message);
    }
  };

  const testSdk = async () => {
    add('⏳ Cargando SDK de Sentry...');
    try {
      const Sentry = await import('@sentry/nextjs');
      Sentry.init({ dsn: SENTRY_DSN, enabled: true, environment: 'production' });
      const id = Sentry.captureMessage('Test SDK Aldente ' + new Date().toISOString(), 'error');
      add(id ? `✅ SDK — event ID: ${id}` : '❌ SDK devolvió ID vacío');
    } catch (e: any) {
      add('❌ SDK error: ' + e.message);
    }
  };

  return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center',
      background:'#060d18', flexDirection:'column', gap:12, padding:24 }}>
      <h1 style={{ color:'#f1f5f9', fontSize:20, fontWeight:700 }}>Sentry — Diagnóstico v3</h1>

      <div style={{ display:'flex', gap:8 }}>
        <button onClick={testFetch} style={{ padding:'10px 18px', borderRadius:8, background:'#059669',
          color:'#fff', fontSize:13, fontWeight:600, border:'none', cursor:'pointer' }}>
          Envío directo (fetch)
        </button>
        <button onClick={testSdk} style={{ padding:'10px 18px', borderRadius:8, background:'#2563eb',
          color:'#fff', fontSize:13, fontWeight:600, border:'none', cursor:'pointer' }}>
          Via SDK
        </button>
      </div>

      <div style={{ background:'#0d1b2a', border:'1px solid #1e2d3d', borderRadius:10,
        padding:'16px 20px', width:'100%', maxWidth:560, fontFamily:'monospace' }}>
        <p style={{ color:'#475569', fontSize:11, marginBottom:8 }}>Log:</p>
        {log.map((l, i) => (
          <p key={i} style={{ fontSize:12, margin:'2px 0',
            color: l.startsWith('✅') ? '#4ade80' : l.startsWith('❌') ? '#ef4444' : '#94a3b8' }}>
            {l}
          </p>
        ))}
      </div>

      <p style={{ color:'#334155', fontSize:11, textAlign:'center' }}>
        "Envío directo" bypasea el SDK y habla con Sentry directamente.<br/>
        Si da ✅, Sentry está activo. Si da ❌, el DSN está mal.
      </p>
    </div>
  );
}
