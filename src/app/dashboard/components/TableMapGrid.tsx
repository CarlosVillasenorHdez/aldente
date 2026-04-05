'use client';

import { useState } from 'react';
import { Users, Clock } from 'lucide-react';

type TableStatus = 'disponible' | 'ocupada' | 'esperando_pago' | 'limpieza' | 'reservada';

interface RestaurantTable {
  id: string;
  numero: number;
  capacidad: number;
  status: TableStatus;
  mesero?: string;
  tiempoOcupada?: number;
  comensales?: number;
  ordenId?: string;
}

// Backend integration point: replace with real-time table data from Supabase
const tablesData: RestaurantTable[] = [
  { id: 'table-01', numero: 1, capacidad: 2, status: 'ocupada', mesero: 'Luis G.', tiempoOcupada: 42, comensales: 2, ordenId: 'ORD-081' },
  { id: 'table-02', numero: 2, capacidad: 4, status: 'disponible', capacidad: 4 },
  { id: 'table-03', numero: 3, capacidad: 4, status: 'esperando_pago', mesero: 'Diego H.', tiempoOcupada: 78, comensales: 3, ordenId: 'ORD-074' },
  { id: 'table-04', numero: 4, capacidad: 6, status: 'ocupada', mesero: 'Luis G.', tiempoOcupada: 25, comensales: 5, ordenId: 'ORD-083' },
  { id: 'table-05', numero: 5, capacidad: 2, status: 'limpieza', capacidad: 2 },
  { id: 'table-06', numero: 6, capacidad: 4, status: 'ocupada', mesero: 'Diego H.', tiempoOcupada: 15, comensales: 4, ordenId: 'ORD-085' },
  { id: 'table-07', numero: 7, capacidad: 8, status: 'reservada', capacidad: 8 },
  { id: 'table-08', numero: 8, capacidad: 4, status: 'disponible', capacidad: 4 },
  { id: 'table-09', numero: 9, capacidad: 4, status: 'ocupada', mesero: 'Luis G.', tiempoOcupada: 55, comensales: 2, ordenId: 'ORD-079' },
  { id: 'table-10', numero: 10, capacidad: 2, status: 'ocupada', mesero: 'Diego H.', tiempoOcupada: 38, comensales: 2, ordenId: 'ORD-080' },
  { id: 'table-11', numero: 11, capacidad: 6, status: 'disponible', capacidad: 6 },
  { id: 'table-12', numero: 12, capacidad: 4, status: 'esperando_pago', mesero: 'Luis G.', tiempoOcupada: 92, comensales: 4, ordenId: 'ORD-071' },
  { id: 'table-13', numero: 13, capacidad: 4, status: 'ocupada', mesero: 'Diego H.', tiempoOcupada: 8, comensales: 3, ordenId: 'ORD-087' },
  { id: 'table-14', numero: 14, capacidad: 2, status: 'disponible', capacidad: 2 },
  { id: 'table-15', numero: 15, capacidad: 6, status: 'limpieza', capacidad: 6 },
  { id: 'table-16', numero: 16, capacidad: 4, status: 'ocupada', mesero: 'Luis G.', tiempoOcupada: 62, comensales: 4, ordenId: 'ORD-077' },
];

const STATUS_CONFIG: Record<TableStatus, { label: string; bg: string; border: string; dot: string; textColor: string }> = {
  disponible:      { label: 'Disponible',     bg: 'rgba(34,197,94,0.08)',   border: 'rgba(34,197,94,0.25)',   dot: '#4ade80', textColor: '#4ade80' },
  ocupada:         { label: 'Ocupada',         bg: 'rgba(59,130,246,0.1)',   border: 'rgba(59,130,246,0.3)',   dot: '#60a5fa', textColor: '#93c5fd' },
  esperando_pago:  { label: 'Esp. Pago',       bg: 'rgba(245,158,11,0.1)',   border: 'rgba(245,158,11,0.35)',  dot: '#f59e0b', textColor: '#fbbf24' },
  limpieza:        { label: 'Limpieza',        bg: 'rgba(148,163,184,0.08)', border: 'rgba(148,163,184,0.2)',  dot: '#94a3b8', textColor: '#94a3b8' },
  reservada:       { label: 'Reservada',       bg: 'rgba(168,85,247,0.1)',   border: 'rgba(168,85,247,0.3)',   dot: '#c084fc', textColor: '#c084fc' },
};

