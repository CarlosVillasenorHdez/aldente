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
      <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl mb-6 w-fit">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === id
                ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
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
