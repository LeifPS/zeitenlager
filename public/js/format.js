// Zahlen und Zeiten hübsch schreiben. Kürzel immer klein: k, m, b, t, qa ...
const KUERZEL = ['', 'k', 'm', 'b', 't', 'qa', 'qi', 'sx', 'sp', 'oc'];
export function zahl(n) {
  n = Math.floor(n || 0);
  if (Math.abs(n) < 10000) return n.toLocaleString('de-DE');
  let i = 0, x = n;
  while (Math.abs(x) >= 1000 && i < KUERZEL.length - 1) { x /= 1000; i++; }
  const s = Math.abs(x) >= 100 ? x.toFixed(0) : Math.abs(x) >= 10 ? x.toFixed(1) : x.toFixed(2);
  return s.replace('.', ',').replace(/,0+$/, '') + KUERZEL[i];
}
export function dauer(ms) {
  let s = Math.max(0, Math.ceil(ms / 1000));
  const t = Math.floor(s / 86400); s -= t * 86400;
  const h = Math.floor(s / 3600); s -= h * 3600;
  const m = Math.floor(s / 60); s -= m * 60;
  if (t) return `${t}T ${h}h`;
  if (h) return `${h}h ${m}m`;
  if (m) return `${m}m ${s}s`;
  return `${s}s`;
}
export function esc(t) { return String(t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]); }