const ALL_STATUSES: TableStatus[] = ['disponible', 'ocupada', 'esperando_pago', 'limpieza', 'reservada'];

export default function TableMapGrid() {
  const [filter, setFilter] = useState<TableStatus | 'todas'>('todas');
  const [hoveredTable, setHoveredTable] = useState<string | null>(null);

  const filtered = filter === 'todas' ? tablesData : tablesData.filter(t => t.status === filter);

  const counts = tablesData.reduce<Record<string, number>>((acc, t) => {
    acc[t.status] = (acc[t.status] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="rounded-2xl p-5" style={{ backgroundColor: '#1a2535', border: '1px solid #2a3f5f' }}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-5">
        <div>
          <h3 className="text-sm font-semibold text-white">Mapa de Mesas</h3>
          <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
            {tablesData.filter(t => t.status === 'ocupada' || t.status === 'esperando_pago').length} de {tablesData.length} mesas activas
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFilter('todas')}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
            style={{
              backgroundColor: filter === 'todas' ? 'rgba(245,158,11,0.2)' : 'rgba(255,255,255,0.05)',
              color: filter === 'todas' ? '#f59e0b' : 'rgba(255,255,255,0.45)',
              border: `1px solid ${filter === 'todas' ? 'rgba(245,158,11,0.3)' : 'rgba(255,255,255,0.08)'}`,
            }}
          >
            Todas ({tablesData.length})
          </button>
          {ALL_STATUSES.map(s => {
            const cfg = STATUS_CONFIG[s];
            const count = counts[s] ?? 0;
            if (!count) return null;
            return (
              <button
                key={`filter-${s}`}
                onClick={() => setFilter(s)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                style={{
                  backgroundColor: filter === s ? cfg.bg : 'rgba(255,255,255,0.05)',
                  color: filter === s ? cfg.textColor : 'rgba(255,255,255,0.45)',
                  border: `1px solid ${filter === s ? cfg.border : 'rgba(255,255,255,0.08)'}`,
                }}
              >
                {cfg.label} ({count})
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-8 xl:grid-cols-8 2xl:grid-cols-8 gap-3">
        {filtered.map(table => {
          const cfg = STATUS_CONFIG[table.status];
          const isHovered = hoveredTable === table.id;
          return (
            <div
              key={table.id}
              onMouseEnter={() => setHoveredTable(table.id)}
              onMouseLeave={() => setHoveredTable(null)}
              className="relative rounded-xl p-3 cursor-pointer transition-all duration-150"
              style={{
                backgroundColor: isHovered ? cfg.bg : 'rgba(255,255,255,0.03)',
                border: `1px solid ${isHovered ? cfg.border : 'rgba(255,255,255,0.08)'}`,
                transform: isHovered ? 'translateY(-1px)' : 'none',
              }}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-white">{table.numero}</span>
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: cfg.dot }} />
              </div>
              <div className="flex items-center gap-1 mb-1">
                <Users size={10} style={{ color: 'rgba(255,255,255,0.35)' }} />
                <span className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>{table.capacidad}</span>
              </div>
              {table.tiempoOcupada && (
                <div className="flex items-center gap-1">
                  <Clock size={10} style={{ color: table.tiempoOcupada > 60 ? '#f87171' : 'rgba(255,255,255,0.35)' }} />
                  <span className="text-xs tabular-nums"
                    style={{ color: table.tiempoOcupada > 60 ? '#f87171' : 'rgba(255,255,255,0.35)' }}>
                    {table.tiempoOcupada}m
                  </span>
                </div>
              )}
              <div className="mt-2">
                <span className="text-xs font-medium" style={{ color: cfg.textColor }}>
                  {cfg.label}
                </span>
              </div>
              {table.mesero && isHovered && (
                <div className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 rounded-lg text-xs whitespace-nowrap z-10 pointer-events-none"
                  style={{ backgroundColor: '#0f1923', border: '1px solid #2a3f5f', color: 'rgba(255,255,255,0.7)' }}>
                  {table.mesero} · {table.ordenId}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-4 mt-4 pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        {ALL_STATUSES.map(s => {
          const cfg = STATUS_CONFIG[s];
          return (
            <div key={`legend-${s}`} className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: cfg.dot }} />
              <span className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>{cfg.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}