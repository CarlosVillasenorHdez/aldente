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
      // ── Modo 1: extraer platillos de texto libre ─────────────────────────
      const restaurantType = (body as any).restaurantType ?? 'restaurante';
      const prompt = `Extrae los platillos de este menú de ${restaurantType}.

REGLAS IMPORTANTES:
- AGRUPA variantes del mismo platillo en UN solo platillo. Ejemplo: "Enchiladas Rojas con pollo", "Enchiladas Rojas con sirloin" → UN platillo "Enchiladas Rojas", precio=el más bajo.
- NO crees platillos separados para cada proteína/tamaño/variante — eso se maneja con modificadores después.
- precio=número sin símbolos (0 si no hay precio explícito)
- descripción máx 60 chars, describir el platillo base
- emoji específico y relevante al platillo (no repitas el mismo emoji)
- Categorías: Entradas|Platos Fuertes|Postres|Bebidas|Desayunos|Hamburguesas|Tacos|Pizzas|Mariscos|Ensaladas|Extras

Menú:
${(body.menuText ?? '').slice(0, 3000)}

JSON minificado:
{"dishes":[{"name":"","description":"","price":0,"category":"","emoji":""}]}`;

      const msg = await anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 3000,
        system: SYSTEM,
        messages: [{ role: 'user', content: prompt }],
      });

      const rawText = (msg.content[0] as { type: string; text: string }).text.trim();
      // Si el JSON está truncado, intentar repararlo cerrando el array y objeto
      let jsonText = cleanJSON(rawText);
      // Reparar JSON truncado de forma robusta
      try {
        JSON.parse(jsonText); // intentar parsear directo
      } catch {
        // Truncado — encontrar el último objeto completo (último "}")
        // y cerrar el array + objeto contenedor
        const lastCompleteBrace = jsonText.lastIndexOf('}');
        if (lastCompleteBrace > 0) {
          jsonText = jsonText.slice(0, lastCompleteBrace + 1);
          // Asegurar que cierra el array "dishes"
          if (!jsonText.trimEnd().endsWith(']')) jsonText += ']';
          // Asegurar que cierra el objeto raíz
          if (!jsonText.trimEnd().endsWith('}')) jsonText += '}';
        }
      }
      const parsed = JSON.parse(jsonText);
      return NextResponse.json(parsed);
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

      const prompt = `Para el siguiente menú de restaurante, genera la lista maestra de insumos/ingredientes necesarios.
Consolida ingredientes que se repiten entre platillos.
Tipo de restaurante: ${body.restaurantType ?? 'restaurante casual mexicano'}

Menú:
${dishList}

Para cada insumo incluye: nombre, categoría del inventario, unidad de medida, costo estimado por unidad (MXN 2024 mayorista), stock mínimo sugerido, punto de reorden sugerido.

Categorías válidas: Carnes y Aves|Mariscos|Verduras|Frutas|Lácteos|Panadería|Pastas y Granos|Especias|Aceites y Salsas|Bebidas|Congelados|Empaques|Limpieza|Otros

Responde con este JSON exacto:
{
  "ingredients": [
    {
      "name": "Nombre del insumo",
      "category": "Verduras",
      "unit": "kg",
      "costPerUnit": 15,
      "minStock": 2,
      "reorderPoint": 4,
      "notes": ""
    }
  ]
}`;

      const msg = await anthropic.messages.create({
        model: 'claude-sonnet-4-5',
        max_tokens: 4096,
        system: SYSTEM,
        messages: [{ role: 'user', content: prompt }],
      });

      const rawText = (msg.content[0] as { type: string; text: string }).text.trim();
      const parsed = JSON.parse(cleanJSON(rawText));
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
