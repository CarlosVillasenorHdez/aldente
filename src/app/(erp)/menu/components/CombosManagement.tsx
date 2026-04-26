'use client';
import { getCurrentTenantId as getTenantId } from '@/lib/tenantStore';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Plus, X, Percent, Edit2, Trash2, ToggleLeft, ToggleRight, TrendingUp, Lightbulb, AlertTriangle, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import type { Dish } from './MenuManagement';

export interface ComboItem {
  dish_id: string; name: string; emoji: string; qty: number;
  original_price: number; discount_pct: number; final_price: number;
}
export interface Combo {
  id: string; name: string; description: string; emoji: string;
  items: ComboItem[]; total_price: number; savings: number; active: boolean;
}
interface BasketSuggestion { producto_a: string; producto_b: string; frecuencia: number; lift: number; }
interface DishCostData { [dish_id: string]: number; }

function calcComboTotals(items: ComboItem[]) {
  const original = items.reduce((s, i) => s + i.original_price * i.qty, 0);
  const final    = items.reduce((s, i) => s + i.final_price, 0);
  return { total_price: final, savings: original - final };
}
function marginColor(pct: number) { return pct >= 65 ? '#4ade80' : pct >= 45 ? '#f59e0b' : '#f87171'; }
function marginLabel(pct: number) { return pct >= 65 ? '✓ Excelente' : pct >= 45 ? '△ Aceptable' : pct >= 20 ? '⚠ Bajo' : '✗ No rentable'; }

