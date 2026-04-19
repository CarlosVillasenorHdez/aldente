/**
 * src/lib/apiValidation.ts
 *
 * Utilidades de validación para API routes de Next.js.
 * Evita inputs maliciosos, SQL injection strings y payloads gigantes.
 */

import { NextResponse } from 'next/server';

// ── Tipos ─────────────────────────────────────────────────────────────────────

export type ValidationRule =
  | { type: 'string'; min?: number; max?: number; pattern?: RegExp; enum?: string[] }
  | { type: 'number'; min?: number; max?: number }
  | { type: 'boolean' }
  | { type: 'uuid' }
  | { type: 'email' }
  | { type: 'optional'; rule: ValidationRule };

export type Schema = Record<string, ValidationRule>;

// ── Validadores ───────────────────────────────────────────────────────────────

const UUID_RE    = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL_RE   = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Detecta patrones comunes de SQL injection
const SQL_INJ_RE = /('|--|;|\/\*|\*\/|xp_|UNION\s+SELECT|DROP\s+TABLE|INSERT\s+INTO)/i;

function validateField(value: unknown, rule: ValidationRule, fieldName: string): string | null {
  // Optional — si no viene el campo, ok
  if (rule.type === 'optional') {
    if (value === undefined || value === null) return null;
    return validateField(value, rule.rule, fieldName);
  }

  // Campo requerido pero ausente
  if (value === undefined || value === null) {
    return `${fieldName} es requerido`;
  }

  if (rule.type === 'string') {
    if (typeof value !== 'string') return `${fieldName} debe ser texto`;
    if (SQL_INJ_RE.test(value)) return `${fieldName} contiene caracteres no permitidos`;
    if (rule.min && value.length < rule.min) return `${fieldName} muy corto (mínimo ${rule.min})`;
    if (rule.max && value.length > rule.max) return `${fieldName} muy largo (máximo ${rule.max})`;
    if (rule.pattern && !rule.pattern.test(value)) return `${fieldName} formato inválido`;
    if (rule.enum && !rule.enum.includes(value)) return `${fieldName} valor no permitido (opciones: ${rule.enum.join(', ')})`;
    return null;
  }

  if (rule.type === 'uuid') {
    if (typeof value !== 'string' || !UUID_RE.test(value)) return `${fieldName} no es un UUID válido`;
    return null;
  }

  if (rule.type === 'email') {
    if (typeof value !== 'string' || !EMAIL_RE.test(value)) return `${fieldName} no es un email válido`;
    if (value.length > 254) return `${fieldName} email demasiado largo`;
    return null;
  }

  if (rule.type === 'number') {
    const n = typeof value === 'string' ? parseFloat(value) : value;
    if (typeof n !== 'number' || isNaN(n)) return `${fieldName} debe ser un número`;
    if (rule.min !== undefined && n < rule.min) return `${fieldName} mínimo ${rule.min}`;
    if (rule.max !== undefined && n > rule.max) return `${fieldName} máximo ${rule.max}`;
    return null;
  }

  if (rule.type === 'boolean') {
    if (typeof value !== 'boolean') return `${fieldName} debe ser true o false`;
    return null;
  }

  return null;
}

/**
 * Valida un objeto contra un schema.
 * Retorna null si todo está bien, o NextResponse 400 con el error.
 */
export function validate(
  body: Record<string, unknown>,
  schema: Schema
): NextResponse | null {
  for (const [field, rule] of Object.entries(schema)) {
    const error = validateField(body[field], rule, field);
    if (error) {
      return NextResponse.json({ error }, { status: 400 });
    }
  }
  return null;
}

/**
 * Parsea y valida el body de una request.
 * Retorna { body, error } — si error !== null, retorna el NextResponse directamente.
 */
export async function parseAndValidate<T extends Record<string, unknown>>(
  req: Request,
  schema: Schema,
  maxSizeKB = 50
): Promise<{ body: T | null; error: NextResponse | null }> {
  // Verificar Content-Type
  const ct = req.headers.get('content-type') ?? '';
  if (!ct.includes('application/json')) {
    return {
      body: null,
      error: NextResponse.json({ error: 'Content-Type debe ser application/json' }, { status: 415 }),
    };
  }

  // Verificar tamaño del body
  const contentLength = parseInt(req.headers.get('content-length') ?? '0');
  if (contentLength > maxSizeKB * 1024) {
    return {
      body: null,
      error: NextResponse.json({ error: `Payload demasiado grande (máximo ${maxSizeKB}KB)` }, { status: 413 }),
    };
  }

  let body: T;
  try {
    body = await req.json() as T;
  } catch {
    return {
      body: null,
      error: NextResponse.json({ error: 'JSON inválido' }, { status: 400 }),
    };
  }

  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return {
      body: null,
      error: NextResponse.json({ error: 'El body debe ser un objeto JSON' }, { status: 400 }),
    };
  }

  const validationError = validate(body, schema);
  if (validationError) {
    return { body: null, error: validationError };
  }

  return { body, error: null };
}

// ── Schemas reutilizables ─────────────────────────────────────────────────────

export const CHECKOUT_SCHEMA: Schema = {
  tenantId:      { type: 'uuid' },
  plan:          { type: 'string', enum: ['operacion', 'negocio', 'empresa', 'medida'] },
  customerEmail: { type: 'optional', rule: { type: 'email' } },
};

export const DEMO_REQUEST_SCHEMA: Schema = {
  restaurantName: { type: 'string', min: 2, max: 100 },
  contactName:    { type: 'string', min: 2, max: 100 },
  email:          { type: 'email' },
  phone:          { type: 'optional', rule: { type: 'string', max: 20 } },
  plan:           { type: 'optional', rule: { type: 'string', max: 50 } },
  message:        { type: 'optional', rule: { type: 'string', max: 1000 } },
};
