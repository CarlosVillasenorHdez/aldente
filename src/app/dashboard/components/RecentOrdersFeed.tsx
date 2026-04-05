'use client';

import { ShoppingBag, CheckCircle, Clock, XCircle, Loader2 } from 'lucide-react';

type OrderStatus = 'entregada' | 'preparando' | 'pendiente' | 'cancelada';

interface RecentOrder {
  id: string;
  ordenId: string;
  mesa: number;
  mesero: string;
  total: number;
  status: OrderStatus;
  minutosAtras: number;
  itemCount: number;
}

// Backend integration point: replace with Supabase realtime subscription on orders table
const recentOrders: RecentOrder[] = [
  { id: 'ro-001', ordenId: 'ORD-087', mesa: 13, mesero: 'Diego H.', total: 580, status: 'preparando', minutosAtras: 8, itemCount: 2 },
  { id: 'ro-002', ordenId: 'ORD-086', mesa: 8, mesero: 'Luis G.', total: 420, status: 'entregada', minutosAtras: 12, itemCount: 3 },
  { id: 'ro-003', ordenId: 'ORD-085', mesa: 6, mesero: 'Diego H.', total: 760, status: 'preparando', minutosAtras: 14, itemCount: 2 },
  { id: 'ro-004', ordenId: 'ORD-084', mesa: 11, mesero: 'Luis G.', total: 310, status: 'entregada', minutosAtras: 19, itemCount: 1 },
  { id: 'ro-005', ordenId: 'ORD-083', mesa: 4, mesero: 'Luis G.', total: 1240, status: 'preparando', minutosAtras: 22, itemCount: 3 },
  { id: 'ro-006', ordenId: 'ORD-082', mesa: 7, mesero: 'Diego H.', total: 890, status: 'entregada', minutosAtras: 28, itemCount: 4 },
  { id: 'ro-007', ordenId: 'ORD-081', mesa: 1, mesero: 'Luis G.', total: 190, status: 'entregada', minutosAtras: 31, itemCount: 1 },
  { id: 'ro-008', ordenId: 'ORD-080', mesa: 10, mesero: 'Diego H.', total: 650, status: 'entregada', minutosAtras: 35, itemCount: 2 },
];

const STATUS_ICON: Record<OrderStatus, { icon: React.ReactNode; color: string }> = {
  entregada:  { icon: <CheckCircle size={13} />, color: '#4ade80' },
  preparando: { icon: <Loader2 size={13} className="animate-spin" />, color: '#fbbf24' },
  pendiente:  { icon: <Clock size={13} />, color: 'rgba(255,255,255,0.45)' },
  cancelada:  { icon: <XCircle size={13} />, color: '#f87171' },
};

function formatMXN(v: number) {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(v);
}

export default function RecentOrdersFeed() {
  return (
    <div className="rounded-2xl p-5 flex flex-col" style={{ backgroundColor: '#1a2535', border: '1px solid #2a3f5f' }}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.2)' }}>
            <ShoppingBag size={15} style={{ color: '#60a5fa' }} />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Órdenes Recientes</h3>
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>Últimos movimientos</p>
          </div>
        </div>
        <div className="w-2 h-2 rounded-full bg-green-400 pulse-amber" title="En vivo" />
      </div>

      <div className="flex flex-col gap-1 overflow-y-auto" style={{ maxHeight: 380 }}>
        {recentOrders.map(order => {
          const statusCfg = STATUS_ICON[order.status];
          return (
            <div
              key={order.id}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 hover:bg-white/5 cursor-pointer"
            >
              <div style={{ color: statusCfg.color, flexShrink: 0 }}>
                {statusCfg.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-white">{order.ordenId}</span>
                  <span className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>·</span>
                  <span className="text-xs" style={{ color: 'rgba(255,255,255,0.45)' }}>Mesa {order.mesa}</span>
                </div>
                <p className="text-xs truncate" style={{ color: 'rgba(255,255,255,0.3)' }}>
                  {order.mesero} · {order.itemCount} ítem{order.itemCount > 1 ? 's' : ''}
                </p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-xs font-semibold tabular-nums text-white">{formatMXN(order.total)}</p>
                <p className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>hace {order.minutosAtras}m</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}