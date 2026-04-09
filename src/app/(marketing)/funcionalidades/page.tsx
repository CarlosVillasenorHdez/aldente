'use client';
import React, { useState } from 'react';

// ─── BRAND CONSTANTS (shared philosophy across all pages) ─────────────────────
// Mission: Dar a cada restaurantero la verdad de su negocio, en tiempo real.
// Vision:  Que ningún restaurante en México tenga que adivinar si fue rentable.
// Values:  Verdad sin filtros · Diseño que respeta · Crecer juntos · México primero
// Forever Transaction principle: No vendemos software. Entramos a una relación.

const MODULES = [
  {
    id: 'pos',
    icon: '🍽️',
    name: 'Punto de venta',
    tagline: 'La operación que tus meseros van a amar.',
    pain: '¿Sigues con comandas en papel y errores al anotar?',
    color: '#4a9eff',
    plan: 'Operación',
    features: [
      { title: 'Mapa de mesas drag & drop', body: 'Arrastra y suelta para organizar el salón. Ves el estado de cada mesa de un vistazo — ocupada, esperando cuenta, libre.' },
      { title: 'Unión y división de mesas', body: 'Junta varias mesas para grupos grandes o divide la cuenta entre comensales con un toque.' },
      { title: 'Pagos mixtos', body: 'Una mesa puede pagar mitad efectivo, mitad tarjeta. O tres personas pagan con tres métodos distintos.' },
      { title: 'Modificadores y notas', body: 'Sin cebolla, extra picante, alergias — cada platillo acepta instrucciones específicas que van directo a cocina.' },
      { title: 'Cancelaciones con trazabilidad', body: 'Cada cancelación registra la razón y al responsable. El costo del ingrediente se suma a merma automáticamente.' },
      { title: 'Corte de caja en 30 segundos', body: 'El sistema totaliza ventas, propinas, descuentos y diferencias de efectivo. Imprime o exporta con un botón.' },
    ],
  },
  {
    id: 'kds',
    icon: '📺',
    name: 'Cocina digital (KDS)',
    tagline: 'Cero papel. Cero carreras. Cero comandas perdidas.',
    pain: '¿Cuántas veces al día un mesero tiene que ir corriendo a la cocina?',
    color: '#34d399',
    plan: 'Operación',
    features: [
      { title: 'Semáforo de tiempos', body: 'Verde si el platillo está a tiempo. Amarillo si se está tardando. Rojo si ya pasó el tiempo de preparación. El cocinero sabe sin mirar el reloj.' },
      { title: 'FIFO automático', body: 'Los pedidos llegan en orden cronológico. El cocinero trabaja el más antiguo primero, sin tener que recordarlo.' },
      { title: 'Alertas sonoras configurables', body: 'Nuevo pedido, platillo demorado, actualización de mesa — cada evento tiene su señal sonora.' },
      { title: 'Vista por estación', body: 'Filtra por tipo de platillo: caliente, frío, bebidas. Cada estación ve solo lo que le corresponde.' },
      { title: 'Historial de comandas', body: 'Consulta cualquier comanda de la sesión actual. Útil si el comensal pregunta cuánto tiempo lleva su pedido.' },
    ],
  },
  {
    id: 'mesero',
    icon: '📱',
    name: 'Mesero móvil',
    tagline: 'Tu equipo ordena desde el celular. Sin app store. Sin instalación.',
    pain: '¿Tu mesero tarda 3 minutos en cada orden porque tiene que ir a la caja?',
    color: '#a78bfa',
    plan: 'Operación',
    features: [
      { title: 'PWA — se instala desde el navegador', body: 'No requiere Google Play ni App Store. El mesero abre el link en su celular y lo guarda como app. Así de simple.' },
      { title: 'Funciona sin conexión', body: 'Si el WiFi falla, el mesero sigue tomando órdenes. Se sincronizan automáticamente cuando regresa la conexión.' },
      { title: 'Diff inteligente al enviar', body: 'Solo envía a cocina los platillos nuevos, no toda la orden. Evita duplicados y confusión en el KDS.' },
      { title: 'Login por PIN por mesa', body: 'El mesero se identifica con su PIN. El sistema sabe qué mesa atiende quién y calcula propinas individuales.' },
    ],
  },
  {
    id: 'inventario',
    icon: '📦',
    name: 'Inventario inteligente',
    tagline: 'El stock que sí refleja lo que tienes — no lo que crees que tienes.',
    pain: '¿Cuántas veces te quedaste sin un ingrediente justo a la hora del servicio?',
    color: '#f59e0b',
    plan: 'Negocio',
    features: [
      { title: 'Descuento automático por receta', body: 'Cada platillo vendido descuenta los ingredientes exactos de su receta. Sin contar a mano, sin hojas de Excel.' },
      { title: 'Unidades de compra vs almacenamiento', body: 'Compras por bolsa (50 piezas). El sistema convierte automáticamente y mantiene el stock en unidad mínima.' },
      { title: 'Punto de reorden inteligente', body: 'Calcula el RoP basado en tu historial real de salidas. Te avisa antes de que se agote, no cuando ya no hay.' },
      { title: 'Ficha por ingrediente', body: 'Historial de movimientos, costo unitario, valor en stock, proveedor, presentación de compra — todo en un panel.' },
      { title: 'Lista de compras automática', body: 'Genera un checklist de lo que necesitas comprar esta semana. Marca lo que ya compraste. Exporta como PDF.' },
      { title: 'Merma con razón y costo', body: 'Cada cancelación registra qué ingrediente se consumió, por qué se canceló y cuánto costó. Nada desaparece sin dejar rastro.' },
    ],
  },
  {
    id: 'pl',
    icon: '📊',
    name: 'P&L en tiempo real',
    tagline: 'Sabes si hoy fue rentable antes de cerrar la caja.',
    pain: '¿Cuándo fue la última vez que supiste el margen real de tu restaurante?',
    color: '#c9963a',
    plan: 'Negocio',
    features: [
      { title: 'P&L del día, semana o mes', body: 'Los gastos fijos se escalan al período que estás consultando. Si ves el día, ves la parte proporcional del alquiler, la nómina, los servicios.' },
      { title: 'COGS real por platillo', body: 'No un estimado. El costo exacto de cada ingrediente que salió de la cocina para ese platillo, calculado desde la receta.' },
      { title: 'Punto de equilibrio dinámico', body: 'La línea en la gráfica se mueve según tus gastos reales del período. Sabes exactamente cuánto tienes que vender para no perder.' },
      { title: 'Merma en el P&L', body: 'La merma aparece como línea separada en el estado de resultados. No está escondida en el COGS — la ves aparte para poder atacarla.' },
      { title: 'Reportes PDF ejecutivos', body: 'Genera un reporte por período con todos los KPIs: ventas, costos, merma, utilidad. Para ti, para tu contador o para tu socio.' },
    ],
  },
  {
    id: 'gastos',
    icon: '💳',
    name: 'Gastos y depreciaciones',
    tagline: 'Tus gastos fijos registrados antes de que venzan.',
    pain: '¿Sabes exactamente cuánto pagas de renta, luz, gas, internet este mes?',
    color: '#f87171',
    plan: 'Negocio',
    features: [
      { title: 'Gastos recurrentes', body: 'Registra cada gasto con su frecuencia — mensual, quincenal, anual. El sistema los prorratea automáticamente al calcular el P&L.' },
      { title: 'Alertas de vencimiento', body: 'Te avisa 7 días antes de que venza un pago. Sin más multas por olvidar la renta o el servicio.' },
      { title: 'Historial de pagos', body: 'Cada pago registrado queda en el historial con fecha, monto y comprobante opcional. Para tu contador y para ti.' },
      { title: 'Depreciaciones', body: 'Registra tus activos (estufa, refrigerador, mobiliario) y el sistema calcula la depreciación mensual automáticamente.' },
    ],
  },
  {
    id: 'nomina',
    icon: '👥',
    name: 'Nómina LFT',
    tagline: 'La única nómina de restaurante que conoce la Ley Federal del Trabajo.',
    pain: '¿Calculas las horas extra a mano cada quincena?',
    color: '#e879f9',
    plan: 'Empresa',
    featured: true,
    features: [
      { title: 'Horas extra Art. 67/68', body: 'Las primeras 9 horas extra semanales se pagan al doble (Art. 67). A partir de la décima, al triple (Art. 68). El sistema valida y calcula automáticamente.' },
      { title: 'Prima dominical Art. 69/75', body: 'Si el trabajador descansa el domingo que le corresponde, recibe prima dominical del 25%. El sistema lo aplica sin que tengas que recordarlo.' },
      { title: 'Factor de integración', body: 'Vacaciones, aguinaldo, prima vacacional — el factor de integración se calcula automáticamente según la antigüedad del trabajador.' },
      { title: 'Registro de vacaciones y permisos', body: 'Controla los días disponibles por trabajador. Los permisos con y sin goce de sueldo se reflejan en la nómina.' },
    ],
  },
  {
    id: 'multisucursal',
    icon: '🏢',
    name: 'Multi-sucursal',
    tagline: 'Escala sin perder el control de ninguna ubicación.',
    pain: '¿Tienes que visitar cada sucursal para saber cómo le fue?',
    color: '#4a9eff',
    plan: 'Empresa',
    features: [
      { title: 'Dashboard consolidado', body: 'Ventas, COGS, merma y utilidad de todas las sucursales en una sola pantalla. Sin tener que abrir 3 tabs diferentes.' },
      { title: 'Aislamiento real por sucursal', body: 'Cada sucursal tiene sus propias mesas, menú, empleados e inventario. La Mesa 1 del restaurante A no interfiere con la Mesa 1 del restaurante B.' },
      { title: 'Menú unificado o por sucursal', body: 'Puedes tener el mismo menú en todas las ubicaciones o personalizar carta y precios por sucursal.' },
      { title: 'Reportes por sucursal', body: 'Compara el rendimiento entre sucursales. Identifica qué ubicación tiene mejor margen y por qué.' },
    ],
  },
];

