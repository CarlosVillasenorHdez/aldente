'use client';

import React, { useState } from 'react';
import { Minus, Plus, Trash2, Lock, ShoppingCart, Tag, ChevronDown, Send, Printer, MessageSquare, Split, PauseCircle, Clock } from 'lucide-react';
import { Table, OrderItem } from './POSClient';

interface OrderPanelProps {
  selectedTable: Table | null;
  mergeGroupLabel?: string | null;
  orderItems: OrderItem[];
  onUpdateQty: (itemId: string, delta: number) => void;
  onRemoveItem: (itemId: string) => void;
  deliveredLineIds?: Set<string>;
  subtotal: number;
  discountAmount: number;
  iva: number;
  total: number;
  discount: { type: 'pct' | 'fixed'; value: number };
  onDiscountChange: (d: { type: 'pct' | 'fixed'; value: number }) => void;
  onCheckout: () => void;
  onPartialCheckout?: (itemIds: string[]) => void;
  onSendToKitchen: () => void;
  onShowMenu: () => void;
  onUpdateNote: (itemId: string, note: string) => void;
  kitchenSent: boolean;
  sendingToKitchen: boolean;
  onHold?: () => void;
  onStay?: () => void;
  isOnHold?: boolean;
  onSendKitchenNote?: (note: string) => void;
}

