/**
 * geocode.ts — Convierte direcciones en coordenadas (lat/lng) usando
 * Nominatim de OpenStreetMap. Gratis, sin API key, suficiente para México
 * a escala de cientos de restaurantes.
 *
 * Nominatim pide máximo 1 petición por segundo — por eso geocodeBatch
 * espera entre cada una. No abuses: es un servicio comunitario gratuito.
 */

export interface AddressParts {
  address?: string | null;
  colonia?: string | null;
  city?: string | null;
  state_region?: string | null;
  postal_code?: string | null;
  country?: string | null;
}

export interface GeoResult {
  lat: number;
  lng: number;
  displayName: string;
}

/** Construye una cadena de búsqueda limpia desde las partes de la dirección. */
export function buildAddressQuery(parts: AddressParts): string {
  return [
    parts.address,
    parts.colonia,
    parts.city,
    parts.state_region,
    parts.postal_code,
    parts.country || 'México',
  ]
    .map(s => (s ?? '').trim())
    .filter(Boolean)
    .join(', ');
}

/** Geocodifica una sola dirección. Devuelve null si no se encuentra. */
export async function geocodeAddress(parts: AddressParts): Promise<GeoResult | null> {
  const q = buildAddressQuery(parts);
  if (!q || q === 'México') return null;
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=mx&q=${encodeURIComponent(q)}`;
    const res = await fetch(url, {
      headers: { 'Accept-Language': 'es' },
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) return null;
    const hit = data[0];
    const lat = parseFloat(hit.lat);
    const lng = parseFloat(hit.lon);
    if (Number.isNaN(lat) || Number.isNaN(lng)) return null;
    return { lat, lng, displayName: hit.display_name ?? q };
  } catch {
    return null;
  }
}

/**
 * Geocodifica una lista, respetando el límite de 1/seg de Nominatim.
 * onProgress se llama tras cada intento para mostrar avance en la UI.
 */
export async function geocodeBatch<T extends AddressParts & { id: string }>(
  items: T[],
  onProgress?: (done: number, total: number, current: T, result: GeoResult | null) => void
): Promise<Map<string, GeoResult>> {
  const out = new Map<string, GeoResult>();
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const result = await geocodeAddress(item);
    if (result) out.set(item.id, result);
    onProgress?.(i + 1, items.length, item, result);
    // Esperar ~1.1s entre peticiones (respeta el límite del servicio gratuito)
    if (i < items.length - 1) await new Promise(r => setTimeout(r, 1100));
  }
  return out;
}
