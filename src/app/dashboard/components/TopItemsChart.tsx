'use client';

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts';

// Backend integration point: replace with real menu item sales from Supabase
const topItemsData = [
  { nombre: 'Pasta Carbonara', vendidos: 34, ingresos: 5440 },
  { nombre: 'Risotto Funghi', vendidos: 28, ingresos: 5320 },
  { nombre: 'Pollo al Limón', vendidos: 26, ingresos: 4420 },
  { nombre: 'Tiramisú', vendidos: 22, ingresos: 2200 },
  { nombre: 'Bruschetta', vendidos: 19, ingresos: 1900 },
  { nombre: 'Salmón Grille', vendidos: 17, ingresos: 4080 },
  { nombre: 'Pizza Margherita', vendidos: 15, ingresos: 2700 },
];

const BAR_COLORS = ['#f59e0b', '#fbbf24', '#fcd34d', '#fde68a', '#fef3c7', '#fef9ee', '#fffbf0'];

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
  const vendidos = payload.find(p => p.dataKey === 'vendidos')?.value ?? 0;
  return (
    <div className="rounded-xl px-4 py-3 shadow-xl"
      style={{ backgroundColor: '#1a2535', border: '1px solid #2a3f5f' }}>
      <p className="text-xs font-semibold mb-1" style={{ color: 'rgba(255,255,255,0.5)' }}>{label}</p>
      <p className="text-sm font-bold text-white">{vendidos} <span className="font-normal text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>porciones</span></p>
    </div>
  );
}

export default function TopItemsChart() {
  return (
    <div className="rounded-2xl p-5" style={{ backgroundColor: '#1a2535', border: '1px solid #2a3f5f' }}>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-sm font-semibold text-white">Platillos Más Vendidos</h3>
          <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>Unidades vendidas hoy</p>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={topItemsData} layout="vertical" margin={{ top: 0, right: 10, bottom: 0, left: 0 }}>
          <CartesianGrid stroke="rgba(255,255,255,0.05)" strokeDasharray="3 3" horizontal={false} />
          <XAxis
            type="number"
            tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            type="category"
            dataKey="nombre"
            tick={{ fill: 'rgba(255,255,255,0.55)', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={110}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
          <Bar dataKey="vendidos" radius={[0, 4, 4, 0]} barSize={14}>
            {topItemsData.map((_, index) => (
              <Cell key={`cell-item-${index}`} fill={BAR_COLORS[index % BAR_COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}