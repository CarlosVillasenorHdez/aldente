'use client';

/**
 * useMembershipTrigger
 *
 * Detecta cuando se agrega a la orden el producto configurado como
 * trigger de membresía. Devuelve el estado y las acciones para manejar
 * los 5 escenarios posibles en el POS.
 *
 * Los escenarios son agnósticos al producto trigger:
 * no importa si es un termo, un paquete o cualquier otro producto.
 */
import { useState, useCallback, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { getCurrentTenantId as getTenantId } from '@/lib/tenantStore';
import { useLoyaltyConfig } from '@/hooks/useLoyaltyConfig';
import { toast } from 'sonner';

export interface MembershipCandidate {
  phone:  string;
  name:   string;
  email?: string;
}

export interface ExistingMember {
  id:                  string;
  name:                string;
  phone:               string;
  isActive:            boolean;
  membershipExpiresAt: string | null;
}

export type TriggerScenario =
  | 'new_member'      // A: cliente nuevo quiere membresía
  | 'existing_active' // B: ya tiene membresía activa
  | 'skip'            // C: no quiere membresía
  | null;

interface UseMembershipTriggerReturn {
  shouldShowPopup:  boolean;         // ¿mostrar el popup?
  existingMember:   ExistingMember | null;
  scenario:         TriggerScenario;
  searching:        boolean;
  registering:      boolean;
  // Acciones
  onPhoneSearch:    (phone: string) => Promise<void>;
  onRegisterNew:    (candidate: MembershipCandidate) => Promise<void>;
  onRenewExisting:  (memberId: string) => Promise<void>;
  onSkip:           () => void;
  onDismiss:        () => void;
  // Configuración
  benefitLabel:     string;
  durationMonths:   number;
}

export function useMembershipTrigger(
  orderItems: Array<{ dishId: string }>,
  orderId?: string
): UseMembershipTriggerReturn {
  const supabase = createClient();
  const { config } = useLoyaltyConfig();

  const [shouldShowPopup, setShouldShowPopup] = useState(false);
  const [alreadyShown,    setAlreadyShown]    = useState(false);
  const [existingMember,  setExistingMember]  = useState<ExistingMember | null>(null);
  const [scenario,        setScenario]        = useState<TriggerScenario>(null);
  const [searching,       setSearching]       = useState(false);
  const [registering,     setRegistering]     = useState(false);

  // Detectar si la orden contiene el producto trigger
  useEffect(() => {
    if (alreadyShown) return;
    if (!config.membership.enabled) return;
    if (config.membership.trigger !== 'venta_producto') return;
    if (!config.membership.triggerProductId) return;

    const hasTrigger = orderItems.some(
      item => item.dishId === config.membership.triggerProductId
    );

    if (hasTrigger) {
      setShouldShowPopup(true);
      setAlreadyShown(true);  // solo mostrar una vez por orden
    }
  }, [orderItems, config, alreadyShown]);

  // Buscar socio por teléfono — determina el escenario
  const onPhoneSearch = useCallback(async (phone: string) => {
    const q = phone.replace(/\D/g, '');
    if (q.length < 10) return;
    setSearching(true);

    const { data } = await supabase
      .from('loyalty_customers')
      .select('id,name,phone,is_active,membership_expires_at')
      .eq('tenant_id', getTenantId())
      .in('membership_type', ['membresia', 'termo'])
      .ilike('phone', `%${q}%`)
      .limit(1)
      .single();

    setSearching(false);

    if (!data) {
      // Escenario A: no existe → ofrecer registrar
      setScenario('new_member');
      setExistingMember(null);
    } else {
      // Escenario B: ya existe → mostrar estado y opciones
      setScenario('existing_active');
      setExistingMember({
        id:                  data.id,
        name:                data.name,
        phone:               data.phone,
        isActive:            data.is_active,
        membershipExpiresAt: data.membership_expires_at ?? null,
      });
    }
  }, [supabase]);

  // Registrar nuevo socio (Escenario A)
  const onRegisterNew = useCallback(async (candidate: MembershipCandidate) => {
    if (!candidate.name.trim() || !candidate.phone) return;
    setRegistering(true);

    const expires = config.membership.durationMonths > 0
      ? (() => {
          const d = new Date();
          d.setMonth(d.getMonth() + config.membership.durationMonths);
          return d.toISOString();
        })()
      : null;

    const { error } = await supabase.from('loyalty_customers').insert({
      tenant_id:             getTenantId(),
      name:                  candidate.name.trim(),
      phone:                 candidate.phone.replace(/\D/g, ''),
      email:                 candidate.email ?? '',
      membership_type:       'membresia',
      is_active:             true,
      membership_expires_at: expires,
      points: 0, total_spent: 0, total_visits: 0,
    });

    // Registrar activación de membresía en loyalty_transactions
    if (!error) {
      await supabase.from('loyalty_transactions').insert({
        tenant_id:            getTenantId(),
        type:                 'membresia_activada',
        points:               0,
        amount:               config.membership.price,
        notes:                `Membresía activada por venta de producto`,
        financial_impact_type: config.membership.price > 0 ? 'ingreso_membresia' : 'ninguno',
        financial_amount:     config.membership.price,
      });
    }

    setRegistering(false);

    if (error) { toast.error('Error al registrar: ' + error.message); return; }
    toast.success(`¡${candidate.name} registrado como socio!`);
    setShouldShowPopup(false);
    setScenario(null);
  }, [supabase, config]);

  // Renovar membresía existente (Escenario B)
  const onRenewExisting = useCallback(async (memberId: string) => {
    if (!existingMember) return;
    setRegistering(true);

    const base = existingMember.membershipExpiresAt && new Date(existingMember.membershipExpiresAt) > new Date()
      ? new Date(existingMember.membershipExpiresAt)
      : new Date();

    const months = config.membership.durationMonths || 12;
    base.setMonth(base.getMonth() + months);

    const { error } = await supabase.from('loyalty_customers').update({
      is_active:             true,
      membership_expires_at: base.toISOString(),
      updated_at:            new Date().toISOString(),
    }).eq('id', memberId);

    if (!error) {
      await supabase.from('loyalty_transactions').insert({
        tenant_id:            getTenantId(),
        customer_id:          memberId,
        type:                 'membresia_activada',
        points:               0,
        amount:               config.membership.price,
        notes:                `Membresía renovada por venta de producto`,
        financial_impact_type: config.membership.price > 0 ? 'ingreso_membresia' : 'ninguno',
        financial_amount:     config.membership.price,
      });
    }

    setRegistering(false);
    if (error) { toast.error('Error al renovar'); return; }
    toast.success(`Membresía de ${existingMember.name} renovada hasta ${base.toLocaleDateString('es-MX')}`);
    setShouldShowPopup(false);
    setScenario(null);
  }, [supabase, existingMember, config]);

  // Escenario C: no quiere membresía — solo registrar el skip
  const onSkip = useCallback(() => {
    // Registrar como "oportunidad perdida" para reportes de conversión
    supabase.from('loyalty_transactions').insert({
      tenant_id:            getTenantId(),
      type:                 'membresia_activada',   // tipo reutilizado
      points:               0,
      amount:               0,
      notes:                'Trigger de membresía — cliente declinó el registro',
      financial_impact_type: 'ninguno',
      financial_amount:     0,
    }).then(() => {});

    setShouldShowPopup(false);
    setScenario(null);
  }, [supabase]);

  const onDismiss = useCallback(() => {
    setShouldShowPopup(false);
    setScenario(null);
    setExistingMember(null);
  }, []);

  return {
    shouldShowPopup,
    existingMember,
    scenario,
    searching,
    registering,
    onPhoneSearch,
    onRegisterNew,
    onRenewExisting,
    onSkip,
    onDismiss,
    benefitLabel:   config.membership.benefitLabel,
    durationMonths: config.membership.durationMonths,
  };
}
