import { NextRequest, NextResponse } from 'next/server';

// Aumentar límite de body para PDFs grandes
export const maxDuration = 60; // 60 segundos timeout para PDFs
export const dynamic = 'force-dynamic';
import Anthropic from '@anthropic-ai/sdk';
import { rateLimit } from '@/lib/rateLimit';

/**
 * POST /api/menu-ai
 *
 * Tres modos de operación:
 *   mode: 'parse_menu'     → Extrae platillos de texto/PDF
 *   mode: 'gen_recipe'     → Genera receta con ingredientes para un platillo
 *   mode: 'gen_ingredients'→ Genera lista maestra de insumos para todo el menú
 */

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const SYSTEM = `Eres un chef ejecutivo mexicano con 20 años de experiencia y conocimiento profundo de costos de restaurante.
Tu trabajo es ayudar a dueños de restaurantes a estructurar su menú en un sistema ERP.
Responde SIEMPRE con JSON puro y valido. NUNCA uses markdown ni bloques de codigo. Solo JSON, sin texto extra antes o despues.`;

function cleanJSON(raw: string): string {
  let text = raw.trim();
  // Remover bloques markdown
  text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
  // Encontrar inicio del JSON
  const s1 = text.indexOf('{'), s2 = text.indexOf('[');
  let start = -1;
  if (s1 !== -1 && s2 !== -1) start = Math.min(s1, s2);
  else if (s1 !== -1) start = s1;
  else if (s2 !== -1) start = s2;
  if (start > 0) text = text.slice(start);
  // Encontrar fin del JSON
  const e1 = text.lastIndexOf('}'), e2 = text.lastIndexOf(']');
  const end = Math.max(e1, e2);
  if (end !== -1 && end < text.length - 1) text = text.slice(0, end + 1);
  return text;
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0] ?? 'unknown';
  const limit = rateLimit(ip, 20, 60 * 60_000);
  if (!limit.ok) {
    return NextResponse.json({ error: 'Demasiadas solicitudes. Intenta en unos minutos.' }, { status: 429 });
  }

  let body: {
    mode: 'parse_menu' | 'gen_recipe' | 'gen_ingredients' | 'detect_modifiers';
    menuText?: string;
    dishName?: string;
    dishCategory?: string;
    price?: number;
    restaurantType?: string;
    dishes?: { name: string; category: string; price: number }[];
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }

  const { mode } = body;

  try {
    if (mode === 'parse_menu') {
      // ── Modo 1: extraer platillos — soporta chunk único o array de chunks ────
      const restaurantType = (body as any).restaurantType ?? 'restaurante';
      const menuChunks: string[] = (body as any).menuChunks ?? [(body.menuText ?? '').slice(0, 2500)];

      const buildPrompt = (chunk: string) =>
        `Extrae los platillos de este fragmento de menú de ${restaurantType}.
REGLAS:
- AGRUPA variantes en UN platillo (proteínas/tamaños = modificadores, no platillos separados)
- precio=número sin símbolos, 0 si no hay
- descripción máx 60 chars del platillo base
- emoji específico por platillo, no repetir
- service_time: desayuno(chilaquiles,hotcakes,omelets), comida(guisados del día), cena(antojitos nocturnos), todo_el_dia(resto)
- Categorías: Entradas|Platos Fuertes|Postres|Bebidas|Desayunos|Hamburguesas|Tacos|Pizzas|Mariscos|Ensaladas|Sopas|Extras
Fragmento:
${chunk}
JSON minificado:
{"dishes":[{"name":"","description":"","price":0,"category":"","emoji":"","service_time":"todo_el_dia"}]}`;

      const repairJSON = (raw: string): string => {
        let t = cleanJSON(raw);
        try { JSON.parse(t); return t; } catch {}
        const last = t.lastIndexOf('}');
        if (last > 0) { t = t.slice(0, last + 1); if (!t.trimEnd().endsWith(']')) t += ']'; if (!t.trimEnd().endsWith('}')) t += '}'; }
        return t;
      };

      // Procesar chunks en paralelo (máx 6 simultáneos para no saturar rate limit)
      const PARALLEL = 6;
      let allDishes: any[] = [];
      for (let b = 0; b < menuChunks.length; b += PARALLEL) {
        const batch = menuChunks.slice(b, b + PARALLEL);
        const results = await Promise.all(batch.map(async chunk => {
          if (!chunk.trim()) return [];
          try {
            const msg = await anthropic.messages.create({
              model: 'claude-haiku-4-5-20251001', max_tokens: 2000, system: SYSTEM,
              messages: [{ role: 'user', content: buildPrompt(chunk) }],
            });
            const raw = (msg.content[0] as { type: string; text: string }).text.trim();
            return (JSON.parse(repairJSON(raw)).dishes ?? []) as any[];
          } catch { return []; }
        }));
        allDishes = allDishes.concat(results.flat());
      }

      // Deduplicar por nombre (normalizado: minúsculas + sin tildes)
      const norm = (s: string) => (s ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
      const seen = new Set<string>();
      const unique = allDishes.filter(d => { const k = norm(d.name); if (!k || seen.has(k)) return false; seen.add(k); return true; });

      return NextResponse.json({ dishes: unique });
    }

        if (mode === 'detect_modifiers') {
      const { dishNames, menuText: mText, restaurantType: rt } = body as any;
      const prompt = `Del siguiente texto de menú, detecta los modificadores/variantes para estos platillos: ${dishNames}

Modificadores son: opciones de tamaño, ingredientes extras, sustituciones, combos.
Ejemplos: "con/sin papas", "chico/mediano/grande", "extra queso +$15".

Menú:
${(mText ?? '').slice(0, 2000)}

JSON minificado (solo los platillos que TIENEN modificadores):
{"dishes":[{"name":"","modifier_groups":[{"name":"","min_select":0,"max_select":1,"options":[{"name":"","price_delta":0,"is_default":false}]}]}]}`;

      const msg = await anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1500,
        system: SYSTEM,
        messages: [{ role: 'user', content: prompt }],
      });
      const rawText = (msg.content[0] as { type: string; text: string }).text.trim();
      try {
        const parsed = JSON.parse(cleanJSON(rawText));
        return NextResponse.json(parsed);
      } catch {
        return NextResponse.json({ dishes: [] });
      }
    }

    if (mode === 'gen_recipe') {
      // ── Modo 2: generar receta para un platillo específico ────────────────
      const prompt = `Genera la receta detallada para preparar: "${body.dishName}"
Categoría: ${body.dishCategory ?? 'Platos Fuertes'}
Precio de venta estimado: $${body.price ?? 100} MXN
Tipo de restaurante: ${body.restaurantType ?? 'restaurante casual mexicano'}

Genera ingredientes realistas con cantidades precisas para UNA PORCIÓN.
Usa las unidades: kg, lt, pz, g, ml, caja, bolsa, sobre.
Estima el costo por unidad en pesos mexicanos 2024 (mercado mayorista).
El food cost debe ser entre 25% y 35% del precio de venta.

Responde con este JSON exacto:
{
  "recipe": [
    {
      "ingredientName": "Nombre del ingrediente",
      "category": "Carnes y Aves",
      "quantity": 0.2,
      "unit": "kg",
      "costPerUnit": 120,
      "estimatedCostLine": 24,
      "notes": ""
    }
  ],
  "prepTimeMin": 15,
  "preparationArea": "cocina",
  "totalEstimatedCost": 32,
  "foodCostPct": 32,
  "suggestedPrice": 100
}`;

      const msg = await anthropic.messages.create({
        model: 'claude-sonnet-4-5',
        max_tokens: 2048,
        system: SYSTEM,
        messages: [{ role: 'user', content: prompt }],
      });

      const rawText = (msg.content[0] as { type: string; text: string }).text.trim();
      const parsed = JSON.parse(cleanJSON(rawText));
      return NextResponse.json(parsed);
    }

    if (mode === 'gen_ingredients') {
      // ── Modo 3: generar lista maestra de insumos para todo el menú ────────
      const dishList = (body.dishes ?? [])
        .map((d) => `- ${d.name} (${d.category}, $${d.price})`)
        .join('\n');

      const prompt = `Lista maestra de insumos para restaurante de ${body.restaurantType ?? 'comida mexicana'}.
Consolida ingredientes repetidos. Menú:
${dishList}

REGLAS DE UNIDADES Y PRECIOS (México 2024, precios mayorista):
- Carnes: unidad=kg, precio típico $150-400/kg
- Verduras: unidad=kg, precio típico $15-60/kg
- Lácteos (queso): unidad=kg, precio típico $80-200/kg
- Especias/sal: unidad=g, precio típico $0.05-0.20/g
- Aceite: unidad=l, precio típico $30-60/l
- Tortillas: unidad=pz, precio típico $1-3/pz
- Limón: unidad=pz, precio típico $1-3/pz
- NUNCA pongas precio de kg en unidad g (ej: $180/g es incorrecto, debe ser $180/kg)

Categorías: Carnes y Aves|Mariscos|Verduras|Frutas|Lácteos|Panadería|Pastas y Granos|Especias|Aceites y Salsas|Bebidas|Congelados|Empaques|Limpieza|Otros

JSON minificado:
{"ingredients":[{"name":"","category":"","unit":"kg","costPerUnit":0,"minStock":1,"reorderPoint":2,"notes":""}]}`;

      const msg = await anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 2000,
        system: SYSTEM,
        messages: [{ role: 'user', content: prompt }],
      });

      const rawText = (msg.content[0] as { type: string; text: string }).text.trim();
      let jsonText = cleanJSON(rawText);
      try { JSON.parse(jsonText); } catch {
        const last = jsonText.lastIndexOf('}');
        if (last > 0) { jsonText = jsonText.slice(0, last + 1); if (!jsonText.endsWith(']')) jsonText += ']'; if (!jsonText.endsWith('}')) jsonText += '}'; }
      }
      const parsed = JSON.parse(jsonText);
      return NextResponse.json(parsed);
    }

    if (mode === 'extract_pdf') {
      // Extraer texto de PDF usando Claude con visión
      const pdfBase64 = (body as any).pdfBase64;
      if (!pdfBase64) return NextResponse.json({ error: 'Falta pdfBase64' }, { status: 400 });

      const msg = await anthropic.messages.create({
        model: 'claude-sonnet-4-5',
        max_tokens: 4096,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'document',
              source: { type: 'base64', media_type: 'application/pdf', data: pdfBase64 },
            },
            {
              type: 'text',
              text: 'Extrae todo el texto de este menú de restaurante. Incluye todos los platillos, precios, categorías y descripciones exactamente como aparecen. Devuelve solo el texto plano, sin formato adicional.',
            },
          ],
        }],
      });

      const text = (msg.content[0] as { type: string; text: string }).text.trim();
      return NextResponse.json({ text });
    }

    return NextResponse.json({ error: 'Modo no válido' }, { status: 400 });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error interno';
    console.error('[menu-ai]', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
