'use client';
import { useState } from 'react';
import AppLayout from '@/components/AppLayout';
import LoyaltyManagement from './components/LoyaltyManagement';
import TermoMembership from './components/TermoMembership';
import { Star, Coffee } from 'lucide-react';

const TABS = [
  { id: 'puntos', label: 'Programa de puntos', icon: Star },
  { id: 'termo',  label: 'Membresía Termo',    icon: Coffee },
] as const;

type Tab = typeof TABS[number]['id'];

export default function LoyaltyPage() {
  const [tab, setTab] = useState<Tab>('puntos');

  return (
    <AppLayout title="Lealtad" subtitle="Programa de puntos y membresías">
      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl mb-6 w-fit">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === id
                ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <Icon size={15} />
            {label}
          </button>
        ))}
      </div>

      {tab === 'puntos' && <LoyaltyManagement />}
      {tab === 'termo'  && <TermoMembership />}
    </AppLayout>
  );
}
