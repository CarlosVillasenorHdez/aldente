'use client';
import React, { useState, useEffect, useRef } from 'react';

// ─── i18n: ES / EN ────────────────────────────────────────────────────────────
type Lang = 'es' | 'en';
const T = {
  es: {
    navProblem:'El problema', navWhy:'Por qué nosotros', navDemo:'Demo', navPlans:'Planes', navFeatures:'Funcionalidades',
    navLogin:'Iniciar sesión', navCta:'14 días gratis →',
    heroEyebrow:'Sistema de gestión para restaurantes · México',
    heroH1a:'Por primera vez,', heroH1b:'sabes exactamente', heroH1c:'qué pasa en tu restaurante.',
    heroSub:'Sin esperar el corte. Sin llamar al cajero. Sin adivinar si te quedaste sin un ingrediente clave.',
    heroCta:'Probar 14 días gratis →', heroDemo:'Ver demo',
    heroTrust:['Sin tarjeta de crédito','14 días gratis','Cancela cuando quieras','Soporte en español'],
    statsLabels:['para cerrar un corte de caja','ROI en el primer mes','de mejora de margen promedio'],
    probEyebrow:'El problema real', probH:'No importa el tamaño.', probHEm:'Las preguntas son las mismas.',
    probBody:'4 mesas o 40. Tacos o mariscos. Familiar o cadena. Cada dueño de restaurante se va a dormir con las mismas preguntas sin respuesta.',
    demoEyebrow:'Ve cómo funciona', demoH:'Mesas, cocina y P&L', demoHEm:'en una sola plataforma.',
    demoNote:'Vista de demostración · La interfaz real se adapta a tu restaurante',
    demoTabs:['Mapa de mesas','Cocina (KDS)','P&L del día'],
    diffEyebrow:'Por qué Aldente', diffH:'La diferencia está en', diffHEm:'lo que nadie más mide.',
    diffBody:'Otros sistemas te dan un POS y un reporte. Aldente te dice cuánto ganaste, por qué falta mercancía y dónde se va el dinero.',
    diffThem:'Otros sistemas', diffUs:'Aldente',
    stepsEyebrow:'Qué tan rápido empiezas', stepsH:'Configurado y operando', stepsHEm:'el mismo día.',
    plansEyebrow:'Planes que crecen contigo', plansH:'No pagas módulos.', plansHEm:'Pagas por la etapa de tu negocio.',
    plansSub:'Cuando tu restaurante crece, cambias de plan. No compras módulos uno por uno. Sin contratos. Cambia de plan cuando quieras.',
    plansMonthly:'Mensual', plansAnnual:'Anual', plansMo:'/mes',
    plansDiscount:'−15%', plansBefore:'Antes',
    plansStart:'Empezar en', plansPriceNote:'Todos los precios en MXN · No incluyen IVA',
    ctaEyebrow:'Empieza hoy', ctaH:'Tu restaurante merece', ctaHEm:'saber la verdad.',
    ctaSub:'14 días sin costo, sin tarjeta. El sistema queda configurado el mismo día.',
    ctaBtn:'Probar Aldente gratis →',
    footerRights:'© 2026 Aldente · México',
  },
  en: {
    navProblem:'The problem', navWhy:'Why us', navDemo:'Demo', navPlans:'Plans', navFeatures:'Features',
    navLogin:'Log in', navCta:'14 days free →',
    heroEyebrow:'Restaurant management system · Mexico',
    heroH1a:"For the first time,", heroH1b:"you know exactly", heroH1c:"what's happening in your restaurant.",
    heroSub:'Without waiting for the daily close. Without calling the cashier. Without guessing what ingredient you ran out of.',
    heroCta:'Try 14 days free →', heroDemo:'See demo',
    heroTrust:['No credit card','14 days free','Cancel anytime','Spanish & English support'],
    statsLabels:['to close a daily register','ROI in the first month','average margin improvement'],
    probEyebrow:'The real problem', probH:"Size doesn't matter.", probHEm:'The questions are always the same.',
    probBody:'4 tables or 40. Tacos or seafood. Family or chain. Every restaurant owner goes to bed with the same unanswered questions.',
    demoEyebrow:'See how it works', demoH:'Tables, kitchen and P&L', demoHEm:'in one platform.',
    demoNote:'Demo view · The real interface adapts to your restaurant',
    demoTabs:['Table map','Kitchen (KDS)','Daily P&L'],
    diffEyebrow:'Why Aldente', diffH:'The difference is in', diffHEm:'what nobody else measures.',
    diffBody:'Other systems give you a POS and a report. Aldente tells you how much you made, why inventory is missing and where the money goes.',
    diffThem:'Other systems', diffUs:'Aldente',
    stepsEyebrow:'How fast you get started', stepsH:'Configured and running', stepsHEm:'the same day.',
    plansEyebrow:'Plans that grow with you', plansH:"You don't pay per module.", plansHEm:'You pay for your business stage.',
    plansSub:"When your restaurant grows, you upgrade. No buying modules one by one. No contracts. Change plans whenever you want.",
    plansMonthly:'Monthly', plansAnnual:'Annual', plansMo:'/mo',
    plansDiscount:'−15%', plansBefore:'Was',
    plansStart:'Start on', plansPriceNote:'All prices in MXN · VAT not included',
    ctaEyebrow:'Start today', ctaH:'Your restaurant deserves to', ctaHEm:'know the truth.',
    ctaSub:'14 days free, no card. The system is configured the same day.',
    ctaBtn:'Try Aldente free →',
    footerRights:'© 2026 Aldente · Mexico',
  },
};

const PAINS = [
  { n:'01', q:'¿Cuánto gané hoy de verdad?', body:'No el número de ventas. La utilidad real: con el costo de cada ingrediente que salió de la cocina, los gastos del día prorrateados y la merma de las cancelaciones. Ese número.', answer:'P&L del día en tiempo real. Automático.', color:'#c9963a' },
  { n:'02', q:'¿Por qué me falta mercancía si no vendí tanto?', body:'Porque cada platillo que sale descuenta los ingredientes exactos de su receta. Y cada cancelación registra lo que ya se consumió como merma con costo real. La diferencia te dice dónde está el problema.', answer:'Inventario vivo. Merma por ingrediente.', color:'#4a9eff' },
  { n:'03', q:'¿Puedo abrir otra sucursal sin perder el control?', body:'Cada sucursal opera de forma independiente — sus propias mesas, su propio menú, su equipo. Tú ves el consolidado desde un solo dashboard. La operación no se centraliza. La visibilidad sí.', answer:'Multi-sucursal con aislamiento real.', color:'#a78bfa' },
  { n:'04', q:'¿Sigues con papel y errores de comanda?', body:'La comanda va directo a cocina desde el celular del mesero. El cocinero ve el semáforo — verde, amarillo, rojo. El cajero cierra en 30 segundos. Sin papel, sin carreras, sin "no lo anoté".', answer:'POS + KDS + Mesero Móvil sincronizados.', color:'#34d399' },
];

