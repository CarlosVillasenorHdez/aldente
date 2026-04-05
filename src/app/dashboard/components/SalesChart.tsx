'use client';

import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from 'recharts';

// Backend integration point: replace with real hourly sales data from Supabase
const hourlySalesData = [
  { hora: '09:00', ventas: 840, ordenes: 3 },
  { hora: '10:00', ventas: 1240, ordenes: 5 },
  { hora: '11:00', ventas: 980, ordenes: 4 },
  { hora: '12:00', ventas: 3120, ordenes: 11 },
  { hora: '13:00', ventas: 4580, ordenes: 16 },
  { hora: '14:00', ventas: 3890, ordenes: 13 },
  { hora: '15:00', ventas: 1760, ordenes: 6 },
  { hora: '16:00', ventas: 920, ordenes: 3 },
  { hora: '17:00', ventas: 640, ordenes: 2 },
  { hora: '18:00', ventas: 1880, ordenes: 7 },
  { hora: '19:00', ventas: 0, ordenes: 0 },
];

interface TooltipPayload {
  value: number;
  dataKey: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayload[];
  label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload || !payload.length) return null;
  const ventas = payload.find(p => p.dataKey === 'ventas')?.value ?? 0;
  const ordenes = payload.find(p => p.dataKey === 'ordenes')?.value ?? 0;
  return (
    <div className="rounded-xl px-4 py-3 shadow-xl"
      style={{ backgroundColor: '#1a2535', border: '1px solid #2a3f5f', minWidth: 140 }}>
      <p className="text-xs font-semibold mb-2" style={{ color: 'rgba(255,255,255,0.5)' }}>{label}</p>
      <p className="text-sm font-bold text-white tabular-nums">
        {new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(ventas)}
      </p>
      <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.45)' }}>{ordenes} órdenes</p>
    </div>
  );
}

export default function SalesChart() {
  return (
    <div className="rounded-2xl p-5" style={{ backgroundColor: '#1a2535', border: '1px solid #2a3f5f' }}>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-sm font-semibold text-white">Ventas por Hora</h3>
          <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>Hoy — servicio en curso</p>
        </div>
        <div className="flex items-center gap-4 text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: '#f59e0b' }} />
            Ventas MXN
          </span>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={hourlySalesData} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.25} />
              <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="rgba(255,255,255,0.05)" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="hora"
            tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={v => `$${(v / 1000).toFixed(0)}k`}
            width={42}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(245,158,11,0.2)', strokeWidth: 1 }} />
          <ReferenceLine y={2500} stroke="rgba(245,158,11,0.2)" strokeDasharray="4 4" label={{ value: 'Meta/h', fill: 'rgba(245,158,11,0.5)', fontSize: 10, position: 'right' }} />
          <Area
            type="monotone"
            dataKey="ventas"
            stroke="#f59e0b"
            strokeWidth={2}
            fill="url(#salesGradient)"
            dot={false}
            activeDot={{ r: 4, fill: '#f59e0b', stroke: '#0f1923', strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}