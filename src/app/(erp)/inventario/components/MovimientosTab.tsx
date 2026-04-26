'use client';
import React from 'react';
import { X, Search, History } from 'lucide-react';

const MOVEMENT_COLORS: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
  entrada: { bg: 'bg-green-500/15 text-green-400', text: 'Entrada', icon: '↑' },
  salida:  { bg: 'bg-red-500/15 text-red-400',   text: 'Salida',  icon: '↓' },
  ajuste:  { bg: 'bg-blue-500/15 text-blue-400', text: 'Ajuste',  icon: '~' },
  merma:   { bg: 'bg-orange-500/15 text-orange-400', text: 'Merma', icon: '!' },
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('es-MX', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

function RowSkeleton({ cols }: { cols: number }) {
  return (
    <>
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-4 rounded animate-pulse" style={{ backgroundColor: 'rgba(255,255,255,0.07)', width: i === 0 ? '60%' : '80%' }} />
        </td>
      ))}
    </>
  );
}

interface Movement {
  id: string;
  ingredientName: string;
  movementType: string;
  quantity: number;
  unit: string;
  previousStock: number;
  newStock: number;
  reason?: string;
  createdBy: string;
  createdAt: string;
}

interface Ingredient { id: string; name: string; }

interface Props {
  movements: Movement[];
  ingredients: Ingredient[];
  loadingMovements: boolean;
  historyIngredientId: string | null;
  setHistoryIngredientId: (id: string | null) => void;
}

export default function MovimientosTab({
  movements, ingredients, loadingMovements,
  historyIngredientId, setHistoryIngredientId,
}: Props) {
  const historyIngredient = ingredients.find(i => i.id === historyIngredientId);

  return (
    <div className="flex-1 overflow-auto">
      {/* Filter bar */}
      <div className="flex items-center gap-3 px-6 py-3 border-b flex-shrink-0" style={{ borderColor: '#243f72' }}>
        {historyIngredient && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm" style={{ backgroundColor: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.25)' }}>
            <span style={{ color: '#f59e0b' }}>Filtrando: {historyIngredient.name}</span>
            <button onClick={() => setHistoryIngredientId(null)} className="ml-1 hover:opacity-70">
              <X size={12} style={{ color: '#f59e0b' }} />
            </button>
          </div>
        )}
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'rgba(255,255,255,0.35)' }} />
          <select
            value={historyIngredientId ?? ''}
            onChange={e => setHistoryIngredientId(e.target.value || null)}
            className="w-full pl-9 pr-3 py-2 rounded-lg text-sm outline-none appearance-none"
            style={{ backgroundColor: '#1a2f52', border: '1px solid #243f72', color: 'rgba(255,255,255,0.85)' }}
          >
            <option value="" style={{ backgroundColor: '#162d55' }}>Todos los ingredientes</option>
            {ingredients.map(i => (
              <option key={i.id} value={i.id} style={{ backgroundColor: '#162d55' }}>{i.name}</option>
            ))}
          </select>
        </div>
      </div>

      <table className="w-full">
        <thead className="sticky top-0 z-10" style={{ backgroundColor: '#132240' }}>
          <tr className="border-b" style={{ borderColor: '#243f72' }}>
            {['Fecha','Ingrediente','Tipo','Cantidad','Stock Anterior','Stock Nuevo','Motivo','Registrado por'].map(h => (
              <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: 'rgba(255,255,255,0.45)' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loadingMovements ? (
            Array.from({ length: 6 }).map((_, i) => <tr key={i}><RowSkeleton cols={8} /></tr>)
          ) : movements.length === 0 ? (
            <tr>
              <td colSpan={8} className="py-16 text-center">
                <div className="flex flex-col items-center gap-3">
                  <History size={32} style={{ color: 'rgba(255,255,255,0.15)' }} />
                  <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>No hay movimientos registrados</p>
                </div>
              </td>
            </tr>
          ) : movements.map(mv => {
            const mc = MOVEMENT_COLORS[mv.movementType] ?? MOVEMENT_COLORS['ajuste'];
            return (
              <tr key={mv.id} className="border-b transition-colors hover:bg-white/5" style={{ borderColor: '#1a2f52' }}>
                <td className="px-4 py-3.5 text-xs font-mono" style={{ color: 'rgba(255,255,255,0.5)' }}>{formatDate(mv.createdAt)}</td>
                <td className="px-4 py-3.5 text-sm font-semibold text-white">{mv.ingredientName}</td>
                <td className="px-4 py-3.5">
                  <span className={`flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full font-semibold w-fit ${mc.bg}`}>
                    {mc.icon}{mc.text}
                  </span>
                </td>
                <td className="px-4 py-3.5">
                  <span className={`text-sm font-mono font-semibold ${mv.movementType === 'salida' ? 'text-red-400' : mv.movementType === 'entrada' ? 'text-green-400' : 'text-blue-400'}`}>
                    {mv.movementType === 'salida' ? '-' : '+'}{mv.quantity} {mv.unit}
                  </span>
                </td>
                <td className="px-4 py-3.5 text-sm font-mono" style={{ color: 'rgba(255,255,255,0.5)' }}>{mv.previousStock} {mv.unit}</td>
                <td className="px-4 py-3.5 text-sm font-mono text-white">{mv.newStock} {mv.unit}</td>
                <td className="px-4 py-3.5 text-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>{mv.reason || '—'}</td>
                <td className="px-4 py-3.5 text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>{mv.createdBy}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