const PLANS = [
  { key:'operacion', name:'Operación', price:699,  tagline:'Ya no hay papel en tu restaurante.', sub:'El restaurante que da el primer paso digital serio. Eliminas el caos antes de medir nada.',  color:'#4a9eff',
    features:[['POS con mapa de mesas drag & drop','Unión de mesas, pagos mixtos, descuentos, propinas'],['Para llevar integrado al POS','Flujo completo — sin mesa física, con nombre del cliente'],['Cocina digital KDS','Semáforo verde/amarillo/rojo. Badge urgente. Realtime.'],['Mesero móvil sin app store','Se instala desde el navegador en 10 segundos.'],['Corte de caja','Cierre en 30 segundos. Mesa vs Para Llevar separados.'],['Roles y acceso por PIN','Cada empleado entra directo a su herramienta'],['Control de propinas','Registro y resumen por turno'],['Reservaciones','Con confirmación automática al mesero']] },
  { key:'negocio', name:'Negocio', price:1299,  tagline:'Ya sé exactamente qué pasa en mi restaurante.', sub:'El restaurante que opera bien y quiere tomar decisiones con números, no con intuición.',  color:'#c9963a',
    features:[['Todo lo de Operación',''],['Inventario vivo por receta','Cada venta descuenta ingredientes automáticamente'],['COGS real — no estimado','Costo por platillo desde la receta exacta'],['P&L por día, semana o mes','Gastos escalados al período. Sin sorpresas.'],['Merma con costo y razón','Cada cancelación registra el costo del ingrediente'],['Gastos y depreciaciones','Pagos recurrentes con alertas de vencimiento'],['Lista de compras automática','Basada en punto de reorden e historial de salidas'],['Programa de lealtad','Puntos, niveles y recompensas configurables'],['Alertas inteligentes','Stock bajo, órdenes demoradas, mesas sin atender']] },
  { key:'empresa', name:'Empresa', price:2199,  tagline:'Ya puedo crecer sin perder el hilo.', sub:'Cadenas y grupos que necesitan visión centralizada sin perder la autonomía de cada sucursal.',  color:'#a78bfa',
    features:[['Todo lo de Negocio',''],['Multi-sucursal consolidado','Dashboard unificado. Mesas y operación aisladas por sucursal.'],['Analytics comparativo','P&L por sucursal. Ranking de desempeño. Márgenes en paralelo.'],['Nómina LFT compliant','Art. 67/68/69/75. Horas extra calculadas y validadas.'],['Recursos humanos','Vacaciones, permisos, tiempos extra con factor 2x/3x'],['Delivery integrado','Asignación de repartidores, estados, historial por sucursal'],['Reportes ejecutivos','Por sucursal o consolidados, por período'],['Análisis avanzado de mermas','Por sucursal, por ingrediente, por turno']] },
];

const DIFFS = [
  { label:'Precio', them:'Módulos por separado. KDS +$200/mes. Mesas +$100/mes.', us:'Un precio. Todo incluido. Sin sorpresas al final del mes.' },
  { label:'Merma', them:'Un número en un reporte. Sin saber qué platillo ni por qué.', us:'Costo real por ingrediente, por platillo cancelado, con razón.' },
  { label:'P&L', them:'Estado de resultados sin escala de tiempo real al período.', us:'P&L del día, semana o mes. Gastos escalados automáticamente.' },
  { label:'Nómina', them:'No incluida. Calculas horas extra e ISR fuera del sistema.', us:'Nómina LFT Art. 67/68/69/75. Factores calculados en DB.' },
  { label:'Acceso', them:'Login genérico. Todos comparten credenciales de email.', us:'Cada empleado entra con su PIN, directo a su herramienta.' },
];

const STEPS = [
  { n:'1', t:'Alta en 5 minutos', b:'Nombre del restaurante, mesas y usuarios. Sin instalar nada.' },
  { n:'2', t:'Tu menú cargado', b:'Platillos con fotos, precios y recetas. El wizard calcula el margen.' },
  { n:'3', t:'Primera orden enviada', b:'Mesero desde su celular. Cocina en pantalla. Caja en 30 segundos.' },
];

// Intersection-observer-based scroll reveal
function useInView(threshold = 0.12) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = React.useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setInView(true); obs.disconnect(); } }, { threshold });
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, inView };
}

