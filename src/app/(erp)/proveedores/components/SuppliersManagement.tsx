'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { getCurrentTenantId as getTenantId } from '@/lib/tenantStore';
import { toast } from 'sonner';
import { Plus, X, Edit2, Phone, Mail, Building2, CreditCard, AlertCircle, CheckCircle } from 'lucide-react';

interface Supplier {
  id: string; name: string; rfc: string | null; contact_name: string | null;
  phone: string | null; email: string | null; address: string | null;
  payment_terms: string; credit_limit: number; notes: string | null; active: boolean;
  // from view
  balance_pendiente?: number; total_compras?: number; facturas_pendientes?: number;
}

const PAYMENT_TERMS = [
  { key: 'contado',  label: 'Contado' },
  { key: '15_dias',  label: '15 días' },
  { key: '30_dias',  label: '30 días' },
  { key: '60_dias',  label: '60 días' },
];

const EMPTY: Partial<Supplier> = {
  name: '', rfc: '', contact_name: '', phone: '', email: '',
  address: '', payment_terms: 'contado', credit_limit: 0, notes: '',
};

function fmt(n: number) {
  return n.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function SupplierModal({ supplier, onClose, onSaved }: {
  supplier: Partial<Supplier> | null; onClose: () => void; onSaved: () => void;
}) {
  const supabase = createClient();
  const [form, setForm] = useState<Partial<Supplier>>(supplier ?? EMPTY);
  const [saving, setSaving] = useState(false);
  const set = (k: keyof Supplier, v: any) => setForm(p => ({ ...p, [k]: v }));

  async function save() {
    if (!form.name?.trim()) { toast.error('El nombre del proveedor es obligatorio'); return; }
    setSaving(true);
    const payload = {
      tenant_id: getTenantId(),
      name: form.name!.trim(), rfc: form.rfc?.trim() || null,
      contact_name: form.contact_name?.trim() || null,
      phone: form.phone?.trim() || null, email: form.email?.trim() || null,
      address: form.address?.trim() || null,
      payment_terms: form.payment_terms ?? 'contado',
      credit_limit: Number(form.credit_limit) || 0,
      notes: form.notes?.trim() || null, active: true,
      updated_at: new Date().toISOString(),
    };
    if (form.id) {
      await supabase.from('suppliers').update(payload).eq('id', form.id);
    } else {
      await supabase.from('suppliers').insert(payload);
    }
    toast.success(form.id ? 'Proveedor actualizado' : 'Proveedor creado');
    setSaving(false);
    onSaved();
  }

  const inp = (label: string, key: keyof Supplier, opts?: { placeholder?: string; type?: string }) => (
    <div>
      <label style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '.05em', display: 'block', marginBottom: 4 }}>{label}</label>
      <input type={opts?.type ?? 'text'} value={(form[key] as string) ?? ''} placeholder={opts?.placeholder}
        onChange={e => set(key, e.target.value)}
        style={{ width: '100%', background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8, padding: '8px 12px', fontSize: 13, outline: 'none', color: '#1f2937' }} />
    </div>
  );

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9000, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: 'white', borderRadius: 16, width: '100%', maxWidth: 560, maxHeight: '90vh', overflow: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1f2937', margin: 0 }}>
            {form.id ? 'Editar proveedor' : 'Nuevo proveedor'}
          </h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}><X size={18} color="#6b7280" /></button>
        </div>
        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {inp('Nombre del proveedor *', 'name', { placeholder: 'Ej: Distribuidora La Cosecha' })}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {inp('RFC', 'rfc', { placeholder: 'XAXX010101000' })}
            {inp('Contacto', 'contact_name', { placeholder: 'Nombre del vendedor' })}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {inp('Teléfono / WhatsApp', 'phone', { placeholder: '+52 55 1234 5678', type: 'tel' })}
            {inp('Email', 'email', { placeholder: 'proveedor@ejemplo.com', type: 'email' })}
          </div>
          {inp('Dirección', 'address', { placeholder: 'Calle, colonia, ciudad' })}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
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
            <textarea value={form.notes ?? ''} onChange={e => set('notes', e.target.value)} rows={2} placeholder="Horarios de entrega, condiciones especiales…"
              style={{ width: '100%', background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8, padding: '8px 12px', fontSize: 13, outline: 'none', color: '#1f2937', resize: 'vertical', fontFamily: 'inherit' }} />
          </div>
        </div>
        <div style={{ padding: '14px 24px', borderTop: '1px solid #f3f4f6', display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '9px 20px', borderRadius: 10, border: '1px solid #e5e7eb', background: 'transparent', color: '#6b7280', fontSize: 13, cursor: 'pointer' }}>Cancelar</button>
          <button onClick={save} disabled={saving}
            style={{ padding: '9px 24px', borderRadius: 10, border: 'none', background: '#1B3A6B', color: 'white', fontSize: 13, fontWeight: 600, cursor: saving ? 'wait' : 'pointer', opacity: saving ? 0.7 : 1 }}>
            {saving ? 'Guardando…' : 'Guardar proveedor'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SuppliersManagement() {
  const supabase = createClient();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
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
    setSuppliers((sups ?? []).map((s: any) => ({ ...s, ...balMap[s.id] })));
    setLoading(false);
  }, [supabase]);

  useEffect(() => { load(); }, [load]);

  const filtered = suppliers.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    (s.contact_name ?? '').toLowerCase().includes(search.toLowerCase())
  );

  const totalDeuda = suppliers.reduce((s, p) => s + (p.balance_pendiente ?? 0), 0);
  const totalCompras = suppliers.reduce((s, p) => s + (p.total_compras ?? 0), 0);
  const withCredit = suppliers.filter(s => (s.balance_pendiente ?? 0) > 0).length;

  async function deactivate(id: string) {
    if (!confirm('¿Archivar este proveedor? No se eliminará del historial.')) return;
    await supabase.from('suppliers').update({ active: false }).eq('id', id);
    toast.success('Proveedor archivado');
    load();
  }

  const termLabel = (t: string) => PAYMENT_TERMS.find(x => x.key === t)?.label ?? t;

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', padding: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: '#1f2937', margin: 0 }}>Proveedores</h1>
          <p style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>Gestión de proveedores y cuenta corriente</p>
        </div>
        <button onClick={() => { setEditing(null); setModalOpen(true); }}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 18px', borderRadius: 10, background: '#1B3A6B', border: 'none', color: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
          <Plus size={14} /> Nuevo proveedor
        </button>
      </div>

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Total de proveedores', val: suppliers.length.toString(), icon: <Building2 size={16} />, color: '#1B3A6B' },
          { label: 'Con saldo pendiente', val: withCredit.toString(), icon: <AlertCircle size={16} />, color: withCredit > 0 ? '#dc2626' : '#15803d' },
          { label: 'Deuda total (crédito)', val: '$' + fmt(totalDeuda), icon: <CreditCard size={16} />, color: totalDeuda > 0 ? '#d97706' : '#15803d' },
        ].map(c => (
          <div key={c.label} style={{ background: 'white', borderRadius: 12, border: '1px solid #e5e7eb', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: c.color + '12', display: 'flex', alignItems: 'center', justifyContent: 'center', color: c.color, flexShrink: 0 }}>{c.icon}</div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#1f2937', fontFamily: 'monospace' }}>{c.val}</div>
              <div style={{ fontSize: 11, color: '#6b7280', marginTop: 1 }}>{c.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div style={{ marginBottom: 16 }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar proveedor…"
          style={{ width: '100%', maxWidth: 360, padding: '8px 14px', borderRadius: 10, border: '1px solid #e5e7eb', background: 'white', fontSize: 13, outline: 'none', color: '#1f2937' }} />
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#9ca3af' }}>Cargando proveedores…</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, background: 'white', borderRadius: 12, border: '1px solid #e5e7eb' }}>
          <Building2 size={32} color="#d1d5db" style={{ margin: '0 auto 12px' }} />
          <p style={{ color: '#6b7280', fontSize: 14 }}>
            {search ? 'Sin resultados para esa búsqueda.' : 'Sin proveedores registrados. Agrega el primero.'}
          </p>
        </div>
      ) : (
        <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f9fafb' }}>
                {['Proveedor', 'Contacto', 'Condiciones', 'Compras totales', 'Saldo pendiente', 'Facturas', ''].map(h => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: h === '' ? 'center' : 'left', fontSize: 10, fontWeight: 600, color: '#9ca3af', letterSpacing: '.06em', textTransform: 'uppercase', borderBottom: '1px solid #e5e7eb' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(s => {
                const hasPending = (s.balance_pendiente ?? 0) > 0;
                const overLimit = s.credit_limit > 0 && (s.balance_pendiente ?? 0) > s.credit_limit;
                return (
                  <tr key={s.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ fontWeight: 600, color: '#1f2937' }}>{s.name}</div>
                      {s.rfc && <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2, fontFamily: 'monospace' }}>{s.rfc}</div>}
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      {s.contact_name && <div style={{ color: '#374151' }}>{s.contact_name}</div>}
                      {s.phone && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#6b7280', marginTop: 2 }}>
                          <Phone size={10} />{s.phone}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 8, background: '#f3f4f6', color: '#374151', fontWeight: 500 }}>
                        {termLabel(s.payment_terms)}
                      </span>
                      {s.credit_limit > 0 && (
                        <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 3 }}>Límite: ${fmt(s.credit_limit)}</div>
                      )}
                    </td>
                    <td style={{ padding: '12px 14px', fontFamily: 'monospace', color: '#374151' }}>
                      ${fmt(s.total_compras ?? 0)}
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        {hasPending ? (
                          <span style={{ fontFamily: 'monospace', fontWeight: 600, color: overLimit ? '#dc2626' : '#d97706' }}>
                            ${fmt(s.balance_pendiente ?? 0)}
                          </span>
                        ) : (
                          <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#15803d', fontSize: 11 }}>
                            <CheckCircle size={12} /> Al día
                          </span>
                        )}
                        {overLimit && <span title="Sobre el límite de crédito"><AlertCircle size={12} color="#dc2626" /></span>}
                      </div>
                    </td>
                    <td style={{ padding: '12px 14px', color: '#6b7280', fontSize: 12 }}>
                      {s.facturas_pendientes ?? 0} pendiente{(s.facturas_pendientes ?? 0) !== 1 ? 's' : ''}
                    </td>
                    <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                        <button onClick={() => { setEditing(s); setModalOpen(true); }}
                          style={{ background: 'none', border: '1px solid #e5e7eb', borderRadius: 6, padding: '4px 8px', cursor: 'pointer', color: '#374151' }}
                          title="Editar">
                          <Edit2 size={12} />
                        </button>
                        <button onClick={() => deactivate(s.id)}
                          style={{ background: 'none', border: '1px solid #fee2e2', borderRadius: 6, padding: '4px 8px', cursor: 'pointer', color: '#dc2626' }}
                          title="Archivar">
                          <X size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            {totalCompras > 0 && (
              <tfoot>
                <tr style={{ background: '#f9fafb', borderTop: '2px solid #e5e7eb' }}>
                  <td colSpan={3} style={{ padding: '10px 14px', fontSize: 12, fontWeight: 600, color: '#374151' }}>Total</td>
                  <td style={{ padding: '10px 14px', fontFamily: 'monospace', fontWeight: 700, color: '#1f2937' }}>${fmt(totalCompras)}</td>
                  <td style={{ padding: '10px 14px', fontFamily: 'monospace', fontWeight: 700, color: totalDeuda > 0 ? '#d97706' : '#15803d' }}>${fmt(totalDeuda)}</td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      )}

      {modalOpen && (
        <SupplierModal
          supplier={editing}
          onClose={() => { setModalOpen(false); setEditing(null); }}
          onSaved={() => { setModalOpen(false); setEditing(null); load(); }}
        />
      )}
    </div>
  );
}
