'use client';
/**
 * ConfigEstablecimiento — perfil del tipo de negocio
 * 
 * Define el flujo de trabajo del establecimiento:
 * - Restaurante con mesas: POS + mesas + cocina
 * - Cafetería / para llevar: para llevar prominente, mesas opcional
 * - Bar / cantina: bebidas destacadas, sin flujo de cocina
 * - Mixto: todo disponible (default)
 * 
 * Este perfil afecta:
 * 1. El orden y prominencia de botones en el POS
 * 2. Si el mapa de mesas se muestra por default
 * 3. Etiquetas ("Mesa" vs "Orden" vs "Pedido")
 */
import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { getCurrentTenantId as getTenantId } from '@/lib/tenantStore';
import { UtensilsCrossed, Coffee, Beer, Layers, Check } from 'lucide-react';

export type EstablishmentType = 'restaurante' | 'cafeteria' | 'bar' | 'mixto';

interface Profile {
  type: EstablishmentType;
  label: string;
  description: string;
  icon: React.ReactNode;
  features: string[];
  defaultView: 'tables' | 'takeout';
  takeoutLabel: string;   // how to call "para llevar" orders
  tableLabel: string;     // how to call tables
}

const PROFILES: Profile[] = [
  {
    type: 'restaurante',
    label: 'Restaurante',
    description: 'Servicio en mesa como flujo principal. Para llevar como opción secundaria.',
    icon: <UtensilsCrossed size={24} />,
    features: ['Mapa de mesas por default', 'Cocina activa', 'Para llevar disponible', 'Mesero móvil'],
    defaultView: 'tables',
    takeoutLabel: 'Para llevar',
    tableLabel: 'Mesa',
  },
  {
    type: 'cafeteria',
    label: 'Cafetería / Para Llevar',
    description: 'Para llevar como flujo principal. Mesas disponibles pero no es el foco.',
    icon: <Coffee size={24} />,
    features: ['Para llevar por default', 'Mesas disponibles', 'Nombre de cliente en órdenes', 'Cola de pedidos'],
    defaultView: 'takeout',
    takeoutLabel: 'Pedido',
    tableLabel: 'Mesa',
  },
  {
    type: 'bar',
    label: 'Bar / Cantina',
    description: 'Atención en barra y mesas. Bebidas como categoría principal.',
    icon: <Beer size={24} />,
    features: ['Mesas y barra', 'Sin cocina compleja', 'Cuentas por persona', 'Para llevar disponible'],
    defaultView: 'tables',
    takeoutLabel: 'Para llevar',
    tableLabel: 'Mesa',
  },
  {
    type: 'mixto',
    label: 'Mixto / Personalizado',
    description: 'Acceso completo a todas las funciones sin prioridad definida.',
    icon: <Layers size={24} />,
    features: ['Todas las funciones', 'Sin flujo predeterminado', 'Configuración manual'],
    defaultView: 'tables',
    takeoutLabel: 'Para llevar',
    tableLabel: 'Mesa',
  },
];

const card = (selected: boolean): React.CSSProperties => ({
  background: selected ? 'rgba(201,150,58,0.08)' : 'rgba(255,255,255,0.03)',
  border: `1.5px solid ${selected ? '#c9963a' : 'rgba(255,255,255,0.08)'}`,
  borderRadius: 14,
  padding: '20px',
  cursor: 'pointer',
  transition: 'all .18s',
});

export default function ConfigEstablecimiento() {
  const supabase = createClient();
  const { appUser } = useAuth();
  const [selected, setSelected] = useState<EstablishmentType>('restaurante');
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    supabase
      .from('system_config')
      .select('config_value')
      .eq('tenant_id', getTenantId())
      .eq('config_key', 'establishment_type')
      .maybeSingle()
      .then(({ data }) => {
        if (data?.config_value) setSelected(data.config_value as EstablishmentType);
        setLoaded(true);
      });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase
      .from('system_config')
      .upsert({
        tenant_id: getTenantId(),
        config_key: 'establishment_type',
        config_value: selected,
      }, { onConflict: 'tenant_id,config_key' });

    if (error) {
      toast.error('Error al guardar: ' + error.message);
    } else {
      toast.success('Perfil de establecimiento guardado');
    }
    setSaving(false);
  };

  const profile = PROFILES.find(p => p.type === selected)!;

  return (
    <div style={{ maxWidth: 680 }}>
      <div style={{ marginBottom: 24 }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, color: '#f1f5f9', margin: '0 0 6px' }}>
          Tipo de establecimiento
        </h3>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,.45)', margin: 0, lineHeight: 1.6 }}>
          Define el flujo de trabajo principal. Esto cambia qué aparece primero en el Punto de Venta
          y cómo se etiquetan las órdenes.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
        {PROFILES.map(p => (
          <div key={p.type} style={card(selected === p.type)} onClick={() => setSelected(p.type)}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <div style={{
                width: 40, height: 40, borderRadius: 10, display: 'flex', alignItems: 'center',
                justifyContent: 'center', flexShrink: 0,
                background: selected === p.type ? 'rgba(201,150,58,.15)' : 'rgba(255,255,255,.05)',
                color: selected === p.type ? '#c9963a' : 'rgba(255,255,255,.4)',
              }}>
                {p.icon}
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: selected === p.type ? '#c9963a' : '#f1f5f9' }}>
                  {p.label}
                </div>
                {selected === p.type && (
                  <div style={{ fontSize: 11, color: '#c9963a', fontWeight: 600, marginTop: 1 }}>
                    ✓ Seleccionado
                  </div>
                )}
              </div>
            </div>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,.45)', margin: '0 0 10px', lineHeight: 1.5 }}>
              {p.description}
            </p>
            <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 4 }}>
              {p.features.map(f => (
                <li key={f} style={{ fontSize: 11, color: 'rgba(255,255,255,.4)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Check size={10} style={{ color: '#34d399', flexShrink: 0 }} /> {f}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* Impact preview */}
      <div style={{ background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.06)', borderRadius: 12, padding: '16px 20px', marginBottom: 20 }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,.35)', textTransform: 'uppercase', letterSpacing: '.08em', margin: '0 0 12px' }}>
          Con este perfil, el POS mostrará
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {[
            { label: 'Vista inicial', value: profile.defaultView === 'tables' ? 'Mapa de mesas' : '🥡 Para llevar' },
            { label: 'Órdenes para llevar', value: profile.takeoutLabel },
            { label: 'Etiqueta de mesas', value: profile.tableLabel },
            { label: 'Botón principal', value: profile.defaultView === 'tables' ? 'Seleccionar mesa' : `Nuevo ${profile.takeoutLabel}` },
          ].map(({ label, value }) => (
            <div key={label}>
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,.35)', margin: '0 0 2px' }}>{label}</p>
              <p style={{ fontSize: 13, color: '#f1f5f9', fontWeight: 600, margin: 0 }}>{value}</p>
            </div>
          ))}
        </div>
      </div>

      <button
        onClick={handleSave}
        disabled={saving || !loaded}
        style={{ padding: '10px 24px', borderRadius: 10, background: '#c9963a', color: '#000', fontSize: 14, fontWeight: 700, border: 'none', cursor: saving ? 'wait' : 'pointer', opacity: saving ? .7 : 1 }}
      >
        {saving ? 'Guardando…' : 'Guardar perfil'}
      </button>
    </div>
  );
}