function FadeUp({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const { ref, inView } = useInView(0.08);
  return (
    <div ref={ref} style={{ opacity: inView ? 1 : 0, transform: inView ? 'translateY(0)' : 'translateY(36px)', transition: `opacity 0.75s ${delay}s ease, transform 0.75s ${delay}s cubic-bezier(0.22,1,0.36,1)` }}>
      {children}
    </div>
  );
}

// Count-up animation
function CountUp({ target, suffix, decimals = 0, active }: { target: number; suffix: string; decimals?: number; active: boolean }) {
  const [val, setVal] = React.useState(0);
  useEffect(() => {
    if (!active) return;
    let start: number | null = null;
    const duration = 1800;
    const step = (ts: number) => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / duration, 1);
      const eased = p === 1 ? 1 : 1 - Math.pow(2, -10 * p);
      setVal(parseFloat((eased * target).toFixed(decimals)));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [active, target, decimals]);
  return <>{decimals > 0 ? val.toFixed(decimals) : val}{suffix}</>;
}

function LiveDemo() {
  const [tab, setTab] = useState<'pos'|'kds'|'pl'>('pos');
  const [fade, setFade] = useState(true);
  const MESAS = [{n:1,s:'ocupada',t:22,v:480,m:'Carlos'},{n:2,s:'libre',t:0,v:0,m:''},{n:3,s:'ocupada',t:8,v:210,m:'María'},{n:4,s:'ocupada',t:41,v:920,m:'Carlos'},{n:5,s:'libre',t:0,v:0,m:''},{n:6,s:'cuenta',t:65,v:1340,m:'Luis'}];
  const CMDS = [{mesa:4,p:'Tacos de Res x3',min:18},{mesa:1,p:'Hamburguesa Aldente',min:9},{mesa:3,p:'Ensalada César',min:4},{mesa:6,p:'Café Americano x2',min:2}];
  const sem = (m:number) => m>15?'#ef4444':m>8?'#f59e0b':'#22c55e';
  const lang2 = typeof window !== 'undefined' ? (window as any).__aldenteLang ?? 'es' : 'es';
  const changeTab = (k: typeof tab) => { if (k===tab) return; setFade(false); setTimeout(() => { setTab(k); setFade(true); }, 170); };
  return (
    <div style={{background:'#0a1628',border:'1px solid rgba(255,255,255,.08)',borderRadius:20,overflow:'hidden'}}>
      <div style={{display:'flex',borderBottom:'1px solid rgba(255,255,255,.06)',padding:'0 20px',background:'rgba(255,255,255,.01)'}}>
        {(['pos','kds','pl'] as const).map((k,i) => (
          <button key={k} onClick={()=>changeTab(k)} style={{padding:'14px 20px',fontSize:13,fontWeight:tab===k?600:400,color:tab===k?'#c9963a':'rgba(255,255,255,.4)',background:'none',border:'none',borderBottom:tab===k?'2px solid #c9963a':'2px solid transparent',cursor:'pointer',transition:'all .2s'}}>
            {['Mapa de mesas','Cocina (KDS)','P&L del día'][i]}
          </button>
        ))}
        <div style={{marginLeft:'auto',display:'flex',alignItems:'center',gap:6,padding:'0 8px'}}>
          <div style={{width:6,height:6,borderRadius:'50%',background:'#22c55e',boxShadow:'0 0 8px #22c55e'}}/>
          <span style={{fontSize:11,color:'rgba(255,255,255,.3)'}}>En vivo</span>
        </div>
      </div>
      <div style={{padding:20,minHeight:300,opacity:fade?1:0,transform:fade?'translateY(0)':'translateY(6px)',transition:'opacity .17s,transform .17s'}}>
        {tab==='pos'&&<div><div style={{display:'flex',justifyContent:'space-between',marginBottom:16}}><span style={{fontSize:12,color:'rgba(255,255,255,.4)'}}>Restaurante El Güero · Turno noche</span><span style={{fontSize:12,color:'#c9963a',fontWeight:600}}>$2,950 acumulado</span></div><div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10}}>{MESAS.map(m=><div key={m.n} style={{padding:'14px 16px',borderRadius:12,background:m.s==='libre'?'rgba(255,255,255,.03)':m.s==='cuenta'?'rgba(201,150,58,.1)':'rgba(34,197,94,.08)',border:`1px solid ${m.s==='libre'?'rgba(255,255,255,.07)':m.s==='cuenta'?'rgba(201,150,58,.3)':'rgba(34,197,94,.2)'}`}}><div style={{display:'flex',justifyContent:'space-between',marginBottom:6}}><span style={{fontSize:15,fontWeight:700,color:'#f1f5f9'}}>Mesa {m.n}</span>{m.s!=='libre'&&<span style={{fontSize:10,color:'rgba(255,255,255,.35)'}}>{m.t}m</span>}</div>{m.s==='libre'?<span style={{fontSize:11,color:'rgba(255,255,255,.25)'}}>Libre</span>:<><span style={{fontSize:16,fontWeight:700,color:m.s==='cuenta'?'#c9963a':'#f1f5f9'}}>${m.v.toLocaleString('es-MX')}</span><div style={{fontSize:10,color:'rgba(255,255,255,.3)',marginTop:4}}>{m.m}</div></>}</div>)}</div></div>}
        {tab==='kds'&&<div><div style={{display:'flex',gap:16,marginBottom:16}}>{[['#22c55e','< 8 min'],['#f59e0b','8–15 min'],['#ef4444','> 15 min']].map(([c,l])=><div key={l} style={{display:'flex',alignItems:'center',gap:6,fontSize:12,color:'rgba(255,255,255,.45)'}}><div style={{width:8,height:8,borderRadius:'50%',background:c as string}}/>{l}</div>)}</div><div style={{display:'flex',flexDirection:'column',gap:8}}>{CMDS.map((c,i)=><div key={i} style={{display:'flex',alignItems:'center',gap:14,padding:'12px 16px',borderRadius:10,background:'rgba(255,255,255,.03)',border:'1px solid rgba(255,255,255,.07)'}}><div style={{width:10,height:10,borderRadius:'50%',background:sem(c.min),boxShadow:`0 0 10px ${sem(c.min)}80`}}/><span style={{fontSize:13,color:'rgba(255,255,255,.5)',width:56}}>Mesa {c.mesa}</span><span style={{fontSize:14,fontWeight:500,color:'#f1f5f9',flex:1}}>{c.p}</span><span style={{fontSize:13,color:sem(c.min),fontWeight:600,fontFamily:'monospace'}}>{c.min} min</span></div>)}</div></div>}
        {tab==='pl'&&<div><div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10,marginBottom:16}}>{[{l:'Ventas del día',v:'$14,280',c:'#f1f5f9',bg:'rgba(255,255,255,.04)'},{l:'COGS',v:'−$4,712',c:'#f87171',bg:'rgba(239,68,68,.06)'},{l:'Utilidad bruta',v:'$9,568',c:'#4ade80',bg:'rgba(74,222,128,.07)'}].map(k=><div key={k.l} style={{padding:14,borderRadius:10,background:k.bg,border:'1px solid rgba(255,255,255,.06)'}}><p style={{fontSize:10,color:'rgba(255,255,255,.35)',marginBottom:6,letterSpacing:'.06em'}}>{k.l}</p><p style={{fontSize:20,fontWeight:700,color:k.c,fontFamily:'monospace'}}>{k.v}</p></div>)}</div><div style={{background:'rgba(255,255,255,.03)',borderRadius:10,padding:'14px 16px',border:'1px solid rgba(255,255,255,.06)'}}>{[['Gastos (prorrateados)','−$2,340'],['Merma registrada','−$380'],['Nómina del turno','−$1,200']].map(([l,v])=><div key={l} style={{display:'flex',justifyContent:'space-between',padding:'6px 0'}}><span style={{fontSize:13,color:'rgba(255,255,255,.45)'}}>{l}</span><span style={{fontSize:13,color:'#f87171',fontFamily:'monospace'}}>{v}</span></div>)}<div style={{borderTop:'1px solid rgba(255,255,255,.08)',paddingTop:8,marginTop:4,display:'flex',justifyContent:'space-between'}}><span style={{fontSize:14,fontWeight:600,color:'#f1f5f9'}}>Utilidad neta estimada</span><span style={{fontSize:16,fontWeight:700,color:'#4ade80',fontFamily:'monospace'}}>$5,648</span></div></div></div>}
      </div>
    </div>
  );
}

