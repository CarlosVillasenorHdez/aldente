'use client';
import React, { useState, useEffect, useRef, useCallback } from 'react';

// ─── Data ─────────────────────────────────────────────────────────────────────

const PAINS = [
  { n:'01', q:'¿Cuánto gané hoy de verdad?', body:'No el número de ventas. La utilidad real: con el costo de cada ingrediente que salió de la cocina, los gastos del día prorrateados y la merma de las cancelaciones. Ese número.', answer:'P&L del día en tiempo real. Automático.', color:'#c9963a' },
  { n:'02', q:'¿Por qué me falta mercancía si no vendí tanto?', body:'Porque cada platillo que sale descuenta los ingredientes exactos de su receta. Y cada cancelación registra lo que ya se consumió como merma con costo real. La diferencia te dice dónde está el problema.', answer:'Inventario vivo. Merma por ingrediente.', color:'#4a9eff' },
  { n:'03', q:'¿Puedo abrir otra sucursal sin perder el control?', body:'Cada sucursal opera de forma independiente — sus propias mesas, su propio menú, su equipo. Tú ves el consolidado desde un solo dashboard. La operación no se centraliza. La visibilidad sí.', answer:'Multi-sucursal con aislamiento real.', color:'#a78bfa' },
  { n:'04', q:'¿Sigues con papel y errores de comanda?', body:'La comanda va directo a cocina desde el celular del mesero. El cocinero ve el semáforo — verde, amarillo, rojo. El cajero cierra en 30 segundos. Sin papel, sin carreras, sin "no lo anoté".', answer:'POS + KDS + Mesero Móvil sincronizados.', color:'#34d399' },
];

const PLANS = [
  { key:'operacion', name:'Operación', price:699,
    tagline:'Ya no hay papel en tu restaurante.',
    sub:'Para el restaurante que da el primer paso digital serio.',
    color:'#4a9eff',
    features:[
      ['POS completo — mesas ilimitadas','Unión de mesas, pagos mixtos, descuentos, propinas'],
      ['Para llevar integrado','Flujo completo con nombre del cliente, sin mesa física'],
      ['Cocina digital KDS','Semáforo + aviso al mesero cuando el pedido está listo'],
      ['Mesero móvil sin app store','Se instala desde el navegador en 10 segundos'],
      ['Traslado entre mesas','Mueve una orden en 2 clics sin perder nada'],
      ['Cierre parcial de venta','Cobra algunos platillos sin cerrar la mesa'],
      ['Corte de caja completo','Mesa vs Para Llevar · Propinas · Movimientos extra'],
      ['Carta QR para clientes','Menú digital público — tu marca, sin costo extra'],
      ['Roles y acceso por PIN','Cada empleado entra directo a su herramienta'],
    ] },
  { key:'negocio', name:'Negocio', price:1299,
    tagline:'Ya sé exactamente qué pasa en mi restaurante.',
    sub:'Para el restaurante que opera bien y quiere entender su rentabilidad.',
    color:'#c9963a',
    features:[
      ['Todo lo de Operación',''],
      ['Inventario vivo por receta','Cada venta descuenta ingredientes automáticamente'],
      ['COGS real — no estimado','Costo por platillo calculado desde la receta exacta'],
      ['P&L por día, semana o mes','Gastos escalados al período. Sin sorpresas.'],
      ['Merma con costo y razón','Cada cancelación registra el costo del ingrediente'],
      ['Lista de compras inteligente','Predice cuántos días te queda cada ingrediente'],
      ['Análisis de menú (BCG)','Identifica tus platillos estrella, puzzles y burros'],
      ['Gastos y depreciaciones','Pagos recurrentes con alertas de vencimiento'],
      ['Programa de lealtad','Puntos, niveles y recompensas configurables'],
    ] },
  { key:'empresa', name:'Empresa', price:2199,
    tagline:'Ya puedo crecer sin perder el hilo.',
    sub:'Para cadenas y grupos que necesitan visión centralizada.',
    color:'#a78bfa',
    features:[
      ['Todo lo de Negocio',''],
      ['Multi-sucursal consolidado','Dashboard unificado. Mesas aisladas por sucursal'],
      ['Analytics comparativo','P&L por sucursal. Ranking de desempeño en paralelo'],
      ['Nómina LFT compliant','Art. 67/68/69/75. Horas extra calculadas y validadas'],
      ['Recursos humanos','Vacaciones, permisos, tiempos extra con factor 2x/3x'],
      ['Delivery integrado','Repartidores, ETA, estados e historial por sucursal'],
      ['Reportes ejecutivos','Por sucursal o consolidados, por cualquier período'],
    ] },
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

// ─── Anime.js loader ──────────────────────────────────────────────────────────

function useAnime() {
  const [anime, setAnime] = useState<any>(null);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if ((window as any).anime) { setAnime((window as any).anime); return; }
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/animejs/3.2.2/anime.min.js';
    script.onload = () => setAnime((window as any).anime);
    document.head.appendChild(script);
  }, []);
  return anime;
}

// ─── Animation hooks ───────────────────────────────────────────────────────────

function useInView(threshold = 0.12) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = React.useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setInView(true); obs.disconnect(); }
    }, { threshold });
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, inView };
}

