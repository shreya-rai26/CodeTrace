const TOKEN_KEY = 'codetrace_token';
// Empty when the API is served from the same address (Docker, local dev).
// Set VITE_API_URL at build time when the backend lives on another host.
const BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (t) => (t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY));

/** Calls the API. Resolves with parsed JSON, rejects with an Error carrying the server's message. */
export async function api(path, { method = 'GET', body, form } = {}) {
  const headers = {};
  if (getToken()) headers.Authorization = `Bearer ${getToken()}`;
  if (body) headers['Content-Type'] = 'application/json';
  let res;
  try {
    res = await fetch(`${BASE}/api${path}`, { method, headers, body: form || (body && JSON.stringify(body)) });
  } catch {
    throw new Error('Cannot reach the server. Check your connection and try again.');
  }
  if (res.status === 401 && getToken()) {
    setToken(null);
    window.location.assign('/login');
  }
  const data = res.status === 204 ? null : await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.error || `Request failed (${res.status}).`);
  return data;
}
