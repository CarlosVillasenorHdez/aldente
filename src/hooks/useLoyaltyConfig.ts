'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { getCurrentTenantId as getTenantId } from '@/lib/tenantStore';

// ── Tipos ─────────────────────────────────────────────────────────────────────

export type MembershipTrigger =
  | 'manual'           // staff lo registra a mano
  | 'venta_producto'   // se activa al vender un producto del menú
  | 'pago_directo';    // el cliente paga por la membresía directamente

export type BenefitType =
  | 'producto_gratis'  // regala un producto del menú (WACC → costo)
  | 'descuento_pct'    // descuento % en la orden
  | 'precio_especial'  // el cajero aplica precio preferencial (texto libre)
  | 'puntos_extra'     // multiplica los puntos de lealtad
  | 'personalizado';   // beneficio personalizado (solo texto)

export interface LoyaltyPointsConfig {
  enabled:          boolean;
  pesosPerPoint:    number;   // $X gastados = 1 punto
  pointValue:       number;   // $X de descuento por punto
  minRedeemPoints:  number;
  expireDays:       number | null;
  levelsEnabled:    boolean;
  levels:           LoyaltyLevel[];
}

export interface LoyaltyMembershipConfig {
  enabled:                boolean;
  trigger:                MembershipTrigger;
  triggerProductId:       string;   // UUID del producto que activa (si trigger=venta_producto)
  price:                  number;   // 0 = gratis
  durationMonths:         number;   // 0 = sin vencimiento
  // Beneficio
  benefitEnabled:         boolean;
  benefitDaily:           boolean;  // ¿el beneficio se resetea cada día?
  benefitCrossBranch:     boolean;  // ¿aplica en todas las sucursales?
  benefitType:            BenefitType;
  benefitProductId:       string;   // UUID del producto regalado
  benefitDiscount:        number;   // % si tipo=descuento_pct
  benefitMultiplier:      number;   // si tipo=puntos_extra
  benefitLabel:           string;   // texto libre para el cajero en el POS
}

export interface LoyaltyLevel {
  name:        string;
  minPoints:   number;
  multiplier:  number;
  color:       string;
  benefit:     string;
}

export interface FullLoyaltyConfig {
  points:     LoyaltyPointsConfig;
  membership: LoyaltyMembershipConfig;
}

// ── Defaults ──────────────────────────────────────────────────────────────────

const DEFAULT_POINTS: LoyaltyPointsConfig = {
  enabled: true, pesosPerPoint: 10, pointValue: 0.5,
  minRedeemPoints: 100, expireDays: null,
  levelsEnabled: false, levels: [],
};

