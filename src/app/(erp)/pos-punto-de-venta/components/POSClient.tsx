'use client';
import { getCurrentTenantId as getTenantId } from '@/lib/tenantStore';



import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSysConfig } from '@/hooks/useSysConfig';
import { useBranch } from '@/hooks/useBranch';
import Sidebar from '@/components/Sidebar';
import Topbar from '@/components/Topbar';
import TableMap from './TableMap';
import ModifierModal, { type ModifierLine } from './ModifierModal';
import type { LayoutTablePosition } from './TableMap';
import MenuGrid from './MenuGrid';
import OrderPanel from './OrderPanel';
import PaymentModal from './PaymentModal';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { useOrderFlow } from '@/hooks/useOrderFlow';

import { Merge, X } from 'lucide-react';

export type TableStatus = 'libre' | 'ocupada' | 'espera';

export interface Table {
  id: string;
  number: number;
  name: string;
  capacity: number;
  status: TableStatus;
  currentOrderId?: string;
  waiter?: string;
  openedAt?: string;
  itemCount?: number;
  partialTotal?: number;
  mergeGroupId?: string;
}

export interface MenuItem {
  id: string;
  name: string;
  category: string;
  price: number;
  description: string;
  available: boolean;
  emoji: string;
  popular?: boolean;
}

export interface OrderItem {
  lineId: string;                      // unique per line — allows same dish multiple times with different modifiers
  menuItem: MenuItem;
  quantity: number;
  notes?: string;                      // legacy general note
  modifier?: string;                   // per-line modifier (e.g. "sin cebolla", "bien cocido")
  excludedIngredientIds?: string[];    // ingredient ids removed — skipped during inventory deduction
}

// ─── Skeleton ────────────────────────────────────────────────────────────────

function TableSkeleton() {
  return (
    <div className="grid grid-cols-4 gap-3 p-5">
      {Array.from({ length: 16 }).map((_, i) => (
        <div key={i} className="rounded-xl animate-pulse" style={{ minHeight: '100px', backgroundColor: '#f3f4f6', border: '1px solid #e5e7eb' }} />
      ))}
    </div>
  );
}

