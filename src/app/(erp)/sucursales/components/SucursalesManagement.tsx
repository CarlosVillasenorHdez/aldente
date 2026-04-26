'use client';
import { getCurrentTenantId as getTenantId } from '@/lib/tenantStore';


import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useBranch } from '@/contexts/BranchContext';
import { toast } from 'sonner';
import { Plus, Edit2, Trash2, X, Check, Users, MapPin, Phone, Mail, Building2, ToggleLeft, ToggleRight, ChevronDown, ChevronUp } from 'lucide-react';

interface Branch {
  id: string; name: string; address: string; phone: string;
  email: string; managerName: string; isActive: boolean;
}
interface AppUser {
  id: string; fullName: string; appRole: string; branchId: string | null; username: string;
}

const ROLE_LABELS: Record<string,string> = {
  admin:'Administrador',gerente:'Gerente',cajero:'Cajero',mesero:'Mesero',
  cocinero:'Cocinero',ayudante_cocina:'Ayudante de Cocina',repartidor:'Repartidor',
};
const ROLE_COLORS: Record<string,string> = {
  admin:'#c9963a',gerente:'#a78bfa',cajero:'#34d399',mesero:'#60a5fa',
  cocinero:'#f97316',ayudante_cocina:'#fb923c',repartidor:'#e879f9',
};

const empty: Omit<Branch,'id'> = { name:'', address:'', phone:'', email:'', managerName:'', isActive:true };

