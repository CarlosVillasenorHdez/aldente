'use client';
import React, { useState, useEffect } from 'react';

const PAINS = [
  { n:'01', q:'Cuánto gané hoy de verdad', long:'¿Cuánto gané hoy de verdad?', body:'No el número de ventas. La utilidad real: con el costo de cada ingrediente que salió de la cocina, los gastos del día prorrateados y la merma de las cancelaciones. Ese número.', answer:'P&L del día en tiempo real. Automático.', color:'#c9963a' },
  { n:'02', q:'Por qué me falta mercancía', long:'¿Por qué me falta mercancía si no vendí tanto?', body:'Porque cada platillo que sale descuenta los ingredientes exactos de su receta. Y cada cancelación registra lo que ya se consumió como merma con costo real. La diferencia te dice dónde está el problema.', answer:'Inventario vivo. Merma por ingrediente.', color:'#4a9eff' },
  { n:'03', q:'Puedo abrir otra sucursal', long:'¿Puedo abrir otra sucursal sin perder el control?', body:'Cada sucursal opera de forma independiente — sus propias mesas, su propio menú, su equipo. Tú ves el consolidado desde un solo dashboard. La operación no se centraliza. La visibilidad sí.', answer:'Multi-sucursal con aislamiento real.', color:'#a78bfa' },
  { n:'04', q:'Sigues con papel y errores', long:'¿Sigues con papel y errores de comanda?', body:'La comanda va directo a cocina desde el celular del mesero. El cocinero ve el semáforo — verde, amarillo, rojo. El cajero cierra en 30 segundos. Sin papel, sin carreras, sin "no lo anoté".', answer:'POS + KDS + Mesero Móvil sincronizados.', color:'#34d399' },
];

