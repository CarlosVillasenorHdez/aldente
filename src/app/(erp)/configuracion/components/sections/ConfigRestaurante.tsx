'use client';
import { getCurrentTenantId as getTenantId } from '@/lib/tenantStore';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import { Store, Upload, Save, CheckCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { invalidateSysConfigCache } from '@/hooks/useSysConfig';
import { COUNTRY_CURRENCY } from './types';
import Icon from '@/components/ui/AppIcon';


function SectionTitle({ icon: Icon, title }: { icon: React.ElementType; title: string }) {
  return (
    <div className="flex items-center gap-2 mb-5">
      <Icon size={18} style={{ color: '#f59e0b' }} />
      <h2 className="text-base font-bold" style={{ color: '#f1f5f9' }}>{title}</h2>
    </div>
  );
}

function SaveButton({ saved, onClick }: { saved: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all"
      style={{ backgroundColor: saved ? 'rgba(34,197,94,0.15)' : '#f59e0b', color: saved ? '#22c55e' : '#1B3A6B', border: saved ? '1px solid rgba(34,197,94,0.4)' : 'none' }}>
      {saved ? <CheckCircle size={15} /> : <Save size={15} />}
      {saved ? 'Guardado' : 'Guardar cambios'}
    </button>
  );
}


// ─── Carta QR Component ──────────────────────────────────────────────────────
// Generates a real QR code using the qrcode.js library from CDN
// and provides download + share functionality

function QRMenuCard({ tenantSlug }: { tenantSlug: string | null }) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const [qrReady, setQrReady] = React.useState(false);
  const [showModal, setShowModal] = React.useState(false);

  const menuUrl = typeof window !== 'undefined' && tenantSlug
    ? `${window.location.origin}/menu/${tenantSlug}`
    : null;

  // Load qrcode.js from CDN and render QR
  React.useEffect(() => {
    if (!menuUrl || !canvasRef.current) return;
    const loadQR = () => {
      const QRCode = (window as any).QRCode;
      if (!QRCode) return;
      QRCode.toCanvas(canvasRef.current, menuUrl, {
        width: 220, margin: 2,
        color: { dark: '#0f1923', light: '#ffffff' },
      }, (err: any) => { if (!err) setQrReady(true); });
    };
    if ((window as any).QRCode) { loadQR(); return; }
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js';
    script.onload = loadQR;
    document.head.appendChild(script);
  }, [menuUrl]);

  const handleDownload = () => {
    if (!canvasRef.current) return;
    const link = document.createElement('a');
    link.download = `carta-qr-${tenantSlug ?? 'menu'}.png`;
    link.href = canvasRef.current.toDataURL('image/png');
    link.click();
  };

  const handleCopy = () => {
    if (!menuUrl) return;
    navigator.clipboard.writeText(menuUrl).catch(() => {});
  };

  return (
    <>
      <div style={{ marginBottom: 12, padding: '20px', borderRadius: '14px', backgroundColor: 'rgba(96,165,250,0.06)', border: '1px solid rgba(96,165,250,0.2)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
          {/* QR preview */}
          <div style={{ flexShrink: 0, background: '#fff', borderRadius: 10, padding: 8, width: 72, height: 72, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
            <canvas ref={canvasRef} style={{ width: 56, height: 56, display: qrReady ? 'block' : 'none' }} />
            {!qrReady && <span style={{ fontSize: 28 }}>🍽️</span>}
          </div>
          {/* Info */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#60a5fa', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              🍽️ Carta QR — Menú público
            </div>
            <div style={{ fontFamily: 'monospace', fontSize: '12px', color: '#f1f5f9', wordBreak: 'break-all', marginBottom: 8 }}>
              {menuUrl ?? 'Cargando…'}
            </div>
            <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', margin: '0 0 12px', lineHeight: 1.5 }}>
              Tus clientes ven el menú sin instalar nada. Imprime el QR y pégalo en las mesas.
            </p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button onClick={() => setShowModal(true)} style={{ padding: '6px 14px', borderRadius: '8px', border: '1px solid rgba(96,165,250,0.4)', backgroundColor: 'rgba(96,165,250,0.1)', color: '#60a5fa', fontSize: '12px', cursor: 'pointer', fontWeight: 600 }}>
                Ver QR ↗
              </button>
              <button onClick={handleDownload} disabled={!qrReady} style={{ padding: '6px 14px', borderRadius: '8px', border: '1px solid rgba(96,165,250,0.3)', backgroundColor: 'transparent', color: qrReady ? '#60a5fa' : 'rgba(96,165,250,0.3)', fontSize: '12px', cursor: qrReady ? 'pointer' : 'default', fontWeight: 600 }}>
                Descargar PNG
              </button>
              <button onClick={handleCopy} style={{ padding: '6px 14px', borderRadius: '8px', border: '1px solid rgba(96,165,250,0.3)', backgroundColor: 'transparent', color: '#60a5fa', fontSize: '12px', cursor: 'pointer', fontWeight: 600 }}>
                Copiar link
              </button>
              {tenantSlug && (
                <button onClick={() => window.open(`/menu/${tenantSlug}`, '_blank')} style={{ padding: '6px 14px', borderRadius: '8px', border: '1px solid rgba(96,165,250,0.3)', backgroundColor: 'transparent', color: '#60a5fa', fontSize: '12px', cursor: 'pointer', fontWeight: 600 }}>
                  Ver menú ↗
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* QR Modal — pantalla completa para mostrar / imprimir */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
          onClick={() => setShowModal(false)}>
          <div style={{ background: '#fff', borderRadius: 24, padding: 36, maxWidth: 360, width: '100%', textAlign: 'center' }}
            onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: 18, fontWeight: 800, color: '#111', marginBottom: 4 }}>Carta QR</h3>
            <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 24 }}>Escanea para ver el menú</p>
            <QRBigCanvas url={menuUrl ?? ''} />
            <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 16, marginBottom: 24, wordBreak: 'break-all' }}>{menuUrl}</p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={handleDownload} style={{ flex: 1, padding: '12px', borderRadius: 12, background: '#1d4ed8', border: 'none', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                ⬇ Descargar PNG
              </button>
              <button onClick={() => setShowModal(false)} style={{ flex: 1, padding: '12px', borderRadius: 12, background: '#f3f4f6', border: 'none', color: '#374151', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// Large QR for the modal — separate canvas to avoid conflicts
function QRBigCanvas({ url }: { url: string }) {
  const ref = React.useRef<HTMLCanvasElement>(null);
  React.useEffect(() => {
    if (!url || !ref.current) return;
    const draw = () => {
      const QRCode = (window as any).QRCode;
      if (QRCode) QRCode.toCanvas(ref.current, url, { width: 280, margin: 2, color: { dark: '#111827', light: '#ffffff' } }, () => {});
    };
    (window as any).QRCode ? draw() : setTimeout(draw, 500);
  }, [url]);
  return <canvas ref={ref} style={{ borderRadius: 12, maxWidth: '100%' }} />;
}

export default function ConfigRestaurante({ activeSection }: { activeSection: string }) {
  const supabase = createClient();
  const { brandConfig, appUser } = useAuth();

  // Restaurant settings
  const [tenantSlug, setTenantSlug] = useState<string | null>(null);
  const [restaurantName, setRestaurantName] = useState(brandConfig?.restaurantName || 'Mi Restaurante');
  const [restaurantNameDraft, setRestaurantNameDraft] = useState(brandConfig?.restaurantName || 'Mi Restaurante');
  const [logoPreview, setLogoPreview] = useState<string>('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [stateRegion, setStateRegion] = useState('');
  const [phone, setPhone] = useState('');
  const [rfc, setRfc] = useState('');
  const [geocoding, setGeocoding] = useState(false);
  const [geoStatus, setGeoStatus] = useState<'idle'|'ok'|'error'>('idle');
  const [settingsSaved, setSettingsSaved] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [primaryColor, setPrimaryColor] = useState(brandConfig?.primaryColor || '#1B3A6B');
  const [appTheme, setAppTheme] = useState<'dark'|'light'>(brandConfig?.theme || 'dark');

  // Operation settings
  const [ivaPercent, setIvaPercent] = useState(16);
  const [ivaPercentDraft, setIvaPercentDraft] = useState(16);
  const [currencySymbol, setCurrencySymbol] = useState('$');
  const [currencyCode, setCurrencyCode] = useState('MXN');
  const [currencyLocale, setCurrencyLocale] = useState('es-MX');
  const [operacionSaved, setOperacionSaved] = useState(false);

  // Load system config on mount
  useEffect(() => {
    // Load tenant slug for employee link
    if (appUser?.tenantId) {
      supabase.from('tenants').select('slug').eq('id', appUser.tenantId).single()
        .then(({ data }) => { if (data?.slug) setTenantSlug(data.slug); });
    }

    supabase.from('system_config').eq('tenant_id', getTenantId()).select('config_key, config_value').then(({ data }) => {
      if (!data) return;
      const map: Record<string,string> = {};
      data.forEach((r: any) => { map[r.config_key] = r.config_value; });
      if (map.restaurant_name) { setRestaurantName(map.restaurant_name); setRestaurantNameDraft(map.restaurant_name); }
      if (map.brand_primary_color) setPrimaryColor(map.brand_primary_color);
      if (map.brand_logo_url) setLogoPreview(map.brand_logo_url);
      if (map.restaurant_address) setAddress(map.restaurant_address);
      if (map.restaurant_city) setCity(map.restaurant_city);
      if (map.restaurant_state) setStateRegion(map.restaurant_state);
      if (map.restaurant_phone) setPhone(map.restaurant_phone);
      if (map.restaurant_rfc) setRfc(map.restaurant_rfc);
      if (map.brand_theme) setAppTheme(map.brand_theme as 'dark'|'light');
      if (map.iva_percent) { const v = parseFloat(map.iva_percent); setIvaPercent(v); setIvaPercentDraft(v); }
      if (map.currency_symbol) setCurrencySymbol(map.currency_symbol);
      if (map.currency_code) setCurrencyCode(map.currency_code);
      if (map.currency_locale) setCurrencyLocale(map.currency_locale);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function geocodeAddress(addr: string) {
    if (!addr.trim()) return;
    setGeocoding(true); setGeoStatus('idle');
    try {
      // Derive country from currency code for multi-country support
      const COUNTRY_NAMES: Record<string, string> = {
        MXN: 'México', ARS: 'Argentina', COP: 'Colombia',
        CLP: 'Chile', PEN: 'Perú', USD: 'United States',
        EUR: 'España', BRL: 'Brasil', GTQ: 'Guatemala',
        PAB: 'Panamá', CRC: 'Costa Rica', DOP: 'República Dominicana',
      };
      const countryName = COUNTRY_NAMES[currencyCode] ?? 'México';
      const fullAddr = [addr, city, stateRegion, countryName].filter(Boolean).join(', ');
      const q = encodeURIComponent(fullAddr);
      const r = await fetch(`https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1`, {
        headers: { 'Accept-Language': 'es', 'User-Agent': 'Aldente-ERP/1.0' }
      });
      const data = await r.json();
      if (data?.[0]) {
        const { lat, lon } = data[0];
        // Save lat/lng to tenants table
        const supaClient = createClient ? createClient() : supabase;
        await supaClient.from('tenants').update({
          lat: parseFloat(lat), lng: parseFloat(lon),
          address: addr, city, state_region: stateRegion,
        }).eq('id', appUser?.tenantId);
        setGeoStatus('ok');
      } else { setGeoStatus('error'); }
    } catch { setGeoStatus('error'); }
    setGeocoding(false);
  }

  async function handleSaveSettings() {
    const upsertRows: {config_key:string;config_value:string;tenant_id:string|undefined}[] = [
      { config_key: 'restaurant_name',    config_value: restaurantNameDraft, tenant_id: appUser?.tenantId },
      { config_key: 'brand_primary_color',config_value: primaryColor,        tenant_id: appUser?.tenantId },
      { config_key: 'brand_theme',        config_value: appTheme,            tenant_id: appUser?.tenantId },
      { config_key: 'restaurant_address', config_value: address,             tenant_id: appUser?.tenantId },
      { config_key: 'restaurant_phone',   config_value: phone,               tenant_id: appUser?.tenantId },
      { config_key: 'restaurant_city',    config_value: city,                tenant_id: appUser?.tenantId },
      { config_key: 'restaurant_state',   config_value: stateRegion,         tenant_id: appUser?.tenantId },
      { config_key: 'restaurant_rfc',     config_value: rfc,                 tenant_id: appUser?.tenantId },
    ];
    if (logoPreview) {
      upsertRows.push({ config_key: 'brand_logo_url', config_value: logoPreview, tenant_id: appUser?.tenantId });
    }
    await supabase.from('system_config').upsert(upsertRows, { onConflict: 'tenant_id,config_key' });
    setRestaurantName(restaurantNameDraft);
    invalidateSysConfigCache();
    // Auto-geocode if address changed
    if (address.trim()) geocodeAddress(address); // auto-geocode on save
    setSettingsSaved(true);
    setTimeout(() => setSettingsSaved(false), 2500);
    toast.success('Configuración del restaurante guardada');
  }

  async function handleSaveOperacion() {
    const rows = [
      { config_key: 'iva_percent', config_value: String(ivaPercentDraft), tenant_id: appUser?.tenantId },
      { config_key: 'currency_symbol', config_value: currencySymbol, tenant_id: appUser?.tenantId },
      { config_key: 'currency_code', config_value: currencyCode, tenant_id: appUser?.tenantId },
      { config_key: 'currency_locale', config_value: currencyLocale, tenant_id: appUser?.tenantId },
    ];
    await supabase.from('system_config').upsert(rows, { onConflict: 'tenant_id,config_key' });
    setIvaPercent(ivaPercentDraft);
    invalidateSysConfigCache();
    setOperacionSaved(true);
    setTimeout(() => setOperacionSaved(false), 2500);
    toast.success('Parámetros de operación guardados');
  }

  function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setLogoPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  }

  return (
    <div className="max-w-2xl">
      {/* Restaurante */}
      {activeSection === 'restaurante' && <div>
        <SectionTitle icon={Store} title="Información del Restaurante" />
        <div className="rounded-xl p-5 mb-5" style={{ backgroundColor: '#1a2535', border: '1px solid #1e2d3d' }}>
          <label className="block text-sm font-semibold mb-3" style={{ color: 'rgba(255,255,255,0.7)' }}>Logo del Restaurante</label>
          <div className="flex items-center gap-5">
            <div className="w-24 h-24 rounded-xl flex items-center justify-center overflow-hidden flex-shrink-0" style={{ backgroundColor: '#0f1923', border: '2px dashed #2a3f5f' }}>
              {logoPreview ? <img src={logoPreview} alt="Logo" className="w-full h-full object-cover" /> : <Store size={32} style={{ color: 'rgba(255,255,255,0.2)' }} />}
            </div>
            <div>
              <button onClick={() => logoInputRef.current?.click()} className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium" style={{ backgroundColor: 'rgba(245,158,11,0.15)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.3)' }}>
                <Upload size={15} /> Subir Logo
              </button>
              <p className="text-xs mt-2" style={{ color: 'rgba(255,255,255,0.35)' }}>PNG, JPG o SVG. Máx 2 MB.</p>
              <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
            </div>
          </div>
        </div>
        <div className="rounded-xl p-5 mb-5" style={{ backgroundColor: '#1a2535', border: '1px solid #1e2d3d' }}>
          <label className="block text-sm font-semibold mb-1" style={{ color: 'rgba(255,255,255,0.7)' }}>Nombre del restaurante</label>
          <input type="text" value={restaurantNameDraft} onChange={(e) => setRestaurantNameDraft(e.target.value)}
            className="w-full px-4 py-2.5 rounded-lg text-sm outline-none" maxLength={80}
            style={{ backgroundColor: '#0f1923', border: '1px solid #2a3f5f', color: '#f1f5f9' }} />
        </div>
        {/* Access link for employees */}
      <div style={{ marginTop: '24px', padding: '16px', borderRadius: '12px', backgroundColor: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)' }}>
        <div style={{ fontSize: '12px', fontWeight: 600, color: '#f59e0b', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Link de acceso para empleados
        </div>
        <div style={{ fontFamily: 'monospace', fontSize: '13px', color: '#f1f5f9', wordBreak: 'break-all', marginBottom: '10px' }}
          id="employee-link">
          {typeof window !== 'undefined' && tenantSlug ? `${window.location.origin}/r/${tenantSlug}` : 'Cargando...'}
        </div>
        <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', margin: '0 0 10px' }}>
          Comparte este link con tus empleados para que entren al sistema directamente.
        </p>
        <button onClick={() => {
          const link = `${window.location.origin}/r/${tenantSlug ?? ''}`;
          navigator.clipboard.writeText(link).catch(() => {});
        }} style={{ padding: '6px 14px', borderRadius: '8px', border: '1px solid rgba(245,158,11,0.3)', backgroundColor: 'transparent', color: '#f59e0b', fontSize: '12px', cursor: 'pointer', fontWeight: 600 }}>
          Copiar link
        </button>
      </div>

      {/* Carta QR — menú público para clientes */}
      <QRMenuCard tenantSlug={tenantSlug} />

      {/* Información de contacto */}
      <div className="rounded-xl p-5 mb-5" style={{ backgroundColor: '#1a2535', border: '1px solid #1e2d3d' }}>
        <label className="block text-sm font-semibold mb-3" style={{ color: 'rgba(255,255,255,0.7)' }}>Información de contacto</label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label className="block text-xs mb-1" style={{ color: 'rgba(255,255,255,0.45)' }}>Dirección</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input type="text" value={address} onChange={(e) => setAddress(e.target.value)}
                placeholder="Av. Insurgentes Sur 123, Col. Roma"
                className="flex-1 rounded-lg px-3 py-2 text-sm"
                style={{ backgroundColor: '#0f1923', border: '1px solid #2a3f5f', color: '#f1f5f9', outline: 'none' }} />
              <button type="button" onClick={() => geocodeAddress(address)} disabled={geocoding || !address.trim()}
                title="Localizar en el mapa"
                style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid #2a3f5f', background: '#0f1923', color: geoStatus==='ok'?'#34d399':geoStatus==='error'?'#f87171':'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: 12, whiteSpace: 'nowrap', transition: 'all .2s' }}>
                {geocoding ? '⏳' : geoStatus==='ok' ? '✓ Ubicado' : geoStatus==='error' ? '✗ No encontrado' : '📍 Localizar'}
              </button>
            </div>
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 4 }}>
              Se localiza automáticamente al guardar y aparece en el mapa del panel de administración.
            </p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label className="block text-xs mb-1" style={{ color: 'rgba(255,255,255,0.45)' }}>Ciudad</label>
              <input type="text" value={city} onChange={(e) => setCity(e.target.value)}
                placeholder="Ciudad de México"
                className="w-full rounded-lg px-3 py-2 text-sm"
                style={{ backgroundColor: '#0f1923', border: '1px solid #2a3f5f', color: '#f1f5f9', outline: 'none' }} />
            </div>
            <div>
              <label className="block text-xs mb-1" style={{ color: 'rgba(255,255,255,0.45)' }}>Estado / Región</label>
              <input type="text" value={stateRegion} onChange={(e) => setStateRegion(e.target.value)}
                placeholder="CDMX"
                className="w-full rounded-lg px-3 py-2 text-sm"
                style={{ backgroundColor: '#0f1923', border: '1px solid #2a3f5f', color: '#f1f5f9', outline: 'none' }} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label className="block text-xs mb-1" style={{ color: 'rgba(255,255,255,0.45)' }}>Teléfono</label>
              <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="55 1234 5678"
                className="w-full rounded-lg px-3 py-2 text-sm"
                style={{ backgroundColor: '#0f1923', border: '1px solid #2a3f5f', color: '#f1f5f9', outline: 'none' }} />
            </div>
            <div>
              <label className="block text-xs mb-1" style={{ color: 'rgba(255,255,255,0.45)' }}>RFC / ID Fiscal</label>
              <input type="text" value={rfc} onChange={(e) => setRfc(e.target.value.toUpperCase())} maxLength={20}
                placeholder="XAXX010101000"
                className="w-full rounded-lg px-3 py-2 text-sm"
                style={{ backgroundColor: '#0f1923', border: '1px solid #2a3f5f', color: '#f1f5f9', outline: 'none', fontFamily: 'monospace' }} />
            </div>
          </div>
        </div>
      </div>
      </div>}

      {/* Operación */}
      {activeSection === 'operacion' && <div>
        <SectionTitle icon={Store} title="Parámetros de Operación" />
        <div className="rounded-xl p-5 mb-5" style={{ backgroundColor: '#1a2535', border: '1px solid #1e2d3d' }}>
          <label className="block text-sm font-semibold mb-1" style={{ color: 'rgba(255,255,255,0.7)' }}>Porcentaje de IVA</label>
          <p className="text-xs mb-3" style={{ color: 'rgba(255,255,255,0.35)' }}>Impuesto al Valor Agregado aplicado a las ventas</p>
          <div className="flex items-center gap-3">
            <input type="number" min={0} max={100} step={0.5} value={ivaPercentDraft}
              onChange={(e) => setIvaPercentDraft(parseFloat(e.target.value) || 0)}
              className="w-28 px-4 py-2.5 rounded-lg text-sm outline-none"
              style={{ backgroundColor: '#0f1923', border: '1px solid #2a3f5f', color: '#f1f5f9' }} />
            <div className="px-3 py-1.5 rounded-lg text-sm" style={{ backgroundColor: 'rgba(245,158,11,0.1)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.2)' }}>
              IVA: {ivaPercentDraft}%
            </div>
          </div>
        </div>
        <div className="rounded-xl p-5 mb-5" style={{ backgroundColor: '#1a2535', border: '1px solid #1e2d3d' }}>
          <label className="block text-sm font-semibold mb-1" style={{ color: 'rgba(255,255,255,0.7)' }}>Moneda</label>
          <p className="text-xs mb-3" style={{ color: 'rgba(255,255,255,0.35)' }}>Símbolo y código monetario para tickets, reportes y pantallas</p>
          <div className="mb-3">
            <label className="block text-xs mb-1" style={{ color: 'rgba(255,255,255,0.45)' }}>País / Región</label>
            <select onChange={(e) => {
              const entry = COUNTRY_CURRENCY.find(cc => cc.code + '|' + cc.locale === e.target.value);
              if (entry) { setCurrencySymbol(entry.symbol); setCurrencyCode(entry.code); setCurrencyLocale(entry.locale); }
            }} defaultValue=""
              className="w-full px-3 py-2 rounded-lg text-sm outline-none appearance-none"
              style={{ backgroundColor: '#0f1923', border: '1px solid #2a3f5f', color: '#f1f5f9' }}>
              <option value="" disabled>Selecciona un país para autocompletar...</option>
              {COUNTRY_CURRENCY.map(cc => (
                <option key={cc.code + cc.locale} value={cc.code + '|' + cc.locale}>
                  {cc.flag} {cc.name} — {cc.symbol} ({cc.code})
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs mb-1" style={{ color: 'rgba(255,255,255,0.45)' }}>Símbolo</label>
              <input type="text" maxLength={3} value={currencySymbol} onChange={(e) => setCurrencySymbol(e.target.value)}
                placeholder="$" className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                style={{ backgroundColor: '#0f1923', border: '1px solid #2a3f5f', color: '#f1f5f9' }} />
            </div>
            <div>
              <label className="block text-xs mb-1" style={{ color: 'rgba(255,255,255,0.45)' }}>Código</label>
              <input type="text" maxLength={3} value={currencyCode} onChange={(e) => setCurrencyCode(e.target.value.toUpperCase())}
                placeholder="MXN" className="w-full px-3 py-2 rounded-lg text-sm outline-none font-mono"
                style={{ backgroundColor: '#0f1923', border: '1px solid #2a3f5f', color: '#f1f5f9' }} />
            </div>
            <div>
              <label className="block text-xs mb-1" style={{ color: 'rgba(255,255,255,0.45)' }}>Preview</label>
              <div className="px-3 py-2 rounded-lg text-sm font-mono" style={{ backgroundColor: '#0f1923', border: '1px solid #1e2d3d', color: '#f59e0b' }}>
                {currencySymbol}{(1234.5).toLocaleString(currencyLocale, { minimumFractionDigits: 2 })}
              </div>
            </div>
          </div>
        </div>
        <SaveButton saved={operacionSaved} onClick={handleSaveOperacion} />
      </div>}
    </div>
  );
}