export default function SucursalesManagement() {
  const supabase = createClient();
  const { appUser } = useAuth();
  const { activeBranchId, setActiveBranch, canSwitch } = useBranch();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string|null>(null);
  const [form, setForm] = useState<Omit<Branch,'id'>>(empty);
  const [saving, setSaving] = useState(false);
  const [expandedBranch, setExpandedBranch] = useState<string|null>(null);
  const [assigningUser, setAssigningUser] = useState<string|null>(null); // userId being assigned

  const [tenantInfo, setTenantInfo] = useState<{name:string;address:string;phone:string} | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: b }, { data: u }, { data: sysConf }] = await Promise.all([
      supabase.from('branches').select('*').eq('tenant_id', getTenantId()).order('created_at', { ascending: true }),
      supabase.from('app_users').select('id,full_name,app_role,branch_id,username').eq('tenant_id', appUser?.tenantId).neq('app_role','superadmin').order('full_name'),
      supabase.from('system_config').select('config_key,config_value').eq('tenant_id', appUser?.tenantId).in('config_key',['restaurant_name','restaurant_address','restaurant_phone']),
    ]);
    if (sysConf) {
      const m: Record<string,string> = {};
      sysConf.forEach((r:any) => { m[r.config_key] = r.config_value; });
      setTenantInfo({ name: m.restaurant_name||'Restaurante Principal', address: m.restaurant_address||'', phone: m.restaurant_phone||'' });
    }
    setBranches((b||[]).map((x:any)=>({ id:x.id, name:x.name, address:x.address||'', phone:x.phone||'', email:x.email||'', managerName:x.manager_name||'', isActive:x.is_active })));
    setUsers((u||[]).map((x:any)=>({ id:x.id, fullName:x.full_name, appRole:x.app_role, branchId:x.branch_id, username:x.username })));
    setLoading(false);
  }, [appUser?.tenantId]);

  useEffect(() => { load(); }, [load]);

  async function handleSave() {
    if (!form.name.trim()) { toast.error('El nombre es requerido'); return; }
    setSaving(true);
    try {
      if (editingId) {
        await supabase.from('branches').update({ name:form.name, address:form.address, phone:form.phone, email:form.email, manager_name:form.managerName, is_active:form.isActive, updated_at:new Date().toISOString() }).eq('id', editingId);
        toast.success('Sucursal actualizada');
      } else {
        await supabase.from('branches').insert({ tenant_id: getTenantId(), name:form.name, address:form.address, phone:form.phone, email:form.email, manager_name:form.managerName, is_active:form.isActive });
        toast.success('Sucursal creada');
      }
      setShowForm(false); setEditingId(null); setForm(empty);
      await load();
    } catch (e:any) { toast.error(e.message); } finally { setSaving(false); }
  }

  async function handleDelete(id: string) {
    if (false && !confirm('¿Eliminar esta sucursal? Los usuarios asignados quedarán sin sucursal.')) return;
    await supabase.from('branches').delete().eq('id', id);
    toast.success('Sucursal eliminada');
    await load();
  }

  async function handleToggleActive(b: Branch) {
    await supabase.from('branches').update({ is_active:!b.isActive }).eq('id', b.id);
    await load();
  }

  async function assignUserToBranch(userId: string, branchId: string | null) {
    setAssigningUser(userId);
    await supabase.from('app_users').update({ branch_id: branchId }).eq('id', userId);
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, branchId } : u));
    setAssigningUser(null);
  }

  function startEdit(b: Branch) {
    setForm({ name:b.name, address:b.address, phone:b.phone, email:b.email, managerName:b.managerName, isActive:b.isActive });
    setEditingId(b.id); setShowForm(true);
  }

  const inp = { padding:'10px 14px', borderRadius:10, border:'1px solid #2a3f5f', background:'#0f1923', color:'#f1f5f9', fontSize:14, outline:'none', width:'100%', fontFamily:'inherit', transition:'border-color .2s', boxSizing:'border-box' } as React.CSSProperties;

  if (loading) return <div style={{ textAlign:'center', padding:48, color:'rgba(255,255,255,.4)' }}>Cargando sucursales...</div>;

  return (
    <div style={{ maxWidth:900, margin:'0 auto', padding:'0 0 48px' }}>
      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:28 }}>
        <div>
          <h2 style={{ fontSize:22, fontWeight:700, color:'#f1f5f9', margin:'0 0 4px' }}>Sucursales</h2>
          <p style={{ fontSize:13, color:'rgba(255,255,255,.4)', margin:0 }}>{branches.length} sucursal{branches.length!==1?'es':''} · {users.length} usuario{users.length!==1?'s':''}</p>
        </div>
        <button onClick={()=>{ setShowForm(true); setEditingId(null); setForm(empty); }}
          style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 20px', borderRadius:12, border:'none', background:'#c9963a', color:'#07090f', fontSize:14, fontWeight:700, cursor:'pointer' }}>
          <Plus size={16}/> Nueva sucursal
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div style={{ padding:24, borderRadius:16, background:'#1a2535', border:'1px solid #243f72', marginBottom:20 }}>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:20 }}>
            <h3 style={{ fontSize:16, fontWeight:700, color:'#f1f5f9', margin:0 }}>{editingId?'Editar sucursal':'Nueva sucursal'}</h3>
            <button onClick={()=>{ setShowForm(false); setEditingId(null); setForm(empty); }} style={{ background:'none', border:'none', color:'rgba(255,255,255,.4)', cursor:'pointer' }}><X size={16}/></button>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:14 }}>
            <div>
              <label style={{ display:'block', fontSize:11, color:'rgba(255,255,255,.5)', marginBottom:5, textTransform:'uppercase', letterSpacing:'.06em' }}>Nombre *</label>
              <input style={inp} value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))} placeholder="Ej: Sucursal Centro"
                onFocus={e=>(e.target.style.borderColor='rgba(201,150,58,.5)')} onBlur={e=>(e.target.style.borderColor='rgba(255,255,255,.1)')} />
            </div>
            <div>
              <label style={{ display:'block', fontSize:11, color:'rgba(255,255,255,.5)', marginBottom:5, textTransform:'uppercase', letterSpacing:'.06em' }}>Gerente / Responsable</label>
              <input style={inp} value={form.managerName} onChange={e=>setForm(p=>({...p,managerName:e.target.value}))} placeholder="Nombre del encargado"
                onFocus={e=>(e.target.style.borderColor='rgba(201,150,58,.5)')} onBlur={e=>(e.target.style.borderColor='rgba(255,255,255,.1)')} />
            </div>
            <div style={{ gridColumn:'span 2' }}>
              <label style={{ display:'block', fontSize:11, color:'rgba(255,255,255,.5)', marginBottom:5, textTransform:'uppercase', letterSpacing:'.06em' }}>Dirección</label>
              <input style={inp} value={form.address} onChange={e=>setForm(p=>({...p,address:e.target.value}))} placeholder="Calle, número, colonia"
                onFocus={e=>(e.target.style.borderColor='rgba(201,150,58,.5)')} onBlur={e=>(e.target.style.borderColor='rgba(255,255,255,.1)')} />
            </div>
            <div>
              <label style={{ display:'block', fontSize:11, color:'rgba(255,255,255,.5)', marginBottom:5, textTransform:'uppercase', letterSpacing:'.06em' }}>Teléfono</label>
              <input style={inp} value={form.phone} onChange={e=>setForm(p=>({...p,phone:e.target.value}))} placeholder="55 1234 5678"
                onFocus={e=>(e.target.style.borderColor='rgba(201,150,58,.5)')} onBlur={e=>(e.target.style.borderColor='rgba(255,255,255,.1)')} />
            </div>
            <div>
              <label style={{ display:'block', fontSize:11, color:'rgba(255,255,255,.5)', marginBottom:5, textTransform:'uppercase', letterSpacing:'.06em' }}>Correo</label>
              <input style={inp} value={form.email} onChange={e=>setForm(p=>({...p,email:e.target.value}))} placeholder="sucursal@restaurante.mx"
                onFocus={e=>(e.target.style.borderColor='rgba(201,150,58,.5)')} onBlur={e=>(e.target.style.borderColor='rgba(255,255,255,.1)')} />
            </div>
          </div>
          <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
            <button onClick={()=>{ setShowForm(false); setEditingId(null); setForm(empty); }}
              style={{ padding:'9px 20px', borderRadius:10, border:'1px solid rgba(255,255,255,.12)', background:'transparent', color:'rgba(255,255,255,.6)', fontSize:13, cursor:'pointer' }}>
              Cancelar
            </button>
            <button onClick={handleSave} disabled={saving||!form.name.trim()}
              style={{ padding:'9px 20px', borderRadius:10, border:'none', background: form.name.trim()?'#c9963a':'rgba(201,150,58,.25)', color:'#07090f', fontSize:13, fontWeight:700, cursor:'pointer' }}>
              {saving?'Guardando...':editingId?'Guardar cambios':'Crear sucursal'}
            </button>
          </div>

          {/* Panel informativo — qué se hereda automáticamente */}
          {!editingId && (
            <div style={{ marginTop:20, padding:'14px 16px', borderRadius:12, background:'rgba(201,150,58,.08)', border:'1px solid rgba(201,150,58,.2)' }}>
              <p style={{ fontSize:12, fontWeight:700, color:'#c9963a', marginBottom:10, textTransform:'uppercase', letterSpacing:'.06em' }}>
                ✓ Esta sucursal hereda automáticamente del restaurante:
              </p>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6 }}>
                {[
                  ['🍽️ Menú completo', 'Todos los platillos y categorías'],
                  ['📦 Inventario base', 'Ingredientes y recetas'],
                  ['🚚 Proveedores', 'Catálogo completo de proveedores'],
                  ['⭐ Socios de lealtad', 'Los clientes con membresía pueden usarla aquí'],
                ].map(([title, desc]) => (
                  <div key={title} style={{ display:'flex', flexDirection:'column', gap:2 }}>
                    <span style={{ fontSize:12, fontWeight:600, color:'rgba(255,255,255,.8)' }}>{title}</span>
                    <span style={{ fontSize:11, color:'rgba(255,255,255,.4)' }}>{desc}</span>
                  </div>
                ))}
              </div>
              <div style={{ marginTop:12, paddingTop:12, borderTop:'1px solid rgba(201,150,58,.15)' }}>
                <p style={{ fontSize:12, color:'rgba(255,255,255,.4)', marginBottom:6, fontWeight:600 }}>
                  ✗ Exclusivo por sucursal (no se comparte):
                </p>
                <div style={{ display:'flex', flexWrap:'wrap', gap:'6px 16px' }}>
                  {['Ventas y órdenes', 'Empleados y turnos', 'Stock físico', 'Gastos', 'Mesas'].map(item => (
                    <span key={item} style={{ fontSize:11, color:'rgba(255,255,255,.35)' }}>• {item}</span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Branches list */}
      {branches.length === 0 ? (
        <div style={{ textAlign:'center', padding:'60px 20px', color:'rgba(255,255,255,.5)' }}>
          <Building2 size={48} style={{ marginBottom:16, opacity:.3 }} />
          <p style={{ fontSize:16, marginBottom:8, color:'rgba(255,255,255,.7)' }}>Sin sucursales configuradas</p>
          <p style={{ fontSize:13, marginBottom:24, maxWidth:400, margin:'0 auto 24px' }}>
            Este restaurante aún no tiene sucursales registradas en el sistema.
            Crea la sucursal principal (este mismo restaurante) para activar
            el aislamiento por sucursal y poder agregar más ubicaciones.
          </p>
          <button
            onClick={async () => {
              const name = tenantInfo?.name || 'Sucursal Principal';
              const { error } = await supabase.from('branches').insert({
                tenant_id: getTenantId(),
                name,
                address: '',
                phone: '',
                email: '',
                manager_name: '',
                is_active: true,
              });
              if (error) { toast.error('Error: ' + error.message); return; }
              toast.success(`✅ "${name}" creada como sucursal principal`);
              load();
            }}
            style={{ padding:'12px 24px', borderRadius:12, background:'#c9963a', border:'none', color:'#1B3A6B', fontWeight:700, fontSize:14, cursor:'pointer' }}
          >
            🏢 Crear sucursal principal
          </button>
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {branches.map((b, idx) => {
            const isMain = idx === 0;  // la primera (más antigua) es la principal
            const branchUsers = users.filter(u => u.branchId === b.id);
            const unassigned = users.filter(u => !u.branchId);
            const isExpanded = expandedBranch === b.id;
            return (
              <div key={b.id} style={{ borderRadius:16, border:`1px solid ${isMain?'rgba(201,150,58,.35)':isExpanded?'rgba(201,150,58,.3)':'rgba(255,255,255,.07)'}`, background: isMain?'rgba(201,150,58,.06)':isExpanded?'rgba(201,150,58,.04)':'rgba(255,255,255,.02)', overflow:'hidden', transition:'all .2s' }}>
                {/* Branch header */}
                <div style={{ display:'flex', alignItems:'center', gap:16, padding:'16px 20px' }}>
                  <div style={{ width:44, height:44, borderRadius:12, background: activeBranchId===b.id?'rgba(201,150,58,.25)':'rgba(201,150,58,.12)', border:`1px solid ${activeBranchId===b.id?'rgba(201,150,58,.6)':'rgba(201,150,58,.25)'}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, flexShrink:0 }}>{isMain ? '🏠' : '🏢'}</div>
                  <div style={{ flex:1 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:2 }}>
                      <h3 style={{ fontSize:16, fontWeight:700, color:'#f1f5f9', margin:0 }}>{b.name}</h3>
                      {isMain && <span style={{ fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:100, background:'rgba(201,150,58,.15)', color:'#c9963a', border:'1px solid rgba(201,150,58,.3)' }}>Sucursal principal</span>}
                      {activeBranchId===b.id && <span style={{ fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:100, background:'rgba(201,150,58,.15)', color:'#c9963a', border:'1px solid rgba(201,150,58,.3)' }}>Activa</span>}
                      <span style={{ fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:100, background: b.isActive?'rgba(52,211,153,.12)':'rgba(248,113,113,.12)', color: b.isActive?'#34d399':'#f87171', border: `1px solid ${b.isActive?'rgba(52,211,153,.2)':'rgba(248,113,113,.2)'}` }}>
                        {b.isActive?'Activa':'Inactiva'}
                      </span>
                    </div>
                    <div style={{ display:'flex', gap:16, flexWrap:'wrap' }}>
                      {b.address && <span style={{ fontSize:12, color:'rgba(255,255,255,.4)', display:'flex', alignItems:'center', gap:4 }}><MapPin size={11}/>{b.address}</span>}
                      {b.phone && <span style={{ fontSize:12, color:'rgba(255,255,255,.4)', display:'flex', alignItems:'center', gap:4 }}><Phone size={11}/>{b.phone}</span>}
                      {b.managerName && <span style={{ fontSize:12, color:'rgba(255,255,255,.4)', display:'flex', alignItems:'center', gap:4 }}><Users size={11}/>{b.managerName}</span>}
                    </div>
                  </div>
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <span style={{ fontSize:12, color:'rgba(255,255,255,.4)', marginRight:4 }}>{branchUsers.length} usuario{branchUsers.length!==1?'s':''}</span>
                    <button onClick={()=>startEdit(b)} title="Editar"
                      style={{ width:34, height:34, borderRadius:8, border:'1px solid rgba(255,255,255,.1)', background:'rgba(255,255,255,.04)', color:'rgba(255,255,255,.5)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
                      <Edit2 size={13}/>
                    </button>
                    <button onClick={()=>handleToggleActive(b)} title={b.isActive?'Desactivar':'Activar'}
                      style={{ width:34, height:34, borderRadius:8, border:`1px solid ${b.isActive?'rgba(248,113,113,.2)':'rgba(52,211,153,.2)'}`, background: b.isActive?'rgba(248,113,113,.06)':'rgba(52,211,153,.06)', color: b.isActive?'#f87171':'#34d399', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
                      {b.isActive?<ToggleRight size={14}/>:<ToggleLeft size={14}/>}
                    </button>
                    {canSwitch && activeBranchId !== b.id && (
                      <button onClick={()=>setActiveBranch({ id:b.id, name:b.name })} title="Cambiar a esta sucursal"
                        style={{ padding:'0 12px', height:34, borderRadius:8, border:'1px solid rgba(201,150,58,.3)', background:'rgba(201,150,58,.1)', color:'#c9963a', cursor:'pointer', fontSize:11, fontWeight:700, whiteSpace:'nowrap' }}>
                        Ir aquí →
                      </button>
                    )}
                    <button onClick={()=>handleDelete(b.id)} title="Eliminar"
                      style={{ width:34, height:34, borderRadius:8, border:'1px solid rgba(248,113,113,.15)', background:'rgba(248,113,113,.06)', color:'rgba(248,113,113,.7)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
                      <Trash2 size={13}/>
                    </button>
                    <button onClick={()=>setExpandedBranch(isExpanded?null:b.id)}
                      style={{ width:34, height:34, borderRadius:8, border:'1px solid rgba(255,255,255,.08)', background:'rgba(255,255,255,.03)', color:'rgba(255,255,255,.5)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
                      {isExpanded?<ChevronUp size={14}/>:<ChevronDown size={14}/>}
                    </button>
                  </div>
                </div>

                {/* Expanded: users panel */}
                {isExpanded && (
                  <div style={{ borderTop:'1px solid rgba(255,255,255,.06)', padding:'16px 20px' }}>
                    <p style={{ fontSize:11, fontWeight:700, color:'rgba(255,255,255,.4)', textTransform:'uppercase', letterSpacing:'.08em', marginBottom:12 }}>
                      Usuarios en esta sucursal ({branchUsers.length})
                    </p>
                    {branchUsers.length === 0 && (
                      <p style={{ fontSize:13, color:'rgba(255,255,255,.3)', fontStyle:'italic', marginBottom:12 }}>Sin usuarios asignados aún.</p>
                    )}
                    <div style={{ display:'flex', flexDirection:'column', gap:4, marginBottom:16 }}>
                      {branchUsers.map(u=>(
                        <div key={u.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'8px 12px', borderRadius:10, background:'rgba(255,255,255,.03)', border:'1px solid rgba(255,255,255,.06)' }}>
                          <div style={{ width:32, height:32, borderRadius:8, background:`${ROLE_COLORS[u.appRole]||'#c9963a'}15`, border:`1px solid ${ROLE_COLORS[u.appRole]||'#c9963a'}25`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, flexShrink:0 }}>
                            {u.appRole==='admin'?'👑':u.appRole==='mesero'?'🍽️':u.appRole==='cocinero'?'👨‍🍳':'👤'}
                          </div>
                          <div style={{ flex:1 }}>
                            <span style={{ fontSize:13, fontWeight:600, color:'#f1f5f9' }}>{u.fullName}</span>
                            <span style={{ fontSize:11, color:ROLE_COLORS[u.appRole]||'rgba(255,255,255,.4)', marginLeft:8 }}>{ROLE_LABELS[u.appRole]||u.appRole}</span>
                          </div>
                          <button onClick={()=>assignUserToBranch(u.id, null)} disabled={assigningUser===u.id}
                            style={{ padding:'4px 10px', borderRadius:7, border:'1px solid rgba(248,113,113,.2)', background:'rgba(248,113,113,.08)', color:'#f87171', fontSize:11, cursor:'pointer' }}>
                            Quitar
                          </button>
                        </div>
                      ))}
                    </div>

                    {/* Unassigned users to add */}
                    {unassigned.length > 0 && (
                      <>
                        <p style={{ fontSize:11, fontWeight:700, color:'rgba(255,255,255,.3)', textTransform:'uppercase', letterSpacing:'.08em', marginBottom:8 }}>
                          Agregar usuario a esta sucursal
                        </p>
                        <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                          {unassigned.map(u=>(
                            <button key={u.id} onClick={()=>assignUserToBranch(u.id, b.id)} disabled={assigningUser===u.id}
                              style={{ padding:'5px 12px', borderRadius:8, border:'1px solid rgba(201,150,58,.2)', background:'rgba(201,150,58,.08)', color:'#c9963a', fontSize:12, cursor:'pointer', display:'flex', alignItems:'center', gap:6 }}>
                              + {u.fullName} <span style={{ opacity:.6 }}>({ROLE_LABELS[u.appRole]||u.appRole})</span>
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Unassigned users summary */}
      {users.filter(u=>!u.branchId).length > 0 && branches.length > 0 && (
        <div style={{ marginTop:24, padding:'16px 20px', borderRadius:14, background:'rgba(248,113,113,.05)', border:'1px solid rgba(248,113,113,.15)' }}>
          <p style={{ fontSize:13, fontWeight:600, color:'#f87171', margin:'0 0 8px', display:'flex', alignItems:'center', gap:8 }}>
            <Users size={14}/> {users.filter(u=>!u.branchId).length} usuario{users.filter(u=>!u.branchId).length!==1?'s':''} sin sucursal asignada
          </p>
          <p style={{ fontSize:12, color:'rgba(255,255,255,.4)', margin:0 }}>
            Los usuarios sin sucursal aparecerán en el login de todos los accesos. Asígnalos expandiendo una sucursal arriba.
          </p>
        </div>
      )}
    </div>
  );
}
