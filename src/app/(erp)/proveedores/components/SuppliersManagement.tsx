'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useBranch } from '@/hooks/useBranch';
import { getCurrentTenantId as getTenantId } from '@/lib/tenantStore';
import { toast } from 'sonner';
import { Plus, X, Edit2, Phone, Mail, CreditCard, AlertCircle,
         CheckCircle, Package, Receipt, ChevronRight, ArrowLeft } from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────
interface Supplier {
  id: string; name: string; rfc: string | null; contact_name: string | null;
  phone: string | null; email: string | null; address: string | null;
  street?: string; colonia?: string; postal_code?: string; city?: string; state_region?: string;
  payment_terms: string; credit_limit: number; notes: string | null; active: boolean;
  balance_pendiente?: number; total_compras?: number; total_pagado?: number;
  total_credito?: number; ingredients_count?: number;
}
interface Ingredient {
  id: string; name: string; category: string; unit: string;
  stock: number; cost: number; supplier_id: string | null; supplier_text?: string;
}
interface Payment {
  id: string; supplier_id: string; amount: number; payment_date: string;
  method: string; reference: string | null; notes: string | null; created_at: string;
}

const PAYMENT_TERMS = [
  { key: 'contado', label: 'Contado' }, { key: '15_dias', label: '15 días' },
  { key: '30_dias', label: '30 días' }, { key: '60_dias', label: '60 días' },
];
const PAYMENT_METHODS = [
  { key: 'efectivo', label: 'Efectivo' }, { key: 'transferencia', label: 'Transferencia' },
  { key: 'cheque', label: 'Cheque' }, { key: 'tarjeta', label: 'Tarjeta empresarial' },
];
const EMPTY_SUP: Partial<Supplier> = {
  name: '', rfc: '', contact_name: '', phone: '', email: '',
  address: '', street: '', colonia: '', postal_code: '', city: '', state_region: '',
  payment_terms: 'contado', credit_limit: 0, notes: '',
};

const fmt = (n: number) => n.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const termLabel = (t: string) => PAYMENT_TERMS.find(x => x.key === t)?.label ?? t;

