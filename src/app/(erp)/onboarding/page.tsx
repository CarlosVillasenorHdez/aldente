'use client';
import OnboardingFlow from './components/OnboardingFlow';

export default function OnboardingPage() {
  return (
    <div style={{ minHeight: '100vh', background: '#080b10', display: 'flex', flexDirection: 'column' }}>
      {/* Top bar */}
      <div style={{ padding: '20px 32px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontFamily: 'Georgia, serif', fontSize: 20, color: '#d4922a', fontWeight: 700, letterSpacing: '-0.3px' }}>
          Aldente
        </span>
        <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)' }}>
          Configuración inicial
        </span>
      </div>

      {/* Content */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: 48, paddingBottom: 48 }}>
        <div style={{ width: '100%' }}>
          <OnboardingFlow />
        </div>
      </div>
    </div>
  );
}
