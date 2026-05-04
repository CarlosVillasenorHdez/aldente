'use client';
import { getCurrentTenantId as getTenantId } from '@/lib/tenantStore';
import { useAuth } from '@/contexts/AuthContext';



import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Search, Filter, Eye, XCircle, ChevronUp, ChevronDown, ChevronLeft, ChevronRight,
  Clock, CreditCard, Banknote, Download, RefreshCw, ClipboardList,
} from 'lucide-react';
import { toast } from 'sonner';
import OrderDetailModal from './OrderDetailModal';
import CancelOrderModal from './CancelOrderModal';
import { createClient } from '@/lib/supabase/client';
import { useAudit } from '@/hooks/useAudit';
import { useBranch } from '@/hooks/useBranch';

export type OrderStatus = 'abierta' | 'preparacion' | 'lista' | 'cerrada' | 'cancelada';
export type PaymentMethod = 'efectivo' | 'tarjeta' | null;

export interface OrderRecord {
  id: string;
  mesa: string;
  mesaNum: number;
  mesero: string;
  orderType?: 'mesa' | 'para_llevar';
  customerName?: string;
  items: { name: string; qty: number; price: number; emoji: string }[];
  subtotal: number;
  iva: number;
  discount: number;
  total: number;
  costActual: number;
  marginActual: number;
  marginPct: number;
  status: OrderStatus;
  payMethod: PaymentMethod;
  openedAt: string;
  closedAt: string | null;
  durationMin: number | null;
  branch: string;
  notes?: string;
  cancelType?: 'sin_costo' | 'con_costo' | null;
  wasteCost: number;
  cancelledComandas: { id: string; reason: string; wasteCost: number; hasCost: boolean }[];
  kitchenStatus?: string;
}

type SortField = 'id' | 'mesa' | 'mesero' | 'total' | 'openedAt' | 'status';
type SortDir = 'asc' | 'desc';

const statusConfig: Record<OrderStatus, { label: string; className: string; dotColor: string }> = {
  abierta: { label: 'Abierta', className: 'badge-abierta', dotColor: '#3b82f6' },
  preparacion: { label: 'En Preparación', className: 'badge-preparacion', dotColor: '#f59e0b' },
  lista: { label: 'Lista', className: 'badge-espera', dotColor: '#f59e0b' },
  cerrada: { label: 'Cerrada', className: 'badge-cerrada', dotColor: '#16a34a' },
  cancelada: { label: 'Cancelada', className: 'badge-cancelada', dotColor: '#9ca3af' },
};

const PAGE_SIZES = [10, 20, 50];

function todayStr() { return new Date().toISOString().split('T')[0]; }
function weekStart() {
  const d = new Date(); const day = d.getDay();
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
  return d.toISOString().split('T')[0];
}
function monthStart() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];
}

// ─── Skeleton ────────────────────────────────────────────────────────────────

function RowSkeleton() {
  return (
    <tr className="border-b animate-pulse" style={{ borderColor: '#f9fafb' }}>
      {Array.from({ length: 14 }).map((_, i) => (
        <td key={i} className="px-4 py-3.5">
          <div className="h-4 rounded bg-gray-100" style={{ width: i === 0 ? '20px' : i === 1 ? '80px' : '60px' }} />
        </td>
      ))}
    </tr>
  );
}

// ─── Empty State ─────────────────────────────────────────────────────────────

function EmptyOrders() {
  return (
    <tr>
      <td colSpan={14} className="py-16 text-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ backgroundColor: '#f3f4f6' }}>
            <ClipboardList size={28} className="text-gray-300" />
          </div>
          <div>
            <p className="text-base font-semibold text-gray-700 mb-1">No hay órdenes registradas</p>
            <p className="text-sm text-gray-400">
              Las órdenes aparecerán aquí cuando se creen desde el Punto de Venta.
            </p>
          </div>
        </div>
      </td>
    </tr>
  );
}

