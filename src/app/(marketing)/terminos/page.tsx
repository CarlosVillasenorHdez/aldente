'use client';
import React from 'react';

const FECHA = '4 de mayo de 2025';
const EMAIL = 'soporte@aldenteerp.com';

const S = {
  wrap: { maxWidth: 760, margin: '0 auto', padding: '48px 24px 80px', fontFamily: 'DM Sans, system-ui, sans-serif', color: '#e2e8f0', lineHeight: 1.75, fontSize: 15 } as React.CSSProperties,
  h1:   { fontFamily: 'Instrument Serif, serif', fontSize: 36, color: '#f0ede8', marginBottom: 8, letterSpacing: '-0.5px' } as React.CSSProperties,
  meta: { fontSize: 13, color: 'rgba(255,255,255,0.35)', marginBottom: 40 } as React.CSSProperties,
  h2:   { fontSize: 18, fontWeight: 700, color: '#f0ede8', marginTop: 40, marginBottom: 12 } as React.CSSProperties,
  p:    { marginBottom: 16, color: 'rgba(240,237,232,0.75)' } as React.CSSProperties,
  ul:   { paddingLeft: 20, marginBottom: 16, color: 'rgba(240,237,232,0.75)' } as React.CSSProperties,
  li:   { marginBottom: 6 } as React.CSSProperties,
  divider: { borderTop: '1px solid rgba(255,255,255,0.08)', margin: '32px 0' } as React.CSSProperties,
  back: { display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'rgba(255,255,255,0.35)', textDecoration: 'none', marginBottom: 32 } as React.CSSProperties,
};

export default function TerminosPage() {
  return (
    <div style={{ background: '#080b10', minHeight: '100vh' }}>
      <div style={S.wrap}>
        <a href="/" style={S.back}>← Volver al inicio</a>
        <h1 style={S.h1}>Términos de Servicio</h1>
        <p style={S.meta}>Última actualización: {FECHA}</p>

        <p style={S.p}>
          Al registrarte y usar <strong>Aldente</strong> ("el Servicio"), aceptas los presentes Términos de Servicio. Si no estás de acuerdo, no utilices el Servicio.
        </p>

        <hr style={S.divider} />

        <h2 style={S.h2}>1. Descripción del servicio</h2>
        <p style={S.p}>
          Aldente es una plataforma SaaS de gestión para restaurantes que incluye punto de venta (POS), cocina digital (KDS), control de inventario, reportes financieros, nómina y lealtad. El Servicio se presta mediante suscripción mensual o a través de un período de prueba gratuita de 14 días.
        </p>

        <h2 style={S.h2}>2. Registro y responsabilidad de la cuenta</h2>
        <ul style={S.ul}>
          <li style={S.li}>Eres responsable de mantener la confidencialidad de tu PIN y credenciales de acceso.</li>
          <li style={S.li}>Debes proporcionar información verídica al registrarte.</li>
          <li style={S.li}>Eres responsable de todas las acciones realizadas bajo tu cuenta.</li>
          <li style={S.li}>Notifícanos de inmediato si sospechas acceso no autorizado a tu cuenta.</li>
        </ul>

        <h2 style={S.h2}>3. Prueba gratuita y suscripción</h2>
        <p style={S.p}>
          El período de prueba es de <strong>14 días calendario</strong> sin cargo. Al vencer el período de prueba, el Servicio se suspenderá hasta que actives un plan de pago. No se realizan cargos automáticos al terminar la prueba.
        </p>
        <p style={S.p}>
          Las suscripciones son mensuales, renovables automáticamente. Puedes cancelar en cualquier momento; el acceso continúa hasta el fin del período pagado.
        </p>

        <h2 style={S.h2}>4. Propiedad de los datos</h2>
        <p style={S.p}>
          <strong>Tus datos son tuyos.</strong> Toda la información operativa de tu restaurante (órdenes, menú, inventario, empleados) es de tu propiedad. Aldente actúa como procesador de datos bajo tus instrucciones. Al cancelar tu cuenta puedes solicitar una exportación completa de tus datos en formato CSV/JSON dentro de los 30 días posteriores a la cancelación.
        </p>

        <h2 style={S.h2}>5. Uso aceptable</h2>
        <p style={S.p}>Te comprometes a no:</p>
        <ul style={S.ul}>
          <li style={S.li}>Usar el Servicio para actividades ilegales o fraudulentas.</li>
          <li style={S.li}>Intentar acceder a datos de otros restaurantes o tenants.</li>
          <li style={S.li}>Hacer ingeniería inversa o reproducir el software.</li>
          <li style={S.li}>Sobrecargar intencionalmente la infraestructura del Servicio.</li>
        </ul>

        <h2 style={S.h2}>6. Disponibilidad del servicio</h2>
        <p style={S.p}>
          Nos comprometemos a mantener una disponibilidad del 99% mensual. Las interrupciones planificadas por mantenimiento se notificarán con al menos 24 horas de anticipación. No somos responsables de interrupciones causadas por terceros (proveedores de internet, cortes de luz, etc.).
        </p>

        <h2 style={S.h2}>7. Limitación de responsabilidad</h2>
        <p style={S.p}>
          Aldente no será responsable por pérdidas indirectas, lucro cesante o daños emergentes derivados del uso o imposibilidad de uso del Servicio. Nuestra responsabilidad total no excederá el monto pagado por el Servicio en los últimos 3 meses.
        </p>

        <h2 style={S.h2}>8. Modificaciones</h2>
        <p style={S.p}>
          Podemos modificar estos términos notificándote por correo electrónico con al menos 15 días de anticipación. El uso continuado del Servicio tras ese plazo implica aceptación de los nuevos términos.
        </p>

        <h2 style={S.h2}>9. Ley aplicable</h2>
        <p style={S.p}>
          Estos Términos se rigen por las leyes de los <strong>Estados Unidos Mexicanos</strong>. Cualquier controversia se someterá a la jurisdicción de los tribunales competentes de la Ciudad de México.
        </p>

        <h2 style={S.h2}>10. Contacto</h2>
        <p style={S.p}>
          Para dudas sobre estos Términos: <a href={`mailto:${EMAIL}`} style={{ color: '#d4922a' }}>{EMAIL}</a>
        </p>

        <hr style={S.divider} />
        <p style={{ ...S.p, fontSize: 13, color: 'rgba(255,255,255,0.25)' }}>
          © 2025 Aldente · México · <a href="/" style={{ color: 'rgba(255,255,255,0.25)' }}>aldenteerp.com</a>
        </p>
      </div>
    </div>
  );
}
