'use client';

import React, { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { CheckCircle, ChevronRight, ChevronLeft, UtensilsCrossed, LayoutGrid, Users, Rocket, Plus, Trash2 } from 'lucide-react';
import Icon from '@/components/ui/AppIcon';


interface Step {
  id: number;
  title: string;
  description: string;
  icon: React.ElementType;
}

const STEPS: Step[] = [
  { id: 1, title: 'Bienvenida', description: 'Configura los datos básicos de tu restaurante', icon: Rocket },
  { id: 2, title: 'Menú', description: 'Agrega tus primeros platillos', icon: UtensilsCrossed },
  { id: 3, title: 'Mesas', description: 'Configura el número de mesas', icon: LayoutGrid },
  { id: 4, title: 'Empleados', description: 'Registra a tu equipo de trabajo', icon: Users },
  { id: 5, title: '¡Listo!', description: 'Tu restaurante está configurado', icon: CheckCircle },
];

const DISH_CATEGORIES = ['Entradas', 'Platos Fuertes', 'Postres', 'Bebidas', 'Extras'];
const EMPLOYEE_ROLES = ['Gerente', 'Cajero', 'Mesero', 'Cocinero', 'Ayudante de Cocina', 'Repartidor'];

export default function OnboardingFlow() {
  const { appUser } = useAuth();
  const supabase = createClient();
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [saving, setSaving] = useState(false);

  // Step 1 data
  const [restaurantName, setRestaurantName] = useState('');
  const [restaurantPhone, setRestaurantPhone] = useState('');

  // Step 2 data
  const [dishes, setDishes] = useState([
    { name: '', price: '', category: 'Platos Fuertes', emoji: '🍽️' },
  ]);

  // Step 3 data
  const [tableCount, setTableCount] = useState(5);
  const [tableCapacity, setTableCapacity] = useState(4);

  // Step 4 data
  const [employees, setEmployees] = useState([
    { name: '', role: 'Mesero', phone: '' },
  ]);

  const addDish = () => setDishes([...dishes, { name: '', price: '', category: 'Platos Fuertes', emoji: '🍽️' }]);
  const removeDish = (i: number) => setDishes(dishes.filter((_, idx) => idx !== i));
  const updateDish = (i: number, field: string, value: string) => {
    const d = [...dishes]; d[i] = { ...d[i], [field]: value }; setDishes(d);
  };

  const addEmployee = () => setEmployees([...employees, { name: '', role: 'Mesero', phone: '' }]);
  const removeEmployee = (i: number) => setEmployees(employees.filter((_, idx) => idx !== i));
  const updateEmployee = (i: number, field: string, value: string) => {
    const e = [...employees]; e[i] = { ...e[i], [field]: value }; setEmployees(e);
  };

  const handleNext = async () => {
    if (currentStep === 1 && !restaurantName.trim()) {
      toast.error('Ingresa el nombre de tu restaurante');
      return;
    }
    if (currentStep === 4) {
      await handleSaveAll();
      return;
    }
    setCurrentStep(s => s + 1);
  };

  const handleSaveAll = async () => {
    setSaving(true);
    try {
      // Save restaurant name to system_config
      if (restaurantName.trim()) {
        await supabase.from('system_config').upsert({
          config_key: 'restaurant_name',
          config_value: restaurantName.trim(),
          description: 'Nombre del restaurante',
        }, { onConflict: 'config_key' });
      }

      // Save dishes
      const validDishes = dishes.filter(d => d.name.trim() && d.price);
      if (validDishes.length > 0) {
        await supabase.from('dishes').insert(
          validDishes.map(d => ({
            name: d.name.trim(),
            price: Number(d.price),
            category: d.category,
            emoji: d.emoji,
            available: true,
            tenant_id: appUser?.tenantId,
          }))
        );
      }

      // Save tables
      const tableInserts = Array.from({ length: tableCount }, (_, i) => ({
        number: i + 1,
        name: `Mesa ${i + 1}`,
        capacity: tableCapacity,
        status: 'libre',
        tenant_id: appUser?.tenantId,
      }));
      // Delete existing tables for this tenant first
      await supabase.from('restaurant_tables').delete().eq('tenant_id', appUser?.tenantId);
      if (tableInserts.length > 0) {
        await supabase.from('restaurant_tables').insert(tableInserts);
      }

      // Save employees
      const validEmployees = employees.filter(e => e.name.trim());
      if (validEmployees.length > 0) {
        await supabase.from('employees').insert(
          validEmployees.map(e => ({
            name: e.name.trim(),
            role: e.role,
            phone: e.phone,
            status: 'activo',
            tenant_id: appUser?.tenantId,
          }))
        );
      }

      // Mark tenant as initialized — prevents AppLayout from redirecting back to onboarding
      await supabase.from('system_config')
        .upsert(
          { config_key: 'initialized', config_value: 'true', tenant_id: appUser?.tenantId },
          { onConflict: 'config_key,tenant_id' }
        );

      setCurrentStep(5);
      toast.success('¡Configuración completada!');
    } catch (err: any) {
      toast.error('Error al guardar: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const progress = ((currentStep - 1) / (STEPS.length - 1)) * 100;

  return (
    <div className="max-w-2xl mx-auto">
      {/* Progress */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-3">
          {STEPS.map((step, i) => {
            const Icon = step.icon;
            const isCompleted = currentStep > step.id;
            const isCurrent = currentStep === step.id;
            return (
              <div key={step.id} className="flex flex-col items-center gap-1">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${isCompleted ? 'text-white' : isCurrent ? 'text-white' : 'text-gray-400 bg-gray-100'}`}
                  style={isCompleted ? { backgroundColor: '#10b981' } : isCurrent ? { backgroundColor: '#1B3A6B' } : {}}
                >
                  {isCompleted ? <CheckCircle size={20} /> : <Icon size={20} />}
                </div>
                <span className={`text-xs hidden sm:block ${isCurrent ? 'font-medium text-gray-800' : 'text-gray-400'}`}>{step.title}</span>
              </div>
            );
          })}
        </div>
        <div className="w-full bg-gray-100 rounded-full h-2">
          <div className="h-2 rounded-full transition-all duration-500" style={{ width: `${progress}%`, backgroundColor: '#1B3A6B' }} />
        </div>
      </div>

      {/* Step content */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
        {/* Step 1: Welcome */}
        {currentStep === 1 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">¡Bienvenido a Aldente! 🎉</h2>
              <p className="text-gray-500">Vamos a configurar tu restaurante en pocos pasos. Empieza con los datos básicos.</p>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del Restaurante *</label>
                <input
                  type="text"
                  value={restaurantName}
                  onChange={e => setRestaurantName(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                  placeholder="Ej: Tacos El Güero"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono (opcional)</label>
                <input
                  type="tel"
                  value={restaurantPhone}
                  onChange={e => setRestaurantPhone(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                  placeholder="555-0001"
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Menu */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Agrega tu Menú 🍽️</h2>
              <p className="text-gray-500">Registra tus platillos principales. Puedes agregar más desde el módulo de Menú.</p>
            </div>
            <div className="space-y-3">
              {dishes.map((dish, i) => (
                <div key={i} className="flex gap-2 items-start p-3 bg-gray-50 rounded-xl">
                  <div className="flex-1 grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={dish.name}
                      onChange={e => updateDish(i, 'name', e.target.value)}
                      placeholder="Nombre del platillo"
                      className="col-span-2 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white"
                    />
                    <input
                      type="number"
                      value={dish.price}
                      onChange={e => updateDish(i, 'price', e.target.value)}
                      placeholder="Precio $"
                      min={0}
                      className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white"
                    />
                    <select
                      value={dish.category}
                      onChange={e => updateDish(i, 'category', e.target.value)}
                      className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white"
                    >
                      {DISH_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  {dishes.length > 1 && (
                    <button onClick={() => removeDish(i)} className="p-2 text-red-400 hover:text-red-600 mt-1">
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              ))}
              <button onClick={addDish} className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 font-medium">
                <Plus size={16} /> Agregar otro platillo
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Tables */}
        {currentStep === 3 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Configura tus Mesas 🪑</h2>
              <p className="text-gray-500">Define cuántas mesas tiene tu restaurante y su capacidad promedio.</p>
            </div>
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">Número de mesas: <span className="text-2xl font-bold" style={{ color: '#1B3A6B' }}>{tableCount}</span></label>
                <input
                  type="range"
                  min={1}
                  max={50}
                  value={tableCount}
                  onChange={e => setTableCount(Number(e.target.value))}
                  className="w-full accent-amber-500"
                />
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>1</span><span>25</span><span>50</span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">Capacidad por mesa: <span className="text-2xl font-bold" style={{ color: '#1B3A6B' }}>{tableCapacity} personas</span></label>
                <input
                  type="range"
                  min={1}
                  max={12}
                  value={tableCapacity}
                  onChange={e => setTableCapacity(Number(e.target.value))}
                  className="w-full accent-amber-500"
                />
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>1</span><span>6</span><span>12</span>
                </div>
              </div>
              <div className="bg-blue-50 rounded-xl p-4 text-sm text-blue-700">
                Se crearán <strong>{tableCount} mesas</strong> con capacidad para <strong>{tableCapacity} personas</strong> cada una.
                Capacidad total: <strong>{tableCount * tableCapacity} personas</strong>.
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Employees */}
        {currentStep === 4 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Registra tu Equipo 👥</h2>
              <p className="text-gray-500">Agrega a los empleados que usarán el sistema. Puedes agregar más desde el módulo de Personal.</p>
            </div>
            <div className="space-y-3">
              {employees.map((emp, i) => (
                <div key={i} className="flex gap-2 items-start p-3 bg-gray-50 rounded-xl">
                  <div className="flex-1 grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={emp.name}
                      onChange={e => updateEmployee(i, 'name', e.target.value)}
                      placeholder="Nombre completo"
                      className="col-span-2 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white"
                    />
                    <select
                      value={emp.role}
                      onChange={e => updateEmployee(i, 'role', e.target.value)}
                      className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white"
                    >
                      {EMPLOYEE_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                    <input
                      type="tel"
                      value={emp.phone}
                      onChange={e => updateEmployee(i, 'phone', e.target.value)}
                      placeholder="Teléfono"
                      className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white"
                    />
                  </div>
                  {employees.length > 1 && (
                    <button onClick={() => removeEmployee(i)} className="p-2 text-red-400 hover:text-red-600 mt-1">
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              ))}
              <button onClick={addEmployee} className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 font-medium">
                <Plus size={16} /> Agregar otro empleado
              </button>
            </div>
          </div>
        )}

        {/* Step 5: Done — designed for activation, not celebration */}
        {currentStep === 5 && (
          <div className="py-2">
            <div className="text-center mb-8">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.25)' }}>
                <CheckCircle size={32} style={{ color: '#f59e0b' }} />
              </div>
              <h2 className="text-2xl font-bold mb-2" style={{ color: '#f1f5f9' }}>
                {restaurantName || 'Tu restaurante'} está listo
              </h2>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px', lineHeight: 1.6 }}>
                Ahora mismo puedes hacer cualquiera de estas 3 cosas.<br/>
                <strong style={{ color: 'rgba(255,255,255,0.7)' }}>Te recomendamos empezar por la primera.</strong>
              </p>
            </div>

            <div className="flex flex-col gap-3">
              {/* Primary action */}
              <a href="/pos-punto-de-venta"
                className="block rounded-2xl p-5 transition-all hover:opacity-90"
                style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)', color: '#1B3A6B' }}>
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'rgba(27,58,107,0.2)' }}>
                    <span style={{ fontSize: '20px' }}>🗺</span>
                  </div>
                  <div>
                    <div className="font-bold text-base mb-1">Haz tu primera orden de prueba</div>
                    <div style={{ fontSize: '13px', opacity: 0.75, lineHeight: 1.5 }}>
                      Selecciona una mesa, agrega un platillo y mándalo a cocina. Son 60 segundos y es el momento en que el sistema cobra vida.
                    </div>
                  </div>
                </div>
              </a>

              {/* Secondary actions */}
              <div className="grid grid-cols-2 gap-3">
                <a href="/r/" onClick={(e) => { e.preventDefault(); navigator.clipboard.writeText(window.location.origin + '/login'); import('sonner').then(m => m.toast.success('Link copiado — compártelo con tu equipo')); }}
                  className="block rounded-xl p-4 transition-all hover:opacity-90 cursor-pointer"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
                  <div style={{ fontSize: '20px', marginBottom: '8px' }}>📱</div>
                  <div className="font-semibold text-sm mb-1" style={{ color: '#f1f5f9' }}>Invitar a tu equipo</div>
                  <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)', lineHeight: 1.5 }}>
                    Copia el link y compártelo con tu cajero o mesero
                  </div>
                </a>

                <a href="/cocina"
                  className="block rounded-xl p-4 transition-all hover:opacity-90"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
                  <div style={{ fontSize: '20px', marginBottom: '8px' }}>👨‍🍳</div>
                  <div className="font-semibold text-sm mb-1" style={{ color: '#f1f5f9' }}>Ver la pantalla de cocina</div>
                  <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)', lineHeight: 1.5 }}>
                    Así ve tu cocinero las órdenes en tiempo real
                  </div>
                </a>
              </div>

              <a href="/dashboard"
                className="text-center py-3 text-sm transition-all"
                style={{ color: 'rgba(255,255,255,0.35)' }}>
                Ir al dashboard primero →
              </a>
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      {currentStep < 5 && (
        <div className="flex items-center justify-between mt-6">
          <button
            onClick={() => setCurrentStep(s => s - 1)}
            disabled={currentStep === 1}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronLeft size={16} /> Anterior
          </button>
          <span className="text-sm text-gray-400">Paso {currentStep} de {STEPS.length - 1}</span>
          <button
            onClick={handleNext}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2 rounded-xl text-sm font-medium text-white disabled:opacity-50"
            style={{ backgroundColor: '#1B3A6B' }}
          >
            {saving ? 'Guardando...' : currentStep === 4 ? 'Finalizar' : 'Siguiente'}
            {!saving && <ChevronRight size={16} />}
          </button>
        </div>
      )}
    </div>
  );
}