const PLANS = [
  { key:'operacion', name:'Operación', price:799,
    etapa:'Etapa 1 — Orden y control',
    tagline:'Ya no hay papel en tu restaurante.',
    sub:'El restaurante que da el primer paso digital serio. Eliminas el caos antes de medir nada.',
    promise:'Cuando estés listo para entender tu rentabilidad, el paso al siguiente plan es natural.',
    color:'#4a9eff',
    features:[
      ['POS con mapa de mesas drag & drop','Unión de mesas, pagos mixtos, descuentos, propinas'],
      ['Para llevar integrado al POS','Flujo completo — sin mesa física, con nombre del cliente'],
      ['Cocina digital KDS','Semáforo verde/amarillo/rojo. Badge urgente. Realtime.'],
      ['Mesero móvil sin app store','Se instala desde el navegador en 10 segundos.'],
      ['Menú digital','Categorías, emojis, modificadores por platillo'],
      ['Corte de caja','Cierre en 30 segundos. Mesa vs Para Llevar separados.'],
      ['Roles y acceso por PIN','Cada empleado entra directo a su herramienta'],
      ['Control de propinas','Registro y resumen por turno'],
      ['Reservaciones','Con confirmación automática al mesero'],
    ] },
  { key:'negocio', name:'Negocio', price:1499,
    etapa:'Etapa 2 — Rentabilidad visible',
    tagline:'Ya sé exactamente qué pasa en mi restaurante.',
    sub:'El restaurante que opera bien y quiere tomar decisiones con números, no con intuición.',
    promise:'Cuando necesites escalar a más sucursales, el sistema ya está listo para acompañarte.',
    color:'#c9963a',
    features:[
      ['Todo lo de Operación',''],
      ['Inventario vivo por receta','Cada venta descuenta ingredientes automáticamente'],
      ['COGS real — no estimado','Costo por platillo desde la receta exacta'],
      ['P&L por día, semana o mes','Gastos escalados al período. Sin sorpresas.'],
      ['Merma con costo y razón','Cada cancelación registra el costo del ingrediente'],
      ['Gastos y depreciaciones','Pagos recurrentes con alertas de vencimiento'],
      ['Lista de compras automática','Basada en punto de reorden e historial de salidas'],
      ['Programa de lealtad','Puntos, niveles y recompensas configurables'],
      ['Alertas inteligentes','Stock bajo, órdenes demoradas, mesas sin atender'],
    ] },
  { key:'empresa', name:'Empresa', price:2499,
    etapa:'Etapa 3 — Escala con control',
    tagline:'Ya puedo crecer sin perder el hilo.',
    sub:'Cadenas y grupos que necesitan visión centralizada sin perder la autonomía de cada sucursal.',
    promise:'Aldente crece contigo. Aquí no hay techo.',
    color:'#a78bfa',
    features:[
      ['Todo lo de Negocio',''],
      ['Multi-sucursal consolidado','Dashboard unificado. Mesas y operación aisladas por sucursal.'],
      ['Analytics comparativo','P&L por sucursal. Ranking de desempeño. Márgenes en paralelo.'],
      ['Nómina LFT compliant','Art. 67/68/69/75. Horas extra calculadas y validadas.'],
      ['Recursos humanos','Vacaciones, permisos, tiempos extra con factor 2x/3x'],
      ['Delivery integrado','Asignación de repartidores, estados, historial por sucursal'],
      ['Reportes ejecutivos','Por sucursal o consolidados, por período'],
      ['Análisis avanzado de mermas','Por sucursal, por ingrediente, por turno'],
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

function LiveDemo() {
  const [tab, setTab] = useState<'pos'|'kds'|'pl'>('pos');
  const MESAS = [
    {n:1,status:'ocupada',time:22,total:480,mesero:'Carlos'},{n:2,status:'libre',time:0,total:0,mesero:''},{n:3,status:'ocupada',time:8,total:210,mesero:'María'},
    {n:4,status:'ocupada',time:41,total:920,mesero:'Carlos'},{n:5,status:'libre',time:0,total:0,mesero:''},{n:6,status:'cuenta',time:65,total:1340,mesero:'Luis'},
  ];
  const COMANDAS = [
    {mesa:4,platillo:'Tacos de Res x3',min:18},{mesa:1,platillo:'Hamburguesa Aldente',min:9},{mesa:3,platillo:'Ensalada César',min:4},{mesa:6,platillo:'Café Americano x2',min:2},
  ];
  const semaforo = (min:number) => min>15?'#ef4444':min>8?'#f59e0b':'#22c55e';
  return (
    <div style={{background:'#0a1628',border:'1px solid rgba(255,255,255,0.08)',borderRadius:20,overflow:'hidden',fontFamily:"'Outfit',sans-serif"}}>
      <div style={{display:'flex',borderBottom:'1px solid rgba(255,255,255,0.06)',padding:'0 20px',background:'rgba(255,255,255,0.01)'}}>
      {([['pos','Mapa de mesas'],['kds','Cocina (KDS)'],['pl','P&L del día']] as [typeof tab, string][]).map(([k,label])=>(
          <button key={k} onClick={()=>setTab(k)} style={{padding:'14px 20px',fontSize:13,fontWeight:tab===k?600:400,color:tab===k?'#c9963a':'rgba(255,255,255,0.4)',background:'none',border:'none',borderBottom:tab===k?'2px solid #c9963a':'2px solid transparent',cursor:'pointer',transition:'all .2s'}}>
            {label}
          </button>
        ))}
        <div style={{marginLeft:'auto',display:'flex',alignItems:'center',gap:6,padding:'0 8px'}}>
          <div style={{width:6,height:6,borderRadius:'50%',background:'#22c55e'}} />
          <span style={{fontSize:11,color:'rgba(255,255,255,0.3)'}}>En vivo</span>
        </div>
      </div>
      <div style={{padding:20,minHeight:300}}>
        {tab==='pos'&&(
          <div>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:16}}>
              <span style={{fontSize:12,color:'rgba(255,255,255,0.4)'}}>Restaurante El Güero · Turno noche</span>
              <span style={{fontSize:12,color:'#c9963a',fontWeight:600}}>$2,950 acumulado</span>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10}}>
              {MESAS.map(m=>(
                <div key={m.n} style={{padding:'14px 16px',borderRadius:12,background:m.status==='libre'?'rgba(255,255,255,0.03)':m.status==='cuenta'?'rgba(201,150,58,0.1)':'rgba(34,197,94,0.08)',border:`1px solid ${m.status==='libre'?'rgba(255,255,255,0.07)':m.status==='cuenta'?'rgba(201,150,58,0.3)':'rgba(34,197,94,0.2)'}`}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'baseline',marginBottom:6}}>
                    <span style={{fontSize:15,fontWeight:700,color:'#f1f5f9'}}>Mesa {m.n}</span>
                    {m.status!=='libre'&&<span style={{fontSize:10,color:'rgba(255,255,255,0.35)'}}>{m.time} min</span>}
                  </div>
                  {m.status==='libre'?<span style={{fontSize:11,color:'rgba(255,255,255,0.25)'}}>Disponible</span>:<>
                    <span style={{fontSize:16,fontWeight:700,color:m.status==='cuenta'?'#c9963a':'#f1f5f9'}}>${m.total.toLocaleString('es-MX')}</span>
                    <div style={{fontSize:10,color:'rgba(255,255,255,0.3)',marginTop:4}}>{m.mesero} · {m.status==='cuenta'?'Pidiendo cuenta':'En servicio'}</div>
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
                <div key={l} style={{display:'flex',alignItems:'center',gap:6,fontSize:12,color:'rgba(255,255,255,0.45)'}}>
                  <div style={{width:8,height:8,borderRadius:'50%',background:c as string}}/>{l}
                </div>
              ))}
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:8}}>
              {COMANDAS.map((c,i)=>(
                <div key={i} style={{display:'flex',alignItems:'center',gap:14,padding:'12px 16px',borderRadius:10,background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.07)'}}>
                  <div style={{width:10,height:10,borderRadius:'50%',background:semaforo(c.min),flexShrink:0,boxShadow:`0 0 8px ${semaforo(c.min)}60`}}/>
                  <span style={{fontSize:13,color:'rgba(255,255,255,0.5)',width:56,flexShrink:0}}>Mesa {c.mesa}</span>
                  <span style={{fontSize:14,fontWeight:500,color:'#f1f5f9',flex:1}}>{c.platillo}</span>
                  <span style={{fontSize:13,color:semaforo(c.min),fontWeight:600,fontFamily:'monospace'}}>{c.min} min</span>
                </div>
              ))}
            </div>
          </div>
        )}
        {tab==='pl'&&(
          <div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10,marginBottom:16}}>
              {[{label:'Ventas del día',value:'$14,280',color:'#f1f5f9',bg:'rgba(255,255,255,0.04)'},{label:'COGS (ingredientes)',value:'−$4,712',color:'#f87171',bg:'rgba(239,68,68,0.06)'},{label:'Utilidad bruta',value:'$9,568',color:'#4ade80',bg:'rgba(74,222,128,0.07)'}].map(kpi=>(
                <div key={kpi.label} style={{padding:'14px',borderRadius:10,background:kpi.bg,border:'1px solid rgba(255,255,255,0.06)'}}>
                  <p style={{fontSize:10,color:'rgba(255,255,255,0.35)',marginBottom:6,textTransform:'uppercase',letterSpacing:'.06em'}}>{kpi.label}</p>
                  <p style={{fontSize:20,fontWeight:700,color:kpi.color,fontFamily:'monospace'}}>{kpi.value}</p>
                </div>
              ))}
            </div>
            <div style={{background:'rgba(255,255,255,0.03)',borderRadius:10,padding:'14px 16px',border:'1px solid rgba(255,255,255,0.06)'}}>
              {[['Gastos del día (prorrateados)','−$2,340'],['Merma registrada','−$380'],['Nómina del turno','−$1,200']].map(([l,v])=>(
                <div key={l} style={{display:'flex',justifyContent:'space-between',padding:'6px 0'}}>
                  <span style={{fontSize:13,color:'rgba(255,255,255,0.45)'}}>{l}</span>
                  <span style={{fontSize:13,color:'#f87171',fontFamily:'monospace'}}>{v}</span>
                </div>
              ))}
              <div style={{borderTop:'1px solid rgba(255,255,255,0.08)',paddingTop:8,marginTop:4,display:'flex',justifyContent:'space-between'}}>
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

