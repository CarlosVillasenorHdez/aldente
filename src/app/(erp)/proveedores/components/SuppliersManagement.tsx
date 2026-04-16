'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { getCurrentTenantId as getTenantId } from '@/lib/tenantStore';
import { toast } from 'sonner';
import { Plus, X, Edit2, Phone, Mail, CreditCard, AlertCircle,
         CheckCircle, Package, Receipt, ChevronRight, ArrowLeft } from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────
interface Supplier {
  id: string; name: string; rfc: string | null; contact_name: string | null;
  phone: string | null; email: string | null; address: string | null;
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
  address: '', payment_terms: 'contado', credit_limit: 0, notes: '',
};

const fmt = (n: number) => n.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const termLabel = (t: string) => PAYMENT_TERMS.find(x => x.key === t)?.label ?? t;

// ── SupplierModal ─────────────────────────────────────────────────────────────
function SupplierModal({ supplier, onClose, onSaved }: {
  supplier: Partial<Supplier> | null; onClose: () => void; onSaved: () => void;
}) {
  const supabase = createClient();
  const [form, setForm] = useState<Partial<Supplier>>(supplier ?? EMPTY_SUP);
  const [saving, setSaving] = useState(false);
  const set = (k: keyof Supplier, v: any) => setForm(p => ({ ...p, [k]: v }));

  async function save() {
    if (!form.name?.trim()) { toast.error('El nombre es obligatorio'); return; }
    setSaving(true);
    const payload = {
      tenant_id: getTenantId(), name: form.name!.trim(),
      rfc: form.rfc?.trim() || null, contact_name: form.contact_name?.trim() || null,
      phone: form.phone?.trim() || null, email: form.email?.trim() || null,
      address: form.address?.trim() || null, payment_terms: form.payment_terms ?? 'contado',
      credit_limit: Number(form.credit_limit) || 0,
      notes: form.notes?.trim() || null, active: true,
      updated_at: new Date().toISOString(),
    };
    if (form.id) await supabase.from('suppliers').update(payload).eq('id', form.id);
    else await supabase.from('suppliers').insert(payload);
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
          <F label="Dirección" k="address" placeholder="Calle, colonia, ciudad" />
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
      supabase.from('suppliers').select('*').eq('tenant_id', tid).eq('active', true).order('name'),
      supabase.from('v_supplier_balance').select('*').eq('tenant_id', tid),
    ]);
    const balMap: Record<string, any> = {};
    (balances ?? []).forEach((b: any) => { balMap[b.supplier_id] = b; });
    const enriched = (sups ?? []).map((s: any) => ({ ...s, ...(balMap[s.id] ?? {}) }));
    setSuppliers(enriched);
    // Refresh selected if open
    if (selected) {
      const updated = enriched.find((s: Supplier) => s.id === selected.id);
      if (updated) setSelected(updated);
    }
    setLoading(false);
  }, [supabase, selected?.id]); // eslint-disable-line

  useEffect(() => { load(); }, []); // eslint-disable-line

  const filtered = suppliers.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    (s.contact_name ?? '').toLowerCase().includes(search.toLowerCase())
  );
  const totalDeuda = suppliers.reduce((s, p) => s + (p.balance_pendiente ?? 0), 0);

  async function deactivate(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm('¿Archivar este proveedor?')) return;
    await supabase.from('suppliers').update({ active: false }).eq('id', id);
    toast.success('Proveedor archivado');
    load();
  }

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

  return (
    <div style={{ padding: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
        <div />
        <button onClick={() => { setEditing(null); setModalOpen(true); }}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 18px', borderRadius: 10, background: '#1B3A6B', border: 'none', color: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
          <Plus size={14} /> Nuevo proveedor
        </button>
      </div>

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Total de proveedores', val: suppliers.length.toString(), icon: '🏭', color: '#1B3A6B' },
          { label: 'Con saldo pendiente', val: suppliers.filter(s => (s.balance_pendiente ?? 0) > 0).length.toString(),
            icon: '⚠', color: suppliers.filter(s => (s.balance_pendiente ?? 0) > 0).length > 0 ? '#dc2626' : '#15803d' },
          { label: 'Deuda total (crédito)', val: '$' + fmt(totalDeuda), icon: '💳', color: totalDeuda > 0 ? '#d97706' : '#15803d' },
        ].map(c => (
          <div key={c.label} style={{ background: 'white', borderRadius: 12, border: '1px solid #e5e7eb', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 24, flexShrink: 0 }}>{c.icon}</span>
            <div>
              <div style={{ fontSize: 20, fontWeight: 700, color: c.color, fontFamily: 'monospace' }}>{loading ? '…' : c.val}</div>
              <div style={{ fontSize: 11, color: '#6b7280', marginTop: 1 }}>{c.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Search */}
      <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar proveedor…"
        style={{ width: '100%', maxWidth: 320, padding: '8px 14px', borderRadius: 10, border: '1px solid #e5e7eb', background: 'white', fontSize: 13, outline: 'none', color: '#1f2937', marginBottom: 14 }} />

      {/* Table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#9ca3af' }}>Cargando…</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, background: 'white', borderRadius: 12, border: '1px solid #e5e7eb' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>🏭</div>
          <p style={{ color: '#6b7280', fontSize: 14 }}>{search ? 'Sin resultados.' : 'Sin proveedores. Agrega el primero.'}</p>
        </div>
      ) : (
        <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f9fafb' }}>
                {['Proveedor','Contacto','Cond. pago','Insumos','Compras totales','Saldo pendiente',''].map(h => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: h === '' ? 'center' : 'left', fontSize: 10, fontWeight: 600, color: '#9ca3af', letterSpacing: '.06em', textTransform: 'uppercase', borderBottom: '1px solid #e5e7eb' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(s => {
                const hasPending = (s.balance_pendiente ?? 0) > 0;
                const overLimit = s.credit_limit > 0 && (s.balance_pendiente ?? 0) > s.credit_limit;
                return (
                  <tr key={s.id} onClick={() => setSelected(s)}
                    style={{ borderBottom: '1px solid #f3f4f6', cursor: 'pointer', transition: 'background .1s' }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#f8faff')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'white')}>
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ fontWeight: 600, color: '#1f2937' }}>{s.name}</div>
                      {s.rfc && <div style={{ fontSize: 11, color: '#9ca3af', fontFamily: 'monospace', marginTop: 2 }}>{s.rfc}</div>}
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      {s.contact_name && <div style={{ color: '#374151' }}>{s.contact_name}</div>}
                      {s.phone && <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>{s.phone}</div>}
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 8, background: '#f3f4f6', color: '#374151', fontWeight: 500 }}>{termLabel(s.payment_terms)}</span>
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{ fontSize: 12, color: (s.ingredients_count ?? 0) > 0 ? '#7c3aed' : '#9ca3af', fontWeight: (s.ingredients_count ?? 0) > 0 ? 600 : 400 }}>
                        {s.ingredients_count ?? 0} insumo{(s.ingredients_count ?? 0) !== 1 ? 's' : ''}
                      </span>
                    </td>
                    <td style={{ padding: '12px 14px', fontFamily: 'monospace', color: '#374151' }}>${fmt(s.total_compras ?? 0)}</td>
                    <td style={{ padding: '12px 14px' }}>
                      {hasPending ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                          <span style={{ fontFamily: 'monospace', fontWeight: 600, color: overLimit ? '#dc2626' : '#d97706' }}>${fmt(s.balance_pendiente ?? 0)}</span>
                          {overLimit && <span title="Sobre el límite de crédito"><AlertCircle size={12} color="#dc2626" /></span>}
                        </div>
                      ) : (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#15803d', fontSize: 12 }}>
                          <CheckCircle size={12} /> Al día
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                        <span style={{ color: '#9ca3af', fontSize: 12 }}><ChevronRight size={16} /></span>
                        <button onClick={e => deactivate(s.id, e)}
                          style={{ background: 'none', border: '1px solid #fee2e2', borderRadius: 6, padding: '3px 7px', cursor: 'pointer', color: '#dc2626' }}
                          title="Archivar">
                          <X size={11} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            {(suppliers.reduce((s,p) => s+(p.total_compras??0), 0)) > 0 && (
              <tfoot>
                <tr style={{ background: '#f9fafb', borderTop: '2px solid #e5e7eb' }}>
                  <td colSpan={4} style={{ padding: '10px 14px', fontSize: 12, fontWeight: 600, color: '#374151' }}>Total</td>
                  <td style={{ padding: '10px 14px', fontFamily: 'monospace', fontWeight: 700, color: '#1f2937' }}>${fmt(suppliers.reduce((s,p)=>s+(p.total_compras??0),0))}</td>
                  <td style={{ padding: '10px 14px', fontFamily: 'monospace', fontWeight: 700, color: totalDeuda > 0 ? '#d97706' : '#15803d' }}>${fmt(totalDeuda)}</td>
                  <td />
                </tr>
              </tfoot>
            )}
          </table>
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
