'use client';
import { getCurrentTenantId as getTenantId } from '@/lib/tenantStore';



import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import ModifierModal, { type ModifierLine } from '../../pos-punto-de-venta/components/ModifierModal';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useBranch } from '@/hooks/useBranch';
import { ShoppingCart, Plus, Minus, Send, X, ChevronLeft, Search, MessageSquare, CreditCard } from 'lucide-react';
import PaymentModal from '@/app/(erp)/pos-punto-de-venta/components/PaymentModal';
import { useOrderFlow, type OrderFlowItem } from '@/hooks/useOrderFlow';
import { useFeatures } from '@/hooks/useFeatures';
import type { DbTable, DbDish } from '@/lib/supabase/types';

interface Table {
  id: string;
  number: number;
  name: string;
  capacity: number;
  status: string;
  currentOrderId?: string;
  waiter?: string;
}

const CATEGORIES = ['Todos', 'Entradas', 'Platos Fuertes', 'Postres', 'Bebidas', 'Extras'];

// QR canvas for mesero view
function MeseroQRCanvas({ slug }: { slug: string }) {
  const ref = React.useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!slug) return;
    let destroyed = false;
    const url = `${window.location.origin}/menu/${slug}`;
    const draw = () => {
      if (destroyed || !ref.current) return;
      const QRCode = (window as any).QRCode;
      if (!QRCode) return;
      try {
        ref.current.innerHTML = '';
        new QRCode(ref.current, {
          text: url,
          width: 260, height: 260,
          colorDark: '#111827', colorLight: '#ffffff',
          correctLevel: QRCode.CorrectLevel?.M ?? 0,
        });
      } catch { /* not ready */ }
    };
    if ((window as any).QRCode) { draw(); }
    else {
      const existing = document.querySelector('script[src*="qrcodejs"]');
      if (existing) { existing.addEventListener('load', draw); }
      else {
        const s = document.createElement('script');
        s.src = 'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js';
        s.onload = draw;
        document.head.appendChild(s);
      }
    }
    return () => { destroyed = true; };
  }, [slug]);
  return <div ref={ref} style={{ borderRadius: 10, maxWidth: '100%', overflow:'hidden', display:'inline-block' }} />;
}

