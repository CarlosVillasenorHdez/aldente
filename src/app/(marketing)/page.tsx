import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Aldente — ERP para Restaurantes | Desde $800 MXN/mes',
  description: 'Sistema de gestión completo para restaurantes: POS con mapa de mesas, cocina digital, inventario, reportes y más. 14 días gratis, sin tarjeta.',
  openGraph: {
    title: 'Aldente — ERP para Restaurantes',
    description: 'POS, cocina digital, inventario y reportes. Todo en uno desde $800 MXN/mes.',
    type: 'website',
  },
};

const PLANS = [
  {
    key: 'basico', label: 'Básico', price: '$800', period: 'MXN/mes',
    highlight: false,
    features: ['Punto de venta (POS)', 'Mapa de mesas drag & drop', 'Menú digital', 'Corte de caja', 'Gestión de personal', 'Dashboard operativo'],
  },
  {
    key: 'estandar', label: 'Estándar', price: '$1,500', period: 'MXN/mes',
    highlight: true,
    features: ['Todo lo del plan Básico', 'Cocina digital (KDS)', 'Inventario y recetas', 'Reportes P&L y COGS', 'Reservaciones', 'Programa de lealtad', 'Mesero móvil (PWA)'],
  },
  {
    key: 'premium', label: 'Premium', price: '$2,500', period: 'MXN/mes',
    highlight: false,
    features: ['Todo lo del plan Estándar', 'Delivery (Uber, Rappi, Didi)', 'Multi-sucursal', 'Recursos humanos', 'Control de gastos', 'Alarmas inteligentes'],
  },
];

const FEATURES = [
  { icon: '🗺', title: 'Mapa de mesas en tiempo real', body: 'Drag & drop, unión de mesas, estados en vivo. Tu plano del salón exactamente como lo tienes.' },
  { icon: '👨‍🍳', title: 'Cocina digital con semáforo', body: 'Los cocineros ven cada orden en pantalla con tiempos de preparación en verde, amarillo y rojo.' },
  { icon: '📊', title: 'Reportes que entienden los chefs', body: 'P&L real, costo de recetas en 3 capas (materia prima + mano de obra + overhead), market basket.' },
  { icon: '📱', title: 'Instalable como app', body: 'El mesero lleva el sistema en su celular. Sin app store. Sin costo extra. Funciona offline.' },
  { icon: '🖨', title: 'Impresora térmica incluida', body: 'Conecta tu impresora de tickets por USB o Bluetooth. Imprime comandas y cuentas directo desde el sistema.' },
  { icon: '🔒', title: 'Multi-usuario con roles', body: 'Admin, gerente, cajero, mesero, cocinero. Cada quien ve solo lo que necesita.' },
];