function FadeUp({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const { ref, inView } = useInView(0.08);
  return (
    <div ref={ref} style={{
      opacity: inView ? 1 : 0,
      transform: inView ? 'translateY(0)' : 'translateY(36px)',
      transition: `opacity 0.8s ${delay}s cubic-bezier(0.16,1,0.3,1), transform 0.8s ${delay}s cubic-bezier(0.16,1,0.3,1)`,
    }}>
      {children}
    </div>
  );
}

function FadeIn({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const { ref, inView } = useInView(0.05);
  return (
    <div ref={ref} style={{
      opacity: inView ? 1 : 0,
      transition: `opacity 1s ${delay}s ease`,
    }}>
      {children}
    </div>
  );
}

function CountUp({ target, suffix, decimals = 0, active }: { target: number; suffix: string; decimals?: number; active: boolean }) {
  const [val, setVal] = React.useState(0);
  useEffect(() => {
    if (!active) return;
    let start: number | null = null;
    const duration = 2000;
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
  const MESAS = [
    {n:1,s:'ocupada',t:22,v:480,m:'Carlos'},{n:2,s:'libre',t:0,v:0,m:''},
    {n:3,s:'ocupada',t:8,v:210,m:'María'},{n:4,s:'ocupada',t:41,v:920,m:'Carlos'},
    {n:5,s:'libre',t:0,v:0,m:''},{n:6,s:'cuenta',t:65,v:1340,m:'Luis'},
  ];
  const CMDS = [
    {mesa:4,p:'Tacos de Res x3',min:18},{mesa:1,p:'Hamburguesa Aldente',min:9},
    {mesa:3,p:'Ensalada César',min:4},{mesa:6,p:'Café Americano x2',min:2},
  ];
  const sem = (m:number) => m>15?'#ef4444':m>8?'#f59e0b':'#22c55e';
  const changeTab = (k: typeof tab) => {
    if (k===tab) return;
    setFade(false);
    setTimeout(() => { setTab(k); setFade(true); }, 170);
  };
  return (
    <div style={{background:'#0a1628',border:'1px solid rgba(255,255,255,.08)',borderRadius:20,overflow:'hidden'}}>
      <div style={{display:'flex',borderBottom:'1px solid rgba(255,255,255,.06)',padding:'0 20px',background:'rgba(255,255,255,.01)'}}>
        {(['pos','kds','pl'] as const).map((k,i)=>(
          <button key={k} onClick={()=>changeTab(k)} style={{padding:'14px 20px',fontSize:13,fontWeight:tab===k?600:400,color:tab===k?'#c9963a':'rgba(255,255,255,.4)',background:'none',border:'none',borderBottom:tab===k?'2px solid #c9963a':'2px solid transparent',cursor:'pointer',transition:'all .2s'}}>
            {['Mapa de mesas','Cocina (KDS)','P&L del día'][i]}
          </button>
        ))}
        <div style={{marginLeft:'auto',display:'flex',alignItems:'center',gap:6,padding:'0 8px'}}>
          <div style={{width:6,height:6,borderRadius:'50%',background:'#22c55e',boxShadow:'0 0 8px #22c55e60'}}/>
          <span style={{fontSize:11,color:'rgba(255,255,255,.3)'}}>En vivo</span>
          <div style={{width:8,height:8,borderRadius:'50%',background:'#22c55e',animation:'pulse 2s ease-in-out infinite',marginLeft:4}}/>
        </div>
      </div>
      <div style={{padding:20,minHeight:300,opacity:fade?1:0,transform:fade?'translateY(0)':'translateY(6px)',transition:'opacity .17s,transform .17s'}}>
        {tab==='pos'&&(
          <div>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:16}}>
              <span style={{fontSize:12,color:'rgba(255,255,255,.4)'}}>Restaurante El Güero · Turno noche</span>
              <span style={{fontSize:12,color:'#c9963a',fontWeight:600}}>$2,950 acumulado</span>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10}}>
              {MESAS.map(m=>(
                <div key={m.n} style={{padding:'14px 16px',borderRadius:12,background:m.s==='libre'?'rgba(255,255,255,.03)':m.s==='cuenta'?'rgba(201,150,58,.1)':'rgba(34,197,94,.08)',border:`1px solid ${m.s==='libre'?'rgba(255,255,255,.07)':m.s==='cuenta'?'rgba(201,150,58,.3)':'rgba(34,197,94,.2)'}`,transition:'all .2s'}}>
                  <div style={{display:'flex',justifyContent:'space-between',marginBottom:6}}>
                    <span style={{fontSize:15,fontWeight:700,color:'#f1f5f9'}}>Mesa {m.n}</span>
                    {m.s!=='libre'&&<span style={{fontSize:10,color:'rgba(255,255,255,.35)'}}>{m.t}m</span>}
                  </div>
                  {m.s==='libre'?<span style={{fontSize:11,color:'rgba(255,255,255,.25)'}}>Libre</span>:<>
                    <span style={{fontSize:16,fontWeight:700,color:m.s==='cuenta'?'#c9963a':'#f1f5f9'}}>${m.v.toLocaleString('es-MX')}</span>
                    <div style={{fontSize:10,color:'rgba(255,255,255,.3)',marginTop:4}}>{m.m}</div>
                  </>}
                </div>
              ))}
            </div>
          </div>
        )}
        {tab==='kds'&&(
          <div>
            <div style={{display:'flex',gap:16,marginBottom:16}}>
              {[['#22c55e','< 8 min'],['#f59e0b','8–15 min'],['#ef4444','> 15 min']].map(([c,l])=>(
                <div key={l} style={{display:'flex',alignItems:'center',gap:6,fontSize:12,color:'rgba(255,255,255,.45)'}}>
                  <div style={{width:8,height:8,borderRadius:'50%',background:c as string}}/>{l}
                </div>
              ))}
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:8}}>
              {CMDS.map((c,i)=>(
                <div key={i} style={{display:'flex',alignItems:'center',gap:14,padding:'12px 16px',borderRadius:10,background:'rgba(255,255,255,.03)',border:'1px solid rgba(255,255,255,.07)'}}>
                  <div style={{width:10,height:10,borderRadius:'50%',background:sem(c.min),boxShadow:`0 0 10px ${sem(c.min)}80`}}/>
                  <span style={{fontSize:13,color:'rgba(255,255,255,.5)',width:56}}>Mesa {c.mesa}</span>
                  <span style={{fontSize:14,fontWeight:500,color:'#f1f5f9',flex:1}}>{c.p}</span>
                  <span style={{fontSize:13,color:sem(c.min),fontWeight:600,fontFamily:'monospace'}}>{c.min} min</span>
                </div>
              ))}
            </div>
          </div>
        )}
        {tab==='pl'&&(
          <div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10,marginBottom:16}}>
              {[{l:'Ventas del día',v:'$14,280',c:'#f1f5f9',bg:'rgba(255,255,255,.04)'},{l:'COGS (ingredientes)',v:'−$4,712',c:'#f87171',bg:'rgba(239,68,68,.06)'},{l:'Utilidad bruta',v:'$9,568',c:'#4ade80',bg:'rgba(74,222,128,.07)'}].map(k=>(
                <div key={k.l} style={{padding:14,borderRadius:10,background:k.bg,border:'1px solid rgba(255,255,255,.06)'}}>
                  <p style={{fontSize:10,color:'rgba(255,255,255,.35)',marginBottom:6,letterSpacing:'.06em'}}>{k.l}</p>
                  <p style={{fontSize:20,fontWeight:700,color:k.c,fontFamily:'monospace'}}>{k.v}</p>
                </div>
              ))}
            </div>
            <div style={{background:'rgba(255,255,255,.03)',borderRadius:10,padding:'14px 16px',border:'1px solid rgba(255,255,255,.06)'}}>
              {[['Gastos (prorrateados)','−$2,340'],['Merma registrada','−$380'],['Nómina del turno','−$1,200']].map(([l,v])=>(
                <div key={l} style={{display:'flex',justifyContent:'space-between',padding:'6px 0'}}>
                  <span style={{fontSize:13,color:'rgba(255,255,255,.45)'}}>{l}</span>
                  <span style={{fontSize:13,color:'#f87171',fontFamily:'monospace'}}>{v}</span>
                </div>
              ))}
              <div style={{borderTop:'1px solid rgba(255,255,255,.08)',paddingTop:8,marginTop:4,display:'flex',justifyContent:'space-between'}}>
                <span style={{fontSize:14,fontWeight:600,color:'#f1f5f9'}}>Utilidad neta estimada</span>
                <span style={{fontSize:16,fontWeight:700,color:'#4ade80',fontFamily:'monospace'}}>$5,648</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function MarketingPage() {
  const [activePain, setActivePain] = useState(0);
  const [annual, setAnnual] = useState(false);
  const [navScrolled, setNavScrolled] = useState(false);
  const statsRef = useRef<HTMLDivElement>(null);
  const [statsVisible, setStatsVisible] = useState(false);
  const heroRef = useRef<HTMLDivElement>(null);
  const svgLineRef = useRef<SVGPathElement>(null);
  const pain = PAINS[activePain];
  const disc = annual ? 0.85 : 1;
  const anime = useAnime();

  // Pain auto-cycle
  useEffect(() => {
    const t = setInterval(() => setActivePain(p => (p+1)%PAINS.length), 4500);
    return () => clearInterval(t);
  }, []);

  // Nav scroll shadow
  useEffect(() => {
    const f = () => setNavScrolled(window.scrollY > 20);
    window.addEventListener('scroll', f, {passive:true});
    return () => window.removeEventListener('scroll', f);
  }, []);

  // Stats visibility
  useEffect(() => {
    const el = statsRef.current; if (!el) return;
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setStatsVisible(true); obs.disconnect(); }
    }, { threshold: 0.3 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // Anime.js: hero words stagger entrance
  useEffect(() => {
    if (!anime) return;
    const words = document.querySelectorAll('.hero-word');
    if (!words.length) return;
    anime({
      targets: words,
      opacity: [0, 1],
      translateY: [24, 0],
      skewY: [3, 0],
      delay: anime.stagger(80, { start: 300 }),
      duration: 900,
      easing: 'cubicBezier(0.16, 1, 0.3, 1)',
    });
  }, [anime]);

  // Anime.js: SVG hero line draw on mount
  useEffect(() => {
    if (!anime || !svgLineRef.current) return;
    const path = svgLineRef.current;
    const len = path.getTotalLength?.() || 800;
    path.style.strokeDasharray = String(len);
    path.style.strokeDashoffset = String(len);
    anime({
      targets: path,
      strokeDashoffset: [len, 0],
      duration: 2200,
      delay: 600,
      easing: 'cubicBezier(0.16, 1, 0.3, 1)',
    });
  }, [anime]);

  // Anime.js: pricing cards spring stagger on scroll into view
  const pricingRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!anime || !pricingRef.current) return;
    const obs = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      obs.disconnect();
      const cards = pricingRef.current?.querySelectorAll('.pcard');
      if (!cards?.length) return;
      anime({
        targets: cards,
        opacity: [0, 1],
        translateY: [48, 0],
        scale: [0.95, 1],
        delay: anime.stagger(120),
        duration: 800,
        easing: 'cubicBezier(0.34, 1.56, 0.64, 1)',
      });
    }, { threshold: 0.15 });
    obs.observe(pricingRef.current);
    return () => obs.disconnect();
  }, [anime]);

  // Anime.js: diff rows sequential reveal
  const diffsRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!anime || !diffsRef.current) return;
    const obs = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      obs.disconnect();
      const rows = diffsRef.current?.querySelectorAll('.diff-row');
      if (!rows?.length) return;
      anime({
        targets: rows,
        opacity: [0, 1],
        translateX: [-20, 0],
        delay: anime.stagger(90),
        duration: 600,
        easing: 'cubicBezier(0.16, 1, 0.3, 1)',
      });
    }, { threshold: 0.1 });
    obs.observe(diffsRef.current);
    return () => obs.disconnect();
  }, [anime]);

  // Anime.js: step cards spring on scroll
  const stepsRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!anime || !stepsRef.current) return;
    const obs = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      obs.disconnect();
      const cards = stepsRef.current?.querySelectorAll('.step-card');
      if (!cards?.length) return;
      anime({
        targets: cards,
        opacity: [0, 1],
        translateY: [36, 0],
        delay: anime.stagger(150),
        duration: 700,
        easing: 'cubicBezier(0.34, 1.56, 0.64, 1)',
      });
    }, { threshold: 0.2 });
    obs.observe(stepsRef.current);
    return () => obs.disconnect();
  }, [anime]);

  // Anime.js: CTA particle dots floating
  useEffect(() => {
    if (!anime) return;
    const dots = document.querySelectorAll('.cta-dot');
    if (!dots.length) return;
    anime({
      targets: dots,
      opacity: [0, 0.6, 0],
      scale: [0.5, 1.5, 0.5],
      delay: anime.stagger(200, { grid: [6, 4], from: 'center' }),
      duration: 3000,
      loop: true,
      easing: 'easeInOutSine',
    });
  }, [anime]);

  return (
    <div style={{background:'#07090f',color:'#f0ece4',fontFamily:"'Outfit',system-ui,sans-serif",overflowX:'hidden'}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400;1,700&family=Outfit:wght@300;400;500;600;700&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        html{scroll-behavior:smooth}a{text-decoration:none;color:inherit}button{cursor:pointer;font-family:inherit}

        @keyframes run{to{transform:translateX(-50%)}}
        @keyframes pulse{0%,100%{opacity:.06}50%{opacity:.13}}
        @keyframes float{0%,100%{transform:translateY(0) rotate(0deg)}50%{transform:translateY(-16px) rotate(2deg)}}
        @keyframes float2{0%,100%{transform:translateY(0) rotate(0deg)}50%{transform:translateY(-10px) rotate(-1.5deg)}}
        @keyframes tick-in{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        @keyframes draw{from{stroke-dashoffset:1000}to{stroke-dashoffset:0}}
        @keyframes shimmer{0%{background-position:-200% center}100%{background-position:200% center}}
        @keyframes glow-pulse{0%,100%{box-shadow:0 0 20px rgba(201,150,58,.15)}50%{box-shadow:0 0 40px rgba(201,150,58,.35)}}
        @keyframes orbit{from{transform:rotate(0deg) translateX(120px) rotate(0deg)}to{transform:rotate(360deg) translateX(120px) rotate(-360deg)}}
        @keyframes orbit2{from{transform:rotate(180deg) translateX(80px) rotate(-180deg)}to{transform:rotate(540deg) translateX(80px) rotate(-540deg)}}
        @keyframes morph{0%,100%{border-radius:60% 40% 30% 70% / 60% 30% 70% 40%}50%{border-radius:30% 60% 70% 40% / 50% 60% 30% 60%}}
        @keyframes scan{0%{top:0;opacity:.8}100%{top:100%;opacity:0}}
        @keyframes blink{0%,100%{opacity:1}50%{opacity:0}}
        @keyframes slide-in-left{from{opacity:0;transform:translateX(-24px)}to{opacity:1;transform:translateX(0)}}
        @keyframes scale-in{from{opacity:0;transform:scale(.88)}to{opacity:1;transform:scale(1)}}
        @keyframes border-spin{to{--angle:360deg}}

        .serif{font-family:'Playfair Display',Georgia,serif}
        .nav{position:fixed;top:0;left:0;right:0;z-index:200;height:60px;display:flex;align-items:center;padding:0 clamp(16px,5vw,60px);backdrop-filter:blur(24px);transition:background .4s,border-color .4s,box-shadow .4s;border-bottom:1px solid transparent}
        .nav.s{background:rgba(7,9,15,.96);border-bottom-color:rgba(255,255,255,.05);box-shadow:0 4px 40px rgba(0,0,0,.5)}
        .wrap{max-width:1200px;margin:0 auto;padding:0 clamp(16px,5vw,60px)}
        .sec{padding:clamp(72px,9vw,120px) clamp(16px,5vw,60px)}
        .eyebrow{font-size:10px;font-weight:700;letter-spacing:.15em;text-transform:uppercase;color:#c9963a;display:flex;align-items:center;gap:12px}
        .eyebrow::before,.eyebrow::after{content:'';width:24px;height:1px;background:rgba(201,150,58,.35)}
        .pill{display:inline-flex;align-items:center;padding:10px 24px;border-radius:100px;font-size:13px;font-weight:600;transition:all .25s;font-family:'Outfit',sans-serif}
        .gold{background:#c9963a;color:#07090f;border:none}.gold:hover{background:#dba84a;transform:translateY(-2px);box-shadow:0 12px 36px rgba(201,150,58,.4)}
        .ghost{background:transparent;color:rgba(240,236,228,.6);border:1px solid rgba(255,255,255,.12)}.ghost:hover{border-color:rgba(255,255,255,.35);color:#f0ece4;transform:translateY(-1px)}
        .pcard{border-radius:22px;padding:36px 30px;transition:transform .5s cubic-bezier(.34,1.56,.64,1),box-shadow .5s,border-color .3s}.pcard:hover{transform:translateY(-14px) scale(1.01);box-shadow:0 36px 80px rgba(0,0,0,.55)}
        .pain-btn{transition:all .35s cubic-bezier(.22,1,.36,1)}.pain-btn:hover{transform:translateX(7px)}
        .diff-row{transition:all .3s cubic-bezier(.22,1,.36,1)}.diff-row:hover{transform:scaleX(1.01);background:rgba(255,255,255,.03)}
        .step-card{transition:all .45s cubic-bezier(.34,1.56,.64,1)}.step-card:hover{transform:translateY(-8px) scale(1.025);box-shadow:0 24px 56px rgba(0,0,0,.45)}
        .feat-check{transition:transform .25s cubic-bezier(.34,1.56,.64,1)}.feat-check:hover{transform:scale(1.2) rotate(5deg)}
        .shimmer-text{background:linear-gradient(90deg,#c9963a 0%,#f0d070 40%,#c9963a 80%);background-size:200% auto;-webkit-background-clip:text;-webkit-text-fill-color:transparent;animation:shimmer 3s linear infinite}
        .plan-cta{position:relative;overflow:hidden}.plan-cta::after{content:'';position:absolute;inset:0;background:linear-gradient(90deg,transparent 0%,rgba(255,255,255,.08) 50%,transparent 100%);transform:translateX(-100%);transition:transform .6s}.plan-cta:hover::after{transform:translateX(100%)}
        .nav-link{position:relative}.nav-link::after{content:'';position:absolute;bottom:-4px;left:0;width:0;height:1px;background:#c9963a;transition:width .25s ease}.nav-link:hover::after{width:100%}
        .hero-word{display:inline-block;opacity:0;transform:translateY(20px) skewY(2deg)}
        .stat-num{font-variant-numeric:tabular-nums}
        @media(max-width:900px){.hnav{display:none!important}.g3{grid-template-columns:1fr!important}.g2{grid-template-columns:1fr!important}.hcols{flex-direction:column!important}}
      `}</style>

      {/* NAV */}
      <nav className={`nav${navScrolled?' s':''}`}>
        <div style={{width:'100%',maxWidth:1200,margin:'0 auto',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <div style={{fontFamily:"'Playfair Display',serif",fontSize:20,fontWeight:700,color:'#c9963a',letterSpacing:'.03em',display:'flex',alignItems:'center',gap:10}}>
            <img src="/assets/images/logo_aldente.png" alt="" style={{width:28,height:28,objectFit:'contain'}}/>Aldente
          </div>
          <div className="hnav" style={{display:'flex',alignItems:'center',gap:28}}>
            {[['#problema','El problema'],['#diferencia','Por qué nosotros'],['#demo','Demo'],['#planes','Planes'],['/funcionalidades','Funcionalidades']].map(([h,l])=>(
              <a key={l} href={h} className="nav-link" style={{fontSize:13,color:'rgba(240,236,228,.5)',transition:'color .2s'}} onMouseEnter={e=>(e.currentTarget.style.color='#f0ece4')} onMouseLeave={e=>(e.currentTarget.style.color='rgba(240,236,228,.5)')}>{l}</a>
            ))}
            <a href="/login" style={{fontSize:13,fontWeight:500,color:'rgba(240,236,228,.75)',padding:'8px 18px',borderRadius:100,border:'1px solid rgba(240,236,228,.2)',transition:'all .2s'}} onMouseEnter={e=>{e.currentTarget.style.color='#f0ece4';e.currentTarget.style.borderColor='rgba(240,236,228,.5)';}} onMouseLeave={e=>{e.currentTarget.style.color='rgba(240,236,228,.75)';e.currentTarget.style.borderColor='rgba(240,236,228,.2)';}}>
              Iniciar sesión
            </a>
            <a href="/registro" className="pill gold" style={{fontSize:13,animation:'glow-pulse 3s ease-in-out infinite'}}>14 días gratis →</a>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section style={{paddingTop:60,minHeight:'100vh',display:'flex',flexDirection:'column',justifyContent:'center',position:'relative',overflow:'hidden'}}>
        {/* Grid */}
        <div style={{position:'absolute',inset:0,backgroundImage:'linear-gradient(rgba(201,150,58,.022) 1px,transparent 1px),linear-gradient(90deg,rgba(201,150,58,.022) 1px,transparent 1px)',backgroundSize:'80px 80px',pointerEvents:'none'}}/>
        {/* Ambient glow */}
        <div style={{position:'absolute',top:'25%',left:'50%',transform:'translate(-50%,-50%)',width:1100,height:800,background:'radial-gradient(ellipse,rgba(201,150,58,.1) 0%,transparent 65%)',pointerEvents:'none',animation:'pulse 6s ease-in-out infinite'}}/>
        {/* Floating shapes */}
        <div style={{position:'absolute',top:'15%',right:'7%',width:130,height:130,borderRadius:'50%',border:'1px solid rgba(201,150,58,.12)',animation:'float 8s ease-in-out infinite',pointerEvents:'none'}}/>
        <div style={{position:'absolute',top:'16%',right:'7.5%',width:110,height:110,borderRadius:'50%',border:'1px solid rgba(201,150,58,.06)',animation:'float 8s ease-in-out infinite .3s',pointerEvents:'none'}}/>
        <div style={{position:'absolute',bottom:'20%',left:'5%',width:70,height:70,borderRadius:'50%',border:'1px solid rgba(74,158,255,.12)',animation:'float2 10s ease-in-out infinite .8s',pointerEvents:'none'}}/>
        <div style={{position:'absolute',top:'62%',right:'12%',width:36,height:36,borderRadius:'50%',background:'rgba(201,150,58,.08)',animation:'float2 7s ease-in-out infinite 1.5s',pointerEvents:'none'}}/>
        <div style={{position:'absolute',top:'40%',left:'3%',width:20,height:20,borderRadius:'50%',background:'rgba(167,139,250,.1)',animation:'float 9s ease-in-out infinite 2s',pointerEvents:'none'}}/>

        <div className="wrap" style={{position:'relative',zIndex:1,paddingTop:'clamp(60px,10vw,120px)',paddingBottom:'clamp(60px,10vw,120px)',textAlign:'center'}}>
          <div className="eyebrow" style={{justifyContent:'center',marginBottom:28,opacity:0,animation:'tick-in .6s .15s ease both'}}>
            Sistema de gestión para restaurantes · México
          </div>
          <h1 className="serif" style={{fontSize:'clamp(44px,7.5vw,96px)',fontWeight:700,lineHeight:1.02,marginBottom:24,opacity:0,animation:'tick-in .8s .25s cubic-bezier(0.16,1,0.3,1) both'}}>
            Por primera vez,<br/>
            <em className="shimmer-text" style={{fontStyle:'italic'}}>sabes exactamente</em><br/>
            qué pasa en tu restaurante.
          </h1>
          <p style={{fontSize:'clamp(15px,2vw,19px)',fontWeight:300,color:'rgba(240,236,228,.6)',maxWidth:520,margin:'0 auto 20px',lineHeight:1.75,opacity:0,animation:'tick-in .7s .38s ease both'}}>
            Sin esperar el corte. Sin llamar al cajero.<br/>Sin adivinar si te quedaste sin un ingrediente clave.
          </p>
          {/* Pain ticker */}
          <div style={{marginBottom:40,opacity:0,animation:'tick-in .7s .5s ease both'}}>
            <div style={{display:'inline-flex',alignItems:'center',gap:10,padding:'10px 18px 10px 14px',borderRadius:100,background:'rgba(255,255,255,.04)',border:'1px solid rgba(255,255,255,.08)',transition:'all .5s'}}>
              <div style={{width:24,height:24,borderRadius:'50%',background:`${pain.color}20`,border:`1px solid ${pain.color}40`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:700,color:pain.color,flexShrink:0,transition:'all .5s'}}>?</div>
              <span key={activePain} style={{fontSize:13,color:'rgba(240,236,228,.65)',animation:'tick-in .3s ease both'}}>{pain.q.replace(/[¿?]/g,'')}</span>
              <span style={{fontSize:10,fontWeight:700,color:pain.color,padding:'2px 8px',background:`${pain.color}15`,borderRadius:100,letterSpacing:'.05em',flexShrink:0,transition:'all .5s'}}>RESUELTA</span>
            </div>
          </div>
          <div style={{display:'flex',gap:12,justifyContent:'center',flexWrap:'wrap',marginBottom:48,opacity:0,animation:'tick-in .7s .62s ease both'}}>
            <a href="/registro" className="pill gold" style={{fontSize:15,padding:'13px 32px'}}>Probar 14 días gratis →</a>
            <a href="#demo" className="pill ghost" style={{fontSize:15,padding:'13px 28px'}}>Ver demo</a>
          </div>
          <div style={{display:'flex',gap:24,justifyContent:'center',flexWrap:'wrap',opacity:0,animation:'tick-in .7s .74s ease both'}}>
            {['Sin tarjeta de crédito','14 días gratis','Cancela cuando quieras','Soporte en español'].map(s=>(
              <span key={s} style={{fontSize:12,color:'rgba(240,236,228,.65)',display:'flex',alignItems:'center',gap:6}}>
                <span style={{color:'#c9963a',fontSize:10}}>✓</span> {s}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* MARQUEE */}
      <div style={{borderTop:'1px solid rgba(255,255,255,.05)',borderBottom:'1px solid rgba(255,255,255,.05)',padding:'12px 0',overflow:'hidden',background:'rgba(255,255,255,.015)'}}>
        <div style={{display:'flex',animation:'run 44s linear infinite',whiteSpace:'nowrap'}}>
          {[...Array(2)].map((_,r)=>
            ['POS mapa de mesas','KDS semáforo','Mesero móvil sin app store','P&L en tiempo real','Merma real por ingrediente','Inventario vivo','Gastos y depreciaciones','Nómina LFT Art.67/68/69','Reservaciones','Multi-sucursal','Lealtad','Carta QR','Aviso mesero listo','BCG Matrix menú','Cierre parcial','Traslado entre mesas'].map((item,i)=>(
              <span key={`${r}-${i}`} style={{fontSize:11,color:'rgba(240,236,228,.55)',padding:'0 28px',letterSpacing:'.06em'}}>{item}<span style={{color:'rgba(201,150,58,.4)',marginLeft:28}}>·</span></span>
            ))
          )}
        </div>
      </div>

      {/* STATS */}
      <div ref={statsRef} style={{background:'#0d0f17',borderTop:'1px solid rgba(255,255,255,.04)',borderBottom:'1px solid rgba(255,255,255,.04)',padding:'clamp(48px,7vw,96px) clamp(16px,5vw,60px)'}}>
        <div style={{maxWidth:1200,margin:'0 auto',display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:48,textAlign:'center'}} className="g3">
          {[
            {target:30,suffix:' seg',label:'para cerrar un corte de caja',decimals:0},
            {target:3.2,suffix:'x',label:'ROI en el primer mes',decimals:1},
            {target:12,suffix:'%',label:'de mejora de margen promedio',decimals:0},
          ].map((s,i)=>(
            <div key={i} style={{opacity:statsVisible?1:0,transform:statsVisible?'translateY(0)':'translateY(28px)',transition:`opacity .7s ${i*.18}s ease, transform .7s ${i*.18}s cubic-bezier(0.16,1,0.3,1)`}}>
              <p style={{fontSize:'clamp(36px,5vw,64px)',fontWeight:700,color:'#c9963a',lineHeight:1,fontFamily:'monospace',letterSpacing:'-.02em'}}>
                <CountUp target={s.target} suffix={s.suffix} decimals={s.decimals} active={statsVisible}/>
              </p>
              <p style={{fontSize:13,color:'rgba(240,236,228,.45)',marginTop:10,lineHeight:1.55}}>{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* PROBLEM */}
      <section className="sec" id="problema" style={{background:'#07090f'}}>
        <div className="wrap">
          <div style={{display:'flex',gap:80,alignItems:'flex-start',flexWrap:'wrap'}} className="hcols">
            <FadeUp>
              <div style={{flex:'0 0 340px',maxWidth:340}}>
                <div className="eyebrow" style={{marginBottom:24}}>El problema real</div>
                <h2 className="serif" style={{fontSize:'clamp(32px,4vw,50px)',fontWeight:700,lineHeight:1.1,marginBottom:20}}>
                  No importa el tamaño.<br/><em style={{color:'#c9963a'}}>Las preguntas son las mismas.</em>
                </h2>
                <p style={{fontSize:15,color:'rgba(240,236,228,.5)',lineHeight:1.8,marginBottom:32}}>
                  4 mesas o 40. Tacos o mariscos. Familiar o cadena. Cada dueño de restaurante se va a dormir con las mismas preguntas sin respuesta.
                </p>
                <div style={{display:'flex',flexDirection:'column',gap:6}}>
                  {PAINS.map((p,i)=>(
                    <button key={i} onClick={()=>setActivePain(i)} className="pain-btn"
                      style={{display:'flex',alignItems:'center',gap:12,padding:'10px 14px',borderRadius:10,background:activePain===i?`${p.color}10`:'transparent',border:`1px solid ${activePain===i?p.color+'35':'rgba(255,255,255,.06)'}`,textAlign:'left'}}>
                      <span style={{fontFamily:'monospace',fontSize:10,color:activePain===i?p.color:'rgba(240,236,228,.25)',fontWeight:600}}>{p.n}</span>
                      <span style={{fontSize:13,color:activePain===i?'#f0ece4':'rgba(240,236,228,.45)'}}>{p.q.replace(/[¿?]/g,'').trim()}</span>
                    </button>
                  ))}
                </div>
              </div>
            </FadeUp>
            <FadeUp delay={0.15}>
              <div style={{flex:1,minWidth:280}}>
                <div style={{padding:'40px 44px',borderRadius:24,background:`linear-gradient(135deg,${pain.color}09,rgba(255,255,255,.02))`,border:`1px solid ${pain.color}35`,transition:'all .6s cubic-bezier(.22,1,.36,1)',minHeight:300,boxShadow:`0 0 60px ${pain.color}09`}}>
                  <div style={{fontSize:56,fontFamily:'Playfair Display,serif',fontWeight:700,color:pain.color,lineHeight:1,marginBottom:20,opacity:.4}}>"</div>
                  <h3 key={activePain} className="serif" style={{fontSize:'clamp(22px,3vw,34px)',fontWeight:700,color:'#f0ece4',lineHeight:1.2,marginBottom:20,fontStyle:'italic',animation:'tick-in .35s ease both'}}>{pain.q}</h3>
                  <p style={{fontSize:15,color:'rgba(240,236,228,.55)',lineHeight:1.8,marginBottom:28,transition:'all .4s'}}>{pain.body}</p>
                  <div style={{display:'inline-flex',alignItems:'center',gap:10,padding:'10px 18px',borderRadius:10,background:`${pain.color}12`,border:`1px solid ${pain.color}30`,transition:'all .5s'}}>
                    <span style={{fontSize:10,fontWeight:700,letterSpacing:'.1em',textTransform:'uppercase',color:pain.color}}>Solución Aldente</span>
                    <span style={{fontSize:13,color:'#f0ece4',fontWeight:500}}>{pain.answer}</span>
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
          <FadeUp>
            <div style={{textAlign:'center',marginBottom:56}}>
              <div className="eyebrow" style={{justifyContent:'center',marginBottom:20}}>Ve cómo funciona</div>
              <h2 className="serif" style={{fontSize:'clamp(30px,4.5vw,54px)',fontWeight:700,lineHeight:1.12}}>
                Mesas, cocina y P&L<br/><em style={{color:'#c9963a'}}>en una sola plataforma.</em>
              </h2>
            </div>
          </FadeUp>
          <FadeUp delay={0.1}><LiveDemo/></FadeUp>
          <p style={{textAlign:'center',fontSize:12,color:'rgba(240,236,228,.2)',marginTop:20}}>Vista de demostración · La interfaz real se adapta a tu restaurante</p>
        </div>
      </section>

      {/* DIFFERENCES */}
      <section className="sec" id="diferencia" style={{background:'#07090f'}}>
        <div className="wrap">
          <FadeUp>
            <div style={{maxWidth:600,marginBottom:64}}>
              <div className="eyebrow" style={{marginBottom:20}}>Por qué Aldente</div>
              <h2 className="serif" style={{fontSize:'clamp(32px,4.5vw,54px)',fontWeight:700,lineHeight:1.1,marginBottom:20}}>
                La diferencia está en<br/><em style={{color:'#c9963a'}}>lo que nadie más mide.</em>
              </h2>
              <p style={{fontSize:15,color:'rgba(240,236,228,.5)',lineHeight:1.75}}>Otros sistemas te dan un POS y un reporte. Aldente te dice cuánto ganaste, por qué falta mercancía y dónde se va el dinero.</p>
            </div>
          </FadeUp>
          <div ref={diffsRef} style={{display:'flex',flexDirection:'column',gap:2}}>
            <div style={{display:'grid',gridTemplateColumns:'100px 1fr 1fr',gap:2,marginBottom:6}}>
              <div/><div style={{padding:'8px 20px',fontSize:10,fontWeight:700,letterSpacing:'.1em',textTransform:'uppercase',color:'rgba(240,236,228,.45)'}}>Otros sistemas</div>
              <div style={{padding:'8px 20px',fontSize:10,fontWeight:700,letterSpacing:'.1em',textTransform:'uppercase',color:'#c9963a'}}>Aldente</div>
            </div>
            {DIFFS.map((d,i)=>(
              <FadeUp key={i} delay={i*.07}>
                <div className="diff-row" style={{display:'grid',gridTemplateColumns:'100px 1fr 1fr',gap:2}}>
                  <div style={{padding:'18px 16px',display:'flex',alignItems:'center',borderRadius:'10px 0 0 10px',background:'rgba(255,255,255,.02)',borderRight:'1px solid rgba(255,255,255,.04)'}}>
                    <span style={{fontSize:10,fontWeight:700,color:'rgba(240,236,228,.55)',letterSpacing:'.08em',textTransform:'uppercase'}}>{d.label}</span>
                  </div>
                  <div style={{padding:'18px 22px',background:'rgba(255,255,255,.018)',display:'flex',alignItems:'center',gap:10}}>
                    <span style={{color:'rgba(239,68,68,.5)',fontSize:13,flexShrink:0}}>✗</span>
                    <p style={{fontSize:13,color:'rgba(240,236,228,.4)',lineHeight:1.65}}>{d.them}</p>
                  </div>
                  <div style={{padding:'18px 22px',background:'rgba(201,150,58,.04)',borderRadius:'0 10px 10px 0',border:'1px solid rgba(201,150,58,.1)',display:'flex',alignItems:'center',gap:10}}>
                    <span style={{color:'#c9963a',fontSize:13,flexShrink:0}}>✓</span>
                    <p style={{fontSize:13,color:'rgba(240,236,228,.8)',lineHeight:1.65}}>{d.us}</p>
                  </div>
                </div>
              </FadeUp>
            ))}
          </div>
          <FadeUp delay={0.2}>
            <div style={{marginTop:48,padding:'36px 44px',borderRadius:20,background:'rgba(201,150,58,.05)',border:'1px solid rgba(201,150,58,.18)',display:'flex',gap:48,alignItems:'center',flexWrap:'wrap'}}>
              <div style={{flex:1,minWidth:240}}>
                <p className="serif" style={{fontSize:'clamp(18px,2.5vw,26px)',color:'#f0ece4',lineHeight:1.4,marginBottom:12,fontStyle:'italic'}}>"Evitar 2 mermas al día paga el sistema 3 veces al mes."</p>
                <p style={{fontSize:13,color:'rgba(240,236,228,.4)',lineHeight:1.7}}>Si cada platillo tiene $80 de costo y registras 2 mermas diarias evitables, son $4,800 mensuales. El plan Negocio cuesta $1,299.</p>
              </div>
              <div style={{display:'flex',gap:48,flexShrink:0,flexWrap:'wrap'}}>
                {[['3.2x','ROI primer mes'],['30 seg','Corte de caja'],['~12%','Mejora de margen']].map(([v,l])=>(
                  <div key={l} style={{textAlign:'center'}}>
                    <p className='stat-num' style={{fontSize:36,fontWeight:700,color:'#c9963a',lineHeight:1,fontFamily:'monospace'}}>{v}</p>
                    <p style={{fontSize:11,color:'rgba(240,236,228,.55)',marginTop:4}}>{l}</p>
                  </div>
                ))}
              </div>
            </div>
          </FadeUp>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="sec" style={{background:'#0d0f17'}}>
        <div className="wrap">
          <FadeUp>
            <div style={{textAlign:'center',marginBottom:52}}>
              <div className="eyebrow" style={{justifyContent:'center',marginBottom:20}}>Qué tan rápido empiezas</div>
              <h2 className="serif" style={{fontSize:'clamp(30px,4vw,50px)',fontWeight:700,lineHeight:1.12}}>
                Configurado y operando<br/><em style={{color:'#c9963a'}}>el mismo día.</em>
              </h2>
            </div>
          </FadeUp>
          <div ref={stepsRef} style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:20}} className="g3">
            {STEPS.map((s,i)=>(
              <FadeUp key={i} delay={i*.13}>
                <div className="step-card" style={{padding:'32px 28px',borderRadius:18,background:'rgba(255,255,255,.02)',border:'1px solid rgba(255,255,255,.07)',height:'100%'}}>
                  <div style={{width:44,height:44,borderRadius:'50%',background:'rgba(201,150,58,.1)',border:'1px solid rgba(201,150,58,.25)',display:'flex',alignItems:'center',justifyContent:'center',marginBottom:20,fontSize:15,fontWeight:700,color:'#c9963a'}}>{s.n}</div>
                  <h3 style={{fontSize:18,fontWeight:600,color:'#f0ece4',marginBottom:10}}>{s.t}</h3>
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
          <FadeUp>
            <div style={{textAlign:'center',marginBottom:52}}>
              <div className="eyebrow" style={{justifyContent:'center',marginBottom:20}}>Planes que crecen contigo</div>
              <h2 className="serif" style={{fontSize:'clamp(32px,4.5vw,58px)',fontWeight:700,lineHeight:1.08,marginBottom:16}}>
                No pagas módulos.<br/><em style={{color:'#c9963a'}}>Pagas por lo que tu negocio necesita.</em>
              </h2>
              <p style={{fontSize:15,color:'rgba(240,236,228,.45)',maxWidth:440,margin:'0 auto 32px',lineHeight:1.75}}>Cuando tu restaurante crece, cambias de plan. Sin comprar módulos uno por uno.</p>
              <div style={{display:'inline-flex',alignItems:'center',gap:12,padding:'8px 18px',borderRadius:100,background:'rgba(255,255,255,.04)',border:'1px solid rgba(255,255,255,.08)'}}>
                <span style={{fontSize:13,color:annual?'rgba(240,236,228,.35)':'#f0ece4'}}>Mensual</span>
                <button onClick={()=>setAnnual(v=>!v)} style={{width:44,height:24,borderRadius:12,background:annual?'#c9963a':'rgba(255,255,255,.15)',border:'none',position:'relative',transition:'all .3s'}}>
                  <span style={{position:'absolute',top:3,left:annual?23:3,width:18,height:18,borderRadius:'50%',background:'white',transition:'left .25s'}}/>
                </button>
                <span style={{fontSize:13,color:annual?'#f0ece4':'rgba(240,236,228,.35)'}}>Anual <span style={{color:'#c9963a',fontSize:11,fontWeight:700}}>−15%</span></span>
              </div>
            </div>
          </FadeUp>
          <div ref={pricingRef} style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:16,alignItems:'start'}} className="g3">
            {PLANS.map((plan,pi)=>{
              const fp=Math.round(plan.price*disc);
              return(
                <FadeUp key={plan.key} delay={pi*.12}>
                  <div className="pcard" style={{background:`linear-gradient(145deg,${plan.color}09,rgba(255,255,255,.025))`,border:`1px solid ${plan.color}28`,position:'relative'}}>
                    <div style={{fontSize:13,fontWeight:700,letterSpacing:'.08em',textTransform:'uppercase',color:plan.color,marginBottom:16}}>{plan.name}</div>
                    <div style={{marginBottom:4}}>
                      <span style={{fontSize:52,fontWeight:700,color:'#f0ece4',lineHeight:1,fontFamily:"'Playfair Display',serif"}}>${fp.toLocaleString('es-MX')}</span>
                      <span style={{fontSize:13,color:'rgba(240,236,228,.6)',marginLeft:6}}>/mes</span>
                    </div>
                    {annual&&<p style={{fontSize:11,color:'rgba(240,236,228,.45)',marginBottom:6}}>Antes ${plan.price.toLocaleString('es-MX')}/mes</p>}
                    <p className="serif" style={{fontSize:15,color:'rgba(240,236,228,.7)',fontStyle:'italic',marginBottom:8,lineHeight:1.4}}>{plan.tagline}</p>
                    <p style={{fontSize:12,color:'rgba(240,236,228,.4)',marginBottom:28,lineHeight:1.65}}>{plan.sub}</p>
                    <a href="/registro"
                      className="plan-cta" style={{display:'block',padding:'12px',borderRadius:12,background:`${plan.color}1a`,color:plan.color,fontSize:14,fontWeight:600,textAlign:'center',border:`1px solid ${plan.color}32`,marginBottom:28,transition:'all .2s'}}
                      onMouseEnter={e=>{e.currentTarget.style.background=`${plan.color}30`;e.currentTarget.style.transform='translateY(-1px)';}}
                      onMouseLeave={e=>{e.currentTarget.style.background=`${plan.color}1a`;e.currentTarget.style.transform='';}}
                    >
                      Empezar con {plan.name} →
                    </a>
                    <div style={{display:'flex',flexDirection:'column',gap:11}}>
                      {plan.features.map(([title,desc],fi)=>(
                        <div key={fi} className="feat-check" style={{display:'flex',gap:10,alignItems:'flex-start'}}>
                          <span style={{color:plan.color,flexShrink:0,fontSize:12,marginTop:2,fontWeight:700}}>✓</span>
                          <div>
                            <span style={{fontSize:13,color:title.startsWith('Todo')?'rgba(240,236,228,.38)':'rgba(240,236,228,.82)',lineHeight:1.4,fontStyle:title.startsWith('Todo')?'italic':'normal'}}>{title}</span>
                            {desc&&<p style={{fontSize:11,color:'rgba(240,236,228,.5)',lineHeight:1.5,marginTop:2}}>{desc}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </FadeUp>
              );
            })}
          </div>
          <FadeIn delay={0.3}>
            <p style={{textAlign:'center',fontSize:12,color:'rgba(240,236,228,.2)',marginTop:28}}>Todos los precios en MXN · No incluyen IVA · CFDI disponible como complemento</p>
          </FadeIn>
        </div>
      </section>

      {/* FINAL CTA */}
      <section style={{padding:'clamp(80px,10vw,130px) clamp(16px,5vw,60px)',textAlign:'center',position:'relative',overflow:'hidden',background:'#0d0f17'}}>
        {/* Particle dots — animated by Anime.js */}
        <div style={{position:'absolute',inset:0,pointerEvents:'none'}}>
          {Array.from({length:24}).map((_,i)=>(
            <div key={i} className="cta-dot" style={{position:'absolute',width:4,height:4,borderRadius:'50%',background:'rgba(201,150,58,.4)',left:`${(i%6)*17+4}%`,top:`${Math.floor(i/6)*28+10}%`,opacity:0}}/>
          ))}
        </div>
        <div style={{position:'absolute',inset:0,backgroundImage:'linear-gradient(rgba(201,150,58,.022) 1px,transparent 1px),linear-gradient(90deg,rgba(201,150,58,.022) 1px,transparent 1px)',backgroundSize:'80px 80px',pointerEvents:'none'}}/>
        <div style={{position:'absolute',top:'50%',left:'50%',transform:'translate(-50%,-50%)',width:900,height:600,background:'radial-gradient(ellipse,rgba(201,150,58,.1) 0%,transparent 65%)',pointerEvents:'none',animation:'pulse 5s ease-in-out infinite'}}/>
        <FadeUp>
          <div style={{position:'relative',maxWidth:640,margin:'0 auto'}}>
            <div className="eyebrow" style={{justifyContent:'center',marginBottom:24}}>Empieza hoy</div>
            <h2 className="serif" style={{fontSize:'clamp(40px,6vw,76px)',fontWeight:700,lineHeight:1.05,marginBottom:20}}>
              Tu restaurante merece<br/><em style={{color:'#c9963a'}}>saber la verdad.</em>
            </h2>
            <p style={{fontSize:17,color:'rgba(240,236,228,.5)',marginBottom:44,lineHeight:1.75}}>14 días sin costo, sin tarjeta.<br/>El sistema queda configurado el mismo día.</p>
            <a href="/registro" className="pill gold" style={{fontSize:16,padding:'16px 40px',animation:'glow-pulse 3s ease-in-out infinite'}}>Probar Aldente gratis →</a>
          </div>
        </FadeUp>
      </section>

      {/* FOOTER */}
      <footer style={{borderTop:'1px solid rgba(255,255,255,.05)',padding:'36px clamp(16px,5vw,60px)',background:'#07090f'}}>
        <div style={{maxWidth:1200,margin:'0 auto',display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:20}}>
          <div style={{fontFamily:"'Playfair Display',serif",fontSize:18,fontWeight:700,color:'#c9963a',letterSpacing:'.03em',display:'flex',alignItems:'center',gap:10}}>
            <img src="/assets/images/logo_aldente.png" alt="" style={{width:24,height:24,objectFit:'contain'}}/>Aldente
          </div>
          <div style={{display:'flex',gap:24,flexWrap:'wrap'}}>
            {[['soporte@aldente.app','mailto:soporte@aldente.app'],['Términos','#'],['Privacidad','#'],['Admin','/admin/login']].map(([l,h])=>(
              <a key={l} href={h} style={{fontSize:12,color:'rgba(240,236,228,.45)',transition:'color .2s'}} onMouseEnter={e=>(e.currentTarget.style.color='rgba(240,236,228,.7)')} onMouseLeave={e=>(e.currentTarget.style.color='rgba(240,236,228,.45)')}>{l}</a>
            ))}
          </div>
          <p style={{fontSize:11,color:'rgba(240,236,228,.15)'}}>© 2026 Aldente · México</p>
        </div>
      </footer>
    </div>
  );
}
