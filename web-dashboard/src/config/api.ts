/**
 * API base URL for backend.
 * Em desenvolvimento: proxy no Vite usa /api.
 * Em produção (Vercel): defina VITE_API_URL no projeto Vercel (ex: https://gym-backend.up.railway.app).
 */
export const API_BASE_URL =
  import.meta.env.VITE_API_URL ?? (import.meta.env.DEV ? '' : '');

export function apiUrl(path: string): string {
  const base = API_BASE_URL.replace(/\/$/, '');
  const p = path.startsWith('/') ? path : `/${path}`;
  return base ? `${base}${p}` : `/api${p}`;
}
