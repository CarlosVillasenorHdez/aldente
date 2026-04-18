'use client';
import { getCurrentTenantId as getTenantId } from '@/lib/tenantStore';
import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { Star, Plus, Search, Gift, TrendingUp, Users, X, ArrowUpCircle, ArrowDownCircle, History, Settings, Save, CheckCircle, Trash2 } from 'lucide-react';
import { invalidateSysConfigCache } from '@/hooks/useSysConfig';

interface LoyaltyCustomer { id:string; name:string; phone:string; email:string; points:number; totalSpent:number; totalVisits:number; isActive:boolean; membershipExpiresAt:string|null; }
interface LoyaltyTransaction { id:string; customerId:string; type:'acumulacion'|'canje'; points:number; amount:number; notes:string; createdAt:string; }
interface LoyaltyLevel { name:string; minPoints:number; color:string; benefit:string; }
interface LoyaltyConfig { programName:string; pesosPerPoint:number; pointValue:number; minRedeem:number; pointsExpireDays:number|null; autoExpireMemberships:boolean; whatsappNotifications:boolean; levels:LoyaltyLevel[]; }

const DEFAULT_CONFIG: LoyaltyConfig = { programName:'Club de Puntos', pesosPerPoint:10, pointValue:0.5, minRedeem:50, pointsExpireDays:null, autoExpireMemberships:true, whatsappNotifications:false, levels:[] };
const LEVEL_COLORS = ['#f59e0b','#94a3b8','#f97316','#8b5cf6','#10b981'];

