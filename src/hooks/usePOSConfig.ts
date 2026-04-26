'use client';

/**
 * usePOSConfig — configuración del restaurante para el POS
 *
 * Extrae de POSClient todo lo relacionado con:
 *   - Tipo de establecimiento y configuraciones
 *   - Horarios de negocio y validación de hora actual
 *   - Nombre del restaurante y sucursal activa
 *   - Slug del tenant (para carta QR)
 *   - Configuración de impresora
 */

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { getCurrentTenantId as getTenantId } from '@/lib/tenantStore';

export interface PrinterConfig {
  headerLine1:     string;
  headerLine2:     string;
  footerText:      string;
  separatorChar:   string;
  paperWidth:      58 | 80;
  autoCut:         boolean;
  showOrderNumber: boolean;
  showDate:        boolean;
  showMesa:        boolean;
  showMesero:      boolean;
  showSubtotal:    boolean;
  showIva:         boolean;
  showDiscount:    boolean;
  showUnitPrice:   boolean;
}

export interface BusinessHour {
  day: string;
  open: boolean;
  from: string;
  to: string;
}

export function usePOSConfig() {
  const supabase = createClient();

  const [establishmentType, setEstablishmentType] = useState<'restaurante'|'cafeteria'|'bar'|'mixto'>('restaurante');
  const [blockSaleNoStock, setBlockSaleNoStock]   = useState(false);
  const [businessHours, setBusinessHours]         = useState<BusinessHour[]>([]);
  const [outsideHours, setOutsideHours]           = useState(false);
  const [branchName, setBranchName]               = useState('Sucursal Principal');
  const [restaurantName, setRestaurantName]       = useState('');
  const [tenantSlug, setTenantSlug]               = useState<string | null>(null);
  const [printerConfig, setPrinterConfig]         = useState<PrinterConfig | null>(null);
  const [ivaPercent, setIvaPercent]               = useState(16);
  const [ivaIncludedInPrice, setIvaIncludedInPrice] = useState(true);

  const checkBusinessHours = useCallback((hrs: BusinessHour[]) => {
    const now = new Date();
    const days = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
    const dayKey = days[now.getDay()];
    const todayHours = hrs.find(h => h.day === dayKey);
    if (!todayHours) return;
    if (!todayHours.open) { setOutsideHours(true); return; }
    const timeStr = now.toTimeString().slice(0, 5);
    if (timeStr < todayHours.from || timeStr > todayHours.to) setOutsideHours(true);
  }, []);

  useEffect(() => {
    const tid = getTenantId();
    if (!tid) return;

    // Config operacional
    supabase.from('system_config')
      .select('config_key, config_value')
      .eq('tenant_id', tid)
      .in('config_key', ['establishment_type', 'block_sale_no_stock', 'iva_percent', 'iva_included_in_price'])
      .then(({ data }) => {
        (data || []).forEach((r: any) => {
          if (r.config_key === 'establishment_type')    setEstablishmentType(r.config_value);
          if (r.config_key === 'block_sale_no_stock')   setBlockSaleNoStock(r.config_value === 'true');
          if (r.config_key === 'iva_percent')           setIvaPercent(Number(r.config_value) || 16);
          if (r.config_key === 'iva_included_in_price') setIvaIncludedInPrice(r.config_value !== 'false');
        });
      });

    // Horarios
    supabase.from('system_config')
      .select('config_value')
      .eq('tenant_id', tid)
      .eq('config_key', 'business_hours')
      .single()
      .then(({ data }) => {
        if (data?.config_value) {
          try {
            const hrs: BusinessHour[] = JSON.parse(data.config_value);
            setBusinessHours(hrs);
            checkBusinessHours(hrs);
          } catch {}
        }
      });

    // Nombre del restaurante y sucursal
    supabase.from('system_config')
      .select('config_key, config_value')
      .eq('tenant_id', tid)
      .in('config_key', ['branch_name', 'restaurant_name'])
      .then(({ data }) => {
        data?.forEach((r: any) => {
          if (r.config_key === 'branch_name')     setBranchName(r.config_value);
          if (r.config_key === 'restaurant_name') setRestaurantName(r.config_value);
        });
      });

    // Slug del tenant
    supabase.from('tenants')
      .select('slug')
      .eq('id', tid)
      .single()
      .then(({ data }) => { if (data?.slug) setTenantSlug(data.slug); });

    // Impresora
    supabase.from('printer_config')
      .select('*')
      .eq('tenant_id', tid)
      .limit(1)
      .single()
      .then(({ data }) => {
        if (data) setPrinterConfig({
          headerLine1:     data.header_line1,
          headerLine2:     data.header_line2,
          footerText:      data.footer_text,
          separatorChar:   data.separator_char,
          paperWidth:      data.paper_width as 58 | 80,
          autoCut:         data.auto_cut,
          showOrderNumber: data.show_order_number,
          showDate:        data.show_date,
          showMesa:        data.show_mesa,
          showMesero:      data.show_mesero,
          showSubtotal:    data.show_subtotal,
          showIva:         data.show_iva,
          showDiscount:    data.show_discount,
          showUnitPrice:   data.show_unit_price,
        });
      });

    // Sucursal activa del localStorage
    try {
      const stored = localStorage.getItem('sr_active_branch');
      if (stored) {
        const b = JSON.parse(stored);
        if (b?.name) setBranchName(b.name);
      }
    } catch {}

    // Escuchar cambios de sucursal
    const branchHandler = (e: Event) => {
      const d = (e as CustomEvent).detail;
      if (d?.name) setBranchName(d.name);
    };
    window.addEventListener('branch-changed', branchHandler);
    return () => window.removeEventListener('branch-changed', branchHandler);
  }, [checkBusinessHours]);

  return {
    establishmentType,
    blockSaleNoStock,
    businessHours,
    outsideHours,
    branchName,
    setBranchName,
    restaurantName,
    tenantSlug,
    printerConfig,
    ivaPercent,
    ivaIncludedInPrice,
  };
}