// ── SupplierModal ─────────────────────────────────────────────────────────────
function SupplierModal({ supplier, onClose, onSaved }: {
  supplier: Partial<Supplier> | null; onClose: () => void; onSaved: () => void;
}) {
  const supabase = createClient();
  const { activeBranchId } = useBranch();
  const [form, setForm] = useState<Partial<Supplier>>(() => {
    if (!supplier) return EMPTY_SUP;
    // Si no tiene campos estructurados pero sí address, intentar parsear
    if (supplier.address && !supplier.street) {
      const parts = supplier.address.split(',').map(s => s.trim());
      return { ...supplier, street: parts[0] ?? '', colonia: parts[1] ?? '', city: parts[2] ?? '' };
    }
    return supplier;
  });
  const [saving, setSaving] = useState(false);
  const set = (k: keyof Supplier, v: any) => setForm(p => ({ ...p, [k]: v }));

  async function save() {
    if (!form.name?.trim()) { toast.error('El nombre es obligatorio'); return; }
    setSaving(true);
    const payload = {
      tenant_id: getTenantId(), name: form.name!.trim(),
      rfc: form.rfc?.trim() || null, contact_name: form.contact_name?.trim() || null,
      phone: form.phone?.trim() || null, email: form.email?.trim() || null,
      address: [form.street, form.colonia, form.postal_code, form.city, form.state_region].filter(Boolean).join(', ') || form.address?.trim() || null,
      street: form.street?.trim() || null, colonia: form.colonia?.trim() || null,
      postal_code: form.postal_code?.trim() || null, city: form.city?.trim() || null,
      state_region: form.state_region?.trim() || null,
      payment_terms: form.payment_terms ?? 'contado',
      credit_limit: Number(form.credit_limit) || 0,
      notes: form.notes?.trim() || null, active: true,
      updated_at: new Date().toISOString(),
    };
    if (form.id) await supabase.from('suppliers').update(payload).eq('id', form.id);
    else await supabase.from('suppliers').insert({ ...payload, branch_id: activeBranchId ?? null });
    toast.success(form.id ? 'Proveedor actualizado' : 'Proveedor creado');
    setSaving(false); onSaved();
  }

  const F = ({ label, k, placeholder, type }: { label: string; k: keyof Supplier; placeholder?: string; type?: string }) => (
    <div>
      <label style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '.05em', display: 'block', marginBottom: 4 }}>{label}</label>
      <input type={type ?? 'text'} value={(form[k] as string) ?? ''} placeholder={placeholder}
        onChange={e => set(k, e.target.value)}
        style={{ width: '100%', background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8, padding: '8px 12px', fontSize: 13, outline: 'none', color: '#1f2937' }} />
    </div>
  );

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9000, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: 'white', borderRadius: 16, width: '100%', maxWidth: 560, maxHeight: '90vh', overflow: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}>
        <div style={{ padding: '18px 24px', borderBottom: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: '#1f2937', margin: 0 }}>{form.id ? 'Editar' : 'Nuevo'} proveedor</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={18} color="#9ca3af" /></button>
        </div>
        <div style={{ padding: '18px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <F label="Nombre *" k="name" placeholder="Ej: Distribuidora La Cosecha" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <F label="RFC" k="rfc" placeholder="XAXX010101000" />
            <F label="Contacto" k="contact_name" placeholder="Nombre del vendedor" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <F label="Teléfono / WhatsApp" k="phone" type="tel" placeholder="+52 55 1234 5678" />
            <F label="Email" k="email" type="email" placeholder="proveedor@ejemplo.com" />
          </div>
          {/* Dirección estructurada */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '.05em', display: 'block', marginBottom: 4 }}>Dirección</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <input value={form.street ?? ''} onChange={e => set('street', e.target.value)}
                placeholder="Calle y número — Ej: Av. Insurgentes Sur 1234"
                style={{ width: '100%', background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8, padding: '8px 12px', fontSize: 13, outline: 'none', color: '#1f2937', boxSizing: 'border-box' as const }} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px', gap: 8 }}>
                <input value={form.colonia ?? ''} onChange={e => set('colonia', e.target.value)}
                  placeholder="Colonia / Barrio"
                  style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8, padding: '8px 12px', fontSize: 13, outline: 'none', color: '#1f2937' }} />
                <input value={form.postal_code ?? ''} onChange={e => set('postal_code', e.target.value.replace(/\D/g,''))} maxLength={5}
                  placeholder="C.P."
                  style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8, padding: '8px 12px', fontSize: 13, outline: 'none', color: '#1f2937', fontFamily: 'monospace' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <input value={form.city ?? ''} onChange={e => set('city', e.target.value)}
                  placeholder="Ciudad / Municipio"
                  style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8, padding: '8px 12px', fontSize: 13, outline: 'none', color: '#1f2937' }} />
                <input value={form.state_region ?? ''} onChange={e => set('state_region', e.target.value)}
                  placeholder="Estado"
                  style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8, padding: '8px 12px', fontSize: 13, outline: 'none', color: '#1f2937' }} />
              </div>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '.05em', display: 'block', marginBottom: 4 }}>Condiciones de pago</label>
              <select value={form.payment_terms ?? 'contado'} onChange={e => set('payment_terms', e.target.value)}
                style={{ width: '100%', background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8, padding: '8px 12px', fontSize: 13, outline: 'none', color: '#1f2937' }}>
                {PAYMENT_TERMS.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '.05em', display: 'block', marginBottom: 4 }}>Límite de crédito ($)</label>
              <input type="number" min={0} step={100} value={form.credit_limit ?? 0}
                onChange={e => set('credit_limit', parseFloat(e.target.value) || 0)}
                style={{ width: '100%', background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8, padding: '8px 12px', fontSize: 13, outline: 'none', color: '#1f2937', fontFamily: 'monospace' }} />
            </div>
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '.05em', display: 'block', marginBottom: 4 }}>Notas</label>
            <textarea value={form.notes ?? ''} onChange={e => set('notes', e.target.value)} rows={2}
              placeholder="Horarios de entrega, condiciones especiales…"
              style={{ width: '100%', background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8, padding: '8px 12px', fontSize: 13, outline: 'none', color: '#1f2937', resize: 'vertical', fontFamily: 'inherit' }} />
          </div>
        </div>
        <div style={{ padding: '14px 24px', borderTop: '1px solid #f3f4f6', display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '8px 18px', borderRadius: 8, border: '1px solid #e5e7eb', background: 'transparent', color: '#6b7280', fontSize: 13, cursor: 'pointer' }}>Cancelar</button>
          <button onClick={save} disabled={saving}
            style={{ padding: '8px 22px', borderRadius: 8, border: 'none', background: saving ? '#93c5fd' : '#1B3A6B', color: 'white', fontSize: 13, fontWeight: 600, cursor: saving ? 'wait' : 'pointer' }}>
            {saving ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── PaymentModal ──────────────────────────────────────────────────────────────
function PaymentModal({ supplier, onClose, onSaved }: {
  supplier: Supplier; onClose: () => void; onSaved: () => void;
}) {
  const supabase = createClient();
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [method, setMethod] = useState('transferencia');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!amount || parseFloat(amount) <= 0) { toast.error('Ingresa un monto válido'); return; }
    setSaving(true);
    await supabase.from('supplier_payments').insert({
      tenant_id: getTenantId(), supplier_id: supplier.id,
      amount: parseFloat(amount), payment_date: date,
      method, reference: reference.trim() || null, notes: notes.trim() || null,
    });
    toast.success(`Pago de $${fmt(parseFloat(amount))} registrado`);
    setSaving(false); onSaved();
  }

  const inputStyle = { width: '100%', background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8, padding: '8px 12px', fontSize: 13, outline: 'none', color: '#1f2937' };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9001, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: 'white', borderRadius: 16, width: '100%', maxWidth: 440, boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}>
        <div style={{ padding: '18px 24px', borderBottom: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: '#1f2937', margin: 0 }}>Registrar pago</h3>
            <p style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{supplier.name}</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={18} color="#9ca3af" /></button>
        </div>
        <div style={{ padding: '18px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {(supplier.balance_pendiente ?? 0) > 0 && (
            <div style={{ background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: 8, padding: '10px 14px', fontSize: 12 }}>
              <span style={{ color: '#92400e', fontWeight: 600 }}>Saldo pendiente: ${fmt(supplier.balance_pendiente ?? 0)}</span>
            </div>
          )}
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '.05em', display: 'block', marginBottom: 4 }}>Monto a pagar *</label>
            <input type="number" min={0} step={0.01} value={amount} onChange={e => setAmount(e.target.value)}
              placeholder="0.00" style={{ ...inputStyle, fontFamily: 'monospace' }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '.05em', display: 'block', marginBottom: 4 }}>Fecha</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '.05em', display: 'block', marginBottom: 4 }}>Método</label>
              <select value={method} onChange={e => setMethod(e.target.value)} style={inputStyle}>
                {PAYMENT_METHODS.map(m => <option key={m.key} value={m.key}>{m.label}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '.05em', display: 'block', marginBottom: 4 }}>Referencia / Folio (opcional)</label>
            <input value={reference} onChange={e => setReference(e.target.value)} placeholder="Nº cheque, folio SPEI…" style={inputStyle} />
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '.05em', display: 'block', marginBottom: 4 }}>Notas</label>
            <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Opcional" style={inputStyle} />
          </div>
        </div>
        <div style={{ padding: '14px 24px', borderTop: '1px solid #f3f4f6', display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '8px 18px', borderRadius: 8, border: '1px solid #e5e7eb', background: 'transparent', color: '#6b7280', fontSize: 13, cursor: 'pointer' }}>Cancelar</button>
          <button onClick={save} disabled={saving}
            style={{ padding: '8px 22px', borderRadius: 8, border: 'none', background: saving ? '#86efac' : '#16a34a', color: 'white', fontSize: 13, fontWeight: 600, cursor: saving ? 'wait' : 'pointer' }}>
            {saving ? 'Guardando…' : 'Registrar pago'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── SupplierDetail ────────────────────────────────────────────────────────────
function SupplierDetail({ supplier, onBack, onEdit, onReload }: {
  supplier: Supplier; onBack: () => void;
  onEdit: (s: Supplier) => void; onReload: () => void;
}) {
  const supabase = createClient();
  const [tab, setTab] = useState<'overview'|'ingredients'|'payments'>('overview');
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [allIngredients, setAllIngredients] = useState<Ingredient[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [payModal, setPayModal] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const tid = getTenantId();
    const [{ data: ings }, { data: allIngs }, { data: pays }] = await Promise.all([
      supabase.from('ingredients').select('*').eq('tenant_id', tid).eq('supplier_id', supplier.id).order('name'),
      supabase.from('ingredients').select('id,name,category,unit,stock,cost,supplier_id').eq('tenant_id', tid).order('name'),
      supabase.from('supplier_payments').select('*').eq('tenant_id', tid).eq('supplier_id', supplier.id).order('payment_date', { ascending: false }),
    ]);
    setIngredients(ings ?? []);
    setAllIngredients(allIngs ?? []);
    setPayments(pays ?? []);
    setLoading(false);
  }, [supplier.id, supabase]);

  useEffect(() => { load(); }, [load]);

  async function linkIngredient(ingId: string, link: boolean) {
    await supabase.from('ingredients').update({ supplier_id: link ? supplier.id : null }).eq('id', ingId);
    toast.success(link ? 'Insumo vinculado' : 'Insumo desvinculado');
    load(); onReload();
  }

  const totalPaid = payments.reduce((s, p) => s + Number(p.amount), 0);
  const overLimit = supplier.credit_limit > 0 && (supplier.balance_pendiente ?? 0) > supplier.credit_limit;

  return (
    <div>
      {/* Breadcrumb */}
      <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', fontSize: 13, padding: 0, marginBottom: 16 }}>
        <ArrowLeft size={14} /> Todos los proveedores
      </button>

      {/* Header */}
      <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 12, padding: '18px 20px', marginBottom: 16, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#1f2937', margin: 0 }}>{supplier.name}</h2>
          <div style={{ display: 'flex', gap: 12, marginTop: 6, flexWrap: 'wrap' }}>
            {supplier.rfc && <span style={{ fontSize: 12, color: '#6b7280', fontFamily: 'monospace' }}>{supplier.rfc}</span>}
            {supplier.contact_name && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#6b7280' }}>
                <Mail size={11} />{supplier.contact_name}
              </span>
            )}
            {supplier.phone && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#6b7280' }}>
                <Phone size={11} />{supplier.phone}
              </span>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setPayModal(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8, border: 'none', background: '#16a34a', color: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            <Receipt size={13} /> Registrar pago
          </button>
          <button onClick={() => onEdit(supplier)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8, border: '1px solid #e5e7eb', background: 'white', color: '#374151', fontSize: 13, cursor: 'pointer' }}>
            <Edit2 size={13} /> Editar
          </button>
        </div>
      </div>

      {/* KPI cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,minmax(0,1fr))', gap: 10, marginBottom: 16 }}>
        {[
          { label: 'Saldo pendiente', val: '$' + fmt(supplier.balance_pendiente ?? 0),
            color: (supplier.balance_pendiente ?? 0) > 0 ? (overLimit ? '#dc2626' : '#d97706') : '#15803d',
            icon: <CreditCard size={15} />, alert: overLimit ? '⚠ Sobre límite' : null },
          { label: 'Total compras', val: '$' + fmt(supplier.total_compras ?? 0), color: '#1B3A6B', icon: <Receipt size={15} /> },
          { label: 'Total pagado', val: '$' + fmt(totalPaid), color: '#15803d', icon: <CheckCircle size={15} /> },
          { label: 'Insumos vinculados', val: (supplier.ingredients_count ?? ingredients.length).toString(),
            color: '#7c3aed', icon: <Package size={15} /> },
        ].map(c => (
          <div key={c.label} style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 10, padding: '12px 14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: c.color, marginBottom: 6 }}>{c.icon}
              <span style={{ fontSize: 10, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '.05em' }}>{c.label}</span>
            </div>
            <div style={{ fontSize: 20, fontWeight: 700, color: c.color, fontFamily: 'monospace' }}>{c.val}</div>
            {c.alert && <div style={{ fontSize: 10, color: '#dc2626', marginTop: 3, fontWeight: 600 }}>{c.alert}</div>}
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid #e5e7eb', marginBottom: 16 }}>
        {([['overview','Resumen'], ['ingredients','Insumos'], ['payments','Pagos']] as const).map(([t, l]) => (
          <button key={t} onClick={() => setTab(t as any)}
            style={{ padding: '10px 18px', fontSize: 13, fontWeight: 500, border: 'none', cursor: 'pointer', background: 'none',
              color: tab === t ? '#1B3A6B' : '#6b7280',
              borderBottom: tab === t ? '2px solid #1B3A6B' : '2px solid transparent' }}>
            {l}
          </button>
        ))}
      </div>

      {/* Tab: Overview */}
      {tab === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 10, padding: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '.05em' }}>Datos del proveedor</div>
            {[
              ['Condiciones de pago', termLabel(supplier.payment_terms)],
              ['Límite de crédito', supplier.credit_limit > 0 ? '$' + fmt(supplier.credit_limit) : 'Sin límite'],
              ['Dirección', supplier.address || '—'],
              ['Email', supplier.email || '—'],
              ['Notas', supplier.notes || '—'],
            ].map(([label, value]) => (
              <div key={label as string} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid #f3f4f6', fontSize: 13 }}>
                <span style={{ color: '#6b7280' }}>{label}</span>
                <span style={{ color: '#1f2937', fontWeight: 500, textAlign: 'right', maxWidth: '55%' }}>{value}</span>
              </div>
            ))}
          </div>
          <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 10, padding: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '.05em' }}>Últimos pagos</div>
            {payments.length === 0 ? (
              <p style={{ color: '#9ca3af', fontSize: 13 }}>Sin pagos registrados</p>
            ) : payments.slice(0, 5).map(p => (
              <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f3f4f6', fontSize: 13 }}>
                <div>
                  <div style={{ color: '#1f2937', fontWeight: 500 }}>${fmt(Number(p.amount))}</div>
                  <div style={{ fontSize: 11, color: '#9ca3af' }}>{p.payment_date} · {PAYMENT_METHODS.find(m=>m.key===p.method)?.label ?? p.method}</div>
                </div>
                {p.reference && <span style={{ fontSize: 11, color: '#6b7280', fontFamily: 'monospace' }}>{p.reference}</span>}
              </div>
            ))}
            {payments.length > 5 && (
              <button onClick={() => setTab('payments')} style={{ fontSize: 12, color: '#1B3A6B', background: 'none', border: 'none', cursor: 'pointer', marginTop: 8, padding: 0 }}>
                Ver todos ({payments.length}) →
              </button>
            )}
          </div>
        </div>
      )}

      {/* Tab: Ingredients */}
      {tab === 'ingredients' && (
        <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#1f2937' }}>Insumos de este proveedor</div>
            <div style={{ fontSize: 12, color: '#6b7280' }}>{ingredients.length} vinculados · {allIngredients.filter(i=>!i.supplier_id).length} sin asignar</div>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f9fafb' }}>
                {['Insumo','Categoría','Stock','Costo/unidad','Acción'].map(h => (
                  <th key={h} style={{ padding: '8px 14px', textAlign: h === 'Acción' ? 'center' : 'left', fontSize: 10, fontWeight: 600, color: '#9ca3af', letterSpacing: '.06em', textTransform: 'uppercase', borderBottom: '1px solid #e5e7eb' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {/* Linked ingredients first */}
              {ingredients.map(ing => (
                <tr key={ing.id} style={{ borderBottom: '1px solid #f3f4f6', background: '#f0fdf4' }}>
                  <td style={{ padding: '10px 14px', fontWeight: 500, color: '#1f2937' }}>{ing.name}</td>
                  <td style={{ padding: '10px 14px', color: '#6b7280' }}>{ing.category}</td>
                  <td style={{ padding: '10px 14px', fontFamily: 'monospace', color: '#374151' }}>{ing.stock} {ing.unit}</td>
                  <td style={{ padding: '10px 14px', fontFamily: 'monospace', color: '#374151' }}>${fmt(Number(ing.cost))}</td>
                  <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                    <button onClick={() => linkIngredient(ing.id, false)}
                      style={{ fontSize: 11, padding: '3px 10px', borderRadius: 6, border: '1px solid #fecaca', background: '#fef2f2', color: '#dc2626', cursor: 'pointer' }}>
                      Desvincular
                    </button>
                  </td>
                </tr>
              ))}
              {/* Unlinked ingredients */}
              {allIngredients.filter(i => !i.supplier_id).map(ing => (
                <tr key={ing.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '10px 14px', color: '#6b7280' }}>{ing.name}</td>
                  <td style={{ padding: '10px 14px', color: '#9ca3af', fontSize: 12 }}>{ing.category}</td>
                  <td style={{ padding: '10px 14px', fontFamily: 'monospace', color: '#9ca3af', fontSize: 12 }}>{ing.stock} {ing.unit}</td>
                  <td style={{ padding: '10px 14px', fontFamily: 'monospace', color: '#9ca3af', fontSize: 12 }}>${fmt(Number(ing.cost))}</td>
                  <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                    <button onClick={() => linkIngredient(ing.id, true)}
                      style={{ fontSize: 11, padding: '3px 10px', borderRadius: 6, border: '1px solid #bbf7d0', background: '#f0fdf4', color: '#15803d', cursor: 'pointer' }}>
                      + Vincular
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab: Payments */}
      {tab === 'payments' && (
        <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#1f2937' }}>Historial de pagos</div>
            <button onClick={() => setPayModal(true)}
              style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 14px', borderRadius: 8, border: 'none', background: '#16a34a', color: 'white', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
              <Plus size={12} /> Nuevo pago
            </button>
          </div>
          {payments.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>Sin pagos registrados</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#f9fafb' }}>
                  {['Fecha','Monto','Método','Referencia','Notas'].map(h => (
                    <th key={h} style={{ padding: '8px 14px', textAlign: 'left', fontSize: 10, fontWeight: 600, color: '#9ca3af', letterSpacing: '.06em', textTransform: 'uppercase', borderBottom: '1px solid #e5e7eb' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {payments.map(p => (
                  <tr key={p.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '10px 14px', color: '#374151' }}>{p.payment_date}</td>
                    <td style={{ padding: '10px 14px', fontFamily: 'monospace', fontWeight: 600, color: '#15803d' }}>${fmt(Number(p.amount))}</td>
                    <td style={{ padding: '10px 14px' }}>
                      <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 6, background: '#f3f4f6', color: '#374151' }}>
                        {PAYMENT_METHODS.find(m=>m.key===p.method)?.label ?? p.method}
                      </span>
                    </td>
                    <td style={{ padding: '10px 14px', fontFamily: 'monospace', color: '#6b7280', fontSize: 12 }}>{p.reference || '—'}</td>
                    <td style={{ padding: '10px 14px', color: '#6b7280', fontSize: 12 }}>{p.notes || '—'}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ background: '#f9fafb', borderTop: '2px solid #e5e7eb' }}>
                  <td style={{ padding: '10px 14px', fontWeight: 600, color: '#374151', fontSize: 13 }}>Total pagado</td>
                  <td style={{ padding: '10px 14px', fontFamily: 'monospace', fontWeight: 700, color: '#15803d', fontSize: 14 }}>${fmt(totalPaid)}</td>
                  <td colSpan={3} />
                </tr>
              </tfoot>
            </table>
          )}
        </div>
      )}

      {payModal && (
        <PaymentModal supplier={supplier} onClose={() => setPayModal(false)}
          onSaved={() => { setPayModal(false); load(); onReload(); }} />
      )}
    </div>
  );
}

// ── Main: SuppliersManagement ─────────────────────────────────────────────────
export default function SuppliersManagement() {
  const supabase = createClient();
  const { activeBranchId } = useBranch();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Supplier | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const tid = getTenantId();
    const [{ data: sups }, { data: balances }] = await Promise.all([
      (() => {
        let q = supabase.from('suppliers').select('*').eq('tenant_id', tid).eq('active', true).order('name');
        // Mostrar globales (branch_id null) + los de esta sucursal
        if (activeBranchId) q = (q as any).or(`branch_id.is.null,branch_id.eq.${activeBranchId}`);
        return q;
      })(),
      supabase.from('v_supplier_balance').select('*').eq('tenant_id', tid),
    ]);
    const balMap: Record<string, any> = {};
    (balances ?? []).forEach((b: any) => { balMap[b.supplier_id] = b; });
    const enriched = (sups ?? []).map((s: any) => ({ ...s, ...(balMap[s.id] ?? {}) }));
    setSuppliers(enriched);
    if (selected) {
      const updated = enriched.find((s: Supplier) => s.id === selected.id);
      if (updated) setSelected(updated);
    }
    setLoading(false);
  }, [supabase, selected?.id]); // eslint-disable-line

  useEffect(() => { load(); }, []); // eslint-disable-line

  if (selected) {
    return (
      <div style={{ padding: 24 }}>
        <SupplierDetail supplier={selected} onBack={() => { setSelected(null); load(); }}
          onEdit={(s) => { setEditing(s); setModalOpen(true); }}
          onReload={load} />
        {modalOpen && (
          <SupplierModal supplier={editing}
            onClose={() => { setModalOpen(false); setEditing(null); }}
            onSaved={() => { setModalOpen(false); setEditing(null); load(); }} />
        )}
      </div>
    );
  }

  const totalDeuda = suppliers.reduce((s, p) => s + (p.balance_pendiente ?? 0), 0);
  const conCredito = suppliers.filter(s => (s.balance_pendiente ?? 0) > 0).length;
  const filtered = suppliers.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    (s.contact_name ?? '').toLowerCase().includes(search.toLowerCase()) ||
    (s.city ?? '').toLowerCase().includes(search.toLowerCase())
  );

  async function deactivate(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm('¿Archivar este proveedor?')) return;
    await supabase.from('suppliers').update({ active: false }).eq('id', id);
    toast.success('Proveedor archivado');
    load();
  }

  return (
    <div style={{ padding: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: 'white', margin: 0 }}>Proveedores</h1>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>Gestión de proveedores, crédito y compras</p>
        </div>
        <button onClick={() => { setEditing(null); setModalOpen(true); }}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 18px', borderRadius: 10, background: '#f59e0b', border: 'none', color: '#1B3A6B', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
          <Plus size={14} /> Nuevo proveedor
        </button>
      </div>

      {/* KPI cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Proveedores activos', val: loading ? '…' : suppliers.length.toString(), color: '#60a5fa', bg: 'rgba(96,165,250,0.1)', icon: '🏭' },
          { label: 'Con saldo pendiente', val: loading ? '…' : conCredito.toString(), color: conCredito > 0 ? '#f87171' : '#4ade80', bg: conCredito > 0 ? 'rgba(248,113,113,0.1)' : 'rgba(74,222,128,0.1)', icon: '⏳' },
          { label: 'Deuda total', val: loading ? '…' : '$' + fmt(totalDeuda), color: totalDeuda > 0 ? '#fbbf24' : '#4ade80', bg: totalDeuda > 0 ? 'rgba(251,191,36,0.1)' : 'rgba(74,222,128,0.1)', icon: '💳' },
        ].map(card => (
          <div key={card.label} style={{ background: card.bg, border: `1px solid ${card.color}33`, borderRadius: 12, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 22 }}>{card.icon}</span>
            <div>
              <div style={{ fontSize: 22, fontWeight: 700, color: card.color, fontFamily: 'monospace' }}>{card.val}</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', marginTop: 1 }}>{card.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Search + filtros */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar proveedor…"
          style={{ flex: 1, minWidth: 200, padding: '8px 14px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.05)', fontSize: 13, outline: 'none', color: 'white' }} />
      </div>

      {/* Lista */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'rgba(255,255,255,0.3)' }}>Cargando…</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, background: 'rgba(255,255,255,0.03)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>🏭</div>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14 }}>{search ? 'Sin resultados.' : 'Sin proveedores. Agrega el primero.'}</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.map(s => {
            const balance = s.balance_pendiente ?? 0;
            const limit = s.credit_limit ?? 0;
            const pct = limit > 0 ? Math.min((balance / limit) * 100, 100) : 0;
            const barColor = pct > 80 ? '#ef4444' : pct > 50 ? '#f59e0b' : '#4ade80';
            return (
              <div key={s.id} onClick={() => setSelected(s)}
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '14px 16px', cursor: 'pointer', transition: 'background 0.15s' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                  {/* Avatar */}
                  <div style={{ width: 42, height: 42, borderRadius: 10, background: 'rgba(245,158,11,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>
                    🏭
                  </div>
                  {/* Info principal */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: 'white' }}>{s.name}</span>
                      {balance > 0 && (
                        <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: 'rgba(248,113,113,0.15)', color: '#f87171', border: '1px solid rgba(248,113,113,0.3)', fontFamily: 'monospace' }}>
                          ${fmt(balance)} pendiente
                        </span>
                      )}
                      <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.4)' }}>
                        {termLabel(s.payment_terms)}
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 3, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                      {s.contact_name && <span>👤 {s.contact_name}</span>}
                      {s.phone && <span>📞 {s.phone}</span>}
                      {s.city && <span>📍 {s.city}{s.state_region ? `, ${s.state_region}` : ''}</span>}
                      <span>📦 {s.ingredients_count ?? 0} insumos</span>
                    </div>
                    {/* Barra de crédito */}
                    {limit > 0 && (
                      <div style={{ marginTop: 8 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 3 }}>
                          <span>Crédito usado</span>
                          <span style={{ color: barColor, fontFamily: 'monospace' }}>${fmt(balance)} / ${fmt(limit)}</span>
                        </div>
                        <div style={{ height: 4, background: 'rgba(255,255,255,0.08)', borderRadius: 4, overflow: 'hidden' }}>
                          <div style={{ width: `${pct}%`, height: '100%', background: barColor, borderRadius: 4, transition: 'width 0.3s' }} />
                        </div>
                      </div>
                    )}
                  </div>
                  {/* Acciones */}
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                    <button onClick={() => { setEditing(s); setModalOpen(true); }}
                      style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: 13 }}>✏️</button>
                    <button onClick={e => deactivate(s.id, e)}
                      style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid rgba(239,68,68,0.2)', background: 'none', color: 'rgba(239,68,68,0.6)', cursor: 'pointer', fontSize: 13 }}>🗑️</button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {modalOpen && (
        <SupplierModal supplier={editing}
          onClose={() => { setModalOpen(false); setEditing(null); }}
          onSaved={() => { setModalOpen(false); setEditing(null); load(); }} />
      )}
    </div>
  );
}