const BRAND = {
  mission: 'Dar a cada restaurantero la verdad de su negocio, en tiempo real.',
  vision: 'Que ningún restaurante en México tenga que adivinar si fue rentable.',
  values: [
    { icon: '🔍', title: 'Verdad sin filtros', body: 'El P&L que mostramos incluye la merma, los gastos prorrateados y el costo real de los ingredientes. No hay números bonitos — hay números verdaderos.' },
    { icon: '🤝', title: 'Crecer juntos', body: 'No vendemos módulos. Cuando tu restaurante crece, cambias de plan porque el valor creció contigo. Eso es la Forever Transaction.' },
    { icon: '🇲🇽', title: 'México primero', body: 'Nómina LFT real. CFDI en camino. Precios en MXN. Diseñado para la realidad del restaurantero mexicano, no adaptado de otro mercado.' },
    { icon: '⚡', title: 'Diseño que respeta', body: 'Un mesero en turno de 8 horas no puede perder 2 minutos aprendiendo a usar una pantalla. Cada flujo tiene máximo 3 pasos.' },
  ],
};

// ─── NAV (same as main marketing page) ───────────────────────────────────────
function Nav() {
  return (
    <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 200, height: 60, display: 'flex', alignItems: 'center', padding: '0 clamp(16px,5vw,60px)', background: 'rgba(7,9,15,.9)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,.045)' }}>
      <div style={{ width: '100%', maxWidth: 1200, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <a href="/" style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, fontWeight: 700, color: '#c9963a', letterSpacing: '.03em', display: 'flex', alignItems: 'center', gap: 10 }}>
          <img src="/assets/images/logo_aldente.png" alt="Aldente" style={{ width: 28, height: 28, objectFit: 'contain' }} />
          Aldente
        </a>
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <a href="/#problema" style={{ fontSize: 13, color: 'rgba(240,236,228,.5)' }}>El problema</a>
          <a href="/funcionalidades" style={{ fontSize: 13, color: '#c9963a', fontWeight: 600 }}>Funcionalidades</a>
          <a href="/#planes" style={{ fontSize: 13, color: 'rgba(240,236,228,.5)' }}>Planes</a>
          <a href="/login" style={{ fontSize: 13, color: 'rgba(240,236,228,.7)', padding: '8px 16px', border: '1px solid rgba(240,236,228,.2)', borderRadius: 100 }}>Iniciar sesión</a>
          <a href="/registro" style={{ fontSize: 13, fontWeight: 600, background: '#c9963a', color: '#07090f', padding: '9px 20px', borderRadius: 100 }}>14 días gratis →</a>
        </div>
      </div>
    </nav>
  );
}

