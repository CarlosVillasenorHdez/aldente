'use client';

import { useState, useEffect } from 'react';
import { Flame, AlertTriangle, ChefHat } from 'lucide-react';

type KitchenStatus = 'pendiente' | 'preparando' | 'listo';

interface KitchenOrder {
  id: string;
  ordenId: string;
  mesa: number;
  items: string[];
  status: KitchenStatus;
  tiempoInicio: number;
  mesero: string;
}

// Backend integration point: replace with real-time Supabase subscription on kitchen_queue table
const initialQueue: KitchenOrder[] = [
  { id: 'kq-001', ordenId: 'ORD-087', mesa: 13, items: ['Pasta Carbonara', 'Risotto Funghi'], status: 'preparando', tiempoInicio: 8, mesero: 'Diego H.' },
  { id: 'kq-002', ordenId: 'ORD-085', mesa: 6, items: ['Pollo al Limón', 'Bruschetta x2'], status: 'preparando', tiempoInicio: 14, mesero: 'Diego H.' },
  { id: 'kq-003', ordenId: 'ORD-083', mesa: 4, items: ['Salmón Grille', 'Pizza Margherita', 'Tiramisú'], status: 'preparando', tiempoInicio: 22, mesero: 'Luis G.' },
  { id: 'kq-004', ordenId: 'ORD-081', mesa: 1, items: ['Risotto Funghi'], status: 'listo', tiempoInicio: 31, mesero: 'Luis G.' },
  { id: 'kq-005', ordenId: 'ORD-088', mesa: 9, items: ['Pasta Carbonara x2', 'Ensalada César'], status: 'pendiente', tiempoInicio: 2, mesero: 'Luis G.' },
];

const STATUS_CONFIG_KITCHEN: Record<KitchenStatus, { label: string; color: string; bg: string; border: string }> = {
  pendiente:   { label: 'En espera',   color: 'rgba(255,255,255,0.5)', bg: 'rgba(255,255,255,0.05)', border: 'rgba(255,255,255,0.1)' },
  preparando:  { label: 'Preparando',  color: '#fbbf24',               bg: 'rgba(245,158,11,0.1)',   border: 'rgba(245,158,11,0.25)' },
  listo:       { label: 'Listo ✓',     color: '#4ade80',               bg: 'rgba(34,197,94,0.1)',    border: 'rgba(34,197,94,0.25)' },
};

function ElapsedTimer({ startMinutes }: { startMinutes: number }) {
  const [elapsed, setElapsed] = useState(startMinutes);
  useEffect(() => {
    const id = setInterval(() => setElapsed(v => v + 1), 60000);
    return () => clearInterval(id);
  }, []);
  const isOver = elapsed > 20;
  return (
    <span className="flex items-center gap-1 text-xs font-semibold tabular-nums"
      style={{ color: isOver ? '#f87171' : 'rgba(255,255,255,0.45)' }}>
      {isOver && <AlertTriangle size={10} />}
      {elapsed}m
    </span>
  );
}

export default function KitchenQueue() {
  const [queue] = useState<KitchenOrder[]>(initialQueue);

  const pendingCount = queue.filter(o => o.status === 'pendiente').length;
  const preparingCount = queue.filter(o => o.status === 'preparando').length;
  const readyCount = queue.filter(o => o.status === 'listo').length;

  return (
    <div className="rounded-2xl p-5 flex flex-col" style={{ backgroundColor: '#1a2535', border: '1px solid #2a3f5f' }}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.25)' }}>
            <Flame size={15} style={{ color: '#f59e0b' }} />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Cola de Cocina</h3>
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>{queue.length} órdenes</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="px-2 py-1 rounded-lg font-semibold" style={{ backgroundColor: 'rgba(245,158,11,0.1)', color: '#fbbf24' }}>
            {preparingCount} prep.
          </span>
          <span className="px-2 py-1 rounded-lg font-semibold" style={{ backgroundColor: 'rgba(34,197,94,0.1)', color: '#4ade80' }}>
            {readyCount} listos
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-2 overflow-y-auto" style={{ maxHeight: 340 }}>
        {queue.map(order => {
          const cfg = STATUS_CONFIG_KITCHEN[order.status];
          const isOverdue = order.tiempoInicio > 20 && order.status === 'preparando';
          return (
            <div
              key={order.id}
              className="rounded-xl p-3 transition-all duration-150"
              style={{
                backgroundColor: isOverdue ? 'rgba(239,68,68,0.08)' : cfg.bg,
                border: `1px solid ${isOverdue ? 'rgba(239,68,68,0.3)' : cfg.border}`,
              }}
            >
              <div className="flex items-start justify-between gap-2 mb-1.5">
                <div className="flex items-center gap-2">
                  <ChefHat size={12} style={{ color: 'rgba(255,255,255,0.35)' }} />
                  <span className="text-xs font-bold text-white">{order.ordenId}</span>
                  <span className="text-xs font-semibold px-1.5 py-0.5 rounded-md"
                    style={{ backgroundColor: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)' }}>
                    Mesa {order.mesa}
                  </span>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <ElapsedTimer startMinutes={order.tiempoInicio} />
                  <span className="text-xs font-semibold" style={{ color: cfg.color }}>{cfg.label}</span>
                </div>
              </div>
              <div className="flex flex-wrap gap-1 mt-1">
                {order.items.map(item => (
                  <span key={`${order.id}-item-${item}`} className="text-xs px-1.5 py-0.5 rounded-md"
                    style={{ backgroundColor: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.6)' }}>
                    {item}
                  </span>
                ))}
              </div>
              <p className="text-xs mt-1.5" style={{ color: 'rgba(255,255,255,0.3)' }}>
                Mesero: {order.mesero}
              </p>
            </div>
          );
        })}
      </div>

      {pendingCount > 0 && (
        <div className="mt-3 flex items-center gap-2 px-3 py-2 rounded-xl"
          style={{ backgroundColor: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
          <AlertTriangle size={13} style={{ color: '#f87171' }} />
          <p className="text-xs font-semibold" style={{ color: '#f87171' }}>
            {pendingCount} orden{pendingCount > 1 ? 'es' : ''} esperando asignación
          </p>
        </div>
      )}
    </div>
  );
}