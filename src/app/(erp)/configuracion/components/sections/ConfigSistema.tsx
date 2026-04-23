'use client';

import { getCurrentTenantId as getTenantId } from '@/lib/tenantStore';

import React, { useState, useEffect } from 'react';

import { Zap, Star, Settings2, CheckCircle, Save, AlertTriangle, RotateCcw } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

import { DEFAULT_FEATURES, FEATURE_KEYS, Features, invalidateFeaturesCache } from '@/hooks/useFeatures';
import UsuariosManagement from '../UsuariosManagement';
import Icon from '@/components/ui/AppIcon';


function SectionTitle({ icon: Icon, title, subtitle }: { icon: React.ElementType; title: string; subtitle?: string }) {
  return (
    <div className="flex items-center gap-2 mb-5">
      <Icon size={18} style={{ color: '#f59e0b' }} />
      <div>
        <h2 className="text-base font-bold" style={{ color: '#f1f5f9' }}>{title}</h2>
        {subtitle && <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>{subtitle}</p>}
      </div>
    </div>
  );
}

function SaveButton({ saved, onClick, label }: { saved: boolean; onClick: () => void; label?: string }) {
  return (
    <button onClick={onClick} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all"
      style={{ backgroundColor: saved ? 'rgba(34,197,94,0.15)' : '#f59e0b', color: saved ? '#22c55e' : '#1B3A6B', border: saved ? '1px solid rgba(34,197,94,0.4)' : 'none' }}>
      {saved ? <CheckCircle size={15} /> : <Save size={15} />}
      {saved ? 'Guardado' : (label ?? 'Guardar cambios')}
    </button>
  );
}


