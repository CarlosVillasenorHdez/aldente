'use client';
/**
 * useNominaConfig — lee la configuración del modelo de nómina del tenant
 *
 * La config se guarda en system_config con keys:
 *   nomina_modelo:              'formal' | 'outsourcing' | 'mixto' | 'minimo'
 *   nomina_incluye_imss:        'true' | 'false'
 *   nomina_incluye_infonavit:   'true' | 'false'
 *   nomina_incluye_prestaciones:'true' | 'false'
 */

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { getCurrentTenantId as getTenantId } from '@/lib/tenantStore';

export type ModeloNomina = 'formal' | 'outsourcing' | 'mixto' | 'minimo';

export interface NominaConfig {
  modelo:              ModeloNomina;
  incluyeIMSS:         boolean;
  incluyeINFONAVIT:    boolean;
  incluyePrestaciones: boolean;
  loaded:              boolean;
}

const DEFAULTS: NominaConfig = {
  modelo:              'formal',
  incluyeIMSS:         true,
  incluyeINFONAVIT:    true,
  incluyePrestaciones: true,
  loaded:              false,
};

export function useNominaConfig(tenantIdOverride?: string | null): NominaConfig {
  const supabase = createClient();
  const [config, setConfig] = useState<NominaConfig>(DEFAULTS);

  useEffect(() => {
    const tid = tenantIdOverride ?? getTenantId();
    if (!tid) { setConfig({ ...DEFAULTS, loaded: true }); return; }

    supabase
      .from('system_config')
      .select('config_key, config_value')
      .eq('tenant_id', tid)
      .in('config_key', [
        'nomina_modelo',
        'nomina_incluye_imss',
        'nomina_incluye_infonavit',
        'nomina_incluye_prestaciones',
      ])
      .then(({ data }) => {
        const map: Record<string, string> = {};
        (data ?? []).forEach((r: any) => { map[r.config_key] = r.config_value; });

        setConfig({
          modelo:              (map['nomina_modelo'] ?? 'formal') as ModeloNomina,
          incluyeIMSS:         map['nomina_incluye_imss'] !== 'false',
          incluyeINFONAVIT:    map['nomina_incluye_infonavit'] !== 'false',
          incluyePrestaciones: map['nomina_incluye_prestaciones'] !== 'false',
          loaded:              true,
        });
      });
  }, [supabase, tenantIdOverride]);

  return config;
}
