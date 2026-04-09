'use client';
import React, { useState } from 'react';

const MODULES = [
  {
    id: 'pos', icon: '🗂️', name: 'Punto de venta',
    plan: 'Operación',
    tagline: 'La primera orden sale bien. Y todas las demás también.',
    body: 'El mapa de mesas es drag & drop — lo configuras igual que tu plano real. Unes mesas con un toque. Cobras en efectivo, tarjeta o mixto. El mesero no tiene que correr a la caja para saber si ya pagaron.',
    details: ['Mapa de mesas drag & drop', 'Unión de mesas en tiempo real', 'Pagos mixtos: efectivo, tarjeta, transferencia', 'Descuentos por item o por total', 'Propinas registradas por mesero', 'Corte de caja en 30 segundos', 'Historial de órdenes por turno'],
    insight: 'El error más caro en un restaurante no es el platillo mal preparado — es la comanda que nunca llegó a cocina.',
  },
  {
    id: 'kds', icon: '📺', name: 'Cocina digital (KDS)',
    plan: 'Operación',
    tagline: 'Cero papel en cocina. Cero comandas perdidas.',
    body: 'Cada orden que manda el mesero aparece en la pantalla de cocina al instante. El semáforo verde/amarillo/rojo indica cuánto tiempo lleva cada platillo. El cocinero marca listo y el mesero recibe la señal.',
    details: ['Órdenes en tiempo real sin papel', 'Semáforo: verde < 8 min, amarillo 8–15, rojo > 15', 'Alertas sonoras para órdenes nuevas', 'Kanban: pendiente → preparando → listo', 'Cancelaciones con razón y merma registrada', 'Vista separada por estación (cocina fría, parrilla)', 'Historial de tiempos por platillo y turno'],
    insight: 'Una comanda en papel puede perderse. Una pantalla no.',
  },
  {
    id: 'mesero', icon: '📱', name: 'Mesero móvil',
    plan: 'Operación',
    tagline: 'El mesero ordena desde su celular. Sin app store. Sin instalación.',
    body: 'PWA — se instala como app desde el navegador en 10 segundos. El mesero navega el menú, agrega modificadores, envía a cocina y ve el estado de cada platillo. Funciona offline si se cae el internet.',
    details: ['Instalación en 10 segundos desde el navegador', 'Sin App Store ni Google Play', 'Menú completo con fotos y modificadores', 'Envío a cocina desde la mesa', 'Estado de cada platillo en tiempo real', 'Funciona sin internet (offline-first)', 'Login por PIN — sin contraseñas'],
    insight: 'Cada viaje del mesero a la barra que se elimina son 40 segundos de tiempo de servicio recuperados.',
  },
  {
    id: 'inventario', icon: '📦', name: 'Inventario vivo',
    plan: 'Negocio',
    tagline: 'Cada platillo vendido descuenta su receta. Automáticamente.',
    body: 'No actualizas el inventario manualmente. Cuando se vende una Hamburguesa, el sistema descuenta 200g de carne, 1 bolsa de pan, 20g de queso. Cuando se cancela, registra el ingrediente consumido como merma con costo real.',
    details: ['Descuento automático por receta al vender', 'Merma real por ingrediente al cancelar', 'Alertas de stock bajo antes de quedarse sin nada', 'Punto de reorden calculado del historial real', 'Lista de compras automática en checklist', 'Exportación a PDF de lo que hay que comprar', 'Historial de entradas y salidas por ingrediente', 'Ficha por ingrediente con gráfica de consumo', 'Presentaciones de compra (bolsa, caja, costal)'],
    insight: 'La merma no controlada es el gasto invisible más caro de un restaurante.',
  },
  {
    id: 'pl', icon: '📊', name: 'P&L en tiempo real',
    plan: 'Negocio',
    tagline: '¿Cuánto gané hoy? La respuesta exacta, no la estimada.',
    body: 'El P&L no es un reporte para el contador. Es el número que el dueño necesita saber a las 11 de la noche antes de cerrar. Ventas menos COGS menos gastos del día prorrateados menos merma. Eso es la utilidad real.',
    details: ['COGS real calculado desde recetas', 'Gastos prorrateados al período (día/semana/mes)', 'Merma incluida como línea separada', 'Punto de equilibrio dinámico en gráfica', 'Ticket promedio y órdenes por hora', 'Comparativa período anterior', 'Exportación a PDF ejecutivo por sucursal'],
    insight: 'La diferencia entre "tuve un buen día de ventas" y "gané dinero hoy" vale más que cualquier reporte mensual.',
  },
  {
    id: 'gastos', icon: '💳', name: 'Gastos y depreciaciones',
    plan: 'Negocio',
    tagline: 'Los gastos que no controlas son los que te hunden.',
    body: 'Renta, gas, luz, nómina fija — todos los gastos recurrentes registrados con su fecha de vencimiento y frecuencia. El sistema los proratea al día automáticamente para incluirlos en el P&L diario.',
    details: ['Gastos recurrentes con fecha de vencimiento', 'Alertas de pagos próximos a vencer', 'Registro de pagos con comprobante', 'Prorrateado automático al período del P&L', 'Depreciaciones de equipo', 'Categorías de gasto personalizables', 'Historial completo de pagos'],
    insight: 'Un gasto sin fecha de vencimiento es una deuda que ya olvidaste.',
  },
  {
    id: 'reservaciones', icon: '📅', name: 'Reservaciones',
    plan: 'Negocio',
    tagline: 'De la reservación a la mesa activa en un toque.',
    body: 'El cliente llama, capturas la reservación con nombre, número de personas y hora. Cuando llegan, el botón "Sentar" abre la mesa directamente en el POS — sin pasos extra, sin buscar en papel.',
    details: ['Registro de reservaciones con datos del cliente', 'Vista de calendario por día', 'Botón Sentar → POS directo', 'Control de capacidad por franja horaria', 'Notas de preferencias del cliente', 'Historial de asistencia y cancelaciones'],
    insight: 'Una mesa reservada que no se activa en el POS es un ingreso que el sistema no puede medir.',
  },
  {
    id: 'lealtad', icon: '⭐', name: 'Programa de lealtad',
    plan: 'Negocio',
    tagline: 'El cliente que regresa vale 5 veces más que el nuevo.',
    body: 'Puntos por consumo, niveles de membresía, recompensas canjeables. Todo configurable sin programadores. El cliente acumula, el dueño ve quiénes son sus mejores clientes y qué los hace regresar.',
    details: ['Puntos por monto o por visita', 'Niveles de membresía configurables', 'Recompensas canjeables en POS', 'Historial de transacciones por cliente', 'Perfil de cliente con preferencias', 'Análisis de frecuencia de visita'],
    insight: 'El costo de retener a un cliente es 5 veces menor que el de adquirir uno nuevo.',
  },
  {
    id: 'nomina', icon: '👥', name: 'Nómina y RH (LFT)',
    plan: 'Empresa',
    tagline: 'El único POS de restaurantes con nómina LFT validada.',
    body: 'Horas extra con factor 2x (Art. 67), horas en día de descanso 2x + prima dominical (Art. 73/75), séptimo día (Art. 69), vacaciones proporcionales (Art. 76). El sistema valida y calcula automáticamente.',
    details: ['Horas extra Art. 67 — factor 2x/3x automático', 'Prima dominical Art. 75 — 25% adicional', 'Séptimo día Art. 69 — validación en DB', 'Vacaciones proporcionales Art. 76', 'Control de asistencias y permisos', 'Historial de nómina por período', 'Cálculo de ISR y percepciones'],
    insight: 'Nadie más en el mercado de POS para restaurantes tiene nómina LFT integrada. Cero.',
  },
  {
    id: 'multi', icon: '🏢', name: 'Multi-sucursal',
    plan: 'Empresa',
    tagline: 'Cada sucursal opera sola. Tú ves todo desde un lugar.',
    body: 'Cada sucursal tiene sus propias mesas, su propio menú, su propio equipo. Los datos están aislados — un mesero de la Sucursal Norte no ve las órdenes de la Sur. Tú tienes el dashboard consolidado.',
    details: ['Dashboard consolidado multi-sucursal', 'Aislamiento real de datos por sucursal (RLS)', 'Mesas independientes por sucursal', 'Menú compartido o independiente', 'Reportes comparativos entre sucursales', 'Gestión de usuarios por sucursal', 'P&L por sucursal y consolidado'],
    insight: 'El error más caro de escalar: perder visibilidad cuando abres la segunda sucursal.',
  },
];

