'use client';
/**
 * MenuAIAssistant — Asistente inteligente de onboarding de menú
 *
 * Flujo de 3 pasos:
 *   1. Pegar texto del menú (o subir PDF) → IA extrae platillos
 *   2. Revisar platillos → guardar en dishes
 *   3. Generar insumos maestros + recetas por platillo → guardar todo
 *
 * Usa /api/menu-ai internamente (Claude Sonnet).
 */

import React, { useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { getCurrentTenantId as getTenantId } from '@/lib/tenantStore';
import { toast } from 'sonner';
import {
  Sparkles, Upload, ChevronRight, ChevronDown, Check,
  RefreshCw, AlertTriangle, Trash2, Plus, X, ChevronLeft,
  Wand2, Package, BookOpen, ArrowRight,
} from 'lucide-react';

// ── Types ────────────────────────────────────────────────────────────────────

interface AIDish {
  name: string;
  description: string;
  price: number;
  category: string;
  emoji: string;
  selected: boolean;
  savedId?: string;       // id en DB si ya fue guardado
}

interface AIIngredient {
  name: string;
  category: string;
  unit: string;
  costPerUnit: number;
  minStock: number;
  reorderPoint: number;
  notes: string;
  savedId?: string;
}

interface AIRecipeItem {
  ingredientName: string;
  category: string;
  quantity: number;
  unit: string;
  costPerUnit: number;
  estimatedCostLine: number;
  notes: string;
}

interface DishRecipe {
  dishName: string;
  dishId?: string;
  prepTimeMin: number;
  preparationArea: 'cocina' | 'barra';
  totalEstimatedCost: number;
  foodCostPct: number;
  recipe: AIRecipeItem[];
  loading: boolean;
  done: boolean;
  open: boolean;
}

// ── Styles ────────────────────────────────────────────────────────────────────

const S = {
  wrap:   { maxWidth: 900, margin: '0 auto', padding: '0 0 40px' } as React.CSSProperties,
  card:   { background: '#111827', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: '24px' } as React.CSSProperties,
  h2:     { fontSize: 20, fontWeight: 700, color: '#f1f5f9', marginBottom: 4 } as React.CSSProperties,
  sub:    { fontSize: 13, color: 'rgba(255,255,255,0.45)', marginBottom: 20, lineHeight: 1.5 } as React.CSSProperties,
  label:  { fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' as const, letterSpacing: '.06em', marginBottom: 6, display: 'block' } as React.CSSProperties,
  input:  { width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', color: '#f1f5f9', fontSize: 14, outline: 'none', fontFamily: 'inherit' } as React.CSSProperties,
  btn:    { display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', borderRadius: 10, border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 600, transition: 'opacity .15s' } as React.CSSProperties,
  btnPrimary: { background: '#d4922a', color: '#080b10' } as React.CSSProperties,
  btnGhost:   { background: 'rgba(255,255,255,0.06)', color: '#f1f5f9', border: '1px solid rgba(255,255,255,0.1)' } as React.CSSProperties,
  btnDanger:  { background: 'rgba(239,68,68,0.15)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)' } as React.CSSProperties,
  btnGreen:   { background: 'rgba(34,197,94,0.15)', color: '#86efac', border: '1px solid rgba(34,197,94,0.2)' } as React.CSSProperties,
  row:    { display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' as const } as React.CSSProperties,
  badge:  (color: string) => ({ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 20, background: color + '20', color: color, border: `1px solid ${color}30` }) as React.CSSProperties,
};

const CAT_COLORS: Record<string, string> = {
  'Platos Fuertes': '#f59e0b', 'Entradas': '#34d399', 'Bebidas': '#60a5fa',
  'Postres': '#f472b6', 'Extras': '#a78bfa',
};

// ── Step indicator ────────────────────────────────────────────────────────────

function Steps({ current }: { current: number }) {
  const steps = [
    { n: 1, label: 'Pegar menú' },
    { n: 2, label: 'Revisar platillos' },
    { n: 3, label: 'Recetas e insumos' },
  ];
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 28 }}>
      {steps.map((s, i) => (
        <React.Fragment key={s.n}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{
              width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 12, fontWeight: 700,
              background: s.n < current ? '#16a34a' : s.n === current ? '#d4922a' : 'rgba(255,255,255,0.08)',
              color: s.n <= current ? (s.n < current ? '#fff' : '#080b10') : 'rgba(255,255,255,0.3)',
            }}>
              {s.n < current ? <Check size={13} /> : s.n}
            </div>
            <span style={{ fontSize: 12, color: s.n === current ? '#d4922a' : s.n < current ? '#86efac' : 'rgba(255,255,255,0.3)', fontWeight: s.n === current ? 600 : 400 }}>
              {s.label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)', maxWidth: 40 }} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function MenuAIAssistant({ onDone }: { onDone?: () => void }) {
  const supabase = createClient();

  const [step, setStep] = useState(1);
  const [menuText, setMenuText] = useState('');
  const [restaurantType, setRestaurantType] = useState('restaurante casual mexicano');
  const [loading, setLoading] = useState(false);

  // Step 2 — dishes
  const [dishes, setDishes] = useState<AIDish[]>([]);

  // Step 3 — ingredients + recipes
  const [ingredients, setIngredients] = useState<AIIngredient[]>([]);
  const [recipes, setRecipes] = useState<DishRecipe[]>([]);
  const [savingAll, setSavingAll] = useState(false);
  const [done, setDone] = useState(false);

  // ── API helper ───────────────────────────────────────────────────────────────

  async function callMenuAI(body: object): Promise<any> {
    const res = await fetch('/api/menu-ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error ?? `Error ${res.status}`);
    }
    return res.json();
  }

  // ── PASO 1: parse menú ───────────────────────────────────────────────────────

  const handleParseMenu = useCallback(async () => {
    if (!menuText.trim()) { toast.error('Pega el texto de tu menú'); return; }
    setLoading(true);
    try {
      const data = await callMenuAI({ mode: 'parse_menu', menuText, restaurantType });
      if (!data.dishes?.length) { toast.error('No se encontraron platillos. Intenta con más texto.'); return; }
      setDishes(data.dishes.map((d: any) => ({ ...d, selected: true })));
      setStep(2);
      toast.success(`${data.dishes.length} platillos detectados`);
    } catch (e: any) {
      toast.error('Error del asistente: ' + e.message);
    } finally {
      setLoading(false);
    }
  }, [menuText, restaurantType]);

  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    setMenuText(text.slice(0, 8000));
    toast.success('Archivo cargado — revisa el texto y presiona Analizar');
    e.target.value = '';
  }, []);

  // ── PASO 2: ajustar platillos ────────────────────────────────────────────────

  const toggleDish = (i: number) => setDishes(prev => prev.map((d, idx) => idx === i ? { ...d, selected: !d.selected } : d));
  const updateDish = (i: number, key: keyof AIDish, val: any) => setDishes(prev => prev.map((d, idx) => idx === i ? { ...d, [key]: val } : d));
  const removeDish = (i: number) => setDishes(prev => prev.filter((_, idx) => idx !== i));
  const addDish = () => setDishes(prev => [...prev, { name: '', description: '', price: 0, category: 'Platos Fuertes', emoji: '🍽️', selected: true }]);

  const handleSaveDishes = useCallback(async () => {
    const selected = dishes.filter(d => d.selected && d.name.trim());
    if (!selected.length) { toast.error('Selecciona al menos un platillo'); return; }
    setLoading(true);
    const tid = getTenantId();
    const saved: AIDish[] = [...dishes];
    let ok = 0;
    for (let i = 0; i < dishes.length; i++) {
      const d = dishes[i];
      if (!d.selected || !d.name.trim()) continue;
      const { data, error } = await supabase.from('dishes').insert({
        tenant_id: tid, name: d.name, description: d.description || `${d.name} — preparado al momento`,
        price: d.price || 0, category: d.category, emoji: d.emoji || '🍽️',
        available: true, popular: false, preparation_time_min: 15, preparation_area: 'cocina',
      }).select('id').single();
      if (!error && data) { saved[i] = { ...d, savedId: data.id }; ok++; }
    }
    setDishes(saved);
    if (ok > 0) toast.success(`${ok} platillo${ok > 1 ? 's' : ''} guardado${ok > 1 ? 's' : ''}`);
    else { toast.error('No se pudo guardar ningún platillo'); setLoading(false); return; }

    // Generar insumos maestros
    const dishList = saved.filter(d => d.selected && d.savedId).map(d => ({ name: d.name, category: d.category, price: d.price }));
    try {
      const data = await callMenuAI({ mode: 'gen_ingredients', dishes: dishList, restaurantType });
      setIngredients((data.ingredients ?? []).map((i: any) => ({ ...i, savedId: undefined })));
    } catch {}

    // Inicializar recetas (se generan lazy al abrir cada una)
    setRecipes(
      saved.filter(d => d.selected && d.savedId).map(d => ({
        dishName: d.name, dishId: d.savedId,
        prepTimeMin: 15, preparationArea: 'cocina',
        totalEstimatedCost: 0, foodCostPct: 0,
        recipe: [], loading: false, done: false, open: false,
      }))
    );
    setStep(3);
    setLoading(false);
  }, [dishes, restaurantType, supabase]);

  // ── PASO 3: generar receta individual ────────────────────────────────────────

  const generateRecipe = useCallback(async (idx: number) => {
    const r = recipes[idx];
    if (!r || r.loading || r.done) return;
    setRecipes(prev => prev.map((x, i) => i === idx ? { ...x, loading: true, open: true } : x));
    try {
      const dish = dishes.find(d => d.savedId === r.dishId);
      const data = await callMenuAI({
        mode: 'gen_recipe',
        dishName: r.dishName,
        dishCategory: dish?.category ?? 'Platos Fuertes',
        price: dish?.price ?? 0,
        restaurantType,
      });
      setRecipes(prev => prev.map((x, i) => i === idx ? {
        ...x,
        recipe: data.recipe ?? [],
        prepTimeMin: data.prepTimeMin ?? 15,
        preparationArea: data.preparationArea ?? 'cocina',
        totalEstimatedCost: data.totalEstimatedCost ?? 0,
        foodCostPct: data.foodCostPct ?? 0,
        loading: false,
      } : x));
    } catch (e: any) {
      toast.error(`Error generando receta de ${r.dishName}`);
      setRecipes(prev => prev.map((x, i) => i === idx ? { ...x, loading: false } : x));
    }
  }, [recipes, dishes, restaurantType]);

  const toggleRecipe = (idx: number) => {
    setRecipes(prev => prev.map((x, i) => {
      if (i !== idx) return x;
      const next = { ...x, open: !x.open };
      if (next.open && !next.recipe.length && !next.loading) {
        generateRecipe(idx);
      }
      return next;
    }));
  };

  const generateAllRecipes = async () => {
    for (let i = 0; i < recipes.length; i++) {
      if (!recipes[i].recipe.length && !recipes[i].loading && !recipes[i].done) {
        await generateRecipe(i);
        await new Promise(r => setTimeout(r, 400)); // pequeña pausa entre llamadas
      }
    }
    setRecipes(prev => prev.map(x => ({ ...x, open: false })));
    toast.success('Todas las recetas generadas');
  };

  // ── PASO 3: guardar todo ─────────────────────────────────────────────────────

  const handleSaveAll = useCallback(async () => {
    setSavingAll(true);
    const tid = getTenantId();

    // 1. Guardar insumos
    const ingredientIdMap: Record<string, string> = {};
    for (const ing of ingredients) {
      if (ing.savedId) { ingredientIdMap[ing.name.toLowerCase()] = ing.savedId; continue; }
      // Verificar si ya existe
      const { data: existing } = await supabase.from('ingredients')
        .select('id').eq('tenant_id', tid).ilike('name', ing.name).limit(1).single();
      if (existing?.id) { ingredientIdMap[ing.name.toLowerCase()] = existing.id; continue; }
      const { data, error } = await supabase.from('ingredients').insert({
        tenant_id: tid, name: ing.name, category: ing.category,
        unit: ing.unit, cost: ing.costPerUnit, stock: 0,
        min_stock: ing.minStock, reorder_point: ing.reorderPoint,
        notes: ing.notes || null, lead_time_days: 2,
      }).select('id').single();
      if (!error && data) {
        ingredientIdMap[ing.name.toLowerCase()] = data.id;
        setIngredients(prev => prev.map(x => x.name === ing.name ? { ...x, savedId: data.id } : x));
      }
    }

    // 2. Guardar recetas de cada platillo
    let recipesOk = 0;
    for (const rec of recipes) {
      if (!rec.dishId || !rec.recipe.length) continue;
      // Actualizar prep time en el dish
      await supabase.from('dishes').update({
        preparation_time_min: rec.prepTimeMin,
        preparation_area: rec.preparationArea,
        updated_at: new Date().toISOString(),
      }).eq('id', rec.dishId);

      // Guardar cada ingrediente de la receta
      for (const ri of rec.recipe) {
        // Buscar el ingrediente en el mapa o en la DB
        let ingId = ingredientIdMap[ri.ingredientName.toLowerCase()];
        if (!ingId) {
          const { data: found } = await supabase.from('ingredients')
            .select('id').eq('tenant_id', tid).ilike('name', ri.ingredientName).limit(1).single();
          if (found?.id) { ingId = found.id; }
          else {
            // Crear el ingrediente si no existe
            const { data: created } = await supabase.from('ingredients').insert({
              tenant_id: tid, name: ri.ingredientName,
              category: ri.category || 'Otros', unit: ri.unit,
              cost: ri.costPerUnit, stock: 0, min_stock: 0, reorder_point: 0, lead_time_days: 2,
            }).select('id').single();
            if (created?.id) { ingId = created.id; ingredientIdMap[ri.ingredientName.toLowerCase()] = ingId; }
          }
        }
        if (!ingId) continue;

        // Evitar duplicados en dish_recipes
        const { data: existing } = await supabase.from('dish_recipes')
          .select('id').eq('dish_id', rec.dishId).eq('ingredient_id', ingId).limit(1).single();
        if (existing?.id) continue;

        await supabase.from('dish_recipes').insert({
          tenant_id: tid, dish_id: rec.dishId, ingredient_id: ingId,
          quantity: ri.quantity, unit: ri.unit,
          notes: ri.notes || null,
        });
      }
      recipesOk++;
    }

    setSavingAll(false);
    setDone(true);
    toast.success(`Menú listo: ${recipes.length} platillos, ${Object.keys(ingredientIdMap).length} insumos, ${recipesOk} recetas guardadas`);
  }, [ingredients, recipes, supabase]);

  // ── Done screen ──────────────────────────────────────────────────────────────

  if (done) {
    return (
      <div style={{ ...S.card, textAlign: 'center', padding: 48 }}>
        <div style={{ width: 64, height: 64, borderRadius: 20, background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontSize: 32 }}>
          🎉
        </div>
        <h2 style={{ ...S.h2, marginBottom: 8 }}>Menú cargado correctamente</h2>
        <p style={{ ...S.sub, marginBottom: 28 }}>
          Tus platillos, insumos y recetas ya están en el sistema.<br/>
          Puedes ajustar cantidades y costos desde Menú → Receta de cada platillo.
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
          <button style={{ ...S.btn, ...S.btnPrimary }} onClick={onDone}>
            <ArrowRight size={16} /> Ir al menú
          </button>
          <button style={{ ...S.btn, ...S.btnGhost }} onClick={() => { setStep(1); setDone(false); setMenuText(''); setDishes([]); setIngredients([]); setRecipes([]); }}>
            Cargar otro menú
          </button>
        </div>
      </div>
    );
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div style={S.wrap}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(212,146,42,0.12)', border: '1px solid rgba(212,146,42,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Wand2 size={20} color="#d4922a" />
        </div>
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: '#f1f5f9' }}>Asistente de Menú IA</h1>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>Carga tu menú en minutos — la IA hace el trabajo pesado</p>
        </div>
      </div>

      <Steps current={step} />

      {/* ── PASO 1 ──────────────────────────────────────────────────────────── */}
      {step === 1 && (
        <div style={S.card}>
          <h2 style={S.h2}>Pega el texto de tu menú</h2>
          <p style={S.sub}>
            Copia el texto de tu menú (PDF, Word, WhatsApp, lo que tengas) y pégalo aquí.<br/>
            La IA detectará automáticamente los platillos, precios y categorías.
          </p>

          <div style={{ marginBottom: 16 }}>
            <label style={S.label}>Tipo de restaurante</label>
            <input
              style={{ ...S.input, width: 320 }}
              value={restaurantType}
              onChange={e => setRestaurantType(e.target.value)}
              placeholder="ej: cafetería, taquería, marisquería..."
            />
          </div>

          <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <label style={S.label}>Texto del menú</label>
              <label style={{ ...S.btn, ...S.btnGhost, padding: '6px 12px', fontSize: 12, cursor: 'pointer' }}>
                <Upload size={13} /> Subir archivo .txt
                <input type="file" accept=".txt,.csv,.md" style={{ display: 'none' }} onChange={handleFileUpload} />
              </label>
            </div>
            <textarea
              style={{ ...S.input, minHeight: 220, resize: 'vertical', lineHeight: 1.6 }}
              value={menuText}
              onChange={e => setMenuText(e.target.value)}
              placeholder={`Ejemplo:\n\nENTRADAS\nGuacamole con totopos $85\nSopa de tortilla $75\n\nPLATOS FUERTES\nPollo a la plancha con arroz y ensalada $145\nFilete de res con papas fritas $195\n\nBEBIDAS\nCafé americano $35\nCappuccino $55\nAgua de jamaica $30`}
            />
          </div>

          <div style={S.row}>
            <button style={{ ...S.btn, ...S.btnPrimary, opacity: loading ? 0.6 : 1 }} onClick={handleParseMenu} disabled={loading}>
              {loading ? <RefreshCw size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <Sparkles size={15} />}
              {loading ? 'Analizando...' : 'Analizar menú con IA'}
            </button>
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>Funciona con cualquier formato de texto</span>
          </div>
        </div>
      )}

      {/* ── PASO 2 ──────────────────────────────────────────────────────────── */}
      {step === 2 && (
        <div style={S.card}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4, flexWrap: 'wrap', gap: 8 }}>
            <h2 style={S.h2}>{dishes.filter(d => d.selected).length} platillos detectados</h2>
            <div style={S.row}>
              <button style={{ ...S.btn, ...S.btnGhost, padding: '7px 14px', fontSize: 12 }} onClick={() => setStep(1)}>
                <ChevronLeft size={14} /> Volver
              </button>
              <button style={{ ...S.btn, ...S.btnGhost, padding: '7px 14px', fontSize: 12 }} onClick={addDish}>
                <Plus size={14} /> Agregar platillo
              </button>
            </div>
          </div>
          <p style={S.sub}>Revisa, edita o elimina los platillos. Desmarca los que no quieras importar.</p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
            {dishes.map((d, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '12px 14px', borderRadius: 12, background: d.selected ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.01)', border: `1px solid ${d.selected ? 'rgba(212,146,42,0.2)' : 'rgba(255,255,255,0.06)'}`, opacity: d.selected ? 1 : 0.45 }}>
                {/* Checkbox */}
                <button onClick={() => toggleDish(i)} style={{ width: 18, height: 18, borderRadius: 5, border: `1.5px solid ${d.selected ? '#d4922a' : 'rgba(255,255,255,0.2)'}`, background: d.selected ? '#d4922a' : 'transparent', cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 2 }}>
                  {d.selected && <Check size={11} color="#080b10" />}
                </button>

                {/* Emoji */}
                <input style={{ ...S.input, width: 48, textAlign: 'center', fontSize: 20, padding: '4px', flexShrink: 0 }} value={d.emoji} onChange={e => updateDish(i, 'emoji', e.target.value)} />

                {/* Name + desc */}
                <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <input style={{ ...S.input, fontWeight: 600 }} value={d.name} onChange={e => updateDish(i, 'name', e.target.value)} placeholder="Nombre del platillo" />
                  <input style={{ ...S.input, fontSize: 12 }} value={d.description} onChange={e => updateDish(i, 'description', e.target.value)} placeholder="Descripción" />
                </div>

                {/* Category */}
                <select style={{ ...S.input, width: 150, flexShrink: 0 }} value={d.category} onChange={e => updateDish(i, 'category', e.target.value)}>
                  {['Entradas','Platos Fuertes','Postres','Bebidas','Extras'].map(c => <option key={c} value={c} style={{ background: '#111827' }}>{c}</option>)}
                </select>

                {/* Price */}
                <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>$</span>
                  <input type="number" style={{ ...S.input, width: 80, textAlign: 'right' }} value={d.price} onChange={e => updateDish(i, 'price', Number(e.target.value))} />
                </div>

                {/* Remove */}
                <button onClick={() => removeDish(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.2)', padding: 4, flexShrink: 0 }}>
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>

          <button style={{ ...S.btn, ...S.btnPrimary, opacity: loading ? 0.6 : 1 }} onClick={handleSaveDishes} disabled={loading}>
            {loading ? <RefreshCw size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <BookOpen size={15} />}
            {loading ? 'Guardando y generando insumos...' : `Guardar ${dishes.filter(d => d.selected && d.name.trim()).length} platillos y continuar`}
          </button>
        </div>
      )}

      {/* ── PASO 3 ──────────────────────────────────────────────────────────── */}
      {step === 3 && (
        <>
          {/* Insumos */}
          <div style={{ ...S.card, marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4, flexWrap: 'wrap', gap: 8 }}>
              <div>
                <h2 style={{ ...S.h2, fontSize: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Package size={16} color="#d4922a" /> {ingredients.length} insumos sugeridos
                </h2>
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>Consolidados de todos los platillos. Se guardarán en tu inventario.</p>
              </div>
            </div>
            {ingredients.length > 0 && (
              <div style={{ maxHeight: 220, overflowY: 'auto', marginTop: 12 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                      {['Insumo','Categoría','Unidad','Costo/u','Stock mín'].map(h => (
                        <th key={h} style={{ padding: '6px 10px', textAlign: 'left', fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '.06em' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {ingredients.map((ing, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        <td style={{ padding: '7px 10px', fontSize: 13, color: '#f1f5f9' }}>{ing.name}</td>
                        <td style={{ padding: '7px 10px', fontSize: 11, color: 'rgba(255,255,255,0.45)' }}>{ing.category}</td>
                        <td style={{ padding: '7px 10px', fontSize: 12, color: 'rgba(255,255,255,0.6)', fontFamily: 'monospace' }}>{ing.unit}</td>
                        <td style={{ padding: '7px 10px', fontSize: 12, color: '#d4922a', fontFamily: 'monospace' }}>${ing.costPerUnit}</td>
                        <td style={{ padding: '7px 10px', fontSize: 12, color: 'rgba(255,255,255,0.45)', fontFamily: 'monospace' }}>{ing.minStock} {ing.unit}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Recetas */}
          <div style={{ ...S.card, marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4, flexWrap: 'wrap', gap: 8 }}>
              <div>
                <h2 style={{ ...S.h2, fontSize: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <BookOpen size={16} color="#d4922a" /> Recetas por platillo
                </h2>
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>La IA genera receta con cantidades estimadas. Ajusta lo que no esté bien.</p>
              </div>
              <button style={{ ...S.btn, ...S.btnGhost, padding: '7px 14px', fontSize: 12 }} onClick={generateAllRecipes}>
                <Sparkles size={13} /> Generar todas
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 12 }}>
              {recipes.map((rec, i) => {
                const dish = dishes.find(d => d.savedId === rec.dishId);
                return (
                  <div key={i} style={{ borderRadius: 10, border: '1px solid rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                    <button
                      onClick={() => toggleRecipe(i)}
                      style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: rec.open ? 'rgba(255,255,255,0.04)' : 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left' }}
                    >
                      <span style={{ fontSize: 18 }}>{dish?.emoji ?? '🍽️'}</span>
                      <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: '#f1f5f9' }}>{rec.dishName}</span>
                      {rec.recipe.length > 0 && (
                        <span style={S.badge('#34d399')}>{rec.recipe.length} ingredientes · ${rec.totalEstimatedCost.toFixed(0)} costo · {rec.foodCostPct.toFixed(0)}% FC</span>
                      )}
                      {rec.loading && <RefreshCw size={13} color="#d4922a" style={{ animation: 'spin 1s linear infinite', flexShrink: 0 }} />}
                      {!rec.loading && !rec.recipe.length && <span style={S.badge('#9ca3af')}>sin generar</span>}
                      {rec.open ? <ChevronDown size={14} color="rgba(255,255,255,0.3)" /> : <ChevronRight size={14} color="rgba(255,255,255,0.3)" />}
                    </button>

                    {rec.open && rec.recipe.length > 0 && (
                      <div style={{ padding: '0 14px 14px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 8 }}>
                          <thead>
                            <tr>
                              {['Ingrediente','Cantidad','Unidad','Costo/u','Costo línea'].map(h => (
                                <th key={h} style={{ padding: '5px 8px', textAlign: 'left', fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '.05em' }}>{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {rec.recipe.map((ri, j) => (
                              <tr key={j} style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                                <td style={{ padding: '6px 8px', fontSize: 12, color: '#f1f5f9' }}>{ri.ingredientName}</td>
                                <td style={{ padding: '6px 8px', fontSize: 12, color: 'rgba(255,255,255,0.7)', fontFamily: 'monospace' }}>
                                  <input type="number" step="0.01" value={ri.quantity}
                                    onChange={e => setRecipes(prev => prev.map((x, xi) => xi !== i ? x : { ...x, recipe: x.recipe.map((r, ri2) => ri2 !== j ? r : { ...r, quantity: Number(e.target.value) }) }))}
                                    style={{ ...S.input, width: 70, padding: '3px 6px', fontSize: 12 }} />
                                </td>
                                <td style={{ padding: '6px 8px', fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>{ri.unit}</td>
                                <td style={{ padding: '6px 8px', fontSize: 12, color: '#d4922a', fontFamily: 'monospace' }}>${ri.costPerUnit}</td>
                                <td style={{ padding: '6px 8px', fontSize: 12, color: '#86efac', fontFamily: 'monospace' }}>${(ri.quantity * ri.costPerUnit).toFixed(2)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {rec.open && !rec.recipe.length && !rec.loading && (
                      <div style={{ padding: '12px 14px', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: 10 }}>
                        <AlertTriangle size={14} color="#d97706" />
                        <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>Receta no generada todavía</span>
                        <button style={{ ...S.btn, ...S.btnPrimary, padding: '5px 12px', fontSize: 12 }} onClick={() => generateRecipe(i)}>
                          <Sparkles size={12} /> Generar
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Guardar todo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <button style={{ ...S.btn, ...S.btnPrimary, opacity: savingAll ? 0.6 : 1, fontSize: 15, padding: '12px 24px' }} onClick={handleSaveAll} disabled={savingAll}>
              {savingAll ? <RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Check size={16} />}
              {savingAll ? 'Guardando todo...' : 'Guardar insumos y recetas'}
            </button>
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>
              {ingredients.length} insumos · {recipes.filter(r => r.recipe.length > 0).length}/{recipes.length} recetas listas
            </span>
          </div>
        </>
      )}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        input[type=number]::-webkit-inner-spin-button { opacity: 0.4; }
      `}</style>
    </div>
  );
}
