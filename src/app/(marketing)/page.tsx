'use client';

import { useState } from 'react';

// ─── TRANSLATIONS ────────────────────────────────────────────────────────────
const T = {
  es: {
    meta: {
      title: 'Aldente — Software de Gestión para Restaurantes',
      desc: 'POS con mapa de mesas, cocina digital, mesero móvil, inventario y reportes. 14 días gratis.',
    },
    nav: {
      features: 'Funciones', howItWorks: 'Cómo funciona',
      pricing: 'Precios', faq: 'FAQ',
      signin: 'Iniciar sesión', cta: 'Prueba gratis',
    },
    hero: {
      eyebrow: 'Software para restaurantes',
      h1a: 'Sabes exactamente',
      h1b: 'qué pasa en tu restaurante.',
      h1c: 'En este momento.',
      sub: 'Sin llamar a tu cajero. Sin esperar el corte de mañana. Sin adivinar si te quedaste sin un ingrediente clave.',
      cta: 'Pruébalo gratis 14 días →',
      ctaSecondary: 'Ver cómo funciona',
      urlLabel: 'Tu acceso único',
    },
    marquee: ['Punto de venta', 'Cocina digital KDS', 'Mesero móvil', 'Inventario inteligente', 'Reportes P&L', 'Programa de lealtad', 'Reservaciones', 'Multi-sucursal', 'Control de gastos', 'Delivery integrado', 'Roles y permisos', 'Alertas en tiempo real'],
    why: {
      eyebrow: 'Por qué Aldente',
      h2: 'Diseñado desde adentro de una cocina.',
      body: 'La mayoría del software para restaurantes fue construido por ingenieros que nunca esperaron una comanda. Aldente nació observando qué pasa cuando una mesa lleva 40 minutos esperando y el cocinero no sabe que el mesero ya cobró. Cada decisión de diseño tiene una historia detrás.',
      items: [
        { title: 'Visibilidad total, no más cajas negras', body: 'Ves el estado de cada mesa, cada orden y cada ingrediente en tiempo real. No al final del día — ahora mismo.' },
        { title: 'Tu equipo adopta el sistema en horas', body: 'El mesero entra desde su celular con un PIN. El cocinero ve su pantalla. No hay curvas de aprendizaje de semanas.' },
        { title: 'Los números que importan, no los que se ven bien', body: 'P&L real, costo de receta en 3 capas, utilidad por orden. No Excel exports — decisiones directas desde el sistema.' },
      ],
    },
    features: {
      eyebrow: 'Módulos',
      h2a: 'Todo lo que necesita',
      h2b: 'un restaurante serio.',
      h2c: 'Sin funciones de relleno.',
      sub: 'Cada módulo está diseñado para el flujo real de tu operación. Sin importar si tienes 4 mesas o 40, el sistema se adapta.',
      items: [
        { n:'01', title:'Punto de venta', body:'Mapa de mesas drag & drop, unión de mesas, pagos mixtos, descuentos y propinas. El POS más completo del mercado a este precio.', plan:'Todos los planes', span: true },
        { n:'02', title:'Cocina digital (KDS)', body:'Semáforo de tiempos en verde, amarillo y rojo. El cocinero ve cada orden al instante, con tiempo transcurrido por platillo. Cero comandas en papel.', plan:'Estándar · Premium' },
        { n:'03', title:'Mesero móvil', body:'El mesero toma órdenes desde su celular. Se instala como app sin pasar por ninguna tienda. Funciona sin conexión a internet.', plan:'Estándar · Premium' },
        { n:'04', title:'Rentabilidad real', body:'P&L, costo de recetas en 3 capas y Market Basket Analysis. Descubre qué platillos generan pérdidas antes de que afecten tu margen.', plan:'Estándar · Premium' },
        { n:'05', title:'Inventario y alertas', body:'Descuentos automáticos de stock por receta, alertas de mínimos y análisis de desperdicios. Nunca más te quedas sin un ingrediente clave.', plan:'Estándar · Premium' },
        { n:'06', title:'Lealtad y reservaciones', body:'Programa de puntos configurable y módulo de reservaciones integrado. Clientes que regresan más y mesas que nunca quedan vacías.', plan:'Estándar · Premium' },
      ],
      allPlans: 'Todos los planes',
    },
    preview: {
      kpis: ['Ventas hoy', 'Órdenes activas', 'Mesas ocupadas', 'Ticket promedio'],
      chartLabel: 'Ventas por hora — hoy',
      mesasLabel: 'Mesas activas',
      mesas: [
        {name:'Mesa 1', status:'En servicio', color:'#22c55e'},
        {name:'Mesa 4', status:'Esperando', color:'#eab308'},
        {name:'Mesa 7', status:'En servicio', color:'#22c55e'},
        {name:'Mesa 9', status:'Urgente', color:'#ef4444'},
      ],
    },
    howItWorks: {
      eyebrow: 'Proceso',
      h2a: 'Listo en menos de',
      h2b: 'quince minutos',
      steps: [
        { n:'I',   title:'Te registras',            body:'Nombre del restaurante, tu nombre y un PIN. Sin formularios de cinco páginas.' },
        { n:'II',  title:'Exploras con datos demo',  body:'Menú, mesas y empleados de ejemplo ya cargados para que veas el sistema funcionando desde el primer segundo.' },
        { n:'III', title:'Configuras lo tuyo',       body:'Agregas tu menú real, diseñas tu layout de mesas y registras a tu equipo. El asistente te guía.' },
        { n:'IV',  title:'Empiezas a operar',        body:'Compartes tu URL única con tu equipo. Entran, toman órdenes, y el sistema empieza a trabajar por ti.' },
      ],
    },
    access: {
      eyebrow: 'Acceso',
      h2a: 'Cada restaurante,',
      h2b: 'su propio espacio',
      sub: 'Tu restaurante tiene una URL única. Tu equipo entra directamente — sin saber que existen otros restaurantes en el sistema.',
      steps: [
        { n:'i',   title:'Tu URL única desde el registro',   body:'aldente.app/r/mi-restaurante — nadie más puede verla ni accederla.' },
        { n:'ii',  title:'La compartes con tu equipo una vez', body:'Por WhatsApp, impresa en la cocina, como prefieras.' },
        { n:'iii', title:'Cada quien entra con su nombre y PIN', body:'Sin saber que hay otros restaurantes. Tu operación es completamente privada.' },
      ],
      mockUser: 'Selecciona tu nombre',
      users: [
        { initials:'MG', name:'María García', role:'Cajera' },
        { initials:'CL', name:'Carlos López', role:'Cocinero' },
        { initials:'AM', name:'Ana Martínez', role:'Mesera' },
      ],
    },
    testimonials: {
      eyebrow: 'Testimonios',
      h2a: 'Lo que dicen',
      h2b: 'los restauranteros',
      items: [
        { quote: 'Antes perdíamos comandas todos los días. Con la cocina digital ya no hay confusión. Mis cocineros saben exactamente qué preparar y en qué orden.', name: 'Roberto Sánchez', biz: 'La Fonda de Roberto', photo: '/images/testimonials/roberto.jpg', initials: 'RS' },
        { quote: 'Con los reportes de costo de recetas descubrí que tres platillos nos daban pérdidas. Los ajustamos y subimos el margen 12% en un mes.', name: 'Daniela Fuentes', biz: 'La Hacienda', photo: '/images/testimonials/daniela.jpg', initials: 'DF' },
        { quote: 'Mis meseros tardaban 10 minutos en llegar a la cocina. Ahora toman la orden en la mesa y llega directa. El servicio mejoró muchísimo.', name: 'Jorge Méndez', biz: 'Mariscos El Puerto', photo: '/images/testimonials/jorge.jpg', initials: 'JM' },
      ],
    },
    plans: {
      eyebrow: 'Precios',
      h2a: 'Transparente desde',
      h2b: 'el primer día.',
      sub: 'Todos los planes incluyen 14 días de prueba. Sin tarjeta. Sin compromisos.',
      period: 'por mes · IVA incluido',
      cta: 'Empezar 14 días gratis',
      popular: 'Más popular',
      items: [
        { key:'basico', tier:'Básico', price:'$800', desc:'Para restaurantes que quieren digitalizar la operación esencial sin complicaciones.', featured:false,
          features:['POS con mapa de mesas drag & drop','Menú digital con categorías','Gestión de personal y roles','Corte de caja','Dashboard operativo en tiempo real','URL de acceso única para tu equipo'] },
        { key:'estandar', tier:'Estándar', price:'$1,500', desc:'Para restaurantes que quieren control total sobre operación, costos y experiencia del cliente.', featured:true,
          features:['Todo lo del plan Básico','Cocina digital KDS con semáforo','Mesero móvil instalable sin app store','Inventario y recetas con costeo real','Reservaciones','Programa de lealtad','Reportes P&L y COGS','Alarmas inteligentes'] },
        { key:'premium', tier:'Premium', price:'$2,500', desc:'Para operaciones complejas: múltiples sucursales, delivery y gestión de personal completa.', featured:false,
          features:['Todo lo del plan Estándar','Delivery integrado','Multi-sucursal centralizado','Módulo de recursos humanos','Control de gastos y depreciaciones','Análisis avanzado de desperdicios'] },
      ],
    },
    faq: {
      eyebrow: 'FAQ',
      h2a: 'Lo que todos',
      h2b: 'quieren saber',
      items: [
        [
          { q:'¿Necesito instalar algo?', a:'No. Aldente corre en el navegador de cualquier dispositivo. En Android e iOS puedes instalarlo como app desde el navegador (PWA) — sin pasar por ninguna tienda de apps.' },
          { q:'¿Funciona sin internet?', a:'El POS y la cocina tienen modo offline. Las órdenes se guardan localmente y se sincronizan cuando vuelve la conexión.' },
          { q:'¿Mi equipo puede ver datos de otros restaurantes?', a:'Imposible. Cada restaurante tiene su propia URL y base de datos separada. Nadie de tu equipo puede ver información de otro negocio.' },
        ],
        [
          { q:'¿Puedo cancelar cuando quiera?', a:'Sí. Sin contratos, sin penalizaciones, sin períodos mínimos. Cancelas cuando quieras y tus datos se conservan 30 días.' },
          { q:'¿Qué pasa cuando termina la prueba?', a:'Si no has configurado tu método de pago, el sistema muestra una pantalla de renovación. Ningún dato se borra. Continúas desde donde lo dejaste.' },
          { q:'¿En qué dispositivos funciona?', a:'En cualquier dispositivo con navegador moderno: tablets, laptops, computadoras de escritorio. El módulo de mesero está optimizado para celular.' },
        ],
      ],
    },
    cta: {
      h2a: 'Your restaurant deserves to',
      h2b: 'run with precision.',
      sub: '14 days free. No card. Cancel anytime.',
      primary: 'Register my restaurant →',
      secondary: 'Talk to the team',
    },
    footer: {
      desc: 'All-in-one management system for restaurants.',
      product: 'Product', company: 'Company', support: 'Support',
      links: { features:'Features', pricing:'Pricing', trial:'Free trial', signin:'Sign in', contact:'Contact', sales:'Sales', email:'hello@aldente.app', faq:'FAQ' },
      copy: '© {year} Aldente. All rights reserved.',
      made: 'Crafted with precision',
    },
  },
  en: {
    meta: {
      title: 'Aldente — Restaurant Management Software',
      desc: 'Table map POS, kitchen display system, mobile waiter, inventory and reports. 14 days free.',
    },
    nav: {
      features: 'Features', howItWorks: 'How it works',
      pricing: 'Pricing', faq: 'FAQ',
      signin: 'Sign in', cta: 'Try for free',
    },
    hero: {
      eyebrow: 'Restaurant software',
      h1a: 'You know exactly',
      h1b: "what\'s happening in your restaurant.",
      h1c: 'Right now.',
      sub: "Without calling your cashier. Without waiting for tomorrow's report. Without guessing if you're running low on ingredients.",
      cta: 'Try it free for 14 days →',
      ctaSecondary: 'See how it works',
      urlLabel: 'Your unique access',
    },
    marquee: ['Point of sale', 'Kitchen display KDS', 'Mobile waiter', 'Smart inventory', 'P&L reports', 'Loyalty program', 'Reservations', 'Multi-location', 'Expense control', 'Integrated delivery', 'Roles & permissions', 'Real-time alerts'],
    why: {
      eyebrow: 'Why Aldente',
      h2: 'Designed from inside a kitchen.',
      body: 'Most restaurant software was built by engineers who never waited on a ticket. Aldente was born watching what happens when a table has been waiting 40 minutes and the cook doesn\'t know the waiter already charged. Every design decision has a story behind it.',
      items: [
        { title: 'Total visibility, no more black boxes', body: 'See the status of every table, every order and every ingredient in real time. Not at the end of the day — right now.' },
        { title: 'Your team adopts the system in hours', body: 'The waiter logs in from their phone with a PIN. The cook sees their screen. No weeks-long learning curves.' },
        { title: 'The numbers that matter, not the ones that look good', body: 'Real P&L, 3-layer recipe costing, profit per order. Not Excel exports — direct decisions from the system.' },
      ],
    },
    features: {
      eyebrow: 'Modules',
      h2a: 'Everything a serious',
      h2b: 'restaurant needs.',
      h2c: 'Nothing you don\'t.',
      sub: 'Every module is designed around the real workflow of your operation — whether you have 4 tables or 40.',
      items: [
        { n:'01', title:'Point of sale', body:'Drag & drop table map, table merging, split payments, discounts and tips. The most complete POS at this price point.', plan:'All plans', span: true },
        { n:'02', title:'Kitchen display (KDS)', body:'Green, yellow and red time indicators per dish. The cook sees every order instantly, with elapsed time. Zero paper tickets.', plan:'Standard · Premium' },
        { n:'03', title:'Mobile waiter', body:'Waitstaff takes orders from their phone. Installs as an app without going through any app store. Works offline.', plan:'Standard · Premium' },
        { n:'04', title:'Real profitability', body:'P&L, 3-layer recipe costing and Market Basket Analysis. Find out which dishes are losing money before they hurt your margin.', plan:'Standard · Premium' },
        { n:'05', title:'Inventory & alerts', body:'Automatic stock deduction per recipe, minimum stock alerts and waste analysis. Never run out of a key ingredient again.', plan:'Standard · Premium' },
        { n:'06', title:'Loyalty & reservations', body:'Configurable points program and integrated reservations module. Customers come back more often, and tables never sit empty.', plan:'Standard · Premium' },
      ],
      allPlans: 'All plans',
    },
    preview: {
      kpis: ["Today\'s sales", 'Active orders', 'Tables occupied', 'Avg. ticket'],
      chartLabel: 'Sales by hour — today',mesasLabel: 'Active tables',
      mesas: [
        {name:'Table 1', status:'In service', color:'#22c55e'},
        {name:'Table 4', status:'Waiting', color:'#eab308'},
        {name:'Table 7', status:'In service', color:'#22c55e'},
        {name:'Table 9', status:'Urgent', color:'#ef4444'},
      ],
    },
    howItWorks: {
      eyebrow: 'Process',h2a: 'Up and running in',h2b: 'under fifteen minutes',
      steps: [
        { n:'I',   title:'Register',            body:'Restaurant name, your name and a PIN. No five-page forms.' },
        { n:'II',  title:'Explore with demo data', body:'Sample menu, tables and staff already loaded so you can see the system working from the very first second.' },
        { n:'III', title:'Set up your own',     body:'Add your real menu, design your table layout and register your team. The assistant guides you through it.' },
        { n:'IV',  title:'Start operating',     body:'Share your unique URL with your team. They log in, take orders, and the system starts working for you.' },
      ],
    },
    access: {
      eyebrow: 'Access',h2a: 'Every restaurant,',h2b: 'its own space',sub: 'Your restaurant has a unique URL. Your team logs in directly — without knowing that other restaurants exist on the system.',
      steps: [
        { n:'i',   title:'Your unique URL from day one',   body:'aldente.app/r/my-restaurant — no one else can see or access it.' },
        { n:'ii',  title:'Share it with your team once',   body:'Via WhatsApp, printed in the kitchen, however you prefer.' },
        { n:'iii', title:'Everyone signs in with their name and PIN', body:"Without knowing there are other restaurants. Your operation is completely private." },
      ],
      mockUser: 'Select your name',
      users: [
        { initials:'MG', name:'María García', role:'Cashier' },
        { initials:'CL', name:'Carlos López', role:'Cook' },
        { initials:'AM', name:'Ana Martínez', role:'Waitress' },
      ],
    },
    testimonials: {
      eyebrow: 'Testimonials',h2a: 'What restaurant owners',h2b: 'are saying',
      items: [
        { quote: 'We used to lose tickets every day. With the kitchen display there\'s no more confusion. My cooks know exactly what to prepare and in what order.', name: 'Roberto Sánchez', biz: 'La Fonda de Roberto', photo: '/images/testimonials/roberto.jpg', initials: 'RS' },
        { quote: 'The recipe cost reports showed me that three dishes were losing money. We adjusted them and raised our margin by 12% in one month.', name: 'Daniela Fuentes', biz: 'La Hacienda', photo: '/images/testimonials/daniela.jpg', initials: 'DF' },
        { quote: 'My waiters used to take 10 minutes to get to the kitchen. Now they take the order at the table and it goes straight through. Service improved a lot.', name: 'Jorge Méndez', biz: 'Mariscos El Puerto', photo: '/images/testimonials/jorge.jpg', initials: 'JM' },
      ],
    },
    plans: {
      eyebrow: 'Pricing',
      h2a: 'Transparent',
      h2b: 'from day one.',
      sub: 'All plans include a 14-day free trial. No card. No commitments.',
      period: 'per month · tax included',
      cta: 'Start 14-day free trial',
      popular: 'Most popular',
      items: [
        { key:'basico', tier:'Basic', price:'$800', desc:'For restaurants that want to digitize day-to-day operations without complexity.', featured:false,
          features:['Drag & drop table map POS','Digital menu with categories','Staff & role management','Cash register reconciliation','Real-time operational dashboard','Unique access URL for your team'] },
        { key:'estandar', tier:'Standard', price:'$1,500', desc:'For restaurants that want full control over operations, costs and the guest experience.', featured:true,
          features:['Everything in Basic','Kitchen display KDS with traffic light','Mobile waiter app (no app store)','Inventory & recipes with real costing','Reservations','Loyalty program','P&L and COGS reports','Smart inventory & service alerts'] },
        { key:'premium', tier:'Premium', price:'$2,500', desc:'For complex operations: multiple locations, integrated delivery and full staff management.', featured:false,
          features:['Everything in Standard','Integrated delivery (Uber, Rappi, Didi)','Multi-location centralized','HR module','Expense & depreciation control','Advanced waste analysis'] },
      ],
    },
    faq: {
      eyebrow: 'FAQ',
      h2a: 'What everyone',
      h2b: 'wants to know',
      items: [
        [
          { q:'Do I need to install anything?', a:'No. Aldente runs in the browser on any device. On Android and iOS you can install it as an app from the browser (PWA) — no app store needed.' },
          { q:'Does it work without internet?', a:'The POS and kitchen display have an offline mode. Orders are saved locally and sync when the connection comes back.' },
          { q:"Can my staff see other restaurants\' data?", a:"Impossible. Each restaurant has its own URL and separate database. No one on your team can see information from another business." },
        ],
        [
          { q:'Can I cancel anytime?', a:'Yes. No contracts, no penalties, no minimum periods. Cancel anytime and your data is kept for 30 days.' },
          { q:'What happens when the trial ends?', a:"If you haven't set up your payment method, the system shows a renewal screen. No data is deleted. You pick up right where you left off." },
          { q:'What devices does it work on?', a:"Any device with a modern browser: tablets, laptops, desktop computers. The waiter module is optimized for mobile phones." },
        ],
      ],
    },
    cta: {
      h2a: 'Your restaurant deserves to',
      h2b: 'run with precision.',
      sub: '14 days free. No card. Cancel anytime.',
      primary: 'Register my restaurant →',
      secondary: 'Talk to the team',
    },
    footer: {
      desc: 'All-in-one management system for restaurants.',
      product: 'Product', company: 'Company', support: 'Support',
      links: { features:'Features', pricing:'Pricing', trial:'Free trial', signin:'Sign in', contact:'Contact', sales:'Sales', email:'hello@aldente.app', faq:'FAQ' },
      copy: '© {year} Aldente. All rights reserved.',
      made: 'Crafted with precision',
    },
  },
};

