'use client';
import React from 'react';
import { AlertTriangle, TrendingDown, TrendingUp, Phone, ExternalLink, Download } from 'lucide-react';

interface Ingredient {
  id: string; name: string; unit: string; stock: number;
  minStock: number; reorderPoint: number;
  supplier: string; supplierPhone: string; supplierUrl: string;
  [key: string]: unknown;
}

interface Props {
  ingredients: Ingredient[];
  onOpenEdit: (ing: any) => void;
  onShowShoppingList: () => void;
}

export default function AlertasTab({ ingredients, onOpenEdit, onShowShoppingList }: Props) {
  const lowStockItems  = ingredients.filter(i => i.stock <= i.minStock);
  const reorderItems   = ingredients.filter(i => i.stock > i.minStock && i.stock <= i.reorderPoint);

  return (
    <div className="flex-1 overflow-auto px-6 py-5 space-y-6">
      {/* Stock Crítico */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle size={16} className="text-red-400" />
          <h2 className="text-sm font-bold text-white">Stock Crítico</h2>
          <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ backgroundColor: 'rgba(239,68,68,0.15)', color: '#f87171' }}>{lowStockItems.length}</span>
        </div>
        <div className="flex justify-end mb-2">
          <button onClick={onShowShoppingList}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
            style={{ backgroundColor: 'rgba(245,158,11,0.15)', color: '#fbbf24', border: '1px solid rgba(245,158,11,0.3)' }}>
            <Download size={13} />📋 Lista de compras
          </button>
        </div>
        {lowStockItems.length === 0 ? (
          <div className="rounded-xl p-4 text-sm" style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.4)' }}>
            ✅ Ningún ingrediente en stock crítico
          </div>
        ) : (
          <div className="space-y-2">
            {lowStockItems.map(ing => (
              <div key={ing.id} className="flex items-center justify-between rounded-xl px-4 py-3" style={{ backgroundColor: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
                <div className="flex items-center gap-3">
                  <AlertTriangle size={15} className="text-red-400" />
                  <div>
                    <p className="text-sm font-semibold text-white">{ing.name}</p>
                    <p className="text-xs text-red-400">Stock: {ing.stock} {ing.unit} — Mínimo: {ing.minStock} {ing.unit}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {ing.supplier && <span className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>{ing.supplier}</span>}
                  {ing.supplierPhone && (
                    <span className="flex items-center gap-1 text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
                      <Phone size={10} />{ing.supplierPhone}
                    </span>
                  )}
                  <button onClick={() => onOpenEdit(ing)} className="text-xs px-3 py-1.5 rounded-lg font-semibold" style={{ backgroundColor: 'rgba(239,68,68,0.2)', color: '#f87171' }}>
                    Actualizar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Por Reordenar */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <TrendingDown size={16} className="text-amber-400" />
          <h2 className="text-sm font-bold text-white">Por Reordenar</h2>
          <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ backgroundColor: 'rgba(245,158,11,0.15)', color: '#fbbf24' }}>{reorderItems.length}</span>
        </div>
        {reorderItems.length === 0 ? (
          <div className="rounded-xl p-4 text-sm" style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.4)' }}>
            ✅ Ningún ingrediente requiere reorden
          </div>
        ) : (
          <div className="space-y-2">
            {reorderItems.map(ing => (
              <div key={ing.id} className="flex items-center justify-between rounded-xl px-4 py-3" style={{ backgroundColor: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}>
                <div className="flex items-center gap-3">
                  <TrendingDown size={15} className="text-amber-400" />
                  <div>
                    <p className="text-sm font-semibold text-white">{ing.name}</p>
                    <p className="text-xs text-amber-400">Stock: {ing.stock} {ing.unit} — Punto de reorden: {ing.reorderPoint} {ing.unit}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {ing.supplier && <span className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>{ing.supplier}</span>}
                  {ing.supplierPhone && (
                    <span className="flex items-center gap-1 text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
                      <Phone size={10} />{ing.supplierPhone}
                    </span>
                  )}
                  {ing.supplierUrl && (
                    <a href={ing.supplierUrl} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg font-semibold"
                      style={{ backgroundColor: 'rgba(245,158,11,0.2)', color: '#fbbf24' }}>
                      <ExternalLink size={11} />Ordenar
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Todo OK */}
      {lowStockItems.length === 0 && reorderItems.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 gap-4">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ backgroundColor: 'rgba(34,197,94,0.12)' }}>
            <TrendingUp size={28} className="text-green-400" />
          </div>
          <div className="text-center">
            <p className="text-base font-semibold text-white mb-1">¡Inventario en buen estado!</p>
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>Todos los ingredientes tienen stock suficiente.</p>
          </div>
        </div>
      )}
    </div>
  );
}
