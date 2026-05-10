import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const pdfFile = formData.get('pdf') as File | null;

    if (!pdfFile) {
      return NextResponse.json({ error: 'No se recibió el PDF' }, { status: 400 });
    }

    // Límite de 5MB
    if (pdfFile.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'El PDF supera los 5MB. Copia el texto manualmente.' }, { status: 413 });
    }

    // Convertir a base64 en el servidor (más eficiente)
    const ab = await pdfFile.arrayBuffer();
    const bytes = new Uint8Array(ab);
    let binary = '';
    const chunkSize = 8192;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
    }
    const base64 = btoa(binary);

    const msg = await anthropic.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 4096,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'document',
            source: { type: 'base64', media_type: 'application/pdf', data: base64 },
          } as any,
          {
            type: 'text',
            text: 'Extrae todo el texto de este menú de restaurante. Incluye todos los platillos, precios, categorías y descripciones exactamente como aparecen. Devuelve solo el texto plano, sin formato adicional.',
          },
        ],
      }],
    });

    const text = (msg.content[0] as { type: string; text: string }).text.trim();
    return NextResponse.json({ text });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error interno';
    console.error('[extract-pdf]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
