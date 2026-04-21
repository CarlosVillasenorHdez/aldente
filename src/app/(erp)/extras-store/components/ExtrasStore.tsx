'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Search, Tag, Users, ShoppingBag, Star, X, ChevronDown, Calendar, TrendingUp, Package } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { getCurrentTenantId as getTenantId } from '@/lib/tenantStore';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useLoyaltyConfig } from '@/hooks/useLoyaltyConfig';

// ─── Types ────────────────────────────────────────────────────────────────────

type ExtraType = 'membership' | 'product' | 'other';

interface ExtraCatalogItem {
  id: string;
  name: string;
  type: ExtraType;
  price: number;
  description: string;
  durationDays: number | null; // null = no expira
  isActive: boolean;
}

interface ExtraSale {
  id: string;
  customerId: string | null;
  customerName: string;
  itemId: string;
  itemName: string;
  type: ExtraType;
  price: number;
  qty: number;
  soldAt: string;
  expiresAt: string | null;
}

interface LoyaltyCustomer {
  id: string;
  name: string;
  phone: string;
  email: string;
}

const TYPE_LABELS: Record<ExtraType, string> = {
  membership: 'Membresía',
  product: 'Producto',
  other: 'Otro',
};

const TYPE_COLORS: Record<ExtraType, { bg: string; text: string; border: string }> = {
  membership: { bg: 'rgba(139,92,246,0.12)', text: '#a78bfa', border: 'rgba(139,92,246,0.3)' },
  product:    { bg: 'rgba(16,185,129,0.12)', text: '#34d399', border: 'rgba(16,185,129,0.3)' },
  other:      { bg: 'rgba(245,158,11,0.12)', text: '#fbbf24', border: 'rgba(245,158,11,0.3)' },
};

const TYPE_ICONS: Record<ExtraType, React.ReactNode> = {
  membership: <Star size={13} />,
  product:    <Package size={13} />,
  other:      <Tag size={13} />,
};

const emptyItem = (): Omit<ExtraCatalogItem, 'id'> => ({
  name: '', type: 'membership', price: 0, description: '',
  durationDays: 180, isActive: true,
});

// ─── Component ────────────────────────────────────────────────────────────────