type Lang = 'es' | 'en';

// ─── COMPONENT ───────────────────────────────────────────────────────────────
export default function LandingPage() {
  const [lang, setLang] = useState<Lang>('es');
  const t = T[lang];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,300;1,400;1,500&family=Outfit:wght@300;400;500;600&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: smooth; -webkit-text-size-adjust: 100%; }

        :root {
          --ink:       #080808;
          --ink2:      #0d0d0d;
          --ink3:      #131313;
          --ink4:      #1c1c1c;
          --ink5:      #252525;
          --line:      rgba(255,255,255,0.06);
          --lineM:     rgba(255,255,255,0.10);
          --lineS:     rgba(255,255,255,0.18);
          --paper:     #f5f0e8;
          --gold:      #c9963a;
          --goldL:     #dba84a;
          --goldXL:    #efc06a;
          --goldDim:   rgba(201,150,58,0.08);
          --goldLine:  rgba(201,150,58,0.20);
          --goldLineS: rgba(201,150,58,0.40);
          --cream:     rgba(245,240,232,0.92);
          --cream2:    rgba(245,240,232,0.58);
          --cream3:    rgba(245,240,232,0.32);
          --cream4:    rgba(245,240,232,0.16);
          --r:   14px; --rL: 20px; --rXL: 28px;
        }

        body {
          background: var(--ink); color: var(--paper);
          font-family: 'Outfit', system-ui, sans-serif;
          -webkit-font-smoothing: antialiased; overflow-x: hidden;
        }
        a { text-decoration: none; color: inherit; }

        /* Grain */
        body::before {
          content: ''; position: fixed; inset: 0; z-index: 1000;
          pointer-events: none; opacity: 0.022;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
          background-size: 180px;
        }

        /* NAV */
        .nav {
          position: fixed; top: 0; left: 0; right: 0; z-index: 900;
          height: 68px; display: flex; align-items: center; justify-content: space-between;
          padding: 0 clamp(24px,5vw,64px);
          background: rgba(8,8,8,0.88);
          backdrop-filter: blur(28px) saturate(1.8);
          -webkit-backdrop-filter: blur(28px) saturate(1.8);
          border-bottom: 1px solid var(--line);
          animation: navIn .6s ease both;
        }
        @keyframes navIn { from { opacity:0; transform:translateY(-8px); } to { opacity:1; transform:none; } }
        .nav-wordmark { font-family:'Cormorant Garamond',Georgia,serif; font-size:24px; font-weight:500; letter-spacing:0.06em; color:var(--gold); text-transform:uppercase; margin-bottom:12px; animation:fadeUp .8s .1s ease both; }
        .nav-wordmark.text-[35px] { font-size:35px; }
        .nav-links { display:flex; gap:2px; }
        .nav-link { padding:7px 14px; border-radius:8px; font-size:13px; color:var(--cream3); transition:color .15s; }
        .nav-link:hover { color:var(--cream2); }
        .nav-right { display:flex; align-items:center; gap:10px; }
        .nav-signin { font-size:13px; color:var(--cream3); padding:8px 16px; border-radius:9px; border:1px solid var(--line); transition:all .2s; }
        .nav-signin:hover { border-color:var(--lineM); color:var(--cream2); }
        .nav-cta { font-size:13px; font-weight:500; padding:9px 20px; border-radius:9px; background:var(--gold); color:var(--ink); transition:background .15s,transform .1s; }
        .nav-cta:hover { background:var(--goldL); transform:translateY(-1px); }

        /* Lang toggle */
        .lang-toggle {
          display:flex; align-items:center;
          background:var(--ink3); border:1px solid var(--line);
          border-radius:100px; padding:3px; gap:2px;
        }
        .lang-btn {
          padding:5px 12px; border-radius:100px; border:none;
          font-size:12px; font-weight:500; letter-spacing:0.04em;
          cursor:pointer; transition:all .18s; background:transparent; color:var(--cream3);
          font-family:'Outfit',sans-serif;
        }
        .lang-btn.active { background:var(--gold); color:var(--ink); }
        .lang-btn:not(.active):hover { color:var(--cream2); }

        /* HERO */
        .hero {
          min-height:100svh; display:grid; place-items:center;
          padding:120px clamp(24px,6vw,80px) 80px;
          position:relative; overflow:hidden; text-align:center;
        }
        .hero-glow {
          position:absolute; top:-20%; left:50%; transform:translateX(-50%);
          width:900px; height:900px;
          background:radial-gradient(ellipse at 50% 40%,rgba(201,150,58,0.07) 0%,rgba(201,150,58,0.03) 35%,transparent 65%);
          pointer-events:none; animation:glowPulse 8s ease-in-out infinite;
        }
        @keyframes glowPulse { 0%,100%{opacity:1;transform:translateX(-50%) scale(1);} 50%{opacity:.6;transform:translateX(-50%) scale(1.08);} }
        .hero-grid {
          position:absolute; inset:0; pointer-events:none;
          background-image:linear-gradient(var(--line) 1px,transparent 1px),linear-gradient(90deg,var(--line) 1px,transparent 1px);
          background-size:72px 72px;
          mask-image:radial-gradient(ellipse 85% 70% at 50% 10%,black 0%,transparent 100%);
        }
        .hero-content { position:relative; max-width:900px; }
        .hero-eyebrow {
          display:inline-flex; align-items:center; gap:12px;
          font-size:11px; font-weight:500; letter-spacing:0.18em; text-transform:uppercase;
          color:var(--gold); margin-bottom:36px; animation:fadeUp .8s .2s ease both;
        }
        .hero-eyebrow::before,.hero-eyebrow::after { content:''; display:block; width:32px; height:1px; background:var(--goldLine); }
        .hero-h1 {
          font-family:'Cormorant Garamond',Georgia,serif;
          font-size:clamp(52px,8.5vw,104px); font-weight:300; line-height:.96;
          letter-spacing:-2px; color:var(--paper); margin-bottom:28px;
          animation:fadeUp .9s .2s ease both;
        }
        .hero-h1 em { font-style:italic; color:var(--gold); }
        .hero-h1 strong { font-weight:500; display:block; }
        .hero-sub { font-size:clamp(16px,2vw,18px); font-weight:300; line-height:1.75; color:rgba(245,240,232,0.70); max-width:520px; margin:0 auto 44px; animation:fadeUp .9s .35s ease both; }
        .hero-actions { display:flex; gap:14px; justify-content:center; flex-wrap:wrap; margin-bottom:64px; animation:fadeUp .9s .45s ease both; }
        .btn-primary { padding:15px 32px; border-radius:11px; background:var(--gold); color:var(--ink); font-size:15px; font-weight:500; border:none; cursor:pointer; transition:background .15s,transform .1s,box-shadow .2s; }
        .btn-primary:hover { background:var(--goldL); transform:translateY(-2px); box-shadow:0 12px 32px rgba(201,150,58,.25); }
        .btn-outline { padding:15px 32px; border-radius:11px; border:1px solid var(--lineM); color:var(--cream2); font-size:15px; font-weight:400; background:transparent; transition:all .15s; }
        .btn-outline:hover { border-color:var(--lineS); color:var(--cream); }
        .hero-url { display:inline-flex; align-items:center; font-family:'Outfit',monospace; font-size:13px; background:var(--ink3); border:1px solid var(--lineM); border-radius:100px; padding:10px 22px; animation:fadeUp .9s .55s ease both; }
        .hero-url .base { color:var(--cream3); }
        .hero-url .slug { color:var(--goldXL); font-weight:500; }
        @keyframes fadeUp { from{opacity:0;transform:translateY(24px);} to{opacity:1;transform:none;} }

        /* MARQUEE */
        .marquee-wrap { border-top:1px solid var(--line); border-bottom:1px solid var(--line); background:var(--ink2); overflow:hidden; padding:16px 0; }
        .marquee-track { display:flex; animation:marquee 32s linear infinite; width:max-content; }
        .marquee-track:hover { animation-play-state:paused; }
        @keyframes marquee { from{transform:translateX(0);} to{transform:translateX(-50%);} }
        .marquee-item { display:flex; align-items:center; gap:10px; padding:0 36px; white-space:nowrap; font-size:12px; font-weight:500; letter-spacing:0.1em; text-transform:uppercase; color:rgba(245,240,232,0.45); }
        .marquee-dot { width:3px; height:3px; border-radius:50%; background:var(--goldLine); }

        /* SECTIONS */
        .section { padding:clamp(80px,10vw,140px) clamp(24px,6vw,80px); }
        .inner { max-width:1200px; margin:0 auto; }
        .eyebrow { display:flex; align-items:center; gap:16px; font-size:11px; font-weight:500; letter-spacing:0.16em; color:var(--gold); opacity:.8; margin-bottom:20px; }
        .eyebrow::after { content:''; flex:1; max-width:60px; height:1px; background:var(--goldLine); }
        .display-h2 { font-family:'Cormorant Garamond',Georgia,serif; font-size:clamp(36px,5vw,64px); font-weight:300; line-height:1.05; letter-spacing:-1px; color:var(--paper); }
        .display-h2 em { font-style:italic; color:var(--cream3); }

        /* FEATURES */
        .features-header { display:grid; grid-template-columns:1fr 1fr; gap:60px; align-items:end; margin-bottom:72px; }
        .features-sub { font-size:16px; color:var(--cream2); line-height:1.75; font-weight:300; align-self:end; }
        .features-list { display:grid; grid-template-columns:repeat(3,1fr); gap:1px; background:var(--line); border:1px solid var(--line); border-radius:var(--rXL); overflow:hidden; }
        .feature { background:var(--ink2); padding:clamp(28px,3vw,44px); position:relative; overflow:hidden; transition:background .25s; }
        .feature:hover { background:var(--ink3); }
        .feature::before { content:''; position:absolute; top:0; left:0; right:0; height:1px; background:linear-gradient(90deg,transparent,var(--goldLine),transparent); opacity:0; transition:opacity .3s; }
        .feature:hover::before { opacity:1; }
        .feature.span2 { grid-column:span 2; }
        .feature-index { font-family:'Cormorant Garamond',serif; font-size:12px; letter-spacing:0.12em; color:var(--gold); opacity:.8; margin-bottom:24px; display:block; }
        .feature-title { font-family:'Cormorant Garamond',serif; font-size:24px; font-weight:500; color:var(--paper); line-height:1.2; margin-bottom:12px; letter-spacing:-0.3px; }
        .feature-body { font-size:15px; color:rgba(245,240,232,0.72); line-height:1.75; font-weight:300; margin-bottom:20px; }
        .feature-plan { display:inline-block; font-size:11px; font-weight:500; letter-spacing:0.1em; text-transform:uppercase; padding:5px 12px; border-radius:100px; background:var(--ink); border:1px solid var(--line); color:var(--cream3); }

        /* DASHBOARD PREVIEW */
        .preview-wrap { border-radius:var(--rXL); overflow:hidden; border:1px solid var(--lineM); box-shadow:0 0 0 1px rgba(255,255,255,.03),0 60px 120px rgba(0,0,0,.7); margin-top:72px; }
        .preview-bar { background:var(--ink3); border-bottom:1px solid var(--line); padding:14px 20px; display:flex; align-items:center; gap:10px; }
        .preview-dots { display:flex; gap:7px; }
        .preview-dot { width:11px; height:11px; border-radius:50%; }
        .preview-url-bar { flex:1; background:var(--ink2); border-radius:7px; padding:6px 14px; font-size:12px; color:var(--cream3); font-family:'Outfit',monospace; margin:0 16px; }
        .preview-body { background:var(--ink2); padding:28px; display:grid; grid-template-columns:repeat(4,1fr) 1.6fr; gap:12px; }
        .preview-kpi { background:var(--ink3); border:1px solid var(--line); border-radius:var(--r); padding:18px; }
        .preview-kpi-val { font-family:'Cormorant Garamond',serif; font-size:26px; font-weight:400; color:var(--goldXL); margin-bottom:4px; letter-spacing:-.5px; }
        .preview-kpi-lbl { font-size:11px; color:var(--cream3); font-weight:300; }
        .preview-chart { grid-column:1/5; background:var(--ink3); border:1px solid var(--line); border-radius:var(--r); padding:18px; display:flex; flex-direction:column; gap:14px; }
        .preview-chart-label { font-size:11px; color:var(--cream3); text-transform:uppercase; letter-spacing:.08em; }
        .preview-bars { display:flex; align-items:flex-end; gap:5px; height:80px; }
        .preview-bar-item { flex:1; border-radius:3px 3px 0 0; }
        .preview-sidebar { grid-row:span 2; background:var(--ink3); border:1px solid var(--line); border-radius:var(--r); padding:18px; display:flex; flex-direction:column; gap:10px; }
        .preview-sidebar-label { font-size:11px; color:var(--cream3); text-transform:uppercase; letter-spacing:.08em; margin-bottom:4px; }
        .preview-table-row { display:flex; align-items:center; gap:10px; padding:8px; border-radius:8px; border:1px solid var(--line); background:var(--ink2); }
        .preview-mesa { width:30px; height:30px; border-radius:7px; background:var(--goldDim); border:1px solid var(--goldLine); display:flex; align-items:center; justify-content:center; font-size:11px; font-weight:600; color:var(--gold); flex-shrink:0; }
        .preview-mesa-name { font-size:12px; color:var(--cream2); font-weight:500; }
        .preview-mesa-status { font-size:10px; color:var(--cream3); }
        .preview-status-dot { width:7px; height:7px; border-radius:50%; flex-shrink:0; }

        /* STEPS */
        .steps-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:0; border:1px solid var(--line); border-radius:var(--rXL); overflow:hidden; background:var(--line); }
        .step { background:var(--ink2); padding:44px 36px; }
        .step-num { font-family:'Cormorant Garamond',serif; font-size:72px; font-weight:300; line-height:1; color:var(--ink4); margin-bottom:28px; display:block; font-style:italic; letter-spacing:-3px; }
        .step-title { font-family:'Cormorant Garamond',serif; font-size:20px; font-weight:500; color:var(--paper); margin-bottom:10px; }
        .step-body { font-size:14px; color:rgba(245,240,232,0.72); line-height:1.7; font-weight:300; }

        /* ACCESS */
        .access-layout { display:grid; grid-template-columns:1fr 1fr; gap:80px; align-items:center; }
        .access-steps { display:flex; flex-direction:column; }
        .access-step { display:flex; gap:20px; padding:28px 0; border-bottom:1px solid var(--line); }
        .access-step:last-child { border-bottom:none; }
        .access-num { font-family:'Cormorant Garamond',serif; font-size:13px; color:var(--gold); font-style:italic; flex-shrink:0; padding-top:2px; width:20px; }
        .access-step-title { font-size:15px; font-weight:500; color:var(--paper); margin-bottom:6px; }
        .access-step-body  { font-size:14px; color:rgba(245,240,232,0.72); line-height:1.65; font-weight:300; }
        .access-visual { background:var(--ink2); border:1px solid var(--lineM); border-radius:var(--rXL); overflow:hidden; }
        .access-visual-header { background:var(--ink3); padding:14px 20px; border-bottom:1px solid var(--line); display:flex; align-items:center; gap:12px; }
        .access-visual-dots { display:flex; gap:6px; }
        .access-visual-dot { width:10px; height:10px; border-radius:50%; }
        .access-visual-url { font-size:12px; color:var(--cream3); font-family:'Outfit',monospace; }
        .access-visual-url strong { color:var(--goldXL); }
        .access-visual-body { padding:28px 24px; }
        .access-restaurant-name { font-family:'Cormorant Garamond',serif; font-size:22px; font-weight:400; color:var(--paper); margin-bottom:20px; letter-spacing:-.3px; }
        .access-user-list { display:flex; flex-direction:column; gap:8px; }
        .access-user-item { display:flex; align-items:center; gap:14px; padding:12px 14px; border-radius:10px; background:var(--ink3); border:1px solid var(--line); cursor:pointer; transition:border-color .15s,background .15s; }
        .access-user-item:hover { border-color:var(--goldLine); background:var(--ink4); }
        .access-avatar { width:36px; height:36px; border-radius:50%; flex-shrink:0; background:linear-gradient(135deg,var(--ink5) 0%,var(--ink3) 100%); border:1px solid var(--lineM); display:flex; align-items:center; justify-content:center; font-family:'Cormorant Garamond',serif; font-size:14px; color:var(--cream3); font-weight:500; }
        .access-user-name { font-size:14px; color:var(--paper); font-weight:500; }
        .access-user-role { font-size:11px; color:var(--cream3); }

        /* TESTIMONIALS */
        .testimonials-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:16px; }
        .testimonial { background:var(--ink2); border:1px solid var(--line); border-radius:var(--rL); padding:32px 28px; display:flex; flex-direction:column; transition:border-color .2s; }
        .testimonial:hover { border-color:var(--lineM); }
        .stars { display:flex; gap:4px; margin-bottom:20px; }
        .star { width:12px; height:12px; background:var(--gold); clip-path:polygon(50% 0%,61% 35%,98% 35%,68% 57%,79% 91%,50% 70%,21% 91%,32% 57%,2% 35%,39% 35%); }
        .testimonial-quote { font-family:'Cormorant Garamond',serif; font-size:18px; font-weight:300; font-style:italic; color:var(--cream); line-height:1.65; margin-bottom:24px; flex:1; }
        .testimonial-divider { height:1px; background:var(--line); margin-bottom:20px; }
        .testimonial-author { display:flex; align-items:center; gap:14px; }
        .testimonial-photo { width:44px; height:44px; border-radius:50%; flex-shrink:0; overflow:hidden; border:1px solid var(--lineM); position:relative; }
        .testimonial-photo img { width:100%; height:100%; object-fit:cover; display:block; }
        .t-fallback { position:absolute; inset:0; background:linear-gradient(135deg,var(--ink5),var(--ink3)); display:flex; align-items:center; justify-content:center; font-family:'Cormorant Garamond',serif; font-size:16px; font-weight:500; color:var(--cream3); }
        .testimonial-name { font-size:14px; font-weight:500; color:var(--paper); margin-bottom:2px; }
        .testimonial-biz  { font-size:13px; color:rgba(245,240,232,0.45); }

        /* PLANS */
        .plans-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:16px; align-items:start; }
        .plan { border:1px solid var(--line); border-radius:var(--rXL); padding:36px 30px; background:var(--ink2); display:flex; flex-direction:column; transition:border-color .2s; position:relative; }
        .plan:hover { border-color:var(--lineM); }
        .plan.featured { border-color:var(--goldLine); background:var(--ink3); }
        .plan.featured::before { content:''; position:absolute; top:0; left:0; right:0; height:1px; background:linear-gradient(90deg,transparent,var(--gold),transparent); }
        .plan-badge { position:absolute; top:-13px; left:50%; transform:translateX(-50%); background:var(--gold); color:var(--ink); font-size:10px; font-weight:600; letter-spacing:.1em; text-transform:uppercase; padding:5px 18px; border-radius:100px; white-space:nowrap; }
        .plan-tier { font-size:11px; font-weight:500; letter-spacing:.12em; text-transform:uppercase; color:var(--gold); margin-bottom:12px; }
        .plan-price { font-family:'Cormorant Garamond',serif; font-size:56px; font-weight:300; color:var(--paper); line-height:1; letter-spacing:-2px; margin-bottom:4px; }
        .plan-period { font-size:13px; color:var(--cream3); margin-bottom:14px; }
        .plan-desc { font-size:15px; color:rgba(245,240,232,0.72); line-height:1.65; font-weight:300; margin-bottom:24px; }
        .plan-sep { border:none; border-top:1px solid var(--line); margin-bottom:24px; }
        .plan-features { list-style:none; display:flex; flex-direction:column; gap:10px; margin-bottom:36px; flex:1; }
        .plan-feature { display:flex; gap:12px; font-size:14px; color:rgba(245,240,232,0.72); line-height:1.5; }
        .plan-check { color:var(--gold); font-size:11px; flex-shrink:0; margin-top:2px; }
        .plan-cta { display:block; text-align:center; padding:14px; border-radius:11px; font-size:14px; font-weight:500; transition:all .15s; }
        .plan-cta.solid  { background:var(--gold); color:var(--ink); }
        .plan-cta.solid:hover { background:var(--goldL); transform:translateY(-1px); }
        .plan-cta.ghost  { border:1px solid var(--lineM); color:var(--cream2); }
        .plan-cta.ghost:hover { border-color:var(--lineS); color:var(--cream); }

        /* FAQ */
        .faq-cols { display:grid; grid-template-columns:1fr 1fr; gap:16px; }
        .faq-group { display:flex; flex-direction:column; gap:1px; background:var(--line); border:1px solid var(--line); border-radius:var(--rL); overflow:hidden; }
        .faq-item { background:var(--ink2); padding:24px 28px; }
        .faq-q { font-family:'Cormorant Garamond',serif; font-size:17px; font-weight:500; color:var(--paper); margin-bottom:10px; line-height:1.3; }
        .faq-a { font-size:14px; color:rgba(245,240,232,0.72); line-height:1.75; font-weight:300; }

        /* CTA */
        .cta-block { margin:0 clamp(16px,5vw,64px) clamp(60px,8vw,100px); border-radius:var(--rXL); border:1px solid var(--lineM); background:var(--ink2); padding:clamp(60px,7vw,100px) clamp(32px,5vw,80px); text-align:center; position:relative; overflow:hidden; }
        .cta-block::before { content:''; position:absolute; top:-100px; left:50%; transform:translateX(-50%); width:700px; height:400px; background:radial-gradient(ellipse,rgba(201,150,58,.06) 0%,transparent 70%); pointer-events:none; }
        .cta-block::after { content:''; position:absolute; top:0; left:0; right:0; height:1px; background:linear-gradient(90deg,transparent,var(--goldLine),transparent); }
        .cta-h2 { font-family:'Cormorant Garamond',serif; font-size:clamp(36px,5vw,64px); font-weight:300; letter-spacing:-1.5px; line-height:1.05; margin-bottom:16px; }
        .cta-h2 em { font-style:italic; color:var(--gold); }
        .cta-sub { font-size:16px; color:var(--cream2); margin-bottom:44px; font-weight:300; }
        .cta-actions { display:flex; gap:14px; justify-content:center; flex-wrap:wrap; }

        /* FOOTER */
        .footer { border-top:1px solid var(--line); }
        .footer-inner { max-width:1200px; margin:0 auto; padding:clamp(48px,6vw,72px) clamp(24px,6vw,80px); display:grid; grid-template-columns:2fr 1fr 1fr 1fr; gap:48px; }
        .footer-wordmark { font-family:'Cormorant Garamond',serif; font-size:26px; font-weight:400; color:var(--gold); letter-spacing:.04em; text-transform:uppercase; margin-bottom:12px; }
        .footer-desc { font-size:14px; color:rgba(245,240,232,0.45); line-height:1.7; font-weight:300; }
        .footer-col-title { font-size:10px; text-transform:uppercase; letter-spacing:.12em; color:var(--cream3); margin-bottom:18px; font-weight:500; }
        .footer-link { display:block; font-size:14px; color:rgba(245,240,232,0.45); margin-bottom:12px; transition:color .15s; }
        .footer-link:hover { color:var(--cream2); }
        .footer-bottom { max-width:1200px; margin:0 auto; padding:24px clamp(24px,6vw,80px); border-top:1px solid var(--line); display:flex; justify-content:space-between; align-items:center; }
        .footer-copy { font-size:12px; color:var(--cream4); }

        /* ── WHY ALDENTE ── */
        .why-section { background: var(--ink2); }
        .why-grid { display:grid; grid-template-columns:1fr 1fr; gap:80px; align-items:start; }
        .why-left { position:sticky; top:96px; }
        .why-intro { font-size:17px; color:var(--cream2); line-height:1.8; font-weight:300; margin-top:20px; }
        .why-items { display:flex; flex-direction:column; }
        .why-item { padding:32px 0; border-bottom:1px solid var(--line); }
        .why-item:first-child { padding-top:8px; }
        .why-item:last-child { border-bottom:none; }
        .why-num { font-family:'Cormorant Garamond',serif; font-size:11px; color:var(--gold); opacity:.7; letter-spacing:.12em; margin-bottom:10px; display:block; font-style:italic; }
        .why-item-title { font-family:'Cormorant Garamond',serif; font-size:22px; font-weight:500; color:var(--paper); margin-bottom:10px; letter-spacing:-.3px; line-height:1.2; }
        .why-item-body { font-size:15px; color:rgba(245,240,232,0.65); line-height:1.75; font-weight:300; }

        /* RESPONSIVE */
        @media(max-width:900px){
          .nav-links{display:none;} .nav-signin{display:none;}
          .why-grid{grid-template-columns:1fr;gap:40px;} .why-left{position:static;}
          .features-header{grid-template-columns:1fr;gap:24px;}
          .features-list{grid-template-columns:1fr;}
          .feature.span2{grid-column:span 1;}
          .steps-grid{grid-template-columns:1fr 1fr;}
          .access-layout{grid-template-columns:1fr;gap:40px;}
          .testimonials-grid{grid-template-columns:1fr;}
          .plans-grid{grid-template-columns:1fr;}
          .faq-cols{grid-template-columns:1fr;}
          .footer-inner{grid-template-columns:1fr;}
          .footer-bottom{flex-direction:column;gap:10px;}
          .preview-body{grid-template-columns:1fr 1fr;}
          .preview-chart{grid-column:span 2;}
          .preview-sidebar{grid-column:span 2;grid-row:span 1;}
        }

        @media(max-width:540px){
          .feature-body,.step-body,.access-step-body,.faq-a,.plan-desc { font-size:15px !important; }
          .plan-feature { font-size:14px !important; }
          .testimonial-quote { font-size:17px !important; }
          .features-sub { font-size:15px !important; }
        }
        @media(max-width:540px){
          .steps-grid{grid-template-columns:1fr;}
          .footer-inner{grid-template-columns:1fr;}
          .hero-actions{flex-direction:column;}
          .btn-primary,.btn-outline{text-align:center;}
          .cta-actions{flex-direction:column;}
        }

        /* ── MOBILE LEGIBILITY — increase contrast and size on small screens ── */
        @media(max-width:768px){
          :root {
            --cream2: rgba(245,240,232,0.78);
            --cream3: rgba(245,240,232,0.55);
          }
          .hero-sub { font-size:16px; }
          .feature-body { font-size:15px; }
          .features-sub { font-size:15px; }
          .step-body { font-size:14px; }
          .access-step-body { font-size:14px; }
          .faq-a { font-size:14px; }
          .testimonial-quote { font-size:16px; }
          .plan-desc { font-size:14px; }
          .plan-feature { font-size:14px; }
          .footer-desc { font-size:14px; }
          .footer-link { font-size:14px; }
          .marquee-item { font-size:13px; }
          .feature-plan { font-size:11px; }
          .cta-sub { font-size:15px; }
          .hero-url { font-size:14px; }
          /* Section padding tighter on mobile */
          .section { padding:60px clamp(20px,5vw,40px); }
          .features-header { margin-bottom:40px; }
        }
      `}</style>

      {/* NAV */}
      <nav className="nav">
        <span className="nav-wordmark text-[rgba(201,150,58,1)] font-extrabold text-[34px]" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <img src="/assets/images/logo_aldente.png" alt="Aldente" style={{ width: '120px', height: '120px', objectFit: 'contain' }} />
          Aldente
        </span>
        <div className="nav-links">
          <a href="/blog" className="nav-link">Blog</a>
          <a href="#funciones" className="nav-link">{t.nav.features}</a>
          <a href="#como-funciona" className="nav-link">{t.nav.howItWorks}</a>
          <a href="#planes" className="nav-link">{t.nav.pricing}</a>
          <a href="#faq" className="nav-link">{t.nav.faq}</a>
        </div>
        <div className="nav-right">
          <div className="lang-toggle">
            <button className={`lang-btn${lang==='es'?' active':''}`} onClick={()=>setLang('es')}>ES</button>
            <button className={`lang-btn${lang==='en'?' active':''}`} onClick={()=>setLang('en')}>EN</button>
          </div>
          <a href="/login" className="nav-signin">{t.nav.signin}</a>
          <a href="/registro" className="nav-cta">{t.nav.cta}</a>
        </div>
      </nav>

      {/* HERO */}
      <section className="hero">
        <div className="hero-glow"/>
        <div className="hero-grid"/>
        <div className="hero-content">
          <div className="hero-eyebrow">{t.hero.eyebrow}</div>
          <h1 className="hero-h1">
            <strong>{t.hero.h1a}</strong>
            <em>{t.hero.h1b}</em>
            {t.hero.h1c}
          </h1>
          <p className="hero-sub">{t.hero.sub}</p>
          <div className="hero-actions">
            <a href="/registro" className="btn-primary">{t.hero.cta}</a>
            <a href="#funciones" className="btn-outline">{t.hero.ctaSecondary}</a>
          </div>
          <div className="hero-url">
            <span className="base">aldente.app/r/</span>
            <span className="slug">{lang==='es'?'tu-restaurante':'your-restaurant'}</span>
          </div>
        </div>
      </section>

      {/* MARQUEE */}
      <div className="marquee-wrap">
        <div className="marquee-track">
          {[...Array(2)].map((_,i)=>
            t.marquee.map(item=>(
              <span key={`${i}-${item}`} className="marquee-item">
                <span className="marquee-dot"/>
                {item}
              </span>
            ))
          )}
        </div>
      </div>

      {/* WHY ALDENTE */}
      <section className="section why-section">
        <div className="inner">
          <div className="why-grid">
            <div className="why-left">
              <div className="eyebrow">{t.why.eyebrow}</div>
              <h2 className="display-h2" style={{marginTop:'16px'}}>{t.why.h2}</h2>
              <p className="why-intro">{t.why.body}</p>
            </div>
            <div className="why-items">
              {t.why.items.map((item,i) => (
                <div key={i} className="why-item">
                  <span className="why-num">0{i+1}</span>
                  <h3 className="why-item-title">{item.title}</h3>
                  <p className="why-item-body">{item.body}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="section" id="funciones">
        <div className="inner">
          <div className="features-header">
            <div>
              <div className="eyebrow">{t.features.eyebrow}</div>
              <h2 className="display-h2">
                {t.features.h2a}<br/>
                {t.features.h2b}<br/>
                <em>{t.features.h2c}</em>
              </h2>
            </div>
            <p className="features-sub">{t.features.sub}</p>
          </div>
          <div className="features-list">
            {t.features.items.map(f=>(
              <div key={f.n} className={`feature${f.span?' span2':''}`}>
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
                <div className="preview-dot" style={{background:'#ff5f57'}}/>
                <div className="preview-dot" style={{background:'#ffbd2e'}}/>
                <div className="preview-dot" style={{background:'#28c840'}}/>
              </div>
              <div className="preview-url-bar">
                aldente.app/<strong style={{color:'#dfa03a'}}>dashboard</strong>
              </div>
            </div>
            <div className="preview-body">
              {[
                {val:'$18,450', lbl:t.preview.kpis[0]},
                {val:'23',      lbl:t.preview.kpis[1]},
                {val:'8 / 10', lbl:t.preview.kpis[2]},
                {val:'$324',   lbl:t.preview.kpis[3]},
              ].map(k=>(
                <div key={k.lbl} className="preview-kpi">
                  <div className="preview-kpi-val">{k.val}</div>
                  <div className="preview-kpi-lbl">{k.lbl}</div>
                </div>
              ))}
              <div className="preview-sidebar">
                <div className="preview-sidebar-label">{t.preview.mesasLabel}</div>
                {t.preview.mesas.map((m,i)=>(
                  <div key={i} className="preview-table-row">
                    <div className="preview-mesa">M{String(i+1).padStart(2,'0')}</div>
                    <div style={{flex:1}}>
                      <div className="preview-mesa-name">{m.name}</div>
                      <div className="preview-mesa-status">{m.status}</div>
                    </div>
                    <div className="preview-status-dot" style={{background:m.color}}/>
                  </div>
                ))}
              </div>
              <div className="preview-chart">
                <div className="preview-chart-label">{t.preview.chartLabel}</div>
                <div className="preview-bars">
                  {[20,45,35,60,75,55,80,90,65,85,70,95,60,40].map((h,i)=>(
                    <div key={i} className="preview-bar-item" style={{height:`${h}%`,background:`rgba(201,150,58,${0.15+(i/14)*0.55})`,border:'1px solid rgba(201,150,58,.2)'}}/>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="section" style={{background:'var(--ink2)'}} id="como-funciona">
        <div className="inner">
          <div className="eyebrow" style={{marginBottom:'48px'}}>{t.howItWorks.eyebrow}</div>
          <h2 className="display-h2" style={{marginBottom:'56px'}}>
            {t.howItWorks.h2a}<br/><em>{t.howItWorks.h2b}</em>
          </h2>
          <div className="steps-grid">
            {t.howItWorks.steps.map(s=>(
              <div key={s.n} className="step">
                <span className="step-num">{s.n}</span>
                <h3 className="step-title">{s.title}</h3>
                <p className="step-body">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ACCESS */}
      <section className="section">
        <div className="inner">
          <div className="access-layout">
            <div>
              <div className="eyebrow" style={{marginBottom:'20px'}}>{t.access.eyebrow}</div>
              <h2 className="display-h2" style={{marginBottom:'20px'}}>
                {t.access.h2a}<br/><em>{t.access.h2b}</em>
              </h2>
              <p style={{fontSize:'16px',color:'var(--cream2)',lineHeight:1.75,fontWeight:300,marginBottom:'40px',maxWidth:'440px'}}>{t.access.sub}</p>
              <div className="access-steps">
                {t.access.steps.map(s=>(
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
                  <div className="access-visual-dot" style={{background:'#ff5f57'}}/>
                  <div className="access-visual-dot" style={{background:'#ffbd2e'}}/>
                  <div className="access-visual-dot" style={{background:'#28c840'}}/>
                </div>
                <div className="access-visual-url">
                  aldente.app/r/<strong>{lang==='es'?'tacos-el-guero':'the-golden-fork'}</strong>
                </div>
              </div>
              <div className="access-visual-body">
                <div className="access-restaurant-name">{lang==='es'?'Tacos El Güero':'The Golden Fork'}</div>
                <div style={{fontSize:'11px',color:'var(--cream3)',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:'14px'}}>{t.access.mockUser}</div>
                <div className="access-user-list">
                  {t.access.users.map(u=>(
                    <div key={u.name} className="access-user-item">
                      <div className="access-avatar">{u.initials}</div>
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

      {/* TESTIMONIALS */}
      <section className="section" style={{background:'var(--ink2)'}}>
        <div className="inner">
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'60px',alignItems:'end',marginBottom:'60px'}}>
            <div>
              <div className="eyebrow" style={{marginBottom:'20px'}}>{t.testimonials.eyebrow}</div>
              <h2 className="display-h2">{t.testimonials.h2a}<br/><em>{t.testimonials.h2b}</em></h2>
            </div>
          </div>
          <div className="testimonials-grid">
            {t.testimonials.items.map(tm=>(
              <div key={tm.name} className="testimonial">
                <div className="stars">{[1,2,3,4,5].map(i=><div key={i} className="star"/>)}</div>
                <p className="testimonial-quote">{`"${tm.quote}"`}</p>
                <div className="testimonial-divider"/>
                <div className="testimonial-author">
                  <div className="testimonial-photo">
                    <img src={tm.photo} alt={tm.name} onError={e=>{e.currentTarget.style.display='none'; const fb=e.currentTarget.parentElement?.querySelector('.t-fallback') as HTMLElement; if(fb)fb.style.display='flex';}}/>
                    <div className="t-fallback" style={{display:'none'}}>{tm.initials}</div>
                  </div>
                  <div>
                    <div className="testimonial-name">{tm.name}</div>
                    <div className="testimonial-biz">{tm.biz}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PLANS */}
      <section className="section" id="planes">
        <div className="inner">
          <div className="eyebrow" style={{marginBottom:'20px'}}>{t.plans.eyebrow}</div>
          <h2 className="display-h2" style={{marginBottom:'16px'}}>{t.plans.h2a}<br/><em>{t.plans.h2b}</em></h2>
          <p style={{fontSize:'16px',color:'var(--cream2)',fontWeight:300,marginBottom:'56px'}}>{t.plans.sub}</p>
          <div className="plans-grid">
            {t.plans.items.map(p=>(
              <div key={p.key} className={`plan${p.featured?' featured':''}`}>
                {p.featured&&<div className="plan-badge">{t.plans.popular}</div>}
                <div className="plan-tier">{p.tier}</div>
                <div className="plan-price">{p.price}</div>
                <div className="plan-period">{t.plans.period}</div>
                <div className="plan-desc">{p.desc}</div>
                <hr className="plan-sep"/>
                <ul className="plan-features">
                  {p.features.map(f=>(
                    <li key={f} className="plan-feature">
                      <span className="plan-check">✓</span>{f}
                    </li>
                  ))}
                </ul>
                <a href="/registro" className={`plan-cta${p.featured?' solid':' ghost'}`}>{t.plans.cta}</a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="section" style={{background:'var(--ink2)'}} id="faq">
        <div className="inner">
          <div className="eyebrow" style={{marginBottom:'20px'}}>{t.faq.eyebrow}</div>
          <h2 className="display-h2" style={{marginBottom:'48px'}}>{t.faq.h2a}<br/><em>{t.faq.h2b}</em></h2>
          <div className="faq-cols">
            {t.faq.items.map((group,gi)=>(
              <div key={gi} className="faq-group">
                {group.map(f=>(
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

      {/* CTA FINAL */}
      <div className="cta-block">
        <h2 className="cta-h2">{t.cta.h2a}<br/><em>{t.cta.h2b}</em></h2>
        <p className="cta-sub">{t.cta.sub}</p>
        <div className="cta-actions">
          <a href="/registro" className="btn-primary">{t.cta.primary}</a>
          <a href="mailto:soporte@aldente.app" className="btn-outline">{t.cta.secondary}</a>
        </div>
      </div>

      {/* FOOTER */}
      <footer className="footer">
        <div className="footer-inner">
          <div>
            <div className="footer-wordmark" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <img src="/assets/images/logo_aldente.png" alt="Aldente" style={{ width: '28px', height: '28px', objectFit: 'contain' }} />
              Aldente
            </div>
            <p className="footer-desc">{t.footer.desc}</p>
          </div>
          <div>
            <div className="footer-col-title">{t.footer.product}</div>
            <a href="#funciones" className="footer-link">{t.footer.links.features}</a>
            <a href="#planes" className="footer-link">{t.footer.links.pricing}</a>
            <a href="/blog" className="footer-link">Blog</a>
            <a href="/registro" className="footer-link">{t.footer.links.trial}</a>
            <a href="/login" className="footer-link">{t.footer.links.signin}</a>
          </div>
          <div>
            <div className="footer-col-title">{t.footer.company}</div>
            <a href="mailto:soporte@aldente.app" className="footer-link">{t.footer.links.contact}</a>
            <a href="mailto:ventas@aldente.app" className="footer-link">{t.footer.links.sales}</a>
          </div>
          <div>
            <div className="footer-col-title">{t.footer.support}</div>
            <a href="mailto:soporte@aldente.app" className="footer-link">{t.footer.links.email}</a>
            <a href="#faq" className="footer-link">{t.footer.links.faq}</a>
          </div>
        </div>
        <div className="footer-bottom">
          <span className="footer-copy">{t.footer.copy.replace('{year}', String(new Date().getFullYear()))}</span>
          <span className="footer-copy">{t.footer.made}</span>
        </div>
      </footer>
    </>
  );
}