export default function MarketingPage() {
  const [lang, setLang] = useState<Lang>('es');
  const t = T[lang];
  const [menuOpen, setMenuOpen] = useState(false);
  const [activePain, setActivePain] = useState(0);
  const [annual, setAnnual] = useState(false);
  const [navScrolled, setNavScrolled] = useState(false);
  const statsRef = useRef<HTMLDivElement>(null);
  const [statsVisible, setStatsVisible] = useState(false);
  const pain = PAINS[activePain];
  const disc = annual ? 0.85 : 1;

  useEffect(() => { const t = setInterval(() => setActivePain(p => (p+1)%PAINS.length), 8000); return () => clearInterval(t); }, []);
  useEffect(() => { const f = () => setNavScrolled(window.scrollY > 20); window.addEventListener('scroll', f, {passive:true}); return () => window.removeEventListener('scroll', f); }, []);
  useEffect(() => {
    const el = statsRef.current; if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setStatsVisible(true); obs.disconnect(); } }, { threshold: 0.3 });
    obs.observe(el); return () => obs.disconnect();
  }, []);

  return (
    <div style={{background:'#07090f',color:'#f0ece4',fontFamily:"'Outfit',system-ui,sans-serif",overflowX:'hidden'}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400;1,700&family=Outfit:wght@300;400;500;600;700&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        html{scroll-behavior:smooth}a{text-decoration:none;color:inherit}button{cursor:pointer;font-family:inherit}
        @keyframes run{to{transform:translateX(-50%)}}
        @keyframes pulse{0%,100%{opacity:.07}50%{opacity:.15}}
        @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-14px)}}
        @keyframes tick-in{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
        @keyframes progress-fill{from{width:0%}to{width:100%}}
        .serif{font-family:'Playfair Display',Georgia,serif}
        .nav{position:fixed;top:0;left:0;right:0;z-index:200;height:60px;display:flex;align-items:center;padding:0 clamp(16px,5vw,60px);backdrop-filter:blur(24px);transition:background .3s,border-color .3s,box-shadow .3s;border-bottom:1px solid transparent}
        .nav.s{background:rgba(7,9,15,.95);border-bottom-color:rgba(255,255,255,.05);box-shadow:0 4px 40px rgba(0,0,0,.5)}
        .wrap{max-width:1200px;margin:0 auto;padding:0 clamp(16px,5vw,60px)}
        .sec{padding:clamp(72px,9vw,120px) clamp(16px,5vw,60px)}
        .eyebrow{font-size:10px;font-weight:700;letter-spacing:.15em;text-transform:uppercase;color:#c9963a;display:flex;align-items:center;gap:12px}
        .eyebrow::before,.eyebrow::after{content:'';width:24px;height:1px;background:rgba(201,150,58,.35)}
        .pill{display:inline-flex;align-items:center;padding:10px 24px;border-radius:100px;font-size:13px;font-weight:600;transition:all .25s;font-family:'Outfit',sans-serif}
        .gold{background:#c9963a;color:#07090f;border:none}.gold:hover{background:#dba84a;transform:translateY(-2px);box-shadow:0 10px 32px rgba(201,150,58,.35)}
        .ghost{background:transparent;color:rgba(240,236,228,.6);border:1px solid rgba(255,255,255,.12)}.ghost:hover{border-color:rgba(255,255,255,.35);color:#f0ece4;transform:translateY(-1px)}
        .pcard{border-radius:22px;padding:36px 30px;transition:transform .4s cubic-bezier(.22,1,.36,1),box-shadow .4s}.pcard:hover{transform:translateY(-10px);box-shadow:0 28px 64px rgba(0,0,0,.45)}
        .pain-btn{transition:all .3s cubic-bezier(.22,1,.36,1)}.pain-btn:hover{transform:translateX(5px)}
        .diff-row{transition:transform .2s}.diff-row:hover{transform:scaleX(1.006)}
        @media(max-width:900px){
  .hnav{display:none!important}
  .hmob{display:flex!important}
  .g3{grid-template-columns:1fr!important}
  .g2{grid-template-columns:1fr!important}
  .hcols{flex-direction:column!important}
  .prob-grid{grid-template-columns:1fr!important;gap:36px!important}
  .diff-grid{grid-template-columns:1fr!important}
  .diff-label{display:none!important}
  .hero-ctas{flex-direction:column!important;align-items:stretch!important}
  .hero-ctas a{text-align:center!important}
  .hero-trust{justify-content:center!important}
  .stats-grid{grid-template-columns:repeat(3,1fr)!important;gap:20px!important}
  .footer-inner{flex-direction:column!important;align-items:center!important;text-align:center!important;gap:16px!important}
  .plan-grid{grid-template-columns:1fr!important}
  .roi-inner{flex-direction:column!important;gap:24px!important}
  .roi-stats{justify-content:center!important}
}
@media(max-width:500px){
  .stats-grid{grid-template-columns:1fr!important}
  .hero-trust{flex-direction:column!important;align-items:center!important;gap:8px!important}
  .plan-grid{gap:12px!important}
}
      `}</style>

      {/* NAV */}
      <nav className={`nav${navScrolled?' s':''}`}>
        <div style={{width:'100%',maxWidth:1200,margin:'0 auto',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <a href="/" style={{fontFamily:"'Playfair Display',serif",fontSize:20,fontWeight:700,color:'#c9963a',letterSpacing:'.03em',display:'flex',alignItems:'center',gap:10}}>
            <img src="/assets/images/logo_aldente.png" alt="" style={{width:28,height:28,objectFit:'contain'}}/>Aldente
          </a>
          {/* Desktop nav */}
          <div className="hnav" style={{display:'flex',alignItems:'center',gap:28}}>
            {([[`#problema`,t.navProblem],[`#diferencia`,t.navWhy],[`#demo`,t.navDemo],[`#planes`,t.navPlans],[`/funcionalidades`,t.navFeatures]] as [string,string][]).map(([h,l])=>(
              <a key={l} href={h} style={{fontSize:13,color:'rgba(240,236,228,.5)',transition:'color .2s'}} onMouseEnter={e=>(e.currentTarget.style.color='#f0ece4')} onMouseLeave={e=>(e.currentTarget.style.color='rgba(240,236,228,.5)')}>{l}</a>
            ))}
            {/* ES/EN toggle */}
            <button onClick={()=>setLang(l=>l==='es'?'en':'es')} style={{display:'flex',alignItems:'center',gap:6,padding:'5px 12px',borderRadius:100,background:'rgba(255,255,255,.06)',border:'1px solid rgba(255,255,255,.12)',cursor:'pointer',fontSize:12,fontWeight:600,color:'rgba(240,236,228,.7)',transition:'all .2s'}}>
              <span style={{opacity:lang==='es'?1:.4}}>ES</span>
              <span style={{color:'rgba(255,255,255,.25)'}}>/</span>
              <span style={{opacity:lang==='en'?1:.4}}>EN</span>
            </button>
            <a href="/login" style={{fontSize:13,fontWeight:500,color:'rgba(240,236,228,.75)',padding:'8px 18px',borderRadius:100,border:'1px solid rgba(240,236,228,.2)',transition:'all .2s'}}>{t.navLogin}</a>
            <a href="/registro" className="pill gold" style={{fontSize:13}}>{t.navCta}</a>
          </div>
          {/* Mobile: lang + hamburger */}
          <div className="hmob" style={{display:'none',alignItems:'center',gap:10}}>
            <button onClick={()=>setLang(l=>l==='es'?'en':'es')} style={{padding:'5px 10px',borderRadius:20,background:'rgba(255,255,255,.06)',border:'1px solid rgba(255,255,255,.12)',cursor:'pointer',fontSize:11,fontWeight:700,color:'rgba(240,236,228,.7)'}}>
              {lang.toUpperCase()}
            </button>
            <button onClick={()=>setMenuOpen(v=>!v)} style={{background:'none',border:'1px solid rgba(255,255,255,.15)',borderRadius:8,padding:'6px 10px',cursor:'pointer',display:'flex',flexDirection:'column',gap:4}}>
              {[0,1,2].map(i=><div key={i} style={{width:20,height:2,background:'rgba(240,236,228,.7)',borderRadius:1,transition:'all .25s',transform:menuOpen&&i===0?'rotate(45deg) translate(4px,4px)':menuOpen&&i===2?'rotate(-45deg) translate(4px,-4px)':'none',opacity:menuOpen&&i===1?0:1}}/>)}
            </button>
          </div>
        </div>
        {/* Mobile dropdown */}
        {menuOpen && (
          <div style={{position:'absolute',top:60,left:0,right:0,background:'rgba(7,9,15,.98)',borderBottom:'1px solid rgba(255,255,255,.08)',padding:'20px 24px',display:'flex',flexDirection:'column',gap:16,zIndex:300,backdropFilter:'blur(20px)'}}>
            {([[`#problema`,t.navProblem],[`#diferencia`,t.navWhy],[`#demo`,t.navDemo],[`#planes`,t.navPlans],[`/funcionalidades`,t.navFeatures]] as [string,string][]).map(([h,l])=>(
              <a key={l} href={h} onClick={()=>setMenuOpen(false)} style={{fontSize:15,color:'rgba(240,236,228,.7)',padding:'4px 0',borderBottom:'1px solid rgba(255,255,255,.05)'}}>{l}</a>
            ))}
            <div style={{display:'flex',gap:10,marginTop:4}}>
              <a href="/login" style={{flex:1,padding:'11px',borderRadius:10,border:'1px solid rgba(255,255,255,.15)',color:'rgba(240,236,228,.7)',fontSize:14,textAlign:'center'}}>{t.navLogin}</a>
              <a href="/registro" style={{flex:1,padding:'11px',borderRadius:10,background:'#c9963a',color:'#07090f',fontSize:14,fontWeight:700,textAlign:'center'}}>{t.navCta}</a>
            </div>
          </div>
        )}
      </nav>

      {/* HERO */}
      <section style={{paddingTop:60,minHeight:'100vh',display:'flex',flexDirection:'column',justifyContent:'center',position:'relative',overflow:'hidden'}}>
        <div style={{position:'absolute',inset:0,backgroundImage:'linear-gradient(rgba(201,150,58,.025) 1px,transparent 1px),linear-gradient(90deg,rgba(201,150,58,.025) 1px,transparent 1px)',backgroundSize:'80px 80px',pointerEvents:'none'}}/>
        <div style={{position:'absolute',top:'30%',left:'50%',transform:'translate(-50%,-50%)',width:1000,height:700,background:'radial-gradient(ellipse,rgba(201,150,58,.09) 0%,transparent 65%)',pointerEvents:'none',animation:'pulse 5s ease-in-out infinite'}}/>
        {/* Floating circles */}
        <div style={{position:'absolute',top:'18%',right:'8%',width:120,height:120,borderRadius:'50%',border:'1px solid rgba(201,150,58,.1)',animation:'float 7s ease-in-out infinite',pointerEvents:'none'}}/>
        <div style={{position:'absolute',bottom:'22%',left:'6%',width:60,height:60,borderRadius:'50%',border:'1px solid rgba(74,158,255,.1)',animation:'float 9s ease-in-out infinite .8s',pointerEvents:'none'}}/>
        <div style={{position:'absolute',top:'65%',right:'14%',width:32,height:32,borderRadius:'50%',background:'rgba(201,150,58,.07)',animation:'float 6s ease-in-out infinite 1.5s',pointerEvents:'none'}}/>

        <div className="wrap" style={{position:'relative',zIndex:1,paddingTop:'clamp(60px,10vw,120px)',paddingBottom:'clamp(60px,10vw,120px)',textAlign:'center'}}>
          <div className="eyebrow" style={{justifyContent:'center',marginBottom:28,opacity:0,animation:'tick-in .6s .1s ease both'}}>{t.heroEyebrow}</div>
          <h1 className="serif" style={{fontSize:'clamp(38px,7vw,96px)',fontWeight:700,lineHeight:1.02,marginBottom:24,opacity:0,animation:'tick-in .7s .2s ease both'}}>
            {t.heroH1a}<br/><em style={{color:'#c9963a',fontStyle:'italic'}}>{t.heroH1b}</em><br/>{t.heroH1c}
          </h1>
          <p style={{fontSize:'clamp(14px,2vw,19px)',fontWeight:300,color:'rgba(240,236,228,.6)',maxWidth:520,margin:'0 auto 20px',lineHeight:1.75,opacity:0,animation:'tick-in .7s .32s ease both'}}>{t.heroSub}</p>
          {/* Pain ticker */}
          <div style={{marginBottom:40,opacity:0,animation:'tick-in .7s .42s ease both'}}>
            <div style={{display:'inline-flex',alignItems:'center',gap:10,padding:'10px 18px 10px 14px',borderRadius:100,background:'rgba(255,255,255,.04)',border:'1px solid rgba(255,255,255,.08)',transition:'all .4s'}}>
              <div style={{width:24,height:24,borderRadius:'50%',background:`${pain.color}20`,border:`1px solid ${pain.color}40`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:700,color:pain.color,transition:'all .4s'}}>?</div>
              <span key={activePain} style={{fontSize:13,color:'rgba(240,236,228,.65)',animation:'tick-in .3s ease both'}}>{pain.q.replace(/[¿?]/g,'')}</span>
              <span style={{fontSize:10,fontWeight:700,color:pain.color,padding:'2px 8px',background:`${pain.color}15`,borderRadius:100,letterSpacing:'.05em',transition:'all .4s'}}>RESUELTA</span>
            </div>
          </div>
          <div className="hero-ctas" style={{display:'flex',gap:12,justifyContent:'center',flexWrap:'wrap',marginBottom:48,opacity:0,animation:'tick-in .7s .52s ease both'}}>
            <a href="/registro" className="pill gold" style={{fontSize:15,padding:'13px 32px'}}>{t.heroCta}</a>
            <a href="#demo" className="pill ghost" style={{fontSize:15,padding:'13px 28px'}}>{t.heroDemo}</a>
          </div>
          <div style={{display:'flex',gap:24,justifyContent:'center',flexWrap:'wrap',opacity:0,animation:'tick-in .7s .62s ease both'}}>
            {['Sin tarjeta de crédito','14 días gratis','Cancela cuando quieras','Soporte en español'].map(s=>(
              <span key={s} style={{fontSize:12,color:'rgba(240,236,228,.65)',display:'flex',alignItems:'center',gap:6}}><span style={{color:'#c9963a',fontSize:10}}>✓</span> {s}</span>
            ))}
          </div>
        </div>
      </section>

      {/* MARQUEE */}
      <div style={{borderTop:'1px solid rgba(255,255,255,.05)',borderBottom:'1px solid rgba(255,255,255,.05)',padding:'12px 0',overflow:'hidden',background:'rgba(255,255,255,.015)'}}>
        <div style={{display:'flex',animation:'run 42s linear infinite',whiteSpace:'nowrap'}}>
          {[...Array(2)].map((_,r)=>['POS mapa de mesas','KDS semáforo','Mesero móvil sin app store','P&L en tiempo real','Merma real por ingrediente','Inventario vivo','Gastos y depreciaciones','Nómina LFT Art.67/68/69','Reservaciones','Multi-sucursal','Lealtad','Carta QR','Bloqueo de stock','Traslado entre mesas'].map((item,i)=>(
            <span key={`${r}-${i}`} style={{fontSize:11,color:'rgba(240,236,228,.55)',padding:'0 28px',letterSpacing:'.06em'}}>{item}<span style={{color:'rgba(201,150,58,.4)',marginLeft:28}}>·</span></span>
          )))}
        </div>
      </div>

      {/* STATS */}
      <div ref={statsRef} style={{background:'#0d0f17',borderTop:'1px solid rgba(255,255,255,.04)',borderBottom:'1px solid rgba(255,255,255,.04)',padding:'clamp(40px,6vw,80px) clamp(16px,5vw,60px)'}}>
        <div style={{maxWidth:1200,margin:'0 auto',display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:40}} className="g3 stats-grid">
          {[{target:30,suffix:' seg'},{target:3.2,suffix:'x',decimals:1},{target:12,suffix:'%'}].map((s,i)=>(
            <div key={i} style={{textAlign:'center',opacity:statsVisible?1:0,transform:statsVisible?'translateY(0)':'translateY(24px)',transition:`opacity .6s ${i*.15}s ease, transform .6s ${i*.15}s ease`}}>
              <p style={{fontSize:'clamp(32px,4vw,52px)',fontWeight:700,color:'#c9963a',lineHeight:1,fontFamily:'monospace',letterSpacing:'-.02em'}}>
                <CountUp target={s.target} suffix={s.suffix} decimals={(s as any).decimals??0} active={statsVisible}/>
              </p>
              <p style={{fontSize:13,color:'rgba(240,236,228,.5)',marginTop:8,lineHeight:1.5}}>{t.statsLabels[i]}</p>
            </div>
          ))}
        </div>
      </div>

      {/* PROBLEM */}
      <section className="sec" id="problema" style={{background:'#07090f'}}>
        <div className="wrap">
          <div style={{display:'grid',gridTemplateColumns:'380px 1fr',gap:64,alignItems:'start'}} className="prob-grid">
            {/* Left col: título + lista de preguntas */}
            <FadeUp>
              <div>
                <div className="eyebrow" style={{marginBottom:24}}>{t.probEyebrow}</div>
                <h2 className="serif" style={{fontSize:'clamp(32px,3.5vw,48px)',fontWeight:700,lineHeight:1.08,marginBottom:20}}>
                  {t.probH}<br/><em style={{color:'#c9963a'}}>{t.probHEm}</em>
                </h2>
                <p style={{fontSize:15,color:'rgba(240,236,228,.5)',lineHeight:1.8,marginBottom:32}}>
                  {t.probBody}
                </p>
                <div style={{display:'flex',flexDirection:'column',gap:8}}>
                  {PAINS.map((p,i)=>(
                    <button key={i} onClick={()=>{setActivePain(i);}} className="pain-btn"
                      style={{display:'flex',alignItems:'center',gap:14,padding:'12px 16px',borderRadius:12,
                        background:activePain===i?`${p.color}12`:'rgba(255,255,255,.025)',
                        border:`1px solid ${activePain===i?p.color+'40':'rgba(255,255,255,.07)'}`,
                        textAlign:'left',width:'100%',cursor:'pointer',transition:'all .3s cubic-bezier(.22,1,.36,1)'}}>
                      <span style={{fontFamily:'monospace',fontSize:11,color:activePain===i?p.color:'rgba(240,236,228,.2)',fontWeight:700,flexShrink:0,width:24}}>{p.n}</span>
                      <span style={{fontSize:14,color:activePain===i?'#f0ece4':'rgba(240,236,228,.4)',fontWeight:activePain===i?600:400,lineHeight:1.4}}>
                        {p.q.replace(/[¿?]/g,'').trim()}
                      </span>
                      {activePain===i&&<span style={{marginLeft:'auto',color:p.color,fontSize:18,flexShrink:0}}>→</span>}
                    </button>
                  ))}
                </div>
                {/* Progress bar */}
                <div style={{marginTop:20,height:2,borderRadius:2,background:'rgba(255,255,255,.06)',overflow:'hidden'}}>
                  <div key={activePain} style={{height:'100%',borderRadius:2,background:pain.color,
                    animation:'progress-fill 8s linear forwards'}}/>
                </div>
              </div>
            </FadeUp>

            {/* Right col: detalle de la pregunta activa */}
            <FadeUp delay={0.12}>
              <div style={{position:'sticky',top:80}}>
                <div style={{padding:'44px 48px',borderRadius:24,
                  background:`linear-gradient(135deg,${pain.color}09 0%,rgba(255,255,255,.018) 100%)`,
                  border:`1px solid ${pain.color}28`,
                  transition:'background .6s,border-color .6s',
                  minHeight:360,display:'flex',flexDirection:'column',justifyContent:'space-between'}}>
                  <div>
                    <div style={{fontSize:56,fontFamily:'Playfair Display,serif',fontWeight:700,
                      color:pain.color,lineHeight:1,marginBottom:24,opacity:.4,transition:'color .5s'}}>"</div>
                    <h3 key={activePain} className="serif"
                      style={{fontSize:'clamp(24px,2.8vw,36px)',fontWeight:700,color:'#f0ece4',
                        lineHeight:1.15,marginBottom:20,fontStyle:'italic',
                        animation:'tick-in .4s cubic-bezier(.22,1,.36,1) both'}}>
                      {pain.q}
                    </h3>
                    <p key={activePain+'b'} style={{fontSize:15,color:'rgba(240,236,228,.6)',lineHeight:1.85,
                      animation:'tick-in .4s .06s cubic-bezier(.22,1,.36,1) both'}}>
                      {pain.body}
                    </p>
                  </div>
                  <div style={{marginTop:32,display:'inline-flex',alignItems:'center',gap:12,
                    padding:'12px 20px',borderRadius:12,
                    background:`${pain.color}15`,border:`1px solid ${pain.color}35`,
                    transition:'all .5s',alignSelf:'flex-start'}}>
                    <span style={{fontSize:10,fontWeight:700,letterSpacing:'.12em',textTransform:'uppercase',
                      color:pain.color,flexShrink:0}}>Solución Aldente</span>
                    <span style={{fontSize:14,color:'#f0ece4',fontWeight:600}}>{pain.answer}</span>
                  </div>
                </div>
              </div>
            </FadeUp>
          </div>
        </div>
      </section>

      {/* DEMO */}
      <section className="sec" id="demo" style={{background:'#0d0f17'}}>
        <div className="wrap">
          <FadeUp><div style={{textAlign:'center',marginBottom:56}}>
            <div className="eyebrow" style={{justifyContent:'center',marginBottom:20}}>{t.demoEyebrow}</div>
            <h2 className="serif" style={{fontSize:'clamp(30px,4.5vw,54px)',fontWeight:700,lineHeight:1.12}}>{t.demoH}<br/><em style={{color:'#c9963a'}}>{t.demoHEm}</em></h2>
          </div></FadeUp>
          <FadeUp delay={0.1}><LiveDemo/></FadeUp>
          <p style={{textAlign:'center',fontSize:12,color:'rgba(240,236,228,.2)',marginTop:20}}>{t.demoNote}</p>
        </div>
      </section>

      {/* DIFFERENCES */}
      <section className="sec" id="diferencia" style={{background:'#07090f'}}>
        <div className="wrap">
          <FadeUp><div style={{maxWidth:600,marginBottom:64}}>
            <div className="eyebrow" style={{marginBottom:20}}>{t.diffEyebrow}</div>
            <h2 className="serif" style={{fontSize:'clamp(32px,4.5vw,54px)',fontWeight:700,lineHeight:1.1,marginBottom:20}}>{t.diffH}<br/><em style={{color:'#c9963a'}}>{t.diffHEm}</em></h2>
            <p style={{fontSize:15,color:'rgba(240,236,228,.5)',lineHeight:1.75}}>{t.diffBody}</p>
          </div></FadeUp>
          <div style={{display:'flex',flexDirection:'column',gap:2}}>
            <div style={{display:'grid',gridTemplateColumns:'100px 1fr 1fr',gap:2,marginBottom:6}}>
              <div/><div style={{padding:'8px 20px',fontSize:10,fontWeight:700,letterSpacing:'.1em',textTransform:'uppercase',color:'rgba(240,236,228,.55)'}}>{t.diffThem}</div>
              <div style={{padding:'8px 20px',fontSize:10,fontWeight:700,letterSpacing:'.1em',textTransform:'uppercase',color:'#c9963a'}}>{t.diffUs}</div>
            </div>
            {DIFFS.map((d,i)=>(
              <FadeUp key={i} delay={i*0.07}>
                <div className="diff-row diff-grid" style={{display:'grid',gridTemplateColumns:'100px 1fr 1fr',gap:2}}>
                  <div className="diff-label" style={{padding:'18px 16px',display:'flex',alignItems:'center',borderRadius:'10px 0 0 10px',background:'rgba(255,255,255,.02)',borderRight:'1px solid rgba(255,255,255,.04)'}}><span style={{fontSize:10,fontWeight:700,color:'rgba(240,236,228,.6)',letterSpacing:'.08em',textTransform:'uppercase'}}>{d.label}</span></div>
                  <div style={{padding:'18px 22px',background:'rgba(255,255,255,.018)',display:'flex',alignItems:'center',gap:10}}><span style={{color:'rgba(239,68,68,.5)',fontSize:13,flexShrink:0}}>✗</span><p style={{fontSize:13,color:'rgba(240,236,228,.4)',lineHeight:1.65}}>{d.them}</p></div>
                  <div style={{padding:'18px 22px',background:'rgba(201,150,58,.04)',borderRadius:'0 10px 10px 0',border:'1px solid rgba(201,150,58,.1)',display:'flex',alignItems:'center',gap:10}}><span style={{color:'#c9963a',fontSize:13,flexShrink:0}}>✓</span><p style={{fontSize:13,color:'rgba(240,236,228,.8)',lineHeight:1.65}}>{d.us}</p></div>
                </div>
              </FadeUp>
            ))}
          </div>
          <FadeUp delay={0.2}><div style={{marginTop:48,padding:'36px 44px',borderRadius:20,background:'rgba(201,150,58,.05)',border:'1px solid rgba(201,150,58,.18)',display:'flex',gap:48,alignItems:'center',flexWrap:'wrap'}}>
            <div style={{flex:1,minWidth:240}}>
              <p className="serif" style={{fontSize:'clamp(18px,2.5vw,26px)',color:'#f0ece4',lineHeight:1.4,marginBottom:12,fontStyle:'italic'}}>"Evitar 2 mermas al día paga el sistema 3 veces al mes."</p>
              <p style={{fontSize:13,color:'rgba(240,236,228,.4)',lineHeight:1.7}}>Si cada platillo tiene $80 de costo y registras 2 mermas diarias evitables, son $4,800 mensuales. El plan Negocio cuesta $1,499.</p>
            </div>
            <div style={{display:'flex',gap:48,flexShrink:0,flexWrap:'wrap'}}>
              {[['3.2x','ROI primer mes'],['30 seg','Corte de caja'],['~12%','Mejora de margen']].map(([v,l])=>(
                <div key={l} style={{textAlign:'center'}}><p style={{fontSize:36,fontWeight:700,color:'#c9963a',lineHeight:1,fontFamily:'monospace'}}>{v}</p><p style={{fontSize:11,color:'rgba(240,236,228,.6)',marginTop:4}}>{l}</p></div>
              ))}
            </div>
          </div></FadeUp>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="sec" style={{background:'#0d0f17'}}>
        <div className="wrap">
          <FadeUp><div style={{textAlign:'center',marginBottom:52}}>
            <div className="eyebrow" style={{justifyContent:'center',marginBottom:20}}>Qué tan rápido empiezas</div>
            <h2 className="serif" style={{fontSize:'clamp(30px,4vw,50px)',fontWeight:700,lineHeight:1.12}}>Configurado y operando<br/><em style={{color:'#c9963a'}}>el mismo día.</em></h2>
          </div></FadeUp>
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:20}} className="g3">
            {STEPS.map((s,i)=>(
              <FadeUp key={i} delay={i*.12}>
                <div style={{padding:'32px 28px',borderRadius:18,background:'rgba(255,255,255,.02)',border:'1px solid rgba(255,255,255,.07)',height:'100%'}}>
                  <div style={{width:40,height:40,borderRadius:'50%',background:'rgba(201,150,58,.1)',border:'1px solid rgba(201,150,58,.25)',display:'flex',alignItems:'center',justifyContent:'center',marginBottom:20,fontSize:14,fontWeight:700,color:'#c9963a'}}>{s.n}</div>
                  <h3 style={{fontSize:17,fontWeight:600,color:'#f0ece4',marginBottom:10}}>{s.t}</h3>
                  <p style={{fontSize:14,color:'rgba(240,236,228,.5)',lineHeight:1.7}}>{s.b}</p>
                </div>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* PLANS */}
      <section className="sec" id="planes" style={{background:'#07090f'}}>
        <div className="wrap">
          <FadeUp><div style={{textAlign:'center',marginBottom:52}}>
            <div className="eyebrow" style={{justifyContent:'center',marginBottom:20}}>{t.plansEyebrow}</div>
            <h2 className="serif" style={{fontSize:'clamp(32px,4.5vw,58px)',fontWeight:700,lineHeight:1.08,marginBottom:16}}>{t.plansH}<br/><em style={{color:'#c9963a'}}>{t.plansHEm}</em></h2>
            <p style={{fontSize:15,color:'rgba(240,236,228,.45)',maxWidth:460,margin:'0 auto 32px',lineHeight:1.75}}>Cuando tu restaurante crece, cambias de plan. No compras módulos uno por uno. Sin contratos. Cambia de plan cuando quieras.</p>
            <div style={{display:'inline-flex',alignItems:'center',gap:12,padding:'8px 18px',borderRadius:100,background:'rgba(255,255,255,.04)',border:'1px solid rgba(255,255,255,.08)'}}>
              <span style={{fontSize:13,color:annual?'rgba(240,236,228,.35)':'#f0ece4'}}>Mensual</span>
              <button onClick={()=>setAnnual(v=>!v)} style={{width:44,height:24,borderRadius:12,background:annual?'#c9963a':'rgba(255,255,255,.15)',border:'none',position:'relative',transition:'all .3s'}}>
                <span style={{position:'absolute',top:3,left:annual?23:3,width:18,height:18,borderRadius:'50%',background:'white',transition:'left .25s'}}/>
              </button>
              <span style={{fontSize:13,color:annual?'#f0ece4':'rgba(240,236,228,.35)'}}>Anual <span style={{color:'#c9963a',fontSize:11,fontWeight:700}}>−15%</span></span>
            </div>
          </div></FadeUp>
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:16,alignItems:'start'}} className="g3 plan-grid">
            {PLANS.map((plan,pi)=>{
              const fp=Math.round(plan.price*disc);
              return(
                <FadeUp key={plan.key} delay={pi*.1}>
                  <div className="pcard" style={{background:`linear-gradient(145deg,${plan.color}08,rgba(255,255,255,.02))`,border:`1px solid ${plan.color}25`,position:'relative'}}>
                      <div style={{fontSize:13,fontWeight:700,letterSpacing:'.08em',textTransform:'uppercase',color:plan.color,marginBottom:16}}>{plan.name}</div>
                    <div style={{marginBottom:4}}>
                      <span style={{fontSize:52,fontWeight:700,color:'#f0ece4',lineHeight:1,fontFamily:"'Playfair Display',serif"}}>${fp.toLocaleString('es-MX')}</span>
                      <span style={{fontSize:13,color:'rgba(240,236,228,.6)',marginLeft:6}}>/mes</span>
                    </div>
                    {annual&&<p style={{fontSize:11,color:'rgba(240,236,228,.5)',marginBottom:6}}>Antes ${plan.price.toLocaleString('es-MX')}/mes</p>}
                    <p className="serif" style={{fontSize:15,color:'rgba(240,236,228,.65)',fontStyle:'italic',marginBottom:8,lineHeight:1.4}}>{plan.tagline}</p>
                    <p style={{fontSize:12,color:'rgba(240,236,228,.4)',marginBottom:16,lineHeight:1.65}}>{plan.sub}</p>
                      <a href="/registro" style={{display:'block',padding:'12px',borderRadius:12,background:`${plan.color}18`,color:plan.color,fontSize:14,fontWeight:600,textAlign:'center',border:`1px solid ${plan.color}30`,marginBottom:28,transition:'all .2s'}} onMouseEnter={e=>(e.currentTarget.style.background=`${plan.color}30`)} onMouseLeave={e=>(e.currentTarget.style.background=`${plan.color}18`)}>
                      Empezar en {plan.name} →
                    </a>
                    <div style={{display:'flex',flexDirection:'column',gap:11}}>
                      {plan.features.map(([title,desc],fi)=>(
                        <div key={fi} style={{display:'flex',gap:10,alignItems:'flex-start'}}>
                          <span style={{color:plan.color,flexShrink:0,fontSize:12,marginTop:2,fontWeight:700}}>✓</span>
                          <div>
                            <span style={{fontSize:13,color:title.startsWith('Todo')?'rgba(240,236,228,.4)':'rgba(240,236,228,.8)',lineHeight:1.4,fontStyle:title.startsWith('Todo')?'italic':'normal'}}>{title}</span>
                            {desc&&<p style={{fontSize:11,color:'rgba(240,236,228,.55)',lineHeight:1.5,marginTop:2}}>{desc}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </FadeUp>
              );
            })}
          </div>
          <p style={{textAlign:'center',fontSize:12,color:'rgba(240,236,228,.2)',marginTop:28}}>Todos los precios en MXN · No incluyen IVA · Facturación electrónica CFDI disponible como complemento</p>
        </div>
      </section>

      {/* FINAL CTA */}
      <section style={{padding:'clamp(80px,10vw,130px) clamp(16px,5vw,60px)',textAlign:'center',position:'relative',overflow:'hidden',background:'#0d0f17'}}>
        <div style={{position:'absolute',inset:0,backgroundImage:'linear-gradient(rgba(201,150,58,.025) 1px,transparent 1px),linear-gradient(90deg,rgba(201,150,58,.025) 1px,transparent 1px)',backgroundSize:'80px 80px',pointerEvents:'none'}}/>
        <div style={{position:'absolute',top:'50%',left:'50%',transform:'translate(-50%,-50%)',width:800,height:500,background:'radial-gradient(ellipse,rgba(201,150,58,.08) 0%,transparent 65%)',pointerEvents:'none',animation:'pulse 4s ease-in-out infinite'}}/>
        <FadeUp><div style={{position:'relative',maxWidth:640,margin:'0 auto'}}>
          <div className="eyebrow" style={{justifyContent:'center',marginBottom:24}}>{t.ctaEyebrow}</div>
          <h2 className="serif" style={{fontSize:'clamp(40px,6vw,76px)',fontWeight:700,lineHeight:1.05,marginBottom:20}}>{t.ctaH}<br/><em style={{color:'#c9963a'}}>{t.ctaHEm}</em></h2>
          <p style={{fontSize:17,color:'rgba(240,236,228,.5)',marginBottom:44,lineHeight:1.75}}>14 días sin costo, sin tarjeta.<br/>El sistema queda configurado el mismo día.</p>
          <a href="/registro" className="pill gold" style={{fontSize:16,padding:'16px 40px'}}>{t.ctaBtn}</a>
        </div></FadeUp>
      </section>

      {/* FOOTER */}
      <footer style={{borderTop:'1px solid rgba(255,255,255,.05)',padding:'36px clamp(16px,5vw,60px)',background:'#07090f'}}>
        <div style={{maxWidth:1200,margin:'0 auto',display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:20}}>
          <div style={{fontFamily:"'Playfair Display',serif",fontSize:18,fontWeight:700,color:'#c9963a',letterSpacing:'.03em',display:'flex',alignItems:'center',gap:10}}>
            <img src="/assets/images/logo_aldente.png" alt="" style={{width:24,height:24,objectFit:'contain'}}/>Aldente
          </div>
          <div style={{display:'flex',gap:24,flexWrap:'wrap'}}>
            {[['soporte@aldente.app','mailto:soporte@aldente.app'],['Términos','#'],['Privacidad','#'],['Admin','/admin/login']].map(([l,h])=>(
              <a key={l} href={h} style={{fontSize:12,color:'rgba(240,236,228,.5)',transition:'color .2s'}} onMouseEnter={e=>(e.currentTarget.style.color='rgba(240,236,228,.7)')} onMouseLeave={e=>(e.currentTarget.style.color='rgba(240,236,228,.5)')}>{l}</a>
            ))}
          </div>
          <p style={{fontSize:11,color:'rgba(240,236,228,.18)'}}>{t.footerRights}</p>
        </div>
      </footer>
    </div>
  );
}
