'use client';

import AppLayout from '@/components/AppLayout';
import ReportesMejorados from './components/ReportesMejorados';
import ReportesConsolidado from './components/ReportesConsolidado';
import AnalisisFinanciero from './components/AnalisisFinanciero';
import PresupuestoVsReal from './components/PresupuestoVsReal';
import UpgradeGate from '@/components/UpgradeGate';
import { useState, useEffect } from 'react';
import { useFeatures } from '@/hooks/useFeatures';
import HelpDrawer from '@/components/HelpDrawer';
import { HELP_REPORTES } from '@/lib/helpContent';

type View = 'ventas' | 'financiero' | 'presupuesto' | 'consolidado';

export default function ReportesPage() {
  const { features } = useFeatures();
  const [activeView, setActiveView] = useState<View>('ventas');

  useEffect(() => {
    if (features.multiSucursal) setActiveView('consolidado');
  }, [features.multiSucursal]);

  const tabs = [
    { id: 'ventas' as View,       label: '📊 Ventas & Platillos',  show: true },
    { id: 'financiero' as View,   label: '📋 P&L · Financiero',    show: true },
    { id: 'presupuesto' as View,  label: '🎯 Presupuesto vs Real', show: true },
    { id: 'consolidado' as View,  label: '🏢 Multi-Sucursal',      show: features.multiSucursal },
  ].filter(t => t.show);

  return (
    <AppLayout title="Reportes" subtitle="Análisis de ventas y rendimiento">
      <div className="space-y-4" style={{ minHeight: '100vh' }}>

        {/* Tab bar — dark theme */}
        <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid #243f72', paddingBottom: 0, overflowX: 'auto', alignItems: 'center' }}>
          <div style={{ marginLeft: 'auto', paddingRight: 8 }}><HelpDrawer config={HELP_REPORTES} /></div>
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveView(tab.id)}
              style={{
                padding: '10px 18px 8px', fontSize: 13, fontWeight: 500,
                color: activeView === tab.id ? '#f59e0b' : 'rgba(255,255,255,0.45)',
                background: 'none', border: 'none',
                borderBottom: `2px solid ${activeView === tab.id ? '#f59e0b' : 'transparent'}`,
                cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.15s',
              }}
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