export default function MeseroMobileView() {
  const supabase = createClient();
  const { appUser } = useAuth();
  const { branchId: activeBranch } = useBranch();
  const { ensureOpenOrder, syncItems, loadOrderItems, sendToKitchen, closeOrder, cancelOrder, cancelItemFromKDS } = useOrderFlow();
  const { features } = useFeatures();

  const [tables, setTables] = useState<Table[]>([]);
  const [dishes, setDishes] = useState<DbDish[]>([]);
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [orderItems, setOrderItems] = useState<OrderFlowItem[]>([]);
  const [modifierPending, setModifierPending] = useState<DbDish | null>(null);
  const [kitchenSent, setKitchenSent] = useState(false);
  const [sentSnapshot, setSentSnapshot] = useState<{dishId:string;qty:number}[]>([]);
  const [cancelPending, setCancelPending] = useState<{dishId:string;name:string;emoji:string;reason:string;notes:string} | null>(null);
  const [cancelResult, setCancelResult] = useState<{name:string;hasCost:boolean} | null>(null);
  const [deliveredDishIds, setDeliveredDishIds] = useState<Set<string>>(new Set());
  const [category, setCategory] = useState('Todos');
  const [search, setSearch] = useState('');
  const [showCart, setShowCart] = useState(false);
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'tables' | 'menu'>('tables');
  const [expandedNoteId, setExpandedNoteId] = useState<string | null>(null);
  const [readyOrders, setReadyOrders] = useState<string[]>([]);
  const prevReadyRef = React.useRef<string[]>([]);
  const [branchName, setBranchName] = useState('Sucursal Principal');
  const [myName, setMyName] = useState('');
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [currentOrderId, setCurrentOrderId] = useState<string | null>(null);
  const [showPayment, setShowPayment] = useState(false);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [kitchenNote, setKitchenNote] = useState('');
  const [sendingNote, setSendingNote] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [showTakeoutModal, setShowTakeoutModal] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [kitchenNotifs, setKitchenNotifs] = useState<{orderId:string; mesa:string; items:string; at:string}[]>([]);
  const [tenantSlug, setTenantSlug] = useState<string | null>(null);
  const [takeoutNameInput, setTakeoutNameInput] = useState('');

  useEffect(() => {
    supabase
      .from('system_config')
      .select('config_value')
      .eq('config_key', 'branch_name')
      .single()
      .then(({ data }) => { if (data?.config_value) setBranchName(data.config_value); });
    // Also load tenant slug for QR menu card
    if (getTenantId()) {
      supabase.from('tenants').select('slug').eq('id', getTenantId()).single()
        .then(({ data }) => { if (data?.slug) setTenantSlug(data.slug); });
    }
  }, [supabase]);

  // Set name from authenticated session
  useEffect(() => {
    if (appUser?.fullName) {
      setMyName(appUser.fullName);
    } else {
      // Fallback: read from localStorage (allows override on shared devices)
      const saved = typeof window !== 'undefined' ? localStorage.getItem('aldente_waiter_name') : null;
      setMyName(saved || 'Mesero');
    }
  }, [appUser]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [{ data: tablesData }, { data: dishesData }] = await Promise.all([
        activeBranch
        ? supabase.from('restaurant_tables').select('*').eq('tenant_id', getTenantId()).gt('number', 0).eq('branch_id', activeBranch).order('number')
        : supabase.from('restaurant_tables').select('*').eq('tenant_id', getTenantId()).gt('number', 0).order('number'),
        supabase.from('dishes').select('*').eq('tenant_id', getTenantId()).eq('available', true).order('category').order('name'),
      ]);
      setTables((tablesData || []).map((t: DbTable) => ({
        id: t.id, number: t.number, name: t.name, capacity: t.capacity,
        status: t.status, currentOrderId: t.current_order_id ?? undefined,
        waiter: (t as any).waiter ?? undefined,
      })));
      setDishes((dishesData || []) as DbDish[]);
    } catch (err: any) {
      toast.error('Error al cargar datos: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => { loadData(); }, [loadData]);

  const playReadyChime = React.useCallback(() => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const notes = [523.25, 659.25, 783.99];
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.18, ctx.currentTime + i * 0.15);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.15 + 0.4);
        osc.start(ctx.currentTime + i * 0.15);
        osc.stop(ctx.currentTime + i * 0.15 + 0.4);
      });
    } catch { /* audio not available */ }
  }, []);

  const checkReadyOrders = React.useCallback(async () => {
    const { data } = await supabase
      .from('orders')
      .select('mesa')
        .eq('tenant_id', getTenantId())
      .eq('kitchen_status', 'lista')
      .in('status', ['abierta', 'lista', 'preparacion']);
    const mesaNames = (data || []).map((o: any) => o.mesa as string);
    setReadyOrders(mesaNames);
    const prev = prevReadyRef.current;
    const newReady = mesaNames.filter(m => !prev.includes(m));
    if (newReady.length > 0) playReadyChime();
    prevReadyRef.current = mesaNames;
  }, [supabase, playReadyChime]);

  useEffect(() => { checkReadyOrders(); }, [checkReadyOrders]);

  // Realtime: refresh when table status changes from another terminal
  useEffect(() => {
    let retryTimeout: ReturnType<typeof setTimeout> | null = null;
    let retryCount = 0;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let destroyed = false;

    const connect = () => {
      if (destroyed) return;
      // Subscribe to kitchen ready notifications
      supabase.channel('kitchen-notifications')
        .on('broadcast', { event: 'order_ready' }, (payload: any) => {
          const { mesa, items, orderId } = payload.payload ?? {};
          const myName = appUser?.fullName || '';
          // Show to all meseros (they'll see their own tables highlighted)
          setKitchenNotifs(prev => {
            const already = prev.some(r => r.orderId === orderId);
            if (already) return prev;
            return [{ orderId, mesa: mesa ?? '?', items: items ?? '', at: new Date().toISOString() }, ...prev.slice(0, 4)];
          });
          toast(`🔔 ${mesa} lista para servir`, {
            description: items,
            duration: 8000,
            style: { background: '#022c22', border: '1px solid rgba(34,197,94,0.4)', color: '#4ade80' },
          });
        })
        .subscribe();

      channel = supabase
        .channel(`mesero-tables-sync`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'restaurant_tables' }, (payload: any) => {
          loadData();
          // If the currently-selected table was freed or taken by another device, update local state
          setSelectedTable(prev => {
            if (!prev) return prev;
            const changed = payload?.new ?? payload?.old;
            if (changed && changed.id === prev.id) {
              const newStatus = payload?.new?.status;
              const newOrderId = payload?.new?.current_order_id;
              // Table was freed remotely — go back to table list
              if (newStatus === 'libre' || (!newOrderId && prev.currentOrderId)) {
                setTimeout(() => {
                  setOrderItems([]);
                  setCurrentOrderId(null);
                  setShowCart(false);
                  setView('tables');
                }, 0);
                return null;
              }
              // Table was taken by someone else while we were viewing it
              if (newStatus === 'ocupada' && payload?.new?.waiter && payload?.new?.waiter !== prev.waiter) {
                setTimeout(() => {
                  setOrderItems([]);
                  setCurrentOrderId(null);
                  setShowCart(false);
                  setView('tables');
                  toast.error(`${prev.name} fue tomada por ${payload.new.waiter}`);
                }, 0);
                return null;
              }
            }
            return prev;
          });
        })
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, () => {
          loadData();
          checkReadyOrders();
        })
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders' }, () => {
          loadData();
          checkReadyOrders();
        })
        .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'orders' }, () => {
          loadData();
          checkReadyOrders();
        })
        .subscribe((status) => {
          if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            if (channel) { supabase.removeChannel(channel); channel = null; }
            const delay = Math.min(3000 * Math.pow(2, retryCount), 30000);
            retryCount += 1;
            if (!destroyed) retryTimeout = setTimeout(connect, delay);
          } else if (status === 'SUBSCRIBED') {
            retryCount = 0;
          }
        });
    };

    connect();
    return () => {
      destroyed = true;
      if (retryTimeout) clearTimeout(retryTimeout);
      if (channel) supabase.removeChannel(channel);
    };
  }, [supabase, loadData, checkReadyOrders]);

  // ─── Table selection: load existing order if mesa already open ────────────

  const selectTable = async (table: Table) => {
    setSelectedTable(table);
    setShowCart(false);
    // Reset kitchen tracking for this table
    setKitchenSent(false);
    setSentSnapshot([]);
    setDeliveredDishIds(new Set());

    if (table.currentOrderId) {
      const existing = await loadOrderItems(table.currentOrderId);
      setOrderItems(existing);
      setCurrentOrderId(table.currentOrderId);

      // Restore kitchen state
      const { data: orderMeta } = await supabase
        .from('orders').select('kitchen_status').eq('tenant_id', getTenantId())
        .eq('id', table.currentOrderId).single();

      const alreadySent = orderMeta?.kitchen_status != null &&
                          orderMeta.kitchen_status !== 'en_edicion';
      if (alreadySent && existing.length > 0) {
        setKitchenSent(true);
        setSentSnapshot(existing.map(i => ({ dishId: i.dishId, qty: i.qty })));

        // Find items in lista/entregada comandas → lock them
        const { data: comandas } = await supabase
          .from('orders')
          .select('id, kitchen_status, order_items(id, dish_id)')
        .eq('tenant_id', getTenantId())
          .eq('parent_order_id', table.currentOrderId)
          .eq('is_comanda', true).neq('status', 'cancelada');

        const delivered = new Set<string>();
        (comandas || []).forEach((c: any) => {
          if (c.kitchen_status === 'lista' || c.kitchen_status === 'entregada') {
            (c.order_items || []).forEach((ci: any) => {
              existing.filter(s => s.dishId === ci.dish_id).forEach(s => delivered.add(s.dishId));
            });
          }
        });
        setDeliveredDishIds(delivered);
      }
    } else {
      setOrderItems([]);
      setCurrentOrderId(null);
    }

    setView('menu');
  };

  // ─── Item management ──────────────────────────────────────────────────────

  const computeTotal = (items: OrderFlowItem[]) =>
    items.reduce((s, i) => s + i.qty * i.price, 0);

  const syncToDb = useCallback(async (
    newItems: OrderFlowItem[],
    table: Table,
    orderId: string,
  ) => {
    const total = computeTotal(newItems) * 1.16;
    syncItems(orderId, [table.id], newItems, total);
  }, [syncItems]);

  const addItem = (dish: DbDish) => {
    if (!selectedTable) return;
    setModifierPending(dish);
  };

  const handleModifierConfirm = async (lines: ModifierLine[]) => {
    if (!modifierPending || !selectedTable) return;
    const dish = modifierPending;
    setModifierPending(null);

    const newLines: OrderFlowItem[] = lines.map(line => ({
      lineId: `${dish.id}-${Date.now()}-${Math.random().toString(36).slice(2,6)}`,
      dishId: dish.id,
      name: dish.name,
      price: Number(dish.price),
      qty: line.qty,
      emoji: dish.emoji,
      modifier: line.modifier || undefined,
      notes: line.note || undefined,
      excludedIngredientIds: line.excludedIds?.length > 0 ? line.excludedIds : undefined,
    }));

    const newItems = [...orderItems, ...newLines];
    setOrderItems(newItems);

    const waiter = myName || appUser?.fullName || 'Mesero';
    const flowTable = { id: selectedTable.id, number: selectedTable.number, name: selectedTable.name, currentOrderId: currentOrderId ?? undefined };
    const orderId = await ensureOpenOrder(flowTable, waiter, branchName, { branchId: activeBranch ?? null });
    if (!currentOrderId) {
      setCurrentOrderId(orderId);
      setSelectedTable(prev => prev ? { ...prev, currentOrderId: orderId } : prev);
    }
    syncToDb(newItems, selectedTable, orderId);
  };

  // removeItem uses lineId (unique per line) to correctly handle
  // multiple variations of the same dish (e.g. 2 guacamoles with different modifiers)
  const removeItem = async (lineId: string) => {
    const item = orderItems.find(i => i.lineId === lineId);
    if (!item) return;

    // Block if delivered
    if (deliveredDishIds.has(item.dishId)) {
      toast.error('Este platillo ya fue entregado — no se puede cancelar');
      return;
    }

    // If sent to kitchen → show confirmation with reason
    const wasSent = kitchenSent && sentSnapshot.some(s => s.dishId === item.dishId);
    if (wasSent && currentOrderId) {
      setCancelPending({ dishId: item.dishId, name: item.name, emoji: item.emoji ?? '🍽️', reason: '', notes: '' });
      return;
    }

    // Not sent — remove locally
    const newItems = orderItems.filter(i => i.lineId !== lineId);
    setOrderItems(newItems);
    if (selectedTable && currentOrderId) {
      syncToDb(newItems, selectedTable, currentOrderId);
    }
  };

  const confirmCancelItem = async () => {
    if (!cancelPending || !currentOrderId) return;
    const { dishId, name, reason, notes } = cancelPending;
    setCancelPending(null);

    const fullReason = notes ? `${reason}: ${notes}` : reason;

    // Remove from local state — remove first matching item
    const idx = orderItems.findIndex(i => i.dishId === dishId);
    const newItems = idx >= 0 ? [
      ...orderItems.slice(0, idx),
      ...orderItems.slice(idx + 1),
    ] : orderItems;

    setOrderItems(newItems);
    if (selectedTable && currentOrderId) syncToDb(newItems, selectedTable, currentOrderId);
    setSentSnapshot(prev => {
      const i = prev.findIndex(s => s.dishId === dishId);
      if (i < 0) return prev;
      const updated = [...prev];
      if (updated[i].qty > 1) updated[i] = { ...updated[i], qty: updated[i].qty - 1 };
      else updated.splice(i, 1);
      return updated;
    });

    // Cancel in KDS
    const result = await cancelItemFromKDS(currentOrderId, dishId, name, fullReason);
    setCancelResult({ name, hasCost: result.hasCost });
  };

  const updateNote = (dishId: string, note: string) => {
    setOrderItems(prev => prev.map(i => i.dishId === dishId ? { ...i, notes: note } : i));
  };

  const getQty = (dishId: string) => orderItems.find(i => i.dishId === dishId)?.qty || 0;

  const subtotal = computeTotal(orderItems);
  const iva = subtotal * 0.16;
  const total = subtotal + iva;
  const itemCount = orderItems.reduce((s, i) => s + i.qty, 0);

  // ─── Send order to kitchen ────────────────────────────────────────────────

  const sendKitchenNote = async () => {
    if (!currentOrderId || !kitchenNote.trim()) return;
    setSendingNote(true);
    await supabase.from('orders')
      .update({ kitchen_notes: kitchenNote.trim(), updated_at: new Date().toISOString() })
      .eq('id', currentOrderId);
    setSendingNote(false);
    setKitchenNote('');
    setShowNoteModal(false);
    toast.success('Nota enviada a cocina');
  };

  const handlePaymentComplete = async (method: 'efectivo' | 'tarjeta' | 'cortesia', amountPaid: number, loyaltyCustomerId?: string | null, tip?: number) => {
    if (!selectedTable || !currentOrderId) return;

    if (method === 'cortesia') {
      const ok = await closeOrder({
        orderId: currentOrderId,
        tableIds: [selectedTable.id],
        items: orderItems,
        subtotal: 0, discountAmount: 0, iva: 0, total: 0,
        payMethod: 'efectivo',
        waiterName: myName,
        branchName,
        openedAt: null,
        loyaltyCustomerId: loyaltyCustomerId ?? null,
      });
      if (!ok) return;
      const supabaseClient = createClient();
      await supabaseClient.from('orders').update({ is_cortesia: true }).eq('id', currentOrderId);
      setShowPayment(false); setShowCart(false);
      setOrderItems([]); setCurrentOrderId(null); setView('tables');
      toast.success('🎁 Cortesía registrada — sin cobro al cliente');
      return;
    }

    const ok = await closeOrder({
      orderId: currentOrderId,
      tableIds: [selectedTable.id],
      items: orderItems,
      subtotal,
      discountAmount: 0,
      iva,
      total,
      payMethod: method,
      waiterName: myName,
      branchName,
      openedAt: null,
      loyaltyCustomerId: loyaltyCustomerId ?? null,
    });
    if (!ok) return;

    // Guardar propina si la hay
    if (tip && tip > 0) {
      const supabaseClient = createClient();
      await supabaseClient.from('orders').update({ tip_amount: tip }).eq('id', currentOrderId);
    }
    setShowPayment(false);
    setShowCart(false);
    setOrderItems([]);
    setCurrentOrderId(null);
    setSelectedTable(null);
    setView('tables');
    await loadData();
    toast.success(`Pago de $${total.toFixed(2)} procesado. ¡Orden cerrada!`);
  };

  const sendOrder = async () => {
    if (!selectedTable || orderItems.length === 0) return;
    setSending(true);
    try {
      const waiter = myName;
      const flowTable = { id: selectedTable.id, number: selectedTable.number, name: selectedTable.name, currentOrderId: currentOrderId ?? undefined };
      const orderId = await ensureOpenOrder(flowTable, waiter, branchName, { branchId: activeBranch ?? null });
      if (!currentOrderId) setCurrentOrderId(orderId);

      // Build diff — only items NOT yet in the snapshot are new
      const newItems = orderItems.flatMap(item => {
        const prev = sentSnapshot.find(s => s.dishId === item.dishId);
        if (!prev) {
          return [{ name: item.name, qty: item.qty, notes: item.notes, emoji: item.emoji }];
        }
        const addedQty = item.qty - prev.qty;
        if (addedQty > 0) {
          return [{ name: item.name, qty: addedQty, notes: item.notes, emoji: item.emoji }];
        }
        return [];
      });

      if (newItems.length === 0) {
        toast.error('No hay platillos nuevos para enviar a cocina');
        setSending(false);
        return;
      }

      // Flush ALL items to billing order
      await supabase.from('order_items').delete().eq('order_id', orderId);
      await supabase.from('order_items').insert(
        orderItems.map(item => ({
          order_id: orderId,
          dish_id: item.dishId,
          name: item.name,
          qty: item.qty,
          price: item.price,
          emoji: item.emoji,
          modifier: item.modifier ?? null,
          tenant_id: getTenantId(),
          notes: item.notes ?? null,
        }))
      );
      await supabase.from('restaurant_tables').update({
        status: 'ocupada',
        current_order_id: orderId,
        waiter,
        item_count: itemCount,
        partial_total: total,
        updated_at: new Date().toISOString(),
      }).eq('id', selectedTable.id);

      // Send ONLY new items as comanda to KDS
      await sendToKitchen(
        orderId,
        newItems,
        { mesa: selectedTable.name, mesero: waiter, tenantId: appUser?.tenantId ?? '' }
      );

      // Re-read DB items to sync lineIds with real UUIDs (same pattern as POS)
      const { data: freshItems } = await supabase
        .from('order_items').select('*').eq('tenant_id', getTenantId()).eq('order_id', orderId);

      if (freshItems && freshItems.length > 0) {
        const dishIds = [...new Set(freshItems.map((i: any) => i.dish_id).filter(Boolean))];
        let dishMap: Record<string, any> = {};
        if (dishIds.length > 0) {
          const { data: dishes } = await supabase.from('dishes').select('*').eq('tenant_id', getTenantId()).in('id', dishIds);
          (dishes || []).forEach((d: any) => { dishMap[d.id] = d; });
        }
        const synced: OrderFlowItem[] = freshItems.map((i: any) => ({
          lineId: i.id,
          dishId: i.dish_id ?? i.id,
          name: dishMap[i.dish_id]?.name ?? i.name,
          price: dishMap[i.dish_id] ? Number(dishMap[i.dish_id].price) : Number(i.price),
          qty: i.qty,
          emoji: dishMap[i.dish_id]?.emoji ?? i.emoji ?? '🍽️',
          modifier: i.modifier ?? undefined,
          notes: i.notes ?? undefined,
        }));
        setOrderItems(synced);
        setKitchenSent(true);
        setSentSnapshot(synced.map(r => ({ dishId: r.dishId, qty: r.qty })));
      } else {
        setKitchenSent(true);
        setSentSnapshot(orderItems.map(i => ({ dishId: i.dishId, qty: i.qty })));
      }

      toast.success(`Comanda enviada a cocina — ${selectedTable.name}`);
      setShowCart(false);
    } catch (err: any) {
      toast.error('Error al enviar orden: ' + err.message);
    } finally {
      setSending(false);
    }
  };

  // ─── Cancel table ─────────────────────────────────────────────────────────

  const handleCancelTable = () => {
    setShowCancelConfirm(true);
  };

  const executeCancelTable = async () => {
    if (!selectedTable) return;
    setShowCancelConfirm(false);
    const ok = await cancelOrder(currentOrderId, [selectedTable.id]);
    if (!ok) return;
    setOrderItems([]);
    setCurrentOrderId(null);
    setSelectedTable(null);
    setShowCart(false);
    setView('tables');
    await loadData();
    toast.success(`${selectedTable.name} liberada`);
  };

  const filteredDishes = dishes.filter(d => {
    const matchCat = category === 'Todos' || d.category === category;
    const matchSearch = !search || d.name.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: '#f59e0b' }} />
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto">
      {view === 'tables' && (
        <div className="space-y-4">
          <p className="text-sm text-gray-500">Selecciona una mesa para tomar el pedido</p>
          {/* Waiter name badge */}
          <div className="flex items-center justify-between mb-1">
            <p className="text-sm text-gray-500">Selecciona una mesa para tomar el pedido</p>
            <div className="flex items-center gap-1.5">
              <span className="text-xs px-2 py-1 rounded-full font-semibold"
                style={{ backgroundColor: '#1B3A6B', color: '#f59e0b' }}>
                👤 {myName}
              </span>
              {!appUser && editingName ? (
                <form onSubmit={e => {
                  e.preventDefault();
                  if (nameInput.trim()) {
                    setMyName(nameInput.trim());
                    localStorage.setItem('aldente_waiter_name', nameInput.trim());
                  }
                  setEditingName(false);
                }} className="flex items-center gap-1">
                  <input
                    type="text"
                    value={nameInput}
                    onChange={e => setNameInput(e.target.value)}
                    autoFocus
                    aria-label="Tu nombre"
                    className="text-xs px-2 py-1 rounded-lg border w-24 focus:outline-none focus:ring-1 focus:ring-amber-400"
                    style={{ borderColor: '#d1d5db', color: '#374151' }}
                    maxLength={30}
                  />
                  <button type="submit" className="text-xs text-green-600 font-semibold px-1" aria-label="Guardar nombre">✓</button>
                  <button type="button" onClick={() => setEditingName(false)} className="text-xs text-gray-400 px-1" aria-label="Cancelar">✕</button>
                </form>
              ) : !appUser ? (
                <button
                  onClick={() => { setNameInput(myName); setEditingName(true); }}
                  aria-label="Cambiar nombre del mesero"
                  className="text-xs text-gray-400 hover:text-gray-600 underline"
                >
                  cambiar
                </button>
              ) : null}
            </div>
          </div>

          {/* Para Llevar + QR quick buttons */}
          <div className="flex gap-2 mb-3">
            <button
              onClick={() => setShowTakeoutModal(true)}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl font-bold text-sm transition-all active:scale-95"
              style={{ backgroundColor: '#eff6ff', border: '2px solid #bfdbfe', color: '#1d4ed8' }}
            >
              <span style={{ fontSize: 18 }}>🥡</span>
              Para llevar
            </button>
            {tenantSlug && (
              <button
                onClick={() => setShowQRModal(true)}
                className="flex items-center justify-center gap-1.5 px-4 py-3 rounded-2xl font-bold text-sm transition-all active:scale-95"
                style={{ backgroundColor: '#f0fdf4', border: '2px solid #bbf7d0', color: '#16a34a' }}
                title="Mostrar carta QR a cliente"
              >
                <span style={{ fontSize: 18 }}>📷</span>
                Carta QR
              </button>
            )}
          </div>

          {/* QR Modal */}
          {showQRModal && tenantSlug && (
            <div style={{ position:'fixed', inset:0, zIndex:9999, background:'rgba(0,0,0,0.85)', backdropFilter:'blur(10px)', display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}
              onClick={() => setShowQRModal(false)}>
              <div style={{ background:'#fff', borderRadius:24, padding:32, maxWidth:340, width:'100%', textAlign:'center' }}
                onClick={e => e.stopPropagation()}>
                <h3 style={{ fontSize:20, fontWeight:800, color:'#111', marginBottom:4 }}>🍽️ Carta digital</h3>
                <p style={{ fontSize:13, color:'#6b7280', marginBottom:20 }}>Muestra este QR al cliente para ver el menú</p>
                <MeseroQRCanvas slug={tenantSlug} />
                <p style={{ fontSize:11, color:'#9ca3af', marginTop:12, wordBreak:'break-all' }}>
                  {typeof window !== 'undefined' ? window.location.origin : ''}/menu/{tenantSlug}
                </p>
                <div style={{ display:'flex', gap:8, marginTop:20 }}>
                  <button onClick={() => {
                    const link = `${window.location.origin}/menu/${tenantSlug}`;
                    navigator.clipboard.writeText(link).catch(() => {});
                    toast.success('Link copiado');
                  }} style={{ flex:1, padding:'11px', borderRadius:12, background:'#16a34a', border:'none', color:'#fff', fontSize:14, fontWeight:700, cursor:'pointer' }}>
                    Copiar link
                  </button>
                  <button onClick={() => setShowQRModal(false)} style={{ flex:1, padding:'11px', borderRadius:12, background:'#f3f4f6', border:'none', color:'#374151', fontSize:14, fontWeight:600, cursor:'pointer' }}>
                    Cerrar
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Ready orders notification strip */}
          {kitchenNotifs.length > 0 && (
            <div style={{ marginBottom:12, display:'flex', flexDirection:'column', gap:6 }}>
              {kitchenNotifs.map((r, i) => (
                <div key={r.orderId} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px', borderRadius:12, background:'rgba(34,197,94,0.08)', border:'1px solid rgba(34,197,94,0.25)' }}>
                  <span style={{ fontSize:18 }}>🔔</span>
                  <div style={{ flex:1 }}>
                    <span style={{ fontSize:13, fontWeight:700, color:'#4ade80' }}>{r.mesa}</span>
                    <span style={{ fontSize:12, color:'rgba(255,255,255,0.5)', marginLeft:6 }}>lista para servir</span>
                    <p style={{ fontSize:11, color:'rgba(255,255,255,0.35)', marginTop:1 }}>{r.items}</p>
                  </div>
                  <button onClick={() => setKitchenNotifs(prev => prev.filter(x => x.orderId !== r.orderId))}
                    style={{ background:'none', border:'none', color:'rgba(255,255,255,0.3)', cursor:'pointer', fontSize:16, padding:'0 4px' }}>×</button>
                </div>
              ))}
            </div>
          )}

          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
            {/* Takeout Modal */}
            {showTakeoutModal && (
              <div style={{ position:'fixed', inset:0, zIndex:9999, background:'rgba(0,0,0,0.6)', backdropFilter:'blur(6px)', display:'flex', alignItems:'center', justifyContent:'center', padding:'20px' }} onClick={() => setShowTakeoutModal(false)}>
                <div style={{ background:'#fff', borderRadius:20, padding:'24px', maxWidth:360, width:'100%' }} onClick={e => e.stopPropagation()}>
                  <div style={{ textAlign:'center', marginBottom:16 }}>
                    <div style={{ fontSize:40, marginBottom:8 }}>🥡</div>
                    <h3 style={{ fontSize:18, fontWeight:700, margin:'0 0 4px', color:'#111' }}>Para llevar</h3>
                    <p style={{ fontSize:13, color:'#6b7280', margin:0 }}>Nombre del cliente (opcional)</p>
                  </div>
                  <input
                    autoFocus
                    value={takeoutNameInput}
                    onChange={e => setTakeoutNameInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        const displayName = takeoutNameInput.trim() || 'Para llevar';
                        const virtualTable: Table = { id: `takeout-${Date.now()}`, number: 0, name: displayName, capacity: 0, status: 'libre' };
                        setShowTakeoutModal(false);
                        setTakeoutNameInput('');
                        selectTable(virtualTable);
                      }
                      if (e.key === 'Escape') setShowTakeoutModal(false);
                    }}
                    placeholder="Nombre del cliente..."
                    style={{ width:'100%', border:'1.5px solid #d1d5db', borderRadius:10, padding:'10px 14px', fontSize:15, outline:'none', marginBottom:14, boxSizing:'border-box' }}
                  />
                  <div style={{ display:'flex', gap:8 }}>
                    <button onClick={() => setShowTakeoutModal(false)} style={{ flex:1, padding:'10px', borderRadius:10, background:'#f3f4f6', border:'none', fontSize:14, fontWeight:600, color:'#6b7280', cursor:'pointer' }}>
                      Cancelar
                    </button>
                    <button
                      onClick={() => {
                        const displayName = takeoutNameInput.trim() || 'Para llevar';
                        const virtualTable: Table = { id: `takeout-${Date.now()}`, number: 0, name: displayName, capacity: 0, status: 'libre' };
                        setShowTakeoutModal(false);
                        setTakeoutNameInput('');
                        selectTable(virtualTable);
                      }}
                      style={{ flex:2, padding:'10px', borderRadius:10, background:'#1d4ed8', border:'none', fontSize:14, fontWeight:700, color:'#fff', cursor:'pointer' }}>
                      🥡 Crear pedido
                    </button>
                  </div>
                </div>
              </div>
            )}

            {tables.map(table => {
              const isMyTable = table.status === 'ocupada' && table.waiter === myName;
              const isOtherTable = table.status === 'ocupada' && table.waiter && table.waiter !== myName;
              const isLibre = table.status === 'libre';
              const isReady = readyOrders.includes(table.name);

              let borderClass = '';
              let bgStyle: React.CSSProperties = {};
              if (isLibre) { borderClass = 'border-green-200'; bgStyle = { backgroundColor: '#f0fdf4' }; }
              else if (isMyTable) { borderClass = 'border-amber-300'; bgStyle = { backgroundColor: '#fffbeb' }; }
              else if (isOtherTable) { borderClass = 'border-gray-200'; bgStyle = { backgroundColor: '#f9fafb', opacity: 0.6 }; }
              else { borderClass = 'border-amber-200'; bgStyle = { backgroundColor: '#fffbeb' }; }

              const handleTableClick = () => {
                if (isOtherTable) {
                  toast.error(`Mesa de ${table.waiter} — no puedes modificarla`);
                  return;
                }
                selectTable(table);
              };

              return (
                <button
                  key={table.id}
                  onClick={handleTableClick}
                  className={`aspect-square rounded-2xl flex flex-col items-center justify-center gap-1 border-2 transition-all active:scale-95 ${borderClass} ${isOtherTable ? 'cursor-not-allowed' : 'hover:brightness-95'}`}
                  style={bgStyle}
                >
                  <span className="text-2xl">{isOtherTable ? '🔒' : isMyTable ? '🪑' : '🪑'}</span>
                  <span className="text-xs font-bold text-gray-800">{table.name}</span>
                  {isLibre && <span className="text-xs px-1.5 py-0.5 rounded-full font-medium bg-green-100 text-green-700">Libre</span>}
                  {isMyTable && <span className="text-xs px-1.5 py-0.5 rounded-full font-medium bg-amber-100 text-amber-700">Mi mesa</span>}
                  {isOtherTable && <span className="text-xs px-1.5 py-0.5 rounded-full font-medium bg-gray-100 text-gray-500">{table.waiter?.split(' ')[0]}</span>}
                  {!isLibre && !isMyTable && !isOtherTable && <span className="text-xs px-1.5 py-0.5 rounded-full font-medium bg-amber-100 text-amber-700">Espera</span>}
                  {isReady && isMyTable && (
                    <span className="text-xs px-1.5 py-0.5 rounded-full font-bold animate-pulse"
                      style={{ backgroundColor: '#bbf7d0', color: '#15803d' }}>
                      ✓ Lista
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {view === 'menu' && selectedTable && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => { setView('tables'); setSelectedTable(null); setOrderItems([]); setCurrentOrderId(null); }}
              className="p-2 rounded-xl bg-gray-100 hover:bg-gray-200"
            >
              <ChevronLeft size={20} />
            </button>
            <div className="flex-1">
              <h3 className="font-bold text-gray-900">{selectedTable.name}</h3>
              <p className="text-xs text-gray-500">Cap. {selectedTable.capacity} personas</p>
            </div>
            {selectedTable.currentOrderId && (
              <button
                onClick={handleCancelTable}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors active:scale-95"
                style={{ backgroundColor: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.25)' }}
                title="Cancelar y liberar mesa sin cobrar"
              >
                <X size={14} /> Cancelar mesa
              </button>
            )}
            <button
              onClick={() => setShowCart(true)}
              className="relative flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white"
              style={{ backgroundColor: '#1B3A6B' }}
            >
              <ShoppingCart size={16} />
              {itemCount > 0 && (
                <span className="absolute -top-2 -right-2 w-5 h-5 rounded-full text-xs font-bold flex items-center justify-center" style={{ backgroundColor: '#f59e0b', color: '#1B3A6B' }}>
                  {itemCount}
                </span>
              )}
              {subtotal > 0 && <span>${subtotal.toLocaleString('es-MX', { minimumFractionDigits: 0 })}</span>}
            </button>
          </div>

          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar platillo..."
              className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${category === cat ? 'text-white' : 'text-gray-600 bg-gray-100 hover:bg-gray-200'}`}
                style={category === cat ? { backgroundColor: '#1B3A6B' } : {}}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3">
            {filteredDishes.map(dish => {
              const qty = getQty(dish.id);
              return (
                <div key={dish.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="h-16 flex items-center justify-center text-4xl" style={{ backgroundColor: '#f8f9fa' }}>
                    {dish.emoji}
                  </div>
                  <div className="p-3">
                    <p className="text-xs font-semibold text-gray-800 leading-tight mb-1 line-clamp-2">{dish.name}</p>
                    <p className="text-sm font-bold" style={{ color: '#f59e0b' }}>${Number(dish.price).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</p>
                    <div className="flex items-center justify-between mt-2">
                      {qty === 0 ? (
                        <button
                          onClick={() => addItem(dish)}
                          className="w-full py-1.5 rounded-lg text-xs font-medium text-white flex items-center justify-center gap-1 active:scale-95 transition-transform"
                          style={{ backgroundColor: '#1B3A6B' }}
                        >
                          <Plus size={14} /> Agregar
                        </button>
                      ) : (
                        <div className="flex items-center gap-2 w-full justify-between">
                          <button onClick={() => { const line = orderItems.find(i => i.dishId === dish.id); if (line) removeItem(line.lineId); }} className="w-8 h-8 rounded-lg flex items-center justify-center text-white active:scale-95" style={{ backgroundColor: '#ef4444' }}>
                            <Minus size={14} />
                          </button>
                          <span className="font-bold text-gray-800">{qty}</span>
                          <button onClick={() => addItem(dish)} className="w-8 h-8 rounded-lg flex items-center justify-center text-white active:scale-95" style={{ backgroundColor: '#10b981' }}>
                            <Plus size={14} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {showCart && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50">
          <div className="bg-white rounded-t-3xl w-full max-w-lg max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h3 className="font-bold text-gray-900">Pedido — {selectedTable?.name}</h3>
              <button onClick={() => setShowCart(false)} className="p-2 rounded-xl hover:bg-gray-100">
                <X size={20} />
              </button>
            </div>
            <div className="p-5 space-y-2">
              {orderItems.map(item => (
                <div key={item.dishId} className="border-b border-gray-50 last:border-0 pb-2 last:pb-0">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{item.emoji}</span>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-800">{item.name}</p>
                      <p className="text-xs text-gray-500">${item.price.toLocaleString('es-MX', { minimumFractionDigits: 2 })} c/u</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => removeItem(item.lineId)} className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#ef444420', color: '#ef4444' }}>
                        <Minus size={12} />
                      </button>
                      <span className="font-bold text-gray-800 w-5 text-center">{item.qty}</span>
                      <button
                        onClick={() => addItem(dishes.find(d => d.id === item.dishId) ?? { id: item.dishId, name: item.name, price: item.price, emoji: item.emoji, category: '', available: true, description: '', image: null, image_alt: null, popular: false, created_at: '', updated_at: null })}
                        className="w-7 h-7 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: '#10b98120', color: '#10b981' }}
                      >
                        <Plus size={12} />
                      </button>
                      <button
                        onClick={() => setExpandedNoteId(expandedNoteId === item.dishId ? null : item.dishId)}
                        className="w-7 h-7 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: item.notes ? 'rgba(245,158,11,0.15)' : '#f3f4f6', color: item.notes ? '#d97706' : '#9ca3af' }}
                        title="Nota para cocina"
                      >
                        <MessageSquare size={12} />
                      </button>
                    </div>
                    <span className="text-sm font-bold text-gray-800 w-16 text-right">
                      ${(item.qty * item.price).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  {item.notes && expandedNoteId !== item.dishId && (
                    <p className="text-xs mt-1 ml-9 italic" style={{ color: '#d97706' }}>📝 {item.notes}</p>
                  )}
                  {expandedNoteId === item.dishId && (
                    <div className="mt-1.5 ml-9 mr-2">
                      <input
                        type="text"
                        value={item.notes ?? ''}
                        onChange={(e) => updateNote(item.dishId, e.target.value)}
                        placeholder="Sin cebolla, término medio..."
                        className="w-full px-3 py-1.5 text-xs rounded-lg border outline-none"
                        style={{ borderColor: '#fde68a', backgroundColor: '#fffbeb', color: '#92400e' }}
                        autoFocus
                        onBlur={() => setExpandedNoteId(null)}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === 'Escape') setExpandedNoteId(null); }}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className="p-5 border-t border-gray-100 space-y-3">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Subtotal</span>
                <span>${subtotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-600">
                <span>IVA (16%)</span>
                <span>${iva.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between font-bold text-gray-900">
                <span>Total</span>
                <span>${total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
              </div>
              <button
                onClick={sendOrder}
                disabled={sending || orderItems.length === 0}
                className="w-full py-3 rounded-2xl text-sm font-bold text-white flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95 transition-transform"
                style={{ backgroundColor: '#1B3A6B' }}
              >
                <Send size={16} /> {sending ? 'Enviando...' : 'Enviar a Cocina'}
              </button>
              {currentOrderId && (
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setShowNoteModal(true)}
                    className="py-3 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 active:scale-95 transition-transform"
                    style={{ backgroundColor: 'rgba(245,158,11,0.15)', color: '#d97706', border: '1px solid rgba(245,158,11,0.3)' }}
                  >
                    <MessageSquare size={15} /> Nota
                  </button>
                  <button
                    onClick={() => setShowPayment(true)}
                    disabled={orderItems.length === 0}
                    className="py-3 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95 transition-transform"
                    style={{ backgroundColor: '#f59e0b', color: '#1B3A6B' }}
                  >
                    <CreditCard size={15} /> Cobrar
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {/* Modal nota a cocina */}
      {showNoteModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="w-full max-w-lg rounded-2xl p-5 space-y-3"
            style={{ backgroundColor: 'white' }}>
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-gray-900">Nota a cocina</h3>
              <button onClick={() => { setShowNoteModal(false); setKitchenNote(''); }}
                className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <p className="text-xs text-gray-500">
              Envía una nota urgente sobre la orden de {selectedTable?.name}.
              Aparecerá resaltada en la pantalla de cocina.
            </p>
            <textarea
              value={kitchenNote}
              onChange={e => setKitchenNote(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 rounded-xl border text-sm resize-none outline-none"
              style={{ borderColor: '#e5e7eb', backgroundColor: '#fefce8' }}
              placeholder="Ej: sin cebolla en los tacos, alergia a mariscos, urgente mesa VIP..."
              autoFocus
            />
            <div className="flex gap-2">
              <button onClick={() => { setShowNoteModal(false); setKitchenNote(''); }}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
                style={{ backgroundColor: '#f3f4f6', color: '#6b7280' }}>
                Cancelar
              </button>
              <button onClick={sendKitchenNote}
                disabled={sendingNote || !kitchenNote.trim()}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold disabled:opacity-50"
                style={{ backgroundColor: '#f59e0b', color: '#1B3A6B' }}>
                {sendingNote ? 'Enviando...' : '📝 Enviar a cocina'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showPayment && selectedTable && (
        <PaymentModal
          total={total}
          subtotal={subtotal}
          iva={iva}
          discount={0}
          items={orderItems.map(i => ({
            id: i.dishId,
            name: i.name,
            emoji: i.emoji,
            price: i.price,
            quantity: i.qty,
            notes: i.notes,
          }))}
          mesa={selectedTable.name}
          mesero={myName}
          onClose={() => setShowPayment(false)}
          onComplete={handlePaymentComplete}
        />
      )}

      {/* ── Cancel item modal ── */}
      {cancelPending && (
        <div style={{ position:'fixed', inset:0, zIndex:9999, background:'rgba(0,0,0,0.7)', backdropFilter:'blur(6px)', display:'flex', alignItems:'flex-end', justifyContent:'center' }}>
          <div style={{ background:'#1a1a2e', border:'1px solid rgba(239,68,68,0.35)', borderRadius:'20px 20px 0 0', padding:'24px', width:'100%', maxWidth:'480px' }}>
            <div style={{ textAlign:'center', marginBottom:'16px' }}>
              <div style={{ fontSize:'32px', marginBottom:'8px' }}>🗑️</div>
              <h3 style={{ color:'#f1f5f9', fontSize:'16px', fontWeight:700, marginBottom:'4px' }}>¿Cancelar platillo?</h3>
              <p style={{ color:'rgba(255,255,255,0.6)', fontSize:'13px' }}>{cancelPending.emoji} {cancelPending.name}</p>
              <p style={{ color:'#f87171', fontSize:'12px', marginTop:'4px' }}>Ya fue enviado a cocina — se registrará la merma si está en preparación.</p>
            </div>
            <div style={{ marginBottom:'14px' }}>
              <p style={{ color:'rgba(255,255,255,0.5)', fontSize:'10px', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:'8px' }}>Motivo</p>
              <div style={{ display:'flex', flexDirection:'column', gap:'6px' }}>
                {['Solicitud del cliente','Cliente encontró problema con el platillo','Error al registrar','Platillo no disponible','Demora excesiva en preparación','Otro motivo'].map(r => (
                  <button key={r} onClick={() => setCancelPending(prev => prev ? {...prev, reason: r} : null)}
                    style={{ padding:'8px 12px', borderRadius:'9px', textAlign:'left', border:'none', cursor:'pointer', fontSize:'13px',
                      background: cancelPending.reason === r ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.05)',
                      color: cancelPending.reason === r ? '#f87171' : 'rgba(255,255,255,0.6)',
                      outline: cancelPending.reason === r ? '1.5px solid rgba(239,68,68,0.4)' : 'none' }}>
                    {cancelPending.reason === r ? '● ' : '○ '}{r}
                  </button>
                ))}
              </div>
              {cancelPending.reason && (
                <textarea value={cancelPending.notes}
                  onChange={e => setCancelPending(prev => prev ? {...prev, notes: e.target.value} : null)}
                  placeholder="Notas adicionales (opcional)"
                  rows={2}
                  style={{ width:'100%', marginTop:'8px', background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.15)', borderRadius:'9px', padding:'8px 12px', color:'#f1f5f9', fontSize:'12px', resize:'none', outline:'none', fontFamily:'inherit', boxSizing:'border-box' }}
                />
              )}
            </div>
            <div style={{ display:'flex', gap:'10px' }}>
              <button onClick={() => setCancelPending(null)}
                style={{ flex:1, padding:'12px', borderRadius:'12px', border:'1px solid rgba(255,255,255,0.15)', background:'transparent', color:'rgba(255,255,255,0.6)', fontSize:'14px', cursor:'pointer' }}>
                Mantener
              </button>
              <button onClick={confirmCancelItem} disabled={!cancelPending.reason}
                style={{ flex:1, padding:'12px', borderRadius:'12px', border:'none', background: cancelPending.reason ? '#dc2626' : 'rgba(239,68,68,0.3)', color:'white', fontSize:'14px', fontWeight:600, cursor: cancelPending.reason ? 'pointer' : 'not-allowed' }}>
                Sí, cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Cancel item result ── */}
      {cancelResult && (
        <div style={{ position:'fixed', inset:0, zIndex:9999, background:'rgba(0,0,0,0.6)', display:'flex', alignItems:'center', justifyContent:'center', padding:'16px' }}>
          <div style={{ background: cancelResult.hasCost ? '#1a0f0f' : '#0f1a10', border:`1px solid ${cancelResult.hasCost ? 'rgba(239,68,68,0.4)' : 'rgba(34,197,94,0.4)'}`, borderRadius:'20px', padding:'28px 24px', maxWidth:'320px', width:'100%', textAlign:'center' }}>
            <div style={{ fontSize:'36px', marginBottom:'10px' }}>{cancelResult.hasCost ? '⚠️' : '✅'}</div>
            <h3 style={{ color:'#f1f5f9', fontSize:'15px', fontWeight:700, marginBottom:'8px' }}>
              {cancelResult.hasCost ? 'Merma registrada' : 'Platillo cancelado'}
            </h3>
            <p style={{ color:'rgba(255,255,255,0.6)', fontSize:'13px', marginBottom:'20px' }}>
              {cancelResult.name} fue retirado del kanban de cocina.
              {cancelResult.hasCost && ' El costo se registró como merma.'}
            </p>
            <button onClick={() => setCancelResult(null)}
              style={{ width:'100%', padding:'11px', borderRadius:'11px', border:'none', background: cancelResult.hasCost ? '#dc2626' : '#16a34a', color:'white', fontSize:'14px', fontWeight:600, cursor:'pointer' }}>
              Entendido
            </button>
          </div>
        </div>
      )}

      {/* ── Confirm cancel table ── */}
      {showCancelConfirm && selectedTable && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="mesero-cancel-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.55)' }}
        >
          <div className="w-full max-w-sm bg-white rounded-2xl p-6 shadow-2xl">
            <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 bg-red-50">
              <span className="text-2xl">🗑️</span>
            </div>
            <h3 id="mesero-cancel-title" className="text-base font-bold text-center text-gray-900 mb-2">
              ¿Cancelar orden?
            </h3>
            <p className="text-sm text-center text-gray-500 mb-5">
              Se liberará <strong className="text-gray-800">{selectedTable.name}</strong> y se eliminarán todos los artículos sin cobrar.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowCancelConfirm(false)}
                aria-label="Mantener la orden"
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-gray-100 text-gray-700"
              >
                Mantener orden
              </button>
              <button
                onClick={executeCancelTable}
                aria-label="Confirmar cancelar y liberar mesa"
                className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-red-500 text-white"
              >
                Sí, cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {modifierPending && (
        <ModifierModal
          item={{ id: modifierPending.id, name: modifierPending.name, price: Number(modifierPending.price), emoji: modifierPending.emoji }}
          onConfirm={handleModifierConfirm}
          onCancel={() => setModifierPending(null)}
        />
      )}
    </div>
  );
}