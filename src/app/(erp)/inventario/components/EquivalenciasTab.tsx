'use client';
import React from 'react';
import { Plus, Pencil, Trash2, Scale } from 'lucide-react';

interface Equivalence {
  id: string; ingredientId?: string; ingredientName: string; ingredientUnit: string;
  bulkUnit: string; bulkDescription: string;
  subUnit: string; subUnitDescription: string;
  conversionFactor: number; notes: string;
  [key: string]: unknown;
}

interface Props {
  equivalences: Equivalence[];
  loadingEquiv: boolean;
  onAdd: () => void;
  onEdit: (eq: any) => void;
  onDelete: (id: any) => void;
}

export default function EquivalenciasTab({ equivalences, loadingEquiv, onAdd, onEdit, onDelete }: Props) {
  if (loadingEquiv) {
    return (
      <div className="p-6 space-y-3">
        {[1,2,3].map(i => <div key={i} className="h-16 rounded-xl animate-pulse" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }} />)}
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto">
      <div className="flex items-center justify-between px-6 py-3 border-b flex-shrink-0" style={{ borderColor: '#243f72' }}>
        <div>
          <p className="text-sm text-white font-semibold">Tabla de Equivalencias de Unidades</p>
          <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
            Define cómo se convierten las unidades de compra a unidades de uso. Ej: 1 bolsa de pan = 8 pares.
          </p>
        </div>
        <button onClick={onAdd} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold" style={{ backgroundColor: '#f59e0b', color: '#1B3A6B' }}>
          <Plus size={15} />Nueva Equivalencia
        </button>
      </div>

      {equivalences.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ backgroundColor: 'rgba(245,158,11,0.12)' }}>
            <Scale size={28} style={{ color: '#f59e0b' }} />
          </div>
          <div className="text-center">
            <p className="text-base font-semibold text-white mb-1">Sin equivalencias configuradas</p>
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
              Agrega equivalencias para que el sistema convierta automáticamente las unidades de compra.
            </p>
          </div>
          <button onClick={onAdd} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold" style={{ backgroundColor: '#f59e0b', color: '#1B3A6B' }}>
            <Plus size={16} />Agregar primera equivalencia
          </button>
        </div>
      ) : (
        <table className="w-full">
          <thead className="sticky top-0 z-10" style={{ backgroundColor: '#132240' }}>
            <tr className="border-b" style={{ borderColor: '#243f72' }}>
              {['Ingrediente','Unidad de Compra','Descripción','Unidad de Uso','Descripción','Factor','Notas','Acciones'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: 'rgba(255,255,255,0.45)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {equivalences.map(eq => (
              <tr key={eq.id} className="border-b transition-colors hover:bg-white/5" style={{ borderColor: '#1a2f52' }}>
                <td className="px-4 py-3.5">
                  <p className="text-sm font-semibold text-white">{eq.ingredientName}</p>
                  <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>Unidad base: {eq.ingredientUnit}</p>
                </td>
                <td className="px-4 py-3.5">
                  <span className="text-sm font-mono font-semibold" style={{ color: '#f59e0b' }}>1 {eq.bulkUnit}</span>
                </td>
                <td className="px-4 py-3.5 text-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>{eq.bulkDescription || '—'}</td>
                <td className="px-4 py-3.5">
                  <span className="text-sm font-mono font-semibold text-green-400">{eq.conversionFactor} {eq.subUnit}</span>
                </td>
                <td className="px-4 py-3.5 text-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>{eq.subUnitDescription || '—'}</td>
                <td className="px-4 py-3.5">
                  <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg w-fit" style={{ backgroundColor: 'rgba(129,140,248,0.15)', border: '1px solid rgba(129,140,248,0.25)' }}>
                    <span className="text-xs font-mono font-semibold" style={{ color: '#818cf8' }}>
                      1 {eq.bulkUnit} = {eq.conversionFactor} {eq.subUnit}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3.5 text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>{eq.notes || '—'}</td>
                <td className="px-4 py-3.5">
                  <div className="flex items-center gap-1">
                    <button onClick={() => onEdit(eq)} className="p-1.5 rounded-lg hover:bg-white/10" title="Editar">
                      <Pencil size={13} style={{ color: 'rgba(255,255,255,0.5)' }} />
                    </button>
                    <button onClick={() => onDelete(eq.id)} className="p-1.5 rounded-lg hover:bg-red-500/20" title="Eliminar">
                      <Trash2 size={13} className="text-red-400" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
