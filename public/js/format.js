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

// Zeitangaben, die jede Sekunde weiterzählen, ohne dass ein Fenster neu gezeichnet wird
export function bisSpan(bis, jetzt) { return `<span data-bis="${Math.round(bis)}">${dauer(bis - jetzt)}</span>`; }
export function sofortSpan(bis, preis) { return `<span data-sofort="${Math.round(bis)}">${zahl(preis)}</span>`; }
export function balkenI(von, bis, jetzt) { const p = Math.max(0, Math.min(1, (jetzt - von) / Math.max(1, bis - von))); return `<i class="prog" data-von="${Math.round(von)}" data-ende="${Math.round(bis)}" style="width:${(p * 100).toFixed(1)}%"></i>`; }
/** HTML ohne die weiterzählenden Teile (zum Vergleichen, ob sich wirklich etwas geändert hat) */
export function ohneZeiten(html) {
  return html.replace(/(<span data-(?:bis|sofort)="\d+">)[^<]*(<\/span>)/g, '$1$2').replace(/(<i class="prog" data-von="\d+" data-ende="\d+") style="[^"]*"/g, '$1');
}
export function zeitenAktualisieren(el, jetzt, sofortPreis) {
  if (!el) return;
  el.querySelectorAll('[data-bis]').forEach((x) => { x.textContent = dauer(+x.dataset.bis - jetzt); });
  if (sofortPreis) el.querySelectorAll('[data-sofort]').forEach((x) => { x.textContent = zahl(sofortPreis(+x.dataset.sofort - jetzt)); });
  el.querySelectorAll('i.prog[data-von]').forEach((x) => { const v = +x.dataset.von, b = +x.dataset.ende; x.style.width = Math.max(0, Math.min(100, (jetzt - v) / Math.max(1, b - v) * 100)) + '%'; });
}
