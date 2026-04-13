'use client';
/**
 * /menu/[slug] — Carta digital pública
 * Experiencia cliente: fotos, búsqueda, modal de detalle, branding del restaurante.
 * Sin login. Sin instalar nada. Funciona en cualquier celular.
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Search, X, ChevronLeft, Phone, MapPin, Star } from 'lucide-react';

interface Dish {
  id: string; name: string; description: string;
  price: number; category: string; emoji: string;
  popular: boolean; available: boolean; image: string | null;
}

interface Brand {
  restaurantName: string; logoUrl: string; primaryColor: string;
  phone: string; address: string; establishmentType: string;
}

const CAT_ORDER = ['Entradas','Platos Fuertes','Postres','Bebidas','Extras'];
const CAT_EMOJI: Record<string, string> = {
  'Entradas':'🥗','Platos Fuertes':'🍽️','Postres':'🍮','Bebidas':'🥤','Extras':'✨',
};

// ── Skeleton loaders ──────────────────────────────────────────────────────────
function DishSkeleton() {
  return (
    <div style={{ display:'flex', gap:12, padding:'14px 0', borderBottom:'1px solid rgba(255,255,255,.05)', animation:'pulse 1.5s ease infinite' }}>
      <div style={{ width:80, height:80, borderRadius:14, background:'rgba(255,255,255,.07)', flexShrink:0 }}/>
      <div style={{ flex:1, display:'flex', flexDirection:'column', gap:8, paddingTop:4 }}>
        <div style={{ height:14, borderRadius:6, background:'rgba(255,255,255,.07)', width:'60%' }}/>
        <div style={{ height:11, borderRadius:6, background:'rgba(255,255,255,.05)', width:'85%' }}/>
        <div style={{ height:11, borderRadius:6, background:'rgba(255,255,255,.05)', width:'70%' }}/>
      </div>
    </div>
  );
}

// ── Dish image with fallback ──────────────────────────────────────────────────
function DishImage({ src, emoji, size, radius }: { src:string|null; emoji:string; size:number; radius:number }) {
  const [err, setErr] = useState(false);
  if (src && !err) {
    return (
      <img src={src} alt="" onError={() => setErr(true)}
        style={{ width:size, height:size, borderRadius:radius, objectFit:'cover', display:'block', flexShrink:0 }} />
    );
  }
  return (
    <div style={{ width:size, height:size, borderRadius:radius, flexShrink:0,
      background:'rgba(255,255,255,.06)', display:'flex', alignItems:'center',
      justifyContent:'center', fontSize:size*0.45 }}>
      {emoji || '🍽️'}
    </div>
  );
}

// ── Dish detail modal ─────────────────────────────────────────────────────────
function DishModal({ dish, primaryColor, onClose }: { dish:Dish; primaryColor:string; onClose:()=>void }) {
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  return (
    <div style={{ position:'fixed', inset:0, zIndex:200, display:'flex', alignItems:'flex-end' }}
      onClick={onClose}>
      {/* Backdrop */}
      <div style={{ position:'absolute', inset:0, background:'rgba(0,0,0,.75)', backdropFilter:'blur(4px)' }}/>
      {/* Sheet */}
      <div style={{ position:'relative', width:'100%', maxWidth:520, margin:'0 auto',
        background:'#1a1a1a', borderRadius:'24px 24px 0 0', overflow:'hidden',
        animation:'slideUp .25s cubic-bezier(.22,1,.36,1) both' }}
        onClick={e => e.stopPropagation()}>
        {/* Image */}
        <div style={{ width:'100%', height:240, position:'relative', background:'rgba(255,255,255,.05)' }}>
          {dish.image ? (
            <img src={dish.image} alt={dish.name}
              style={{ width:'100%', height:'100%', objectFit:'cover', display:'block' }}
              onError={e => { (e.target as HTMLImageElement).style.display='none'; }} />
          ) : (
            <div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center',
              justifyContent:'center', fontSize:80 }}>
              {dish.emoji || '🍽️'}
            </div>
          )}
          {/* Close button */}
          <button onClick={onClose}
            style={{ position:'absolute', top:16, right:16, width:36, height:36, borderRadius:'50%',
              background:'rgba(0,0,0,.6)', border:'none', cursor:'pointer', display:'flex',
              alignItems:'center', justifyContent:'center' }}>
            <X size={18} color="white"/>
          </button>
          {dish.popular && (
            <div style={{ position:'absolute', top:16, left:16, display:'flex', alignItems:'center',
              gap:4, padding:'4px 10px', borderRadius:100, background:primaryColor,
              fontSize:11, fontWeight:700, color:'#000' }}>
              <Star size={10} fill="currentColor"/> POPULAR
            </div>
          )}
        </div>
        {/* Content */}
        <div style={{ padding:'20px 20px 32px' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:10 }}>
            <h2 style={{ fontSize:20, fontWeight:800, color:'#f1f5f9', margin:0, flex:1, marginRight:12,
              lineHeight:1.25 }}>{dish.name}</h2>
            <span style={{ fontSize:20, fontWeight:800, color:primaryColor, fontFamily:'monospace', flexShrink:0 }}>
              ${dish.price.toLocaleString('es-MX', { minimumFractionDigits:2 })}
            </span>
          </div>
          {dish.description && (
            <p style={{ fontSize:14, color:'rgba(255,255,255,.55)', lineHeight:1.7, margin:0 }}>
              {dish.description}
            </p>
          )}
          <div style={{ marginTop:20, padding:'10px 14px', borderRadius:10,
            background:`${primaryColor}12`, border:`1px solid ${primaryColor}25`,
            fontSize:12, color:'rgba(255,255,255,.5)' }}>
            Comunica tu pedido a tu mesero
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function PublicMenuPage() {
  const { slug } = useParams<{ slug: string }>();
  const supabase = createClient();

  const [dishes,        setDishes]        = useState<Dish[]>([]);
  const [brand,         setBrand]         = useState<Brand | null>(null);
  const [loading,       setLoading]       = useState(true);
  const [notFound,      setNotFound]      = useState(false);
  const [activeCategory,setActiveCategory]= useState('');
  const [search,        setSearch]        = useState('');
  const [selectedDish,  setSelectedDish]  = useState<Dish | null>(null);
  const [searchOpen,    setSearchOpen]    = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const tabsRef   = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!slug) return;
    (async () => {
      const { data: tenant } = await supabase
        .from('tenants').select('id, name').eq('slug', slug).eq('is_active', true).single();
      if (!tenant) { setNotFound(true); setLoading(false); return; }

      const [{ data: dishData }, { data: configData }] = await Promise.all([
        supabase.from('dishes')
          .select('id,name,description,price,category,emoji,popular,available,image')
          .eq('tenant_id', tenant.id).eq('available', true)
          .order('category').order('popular', { ascending: false }).order('name'),
        supabase.from('system_config')
          .select('config_key,config_value').eq('tenant_id', tenant.id)
          .in('config_key', ['restaurant_name','brand_logo_url','brand_primary_color',
                             'restaurant_phone','restaurant_address','establishment_type']),
      ]);

      const cfg: Record<string,string> = {};
      (configData||[]).forEach((r:any) => { cfg[r.config_key] = r.config_value; });

      setBrand({
        restaurantName: cfg['restaurant_name'] || tenant.name,
        logoUrl:        cfg['brand_logo_url'] || '',
        primaryColor:   cfg['brand_primary_color'] || '#c9963a',
        phone:          cfg['restaurant_phone'] || '',
        address:        cfg['restaurant_address'] || '',
        establishmentType: cfg['establishment_type'] || 'restaurante',
      });

      const list = (dishData||[]) as Dish[];
      setDishes(list);
      const first = CAT_ORDER.find(c => list.some(d => d.category === c)) ?? list[0]?.category ?? '';
      setActiveCategory(first);
      setLoading(false);
    })();
  }, [slug]);

  const categories = CAT_ORDER.filter(c => dishes.some(d => d.category === c));
  const primaryColor = brand?.primaryColor || '#c9963a';

  const filtered = search.trim()
    ? dishes.filter(d =>
        d.name.toLowerCase().includes(search.toLowerCase()) ||
        d.description?.toLowerCase().includes(search.toLowerCase()))
    : dishes.filter(d => d.category === activeCategory);

  const scrollToCategory = useCallback((cat: string) => {
    setActiveCategory(cat);
    setSearch('');
    setSearchOpen(false);
    // Scroll tab into view
    const tab = tabsRef.current?.querySelector(`[data-cat="${cat}"]`) as HTMLElement;
    tab?.scrollIntoView({ block:'nearest', inline:'center', behavior:'smooth' });
  }, []);

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) return (
    <div style={{ minHeight:'100dvh', background:'#0f0f0f', fontFamily:"'Outfit',system-ui,sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap');
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}`}</style>
      <div style={{ maxWidth:520, margin:'0 auto', padding:'20px 16px' }}>
        <div style={{ height:60, borderRadius:14, background:'rgba(255,255,255,.07)', marginBottom:20, animation:'pulse 1.5s ease infinite' }}/>
        <div style={{ height:40, borderRadius:10, background:'rgba(255,255,255,.05)', marginBottom:24, animation:'pulse 1.5s ease infinite' }}/>
        {[...Array(5)].map((_,i) => <DishSkeleton key={i}/>)}
      </div>
    </div>
  );

  // ── Not found ─────────────────────────────────────────────────────────────
  if (notFound) return (
    <div style={{ minHeight:'100dvh', background:'#0f0f0f', display:'flex', alignItems:'center',
      justifyContent:'center', padding:24, fontFamily:"'Outfit',system-ui,sans-serif" }}>
      <div style={{ textAlign:'center' }}>
        <div style={{ fontSize:64, marginBottom:16 }}>🔍</div>
        <h2 style={{ color:'#f1f5f9', fontSize:20, fontWeight:700, marginBottom:8 }}>Menú no encontrado</h2>
        <p style={{ color:'rgba(255,255,255,.4)', fontSize:14 }}>Verifica que el código QR sea correcto.</p>
      </div>
    </div>
  );

  // ── Menu ──────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight:'100dvh', background:'#0f0f0f', fontFamily:"'Outfit',system-ui,sans-serif", overflowX:'hidden' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        html{scroll-behavior:smooth}
        ::-webkit-scrollbar{display:none}
        @keyframes slideUp{from{transform:translateY(100%)}to{transform:translateY(0)}}
        @keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
        .dish-card:active{transform:scale(.98);background:rgba(255,255,255,.07)!important}
      `}</style>

      {/* ── HEADER ─────────────────────────────────────────────────────────── */}
      <div style={{ position:'sticky', top:0, zIndex:100, background:'rgba(15,15,15,.97)',
        backdropFilter:'blur(20px)', borderBottom:'1px solid rgba(255,255,255,.06)' }}>
        <div style={{ maxWidth:520, margin:'0 auto' }}>

          {/* Brand row */}
          {!searchOpen && (
            <div style={{ display:'flex', alignItems:'center', gap:12, padding:'14px 16px 0' }}>
              {/* Logo */}
              {brand?.logoUrl ? (
                <img src={brand.logoUrl} alt=""
                  style={{ width:44, height:44, borderRadius:12, objectFit:'cover', flexShrink:0 }}
                  onError={e => { (e.target as HTMLImageElement).style.display='none'; }} />
              ) : (
                <div style={{ width:44, height:44, borderRadius:12, flexShrink:0,
                  background:`${primaryColor}18`, display:'flex', alignItems:'center',
                  justifyContent:'center', fontSize:22 }}>
                  🍽️
                </div>
              )}
              {/* Name + address */}
              <div style={{ flex:1, minWidth:0 }}>
                <h1 style={{ fontSize:17, fontWeight:800, color:'#f1f5f9', lineHeight:1.2,
                  letterSpacing:'-.01em', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                  {brand?.restaurantName}
                </h1>
                {brand?.address && (
                  <p style={{ fontSize:11, color:'rgba(255,255,255,.35)', marginTop:1,
                    overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap',
                    display:'flex', alignItems:'center', gap:3 }}>
                    <MapPin size={9}/> {brand.address}
                  </p>
                )}
              </div>
              {/* Search button */}
              <button onClick={() => { setSearchOpen(true); setTimeout(()=>searchRef.current?.focus(),50); }}
                style={{ width:36, height:36, borderRadius:'50%', border:'1px solid rgba(255,255,255,.12)',
                  background:'rgba(255,255,255,.06)', cursor:'pointer', display:'flex',
                  alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                <Search size={15} color="rgba(255,255,255,.6)"/>
              </button>
            </div>
          )}

          {/* Search bar */}
          {searchOpen && (
            <div style={{ display:'flex', alignItems:'center', gap:10, padding:'12px 16px' }}>
              <div style={{ flex:1, display:'flex', alignItems:'center', gap:8, padding:'9px 14px',
                borderRadius:12, background:'rgba(255,255,255,.08)', border:'1px solid rgba(255,255,255,.12)' }}>
                <Search size={14} color="rgba(255,255,255,.4)"/>
                <input ref={searchRef} value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Buscar en el menú…"
                  style={{ flex:1, background:'none', border:'none', outline:'none', color:'#f1f5f9',
                    fontSize:14, fontFamily:"'Outfit',system-ui,sans-serif" }} />
                {search && (
                  <button onClick={() => setSearch('')}
                    style={{ background:'none', border:'none', cursor:'pointer', display:'flex', padding:0 }}>
                    <X size={14} color="rgba(255,255,255,.4)"/>
                  </button>
                )}
              </div>
              <button onClick={() => { setSearchOpen(false); setSearch(''); }}
                style={{ background:'none', border:'none', cursor:'pointer', color:'rgba(255,255,255,.5)',
                  fontSize:13, fontWeight:600, padding:'4px 0', flexShrink:0 }}>
                Cancelar
              </button>
            </div>
          )}

          {/* Category tabs */}
          {!search && (
            <div ref={tabsRef} style={{ display:'flex', overflowX:'auto', padding:'8px 16px 0',
              gap:4, scrollbarWidth:'none' }}>
              {categories.map(cat => (
                <button key={cat} data-cat={cat} onClick={() => scrollToCategory(cat)}
                  style={{ flexShrink:0, padding:'8px 14px', borderRadius:'12px 12px 0 0',
                    fontSize:13, fontWeight:activeCategory === cat ? 700 : 400,
                    color: activeCategory === cat ? primaryColor : 'rgba(255,255,255,.4)',
                    background: activeCategory === cat ? `${primaryColor}10` : 'transparent',
                    border:'none', borderBottom:`2px solid ${activeCategory === cat ? primaryColor : 'transparent'}`,
                    cursor:'pointer', transition:'all .15s', display:'flex', alignItems:'center', gap:5 }}>
                  <span style={{ fontSize:15 }}>{CAT_EMOJI[cat] || '🍴'}</span>
                  {cat}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── DISH LIST ───────────────────────────────────────────────────────── */}
      <div style={{ maxWidth:520, margin:'0 auto', padding:'0 16px 100px' }}>

        {/* Search results header */}
        {search && (
          <p style={{ fontSize:12, color:'rgba(255,255,255,.35)', padding:'14px 0 4px' }}>
            {filtered.length === 0
              ? 'Sin resultados'
              : `${filtered.length} resultado${filtered.length !== 1 ? 's' : ''} para "${search}"`}
          </p>
        )}

        {filtered.length === 0 && !search && (
          <div style={{ textAlign:'center', padding:'60px 0', color:'rgba(255,255,255,.2)', fontSize:14 }}>
            Sin platillos disponibles en esta categoría
          </div>
        )}

        {/* Popular ribbon (only when no search) */}
        {!search && dishes.filter(d => d.category === activeCategory && d.popular).length > 0 && (
          <div style={{ padding:'14px 0 6px', fontSize:11, fontWeight:700,
            color:primaryColor, letterSpacing:'.08em', textTransform:'uppercase' }}>
            ⭐ Los más pedidos
          </div>
        )}

        <div style={{ display:'flex', flexDirection:'column' }}>
          {filtered.map((dish, i) => (
            <div key={dish.id} className="dish-card"
              onClick={() => setSelectedDish(dish)}
              style={{ display:'flex', gap:14, padding:'14px 0', cursor:'pointer',
                borderBottom: i < filtered.length-1 ? '1px solid rgba(255,255,255,.05)' : 'none',
                borderRadius:4, transition:'all .15s', animation:`fadeIn .3s ${i*.04}s both` }}>

              {/* Image */}
              <div style={{ flexShrink:0 }}>
                <DishImage src={dish.image} emoji={dish.emoji} size={82} radius={14}/>
              </div>

              {/* Info */}
              <div style={{ flex:1, minWidth:0, paddingTop:2 }}>
                <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:8 }}>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:3, flexWrap:'wrap' }}>
                      <span style={{ fontSize:15, fontWeight:700, color:'#f1f5f9', lineHeight:1.3 }}>
                        {dish.name}
                      </span>
                      {dish.popular && (
                        <span style={{ fontSize:9, fontWeight:700, color:primaryColor,
                          background:`${primaryColor}18`, padding:'2px 6px', borderRadius:100,
                          letterSpacing:'.05em', flexShrink:0 }}>
                          POPULAR
                        </span>
                      )}
                    </div>
                    {dish.description && (
                      <p style={{ fontSize:12, color:'rgba(255,255,255,.38)', margin:0,
                        lineHeight:1.55, display:'-webkit-box', overflow:'hidden',
                        WebkitLineClamp:2, WebkitBoxOrient:'vertical' as const }}>
                        {dish.description}
                      </p>
                    )}
                  </div>
                  <div style={{ textAlign:'right', flexShrink:0, paddingTop:1 }}>
                    <span style={{ fontSize:15, fontWeight:800, color:'#f1f5f9', fontFamily:'monospace' }}>
                      ${dish.price.toLocaleString('es-MX', { minimumFractionDigits:2 })}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── FOOTER ─────────────────────────────────────────────────────────── */}
      <div style={{ position:'fixed', bottom:0, left:0, right:0, zIndex:50,
        background:'linear-gradient(to top, rgba(15,15,15,1) 60%, rgba(15,15,15,0))',
        padding:'20px 20px 16px' }}>
        <div style={{ maxWidth:520, margin:'0 auto' }}>
          {brand?.phone && (
            <a href={`tel:${brand.phone}`}
              style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:8,
                padding:'11px', borderRadius:14, background:primaryColor, color:'#000',
                fontSize:14, fontWeight:700, textDecoration:'none', marginBottom:10,
                boxShadow:`0 4px 20px ${primaryColor}40` }}>
              <Phone size={15}/> Llamar para reservar · {brand.phone}
            </a>
          )}
          <p style={{ textAlign:'center', fontSize:10, color:'rgba(255,255,255,.12)', margin:0 }}>
            Menú digital · {brand?.restaurantName} · Powered by Aldente
          </p>
        </div>
      </div>

      {/* ── DISH MODAL ─────────────────────────────────────────────────────── */}
      {selectedDish && (
        <DishModal dish={selectedDish} primaryColor={primaryColor} onClose={() => setSelectedDish(null)}/>
      )}
    </div>
  );
}
