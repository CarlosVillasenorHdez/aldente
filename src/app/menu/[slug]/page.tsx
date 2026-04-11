'use client';
/**
 * /menu/[slug] — Carta QR pública
 * Sin login. Clientes escanean el QR y ven el menú completo.
 * Diseño: minimalista, rápido, mobile-first.
 */
import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

interface Dish {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  emoji: string;
  popular: boolean;
  available: boolean;
}

interface BrandConfig {
  restaurantName: string;
  logoUrl: string;
  primaryColor: string;
  phone: string;
  address: string;
}

const CATEGORY_ORDER = ['Entradas', 'Platos Fuertes', 'Postres', 'Bebidas', 'Extras'];

export default function PublicMenuPage() {
  const { slug } = useParams<{ slug: string }>();
  const supabase = createClient();

  const [dishes, setDishes]       = useState<Dish[]>([]);
  const [brand, setBrand]         = useState<BrandConfig | null>(null);
  const [loading, setLoading]     = useState(true);
  const [notFound, setNotFound]   = useState(false);
  const [activeCategory, setActiveCategory] = useState('');
  const [tenantId, setTenantId]   = useState('');

  useEffect(() => {
    if (!slug) return;
    (async () => {
      // 1. Find tenant by slug
      const { data: tenant } = await supabase
        .from('tenants')
        .select('id, name')
        .eq('slug', slug)
        .eq('is_active', true)
        .single();

      if (!tenant) { setNotFound(true); setLoading(false); return; }
      setTenantId(tenant.id);

      // 2. Load dishes
      const { data: dishData } = await supabase
        .from('dishes')
        .select('id, name, description, price, category, emoji, popular, available')
        .eq('tenant_id', tenant.id)
        .eq('available', true)
        .order('category')
        .order('name');

      // 3. Load brand config from system_config
      const { data: configData } = await supabase
        .from('system_config')
        .select('config_key, config_value')
        .eq('tenant_id', tenant.id)
        .in('config_key', ['restaurant_name','brand_logo_url','brand_primary_color','restaurant_phone','restaurant_address']);

      const cfg: Record<string, string> = {};
      (configData || []).forEach((r: any) => { cfg[r.config_key] = r.config_value; });

      setBrand({
        restaurantName: cfg['restaurant_name'] || tenant.name,
        logoUrl: cfg['brand_logo_url'] || '',
        primaryColor: cfg['brand_primary_color'] || '#c9963a',
        phone: cfg['restaurant_phone'] || '',
        address: cfg['restaurant_address'] || '',
      });

      const dishList = (dishData || []) as Dish[];
      setDishes(dishList);
      const firstCat = CATEGORY_ORDER.find(cat => dishList.some(d => d.category === cat)) ?? dishList[0]?.category ?? '';
      setActiveCategory(firstCat);
      setLoading(false);
    })();
  }, [slug]);

  const categories = CATEGORY_ORDER.filter(cat => dishes.some(d => d.category === cat));
  const filteredDishes = activeCategory ? dishes.filter(d => d.category === activeCategory) : dishes;
  const primaryColor = brand?.primaryColor || '#c9963a';

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f0f0f' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🍽️</div>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14 }}>Cargando menú…</p>
      </div>
    </div>
  );

  if (notFound) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f0f0f' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 64, marginBottom: 16 }}>🔍</div>
        <h2 style={{ color: '#f1f5f9', fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Restaurante no encontrado</h2>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14 }}>Verifica que el código QR sea correcto.</p>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: '#0f0f0f', fontFamily: "'Outfit', system-ui, sans-serif" }}>
      {/* Header */}
      <div style={{ position: 'sticky', top: 0, zIndex: 50, background: '#0f0f0f', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '0 0 0 0' }}>
        <div style={{ maxWidth: 520, margin: '0 auto', padding: '20px 20px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
            {brand?.logoUrl ? (
              <img src={brand.logoUrl} alt="" style={{ width: 48, height: 48, borderRadius: 12, objectFit: 'cover' }} />
            ) : (
              <div style={{ width: 48, height: 48, borderRadius: 12, background: `${primaryColor}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>
                🍽️
              </div>
            )}
            <div>
              <h1 style={{ fontSize: 20, fontWeight: 800, color: '#f1f5f9', margin: 0, letterSpacing: '-0.02em' }}>
                {brand?.restaurantName}
              </h1>
              {brand?.address && (
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', margin: '2px 0 0' }}>{brand.address}</p>
              )}
            </div>
          </div>
          {/* Category tabs */}
          <div style={{ display: 'flex', gap: 0, overflowX: 'auto', scrollbarWidth: 'none', marginBottom: -1, paddingBottom: 0 }}>
            {categories.map(cat => (
              <button key={cat} onClick={() => setActiveCategory(cat)}
                style={{
                  flexShrink: 0, padding: '10px 16px', fontSize: 13, fontWeight: activeCategory === cat ? 700 : 400,
                  color: activeCategory === cat ? primaryColor : 'rgba(255,255,255,0.4)',
                  background: 'none', border: 'none',
                  borderBottom: `2px solid ${activeCategory === cat ? primaryColor : 'transparent'}`,
                  cursor: 'pointer', transition: 'all .15s',
                }}>
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Dishes */}
      <div style={{ maxWidth: 520, margin: '0 auto', padding: '0 16px 80px' }}>
        {filteredDishes.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'rgba(255,255,255,0.2)' }}>
            Sin platillos en esta categoría
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {filteredDishes.map((dish, i) => (
              <div key={dish.id} style={{
                display: 'flex', alignItems: 'center', gap: 14, padding: '16px 0',
                borderBottom: i < filteredDishes.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
              }}>
                {/* Emoji */}
                <div style={{
                  width: 52, height: 52, borderRadius: 14, flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 26, background: 'rgba(255,255,255,0.04)',
                }}>
                  {dish.emoji || '🍽️'}
                </div>
                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                        <span style={{ fontSize: 15, fontWeight: 700, color: '#f1f5f9', lineHeight: 1.3 }}>
                          {dish.name}
                        </span>
                        {dish.popular && (
                          <span style={{ fontSize: 10, fontWeight: 700, color: primaryColor, background: `${primaryColor}18`, padding: '2px 6px', borderRadius: 100, letterSpacing: '.04em', flexShrink: 0 }}>
                            POPULAR
                          </span>
                        )}
                      </div>
                      {dish.description && (
                        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.38)', margin: 0, lineHeight: 1.5, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as any }}>
                          {dish.description}
                        </p>
                      )}
                    </div>
                    <span style={{ fontSize: 15, fontWeight: 800, color: '#f1f5f9', fontFamily: 'monospace', flexShrink: 0, paddingTop: 2 }}>
                      ${dish.price.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        background: 'linear-gradient(to top, #0f0f0f, rgba(15,15,15,0.95))',
        padding: '16px 20px', textAlign: 'center',
      }}>
        <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.15)', margin: 0 }}>
          Menú digital · Precios en MXN · Folio consultado en {new Date().toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}
        </p>
        <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.08)', margin: '3px 0 0' }}>
          Powered by Aldente
        </p>
      </div>
    </div>
  );
}
