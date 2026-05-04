import { NextRequest, NextResponse } from 'next/server';
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
Responde SIEMPRE en JSON válido y nada más. Sin markdown, sin backticks, sin explicaciones.`;

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0] ?? 'unknown';
  const limit = rateLimit(ip, 20, 60 * 60_000);
  if (!limit.ok) {
    return NextResponse.json({ error: 'Demasiadas solicitudes. Intenta en unos minutos.' }, { status: 429 });
  }

  let body: {
    mode: 'parse_menu' | 'gen_recipe' | 'gen_ingredients';
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
      const prompt = `Del siguiente texto de menú, extrae todos los platillos.
Para cada uno devuelve: nombre, descripción breve (máx 80 chars), precio (número),
categoría (solo: Entradas|Platos Fuertes|Postres|Bebidas|Extras), emoji relevante.

Texto del menú:
${(body.menuText ?? '').slice(0, 6000)}

Responde con este JSON exacto:
{
  "dishes": [
    {
      "name": "Nombre del platillo",
      "description": "Descripción breve",
      "price": 120,
      "category": "Platos Fuertes",
      "emoji": "🍔"
    }
  ]
}`;

      const msg = await anthropic.messages.create({
        model: 'claude-sonnet-4-5',
        max_tokens: 4096,
        system: SYSTEM,
        messages: [{ role: 'user', content: prompt }],
      });

      const text = (msg.content[0] as { type: string; text: string }).text.trim();
      const parsed = JSON.parse(text);
      return NextResponse.json(parsed);
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

      const text = (msg.content[0] as { type: string; text: string }).text.trim();
      const parsed = JSON.parse(text);
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

      const text = (msg.content[0] as { type: string; text: string }).text.trim();
      const parsed = JSON.parse(text);
      return NextResponse.json(parsed);
    }

    return NextResponse.json({ error: 'Modo no válido' }, { status: 400 });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error interno';
    console.error('[menu-ai]', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
