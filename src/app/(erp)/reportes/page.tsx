'use client';

import AppLayout from '@/components/AppLayout';
import ReportesManagement from './components/ReportesManagement';
import ReportesMejorados from './components/ReportesMejorados';
import ReportesConsolidado from './components/ReportesConsolidado';
import UpgradeGate from '@/components/UpgradeGate';
import { useState, useEffect } from 'react';
import { useFeatures } from '@/hooks/useFeatures';

type View = 'ventas' | 'avanzado' | 'consolidado';

export default function ReportesPage() {
  const { features } = useFeatures();
  const [activeView, setActiveView] = useState<View>('ventas');

  useEffect(() => {
    if (features.multiSucursal) setActiveView('consolidado');
  }, [features.multiSucursal]);

  const tabs = [
    { id: 'ventas' as View,       label: '📊 Ventas',                    show: true },
    { id: 'avanzado' as View,     label: '📈 P&L · COGS · Análisis',    show: true },
    { id: 'consolidado' as View,  label: '🏢 Multi-Sucursal',            show: features.multiSucursal },
  ].filter(t => t.show);

  return (
    <AppLayout title="Reportes" subtitle="Análisis de ventas y rendimiento">
      <div className="space-y-4">

        {/* Tab bar */}
        <div className="flex gap-2 border-b border-gray-200 pb-0 overflow-x-auto">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveView(tab.id)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeView === tab.id
                  ? 'border-amber-500 text-amber-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Ventas básicas — always visible */}
        {activeView === 'ventas' && <ReportesMejorados />}

        {/* P&L, COGS, Market Basket — Estándar+ */}
        {activeView === 'avanzado' && (
          <UpgradeGate
            feature="reportes"
            requiredPlan="negocio"
            title="Reportes avanzados: P&L, COGS y Market Basket"
            description="Descubre cuánto te cuesta realmente cada platillo, cuál es tu margen real y qué productos se venden juntos. El análisis que necesitas para tomar decisiones con números reales."
            blurAmount={8}
          >
            <ReportesManagement />
          </UpgradeGate>
        )}

        {/* Multi-sucursal consolidado — Premium */}
        {activeView === 'consolidado' && features.multiSucursal && (
          <UpgradeGate
            feature="multiSucursal"
            requiredPlan="empresa"
            title="Reportes consolidados por sucursal"
            description="Compara el rendimiento de todas tus sucursales en un solo lugar. Ventas, costos y márgenes lado a lado."
            blurAmount={8}
          >
            <ReportesConsolidado />
          </UpgradeGate>
        )}

      </div>
    </AppLayout>
  );
}