export default function OrderPanel({
  selectedTable,
  mergeGroupLabel,
  orderItems,
  onUpdateQty,
  onRemoveItem,
  deliveredLineIds,
  subtotal,
  discountAmount,
  iva,
  total,
  discount,
  onDiscountChange,
  onCheckout,
  onPartialCheckout,
  onSendToKitchen,
  onShowMenu,
  onUpdateNote,
  kitchenSent,
  sendingToKitchen,
  onHold,
  onStay,
  isOnHold,
  onSendKitchenNote,
}: OrderPanelProps) {
  const [showDiscount, setShowDiscount] = useState(false);
  const [showPartial, setShowPartial] = useState(false);
  const [partialSelected, setPartialSelected] = useState<Set<string>>(new Set());
  const [discountInput, setDiscountInput] = useState('');
  const [expandedNoteId, setExpandedNoteId] = useState<string | null>(null);
  const [showKitchenNote, setShowKitchenNote] = useState(false);
  const [kitchenNoteText, setKitchenNoteText] = useState('');

  const tableLabel = mergeGroupLabel ?? (selectedTable ? selectedTable.name : 'Sin mesa');
  // Real piece count (not distinct dishes)
  const totalPieces = orderItems.reduce((s, i) => s + i.quantity, 0);

  const applyDiscount = () => {
    const val = parseFloat(discountInput);
    if (!isNaN(val) && val >= 0) {
      onDiscountChange({ type: discount.type, value: val });
    }
  };

  return (
    <div
      className="w-80 xl:w-96 flex-shrink-0 flex flex-col bg-white border-l"
      style={{ borderColor: '#e5e7eb' }}
    >
      {/* Header */}
      <div
        className="px-4 py-3.5 border-b flex items-center justify-between flex-shrink-0"
        style={{ borderColor: '#f3f4f6', backgroundColor: '#1B3A6B' }}
      >
        <div className="flex items-center gap-2">
          <ShoppingCart size={16} style={{ color: '#f59e0b' }} />
          <span className="font-700 text-white text-sm" style={{ fontWeight: 700 }}>
            {tableLabel}
          </span>
          {mergeGroupLabel && (
            <span className="text-xs px-1.5 py-0.5 rounded-full font-semibold" style={{ backgroundColor: 'rgba(168,85,247,0.25)', color: '#c4b5fd' }}>
              Unidas
            </span>
          )}
        </div>
        {selectedTable && (
          <div className="flex items-center gap-2">
            <span className="text-xs" style={{ color: 'rgba(255,255,255,0.6)' }}>
              {totalPieces} {totalPieces === 1 ? 'pieza' : 'piezas'}
            </span>
            {kitchenSent && (
              <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ backgroundColor: 'rgba(34,197,94,0.2)', color: '#4ade80' }}>
                En cocina
              </span>
            )}
          </div>
        )}
      </div>

      {/* Order items */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {!selectedTable ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-6 py-12">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
              style={{ backgroundColor: '#f3f4f6' }}
            >
              <ShoppingCart size={28} className="text-gray-300" />
            </div>
            <p className="text-sm font-600 text-gray-600 mb-1" style={{ fontWeight: 600 }}>
              Sin mesa seleccionada
            </p>
            <p className="text-xs text-gray-400 leading-relaxed">
              Selecciona una mesa del mapa para comenzar a registrar una orden
            </p>
          </div>
        ) : orderItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-6 py-12">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
              style={{ backgroundColor: '#fffbeb' }}
            >
              <ShoppingCart size={28} style={{ color: '#f59e0b' }} />
            </div>
            <p className="text-sm font-600 text-gray-700 mb-1" style={{ fontWeight: 600 }}>
              Orden vacía
            </p>
            <p className="text-xs text-gray-400 mb-4 leading-relaxed">
              Agrega platillos desde el menú para {selectedTable.name}
            </p>
            <button onClick={onShowMenu} className="btn-primary text-xs py-2 px-4">
              Ver Menú
            </button>
          </div>
        ) : (
          <div>
            {(() => {
              // Group lines by dish name for compact display
              const groups = orderItems.reduce<Record<string, typeof orderItems>>((acc, item) => {
                const key = item.menuItem.id;
                if (!acc[key]) acc[key] = [];
                acc[key].push(item);
                return acc;
              }, {});

              return Object.values(groups).map(group => {
                const first = group[0];
                const totalQty = group.reduce((s, i) => s + i.quantity, 0);
                const totalPrice = group.reduce((s, i) => s + i.menuItem.price * i.quantity, 0);
                const hasVariations = group.some(i => i.modifier || i.notes);
                const groupKey = first.menuItem.id;
                const isExpanded = expandedNoteId === groupKey || group.length === 1;

                return (
                  <div key={groupKey} className="border-b border-gray-50 last:border-0">
                    {/* Group header */}
                    <div
                      className="px-4 py-3 flex items-start gap-3 hover:bg-gray-50 transition-colors"
                      onClick={() => group.length > 1 && setExpandedNoteId(isExpanded ? null : groupKey)}
                      style={{ cursor: group.length > 1 ? 'pointer' : 'default' }}
                    >
                      <span className="text-xl flex-shrink-0 mt-0.5">{first.menuItem.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm text-gray-800 leading-tight" style={{ fontWeight: 600 }}>
                            {first.menuItem.name}
                          </p>
                          {group.length > 1 && (
                            <span className="text-xs px-1.5 py-0.5 rounded-full font-bold" style={{ background: '#f3f4f6', color: '#6b7280' }}>
                              ×{totalQty}
                            </span>
                          )}
                          {group.length > 1 && hasVariations && (
                            <span className="text-xs" style={{ color: '#9ca3af' }}>
                              {isExpanded ? '▲' : '▼'}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5 font-mono">
                          ${first.menuItem.price.toFixed(2)} c/u
                        </p>
                      </div>
                      <span className="font-mono text-sm text-gray-900" style={{ fontWeight: 700 }}>
                        ${totalPrice.toFixed(2)}
                      </span>
                    </div>

                    {/* Individual lines — shown when expanded or only 1 item */}
                    {(isExpanded || group.length === 1) && group.map((item) => (
                      <div key={item.lineId} className="px-4 pb-2 ml-8">
                        <div className="flex items-center gap-2 py-1.5 border-t border-dashed" style={{ borderColor: '#f3f4f6' }}>
                          <div className="flex-1 min-w-0">
                            {item.modifier && (
                              <p className="text-xs font-medium" style={{ color: '#d97706' }}>
                                ↳ {item.modifier}
                              </p>
                            )}
                            {item.notes && !item.modifier && (
                              <p className="text-xs italic" style={{ color: '#9ca3af' }}>
                                📝 {item.notes}
                              </p>
                            )}
                            {!item.modifier && !item.notes && (
                              <p className="text-xs" style={{ color: '#9ca3af' }}>Sin modificaciones</p>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5">
                            <button onClick={() => onUpdateQty(item.lineId, -1)}
                              className="w-5 h-5 rounded flex items-center justify-center" style={{ backgroundColor: '#fee2e2', color: '#dc2626' }}>
                              <Minus size={9} />
                            </button>
                            <span className="font-mono text-xs w-4 text-center" style={{ fontWeight: 700 }}>{item.quantity}</span>
                            <button onClick={() => onUpdateQty(item.lineId, 1)}
                              className="w-5 h-5 rounded flex items-center justify-center" style={{ backgroundColor: '#dcfce7', color: '#16a34a' }}>
                              <Plus size={9} />
                            </button>
                            <button onClick={() => onRemoveItem(item.lineId)}
                              className="w-5 h-5 rounded flex items-center justify-center ml-1" style={{ color: '#d1d5db' }}>
                              <Trash2 size={9} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              });
            })()}

          </div>
        )}
      </div>

      {/* Totals + Actions */}
      {orderItems.length > 0 && selectedTable && (
        <div className="flex-shrink-0 border-t" style={{ borderColor: '#e5e7eb' }}>
          {/* Discount toggle */}
          <div className="px-4 pt-3">
            <button
              onClick={() => setShowDiscount(!showDiscount)}
              className="flex items-center gap-2 text-xs font-600 text-gray-500 hover:text-gray-700 transition-colors"
              style={{ fontWeight: 600 }}
            >
              <Tag size={12} />
              Aplicar descuento
              <ChevronDown
                size={12}
                className="transition-transform duration-150"
                style={{ transform: showDiscount ? 'rotate(180deg)' : 'rotate(0deg)' }}
              />
            </button>

            {showDiscount && (
              <div className="mt-2 flex items-center gap-2 animate-fade-in">
                <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5">
                  {(['pct', 'fixed'] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => onDiscountChange({ type: t, value: discount.value })}
                      className="px-2 py-1 rounded-md text-xs font-600 transition-all"
                      style={{
                        fontWeight: 600,
                        backgroundColor: discount.type === t ? 'white' : 'transparent',
                        color: discount.type === t ? '#1B3A6B' : '#6b7280',
                        boxShadow: discount.type === t ? '0 1px 2px rgba(0,0,0,0.08)' : 'none',
                      }}
                    >
                      {t === 'pct' ? '%' : '$'}
                    </button>
                  ))}
                </div>
                <input
                  type="number"
                  placeholder={discount.type === 'pct' ? '0–100' : '0.00'}
                  value={discountInput}
                  onChange={(e) => setDiscountInput(e.target.value)}
                  onBlur={applyDiscount}
                  className="input-field py-1.5 text-sm w-20 text-center"
                  min={0}
                  max={discount.type === 'pct' ? 100 : undefined}
                />
                <button
                  onClick={applyDiscount}
                  className="text-xs px-3 py-1.5 rounded-lg font-600 transition-colors"
                  style={{ backgroundColor: '#f3f4f6', color: '#374151', fontWeight: 600 }}
                >
                  Aplicar
                </button>
              </div>
            )}
          </div>

          {/* Totals breakdown */}
          <div className="px-4 py-3 space-y-1.5">
            <div className="flex justify-between text-sm text-gray-500">
              <span>Subtotal</span>
              <span className="font-mono">${subtotal.toFixed(2)}</span>
            </div>
            {discountAmount > 0 && (
              <div className="flex justify-between text-sm" style={{ color: '#16a34a' }}>
                <span>Descuento ({discount.type === 'pct' ? `${discount.value}%` : 'fijo'})</span>
                <span className="font-mono">−${discountAmount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm text-gray-500">
              <span>IVA (16%)</span>
              <span className="font-mono">${iva.toFixed(2)}</span>
            </div>
            <div
              className="flex justify-between text-base font-700 pt-1.5 border-t"
              style={{ borderColor: '#e5e7eb', fontWeight: 700 }}
            >
              <span className="text-gray-900">Total</span>
              <span className="font-mono text-lg" style={{ color: '#1B3A6B' }}>
                ${total.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="px-4 pb-4 flex flex-col gap-2">
            {/* Enviar a cocina — only show if not yet sent, or show re-send if already sent */}
            {/* Hold / Stay / Send — control de timing de cocina */}
            {isOnHold && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl mb-1"
                style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)' }}>
                <PauseCircle size={13} style={{ color: '#d97706', flexShrink: 0 }} />
                <span className="text-xs font-semibold" style={{ color: '#d97706' }}>
                  En espera — la cocina no ha recibido esta orden
                </span>
              </div>
            )}
            <div className="flex gap-2">
              {/* Hold: guarda la orden pero NO la manda a cocina */}
              {onHold && (
                <button
                  onClick={onHold}
                  disabled={orderItems.length === 0}
                  title="Guardar orden sin enviar a cocina aún"
                  className="flex items-center justify-center gap-1.5 py-3 rounded-xl text-sm font-bold transition-all disabled:opacity-40"
                  style={{
                    flex: '0 0 auto', width: 52,
                    backgroundColor: isOnHold ? 'rgba(245,158,11,0.15)' : '#f3f4f6',
                    color: isOnHold ? '#d97706' : '#6b7280',
                    border: isOnHold ? '1px solid rgba(245,158,11,0.4)' : '1px solid #e5e7eb',
                  }}
                >
                  <PauseCircle size={15} />
                </button>
              )}
              {/* Stay: la orden sigue abierta, el cliente pide más */}
              {onStay && kitchenSent && (
                <button
                  onClick={onStay}
                  disabled={orderItems.length === 0}
                  title="Marcar que el comensal aún no termina de pedir"
                  className="flex items-center justify-center gap-1.5 py-3 rounded-xl text-sm font-bold transition-all disabled:opacity-40"
                  style={{
                    flex: '0 0 auto', width: 52,
                    backgroundColor: '#f0fdf4',
                    color: '#16a34a',
                    border: '1px solid #bbf7d0',
                  }}
                >
                  <Clock size={15} />
                </button>
              )}
              {/* Send: envía a cocina todo lo pendiente */}
              <button
                onClick={onSendToKitchen}
                disabled={sendingToKitchen || orderItems.length === 0 || !selectedTable.currentOrderId}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all disabled:opacity-50"
                style={{ backgroundColor: isOnHold ? '#d97706' : '#059669', color: 'white' }}
              >
                <Send size={15} />
                {sendingToKitchen ? 'Enviando...' : isOnHold ? 'Enviar ahora' : 'Enviar comanda'}
              </button>
              {kitchenSent && onSendKitchenNote && (
                <button
                  onClick={() => setShowKitchenNote(true)}
                  className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold transition-all"
                  style={{ backgroundColor: 'rgba(245,158,11,0.1)', color: '#d97706', border: '1px solid rgba(245,158,11,0.25)', flex: '0 0 auto' }}
                  title="Nota urgente a cocina"
                >
                  <MessageSquare size={13} />
                </button>
              )}
            </div>


            <div className="flex gap-2">
              <button
                onClick={onCheckout}
                disabled={orderItems.length === 0}
                className="btn-primary flex-1 justify-center py-3 text-sm font-bold"
              >
                Cobrar todo ${total.toFixed(2)}
              </button>
              {onPartialCheckout && kitchenSent && orderItems.length > 1 && (
                <button
                  onClick={() => { setShowPartial(true); setPartialSelected(new Set()); }}
                  className="flex items-center justify-center gap-1 px-3 py-2 rounded-xl text-xs font-semibold transition-all"
                  style={{ backgroundColor: 'rgba(96,165,250,0.1)', color: '#60a5fa', border: '1px solid rgba(96,165,250,0.25)' }}
                  title="Cobrar solo algunos platillos"
                >
                  <Split size={13} /> Parcial
                </button>
              )}
            </div>

            {/* Cierre parcial modal */}
            {showPartial && (
              <div style={{ position:'fixed', inset:0, zIndex:9999, background:'rgba(0,0,0,0.7)', backdropFilter:'blur(6px)', display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
                <div style={{ background:'#fff', borderRadius:20, padding:24, maxWidth:400, width:'100%', maxHeight:'80vh', overflowY:'auto' }}>
                  <h3 style={{ fontSize:17, fontWeight:700, color:'#111', marginBottom:4 }}>Cobro parcial</h3>
                  <p style={{ fontSize:13, color:'#6b7280', marginBottom:16 }}>Selecciona los platillos a cobrar ahora. El resto queda en la mesa.</p>
                  <div style={{ display:'flex', flexDirection:'column', gap:8, marginBottom:20 }}>
                    {orderItems.map(item => {
                      const sel = partialSelected.has(item.lineId);
                      const price = item.menuItem.price * item.quantity;
                      return (
                        <button key={item.lineId} onClick={() => setPartialSelected(prev => {
                          const next = new Set(prev);
                          sel ? next.delete(item.lineId) : next.add(item.lineId);
                          return next;
                        })} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 14px', borderRadius:12, cursor:'pointer', background:sel?'#eff6ff':'#f9fafb', border:`2px solid ${sel?'#3b82f6':'#e5e7eb'}` }}>
                          <div style={{ display:'flex', alignItems:'center', gap:8, textAlign:'left' }}>
                            <span style={{ fontSize:18 }}>{item.menuItem.emoji}</span>
                            <div>
                              <div style={{ fontSize:13, fontWeight:600, color:'#111' }}>{item.quantity > 1 ? `${item.quantity}× ` : ''}{item.menuItem.name}</div>
                              {item.modifier && <div style={{ fontSize:11, color:'#6b7280' }}>{item.modifier}</div>}
                            </div>
                          </div>
                          <div style={{ display:'flex', alignItems:'center', gap:8, flexShrink:0 }}>
                            <span style={{ fontFamily:'monospace', fontWeight:700, color:'#111' }}>${price.toFixed(2)}</span>
                            <div style={{ width:20, height:20, borderRadius:'50%', background:sel?'#3b82f6':'transparent', border:'2px solid '+( sel?'#3b82f6':'#d1d5db'), display:'flex', alignItems:'center', justifyContent:'center' }}>
                              {sel && <span style={{ color:'#fff', fontSize:12, fontWeight:700 }}>✓</span>}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  {partialSelected.size > 0 && (
                    <div style={{ background:'#eff6ff', borderRadius:10, padding:'10px 14px', marginBottom:16, display:'flex', justifyContent:'space-between' }}>
                      <span style={{ fontSize:13, color:'#1d4ed8', fontWeight:600 }}>A cobrar ahora</span>
                      <span style={{ fontFamily:'monospace', fontWeight:700, color:'#1d4ed8' }}>
                        ${orderItems.filter(i => partialSelected.has(i.lineId)).reduce((s,i) => s + i.menuItem.price * i.quantity, 0).toFixed(2)}
                      </span>
                    </div>
                  )}
                  <div style={{ display:'flex', gap:8 }}>
                    <button onClick={() => setShowPartial(false)} style={{ flex:1, padding:'10px', borderRadius:10, background:'#f3f4f6', border:'none', fontSize:14, fontWeight:600, color:'#6b7280', cursor:'pointer' }}>Cancelar</button>
                    <button
                      disabled={partialSelected.size === 0}
                      onClick={() => { onPartialCheckout!([...partialSelected]); setShowPartial(false); }}
                      style={{ flex:2, padding:'10px', borderRadius:10, background:partialSelected.size>0?'#1d4ed8':'#e5e7eb', border:'none', fontSize:14, fontWeight:700, color:partialSelected.size>0?'#fff':'#9ca3af', cursor:partialSelected.size>0?'pointer':'default' }}>
                      Cobrar seleccionados
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => {}}
                className="btn-secondary flex-1 text-xs py-2 justify-center"
              >
                <Printer size={13} />
                Imprimir
              </button>
              <button
                onClick={onShowMenu}
                className="btn-secondary flex-1 text-xs py-2 justify-center"
              >
                <Plus size={13} />
                Agregar más
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal nota a cocina */}
      {showKitchenNote && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="w-full max-w-sm rounded-2xl p-5 space-y-3 bg-white shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare size={16} style={{ color: '#d97706' }} />
                <h3 className="font-bold text-gray-900 text-sm">Nota urgente a cocina</h3>
              </div>
              <button onClick={() => { setShowKitchenNote(false); setKitchenNoteText(''); }}
                className="text-gray-400 hover:text-gray-600 text-lg leading-none">✕</button>
            </div>
            <textarea
              value={kitchenNoteText}
              onChange={e => setKitchenNoteText(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 rounded-xl border text-sm resize-none outline-none focus:border-amber-400"
              style={{ borderColor: '#e5e7eb', backgroundColor: '#fefce8' }}
              placeholder="Ej: sin cebolla, alergia al gluten, cambiar guarnición..."
              autoFocus
            />
            <div className="flex gap-2">
              <button onClick={() => { setShowKitchenNote(false); setKitchenNoteText(''); }}
                className="flex-1 py-2 rounded-xl text-sm font-semibold bg-gray-100 text-gray-600">
                Cancelar
              </button>
              <button
                onClick={() => {
                  if (kitchenNoteText.trim() && onSendKitchenNote) {
                    onSendKitchenNote(kitchenNoteText.trim());
                    setKitchenNoteText('');
                    setShowKitchenNote(false);
                  }
                }}
                disabled={!kitchenNoteText.trim()}
                className="flex-1 py-2 rounded-xl text-sm font-bold disabled:opacity-50"
                style={{ backgroundColor: '#f59e0b', color: '#1B3A6B' }}>
                📝 Enviar a cocina
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}