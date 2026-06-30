/**
 * roleLanding.ts — A dónde va cada rol al entrar, y qué página es su "home".
 *
 * Resuelve dos cosas:
 *  1. Tras el login, cada quien aterriza en SU pantalla (cocina, POS, dashboard).
 *  2. Si alguien llega por URL a una página que su rol no puede ver, lo
 *     mandamos a su home en vez de mostrarle algo que no le toca.
 */

export type AppRole =
  | 'admin' | 'gerente' | 'cajero' | 'mesero'
  | 'cocinero' | 'ayudante_cocina' | 'repartidor';

/** Página de inicio de cada rol (a dónde lo llevamos al entrar). */
export function getRoleLanding(role: string | null | undefined): string {
  switch (role) {
    case 'admin':
    case 'gerente':
      return '/dashboard';        // dueño/gerente ven el panel
    case 'cajero':
    case 'mesero':
      return '/pos-punto-de-venta'; // quien cobra/atiende: directo al POS
    case 'cocinero':
    case 'ayudante_cocina':
      return '/cocina';           // cocina: directo a las comandas
    case 'repartidor':
      return '/delivery';         // repartidor: a sus entregas
    default:
      return '/pos-punto-de-venta';
  }
}

/**
 * pageKey de cada ruta, para poder verificar permiso al entrar por URL.
 * Debe coincidir con los pageKey del Sidebar y de role_permissions.
 */
export const ROUTE_PAGE_KEY: Record<string, string> = {
  '/dashboard': 'dashboard',
  '/pos-punto-de-venta': 'pos',
  '/mesero': 'mesero',
  '/orders-management': 'orders',
  '/corte-caja': 'corte_caja',
  '/cocina': 'cocina',
  '/delivery': 'delivery',
  '/lealtad': 'lealtad',
  '/extras-store': 'extras_store',
  '/reservaciones': 'reservaciones',
  '/menu': 'menu',
  '/inventario': 'inventario',
  '/proveedores': 'proveedores',
  '/gastos': 'gastos',
  '/reportes': 'reportes',
  '/personal': 'personal',
  '/recursos-humanos': 'recursos_humanos',
  '/configuracion': 'configuracion',
  '/proveedores/': 'proveedores',
};

/** Dado un pathname, devuelve su pageKey (o null si no está mapeado). */
export function pageKeyForPath(pathname: string): string | null {
  // Match exacto primero
  if (ROUTE_PAGE_KEY[pathname]) return ROUTE_PAGE_KEY[pathname];
  // Match por prefijo (rutas con segmentos extra)
  for (const route of Object.keys(ROUTE_PAGE_KEY)) {
    if (pathname.startsWith(route)) return ROUTE_PAGE_KEY[route];
  }
  return null;
}
