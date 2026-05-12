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

async function callAnthropicWithRetry(fn: () => Promise<any>, maxRetries = 3): Promise<any> {
  for (let i = 0; i < maxRetries; i++) {
    try { return await fn(); }
    catch (err: any) {
      if ((err?.status === 429 || err?.message?.includes('rate')) && i < maxRetries - 1) {
        await new Promise(r => setTimeout(r, Math.pow(2, i + 1) * 3000)); // 6s, 12s, 24s
        continue;
      }
      throw err;
    }
  }
}

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

REGLAS CRÍTICAS:
1. AGRUPA variantes del MISMO platillo base en UN SOLO platillo:
   - "Hamburguesa de Pollo", "Hamburguesa Pollo" → UN platillo "Hamburguesa de Pollo"
   - "Enchiladas Rojas con pollo", "Enchiladas Rojas con sirloin" → UN platillo "Enchiladas Rojas"
   - Las variantes (proteína, tamaño, extras) se manejan como modificadores DESPUÉS
2. Si ves dos nombres muy similares (>70% palabras iguales) → son el MISMO platillo, agrúpalos
3. precio=número sin símbolos ($,MXN,pesos), 0 si no aparece precio explícito
4. descripción máx 60 chars del platillo BASE (sin listar variantes)
5. emoji específico y único por platillo
6. service_time: desayuno(chilaquiles,hotcakes,omelets,jugos), todo_el_dia(resto)
7. Categorías: Entradas|Platos Fuertes|Postres|Bebidas|Desayunos|Hamburguesas|Tacos|Pizzas|Mariscos|Ensaladas|Sopas|Extras

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
            const msg = await callAnthropicWithRetry(() => anthropic.messages.create({
              model: 'claude-haiku-4-5-20251001', max_tokens: 2000, system: SYSTEM,
              messages: [{ role: 'user', content: buildPrompt(chunk) }],
            }));
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
      const prompt = `Detecta modificadores para estos platillos de ${rt ?? 'restaurante'}: ${dishNames}

REGLAS CRÍTICAS:
1. NUNCA pongas como modificador el ingrediente principal del platillo:
   - Hamburguesa de Pollo → NO "Con pollo / Sin pollo"
   - Pizza de Jamón → NO "Con jamón / Sin jamón"
   - Enchiladas → NO "Con tortilla / Sin tortilla"
2. Modificadores válidos son:
   - ACOMPAÑAMIENTOS: "Con papas / Sin papas", "Con ensalada / Sin ensalada"
   - EXTRAS de pago: "Extra queso +$15", "Extra tocino +$20", "Doble carne +$30"
   - NIVEL: "Sin picante / Poco / Medio / Extra picante"
   - TAMAÑO: "Chico $45 / Grande $65"
   - PRESENTACIÓN: "Para llevar / Para comer aquí"
3. Para hamburguesas: el modificador MÁS COMÚN es "Acompañamiento" (Con papas / Sin papas)
4. Si el texto del menú no muestra variantes claras, NO inventes modificadores

Menú:
${(mText ?? '').slice(0, 2000)}

JSON minificado (SOLO platillos con modificadores reales):
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

      // Detectar productos comprados (no preparados) — receta = 1 ingrediente
      const dishNameLower = (body.dishName ?? '').toLowerCase();
      const restaurantTypeLower = (body.restaurantType ?? '').toLowerCase();
      const isPasteleria = /pastel|pastelería|panadería|bakery|repostería/.test(restaurantTypeLower);

      const isCommercialDrink =
        body.dishCategory === 'Bebidas' && (
          /coca.?cola|pepsi|sprite|fanta|7.?up|sidral|mundet|peñafiel|squirt|jarritos|red.?bull|monster|powerade|gatorade|del.?valle|jumex|boing|minute.?maid|fresca|lift/.test(dishNameLower) ||
          /cerveza|michelada base|agua mineral|agua tónica|refresco|soda|tónica|kombucha|té.?(listo|frio|helado)/.test(dishNameLower)
        );

      // Postres comprados: cheesecake, pastel, pay, galletas, brownie, pan dulce
      // a menos que sea una pastelería
      const isCommercialDessert = !isPasteleria &&
        body.dishCategory === 'Postres' && (
          /cheesecake|pay |pastel |rebanada|brownie|galleta|dona|éclair|muffin|cupcake|macaron|profiterol|triffle|tiramisú|pan dulce/.test(dishNameLower)
        );

      const isCommercialProduct = isCommercialDrink || isCommercialDessert;

      const prompt = isCommercialProduct
        ? `El producto "${body.dishName}" es un producto comercial embotellado o enlatado que se compra al distribuidor.
La receta tiene exactamente 1 ingrediente: la botella, lata o caja del producto.
Precio de venta: $${body.price ?? 30} MXN.

JSON:
{"recipe":[{"ingredientName":"${body.dishName}","category":"Bebidas","quantity":1,"unit":"pz","costPerUnit":${Math.round((body.price ?? 30) * 0.45)},"estimatedCostLine":${Math.round((body.price ?? 30) * 0.45)},"notes":"Precio al distribuidor"}],"prepTimeMin":0,"preparationArea":"barra","totalEstimatedCost":${Math.round((body.price ?? 30) * 0.45)},"foodCostPct":45,"suggestedPrice":${body.price ?? 30}}`
        : `Genera la receta para preparar: "${body.dishName}"
Categoría: ${body.dishCategory ?? 'Platos Fuertes'}
Precio de venta: $${body.price ?? 100} MXN
Restaurante: ${body.restaurantType ?? 'restaurante casual mexicano'}