// ─── Profitability Panel ──────────────────────────────────────────────────────
function ProfitabilityPanel({ items, dishCosts }: { items: ComboItem[]; dishCosts: DishCostData }) {
  const rows = items.map(item => {
    const costPerUnit = dishCosts[item.dish_id] ?? null;
    const totalCost = costPerUnit !== null ? costPerUnit * item.qty : null;
    const revenue = item.final_price;
    const margin = totalCost !== null && revenue > 0 ? ((revenue - totalCost) / revenue) * 100 : null;
    return { ...item, totalCost, revenue, margin };
  });
  const totalRevenue = rows.reduce((s, r) => s + r.revenue, 0);
  const allHaveCosts = rows.every(r => r.totalCost !== null);
  const totalCost = allHaveCosts ? rows.reduce((s, r) => s + (r.totalCost ?? 0), 0) : null;
  const totalMargin = totalCost !== null && totalRevenue > 0 ? ((totalRevenue - totalCost) / totalRevenue) * 100 : null;
  const originalTotal = items.reduce((s, i) => s + i.original_price * i.qty, 0);
  if (items.length === 0) return null;
  return (
    <div style={{ borderTop:'1px solid rgba(255,255,255,0.08)', paddingTop:18, marginTop:16 }}>
      <div style={{ fontSize:11, fontWeight:700, color:'rgba(255,255,255,0.4)', letterSpacing:'.08em', textTransform:'uppercase', marginBottom:10, display:'flex', alignItems:'center', gap:6 }}>
        <TrendingUp size={12} /> Análisis de rentabilidad
      </div>
      {!allHaveCosts && (
        <div style={{ padding:'8px 12px', borderRadius:8, background:'rgba(245,158,11,0.08)', border:'1px solid rgba(245,158,11,0.2)', marginBottom:10, fontSize:11, color:'#f59e0b', display:'flex', gap:6 }}>
          <AlertTriangle size={12} style={{ flexShrink:0, marginTop:1 }} />
          Algunos platillos no tienen receta cargada — el margen puede ser aproximado.
        </div>
      )}
      <div style={{ display:'flex', flexDirection:'column', gap:5, marginBottom:12 }}>
        {rows.map((row, i) => (
          <div key={i} style={{ display:'grid', gridTemplateColumns:'1fr auto auto auto', gap:8, alignItems:'center', padding:'6px 10px', borderRadius:8, background:'rgba(255,255,255,0.03)' }}>
            <span style={{ fontSize:12, color:'rgba(255,255,255,0.7)' }}>{row.emoji} {row.qty>1?`${row.qty}× `:''}{row.name}</span>
            <span style={{ fontSize:11, color:'rgba(255,255,255,0.3)', fontFamily:'monospace' }}>{row.totalCost!==null?`costo $${row.totalCost.toFixed(2)}`:'sin receta'}</span>
            <span style={{ fontSize:12, fontFamily:'monospace', color:'#60a5fa' }}>${row.revenue.toFixed(2)}</span>
            <span style={{ fontSize:11, fontWeight:700, color:row.margin!==null?marginColor(row.margin):'rgba(255,255,255,0.2)' }}>{row.margin!==null?`${row.margin.toFixed(0)}%`:'—'}</span>
          </div>
        ))}
      </div>
      <div style={{ padding:'14px 16px', borderRadius:12, background:totalMargin!==null?`${marginColor(totalMargin)}10`:'rgba(255,255,255,0.04)', border:`1px solid ${totalMargin!==null?marginColor(totalMargin)+'35':'rgba(255,255,255,0.08)'}` }}>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10, marginBottom: totalMargin!==null?10:0 }}>
          <div>
            <div style={{ fontSize:10, color:'rgba(255,255,255,0.35)', marginBottom:2 }}>Precio combo</div>
            <div style={{ fontSize:15, fontWeight:800, color:'#f1f5f9', fontFamily:'monospace' }}>${totalRevenue.toFixed(2)}</div>
          </div>
          <div>
            <div style={{ fontSize:10, color:'rgba(255,255,255,0.35)', marginBottom:2 }}>Costo ingredientes</div>
            <div style={{ fontSize:15, fontWeight:800, color:'#f87171', fontFamily:'monospace' }}>{totalCost!==null?`$${totalCost.toFixed(2)}`:'—'}</div>
          </div>
          <div>
            <div style={{ fontSize:10, color:'rgba(255,255,255,0.35)', marginBottom:2 }}>Ahorro cliente</div>
            <div style={{ fontSize:15, fontWeight:800, color:'#4ade80', fontFamily:'monospace' }}>-${(originalTotal-totalRevenue).toFixed(2)}</div>
          </div>
        </div>
        {totalMargin!==null && (
          <>
            <div style={{ borderTop:'1px solid rgba(255,255,255,0.08)', paddingTop:10, display:'flex', alignItems:'center', gap:10 }}>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:11, color:'rgba(255,255,255,0.4)', marginBottom:2 }}>Margen neto del combo</div>
                <div style={{ display:'flex', alignItems:'baseline', gap:8 }}>
                  <span style={{ fontSize:26, fontWeight:800, color:marginColor(totalMargin), fontFamily:'monospace' }}>{totalMargin.toFixed(1)}%</span>
                  <span style={{ fontSize:12, color:marginColor(totalMargin), fontWeight:600 }}>{marginLabel(totalMargin)}</span>
                </div>
              </div>
              <div style={{ width:80, height:8, borderRadius:4, background:'rgba(255,255,255,0.08)', overflow:'hidden' }}>
                <div style={{ height:'100%', width:`${Math.min(totalMargin,100)}%`, borderRadius:4, background:marginColor(totalMargin), transition:'width .4s ease' }} />
              </div>
            </div>
            {totalMargin < 30 && (
              <div style={{ marginTop:10, padding:'8px 12px', borderRadius:8, background:'rgba(248,113,113,0.08)', border:'1px solid rgba(248,113,113,0.2)', fontSize:11, color:'#f87171' }}>
                💡 Margen demasiado bajo. Reduce el descuento o elige platillos con mayor margen individual.
              </div>
            )}
            {totalMargin >= 65 && (
              <div style={{ marginTop:10, padding:'8px 12px', borderRadius:8, background:'rgba(74,222,128,0.06)', border:'1px solid rgba(74,222,128,0.2)', fontSize:11, color:'#4ade80', display:'flex', alignItems:'center', gap:6 }}>
                <CheckCircle size={11} /> Combo rentable. El descuento es sostenible.
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ─── Basket Suggestions ───────────────────────────────────────────────────────
function BasketSuggestions({ suggestions, dishes, onCreateCombo }: {
  suggestions: BasketSuggestion[]; dishes: Dish[];
  onCreateCombo: (items: ComboItem[]) => void;
}) {
  if (suggestions.length === 0) return null;
  return (
    <div style={{ marginBottom:28 }}>
      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:12 }}>
        <Lightbulb size={14} style={{ color:'#c9963a' }} />
        <div>
          <span style={{ fontSize:14, fontWeight:700 }}>Sugerencias de tu análisis de ventas</span>
          <p style={{ fontSize:11, color:'#6b7280', marginTop:2, margin:0 }}>Platillos que tus clientes piden juntos con más frecuencia — ideales para combo.</p>
        </div>
      </div>
      <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
        {suggestions.slice(0,5).map((s,i) => {
          const dA = dishes.find(d => d.name===s.producto_a);
          const dB = dishes.find(d => d.name===s.producto_b);
          return (
            <div key={i} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 14px', borderRadius:12, background:'rgba(201,150,58,0.08)', border:'1px solid rgba(201,150,58,0.25)' }}>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:13, fontWeight:600, color:'#92400e', marginBottom:2 }}>
                  {dA?.emoji||'🍽️'} {s.producto_a} + {dB?.emoji||'🍽️'} {s.producto_b}
                </div>
                <div style={{ fontSize:11, color:'#78716c' }}>
                  Pedidos juntos {s.frecuencia} veces · lift {s.lift.toFixed(1)}×
                  {dA&&dB&&<span style={{ color:'#a8a29e', marginLeft:6 }}>· Precio normal: ${(dA.price+dB.price).toFixed(0)}</span>}
                </div>
              </div>
              {dA&&dB&&(
                <button onClick={()=>onCreateCombo([
                  {dish_id:dA.id,name:dA.name,emoji:dA.emoji||'🍽️',qty:1,original_price:dA.price,discount_pct:0,final_price:dA.price},
                  {dish_id:dB.id,name:dB.name,emoji:dB.emoji||'🍽️',qty:1,original_price:dB.price,discount_pct:0,final_price:dB.price},
                ])} style={{ padding:'6px 14px', borderRadius:8, background:'#c9963a', border:'none', color:'#07090f', fontSize:12, fontWeight:700, cursor:'pointer', flexShrink:0 }}>
                  + Crear combo
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── ComboModal ───────────────────────────────────────────────────────────────
function ComboModal({ combo, dishes, dishCosts, onClose, onSave }: {
  combo: Combo|null; dishes: Dish[]; dishCosts: DishCostData;
  onClose:()=>void; onSave:(data:Omit<Combo,'id'>)=>void;
}) {
  const [name, setName] = useState(combo?.name??'');
  const [description, setDescription] = useState(combo?.description??'');
  const [emoji, setEmoji] = useState(combo?.emoji??'🎁');
  const [items, setItems] = useState<ComboItem[]>(combo?.items??[]);
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);

  const filtered = dishes.filter(d=>d.available&&!items.find(i=>i.dish_id===d.id)&&(search===''||d.name.toLowerCase().includes(search.toLowerCase())));

  const addDish = (d:Dish) => { setItems(p=>[...p,{dish_id:d.id,name:d.name,emoji:d.emoji??'🍽️',qty:1,original_price:d.price,discount_pct:0,final_price:d.price}]); setSearch(''); };
  const updateItem = (idx:number, field:'qty'|'discount_pct', val:number) => setItems(p=>p.map((it,i)=>{
    if(i!==idx) return it;
    const qty=field==='qty'?Math.max(1,val):it.qty;
    const discount_pct=field==='discount_pct'?Math.min(100,Math.max(0,val)):it.discount_pct;
    return {...it,qty,discount_pct,final_price:it.original_price*qty*(1-discount_pct/100)};
  }));
  const removeItem = (idx:number) => setItems(p=>p.filter((_,i)=>i!==idx));
  const {total_price,savings} = calcComboTotals(items);
  const originalTotal = items.reduce((s,i)=>s+i.original_price*i.qty,0);

  return (
    <div style={{position:'fixed',inset:0,zIndex:9999,background:'rgba(0,0,0,0.8)',backdropFilter:'blur(6px)',display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={onClose}>
      <div style={{background:'#162d55',border:'1px solid #243f72',borderRadius:20,width:'100%',maxWidth:660,maxHeight:'92vh',display:'flex',flexDirection:'column'}} onClick={e=>e.stopPropagation()}>
        {/* Header */}
        <div style={{padding:'20px 24px 16px',borderBottom:'1px solid rgba(255,255,255,0.06)',display:'flex',alignItems:'center',gap:12}}>
          <input value={emoji} onChange={e=>setEmoji(e.target.value)} style={{width:44,height:44,fontSize:26,textAlign:'center',background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.12)',borderRadius:10,color:'#f1f5f9'}}/>
          <div style={{flex:1}}>
            <input value={name} onChange={e=>setName(e.target.value)} placeholder="Nombre del combo (ej: Café + Croissant)" style={{width:'100%',background:'none',border:'none',outline:'none',color:'#f1f5f9',fontSize:18,fontWeight:700}}/>
            <input value={description} onChange={e=>setDescription(e.target.value)} placeholder="Descripción opcional" style={{width:'100%',background:'none',border:'none',outline:'none',color:'rgba(255,255,255,0.45)',fontSize:12,marginTop:2}}/>
          </div>
          <button onClick={onClose} style={{background:'none',border:'none',color:'rgba(255,255,255,0.4)',cursor:'pointer'}}><X size={18}/></button>
        </div>
        <div style={{flex:1,overflowY:'auto',padding:24}}>
          {items.length>0&&(
            <div style={{marginBottom:20}}>
              <div style={{fontSize:11,fontWeight:700,color:'rgba(255,255,255,0.4)',letterSpacing:'.08em',textTransform:'uppercase',marginBottom:10}}>Productos del combo</div>
              <div style={{display:'flex',flexDirection:'column',gap:7,marginBottom:10}}>
                {items.map((item,i)=>(
                  <div key={item.dish_id} style={{display:'flex',alignItems:'center',gap:10,padding:'10px 14px',borderRadius:12,background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)'}}>
                    <span style={{fontSize:20}}>{item.emoji}</span>
                    <span style={{flex:1,fontSize:13,fontWeight:600,color:'#f1f5f9'}}>{item.name}</span>
                    <div style={{display:'flex',alignItems:'center',gap:4}}>
                      <span style={{fontSize:11,color:'rgba(255,255,255,0.35)'}}>×</span>
                      <input type="number" min={1} value={item.qty} onChange={e=>updateItem(i,'qty',parseInt(e.target.value)||1)} style={{width:40,textAlign:'center',background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.12)',borderRadius:6,color:'#f1f5f9',fontSize:13,padding:'3px 4px'}}/>
                    </div>
                    <div style={{display:'flex',alignItems:'center',gap:4,marginLeft:8}}>
                      <Percent size={11} style={{color:'#c9963a'}}/>
                      <input type="number" min={0} max={100} value={item.discount_pct} onChange={e=>updateItem(i,'discount_pct',parseFloat(e.target.value)||0)} style={{width:46,textAlign:'center',background:'rgba(201,150,58,0.08)',border:'1px solid rgba(201,150,58,0.25)',borderRadius:6,color:'#c9963a',fontSize:13,padding:'3px 4px'}}/>
                      <span style={{fontSize:11,color:'#c9963a'}}>dto</span>
                    </div>
                    <span style={{fontSize:13,fontWeight:700,color:'#4ade80',fontFamily:'monospace',minWidth:60,textAlign:'right'}}>${item.final_price.toFixed(2)}</span>
                    {item.discount_pct>0&&<span style={{fontSize:11,color:'rgba(255,255,255,0.3)',textDecoration:'line-through',fontFamily:'monospace'}}>${(item.original_price*item.qty).toFixed(2)}</span>}
                    <button onClick={()=>removeItem(i)} style={{background:'none',border:'none',color:'rgba(239,68,68,0.5)',cursor:'pointer'}}><X size={14}/></button>
                  </div>
                ))}
              </div>
              <div style={{padding:'10px 14px',borderRadius:10,background:'rgba(74,222,128,0.06)',border:'1px solid rgba(74,222,128,0.2)',display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:4}}>
                <div style={{fontSize:12,color:'rgba(255,255,255,0.5)'}}>
                  Original: <span style={{textDecoration:'line-through',fontFamily:'monospace'}}>${originalTotal.toFixed(2)}</span>
                  {savings>0&&<span style={{color:'#4ade80',marginLeft:8}}>Ahorro: ${savings.toFixed(2)}</span>}
                </div>
                <div style={{fontSize:16,fontWeight:800,color:'#4ade80',fontFamily:'monospace'}}>${total_price.toFixed(2)}</div>
              </div>
              <ProfitabilityPanel items={items} dishCosts={dishCosts}/>
            </div>
          )}
          <div>
            <div style={{fontSize:11,fontWeight:700,color:'rgba(255,255,255,0.4)',letterSpacing:'.08em',textTransform:'uppercase',marginBottom:10}}>
              {items.length===0?'Selecciona los productos del combo':'+Agregar más productos'}
            </div>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar platillo..." style={{width:'100%',padding:'9px 14px',borderRadius:10,background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.1)',color:'#f1f5f9',fontSize:13,outline:'none',marginBottom:10}}/>
            <div style={{display:'flex',flexDirection:'column',gap:6,maxHeight:200,overflowY:'auto'}}>
              {filtered.slice(0,20).map(d=>(
                <button key={d.id} onClick={()=>addDish(d)} style={{display:'flex',alignItems:'center',gap:10,padding:'9px 14px',borderRadius:10,background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.06)',cursor:'pointer',textAlign:'left'}}>
                  <span style={{fontSize:18}}>{d.emoji||'🍽️'}</span>
                  <span style={{flex:1,fontSize:13,color:'#f1f5f9'}}>{d.name}</span>
                  {dishCosts[d.id]!==undefined&&<span style={{fontSize:11,color:'rgba(255,255,255,0.3)',fontFamily:'monospace'}}>costo ${dishCosts[d.id].toFixed(2)}</span>}
                  <span style={{fontSize:13,color:'rgba(255,255,255,0.4)',fontFamily:'monospace'}}>${d.price.toFixed(0)}</span>
                  <Plus size={14} style={{color:'#c9963a'}}/>
                </button>
              ))}
              {filtered.length===0&&<p style={{fontSize:12,color:'rgba(255,255,255,0.25)',textAlign:'center',padding:'16px 0'}}>Sin resultados</p>}
            </div>
          </div>
        </div>
        <div style={{padding:'16px 24px',borderTop:'1px solid rgba(255,255,255,0.06)'}}>
          {(!name.trim()||items.length<2)&&(
            <div style={{fontSize:11,color:'rgba(245,158,11,0.8)',marginBottom:10,display:'flex',alignItems:'center',gap:6}}>
              <span>⚠</span>
              <span>
                {!name.trim()&&items.length<2?'Escribe un nombre y agrega al menos 2 productos':
                 !name.trim()?'Escribe un nombre para el combo':
                 'Agrega al menos 2 productos'}
              </span>
            </div>
          )}
          <div style={{display:'flex',gap:10}}>
          <button onClick={onClose} style={{flex:1,padding:11,borderRadius:12,background:'rgba(255,255,255,0.06)',border:'none',color:'rgba(255,255,255,0.5)',fontSize:14,cursor:'pointer'}}>Cancelar</button>
          <button onClick={()=>{
              if(!name.trim()||items.length<2) return;
              setSaving(true);
              try { onSave({name:name.trim(),description,emoji,items,total_price,savings,active:combo?.active??true}); }
              catch { setSaving(false); }
            }} disabled={saving||items.length<2||!name.trim()}
            style={{flex:2,padding:11,borderRadius:12,background:items.length<2||!name.trim()?'rgba(201,150,58,0.3)':'#c9963a',border:'none',color:'#07090f',fontSize:14,fontWeight:700,cursor:items.length<2||!name.trim()?'not-allowed':'pointer'}}>
            {saving?'Guardando…':combo?.id?'Guardar cambios':'Crear combo'}
          </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function CombosManagement({ dishes }: { dishes: Dish[] }) {
  const supabase = createClient();
  const [combos, setCombos] = useState<Combo[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCombo, setEditingCombo] = useState<Combo|null>(null);
  const [preloadItems, setPreloadItems] = useState<ComboItem[]|null>(null);
  const [basketSuggestions, setBasketSuggestions] = useState<BasketSuggestion[]>([]);
  const [dishCosts, setDishCosts] = useState<DishCostData>({});

  const fetchCombos = useCallback(async()=>{
    setLoading(true);
    const{data}=await supabase.from('combos').select('*').eq('tenant_id',getTenantId()).order('created_at',{ascending:false});
    setCombos((data??[]) as Combo[]);
    setLoading(false);
  },[supabase]);

  const fetchDishCosts = useCallback(async()=>{
    const{data}=await supabase.from('dish_recipes').select('dish_id,quantity,ingredients(cost)').eq('tenant_id',getTenantId());
    if(!data) return;
    const costs:DishCostData={};
    (data as any[]).forEach(r=>{costs[r.dish_id]=(costs[r.dish_id]??0)+Number(r.ingredients?.cost??0)*Number(r.quantity);});
    setDishCosts(costs);
  },[supabase]);

  const fetchBasketSuggestions = useCallback(async()=>{
    const since=new Date(Date.now()-30*86400000).toISOString();
    const[{data:billingOrders},{data:rawItems}]=await Promise.all([
      supabase.from('orders').select('id').eq('tenant_id',getTenantId()).eq('is_comanda',false).eq('status','cerrada').gte('created_at',since),
      supabase.from('order_items').select('order_id,name').eq('tenant_id',getTenantId()).gte('created_at',since),
    ]);
    if(!rawItems||rawItems.length<10) return;
    const billingIds=new Set((billingOrders??[]).map((o:any)=>o.id));
    const orderMap:Record<string,string[]>={};
    (rawItems as any[]).forEach(i=>{
      if(!billingIds.has(i.order_id)) return;
      if(!orderMap[i.order_id]) orderMap[i.order_id]=[];
      if(!orderMap[i.order_id].includes(i.name)) orderMap[i.order_id].push(i.name);
    });
    const orders=Object.values(orderMap);
    if(orders.length<3) return;
    const pairMap:Record<string,number>={};
    const itemCount:Record<string,number>={};
    orders.forEach(names=>{
      names.forEach(n=>{itemCount[n]=(itemCount[n]||0)+1;});
      for(let i=0;i<names.length;i++) for(let j=i+1;j<names.length;j++){
        const key=[names[i],names[j]].sort().join('|||');
        pairMap[key]=(pairMap[key]||0)+1;
      }
    });
    const suggestions:BasketSuggestion[]=Object.entries(pairMap)
      .filter(([,c])=>c>=2)
      .map(([key,count])=>{
        const[a,b]=key.split('|||');
        const conf=count/(itemCount[a]||1);
        const lift=conf/((itemCount[b]||1)/orders.length);
        return{producto_a:a,producto_b:b,frecuencia:count,lift:Math.round(lift*100)/100};
      })
      .sort((a,b)=>b.frecuencia-a.frecuencia).slice(0,8);
    setBasketSuggestions(suggestions);
  },[supabase]);

  useEffect(()=>{fetchCombos();fetchDishCosts();fetchBasketSuggestions();},[fetchCombos,fetchDishCosts,fetchBasketSuggestions]);

  const handleSave=async(data:Omit<Combo,'id'>)=>{
    try{
      if(editingCombo){
        const{error}=await supabase.from('combos').update({...data,updated_at:new Date().toISOString()}).eq('id',editingCombo.id);
        if(error) throw error;
        toast.success('Combo actualizado');
      }else{
        const{error}=await supabase.from('combos').insert([{...data,tenant_id:getTenantId()}]);
        if(error) throw error;
        toast.success('Combo creado');
      }
      setShowModal(false);setEditingCombo(null);setPreloadItems(null);fetchCombos();
    }catch(err:any){toast.error('Error: '+(err?.message??'Intenta de nuevo'));}
  };

  const handleToggle=async(combo:Combo)=>{await supabase.from('combos').update({active:!combo.active}).eq('id',combo.id);fetchCombos();};
  const handleDelete=async(id:string)=>{await supabase.from('combos').delete().eq('id',id);toast.success('Combo eliminado');fetchCombos();};
  const openNew=(items?:ComboItem[])=>{setEditingCombo(null);setPreloadItems(items??null);setShowModal(true);};

  const modalCombo=useMemo(()=>{
    if(editingCombo) return editingCombo;
    if(preloadItems) return{id:'',name:'',description:'',emoji:'🎁',items:preloadItems,total_price:0,savings:0,active:true};
    return null;
  },[editingCombo,preloadItems]);

  return (
    <div>
      <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:24}}>
        <div>
          <h2 style={{fontSize:16,fontWeight:700,color:'#f1f5f9',margin:0}}>Combos y Promociones</h2>
          <p style={{fontSize:12,color:'rgba(255,255,255,0.4)',margin:'4px 0 0'}}>Vende 2+ platillos juntos con descuento. Ve el margen real antes de activar.</p>
        </div>
        <button onClick={()=>openNew()} style={{display:'flex',alignItems:'center',gap:8,padding:'10px 18px',borderRadius:12,background:'#c9963a',border:'none',color:'#07090f',fontSize:14,fontWeight:700,cursor:'pointer',flexShrink:0}}>
          <Plus size={15}/> Nuevo combo
        </button>
      </div>

      <BasketSuggestions suggestions={basketSuggestions} dishes={dishes} onCreateCombo={openNew}/>

      {!loading&&combos.length===0&&basketSuggestions.length===0&&(
        <div style={{textAlign:'center',padding:'60px 20px',borderRadius:20,background:'rgba(255,255,255,0.02)',border:'2px dashed rgba(255,255,255,0.08)'}}>
          <div style={{fontSize:48,marginBottom:12}}>🎁</div>
          <h3 style={{color:'#f1f5f9',fontSize:16,fontWeight:700,marginBottom:8}}>Sin combos todavía</h3>
          <p style={{color:'rgba(255,255,255,0.4)',fontSize:13,marginBottom:20,maxWidth:340,margin:'0 auto 20px'}}>El sistema sugiere combos automáticamente con base en lo que tus clientes piden juntos. Las sugerencias aparecen aquí cuando hay suficientes datos de ventas.</p>
          <button onClick={()=>openNew()} style={{padding:'10px 24px',borderRadius:12,background:'#c9963a',border:'none',color:'#07090f',fontSize:14,fontWeight:700,cursor:'pointer'}}>+ Crear primer combo</button>
        </div>
      )}

      {combos.length>0&&(
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))',gap:14}}>
          {combos.map(combo=>{
            const pctOff=combo.savings>0?(Math.round((combo.savings/(combo.total_price+combo.savings))*100)):0;
            const allHaveCosts=(combo.items as ComboItem[]).every(i=>dishCosts[i.dish_id]!==undefined);
            const totalIngCost=allHaveCosts?(combo.items as ComboItem[]).reduce((s,i)=>s+(dishCosts[i.dish_id]??0)*i.qty,0):null;
            const cardMargin=totalIngCost!==null&&combo.total_price>0?((combo.total_price-totalIngCost)/combo.total_price)*100:null;
            return(
              <div key={combo.id} style={{borderRadius:16,background:'rgba(255,255,255,0.03)',border:`1px solid ${combo.active?'rgba(201,150,58,0.2)':'rgba(255,255,255,0.06)'}`,overflow:'hidden',opacity:combo.active?1:0.55}}>
                <div style={{padding:'16px 18px 12px',borderBottom:'1px solid rgba(255,255,255,0.05)'}}>
                  <div style={{display:'flex',alignItems:'flex-start',gap:10,marginBottom:8}}>
                    <span style={{fontSize:28}}>{combo.emoji}</span>
                    <div style={{flex:1}}>
                      <div style={{fontSize:15,fontWeight:700,color:'#f1f5f9'}}>{combo.name}</div>
                      {combo.description&&<div style={{fontSize:11,color:'rgba(255,255,255,0.35)',marginTop:2}}>{combo.description}</div>}
                    </div>
                    {pctOff>0&&<span style={{background:'rgba(74,222,128,0.15)',color:'#4ade80',fontSize:11,fontWeight:700,padding:'3px 8px',borderRadius:8,flexShrink:0}}>−{pctOff}%</span>}
                  </div>
                  <div style={{display:'flex',flexDirection:'column',gap:3}}>
                    {(combo.items as ComboItem[]).map((item,i)=>(
                      <div key={i} style={{display:'flex',alignItems:'center',gap:6,fontSize:12}}>
                        <span>{item.emoji}</span>
                        <span style={{flex:1,color:'rgba(255,255,255,0.65)'}}>{item.qty>1?`${item.qty}× `:''}{item.name}</span>
                        {item.discount_pct>0&&<span style={{color:'#c9963a',fontSize:10,fontWeight:700}}>−{item.discount_pct}%</span>}
                        <span style={{color:'rgba(255,255,255,0.4)',fontFamily:'monospace'}}>${item.final_price.toFixed(0)}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{padding:'12px 18px',display:'flex',alignItems:'center',gap:8}}>
                  <div style={{flex:1}}>
                    <span style={{fontSize:18,fontWeight:800,color:'#f1f5f9',fontFamily:'monospace'}}>${combo.total_price.toFixed(2)}</span>
                    {combo.savings>0&&<span style={{fontSize:11,color:'#4ade80',marginLeft:6}}>ahorra ${combo.savings.toFixed(0)}</span>}
                    {cardMargin!==null&&<div style={{fontSize:10,color:marginColor(cardMargin),marginTop:2}}>Margen {cardMargin.toFixed(0)}% {marginLabel(cardMargin)}</div>}
                  </div>
                  <button onClick={()=>handleToggle(combo)} style={{background:'none',border:'none',cursor:'pointer',color:combo.active?'#f59e0b':'rgba(255,255,255,0.3)'}}>{combo.active?<ToggleRight size={22}/>:<ToggleLeft size={22}/>}</button>
                  <button onClick={()=>{setEditingCombo(combo);setPreloadItems(null);setShowModal(true);}} style={{width:30,height:30,borderRadius:8,background:'rgba(255,255,255,0.06)',border:'none',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',color:'rgba(255,255,255,0.5)'}}><Edit2 size={13}/></button>
                  <button onClick={()=>handleDelete(combo.id)} style={{width:30,height:30,borderRadius:8,background:'rgba(239,68,68,0.08)',border:'none',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',color:'rgba(239,68,68,0.6)'}}><Trash2 size={13}/></button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showModal&&(
        <ComboModal combo={modalCombo} dishes={dishes} dishCosts={dishCosts} onClose={()=>{setShowModal(false);setEditingCombo(null);setPreloadItems(null);}} onSave={handleSave}/>
      )}
    </div>
  );
}
