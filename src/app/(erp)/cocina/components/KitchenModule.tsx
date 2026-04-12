'use client';
import { getCurrentTenantId as getTenantId } from '@/lib/tenantStore';
import { useBranch } from '@/hooks/useBranch';
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import Sidebar from '@/components/Sidebar';
import Topbar from '@/components/Topbar';
import { createClient } from '@/lib/supabase/client';
import { ChefHat, Clock, CheckCircle, AlertCircle, RefreshCw, Bell, Flame, Coffee, UtensilsCrossed, Play, Check, X, GripVertical } from 'lucide-react';
import { useDevice } from '@/hooks/useDevice';
import { toast } from 'sonner';

// ─── Types ────────────────────────────────────────────────────────────────────

type KitchenStatus = 'pendiente' | 'preparacion' | 'lista' | 'entregada';
type RealtimeStatus = 'conectado' | 'reconectando' | 'desconectado';

interface KitchenOrderItem {
  preparationTimeMin?: number;
  id: string;
  name: string;
  qty: number;
  emoji: string;
  notes?: string;
  category?: string;
  course?: number;    // 1=first, 2=second, 3=last — items with course>1 shown with badge
  modifier?: string;  // per-item modifier e.g. "Sin cebolla"
}

interface KitchenOrder {
  id: string;
  mesa: string;
  mesero: string;
  isComanda: boolean;
  orderType: 'mesa' | 'para_llevar';
  parentOrderId: string | null;
  kitchenSentAt: string | null;   // timestamp when order was sent to kitchen
  items: KitchenOrderItem[];
  kitchenStatus: KitchenStatus;
  kitchenNotes: string | null;
  kitchenStartedAt: string | null;
  kitchenCompletedAt: string | null;
  openedAt: string;
  createdAt: string;
  elapsedMin: number;
  expectedPrepMin: number; // max prep time across all items
}

const STATUS_CONFIG: Record<KitchenStatus, { label: string; color: string; bg: string; border: string }> = {
  pendiente:   { label: 'Pendiente',        color: '#f59e0b', bg: 'rgba(245,158,11,0.12)',  border: 'rgba(245,158,11,0.35)'  },
  preparacion: { label: 'En Preparación',   color: '#3b82f6', bg: 'rgba(59,130,246,0.12)',  border: 'rgba(59,130,246,0.35)'  },
  lista:       { label: 'Lista para Servir',color: '#22c55e', bg: 'rgba(34,197,94,0.12)',   border: 'rgba(34,197,94,0.35)'   },
  entregada:   { label: 'Entregada',        color: '#6b7280', bg: 'rgba(107,114,128,0.1)',  border: 'rgba(107,114,128,0.25)' },
};

const COLUMNS: KitchenStatus[] = ['pendiente', 'preparacion', 'lista'];

// ─── Elapsed timer ────────────────────────────────────────────────────────────

function useElapsedTick() {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 30000);
    return () => clearInterval(id);
  }, []);
  return tick;
}

function calcElapsed(createdAt: string): number {
  const diff = Date.now() - new Date(createdAt).getTime();
  return Math.floor(diff / 60000);
}

// ─── Order Card ───────────────────────────────────────────────────────────────

interface OrderCardProps {
  order: KitchenOrder;
  onAdvance: (id: string, next: KitchenStatus) => void | Promise<void>;
  onDeliver: (id: string) => void | Promise<void>;
  onCancel: (id: string, mesa: string, kitchenStatus: string) => void;
  tick: number;
  isDragging: boolean;
  readyItems: Set<string>;
  onToggleItem: (itemId: string) => void;
  onDragStart: (e: React.DragEvent, id: string) => void;
  onDragEnd: () => void;
}

