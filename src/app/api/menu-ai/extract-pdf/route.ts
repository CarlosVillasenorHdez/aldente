import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 30;
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const pdfFile = formData.get('pdf') as File | null;

    if (!pdfFile) {
      return NextResponse.json({ error: 'No se recibió el PDF' }, { status: 400 });
    }

    // Límite generoso — ya no necesitamos enviar a Anthropic
    if (pdfFile.size > 50 * 1024 * 1024) {
      return NextResponse.json({ error: 'El PDF supera los 50MB.' }, { status: 413 });
    }

    const ab = await pdfFile.arrayBuffer();
    const buffer = Buffer.from(ab);

    // Extraer texto con pdf-parse (gratis, sin IA)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pdfParseModule: any = await import('pdf-parse');
    const pdfParse = pdfParseModule.default ?? pdfParseModule;
    const result = await pdfParse(buffer);

    const text = result.text?.trim() || '';

    if (!text || text.length < 20) {
      // El PDF es de imágenes (escaneado o diseño puro como Canva)
      // Devolver mensaje útil para el usuario
      return NextResponse.json({
        text: '',
        isImagePdf: true,
        pages: result.numpages,
      });
    }

    return NextResponse.json({
      text: text.slice(0, 12000),
      pages: result.numpages,
      isImagePdf: false,
    });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error interno';
    console.error('[extract-pdf]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
