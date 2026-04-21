'use client';
import { getCurrentTenantId as getTenantId } from '@/lib/tenantStore';
import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { Star, Plus, Search, Gift, TrendingUp, Users, X, ArrowUpCircle, ArrowDownCircle, History } from 'lucide-react';

interface LoyaltyCustomer { id:string; name:string; phone:string; email:string; points:number; totalSpent:number; totalVisits:number; isActive:boolean; membershipExpiresAt:string|null; }
interface LoyaltyTransaction { id:string; customerId:string; type:'acumulacion'|'canje'; points:number; amount:number; notes:string; createdAt:string; }
interface LoyaltyLevel { name:string; minPoints:number; color:string; benefit:string; }
interface LoyaltyConfig { programName:string; pesosPerPoint:number; pointValue:number; minRedeem:number; pointsExpireDays:number|null; autoExpireMemberships:boolean; whatsappNotifications:boolean; levels:LoyaltyLevel[]; }

const DEFAULT_CONFIG: LoyaltyConfig = { programName:'Club de Puntos', pesosPerPoint:10, pointValue:0.5, minRedeem:50, pointsExpireDays:null, autoExpireMemberships:true, whatsappNotifications:false, levels:[] };

export default function LoyaltyManagement() {
  const supabase = createClient();
  const [cfg, setCfg] = useState<LoyaltyConfig>(DEFAULT_CONFIG);
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

  // ── Load config from system_config ──────────────────────────────────────────
  const loadConfig = useCallback(async () => {
    const {data} = await supabase.from('system_config').select('config_key,config_value').eq('tenant_id',getTenantId()).like('config_key','loyalty_%');
    const map:Record<string,string>={};
    (data||[]).forEach((r:any)=>{map[r.config_key]=r.config_value;});
    setCfg({
      programName:           map['loyalty_program_name']??DEFAULT_CONFIG.programName,
      pesosPerPoint:         Number(map['loyalty_pesos_per_point']??DEFAULT_CONFIG.pesosPerPoint),
      pointValue:            Number(map['loyalty_point_value']??DEFAULT_CONFIG.pointValue),
      minRedeem:             Number(map['loyalty_min_redeem']??DEFAULT_CONFIG.minRedeem),
      pointsExpireDays:      map['loyalty_points_expire_days']?Number(map['loyalty_points_expire_days']):null,
      autoExpireMemberships: map['loyalty_auto_expire_memberships']!=='false',
      whatsappNotifications: map['loyalty_whatsapp_notifications']==='true',
      levels:(()=>{try{return JSON.parse(map['loyalty_levels']??'[]');}catch{return [];}})(),
    });
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

  // Auto-expire memberships on load
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

  async function sendWhatsAppNotification(customer:LoyaltyCustomer,event:string){
    if(!customer.phone){toast.error('El cliente no tiene teléfono registrado');return;}
    try{
      const res=await fetch(`${process?.env?.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/loyalty-whatsapp`,{
        method:'POST',
        headers:{'Content-Type':'application/json',Authorization:`Bearer ${process?.env?.NEXT_PUBLIC_SUPABASE_ANON_KEY}`},
        body:JSON.stringify({tenantId:getTenantId(),event,customer:{id:customer.id,name:customer.name,phone:customer.phone},points:customer.points,pointsValue:(customer.points*cfg.pointValue).toFixed(2)}),
      });
      const data=await res.json();
      if(data.ok)toast.success(`WhatsApp enviado a ${customer.name}`);
      else toast.error(`Error WhatsApp: ${data.reason??data.error??'desconocido'}`);
    }catch(e:any){toast.error('Error al enviar WhatsApp: '+e.message);}
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
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{backgroundColor:k.color+'15'}}><k.icon size={20} style={{color:k.color}}/></div>
            <div><p className="text-xs text-gray-500">{k.label}</p><p className="text-lg font-bold text-gray-800">{k.value}</p></div>
          </div>
        ))}
      </div>

      {/* Reglas activas */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-1"><Star size={15} className="text-amber-600"/><span className="text-sm font-semibold text-amber-800">{cfg.programName}</span></div>
        <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-amber-700">
          <span>• 1 punto por cada ${cfg.pesosPerPoint} pesos</span>
          <span>• Cada punto vale ${cfg.pointValue.toFixed(2)} al canjear</span>
          <span>• Mínimo para canjear: {cfg.minRedeem} puntos</span>
          {cfg.pointsExpireDays&&<span>• Puntos expiran en {cfg.pointsExpireDays} días</span>}
        </div>
      </div>

      {/* Controles */}
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="relative flex-1 max-w-xs">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
          <input type="text" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar cliente..." className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"/>
        </div>
      </div>

      {/* Lista de miembros */}
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
                <button onClick={()=>{setSelectedCustomer(customer);setShowTransaction('canje');setTxForm({amount:0,notes:''}); }} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-white" style={{backgroundColor:'#10b981'}}><Gift size={12}/> Canjear</button>
                <button onClick={()=>{setSelectedCustomer(customer);loadTransactions(customer.id);setShowHistory(true);}} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-600 bg-gray-100"><History size={12}/> Historial</button>
                {cfg.whatsappNotifications&&customer.phone&&(
                  <button onClick={()=>sendWhatsAppNotification(customer,'points_balance')} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-white" style={{backgroundColor:'#25D366'}} title="Enviar saldo por WhatsApp">📱 WA</button>
                )}
              </div>
            </div>
          );
        })}
      </div>

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