REGLAS IMPORTANTES:
- Ingredientes realistas para UNA PORCIÓN
- Si es bebida preparada (licuado, agua fresca, jugo, café, cóctel): ingredientes para prepararla, sin marcas comerciales
- NOMBRES DE INGREDIENTES — usa el nombre MÁS SIMPLE:
  * "Sal de mar", "Sal de cocina" → "Sal"
  * "Pimienta negra molida" → "Pimienta"
  * "Lechuga romana" → "Lechuga"
  * "Cebolla blanca" → "Cebolla"
  * "Aceite vegetal" → "Aceite"
  * "Pechuga de pollo" → "Pollo"
  Usa nombres genéricos que coincidan con el inventario del restaurante.
- CANTIDADES Y UNIDADES (crítico):
  * Sal, pimienta, especias: 1-5 g → quantity=2, unit="g"
  * Cebolla, tomate, verduras: 20-80 g → quantity=0.05, unit="kg"
  * Carne, pollo: 100-200 g → quantity=0.15, unit="kg"
  * Tortillas: 2-4 piezas → quantity=3, unit="pz"
  * Aceite: 5-20 ml → quantity=0.015, unit="lt"
  * NUNCA más de 1 kg de sal/pimienta/especias en una receta
  * NUNCA más de 5 kg de ningún ingrediente en una porción
- PRECIOS MAYORISTAS MXN 2024:
  * Carnes: $150-350/kg | Verduras: $15-60/kg | Quesos: $80-200/kg
  * Pan/tortilla: $2-8/pz | Aceite: $30-60/lt | Especias: $0.05-0.20/g
- FOOD COST verificado: costo_total debe ser 25-40% de $${body.price ?? 100}
  * Máximo permitido: $$${Math.round((body.price ?? 100) * 0.40)} MXN
  * Si supera ese límite, REDUCE las cantidades de ingredientes costosos

JSON exacto:
{"recipe":[{"ingredientName":"","category":"","quantity":0,"unit":"","costPerUnit":0,"estimatedCostLine":0,"notes":""}],"prepTimeMin":15,"preparationArea":"cocina","totalEstimatedCost":0,"foodCostPct":30,"suggestedPrice":${body.price ?? 100}}`;

      const msg = await callAnthropicWithRetry(() => anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1500,
        system: SYSTEM,
        messages: [{ role: 'user', content: prompt }],
      }));

      const rawText = (msg.content[0] as { type: string; text: string }).text.trim();
      let jsonText = cleanJSON(rawText);
      try { JSON.parse(jsonText); } catch { const l = jsonText.lastIndexOf('}'); if (l > 0) { jsonText = jsonText.slice(0, l+1); if (!jsonText.endsWith(']')) jsonText += ']'; if (!jsonText.endsWith('}')) jsonText += '}'; } }
      const parsed = JSON.parse(jsonText);
      return NextResponse.json(parsed);
    }

    if (mode === 'gen_ingredients') {
      // ── Modo 3: generar lista maestra de insumos para todo el menú ────────
      const dishList = (body.dishes ?? [])
        .map((d) => `- ${d.name} (${d.category}, $${d.price})`)
        .join('\n');

      const prompt = `Lista maestra de insumos para restaurante de ${body.restaurantType ?? 'comida mexicana'}.
Menú: ${dishList}

REGLA MÁS IMPORTANTE — SIMPLICIDAD:
Usa el nombre MÁS GENÉRICO posible para cada ingrediente.
SIMPLIFICACIÓN OBLIGATORIA — USA SIEMPRE EL NOMBRE MÁS SIMPLE:
- Sal de mar / Sal de cocina / Sal gruesa / Sal fina → "Sal"
- Café molido / Café espresso / Café en grano / Café filtro → "Café"
- Canela molida / Canela en polvo / Canela entera → "Canela"
- Lechuga romana / Lechuga iceberg / Lechuga orejona → "Lechuga"
- Cebolla blanca / Cebolla morada / Cebolla de cambray → "Cebolla"
- Aceite vegetal / Aceite de girasol / Aceite de maíz → "Aceite"
- Pimienta negra / Pimienta molida / Pimienta blanca → "Pimienta"
- Jalapeño / Chiles jalapeños / Chile jalapeño fresco → "Chile jalapeño" (UN solo nombre)
- Pechuga de pollo / Muslo de pollo / Pollo deshebrado → "Pollo"
- Leche entera / Leche descremada / Espuma de leche → "Leche"
- Yogurt natural / Yogur / Yogurt → "Yogurt"
- Azúcar blanca / Azúcar refinada / Azúcar glass → "Azúcar"
- Harina de trigo / Harina blanca / Harina todo uso → "Harina"
REGLA: si dudas entre 2 nombres, usa el MÁS CORTO.
NO generes 2 ingredientes que sean el mismo producto con nombre distinto.

UNIDADES Y PRECIOS (México 2024 mayorista):
- Carnes/pollo: kg, $150-350/kg | Verduras: kg, $15-60/kg
- Lácteos/queso: kg, $80-200/kg | Especias: g, $0.05-0.20/g
- Aceite: lt, $30-60/lt | Tortillas/pan: pz, $1-8/pz

Categorías: Carnes y Aves|Mariscos|Verduras|Frutas|Lácteos|Panadería|Pastas y Granos|Especias|Aceites y Salsas|Bebidas|Congelados|Empaques|Limpieza|Otros

JSON minificado:
{"ingredients":[{"name":"","category":"","unit":"kg","costPerUnit":0,"minStock":0,"reorderPoint":0,"notes":""}]}`;

      const msg = await callAnthropicWithRetry(() => anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 2000,
        system: SYSTEM,
        messages: [{ role: 'user', content: prompt }],
      }));

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
