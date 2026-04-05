'use client';

import { useState, useEffect } from 'react';
import { RefreshCw, Bell, Calendar } from 'lucide-react';

export default function DashboardHeader() {
  const [timeStr, setTimeStr] = useState('');
  const [dateStr, setDateStr] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setTimeStr(now?.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }));
      setDateStr(now?.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }));
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    // Backend integration point: trigger data refetch
    setTimeout(() => setRefreshing(false), 1200);
  };

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <div>
        <h1 className="text-xl font-bold text-white">Panel de Operaciones</h1>
        <div className="flex items-center gap-2 mt-0.5">
          <Calendar size={13} style={{ color: 'rgba(255,255,255,0.4)' }} />
          <p className="text-xs capitalize" style={{ color: 'rgba(255,255,255,0.4)' }}>
            {dateStr}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl tabular-nums"
          style={{ backgroundColor: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)' }}>
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 pulse-amber" />
          <span className="text-sm font-semibold tabular-nums" style={{ color: '#f59e0b' }}>
            {timeStr}
          </span>
        </div>

        <button
          onClick={handleRefresh}
          className="p-2 rounded-xl transition-all active:scale-95 hover:opacity-80"
          style={{ backgroundColor: '#1a2535', border: '1px solid #2a3f5f' }}
          aria-label="Actualizar datos"
          title="Actualizar datos"
        >
          <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} style={{ color: 'rgba(255,255,255,0.5)' }} />
        </button>

        <button
          className="relative p-2 rounded-xl transition-all active:scale-95 hover:opacity-80"
          style={{ backgroundColor: '#1a2535', border: '1px solid #2a3f5f' }}
          aria-label="Notificaciones"
          title="Notificaciones"
        >
          <Bell size={15} style={{ color: 'rgba(255,255,255,0.5)' }} />
          <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500" />
        </button>
      </div>
    </div>
  );
}