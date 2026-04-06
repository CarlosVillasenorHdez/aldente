import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Aldente — Software de Gestión para Restaurantes',
  description: 'POS con mapa de mesas, cocina digital, inventario y reportes. El ERP que tu restaurante necesita. Desde $800 MXN/mes, 14 días gratis.',
  openGraph: {
    title: 'Aldente — Software de Gestión para Restaurantes',
    description: 'POS, KDS, inventario, reportes. Todo en uno. Desde $800 MXN/mes.',
    type: 'website',
  },
};

const FEATURES = [
  {
    num: '01',
    title: 'Punto de venta',
    body: 'Mapa de mesas drag & drop, unión de mesas, pagos mixtos, descuentos y propinas. El POS más completo del mercado a este precio.',
    tag: 'Todos los planes',
  },
  {
    num: '02',
    title: 'Cocina digital (KDS)',
    body: 'Pantalla de cocina con semáforo de tiempos. El cocinero ve cada orden al instante. Se acabaron las comandas en papel.',
    tag: 'Estándar · Premium',
  },
  {
    num: '03',
    title: 'Mesero móvil',
    body: 'Tu mesero toma la orden desde su celular. Sin app store. Se instala como PWA. Funciona offline.',
    tag: 'Estándar · Premium',
  },
  {
    num: '04',
    title: 'Inventario inteligente',
    body: 'Recetas en 3 capas: materia prima, mano de obra y overhead. El costo real de cada platillo, al centavo.',
    tag: 'Estándar · Premium',
  },
  {
    num: '05',
    title: 'Reportes que importan',
    body: 'P&L, COGS, Market Basket Analysis. Los números que tu contador y tú necesitan, sin exportar a Excel.',
    tag: 'Estándar · Premium',
  },
  {
    num: '06',
    title: 'Tu restaurante, tu URL',
    body: 'Cada restaurante tiene su acceso único. Tus empleados entran en aldente.app/r/mi-restaurante — sin contraseñas genéricas.',
    tag: 'Todos los planes',
  },
];

const PLANS = [
  {
    key: 'basico',
    label: 'Básico',
    price: '$800',
    desc: 'Para restaurantes que quieren digitalizar la operación diaria.',
    features: ['POS con mapa de mesas', 'Menú digital', 'Gestión de personal', 'Corte de caja', 'Dashboard operativo', 'URL de acceso única'],
    cta: 'Empezar gratis',
    highlight: false,
  },
  {
    key: 'estandar',
    label: 'Estándar',
    price: '$1,500',
    desc: 'Para restaurantes que quieren control total de su operación.',
    features: ['Todo lo del plan Básico', 'Cocina digital (KDS)', 'Mesero móvil (PWA)', 'Inventario y recetas', 'Reservaciones', 'Programa de lealtad', 'Reportes P&L y COGS'],
    cta: 'Empezar gratis',
    highlight: true,
  },
  {
    key: 'premium',
    label: 'Premium',
    price: '$2,500',
    desc: 'Para operaciones más grandes que necesitan visibilidad total.',
    features: ['Todo lo del plan Estándar', 'Delivery (Uber, Rappi, Didi)', 'Multi-sucursal', 'Recursos humanos', 'Control de gastos', 'Alarmas inteligentes'],
    cta: 'Empezar gratis',
    highlight: false,
  },
];

