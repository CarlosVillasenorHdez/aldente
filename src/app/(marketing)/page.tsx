import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Aldente — Software de Gestión para Restaurantes',
  description: 'POS con mapa de mesas, cocina digital KDS, mesero móvil, inventario y reportes. Desde $800 MXN/mes. 14 días gratis sin tarjeta.',
  keywords: 'software restaurante, POS restaurante, sistema punto de venta, KDS cocina, ERP restaurante México',
  openGraph: {
    title: 'Aldente — Software de Gestión para Restaurantes',
    description: 'POS, KDS, mesero móvil, inventario y reportes. Todo en uno desde $800 MXN/mes.',
    type: 'website',
    locale: 'es_MX',
  },
};

export default function LandingPage() {
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: smooth; -webkit-text-size-adjust: 100%; }

        :root {
          --bg:      #09090b;
          --bg2:     #0e0f12;
          --bg3:     #141519;
          --bg4:     #1a1b21;
          --border:  rgba(255,255,255,0.06);
          --borderM: rgba(255,255,255,0.10);
          --borderS: rgba(255,255,255,0.16);
          --text:    #f4f1ec;
          --text2:   rgba(244,241,236,0.58);
          --text3:   rgba(244,241,236,0.35);
          --text4:   rgba(244,241,236,0.2);
          --amber:   #c8861f;
          --amberL:  #dfa03a;
          --amberXL: #f0bc60;
          --amberDim:rgba(200,134,31,0.10);
          --amberB:  rgba(200,134,31,0.22);
          --green:   #22c55e;
          --red:     #f87171;
          --r: 16px;
          --rS: 10px;
          --rL: 22px;
        }

        body {
          background: var(--bg);
          color: var(--text);
          font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif;
          -webkit-font-smoothing: antialiased;
          overflow-x: hidden;
          font-size: 16px;
          line-height: 1.6;
        }

        /* ── UTILITIES ── */
        .serif { font-family: 'Instrument Serif', Georgia, serif; }
        .mono  { font-family: 'SF Mono', 'Fira Code', monospace; }
        a { text-decoration: none; color: inherit; }
        img { display: block; max-width: 100%; }

        /* ── NAV ── */
        .nav {
          position: sticky; top: 0; z-index: 200;
          height: 64px;
          display: flex; align-items: center; justify-content: space-between;
          padding: 0 clamp(20px, 4vw, 48px);
          background: rgba(9,9,11,0.80);
          backdrop-filter: blur(24px) saturate(1.5);
          -webkit-backdrop-filter: blur(24px) saturate(1.5);
          border-bottom: 1px solid var(--border);
        }
        .nav-brand {
          display: flex; align-items: center; gap: 10px;
        }
        .nav-logo-icon {
          width: 32px; height: 32px; border-radius: 9px;
          background: var(--amberDim); border: 1px solid var(--amberB);
          display: flex; align-items: center; justify-content: center;
          font-size: 16px;
        }
        .nav-name { font-family: 'Instrument Serif', serif; font-size: 20px; color: var(--amber); }
        .nav-links { display: flex; align-items: center; gap: 2px; }
        .nav-link  { padding: 7px 13px; border-radius: 8px; font-size: 14px; color: var(--text3); transition: color .15s, background .15s; font-weight: 400; }
        .nav-link:hover { color: var(--text); background: rgba(255,255,255,0.04); }
        .nav-actions { display: flex; align-items: center; gap: 10px; }
        .nav-login { padding: 8px 16px; border-radius: 9px; font-size: 14px; color: var(--text3); border: 1px solid var(--border); transition: all .15s; }
        .nav-login:hover { color: var(--text2); border-color: var(--borderM); }
        .nav-cta { padding: 9px 18px; border-radius: 9px; font-size: 14px; font-weight: 500; background: var(--amber); color: #09090b; transition: background .15s; }
        .nav-cta:hover { background: var(--amberL); }
        .nav-mobile-menu { display: none; flex-direction: column; gap: 5px; cursor: pointer; padding: 8px; }
        .nav-mobile-menu span { width: 22px; height: 1.5px; background: var(--text2); border-radius: 2px; transition: all .2s; }

        /* ── HERO ── */
        .hero {
          position: relative;
          padding: clamp(80px, 12vw, 140px) clamp(20px, 4vw, 48px) clamp(60px, 8vw, 100px);
          text-align: center;
          overflow: hidden;
        }
        .hero-glow {
          position: absolute; top: -100px; left: 50%; transform: translateX(-50%);
          width: min(900px, 120vw); height: 600px;
          background: radial-gradient(ellipse at 50% 30%, rgba(200,134,31,0.09) 0%, transparent 65%);
          pointer-events: none;
        }
        .hero-grid {
          position: absolute; inset: 0;
          background-image: linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px);
          background-size: 60px 60px;
          mask-image: radial-gradient(ellipse 80% 60% at 50% 0%, black, transparent);
          pointer-events: none;
        }
        .hero-badge {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 6px 16px; border-radius: 100px;
          background: var(--amberDim); border: 1px solid var(--amberB);
          font-size: 13px; color: var(--amberL); font-weight: 500;
          margin-bottom: 32px; position: relative;
        }
        .hero-badge-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--amber); }
        .hero-h1 {
          font-family: 'Instrument Serif', serif;
          font-size: clamp(40px, 7vw, 80px);
          line-height: 1.06; letter-spacing: -2px;
          color: var(--text);
          max-width: 900px; margin: 0 auto 20px;
          position: relative;
        }
        .hero-h1 em { font-style: italic; color: var(--amber); }
        .hero-sub {
          font-size: clamp(15px, 2vw, 18px);
          color: var(--text2); max-width: 540px; margin: 0 auto 44px;
          line-height: 1.7; font-weight: 300; position: relative;
        }
        .hero-actions { display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; position: relative; margin-bottom: 60px; }
        .btn-hero { padding: 15px 30px; border-radius: 12px; font-size: 16px; font-weight: 600; background: var(--amber); color: #09090b; transition: background .15s, transform .1s; border: none; cursor: pointer; }
        .btn-hero:hover { background: var(--amberL); transform: translateY(-1px); }
        .btn-ghost { padding: 15px 30px; border-radius: 12px; font-size: 16px; font-weight: 400; color: var(--text2); border: 1px solid var(--borderM); background: transparent; transition: all .15s; }
        .btn-ghost:hover { border-color: var(--borderS); color: var(--text); }

        /* ── HERO DASHBOARD MOCKUP ── */
        .hero-mockup {
          position: relative; max-width: 960px; margin: 0 auto;
          border-radius: var(--rL);
          border: 1px solid var(--borderM);
          overflow: hidden;
          box-shadow: 0 0 0 1px rgba(255,255,255,0.04), 0 40px 100px rgba(0,0,0,0.6);
        }
        .mockup-bar {
          background: var(--bg3); padding: 14px 20px;
          display: flex; align-items: center; gap: 8px;
          border-bottom: 1px solid var(--border);
        }
        .mockup-dot { width: 12px; height: 12px; border-radius: 50%; }
        .mockup-url { flex: 1; background: var(--bg2); border-radius: 6px; padding: 5px 12px; font-size: 12px; color: var(--text3); font-family: monospace; margin: 0 12px; }
        .mockup-body { background: var(--bg2); padding: 24px; display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
        .mockup-kpi { background: var(--bg3); border: 1px solid var(--border); border-radius: 12px; padding: 16px; }
        .mockup-kpi-val { font-family: 'Instrument Serif', serif; font-size: 28px; color: var(--amber); }
        .mockup-kpi-lbl { font-size: 11px; color: var(--text3); margin-top: 2px; }
        .mockup-chart { grid-column: span 3; background: var(--bg3); border: 1px solid var(--border); border-radius: 12px; padding: 16px; height: 120px; display: flex; align-items: flex-end; gap: 6px; }
        .mockup-bar-chart { flex: 1; background: var(--amberDim); border-radius: 4px 4px 0 0; border: 1px solid var(--amberB); }
        .mockup-tables { background: var(--bg3); border: 1px solid var(--border); border-radius: 12px; padding: 16px; }
        .mockup-table-row { display: flex; align-items: center; gap: 8px; padding: 6px 0; border-bottom: 1px solid var(--border); }
        .mockup-table-row:last-child { border-bottom: none; }
        .mockup-table-num { width: 28px; height: 28px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 600; }

        /* ── STATS BAR ── */
        .stats-bar {
          border-top: 1px solid var(--border); border-bottom: 1px solid var(--border);
          background: var(--bg2);
          display: flex; justify-content: center;
        }
        .stats-inner { display: flex; max-width: 1000px; width: 100%; }
        .stat { flex: 1; padding: 36px 24px; text-align: center; border-right: 1px solid var(--border); }
        .stat:last-child { border-right: none; }
        .stat-val { font-family: 'Instrument Serif', serif; font-size: 42px; color: var(--amber); line-height: 1; margin-bottom: 6px; letter-spacing: -1px; }
        .stat-lbl { font-size: 14px; color: var(--text3); font-weight: 300; }

        /* ── SECTIONS ── */
        .section { padding: clamp(60px, 8vw, 120px) clamp(20px, 4vw, 48px); }
        .section-inner { max-width: 1120px; margin: 0 auto; }
        .section-eyebrow { font-size: 12px; text-transform: uppercase; letter-spacing: 0.1em; color: var(--amber); font-weight: 500; margin-bottom: 14px; display: flex; align-items: center; gap: 8px; }
        .section-eyebrow::before { content: ''; width: 24px; height: 1px; background: var(--amber); opacity: 0.5; }
        .section-h2 { font-family: 'Instrument Serif', serif; font-size: clamp(30px, 4.5vw, 54px); letter-spacing: -1px; line-height: 1.1; margin-bottom: 16px; }
        .section-h2 em { font-style: italic; color: var(--text2); }
        .section-sub { font-size: 17px; color: var(--text2); line-height: 1.7; font-weight: 300; max-width: 560px; }

        /* ── FEATURES BENTO ── */
        .bento { display: grid; grid-template-columns: repeat(3, 1fr); grid-template-rows: auto auto; gap: 12px; }
        .bento-card {
          background: var(--bg2); border: 1px solid var(--border);
          border-radius: var(--rL); padding: 32px;
          transition: border-color .2s, background .2s;
          position: relative; overflow: hidden;
        }
        .bento-card:hover { border-color: var(--borderM); background: var(--bg3); }
        .bento-card.wide { grid-column: span 2; }
        .bento-card.tall { grid-row: span 2; }
        .bento-icon { font-size: 28px; margin-bottom: 20px; display: block; }
        .bento-num { font-family: 'Instrument Serif', serif; font-size: 11px; color: var(--amber); letter-spacing: 0.1em; margin-bottom: 14px; opacity: 0.7; }
        .bento-title { font-size: 18px; font-weight: 500; color: var(--text); margin-bottom: 10px; line-height: 1.3; }
        .bento-body { font-size: 14px; color: var(--text2); line-height: 1.7; font-weight: 300; margin-bottom: 18px; }
        .bento-tag { display: inline-block; font-size: 11px; padding: 4px 10px; border-radius: 6px; background: var(--bg); border: 1px solid var(--border); color: var(--text4); }
        .bento-highlight { border-color: var(--amberB); background: linear-gradient(135deg, var(--bg3) 0%, rgba(200,134,31,0.04) 100%); }
        .bento-accent-line { position: absolute; top: 0; left: 0; right: 0; height: 1px; background: linear-gradient(90deg, transparent, var(--amber), transparent); opacity: 0.4; }

        /* ── HOW IT WORKS ── */
        .steps { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1px; background: var(--border); border: 1px solid var(--border); border-radius: var(--rL); overflow: hidden; }
        .step { background: var(--bg2); padding: 36px 28px; position: relative; }
        .step-num { font-family: 'Instrument Serif', serif; font-size: 48px; color: var(--amberDim); line-height: 1; margin-bottom: 20px; letter-spacing: -2px; font-style: italic; }
        .step-title { font-size: 16px; font-weight: 500; color: var(--text); margin-bottom: 10px; }
        .step-body { font-size: 13px; color: var(--text2); line-height: 1.65; font-weight: 300; }
        .step-arrow { position: absolute; right: -1px; top: 50%; transform: translateY(-50%); color: var(--border); font-size: 20px; }

        /* ── ACCESS SECTION ── */
        .access-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 60px; align-items: center; }
        .access-visual {
          background: var(--bg2); border: 1px solid var(--borderM);
          border-radius: var(--rL); overflow: hidden;
        }
        .access-visual-header {
          background: var(--bg3); padding: 14px 20px;
          border-bottom: 1px solid var(--border);
          display: flex; align-items: center; gap: 10px;
        }
        .access-url { font-family: monospace; font-size: 13px; color: var(--text3); flex: 1; }
        .access-url strong { color: var(--amberXL); }
        .access-visual-body { padding: 28px; }
        .access-restaurant-name { font-family: 'Instrument Serif', serif; font-size: 22px; color: var(--text); margin-bottom: 20px; }
        .access-user { display: flex; align-items: center; gap: 12px; padding: 12px; border-radius: 10px; margin-bottom: 8px; background: var(--bg3); border: 1px solid var(--border); cursor: pointer; transition: border-color .15s; }
        .access-user:hover { border-color: var(--borderM); }
        .access-avatar { width: 36px; height: 36px; border-radius: 10px; background: var(--amberDim); border: 1px solid var(--amberB); display: flex; align-items: center; justify-content: center; font-size: 14px; flex-shrink: 0; }
        .access-user-name { font-size: 14px; color: var(--text); font-weight: 500; }
        .access-user-role { font-size: 12px; color: var(--text3); }

        .access-steps { display: flex; flex-direction: column; gap: 20px; }
        .access-step { display: flex; gap: 16px; align-items: flex-start; }
        .access-step-n { width: 32px; height: 32px; border-radius: 9px; background: var(--amberDim); border: 1px solid var(--amberB); display: flex; align-items: center; justify-content: center; font-size: 13px; color: var(--amber); font-weight: 600; flex-shrink: 0; }
        .access-step-content { padding-top: 6px; }
        .access-step-title { font-size: 15px; font-weight: 500; color: var(--text); margin-bottom: 4px; }
        .access-step-body { font-size: 14px; color: var(--text2); font-weight: 300; line-height: 1.6; }

        /* ── TESTIMONIALS ── */
        .testimonials { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
        .testimonial { background: var(--bg2); border: 1px solid var(--border); border-radius: var(--rL); padding: 28px; }
        .testimonial-quote { font-size: 15px; color: var(--text2); line-height: 1.7; font-weight: 300; margin-bottom: 20px; font-style: italic; }
        .testimonial-author { display: flex; align-items: center; gap: 12px; }
        .testimonial-avatar { width: 40px; height: 40px; border-radius: 50%; background: var(--bg3); border: 1px solid var(--border); display: flex; align-items: center; justify-content: center; font-size: 18px; flex-shrink: 0; }
        .testimonial-name { font-size: 14px; font-weight: 500; color: var(--text); }
        .testimonial-biz  { font-size: 12px; color: var(--text3); }
        .stars { color: var(--amber); font-size: 13px; margin-bottom: 16px; letter-spacing: 1px; }

        /* ── PLANS ── */
        .plans-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; align-items: start; }
        .plan {
          border: 1px solid var(--border); border-radius: var(--rL);
          padding: 32px 28px; background: var(--bg2);
          display: flex; flex-direction: column;
          transition: border-color .2s;
          position: relative;
        }
        .plan:hover { border-color: var(--borderM); }
        .plan.featured { border-color: var(--amberB); background: var(--bg3); }
        .plan-popular {
          position: absolute; top: -12px; left: 50%; transform: translateX(-50%);
          background: var(--amber); color: #09090b;
          font-size: 11px; font-weight: 700; letter-spacing: 0.07em;
          text-transform: uppercase; padding: 4px 16px; border-radius: 100px;
          white-space: nowrap;
        }
        .plan-tier { font-size: 12px; color: var(--amber); text-transform: uppercase; letter-spacing: 0.1em; font-weight: 500; margin-bottom: 10px; }
        .plan-price { font-family: 'Instrument Serif', serif; font-size: 52px; color: var(--text); line-height: 1; margin-bottom: 4px; letter-spacing: -2px; }
        .plan-period { font-size: 13px; color: var(--text3); margin-bottom: 14px; }
        .plan-desc { font-size: 14px; color: var(--text2); font-weight: 300; line-height: 1.6; margin-bottom: 24px; }
        .plan-sep { border: none; border-top: 1px solid var(--border); margin-bottom: 24px; }
        .plan-features { list-style: none; display: flex; flex-direction: column; gap: 10px; margin-bottom: 32px; flex: 1; }
        .plan-feature { display: flex; gap: 10px; font-size: 13px; color: var(--text2); line-height: 1.4; }
        .plan-feature::before { content: '✓'; color: var(--green); font-size: 12px; flex-shrink: 0; margin-top: 1px; font-weight: 600; }
        .plan-cta { display: block; text-align: center; padding: 13px; border-radius: 10px; font-size: 14px; font-weight: 500; transition: all .15s; }
        .plan-cta.solid  { background: var(--amber); color: #09090b; }
        .plan-cta.solid:hover { background: var(--amberL); }
        .plan-cta.outline { border: 1px solid var(--borderM); color: var(--text2); }
        .plan-cta.outline:hover { border-color: var(--borderS); color: var(--text); }

        /* ── FAQ ── */
        .faq { display: flex; flex-direction: column; gap: 1px; background: var(--border); border: 1px solid var(--border); border-radius: var(--rL); overflow: hidden; }
        .faq-item { background: var(--bg2); padding: 24px 28px; }
        .faq-q { font-size: 16px; font-weight: 500; color: var(--text); margin-bottom: 10px; display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; }
        .faq-a { font-size: 14px; color: var(--text2); line-height: 1.7; font-weight: 300; }

        /* ── CTA FINAL ── */
        .cta-final {
          margin: 0 clamp(16px, 4vw, 48px) clamp(60px, 8vw, 100px);
          border-radius: var(--rL);
          background: var(--bg3); border: 1px solid var(--borderM);
          padding: clamp(48px, 6vw, 80px) clamp(28px, 4vw, 60px);
          text-align: center;
          position: relative; overflow: hidden;
        }
        .cta-final::before {
          content: '';
          position: absolute; top: -80px; left: 50%; transform: translateX(-50%);
          width: 600px; height: 300px;
          background: radial-gradient(ellipse, rgba(200,134,31,0.07) 0%, transparent 70%);
          pointer-events: none;
        }
        .cta-h2 { font-family: 'Instrument Serif', serif; font-size: clamp(28px, 4vw, 48px); letter-spacing: -1px; margin-bottom: 14px; }
        .cta-sub { font-size: 16px; color: var(--text2); margin-bottom: 36px; font-weight: 300; }
        .cta-actions { display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; }

        /* ── FOOTER ── */
        .footer { border-top: 1px solid var(--border); padding: clamp(32px, 4vw, 48px) clamp(20px, 4vw, 48px); }
        .footer-inner { max-width: 1120px; margin: 0 auto; display: grid; grid-template-columns: 1.5fr 1fr 1fr 1fr; gap: 40px; }
        .footer-brand-name { font-family: 'Instrument Serif', serif; font-size: 22px; color: var(--amber); margin-bottom: 10px; }
        .footer-brand-desc { font-size: 13px; color: var(--text3); line-height: 1.6; font-weight: 300; }
        .footer-col-title { font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em; color: var(--text4); margin-bottom: 16px; font-weight: 500; }
        .footer-link { display: block; font-size: 14px; color: var(--text3); margin-bottom: 10px; transition: color .15s; }
        .footer-link:hover { color: var(--text2); }
        .footer-bottom { max-width: 1120px; margin: 32px auto 0; padding-top: 24px; border-top: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center; }
        .footer-copy { font-size: 13px; color: var(--text4); }

        /* ── MOBILE RESPONSIVE ── */
        @media (max-width: 768px) {
          .nav-links { display: none; }
          .nav-login { display: none; }
          .bento { grid-template-columns: 1fr; }
          .bento-card.wide { grid-column: span 1; }
          .bento-card.tall { grid-row: span 1; }
          .steps { grid-template-columns: 1fr 1fr; }
          .step-arrow { display: none; }
          .access-grid { grid-template-columns: 1fr; gap: 36px; }
          .testimonials { grid-template-columns: 1fr; }
          .plans-grid { grid-template-columns: 1fr; }
          .footer-inner { grid-template-columns: 1fr 1fr; gap: 28px; }
          .footer-bottom { flex-direction: column; gap: 12px; text-align: center; }
          .mockup-body { grid-template-columns: 1fr 1fr; }
          .mockup-chart { grid-column: span 2; }
          .stats-inner { flex-direction: column; }
          .stat { border-right: none; border-bottom: 1px solid var(--border); }
          .stat:last-child { border-bottom: none; }
        }
        @media (max-width: 480px) {
          .steps { grid-template-columns: 1fr; }
          .footer-inner { grid-template-columns: 1fr; }
          .hero-actions { flex-direction: column; align-items: stretch; }
          .btn-hero, .btn-ghost { text-align: center; }
        }
      `}</style>

      {/* ── NAV ── */}
      <nav className="nav">
        <div className="nav-brand">
          <div className="nav-logo-icon">🍽</div>
          <span className="nav-name">Aldente</span>
        </div>
        <div className="nav-links">
          <a href="#funciones" className="nav-link">Funciones</a>
          <a href="#como-funciona" className="nav-link">Cómo funciona</a>
          <a href="#planes" className="nav-link">Precios</a>
          <a href="#faq" className="nav-link">FAQ</a>
        </div>
        <div className="nav-actions">
          <a href="/login" className="nav-login">Iniciar sesión</a>
          <a href="/registro" className="nav-cta">Prueba gratis →</a>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="hero">
        <div className="hero-glow" />
        <div className="hero-grid" />
        <div className="hero-badge">
          <span className="hero-badge-dot" />
          14 días gratis · Sin tarjeta de crédito
        </div>
        <h1 className="hero-h1">
          El sistema que hace<br />
          que tu restaurante<br />
          <em>trabaje solo</em>
        </h1>
        <p className="hero-sub">
          POS con mapa de mesas, cocina digital, mesero móvil, inventario y reportes reales.
          Todo en un solo sistema desde $800 MXN al mes.
        </p>
        <div className="hero-actions">
          <a href="/registro" className="btn-hero">Registrar mi restaurante →</a>
          <a href="#funciones" className="btn-ghost">Ver todas las funciones</a>
        </div>

        {/* Dashboard mockup */}
        <div className="hero-mockup">
          <div className="mockup-bar">
            <div className="mockup-dot" style={{background:'#ff5f57'}} />
            <div className="mockup-dot" style={{background:'#ffbd2e'}} />
            <div className="mockup-dot" style={{background:'#28c840'}} />
            <div className="mockup-url">aldente.app/<strong style={{color:'#dfa03a'}}>dashboard</strong></div>
          </div>
          <div className="mockup-body">
            {[
              {val:'$18,450', lbl:'Ventas hoy', color:'#c8861f'},
              {val:'23', lbl:'Órdenes activas', color:'#dfa03a'},
              {val:'8/10', lbl:'Mesas ocupadas', color:'#f0bc60'},
              {val:'$324', lbl:'Ticket promedio', color:'#c8861f'},
            ].map(k => (
              <div key={k.lbl} className="mockup-kpi">
                <div className="mockup-kpi-val" style={{color:k.color}}>{k.val}</div>
                <div className="mockup-kpi-lbl">{k.lbl}</div>
              </div>
            ))}
            <div className="mockup-chart">
              {[45,70,55,80,65,90,75,85,60,95,80,70].map((h,i) => (
                <div key={i} className="mockup-bar-chart" style={{height:`${h}%`, opacity: 0.4 + (i/12)*0.6}} />
              ))}
            </div>
            <div className="mockup-tables">
              <div style={{fontSize:'11px', color:'var(--text3)', marginBottom:'10px', textTransform:'uppercase', letterSpacing:'0.06em'}}>Mesas activas</div>
              {[
                {n:'1', status:'🟢', items:'3 platillos'},
                {n:'4', status:'🟡', items:'Esperando'},
                {n:'7', status:'🟢', items:'5 platillos'},
                {n:'9', status:'🔴', items:'Urgente'},
              ].map(t => (
                <div key={t.n} className="mockup-table-row">
                  <div className="mockup-table-num" style={{background:'var(--amberDim)', color:'var(--amber)'}}>M{t.n}</div>
                  <div style={{fontSize:'12px', color:'var(--text2)', flex:1}}>{t.items}</div>
                  <span style={{fontSize:'12px'}}>{t.status}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── STATS ── */}
      <div className="stats-bar">
        <div className="stats-inner">
          {[
            {val:'19', lbl:'Módulos integrados'},
            {val:'56', lbl:'Políticas de seguridad RLS'},
            {val:'14', lbl:'Días de prueba gratis'},
            {val:'$800', lbl:'Precio inicial MXN/mes'},
          ].map(s => (
            <div key={s.lbl} className="stat">
              <div className="stat-val">{s.val}</div>
              <div className="stat-lbl">{s.lbl}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── FEATURES BENTO ── */}
      <section className="section" id="funciones">
        <div className="section-inner">
          <p className="section-eyebrow">Funciones</p>
          <h2 className="section-h2">
            Todo lo que necesitas.<br />
            <em>Nada que no necesitas.</em>
          </h2>
          <p className="section-sub" style={{marginBottom:'48px'}}>
            Cada módulo está diseñado para el flujo real de un restaurante mexicano. Sin funciones de relleno.
          </p>
          <div className="bento">
            <div className="bento-card bento-highlight wide">
              <div className="bento-accent-line" />
              <span className="bento-icon">🗺</span>
              <div className="bento-num">01</div>
              <h3 className="bento-title">Punto de venta con mapa de mesas</h3>
              <p className="bento-body">
                Arrastra las mesas a su posición real, únelas para grupos grandes,
                cobra por separado o junto. Pagos mixtos, descuentos, propinas.
                El POS más completo del mercado a este precio.
              </p>
              <span className="bento-tag">Todos los planes</span>
            </div>
            <div className="bento-card">
              <span className="bento-icon">👨‍🍳</span>
              <div className="bento-num">02</div>
              <h3 className="bento-title">Cocina digital (KDS)</h3>
              <p className="bento-body">
                Semáforo de tiempos en verde, amarillo y rojo. El cocinero ve cada orden al instante. Adiós a las comandas en papel.
              </p>
              <span className="bento-tag">Estándar · Premium</span>
            </div>
            <div className="bento-card">
              <span className="bento-icon">📱</span>
              <div className="bento-num">03</div>
              <h3 className="bento-title">Mesero móvil</h3>
              <p className="bento-body">
                El mesero toma órdenes desde su celular. Sin app store, se instala como PWA. Funciona offline.
              </p>
              <span className="bento-tag">Estándar · Premium</span>
            </div>
            <div className="bento-card">
              <span className="bento-icon">📦</span>
              <div className="bento-num">04</div>
              <h3 className="bento-title">Inventario con costeo real</h3>
              <p className="bento-body">
                Recetas en 3 capas: materia prima, mano de obra y overhead. El costo exacto de cada platillo.
              </p>
              <span className="bento-tag">Estándar · Premium</span>
            </div>
            <div className="bento-card bento-highlight">
              <div className="bento-accent-line" />
              <span className="bento-icon">📊</span>
              <div className="bento-num">05</div>
              <h3 className="bento-title">Reportes que importan</h3>
              <p className="bento-body">
                P&L real, COGS, Market Basket Analysis. Los números que necesitas sin exportar a Excel.
              </p>
              <span className="bento-tag">Estándar · Premium</span>
            </div>
            <div className="bento-card">
              <span className="bento-icon">🖨</span>
              <div className="bento-num">06</div>
              <h3 className="bento-title">Impresora térmica</h3>
              <p className="bento-body">
                Conecta tu impresora por USB o Bluetooth. Imprime comandas y cuentas directo desde el sistema.
              </p>
              <span className="bento-tag">Todos los planes</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="section" style={{background:'var(--bg2)'}} id="como-funciona">
        <div className="section-inner">
          <p className="section-eyebrow">Proceso</p>
          <h2 className="section-h2" style={{marginBottom:'48px'}}>Listo en <em>menos de 15 minutos</em></h2>
          <div className="steps">
            {[
              {n:'01', title:'Te registras', body:'Nombre del restaurante, tu nombre y un PIN de 4 dígitos. Sin formularios interminables.'},
              {n:'02', title:'Ves el sistema con datos demo', body:'Menú, mesas y empleados de ejemplo ya cargados para que veas cómo funciona desde el primer segundo.'},
              {n:'03', title:'Lo configuras a tu medida', body:'Agregas tu menú real, configuras tus mesas y registras a tu equipo. El asistente te guía paso a paso.'},
              {n:'04', title:'Empiezas a operar', body:'Comparte el link único de tu restaurante con tus empleados. Ya pueden entrar y tomar órdenes.'},
            ].map((s, i) => (
              <div key={s.n} className="step">
                <div className="step-num">{s.n}</div>
                <h3 className="step-title">{s.title}</h3>
                <p className="step-body">{s.body}</p>
                {i < 3 && <div className="step-arrow">→</div>}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── ACCESS SECTION ── */}
      <section className="section">
        <div className="section-inner">
          <div className="access-grid">
            <div>
              <p className="section-eyebrow">Acceso</p>
              <h2 className="section-h2">Cada restaurante,<br /><em>su propia puerta</em></h2>
              <p className="section-sub" style={{marginBottom:'36px'}}>
                Olvídate de contraseñas genéricas. Tu restaurante tiene una URL única.
                Tus empleados entran directo — sin saber que existen otros restaurantes en el sistema.
              </p>
              <div className="access-steps">
                {[
                  {n:'1', title:'Obtienes tu URL única al registrarte', body:'aldente.app/r/tu-restaurante — nadie más puede verla ni accederla.'},
                  {n:'2', title:'La compartes con tu equipo una sola vez', body:'Por WhatsApp, impresa en la entrada de la cocina, como tú prefieras.'},
                  {n:'3', title:'Cada quien entra con su nombre y PIN', body:'Sin saber que hay otros restaurantes. Tu operación es completamente privada.'},
                ].map(s => (
                  <div key={s.n} className="access-step">
                    <div className="access-step-n">{s.n}</div>
                    <div className="access-step-content">
                      <div className="access-step-title">{s.title}</div>
                      <div className="access-step-body">{s.body}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="access-visual">
              <div className="access-visual-header">
                <div style={{display:'flex', gap:'6px'}}>
                  <div style={{width:'10px', height:'10px', borderRadius:'50%', background:'#ff5f57'}} />
                  <div style={{width:'10px', height:'10px', borderRadius:'50%', background:'#ffbd2e'}} />
                  <div style={{width:'10px', height:'10px', borderRadius:'50%', background:'#28c840'}} />
                </div>
                <div className="access-url">aldente.app/r/<strong>tacos-el-guero</strong></div>
              </div>
              <div className="access-visual-body">
                <div className="access-restaurant-name">🌮 Tacos El Güero</div>
                <div style={{fontSize:'12px', color:'var(--text3)', marginBottom:'14px', textTransform:'uppercase', letterSpacing:'0.06em'}}>Selecciona tu nombre</div>
                {[
                  {icon:'👤', name:'María García', role:'Cajera'},
                  {icon:'🧑‍🍳', name:'Carlos López', role:'Cocinero'},
                  {icon:'🛎', name:'Ana Martínez', role:'Mesera'},
                ].map(u => (
                  <div key={u.name} className="access-user">
                    <div className="access-avatar">{u.icon}</div>
                    <div>
                      <div className="access-user-name">{u.name}</div>
                      <div className="access-user-role">{u.role}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section className="section" style={{background:'var(--bg2)'}}>
        <div className="section-inner">
          <p className="section-eyebrow">Testimonios</p>
          <h2 className="section-h2" style={{marginBottom:'48px'}}>Lo que dicen<br /><em>los restauranteros</em></h2>
          <div className="testimonials">
            {[
              {quote:'"Antes perdíamos comandas todos los días. Con la cocina digital ya no hay confusión. Mis cocineros saben exactamente qué preparar y en qué orden."', name:'Roberto Sánchez', biz:'La Fonda de Roberto, CDMX', icon:'👨‍🍳'},
              {quote:'"El sistema se paga solo. Con los reportes de costo de recetas descubrí que tres platillos nos estaban dando pérdidas. Los ajustamos y subimos el margen 12%."', name:'Daniela Fuentes', biz:'Restaurante La Hacienda, Monterrey', icon:'👩‍💼'},
              {quote:'"Mis meseros tardaban 10 minutos en llegar a la cocina. Ahora toman la orden en la mesa desde el celular y llega directa. El servicio mejoró muchísimo."', name:'Jorge Méndez', biz:'Mariscos El Puerto, Guadalajara', icon:'🧑‍💼'},
            ].map(t => (
              <div key={t.name} className="testimonial">
                <div className="stars">★★★★★</div>
                <p className="testimonial-quote">{t.quote}</p>
                <div className="testimonial-author">
                  <div className="testimonial-avatar">{t.icon}</div>
                  <div>
                    <div className="testimonial-name">{t.name}</div>
                    <div className="testimonial-biz">{t.biz}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PLANS ── */}
      <section className="section" id="planes">
        <div className="section-inner">
          <p className="section-eyebrow">Precios</p>
          <h2 className="section-h2">Transparente desde<br /><em>el día uno.</em></h2>
          <p className="section-sub" style={{marginBottom:'48px'}}>Todos los planes incluyen 14 días de prueba. Sin compromisos. Sin tarjeta de crédito.</p>
          <div className="plans-grid">
            {[
              {key:'basico', tier:'Básico', price:'$800', period:'MXN / mes', desc:'Para restaurantes que quieren digitalizar la operación esencial.', featured:false,
                features:['POS con mapa de mesas drag & drop','Menú digital con categorías','Gestión de personal y roles','Corte de caja con denominaciones','Dashboard operativo en tiempo real','Tu URL de acceso única','Impresora térmica USB/BT']},
              {key:'estandar', tier:'Estándar', price:'$1,500', period:'MXN / mes', desc:'Para restaurantes que quieren control total de toda su operación.', featured:true,
                features:['Todo lo del plan Básico','Cocina digital KDS con semáforo','Mesero móvil instalable (PWA)','Inventario y recetas con costeo real','Reservaciones online','Programa de lealtad con puntos','Reportes P&L, COGS y Market Basket']},
              {key:'premium', tier:'Premium', price:'$2,500', period:'MXN / mes', desc:'Para operaciones grandes que necesitan control de todo.', featured:false,
                features:['Todo lo del plan Estándar','Delivery (Uber Eats, Rappi, Didi)','Multi-sucursal centralizado','Módulo de recursos humanos','Control de gastos y depreciaciones','Alarmas inteligentes por umbral']},
            ].map(p => (
              <div key={p.key} className={`plan ${p.featured ? 'featured' : ''}`} style={{position:'relative'}}>
                {p.featured && <div className="plan-popular">Más popular</div>}
                <div className="plan-tier">{p.tier}</div>
                <div className="plan-price">{p.price}</div>
                <div className="plan-period">{p.period} · IVA incluido</div>
                <div className="plan-desc">{p.desc}</div>
                <hr className="plan-sep" />
                <ul className="plan-features">
                  {p.features.map(f => <li key={f} className="plan-feature">{f}</li>)}
                </ul>
                <a href="/registro" className={`plan-cta ${p.featured ? 'solid' : 'outline'}`}>Empezar gratis →</a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="section" style={{background:'var(--bg2)'}} id="faq">
        <div className="section-inner">
          <p className="section-eyebrow">Preguntas frecuentes</p>
          <h2 className="section-h2" style={{marginBottom:'40px'}}>Lo que todos<br /><em>quieren saber</em></h2>
          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'16px'}}>
            <div className="faq">
              {[
                {q:'¿Necesito instalar algo?', a:'No. Aldente corre en el navegador de cualquier dispositivo. En Android e iOS puedes instalarlo como app desde el propio navegador (PWA) — sin pasar por ninguna tienda de apps.'},
                {q:'¿Funciona sin internet?', a:'El POS y la cocina tienen modo offline básico. Las órdenes se guardan localmente y se sincronizan cuando vuelve la conexión. Para los reportes y el inventario sí se necesita conexión.'},
                {q:'¿Mis empleados pueden ver los datos de otros restaurantes?', a:'Imposible. Cada restaurante tiene su propia URL y base de datos separada con políticas de seguridad a nivel de fila (RLS). Un empleado de tu restaurante nunca puede ver información de otro.'},
              ].map(f => (
                <div key={f.q} className="faq-item">
                  <div className="faq-q">{f.q}</div>
                  <div className="faq-a">{f.a}</div>
                </div>
              ))}
            </div>
            <div className="faq">
              {[
                {q:'¿Puedo cancelar cuando quiera?', a:'Sí. Sin contratos, sin penalizaciones, sin períodos mínimos. Cancelas cuando quieras desde el panel y listo. Tus datos se conservan 30 días por si cambias de opinión.'},
                {q:'¿Qué pasa cuando termina el período de prueba?', a:'Si no has configurado tu método de pago, el sistema muestra una pantalla de renovación. Ningún dato se borra. Puedes continuar desde donde lo dejaste en cuanto activas tu plan.'},
                {q:'¿Funciona con mi impresora térmica?', a:'Sí, compatible con impresoras térmicas vía USB y Bluetooth. Modelos populares como Epson, Star y Bixolon. Si tienes dudas sobre tu modelo, escríbenos antes de contratar.'},
              ].map(f => (
                <div key={f.q} className="faq-item">
                  <div className="faq-q">{f.q}</div>
                  <div className="faq-a">{f.a}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA FINAL ── */}
      <div className="cta-final">
        <h2 className="cta-h2">¿Listo para digitalizar<br />tu restaurante?</h2>
        <p className="cta-sub">14 días gratis. Sin tarjeta. Sin compromisos.<br />Cancela cuando quieras.</p>
        <div className="cta-actions">
          <a href="/registro" className="btn-hero">Crear mi restaurante gratis →</a>
          <a href="mailto:soporte@aldente.mx" className="btn-ghost">Hablar con soporte</a>
        </div>
      </div>

      {/* ── FOOTER ── */}
      <footer className="footer">
        <div className="footer-inner">
          <div>
            <div className="footer-brand-name">Aldente</div>
            <p className="footer-brand-desc">Sistema de gestión integral para restaurantes. Hecho en México para el mundo hispanohablante.</p>
          </div>
          <div>
            <div className="footer-col-title">Producto</div>
            <a href="#funciones" className="footer-link">Funciones</a>
            <a href="#planes" className="footer-link">Precios</a>
            <a href="/registro" className="footer-link">Prueba gratis</a>
            <a href="/login" className="footer-link">Iniciar sesión</a>
          </div>
          <div>
            <div className="footer-col-title">Empresa</div>
            <a href="mailto:soporte@aldente.mx" className="footer-link">Contacto</a>
            <a href="mailto:ventas@aldente.mx" className="footer-link">Ventas</a>
          </div>
          <div>
            <div className="footer-col-title">Soporte</div>
            <a href="mailto:soporte@aldente.mx" className="footer-link">soporte@aldente.mx</a>
            <a href="#faq" className="footer-link">Preguntas frecuentes</a>
          </div>
        </div>
        <div className="footer-bottom">
          <span className="footer-copy">© {new Date().getFullYear()} Aldente. Todos los derechos reservados.</span>
          <span className="footer-copy">Hecho con ♥ en México</span>
        </div>
      </footer>
    </>
  );
}