// ─── WhatsApp Monthly Report Toggle ──────────────────────────────────────────
function WhatsAppReportToggle() {
  const supabase = createClient();
  const { appUser } = useAuth();
  const [enabled, setEnabled] = React.useState(false);
  const [phone, setPhone] = React.useState('');
  const [saving, setSaving] = React.useState(false);
  const [saved, setSaved] = React.useState(false);

  React.useEffect(() => {
    if (!appUser?.tenantId) return;
    supabase.from('system_config')
      .select('config_key, config_value')
      .eq('tenant_id', appUser.tenantId)
      .then(({ data }) => {
        const map: Record<string, string> = {};
        (data ?? []).forEach((r: any) => { map[r.config_key] = r.config_value; });
        setEnabled(map['whatsapp_report_enabled'] === 'true');
        setPhone(map['whatsapp_report_phone'] ?? '');
      });
  }, [appUser?.tenantId]); // eslint-disable-line

  async function save() {
    if (!appUser?.tenantId) return;
    setSaving(true);
    await supabase.from('system_config').upsert([
      { config_key: 'whatsapp_report_enabled', config_value: String(enabled), tenant_id: appUser.tenantId },
      { config_key: 'whatsapp_report_phone',   config_value: phone.trim(),    tenant_id: appUser.tenantId },
    ], { onConflict: 'tenant_id,config_key' });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  return (
    <div className="rounded-xl p-5 mb-5" style={{ backgroundColor: '#1a2535', border: '1px solid rgba(37,211,102,0.2)' }}>
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span style={{ fontSize: 16 }}>📱</span>
            <h3 className="text-sm font-bold" style={{ color: '#f1f5f9' }}>Reporte mensual por WhatsApp</h3>
          </div>
          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)', lineHeight: 1.6 }}>
            El primer lunes de cada mes: ventas, prime cost y variación vs mes anterior. Sin necesidad de abrir la app.
          </p>
        </div>
        <button
          onClick={() => setEnabled(v => !v)}
          style={{ width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer', flexShrink: 0,
            background: enabled ? '#25d366' : 'rgba(255,255,255,0.15)', position: 'relative', transition: 'background .2s' }}>
          <div style={{ position: 'absolute', top: 3, left: enabled ? 23 : 3, width: 18, height: 18,
            borderRadius: '50%', background: 'white', transition: 'left .2s' }} />
        </button>
      </div>
      {enabled && (
        <div className="flex gap-3 items-end">
          <div className="flex-1">
            <label className="block text-xs font-semibold mb-1.5" style={{ color: 'rgba(255,255,255,0.4)', letterSpacing: '.04em', textTransform: 'uppercase' }}>
              Número de WhatsApp
            </label>
            <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+52 55 1234 5678"
              style={{ width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: 10, padding: '9px 12px', color: '#f1f5f9', fontSize: 14, outline: 'none' }} />
          </div>
          <button onClick={save} disabled={saving} className="px-5 py-2.5 rounded-xl text-sm font-semibold"
            style={{ backgroundColor: '#25d366', color: '#000', opacity: saving ? 0.6 : 1, flexShrink: 0 }}>
            {saving ? 'Guardando…' : saved ? '✓ Guardado' : 'Guardar'}
          </button>
        </div>
      )}
      {!enabled && (
        <button onClick={save} disabled={saving} className="px-4 py-2 rounded-lg text-xs font-semibold"
          style={{ backgroundColor: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.1)' }}>
          {saving ? 'Guardando…' : saved ? '✓ Guardado' : 'Guardar preferencia'}
        </button>
      )}
    </div>
  );
}


export default function ConfigSistema({ activeSection }: { activeSection: string }) {
  const supabase = createClient();
  const { appUser } = useAuth();

  const [features, setFeatures] = useState<Features>({ ...DEFAULT_FEATURES });
  const [featuresSaving, setFeaturesSaving] = useState(false);
  const [featuresSaved, setFeaturesSaved] = useState(false);

  const [loyaltyName, setLoyaltyName] = useState('Club de Puntos');
  const [loyaltyPesosPerPoint, setLoyaltyPesosPerPoint] = useState(10);
  const [loyaltyPointValue, setLoyaltyPointValue] = useState(0.5);
  const [loyaltyMinRedeem, setLoyaltyMinRedeem] = useState(50);
  const [loyaltyPointsExpireDays, setLoyaltyPointsExpireDays] = useState<number|null>(null);
  const [loyaltyAutoExpire, setLoyaltyAutoExpire] = useState(true);
  const [loyaltyWhatsapp, setLoyaltyWhatsapp] = useState(false);
  const [loyaltyLevels, setLoyaltyLevels] = useState<{ name: string; min: number; color: string; benefit: string }[]>([
    { name: 'Bronce', min: 0,    color: '#cd7f32', benefit: '' },
    { name: 'Plata',  min: 500,  color: '#9ca3af', benefit: '' },
    { name: 'Oro',    min: 1500, color: '#f59e0b', benefit: '' },
  ]);
  const [loyaltySaving, setLoyaltySaving] = useState(false);
  const [loyaltySaved, setLoyaltySaved] = useState(false);

  const [resetModal, setResetModal] = useState(false);
  const [resetPassword, setResetPassword] = useState('');
  const [showResetPw, setShowResetPw] = useState(false);
  const [resetError, setResetError] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);

  useEffect(() => {
    supabase.from('system_config').select('config_key, config_value').eq('tenant_id', getTenantId()).then(({ data }) => {
      if (!data) return;
      const map: Record<string, string> = {};
      data.forEach((r: any) => { map[r.config_key] = r.config_value; });
      const loaded = { ...DEFAULT_FEATURES };
      Object.entries(FEATURE_KEYS).forEach(([feat, key]) => {
        if (key in map) loaded[feat as keyof Features] = map[key] === 'true';
      });
      setFeatures(loaded);
      if (map['loyalty_program_name']) setLoyaltyName(map['loyalty_program_name']);
      if (map['loyalty_pesos_per_point']) setLoyaltyPesosPerPoint(Number(map['loyalty_pesos_per_point']));
      if (map['loyalty_point_value']) setLoyaltyPointValue(Number(map['loyalty_point_value']));
      if (map['loyalty_points_expire_days']) setLoyaltyPointsExpireDays(Number(map['loyalty_points_expire_days']));
      else setLoyaltyPointsExpireDays(null);
      if (map['loyalty_min_redeem']) setLoyaltyMinRedeem(Number(map['loyalty_min_redeem']));
      setLoyaltyAutoExpire(map['loyalty_auto_expire_memberships'] !== 'false');
      setLoyaltyWhatsapp(map['loyalty_whatsapp_notifications'] === 'true');
      if (map['loyalty_levels']) { try { setLoyaltyLevels(JSON.parse(map['loyalty_levels'])); } catch { /* ignore */ } }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  const handleSaveFeatures = async () => {
    setFeaturesSaving(true);
    const rows = Object.entries(FEATURE_KEYS).map(([feat, key]) => ({
      config_key: key,
      config_value: features[feat as keyof Features] ? 'true' : 'false',
      description: `Feature: ${feat}`,
      tenant_id: appUser?.tenantId,
    }));
    await supabase.from('system_config').upsert(rows, { onConflict: 'tenant_id,config_key' });
    invalidateFeaturesCache();
    setFeaturesSaving(false);
    setFeaturesSaved(true);
    setTimeout(() => setFeaturesSaved(false), 3000);
  };

  // ── Save loyalty config ───────────────────────────────────────────────────


  const handleSaveLoyalty = async () => {
    setLoyaltySaving(true);
    await supabase.from('system_config').upsert([
      { config_key: 'loyalty_program_name',             config_value: loyaltyName,                                    tenant_id: appUser?.tenantId },
      { config_key: 'loyalty_pesos_per_point',          config_value: String(loyaltyPesosPerPoint),                    tenant_id: appUser?.tenantId },
      { config_key: 'loyalty_point_value',              config_value: String(loyaltyPointValue),                       tenant_id: appUser?.tenantId },
      { config_key: 'loyalty_points_expire_days',       config_value: loyaltyPointsExpireDays != null ? String(loyaltyPointsExpireDays) : '', tenant_id: appUser?.tenantId },
      { config_key: 'loyalty_min_redeem',               config_value: String(loyaltyMinRedeem),                        tenant_id: appUser?.tenantId },
      { config_key: 'loyalty_auto_expire_memberships',  config_value: String(loyaltyAutoExpire),                       tenant_id: appUser?.tenantId },
      { config_key: 'loyalty_whatsapp_notifications',   config_value: String(loyaltyWhatsapp),                         tenant_id: appUser?.tenantId },
      { config_key: 'loyalty_levels',                   config_value: JSON.stringify(loyaltyLevels),                   tenant_id: appUser?.tenantId },
    ], { onConflict: 'tenant_id,config_key' });
    setLoyaltySaving(false);
    setLoyaltySaved(true);
    setTimeout(() => setLoyaltySaved(false), 3000);
  };


  async function handleSystemReset() {
    setResetLoading(true);
    setResetError('');
    try {
      // ── Delete ALL operational/demo data ──────────────────────────────────
      // Orders and items
      await supabase.from('order_items').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('orders').delete().eq('tenant_id', appUser?.tenantId).neq('id', '00000000-0000-0000-0000-000000000000');
      // Tables and layout
      await supabase.from('restaurant_tables').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('restaurant_layout').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      // Stock movements (generated by sales)
      await supabase.from('stock_movements').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      // Gastos (expense payments)
      try {
        await supabase.from('expense_payments').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      } catch { /* table may not exist */ }
      // Reset system_config table_count
      await supabase.from('system_config').upsert(
        { config_key: 'table_count', config_value: '0' },
        { onConflict: 'tenant_id,config_key' }
      );

      // Layout reset in DB — ConfigLayout reloads on next mount
      setResetModal(false);
      setResetPassword('');
      setResetSuccess(true);
      setTimeout(() => setResetSuccess(false), 3000);
    } catch {
      setResetError('Ocurrió un error. Intenta de nuevo.');
    } finally {
      setResetLoading(false);
    }
  }

  // ── Save layout ──────────────────────────────────────────────────────────────

  return (
    <div className="max-w-2xl">
      {activeSection === 'funcionalidades' && (
        <div className="max-w-2xl space-y-4">
              <SectionTitle
                icon={Zap}
                title="Funcionalidades del Sistema"
                subtitle="Activa o desactiva módulos. Los módulos desactivados desaparecen del menú lateral inmediatamente al guardar."
              />
              {([
                { key: 'meseroMovil',     label: 'Mesero Móvil',          desc: 'App para tomar pedidos desde el teléfono del mesero',    icon: '📱' },
                { key: 'lealtad',         label: 'Programa de Lealtad',    desc: 'Puntos, niveles y canjes para clientes frecuentes',      icon: '⭐' },
                { key: 'reservaciones',   label: 'Reservaciones',          desc: 'Calendario de reservas y gestión de mesas futuras',      icon: '📅' },
                { key: 'delivery',        label: 'Delivery',               desc: 'Pedidos Uber Eats, Rappi, DiDi Food y captura manual',   icon: '🛵' },
                { key: 'inventario',      label: 'Inventario',             desc: 'Stock, alertas de mínimos y movimientos de ingredientes', icon: '📦' },
                { key: 'gastos',          label: 'Gastos',                 desc: 'Gastos recurrentes, depreciaciones y flujo de caja',     icon: '💸' },
                { key: 'recursosHumanos', label: 'Recursos Humanos',       desc: 'Vacaciones, permisos, incapacidades y tiempos extra',    icon: '👥' },
                { key: 'reportes',        label: 'Reportes y Análisis',    desc: 'P&L, COGS, canasta de mercado y consolidado sucursales', icon: '📊' },
                { key: 'alarmas',         label: 'Alarmas',                desc: 'Panel de alertas de inventario, órdenes y sistema',      icon: '🔔' },
                { key: 'multiSucursal',   label: 'Multi-Sucursal',         desc: 'Gestión centralizada de varias sucursales',              icon: '🏢' },
              ] as { key: keyof Features; label: string; desc: string; icon: string }[]).map(({ key, label, desc, icon }) => (
                <div key={key} className="flex items-center justify-between p-4 rounded-xl border transition-colors"
                  style={{ borderColor: features[key] ? '#fde68a' : '#e5e7eb', backgroundColor: features[key] ? '#fffdf5' : 'white' }}>
                  <div className="flex items-center gap-3">
                    <span className="text-2xl w-8 text-center">{icon}</span>
                    <div>
                      <p className="text-sm font-semibold text-gray-800">{label}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setFeatures(prev => ({ ...prev, [key]: !prev[key] }))}
                    className="flex-shrink-0 w-12 h-6 rounded-full flex items-center px-1 transition-all duration-200"
                    style={{ backgroundColor: features[key] ? '#f59e0b' : '#d1d5db' }}
                  >
                    <div className="w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-200"
                      style={{ transform: features[key] ? 'translateX(24px)' : 'translateX(0)' }} />
                  </button>
                </div>
              ))}
              <div className="flex items-center gap-3 pt-2">
                <button onClick={handleSaveFeatures} disabled={featuresSaving}
                  className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50 transition-opacity"
                  style={{ backgroundColor: '#1B3A6B' }}>
                  {featuresSaving ? 'Guardando...' : 'Guardar cambios'}
                </button>
                {featuresSaved && (
                  <span className="text-sm font-semibold text-green-600 flex items-center gap-1">
                    ✓ Guardado — recarga la página para ver el menú actualizado
                  </span>
                )}
              </div>
            </div>
      )}
      {activeSection === 'lealtad_config' && (
        <div className="max-w-2xl" style={{display:'flex',flexDirection:'column',gap:16}}>
          <SectionTitle icon={Star} title="Configuración del Programa de Lealtad" />

          {/* Nombre */}
          <div style={{background:'#1a2535',border:'1px solid #1e2d3d',borderRadius:12,padding:'18px 20px'}}>
            <p style={{fontSize:13,fontWeight:700,color:'#f1f5f9',marginBottom:4}}>Nombre del programa</p>
            <p style={{fontSize:12,color:'rgba(255,255,255,0.4)',marginBottom:10}}>Aparece en tickets y notificaciones</p>
            <input value={loyaltyName} onChange={e=>setLoyaltyName(e.target.value)} placeholder="Club de Puntos"
              style={{width:'100%',padding:'9px 12px',borderRadius:8,background:'#0f1923',border:'1px solid #2a3f5f',color:'#f1f5f9',fontSize:13,outline:'none',boxSizing:'border-box'}}/>
          </div>

          {/* Reglas de puntos */}
          <div style={{background:'#1a2535',border:'1px solid #1e2d3d',borderRadius:12,padding:'18px 20px'}}>
            <p style={{fontSize:13,fontWeight:700,color:'#f1f5f9',marginBottom:12}}>Reglas de puntos</p>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:12}}>
              {[
                {label:'$ por 1 punto',key:'pesosPerPoint',val:loyaltyPesosPerPoint,set:setLoyaltyPesosPerPoint,color:'#f59e0b',step:1,min:1,hint:'pesos para ganar 1 pto'},
                {label:'$ por punto al canjear',key:'pointValue',val:loyaltyPointValue,set:setLoyaltyPointValue,color:'#34d399',step:0.01,min:0.01,hint:'valor de cada punto'},
                {label:'Mínimo para canjear',key:'minRedeem',val:loyaltyMinRedeem,set:setLoyaltyMinRedeem,color:'#f1f5f9',step:1,min:0,hint:'puntos mínimos'},
              ].map(f=>(
                <div key={f.key}>
                  <p style={{fontSize:11,color:'rgba(255,255,255,0.5)',marginBottom:6}}>{f.label}</p>
                  <input type="number" min={f.min} step={f.step} value={f.val}
                    onChange={e=>f.set(Number(e.target.value) as any)}
                    style={{width:'100%',padding:'8px 10px',borderRadius:8,background:'#0f1923',border:'1px solid #2a3f5f',color:f.color,fontSize:14,fontWeight:700,outline:'none',boxSizing:'border-box'}}/>
                  <p style={{fontSize:10,color:'rgba(255,255,255,0.3)',marginTop:3}}>{f.hint}</p>
                </div>
              ))}
            </div>
            <div style={{marginTop:12,padding:'10px 14px',borderRadius:8,background:'rgba(245,158,11,0.08)',border:'1px solid rgba(245,158,11,0.2)',fontSize:12,color:'#fbbf24',lineHeight:1.7}}>
              Ejemplo: compra de <strong>$500</strong> → <strong>{Math.floor(500/loyaltyPesosPerPoint)} puntos</strong> · canjear <strong>{loyaltyMinRedeem} puntos</strong> = <strong>${(loyaltyMinRedeem*loyaltyPointValue).toFixed(2)}</strong> de descuento
            </div>
          </div>

          {/* Expiración de puntos */}
          <div style={{background:'#1a2535',border:'1px solid #1e2d3d',borderRadius:12,padding:'18px 20px'}}>
            <p style={{fontSize:13,fontWeight:700,color:'#f1f5f9',marginBottom:4}}>Expiración de puntos</p>
            <p style={{fontSize:12,color:'rgba(255,255,255,0.4)',marginBottom:12}}>Puntos que no se usan después del período configurado</p>
            <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
              {([null,90,180,365] as (number|null)[]).map(d=>(
                <button key={String(d)} onClick={()=>setLoyaltyPointsExpireDays(d)} style={{padding:'7px 16px',borderRadius:8,fontSize:12,fontWeight:600,cursor:'pointer',border:`1px solid ${loyaltyPointsExpireDays===d?'rgba(245,158,11,0.4)':'#2a3f5f'}`,background:loyaltyPointsExpireDays===d?'rgba(245,158,11,0.1)':'#0f1923',color:loyaltyPointsExpireDays===d?'#f59e0b':'rgba(255,255,255,0.5)'}}>
                  {d===null?'No expiran':d===90?'3 meses':d===180?'6 meses':'1 año'}
                </button>
              ))}
            </div>
          </div>

          {/* Auto-expiración */}
          <div style={{background:'#1a2535',border:'1px solid #1e2d3d',borderRadius:12,padding:'18px 20px',display:'flex',alignItems:'center',justifyContent:'space-between',gap:16}}>
            <div>
              <p style={{fontSize:13,fontWeight:700,color:'#f1f5f9',marginBottom:3}}>Auto-expiración de membresías</p>
              <p style={{fontSize:12,color:'rgba(255,255,255,0.4)'}}>Desactivar automáticamente miembros cuya membresía venció. Sin esto, es manual.</p>
            </div>
            <button onClick={()=>setLoyaltyAutoExpire(v=>!v)} style={{position:'relative',width:48,height:26,borderRadius:13,border:'none',cursor:'pointer',flexShrink:0,transition:'background .2s',background:loyaltyAutoExpire?'#f59e0b':'#2a3f5f'}}>
              <span style={{position:'absolute',top:3,width:20,height:20,borderRadius:10,background:'#fff',transition:'left .2s',left:loyaltyAutoExpire?25:3}}/>
            </button>
          </div>

          {/* WhatsApp */}
          <div style={{background:'#1a2535',border:'1px solid #1e2d3d',borderRadius:12,padding:'18px 20px',display:'flex',alignItems:'center',justifyContent:'space-between',gap:16}}>
            <div>
              <p style={{fontSize:13,fontWeight:700,color:'#f1f5f9',marginBottom:3}}>
                Notificaciones WhatsApp
                <span style={{fontSize:10,background:'rgba(16,185,129,0.15)',color:'#34d399',borderRadius:4,padding:'2px 7px',marginLeft:6}}>Próximamente</span>
              </p>
              <p style={{fontSize:12,color:'rgba(255,255,255,0.4)'}}>Enviar saldo de puntos, recordatorios de vencimiento y promos por WhatsApp</p>
            </div>
            <button onClick={()=>setLoyaltyWhatsapp(v=>!v)} style={{position:'relative',width:48,height:26,borderRadius:13,border:'none',cursor:'pointer',flexShrink:0,transition:'background .2s',background:loyaltyWhatsapp?'#f59e0b':'#2a3f5f'}}>
              <span style={{position:'absolute',top:3,width:20,height:20,borderRadius:10,background:'#fff',transition:'left .2s',left:loyaltyWhatsapp?25:3}}/>
            </button>
          </div>

          {/* Niveles */}
          <div style={{background:'#1a2535',border:'1px solid #1e2d3d',borderRadius:12,padding:'18px 20px'}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12}}>
              <div>
                <p style={{fontSize:13,fontWeight:700,color:'#f1f5f9',marginBottom:2}}>Niveles de lealtad</p>
                <p style={{fontSize:12,color:'rgba(255,255,255,0.4)'}}>Bronce, Plata, Oro — configúralos como quieras</p>
              </div>
              <button onClick={()=>setLoyaltyLevels(prev=>[...prev,{name:'Nuevo nivel',min:100,color:'#f59e0b',benefit:''}])}
                style={{display:'flex',alignItems:'center',gap:5,padding:'6px 14px',borderRadius:8,background:'rgba(245,158,11,0.1)',border:'1px solid rgba(245,158,11,0.25)',color:'#f59e0b',fontSize:12,fontWeight:600,cursor:'pointer'}}>
                + Agregar nivel
              </button>
            </div>
            {loyaltyLevels.length===0?(
              <p style={{fontSize:12,color:'rgba(255,255,255,0.3)',fontStyle:'italic',textAlign:'center',padding:'16px 0'}}>Sin niveles — todos los miembros son iguales</p>
            ):(
              <div style={{display:'flex',flexDirection:'column',gap:8}}>
                {loyaltyLevels.map((lv,idx)=>(
                  <div key={idx} style={{display:'grid',gridTemplateColumns:'1fr 90px 1fr 28px',gap:8,alignItems:'center'}}>
                    <input value={lv.name} onChange={e=>setLoyaltyLevels(prev=>prev.map((l,i)=>i===idx?{...l,name:e.target.value}:l))} placeholder="Nombre"
                      style={{padding:'7px 10px',borderRadius:7,background:'#0f1923',border:`1px solid ${lv.color}55`,color:'#f1f5f9',fontSize:13,outline:'none'}}/>
                    <input type="number" min={0} value={lv.min} onChange={e=>setLoyaltyLevels(prev=>prev.map((l,i)=>i===idx?{...l,min:Number(e.target.value)}:l))}
                      style={{width:'100%',padding:'7px 8px',borderRadius:7,background:'#0f1923',border:'1px solid #2a3f5f',color:'#f59e0b',fontSize:13,fontWeight:700,outline:'none'}}/>
                    <input value={lv.benefit} onChange={e=>setLoyaltyLevels(prev=>prev.map((l,i)=>i===idx?{...l,benefit:e.target.value}:l))} placeholder="Beneficio (ej. 10% dto)"
                      style={{padding:'7px 10px',borderRadius:7,background:'#0f1923',border:'1px solid #2a3f5f',color:'rgba(255,255,255,0.7)',fontSize:12,outline:'none'}}/>
                    <button onClick={()=>setLoyaltyLevels(prev=>prev.filter((_,i)=>i!==idx))}
                      style={{width:28,height:28,borderRadius:7,background:'rgba(239,68,68,0.1)',border:'1px solid rgba(239,68,68,0.2)',color:'#f87171',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>
                      ✕
                    </button>
                  </div>
                ))}
                <p style={{fontSize:10,color:'rgba(255,255,255,0.3)',marginTop:4}}>Min. puntos = umbral para alcanzar ese nivel</p>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button onClick={handleSaveLoyalty} disabled={loyaltySaving}
              className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50"
              style={{ backgroundColor: '#1B3A6B' }}>
              {loyaltySaving ? 'Guardando...' : 'Guardar configuración'}
            </button>
            {loyaltySaved && <span className="text-sm font-semibold text-green-600">✓ Configuración guardada</span>}
          </div>
        </div>
      )}
            {activeSection === 'sistema' && (
        <div className="max-w-2xl">
              <SectionTitle icon={Settings2} title="Configuración del Sistema" />

              {/* WhatsApp monthly report */}
              <WhatsAppReportToggle />

              {/* Reset system */}
              {resetSuccess && (
                <div className="mb-4 px-4 py-3 rounded-xl text-sm flex items-center gap-2" style={{ backgroundColor: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.3)', color: '#4ade80' }}>
                  <CheckCircle size={15} /> Sistema reseteado exitosamente
                </div>
              )}

              <div className="rounded-xl p-5" style={{ backgroundColor: '#1a2535', border: '1px solid rgba(239,68,68,0.25)' }}>
                <div className="flex items-center gap-2 mb-1">
                  <RotateCcw size={16} style={{ color: '#ef4444' }} />
                  <h3 className="text-sm font-bold" style={{ color: '#f1f5f9' }}>Resetear Sistema</h3>
                </div>
                <p className="text-xs mb-4" style={{ color: 'rgba(255,255,255,0.4)' }}>
                  Elimina <strong style={{ color: 'rgba(255,255,255,0.6)' }}>todos los datos operativos</strong>: órdenes, mesas, layout, movimientos de inventario y pagos de gastos. El sistema queda completamente vacío listo para un nuevo cliente. Los usuarios, menú e ingredientes se conservan.
                </p>
                <div className="flex items-start gap-3 p-3 rounded-lg mb-4" style={{ backgroundColor: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
                  <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" style={{ color: '#f87171' }} />
                  <p className="text-xs" style={{ color: '#f87171' }}>
                    Esta acción no se puede deshacer. Se eliminarán órdenes, mesas, layout del restaurante, movimientos de stock y pagos de gastos. Requiere contraseña de administrador.
                  </p>
                </div>
                <button
                  onClick={() => { setResetModal(true); setResetPassword(''); setResetError(''); }}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all"
                  style={{ backgroundColor: 'rgba(239,68,68,0.15)', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)' }}
                >
                  <RotateCcw size={15} /> Resetear Sistema
                </button>
              </div>
            </div>
      )}
      {activeSection === 'usuarios' && <UsuariosManagement />}
    </div>
  );
}