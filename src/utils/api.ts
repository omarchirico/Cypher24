/**
 * API URL resolver for Cypher24.
 * Enables the app to work both when served by Express backend and when running
 * as a standalone offline/portable single-file HTML bundle.
 */

export function getCustomServerUrl(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('cypher24_custom_server_url') || '';
}

export function setCustomServerUrl(url: string): void {
  if (typeof window === 'undefined') return;
  if (!url || !url.trim()) {
    localStorage.removeItem('cypher24_custom_server_url');
  } else {
    localStorage.setItem('cypher24_custom_server_url', url.trim().replace(/\/+$/, ''));
  }
}

export function getApiBaseUrl(): string {
  if (typeof window === 'undefined') return '';

  // 1. Check user-configured custom server
  const custom = getCustomServerUrl();
  if (custom) return custom;

  // 2. If running via file:// protocol or blob/data
  if (window.location.protocol === 'file:' || !window.location.origin || window.location.origin === 'null') {
    const embeddedOrigin = (window as any).__CYPHER24_RELAY_URL__;
    if (embeddedOrigin && typeof embeddedOrigin === 'string') {
      return embeddedOrigin.replace(/\/+$/, '');
    }
    return '';
  }

  // 3. Standard web origin
  return '';
}

export function apiUrl(endpoint: string): string {
  const base = getApiBaseUrl();
  const clean = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return base ? `${base}${clean}` : clean;
}