const DEFAULT_MEMBERSHIP: LoyaltyMembershipConfig = {
  enabled: false, trigger: 'manual', triggerProductId: '',
  price: 0, durationMonths: 12,
  benefitEnabled: false, benefitDaily: true, benefitCrossBranch: true,
  benefitType: 'producto_gratis', benefitProductId: '', benefitDiscount: 0,
  benefitMultiplier: 1, benefitLabel: 'Beneficio del día',
};

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useLoyaltyConfig() {
  const supabase = createClient();
  const [config, setConfig] = useState<FullLoyaltyConfig>({
    points: DEFAULT_POINTS, membership: DEFAULT_MEMBERSHIP,
  });
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('system_config')
      .select('config_key,config_value')
      .eq('tenant_id', getTenantId())
      .like('config_key', 'loyalty_%');

    if (!data) { setLoading(false); return; }

    const m: Record<string, string> = {};
    data.forEach(r => { m[r.config_key] = r.config_value; });

    const bool = (k: string, def = false) => m[k] ? m[k] !== 'false' : def;
    const num  = (k: string, def = 0) => m[k] ? Number(m[k]) : def;
    const str  = (k: string, def = '') => m[k] ?? def;

    let levels: LoyaltyLevel[] = [];
    try { levels = JSON.parse(m['loyalty_levels'] ?? '[]'); } catch {}

    setConfig({
      points: {
        enabled:         bool('loyalty_points_enabled', true),
        pesosPerPoint:   num('loyalty_pesos_per_point', 10),
        pointValue:      num('loyalty_point_value', 0.5),
        minRedeemPoints: num('loyalty_min_redeem', 100),
        expireDays:      m['loyalty_points_expire_days'] ? num('loyalty_points_expire_days') : null,
        levelsEnabled:   bool('loyalty_levels_enabled', false),
        levels,
      },
      membership: {
        enabled:            bool('loyalty_membership_enabled', false),
        trigger:            str('loyalty_membership_trigger', 'manual') as MembershipTrigger,
        triggerProductId:   str('loyalty_membership_trigger_product_id'),
        price:              num('loyalty_membership_price', 0),
        durationMonths:     num('loyalty_membership_duration_months', 12),
        benefitEnabled:     bool('loyalty_membership_benefit_enabled', false),
        benefitDaily:       bool('loyalty_membership_benefit_daily', true),
        benefitCrossBranch: bool('loyalty_membership_benefit_cross_branch', true),
        benefitType:        str('loyalty_membership_benefit_type', 'producto_gratis') as BenefitType,
        benefitProductId:   str('loyalty_membership_benefit_product_id'),
        benefitDiscount:    num('loyalty_membership_benefit_discount', 0),
        benefitMultiplier:  num('loyalty_membership_benefit_multiplier', 1),
        benefitLabel:       str('loyalty_membership_benefit_label', 'Beneficio del día'),
      },
    });
    setLoading(false);
  }, [supabase]);

  useEffect(() => { load(); }, [load]);

  const save = useCallback(async (next: FullLoyaltyConfig) => {
    setSaving(true);
    const tid = getTenantId();

    const entries: Array<{ tenant_id: string; config_key: string; config_value: string }> = [
      // Puntos
      { tenant_id: tid!, config_key: 'loyalty_points_enabled',          config_value: String(next.points.enabled) },
      { tenant_id: tid!, config_key: 'loyalty_pesos_per_point',         config_value: String(next.points.pesosPerPoint) },
      { tenant_id: tid!, config_key: 'loyalty_point_value',             config_value: String(next.points.pointValue) },
      { tenant_id: tid!, config_key: 'loyalty_min_redeem',              config_value: String(next.points.minRedeemPoints) },
      { tenant_id: tid!, config_key: 'loyalty_points_expire_days',      config_value: next.points.expireDays ? String(next.points.expireDays) : '' },
      { tenant_id: tid!, config_key: 'loyalty_levels_enabled',          config_value: String(next.points.levelsEnabled) },
      { tenant_id: tid!, config_key: 'loyalty_levels',                  config_value: JSON.stringify(next.points.levels) },
      // Membresía
      { tenant_id: tid!, config_key: 'loyalty_membership_enabled',                  config_value: String(next.membership.enabled) },
      { tenant_id: tid!, config_key: 'loyalty_membership_trigger',                  config_value: next.membership.trigger },
      { tenant_id: tid!, config_key: 'loyalty_membership_trigger_product_id',       config_value: next.membership.triggerProductId },
      { tenant_id: tid!, config_key: 'loyalty_membership_price',                    config_value: String(next.membership.price) },
      { tenant_id: tid!, config_key: 'loyalty_membership_duration_months',          config_value: String(next.membership.durationMonths) },
      { tenant_id: tid!, config_key: 'loyalty_membership_benefit_enabled',          config_value: String(next.membership.benefitEnabled) },
      { tenant_id: tid!, config_key: 'loyalty_membership_benefit_daily',            config_value: String(next.membership.benefitDaily) },
      { tenant_id: tid!, config_key: 'loyalty_membership_benefit_cross_branch',     config_value: String(next.membership.benefitCrossBranch) },
      { tenant_id: tid!, config_key: 'loyalty_membership_benefit_type',             config_value: next.membership.benefitType },
      { tenant_id: tid!, config_key: 'loyalty_membership_benefit_product_id',       config_value: next.membership.benefitProductId },
      { tenant_id: tid!, config_key: 'loyalty_membership_benefit_discount',         config_value: String(next.membership.benefitDiscount) },
      { tenant_id: tid!, config_key: 'loyalty_membership_benefit_multiplier',       config_value: String(next.membership.benefitMultiplier) },
      { tenant_id: tid!, config_key: 'loyalty_membership_benefit_label',            config_value: next.membership.benefitLabel },
    ];

    await supabase
      .from('system_config')
      .upsert(entries, { onConflict: 'tenant_id,config_key' });

    setConfig(next);
    setSaving(false);
  }, [supabase]);

  return { config, loading, saving, save, reload: load };
}

// ── Helper: describe el trigger en español ────────────────────────────────────
export function describeTrigger(t: MembershipTrigger): string {
  return {
    manual:          'El staff la registra manualmente',
    venta_producto:  'Se activa al vender un producto del menú',
    pago_directo:    'El cliente paga por la membresía directamente',
  }[t];
}

export function describeBenefit(t: BenefitType): string {
  return {
    producto_gratis: 'Producto gratis (un platillo o bebida del menú)',
    descuento_pct:   'Descuento porcentual en cada visita',
    precio_especial: 'Precio preferencial (el cajero lo aplica)',
    puntos_extra:    'Multiplicador de puntos de lealtad',
    personalizado:   'Beneficio personalizado (texto libre)',
  }[t];
}
