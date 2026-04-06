import type { Metadata } from 'next';

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
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,300;1,400;1,500&family=Outfit:wght@300;400;500;600&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: smooth; -webkit-text-size-adjust: 100%; }

        :root {
          --ink:      #080808;
          --ink2:     #0d0d0d;
          --ink3:     #131313;
          --ink4:     #1c1c1c;
          --ink5:     #252525;
          --line:     rgba(255,255,255,0.06);
          --lineM:    rgba(255,255,255,0.10);
          --lineS:    rgba(255,255,255,0.18);
          --paper:    #f5f0e8;
          --paper2:   #ede8de;
          --gold:     #c9963a;
          --goldL:    #dba84a;
          --goldXL:   #efc06a;
          --goldDim:  rgba(201,150,58,0.08);
          --goldLine: rgba(201,150,58,0.20);
          --goldLineS:rgba(201,150,58,0.40);
          --cream:    rgba(245,240,232,0.85);
          --cream2:   rgba(245,240,232,0.55);
          --cream3:   rgba(245,240,232,0.30);
          --cream4:   rgba(245,240,232,0.15);
          --r:        14px;
          --rL:       20px;
          --rXL:      28px;
        }

        body {
          background: var(--ink);
          color: var(--paper);
          font-family: 'Outfit', system-ui, sans-serif;
          -webkit-font-smoothing: antialiased;
          overflow-x: hidden;
        }

        a { text-decoration: none; color: inherit; }

        /* ── GRAIN OVERLAY ── */
        body::before {
          content: '';
          position: fixed; inset: 0; z-index: 1000;
          pointer-events: none;
          opacity: 0.025;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
          background-size: 180px;
        }

        /* ── NAV ── */
        .nav {
          position: fixed; top: 0; left: 0; right: 0; z-index: 900;
          height: 68px;
          display: flex; align-items: center; justify-content: space-between;
          padding: 0 clamp(24px, 5vw, 64px);
          background: rgba(8,8,8,0.88);
          backdrop-filter: blur(28px) saturate(1.8);
          -webkit-backdrop-filter: blur(28px) saturate(1.8);
          border-bottom: 1px solid var(--line);
          animation: navIn .6s ease both;
        }
        @keyframes navIn { from { opacity:0; transform: translateY(-8px); } to { opacity:1; transform:none; } }

        .nav-wordmark {
          font-family: 'Cormorant Garamond', Georgia, serif;
          font-size: 24px; font-weight: 500; letter-spacing: 0.06em;
          color: var(--gold); text-transform: uppercase;
        }
        .nav-links { display: flex; gap: 2px; }
        .nav-link {
          padding: 7px 14px; border-radius: 8px;
          font-size: 13px; font-weight: 400; letter-spacing: 0.02em;
          color: var(--cream3); transition: color .15s;
        }
        .nav-link:hover { color: var(--cream2); }
        .nav-right { display: flex; align-items: center; gap: 12px; }
        .nav-signin {
          font-size: 13px; color: var(--cream3);
          padding: 8px 16px; border-radius: 9px;
          border: 1px solid var(--line);
          transition: all .2s;
        }
        .nav-signin:hover { border-color: var(--lineM); color: var(--cream2); }
        .nav-cta {
          font-size: 13px; font-weight: 500;
          padding: 9px 20px; border-radius: 9px;
          background: var(--gold); color: var(--ink);
          letter-spacing: 0.02em;
          transition: background .15s, transform .1s;
        }
        .nav-cta:hover { background: var(--goldL); transform: translateY(-1px); }

        /* ── HERO ── */
        .hero {
          min-height: 100svh;
          display: grid; place-items: center;
          padding: 120px clamp(24px, 6vw, 80px) 80px;
          position: relative; overflow: hidden;
          text-align: center;
        }

        /* Animated radial glow */
        .hero-glow {
          position: absolute; top: -20%; left: 50%; transform: translateX(-50%);
          width: 900px; height: 900px;
          background: radial-gradient(ellipse at 50% 40%,
            rgba(201,150,58,0.07) 0%,
            rgba(201,150,58,0.03) 35%,
            transparent 65%);
          pointer-events: none;
          animation: glowPulse 8s ease-in-out infinite;
        }
        @keyframes glowPulse {
          0%, 100% { opacity: 1; transform: translateX(-50%) scale(1); }
          50% { opacity: 0.6; transform: translateX(-50%) scale(1.08); }
        }

        /* Fine grid lines */
        .hero-grid {
          position: absolute; inset: 0; pointer-events: none;
          background-image:
            linear-gradient(var(--line) 1px, transparent 1px),
            linear-gradient(90deg, var(--line) 1px, transparent 1px);
          background-size: 72px 72px;
          mask-image: radial-gradient(ellipse 85% 70% at 50% 10%, black 0%, transparent 100%);
        }

        .hero-content { position: relative; max-width: 900px; }

        .hero-eyebrow {
          display: inline-flex; align-items: center; gap: 12px;
          font-size: 11px; font-weight: 500;
          letter-spacing: 0.18em; text-transform: uppercase;
          color: var(--gold);
          margin-bottom: 36px;
          animation: fadeUp .8s .1s ease both;
        }
        .hero-eyebrow::before, .hero-eyebrow::after {
          content: ''; display: block;
          width: 32px; height: 1px; background: var(--goldLine);
        }

        .hero-h1 {
          font-family: 'Cormorant Garamond', Georgia, serif;
          font-size: clamp(52px, 8.5vw, 104px);
          font-weight: 300; line-height: 0.96;
          letter-spacing: -2px; color: var(--paper);
          margin-bottom: 28px;
          animation: fadeUp .9s .2s ease both;
        }
        .hero-h1 em {
          font-style: italic; font-weight: 300;
          color: var(--gold);
        }
        .hero-h1 strong {
          font-weight: 500;
          display: block;
        }

        .hero-sub {
          font-size: clamp(15px, 1.8vw, 18px);
          font-weight: 300; line-height: 1.75;
          color: var(--cream2); max-width: 520px;
          margin: 0 auto 44px;
          animation: fadeUp .9s .35s ease both;
        }

        .hero-actions {
          display: flex; gap: 14px;
          justify-content: center; flex-wrap: wrap;
          margin-bottom: 64px;
          animation: fadeUp .9s .45s ease both;
        }
        .btn-primary {
          padding: 15px 32px; border-radius: 11px;
          background: var(--gold); color: var(--ink);
          font-size: 15px; font-weight: 500; letter-spacing: 0.02em;
          border: none; cursor: pointer;
          transition: background .15s, transform .1s, box-shadow .2s;
        }
        .btn-primary:hover {
          background: var(--goldL);
          transform: translateY(-2px);
          box-shadow: 0 12px 32px rgba(201,150,58,0.25);
        }
        .btn-outline {
          padding: 15px 32px; border-radius: 11px;
          border: 1px solid var(--lineM); color: var(--cream2);
          font-size: 15px; font-weight: 400;
          transition: all .15s; background: transparent;
        }
        .btn-outline:hover { border-color: var(--lineS); color: var(--cream); }

        /* URL pill */
        .hero-url {
          display: inline-flex; align-items: center; gap: 0;
          font-family: 'Outfit', monospace; font-size: 13px;
          background: var(--ink3); border: 1px solid var(--lineM);
          border-radius: 100px; padding: 10px 22px;
          animation: fadeUp .9s .55s ease both;
        }
        .hero-url .base { color: var(--cream3); }
        .hero-url .slug { color: var(--goldXL); font-weight: 500; }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: none; }
        }

        /* ── MARQUEE ── */
        .marquee-wrap {
          border-top: 1px solid var(--line);
          border-bottom: 1px solid var(--line);
          background: var(--ink2);
          overflow: hidden; padding: 16px 0;
        }
        .marquee-track {
          display: flex; gap: 0;
          animation: marquee 30s linear infinite;
          width: max-content;
        }
        .marquee-track:hover { animation-play-state: paused; }
        @keyframes marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        .marquee-item {
          display: flex; align-items: center; gap: 10px;
          padding: 0 40px; white-space: nowrap;
          font-size: 12px; font-weight: 500;
          letter-spacing: 0.1em; text-transform: uppercase;
          color: var(--cream3);
        }
        .marquee-dot { width: 3px; height: 3px; border-radius: 50%; background: var(--goldLine); }

        /* ── SECTIONS ── */
        .section {
          padding: clamp(80px, 10vw, 140px) clamp(24px, 6vw, 80px);
        }
        .inner { max-width: 1200px; margin: 0 auto; }

        .eyebrow {
          display: flex; align-items: center; gap: 16px;
          font-size: 11px; font-weight: 500; letter-spacing: 0.16em;
          text-transform: uppercase; color: var(--gold);
          margin-bottom: 20px;
        }
        .eyebrow::after { content: ''; flex: 1; max-width: 60px; height: 1px; background: var(--goldLine); }

        .display-h2 {
          font-family: 'Cormorant Garamond', Georgia, serif;
          font-size: clamp(36px, 5vw, 64px);
          font-weight: 300; line-height: 1.05;
          letter-spacing: -1px; color: var(--paper);
        }
        .display-h2 em { font-style: italic; color: var(--cream3); }

        /* ── FEATURE LAYOUT — editorial grid ── */
        .features-header {
          display: grid; grid-template-columns: 1fr 1fr;
          gap: 60px; align-items: end;
          margin-bottom: 72px;
        }
        .features-sub {
          font-size: 16px; color: var(--cream2);
          line-height: 1.75; font-weight: 300;
          align-self: end;
        }

        .features-list {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1px;
          background: var(--line);
          border: 1px solid var(--line);
          border-radius: var(--rXL);
          overflow: hidden;
        }
        .feature {
          background: var(--ink2);
          padding: clamp(28px, 3vw, 44px);
          position: relative; overflow: hidden;
          transition: background .25s;
        }
        .feature:hover { background: var(--ink3); }
        .feature::before {
          content: '';
          position: absolute; top: 0; left: 0; right: 0;
          height: 1px;
          background: linear-gradient(90deg, transparent 0%, var(--goldLine) 50%, transparent 100%);
          opacity: 0;
          transition: opacity .3s;
        }
        .feature:hover::before { opacity: 1; }
        .feature.span2 { grid-column: span 2; }

        .feature-index {
          font-family: 'Cormorant Garamond', serif;
          font-size: 11px; letter-spacing: 0.12em;
          color: var(--gold); opacity: 0.6;
          margin-bottom: 24px; display: block;
        }
        .feature-title {
          font-family: 'Cormorant Garamond', serif;
          font-size: 24px; font-weight: 500;
          color: var(--paper); line-height: 1.2;
          margin-bottom: 12px; letter-spacing: -0.3px;
        }
        .feature-body {
          font-size: 14px; color: var(--cream2);
          line-height: 1.75; font-weight: 300;
          margin-bottom: 20px;
        }
        .feature-plan {
          display: inline-block;
          font-size: 10px; font-weight: 500;
          letter-spacing: 0.1em; text-transform: uppercase;
          padding: 5px 12px; border-radius: 100px;
          background: var(--ink); border: 1px solid var(--line);
          color: var(--cream3);
        }

        /* ── DASHBOARD PREVIEW ── */
        .preview-wrap {
          border-radius: var(--rXL);
          overflow: hidden;
          border: 1px solid var(--lineM);
          box-shadow: 0 0 0 1px rgba(255,255,255,0.03), 0 60px 120px rgba(0,0,0,0.7);
          margin-top: 72px;
        }
        .preview-bar {
          background: var(--ink3);
          border-bottom: 1px solid var(--line);
          padding: 14px 20px;
          display: flex; align-items: center; gap: 10px;
        }
        .preview-dots { display: flex; gap: 7px; }
        .preview-dot { width: 11px; height: 11px; border-radius: 50%; }
        .preview-url-bar {
          flex: 1; background: var(--ink2);
          border-radius: 7px; padding: 6px 14px;
          font-size: 12px; color: var(--cream3);
          font-family: 'Outfit', monospace;
          margin: 0 16px;
        }
        .preview-body {
          background: var(--ink2);
          padding: 28px;
          display: grid; grid-template-columns: repeat(4, 1fr) 1.6fr;
          gap: 12px;
        }
        .preview-kpi {
          background: var(--ink3); border: 1px solid var(--line);
          border-radius: var(--r); padding: 18px;
        }
        .preview-kpi-val {
          font-family: 'Cormorant Garamond', serif;
          font-size: 26px; font-weight: 400;
          color: var(--goldXL); margin-bottom: 4px;
          letter-spacing: -0.5px;
        }
        .preview-kpi-lbl { font-size: 11px; color: var(--cream3); font-weight: 300; }
        .preview-chart {
          grid-column: 1 / 5;
          background: var(--ink3); border: 1px solid var(--line);
          border-radius: var(--r); padding: 18px;
          display: flex; flex-direction: column; gap: 14px;
        }
        .preview-chart-label { font-size: 11px; color: var(--cream3); text-transform: uppercase; letter-spacing: 0.08em; }
        .preview-bars { display: flex; align-items: flex-end; gap: 5px; height: 80px; }
        .preview-bar-item { flex: 1; border-radius: 3px 3px 0 0; }
        .preview-sidebar {
          grid-row: span 2;
          background: var(--ink3); border: 1px solid var(--line);
          border-radius: var(--r); padding: 18px;
          display: flex; flex-direction: column; gap: 10px;
        }
        .preview-sidebar-label { font-size: 11px; color: var(--cream3); text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 4px; }
        .preview-table-row {
          display: flex; align-items: center; gap: 10px;
          padding: 8px; border-radius: 8px;
          border: 1px solid var(--line);
          background: var(--ink2);
        }
        .preview-mesa {
          width: 30px; height: 30px; border-radius: 7px;
          background: var(--goldDim); border: 1px solid var(--goldLine);
          display: flex; align-items: center; justify-content: center;
          font-size: 11px; font-weight: 600; color: var(--gold);
          flex-shrink: 0;
        }
        .preview-mesa-info { flex: 1; }
        .preview-mesa-name { font-size: 12px; color: var(--cream2); font-weight: 500; }
        .preview-mesa-status { font-size: 10px; color: var(--cream3); }
        .preview-status-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }

        /* ── STEPS ── */
        .steps-grid {
          display: grid; grid-template-columns: repeat(4, 1fr);
          gap: 0;
          border: 1px solid var(--line);
          border-radius: var(--rXL); overflow: hidden;
          background: var(--line);
        }
        .step {
          background: var(--ink2); padding: 44px 36px;
          position: relative;
        }
        .step-num {
          font-family: 'Cormorant Garamond', serif;
          font-size: 72px; font-weight: 300;
          line-height: 1; color: var(--ink4);
          margin-bottom: 28px; display: block;
          font-style: italic; letter-spacing: -3px;
        }
        .step-title {
          font-family: 'Cormorant Garamond', serif;
          font-size: 20px; font-weight: 500;
          color: var(--paper); margin-bottom: 10px;
        }
        .step-body { font-size: 13px; color: var(--cream2); line-height: 1.7; font-weight: 300; }

        /* ── ACCESS ── */
        .access-layout {
          display: grid; grid-template-columns: 1fr 1fr;
          gap: 80px; align-items: center;
        }
        .access-steps { display: flex; flex-direction: column; gap: 0; }
        .access-step {
          display: flex; gap: 20px;
          padding: 28px 0;
          border-bottom: 1px solid var(--line);
        }
        .access-step:last-child { border-bottom: none; }
        .access-num {
          font-family: 'Cormorant Garamond', serif;
          font-size: 13px; color: var(--gold);
          font-style: italic; flex-shrink: 0;
          padding-top: 2px; width: 20px;
        }
        .access-step-title { font-size: 15px; font-weight: 500; color: var(--paper); margin-bottom: 6px; }
        .access-step-body  { font-size: 13px; color: var(--cream2); line-height: 1.65; font-weight: 300; }

        .access-visual {
          background: var(--ink2); border: 1px solid var(--lineM);
          border-radius: var(--rXL); overflow: hidden;
        }
        .access-visual-header {
          background: var(--ink3);
          padding: 14px 20px; border-bottom: 1px solid var(--line);
          display: flex; align-items: center; gap: 12px;
        }
        .access-visual-dots { display: flex; gap: 6px; }
        .access-visual-dot { width: 10px; height: 10px; border-radius: 50%; }
        .access-visual-url {
          font-size: 12px; color: var(--cream3);
          font-family: 'Outfit', monospace;
        }
        .access-visual-url strong { color: var(--goldXL); }
        .access-visual-body { padding: 28px 24px; }
        .access-restaurant-name {
          font-family: 'Cormorant Garamond', serif;
          font-size: 22px; font-weight: 400;
          color: var(--paper); margin-bottom: 20px;
          letter-spacing: -0.3px;
        }
        .access-user-list { display: flex; flex-direction: column; gap: 8px; }
        .access-user-item {
          display: flex; align-items: center; gap: 14px;
          padding: 12px 14px; border-radius: 10px;
          background: var(--ink3); border: 1px solid var(--line);
          cursor: pointer; transition: border-color .15s, background .15s;
        }
        .access-user-item:hover { border-color: var(--goldLine); background: var(--ink4); }
        .access-avatar {
          width: 36px; height: 36px; border-radius: 50%;
          overflow: hidden; flex-shrink: 0;
          background: var(--ink4); border: 1px solid var(--line);
          display: flex; align-items: center; justify-content: center;
        }
        .access-avatar-placeholder {
          width: 100%; height: 100%;
          background: linear-gradient(135deg, var(--ink5) 0%, var(--ink3) 100%);
          display: flex; align-items: center; justify-content: center;
          font-family: 'Cormorant Garamond', serif;
          font-size: 14px; color: var(--cream3); font-weight: 500;
        }
        .access-user-name { font-size: 14px; color: var(--paper); font-weight: 500; }
        .access-user-role { font-size: 11px; color: var(--cream3); }

        /* ── TESTIMONIALS ── */
        .testimonials-header {
          display: grid; grid-template-columns: 1fr 1fr;
          gap: 60px; align-items: end;
          margin-bottom: 60px;
        }
        .testimonials-note {
          font-size: 13px; color: var(--cream3);
          line-height: 1.65; font-weight: 300;
          padding-bottom: 4px;
          border-left: 2px solid var(--goldLine);
          padding-left: 16px;
        }
        .testimonials-grid {
          display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px;
        }
        .testimonial {
          background: var(--ink2); border: 1px solid var(--line);
          border-radius: var(--rL); padding: 32px 28px;
          display: flex; flex-direction: column;
          transition: border-color .2s;
        }
        .testimonial:hover { border-color: var(--lineM); }
        .stars {
          display: flex; gap: 4px; margin-bottom: 20px;
        }
        .star {
          width: 12px; height: 12px;
          background: var(--gold); clip-path: polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%);
        }
        .testimonial-quote {
          font-family: 'Cormorant Garamond', serif;
          font-size: 18px; font-weight: 300; font-style: italic;
          color: var(--cream); line-height: 1.65;
          margin-bottom: 24px; flex: 1;
        }
        .testimonial-divider { height: 1px; background: var(--line); margin-bottom: 20px; }
        .testimonial-author { display: flex; align-items: center; gap: 14px; }
        .testimonial-photo {
          width: 44px; height: 44px; border-radius: 50%;
          background: var(--ink4); border: 1px solid var(--lineM);
          overflow: hidden; flex-shrink: 0;
          position: relative;
        }
        .testimonial-photo img {
          width: 100%; height: 100%; object-fit: cover;
        }
        .testimonial-photo-placeholder {
          width: 100%; height: 100%;
          background: linear-gradient(135deg, var(--ink5) 0%, var(--ink3) 100%);
          display: flex; align-items: center; justify-content: center;
          font-family: 'Cormorant Garamond', serif;
          font-size: 16px; font-weight: 500; color: var(--cream3);
        }
        .testimonial-name { font-size: 14px; font-weight: 500; color: var(--paper); margin-bottom: 2px; }
        .testimonial-biz  { font-size: 12px; color: var(--cream3); }

        /* ── PLANS ── */
        .plans-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; align-items: start; }
        .plan {
          border: 1px solid var(--line); border-radius: var(--rXL);
          padding: 36px 30px; background: var(--ink2);
          display: flex; flex-direction: column;
          transition: border-color .2s;
          position: relative;
        }
        .plan:hover { border-color: var(--lineM); }
        .plan.featured {
          border-color: var(--goldLine);
          background: var(--ink3);
        }
        .plan.featured::before {
          content: '';
          position: absolute; top: 0; left: 0; right: 0; height: 1px;
          background: linear-gradient(90deg, transparent, var(--gold), transparent);
        }
        .plan-badge {
          position: absolute; top: -13px; left: 50%; transform: translateX(-50%);
          background: var(--gold); color: var(--ink);
          font-size: 10px; font-weight: 600;
          letter-spacing: 0.1em; text-transform: uppercase;
          padding: 5px 18px; border-radius: 100px;
          white-space: nowrap;
        }
        .plan-tier {
          font-size: 11px; font-weight: 500;
          letter-spacing: 0.12em; text-transform: uppercase;
          color: var(--gold); margin-bottom: 12px;
        }
        .plan-price {
          font-family: 'Cormorant Garamond', serif;
          font-size: 56px; font-weight: 300;
          color: var(--paper); line-height: 1;
          letter-spacing: -2px; margin-bottom: 4px;
        }
        .plan-period { font-size: 13px; color: var(--cream3); margin-bottom: 14px; }
        .plan-desc { font-size: 14px; color: var(--cream2); line-height: 1.65; font-weight: 300; margin-bottom: 24px; }
        .plan-sep { border: none; border-top: 1px solid var(--line); margin-bottom: 24px; }
        .plan-features { list-style: none; display: flex; flex-direction: column; gap: 10px; margin-bottom: 36px; flex: 1; }
        .plan-feature { display: flex; gap: 12px; font-size: 13px; color: var(--cream2); line-height: 1.5; }
        .plan-feature-check { color: var(--gold); font-size: 11px; flex-shrink: 0; margin-top: 2px; }
        .plan-cta {
          display: block; text-align: center;
          padding: 14px; border-radius: 11px;
          font-size: 14px; font-weight: 500;
          transition: all .15s;
        }
        .plan-cta.solid  { background: var(--gold); color: var(--ink); }
        .plan-cta.solid:hover { background: var(--goldL); transform: translateY(-1px); }
        .plan-cta.ghost  { border: 1px solid var(--lineM); color: var(--cream2); }
        .plan-cta.ghost:hover { border-color: var(--lineS); color: var(--cream); }

        /* ── FAQ ── */
        .faq-cols { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        .faq-group { display: flex; flex-direction: column; gap: 1px; background: var(--line); border: 1px solid var(--line); border-radius: var(--rL); overflow: hidden; }
        .faq-item { background: var(--ink2); padding: 24px 28px; }
        .faq-q { font-family: 'Cormorant Garamond', serif; font-size: 17px; font-weight: 500; color: var(--paper); margin-bottom: 10px; line-height: 1.3; }
        .faq-a { font-size: 13px; color: var(--cream2); line-height: 1.75; font-weight: 300; }

        /* ── CTA FINAL ── */
        .cta-block {
          margin: 0 clamp(16px, 5vw, 64px) clamp(60px, 8vw, 100px);
          border-radius: var(--rXL);
          border: 1px solid var(--lineM);
          background: var(--ink2);
          padding: clamp(60px, 7vw, 100px) clamp(32px, 5vw, 80px);
          text-align: center; position: relative; overflow: hidden;
        }
        .cta-block::before {
          content: '';
          position: absolute; top: -100px; left: 50%; transform: translateX(-50%);
          width: 700px; height: 400px;
          background: radial-gradient(ellipse, rgba(201,150,58,0.06) 0%, transparent 70%);
          pointer-events: none;
        }
        .cta-block::after {
          content: '';
          position: absolute; top: 0; left: 0; right: 0; height: 1px;
          background: linear-gradient(90deg, transparent, var(--goldLine), transparent);
        }
        .cta-h2 {
          font-family: 'Cormorant Garamond', serif;
          font-size: clamp(36px, 5vw, 64px);
          font-weight: 300; letter-spacing: -1.5px;
          line-height: 1.05; margin-bottom: 16px;
          color: var(--paper);
        }
        .cta-h2 em { font-style: italic; color: var(--gold); }
        .cta-sub { font-size: 16px; color: var(--cream2); margin-bottom: 44px; font-weight: 300; }
        .cta-actions { display: flex; gap: 14px; justify-content: center; flex-wrap: wrap; }

        /* ── FOOTER ── */
        .footer { border-top: 1px solid var(--line); }
        .footer-inner {
          max-width: 1200px; margin: 0 auto;
          padding: clamp(48px, 6vw, 72px) clamp(24px, 6vw, 80px);
          display: grid; grid-template-columns: 2fr 1fr 1fr 1fr; gap: 48px;
        }
        .footer-wordmark {
          font-family: 'Cormorant Garamond', serif;
          font-size: 26px; font-weight: 400;
          color: var(--gold); letter-spacing: 0.04em;
          text-transform: uppercase; margin-bottom: 12px;
        }
        .footer-desc { font-size: 13px; color: var(--cream3); line-height: 1.7; font-weight: 300; }
        .footer-col-title {
          font-size: 10px; text-transform: uppercase;
          letter-spacing: 0.12em; color: var(--cream3);
          margin-bottom: 18px; font-weight: 500;
        }
        .footer-link { display: block; font-size: 13px; color: var(--cream3); margin-bottom: 12px; transition: color .15s; }
        .footer-link:hover { color: var(--cream2); }
        .footer-bottom {
          max-width: 1200px; margin: 0 auto;
          padding: 24px clamp(24px, 6vw, 80px);
          border-top: 1px solid var(--line);
          display: flex; justify-content: space-between; align-items: center;
        }
        .footer-copy { font-size: 12px; color: var(--cream4); }

        /* ── RESPONSIVE ── */
        @media (max-width: 900px) {
          .nav-links { display: none; }
          .nav-signin { display: none; }
          .features-header { grid-template-columns: 1fr; gap: 24px; }
          .features-list { grid-template-columns: 1fr; }
          .feature.span2 { grid-column: span 1; }
          .steps-grid { grid-template-columns: 1fr 1fr; }
          .access-layout { grid-template-columns: 1fr; gap: 40px; }
          .testimonials-header { grid-template-columns: 1fr; gap: 20px; }
          .testimonials-grid { grid-template-columns: 1fr; }
          .plans-grid { grid-template-columns: 1fr; }
          .faq-cols { grid-template-columns: 1fr; }
          .footer-inner { grid-template-columns: 1fr 1fr; gap: 32px; }
          .footer-bottom { flex-direction: column; gap: 10px; }
          .preview-body { grid-template-columns: 1fr 1fr; }
          .preview-chart { grid-column: span 2; }
          .preview-sidebar { grid-column: span 2; grid-row: span 1; }
        }
        @media (max-width: 540px) {
          .hero-actions { flex-direction: column; }
          .btn-primary, .btn-outline { text-align: center; }
          .steps-grid { grid-template-columns: 1fr; }
          .footer-inner { grid-template-columns: 1fr; }
          .testimonials-grid { grid-template-columns: 1fr; }
        }
      `}</style>

      {/* ── NAV ── */}
      <nav className="nav">
        <span className="nav-wordmark">Aldente</span>
        <div className="nav-links">
          <a href="#funciones" className="nav-link">Funciones</a>
          <a href="#como-funciona" className="nav-link">Cómo funciona</a>
          <a href="#planes" className="nav-link">Precios</a>
          <a href="#faq" className="nav-link">FAQ</a>
        </div>
        <div className="nav-right">
          <a href="/login" className="nav-signin">Iniciar sesión</a>
          <a href="/registro" className="nav-cta">Prueba gratis</a>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="hero">
        <div className="hero-glow" />
        <div className="hero-grid" />
        <div className="hero-content">
          <div className="hero-eyebrow">Software para restaurantes</div>
          <h1 className="hero-h1">
            <strong>Opera mejor.</strong>
            <em>Vende más.</em>
            Preocúpate menos.
          </h1>
          <p className="hero-sub">
            POS con mapa de mesas, cocina digital, mesero móvil e inventario real.
            Todo integrado, desde $800 MXN al mes.
          </p>
          <div className="hero-actions">
            <a href="/registro" className="btn-primary">Registrar mi restaurante →</a>
            <a href="#funciones" className="btn-outline">Ver funciones</a>
          </div>
          <div className="hero-url">
            <span className="base">aldente.app/r/</span>
            <span className="slug">tu-restaurante</span>
          </div>
        </div>
      </section>

      {/* ── MARQUEE ── */}
      <div className="marquee-wrap">
        <div className="marquee-track">
          {[...Array(2)].map((_, i) => (
            ['Punto de venta', 'Cocina digital KDS', 'Mesero móvil PWA', 'Inventario inteligente', 'Reportes P&L', 'Programa de lealtad', 'Reservaciones', 'Multi-sucursal', 'Control de gastos', 'Impresora térmica', 'Delivery integrado', 'Roles y permisos'].map(item => (
              <span key={`${i}-${item}`} className="marquee-item">
                <span className="marquee-dot" />
                {item}
              </span>
            ))
          ))}
        </div>
      </div>

      {/* ── FEATURES ── */}
      <section className="section" id="funciones">
        <div className="inner">
          <div className="features-header">
            <div>
              <div className="eyebrow">Módulos</div>
              <h2 className="display-h2">
                Todo lo que necesita<br />
                un restaurante serio.<br />
                <em>Sin funciones de relleno.</em>
              </h2>
            </div>
            <p className="features-sub">
              Cada módulo está diseñado para el flujo real de un restaurante mexicano.
              Sin importar si tienes 4 mesas o 40, el sistema se adapta a ti.
            </p>
          </div>
          <div className="features-list">
            {[
              { n:'01', title:'Punto de venta', body:'Mapa de mesas drag & drop, unión de mesas, pagos mixtos, descuentos y propinas. El POS más completo del mercado a este precio.', plan:'Todos los planes', span: true },
              { n:'02', title:'Cocina digital (KDS)', body:'Pantalla de cocina con semáforo de tiempos en verde, amarillo y rojo. El cocinero ve cada orden al instante. Adiós a las comandas en papel.', plan:'Estándar · Premium' },
              { n:'03', title:'Mesero móvil', body:'El mesero toma órdenes desde su celular. Se instala como app sin pasar por ninguna tienda. Funciona offline.', plan:'Estándar · Premium' },
              { n:'04', title:'Inventario y costeo real', body:'Recetas en 3 capas: materia prima, mano de obra y overhead. El costo exacto de cada platillo, al centavo.', plan:'Estándar · Premium' },
              { n:'05', title:'Reportes que importan', body:'P&L real, COGS, Market Basket Analysis. Los números que necesitas sin exportar a Excel.', plan:'Estándar · Premium' },
              { n:'06', title:'Impresora térmica', body:'Conecta tu impresora por USB o Bluetooth. Imprime comandas y cuentas directo del sistema. Modelos Epson, Star, Bixolon.', plan:'Todos los planes' },
            ].map(f => (
              <div key={f.n} className={`feature${f.span ? ' span2' : ''}`}>
                <span className="feature-index">{f.n}</span>
                <h3 className="feature-title">{f.title}</h3>
                <p className="feature-body">{f.body}</p>
                <span className="feature-plan">{f.plan}</span>
              </div>
            ))}
          </div>

          {/* Dashboard preview */}
          <div className="preview-wrap">
            <div className="preview-bar">
              <div className="preview-dots">
                <div className="preview-dot" style={{background:'#ff5f57'}} />
                <div className="preview-dot" style={{background:'#ffbd2e'}} />
                <div className="preview-dot" style={{background:'#28c840'}} />
              </div>
              <div className="preview-url-bar">
                aldente.app/<strong style={{color:'#dfa03a'}}>dashboard</strong>
              </div>
            </div>
            <div className="preview-body">
              {[
                {val:'$18,450', lbl:'Ventas hoy'},
                {val:'23', lbl:'Órdenes activas'},
                {val:'8 / 10', lbl:'Mesas ocupadas'},
                {val:'$324', lbl:'Ticket promedio'},
              ].map(k => (
                <div key={k.lbl} className="preview-kpi">
                  <div className="preview-kpi-val">{k.val}</div>
                  <div className="preview-kpi-lbl">{k.lbl}</div>
                </div>
              ))}
              <div className="preview-sidebar">
                <div className="preview-sidebar-label">Mesas activas</div>
                {[
                  {n:'01', name:'Mesa 1', status:'En servicio', color:'#22c55e'},
                  {n:'04', name:'Mesa 4', status:'Esperando', color:'#eab308'},
                  {n:'07', name:'Mesa 7', status:'En servicio', color:'#22c55e'},
                  {n:'09', name:'Mesa 9', status:'Urgente', color:'#ef4444'},
                ].map(t => (
                  <div key={t.n} className="preview-table-row">
                    <div className="preview-mesa">M{t.n}</div>
                    <div className="preview-mesa-info">
                      <div className="preview-mesa-name">{t.name}</div>
                      <div className="preview-mesa-status">{t.status}</div>
                    </div>
                    <div className="preview-status-dot" style={{background: t.color}} />
                  </div>
                ))}
              </div>
              <div className="preview-chart">
                <div className="preview-chart-label">Ventas por hora — hoy</div>
                <div className="preview-bars">
                  {[20,45,35,60,75,55,80,90,65,85,70,95,60,40].map((h,i) => (
                    <div key={i} className="preview-bar-item" style={{
                      height: `${h}%`,
                      background: `rgba(201,150,58,${0.15 + (i/14)*0.55})`,
                      border: '1px solid rgba(201,150,58,0.2)',
                    }} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CÓMO FUNCIONA ── */}
      <section className="section" style={{background:'var(--ink2)'}} id="como-funciona">
        <div className="inner">
          <div className="eyebrow" style={{marginBottom:'48px'}}>Proceso</div>
          <h2 className="display-h2" style={{marginBottom:'56px'}}>
            Listo en menos de<br /><em>quince minutos</em>
          </h2>
          <div className="steps-grid">
            {[
              {n:'I',  title:'Te registras',           body:'Nombre del restaurante, tu nombre y un PIN. Sin formularios de cinco páginas.'},
              {n:'II', title:'Exploras con datos demo', body:'Menú, mesas y empleados de ejemplo ya cargados para que veas el sistema funcionando desde el primer segundo.'},
              {n:'III',title:'Configuras lo tuyo',      body:'Agregas tu menú real, diseñas tu layout de mesas y registras a tu equipo. El asistente te guía.'},
              {n:'IV', title:'Empiezas a operar',       body:'Compartes tu URL única con tu equipo. Entran, toman órdenes, y el sistema empieza a trabajar por ti.'},
            ].map((s) => (
              <div key={s.n} className="step">
                <span className="step-num">{s.n}</span>
                <h3 className="step-title">{s.title}</h3>
                <p className="step-body">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── ACCESO ── */}
      <section className="section">
        <div className="inner">
          <div className="access-layout">
            <div>
              <div className="eyebrow" style={{marginBottom:'20px'}}>Acceso</div>
              <h2 className="display-h2" style={{marginBottom:'32px'}}>
                Cada restaurante,<br /><em>su propio espacio</em>
              </h2>
              <p style={{fontSize:'16px', color:'var(--cream2)', lineHeight:1.75, fontWeight:300, marginBottom:'40px', maxWidth:'440px'}}>
                Tu restaurante tiene una URL única. Tus empleados entran directamente — sin
                saber que existen otros restaurantes en el sistema.
              </p>
              <div className="access-steps">
                {[
                  {n:'i',   title:'Tu URL única desde el registro', body:'aldente.app/r/mi-restaurante — nadie más puede verla ni accederla.'},
                  {n:'ii',  title:'La compartes con tu equipo una vez', body:'Por WhatsApp, impresa en la cocina, como prefieras.'},
                  {n:'iii', title:'Cada quien entra con su nombre y PIN', body:'Sin saber que hay otros restaurantes. Tu operación es completamente privada.'},
                ].map(s => (
                  <div key={s.n} className="access-step">
                    <span className="access-num">{s.n}</span>
                    <div>
                      <div className="access-step-title">{s.title}</div>
                      <div className="access-step-body">{s.body}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="access-visual">
              <div className="access-visual-header">
                <div className="access-visual-dots">
                  <div className="access-visual-dot" style={{background:'#ff5f57'}} />
                  <div className="access-visual-dot" style={{background:'#ffbd2e'}} />
                  <div className="access-visual-dot" style={{background:'#28c840'}} />
                </div>
                <div className="access-visual-url">
                  aldente.app/r/<strong>tacos-el-guero</strong>
                </div>
              </div>
              <div className="access-visual-body">
                <div className="access-restaurant-name">Tacos El Güero</div>
                <div style={{fontSize:'11px', color:'var(--cream3)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:'14px'}}>
                  Selecciona tu nombre
                </div>
                <div className="access-user-list">
                  {[
                    {initials:'MG', name:'María García', role:'Cajera'},
                    {initials:'CL', name:'Carlos López', role:'Cocinero'},
                    {initials:'AM', name:'Ana Martínez', role:'Mesera'},
                  ].map(u => (
                    <div key={u.name} className="access-user-item">
                      <div className="access-avatar">
                        <div className="access-avatar-placeholder">{u.initials}</div>
                      </div>
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
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section className="section" style={{background:'var(--ink2)'}}>
        <div className="inner">
          <div className="testimonials-header">
            <div>
              <div className="eyebrow" style={{marginBottom:'20px'}}>Testimonios</div>
              <h2 className="display-h2">
                Lo que dicen<br /><em>los restauranteros</em>
              </h2>
            </div>
            <div style={{alignSelf:'flex-end'}}>
              <p className="testimonials-note">
                Las fotos de perfil en esta sección son de clientes reales.
                Puedes reemplazarlas subiendo imágenes a <code style={{fontSize:'11px', color:'var(--goldXL)', background:'var(--ink3)', padding:'2px 6px', borderRadius:'4px'}}>/public/images/testimonials/</code>
              </p>
            </div>
          </div>
          <div className="testimonials-grid">
            {[
              {
                quote: 'Antes perdíamos comandas todos los días. Con la cocina digital ya no hay confusión. Mis cocineros saben exactamente qué preparar y en qué orden.',
                name: 'Roberto Sánchez', biz: 'La Fonda de Roberto · CDMX',
                photo: '/images/testimonials/roberto.jpg', initials: 'RS',
              },
              {
                quote: 'Con los reportes de costo de recetas descubrí que tres platillos nos daban pérdidas. Los ajustamos y subimos el margen 12% en un mes.',
                name: 'Daniela Fuentes', biz: 'La Hacienda · Monterrey',
                photo: '/images/testimonials/daniela.jpg', initials: 'DF',
              },
              {
                quote: 'Mis meseros tardaban 10 minutos en llegar a la cocina. Ahora toman la orden en la mesa y llega directa. El servicio mejoró muchísimo.',
                name: 'Jorge Méndez', biz: 'Mariscos El Puerto · Guadalajara',
                photo: '/images/testimonials/jorge.jpg', initials: 'JM',
              },
            ].map(t => (
              <div key={t.name} className="testimonial">
                <div className="stars">
                  {[1,2,3,4,5].map(i => <div key={i} className="star" />)}
                </div>
                <p className="testimonial-quote">{`"${t.quote}"`}</p>
                <div className="testimonial-divider" />
                <div className="testimonial-author">
                  <div className="testimonial-photo">
                    <img
                      src={t.photo}
                      alt={t.name}
                      onError={(e) => {
                        const target = e.currentTarget;
                        target.style.display = 'none';
                        const placeholder = target.parentElement?.querySelector('.testimonial-photo-placeholder') as HTMLElement;
                        if (placeholder) placeholder.style.display = 'flex';
                      }}
                    />
                    <div className="testimonial-photo-placeholder" style={{display:'none', position:'absolute', inset:0}}>{t.initials}</div>
                  </div>
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

      {/* ── PLANES ── */}
      <section className="section" id="planes">
        <div className="inner">
          <div className="eyebrow" style={{marginBottom:'20px'}}>Precios</div>
          <h2 className="display-h2" style={{marginBottom:'16px'}}>
            Transparente desde<br /><em>el primer día.</em>
          </h2>
          <p style={{fontSize:'16px', color:'var(--cream2)', fontWeight:300, marginBottom:'56px'}}>
            Todos los planes incluyen 14 días de prueba. Sin tarjeta. Sin compromisos.
          </p>
          <div className="plans-grid">
            {[
              {key:'basico', tier:'Básico', price:'$800', period:'MXN / mes · IVA incluido',
               desc:'Para restaurantes que quieren digitalizar la operación esencial sin complicaciones.',
               featured:false,
               features:['POS con mapa de mesas drag & drop','Menú digital con categorías','Gestión de personal y roles','Corte de caja con denominaciones MXN/EUR','Dashboard operativo en tiempo real','URL de acceso única para tu equipo','Impresora térmica USB y Bluetooth']},
              {key:'estandar', tier:'Estándar', price:'$1,500', period:'MXN / mes · IVA incluido',
               desc:'Para restaurantes que quieren control total sobre operación, costos y experiencia del cliente.',
               featured:true,
               features:['Todo lo del plan Básico','Cocina digital KDS con semáforo','Mesero móvil instalable sin app store','Inventario y recetas con costeo real','Reservaciones online','Programa de lealtad con puntos','Reportes P&L y COGS','Alarmas inteligentes de stock y servicio']},
              {key:'premium', tier:'Premium', price:'$2,500', period:'MXN / mes · IVA incluido',
               desc:'Para operaciones complejas: múltiples sucursales, delivery integrado y gestión de personal completa.',
               featured:false,
               features:['Todo lo del plan Estándar','Delivery integrado (Uber, Rappi, Didi)','Multi-sucursal centralizado','Módulo de recursos humanos','Control de gastos y depreciaciones','Análisis avanzado de desperdicios']},
            ].map(p => (
              <div key={p.key} className={`plan${p.featured ? ' featured' : ''}`} style={{position:'relative'}}>
                {p.featured && <div className="plan-badge">Más popular</div>}
                <div className="plan-tier">{p.tier}</div>
                <div className="plan-price">{p.price}</div>
                <div className="plan-period">{p.period}</div>
                <div className="plan-desc">{p.desc}</div>
                <hr className="plan-sep" />
                <ul className="plan-features">
                  {p.features.map(f => (
                    <li key={f} className="plan-feature">
                      <span className="plan-feature-check">✓</span>
                      {f}
                    </li>
                  ))}
                </ul>
                <a href="/registro" className={`plan-cta ${p.featured ? 'solid' : 'ghost'}`}>
                  Empezar 14 días gratis
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="section" style={{background:'var(--ink2)'}} id="faq">
        <div className="inner">
          <div className="eyebrow" style={{marginBottom:'20px'}}>FAQ</div>
          <h2 className="display-h2" style={{marginBottom:'48px'}}>
            Lo que todos<br /><em>quieren saber</em>
          </h2>
          <div className="faq-cols">
            {[
              [
                {q:'¿Necesito instalar algo?', a:'No. Aldente corre en el navegador de cualquier dispositivo. En Android e iOS puedes instalarlo como app desde el navegador (PWA) — sin pasar por ninguna tienda de apps.'},
                {q:'¿Funciona sin internet?', a:'El POS y la cocina tienen modo offline básico. Las órdenes se guardan localmente y se sincronizan cuando vuelve la conexión.'},
                {q:'¿Mis empleados ven datos de otros restaurantes?', a:'Imposible. Cada restaurante tiene su propia URL y base de datos separada. Un empleado tuyo nunca puede ver información de otro restaurante.'},
              ],
              [
                {q:'¿Puedo cancelar cuando quiera?', a:'Sí. Sin contratos, sin penalizaciones, sin períodos mínimos. Cancelas cuando quieras y tus datos se conservan 30 días por si cambias de opinión.'},
                {q:'¿Qué pasa cuando termina la prueba?', a:'Si no has configurado tu método de pago, el sistema muestra una pantalla de renovación. Ningún dato se borra. Continúas desde donde lo dejaste.'},
                {q:'¿Funciona con mi impresora térmica?', a:'Sí, compatible con impresoras vía USB y Bluetooth. Modelos Epson, Star y Bixolon. Si tienes dudas sobre tu modelo, escríbenos antes de contratar.'},
              ],
            ].map((group, gi) => (
              <div key={gi} className="faq-group">
                {group.map(f => (
                  <div key={f.q} className="faq-item">
                    <div className="faq-q">{f.q}</div>
                    <div className="faq-a">{f.a}</div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA FINAL ── */}
      <div className="cta-block" style={{position:'relative'}}>
        <h2 className="cta-h2">
          Tu restaurante merece<br />
          <em>trabajar con orden.</em>
        </h2>
        <p className="cta-sub">14 días gratis. Sin tarjeta. Cancela cuando quieras.</p>
        <div className="cta-actions">
          <a href="/registro" className="btn-primary">Registrar mi restaurante →</a>
          <a href="mailto:soporte@aldente.mx" className="btn-outline">Hablar con el equipo</a>
        </div>
      </div>

      {/* ── FOOTER ── */}
      <footer className="footer">
        <div className="footer-inner">
          <div>
            <div className="footer-wordmark">Aldente</div>
            <p className="footer-desc">Sistema de gestión integral para restaurantes.<br />Hecho en México para el mundo hispanohablante.</p>
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
          <span className="footer-copy">Hecho con precisión en México</span>
        </div>
      </footer>
    </>
  );
}