export default function FuncionalidadesPage() {
  const [activeModule, setActiveModule] = useState('pos');
  const [filterPlan, setFilterPlan] = useState<string | null>(null);
  const mod = MODULES.find(m => m.id === activeModule) ?? MODULES[0];

  return (
    <div style={{ background: '#07090f', color: '#f0ece4', fontFamily: "'Outfit', system-ui, sans-serif", minHeight: '100vh', overflowX: 'hidden' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400;1,700&family=Outfit:wght@300;400;500;600;700&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        html{scroll-behavior:smooth}
        a{text-decoration:none;color:inherit}
        button{cursor:pointer;font-family:inherit}
        .serif{font-family:'Playfair Display',Georgia,serif}
        .eyebrow{font-size:10px;font-weight:700;letter-spacing:.15em;text-transform:uppercase;color:#c9963a;display:flex;align-items:center;gap:12px}
        .eyebrow::before,.eyebrow::after{content:'';width:24px;height:1px;background:rgba(201,150,58,.35)}
        .wrap{max-width:1200px;margin:0 auto;padding:0 clamp(16px,5vw,60px)}
        .sec{padding:clamp(72px,9vw,120px) clamp(16px,5vw,60px)}
        @keyframes fadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
        @media(max-width:900px){.sidebar-layout{flex-direction:column!important}.sidebar{flex:none!important;width:100%!important;flex-direction:row!important;flex-wrap:wrap!important;gap:8px!important}.mod-btn{flex:0 0 auto!important;padding:8px 14px!important}.detail-panel{min-height:auto!important}}
      `}</style>

      <Nav />

      {/* HERO */}
      <section style={{ paddingTop: 60, background: '#07090f', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(201,150,58,.025) 1px,transparent 1px),linear-gradient(90deg,rgba(201,150,58,.025) 1px,transparent 1px)', backgroundSize: '80px 80px', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 800, height: 400, background: 'radial-gradient(ellipse,rgba(201,150,58,.06) 0%,transparent 65%)', pointerEvents: 'none' }} />
        <div className="wrap" style={{ position: 'relative', padding: 'clamp(80px,10vw,130px) clamp(16px,5vw,60px)', textAlign: 'center' }}>
          <div className="eyebrow" style={{ justifyContent: 'center', marginBottom: 24 }}>Funcionalidades</div>
          <h1 className="serif" style={{ fontSize: 'clamp(40px,6vw,80px)', fontWeight: 700, lineHeight: 1.05, marginBottom: 20 }}>
            No son funciones.<br /><em style={{ color: '#c9963a' }}>Son respuestas.</em>
          </h1>
          <p style={{ fontSize: 'clamp(15px,1.8vw,18px)', fontWeight: 300, color: 'rgba(240,236,228,.6)', maxWidth: 540, margin: '0 auto 40px', lineHeight: 1.75 }}>
            Cada módulo de Aldente nació de una pregunta real que algún dueño de restaurante se hizo sin poder responderla.
          </p>
          {/* Plan filter buttons */}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 16 }}>
            {([['Operación','#4a9eff'],['Negocio','#c9963a'],['Empresa','#a78bfa']] as [string,string][]).map(([p,c])=>(
              <button key={p} onClick={() => {
                const newFilter = filterPlan === p ? null : p;
                setFilterPlan(newFilter);
                // Jump to modules section and select first module of this plan
                const first = MODULES.find(m => !newFilter || m.plan === newFilter);
                if (first) { setActiveModule(first.id); }
                document.getElementById('modulos')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
                style={{ padding: '8px 20px', borderRadius: 100, background: filterPlan === p ? `${c}22` : `${c}10`, border: `1.5px solid ${filterPlan === p ? c : c+'40'}`, fontSize: 12, fontWeight: 700, color: c, letterSpacing: '.06em', textTransform: 'uppercase', cursor: 'pointer', transition: 'all .2s', transform: filterPlan === p ? 'scale(1.05)' : 'scale(1)' }}>
                Plan {p}
              </button>
            ))}
          </div>
          {filterPlan && (
            <div style={{ marginTop: 12, padding: '10px 20px', borderRadius: 12, display: 'inline-block', background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.08)' }}>
              <p style={{ fontSize: 13, color: 'rgba(240,236,228,.55)', fontStyle: 'italic' }}>
                {filterPlan === 'Operación' && 'Para el restaurante que quiere dejar el papel y empezar a operar de forma profesional.'}
                {filterPlan === 'Negocio' && 'Para el restaurante que opera bien y necesita entender su rentabilidad real.'}
                {filterPlan === 'Empresa' && 'Para el restaurante que quiere escalar sin perder el control de ninguna sucursal.'}
              </p>
            </div>
          )}
        </div>
      </section>

      {/* MODULES — sidebar + detail */}
      <section id="modulos" className="sec" style={{ background: '#0d0f17', scrollMarginTop: '80px' }}>
        <div className="wrap">
          {/* Plan context banner */}
          {filterPlan && (() => {
            const planModules = MODULES.filter(m => m.plan === filterPlan);
            const planColors: Record<string, string> = { 'Operación': '#4a9eff', 'Negocio': '#c9963a', 'Empresa': '#a78bfa' };
            const planDescriptions: Record<string, string> = {
              'Operación': 'Estos 3 módulos resuelven el problema más urgente: eliminar el papel, los errores de comanda y la imprecisión del cobro. Con esto tu restaurante ya opera de forma profesional.',
              'Negocio': 'Con la operación resuelta, la siguiente pregunta es: ¿gané dinero hoy? Estos módulos te dan la respuesta exacta — no estimada — con el costo real de cada platillo, los gastos prorrateados y la merma registrada.',
              'Empresa': 'Cuando tienes más de una sucursal, el desafío no es operar — es mantener visibilidad sin perder autonomía. Estos módulos te permiten escalar sin que cada sucursal sea un mundo aparte.',
            };
            const c = planColors[filterPlan];
            return (
              <div style={{ marginBottom: 32, padding: '20px 28px', borderRadius: 16, background: `${c}07`, border: `1px solid ${c}25`, display: 'flex', gap: 20, alignItems: 'flex-start' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', color: c }}>Plan {filterPlan}</span>
                    <span style={{ fontSize: 11, color: 'rgba(240,236,228,.3)' }}>· {planModules.length} módulos</span>
                    <button onClick={() => setFilterPlan(null)}
                      style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'rgba(240,236,228,.3)', cursor: 'pointer', fontSize: 13, padding: '0 4px' }}>
                      × Ver todos
                    </button>
                  </div>
                  <p style={{ fontSize: 14, color: 'rgba(240,236,228,.65)', lineHeight: 1.7 }}>{planDescriptions[filterPlan]}</p>
                </div>
              </div>
            );
          })()}
          <div style={{ display: 'flex', gap: 32, alignItems: 'flex-start' }} className="sidebar-layout">
            {/* Sidebar */}
            <div style={{ flex: '0 0 260px', display: 'flex', flexDirection: 'column', gap: 4, position: 'sticky', top: 80 }} className="sidebar">
              {MODULES.filter(m => !filterPlan || m.plan === filterPlan).map(m => (
                <button key={m.id} className="mod-btn"
                  onClick={() => setActiveModule(m.id)}
                  style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderRadius: 12, background: activeModule === m.id ? `${m.color}10` : 'transparent', border: `1px solid ${activeModule === m.id ? m.color + '30' : 'rgba(255,255,255,0.05)'}`, textAlign: 'left', transition: 'all .2s', width: '100%' }}>
                  <span style={{ fontSize: 18, flexShrink: 0 }}>{m.icon}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: activeModule === m.id ? 600 : 400, color: activeModule === m.id ? '#f0ece4' : 'rgba(240,236,228,.5)', lineHeight: 1.3 }}>{m.name}</p>
                    <p style={{ fontSize: 10, fontWeight: 600, color: activeModule === m.id ? m.color : 'rgba(240,236,228,.25)', letterSpacing: '.08em', textTransform: 'uppercase', marginTop: 2 }}>Plan {m.plan}</p>
                  </div>
                </button>
              ))}
            </div>

            {/* Detail panel */}
            <div style={{ flex: 1, minWidth: 0, animation: 'fadeUp .3s ease both' }} key={activeModule} className="detail-panel">
              {/* Header */}
              <div style={{ padding: '32px 36px', borderRadius: 20, background: `linear-gradient(135deg,${mod.color}08,rgba(255,255,255,.02))`, border: `1px solid ${mod.color}20`, marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
                  <span style={{ fontSize: 36 }}>{mod.icon}</span>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                      <h2 className="serif" style={{ fontSize: 28, fontWeight: 700, color: '#f0ece4' }}>{mod.name}</h2>
                      {mod.featured && <span style={{ fontSize: 10, fontWeight: 700, color: mod.color, padding: '3px 10px', background: `${mod.color}15`, border: `1px solid ${mod.color}30`, borderRadius: 100, letterSpacing: '.08em', textTransform: 'uppercase' }}>Único en México</span>}
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 700, color: mod.color, letterSpacing: '.1em', textTransform: 'uppercase' }}>Plan {mod.plan}</span>
                  </div>
                </div>
                <p className="serif" style={{ fontSize: 20, fontStyle: 'italic', color: 'rgba(240,236,228,.85)', lineHeight: 1.4, marginBottom: 12 }}>{mod.tagline}</p>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 14px', background: 'rgba(239,68,68,.06)', border: '1px solid rgba(239,68,68,.15)', borderRadius: 8 }}>
                  <span style={{ fontSize: 12, color: '#f87171' }}>💬</span>
                  <p style={{ fontSize: 13, color: 'rgba(240,236,228,.55)', fontStyle: 'italic' }}>{mod.pain}</p>
                </div>
              </div>

              {/* Features grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 12 }}>
                {mod.features.map((f, i) => (
                  <div key={i} style={{ padding: '20px 22px', borderRadius: 14, background: 'rgba(255,255,255,.02)', border: '1px solid rgba(255,255,255,.06)', transition: 'border-color .2s' }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = `${mod.color}30`)}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,.06)')}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 8 }}>
                      <span style={{ color: mod.color, fontSize: 12, fontWeight: 700, flexShrink: 0 }}>✓</span>
                      <h3 style={{ fontSize: 14, fontWeight: 600, color: '#f0ece4', lineHeight: 1.3 }}>{f.title}</h3>
                    </div>
                    <p style={{ fontSize: 13, color: 'rgba(240,236,228,.55)', lineHeight: 1.7, paddingLeft: 20 }}>{f.body}</p>
                  </div>
                ))}
              </div>

              {/* CTA */}
              <div style={{ marginTop: 24, display: 'flex', gap: 12, alignItems: 'center' }}>
                <a href="/registro" style={{ padding: '12px 28px', borderRadius: 12, background: mod.color, color: '#07090f', fontSize: 14, fontWeight: 700, border: 'none', cursor: 'pointer', transition: 'all .2s' }}>
                  Probar {mod.name} gratis →
                </a>
                <a href="/#planes" style={{ fontSize: 13, color: 'rgba(240,236,228,.45)', transition: 'color .2s' }}>Ver plan {mod.plan}</a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* BRAND FOUNDATION — Mission, Vision, Values */}
      <section className="sec" style={{ background: '#07090f' }}>
        <div className="wrap">
          <div style={{ textAlign: 'center', marginBottom: 64 }}>
            <div className="eyebrow" style={{ justifyContent: 'center', marginBottom: 20 }}>Quiénes somos</div>
            <h2 className="serif" style={{ fontSize: 'clamp(32px,4vw,52px)', fontWeight: 700, lineHeight: 1.1, marginBottom: 16 }}>
              No somos un software.<br /><em style={{ color: '#c9963a' }}>Somos una relación.</em>
            </h2>
            <p style={{ fontSize: 15, color: 'rgba(240,236,228,.5)', maxWidth: 500, margin: '0 auto', lineHeight: 1.8 }}>
              La Forever Transaction no es un concepto de marketing. Es la manera en que construimos Aldente: pensando en el restaurantero de dentro de 5 años, no en el MRR del próximo trimestre.
            </p>
          </div>

          {/* Mission + Vision */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 48 }}>
            {[
              { label: 'Misión', icon: '🎯', text: BRAND.mission, color: '#c9963a' },
              { label: 'Visión', icon: '🔭', text: BRAND.vision, color: '#4a9eff' },
            ].map(item => (
              <div key={item.label} style={{ padding: '32px 36px', borderRadius: 20, background: `${item.color}06`, border: `1px solid ${item.color}20` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                  <span style={{ fontSize: 24 }}>{item.icon}</span>
                  <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.15em', textTransform: 'uppercase', color: item.color }}>{item.label}</span>
                </div>
                <p className="serif" style={{ fontSize: 22, fontWeight: 400, fontStyle: 'italic', color: '#f0ece4', lineHeight: 1.45 }}>"{item.text}"</p>
              </div>
            ))}
          </div>

          {/* Values */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 14 }}>
            {BRAND.values.map(v => (
              <div key={v.title} style={{ padding: '24px 26px', borderRadius: 16, background: 'rgba(255,255,255,.02)', border: '1px solid rgba(255,255,255,.07)' }}>
                <span style={{ fontSize: 28, display: 'block', marginBottom: 14 }}>{v.icon}</span>
                <h3 style={{ fontSize: 16, fontWeight: 600, color: '#f0ece4', marginBottom: 8 }}>{v.title}</h3>
                <p style={{ fontSize: 13, color: 'rgba(240,236,228,.5)', lineHeight: 1.75 }}>{v.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FOREVER TRANSACTION EXPLANATION */}
      <section className="sec" style={{ background: '#0d0f17' }}>
        <div className="wrap">
          <div style={{ maxWidth: 700, margin: '0 auto', textAlign: 'center' }}>
            <div className="eyebrow" style={{ justifyContent: 'center', marginBottom: 24 }}>The Forever Transaction</div>
            <h2 className="serif" style={{ fontSize: 'clamp(30px,4vw,48px)', fontWeight: 700, lineHeight: 1.12, marginBottom: 20 }}>
              Cuando tu restaurante crece,<br /><em style={{ color: '#c9963a' }}>Aldente crece contigo.</em>
            </h2>
            <p style={{ fontSize: 15, color: 'rgba(240,236,228,.55)', lineHeight: 1.85, marginBottom: 48 }}>
              No vendemos módulos por separado porque no creemos en esa relación. Un restaurante que digitalizó su operación tiene diferentes necesidades a los 6 meses que al principio — y queremos estar ahí para las dos etapas, no cobrarte cada vez que creces.
            </p>
            {/* Journey */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 1 }}>
              {[
                { plan: 'Operación', price: '$799', trigger: 'Cuando decides dejar el papel', what: 'POS + KDS + Mesero Móvil + Caja', color: '#4a9eff' },
                { plan: 'Negocio', price: '$1,499', trigger: 'Cuando quieres saber la verdad', what: '+ Inventario + P&L + Gastos + Lealtad', color: '#c9963a', featured: true },
                { plan: 'Empresa', price: '$2,499', trigger: 'Cuando estás listo para escalar', what: '+ Multi-sucursal + Nómina LFT + RH', color: '#a78bfa' },
              ].map((p, i) => (
                <div key={p.plan} style={{ padding: '28px 24px', background: p.featured ? 'rgba(201,150,58,.06)' : 'rgba(255,255,255,.02)', border: `1px solid ${p.featured ? 'rgba(201,150,58,.25)' : 'rgba(255,255,255,.07)'}`, borderRadius: i === 0 ? '14px 0 0 14px' : i === 2 ? '0 14px 14px 0' : '0', position: 'relative' }}>
                  {p.featured && <div style={{ position: 'absolute', top: -10, left: '50%', transform: 'translateX(-50%)', padding: '3px 14px', borderRadius: 100, background: '#c9963a', fontSize: 9, fontWeight: 700, color: '#07090f', letterSpacing: '.08em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Más elegido</div>}
                  <p style={{ fontSize: 10, fontWeight: 700, color: p.color, letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 8 }}>{p.plan}</p>
                  <p style={{ fontSize: 28, fontWeight: 700, color: '#f0ece4', fontFamily: "'Playfair Display',serif", marginBottom: 4 }}>{p.price}</p>
                  <p style={{ fontSize: 11, color: 'rgba(240,236,228,.35)', marginBottom: 14 }}>/mes</p>
                  <p style={{ fontSize: 12, color: p.color, fontStyle: 'italic', marginBottom: 10 }}>{p.trigger}</p>
                  <p style={{ fontSize: 12, color: 'rgba(240,236,228,.5)', lineHeight: 1.6 }}>{p.what}</p>
                </div>
              ))}
            </div>
            <a href="/registro" style={{ display: 'inline-block', marginTop: 32, padding: '14px 36px', borderRadius: 12, background: '#c9963a', color: '#07090f', fontSize: 15, fontWeight: 700, transition: 'all .2s' }}>
              Empieza con Operación — 14 días gratis →
            </a>
          </div>
        </div>
      </section>

      {/* FOOTER (same as main) */}
      <footer style={{ borderTop: '1px solid rgba(255,255,255,.05)', padding: '36px clamp(16px,5vw,60px)', background: '#07090f' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 20 }}>
          <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 18, fontWeight: 700, color: '#c9963a', letterSpacing: '.03em', display: 'flex', alignItems: 'center', gap: 10 }}>
            <img src="/assets/images/logo_aldente.png" alt="" style={{ width: 24, height: 24, objectFit: 'contain' }} />Aldente
          </div>
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
            {[['soporte@aldente.app','mailto:soporte@aldente.app'],['Planes','/#planes'],['Privacidad','#'],['Acceso admin','/admin/login']].map(([l,h])=>(
              <a key={l} href={h} style={{ fontSize: 12, color: 'rgba(240,236,228,.45)' }}>{l}</a>
            ))}
          </div>
          <p style={{ fontSize: 11, color: 'rgba(240,236,228,.2)' }}>© 2026 Aldente · México</p>
        </div>
      </footer>
    </div>
  );
}
