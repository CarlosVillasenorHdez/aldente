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
  triggerProductId:       string;
  price:                  number;
  durationMonths:         number;
  // Beneficios múltiples — se pueden combinar
  freeProductEnabled:     boolean;  // ¿incluye producto gratis?
  freeProductId:          string;   // UUID del producto que se regala
  freeProductDaily:       boolean;  // ¿una vez al día?
  freeProductLabel:       string;   // ej: "Café del día"
  discountEnabled:        boolean;  // ¿descuento en cada visita?
  discountPct:            number;   // porcentaje de descuento
  priceTagEnabled:        boolean;  // ¿aviso de precio especial al cajero?
  priceTagLabel:          string;   // ej: "Precio de socio"
  pointsEnabled:          boolean;  // ¿multiplica puntos?
  pointsMultiplier:       number;   // 2 = doble de puntos
  // Compat legacy — mantener para no romper useMembershipTrigger
  benefitLabel:           string;
  benefitCrossBranch:     boolean;
  durationMonths_alias:   number;
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
  freeProductEnabled: false, freeProductId: '', freeProductDaily: true,
  freeProductLabel: 'Bebida del día',
  discountEnabled: false, discountPct: 0,
  priceTagEnabled: false, priceTagLabel: 'Precio de socio',
  pointsEnabled: false, pointsMultiplier: 2,
  // compat
  benefitLabel: 'Beneficio del día', benefitCrossBranch: true,
  durationMonths_alias: 12,
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
        // Beneficios múltiples
        freeProductEnabled: bool('loyalty_benefit_free_product_enabled', false),
        freeProductId:      str('loyalty_benefit_free_product_id'),
        freeProductDaily:   bool('loyalty_benefit_free_product_daily', true),
        freeProductLabel:   str('loyalty_benefit_free_product_label', 'Bebida del día'),
        discountEnabled:    bool('loyalty_benefit_discount_enabled', false),
        discountPct:        num('loyalty_benefit_discount_pct', 0),
        priceTagEnabled:    bool('loyalty_benefit_price_tag_enabled', false),
        priceTagLabel:      str('loyalty_benefit_price_tag_label', 'Precio de socio'),
        pointsEnabled:      bool('loyalty_benefit_points_enabled', false),
        pointsMultiplier:   num('loyalty_benefit_points_multiplier', 2),
        // compat legacy
        benefitLabel:       str('loyalty_benefit_free_product_label', 'Bebida del día'),
        benefitCrossBranch: true,
        durationMonths_alias: num('loyalty_membership_duration_months', 12),
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
      // Beneficios múltiples
      { tenant_id: tid!, config_key: 'loyalty_benefit_free_product_enabled',  config_value: String(next.membership.freeProductEnabled) },
      { tenant_id: tid!, config_key: 'loyalty_benefit_free_product_id',       config_value: next.membership.freeProductId },
      { tenant_id: tid!, config_key: 'loyalty_benefit_free_product_daily',    config_value: String(next.membership.freeProductDaily) },
      { tenant_id: tid!, config_key: 'loyalty_benefit_free_product_label',    config_value: next.membership.freeProductLabel },
      { tenant_id: tid!, config_key: 'loyalty_benefit_discount_enabled',      config_value: String(next.membership.discountEnabled) },
      { tenant_id: tid!, config_key: 'loyalty_benefit_discount_pct',          config_value: String(next.membership.discountPct) },
      { tenant_id: tid!, config_key: 'loyalty_benefit_price_tag_enabled',     config_value: String(next.membership.priceTagEnabled) },
      { tenant_id: tid!, config_key: 'loyalty_benefit_price_tag_label',       config_value: next.membership.priceTagLabel },
      { tenant_id: tid!, config_key: 'loyalty_benefit_points_enabled',        config_value: String(next.membership.pointsEnabled) },
      { tenant_id: tid!, config_key: 'loyalty_benefit_points_multiplier',     config_value: String(next.membership.pointsMultiplier) },
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
