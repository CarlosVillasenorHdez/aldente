'use client';
import React from 'react';

const FECHA = '4 de mayo de 2025';
const EMPRESA = 'Aldente';
const EMAIL_CONTACTO = 'privacidad@aldenteerp.com';
const DOMICILIO = 'México';

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

export default function PrivacidadPage() {
  return (
    <div style={{ background: '#080b10', minHeight: '100vh' }}>
      <div style={S.wrap}>
        <a href="/" style={S.back}>← Volver al inicio</a>
        <h1 style={S.h1}>Aviso de Privacidad</h1>
        <p style={S.meta}>Última actualización: {FECHA} · {DOMICILIO}</p>

        <p style={S.p}>
          En cumplimiento con lo dispuesto por la <strong>Ley Federal de Protección de Datos Personales en Posesión de los Particulares (LFPDPPP)</strong> y su Reglamento, {EMPRESA} pone a tu disposición el presente Aviso de Privacidad.
        </p>

        <hr style={S.divider} />

        <h2 style={S.h2}>1. Identidad y domicilio del responsable</h2>
        <p style={S.p}>
          <strong>{EMPRESA}</strong>, con domicilio en {DOMICILIO}, es responsable del tratamiento de tus datos personales.
          Para cualquier asunto relacionado con este aviso puedes contactarnos en: <a href={`mailto:${EMAIL_CONTACTO}`} style={{ color: '#d4922a' }}>{EMAIL_CONTACTO}</a>
        </p>

        <h2 style={S.h2}>2. Datos personales que recabamos</h2>
        <p style={S.p}>Para la creación y operación de tu cuenta en Aldente recabamos:</p>
        <ul style={S.ul}>
          <li style={S.li}><strong>Datos de identificación:</strong> nombre completo, nombre del establecimiento.</li>
          <li style={S.li}><strong>Datos de contacto:</strong> correo electrónico, número de teléfono.</li>
          <li style={S.li}><strong>Datos de operación:</strong> órdenes, ventas, inventario, nómina y demás información generada dentro del sistema ERP.</li>
          <li style={S.li}><strong>Datos de acceso:</strong> nombre de usuario y hash SHA-256 del PIN (nunca almacenamos tu PIN en texto plano).</li>
        </ul>
        <p style={S.p}><strong>No recabamos</strong> datos sensibles como información financiera personal, datos de salud o información de menores de edad.</p>

        <h2 style={S.h2}>3. Finalidades del tratamiento</h2>
        <p style={S.p}>Tus datos son utilizados para:</p>
        <ul style={S.ul}>
          <li style={S.li}>Prestarte el servicio de gestión ERP para restaurantes.</li>
          <li style={S.li}>Crear y administrar tu cuenta de usuario y la de tu equipo.</li>
          <li style={S.li}>Enviarte comunicaciones relacionadas con el servicio (activación, vencimiento, soporte).</li>
          <li style={S.li}>Generar reportes operativos y financieros de tu propio negocio.</li>
          <li style={S.li}>Mejorar la plataforma mediante análisis estadístico de uso (sin identificarte individualmente).</li>
        </ul>

        <h2 style={S.h2}>4. Transferencia de datos</h2>
        <p style={S.p}>
          {EMPRESA} no vende, cede ni transfiere tus datos personales a terceros, salvo cuando sea necesario para la prestación del servicio con los siguientes proveedores de infraestructura, quienes actúan como encargados del tratamiento:
        </p>
        <ul style={S.ul}>
          <li style={S.li}><strong>Supabase Inc.</strong> — almacenamiento de base de datos (PostgreSQL en la nube).</li>
          <li style={S.li}><strong>Vercel Inc.</strong> — hospedaje y despliegue de la aplicación.</li>
          <li style={S.li}><strong>Resend Inc.</strong> — envío de correos transaccionales.</li>
        </ul>
        <p style={S.p}>Todos operan bajo políticas de privacidad compatibles con los estándares internacionales.</p>

        <h2 style={S.h2}>5. Derechos ARCO</h2>
        <p style={S.p}>
          Tienes derecho a <strong>Acceder, Rectificar, Cancelar u Oponerte</strong> al tratamiento de tus datos personales (derechos ARCO). Para ejercerlos, envía tu solicitud a <a href={`mailto:${EMAIL_CONTACTO}`} style={{ color: '#d4922a' }}>{EMAIL_CONTACTO}</a> indicando:
        </p>
        <ul style={S.ul}>
          <li style={S.li}>Tu nombre completo y datos de contacto.</li>
          <li style={S.li}>El derecho que deseas ejercer y los datos sobre los que lo solicitas.</li>
          <li style={S.li}>Descripción clara y precisa de tu solicitud.</li>
        </ul>
        <p style={S.p}>Responderemos en un plazo máximo de 20 días hábiles.</p>

        <h2 style={S.h2}>6. Uso de cookies y tecnologías similares</h2>
        <p style={S.p}>
          Aldente utiliza cookies de sesión estrictamente necesarias para el funcionamiento del sistema (autenticación y preferencias). No utilizamos cookies de rastreo publicitario.
        </p>

        <h2 style={S.h2}>7. Retención de datos</h2>
        <p style={S.p}>
          Conservamos tus datos mientras mantengas una cuenta activa. Al cancelar tu suscripción, tus datos operativos se conservarán por 30 días adicionales para permitirte exportarlos, después de lo cual serán eliminados permanentemente de nuestros servidores activos.
        </p>

        <h2 style={S.h2}>8. Cambios a este aviso</h2>
        <p style={S.p}>
          Cualquier modificación a este Aviso de Privacidad se notificará mediante el correo electrónico registrado en tu cuenta con al menos 15 días de anticipación.
        </p>

        <hr style={S.divider} />
        <p style={{ ...S.p, fontSize: 13, color: 'rgba(255,255,255,0.25)' }}>
          © 2025 {EMPRESA} · México · <a href="/" style={{ color: 'rgba(255,255,255,0.25)' }}>aldenteerp.com</a>
        </p>
      </div>
    </div>
  );
}