const PRINCIPLES = [
  {
    n: '01',
    title: 'Cada función resuelve un problema real, no añade complejidad.',
    body: 'Antes de agregar cualquier módulo, nos preguntamos: ¿qué pregunta del dueño resuelve esto? Si la respuesta no es clara en una oración, no va.',
  },
  {
    n: '02',
    title: 'El sistema crece con el restaurante, no al revés.',
    body: 'Empiezas con lo esencial para operar. Cuando quieres entender tu rentabilidad, subes de plan. Cuando quieres escalar, subes de nuevo. Sin módulos sueltos, sin sorpresas.',
  },
  {
    n: '03',
    title: 'La rentabilidad es un número, no un reporte.',
    body: 'El P&L no debería requerir a tu contador. Debe ser el número que ves en 30 segundos al final del turno. Con el costo real, no el estimado.',
  },
  {
    n: '04',
    title: 'Hecho en México, para México.',
    body: 'LFT Art. 67/68/69/75. CFDI 4.0 en camino. Pesos mexicanos. Ingredientes en gramos y mililitros, no en onzas. El sistema habla el idioma real de tu operación.',
  },
];

const PLAN_MAP: Record<string, { color: string; order: number }> = {
  'Operación': { color: '#4a9eff', order: 1 },
  'Negocio':   { color: '#c9963a', order: 2 },
  'Empresa':   { color: '#a78bfa', order: 3 },
};

