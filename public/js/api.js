// Verbindung zum Server.
const TOKEN = 'zeitenlager_token';
export function token() { try { return localStorage.getItem(TOKEN) || ''; } catch { return ''; } }
export function setzeToken(t) { try { if (t) localStorage.setItem(TOKEN, t); else localStorage.removeItem(TOKEN); } catch { } }
export async function api(pfad, body) {
  const opt = { method: body ? 'POST' : 'GET', headers: { 'content-type': 'application/json' } };
  const t = token(); if (t) opt.headers.authorization = 'Bearer ' + t;
  if (body) opt.body = JSON.stringify(body);
  let r;
  try { r = await fetch('/api' + pfad, opt); } catch (e) { return { ok: false, fehler: 'Keine Verbindung zum Server.', offline: true }; }
  let j; try { j = await r.json(); } catch { j = { ok: false, fehler: 'Ungültige Antwort vom Server.' }; }
  return j;
}