export default function MarketingPage() {
  const [activePain, setActivePain] = useState(0);
  const [annual, setAnnual] = useState(false);
  const pain = PAINS[activePain];
  useEffect(()=>{ const t=setInterval(()=>setActivePain(p=>(p+1)%PAINS.length),4500); return()=>clearInterval(t); },[]);
  const disc = annual?0.85:1;
  return (
    <div style={{background:'#07090f',color:'#f0ece4',fontFamily:"'Outfit',system-ui,sans-serif",overflowX:'hidden'}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400;1,700&family=Outfit:wght@300;400;500;600;700&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        html{scroll-behavior:smooth}
        a{text-decoration:none;color:inherit}
        button{cursor:pointer;font-family:inherit}
        @keyframes fadeUp{from{opacity:0;transform:translateY(28px)}to{opacity:1;transform:translateY(0)}}
        @keyframes run{to{transform:translateX(-50%)}}
        .serif{font-family:'Playfair Display',Georgia,serif}
        .nav{position:fixed;top:0;left:0;right:0;z-index:200;height:60px;display:flex;align-items:center;padding:0 clamp(16px,5vw,60px);background:rgba(7,9,15,.9);backdrop-filter:blur(20px);border-bottom:1px solid rgba(255,255,255,.045)}
        .wrap{max-width:1200px;margin:0 auto;padding:0 clamp(16px,5vw,60px)}
        .sec{padding:clamp(72px,9vw,120px) clamp(16px,5vw,60px)}
        .eyebrow{font-size:10px;font-weight:700;letter-spacing:.15em;text-transform:uppercase;color:#c9963a;display:flex;align-items:center;gap:12px}
        .eyebrow::before,.eyebrow::after{content:'';width:24px;height:1px;background:rgba(201,150,58,.35)}
        .pill{display:inline-flex;align-items:center;padding:10px 24px;border-radius:100px;font-size:13px;font-weight:600;transition:all .2s;font-family:'Outfit',sans-serif}
        .gold{background:#c9963a;color:#07090f;border:none}
        .gold:hover{background:#dba84a;transform:translateY(-1px);box-shadow:0 8px 24px rgba(201,150,58,.28)}
        .ghost{background:transparent;color:rgba(240,236,228,.6);border:1px solid rgba(255,255,255,.12)}
        .ghost:hover{border-color:rgba(255,255,255,.3);color:#f0ece4}
        .pcard{border-radius:22px;padding:36px 30px;transition:transform .25s,box-shadow .25s;cursor:default}
        .pcard:hover{transform:translateY(-6px)}
        @media(max-width:900px){.hnav{display:none!important}.g3{grid-template-columns:1fr!important}.g2{grid-template-columns:1fr!important}.hcols{flex-direction:column!important}}
      `}</style>

      {/* NAV */}
      <nav className="nav">
        <div style={{width:'100%',maxWidth:1200,margin:'0 auto',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <div style={{fontFamily:"'Playfair Display',serif",fontSize:20,fontWeight:700,color:'#c9963a',letterSpacing:'.03em',display:'flex',alignItems:'center',gap:10}}>
            <img src="/assets/images/logo_aldente.png" alt="" style={{width:28,height:28,objectFit:'contain'}}/>
            Aldente
          </div>
          <div className="hnav" style={{display:'flex',alignItems:'center',gap:28}}>
            {[['#problema','El problema'],['#diferencia','Por qué nosotros'],['#demo','Demo'],['#planes','Planes'],['\/funcionalidades','Funcionalidades']].map(([h,l])=>(
              <a key={l} href={h} style={{fontSize:13,color:'rgba(240,236,228,.5)',transition:'color .2s'}} onMouseEnter={e=>(e.currentTarget.style.color='#f0ece4')} onMouseLeave={e=>(e.currentTarget.style.color='rgba(240,236,228,.5)')}>{l}</a>
            ))}
            <a href="/login" style={{fontSize:13,fontWeight:500,color:'rgba(240,236,228,.75)',padding:'8px 18px',borderRadius:100,border:'1px solid rgba(240,236,228,.2)',transition:'all .2s'}}
              onMouseEnter={e=>{e.currentTarget.style.color='#f0ece4';e.currentTarget.style.borderColor='rgba(240,236,228,.5)';}}
              onMouseLeave={e=>{e.currentTarget.style.color='rgba(240,236,228,.75)';e.currentTarget.style.borderColor='rgba(240,236,228,.2)';}}>
              Iniciar sesión
            </a>
            <a href="/registro" className="pill gold" style={{fontSize:13}}>14 días gratis →</a>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section style={{paddingTop:60,minHeight:'100vh',display:'flex',flexDirection:'column',justifyContent:'center',position:'relative',overflow:'hidden'}}>
        <div style={{position:'absolute',inset:0,backgroundImage:'linear-gradient(rgba(201,150,58,.025) 1px,transparent 1px),linear-gradient(90deg,rgba(201,150,58,.025) 1px,transparent 1px)',backgroundSize:'80px 80px',pointerEvents:'none'}}/>
        <div style={{position:'absolute',top:'30%',left:'50%',transform:'translate(-50%,-50%)',width:900,height:600,background:'radial-gradient(ellipse,rgba(201,150,58,.07) 0%,transparent 60%)',pointerEvents:'none'}}/>
        <div className="wrap" style={{position:'relative',zIndex:1,paddingTop:'clamp(60px,10vw,120px)',paddingBottom:'clamp(60px,10vw,120px)',textAlign:'center'}}>
          <div className="eyebrow" style={{justifyContent:'center',marginBottom:28,animation:'fadeUp .6s ease both'}}>
            Sistema de gestión para restaurantes · México
          </div>
          <h1 className="serif" style={{fontSize:'clamp(44px,7.5vw,96px)',fontWeight:700,lineHeight:1.02,marginBottom:24,animation:'fadeUp .7s .08s ease both'}}>
            Por primera vez,<br/><em style={{color:'#c9963a',fontStyle:'italic'}}>sabes exactamente</em><br/>qué pasa en tu restaurante.
          </h1>
          <p style={{fontSize:'clamp(15px,2vw,19px)',fontWeight:300,color:'rgba(240,236,228,.6)',maxWidth:520,margin:'0 auto 20px',lineHeight:1.75,animation:'fadeUp .7s .16s ease both'}}>
            Sin esperar el corte. Sin llamar al cajero.<br/>Sin adivinar si te quedaste sin un ingrediente clave.
          </p>
          {/* Pain ticker */}
          <div style={{animation:'fadeUp .7s .22s ease both',marginBottom:40}}>
            <div style={{display:'inline-flex',alignItems:'center',gap:10,padding:'10px 18px 10px 14px',borderRadius:100,background:'rgba(255,255,255,.04)',border:'1px solid rgba(255,255,255,.08)'}}>
              <div style={{width:24,height:24,borderRadius:'50%',background:`${pain.color}20`,border:`1px solid ${pain.color}40`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:700,color:pain.color,flexShrink:0,transition:'all .4s'}}>?</div>
              <span style={{fontSize:13,color:'rgba(240,236,228,.65)',transition:'all .4s'}}>{pain.q}</span>
              <span style={{fontSize:10,fontWeight:700,color:pain.color,padding:'2px 8px',background:`${pain.color}15`,borderRadius:100,letterSpacing:'.05em',flexShrink:0}}>RESUELTA</span>
            </div>
          </div>
          <div style={{display:'flex',gap:12,justifyContent:'center',flexWrap:'wrap',marginBottom:48,animation:'fadeUp .7s .28s ease both'}}>
            <a href="/registro" className="pill gold" style={{fontSize:15,padding:'13px 32px'}}>Probar 14 días gratis →</a>
            <a href="#demo" className="pill ghost" style={{fontSize:15,padding:'13px 28px'}}>Ver demo</a>
          </div>
          <div style={{display:'flex',gap:24,justifyContent:'center',flexWrap:'wrap',animation:'fadeUp .7s .36s ease both'}}>
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
        <div style={{display:'flex',animation:'run 38s linear infinite',whiteSpace:'nowrap'}}>
          {[...Array(2)].map((_,r)=>
            ['POS mapa de mesas','KDS semáforo','Mesero móvil sin app store','P&L en tiempo real','Merma real por ingrediente','Inventario vivo','Gastos y depreciaciones','Nómina LFT Art.67/68/69','Reservaciones','Multi-sucursal','Lealtad','Punto de reorden inteligente'].map((item,i)=>(
              <span key={`${r}-${i}`} style={{fontSize:11,color:'rgba(240,236,228,.55)',padding:'0 28px',letterSpacing:'.06em'}}>
                {item}<span style={{color:'rgba(201,150,58,.4)',marginLeft:28}}>·</span>
              </span>
            ))
          )}
        </div>
      </div>

      {/* PROBLEM */}
      <section className="sec" id="problema" style={{background:'#07090f'}}>
        <div className="wrap">
          <div style={{display:'flex',gap:80,alignItems:'flex-start',flexWrap:'wrap'}} className="hcols">
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
                  <button key={i} onClick={()=>setActivePain(i)}
                    style={{display:'flex',alignItems:'center',gap:12,padding:'10px 14px',borderRadius:10,background:activePain===i?`${p.color}10`:'transparent',border:`1px solid ${activePain===i?p.color+'35':'rgba(255,255,255,.06)'}`,textAlign:'left',transition:'all .25s'}}>
                    <span style={{fontFamily:'monospace',fontSize:10,color:activePain===i?p.color:'rgba(240,236,228,.25)',fontWeight:600}}>{p.n}</span>
                    <span style={{fontSize:13,color:activePain===i?'#f0ece4':'rgba(240,236,228,.45)'}}>{p.q}</span>
                  </button>
                ))}
              </div>
            </div>
            <div style={{flex:1,minWidth:280}}>
              <div style={{padding:'40px 44px',borderRadius:24,background:`linear-gradient(135deg,${pain.color}08,rgba(255,255,255,.02))`,border:`1px solid ${pain.color}25`,transition:'all .4s',minHeight:300}}>
                <div style={{fontSize:48,fontFamily:'Playfair Display,serif',fontWeight:700,color:pain.color,lineHeight:1,marginBottom:20,opacity:.5}}>"</div>
                <h3 className="serif" style={{fontSize:'clamp(22px,3vw,34px)',fontWeight:700,color:'#f0ece4',lineHeight:1.2,marginBottom:20,fontStyle:'italic'}}>{pain.long}</h3>
                <p style={{fontSize:15,color:'rgba(240,236,228,.55)',lineHeight:1.8,marginBottom:28}}>{pain.body}</p>
                <div style={{display:'inline-flex',alignItems:'center',gap:10,padding:'10px 18px',borderRadius:10,background:`${pain.color}12`,border:`1px solid ${pain.color}30`}}>
                  <span style={{fontSize:10,fontWeight:700,letterSpacing:'.1em',textTransform:'uppercase',color:pain.color}}>Solución Aldente</span>
                  <span style={{fontSize:13,color:'#f0ece4',fontWeight:500}}>{pain.answer}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* DEMO */}
      <section className="sec" id="demo" style={{background:'#0d0f17'}}>
        <div className="wrap">
          <div style={{textAlign:'center',marginBottom:56}}>
            <div className="eyebrow" style={{justifyContent:'center',marginBottom:20}}>Ve cómo funciona</div>
            <h2 className="serif" style={{fontSize:'clamp(30px,4.5vw,54px)',fontWeight:700,lineHeight:1.12}}>
              Mesas, cocina y P&L<br/><em style={{color:'#c9963a'}}>en una sola plataforma.</em>
            </h2>
          </div>
          <LiveDemo/>
          <p style={{textAlign:'center',fontSize:12,color:'rgba(240,236,228,.2)',marginTop:20}}>Vista de demostración · La interfaz real se adapta a tu restaurante</p>
        </div>
      </section>

      {/* DIFFERENCES */}
      <section className="sec" id="diferencia" style={{background:'#07090f'}}>
        <div className="wrap">
          <div style={{maxWidth:600,marginBottom:64}}>
            <div className="eyebrow" style={{marginBottom:20}}>Por qué Aldente</div>
            <h2 className="serif" style={{fontSize:'clamp(32px,4.5vw,54px)',fontWeight:700,lineHeight:1.1,marginBottom:20}}>
              La diferencia está en<br/><em style={{color:'#c9963a'}}>lo que nadie más mide.</em>
            </h2>
            <p style={{fontSize:15,color:'rgba(240,236,228,.5)',lineHeight:1.75}}>Otros sistemas te dan un POS y un reporte. Aldente te dice cuánto ganaste, por qué falta mercancía y dónde se va el dinero.</p>
          </div>
          <div style={{display:'flex',flexDirection:'column',gap:2}}>
            <div style={{display:'grid',gridTemplateColumns:'100px 1fr 1fr',gap:2,marginBottom:6}}>
              <div/><div style={{padding:'8px 20px',fontSize:10,fontWeight:700,letterSpacing:'.1em',textTransform:'uppercase',color:'rgba(240,236,228,.55)'}}>Otros sistemas</div>
              <div style={{padding:'8px 20px',fontSize:10,fontWeight:700,letterSpacing:'.1em',textTransform:'uppercase',color:'#c9963a'}}>Aldente</div>
            </div>
            {DIFFS.map((d,i)=>(
              <div key={i} style={{display:'grid',gridTemplateColumns:'100px 1fr 1fr',gap:2}}>
                <div style={{padding:'18px 16px',display:'flex',alignItems:'center',borderRadius:'10px 0 0 10px',background:'rgba(255,255,255,.02)',borderRight:'1px solid rgba(255,255,255,.04)'}}>
                  <span style={{fontSize:10,fontWeight:700,color:'rgba(240,236,228,.6)',letterSpacing:'.08em',textTransform:'uppercase'}}>{d.label}</span>
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
            ))}
          </div>
          {/* ROI */}
          <div style={{marginTop:48,padding:'36px 44px',borderRadius:20,background:'rgba(201,150,58,.05)',border:'1px solid rgba(201,150,58,.18)',display:'flex',gap:48,alignItems:'center',flexWrap:'wrap'}}>
            <div style={{flex:1,minWidth:240}}>
              <p className="serif" style={{fontSize:'clamp(18px,2.5vw,26px)',color:'#f0ece4',lineHeight:1.4,marginBottom:12,fontStyle:'italic'}}>"Evitar 2 mermas al día paga el sistema 3 veces al mes."</p>
              <p style={{fontSize:13,color:'rgba(240,236,228,.4)',lineHeight:1.7}}>Si cada platillo tiene $80 de costo y registras 2 mermas diarias evitables, son $4,800 mensuales. El plan Negocio cuesta $1,499.</p>
            </div>
            <div style={{display:'flex',gap:32,flexShrink:0,flexWrap:'wrap'}}>
              {[['3.2x','ROI primer mes'],['30 seg','Corte de caja'],['~12%','Mejora de margen']].map(([v,l])=>(
                <div key={l} style={{textAlign:'center'}}>
                  <p style={{fontSize:36,fontWeight:700,color:'#c9963a',lineHeight:1,fontFamily:'monospace'}}>{v}</p>
                  <p style={{fontSize:11,color:'rgba(240,236,228,.6)',marginTop:4}}>{l}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="sec" style={{background:'#0d0f17'}}>
        <div className="wrap">
          <div style={{textAlign:'center',marginBottom:52}}>
            <div className="eyebrow" style={{justifyContent:'center',marginBottom:20}}>Qué tan rápido empiezas</div>
            <h2 className="serif" style={{fontSize:'clamp(30px,4vw,50px)',fontWeight:700,lineHeight:1.12}}>
              Configurado y operando<br/><em style={{color:'#c9963a'}}>el mismo día.</em>
            </h2>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:20}} className="g3">
            {STEPS.map((s,i)=>(
              <div key={i} style={{padding:'32px 28px',borderRadius:18,background:'rgba(255,255,255,.02)',border:'1px solid rgba(255,255,255,.07)'}}>
                <div style={{width:40,height:40,borderRadius:'50%',background:'rgba(201,150,58,.1)',border:'1px solid rgba(201,150,58,.25)',display:'flex',alignItems:'center',justifyContent:'center',marginBottom:20,fontSize:14,fontWeight:700,color:'#c9963a'}}>{s.n}</div>
                <h3 style={{fontSize:17,fontWeight:600,color:'#f0ece4',marginBottom:10}}>{s.t}</h3>
                <p style={{fontSize:14,color:'rgba(240,236,228,.5)',lineHeight:1.7}}>{s.b}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PLANS */}
      <section className="sec" id="planes" style={{background:'#07090f'}}>
        <div className="wrap">
          <div style={{textAlign:'center',marginBottom:52}}>
            <div className="eyebrow" style={{justifyContent:'center',marginBottom:20}}>Planes que crecen contigo</div>
            <h2 className="serif" style={{fontSize:'clamp(32px,4.5vw,58px)',fontWeight:700,lineHeight:1.08,marginBottom:16}}>
              No pagas módulos.<br/><em style={{color:'#c9963a'}}>Pagas por la etapa de tu negocio.</em>
            </h2>
            <p style={{fontSize:15,color:'rgba(240,236,228,.45)',maxWidth:460,margin:'0 auto 32px',lineHeight:1.75}}>Cuando tu restaurante crece, cambias de plan. No compras módulos uno por uno. Así funciona la Forever Transaction.</p>
            <div style={{display:'inline-flex',alignItems:'center',gap:12,padding:'8px 18px',borderRadius:100,background:'rgba(255,255,255,.04)',border:'1px solid rgba(255,255,255,.08)'}}>
              <span style={{fontSize:13,color:annual?'rgba(240,236,228,.35)':'#f0ece4'}}>Mensual</span>
              <button onClick={()=>setAnnual(v=>!v)} style={{width:44,height:24,borderRadius:12,background:annual?'#c9963a':'rgba(255,255,255,.15)',border:'none',position:'relative',transition:'all .3s'}}>
                <span style={{position:'absolute',top:3,left:annual?23:3,width:18,height:18,borderRadius:'50%',background:'white',transition:'left .25s'}}/>
              </button>
              <span style={{fontSize:13,color:annual?'#f0ece4':'rgba(240,236,228,.35)'}}>Anual <span style={{color:'#c9963a',fontSize:11,fontWeight:700}}>−15%</span></span>
            </div>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:16,alignItems:'start'}} className="g3">
            {PLANS.map(plan=>{
              const fp=Math.round(plan.price*disc);
              const p=plan as any;
              return(
                <div key={plan.key} className="pcard"
                  style={{background:`linear-gradient(145deg,${plan.color}08,rgba(255,255,255,.02))`,border:`1px solid ${plan.color}25`,position:'relative'}}>
                  <div style={{fontSize:10,fontWeight:600,letterSpacing:'.1em',textTransform:'uppercase',color:`${plan.color}88`,marginBottom:8}}>{p.etapa}</div>
                  <div style={{fontSize:13,fontWeight:700,letterSpacing:'.08em',textTransform:'uppercase',color:plan.color,marginBottom:16}}>{plan.name}</div>
                  <div style={{marginBottom:4}}>
                    <span style={{fontSize:52,fontWeight:700,color:'#f0ece4',lineHeight:1,fontFamily:"'Playfair Display',serif"}}>${fp.toLocaleString('es-MX')}</span>
                    <span style={{fontSize:13,color:'rgba(240,236,228,.6)',marginLeft:6}}>/mes</span>
                  </div>
                  {annual&&<p style={{fontSize:11,color:'rgba(240,236,228,.5)',marginBottom:6}}>Antes ${plan.price.toLocaleString('es-MX')}/mes</p>}
                  <p className="serif" style={{fontSize:15,color:'rgba(240,236,228,.65)',fontStyle:'italic',marginBottom:8,lineHeight:1.4}}>{plan.tagline}</p>
                  <p style={{fontSize:12,color:'rgba(240,236,228,.4)',marginBottom:28,lineHeight:1.65}}>{plan.sub}</p>
                  <p style={{fontSize:12,color:'rgba(240,236,228,.4)',marginBottom:20,lineHeight:1.65}}>{plan.sub}</p>
                  {p.promise&&<p style={{fontSize:11,color:`${plan.color}70`,marginBottom:20,lineHeight:1.6,fontStyle:'italic',borderLeft:`2px solid ${plan.color}25`,paddingLeft:10}}>{p.promise}</p>}
                  <a href="/registro" style={{display:'block',padding:'12px',borderRadius:12,background:`${plan.color}18`,color:plan.color,fontSize:14,fontWeight:600,textAlign:'center',border:`1px solid ${plan.color}30`,marginBottom:28,transition:'all .2s'}}>
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
              );
            })}
          </div>
          <p style={{textAlign:'center',fontSize:12,color:'rgba(240,236,228,.2)',marginTop:28}}>Todos los precios en MXN · No incluyen IVA · Facturación electrónica CFDI disponible como complemento</p>
        </div>
      </section>

      {/* FINAL CTA */}
      <section style={{padding:'clamp(80px,10vw,130px) clamp(16px,5vw,60px)',textAlign:'center',position:'relative',overflow:'hidden',background:'#0d0f17'}}>
        <div style={{position:'absolute',inset:0,backgroundImage:'linear-gradient(rgba(201,150,58,.025) 1px,transparent 1px),linear-gradient(90deg,rgba(201,150,58,.025) 1px,transparent 1px)',backgroundSize:'80px 80px',pointerEvents:'none'}}/>
        <div style={{position:'absolute',top:'50%',left:'50%',transform:'translate(-50%,-50%)',width:700,height:400,background:'radial-gradient(ellipse,rgba(201,150,58,.06) 0%,transparent 65%)',pointerEvents:'none'}}/>
        <div style={{position:'relative',maxWidth:640,margin:'0 auto'}}>
          <div className="eyebrow" style={{justifyContent:'center',marginBottom:24}}>Empieza hoy</div>
          <h2 className="serif" style={{fontSize:'clamp(40px,6vw,76px)',fontWeight:700,lineHeight:1.05,marginBottom:20}}>
            Tu restaurante merece<br/><em style={{color:'#c9963a'}}>saber la verdad.</em>
          </h2>
          <p style={{fontSize:17,color:'rgba(240,236,228,.5)',marginBottom:44,lineHeight:1.75}}>14 días sin costo, sin tarjeta.&lt;br/&gt;El sistema queda configurado el mismo día.</p>
          <a href="/registro" className="pill gold" style={{fontSize:16,padding:'16px 40px'}}>Probar Aldente gratis →</a>
        </div>
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
          <p style={{fontSize:11,color:'rgba(240,236,228,.18)'}}>© 2026 Aldente · México</p>
        </div>
      </footer>
    </div>
  );
}