export default function FuncionalidadesPage() {
  const [active, setActive] = useState<string | null>(null);
  const [filterPlan, setFilterPlan] = useState<string | null>(null);

  const filtered = filterPlan ? MODULES.filter(m => m.plan === filterPlan) : MODULES;

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
        @keyframes fadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
        @media(max-width:800px){.module-grid{grid-template-columns:1fr!important}.detail-inner{flex-direction:column!important}}
      `}</style>

      {/* NAV */}
      <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 200, height: 60, display: 'flex', alignItems: 'center', padding: '0 clamp(16px,5vw,60px)', background: 'rgba(7,9,15,.9)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,.045)' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <a href="/" style={{ fontFamily: "'Playfair Display',serif", fontSize: 20, fontWeight: 700, color: '#c9963a', letterSpacing: '.03em', display: 'flex', alignItems: 'center', gap: 10 }}>
            <img src="/assets/images/logo_aldente.png" alt="" style={{ width: 28, height: 28, objectFit: 'contain' }} />
            Aldente
          </a>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <a href="/#planes" style={{ fontSize: 13, color: 'rgba(240,236,228,.5)' }}>Planes y precios</a>
            <a href="/login" style={{ fontSize: 13, color: 'rgba(240,236,228,.6)', padding: '8px 18px', borderRadius: 100, border: '1px solid rgba(255,255,255,.12)', transition: 'all .2s' }}>Iniciar sesión</a>
            <a href="/registro" style={{ fontSize: 13, fontWeight: 600, padding: '9px 22px', borderRadius: 100, background: '#c9963a', color: '#07090f', border: 'none' }}>Prueba gratis</a>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section style={{ paddingTop: 60, padding: 'clamp(100px,12vw,160px) clamp(16px,5vw,60px) clamp(60px,7vw,100px)', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(201,150,58,.02) 1px,transparent 1px),linear-gradient(90deg,rgba(201,150,58,.02) 1px,transparent 1px)', backgroundSize: '80px 80px', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', top: '20%', left: '60%', width: 600, height: 400, background: 'radial-gradient(ellipse,rgba(201,150,58,.06) 0%,transparent 65%)', pointerEvents: 'none' }} />
        <div style={{ maxWidth: 1200, margin: '0 auto', position: 'relative' }}>
          <div className="eyebrow" style={{ marginBottom: 24 }}>Todo lo que hace Aldente</div>
          <div style={{ display: 'flex', gap: 60, alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <div style={{ flex: '0 0 520px', maxWidth: 520 }}>
              <h1 className="serif" style={{ fontSize: 'clamp(40px,6vw,72px)', fontWeight: 700, lineHeight: 1.05, marginBottom: 20 }}>
                Funcionalidades que<br /><em style={{ color: '#c9963a' }}>resuelven problemas.</em><br />No relleno.
              </h1>
              <p style={{ fontSize: 16, fontWeight: 300, color: 'rgba(240,236,228,.6)', lineHeight: 1.8, maxWidth: 440 }}>
                Cada módulo nació de una pregunta real de un dueño de restaurante. Si no resuelve un problema concreto, no está aquí.
              </p>
            </div>
            <div style={{ flex: 1, minWidth: 240 }}>
              {PRINCIPLES.map(p => (
                <div key={p.n} style={{ display: 'flex', gap: 16, marginBottom: 20, paddingBottom: 20, borderBottom: '1px solid rgba(255,255,255,.05)' }}>
                  <span style={{ fontFamily: 'monospace', fontSize: 10, color: '#c9963a', fontWeight: 700, flexShrink: 0, marginTop: 2 }}>{p.n}</span>
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 600, color: '#f0ece4', marginBottom: 4, lineHeight: 1.4 }}>{p.title}</p>
                    <p style={{ fontSize: 13, color: 'rgba(240,236,228,.45)', lineHeight: 1.65 }}>{p.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* PLAN FILTER */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,.05)', borderBottom: '1px solid rgba(255,255,255,.05)', padding: '14px clamp(16px,5vw,60px)', background: 'rgba(255,255,255,.015)', position: 'sticky', top: 60, zIndex: 100, backdropFilter: 'blur(12px)' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 11, color: 'rgba(240,236,228,.4)', marginRight: 4 }}>Filtrar por plan:</span>
          {[null, 'Operación', 'Negocio', 'Empresa'].map(p => (
            <button key={p ?? 'all'} onClick={() => setFilterPlan(p)}
              style={{ padding: '5px 14px', borderRadius: 100, fontSize: 12, fontWeight: 600, border: `1px solid ${filterPlan === p ? (p ? PLAN_MAP[p].color : '#f0ece4') : 'rgba(255,255,255,.1)'}`, background: filterPlan === p ? (p ? `${PLAN_MAP[p].color}18` : 'rgba(255,255,255,.08)') : 'transparent', color: filterPlan === p ? (p ? PLAN_MAP[p].color : '#f0ece4') : 'rgba(240,236,228,.4)', transition: 'all .2s', cursor: 'pointer' }}>
              {p ?? 'Todos'}
            </button>
          ))}
          <span style={{ marginLeft: 'auto', fontSize: 12, color: 'rgba(240,236,228,.3)' }}>{filtered.length} módulo{filtered.length !== 1 ? 's' : ''}</span>
        </div>
      </div>

      {/* MODULES GRID */}
      <section style={{ padding: 'clamp(48px,6vw,80px) clamp(16px,5vw,60px)' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(340px,1fr))', gap: 12 }} className="module-grid">
          {filtered.map(m => {
            const planColor = PLAN_MAP[m.plan]?.color ?? '#c9963a';
            const isActive = active === m.id;
            return (
              <div key={m.id}
                style={{ borderRadius: 18, border: `1px solid ${isActive ? planColor + '40' : 'rgba(255,255,255,.07)'}`, background: isActive ? `${planColor}06` : 'rgba(255,255,255,.025)', overflow: 'hidden', transition: 'all .25s', cursor: 'pointer' }}
                onClick={() => setActive(isActive ? null : m.id)}>
                <div style={{ padding: '24px 24px 20px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ fontSize: 28, width: 44, height: 44, borderRadius: 12, background: `${planColor}12`, border: `1px solid ${planColor}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{m.icon}</div>
                      <div>
                        <h3 style={{ fontSize: 15, fontWeight: 700, color: '#f0ece4', margin: '0 0 2px' }}>{m.name}</h3>
                        <span style={{ fontSize: 10, fontWeight: 700, color: planColor, letterSpacing: '.08em', textTransform: 'uppercase' }}>Plan {m.plan}</span>
                      </div>
                    </div>
                    <span style={{ color: isActive ? planColor : 'rgba(255,255,255,.2)', fontSize: 18, transition: 'all .2s', transform: isActive ? 'rotate(90deg)' : 'none' }}>›</span>
                  </div>
                  <p className="serif" style={{ fontSize: 15, fontStyle: 'italic', color: isActive ? '#f0ece4' : 'rgba(240,236,228,.65)', lineHeight: 1.4, marginBottom: 8 }}>{m.tagline}</p>
                  <p style={{ fontSize: 13, color: 'rgba(240,236,228,.45)', lineHeight: 1.65 }}>{m.body}</p>
                </div>

                {/* Expanded detail */}
                {isActive && (
                  <div style={{ borderTop: `1px solid ${planColor}20`, padding: '20px 24px 24px', background: `${planColor}04` }}>
                    <div style={{ display: 'flex', gap: 28, flexWrap: 'wrap' }} className="detail-inner">
                      <div style={{ flex: 1, minWidth: 200 }}>
                        <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: planColor, marginBottom: 12 }}>Incluye</p>
                        <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 7 }}>
                          {m.details.map(d => (
                            <li key={d} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                              <span style={{ color: planColor, flexShrink: 0, fontSize: 12, marginTop: 1, fontWeight: 700 }}>✓</span>
                              <span style={{ fontSize: 13, color: 'rgba(240,236,228,.75)', lineHeight: 1.5 }}>{d}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div style={{ flex: '0 0 200px', maxWidth: 220 }}>
                        <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: planColor, marginBottom: 12 }}>El insight</p>
                        <div style={{ padding: '16px', borderRadius: 12, background: `${planColor}10`, border: `1px solid ${planColor}25` }}>
                          <p className="serif" style={{ fontSize: 14, color: '#f0ece4', lineHeight: 1.55, fontStyle: 'italic' }}>"{m.insight}"</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* MISSION / VISION / VALUES */}
      <section style={{ padding: 'clamp(60px,8vw,110px) clamp(16px,5vw,60px)', background: '#0d0f17', borderTop: '1px solid rgba(255,255,255,.05)' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div className="eyebrow" style={{ justifyContent: 'center', marginBottom: 52 }}>Quiénes somos</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 2 }}>
            {[
              {
                label: 'Misión',
                icon: '◎',
                text: 'Darle a cada dueño de restaurante la misma visibilidad financiera que tiene una cadena de 50 sucursales — sin importar si tiene 4 mesas o 40.',
              },
              {
                label: 'Visión',
                icon: '◈',
                text: 'Ser el sistema de gestión que los restauranteros mexicanos elijan no porque son los únicos, sino porque son los que realmente entienden su negocio.',
              },
              {
                label: 'Propuesta única',
                icon: '◇',
                text: 'La única plataforma que combina POS operativo, rentabilidad real en tiempo real y nómina LFT en un solo precio sin módulos adicionales.',
              },
            ].map((item, i) => (
              <div key={item.label} style={{ padding: '36px 32px', background: 'rgba(255,255,255,.02)', border: '1px solid rgba(255,255,255,.06)', borderRadius: i === 0 ? '16px 0 0 16px' : i === 2 ? '0 16px 16px 0' : 0 }}>
                <div style={{ fontSize: 22, color: '#c9963a', marginBottom: 16 }}>{item.icon}</div>
                <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase', color: '#c9963a', marginBottom: 12 }}>{item.label}</p>
                <p style={{ fontSize: 15, color: 'rgba(240,236,228,.75)', lineHeight: 1.8, fontWeight: 300 }}>{item.text}</p>
              </div>
            ))}
          </div>

          {/* Values */}
          <div style={{ marginTop: 32, display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 12 }}>
            {[
              { v: 'Honestidad radical', d: 'El P&L no miente. El sistema tampoco.' },
              { v: 'Simplicidad operativa', d: 'Si el cocinero necesita 3 pasos para hacer algo, son 2 de más.' },
              { v: 'Hecho en México', d: 'LFT, pesos, ingredientes en gramos. Sin traducciones forzadas.' },
              { v: 'Forever Transaction', d: 'No vendemos software. Construimos una relación que crece con tu negocio.' },
            ].map(item => (
              <div key={item.v} style={{ padding: '20px 22px', borderRadius: 12, border: '1px solid rgba(255,255,255,.06)', background: 'rgba(255,255,255,.02)' }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: '#f0ece4', marginBottom: 6 }}>{item.v}</p>
                <p style={{ fontSize: 12, color: 'rgba(240,236,228,.4)', lineHeight: 1.65 }}>{item.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: 'clamp(72px,9vw,120px) clamp(16px,5vw,60px)', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(201,150,58,.025) 1px,transparent 1px),linear-gradient(90deg,rgba(201,150,58,.025) 1px,transparent 1px)', backgroundSize: '80px 80px', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 700, height: 400, background: 'radial-gradient(ellipse,rgba(201,150,58,.06) 0%,transparent 65%)', pointerEvents: 'none' }} />
        <div style={{ position: 'relative', maxWidth: 580, margin: '0 auto' }}>
          <h2 className="serif" style={{ fontSize: 'clamp(36px,5vw,60px)', fontWeight: 700, lineHeight: 1.1, marginBottom: 20 }}>
            ¿Listo para saber<br /><em style={{ color: '#c9963a' }}>exactamente qué pasa</em><br />en tu restaurante?
          </h2>
          <p style={{ fontSize: 16, color: 'rgba(240,236,228,.5)', marginBottom: 40, lineHeight: 1.75 }}>14 días gratis. Sin tarjeta. Configurado el mismo día.</p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <a href="/registro" style={{ padding: '14px 36px', borderRadius: 100, background: '#c9963a', color: '#07090f', fontSize: 15, fontWeight: 700, border: 'none', transition: 'all .2s' }}>
              Empezar gratis →
            </a>
            <a href="/#planes" style={{ padding: '14px 28px', borderRadius: 100, background: 'transparent', color: 'rgba(240,236,228,.6)', fontSize: 15, border: '1px solid rgba(255,255,255,.12)', transition: 'all .2s' }}>
              Ver planes y precios
            </a>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ borderTop: '1px solid rgba(255,255,255,.05)', padding: '32px clamp(16px,5vw,60px)', background: '#07090f' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 18, fontWeight: 700, color: '#c9963a', display: 'flex', alignItems: 'center', gap: 8 }}>
            <img src="/assets/images/logo_aldente.png" alt="" style={{ width: 22, height: 22, objectFit: 'contain' }} />Aldente
          </div>
          <div style={{ display: 'flex', gap: 20 }}>
            {[['Inicio', '/'], ['Funcionalidades', '/funcionalidades'], ['Planes', '/#planes'], ['Login', '/login']].map(([l, h]) => (
              <a key={l} href={h} style={{ fontSize: 12, color: 'rgba(240,236,228,.35)', transition: 'color .2s' }}
                onMouseEnter={e => (e.currentTarget.style.color = 'rgba(240,236,228,.7)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'rgba(240,236,228,.35)')}>{l}</a>
            ))}
          </div>
          <p style={{ fontSize: 11, color: 'rgba(240,236,228,.18)' }}>© 2026 Aldente · México</p>
        </div>
      </footer>
    </div>
  );
}