export default function OrdersTable() {
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'todas'>('todas');
  const [meseroFilter, setMeseroFilter] = useState('todos');
  const [dateFrom, setDateFrom] = useState(() => todayStr());
  const [dateTo, setDateTo] = useState(() => todayStr());
  const [sortField, setSortField] = useState<SortField>('id');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedOrder, setSelectedOrder] = useState<OrderRecord | null>(null);
  const [cancelOrder, setCancelOrder] = useState<OrderRecord | null>(null);
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());

  const supabase = createClient();
  const { activeBranchId } = useBranch();
  const { activeBranchName } = useBranch();
  const { log: auditLog } = useAudit();
  const { appUser } = useAuth();

  const fetchOrders = useCallback(async () => {
    const tenantId = appUser?.tenantId ?? getTenantId();
    if (!tenantId) { setLoading(false); return; }

    setLoading(true);
    let query = supabase
      .from('orders')
      .select('*, order_items(*), cancelled_comandas:orders!parent_order_id(id, status, cancel_type, cancel_reason, waste_cost, order_items(name, qty))')
      .eq('tenant_id', tenantId)
      .eq('is_comanda', false)
      .order('created_at', { ascending: false }); // abiertas no tienen closed_at

    // Filtro de sucursal — solo si hay una seleccionada (null = todas)
    if (activeBranchId) query = query.eq('branch_id', activeBranchId);

    // Dos queries: cerradas/canceladas por closed_at, abiertas siempre del día
    const from = (dateFrom || '2000-01-01') + 'T00:00:00';
    const to   = (dateTo   || '2099-12-31') + 'T23:59:59';

    // Query 1: órdenes cerradas/canceladas filtradas por closed_at
    let qCerradas = query
      .in('status', ['cerrada', 'cancelada'])
      .gte('closed_at', from)
      .lte('closed_at', to)
      .limit(500);

    // Query 2: órdenes abiertas/en prep — siempre visibles
    let qAbiertas = supabase
      .from('orders')
      .select('*, order_items(*), cancelled_comandas:orders!parent_order_id(id, status, cancel_type, cancel_reason, waste_cost, order_items(name, qty))')
      .eq('tenant_id', tenantId)
      .eq('is_comanda', false)
      .in('status', ['abierta', 'preparacion', 'lista'])
      .limit(100);
    if (activeBranchId) qAbiertas = qAbiertas.eq('branch_id', activeBranchId);

    const [{ data: cerradas, error: errC }, { data: abiertas, error: errA }] = await Promise.all([qCerradas, qAbiertas]);

    if (errC || errA) {
      toast.error('Error al cargar órdenes: ' + (errC?.message ?? errA?.message));
      setLoading(false);
      return;
    }
    const ordersData = [...(cerradas ?? []), ...(abiertas ?? [])];
    const error = null;
    if (false) {  // mantener compatibilidad con el bloque de error de abajo
      toast.error('');
      setLoading(false);
      return;
    }

    if (ordersData) {
      setOrders(ordersData.map((o) => ({
        id: o.id,
        mesa: o.mesa,
        mesaNum: o.mesa_num,
        mesero: o.mesero,
        orderType: (o.order_type ?? 'mesa') as 'mesa' | 'para_llevar',
        customerName: o.customer_name ?? undefined,
        items: (o.order_items || []).map((item: any) => ({
          name: item.name,
          qty: item.qty,
          price: Number(item.price),
          emoji: item.emoji,
        })),
        subtotal: Number(o.subtotal),
        iva: Number(o.iva),
        discount: Number(o.discount),
        total: Number(o.total),
        costActual: Number(o.cost_actual ?? 0),
        marginActual: Number(o.margin_actual ?? 0),
        marginPct: Number(o.margin_pct ?? 0),
        status: o.status as OrderStatus,
        payMethod: o.pay_method as PaymentMethod,
        openedAt: o.opened_at,
        closedAt: o.closed_at,
        durationMin: o.duration_min,
        branch: o.branch,
        notes: o.notes,
        cancelType: (o as any).cancel_type ?? null,
        wasteCost: Number((o as any).waste_cost ?? 0),
        cancelledComandas: ((o as any).cancelled_comandas || [])
          .filter((c: any) => c.status === 'cancelada')
          .map((c: any) => ({
            id: c.id,
            reason: c.cancel_reason || 'Cancelado',
            wasteCost: Number(c.waste_cost ?? 0),
            hasCost: c.cancel_type === 'con_costo',
          })),
        kitchenStatus: (o as any).kitchen_status ?? null,
      })));
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  // Realtime: auto-refresh orders list when any order changes from any device
  useEffect(() => {
    let retryTimeout: ReturnType<typeof setTimeout> | null = null;
    let retryCount = 0;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let destroyed = false;

    const connect = () => {
      if (destroyed) return;
      channel = supabase
        .channel(`orders-mgmt-${Date.now()}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
          fetchOrders();
        })
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            retryCount = 0;
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            if (channel) { supabase.removeChannel(channel); channel = null; }
            const delay = Math.min(3000 * Math.pow(2, retryCount), 30000);
            retryCount += 1;
            if (!destroyed) retryTimeout = setTimeout(connect, delay);
          }
        });
    };

    connect();
    return () => {
      destroyed = true;
      if (retryTimeout) clearTimeout(retryTimeout);
      if (channel) supabase.removeChannel(channel);
    };
  }, [supabase, fetchOrders]);

  const meseros = useMemo(() => {
    const set = new Set(orders.map((o) => o.mesero));
    return Array.from(set).sort();
  }, [orders]);

  const filtered = useMemo(() => {
    let result = orders.filter((o) => {
      const matchStatus = statusFilter === 'todas' || o.status === statusFilter;
      const matchMesero = meseroFilter === 'todos' || o.mesero === meseroFilter;
      const matchSearch = search === '' || o.id.toLowerCase().includes(search.toLowerCase()) || o.mesa.toLowerCase().includes(search.toLowerCase()) || o.mesero.toLowerCase().includes(search.toLowerCase()) || (o.customerName ?? '').toLowerCase().includes(search.toLowerCase());
      const orderDate = (o.closedAt ?? o.openedAt ?? '').slice(0, 10);
      const matchFrom = !dateFrom || orderDate >= dateFrom;
      const matchTo = !dateTo || orderDate <= dateTo;
      const matchBranch = !activeBranchId || !activeBranchId;  // branch filter applied at query level
      return matchStatus && matchMesero && matchSearch && matchFrom && matchTo && matchBranch;
    });

    result = [...result].sort((a, b) => {
      let av: any = a[sortField as keyof OrderRecord];
      let bv: any = b[sortField as keyof OrderRecord];
      if (sortField === 'id') { av = parseInt(a.id.replace('ORD-', '')); bv = parseInt(b.id.replace('ORD-', '')); }
      if (typeof av === 'string') av = av.toLowerCase();
      if (typeof bv === 'string') bv = bv.toLowerCase();
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return result;
  }, [orders, search, statusFilter, meseroFilter, sortField, sortDir, dateFrom, dateTo, activeBranchId, activeBranchName]);

  const totalPages = Math.ceil(filtered.length / pageSize);
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  const handleSort = (field: SortField) => {
    if (sortField === field) { setSortDir((d) => (d === 'asc' ? 'desc' : 'asc')); }
    else { setSortField(field); setSortDir('asc'); }
    setPage(1);
  };

  const handleCancelConfirm = async (orderId: string, reason: string, cancelType: 'sin_costo' | 'con_costo') => {
    const order = orders.find((o) => o.id === orderId);
    await supabase.from('orders').update({
      status: 'cancelada',
      cancel_type: cancelType,
      closed_at: new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }),
      notes: reason,
      updated_at: new Date().toISOString(),
    }).eq('id', orderId);
    // Audit trail
    await auditLog({
      action: cancelType === 'con_costo' ? 'merma_registrada' : 'orden_cancelada',
      entity: 'orders', entityId: orderId,
      entityName: order ? `${order.mesa} · ${order.mesero}` : orderId,
      oldValue: { status: order?.status, total: order?.total },
      newValue: { status: 'cancelada', cancel_type: cancelType },
      details: reason,
    });
    setCancelOrder(null);
    const label = cancelType === 'con_costo' ? '⚠️ Merma registrada' : 'Orden cancelada';
    toast.success(`${label} — ${orderId}. Motivo: "${reason}"`);
    await fetchOrders();
  };

  const handleSelectRow = (id: string) => {
    setSelectedRows((prev) => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  };

  const handleSelectAll = () => {
    if (selectedRows.size === paginated.length) setSelectedRows(new Set());
    else setSelectedRows(new Set(paginated.map((o) => o.id)));
  };

  const handleRefresh = async () => {
    await fetchOrders();
    toast.success('Órdenes actualizadas');
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ChevronUp size={12} className="text-gray-300" />;
    return sortDir === 'asc' ? <ChevronUp size={12} className="text-amber-500" /> : <ChevronDown size={12} className="text-amber-500" />;
  };

  const totalVentas = filtered.filter((o) => o.status === 'cerrada').reduce((s, o) => s + o.total, 0);
  const handleExportCSV = () => {
    const rows = filtered;
    const headers = ['ID Orden','Mesa','Mesero','Platillos','Subtotal','IVA','Descuento','Total','Método Pago','Estado','Apertura','Cierre','Duración (min)','Sucursal'];
    const lines = rows.map(o => [
      o.id, o.mesa, o.mesero,
      o.items.map((i:any) => `${i.emoji||''} ${i.name} x${i.qty}`).join(' | '),
      o.subtotal.toFixed(2), o.iva.toFixed(2), o.discount.toFixed(2), o.total.toFixed(2),
      o.payMethod ?? '', o.status,
      o.openedAt ? new Date(o.openedAt).toLocaleString('es-MX') : '',
      o.closedAt ? new Date(o.closedAt).toLocaleString('es-MX') : '',
      o.durationMin ?? '', o.branch ?? '',
    ].map((v:any) => `"${String(v).replace(/"/g,'""')}"`).join(','));
    const csv = [headers.join(','), ...lines].join('\n');
    const blob = new Blob(['\uFEFF'+csv], {type:'text/csv;charset=utf-8;'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `ordenes_${new Date().toISOString().slice(0,10)}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast.success(`${rows.length} órdenes exportadas`);
  };

  const handleExportSelected = () => {
    const rows = orders.filter((o:any) => selectedRows.has(o.id));
    if (!rows.length) return;
    const headers = ['ID Orden','Mesa','Mesero','Total','Método Pago','Estado','Apertura','Cierre'];
    const lines = rows.map((o:any) => [
      o.id, o.mesa, o.mesero, o.total.toFixed(2), o.payMethod??'', o.status,
      o.openedAt ? new Date(o.openedAt).toLocaleString('es-MX') : '',
      o.closedAt ? new Date(o.closedAt).toLocaleString('es-MX') : '',
    ].map((v:any) => `"${String(v).replace(/"/g,'""')}"`).join(','));
    const csv = [headers.join(','), ...lines].join('\n');
    const blob = new Blob(['\uFEFF'+csv], {type:'text/csv;charset=utf-8;'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `ordenes_sel_${new Date().toISOString().slice(0,10)}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast.success(`${rows.length} órdenes exportadas`);
  };

  const openCount = filtered.filter((o) => ['abierta', 'preparacion', 'lista'].includes(o.status)).length;
  const isDateFiltered = !!(dateFrom || dateTo);
  const hasMoreOrders = !isDateFiltered && orders.length >= 1000;
  const cerradasCount = filtered.filter((o) => o.status === 'cerrada').length;
  const cancelCount = filtered.filter((o) => o.status === 'cancelada').length;

  // Merma total: órdenes canceladas con costo + platillos cancelados dentro de órdenes cerradas
  const mermaFromCancelledOrders = filtered
    .filter((o) => o.status === 'cancelada' && o.cancelType === 'con_costo')
    .reduce((s, o) => s + (o.wasteCost > 0 ? o.wasteCost : o.subtotal), 0);
  const mermaFromCancelledItems = filtered
    .reduce((s, o) => {
      const itemsMerma = (o.cancelledComandas || [])
        .filter((c: any) => c.hasCost)
        .reduce((ss: number, c: any) => ss + (c.wasteCost || 0), 0);
      return s + itemsMerma;
    }, 0);
  const mermaTotal = mermaFromCancelledOrders + mermaFromCancelledItems;
  const ordenesMerma = filtered.filter((o) =>
    (o.status === 'cancelada' && o.cancelType === 'con_costo') ||
    (o.cancelledComandas || []).some((c: any) => c.hasCost)
  ).length;

  return (
    <div className="flex flex-col gap-4">
      {/* Summary KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Ventas — primary */}
        <div className="rounded-xl p-4 border md:col-span-1" style={{ backgroundColor: '#f0fdf4', borderColor: '#86efac' }}>
          <p className="text-xs font-medium mb-1" style={{ color: '#166534' }}>Ventas cerradas</p>
          <p className="font-mono font-bold text-xl" style={{ color: '#16a34a' }}>
            {loading ? '…' : `$${totalVentas.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`}
          </p>
          <p className="text-xs mt-1" style={{ color: '#166534' }}>{loading ? '' : `${cerradasCount} orden${cerradasCount !== 1 ? 'es' : ''}`}</p>
        </div>
        {/* Merma — highlighted */}
        <div className="rounded-xl p-4 border" style={{ backgroundColor: mermaTotal > 0 ? '#fef2f2' : '#f9fafb', borderColor: mermaTotal > 0 ? '#fca5a5' : '#e5e7eb' }}>
          <p className="text-xs font-medium mb-1" style={{ color: mermaTotal > 0 ? '#991b1b' : '#6b7280' }}>⚠️ Merma total</p>
          <p className="font-mono font-bold text-xl" style={{ color: mermaTotal > 0 ? '#dc2626' : '#9ca3af' }}>
            {loading ? '…' : mermaTotal > 0 ? `$${mermaTotal.toFixed(2)}` : '$0.00'}
          </p>
          <p className="text-xs mt-1" style={{ color: '#9ca3af' }}>{loading ? '' : `${ordenesMerma} orden${ordenesMerma !== 1 ? 'es' : ''} afectadas`}</p>
        </div>
        {/* Abiertas */}
        <div className="rounded-xl p-4 border" style={{ backgroundColor: '#fffbeb', borderColor: '#fde68a' }}>
          <p className="text-xs font-medium mb-1" style={{ color: '#92400e' }}>Abiertas ahora</p>
          <p className="font-mono font-bold text-xl" style={{ color: '#d97706' }}>{loading ? '…' : openCount}</p>
          <p className="text-xs mt-1" style={{ color: '#92400e' }}>En curso</p>
        </div>
        {/* Canceladas */}
        <div className="rounded-xl p-4 border" style={{ backgroundColor: '#f9fafb', borderColor: '#e5e7eb' }}>
          <p className="text-xs font-medium mb-1" style={{ color: '#6b7280' }}>Canceladas</p>
          <p className="font-mono font-bold text-xl" style={{ color: '#6b7280' }}>{loading ? '…' : cancelCount}</p>
          <p className="text-xs mt-1" style={{ color: '#9ca3af' }}>Total en el período</p>
        </div>
      </div>

      {/* Cancellation reasons breakdown — only show when there are cancellations */}
      {(() => {
        const allReasons: string[] = [];
        filtered.forEach(o => {
          (o.cancelledComandas || []).forEach((c: any) => {
            if (c.reason) allReasons.push(c.reason);
          });
        });
        if (allReasons.length === 0) return null;
        const reasonCounts = allReasons.reduce<Record<string,number>>((acc, r) => {
          acc[r] = (acc[r] || 0) + 1; return acc;
        }, {});
        const sorted = Object.entries(reasonCounts).sort((a,b) => b[1]-a[1]).slice(0,5);
        return (
          <div className="rounded-xl border p-4" style={{ backgroundColor: '#fff5f5', borderColor: '#fca5a5' }}>
            <p className="text-xs font-semibold mb-3" style={{ color: '#991b1b' }}>⚠️ Razones de cancelación más frecuentes</p>
            <div className="flex flex-wrap gap-2">
              {sorted.map(([reason, count]) => (
                <span key={reason} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium" style={{ background: '#fef2f2', border: '1px solid #fca5a5', color: '#dc2626' }}>
                  {reason}
                  <span className="font-bold px-1.5 py-0.5 rounded-full" style={{ background: '#dc2626', color: 'white', fontSize: '10px' }}>{count}</span>
                </span>
              ))}
            </div>
          </div>
        );
      })()}

      {/* Filters */}
      <div className="bg-white rounded-xl border p-4 flex flex-wrap items-center gap-3" style={{ borderColor: '#e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" placeholder="Buscar por orden, mesa, mesero..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="input-field pl-8 py-2 text-sm" />
        </div>
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1 flex-shrink-0">
          {(['todas', 'abierta', 'preparacion', 'cerrada', 'cancelada'] as const).map((s) => {
            const labels: Record<string, string> = { todas: 'Todas', abierta: 'Abiertas', preparacion: 'En Prep.', cerrada: 'Cerradas', cancelada: 'Canceladas' };
            return (
              <button key={s} onClick={() => { setStatusFilter(s); setPage(1); }} className="px-2.5 py-1.5 rounded-md text-xs font-semibold transition-all duration-150 whitespace-nowrap" style={{ backgroundColor: statusFilter === s ? 'white' : 'transparent', color: statusFilter === s ? '#1B3A6B' : '#6b7280', boxShadow: statusFilter === s ? '0 1px 2px rgba(0,0,0,0.08)' : 'none' }}>
                {labels[s]}
              </button>
            );
          })}
        </div>
        <select value={meseroFilter} onChange={(e) => { setMeseroFilter(e.target.value); setPage(1); }} className="input-field py-2 text-sm w-44 flex-shrink-0">
          <option value="todos">Todos los meseros</option>
          {meseros.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
        {/* Quick period buttons */}
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1 flex-shrink-0">
          {[
            { label: 'Hoy', action: () => { const d = todayStr(); setDateFrom(d); setDateTo(d); setPage(1); } },
            { label: 'Semana', action: () => { setDateFrom(weekStart()); setDateTo(todayStr()); setPage(1); } },
            { label: 'Mes', action: () => { setDateFrom(monthStart()); setDateTo(todayStr()); setPage(1); } },
          ].map((p) => (
            <button key={p.label} onClick={p.action}
              className="px-2.5 py-1.5 rounded-md text-xs font-semibold transition-all whitespace-nowrap"
              style={{ backgroundColor: 'transparent', color: '#6b7280' }}>
              {p.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span className="text-xs text-gray-500">Desde</span>
          <input type="date" value={dateFrom}
            onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
            className="input-field py-2 text-xs w-36"
          />
          <span className="text-xs text-gray-500">Hasta</span>
          <input type="date" value={dateTo}
            onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
            className="input-field py-2 text-xs w-36"
          />
          {(dateFrom || dateTo) && (
            <button onClick={() => { setDateFrom(''); setDateTo(''); setPage(1); }}
              className="text-xs text-gray-400 hover:text-red-500 transition-colors px-1" title="Limpiar fechas">✕</button>
          )}
        </div>
        <div className="flex items-center gap-2 ml-auto">
          {activeBranchName && (
            <span className="text-xs px-2.5 py-2 rounded-lg font-semibold"
              style={{ backgroundColor: 'rgba(245,158,11,0.12)', color: '#d97706', border: '1px solid rgba(245,158,11,0.25)' }}>
              📍 {activeBranchName}
            </span>
          )}
          <button onClick={handleRefresh} className="btn-secondary py-2 px-3 flex items-center gap-1.5">
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            <span className="hidden sm:inline text-xs">Actualizar</span>
          </button>
          <button onClick={handleExportCSV} className="btn-secondary py-2 px-3 flex items-center gap-1.5">
            <Download size={13} />
            <span className="hidden sm:inline text-xs">Exportar CSV</span>
          </button>
        </div>
      </div>

      {/* Bulk action bar */}
      {selectedRows.size > 0 && (
        <div className="rounded-xl px-4 py-3 flex items-center gap-3" style={{ backgroundColor: '#1B3A6B', border: '1px solid #243f72' }}>
          <span className="text-sm font-semibold text-white">{selectedRows.size} orden{selectedRows.size !== 1 ? 'es' : ''} seleccionada{selectedRows.size !== 1 ? 's' : ''}</span>
          <div className="flex items-center gap-2 ml-auto">
            <button className="text-xs px-3 py-1.5 rounded-lg font-semibold" style={{ backgroundColor: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.8)' }} onClick={handleExportSelected}>Exportar selección</button>
            <button onClick={() => setSelectedRows(new Set())} className="text-xs px-3 py-1.5 rounded-lg font-semibold" style={{ backgroundColor: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)' }}>Deseleccionar</button>
          </div>
        </div>
      )}

      {/* Banner si hay más órdenes no mostradas */}
      {hasMoreOrders && (
        <div className="px-4 py-2 rounded-xl text-xs flex items-center justify-between"
          style={{ backgroundColor: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)', color: '#3b82f6' }}>
          <span>Mostrando las últimas 1,000 órdenes. Para ver todas, filtra por rango de fechas.</span>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border overflow-hidden"  style={{ borderColor: '#e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e5e7eb' }}>
                <th className="px-4 py-3 w-10">
                  <input type="checkbox" checked={selectedRows.size === paginated.length && paginated.length > 0} onChange={handleSelectAll} className="rounded" style={{ accentColor: '#f59e0b' }} />
                </th>
                {[
                  { label: '# Orden', field: 'id' as SortField },
                  { label: 'Mesa', field: 'mesa' as SortField },
                  { label: 'Mesero', field: 'mesero' as SortField },
                  { label: 'Platillos', field: null },
                  { label: 'Total', field: 'total' as SortField },
                  { label: 'Pago', field: null },
                  { label: 'Hora', field: 'openedAt' as SortField },
                  { label: 'Duración', field: null },
                  { label: 'Merma', field: null },
                  { label: 'Estado', field: 'status' as SortField },
                  { label: '', field: null },
                ].map((col, i) => (
                  <th key={i} className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide whitespace-nowrap ${col.field ? 'cursor-pointer select-none hover:bg-gray-100 transition-colors' : ''}`} style={{ color: '#9ca3af', letterSpacing: '0.05em' }} onClick={() => col.field && handleSort(col.field)}>
                    <div className="flex items-center gap-1">{col.label}{col.field && <SortIcon field={col.field} />}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => <RowSkeleton key={i} />)
              ) : orders.length === 0 ? (
                <EmptyOrders />
              ) : paginated.length === 0 ? (
                <tr>
                  <td colSpan={14} className="py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ backgroundColor: '#f3f4f6' }}>
                        <Filter size={24} className="text-gray-300" />
                      </div>
                      <p className="text-sm font-semibold text-gray-600">No se encontraron órdenes</p>
                      <p className="text-xs text-gray-400">Ajusta los filtros o la búsqueda para ver resultados</p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginated.map((order) => {
                  const sc = statusConfig[order.status as OrderStatus];
                  const isSelected = selectedRows.has(order.id);
                  const isOpen = ['abierta', 'preparacion', 'lista'].includes(order.status);
                  return (
                    <tr key={order.id} className="table-row-hover border-b" style={{ borderColor: '#f9fafb', backgroundColor: isSelected ? '#fffbeb' : undefined }}>
                      <td className="px-4 py-3.5"><input type="checkbox" checked={isSelected} onChange={() => handleSelectRow(order.id)} className="rounded" style={{ accentColor: '#f59e0b' }} /></td>
                      {/* # Orden */}
                      <td className="px-4 py-3.5">
                        <div>
                          <span className="font-mono text-xs font-semibold text-gray-500">{order.id.slice(-6)}</span>
                          {order.cancelledComandas?.length > 0 && (
                            <span className="ml-1 text-xs px-1 rounded" style={{ background: '#fef2f2', color: '#dc2626' }}>
                              ⚠️ {order.cancelledComandas.length}
                            </span>
                          )}
                        </div>
                      </td>
                      {/* Mesa / Para Llevar */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1.5">
                          {order.orderType === 'para_llevar' ? (
                            <span style={{ fontSize: 16, flexShrink: 0 }}>🥡</span>
                          ) : (
                            <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0" style={{ backgroundColor: '#e0e7ff', color: '#3730a3', fontSize: '9px' }}>{order.mesaNum}</div>
                          )}
                          <span className="text-sm font-medium text-gray-700 whitespace-nowrap">{order.mesa}</span>
                          {order.orderType === 'para_llevar' && (
                            <span className="text-xs px-1.5 py-0.5 rounded-full font-semibold" style={{ backgroundColor: '#eff6ff', color: '#1d4ed8', fontSize: 10 }}>Llevar</span>
                          )}
                        </div>
                      </td>
                      {/* Mesero */}
                      <td className="px-4 py-3.5"><span className="text-sm text-gray-600 whitespace-nowrap">{order.mesero}</span></td>
                      {/* Platillos */}
                      <td className="px-4 py-3.5">
                        <div>
                          <div className="flex gap-0.5 mb-0.5">{order.items.slice(0, 4).map((item, idx) => <span key={idx} title={item.name} className="text-sm">{item.emoji}</span>)}</div>
                          <span className="text-xs text-gray-400">{order.items.reduce((s, i) => s + i.qty, 0)} platillo{order.items.reduce((s,i)=>s+i.qty,0)!==1?'s':''}</span>
                        </div>
                      </td>
                      {/* Total */}
                      <td className="px-4 py-3.5">
                        <div>
                          <span className="font-mono font-bold text-sm whitespace-nowrap" style={{ color: '#1B3A6B' }}>${order.total.toFixed(2)}</span>
                          {order.marginActual > 0 && (
                            <div className="text-xs whitespace-nowrap" style={{ color: '#16a34a' }}>
                              {order.marginPct.toFixed(0)}% margen
                            </div>
                          )}
                        </div>
                      </td>
                      {/* Pago */}
                      <td className="px-4 py-3.5">
                        {order.payMethod ? (
                          <div className="flex items-center gap-1">
                            {order.payMethod === 'efectivo' ? <Banknote size={12} className="text-green-600" /> : <CreditCard size={12} className="text-blue-600" />}
                            <span className="text-xs font-semibold capitalize" style={{ color: order.payMethod === 'tarjeta' ? '#1d4ed8' : '#166534' }}>
                              {order.payMethod === 'efectivo' ? 'Efectivo' : 'Tarjeta'}
                            </span>
                          </div>
                        ) : <span className="text-gray-300 text-sm">—</span>}
                      </td>
                      {/* Hora */}
                      <td className="px-4 py-3.5">
                        <div className="text-sm text-gray-500 whitespace-nowrap">
                          <div className="flex items-center gap-1"><Clock size={10} />{order.openedAt?.slice(11,16) || '—'}</div>
                          {order.closedAt && <div className="text-xs text-gray-400">{order.closedAt?.slice(11,16)}</div>}
                        </div>
                      </td>
                      {/* Duración */}
                      <td className="px-4 py-3.5">
                        {order.durationMin !== null ? (
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-full whitespace-nowrap" style={{ backgroundColor: order.durationMin > 45 ? '#fee2e2' : '#f3f4f6', color: order.durationMin > 45 ? '#dc2626' : '#6b7280' }}>{order.durationMin} min</span>
                        ) : isOpen ? (
                          <span className="text-xs px-2 py-0.5 rounded-full animate-pulse" style={{ backgroundColor: '#dbeafe', color: '#1d4ed8', fontWeight: 600 }}>En curso</span>
                        ) : <span className="text-gray-300 text-sm">—</span>}
                      </td>
                      {/* Merma */}
                      <td className="px-4 py-3.5">
                        {(() => {
                          const mermaTotal = (order.cancelledComandas || [])
                            .filter((c: any) => c.hasCost)
                            .reduce((s: number, c: any) => s + (c.wasteCost || 0), 0);
                          const cancelCount = (order.cancelledComandas || []).length;
                          if (order.status === 'cancelada' && order.cancelType === 'con_costo') {
                            return <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: '#fef2f2', color: '#dc2626' }}>⚠️ Orden completa</span>;
                          }
                          if (cancelCount > 0) {
                            return (
                              <div>
                                <span className="text-xs font-semibold" style={{ color: '#dc2626' }}>
                                  {cancelCount} cancelado{cancelCount !== 1 ? 's' : ''}
                                </span>
                                {mermaTotal > 0 && <div className="text-xs font-mono" style={{ color: '#dc2626' }}>${mermaTotal.toFixed(2)}</div>}
                              </div>
                            );
                          }
                          return <span className="text-gray-200 text-sm">—</span>;
                        })()}
                      </td>
                      {/* Estado */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1.5">
                          <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: sc.dotColor }} />
                          <span className={`status-badge ${sc.className} whitespace-nowrap`}>{sc.label}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1">
                          <button onClick={() => setSelectedOrder(order)} className="p-1.5 rounded-lg hover:bg-blue-50 transition-colors" title="Ver detalle"><Eye size={14} className="text-gray-400 hover:text-blue-600" /></button>
                          {['abierta', 'preparacion', 'lista'].includes(order.status) && (
                            <button onClick={() => setCancelOrder(order)} className="p-1.5 rounded-lg hover:bg-red-50 transition-colors" title="Cancelar orden"><XCircle size={14} className="text-gray-400 hover:text-red-500" /></button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t" style={{ borderColor: '#f3f4f6' }}>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span>Mostrar</span>
            <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }} className="input-field py-1 px-2 text-sm w-16">
              {PAGE_SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <span>de <strong>{filtered.length}</strong> órdenes</span>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"><ChevronLeft size={16} className="text-gray-600" /></button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum: number;
              if (totalPages <= 5) pageNum = i + 1;
              else if (page <= 3) pageNum = i + 1;
              else if (page >= totalPages - 2) pageNum = totalPages - 4 + i;
              else pageNum = page - 2 + i;
              return (
                <button key={pageNum} onClick={() => setPage(pageNum)} className="w-8 h-8 rounded-lg text-sm font-semibold transition-all duration-100" style={{ backgroundColor: page === pageNum ? '#1B3A6B' : 'transparent', color: page === pageNum ? 'white' : '#6b7280' }}>{pageNum}</button>
              );
            })}
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages || totalPages === 0} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"><ChevronRight size={16} className="text-gray-600" /></button>
          </div>
        </div>
      </div>

      {selectedOrder && <OrderDetailModal order={selectedOrder} onClose={() => setSelectedOrder(null)} onCancel={(order) => { setSelectedOrder(null); setCancelOrder(order); }} />}
      {cancelOrder && <CancelOrderModal order={{ ...cancelOrder, kitchenStatus: cancelOrder.kitchenStatus ?? 'en_edicion' }} onClose={() => setCancelOrder(null)} onConfirm={handleCancelConfirm} />}
    </div>
  );
}