export default function LandingPage() {
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=DM+Sans:wght@300;400;500;600&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        :root {
          --bg: #0a0c0f;
          --bg2: #0f1318;
          --bg3: #151a22;
          --border: rgba(255,255,255,0.07);
          --border-strong: rgba(255,255,255,0.12);
          --text: #f0ede8;
          --text-2: rgba(240,237,232,0.55);
          --text-3: rgba(240,237,232,0.3);
          --amber: #d4922a;
          --amber-light: #e8ac4a;
          --amber-dim: rgba(212,146,42,0.12);
          --amber-border: rgba(212,146,42,0.25);
        }

        body { background: var(--bg); color: var(--text); font-family: 'DM Sans', sans-serif; -webkit-font-smoothing: antialiased; }

        .serif { font-family: 'Instrument Serif', Georgia, serif; }

        /* NAV */
        .nav {
          position: sticky; top: 0; z-index: 100;
          display: flex; align-items: center; justify-content: space-between;
          padding: 0 40px; height: 60px;
          background: rgba(10,12,15,0.85);
          backdrop-filter: blur(20px);
          border-bottom: 1px solid var(--border);
        }
        .nav-logo { font-family: 'Instrument Serif', serif; font-size: 22px; color: var(--amber); letter-spacing: -0.3px; text-decoration: none; }
        .nav-links { display: flex; align-items: center; gap: 6px; }
        .nav-link { padding: 7px 14px; border-radius: 8px; font-size: 14px; color: var(--text-2); text-decoration: none; transition: color .15s; font-weight: 400; }
        .nav-link:hover { color: var(--text); }
        .nav-cta { padding: 8px 18px; border-radius: 9px; font-size: 14px; font-weight: 500; background: var(--amber); color: #0a0c0f; text-decoration: none; transition: background .15s; }
        .nav-cta:hover { background: var(--amber-light); }

        /* HERO */
        .hero {
          min-height: 88vh;
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          text-align: center;
          padding: 80px 24px 60px;
          position: relative;
          overflow: hidden;
        }
        .hero::before {
          content: '';
          position: absolute; top: -200px; left: 50%; transform: translateX(-50%);
          width: 700px; height: 700px;
          background: radial-gradient(ellipse, rgba(212,146,42,0.08) 0%, transparent 70%);
          pointer-events: none;
        }
        .hero-badge {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 6px 16px; border-radius: 100px;
          border: 1px solid var(--amber-border);
          background: var(--amber-dim);
          font-size: 13px; color: var(--amber-light); font-weight: 500;
          margin-bottom: 36px;
        }
        .hero-badge::before { content: ''; width: 6px; height: 6px; border-radius: 50%; background: var(--amber); display: block; }
        .hero-h1 {
          font-family: 'Instrument Serif', serif;
          font-size: clamp(42px, 6vw, 72px);
          line-height: 1.08;
          letter-spacing: -1.5px;
          color: var(--text);
          max-width: 820px;
          margin-bottom: 24px;
        }
        .hero-h1 em { font-style: italic; color: var(--amber); }
        .hero-sub {
          font-size: 17px; line-height: 1.65;
          color: var(--text-2); max-width: 520px;
          margin-bottom: 44px; font-weight: 300;
        }
        .hero-actions { display: flex; gap: 12px; flex-wrap: wrap; justify-content: center; }
        .btn-primary {
          padding: 14px 28px; border-radius: 12px;
          background: var(--amber); color: #0a0c0f;
          font-size: 15px; font-weight: 600; text-decoration: none;
          transition: background .15s, transform .1s;
          border: none; cursor: pointer;
        }
        .btn-primary:hover { background: var(--amber-light); transform: translateY(-1px); }
        .btn-secondary {
          padding: 14px 28px; border-radius: 12px;
          border: 1px solid var(--border-strong);
          color: var(--text-2); font-size: 15px; font-weight: 400;
          text-decoration: none; transition: border-color .15s, color .15s;
          background: transparent;
        }
        .btn-secondary:hover { border-color: rgba(255,255,255,0.25); color: var(--text); }

        /* URL DEMO */
        .url-demo {
          margin-top: 56px;
          display: flex; flex-direction: column; align-items: center; gap: 8px;
        }
        .url-demo-label { font-size: 12px; color: var(--text-3); text-transform: uppercase; letter-spacing: 0.08em; }
        .url-pill {
          display: flex; align-items: center;
          background: var(--bg3); border: 1px solid var(--border-strong);
          border-radius: 100px; padding: 10px 20px;
          font-family: 'DM Sans', monospace; font-size: 14px;
          gap: 0;
        }
        .url-base { color: var(--text-3); }
        .url-slug { color: var(--amber-light); font-weight: 500; }

        /* FEATURES GRID */
        .section { padding: 100px 40px; max-width: 1200px; margin: 0 auto; }
        .section-label { font-size: 12px; text-transform: uppercase; letter-spacing: 0.1em; color: var(--amber); font-weight: 500; margin-bottom: 16px; }
        .section-title { font-family: 'Instrument Serif', serif; font-size: clamp(32px, 4vw, 48px); letter-spacing: -0.8px; margin-bottom: 60px; line-height: 1.1; }
        .section-title em { font-style: italic; color: var(--text-2); }

        .features-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1px; background: var(--border); border: 1px solid var(--border); border-radius: 16px; overflow: hidden; }
        .feature-card {
          background: var(--bg2); padding: 36px 32px;
          transition: background .2s;
        }
        .feature-card:hover { background: var(--bg3); }
        .feature-num { font-family: 'Instrument Serif', serif; font-size: 13px; color: var(--amber); margin-bottom: 20px; letter-spacing: 0.05em; }
        .feature-title { font-size: 18px; font-weight: 500; color: var(--text); margin-bottom: 12px; line-height: 1.3; }
        .feature-body { font-size: 14px; color: var(--text-2); line-height: 1.7; margin-bottom: 20px; font-weight: 300; }
        .feature-tag { display: inline-block; font-size: 11px; padding: 4px 10px; border-radius: 6px; background: var(--bg); border: 1px solid var(--border); color: var(--text-3); }

        /* PLANS */
        .plans-wrap { padding: 100px 40px; max-width: 1100px; margin: 0 auto; }
        .plans-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
        .plan-card {
          border-radius: 16px; padding: 36px 28px;
          border: 1px solid var(--border);
          background: var(--bg2);
          display: flex; flex-direction: column;
          transition: border-color .2s;
        }
        .plan-card:hover { border-color: var(--border-strong); }
        .plan-card.highlight {
          border-color: var(--amber-border);
          background: var(--bg3);
          position: relative;
        }
        .plan-badge {
          position: absolute; top: -12px; left: 50%; transform: translateX(-50%);
          padding: 4px 16px; border-radius: 100px;
          background: var(--amber); color: #0a0c0f;
          font-size: 11px; font-weight: 600; letter-spacing: 0.05em;
          text-transform: uppercase; white-space: nowrap;
        }
        .plan-name { font-size: 13px; color: var(--amber); font-weight: 500; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 10px; }
        .plan-price { font-family: 'Instrument Serif', serif; font-size: 48px; color: var(--text); line-height: 1; margin-bottom: 4px; letter-spacing: -1px; }
        .plan-period { font-size: 13px; color: var(--text-3); margin-bottom: 16px; }
        .plan-desc { font-size: 14px; color: var(--text-2); line-height: 1.6; margin-bottom: 28px; font-weight: 300; flex: 1; }
        .plan-divider { border: none; border-top: 1px solid var(--border); margin-bottom: 24px; }
        .plan-features { list-style: none; display: flex; flex-direction: column; gap: 10px; margin-bottom: 32px; }
        .plan-feature { display: flex; gap: 10px; font-size: 13px; color: var(--text-2); line-height: 1.4; }
        .plan-feature::before { content: '✓'; color: var(--amber); font-size: 12px; flex-shrink: 0; margin-top: 1px; }
        .plan-cta {
          display: block; text-align: center;
          padding: 13px; border-radius: 10px;
          font-size: 14px; font-weight: 500; text-decoration: none;
          transition: all .15s;
        }
        .plan-cta.outline { border: 1px solid var(--border-strong); color: var(--text-2); background: transparent; }
        .plan-cta.outline:hover { border-color: rgba(255,255,255,0.25); color: var(--text); }
        .plan-cta.solid { background: var(--amber); color: #0a0c0f; border: none; }
        .plan-cta.solid:hover { background: var(--amber-light); }

        /* ACCESS SECTION */
        .access-section {
          margin: 0 40px 100px;
          border-radius: 20px;
          background: var(--bg3);
          border: 1px solid var(--border);
          padding: 64px;
          display: grid; grid-template-columns: 1fr 1fr; gap: 60px; align-items: center;
          max-width: 1120px; margin-left: auto; margin-right: auto;
        }
        .access-h2 { font-family: 'Instrument Serif', serif; font-size: clamp(28px, 3.5vw, 42px); line-height: 1.15; letter-spacing: -0.8px; margin-bottom: 16px; }
        .access-h2 em { font-style: italic; color: var(--amber); }
        .access-body { font-size: 15px; color: var(--text-2); line-height: 1.7; font-weight: 300; margin-bottom: 28px; }
        .access-steps { display: flex; flex-direction: column; gap: 16px; }
        .access-step { display: flex; gap: 14px; align-items: flex-start; }
        .access-step-num { width: 28px; height: 28px; border-radius: 8px; background: var(--amber-dim); border: 1px solid var(--amber-border); display: flex; align-items: center; justify-content: center; font-size: 12px; color: var(--amber); font-weight: 600; flex-shrink: 0; }
        .access-step-text { font-size: 14px; color: var(--text-2); line-height: 1.55; padding-top: 4px; font-weight: 300; }
        .access-step-text strong { color: var(--text); font-weight: 500; }
        .url-demo-big {
          background: var(--bg2); border: 1px solid var(--border-strong);
          border-radius: 14px; padding: 28px;
          font-family: 'DM Sans', monospace;
        }
        .url-demo-big .label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; color: var(--text-3); margin-bottom: 12px; }
        .url-demo-big .url { font-size: 18px; line-height: 1.5; }
        .url-demo-big .url .base { color: var(--text-3); }
        .url-demo-big .url .slug { color: var(--amber-light); font-weight: 500; }
        .url-demo-big .desc { font-size: 13px; color: var(--text-3); margin-top: 16px; line-height: 1.6; font-family: 'DM Sans', sans-serif; }

        /* FOOTER */
        .footer {
          border-top: 1px solid var(--border);
          padding: 40px;
          display: flex; align-items: center; justify-content: space-between;
          max-width: 1200px; margin: 0 auto;
        }
        .footer-logo { font-family: 'Instrument Serif', serif; font-size: 18px; color: var(--amber); }
        .footer-right { display: flex; gap: 24px; align-items: center; }
        .footer-link { font-size: 13px; color: var(--text-3); text-decoration: none; transition: color .15s; }
        .footer-link:hover { color: var(--text-2); }

        /* SEPARATOR */
        .sep { border: none; border-top: 1px solid var(--border); margin: 0; }

        @media (max-width: 900px) {
          .nav { padding: 0 20px; }
          .features-grid { grid-template-columns: 1fr; }
          .plans-grid { grid-template-columns: 1fr; }
          .access-section { grid-template-columns: 1fr; padding: 40px 28px; }
          .section, .plans-wrap { padding: 70px 20px; }
          .footer { flex-direction: column; gap: 20px; padding: 32px 20px; }
        }
      `}</style>

      {/* NAV */}
      <nav className="nav">
        <a href="/" className="nav-logo">Aldente</a>
        <div className="nav-links">
          <a href="#funciones" className="nav-link">Funciones</a>
          <a href="#planes" className="nav-link">Precios</a>
          <a href="/login" className="nav-link">Iniciar sesión</a>
          <a href="/registro" className="nav-cta">Prueba gratis</a>
        </div>
      </nav>

      {/* HERO */}
      <section className="hero">
        <div className="hero-badge">14 días gratis · Sin tarjeta de crédito</div>
        <h1 className="hero-h1">
          El software que tu<br />
          restaurante <em>merece</em>
        </h1>
        <p className="hero-sub">
          POS con mapa de mesas, cocina digital, inventario y reportes reales.
          Todo en un sistema que tú controlas — desde $800 MXN al mes.
        </p>
        <div className="hero-actions">
          <a href="/registro" className="btn-primary">Registrar mi restaurante →</a>
          <a href="#funciones" className="btn-secondary">Ver funciones</a>
        </div>
        <div className="url-demo">
          <span className="url-demo-label">Tu acceso único</span>
          <div className="url-pill">
            <span className="url-base">aldente.app/r/</span>
            <span className="url-slug">mi-restaurante</span>
          </div>
        </div>
      </section>

      <hr className="sep" />

      {/* FEATURES */}
      <section className="section" id="funciones">
        <p className="section-label">Módulos</p>
        <h2 className="section-title">
          Todo lo que necesitas.<br />
          <em>Nada que no necesitas.</em>
        </h2>
        <div className="features-grid">
          {FEATURES.map(f => (
            <div key={f.num} className="feature-card">
              <div className="feature-num">{f.num}</div>
              <h3 className="feature-title">{f.title}</h3>
              <p className="feature-body">{f.body}</p>
              <span className="feature-tag">{f.tag}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ACCESS SECTION */}
      <div className="access-section">
        <div>
          <p className="section-label" style={{marginBottom:'16px'}}>Acceso</p>
          <h2 className="access-h2">
            Cada restaurante,<br />
            <em>su propia puerta</em>
          </h2>
          <p className="access-body">
            Olvídate de contraseñas genéricas compartidas por WhatsApp.
            Tu restaurante tiene una URL única. Tus empleados entran directo —
            sin saber que existen otros restaurantes en el sistema.
          </p>
          <div className="access-steps">
            <div className="access-step">
              <div className="access-step-num">1</div>
              <p className="access-step-text">Registras tu restaurante y obtienes tu <strong>URL única</strong></p>
            </div>
            <div className="access-step">
              <div className="access-step-num">2</div>
              <p className="access-step-text">Compartes el link con tus empleados <strong>una sola vez</strong></p>
            </div>
            <div className="access-step">
              <div className="access-step-num">3</div>
              <p className="access-step-text">Cada quien entra con su <strong>nombre + PIN</strong> — sin saber qué hay más allá</p>
            </div>
          </div>
        </div>
        <div className="url-demo-big">
          <p className="label">Tu URL de acceso</p>
          <p className="url">
            <span className="base">aldente.app/r/</span><br />
            <span className="slug">tacos-el-guero</span>
          </p>
          <p className="desc">
            Solo ven los empleados de tu restaurante.<br />
            Nadie más puede entrar ni saber que existes.
          </p>
        </div>
      </div>

      <hr className="sep" />

      {/* PLANS */}
      <div className="plans-wrap" id="planes">
        <p className="section-label">Precios</p>
        <h2 className="section-title">
          Transparente desde el día uno.<br />
          <em>Sin sorpresas.</em>
        </h2>
        <div className="plans-grid">
          {PLANS.map(p => (
            <div key={p.key} className={`plan-card ${p.highlight ? 'highlight' : ''}`} style={{position:'relative'}}>
              {p.highlight && <div className="plan-badge">Más popular</div>}
              <p className="plan-name">{p.label}</p>
              <p className="plan-price">{p.price}</p>
              <p className="plan-period">MXN / mes · IVA incluido</p>
              <p className="plan-desc">{p.desc}</p>
              <hr className="plan-divider" />
              <ul className="plan-features">
                {p.features.map(f => (
                  <li key={f} className="plan-feature">{f}</li>
                ))}
              </ul>
              <a href="/registro" className={`plan-cta ${p.highlight ? 'solid' : 'outline'}`}>
                {p.cta}
              </a>
            </div>
          ))}
        </div>
      </div>

      <hr className="sep" />

      {/* FOOTER */}
      <footer>
        <div className="footer">
          <span className="footer-logo">Aldente</span>
          <div className="footer-right">
            <a href="/registro" className="footer-link">Registrarse</a>
            <a href="/login" className="footer-link">Iniciar sesión</a>
            <a href="mailto:soporte@aldente.mx" className="footer-link">soporte@aldente.mx</a>
          </div>
        </div>
      </footer>
    </>
  );
}