function MenuSkeleton() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-3 p-4">
      {Array.from({ length: 12 }).map((_, i) => (
        <div key={i} className="rounded-xl overflow-hidden animate-pulse border" style={{ borderColor: '#e5e7eb' }}>
          <div className="h-24 bg-gray-100" />
          <div className="p-3 space-y-2">
            <div className="h-3 bg-gray-100 rounded w-3/4" />
            <div className="h-3 bg-gray-100 rounded w-full" />
            <div className="h-3 bg-gray-100 rounded w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function POSClient() {
  const { appUser } = useAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [modifierPending, setModifierPending] = useState<typeof menuItems[0] | null>(null);
  const [cancelItemPending, setCancelItemPending] = useState<{lineId:string; dishId:string; name:string; emoji:string; reason:string; notes:string} | null>(null);
  const [cancelItemResult, setCancelItemResult] = useState<{name:string; hasCost:boolean} | null>(null);
  // lineIds of items that are in a lista/entregada comanda — cannot be cancelled
  const [deliveredLineIds, setDeliveredLineIds] = useState<Set<string>>(new Set());

  const { branch: activeBranch } = useBranch();
  const [establishmentType, setEstablishmentType] = useState<'restaurante'|'cafeteria'|'bar'|'mixto'>('restaurante');
  const [blockSaleNoStock, setBlockSaleNoStock] = useState(false);
  const [tables, setTables] = useState<Table[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loadingTables, setLoadingTables] = useState(true);
  const [loadingMenu, setLoadingMenu] = useState(true);
  // View starts on tables for restaurants, but we'll switch to takeout-first for cafeterias
  const [view, setView] = useState<'tables' | 'menu' | 'order_mobile'>('tables');
  const [discount, setDiscount] = useState<{ type: 'pct' | 'fixed'; value: number }>({ type: 'pct', value: 0 });
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [kitchenSent, setKitchenSent] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [showNoKitchenConfirm, setShowNoKitchenConfirm] = useState(false);
  const [sentItemsSnapshot, setSentItemsSnapshot] = useState<{id:string;qty:number}[]>([]);
  const [sendingToKitchen, setSendingToKitchen] = useState(false);

  // Para llevar state
  const [showTakeoutModal, setShowTakeoutModal] = useState(false);
  // Traslado entre mesas
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [takeoutCustomerName, setTakeoutCustomerName] = useState('');
  const [takeoutNameInput, setTakeoutNameInput] = useState('');

  // Layout state
  const [layoutTables, setLayoutTables] = useState<LayoutTablePosition[]>([]);
  const [layoutId, setLayoutId] = useState<string | null>(null);

  // Merge mode state
  const [mergeMode, setMergeMode] = useState(false);
  const [mergeSelection, setMergeSelection] = useState<string[]>([]);
  const [branchName, setBranchName] = useState('Sucursal Principal');

  const supabase = createClient();

  // Recalculates which items are non-cancellable based on comanda status in DB
  const refreshDeliveredItems = useCallback(async (
    orderId: string,
    currentItems: OrderItem[],
  ) => {
    const { data: cs } = await supabase.from('orders')
      .select('id, kitchen_status, order_items(id, dish_id)')
      .eq('parent_order_id', orderId)
      .eq('is_comanda', true)
      .neq('status', 'cancelada');
    const delivered = new Set<string>();
    (cs || []).forEach((c: any) => {
      if (c.kitchen_status === 'lista' || c.kitchen_status === 'entregada') {
        (c.order_items || []).forEach((ci: any) => {
          currentItems.filter(s => s.menuItem.id === ci.dish_id)
            .forEach(s => delivered.add(s.lineId));
        });
      }
    });
    setDeliveredLineIds(delivered);
  }, [supabase]);
  const { closeOrder, cancelOrder: cancelOrderFlow, sendToKitchen, cancelItemFromKDS } = useOrderFlow();
  const { ivaPercent } = useSysConfig();
  const IVA_RATE = ivaPercent / 100;

  const subtotal = orderItems.reduce((sum, item) => sum + item.menuItem.price * item.quantity, 0);
  const discountAmount = discount.type === 'pct' ? subtotal * (discount.value / 100) : discount.value;
  const taxableAmount = subtotal - discountAmount;
  const iva = taxableAmount * IVA_RATE;
  const total = taxableAmount + iva;
  const itemCount = orderItems.reduce((s, i) => s + i.quantity, 0);

  const [reservedTables, setReservedTables] = useState<string[]>([]);

  const fetchReservations = useCallback(async () => {
    const now = new Date();
    const in2h = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    const today = now.toISOString().split('T')[0];
    const timeNow = now.toTimeString().slice(0, 5);
    const time2h  = in2h.toTimeString().slice(0, 5);
    const { data } = await supabase
      .from('reservations')
      .select('table_id')
      .eq('reservation_date', today)
      .eq('status', 'confirmada')
      .gte('reservation_time', timeNow)
      .lte('reservation_time', time2h);
    setReservedTables((data || []).map((r: any) => r.table_id).filter(Boolean));
  }, [supabase]);

  useEffect(() => { fetchReservations(); }, [fetchReservations]);

  const fetchTables = useCallback(async () => {
    setLoadingTables(true);
    const [{ data: configData }, { data, error }] = await Promise.all([
      supabase.from('system_config').eq('tenant_id', getTenantId()).select('config_value').eq('config_key', 'table_count').single(),
      activeBranch
        ? supabase.from('restaurant_tables').select('*').eq('tenant_id', JSON.parse(sessionStorage.getItem('aldente_session')||'{}')?.tenantId).gt('number', 0).eq('branch_id', activeBranch).order('number')
        : supabase.from('restaurant_tables').select('*').eq('tenant_id', JSON.parse(sessionStorage.getItem('aldente_session')||'{}')?.tenantId).gt('number', 0).order('number'),
    ]);

    let layoutData: any = null;
    try {
      const res = await supabase.from('restaurant_layout').select('*').eq('tenant_id', getTenantId()).limit(1).single();
      layoutData = res.data ?? null;
    } catch {
      layoutData = null;
    }

    const configuredCount = configData ? parseInt(configData.config_value) : 0;

    if (!error && data) {
      let tableList = (data as any[]).map((t) => ({
        id: t.id,
        number: t.number,
        name: t.name,
        capacity: t.capacity,
        status: t.status as TableStatus,
        currentOrderId: t.current_order_id || undefined,
        waiter: t.waiter || undefined,
        openedAt: t.opened_at || undefined,
        itemCount: t.item_count || undefined,
        partialTotal: t.partial_total ? Number(t.partial_total) : undefined,
        mergeGroupId: t.merge_group_id || undefined,
      }));

      if (configuredCount > tableList.length) {
        const existing = new Set(tableList.map((t) => t.number));
        const toInsert = [];
        for (let n = 1; n <= configuredCount; n++) {
          if (!existing.has(n)) {
            toInsert.push({ number: n, name: `Mesa ${n}`, capacity: 4, status: 'libre', branch_id: activeBranch ?? null, tenant_id: getTenantId() });
          }
        }
        if (toInsert.length > 0) {
          const { data: inserted } = await supabase.from('restaurant_tables').insert(toInsert).select();
          if (inserted) {
            const newTables = inserted.map((t: any) => ({
              id: t.id, number: t.number, name: t.name, capacity: t.capacity,
              status: t.status as TableStatus,
              currentOrderId: undefined, waiter: undefined, openedAt: undefined,
              itemCount: undefined, partialTotal: undefined, mergeGroupId: undefined,
            }));
            tableList = [...tableList, ...newTables].sort((a, b) => a.number - b.number);
          }
        }
      }
      setTables(tableList);
    }

    if (layoutData) {
      setLayoutId(layoutData.id);
      setLayoutTables((layoutData.tables_layout as LayoutTablePosition[]) || []);
    } else {
      setLayoutTables([]);
      setLayoutId(null);
    }
    setLoadingTables(false);
  }, [supabase]);

  const fetchMenu = useCallback(async () => {
    setLoadingMenu(true);
    const { data, error } = await supabase.from('dishes').select('*').eq('tenant_id', getTenantId()).eq('available', true).order('category').order('name');
    if (!error && data) {
      setMenuItems(data.map((d) => ({
        id: d.id, name: d.name, category: d.category,
        price: Number(d.price), description: d.description,
        available: d.available, emoji: d.emoji, popular: d.popular,
      })));
    }
    setLoadingMenu(false);
  }, [supabase]);

  // When blockSaleNoStock turns on, mark dishes unavailable if ingredients are low
  // Uses functional setMenuItems(prev=>) so we don't need menuItems in deps
  // (avoids infinite loop: setMenuItems → menuItems changes → effect re-runs)
  const stockCheckDoneRef = useRef(false);
  useEffect(() => {
    if (!blockSaleNoStock) { stockCheckDoneRef.current = false; return; }
    if (stockCheckDoneRef.current) return; // already checked this session
    stockCheckDoneRef.current = true;
    supabase.from('dish_recipes')
      .select('dish_id, quantity, ingredients(id, stock, unit)')
      .eq('tenant_id', getTenantId())
      .then(({ data: recipes }) => {
        if (!recipes) return;
        const canMake: Record<string, boolean> = {};
        recipes.forEach((r: any) => {
          const ing = r.ingredients;
          if (!ing) return;
          if (Number(ing.stock) < Number(r.quantity)) {
            canMake[r.dish_id] = false;
          }
        });
        setMenuItems(prev => prev.map(m => ({
          ...m,
          available: canMake[m.id] === false ? false : m.available,
        })));
      });
  }, [blockSaleNoStock, supabase]);

  useEffect(() => {
    fetchTables();
    fetchMenu();
  }, [fetchTables, fetchMenu]);

  const [restaurantName, setRestaurantName] = useState('');
  const [printerConfigData, setPrinterConfigData] = useState<any>(null);
  const [businessHours, setBusinessHours] = useState<{day:string;open:boolean;from:string;to:string}[]>([]);
  const [outsideHours, setOutsideHours] = useState(false);

  useEffect(() => {
    // Cargar horarios de apertura desde system_config
    supabase.from('system_config').eq('tenant_id', getTenantId()).select('config_key, config_value').in('config_key', ['establishment_type','block_sale_no_stock']).then(({ data }) => {
      (data || []).forEach((r: any) => {
        if (r.config_key === 'establishment_type') setEstablishmentType(r.config_value as any);
        if (r.config_key === 'block_sale_no_stock') setBlockSaleNoStock(r.config_value === 'true');
      });
    }),
    supabase.from('system_config').eq('tenant_id', getTenantId()).select('config_value').eq('config_key', 'business_hours').single()
      .then(({ data }) => {
        if (data?.config_value) {
          try {
            const hrs = JSON.parse(data.config_value);
            setBusinessHours(hrs);
            const now = new Date();
            const days = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
            const dayKey = days[now.getDay()];
            const todayHours = hrs.find((h: any) => h.day === dayKey);
            if (todayHours && todayHours.open) {
              const timeStr = now.toTimeString().slice(0, 5);
              if (timeStr < todayHours.from || timeStr > todayHours.to) setOutsideHours(true);
            } else if (todayHours && !todayHours.open) {
              setOutsideHours(true);
            }
          } catch {}
        }
      });

    // Cargar nombre de sucursal desde system_config
    supabase.from('system_config')
      .select('config_key, config_value')
      .in('config_key', ['branch_name', 'restaurant_name'])
      .then(({ data }) => {
        data?.forEach((r: any) => {
          if (r.config_key === 'branch_name')    setBranchName(r.config_value);
          if (r.config_key === 'restaurant_name') setRestaurantName(r.config_value);
        });
      });

    // Cargar config de impresora
    supabase.from('printer_config').select('*').eq('tenant_id', getTenantId()).limit(1).single()
      .then(({ data }) => {
        if (data) setPrinterConfigData({
          headerLine1:     data.header_line1,
          headerLine2:     data.header_line2,
          footerText:      data.footer_text,
          separatorChar:   data.separator_char,
          paperWidth:      data.paper_width as 58 | 80,
          autoCut:         data.auto_cut,
          showOrderNumber: data.show_order_number,
          showDate:        data.show_date,
          showMesa:        data.show_mesa,
          showMesero:      data.show_mesero,
          showSubtotal:    data.show_subtotal,
          showIva:         data.show_iva,
          showDiscount:    data.show_discount,
          showUnitPrice:   data.show_unit_price,
        });
      })

    // Cargar sucursal activa del selector
    try {
      const stored = localStorage.getItem('sr_active_branch');
      if (stored) { const b = JSON.parse(stored); if (b?.name) setBranchName(b.name); }
    } catch {}

    const branchHandler = (e: Event) => {
      const d = (e as CustomEvent).detail;
      if (d?.name) setBranchName(d.name);
    };
    window.addEventListener('branch-changed', branchHandler);
    return () => window.removeEventListener('branch-changed', branchHandler);
  }, []);

  // ─── Realtime: auto-refresh tables when any table/order changes ───────────
  // This keeps the POS in sync with Mesero Móvil and other POS terminals.

  useEffect(() => {
    let retryTimeout: ReturnType<typeof setTimeout> | null = null;
    let retryCount = 0;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let destroyed = false;

    const connect = () => {
      if (destroyed) return;
      channel = supabase
        .channel(`pos-tables-${Date.now()}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'restaurant_tables' }, (payload: any) => {
          fetchTables();
          // If the currently-selected table was freed/changed by another device, reset the order panel
          setSelectedTable(prev => {
            if (!prev) return prev;
            const changed = payload?.new ?? payload?.old;
            if (changed && changed.id === prev.id) {
              const newStatus = payload?.new?.status;
              const newOrderId = payload?.new?.current_order_id;
              // Table was freed (status changed to libre or order removed)
              if (newStatus === 'libre' || (!newOrderId && prev.currentOrderId)) {
                // Reset order panel asynchronously to avoid state update during render
                setTimeout(() => {
                  setOrderItems([]);
                  setView('tables');
                  setKitchenSent(false);
                  setSentItemsSnapshot([]);
                }, 0);
                return null;
              }
            }
            return prev;
          });
        })
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, () => {
          fetchTables();
        })
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders' }, (payload: any) => {
          fetchTables();
          // If a comanda changed status to lista/entregada, refresh non-cancellable items
          const updated = payload.new as Record<string, unknown>;
          if (updated?.is_comanda && updated?.parent_order_id) {
            const status = updated.kitchen_status as string;
            if (status === 'lista' || status === 'entregada' || status === 'cancelada') {
              // Use ref to get current selectedTable and orderItems without stale closure
              setSelectedTable(prev => {
                if (prev?.currentOrderId === updated.parent_order_id) {
                  // Trigger refresh — use setTimeout to avoid state update during render
                  setTimeout(() => {
                    setOrderItems(items => {
                      if (items.length > 0 && prev?.currentOrderId) {
                        refreshDeliveredItems(prev.currentOrderId as string, items);
                      }
                      return items;
                    });
                  }, 0);
                }
                return prev;
              });
            }
          }
        })
        .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'orders' }, () => {
          fetchTables();
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
  }, [supabase, fetchTables]);

  // ─── Merge helpers ────────────────────────────────────────────────────────

  const getMergeGroup = useCallback((table: Table): Table[] => {
    if (!table.mergeGroupId) return [table];
    return tables.filter((t) => t.mergeGroupId === table.mergeGroupId);
  }, [tables]);

  const getGroupPrimary = useCallback((table: Table): Table => {
    if (!table.mergeGroupId) return table;
    const group = tables.filter((t) => t.mergeGroupId === table.mergeGroupId);
    return group.find((t) => t.currentOrderId) ?? group[0] ?? table;
  }, [tables]);

  // ─── Sync order_items to DB with debounce (prevents race conditions) ────────
  // Each call cancels the previous pending sync — only the last state is written.

  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const syncOrderToTable = useCallback((
    orderId: string,
    tableIds: string[],
    items: OrderItem[],
    totalAmount: number,
  ) => {
    if (syncTimerRef.current) clearTimeout(syncTimerRef.current);

    syncTimerRef.current = setTimeout(async () => {
      const count = items.reduce((s, i) => s + i.quantity, 0);

      // DELETE all current items for this order, then INSERT the full current state.
      // This is safe because the timer is debounced — only one instance runs at a time.
      const { error: delErr } = await supabase.from('order_items')
        .delete().eq('order_id', orderId);
      if (delErr) { console.error('[POS] sync delete error:', delErr.message); return; }

      if (items.length > 0) {
        const { error: insErr } = await supabase.from('order_items').insert(
          items.map((item) => ({
            order_id: orderId,
            dish_id: item.menuItem.id,
            name: item.menuItem.name,
            qty: item.quantity,
            price: item.menuItem.price,
            emoji: item.menuItem.emoji,
            modifier: item.modifier ?? null,
            tenant_id: getTenantId(),
            notes: item.notes ?? null,
          }))
        );
        if (insErr) { console.error('[POS] sync insert error:', insErr.message); return; }
      }

      await supabase.from('restaurant_tables').update({
        item_count: count,
        partial_total: totalAmount,
        updated_at: new Date().toISOString(),
      }).in('id', tableIds);
    }, 400);
  }, [supabase]);

  // ─── Table select ─────────────────────────────────────────────────────────

  // ── Traslado de orden a otra mesa ──────────────────────────────────────────
  const handleTransferTable = async (targetTable: Table) => {
    if (!selectedTable?.currentOrderId || !targetTable.id) return;
    if (targetTable.currentOrderId) {
      toast.error(`${targetTable.name} ya tiene una orden activa`);
      return;
    }
    try {
      const orderId = selectedTable.currentOrderId;
      const now = new Date().toISOString();
      // Update order: new mesa
      await supabase.from('orders').update({
        mesa: targetTable.name,
        mesa_num: targetTable.number,
      }).eq('id', orderId).eq('tenant_id', getTenantId());
      // Free old table
      await supabase.from('restaurant_tables').update({
        status: 'libre', current_order_id: null, waiter: null, opened_at: null,
        item_count: 0, partial_total: 0, updated_at: now,
      }).eq('id', selectedTable.id);
      // Occupy new table
      await supabase.from('restaurant_tables').update({
        status: 'ocupada', current_order_id: orderId,
        waiter: selectedTable.waiter ?? appUser?.fullName ?? '',
        opened_at: selectedTable.openedAt ?? now,
        updated_at: now,
      }).eq('id', targetTable.id);
      toast.success(`Orden trasladada a ${targetTable.name}`);
      setShowTransferModal(false);
      // Update local state
      setSelectedTable({ ...targetTable, currentOrderId: orderId, waiter: selectedTable.waiter, openedAt: selectedTable.openedAt, status: 'ocupada', itemCount: selectedTable.itemCount, partialTotal: selectedTable.partialTotal });
      setTables(prev => prev.map(t => {
        if (t.id === selectedTable.id) return { ...t, status: 'libre' as any, currentOrderId: undefined, waiter: undefined };
        if (t.id === targetTable.id) return { ...t, status: 'ocupada' as any, currentOrderId: orderId, waiter: selectedTable.waiter };
        return t;
      }));
    } catch (err: any) {
      toast.error('Error al trasladar: ' + err.message);
    }
  };

  // ── Para Llevar: create order without a physical table ────────────────────
  const handleCreateTakeout = async (customerName: string) => {
    const orderId = `ORD-${Date.now()}`;
    const now = new Date().toISOString();
    const waiterName = appUser?.fullName ?? 'Administrador';
    const displayName = customerName.trim() || 'Para llevar';

    const takeoutTable: Table = {
      id: `takeout-${orderId}`,
      number: 0,
      name: displayName,
      capacity: 0,
      status: 'ocupada',
      currentOrderId: orderId,
      waiter: waiterName,
      openedAt: now,
      itemCount: 0,
      partialTotal: 0,
      mergeGroupId: undefined,
    };

    const { error: orderErr } = await supabase.from('orders').insert({
      tenant_id: getTenantId(),
      id: orderId,
      mesa: displayName,
      mesa_num: 0,
      mesero: waiterName,
      subtotal: 0, iva: 0, discount: 0, total: 0,
      status: 'abierta',
      kitchen_status: 'en_edicion',
      opened_at: now,
      branch: branchName,
      order_type: 'para_llevar',
      customer_name: customerName.trim() || null,
    });

    if (orderErr) {
      toast.error('Error al crear orden para llevar: ' + orderErr.message);
      return;
    }

    setSelectedTable(takeoutTable);
    setOrderItems([]);
    setKitchenSent(false);
    setDeliveredLineIds(new Set());
    setSentItemsSnapshot([]);
    setDiscount({ type: 'pct', value: 0 });
    setView('menu');
    setShowTakeoutModal(false);
    setTakeoutNameInput('');
    toast.success(`🥡 Orden para llevar${customerName.trim() ? ` — ${customerName.trim()}` : ' creada'}`);
  };

  const handleTableSelect = async (table: Table) => {
    if (mergeMode) {
      setMergeSelection((prev) =>
        prev.includes(table.id) ? prev.filter((id) => id !== table.id) : [...prev, table.id]
      );
      return;
    }

    // ── Waiter-based table blocking (same logic as MeseroMovil) ──────────────
    const currentWaiter = appUser?.fullName ?? 'Administrador';
    if (table.status === 'ocupada' && table.waiter && table.waiter !== currentWaiter) {
      toast.error(`Mesa de ${table.waiter} — no puedes modificarla`);
      return;
    }

    const primary = getGroupPrimary(table);
    setSelectedTable(primary);
    setDiscount({ type: 'pct', value: 0 });
    setKitchenSent(false);

    // Load existing open order if the table already has one
    if (primary.currentOrderId) {
      // Fetch order status AND items in parallel — no race condition
      const [{ data: orderMeta }, { data: existingItems }] = await Promise.all([
        supabase.from('orders').select('kitchen_status').eq('tenant_id', getTenantId()).eq('id', primary.currentOrderId).single(),
        supabase.from('order_items').select('*').eq('tenant_id', getTenantId()).eq('order_id', primary.currentOrderId),
      ]);

      const alreadySent = orderMeta?.kitchen_status != null && orderMeta.kitchen_status !== 'en_edicion';
      setKitchenSent(alreadySent);

      if (existingItems && existingItems.length > 0) {
        const dishIds = [...new Set(existingItems.map((i: any) => i.dish_id).filter(Boolean))];
        let dishMap: Record<string, MenuItem> = {};
        if (dishIds.length > 0) {
          const { data: dishes } = await supabase.from('dishes').select('*').eq('tenant_id', getTenantId()).in('id', dishIds);
          (dishes || []).forEach((d: any) => {
            dishMap[d.id] = {
              id: d.id, name: d.name, category: d.category,
              price: Number(d.price), description: d.description,
              available: d.available, emoji: d.emoji, popular: d.popular,
            };
          });
        }
        const restored: OrderItem[] = existingItems.map((i: any) => ({
          lineId: i.id,
          menuItem: dishMap[i.dish_id] ?? {
            id: i.dish_id ?? i.id, name: i.name, category: '',
            price: Number(i.price), description: '', available: true, emoji: i.emoji ?? '🍽️',
          },
          quantity: i.qty,
          modifier: i.modifier ?? undefined,
          notes: i.notes ?? undefined,
          course: i.course ?? 1,
        }));
        setOrderItems(restored);
        // Set snapshot SYNCHRONOUSLY with the items — diff will be accurate immediately
        if (alreadySent) {
          setSentItemsSnapshot(restored.map(r => ({ id: r.lineId, qty: r.quantity })));
        }
      } else {
        setOrderItems([]);
      }
    } else {
      setOrderItems([]);
    }
    setView('menu');
  };

  // ─── Open order in DB when first item is added to a free table ────────────

  const ensureOpenOrder = useCallback(async (table: Table): Promise<string> => {
    if (table.currentOrderId) return table.currentOrderId;

    const orderId = `ORD-${Date.now()}`;
    const now = new Date().toISOString();
    const waiterName = appUser?.fullName ?? 'Administrador';

    const { error: orderErr } = await supabase.from('orders').insert({ tenant_id: getTenantId(),
      id: orderId,
      mesa: table.name,
      mesa_num: table.number,
      mesero: waiterName,
      subtotal: 0,
      iva: 0,
      discount: 0,
      total: 0,
      status: 'abierta',
      kitchen_status: 'en_edicion',
      opened_at: now,
      branch: branchName,
    });
    if (orderErr) {
      toast.error('Error al abrir orden: ' + orderErr.message);
      throw orderErr;
    }

    const groupIds = table.mergeGroupId
      ? tables.filter((t) => t.mergeGroupId === table.mergeGroupId).map((t) => t.id)
      : [table.id];

    await supabase.from('restaurant_tables').update({
      status: 'ocupada',
      current_order_id: orderId,
      waiter: waiterName,
      opened_at: now,
      item_count: 0,
      partial_total: 0,
      updated_at: now,
    }).in('id', groupIds);

    // Update local state so subsequent calls find the orderId
    setSelectedTable((prev) => prev ? { ...prev, currentOrderId: orderId, status: 'ocupada', openedAt: now, waiter: waiterName } : prev);
    setTables((prev) => prev.map((t) =>
      groupIds.includes(t.id) ? { ...t, currentOrderId: orderId, status: 'ocupada', openedAt: now, waiter: waiterName } : t
    ));

    return orderId;
  }, [supabase, tables, branchName]);

  // ─── Add / update items ───────────────────────────────────────────────────

  // ─── Send order to kitchen ───────────────────────────────────────────────
  const handleSendToKitchen = async () => {
    if (!selectedTable?.currentOrderId) {
      toast.error('Agrega al menos un platillo antes de enviar a cocina');
      return;
    }
    setSendingToKitchen(true);

    // Build list of ONLY the newly added items since last send.
    // Each line is identified by its unique lineId so multiple variations
    // of the same dish (e.g. guacamole sin cebolla vs con chile) are tracked separately.
    // Only items not yet in the snapshot (by lineId) are new.
    // Snapshot is initialized when a table with an existing order is opened,
    // so this diff is always accurate — no race condition.
    const newItems = orderItems
      .flatMap(oi => {
        const prev = sentItemsSnapshot.find(s => s.id === oi.lineId);
        if (!prev) {
          return [{ name: oi.menuItem.name, qty: oi.quantity, notes: oi.notes, modifier: oi.modifier, emoji: oi.menuItem.emoji }];
        }
        const addedQty = oi.quantity - prev.qty;
        if (addedQty > 0) {
          return [{ name: oi.menuItem.name, qty: addedQty, notes: oi.notes, modifier: oi.modifier, emoji: oi.menuItem.emoji }];
        }
        return [];
      });

    // Cancel any pending debounced sync
    if (syncTimerRef.current) {
      clearTimeout(syncTimerRef.current);
      syncTimerRef.current = null;
    }

    // Flush ALL current items to DB. Use stable lineIds as order_item IDs
    // so the snapshot stays in sync after reload.
    if (selectedTable.currentOrderId && orderItems.length > 0) {
      const { error: delErr } = await supabase.from('order_items')
        .delete().eq('order_id', selectedTable.currentOrderId);
      if (!delErr) {
        // We don't need to re-read IDs because the snapshot was already
        // built from lineIds — and after this flush the DB rows have
        // auto-generated UUIDs that differ from lineIds.
        // Solution: keep current snapshot as-is (lineIds), and after
        // the comanda is sent, update snapshot to current orderItems lineIds.
        await supabase.from('order_items').insert(
          orderItems.map((item) => ({
            order_id: selectedTable.currentOrderId,
            dish_id: item.menuItem.id,
            name: item.menuItem.name,
            qty: item.quantity,
            price: item.menuItem.price,
            emoji: item.menuItem.emoji,
            modifier: item.modifier ?? null,
            tenant_id: getTenantId(),
            notes: item.notes ?? null,
          }))
        );
      }
    }

    const ok = await sendToKitchen(
      selectedTable.currentOrderId,
      newItems.length > 0 ? newItems : undefined,
      {
        mesa: selectedTable.name,
        mesaNum: selectedTable.number,
        mesero: appUser?.fullName ?? 'Mesero',
        tenantId: appUser?.tenantId ?? '',
        branch: appUser?.branchId ?? null,
      }
    );
    if (ok) {
      setKitchenSent(true);
      // Re-read DB items to sync lineIds with actual DB UUIDs.
      // This prevents the "duplicate on second send" bug where
      // lineIds in state differ from DB ids after flush.
      const { data: freshItems } = await supabase
        .from('order_items')
        .select('*')
        .eq('order_id', selectedTable.currentOrderId);

      if (freshItems && freshItems.length > 0) {
        // Re-hydrate orderItems with DB IDs as lineIds
        const dishIds = [...new Set(freshItems.map((i: any) => i.dish_id).filter(Boolean))];
        let dishMap: Record<string, MenuItem> = {};
        if (dishIds.length > 0) {
          const { data: dishes } = await supabase.from('dishes').select('*').eq('tenant_id', getTenantId()).in('id', dishIds);
          (dishes || []).forEach((d: any) => {
            dishMap[d.id] = { id: d.id, name: d.name, category: d.category,
              price: Number(d.price), description: d.description,
              available: d.available, emoji: d.emoji, popular: d.popular };
          });
        }
        const synced: OrderItem[] = freshItems.map((i: any) => ({
          lineId: i.id,  // DB UUID — stable across reloads
          menuItem: dishMap[i.dish_id] ?? {
            id: i.dish_id ?? i.id, name: i.name, category: '',
            price: Number(i.price), description: '', available: true, emoji: i.emoji ?? '🍽️',
          },
          quantity: i.qty,
          modifier: i.modifier ?? undefined,
          notes: i.notes ?? undefined,
          course: i.course ?? 1,
        }));
        setOrderItems(synced);
        setSentItemsSnapshot(synced.map(r => ({ id: r.lineId, qty: r.quantity })));
        // Refresh which items are non-cancellable (lista/entregada comandas)
        if (selectedTable.currentOrderId) {
          refreshDeliveredItems(selectedTable.currentOrderId, synced);
        }
      } else {
        setSentItemsSnapshot(orderItems.map(i => ({ id: i.lineId, qty: i.quantity })));
      }

      if (!kitchenSent) toast.success(`Orden enviada a cocina — ${mergeGroupLabel ?? selectedTable.name}`);
    }
    setSendingToKitchen(false);
  };

  const handleAddItem = useCallback((item: MenuItem) => {
    if (!item.available || !selectedTable) return;
    // Open modifier modal — confirm adds lines with customization
    setModifierPending(item);
  }, [selectedTable]);

  const handleModifierConfirm = useCallback(async (lines: ModifierLine[]) => {
    if (!modifierPending || !selectedTable) return;
    const item = modifierPending;
    setModifierPending(null);

    const newLines = lines.map(line => ({
      lineId: `${item.id}-${Date.now()}-${Math.random().toString(36).slice(2,6)}`,
      menuItem: item,
      quantity: line.qty,
      modifier: line.modifier || undefined,
      notes: line.note || undefined,
      excludedIngredientIds: line.excludedIds.length > 0 ? line.excludedIds : undefined,
    }));

    const newItems = [...orderItems, ...newLines];
    setOrderItems(newItems);

    const orderId = await ensureOpenOrder(selectedTable);
    const newSubtotal = newItems.reduce((s, i) => s + i.menuItem.price * i.quantity, 0);
    const discAmt = discount.type === 'pct'
      ? newSubtotal * (discount.value / 100)
      : Math.min(discount.value, newSubtotal);
    const newTotal = (newSubtotal - discAmt) * (1 + IVA_RATE);
    const groupIds = selectedTable.mergeGroupId
      ? tables.filter((t) => t.mergeGroupId === selectedTable.mergeGroupId).map((t) => t.id)
      : [selectedTable.id];

    // Always sync ALL items to the original order.
    // The original order = the billing record for the full table.
    // Comanda orders are separate DB orders with only their new items.
    // KDS shows original card (full context) + comanda card (new items only).
    syncOrderToTable(orderId, groupIds, newItems, newTotal);

  }, [modifierPending, selectedTable, orderItems, discount, tables, ensureOpenOrder, syncOrderToTable, kitchenSent, sentItemsSnapshot, supabase]);

  const handleUpdateQty = useCallback(async (lineId: string, delta: number) => {
    if (!selectedTable) return;
    const newItems = orderItems
      .map((o) => o.lineId === lineId ? { ...o, quantity: Math.max(0, o.quantity + delta) } : o)
      .filter((o) => o.quantity > 0);
    setOrderItems(newItems);

    if (selectedTable.currentOrderId) {
      const newSubtotal = newItems.reduce((s, i) => s + i.menuItem.price * i.quantity, 0);
      const discAmt = discount.type === 'pct'
        ? newSubtotal * (discount.value / 100)
        : Math.min(discount.value, newSubtotal);
      const newTotal = (newSubtotal - discAmt) * (1 + IVA_RATE);
      const groupIds = selectedTable.mergeGroupId
        ? tables.filter((t) => t.mergeGroupId === selectedTable.mergeGroupId).map((t) => t.id)
        : [selectedTable.id];
      syncOrderToTable(selectedTable.currentOrderId, groupIds, newItems, newTotal);
    }
  }, [selectedTable, orderItems, discount, tables, syncOrderToTable]);

  const handleRemoveItem = useCallback(async (lineId: string) => {
    if (!selectedTable) return;
    const item = orderItems.find(o => o.lineId === lineId);
    if (!item) return;

    // If item is in a lista/entregada comanda → cannot cancel
    if (deliveredLineIds.has(lineId)) {
      toast.error('Este platillo ya fue entregado — no se puede cancelar');
      return;
    }

    // If item was already sent to kitchen → show confirmation first
    const wasSent = sentItemsSnapshot.some(s => s.id === lineId);
    if (wasSent && kitchenSent) {
      setCancelItemPending({ lineId, dishId: item.menuItem.id, name: item.menuItem.name, emoji: item.menuItem.emoji ?? '🍽️', reason: '', notes: '' });
      return;
    }

    // Not sent yet → remove locally only
    const newItems = orderItems.filter((o) => o.lineId !== lineId);
    setOrderItems(newItems);

    if (selectedTable.currentOrderId) {
      const newSubtotal = newItems.reduce((s, i) => s + i.menuItem.price * i.quantity, 0);
      const discAmt = discount.type === 'pct'
        ? newSubtotal * (discount.value / 100)
        : Math.min(discount.value, newSubtotal);
      const newTotal = (newSubtotal - discAmt) * (1 + IVA_RATE);
      const groupIds = selectedTable.mergeGroupId
        ? tables.filter((t) => t.mergeGroupId === selectedTable.mergeGroupId).map((t) => t.id)
        : [selectedTable.id];
      syncOrderToTable(selectedTable.currentOrderId, groupIds, newItems, newTotal);
    }
  }, [selectedTable, orderItems, discount, tables, syncOrderToTable, sentItemsSnapshot, kitchenSent, deliveredLineIds, refreshDeliveredItems]);

  const handleConfirmCancelItem = useCallback(async () => {
    if (!cancelItemPending || !selectedTable?.currentOrderId) return;
    const { lineId, dishId, name } = cancelItemPending;
    setCancelItemPending(null);

    // Remove from local state and billing
    const newItems = orderItems.filter((o) => o.lineId !== lineId);
    setOrderItems(newItems);
    const newSubtotal = newItems.reduce((s, i) => s + i.menuItem.price * i.quantity, 0);
    const discAmt = discount.type === 'pct'
      ? newSubtotal * (discount.value / 100) : Math.min(discount.value, newSubtotal);
    const newTotal = (newSubtotal - discAmt) * (1 + IVA_RATE);
    const groupIds = selectedTable.mergeGroupId
      ? tables.filter((t) => t.mergeGroupId === selectedTable.mergeGroupId).map((t) => t.id)
      : [selectedTable.id];
    syncOrderToTable(selectedTable.currentOrderId, groupIds, newItems, newTotal);
    // Also update snapshot
    setSentItemsSnapshot(prev => prev.filter(s => s.id !== lineId));

    // Cancel from KDS comanda
    const cancelReason = cancelItemPending?.notes
      ? `${cancelItemPending?.reason || 'Cancelado'}: ${cancelItemPending.notes}`
      : (cancelItemPending?.reason || 'Cancelado desde POS');
    const result = await cancelItemFromKDS(selectedTable.currentOrderId, dishId, name, cancelReason);
    setCancelItemResult({ name, hasCost: result.hasCost });
  }, [cancelItemPending, selectedTable, orderItems, discount, tables,
      syncOrderToTable, cancelItemFromKDS, setSentItemsSnapshot]);

  // ─── Update note for a specific item ────────────────────────────────────────
  const handleUpdateNote = useCallback(async (itemId: string, note: string) => {
    if (!selectedTable) return;
    const newItems = orderItems.map((o) =>
      o.menuItem.id === itemId ? { ...o, notes: note } : o
    );
    setOrderItems(newItems);
    if (selectedTable.currentOrderId) {
      const newSubtotal = newItems.reduce((s, i) => s + i.menuItem.price * i.quantity, 0);
      const discAmt = discount.type === 'pct'
        ? newSubtotal * (discount.value / 100)
        : Math.min(discount.value, newSubtotal);
      const newTotal = (newSubtotal - discAmt) * (1 + IVA_RATE);
      const groupIds = selectedTable.mergeGroupId
        ? tables.filter((t) => t.mergeGroupId === selectedTable.mergeGroupId).map((t) => t.id)
        : [selectedTable.id];
      syncOrderToTable(selectedTable.currentOrderId, groupIds, newItems, newTotal);
    }
  }, [selectedTable, orderItems, discount, tables, syncOrderToTable]);

    // ─── Confirm merge ────────────────────────────────────────────────────────

  const handleConfirmMerge = async () => {
    if (mergeSelection.length < 2) {
      toast.error('Selecciona al menos 2 mesas para unir');
      return;
    }
    const selectedTables = tables.filter((t) => mergeSelection.includes(t.id));
    const existingGroups = Array.from(new Set(selectedTables.map((t) => t.mergeGroupId).filter(Boolean)));
    const groupId = existingGroups[0] ?? crypto.randomUUID();
    await supabase.from('restaurant_tables')
      .update({ merge_group_id: groupId, updated_at: new Date().toISOString() })
      .in('id', mergeSelection);
    setMergeMode(false);
    setMergeSelection([]);
    await fetchTables();
    toast.success(`Mesas unidas: ${selectedTables.map((t) => t.name).join(', ')} — comparten el mismo ticket`);
  };

  // ─── Unmerge ──────────────────────────────────────────────────────────────

  const handleUnmerge = async (table: Table) => {
    if (!table.mergeGroupId) return;
    const group = tables.filter((t) => t.mergeGroupId === table.mergeGroupId);
    await supabase.from('restaurant_tables')
      .update({ merge_group_id: null, updated_at: new Date().toISOString() })
      .in('id', group.map((t) => t.id));
    await fetchTables();
    toast.success('Mesas separadas correctamente');
    if (selectedTable?.mergeGroupId === table.mergeGroupId) {
      setSelectedTable(null); setOrderItems([]); setView('tables');
    }
  };

  // ─── Cancel / Free table ──────────────────────────────────────────────────

  const handleCancelTable = async () => {
    if (!selectedTable) return;
    setShowCancelConfirm(true);
  };

  const executeCancelTable = async () => {
    if (!selectedTable) return;
    setShowCancelConfirm(false);
    const groupIds = selectedTable.mergeGroupId
      ? tables.filter((t) => t.mergeGroupId === selectedTable.mergeGroupId).map((t) => t.id)
      : [selectedTable.id];

    const ok = await cancelOrderFlow(selectedTable.currentOrderId ?? null, groupIds);
    if (!ok) return;

    await fetchTables();
    setSelectedTable(null); setOrderItems([]); setView('tables');
    setKitchenSent(false);
    toast.success(`${selectedTable.name} liberada`);
  };

  // ─── Partial payment — cobrar subset of items, keep table open ──────────────

  const handlePartialCheckout = async (lineIds: string[]) => {
    if (!selectedTable?.currentOrderId) return;
    const selectedItems = orderItems.filter(i => lineIds.includes(i.lineId));
    if (!selectedItems.length) return;

    const partialSubtotal = selectedItems.reduce((s, i) => s + i.menuItem.price * i.quantity, 0);
    const ivaRate = 0.16;
    const partialIva = partialSubtotal * ivaRate;
    const partialTotal = partialSubtotal + partialIva;

    // Create a separate "partial" order record for accounting
    const partialId = `ORD-P-${Date.now()}`;
    const now = new Date().toISOString();
    const waiterName = appUser?.fullName ?? 'Administrador';

    const { error } = await supabase.from('orders').insert({
      id: partialId,
      tenant_id: getTenantId(),
      mesa: (selectedTable.name) + ' (parcial)',
      mesa_num: selectedTable.number,
      mesero: waiterName,
      subtotal: partialSubtotal,
      iva: partialIva,
      discount: 0,
      total: partialTotal,
      status: 'cerrada',
      pay_method: 'efectivo',
      opened_at: selectedTable.openedAt ?? now,
      closed_at: now,
      branch: branchName,
      is_comanda: false,
      order_type: selectedTable.number === 0 ? 'para_llevar' : 'mesa',
    });

    if (error) { toast.error('Error en cobro parcial: ' + error.message); return; }

    // Insert partial order items
    await supabase.from('order_items').insert(
      selectedItems.map(i => ({
        order_id: partialId,
        dish_id: i.menuItem.id,
        name: i.menuItem.name,
        qty: i.quantity,
        price: i.menuItem.price,
        emoji: i.menuItem.emoji,
        tenant_id: getTenantId(),
      }))
    );

    // Remove paid items from the active order
    const remainingItems = orderItems.filter(i => !lineIds.includes(i.lineId));
    setOrderItems(remainingItems);

    // Update remaining total on the original order AND table item_count
    const newSubtotal = remainingItems.reduce((s, i) => s + i.menuItem.price * i.quantity, 0);
    const newCount = remainingItems.reduce((s, i) => s + i.quantity, 0);
    await Promise.all([
      supabase.from('orders').update({
        subtotal: newSubtotal,
        iva: newSubtotal * ivaRate,
        total: newSubtotal * (1 + ivaRate),
        updated_at: now,
      }).eq('id', selectedTable.currentOrderId).eq('tenant_id', getTenantId()),
      supabase.from('restaurant_tables').update({
        item_count: newCount,
        partial_total: newSubtotal * (1 + ivaRate),
        updated_at: now,
      }).eq('id', selectedTable.id),
    ]);

    // Delete the paid items from order_items
    const lineIdsInDb = selectedItems.map(i => i.lineId);
    await supabase.from('order_items').delete()
      .in('id', lineIdsInDb)
      .eq('order_id', selectedTable.currentOrderId);

    toast.success(`Cobro parcial: $${partialTotal.toFixed(2)} — ${selectedItems.length} platillo${selectedItems.length > 1 ? 's' : ''}`);

    // If no items left, close the table fully
    if (remainingItems.length === 0) {
      await supabase.from('restaurant_tables').update({
        status: 'libre', current_order_id: null, waiter: null,
        item_count: 0, partial_total: 0, updated_at: now,
      }).in('id', [selectedTable.id]);
      await supabase.from('orders').update({ status: 'cerrada', closed_at: now })
        .eq('id', selectedTable.currentOrderId);
      setSelectedTable(null); setOrderItems([]); setView('tables');
      toast.success(`${selectedTable.name} liberada — cobro completo`);
    }
  };

  // ─── Payment ──────────────────────────────────────────────────────────────

  const handleSendKitchenNote = async (note: string) => {
    if (!selectedTable?.currentOrderId) return;
    await supabase.from('orders')
      .update({ kitchen_notes: note, updated_at: new Date().toISOString() })
      .eq('id', selectedTable.currentOrderId);
    toast.success('Nota enviada a cocina');
  };

  const handlePaymentComplete = async (method: 'efectivo' | 'tarjeta', amountPaid: number, loyaltyCustomerId?: string | null) => {
    if (!selectedTable) return;

    const groupIds = selectedTable.mergeGroupId
      ? tables.filter((t) => t.mergeGroupId === selectedTable.mergeGroupId).map((t) => t.id)
      : [selectedTable.id];

    // Use orderId from table state, or create one if missing (edge case)
    const orderId = selectedTable.currentOrderId ?? `ORD-${Date.now()}`;

    const flowItems = orderItems.map((i) => ({
      lineId: i.lineId,
      dishId: i.menuItem.id, name: i.menuItem.name,
      price: i.menuItem.price, qty: i.quantity,
      emoji: i.menuItem.emoji, notes: i.notes,
      excludedIngredientIds: i.excludedIngredientIds,
      modifier: i.modifier,
    }));

    const ok = await closeOrder({
      orderId,
      tableIds: groupIds,
      items: flowItems,
      subtotal, discountAmount, iva, total,
      payMethod: method,
      waiterName: selectedTable.waiter || appUser?.fullName || 'Administrador',
      branchName,
      openedAt: selectedTable.openedAt ?? null,
      loyaltyCustomerId: loyaltyCustomerId ?? null,
    });

    if (!ok) return;

    await fetchTables();
    setShowPaymentModal(false);
    setOrderItems([]); setSelectedTable(null); setView('tables');
    setKitchenSent(false);
    setSentItemsSnapshot([]);
    toast.success(`Pago de $${total.toFixed(2)} procesado con ${method === 'efectivo' ? 'Efectivo' : 'Tarjeta'}. ¡Orden cerrada!`);
  };

  const handleMarkTableOccupied = async (table: Table) => {
    const now = new Date().toISOString();
    await supabase.from('restaurant_tables').update({
      status: 'ocupada', opened_at: now, updated_at: now,
    }).eq('id', table.id);
    await fetchTables();
    await handleTableSelect({ ...table, status: 'ocupada', openedAt: now });
  };

  const mergeGroupLabel = selectedTable?.mergeGroupId
    ? tables.filter((t) => t.mergeGroupId === selectedTable.mergeGroupId).map((t) => t.name).join(' + ')
    : null;

  // ─── Move / Delete table in layout ───────────────────────────────────────

  const handleMoveTable = useCallback(async (tableNumber: number, newX: number, newY: number) => {
    const updated = layoutTables.map((lt) => lt.number === tableNumber ? { ...lt, x: newX, y: newY } : lt);
    setLayoutTables(updated);
    if (layoutId) {
      await supabase.from('restaurant_layout').update({ tables_layout: updated, updated_at: new Date().toISOString() }).eq('id', layoutId);
    }
  }, [layoutTables, layoutId, supabase]);

  const handleDeleteTable = useCallback(async (tableNumber: number) => {
    const updated = layoutTables.filter((lt) => lt.number !== tableNumber);
    setLayoutTables(updated);
    const tableToDelete = tables.find((t) => t.number === tableNumber);
    if (tableToDelete) {
      await supabase.from('restaurant_tables').delete().eq('id', tableToDelete.id);
      setTables((prev) => prev.filter((t) => t.number !== tableNumber));
    }
    if (layoutId) {
      await supabase.from('restaurant_layout').update({ tables_layout: updated, updated_at: new Date().toISOString() }).eq('id', layoutId);
    }
    await supabase.from('system_config').upsert(
      { config_key: 'table_count', config_value: String(updated.length) }, { onConflict: 'config_key' }
    );
  }, [layoutTables, layoutId, tables, supabase]);

  return (
    <>
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <div className="flex-shrink-0">
        <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />
      </div>
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <Topbar title="Punto de Venta" subtitle="Gestión de mesas y órdenes" />
        <div className="flex-1 flex overflow-hidden pb-14 md:pb-0">
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Tab bar */}
            <div className="flex items-center gap-1 px-4 pt-3 pb-0 bg-white border-b flex-shrink-0" style={{ borderColor: '#e5e7eb' }}>
              <button onClick={() => setView('tables')} className="px-4 py-2.5 text-sm font-semibold border-b-2 transition-all duration-150" style={{ borderColor: view === 'tables' ? '#f59e0b' : 'transparent', color: view === 'tables' ? '#d97706' : '#6b7280' }}>
                Mapa de Mesas
              </button>
              {establishmentType === 'cafeteria' ? (
                <button onClick={() => setShowTakeoutModal(true)} className="flex items-center gap-2 ml-2 px-4 py-2 rounded-lg text-sm font-bold transition-all" style={{ backgroundColor: '#1e4080', color: '#93c5fd', border: '1px solid rgba(96,165,250,0.45)', fontSize: 14 }}>
                  🥡 Nuevo pedido para llevar
                </button>
              ) : (
                <button onClick={() => setShowTakeoutModal(true)} className="flex items-center gap-1.5 ml-2 px-3 py-1.5 rounded-lg text-sm font-semibold transition-all" style={{ backgroundColor: '#1e3a5f', color: '#60a5fa', border: '1px solid rgba(96,165,250,0.3)' }}>
                  🥡 Para Llevar
                </button>
              )}
              <button onClick={() => setView('menu')} className="px-4 py-2.5 text-sm font-semibold border-b-2 transition-all duration-150" style={{ borderColor: view === 'menu' ? '#f59e0b' : 'transparent', color: view === 'menu' ? '#d97706' : '#6b7280' }}>
                Menú
                {selectedTable && (
                  <span className="ml-2 text-xs px-1.5 py-0.5 rounded-full font-bold" style={{ backgroundColor: '#fef3c7', color: '#92400e' }}>
                    {mergeGroupLabel ?? selectedTable.name}
                  </span>
                )}
              </button>

              {selectedTable && (
                <div className="ml-auto flex items-center gap-2 pb-1">
                  {selectedTable.mergeGroupId && (
                    <button onClick={() => handleUnmerge(selectedTable)} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-semibold transition-colors" style={{ backgroundColor: 'rgba(239,68,68,0.08)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}>
                      <X size={12} />Separar mesas
                    </button>
                  )}
                  <button onClick={() => setShowTransferModal(true)} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-semibold transition-colors" style={{ backgroundColor: 'rgba(96,165,250,0.1)', color: '#60a5fa', border: '1px solid rgba(96,165,250,0.25)' }} title="Trasladar orden a otra mesa">
                    ↔ Cambiar mesa
                  </button>
                  <button onClick={handleCancelTable} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-semibold transition-colors" style={{ backgroundColor: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.25)' }} title="Cancelar y liberar mesa sin cobrar">
                    <X size={12} />Cancelar mesa
                  </button>
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs" style={{ backgroundColor: '#fffbeb', border: '1px solid #fde68a' }}>
                    <div className="w-2 h-2 rounded-full bg-amber-400" />
                    <span className="font-semibold text-amber-800">{mergeGroupLabel ?? selectedTable.name} — {itemCount} items</span>
                  </div>
                  <button onClick={() => { setSelectedTable(null); setOrderItems([]); setView('tables'); }} className="text-xs text-gray-400 hover:text-gray-600 transition-colors px-2 py-1">
                    Cambiar mesa
                  </button>
                </div>
              )}

              {!selectedTable && (
                <div className="ml-auto flex items-center gap-2 pb-1">
                  {mergeMode ? (
                    <>
                      <span className="text-xs text-gray-500">{mergeSelection.length} mesa(s) seleccionada(s)</span>
                      <button onClick={handleConfirmMerge} disabled={mergeSelection.length < 2} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-semibold transition-colors disabled:opacity-40" style={{ backgroundColor: '#1B3A6B', color: 'white' }}>
                        <Merge size={12} />Confirmar unión
                      </button>
                      <button onClick={() => { setMergeMode(false); setMergeSelection([]); }} className="text-xs px-3 py-1.5 rounded-lg font-semibold transition-colors" style={{ backgroundColor: '#f3f4f6', color: '#6b7280' }}>
                        Cancelar
                      </button>
                    </>
                  ) : (
                    <button onClick={() => setMergeMode(true)} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-semibold transition-colors" style={{ backgroundColor: '#f3f4f6', color: '#374151', border: '1px solid #e5e7eb' }}>
                      <Merge size={12} />Unir mesas
                    </button>
                  )}
                </div>
              )}
            </div>

            {mergeMode && (
              <div className="flex items-center gap-3 px-4 py-2.5 text-sm flex-shrink-0" style={{ backgroundColor: '#fffbeb', borderBottom: '1px solid #fde68a' }}>
                <Merge size={15} style={{ color: '#d97706' }} />
                <span className="font-semibold text-amber-800">Modo unión de mesas:</span>
                <span className="text-amber-700">Selecciona 2 o más mesas para unirlas en un solo ticket</span>
              </div>
            )}

            <div className="flex-1 overflow-y-auto scrollbar-thin">
              {view === 'tables' ? (
                loadingTables ? <TableSkeleton /> : (
                  <TableMap
                    tables={tables}
                    reservedTables={reservedTables}
                    onTableSelect={handleTableSelect}
                    onMarkOccupied={handleMarkTableOccupied}
                    selectedTableId={selectedTable?.id}
                    mergeMode={mergeMode}
                    mergeSelection={mergeSelection}
                    onUnmerge={handleUnmerge}
                    currentWaiter={appUser?.fullName ?? 'Administrador'}
                    layoutTables={layoutTables.length > 0 ? layoutTables : undefined}
                    onMoveTable={handleMoveTable}
                    onDeleteTable={handleDeleteTable}
                  />
                )
              ) : (
                loadingMenu ? <MenuSkeleton /> : (
                  <MenuGrid
                    items={menuItems}
                    onAddItem={handleAddItem}
                    orderItems={orderItems}
                    selectedTable={selectedTable}
                  />
                )
              )}
            </div>
          </div>

          <div className={`${selectedTable || view === 'order_mobile' ? 'flex' : 'hidden'} md:flex flex-col`}>
          <OrderPanel
            selectedTable={selectedTable}
            mergeGroupLabel={mergeGroupLabel}
            orderItems={orderItems}
            subtotal={subtotal}
            discountAmount={discountAmount}
            iva={iva}
            total={total}
            discount={discount}
            onUpdateQty={handleUpdateQty}
            onRemoveItem={handleRemoveItem}
            deliveredLineIds={deliveredLineIds}
            onDiscountChange={setDiscount}
            onCheckout={() => {
              if (!kitchenSent && orderItems.length > 0) {
                setShowNoKitchenConfirm(true);
                return;
              }
              setShowPaymentModal(true);
            }}
            onSendToKitchen={handleSendToKitchen}
            onPartialCheckout={handlePartialCheckout}
            onShowMenu={() => setView('menu')}
            onUpdateNote={handleUpdateNote}
            kitchenSent={kitchenSent}
            sendingToKitchen={sendingToKitchen}
            onSendKitchenNote={handleSendKitchenNote}
          />
          </div>
        </div>
      </div>

      {/* ── Mobile bottom tab bar ── */}
      <div className="fixed bottom-0 left-0 right-0 z-40 flex md:hidden border-t bg-white shadow-lg"
        style={{ borderColor: '#e5e7eb' }}>
        {[
          { key: 'tables', label: 'Mesas', emoji: '🪑' },
          { key: 'menu',   label: 'Menú',  emoji: '📋' },
          { key: 'order_mobile', label: 'Orden', emoji: '🛒',
            badge: orderItems.reduce((s,i) => s + i.quantity, 0) },
        ].map(tab => (
          <button key={tab.key}
            onClick={() => setView(tab.key as any)}
            className="flex-1 flex flex-col items-center justify-center py-2 text-xs font-semibold relative"
            style={{ color: view === tab.key ? '#d97706' : '#6b7280' }}
            aria-label={tab.label}
            aria-current={view === tab.key ? 'page' : undefined}>
            <span className="text-lg leading-none">{tab.emoji}</span>
            <span className="mt-0.5">{tab.label}</span>
            {tab.badge && tab.badge > 0 && (
              <span className="absolute top-1 right-1/4 w-4 h-4 rounded-full text-xs font-bold flex items-center justify-center text-white"
                style={{ backgroundColor: '#fde68a', fontSize: '10px' }}>
                {tab.badge > 9 ? '9+' : tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Spacer so content doesn't hide behind mobile tab bar */}
      <div className="h-14 md:hidden flex-shrink-0" />

      {/* ── Traslado entre mesas Modal ── */}
      {showTransferModal && selectedTable && (
        <div style={{ position:'fixed', inset:0, zIndex:9999, background:'rgba(0,0,0,0.75)', backdropFilter:'blur(8px)', display:'flex', alignItems:'center', justifyContent:'center', padding:'16px' }}>
          <div style={{ background:'#0f1923', border:'1px solid rgba(96,165,250,0.25)', borderRadius:'20px', padding:'28px', maxWidth:'480px', width:'100%' }}>
            <div style={{ marginBottom:'20px' }}>
              <h3 style={{ color:'#f1f5f9', fontSize:'18px', fontWeight:700, marginBottom:'6px' }}>↔ Cambiar mesa</h3>
              <p style={{ color:'rgba(255,255,255,0.4)', fontSize:'13px' }}>
                Mover orden de <strong style={{ color:'#60a5fa' }}>{selectedTable.name}</strong> a otra mesa libre
              </p>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(80px, 1fr))', gap:8, maxHeight:'300px', overflowY:'auto', marginBottom:'16px' }}>
              {tables.filter(t => t.status === 'libre' && t.id !== selectedTable.id && t.number > 0).map(t => (
                <button key={t.id} onClick={() => handleTransferTable(t)}
                  style={{ padding:'12px 8px', borderRadius:10, background:'rgba(34,197,94,0.1)', border:'1px solid rgba(34,197,94,0.3)', color:'#4ade80', fontSize:13, fontWeight:700, cursor:'pointer', textAlign:'center' }}>
                  {t.name}
                </button>
              ))}
              {tables.filter(t => t.status === 'libre' && t.id !== selectedTable.id && t.number > 0).length === 0 && (
                <p style={{ color:'rgba(255,255,255,0.3)', fontSize:13, gridColumn:'1/-1', textAlign:'center', padding:'20px 0' }}>
                  Sin mesas libres disponibles
                </p>
              )}
            </div>
            <button onClick={() => setShowTransferModal(false)}
              style={{ width:'100%', padding:'11px', borderRadius:10, background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', color:'rgba(255,255,255,0.5)', fontSize:14, fontWeight:600, cursor:'pointer' }}>
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* ── Para Llevar Modal ── */}
      {showTakeoutModal && (
        <div style={{ position:'fixed', inset:0, zIndex:9999, background:'rgba(0,0,0,0.75)', backdropFilter:'blur(8px)', display:'flex', alignItems:'center', justifyContent:'center', padding:'16px' }}>
          <div style={{ background:'#0f1923', border:'1px solid rgba(96,165,250,0.25)', borderRadius:'20px', padding:'28px', maxWidth:'420px', width:'100%' }}>
            <div style={{ textAlign:'center', marginBottom:'20px' }}>
              <div style={{ fontSize:'40px', marginBottom:'10px' }}>🥡</div>
              <h3 style={{ color:'#f1f5f9', fontSize:'19px', fontWeight:700, marginBottom:'6px' }}>Nueva orden para llevar</h3>
              <p style={{ color:'rgba(255,255,255,0.45)', fontSize:'13px', margin:0 }}>Ingresa el nombre del cliente (opcional)</p>
            </div>
            <input
              autoFocus
              type="text"
              value={takeoutNameInput}
              onChange={e => setTakeoutNameInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleCreateTakeout(takeoutNameInput); if (e.key === 'Escape') setShowTakeoutModal(false); }}
              placeholder="Nombre del cliente..."
              style={{ width:'100%', background:'rgba(255,255,255,0.07)', border:'1px solid rgba(96,165,250,0.3)', borderRadius:'10px', padding:'12px 16px', color:'#f1f5f9', fontSize:'15px', outline:'none', marginBottom:'16px', boxSizing:'border-box' }}
            />
            <div style={{ display:'flex', gap:'10px' }}>
              <button
                onClick={() => { setShowTakeoutModal(false); setTakeoutNameInput(''); }}
                style={{ flex:1, padding:'11px', borderRadius:'10px', background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', color:'rgba(255,255,255,0.5)', fontSize:'14px', fontWeight:600, cursor:'pointer' }}>
                Cancelar
              </button>
              <button
                onClick={() => handleCreateTakeout(takeoutNameInput)}
                style={{ flex:2, padding:'11px', borderRadius:'10px', background:'#1e3a5f', border:'1px solid rgba(96,165,250,0.4)', color:'#60a5fa', fontSize:'14px', fontWeight:700, cursor:'pointer' }}>
                🥡 Crear orden para llevar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel item confirmation */}
      {cancelItemPending && (
        <div style={{ position:'fixed', inset:0, zIndex:9999, background:'rgba(0,0,0,0.7)', backdropFilter:'blur(6px)', display:'flex', alignItems:'center', justifyContent:'center', padding:'16px' }}>
          <div style={{ background:'#1a1a2e', border:'1px solid rgba(239,68,68,0.35)', borderRadius:'20px', padding:'24px', maxWidth:'380px', width:'100%' }}>
            <div style={{ textAlign:'center', marginBottom:'16px' }}>
              <div style={{ fontSize:'36px', marginBottom:'8px' }}>🗑️</div>
              <h3 style={{ color:'#f1f5f9', fontSize:'17px', fontWeight:700, marginBottom:'6px' }}>¿Cancelar platillo?</h3>
              <p style={{ color:'rgba(255,255,255,0.6)', fontSize:'14px' }}>{cancelItemPending.emoji} {cancelItemPending.name}</p>
              <p style={{ color:'#f87171', fontSize:'12px', marginTop:'6px', lineHeight:1.5 }}>
                Si está en preparación, se registrará como merma.
              </p>
            </div>
            {/* Reason selector */}
            <div style={{ marginBottom:'16px' }}>
              <p style={{ color:'rgba(255,255,255,0.5)', fontSize:'11px', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:'8px' }}>
                Motivo de cancelación
              </p>
              <div style={{ display:'flex', flexDirection:'column', gap:'6px' }}>
                {[
                  'Solicitud del cliente',
                  'Cliente encontró problema con el platillo',
                  'Error al registrar',
                  'Platillo no disponible',
                  'Demora excesiva en preparación',
                  'Otro motivo',
                ].map(r => (
                  <button key={r}
                    onClick={() => setCancelItemPending(prev => prev ? {...prev, reason: r} : null)}
                    style={{
                      padding:'8px 12px', borderRadius:'9px', textAlign:'left', border:'none', cursor:'pointer', fontSize:'13px',
                      background: cancelItemPending.reason === r ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.05)',
                      color: cancelItemPending.reason === r ? '#f87171' : 'rgba(255,255,255,0.6)',
                      outline: cancelItemPending.reason === r ? '1.5px solid rgba(239,68,68,0.4)' : 'none',
                    }}>
                    {cancelItemPending.reason === r ? '● ' : '○ '}{r}
                  </button>
                ))}
              </div>
            </div>
            {/* Optional notes */}
            {cancelItemPending.reason && (
              <div style={{ marginBottom:'12px' }}>
                <p style={{ color:'rgba(255,255,255,0.5)', fontSize:'11px', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:'6px' }}>
                  Notas adicionales (opcional)
                </p>
                <textarea
                  value={cancelItemPending.notes}
                  onChange={e => setCancelItemPending(prev => prev ? {...prev, notes: e.target.value} : null)}
                  placeholder={`Ej: ${cancelItemPending.reason === 'Cliente encontró problema con el platillo' ? 'Había un cabello en la sopa' : cancelItemPending.reason === 'Demora excesiva en preparación' ? 'Cliente esperó más de 30 minutos' : 'Detalle adicional...'}`}
                  rows={2}
                  style={{ width:'100%', background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.15)', borderRadius:'9px', padding:'8px 12px', color:'#f1f5f9', fontSize:'13px', resize:'none', outline:'none', fontFamily:'inherit' }}
                />
              </div>
            )}
            <div style={{ display:'flex', gap:'10px' }}>
              <button onClick={() => setCancelItemPending(null)}
                style={{ flex:1, padding:'11px', borderRadius:'11px', border:'1px solid rgba(255,255,255,0.15)', background:'transparent', color:'rgba(255,255,255,0.6)', fontSize:'14px', cursor:'pointer' }}>
                Mantener
              </button>
              <button
                onClick={handleConfirmCancelItem}
                disabled={!cancelItemPending.reason}
                style={{ flex:1, padding:'11px', borderRadius:'11px', border:'none', background: cancelItemPending.reason ? '#dc2626' : 'rgba(239,68,68,0.3)', color:'white', fontSize:'14px', fontWeight:600, cursor: cancelItemPending.reason ? 'pointer' : 'not-allowed' }}>
                Sí, cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel item result */}
      {cancelItemResult && (
        <div style={{ position:'fixed', inset:0, zIndex:9999, background:'rgba(0,0,0,0.6)', backdropFilter:'blur(4px)', display:'flex', alignItems:'center', justifyContent:'center', padding:'16px' }}>
          <div style={{ background: cancelItemResult.hasCost ? '#1a0f0f' : '#0f1a10', border:`1px solid ${cancelItemResult.hasCost ? 'rgba(239,68,68,0.4)' : 'rgba(34,197,94,0.4)'}`, borderRadius:'20px', padding:'28px 24px', maxWidth:'340px', width:'100%', textAlign:'center' }}>
            <div style={{ fontSize:'40px', marginBottom:'12px' }}>{cancelItemResult.hasCost ? '⚠️' : '✅'}</div>
            <h3 style={{ color:'#f1f5f9', fontSize:'16px', fontWeight:700, marginBottom:'8px' }}>
              {cancelItemResult.hasCost ? 'Merma registrada' : 'Platillo cancelado'}
            </h3>
            <p style={{ color:'rgba(255,255,255,0.6)', fontSize:'14px', marginBottom:'20px' }}>
              {cancelItemResult.name} fue retirado del kanban de cocina.
              {cancelItemResult.hasCost && ' Los ingredientes ya utilizados se registraron como merma.'}
            </p>
            <button
              onClick={() => setCancelItemResult(null)}
              style={{ width:'100%', padding:'12px', borderRadius:'11px', border:'none', background: cancelItemResult.hasCost ? '#dc2626' : '#16a34a', color:'white', fontSize:'14px', fontWeight:600, cursor:'pointer' }}>
              Entendido
            </button>
          </div>
        </div>
      )}

      {modifierPending && (
        <ModifierModal
          item={modifierPending}
          onConfirm={handleModifierConfirm}
          onCancel={() => setModifierPending(null)}
        />
      )}

      {showPaymentModal && (
        <PaymentModal
          total={total}
          subtotal={subtotal}
          iva={iva}
          discount={discountAmount}
          items={orderItems.map(oi => ({
            id: oi.lineId,              // unique per line — enables per-item split for same dish
            name: oi.menuItem.name,
            emoji: oi.menuItem.emoji,
            price: oi.menuItem.price,
            quantity: 1,               // each line = 1 unit for assignment purposes
            notes: oi.modifier ? `${oi.modifier}${oi.notes ? ' · ' + oi.notes : ''}` : oi.notes,
          }))}
          orderNumber={selectedTable?.currentOrderId ?? undefined}
          mesa={selectedTable?.name}
          mesero={selectedTable?.waiter || appUser?.fullName || 'Administrador'}
          orderType={selectedTable?.number === 0 ? 'para_llevar' : 'mesa'}
          customerName={selectedTable?.number === 0 ? selectedTable?.name : undefined}
          restaurantName={restaurantName || branchName}
          branchName={branchName}
          printerConfig={printerConfigData}
          onClose={() => setShowPaymentModal(false)}
          onComplete={handlePaymentComplete}
        />
      )}
    </div>

      {/* ── Confirm cancel order ── */}
      {showCancelConfirm && selectedTable && (
        <div role="dialog" aria-modal="true" aria-labelledby="pos-cancel-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.55)' }}>
          <div className="w-full max-w-sm bg-white rounded-2xl p-6 shadow-2xl">
            <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 bg-red-50">
              <span className="text-2xl">🗑️</span>
            </div>
            <h3 id="pos-cancel-title" className="text-base font-bold text-center text-gray-900 mb-2">¿Cancelar mesa?</h3>
            {kitchenSent && (
              <div className="mb-3 p-3 rounded-xl text-sm" style={{ background: '#fef2f2', border: '1px solid #fecaca' }}>
                <p className="font-semibold text-red-700">Comandas en cocina activas</p>
                <p className="text-xs text-red-500 mt-1">
                  Las que estén <strong>En Preparación</strong> o <strong>Listas</strong> se registrarán como merma.
                  Las que estén <strong>Pendientes</strong> se cancelarán sin costo.
                </p>
              </div>
            )}
            <p className="text-sm text-center text-gray-500 mb-5">
              Se liberará <strong className="text-gray-800">{selectedTable.name}</strong>.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowCancelConfirm(false)} aria-label="Mantener la orden"
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-gray-100 text-gray-700">
                Mantener orden
              </button>
              <button onClick={executeCancelTable} aria-label="Confirmar cancelar y liberar mesa"
                className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-red-500 text-white">
                Sí, cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Confirm cobro sin cocina ── */}
      {showNoKitchenConfirm && (
        <div role="dialog" aria-modal="true" aria-labelledby="pos-nokitchen-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.55)' }}>
          <div className="w-full max-w-sm bg-white rounded-2xl p-6 shadow-2xl">
            <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 bg-amber-50">
              <span className="text-2xl">⚠️</span>
            </div>
            <h3 id="pos-nokitchen-title" className="text-base font-bold text-center text-gray-900 mb-2">Orden no enviada a cocina</h3>
            <p className="text-sm text-center text-gray-500 mb-5">
              Esta orden no fue enviada a cocina todavía. ¿Deseas cobrar de todas formas?
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowNoKitchenConfirm(false)} aria-label="Cancelar cobro"
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-gray-100 text-gray-700">
                Cancelar
              </button>
              <button onClick={() => { setShowNoKitchenConfirm(false); setShowPaymentModal(true); }}
                aria-label="Cobrar sin enviar a cocina"
                className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white"
                style={{ backgroundColor: '#f59e0b' }}>
                Sí, cobrar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}