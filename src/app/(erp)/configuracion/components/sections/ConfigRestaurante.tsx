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
  const canvasRef = React.useRef<HTMLDivElement>(null);
  const [qrReady, setQrReady] = React.useState(false);
  const [showModal, setShowModal] = React.useState(false);

  const menuUrl = typeof window !== 'undefined' && tenantSlug
    ? `${window.location.origin}/carta/${tenantSlug}`
    : null;

  // Load qrcode.js from CDN and render QR
  React.useEffect(() => {
    if (!menuUrl) return;
    let destroyed = false;
    const loadQR = () => {
      if (destroyed || !canvasRef.current) return;
      const QRCode = (window as any).QRCode;
      if (!QRCode) return;
      try {
        canvasRef.current.innerHTML = '';
        new QRCode(canvasRef.current, {
          text: menuUrl!,
          width: 200, height: 200,
          colorDark: '#0f1923', colorLight: '#ffffff',
          correctLevel: QRCode.CorrectLevel?.M ?? 0,
        });
        if (!destroyed) setQrReady(true);
      } catch { /* not ready */ }
    };
    if ((window as any).QRCode) { loadQR(); }
    else {
      const existing = document.querySelector('script[src*="qrcodejs"]');
      if (existing) { existing.addEventListener('load', loadQR); }
      else {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js';
        script.onload = loadQR;
        document.head.appendChild(script);
      }
    }
    return () => { destroyed = true; };
  }, [menuUrl]);

  const handleDownload = () => {
    if (!canvasRef.current) return;
    // qrcodejs renders an <img> inside the container div
    const img = canvasRef.current.querySelector('img') as HTMLImageElement | null;
    const canvas = canvasRef.current.querySelector('canvas') as HTMLCanvasElement | null;
    const link = document.createElement('a');
    link.download = `carta-qr-${tenantSlug ?? 'menu'}.png`;
    if (img) {
      link.href = img.src;
    } else if (canvas) {
      link.href = canvas.toDataURL('image/png');
    } else return;
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
            <div ref={canvasRef} style={{ width: 56, height: 56, display: qrReady ? 'block' : 'none', overflow:'hidden' }} />
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
                <button onClick={() => window.open(`/carta/${tenantSlug}`, '_blank')} style={{ padding: '6px 14px', borderRadius: '8px', border: '1px solid rgba(96,165,250,0.3)', backgroundColor: 'transparent', color: '#60a5fa', fontSize: '12px', cursor: 'pointer', fontWeight: 600 }}>
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
  const ref = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (!url) return;
    let destroyed = false;
    const draw = () => {
      if (destroyed || !ref.current) return;
      const QRCode = (window as any).QRCode;
      if (!QRCode) return;
      try {
        // qrcodejs API: new QRCode(element, options)
        ref.current!.innerHTML = '';
        new QRCode(ref.current, {
          text: url,
          width: 280, height: 280,
          colorDark: '#111827', colorLight: '#ffffff',
          correctLevel: QRCode.CorrectLevel.M,
        });
      } catch { /* canvas not ready */ }
    };
    if ((window as any).QRCode) { draw(); }
    else {
      const t = setTimeout(draw, 600);
      return () => { destroyed = true; clearTimeout(t); };
    }
    return () => { destroyed = true; };
  }, [url]);
  return <div ref={ref} style={{ borderRadius: 12, maxWidth: '100%', overflow:'hidden', display:'inline-block' }} />;
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
  const [colonia, setColonia] = useState('');
  const [postalCode, setPostalCode] = useState('');
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
    // Load tenant data including address fields
    if (appUser?.tenantId) {
      supabase.from('tenants')
        .select('slug, address, city, state_region, colonia, postal_code')
        .eq('id', appUser.tenantId).single()
        .then(({ data }) => {
          if (!data) return;
          if (data.slug) setTenantSlug(data.slug);
          if (data.address) setAddress(data.address);
          if (data.city) setCity(data.city);
          if (data.state_region) setStateRegion(data.state_region);
          if (data.colonia) setColonia(data.colonia);
          if (data.postal_code) setPostalCode(data.postal_code);
        });
    }

    supabase.from('system_config').select('config_key, config_value').eq('tenant_id', getTenantId()).then(({ data }: { data: any }) => {
      if (!data) return;
      const map: Record<string,string> = {};
      data.forEach((r: any) => { map[r.config_key] = r.config_value; });
      if (map.restaurant_name) { setRestaurantName(map.restaurant_name); setRestaurantNameDraft(map.restaurant_name); }
      if (map.restaurant_colonia) setColonia(map.restaurant_colonia);
      if (map.restaurant_postal_code) setPostalCode(map.restaurant_postal_code);
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
      const buildQuery = (mode: 'structured' | 'freetext') => {
        const p = new URLSearchParams({ format: 'json', limit: '3', addressdetails: '1', 'accept-language': 'es' });
        if (mode === 'structured') {
          if (addr) p.append('street', addr);
          if (colonia) p.append('neighbourhood', colonia);
          if (postalCode) p.append('postalcode', postalCode);
          if (city) p.append('city', city);
          if (stateRegion) p.append('state', stateRegion);
          p.append('country', 'México');
        } else {
          const parts = [addr, colonia, postalCode, city, stateRegion, 'México'].filter(Boolean);
          p.append('q', parts.join(', '));
        }
        return p;
      };
      const headers = { 'Accept-Language': 'es' };
      let data: any[] = [];
      try {
        const r1 = await fetch(`https://nominatim.openstreetmap.org/search?${buildQuery('structured').toString()}`, { headers });
        data = await r1.json();
      } catch { /* ignore */ }
      if (!data?.length) {
        try {
          const r2 = await fetch(`https://nominatim.openstreetmap.org/search?${buildQuery('freetext').toString()}`, { headers });
          data = await r2.json();
        } catch { /* ignore */ }
      }
      if (data?.[0]) {
        const { lat, lon } = data[0];
        await supabase.from('tenants').update({
          lat: parseFloat(lat), lng: parseFloat(lon),
          address: addr, city, state_region: stateRegion,
          colonia, postal_code: postalCode,
        }).eq('id', appUser?.tenantId);
        setGeoStatus('ok');
      } else { setGeoStatus('error'); }
    } catch { setGeoStatus('error'); }
    setGeocoding(false);
  }

  async function handleSaveSettings() {
    const upsertRows: {config_key:string;config_value:string|null|undefined;tenant_id:string|null|undefined}[] = [
      { config_key: 'restaurant_name',    config_value: restaurantNameDraft ?? '', tenant_id: appUser?.tenantId },
      { config_key: 'brand_primary_color',config_value: primaryColor ?? '',   tenant_id: appUser?.tenantId },
      { config_key: 'brand_theme',        config_value: appTheme ?? '',       tenant_id: appUser?.tenantId },
      { config_key: 'restaurant_address', config_value: address,             tenant_id: appUser?.tenantId },
      { config_key: 'restaurant_phone',   config_value: phone,               tenant_id: appUser?.tenantId },
      { config_key: 'restaurant_colonia',    config_value: colonia ?? '',      tenant_id: appUser?.tenantId },
      { config_key: 'restaurant_postal_code',config_value: postalCode ?? '',   tenant_id: appUser?.tenantId },
      { config_key: 'restaurant_city',    config_value: city ?? '',          tenant_id: appUser?.tenantId },
      { config_key: 'restaurant_state',   config_value: stateRegion ?? '',   tenant_id: appUser?.tenantId },
      { config_key: 'restaurant_rfc',     config_value: rfc,                 tenant_id: appUser?.tenantId },
    ];
    if (logoPreview) {
      upsertRows.push({ config_key: 'brand_logo_url', config_value: logoPreview, tenant_id: appUser?.tenantId });
    }
    await supabase.from('system_config').upsert(upsertRows, { onConflict: 'tenant_id,config_key' });
    // Also persist address fields directly to tenants table (for SuperAdmin map)
    if (appUser?.tenantId) {
      await supabase.from('tenants').update({
        address, city, state_region: stateRegion,
        colonia: colonia ?? '',
        postal_code: postalCode ?? '',
      }).eq('id', appUser.tenantId);
    }
    setRestaurantName(restaurantNameDraft);
    invalidateSysConfigCache();
    // Auto-geocode if address changed (updates lat/lng)
    if (address.trim()) geocodeAddress(address);
    setSettingsSaved(true);
    setTimeout(() => setSettingsSaved(false), 2500);
    toast.success('Configuración del restaurante guardada');
  }

  async function handleSaveOperacion() {
    const rows = [
      { config_key: 'iva_percent', config_value: String(ivaPercentDraft), tenant_id: appUser?.tenantId ?? undefined },
      { config_key: 'currency_symbol', config_value: currencySymbol, tenant_id: appUser?.tenantId ?? undefined },
      { config_key: 'currency_code', config_value: currencyCode, tenant_id: appUser?.tenantId ?? undefined },
      { config_key: 'currency_locale', config_value: currencyLocale, tenant_id: appUser?.tenantId ?? undefined },
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
        {/* Save brand info button */}
      <div style={{ marginBottom: 8 }}>
        <SaveButton saved={settingsSaved} onClick={handleSaveSettings} />
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
        <label className="block text-sm font-semibold mb-1" style={{ color: 'rgba(255,255,255,0.7)' }}>Información de contacto</label>
        <p className="text-xs mb-4" style={{ color: 'rgba(255,255,255,0.3)' }}>
          Entre más completa sea la dirección, más precisa será la ubicación en el mapa.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* Calle y número */}
          <div>
            <label className="block text-xs mb-1" style={{ color: 'rgba(255,255,255,0.45)' }}>Calle y número</label>
            <input type="text" value={address} onChange={(e) => setAddress(e.target.value)}
              placeholder="Av. Insurgentes Sur 1234"
              className="w-full rounded-lg px-3 py-2 text-sm"
              style={{ backgroundColor: '#0f1923', border: '1px solid #2a3f5f', color: '#f1f5f9', outline: 'none' }} />
          </div>

          {/* Colonia y CP */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 12 }}>
            <div>
              <label className="block text-xs mb-1" style={{ color: 'rgba(255,255,255,0.45)' }}>Colonia / Barrio</label>
              <input type="text" value={colonia} onChange={(e) => setColonia(e.target.value)}
                placeholder="Col. Roma Norte"
                className="w-full rounded-lg px-3 py-2 text-sm"
                style={{ backgroundColor: '#0f1923', border: '1px solid #2a3f5f', color: '#f1f5f9', outline: 'none' }} />
            </div>
            <div>
              <label className="block text-xs mb-1" style={{ color: 'rgba(255,255,255,0.45)' }}>C.P.</label>
              <input type="text" value={postalCode} onChange={(e) => setPostalCode(e.target.value.replace(/\D/g,''))} maxLength={10}
                placeholder="06700"
                className="rounded-lg px-3 py-2 text-sm"
                style={{ width: 90, backgroundColor: '#0f1923', border: '1px solid #2a3f5f', color: '#f1f5f9', outline: 'none', fontFamily: 'monospace' }} />
            </div>
          </div>

          {/* Ciudad y Estado */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label className="block text-xs mb-1" style={{ color: 'rgba(255,255,255,0.45)' }}>Ciudad / Municipio</label>
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

          {/* Botón de localización + status */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button type="button"
              onClick={() => geocodeAddress(address)}
              disabled={geocoding || !address.trim()}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 18px', borderRadius: 9, border: `1px solid ${geoStatus==='ok'?'rgba(52,211,153,.4)':geoStatus==='error'?'rgba(248,113,113,.4)':'#2a3f5f'}`, background: geoStatus==='ok'?'rgba(52,211,153,.08)':geoStatus==='error'?'rgba(248,113,113,.06)':'#0f1923', color: geoStatus==='ok'?'#34d399':geoStatus==='error'?'#f87171':'rgba(255,255,255,0.6)', cursor: geocoding||!address.trim()?'not-allowed':'pointer', fontSize: 13, fontWeight: 600, transition: 'all .2s', opacity: geocoding||!address.trim()?0.5:1 }}>
              <span>{geocoding ? '⏳' : geoStatus==='ok' ? '✓' : geoStatus==='error' ? '✗' : '📍'}</span>
              <span>{geocoding ? 'Localizando…' : geoStatus==='ok' ? 'Ubicado en el mapa' : geoStatus==='error' ? 'No encontrado — revisa la dirección' : 'Localizar en el mapa'}</span>
            </button>
            {geoStatus === 'idle' && address.trim() && (
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', margin: 0 }}>
                Haz clic para verificar · Se localiza automáticamente al guardar
              </p>
            )}
          </div>

          {/* Teléfono y RFC */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 4 }}>
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

        {/* Guardar dirección / teléfono / RFC */}
        <div style={{ marginTop: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
          <SaveButton saved={settingsSaved} onClick={handleSaveSettings} />
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', margin: 0 }}>
            Guarda dirección, teléfono y RFC · Actualiza el mapa del SuperAdmin
          </p>
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