export default function ExtrasStore() {
  const supabase = createClient();
  const { appUser } = useAuth();
  const { config: loyaltyConfig } = useLoyaltyConfig();

  const [activeTab, setActiveTab] = useState<'vender' | 'historial' | 'catalogo'>('vender');
  const [catalog, setCatalog] = useState<ExtraCatalogItem[]>([]);
  const [sales, setSales] = useState<ExtraSale[]>([]);
  const [customers, setCustomers] = useState<LoyaltyCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Sell form
  const [selectedItem, setSelectedItem] = useState<ExtraCatalogItem | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<LoyaltyCustomer | null>(null);
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerDropOpen, setCustomerDropOpen] = useState(false);
  const [qty, setQty] = useState(1);
  const [payMethod, setPayMethod] = useState<'efectivo' | 'tarjeta'>('efectivo');
  const [walkInName, setWalkInName] = useState('');

  // Popup de membresía — se muestra al vender el produto_trigger
  const [showMembershipPopup, setShowMembershipPopup] = useState(false);
  const [pendingSaleId, setPendingSaleId] = useState<string | null>(null);

  // Catalog modal
  const [catalogModalOpen, setCatalogModalOpen] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [itemForm, setItemForm] = useState(emptyItem());

  // Filters
  const [filterType, setFilterType] = useState<ExtraType | 'all'>('all');
  const [saleSearch, setSaleSearch] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    const tid = getTenantId();

    const [catRes, salesRes, custRes] = await Promise.all([
      supabase.from('extras_catalog').select('*').eq('tenant_id', tid).order('type').order('name'),
      supabase.from('extras_sales').select('*').eq('tenant_id', tid).order('sold_at', { ascending: false }).limit(200),
      supabase.from('loyalty_customers').select('id, name, phone, email').eq('tenant_id', tid).eq('is_active', true).order('name'),
    ]);

    setCatalog((catRes.data || []).map((r: any) => ({
      id: r.id, name: r.name, type: r.type as ExtraType,
      price: Number(r.price), description: r.description ?? '',
      durationDays: r.duration_days ?? null, isActive: r.is_active,
    })));

    setSales((salesRes.data || []).map((r: any) => ({
      id: r.id, customerId: r.customer_id, customerName: r.customer_name ?? '—',
      itemId: r.item_id, itemName: r.item_name, type: r.type as ExtraType,
      price: Number(r.price), qty: Number(r.qty ?? 1),
      soldAt: r.sold_at, expiresAt: r.expires_at ?? null,
    })));

    setCustomers((custRes.data || []).map((r: any) => ({
      id: r.id, name: r.name, phone: r.phone ?? '', email: r.email ?? '',
    })));

    setLoading(false);
  }, [supabase]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── KPIs ──────────────────────────────────────────────────────────────────
  const totalRevenue = sales.reduce((s, r) => s + r.price * r.qty, 0);
  const activeMemberships = sales.filter(s =>
    s.type === 'membership' &&
    (s.expiresAt === null || new Date(s.expiresAt) > new Date())
  ).length;
  const expiringSoon = sales.filter(s => {
    if (s.type !== 'membership' || !s.expiresAt) return false;
    const daysLeft = (new Date(s.expiresAt).getTime() - Date.now()) / 86400000;
    return daysLeft > 0 && daysLeft <= 30;
  }).length;

  // ── Sell ──────────────────────────────────────────────────────────────────
  async function handleSell() {
    if (!selectedItem) { toast.error('Selecciona un producto'); return; }
    setSaving(true);
    const tid = getTenantId();
    const now = new Date().toISOString();
    const expiresAt = selectedItem.durationDays
      ? new Date(Date.now() + selectedItem.durationDays * 86400000).toISOString()
      : null;
    const customerName = selectedCustomer ? selectedCustomer.name : (walkInName.trim() || 'Cliente general');

    const { error } = await supabase.from('extras_sales').insert({
      tenant_id: tid,
      customer_id: selectedCustomer?.id ?? null,
      customer_name: customerName,
      item_id: selectedItem.id,
      item_name: selectedItem.name,
      type: selectedItem.type,
      price: selectedItem.price,
      qty,
      pay_method: payMethod,
      sold_at: now,
      expires_at: expiresAt,
      created_by: appUser?.fullName ?? 'Admin',
    });

    if (error) { toast.error('Error al registrar: ' + error.message); setSaving(false); return; }

    toast.success(`✅ ${selectedItem.name} vendido${selectedItem.type === 'membership' && expiresAt ? ` — vence ${new Date(expiresAt).toLocaleDateString('es-MX')}` : ''}`);

    // ── Detectar si este producto activa una membresía ─────────────────────
    const isTriggerProduct = loyaltyConfig.membership.enabled
      && loyaltyConfig.membership.trigger === 'venta_producto'
      && loyaltyConfig.membership.triggerProductId === selectedItem.id;

    if (isTriggerProduct) {
      // Guardar el ID de la venta para vincularlo al registrar la membresía
      setPendingSaleId(selectedItem.id);
      setShowMembershipPopup(true);
      // No limpiar el form todavía — el popup lo hace al cerrar
      setSaving(false);
      return;
    }

    setSelectedItem(null);
    setSelectedCustomer(null);
    setCustomerSearch('');
    setWalkInName('');
    setQty(1);
    await fetchData();
    setSaving(false);
  }

  // ── Catalog CRUD ──────────────────────────────────────────────────────────
  async function handleSaveItem() {
    if (!itemForm.name.trim()) { toast.error('El nombre es requerido'); return; }
    if (itemForm.price <= 0) { toast.error('El precio debe ser mayor a 0'); return; }
    const tid = getTenantId();
    const payload = {
      tenant_id: tid,
      name: itemForm.name.trim(),
      type: itemForm.type,
      price: itemForm.price,
      description: itemForm.description,
      duration_days: itemForm.type === 'membership' ? (itemForm.durationDays ?? 180) : null,
      is_active: itemForm.isActive,
    };
    if (editingItemId) {
      const { error } = await supabase.from('extras_catalog').update(payload).eq('id', editingItemId);
      if (error) { toast.error(error.message); return; }
      toast.success('Producto actualizado');
    } else {
      const { error } = await supabase.from('extras_catalog').insert(payload);
      if (error) { toast.error(error.message); return; }
      toast.success('Producto agregado al catálogo');
    }
    setCatalogModalOpen(false);
    setEditingItemId(null);
    setItemForm(emptyItem());
    await fetchData();
  }

  async function handleToggleItem(item: ExtraCatalogItem) {
    await supabase.from('extras_catalog').update({ is_active: !item.isActive }).eq('id', item.id);
    await fetchData();
  }

  // ── Filtered sales ────────────────────────────────────────────────────────
  const filteredSales = sales.filter(s => {
    if (filterType !== 'all' && s.type !== filterType) return false;
    if (saleSearch && !s.customerName.toLowerCase().includes(saleSearch.toLowerCase()) &&
        !s.itemName.toLowerCase().includes(saleSearch.toLowerCase())) return false;
    return true;
  });

  const filteredCustomers = customers.filter(c =>
    c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
    c.phone.includes(customerSearch)
  );

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'Ingresos Totales', value: `$${totalRevenue.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`, icon: <TrendingUp size={18} />, color: '#10b981' },
          { label: 'Membresías Activas', value: activeMemberships, icon: <Star size={18} />, color: '#8b5cf6' },
          { label: 'Vencen en 30 días', value: expiringSoon, icon: <Calendar size={18} />, color: expiringSoon > 0 ? '#ef4444' : '#64748b' },
        ].map(k => (
          <div key={k.label} style={{ background: '#1a2535', border: '1px solid #1e2d3d', borderRadius: 12, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: k.color + '22', display: 'flex', alignItems: 'center', justifyContent: 'center', color: k.color, flexShrink: 0 }}>{k.icon}</div>
            <div>
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>{k.label}</p>
              <p style={{ fontSize: 22, fontWeight: 700, color: '#f1f5f9' }}>{k.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, background: '#0f1923', borderRadius: 10, padding: 4, marginBottom: 24, width: 'fit-content' }}>
        {([
          { key: 'vender', label: 'Vender', icon: <ShoppingBag size={14} /> },
          { key: 'historial', label: 'Historial', icon: <Calendar size={14} /> },
          { key: 'catalogo', label: 'Catálogo', icon: <Tag size={14} /> },
        ] as const).map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 16px', borderRadius: 7, fontSize: 13, fontWeight: 600, cursor: 'pointer', border: 'none', transition: 'all .15s',
              background: activeTab === t.key ? '#1e2d3d' : 'transparent',
              color: activeTab === t.key ? '#f1f5f9' : 'rgba(255,255,255,0.4)' }}>
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      {/* ── TAB VENDER ── */}
      {activeTab === 'vender' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20 }}>

          {/* Catálogo para vender */}
          <div>
            <p style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>Selecciona un producto</p>
            {loading ? (
              <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>Cargando...</p>
            ) : catalog.filter(i => i.isActive).length === 0 ? (
              <div style={{ background: '#1a2535', border: '1px dashed #2a3f5f', borderRadius: 12, padding: '32px', textAlign: 'center' }}>
                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, marginBottom: 12 }}>Sin productos en el catálogo</p>
                <button onClick={() => setActiveTab('catalogo')} style={{ padding: '8px 18px', borderRadius: 8, background: '#f59e0b', color: '#1B3A6B', fontWeight: 700, fontSize: 13, border: 'none', cursor: 'pointer' }}>
                  Agregar productos
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {(['membership', 'product', 'other'] as ExtraType[]).map(type => {
                  const items = catalog.filter(i => i.isActive && i.type === type);
                  if (items.length === 0) return null;
                  return (
                    <div key={type}>
                      <p style={{ fontSize: 10, fontWeight: 700, color: TYPE_COLORS[type].text, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6, marginTop: 4 }}>
                        {TYPE_LABELS[type]}s
                      </p>
                      {items.map(item => (
                        <button key={item.id} onClick={() => setSelectedItem(selectedItem?.id === item.id ? null : item)}
                          style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 14, padding: '12px 14px', borderRadius: 10, border: `1px solid ${selectedItem?.id === item.id ? TYPE_COLORS[item.type].border : '#1e2d3d'}`, background: selectedItem?.id === item.id ? TYPE_COLORS[item.type].bg : '#1a2535', cursor: 'pointer', textAlign: 'left', marginBottom: 6, transition: 'all .15s' }}>
                          <div style={{ width: 36, height: 36, borderRadius: 8, background: TYPE_COLORS[item.type].bg, border: `1px solid ${TYPE_COLORS[item.type].border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: TYPE_COLORS[item.type].text, flexShrink: 0 }}>
                            {TYPE_ICONS[item.type]}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ fontSize: 14, fontWeight: 600, color: '#f1f5f9', marginBottom: 2 }}>{item.name}</p>
                            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>
                              {item.description || (item.durationDays ? `Vigencia: ${item.durationDays} días` : 'Sin vencimiento')}
                            </p>
                          </div>
                          <p style={{ fontSize: 18, fontWeight: 700, color: '#f59e0b', flexShrink: 0 }}>${item.price.toFixed(0)}</p>
                        </button>
                      ))}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Panel de cobro */}
          <div style={{ background: '#1a2535', border: '1px solid #1e2d3d', borderRadius: 14, padding: 20, height: 'fit-content', position: 'sticky', top: 20 }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 16 }}>Resumen de venta</p>

            {/* Producto seleccionado */}
            {selectedItem ? (
              <div style={{ background: TYPE_COLORS[selectedItem.type].bg, border: `1px solid ${TYPE_COLORS[selectedItem.type].border}`, borderRadius: 10, padding: '10px 14px', marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 600, color: '#f1f5f9' }}>{selectedItem.name}</p>
                  {selectedItem.durationDays && (
                    <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', marginTop: 2 }}>
                      Vence: {new Date(Date.now() + selectedItem.durationDays * 86400000).toLocaleDateString('es-MX')}
                    </p>
                  )}
                </div>
                <p style={{ fontSize: 18, fontWeight: 700, color: '#f59e0b' }}>${(selectedItem.price * qty).toFixed(0)}</p>
              </div>
            ) : (
              <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px dashed #2a3f5f', borderRadius: 10, padding: '14px', textAlign: 'center', marginBottom: 16 }}>
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>Selecciona un producto</p>
              </div>
            )}

            {/* Cantidad (solo productos y otros) */}
            {selectedItem && selectedItem.type !== 'membership' && (
              <div style={{ marginBottom: 14 }}>
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginBottom: 6 }}>Cantidad</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <button onClick={() => setQty(q => Math.max(1, q - 1))} style={{ width: 32, height: 32, borderRadius: 8, background: '#0f1923', border: '1px solid #2a3f5f', color: '#f59e0b', fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
                  <span style={{ fontWeight: 700, color: '#f1f5f9', width: 24, textAlign: 'center' }}>{qty}</span>
                  <button onClick={() => setQty(q => q + 1)} style={{ width: 32, height: 32, borderRadius: 8, background: '#0f1923', border: '1px solid #2a3f5f', color: '#f59e0b', fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                </div>
              </div>
            )}

            {/* Cliente (de loyalty_customers o nombre libre) */}
            <div style={{ marginBottom: 14 }}>
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginBottom: 6 }}>Cliente</p>
              {selectedCustomer ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#0f1923', border: '1px solid #2a3f5f', borderRadius: 8, padding: '8px 12px' }}>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 600, color: '#f1f5f9' }}>{selectedCustomer.name}</p>
                    {selectedCustomer.phone && <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>{selectedCustomer.phone}</p>}
                  </div>
                  <button onClick={() => { setSelectedCustomer(null); setCustomerSearch(''); }} style={{ color: '#f87171', background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}><X size={14} /></button>
                </div>
              ) : (
                <div style={{ position: 'relative' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#0f1923', border: '1px solid #2a3f5f', borderRadius: 8, padding: '8px 12px' }}>
                    <Search size={13} style={{ color: 'rgba(255,255,255,0.3)', flexShrink: 0 }} />
                    <input
                      value={customerSearch}
                      onChange={e => { setCustomerSearch(e.target.value); setCustomerDropOpen(true); }}
                      onFocus={() => setCustomerDropOpen(true)}
                      placeholder="Buscar miembro o escribir nombre..."
                      style={{ background: 'none', border: 'none', outline: 'none', color: '#f1f5f9', fontSize: 13, flex: 1 }}
                    />
                  </div>
                  {customerDropOpen && customerSearch && (
                    <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#1a2535', border: '1px solid #2a3f5f', borderRadius: 8, zIndex: 50, marginTop: 4, maxHeight: 160, overflowY: 'auto' }}>
                      {filteredCustomers.slice(0, 8).map(c => (
                        <button key={c.id} onClick={() => { setSelectedCustomer(c); setCustomerSearch(c.name); setCustomerDropOpen(false); }}
                          style={{ width: '100%', textAlign: 'left', padding: '8px 12px', background: 'none', border: 'none', color: '#f1f5f9', cursor: 'pointer', fontSize: 13, borderBottom: '1px solid #1e2d3d' }}>
                          <span style={{ fontWeight: 600 }}>{c.name}</span>
                          {c.phone && <span style={{ color: 'rgba(255,255,255,0.4)', marginLeft: 8, fontSize: 11 }}>{c.phone}</span>}
                        </button>
                      ))}
                      <button onClick={() => { setWalkInName(customerSearch); setCustomerDropOpen(false); }}
                        style={{ width: '100%', textAlign: 'left', padding: '8px 12px', background: 'rgba(245,158,11,0.08)', border: 'none', color: '#f59e0b', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                        + Continuar como "{customerSearch}"
                      </button>
                    </div>
                  )}
                  {!customerDropOpen && walkInName && (
                    <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 4 }}>Sin miembro vinculado: "{walkInName}"</p>
                  )}
                </div>
              )}
            </div>

            {/* Método de pago */}
            <div style={{ marginBottom: 20 }}>
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginBottom: 6 }}>Método de pago</p>
              <div style={{ display: 'flex', gap: 6 }}>
                {(['efectivo', 'tarjeta'] as const).map(m => (
                  <button key={m} onClick={() => setPayMethod(m)}
                    style={{ flex: 1, padding: '7px', borderRadius: 8, border: `1px solid ${payMethod === m ? 'rgba(245,158,11,0.4)' : '#2a3f5f'}`, background: payMethod === m ? 'rgba(245,158,11,0.1)' : '#0f1923', color: payMethod === m ? '#f59e0b' : 'rgba(255,255,255,0.5)', fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>
                    {m === 'efectivo' ? '💵 Efectivo' : '💳 Tarjeta'}
                  </button>
                ))}
              </div>
            </div>

            {/* Total y botón */}
            <div style={{ borderTop: '1px solid #1e2d3d', paddingTop: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)' }}>Total</span>
                <span style={{ fontSize: 22, fontWeight: 700, color: '#f59e0b' }}>
                  ${selectedItem ? (selectedItem.price * qty).toFixed(2) : '0.00'}
                </span>
              </div>
              <button
                onClick={handleSell}
                disabled={!selectedItem || saving}
                style={{ width: '100%', padding: '12px', borderRadius: 10, background: selectedItem ? '#f59e0b' : '#2a3f5f', color: selectedItem ? '#1B3A6B' : 'rgba(255,255,255,0.3)', fontWeight: 700, fontSize: 14, border: 'none', cursor: selectedItem ? 'pointer' : 'not-allowed', transition: 'all .15s' }}>
                {saving ? 'Registrando...' : 'Registrar venta'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB HISTORIAL ── */}
      {activeTab === 'historial' && (
        <div>
          {/* Filtros */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
              <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)' }} />
              <input value={saleSearch} onChange={e => setSaleSearch(e.target.value)}
                placeholder="Buscar cliente o producto..."
                style={{ width: '100%', paddingLeft: 32, paddingRight: 12, paddingTop: 8, paddingBottom: 8, background: '#1a2535', border: '1px solid #1e2d3d', borderRadius: 8, color: '#f1f5f9', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              {(['all', 'membership', 'product', 'other'] as const).map(t => (
                <button key={t} onClick={() => setFilterType(t)}
                  style={{ padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, border: `1px solid ${filterType === t ? 'rgba(245,158,11,0.4)' : '#1e2d3d'}`, background: filterType === t ? 'rgba(245,158,11,0.1)' : '#1a2535', color: filterType === t ? '#f59e0b' : 'rgba(255,255,255,0.5)', cursor: 'pointer' }}>
                  {t === 'all' ? 'Todos' : TYPE_LABELS[t]}s
                </button>
              ))}
            </div>
          </div>

          {/* Tabla */}
          <div style={{ background: '#1a2535', border: '1px solid #1e2d3d', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 80px 100px 100px', gap: 12, padding: '10px 16px', background: '#0f1923', fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              <span>Cliente</span><span>Producto</span><span>Cant.</span><span>Total</span><span>Vence</span>
            </div>
            {filteredSales.length === 0 ? (
              <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.3)', padding: '32px', fontSize: 13 }}>Sin ventas registradas</p>
            ) : filteredSales.map(sale => {
              const expired = sale.expiresAt && new Date(sale.expiresAt) < new Date();
              const expiringSoon = sale.expiresAt && !expired && (new Date(sale.expiresAt).getTime() - Date.now()) / 86400000 <= 30;
              return (
                <div key={sale.id} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 80px 100px 100px', gap: 12, padding: '12px 16px', borderTop: '1px solid #1e2d3d', alignItems: 'center' }}>
                  <span style={{ fontSize: 13, color: '#f1f5f9', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sale.customerName}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 5, background: TYPE_COLORS[sale.type].bg, color: TYPE_COLORS[sale.type].text, border: `1px solid ${TYPE_COLORS[sale.type].border}`, flexShrink: 0 }}>{TYPE_LABELS[sale.type]}</span>
                    <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sale.itemName}</span>
                  </div>
                  <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', textAlign: 'center' }}>{sale.qty}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#f59e0b' }}>${(sale.price * sale.qty).toFixed(0)}</span>
                  <span style={{ fontSize: 11, fontWeight: 600, color: expired ? '#f87171' : expiringSoon ? '#fbbf24' : sale.expiresAt ? '#34d399' : 'rgba(255,255,255,0.3)' }}>
                    {sale.expiresAt ? (expired ? '⚠ Vencida' : new Date(sale.expiresAt).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })) : '—'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── TAB CATÁLOGO ── */}
      {activeTab === 'catalogo' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
            <button onClick={() => { setEditingItemId(null); setItemForm(emptyItem()); setCatalogModalOpen(true); }}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 18px', borderRadius: 9, background: '#f59e0b', color: '#1B3A6B', fontWeight: 700, fontSize: 13, border: 'none', cursor: 'pointer' }}>
              <Plus size={15} /> Agregar producto
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {catalog.length === 0 ? (
              <div style={{ background: '#1a2535', border: '1px dashed #2a3f5f', borderRadius: 12, padding: '40px', textAlign: 'center' }}>
                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14 }}>Catálogo vacío — agrega membresías, productos o servicios</p>
              </div>
            ) : catalog.map(item => (
              <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', background: '#1a2535', border: `1px solid ${item.isActive ? '#1e2d3d' : 'rgba(255,255,255,0.05)'}`, borderRadius: 11, opacity: item.isActive ? 1 : 0.5 }}>
                <div style={{ width: 38, height: 38, borderRadius: 9, background: TYPE_COLORS[item.type].bg, border: `1px solid ${TYPE_COLORS[item.type].border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: TYPE_COLORS[item.type].text, flexShrink: 0 }}>
                  {TYPE_ICONS[item.type]}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <p style={{ fontSize: 14, fontWeight: 600, color: '#f1f5f9' }}>{item.name}</p>
                    <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 5, background: TYPE_COLORS[item.type].bg, color: TYPE_COLORS[item.type].text, border: `1px solid ${TYPE_COLORS[item.type].border}` }}>{TYPE_LABELS[item.type]}</span>
                  </div>
                  <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>
                    {item.description || (item.durationDays ? `Vigencia ${item.durationDays} días` : 'Sin vencimiento')}
                  </p>
                </div>
                <p style={{ fontSize: 20, fontWeight: 700, color: '#f59e0b', marginRight: 8 }}>${item.price.toFixed(0)}</p>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={() => { setEditingItemId(item.id); setItemForm({ name: item.name, type: item.type, price: item.price, description: item.description, durationDays: item.durationDays, isActive: item.isActive }); setCatalogModalOpen(true); }}
                    style={{ padding: '6px 12px', borderRadius: 7, background: 'rgba(255,255,255,0.07)', border: '1px solid #2a3f5f', color: '#f1f5f9', fontSize: 12, cursor: 'pointer' }}>
                    Editar
                  </button>
                  <button onClick={() => handleToggleItem(item)}
                    style={{ padding: '6px 12px', borderRadius: 7, background: item.isActive ? 'rgba(239,68,68,0.1)' : 'rgba(34,197,94,0.1)', border: `1px solid ${item.isActive ? 'rgba(239,68,68,0.2)' : 'rgba(34,197,94,0.2)'}`, color: item.isActive ? '#f87171' : '#4ade80', fontSize: 12, cursor: 'pointer' }}>
                    {item.isActive ? 'Desactivar' : 'Activar'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Modal catálogo ── */}
      {catalogModalOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: '#1a2535', border: '1px solid #2a3f5f', borderRadius: 16, width: '100%', maxWidth: 480, padding: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <p style={{ fontSize: 16, fontWeight: 700, color: '#f1f5f9' }}>{editingItemId ? 'Editar producto' : 'Nuevo producto'}</p>
              <button onClick={() => setCatalogModalOpen(false)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer' }}><X size={18} /></button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Tipo */}
              <div>
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginBottom: 6 }}>Tipo</p>
                <div style={{ display: 'flex', gap: 6 }}>
                  {(['membership', 'product', 'other'] as ExtraType[]).map(t => (
                    <button key={t} onClick={() => setItemForm(f => ({ ...f, type: t }))}
                      style={{ flex: 1, padding: '8px 4px', borderRadius: 8, fontSize: 12, fontWeight: 600, border: `1px solid ${itemForm.type === t ? TYPE_COLORS[t].border : '#2a3f5f'}`, background: itemForm.type === t ? TYPE_COLORS[t].bg : '#0f1923', color: itemForm.type === t ? TYPE_COLORS[t].text : 'rgba(255,255,255,0.4)', cursor: 'pointer' }}>
                      {TYPE_LABELS[t]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Nombre */}
              <div>
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginBottom: 6 }}>Nombre</p>
                <input value={itemForm.name} onChange={e => setItemForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="ej. Membresía 6 meses, Termo Barista..."
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 8, background: '#0f1923', border: '1px solid #2a3f5f', color: '#f1f5f9', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
              </div>

              {/* Precio */}
              <div>
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginBottom: 6 }}>Precio (MXN)</p>
                <input type="number" min={0} step={1} value={itemForm.price} onChange={e => setItemForm(f => ({ ...f, price: Number(e.target.value) }))}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 8, background: '#0f1923', border: '1px solid #2a3f5f', color: '#f1f5f9', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
              </div>

              {/* Duración (solo membresías) */}
              {itemForm.type === 'membership' && (
                <div>
                  <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginBottom: 6 }}>Vigencia (días)</p>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {[30, 60, 90, 180, 365].map(d => (
                      <button key={d} onClick={() => setItemForm(f => ({ ...f, durationDays: d }))}
                        style={{ padding: '6px 14px', borderRadius: 7, fontSize: 12, fontWeight: 600, border: `1px solid ${itemForm.durationDays === d ? 'rgba(139,92,246,0.4)' : '#2a3f5f'}`, background: itemForm.durationDays === d ? 'rgba(139,92,246,0.12)' : '#0f1923', color: itemForm.durationDays === d ? '#a78bfa' : 'rgba(255,255,255,0.5)', cursor: 'pointer' }}>
                        {d === 365 ? '1 año' : d === 180 ? '6 meses' : d === 90 ? '3 meses' : `${d} días`}
                      </button>
                    ))}
                    <button onClick={() => setItemForm(f => ({ ...f, durationDays: null }))}
                      style={{ padding: '6px 14px', borderRadius: 7, fontSize: 12, fontWeight: 600, border: `1px solid ${itemForm.durationDays === null ? 'rgba(245,158,11,0.4)' : '#2a3f5f'}`, background: itemForm.durationDays === null ? 'rgba(245,158,11,0.1)' : '#0f1923', color: itemForm.durationDays === null ? '#f59e0b' : 'rgba(255,255,255,0.5)', cursor: 'pointer' }}>
                      Sin vencimiento
                    </button>
                  </div>
                </div>
              )}

              {/* Descripción */}
              <div>
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginBottom: 6 }}>Descripción (opcional)</p>
                <input value={itemForm.description} onChange={e => setItemForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Beneficios, detalles del producto..."
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 8, background: '#0f1923', border: '1px solid #2a3f5f', color: '#f1f5f9', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button onClick={() => setCatalogModalOpen(false)} style={{ flex: 1, padding: '10px', borderRadius: 9, background: 'rgba(255,255,255,0.07)', border: '1px solid #2a3f5f', color: 'rgba(255,255,255,0.6)', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
                Cancelar
              </button>
              <button onClick={handleSaveItem} style={{ flex: 1, padding: '10px', borderRadius: 9, background: '#f59e0b', border: 'none', color: '#1B3A6B', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                {editingItemId ? 'Guardar cambios' : 'Agregar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Popup de membresía — aparece al vender el produto_trigger ── */}
      {showMembershipPopup && (
        <div style={{ position:'fixed', inset:0, zIndex:9999, background:'rgba(0,0,0,0.7)', display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
          <div style={{ background:'#0f1923', border:'1px solid rgba(245,158,11,0.3)', borderRadius:20, padding:28, maxWidth:420, width:'100%' }}>
            <div style={{ textAlign:'center', marginBottom:20 }}>
              <div style={{ fontSize:36, marginBottom:8 }}>⭐</div>
              <h3 style={{ color:'#f1f5f9', fontSize:17, fontWeight:700, marginBottom:6 }}>
                {loyaltyConfig.membership.triggerProductId ? '¡Este producto incluye membresía!' : 'Activar membresía'}
              </h3>
              <p style={{ color:'rgba(255,255,255,0.5)', fontSize:13 }}>
                Beneficio: {loyaltyConfig.membership.freeProductLabel || 'Beneficio del día'} · {loyaltyConfig.membership.durationMonths} meses
              </p>
            </div>

            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              <button
                onClick={async () => {
                  // Registrar membresía manual — el cajero capturará los datos
                  // en el módulo de Lealtad. Aquí solo cerramos el popup.
                  setShowMembershipPopup(false);
                  setPendingSaleId(null);
                  setSelectedItem(null); setSelectedCustomer(null);
                  setCustomerSearch(''); setWalkInName(''); setQty(1);
                  await fetchData();
                  toast.success('Ve a Lealtad → Membresía para registrar al cliente', { duration: 5000 });
                }}
                style={{ padding:'11px', borderRadius:10, background:'rgba(245,158,11,0.15)', border:'1px solid rgba(245,158,11,0.3)', color:'#f59e0b', fontSize:14, fontWeight:700, cursor:'pointer' }}
              >
                ⭐ Ir a registrar membresía
              </button>
              <button
                onClick={async () => {
                  setShowMembershipPopup(false);
                  setPendingSaleId(null);
                  setSelectedItem(null); setSelectedCustomer(null);
                  setCustomerSearch(''); setWalkInName(''); setQty(1);
                  await fetchData();
                }}
                style={{ padding:'11px', borderRadius:10, background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', color:'rgba(255,255,255,0.5)', fontSize:13, fontWeight:600, cursor:'pointer' }}
              >
                El cliente no quiere membresía — continuar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