export default function LandingPage() {
  return (
    <div style={{ backgroundColor: '#0f1923', color: '#f1f5f9', fontFamily: 'DM Sans, system-ui, sans-serif', minHeight: '100vh' }}>

      {/* Nav */}
      <nav style={{ borderBottom: '1px solid #1e2d3d', padding: '0 24px', height: '56px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, backgroundColor: '#0d1720', zIndex: 50 }}>
        <span style={{ fontWeight: 700, fontSize: '18px', color: '#f59e0b' }}>Aldente</span>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <Link href="#planes" style={{ fontSize: '14px', color: 'rgba(255,255,255,0.55)', textDecoration: 'none' }}>Planes</Link>
          <Link href="/login" style={{ fontSize: '14px', color: 'rgba(255,255,255,0.55)', textDecoration: 'none' }}>Iniciar sesión</Link>
          <Link href="/registro" style={{ padding: '7px 16px', borderRadius: '8px', backgroundColor: '#f59e0b', color: '#1B3A6B', fontWeight: 700, fontSize: '14px', textDecoration: 'none' }}>
            Prueba gratis
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ maxWidth: '800px', margin: '0 auto', padding: '80px 24px 60px', textAlign: 'center' }}>
        <div style={{ display: 'inline-block', padding: '4px 14px', borderRadius: '20px', backgroundColor: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.3)', color: '#f59e0b', fontSize: '13px', fontWeight: 600, marginBottom: '24px' }}>
          14 días gratis · Sin tarjeta de crédito
        </div>
        <h1 style={{ fontSize: '48px', fontWeight: 700, lineHeight: 1.15, margin: '0 0 20px', color: '#f1f5f9' }}>
          El ERP que tu restaurante<br />
          <span style={{ color: '#f59e0b' }}>ya debería tener</span>
        </h1>
        <p style={{ fontSize: '18px', color: 'rgba(255,255,255,0.55)', margin: '0 0 36px', lineHeight: 1.6 }}>
          POS con mapa de mesas, cocina digital, inventario, reportes reales y mesero móvil.<br />
          Todo en uno, desde $800 MXN al mes.
        </p>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/registro" style={{ padding: '14px 32px', borderRadius: '12px', backgroundColor: '#f59e0b', color: '#1B3A6B', fontWeight: 700, fontSize: '16px', textDecoration: 'none' }}>
            Empieza gratis →
          </Link>
          <Link href="#funciones" style={{ padding: '14px 32px', borderRadius: '12px', border: '1px solid #2a3f5f', color: 'rgba(255,255,255,0.7)', fontSize: '16px', textDecoration: 'none' }}>
            Ver funciones
          </Link>
        </div>
      </section>

      {/* Features */}
      <section id="funciones" style={{ maxWidth: '1100px', margin: '0 auto', padding: '60px 24px' }}>
        <h2 style={{ textAlign: 'center', fontSize: '28px', fontWeight: 700, margin: '0 0 48px', color: '#f1f5f9' }}>Todo lo que necesitas en un solo sistema</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
          {FEATURES.map(f => (
            <div key={f.title} style={{ backgroundColor: '#1a2535', border: '1px solid #1e2d3d', borderRadius: '14px', padding: '22px' }}>
              <div style={{ fontSize: '28px', marginBottom: '12px' }}>{f.icon}</div>
              <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#f1f5f9', margin: '0 0 8px' }}>{f.title}</h3>
              <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', margin: 0, lineHeight: 1.6 }}>{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Plans */}
      <section id="planes" style={{ maxWidth: '1000px', margin: '0 auto', padding: '60px 24px' }}>
        <h2 style={{ textAlign: 'center', fontSize: '28px', fontWeight: 700, margin: '0 0 12px', color: '#f1f5f9' }}>Planes y precios</h2>
        <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: '15px', margin: '0 0 48px' }}>Todos los planes incluyen 14 días de prueba gratuita</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
          {PLANS.map(p => (
            <div key={p.key} style={{ backgroundColor: '#1a2535', border: p.highlight ? '2px solid #f59e0b' : '1px solid #1e2d3d', borderRadius: '16px', padding: '28px 24px', position: 'relative' }}>
              {p.highlight && (
                <div style={{ position: 'absolute', top: '-12px', left: '50%', transform: 'translateX(-50%)', padding: '3px 14px', borderRadius: '20px', backgroundColor: '#f59e0b', color: '#1B3A6B', fontSize: '11px', fontWeight: 700, whiteSpace: 'nowrap' }}>
                  MÁS POPULAR
                </div>
              )}
              <div style={{ fontWeight: 700, color: '#f59e0b', fontSize: '14px', marginBottom: '8px', textTransform: 'uppercase' }}>{p.label}</div>
              <div style={{ fontSize: '36px', fontWeight: 700, color: '#f1f5f9', fontFamily: 'monospace', marginBottom: '2px' }}>{p.price}</div>
              <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.35)', marginBottom: '24px' }}>{p.period}</div>
              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 28px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {p.features.map(f => (
                  <li key={f} style={{ display: 'flex', gap: '8px', fontSize: '13px', color: 'rgba(255,255,255,0.65)' }}>
                    <span style={{ color: '#34d399', flexShrink: 0 }}>✓</span> {f}
                  </li>
                ))}
              </ul>
              <Link href="/registro" style={{ display: 'block', textAlign: 'center', padding: '11px', borderRadius: '10px', backgroundColor: p.highlight ? '#f59e0b' : 'transparent', border: p.highlight ? 'none' : '1px solid #2a3f5f', color: p.highlight ? '#1B3A6B' : 'rgba(255,255,255,0.7)', fontWeight: 700, fontSize: '14px', textDecoration: 'none' }}>
                Empezar gratis →
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* CTA final */}
      <section style={{ maxWidth: '600px', margin: '0 auto', padding: '60px 24px 80px', textAlign: 'center' }}>
        <h2 style={{ fontSize: '28px', fontWeight: 700, margin: '0 0 14px', color: '#f1f5f9' }}>¿Listo para modernizar tu restaurante?</h2>
        <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '15px', margin: '0 0 28px' }}>Empieza hoy. Sin compromisos. Sin tarjeta de crédito.</p>
        <Link href="/registro" style={{ display: 'inline-block', padding: '14px 40px', borderRadius: '12px', backgroundColor: '#f59e0b', color: '#1B3A6B', fontWeight: 700, fontSize: '16px', textDecoration: 'none' }}>
          Crear mi restaurante gratis →
        </Link>
      </section>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid #1e2d3d', padding: '24px', textAlign: 'center' }}>
        <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.25)', margin: 0 }}>
          © {new Date().getFullYear()} Aldente · <a href="mailto:soporte@aldente.mx" style={{ color: 'rgba(255,255,255,0.25)', textDecoration: 'none' }}>soporte@aldente.mx</a>
        </p>
      </footer>
    </div>
  );
}
