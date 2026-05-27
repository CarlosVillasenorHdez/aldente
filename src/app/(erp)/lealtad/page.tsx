'use client';
import { useState } from 'react';
import AppLayout from '@/components/AppLayout';
import LoyaltyHub from './components/LoyaltyHub';
import LoyaltyCRM from './components/LoyaltyCRM';
import { Users, BarChart2 } from 'lucide-react';

const TABS = [
  { id: 'clientes',  label: 'Clientes',  icon: Users     },
  { id: 'analisis',  label: 'Análisis',  icon: BarChart2 },
] as const;

type Tab = typeof TABS[number]['id'];

export default function LoyaltyPage() {
  const [tab, setTab] = useState<Tab>('clientes');
  return (
    <AppLayout title="Lealtad" subtitle="Programa de clientes frecuentes">
      <div className="flex gap-1 bg-[#243f72]/60 dark:bg-gray-800 p-1 rounded-xl mb-6 w-fit">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === id
                ? 'bg-[#162d55] dark:bg-gray-900 text-white dark:text-white shadow-sm'
                : 'text-white/45 dark:text-white/40 hover:text-white/70 dark:hover:text-white/30'
            }`}>
            <Icon size={15} />
            {label}
          </button>
        ))}
      </div>
      {tab === 'clientes' && <LoyaltyHub />}
      {tab === 'analisis' && <LoyaltyCRM />}
    </AppLayout>
  );
}
