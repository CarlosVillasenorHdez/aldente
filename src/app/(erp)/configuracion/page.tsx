'use client';

import AppLayout from '@/components/AppLayout';
import ConfiguracionManagement from './components/ConfiguracionManagement';
import HelpDrawer from '@/components/HelpDrawer';
import { HELP_CONFIGURACION } from '@/lib/helpContent';

export default function ConfiguracionPage() {
  return (
    <AppLayout
      title="Configuración"
      subtitle="Ajustes del restaurante"
      headerExtra={<HelpDrawer config={HELP_CONFIGURACION} />}
    >
      <ConfiguracionManagement />
    </AppLayout>
  );
}