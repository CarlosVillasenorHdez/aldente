'use client';

import AppLayout from '@/components/AppLayout';
import ReportesManagement from './components/ReportesManagement';
import ReportesMejorados from './components/ReportesMejorados';
import ReportesConsolidado from './components/ReportesConsolidado';
import AnalisisFinanciero from './components/AnalisisFinanciero';
import PresupuestoVsReal from './components/PresupuestoVsReal';
import UpgradeGate from '@/components/UpgradeGate';
import { useState, useEffect } from 'react';
import { useFeatures } from '@/hooks/useFeatures';

type View = 'ventas' | 'financiero' | 'presupuesto' | 'consolidado';

export default function ReportesPage() {
  const { features } = useFeatures();
  const [activeView, setActiveView] = useState<View>('ventas');

  useEffect(() => {
    if (features.multiSucursal) setActiveView('consolidado');
  }, [features.multiSucursal]);

  const tabs = [
    { id: 'ventas' as View,       label: '📊 Ventas',             show: true },
    { id: 'financiero' as View,   label: '📋 P&L · Financiero',   show: true },
    { id: 'presupuesto' as View,  label: '🎯 Presupuesto vs Real', show: true },
    { id: 'consolidado' as View,  label: '🏢 Multi-Sucursal',     show: features.multiSucursal },
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

        {/* Presupuesto vs Real */}
        {activeView === 'presupuesto' && <PresupuestoVsReal />}

        {/* P&L · Análisis Financiero */}
        {activeView === 'financiero' && (
          <UpgradeGate
            feature="reportes"
            requiredPlan="negocio"
            title="P&L · Análisis Financiero"
            description="Estado de Resultados real con COGS, nómina y gastos. Los números reales de tu restaurante."
            blurAmount={8}
          >
            <AnalisisFinanciero />
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
