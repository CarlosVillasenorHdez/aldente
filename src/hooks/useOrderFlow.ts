'use client';

// useOrderFlow — shared order lifecycle logic for POS and Mesero Móvil.
//
// Encapsulates:
//   - Opening an order in DB when the first item is added (ensureOpenOrder)
//   - Syncing order_items + partial_total to DB with debounce (syncItems)
//   - Closing/paying an order (closeOrder)
//   - Cancelling an order (cancelOrder)
//   - Loading existing order items when a table is re-selected (loadOrderItems)
//
// Both POSClient and MeseroMobileView use this hook so the DB logic stays
// in one place. UI concerns (which view to show, modals, etc.) stay in the
// component.

import { useRef, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { getCurrentTenantId as getTenantId } from '@/lib/tenantStore';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { DbOrderItem, DbDish } from '@/lib/supabase/types';

// ─── Shared types ─────────────────────────────────────────────────────────────

export interface ExtraIngredient {
  ingredientId: string;
  name: string;
  quantity: number;   // extra qty added (on top of base recipe)
  unit: string;
}

export interface OrderFlowItem {
  lineId: string;            // unique per line — key for all operations
  dishId: string;
  name: string;
  price: number;
  qty: number;
  emoji: string;
  notes?: string;            // legacy general note
  modifier?: string;         // per-line modifier shown prominently to kitchen
  course?: number;           // course number for ordering (1 = first course, etc.)
  excludedIngredientIds?: string[]; // ingredient ids removed — skip deduction
  extras?: ExtraIngredient[];       // extra ingredients added — deduct additionally
  course?: number;                  // kept for DB compatibility
  selectedOptions?: {               // modifier options chosen by customer
    groupId: string; optionId: string; name: string;
    price_delta: number; ingredient_id: string | null; qty_delta: number;
  }[];
}

export interface OrderFlowTable {
  id: string;
  number: number;
  name: string;
  currentOrderId?: string;
  mergeGroupIds?: string[];  // all table ids in merge group (including self)
}

export interface OpenOrderResult {
  orderId: string;
  isNew: boolean;
}

export interface CloseOrderParams {
  orderId: string;
  tableIds: string[];
  items: OrderFlowItem[];
  subtotal: number;
  discountAmount: number;
  iva: number;
  total: number;
  payMethod: 'efectivo' | 'tarjeta';
  waiterName: string;
  branchName: string;
  openedAt: string | null;
  loyaltyCustomerId?: string | null;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useOrderFlow() {
  const supabase = createClient();
  const { tenantId } = useAuth();
  const DEFAULT_TENANT = getTenantId() || tenantId || '00000000-0000-0000-0000-000000000001';
  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Load existing order items when reopening a table ─────────────────────

  const loadOrderItems = useCallback(async (orderId: string): Promise<OrderFlowItem[]> => {
    const { data: rows, error } = await supabase
      .from('order_items')
      .select('*')
      .eq('order_id', orderId);

    if (error) {
      toast.error('Error al cargar orden existente: ' + error.message);
      return [];
    }
    if (!rows || rows.length === 0) return [];

    // Hydrate with dish data where available
    const dishIds = [...new Set((rows as DbOrderItem[]).map(i => i.dish_id).filter(Boolean))] as string[];
    let dishMap: Record<string, DbDish> = {};

    if (dishIds.length > 0) {
      const { data: dishes } = await supabase.from('dishes').select('*').in('id', dishIds);
      (dishes || []).forEach((d: DbDish) => { dishMap[d.id] = d; });
    }

    return (rows as DbOrderItem[]).map(i => {
      const dish = i.dish_id ? dishMap[i.dish_id] : null;
      return {
        lineId: i.id,
        dishId: i.dish_id ?? i.id,
        name: dish?.name ?? i.name,
        price: dish ? Number(dish.price) : Number(i.price),
        qty: i.qty,
        emoji: dish?.emoji ?? i.emoji ?? '🍽️',
        notes: i.notes ?? '',
      };
    });
  }, [supabase]);

  // ── Open order in DB (idempotent — returns existing orderId if already open) ─

  const ensureOpenOrder = useCallback(async (
    table: OrderFlowTable,
    waiterName: string,
    branchName: string,
    options?: { orderType?: 'mesa' | 'para_llevar'; branchId?: string | null; customerName?: string | null },
  ): Promise<string> => {
    if (table.currentOrderId) return table.currentOrderId;

    const orderId = `ORD-${Date.now()}`;
    const now = new Date().toISOString();
    const tableIds = table.mergeGroupIds ?? [table.id];

    const { error: orderErr } = await supabase.from('orders').insert({
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
      branch: branchName,
      tenant_id: DEFAULT_TENANT,
      order_type: options?.orderType ?? (table.number === 0 ? 'para_llevar' : 'mesa'),
      customer_name: options?.customerName ?? null,
      branch_id: options?.branchId ?? null,
    });

    if (orderErr) {
      toast.error('Error al abrir orden: ' + orderErr.message);
      throw orderErr;
    }

    const { error: tableErr } = await supabase.from('restaurant_tables').update({
      status: 'ocupada',
      current_order_id: orderId,
      waiter: waiterName,
      opened_at: now,
      item_count: 0,
      partial_total: 0,
      updated_at: now,
    }).in('id', tableIds);

    if (tableErr) {
      console.error('[useOrderFlow] Failed to update table status:', tableErr.message);
    }

    return orderId;
  }, [supabase]);

  // ── Sync items to DB with debounce (prevents race conditions on rapid clicks) ─

  const syncItems = useCallback((
    orderId: string,
    tableIds: string[],
    items: OrderFlowItem[],
    totalAmount: number,
    debounceMs = 400,
  ) => {
    if (syncTimerRef.current) clearTimeout(syncTimerRef.current);

    syncTimerRef.current = setTimeout(async () => {
      const count = items.reduce((s, i) => s + i.qty, 0);

      const { error: delErr } = await supabase.from('order_items').delete().eq('order_id', orderId);
      if (delErr) { console.error('[useOrderFlow] sync delete error:', delErr.message); return; }

      if (items.length > 0) {
        const { error: insErr } = await supabase.from('order_items').insert(
          items.map(item => ({
            order_id: orderId,
            dish_id: item.dishId,
            name: item.name,
            qty: item.qty,
            price: item.price,
            emoji: item.emoji,
            modifier: item.modifier || null,
            notes: item.notes || null,
            course: item.course ?? 1,
            tenant_id: DEFAULT_TENANT,
          }))
        );
        if (insErr) { console.error('[useOrderFlow] sync insert error:', insErr.message); return; }
      }

      await supabase.from('restaurant_tables').update({
        item_count: count,
        partial_total: totalAmount,
        updated_at: new Date().toISOString(),
      }).in('id', tableIds);
    }, debounceMs);
  }, [supabase]);

  // ── Close (pay) order ─────────────────────────────────────────────────────

  const closeOrder = useCallback(async (params: CloseOrderParams): Promise<boolean> => {
    const { orderId, tableIds, items, subtotal, discountAmount, iva, total,
            payMethod, openedAt, branchName, waiterName, loyaltyCustomerId } = params;
    const now = new Date().toISOString();

    try {
      // Update order to closed
      const { error: orderErr } = await supabase.from('orders').update({
        subtotal, iva, discount: discountAmount, total,
        status: 'cerrada', kitchen_status: 'entregada',
        pay_method: payMethod,
        opened_at: openedAt ?? now,
        closed_at: now,
        updated_at: now,
        branch: branchName,
        mesero: waiterName,
        ...(loyaltyCustomerId ? { loyalty_customer_id: loyaltyCustomerId } : {}),
      }).eq('id', orderId);

      if (orderErr) throw orderErr;

      // Sync final items
      await supabase.from('order_items').delete().eq('order_id', orderId);
      if (items.length > 0) {
        await supabase.from('order_items').insert(
          items.map(item => ({
            order_id: orderId,
            dish_id: item.dishId,
            name: item.name,
            qty: item.qty,
            price: item.price,
            emoji: item.emoji,
            modifier: item.modifier || null,
            notes: item.notes || null,
            course: item.course ?? 1,
            tenant_id: DEFAULT_TENANT,
          }))
        );
      }

      // ── Save order_item_modifiers snapshot ──────────────────────────────
      // Stores which options the customer chose — immutable for reporting
      const itemsWithMods = items.filter(i => i.selectedOptions?.length);
      if (itemsWithMods.length > 0) {
        // Fetch the DB row IDs we just inserted (by order_id + name match)
        const { data: savedItems } = await supabase.from('order_items')
          .select('id, name, dish_id')
          .eq('order_id', orderId)
          .eq('tenant_id', DEFAULT_TENANT);

        const modRows: any[] = [];
        for (const item of itemsWithMods) {
          // Match by dish_id (most reliable) or name
          const dbItem = (savedItems ?? []).find(r =>
            (item.dishId && r.dish_id === item.dishId) || r.name === item.name
          );
          if (!dbItem) continue;
          for (const opt of item.selectedOptions ?? []) {
            modRows.push({
              order_item_id: dbItem.id,
              option_id: opt.optionId,
              tenant_id: DEFAULT_TENANT,
              name: opt.name,
              price_delta: opt.price_delta,
              ingredient_id: opt.ingredient_id || null,
              qty_delta: opt.qty_delta || 0,
            });
          }
        }
        if (modRows.length > 0) {
          await supabase.from('order_item_modifiers').insert(modRows);
        }
      }

      // Deduct inventory in parallel — only for items with a valid dish_id
      const recipeResults = await Promise.all(
        items
          .filter(item => item.dishId && item.dishId !== item.name) // skip items without proper dish ID
          .map(item =>
            supabase
              .from('dish_recipes')
              .select('ingredient_id, quantity, unit, ingredients(stock, name, unit, cost, purchase_unit, purchase_qty_per_unit)')
              .eq('dish_id', item.dishId)
              .then(res => ({ item, data: res.data }))
          )
      );

      type StockUpdate = {
        ingredientId: string; deductQty: number;
        currentStock: number; newStock: number;
        dishName: string; dishQty: number;
        costPerUnit: number;
      };
      const stockUpdates: StockUpdate[] = [];

      for (const { item, data: recipeItems } of recipeResults) {
        if (!recipeItems) continue;
        for (const ri of recipeItems) {
          // Skip excluded ingredients — customer requested removal
          if (item.excludedIngredientIds?.includes(ri.ingredient_id)) continue;

          const ingredient = (ri as Record<string, unknown>)['ingredients'] as { stock: number; cost?: number; purchase_unit?: string; purchase_qty_per_unit?: number } | null;
          if (!ingredient) continue;

          // Base deduction — convert from recipe unit to stock unit if needed
          // If the recipe specifies a purchase unit (e.g. "bolsa") convert to stock unit
          const recipeUnit = (ri as any).unit ?? '';
          const stockUnit = (ingredient as any).unit ?? '';
          const purchaseUnit = (ingredient as any).purchase_unit ?? '';
          const purchaseQtyPerUnit = Number((ingredient as any).purchase_qty_per_unit ?? 1);
          const isRecipeInPurchaseUnit = purchaseUnit && recipeUnit === purchaseUnit && stockUnit !== purchaseUnit;
          let deductQty = Number(ri.quantity) * item.qty;
          if (isRecipeInPurchaseUnit && purchaseQtyPerUnit > 1) {
            // Convert: recipe says "1 bolsa" → deduct 8 piezas from stock
            deductQty = deductQty * purchaseQtyPerUnit;
          }

          // Extra: customer requested double portion of this ingredient
          const extra = item.extras?.find(e => e.ingredientId === ri.ingredient_id);
          if (extra) deductQty += extra.quantity * item.qty;

          const currentStock = Number(ingredient.stock);
          const ingredientCost = Number(ingredient.cost ?? 0);
          stockUpdates.push({
            ingredientId: ri.ingredient_id,
            deductQty, currentStock,
            newStock: Math.max(0, currentStock - deductQty),
            dishName: item.name + (extra ? ` [extra ${extra.name}]` : ''), dishQty: item.qty,
            costPerUnit: ingredientCost,
          });
        }
      }

      // ── Deduct inventory from modifier options ───────────────────────────
      // e.g. "Con papas +0.15kg" → deduct 0.15kg from papas ingredient
      const modIngredientIds = [
        ...new Set(
          items.flatMap(item =>
            (item.selectedOptions ?? [])
              .filter(o => o.ingredient_id && o.qty_delta > 0)
              .map(o => o.ingredient_id as string)
          )
        )
      ];
      if (modIngredientIds.length > 0) {
        const { data: modIngs } = await supabase
          .from('ingredients').select('id, stock, cost, unit')
          .in('id', modIngredientIds);
        const modIngMap: Record<string, any> = {};
        (modIngs ?? []).forEach((i: any) => { modIngMap[i.id] = i; });

        for (const item of items) {
          for (const opt of (item.selectedOptions ?? [])) {
            if (!opt.ingredient_id || !opt.qty_delta) continue;
            const ing = modIngMap[opt.ingredient_id];
            if (!ing) continue;
            const deductQty = Number(opt.qty_delta) * item.qty;
            const currentStock = Number(ing.stock);
            stockUpdates.push({
              ingredientId: opt.ingredient_id,
              deductQty,
              currentStock,
              newStock: Math.max(0, currentStock - deductQty),
              dishName: `${item.name} [mod: ${opt.name}]`,
              dishQty: item.qty,
              costPerUnit: Number(ing.cost ?? 0),
            });
          }
        }
      }

      // Calculate actual cost and margin — costPerUnit already captured in stockUpdates
      const costActual = stockUpdates.reduce(
        (sum, u) => sum + u.deductQty * u.costPerUnit, 0
      );
      const marginActual = total - costActual;
      const marginPct = total > 0 ? (marginActual / total) * 100 : 0;

      await Promise.allSettled([
        // Save margin to order
        supabase.from('orders').update({
          cost_actual: costActual,
          margin_actual: marginActual,
          margin_pct: marginPct,
        }).eq('id', orderId),

        // Deduct stock + log movements
        ...stockUpdates.map(u =>
          supabase.from('ingredients')
            .update({ stock: u.newStock, updated_at: now })
            .eq('id', u.ingredientId)
        ),
        ...stockUpdates.map(u =>
          supabase.from('stock_movements').insert({
            ingredient_id: u.ingredientId,
            movement_type: 'salida',
            quantity: u.deductQty,
            previous_stock: u.currentStock,
            new_stock: u.newStock,
            reason: `Venta: ${u.dishName} x${u.dishQty} — Orden ${orderId}`,
            created_by: 'Sistema',
          })
        ),
      ]);

      // Free tables
      await supabase.from('restaurant_tables').update({
        status: 'libre',
        current_order_id: null,
        waiter: null,
        opened_at: null,
        item_count: null,
        partial_total: null,
        merge_group_id: null,
        updated_at: now,
      }).in('id', tableIds);

      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Intenta de nuevo';
      toast.error('Error al procesar pago: ' + msg);
      return false;
    }
  }, [supabase]);

  // ── Cancel order ──────────────────────────────────────────────────────────

  // ── Cancel a single comanda/order with cost logic ────────────────────────
  // kitchen_status determines whether ingredients were used:
  //   pendiente   → sin_costo  (nothing started, no waste)
  //   preparacion → con_costo  (ingredients consumed, record as merma)
  //   lista       → con_costo  (fully made, definitely wasted)
  const cancelSingleOrder = useCallback(async (
    orderId: string,
    reason = 'Cancelado',
  ): Promise<'sin_costo' | 'con_costo'> => {
    const now = new Date().toISOString();

    // Check current kitchen status
    const { data: orderData } = await supabase.from('orders')
      .select('kitchen_status, tenant_id')
      .eq('id', orderId).single();

    const kStatus = orderData?.kitchen_status ?? 'pendiente';
    const hasCost = kStatus === 'preparacion' || kStatus === 'lista';
    const cancelType: 'sin_costo' | 'con_costo' = hasCost ? 'con_costo' : 'sin_costo';

    // Calculate waste cost if needed
    let wasteCost = 0;
    if (hasCost) {
      const { data: items } = await supabase.from('order_items')
        .select('dish_id, qty').eq('order_id', orderId);
      if (items && items.length > 0) {
        const dishIds = [...new Set((items as Record<string,unknown>[])
          .map(i => i.dish_id).filter(Boolean))] as string[];
        if (dishIds.length > 0) {
          const { data: recipes } = await supabase.from('dish_recipes')
            .select('dish_id, quantity, ingredients(cost)')
            .in('dish_id', dishIds);
          for (const item of (items as Record<string,unknown>[])) {
            const dishRecipes = (recipes || []).filter(
              (r: Record<string,unknown>) => r.dish_id === item.dish_id
            );
            for (const r of dishRecipes) {
              const ing = (r as Record<string,unknown>).ingredients as { cost?: number } | null;
              if (ing?.cost) wasteCost += Number(r.quantity) * Number(ing.cost) * Number(item.qty);
            }
          }
        }
      }
    }

    await supabase.from('orders').update({
      status: 'cancelada',
      kitchen_status: 'en_edicion',
      cancel_type: cancelType,
      cancel_reason: reason,
      waste_cost: wasteCost,
      updated_at: now,
    }).eq('id', orderId);

    return cancelType;
  }, [supabase]);

  // ── Cancel full table: original order + all its comandas ──────────────────
  const cancelOrder = useCallback(async (
    orderId: string | null,
    tableIds: string[],
    reason = 'Mesa cancelada',
  ): Promise<boolean> => {
    try {
      if (orderId) {
        // Find all comandas linked to this order
        const { data: comandas } = await supabase.from('orders')
          .select('id, kitchen_status')
          .eq('parent_order_id', orderId)
          .neq('status', 'cancelada');

        // Cancel each comanda with cost logic
        const cancelPromises = (comandas || []).map(c =>
          cancelSingleOrder(c.id, reason)
        );
        await Promise.all(cancelPromises);

        // Cancel the original billing order (always sin_costo — it's just a container)
        await supabase.from('orders').update({
          status: 'cancelada',
          kitchen_status: 'en_edicion',
          cancel_type: 'sin_costo',
          cancel_reason: reason,
          updated_at: new Date().toISOString(),
        }).eq('id', orderId);
      }

      await supabase.from('restaurant_tables').update({
        status: 'libre',
        current_order_id: null,
        waiter: null,
        opened_at: null,
        item_count: null,
        partial_total: null,
        merge_group_id: null,
        updated_at: new Date().toISOString(),
      }).in('id', tableIds);

      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Intenta de nuevo';
      toast.error('Error al cancelar orden: ' + msg);
      return false;
    }
  }, [supabase, cancelSingleOrder]);

  // ── Send order to kitchen — pure FIFO comanda model ────────────────────────
  // Every send (first or subsequent) creates an is_comanda order in KDS.
  // The original order is ONLY a billing container — never shown in KDS directly.
  // This eliminates all item-filtering complexity: each comanda card shows
  // exactly what was sent in that batch, nothing more.

  const sendToKitchen = useCallback(async (
    orderId: string,
    newItems?: { name: string; qty: number; notes?: string; modifier?: string; emoji?: string }[],
    meta?: { mesa: string; mesaNum?: number; mesero: string; tenantId: string; branch?: string | null },
  ): Promise<boolean> => {

    const { data: orderData, error: fetchErr } = await supabase
      .from('orders')
      .select('kitchen_status, mesa, mesa_num, mesero, tenant_id, branch')
      .eq('id', orderId)
      .single();

    if (fetchErr || !orderData) {
      toast.error('No se pudo leer la orden'); return false;
    }

    const isFirstSend = (orderData.kitchen_status ?? 'en_edicion') === 'en_edicion';
    const itemsToSend = newItems && newItems.length > 0 ? newItems : null;
    if (!itemsToSend) return true;

    const now = new Date().toISOString();
    const comandaId = `${orderId.slice(-6)}-C${Date.now().toString(36).toUpperCase()}`;

    // Mark the original order so it's hidden from KDS but visible for billing
    if (isFirstSend) {
      await supabase.from('orders').update({
        kitchen_status: 'pendiente',   // not 'en_edicion' anymore
        kitchen_sent_at: now,
        updated_at: now,
      }).eq('id', orderId);
    }

    // Every send = new comanda card in KDS (FIFO)
    const { error: insertErr } = await supabase.from('orders').insert({
      id: comandaId,
      tenant_id: orderData.tenant_id ?? meta?.tenantId,
      mesa: orderData.mesa ?? meta?.mesa ?? '',
      mesa_num: orderData.mesa_num ?? meta?.mesaNum ?? 0,
      mesero: orderData.mesero ?? meta?.mesero ?? '',
      status: 'abierta',
      kitchen_status: 'pendiente',
      is_comanda: true,
      parent_order_id: orderId,
      total: 0, subtotal: 0, iva: 0, discount: 0,
      pay_method: 'efectivo',
      opened_at: now,
      updated_at: now,
      branch: orderData.branch ?? meta?.branch ?? null,
    });

    if (insertErr) { toast.error('Error al enviar comanda: ' + insertErr.message); return false; }

    const { error: itemsErr } = await supabase.from('order_items').insert(
      (newItems ?? []).map(i => ({
        order_id: comandaId,
        name: i.name,
        qty: i.qty,
        price: 0,
        emoji: i.emoji ?? '🍽️',
        modifier: i.modifier || null,
        notes: i.notes || null,
        tenant_id: orderData.tenant_id ?? meta?.tenantId,
      }))
    );

    if (itemsErr) { toast.error('Error al insertar items de comanda: ' + itemsErr.message); return false; }

    toast.success('✅ Comanda enviada a cocina');
    return true;
  }, [supabase]);

  // ── Cancel a specific item from an order ────────────────────────────────────
  // Searches active comandas of the given order for an item matching the dish.
  // If found and the comanda is the only item, cancels the whole comanda.
  // If the comanda has multiple items, removes just that item.
  // Returns: { hasCost, found } — hasCost for merma feedback
  const cancelItemFromKDS = useCallback(async (
    parentOrderId: string,
    dishId: string,
    dishName: string,
    reason = 'Platillo cancelado desde POS',
  ): Promise<{ hasCost: boolean; found: boolean }> => {
    const now = new Date().toISOString();

    // Find active comandas for this order that contain this dish
    const { data: comandas } = await supabase.from('orders')
      .select('id, kitchen_status, order_items(id, dish_id, name, qty)')
      .eq('parent_order_id', parentOrderId)
      .eq('is_comanda', true)
      .neq('status', 'cancelada')
      .order('created_at', { ascending: false }); // most recent first

    if (!comandas || comandas.length === 0) return { hasCost: false, found: false };

    // Find the most recent comanda that has this dish
    let targetComanda: typeof comandas[0] | null = null;
    let targetItem: Record<string, unknown> | null = null;

    for (const c of comandas) {
      const items = (c.order_items || []) as Record<string, unknown>[];
      const found = items.find(i =>
        i.dish_id === dishId || String(i.name) === dishName
      );
      if (found) { targetComanda = c; targetItem = found; break; }
    }

    if (!targetComanda || !targetItem) return { hasCost: false, found: false };

    const hasCost = targetComanda.kitchen_status === 'preparacion' ||
                    targetComanda.kitchen_status === 'lista';

    const items = (targetComanda.order_items || []) as Record<string, unknown>[];

    // Calculate waste_cost for this item if it has cost
    let wasteCost = 0;
    if (hasCost && dishId) {
      const { data: recipes } = await supabase.from('dish_recipes')
        .select('quantity, ingredients(cost)')
        .eq('dish_id', dishId);
      if (recipes) {
        for (const r of recipes as Record<string,unknown>[]) {
          const ing = r.ingredients as { cost?: number } | null;
          if (ing?.cost) wasteCost += Number(r.quantity) * Number(ing.cost);
        }
      }
      // Multiply by quantity ordered
      wasteCost *= Number(targetItem.qty ?? 1);
    }

    if (items.length <= 1) {
      // Only item in this comanda — cancel the whole comanda
      await supabase.from('orders').update({
        status: 'cancelada',
        kitchen_status: 'en_edicion',
        cancel_type: hasCost ? 'con_costo' : 'sin_costo',
        cancel_reason: `${reason}: ${dishName}`,
        waste_cost: wasteCost,
        updated_at: now,
      }).eq('id', targetComanda.id);
    } else {
      // Multiple items — remove this item and record partial waste on the comanda
      await supabase.from('order_items')
        .delete()
        .eq('id', String(targetItem.id));

      // Update waste_cost on the comanda (add to existing if any)
      if (hasCost && wasteCost > 0) {
        const { data: existing } = await supabase.from('orders')
          .select('waste_cost, cancel_type, cancel_reason')
          .eq('id', targetComanda.id).single();
        await supabase.from('orders').update({
          waste_cost: Number(existing?.waste_cost ?? 0) + wasteCost,
          cancel_type: 'con_costo',
          cancel_reason: `${existing?.cancel_reason ? existing.cancel_reason + '; ' : ''}${reason}: ${dishName}`,
          updated_at: now,
        }).eq('id', targetComanda.id);
      }
    }

    return { hasCost, found: true };
  }, [supabase]);

    return { ensureOpenOrder, syncItems, closeOrder, cancelOrder, cancelSingleOrder, cancelItemFromKDS, loadOrderItems, sendToKitchen };
}