export default function LoyaltyManagement() {
  const supabase = createClient();
  const [activeTab, setActiveTab] = useState<'miembros'|'config'>('miembros');
  const [cfg, setCfg] = useState<LoyaltyConfig>(DEFAULT_CONFIG);
  const [cfgDraft, setCfgDraft] = useState<LoyaltyConfig>(DEFAULT_CONFIG);
  const [cfgSaved, setCfgSaved] = useState(false);
  const [customers, setCustomers] = useState<LoyaltyCustomer[]>([]);
  const [transactions, setTransactions] = useState<LoyaltyTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<LoyaltyCustomer|null>(null);
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [showTransaction, setShowTransaction] = useState<'acumulacion'|'canje'|null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [customerForm, setCustomerForm] = useState({name:'',phone:'',email:''});
  const [txForm, setTxForm] = useState({amount:0,notes:''});
  const [saving, setSaving] = useState(false);

  const loadConfig = useCallback(async () => {
    const {data} = await supabase.from('system_config').select('config_key,config_value').eq('tenant_id',getTenantId()).like('config_key','loyalty_%');
    const map:Record<string,string>={};
    (data||[]).forEach((r:any)=>{map[r.config_key]=r.config_value;});
    const loaded:LoyaltyConfig={
      programName:           map['loyalty_program_name']??DEFAULT_CONFIG.programName,
      pesosPerPoint:         Number(map['loyalty_pesos_per_point']??DEFAULT_CONFIG.pesosPerPoint),
      pointValue:            Number(map['loyalty_point_value']??DEFAULT_CONFIG.pointValue),
      minRedeem:             Number(map['loyalty_min_redeem']??DEFAULT_CONFIG.minRedeem),
      pointsExpireDays:      map['loyalty_points_expire_days']?Number(map['loyalty_points_expire_days']):null,
      autoExpireMemberships: map['loyalty_auto_expire_memberships']!=='false',
      whatsappNotifications: map['loyalty_whatsapp_notifications']==='true',
      levels:(()=>{try{return JSON.parse(map['loyalty_levels']??'[]');}catch{return [];}})(),
    };
    setCfg(loaded); setCfgDraft(loaded);
  },[supabase]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const {data,error}=await supabase.from('loyalty_customers').select('*').eq('tenant_id',getTenantId()).order('points',{ascending:false});
      if(error)throw error;
      setCustomers((data||[]).map((c:any)=>({id:c.id,name:c.name,phone:c.phone??'',email:c.email??'',points:c.points,totalSpent:Number(c.total_spent),totalVisits:c.total_visits,isActive:c.is_active,membershipExpiresAt:c.membership_expires_at??null})));
    }catch(err:any){toast.error('Error: '+err.message);}
    finally{setLoading(false);}
  },[supabase]);

  useEffect(()=>{loadConfig();loadData();},[loadConfig,loadData]);

  useEffect(()=>{
    if(!cfg.autoExpireMemberships)return;
    const now=new Date().toISOString();
    customers.forEach(async c=>{
      if(c.isActive&&c.membershipExpiresAt&&c.membershipExpiresAt<now){
        await supabase.from('loyalty_customers').update({is_active:false,updated_at:now}).eq('id',c.id);
      }
    });
  },[customers,cfg.autoExpireMemberships,supabase]);

  const loadTransactions=async(customerId:string)=>{
    const {data}=await supabase.from('loyalty_transactions').select('*').eq('tenant_id',getTenantId()).eq('customer_id',customerId).order('created_at',{ascending:false}).limit(20);
    setTransactions((data||[]).map((t:any)=>({id:t.id,customerId:t.customer_id,type:t.type,points:t.points,amount:Number(t.amount),notes:t.notes,createdAt:t.created_at})));
  };

  function getLevel(points:number):LoyaltyLevel|null{
    if(cfg.levels.length===0)return null;
    const sorted=[...cfg.levels].sort((a,b)=>b.minPoints-a.minPoints);
    return sorted.find(l=>points>=l.minPoints)??null;
  }

  const handleAddCustomer=async()=>{
    if(!customerForm.name.trim()){toast.error('El nombre es obligatorio');return;}
    setSaving(true);
    try{
      const {error}=await supabase.from('loyalty_customers').insert({tenant_id:getTenantId(),name:customerForm.name.trim(),phone:customerForm.phone,email:customerForm.email});
      if(error)throw error;
      toast.success('Cliente registrado');setShowAddCustomer(false);setCustomerForm({name:'',phone:'',email:''});loadData();
    }catch(err:any){toast.error('Error: '+err.message);}finally{setSaving(false);}
  };

  const handleTransaction=async()=>{
    if(!selectedCustomer||!showTransaction)return;
    if(txForm.amount<=0){toast.error('Ingresa un monto válido');return;}
    let points=0;
    if(showTransaction==='acumulacion'){points=Math.floor(txForm.amount/cfg.pesosPerPoint);}
    else{points=Math.floor(txForm.amount/cfg.pointValue);if(points>selectedCustomer.points){toast.error(`Solo tiene ${selectedCustomer.points} puntos`);return;}}
    if(points===0){toast.error('El monto no genera puntos suficientes');return;}
    setSaving(true);
    try{
      const newPoints=showTransaction==='acumulacion'?selectedCustomer.points+points:selectedCustomer.points-points;
      await supabase.from('loyalty_transactions').insert({tenant_id:getTenantId(),customer_id:selectedCustomer.id,type:showTransaction,points,amount:txForm.amount,notes:txForm.notes});
      await supabase.from('loyalty_customers').update({points:newPoints,total_spent:showTransaction==='acumulacion'?selectedCustomer.totalSpent+txForm.amount:selectedCustomer.totalSpent,total_visits:showTransaction==='acumulacion'?selectedCustomer.totalVisits+1:selectedCustomer.totalVisits,updated_at:new Date().toISOString()}).eq('id',selectedCustomer.id);
      toast.success(showTransaction==='acumulacion'?`+${points} puntos acumulados`:`${points} pts canjeados por $${(points*cfg.pointValue).toFixed(2)}`);
      setShowTransaction(null);setTxForm({amount:0,notes:''});loadData();setSelectedCustomer({...selectedCustomer,points:newPoints});
    }catch(err:any){toast.error('Error: '+err.message);}finally{setSaving(false);}
  };

  async function handleSaveConfig(){
    const tid=getTenantId();
    const rows=[
      {tenant_id:tid,config_key:'loyalty_program_name',config_value:cfgDraft.programName},
      {tenant_id:tid,config_key:'loyalty_pesos_per_point',config_value:String(cfgDraft.pesosPerPoint)},
      {tenant_id:tid,config_key:'loyalty_point_value',config_value:String(cfgDraft.pointValue)},
      {tenant_id:tid,config_key:'loyalty_min_redeem',config_value:String(cfgDraft.minRedeem)},
      {tenant_id:tid,config_key:'loyalty_points_expire_days',config_value:cfgDraft.pointsExpireDays!=null?String(cfgDraft.pointsExpireDays):''},
      {tenant_id:tid,config_key:'loyalty_auto_expire_memberships',config_value:String(cfgDraft.autoExpireMemberships)},
      {tenant_id:tid,config_key:'loyalty_whatsapp_notifications',config_value:String(cfgDraft.whatsappNotifications)},
      {tenant_id:tid,config_key:'loyalty_levels',config_value:JSON.stringify(cfgDraft.levels)},
    ];
    await supabase.from('system_config').upsert(rows,{onConflict:'tenant_id,config_key'});
    setCfg(cfgDraft);invalidateSysConfigCache();setCfgSaved(true);setTimeout(()=>setCfgSaved(false),2500);
    toast.success('Configuración guardada');
  }

  const filtered=customers.filter(c=>c.name.toLowerCase().includes(search.toLowerCase())||c.phone.includes(search)||c.email.toLowerCase().includes(search.toLowerCase()));
  const totalPoints=customers.filter(c=>c.isActive).reduce((s,c)=>s+c.points,0);
  const totalMembers=customers.filter(c=>c.isActive).length;

  if(loading)return<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{borderColor:'#f59e0b'}}/></div>;

  return(
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {label:'Miembros Activos',value:totalMembers,icon:Users,color:'#1B3A6B'},
          {label:'Puntos en Circulación',value:totalPoints.toLocaleString(),icon:Star,color:'#f59e0b'},
          {label:'Valor en Puntos',value:`$${(totalPoints*cfg.pointValue).toLocaleString('es-MX',{minimumFractionDigits:2})}`,icon:Gift,color:'#10b981'},
          {label:'Visitas Totales',value:customers.reduce((s,c)=>s+c.totalVisits,0),icon:TrendingUp,color:'#8b5cf6'},
        ].map(k=>(
          <div key={k.label} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{backgroundColor:k.color+'15'}}>
              <k.icon size={20} style={{color:k.color}}/>
            </div>
            <div><p className="text-xs text-gray-500">{k.label}</p><p className="text-lg font-bold text-gray-800">{k.value}</p></div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{display:'flex',gap:4,background:'#f1f5f9',borderRadius:10,padding:4,width:'fit-content'}}>
        {([{key:'miembros',label:'Miembros',icon:<Users size={14}/>},{key:'config',label:'Configuración',icon:<Settings size={14}/>}] as const).map(t=>(
          <button key={t.key} onClick={()=>setActiveTab(t.key)} style={{display:'flex',alignItems:'center',gap:6,padding:'7px 16px',borderRadius:7,fontSize:13,fontWeight:600,cursor:'pointer',border:'none',transition:'all .15s',background:activeTab===t.key?'#fff':'transparent',color:activeTab===t.key?'#1B3A6B':'#64748b',boxShadow:activeTab===t.key?'0 1px 4px rgba(0,0,0,0.1)':'none'}}>
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      {/* ── MIEMBROS ── */}
      {activeTab==='miembros'&&(<>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1"><Star size={15} className="text-amber-600"/><span className="text-sm font-semibold text-amber-800">{cfg.programName}</span></div>
          <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-amber-700">
            <span>• 1 punto por cada ${cfg.pesosPerPoint} pesos</span>
            <span>• Cada punto vale ${cfg.pointValue.toFixed(2)} al canjear</span>
            <span>• Mínimo para canjear: {cfg.minRedeem} puntos</span>
            {cfg.pointsExpireDays&&<span>• Puntos expiran en {cfg.pointsExpireDays} días</span>}
          </div>
        </div>
        <div className="flex flex-wrap gap-3 items-center justify-between">
          <div className="relative flex-1 max-w-xs">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
            <input type="text" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar cliente..." className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"/>
          </div>
          <button onClick={()=>setShowAddCustomer(true)} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white" style={{backgroundColor:'#1B3A6B'}}>
            <Plus size={16}/> Nuevo Miembro
          </button>
        </div>
        <div className="space-y-3">
          {filtered.length===0?(
            <div className="text-center py-12 text-gray-400"><Users size={40} className="mx-auto mb-3 opacity-30"/><p className="text-sm">Sin miembros registrados</p></div>
          ):filtered.map(customer=>{
            const level=getLevel(customer.points);
            const expired=customer.membershipExpiresAt&&new Date(customer.membershipExpiresAt)<new Date();
            const expiringSoon=customer.membershipExpiresAt&&!expired&&(new Date(customer.membershipExpiresAt).getTime()-Date.now())/86400000<=14;
            return(
              <div key={customer.id} className="bg-white rounded-xl p-4 shadow-sm border flex items-center gap-4" style={{borderColor:expired?'#fecaca':expiringSoon?'#fde68a':'#e5e7eb',opacity:customer.isActive?1:0.55}}>
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0" style={{backgroundColor:level?.color??'#1B3A6B'}}>
                  {customer.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-gray-800 text-sm truncate">{customer.name}</p>
                    {level&&<span className="text-xs px-2 py-0.5 rounded-full font-semibold flex-shrink-0" style={{background:level.color+'22',color:level.color}}>{level.name}</span>}
                    {!customer.isActive&&<span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-600 font-medium">Inactivo</span>}
                  </div>
                  <div className="flex items-center gap-3 mt-0.5">
                    <p className="text-xs text-gray-500">{customer.phone||customer.email||'—'}</p>
                    {customer.membershipExpiresAt&&(
                      <p className={`text-xs font-medium ${expired?'text-red-500':expiringSoon?'text-amber-500':'text-green-600'}`}>
                        {expired?'⚠ Membresía vencida':`Vence ${new Date(customer.membershipExpiresAt).toLocaleDateString('es-MX',{day:'2-digit',month:'short'})}`}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-4 mt-1">
                    <div className="flex items-center gap-1"><Star size={12} className="text-amber-500"/><span className="text-sm font-bold text-gray-700">{customer.points.toLocaleString()} pts</span></div>
                    <span className="text-xs text-gray-400">${customer.totalSpent.toLocaleString('es-MX',{minimumFractionDigits:0})} gastados</span>
                    <span className="text-xs text-gray-400">{customer.totalVisits} visitas</span>
                  </div>
                </div>
                <div className="flex flex-col gap-1.5 flex-shrink-0">
                  <button onClick={()=>{setSelectedCustomer(customer);setShowTransaction('acumulacion');setTxForm({amount:0,notes:''}); }} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-white" style={{backgroundColor:'#f59e0b'}}><ArrowUpCircle size={12}/> Acumular</button>
                  <button onClick={()=>{setSelectedCustomer(customer);setShowTransaction('canje');setTxForm({amount:0,notes:''});}} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-white" style={{backgroundColor:'#10b981'}}><Gift size={12}/> Canjear</button>
                  <button onClick={()=>{setSelectedCustomer(customer);loadTransactions(customer.id);setShowHistory(true);}} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-600 bg-gray-100"><History size={12}/> Historial</button>
                </div>
              </div>
            );
          })}
        </div>
      </>)}

      {/* ── CONFIG ── */}
      {activeTab==='config'&&(
        <div style={{maxWidth:640,display:'flex',flexDirection:'column',gap:16}}>
          {/* Nombre */}
          <div style={{background:'#1a2535',border:'1px solid #1e2d3d',borderRadius:12,padding:'18px 20px'}}>
            <p style={{fontSize:13,fontWeight:700,color:'#f1f5f9',marginBottom:4}}>Nombre del programa</p>
            <p style={{fontSize:12,color:'rgba(255,255,255,0.4)',marginBottom:10}}>Aparece en tickets y notificaciones</p>
            <input value={cfgDraft.programName} onChange={e=>setCfgDraft(d=>({...d,programName:e.target.value}))} placeholder="Club de Puntos" style={{width:'100%',padding:'9px 12px',borderRadius:8,background:'#0f1923',border:'1px solid #2a3f5f',color:'#f1f5f9',fontSize:13,outline:'none',boxSizing:'border-box'}}/>
          </div>
          {/* Reglas */}
          <div style={{background:'#1a2535',border:'1px solid #1e2d3d',borderRadius:12,padding:'18px 20px'}}>
            <p style={{fontSize:13,fontWeight:700,color:'#f1f5f9',marginBottom:12}}>Reglas de puntos</p>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:12}}>
              {[
                {label:'$ por 1 punto',key:'pesosPerPoint',color:'#f59e0b',step:1,min:1,hint:'pesos para ganar 1 pto'},
                {label:'$ por punto al canjear',key:'pointValue',color:'#34d399',step:0.01,min:0.01,hint:'valor de cada punto'},
                {label:'Mínimo para canjear',key:'minRedeem',color:'#f1f5f9',step:1,min:1,hint:'puntos mínimos'},
              ].map(f=>(
                <div key={f.key}>
                  <p style={{fontSize:11,color:'rgba(255,255,255,0.5)',marginBottom:6}}>{f.label}</p>
                  <input type="number" min={f.min} step={f.step} value={(cfgDraft as any)[f.key]}
                    onChange={e=>setCfgDraft(d=>({...d,[f.key]:Number(e.target.value)}))}
                    style={{width:'100%',padding:'8px 10px',borderRadius:8,background:'#0f1923',border:'1px solid #2a3f5f',color:f.color,fontSize:14,fontWeight:700,outline:'none',boxSizing:'border-box'}}/>
                  <p style={{fontSize:10,color:'rgba(255,255,255,0.3)',marginTop:3}}>{f.hint}</p>
                </div>
              ))}
            </div>
            <div style={{marginTop:12,padding:'10px 14px',borderRadius:8,background:'rgba(245,158,11,0.08)',border:'1px solid rgba(245,158,11,0.2)',fontSize:12,color:'#fbbf24',lineHeight:1.7}}>
              Ejemplo: compra de <strong>$500</strong> → <strong>{Math.floor(500/cfgDraft.pesosPerPoint)} puntos</strong> · canjear <strong>{cfgDraft.minRedeem} puntos</strong> = <strong>${(cfgDraft.minRedeem*cfgDraft.pointValue).toFixed(2)}</strong> de descuento
            </div>
          </div>
          {/* Expiración puntos */}
          <div style={{background:'#1a2535',border:'1px solid #1e2d3d',borderRadius:12,padding:'18px 20px'}}>
            <p style={{fontSize:13,fontWeight:700,color:'#f1f5f9',marginBottom:4}}>Expiración de puntos</p>
            <p style={{fontSize:12,color:'rgba(255,255,255,0.4)',marginBottom:12}}>Puntos que no se usan después del período configurado</p>
            <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
              {([null,90,180,365] as (number|null)[]).map(d=>(
                <button key={String(d)} onClick={()=>setCfgDraft(dr=>({...dr,pointsExpireDays:d}))} style={{padding:'7px 16px',borderRadius:8,fontSize:12,fontWeight:600,cursor:'pointer',border:`1px solid ${cfgDraft.pointsExpireDays===d?'rgba(245,158,11,0.4)':'#2a3f5f'}`,background:cfgDraft.pointsExpireDays===d?'rgba(245,158,11,0.1)':'#0f1923',color:cfgDraft.pointsExpireDays===d?'#f59e0b':'rgba(255,255,255,0.5)'}}>
                  {d===null?'No expiran':d===90?'3 meses':d===180?'6 meses':'1 año'}
                </button>
              ))}
            </div>
          </div>
          {/* Auto-expiración membresías */}
          <div style={{background:'#1a2535',border:'1px solid #1e2d3d',borderRadius:12,padding:'18px 20px',display:'flex',alignItems:'center',justifyContent:'space-between',gap:16}}>
            <div>
              <p style={{fontSize:13,fontWeight:700,color:'#f1f5f9',marginBottom:3}}>Auto-expiración de membresías</p>
              <p style={{fontSize:12,color:'rgba(255,255,255,0.4)'}}>Desactivar automáticamente miembros cuya membresía venció. Sin esto, es manual.</p>
            </div>
            <button onClick={()=>setCfgDraft(d=>({...d,autoExpireMemberships:!d.autoExpireMemberships}))} style={{position:'relative',width:48,height:26,borderRadius:13,border:'none',cursor:'pointer',flexShrink:0,transition:'background .2s',background:cfgDraft.autoExpireMemberships?'#f59e0b':'#2a3f5f'}}>
              <span style={{position:'absolute',top:3,width:20,height:20,borderRadius:10,background:'#fff',transition:'left .2s',left:cfgDraft.autoExpireMemberships?25:3}}/>
            </button>
          </div>
          {/* WhatsApp */}
          <div style={{background:'#1a2535',border:'1px solid #1e2d3d',borderRadius:12,padding:'18px 20px',display:'flex',alignItems:'center',justifyContent:'space-between',gap:16}}>
            <div>
              <p style={{fontSize:13,fontWeight:700,color:'#f1f5f9',marginBottom:3}}>Notificaciones WhatsApp <span style={{fontSize:10,background:'rgba(16,185,129,0.15)',color:'#34d399',borderRadius:4,padding:'2px 7px',marginLeft:6}}>Próximamente</span></p>
              <p style={{fontSize:12,color:'rgba(255,255,255,0.4)'}}>Enviar puntos, recordatorios de vencimiento y promos por WhatsApp</p>
            </div>
            <button onClick={()=>setCfgDraft(d=>({...d,whatsappNotifications:!d.whatsappNotifications}))} style={{position:'relative',width:48,height:26,borderRadius:13,border:'none',cursor:'pointer',flexShrink:0,transition:'background .2s',background:cfgDraft.whatsappNotifications?'#f59e0b':'#2a3f5f'}}>
              <span style={{position:'absolute',top:3,width:20,height:20,borderRadius:10,background:'#fff',transition:'left .2s',left:cfgDraft.whatsappNotifications?25:3}}/>
            </button>
          </div>
          {/* Niveles */}
          <div style={{background:'#1a2535',border:'1px solid #1e2d3d',borderRadius:12,padding:'18px 20px'}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12}}>
              <div>
                <p style={{fontSize:13,fontWeight:700,color:'#f1f5f9',marginBottom:2}}>Niveles de lealtad</p>
                <p style={{fontSize:12,color:'rgba(255,255,255,0.4)'}}>Bronce, Plata, Oro — configúralos como quieras</p>
              </div>
              <button onClick={()=>setCfgDraft(d=>({...d,levels:[...d.levels,{name:'Nuevo nivel',minPoints:100,color:LEVEL_COLORS[d.levels.length%LEVEL_COLORS.length],benefit:''}]}))} style={{display:'flex',alignItems:'center',gap:5,padding:'6px 14px',borderRadius:8,background:'rgba(245,158,11,0.1)',border:'1px solid rgba(245,158,11,0.25)',color:'#f59e0b',fontSize:12,fontWeight:600,cursor:'pointer'}}>
                <Plus size={13}/> Agregar nivel
              </button>
            </div>
            {cfgDraft.levels.length===0?(
              <p style={{fontSize:12,color:'rgba(255,255,255,0.3)',fontStyle:'italic',textAlign:'center',padding:'16px 0'}}>Sin niveles — todos los miembros son iguales</p>
            ):(
              <div style={{display:'flex',flexDirection:'column',gap:8}}>
                {cfgDraft.levels.map((lv,idx)=>(
                  <div key={idx} style={{display:'grid',gridTemplateColumns:'1fr 90px 1fr 28px',gap:8,alignItems:'center'}}>
                    <input value={lv.name} onChange={e=>setCfgDraft(d=>{const ls=[...d.levels];ls[idx]={...ls[idx],name:e.target.value};return{...d,levels:ls};})} placeholder="Nombre" style={{padding:'7px 10px',borderRadius:7,background:'#0f1923',border:`1px solid ${lv.color}55`,color:'#f1f5f9',fontSize:13,outline:'none'}}/>
                    <input type="number" min={0} value={lv.minPoints} onChange={e=>setCfgDraft(d=>{const ls=[...d.levels];ls[idx]={...ls[idx],minPoints:Number(e.target.value)};return{...d,levels:ls};})} style={{width:'100%',padding:'7px 8px',borderRadius:7,background:'#0f1923',border:'1px solid #2a3f5f',color:'#f59e0b',fontSize:13,fontWeight:700,outline:'none'}}/>
                    <input value={lv.benefit} onChange={e=>setCfgDraft(d=>{const ls=[...d.levels];ls[idx]={...ls[idx],benefit:e.target.value};return{...d,levels:ls};})} placeholder="Beneficio (ej. 10% dto)" style={{padding:'7px 10px',borderRadius:7,background:'#0f1923',border:'1px solid #2a3f5f',color:'rgba(255,255,255,0.7)',fontSize:12,outline:'none'}}/>
                    <button onClick={()=>setCfgDraft(d=>({...d,levels:d.levels.filter((_,i)=>i!==idx)}))} style={{width:28,height:28,borderRadius:7,background:'rgba(239,68,68,0.1)',border:'1px solid rgba(239,68,68,0.2)',color:'#f87171',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>
                      <Trash2 size={12}/>
                    </button>
                  </div>
                ))}
                <p style={{fontSize:10,color:'rgba(255,255,255,0.3)',marginTop:4}}>Min. puntos = umbral para alcanzar ese nivel</p>
              </div>
            )}
          </div>
          {/* Save */}
          <button onClick={handleSaveConfig} style={{display:'flex',alignItems:'center',gap:8,padding:'11px 24px',borderRadius:10,border:'none',cursor:'pointer',fontSize:13,fontWeight:700,transition:'all .2s',width:'fit-content',background:cfgSaved?'rgba(34,197,94,0.15)':'#f59e0b',color:cfgSaved?'#22c55e':'#1B3A6B'}}>
            {cfgSaved?<><CheckCircle size={16}/>Guardado</>:<><Save size={16}/>Guardar configuración</>}
          </button>
        </div>
      )}

      {/* Modal nuevo miembro */}
      {showAddCustomer&&(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{backgroundColor:'rgba(0,0,0,0.5)'}}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between mb-4"><h3 className="text-lg font-bold text-gray-800">Nuevo Miembro</h3><button onClick={()=>setShowAddCustomer(false)}><X size={20} className="text-gray-400"/></button></div>
            <div className="space-y-3">
              {[{label:'Nombre *',key:'name',placeholder:'Nombre completo',type:'text'},{label:'Teléfono',key:'phone',placeholder:'55 1234 5678',type:'tel'},{label:'Email',key:'email',placeholder:'correo@email.com',type:'email'}].map(f=>(
                <div key={f.key}><label className="block text-xs font-medium text-gray-500 mb-1">{f.label}</label><input type={f.type} placeholder={f.placeholder} value={(customerForm as any)[f.key]} onChange={e=>setCustomerForm(p=>({...p,[f.key]:e.target.value}))} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"/></div>
              ))}
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={()=>setShowAddCustomer(false)} className="flex-1 py-2.5 rounded-lg text-sm font-medium text-gray-600 bg-gray-100">Cancelar</button>
              <button onClick={handleAddCustomer} disabled={saving} className="flex-1 py-2.5 rounded-lg text-sm font-bold text-white disabled:opacity-50" style={{backgroundColor:'#1B3A6B'}}>{saving?'Guardando...':'Registrar'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal transacción */}
      {showTransaction&&selectedCustomer&&(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{backgroundColor:'rgba(0,0,0,0.5)'}}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <div className="flex items-center justify-between mb-4"><h3 className="text-lg font-bold text-gray-800">{showTransaction==='acumulacion'?'+ Acumular Puntos':'🎁 Canjear Puntos'}</h3><button onClick={()=>setShowTransaction(null)}><X size={20} className="text-gray-400"/></button></div>
            <p className="text-sm text-gray-500 mb-4">{selectedCustomer.name} — {selectedCustomer.points} pts disponibles</p>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">{showTransaction==='acumulacion'?'Monto de la compra ($)':'Monto a canjear en puntos ($)'}</label>
                <input type="number" min={0} step={1} value={txForm.amount||''} onChange={e=>setTxForm(p=>({...p,amount:Number(e.target.value)}))} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" placeholder="0.00" autoFocus/>
                {txForm.amount>0&&<p className="text-xs mt-1" style={{color:showTransaction==='acumulacion'?'#f59e0b':'#10b981'}}>{showTransaction==='acumulacion'?`+${Math.floor(txForm.amount/cfg.pesosPerPoint)} puntos`:`${Math.floor(txForm.amount/cfg.pointValue)} puntos → $${txForm.amount.toFixed(2)} descuento`}</p>}
              </div>
              <div><label className="block text-xs font-medium text-gray-500 mb-1">Notas (opcional)</label><input type="text" value={txForm.notes} onChange={e=>setTxForm(p=>({...p,notes:e.target.value}))} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none" placeholder="Referencia..."/></div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={()=>setShowTransaction(null)} className="flex-1 py-2.5 rounded-lg text-sm font-medium text-gray-600 bg-gray-100">Cancelar</button>
              <button onClick={handleTransaction} disabled={saving} className="flex-1 py-2.5 rounded-lg text-sm font-bold text-white disabled:opacity-50" style={{backgroundColor:showTransaction==='acumulacion'?'#f59e0b':'#10b981'}}>{saving?'Guardando...':'Confirmar'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal historial */}
      {showHistory&&selectedCustomer&&(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{backgroundColor:'rgba(0,0,0,0.5)'}}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4"><h3 className="text-lg font-bold text-gray-800">Historial — {selectedCustomer.name}</h3><button onClick={()=>setShowHistory(false)}><X size={20} className="text-gray-400"/></button></div>
            {transactions.length===0?<p className="text-sm text-gray-400 text-center py-8">Sin transacciones</p>:(
              <div className="space-y-2">
                {transactions.map(tx=>(
                  <div key={tx.id} className="flex items-center gap-3 p-3 rounded-lg bg-gray-50">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${tx.type==='acumulacion'?'bg-amber-100':'bg-green-100'}`}>
                      {tx.type==='acumulacion'?<ArrowUpCircle size={14} className="text-amber-600"/>:<ArrowDownCircle size={14} className="text-green-600"/>}
                    </div>
                    <div className="flex-1"><p className="text-xs font-semibold text-gray-700">{tx.type==='acumulacion'?`+${tx.points} pts`:`-${tx.points} pts`}</p><p className="text-xs text-gray-400">{tx.notes||'—'} · {new Date(tx.createdAt).toLocaleDateString('es-MX')}</p></div>
                    <p className="text-xs font-semibold text-gray-600">${tx.amount.toFixed(0)}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