function OrderCard({ order, onAdvance, onDeliver, onCancel, tick, isDragging, onDragStart, onDragEnd, readyItems, onToggleItem }: OrderCardProps) {
  const elapsed = calcElapsed(order.createdAt);
  const cfg = STATUS_CONFIG[order.kitchenStatus];
  const isLista    = order.kitchenStatus === 'lista';
  // Urgencia basada en tiempo esperado de preparación del platillo más tardado
  const expected   = order.expectedPrepMin > 0 ? order.expectedPrepMin : 15;
  const isPrep     = order.kitchenStatus === 'preparacion';
  // Use kitchen_started_at when in prep, otherwise use createdAt
  const elapsedForThisStatus = isPrep && order.kitchenStartedAt
    ? Math.floor((Date.now() - new Date(order.kitchenStartedAt).getTime()) / 60000)
    : elapsed;
  const pct        = isPrep ? elapsedForThisStatus / expected : elapsed / (expected + 5);
  const isCritical = !isLista && pct >= 1.0;        // 100%+ del tiempo esperado
  const isUrgent   = !isLista && pct >= 0.8 && pct < 1.0; // 80-99%
  const isWarning  = !isLista && pct >= 0.5 && pct < 0.8; // 50-79%
  const isOk       = isLista || pct < 0.5;

  // Color dinámico para el borde y badge de tiempo
  const timeColor  = isCritical ? '#ef4444' : isUrgent ? '#f97316' : isWarning ? '#f59e0b' : isOk && isLista ? '#22c55e' : 'rgba(255,255,255,0.3)';
  const timeBg     = isCritical ? 'rgba(239,68,68,0.15)' : isUrgent ? 'rgba(249,115,22,0.15)' : isWarning ? 'rgba(245,158,11,0.15)' : 'rgba(255,255,255,0.05)';
  const borderColor = isCritical ? 'rgba(239,68,68,0.6)' : isUrgent ? 'rgba(249,115,22,0.5)' : isWarning ? 'rgba(245,158,11,0.4)' : cfg.border;

  // Barra de tiempo basada en % del tiempo esperado
  const timeBarPct = Math.min(pct * 100, 100);
  const timeBarColor = isCritical ? '#ef4444' : isUrgent ? '#f97316' : isWarning ? '#f59e0b' : '#22c55e';

  const nextStatus: Record<KitchenStatus, KitchenStatus | null> = {
    pendiente: 'preparacion', preparacion: 'lista', lista: null, entregada: null,
  };
  const next = nextStatus[order.kitchenStatus];

  const nextLabel: Record<KitchenStatus, string> = {
    pendiente: 'Iniciar', preparacion: 'Marcar Lista', lista: '', entregada: '',
  };

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, order.id)}
      onDragEnd={onDragEnd}
      className="rounded-xl p-4 mb-3 transition-all duration-200 cursor-grab active:cursor-grabbing select-none"
      style={{
        backgroundColor: '#1a2535',
        border: `1px solid ${borderColor}`,
        boxShadow: isCritical ? '0 0 0 2px rgba(239,68,68,0.15)' : isUrgent ? '0 0 0 1px rgba(249,115,22,0.1)' : 'none',
        opacity: isDragging ? 0.4 : 1,
        transform: isDragging ? 'scale(0.98)' : 'scale(1)',
      }}
    >
      {/* Barra de tiempo en la parte superior de la tarjeta */}
      <div className="w-full h-1 rounded-full mb-3 overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}>
        <div className="h-full rounded-full transition-all duration-1000"
          style={{ width: `${timeBarPct}%`, backgroundColor: timeBarColor }} />
      </div>

      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <GripVertical size={14} style={{ color: 'rgba(255,255,255,0.2)', flexShrink: 0 }} />
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-bold" style={{ color: '#f1f5f9' }}>{order.mesa}</span>
                {order.isComanda && (
                  <span className="text-xs px-2 py-0.5 rounded-full font-bold" style={{ background: 'rgba(168,85,247,0.15)', color: '#c084fc', border: '1px solid rgba(168,85,247,0.3)', letterSpacing: '0.04em' }}>
                    COMANDA
                  </span>
                )}
                {order.orderType === 'para_llevar' && (
                  <span className="text-xs px-2 py-0.5 rounded-full font-bold" style={{ background: 'rgba(96,165,250,0.15)', color: '#60a5fa', border: '1px solid rgba(96,165,250,0.35)', letterSpacing: '0.04em' }}>
                    🥡 LLEVAR
                  </span>
                )}
              {isCritical && (
                <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-semibold" style={{ backgroundColor: 'rgba(239,68,68,0.15)', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)' }}>
                  <AlertCircle size={10} /> ¡Urgente!
                </span>
              )}
              {isUrgent && !isCritical && (
                <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-semibold" style={{ backgroundColor: 'rgba(249,115,22,0.15)', color: '#fb923c', border: '1px solid rgba(249,115,22,0.3)' }}>
                  <Clock size={10} /> Demorado
                </span>
              )}
            </div>
            <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>Mesero: {order.mesero}</p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <div
            className="flex items-center gap-1 text-xs px-2 py-1 rounded-full font-semibold"
            style={{ backgroundColor: timeBg, color: timeColor }}
          >
            <Clock size={10} />
            <span>{isPrep ? elapsedForThisStatus : elapsed} min / {expected} min esperado</span>
          </div>
          <span className="text-xs font-mono" style={{ color: 'rgba(255,255,255,0.3)' }}>{order.id.slice(-6)}</span>
        </div>
      </div>

      {/* Items — agrupados por categoría (estándar de industria) */}
      <div className="space-y-2 mb-3">
        {(() => {
          const CAT_ORDER: Record<string, number> = {
            'Entradas': 1, 'Appetizers': 1,
            'Platos Fuertes': 2, 'Main Course': 2, 'Main': 2,
            'Postres': 3, 'Desserts': 3,
            'Bebidas': 4, 'Drinks': 4,
            'Extras': 5,
          };
          const grouped = order.items.reduce<Record<string, typeof order.items>>((acc, item) => {
            const cat = item.category || 'Sin categoría';
            if (!acc[cat]) acc[cat] = [];
            acc[cat].push(item);
            return acc;
          }, {});
          const sortedCats = Object.keys(grouped).sort((a, b) =>
            (CAT_ORDER[a] ?? 99) - (CAT_ORDER[b] ?? 99)
          );
          const multiCat = sortedCats.length > 1;
          return (
            <>
              {sortedCats.map(cat => (
                <div key={cat}>
                  {multiCat && (
                    <div className="px-1 mb-1" style={{ fontSize: '10px', fontWeight: 600, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                      {cat}
                    </div>
                  )}
                  {grouped[cat].map((item, i) => {
                    const itemKey = item.id || `${order.id}-${i}`;
                    const isDone = readyItems.has(itemKey);
                    return (
                      <div key={itemKey} className="rounded-lg overflow-hidden transition-all"
                        style={{ backgroundColor: isDone ? 'rgba(34,197,94,0.1)' : 'rgba(255,255,255,0.04)', border: isDone ? '1px solid rgba(34,197,94,0.25)' : '1px solid transparent' }}>
                        <div className="flex items-center gap-2 px-3 py-2">
                          <span className="text-base leading-none">{item.emoji}</span>
                          <div className="flex-1 min-w-0">
                            <span className="text-sm font-medium block"
                              style={{ color: isDone ? '#86efac' : '#f1f5f9', textDecoration: isDone ? 'line-through' : 'none', opacity: isDone ? 0.7 : 1 }}>
                              {item.name}
                            </span>
                            {item.modifier && (
                              <span className="text-xs block mt-0.5" style={{ color: '#f59e0b', fontWeight: 500 }}>
                                ↳ {item.modifier}
                              </span>
                            )}
                          </div>
                          <span className="text-sm font-bold px-2 py-0.5 rounded-md"
                            style={{ backgroundColor: 'rgba(245,158,11,0.15)', color: '#f59e0b' }}>
                            ×{item.qty}
                          </span>
                          <button
                            onClick={() => onToggleItem(itemKey)}
                            className="flex items-center gap-1 px-2 py-1 rounded-lg flex-shrink-0 transition-all"
                            style={{ backgroundColor: isDone ? 'rgba(34,197,94,0.2)' : 'rgba(255,255,255,0.05)', border: `1px solid ${isDone ? 'rgba(34,197,94,0.4)' : 'rgba(255,255,255,0.12)'}`, color: isDone ? '#4ade80' : 'rgba(255,255,255,0.25)' }}
                            title={isDone ? 'Desmarcar' : 'Marcar listo'}>
                            <Check size={11} />
                            <span style={{ fontSize: '10px', fontWeight: 600 }}>{isDone ? 'Listo' : '—'}</span>
                          </button>
                        </div>
                        {item.notes && !item.modifier && (
                          <div className="px-3 pb-2">
                            <span className="text-xs px-2 py-0.5 rounded" style={{ backgroundColor: 'rgba(245,158,11,0.1)', color: '#fbbf24' }}>
                              {item.notes}
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </>
          );
        })()}
      </div>

            {/* Kitchen notes */}
      {order.kitchenNotes && (
        <div className="flex items-start gap-2 px-3 py-2 rounded-lg mb-3" style={{ backgroundColor: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}>
          <AlertCircle size={12} className="flex-shrink-0 mt-0.5" style={{ color: '#f59e0b' }} />
          <p className="text-xs" style={{ color: '#fbbf24' }}>{order.kitchenNotes}</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        {next && (
          <button
            onClick={() => onAdvance(order.id, next)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all hover:brightness-110"
            style={{ backgroundColor: next === 'preparacion' ? '#3b82f6' : '#22c55e', color: '#fff' }}
          >
            {next === 'preparacion' ? <Play size={12} /> : <Check size={12} />}
            {nextLabel[order.kitchenStatus]}
          </button>
        )}
        {order.kitchenStatus === 'lista' && (
          <button
            onClick={() => onDeliver(order.id)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all hover:brightness-110"
            style={{ backgroundColor: '#6b7280', color: '#fff' }}
          >
            <CheckCircle size={12} />
            Entregada
          </button>
        )}
        <button
          onClick={() => onCancel(order.id, order.mesa, order.kitchenStatus)}
          className="flex items-center justify-center w-8 h-8 rounded-lg flex-shrink-0 transition-all hover:brightness-110"
          style={{ backgroundColor: 'rgba(239,68,68,0.15)', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)' }}
          title="Cancelar orden"
        >
          <X size={13} />
        </button>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function KitchenModule() {
  const device = useDevice();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [orders, setOrders] = useState<KitchenOrder[]>([]);
  const [readyItems, setReadyItems] = useState<Set<string>>(new Set());
  const toggleReadyItem = (key: string) => setReadyItems(prev => {
    const next = new Set(prev);
    if (next.has(key)) { next.delete(key); } else { next.add(key); }
    return next;
  });
  const [loading, setLoading] = useState(true);
  const [newOrderAlert, setNewOrderAlert] = useState(false);
  const [realtimeStatus, setRealtimeStatus] = useState<RealtimeStatus>('reconectando');
  // Drag state
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<KitchenStatus | null>(null);
  const [stationFilter, setStationFilter] = useState<string>('Todas');
  const [cancelConfirm, setCancelConfirm] = useState<{orderId:string; mesa:string; kitchenStatus:string; isTableCancel?:boolean} | null>(null);
  const [cancelResult, setCancelResult] = useState<{mesa:string; hasCost:boolean; removedCount:number} | null>(null);
  const prevCountRef = useRef(0);
  const tick = useElapsedTick();
  const supabase = createClient();

  const playNewOrderSound = React.useCallback(() => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      // Two short urgent beeps
      [0, 0.25].forEach((t) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.type = 'square';
        osc.frequency.value = 880;
        gain.gain.setValueAtTime(0.12, ctx.currentTime + t);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.18);
        osc.start(ctx.currentTime + t);
        osc.stop(ctx.currentTime + t + 0.18);
      });
    } catch { /* audio not available */ }
  }, []);

  const { activeBranchId } = useBranch();

  const fetchOrders = useCallback(async () => {
    let ordersQuery = supabase
      .from('orders')
      .eq('tenant_id', getTenantId())
      .select('*, kitchen_sent_at, order_items(*, dishes(category))')
      .in('status', ['abierta', 'preparacion', 'lista'])
      .eq('is_comanda', true);         // only show comanda cards — original order is billing only
    if (activeBranchId) ordersQuery = ordersQuery.eq('branch_id', activeBranchId);
    const { data, error } = await ordersQuery.order('created_at', { ascending: true });
    if (error) { toast.error('Error al cargar órdenes de cocina'); return; }

    if (!error && data) {
      const mapped: KitchenOrder[] = data.map((o: any) => ({
        id: o.id,
        mesa: o.mesa,
        mesero: o.mesero,
        isComanda: Boolean(o.is_comanda),
        orderType: (o.order_type ?? 'mesa') as 'mesa' | 'para_llevar',
        parentOrderId: o.parent_order_id ?? null,
        kitchenSentAt: o.kitchen_sent_at ?? null,
        items: (o.order_items || []).map((item: any) => ({
          id: item.id,
          name: item.name,
          qty: item.qty,
          emoji: item.emoji || '🍽️',
          preparationTimeMin: item.dishes?.preparation_time_min ?? 15,
          notes: item.notes,
          category: item.dishes?.category ?? null,
          course: item.course ?? 1,
          modifier: item.modifier ?? null,
        })),
        kitchenStatus: (o.kitchen_status ?? 'pendiente') as KitchenStatus,
        kitchenNotes: o.kitchen_notes || null,
        kitchenStartedAt: o.kitchen_started_at || null,
        kitchenCompletedAt: o.kitchen_completed_at || null,
        openedAt: o.opened_at || '',
        createdAt: o.created_at,
        elapsedMin: 0,
        expectedPrepMin: Math.max(15, ...((o.order_items || []).map((item: any) => item.dishes?.preparation_time_min ?? 15))),
      }));

      const pendingCount = mapped.filter((o) => o.kitchenStatus === 'pendiente').length;
      if (pendingCount > prevCountRef.current && prevCountRef.current >= 0) {
        setNewOrderAlert(true);
        setTimeout(() => setNewOrderAlert(false), 4000);
        playNewOrderSound();
      }
      prevCountRef.current = pendingCount;
      setOrders(mapped);
    }
    setLoading(false);
  }, [supabase]);

  // Keep a ref to fetchOrders so realtime callbacks always call the latest version
  const fetchOrdersRef = useRef(fetchOrders);
  useEffect(() => { fetchOrdersRef.current = fetchOrders; }, [fetchOrders]);

  useEffect(() => {
    fetchOrders();
    // Fallback polling every 5 seconds in case realtime drops
    const interval = setInterval(() => fetchOrdersRef.current(), 5000);
    return () => clearInterval(interval);
  }, [fetchOrders]);

  useEffect(() => {
    let retryTimeout: ReturnType<typeof setTimeout> | null = null;
    let retryCount = 0;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let destroyed = false;

    const connect = () => {
      if (destroyed) return;
      setRealtimeStatus('reconectando');
      channel = supabase
        .channel(`kitchen-orders-${Date.now()}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
          fetchOrdersRef.current();
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'order_items' }, () => {
          fetchOrdersRef.current();
        })
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            setRealtimeStatus('conectado'); retryCount = 0;
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            setRealtimeStatus('desconectado');
            if (channel) { supabase.removeChannel(channel); channel = null; }
            const delay = Math.min(3000 * Math.pow(2, retryCount), 30000);
            retryCount += 1;
            if (!destroyed) retryTimeout = setTimeout(connect, delay);
          } else {
            setRealtimeStatus('reconectando');
          }
        });
    };

    connect();
    return () => {
      destroyed = true;
      if (retryTimeout) clearTimeout(retryTimeout);
      if (channel) supabase.removeChannel(channel);
    };
  }, [supabase]);

  // ─── Drag handlers ──────────────────────────────────────────────────────────

  const handleDragStart = useCallback((e: React.DragEvent, orderId: string) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('orderId', orderId);
    setDraggingId(orderId);
  }, []);

  const handleDragEnd = useCallback(() => {
    setDraggingId(null);
    setDragOverCol(null);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, col: KitchenStatus) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverCol(col);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOverCol(null);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent, targetCol: KitchenStatus) => {
    e.preventDefault();
    setDragOverCol(null);
    const orderId = e.dataTransfer.getData('orderId');
    if (!orderId) return;

    const order = orders.find((o) => o.id === orderId);
    if (!order || order.kitchenStatus === targetCol) return;

    // Only allow forward movement: pendiente → preparacion → lista
    const colIndex: Record<KitchenStatus, number> = { pendiente: 0, preparacion: 1, lista: 2, entregada: 3 };
    if (colIndex[targetCol] <= colIndex[order.kitchenStatus]) {
      toast.error('Solo puedes mover órdenes hacia adelante');
      return;
    }

    // Optimistic update
    setOrders((prev) => prev.map((o) =>
      o.id === orderId ? { ...o, kitchenStatus: targetCol } : o
    ));

    const now = new Date().toISOString();
    const updates: Record<string, any> = {
      kitchen_status: targetCol,
      updated_at: now,
    };
    if (targetCol === 'preparacion') updates.kitchen_started_at = now;
    if (targetCol === 'lista') updates.kitchen_completed_at = now;

    const { error } = await supabase.from('orders').update(updates).eq('id', orderId);
    if (error) {
      toast.error('Error al mover orden: ' + error.message);
      // Revert on failure
      setOrders((prev) => prev.map((o) =>
        o.id === orderId ? { ...o, kitchenStatus: order.kitchenStatus } : o
      ));
    }
    setDraggingId(null);
  }, [orders, supabase]);

  // ─── Button handlers ────────────────────────────────────────────────────────

  const handleAdvance = async (orderId: string, next: KitchenStatus) => {
    const now = new Date().toISOString();
    const updates: Record<string, any> = {
      kitchen_status: next,
      updated_at: now,
    };
    if (next === 'preparacion') updates.kitchen_started_at = now;
    if (next === 'lista') updates.kitchen_completed_at = now;

    const { error } = await supabase.from('orders').update(updates).eq('id', orderId);
    if (error) { toast.error('Error al actualizar estado: ' + error.message); return; }

    // ── Notify mesero when order is ready ─────────────────────────────────────
    if (next === 'lista') {
      const readyOrder = orders.find(o => o.id === orderId);
      if (readyOrder) {
        supabase.channel('kitchen-notifications').send({
          type: 'broadcast',
          event: 'order_ready',
          payload: {
            orderId,
            mesa: readyOrder.mesa,
            mesero: readyOrder.mesero,
            items: readyOrder.items.map(i => i.name).join(', '),
          },
        });
      }
    }

    setOrders((prev) => prev.map((o) =>
      o.id === orderId
        ? { ...o, kitchenStatus: next, kitchenStartedAt: next === 'preparacion' ? now : o.kitchenStartedAt, kitchenCompletedAt: next === 'lista' ? now : o.kitchenCompletedAt }
        : o
    ));
  };

  const handleDeliver = async (orderId: string) => {
    const { error } = await supabase.from('orders').update({
      kitchen_status: 'entregada', updated_at: new Date().toISOString(),
    }).eq('id', orderId);
    if (error) { toast.error('Error al marcar como entregada: ' + error.message); return; }
    setOrders((prev) => prev.filter((o) => o.id !== orderId));
  };

  const handleCancelFromKitchen = (orderId: string, mesa: string, kitchenStatus: string) => {
    setCancelConfirm({ orderId, mesa, kitchenStatus });
  };

  const executeCancelFromKitchen = async () => {
    if (!cancelConfirm) return;
    const { orderId, mesa, kitchenStatus } = cancelConfirm;
    setCancelConfirm(null);

    const hasCost = kitchenStatus === 'preparacion' || kitchenStatus === 'lista';
    const cancelType = hasCost ? 'con_costo' : 'sin_costo';
    const now = new Date().toISOString();

    // Get parent_order_id of this comanda to find siblings
    const { data: thisOrder } = await supabase.from('orders').eq('tenant_id', getTenantId())
      .select('parent_order_id').eq('id', orderId).single();

    // Cancel this comanda
    const { error } = await supabase.from('orders').update({
      status: 'cancelada',
      kitchen_status: 'en_edicion',
      cancel_type: cancelType,
      cancel_reason: 'Cancelado desde cocina',
      updated_at: now,
    }).eq('id', orderId);

    if (error) { toast.error('Error al cancelar: ' + error.message); return; }

    let removedIds = [orderId];

    // If there's a parent, also cancel sibling comandas still in KDS
    // (other comandas of the same mesa that are active)
    if (thisOrder?.parent_order_id) {
      const { data: siblings } = await supabase.from('orders').eq('tenant_id', getTenantId())
        .select('id, kitchen_status')
        .eq('parent_order_id', thisOrder.parent_order_id)
        .eq('is_comanda', true)
        .neq('id', orderId)
        .neq('status', 'cancelada');

      if (siblings && siblings.length > 0) {
        await Promise.all(siblings.map(s =>
          supabase.from('orders').update({
            status: 'cancelada',
            kitchen_status: 'en_edicion',
            cancel_type: (s.kitchen_status === 'preparacion' || s.kitchen_status === 'lista') ? 'con_costo' : 'sin_costo',
            cancel_reason: 'Cancelado desde cocina (mesa cancelada)',
            updated_at: now,
          }).eq('id', s.id)
        ));
        removedIds = [...removedIds, ...siblings.map(s => s.id)];
      }
    }

    // Remove all cancelled orders from KDS immediately
    setOrders((prev) => prev.filter((o) => !removedIds.includes(o.id)));

    // Show confirmation modal instead of toast
    setCancelResult({ mesa, hasCost, removedCount: removedIds.length });
  };

  const allCategories = React.useMemo(() => {
    const cats = new Set<string>();
    orders.forEach(o => o.items.forEach(i => { if (i.category) cats.add(i.category); }));
    return ['Todas', ...Array.from(cats).sort()];
  }, [orders]);

  const filteredOrders = React.useMemo(() => {
    if (stationFilter === 'Todas') return orders;
    return orders
      .map(o => ({ ...o, items: o.items.filter(i => i.category === stationFilter || !i.category) }))
      .filter(o => o.items.length > 0);
  }, [orders, stationFilter]);

  const columnOrders = (col: KitchenStatus) => filteredOrders.filter((o) => o.kitchenStatus === col);
  const totalPending = filteredOrders.filter((o) => o.kitchenStatus === 'pendiente').length;
  const totalPrep   = filteredOrders.filter((o) => o.kitchenStatus === 'preparacion').length;
  const totalReady  = filteredOrders.filter((o) => o.kitchenStatus === 'lista').length;

  return (
    <>
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: '#0f1923' }}>
      <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed((p) => !p)} />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Topbar onMenuToggle={() => setSidebarCollapsed((p) => !p)} title="Módulo de Cocina" />

        {newOrderAlert && (
          <div className="flex items-center gap-3 px-6 py-3 text-sm font-semibold" style={{ backgroundColor: '#f59e0b', color: '#1B3A6B' }}>
            <Bell size={16} className="animate-bounce" />
            ¡Nueva orden recibida! Revisa la columna de Pendientes.
          </div>
        )}

        <div className="flex-shrink-0 px-6 py-3 border-b flex items-center gap-6" style={{ borderColor: '#1e2d3d', backgroundColor: '#0d1720' }}>
          <div className="flex items-center gap-2">
            <ChefHat size={18} style={{ color: '#f59e0b' }} />
            <span className="text-sm font-bold" style={{ color: '#f1f5f9' }}>Cocina en Vivo</span>
          </div>
          <div className="flex items-center gap-4 ml-4">
            {[
              { label: 'Pendientes',    value: totalPending, color: '#f59e0b' },
              { label: 'En Preparación',value: totalPrep,   color: '#3b82f6' },
              { label: 'Listas',        value: totalReady,  color: '#22c55e' },
            ].map((stat) => (
              <div key={stat.label} className="flex items-center gap-1.5">
                <span className="text-lg font-bold font-mono" style={{ color: stat.color }}>{stat.value}</span>
                <span className="text-xs" style={{ color: 'rgba(255,255,255,0.45)' }}>{stat.label}</span>
              </div>
            ))}
          </div>
          <div className="ml-auto flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full" style={{
                backgroundColor: realtimeStatus === 'conectado' ? '#22c55e' : realtimeStatus === 'reconectando' ? '#f59e0b' : '#ef4444',
              }} />
              <span className="text-xs" style={{ color: realtimeStatus === 'conectado' ? '#4ade80' : realtimeStatus === 'reconectando' ? '#fbbf24' : '#f87171' }}>
                {realtimeStatus === 'conectado' ? 'En vivo' : realtimeStatus === 'reconectando' ? 'Reconectando...' : 'Sin conexión'}
              </span>
            </div>
            <button onClick={fetchOrders}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:brightness-110"
              style={{ backgroundColor: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.6)' }}>
              <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
              Actualizar
            </button>
          </div>
        </div>

        {/* Station filter bar */}
        {allCategories.length > 2 && (
          <div className="flex-shrink-0 px-6 py-2 border-b flex items-center gap-2 overflow-x-auto"
            style={{ borderColor: '#1e2d3d', backgroundColor: '#0a1218' }}>
            <span className="text-xs font-semibold flex-shrink-0" style={{ color: 'rgba(255,255,255,0.35)' }}>
              Estación:
            </span>
            {allCategories.map(cat => (
              <button
                key={cat}
                onClick={() => setStationFilter(cat)}
                className="flex-shrink-0 px-3 py-1 rounded-full text-xs font-semibold transition-all"
                style={{
                  backgroundColor: stationFilter === cat ? '#f59e0b' : 'rgba(255,255,255,0.07)',
                  color: stationFilter === cat ? '#1B3A6B' : 'rgba(255,255,255,0.5)',
                }}
              >
                {cat}
              </button>
            ))}
          </div>
        )}

        {/* Kanban board */}
        <div className="flex-1 overflow-hidden p-5">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: '#f59e0b', borderTopColor: 'transparent' }} />
            </div>
          ) : (
            <div className={`grid gap-4 h-full ${
                device.isMobile
                  ? 'grid-cols-1 overflow-y-auto'
                  : 'grid-cols-3'  // always 3 columns on tablet and desktop
              }`}>
              {COLUMNS.map((col) => {
                const cfg = STATUS_CONFIG[col];
                const colOrders = columnOrders(col);
                const isDragTarget = dragOverCol === col;
                const colIcons: Record<KitchenStatus, React.ElementType> = {
                  pendiente: Bell, preparacion: Flame, lista: CheckCircle, entregada: Coffee,
                };
                const ColIcon = colIcons[col];

                return (
                  <div
                    key={col}
                    className="flex flex-col rounded-xl overflow-hidden transition-all duration-150"
                    style={{
                      backgroundColor: '#0d1720',
                      border: `2px solid ${isDragTarget ? cfg.color : cfg.border}`,
                      boxShadow: isDragTarget ? `0 0 0 2px ${cfg.color}33, inset 0 0 30px ${cfg.color}08` : 'none',
                    }}
                    onDragOver={(e) => handleDragOver(e, col)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, col)}
                  >
                    {/* Column header */}
                    <div className="flex items-center justify-between px-4 py-3 flex-shrink-0"
                      style={{ backgroundColor: isDragTarget ? `${cfg.color}22` : cfg.bg, borderBottom: `1px solid ${cfg.border}`, transition: 'background 0.15s' }}>
                      <div className="flex items-center gap-2">
                        <ColIcon size={15} style={{ color: cfg.color }} />
                        <span className="text-sm font-bold" style={{ color: cfg.color }}>{cfg.label}</span>
                      </div>
                      <span className="text-sm font-bold px-2 py-0.5 rounded-full"
                        style={{ backgroundColor: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}>
                        {colOrders.length}
                      </span>
                    </div>

                    {/* Orders list / drop zone */}
                    <div className="flex-1 overflow-y-auto p-3">
                      {colOrders.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-32 gap-2 rounded-xl transition-all duration-150"
                          style={{
                            opacity: isDragTarget ? 1 : 0.4,
                            border: isDragTarget ? `2px dashed ${cfg.color}` : '2px dashed transparent',
                            backgroundColor: isDragTarget ? `${cfg.color}0a` : 'transparent',
                          }}>
                          <UtensilsCrossed size={24} style={{ color: isDragTarget ? cfg.color : 'rgba(255,255,255,0.3)' }} />
                          <p className="text-xs" style={{ color: isDragTarget ? cfg.color : 'rgba(255,255,255,0.4)' }}>
                            {isDragTarget ? 'Suelta aquí' : 'Sin órdenes'}
                          </p>
                        </div>
                      ) : (
                        <>
                          {colOrders.map((order) => (
                            <OrderCard
                              key={order.id}
                              order={order}
                              onAdvance={handleAdvance}
                              onDeliver={handleDeliver}
                              onCancel={handleCancelFromKitchen}
                              tick={tick}
                              isDragging={draggingId === order.id}
                              onDragStart={handleDragStart}
                              onDragEnd={handleDragEnd}
                              readyItems={readyItems}
                              onToggleItem={toggleReadyItem}
                            />
                          ))}
                          {/* Drop indicator at bottom when column has cards */}
                          {isDragTarget && (
                            <div className="h-16 rounded-xl flex items-center justify-center text-xs font-medium transition-all"
                              style={{ border: `2px dashed ${cfg.color}`, color: cfg.color, backgroundColor: `${cfg.color}08` }}>
                              Suelta aquí
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>


      {/* ── Cancel confirm modal ── */}
      {/* Cancel result confirmation */}
      {cancelResult && (
        <div role="dialog" aria-modal="true"
          className="fixed inset-0 z-[200] flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)' }}>
          <div className="rounded-2xl p-6 max-w-xs w-full text-center"
            style={{ background: cancelResult.hasCost ? '#1a1010' : '#0f1a10', border: `1px solid ${cancelResult.hasCost ? 'rgba(239,68,68,0.4)' : 'rgba(34,197,94,0.4)'}` }}>
            <div className="text-4xl mb-3">{cancelResult.hasCost ? '⚠️' : '✅'}</div>
            <h3 className="text-base font-bold text-white mb-2">
              {cancelResult.hasCost ? 'Merma registrada' : 'Orden cancelada'}
            </h3>
            <p className="text-sm mb-1" style={{ color: 'rgba(255,255,255,0.7)' }}>
              Mesa <strong className="text-white">{cancelResult.mesa}</strong>
            </p>
            <p className="text-sm mb-4" style={{ color: 'rgba(255,255,255,0.5)' }}>
              {cancelResult.removedCount} {cancelResult.removedCount === 1 ? 'comanda retirada' : 'comandas retiradas'} del kanban
              {cancelResult.hasCost && ' — ingredientes ya utilizados, se registró como merma'}
            </p>
            <button
              onClick={() => setCancelResult(null)}
              className="w-full py-2.5 rounded-xl font-semibold text-sm"
              style={{ background: cancelResult.hasCost ? '#dc2626' : '#16a34a', color: 'white' }}>
              Entendido
            </button>
          </div>
        </div>
      )}

      {cancelConfirm && (
        <div role="dialog" aria-modal="true" aria-labelledby="kds-cancel-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
          <div className="w-full max-w-sm rounded-2xl p-6 shadow-2xl"
            style={{ backgroundColor: '#1a2535', border: '1px solid #2a3f5f' }}>
            <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4"
              style={{ backgroundColor: 'rgba(239,68,68,0.15)' }}>
              <span className="text-2xl">⚠️</span>
            </div>
            <h3 id="kds-cancel-title" className="text-base font-bold text-center text-white mb-2">¿Cancelar comanda?</h3>
            {(cancelConfirm.kitchenStatus === 'preparacion' || cancelConfirm.kitchenStatus === 'lista') ? (
              <div className="mb-4 p-3 rounded-xl text-center" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)' }}>
                <p className="text-sm font-semibold" style={{ color: '#f87171' }}>Se registrará como merma</p>
                <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.45)' }}>Los ingredientes ya fueron usados</p>
              </div>
            ) : (
              <p className="text-sm text-center mb-3" style={{ color: 'rgba(255,255,255,0.6)' }}>
                Está en espera — sin costo de ingredientes
              </p>
            )}
            <p className="text-sm text-center mb-5" style={{ color: 'rgba(255,255,255,0.5)' }}>
              Comanda de <strong className="text-white">{cancelConfirm.mesa}</strong>
            </p>
            <div className="flex gap-3">
              <button onClick={() => setCancelConfirm(null)} aria-label="Mantener la orden"
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
                style={{ backgroundColor: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.7)' }}>
                Mantener orden
              </button>
              <button onClick={executeCancelFromKitchen} aria-label="Confirmar cancelación"
                className="flex-1 py-2.5 rounded-xl text-sm font-bold"
                style={{ backgroundColor: '#ef4444', color: 'white' }}>
                Sí, cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}