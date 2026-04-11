// Tenant ID module store — set by AuthContext on login
let _currentTenantId: string | null = null;
export function setCurrentTenantId(id: string | null) { _currentTenantId = id; }
export function getCurrentTenantId(): string | null {
  if (_currentTenantId) return _currentTenantId;
  try { return JSON.parse(sessionStorage.getItem('aldente_session') || '{}')?.tenantId || null; } catch { return null; }
}
