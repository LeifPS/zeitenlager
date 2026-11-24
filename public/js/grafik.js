// Zeichnen im bunten Comic-Stil, Ansicht 3/4 von vorn (wie Tonlinge): Gebäude, Einheiten, Boden, Effekte.
// Alles prozedural gezeichnet, nichts geladen.
import { GEBAEUDE, EINHEITEN, STUFEN } from '../shared/daten.js';

export const TW = 48, TH = 36;          // Pixel pro Feld (Breite, Tiefe)
export const RAND = '#2b2238';
export const TEAM = {
  blau: { a: '#3fa34d', b: '#2b7a37', c: '#d4f2c6' },  // eigene Armee: Grün
  rot: { a: '#a8382b', b: '#6e2018', c: '#f2c8bd' },   // Barbaren und Gegner: Rotbraun
};
export function iso(tx, ty) { return [tx * TW, ty * TH]; } // Feld -> Pixel (Name aus alter Ansicht beibehalten)

// ------------------------------------------------------------ Farbe
export function farbe(hex, f) {
  const n = parseInt(hex.slice(1), 16);
  let r = n >> 16, g = (n >> 8) & 255, b = n & 255;
  if (f > 0) { r += (255 - r) * f; g += (255 - g) * f; b += (255 - b) * f; } else { r *= 1 + f; g *= 1 + f; b *= 1 + f; }
  return '#' + ((1 << 24) | (Math.round(r) << 16) | (Math.round(g) << 8) | Math.round(b)).toString(16).slice(1);
}
const REGENBOGEN = ['#e8322a', '#ff9a1a', '#ffd21a', '#3cc35a', '#2f6fe0', '#8a3fd6'];
/** Füllstil der Stufenfarbe (Regenbogen als Verlauf, Legende schillernd) oder null bei Normal */
export function stufenStil(c, stufe, x0, x1, t = 0) {
  const f = STUFEN[stufe] && STUFEN[stufe].farbe;
  if (!f) return null;
  if (f === 'regenbogen' || f === 'legende') {
    const g = c.createLinearGradient(x0, 0, x1, 0);
    const n = REGENBOGEN.length, v = f === 'legende' ? (t * 0.6) % 1 : 0;
    const stops = REGENBOGEN.map((col, i) => [((i / n) + v) % 1, col]).sort((a, b) => a[0] - b[0]);
    for (const [p, col] of stops) g.addColorStop(p, col);
    return g;
  }
  return f;
}

// ------------------------------------------------------------ Grundformen
function weg(c, pts) { c.beginPath(); c.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]); c.closePath(); }
function fl(c, fill, lw = 2) { if (fill) { c.fillStyle = fill; c.fill(); } c.strokeStyle = RAND; c.lineWidth = lw; c.lineJoin = 'round'; c.lineCap = 'round'; c.stroke(); }
function rr(c, x, y, w, h, r) { c.beginPath(); c.roundRect(x, y, w, h, r); }
function vertikal(c, y0, y1, a, b) { const g = c.createLinearGradient(0, y0, 0, y1); g.addColorStop(0, a); g.addColorStop(1, b); return g; }
export function punkt(c, x, y, r, col, lw = 1.6) { c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); fl(c, col, lw); }
export function glow(c, x, y, r, col) { const g = c.createRadialGradient(x, y, 0, x, y, r * 3); g.addColorStop(0, '#fff'); g.addColorStop(0.3, col); g.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = g; c.beginPath(); c.arc(x, y, r * 3, 0, 7); c.fill(); }

// Quader: Grundfläche (x,y,w,d) in Feldern, Höhe h in Pixeln. Vorderseite + Deckel.
export function quader(c, x, y, w, d, h, col, opt = {}) {
  const X = x * TW, Y = y * TH, W = w * TW, D = d * TH;
  rr(c, X, Y + D - h, W, h, opt.r ?? 2); fl(c, opt.front || vertikal(c, Y + D - h, Y + D, farbe(col, -0.02), farbe(col, -0.24)));
  if (!opt.ohneDeckel) { rr(c, X, Y - h, W, D, opt.r ?? 2); fl(c, opt.oben || farbe(col, 0.18)); }
  return { X, Y, W, D, top: Y + D - h };
}
// Satteldach über einer Wand: x, w in Feldern; yFront = Oberkante der Vorderwand (Pixel); d = Tiefe in Feldern
export function satteldach(c, x, w, yFront, d, hoehe, col, ueber = 6) {
  const X = x * TW - ueber, W = w * TW + ueber * 2, D = d * TH;
  const first = yFront - D * 0.5 - hoehe;
  weg(c, [[X + 6, first], [X + W - 6, first], [X + W - 10, yFront - D - hoehe * 0.35], [X + 10, yFront - D - hoehe * 0.35]]); fl(c, farbe(col, -0.25));
  weg(c, [[X, yFront + 4], [X + W, yFront + 4], [X + W - 6, first], [X + 6, first]]); fl(c, vertikal(c, first, yFront, farbe(col, 0.14), farbe(col, -0.12)));
  c.save(); weg(c, [[X, yFront + 4], [X + W, yFront + 4], [X + W - 6, first], [X + 6, first]]); c.clip();
  c.strokeStyle = farbe(col, -0.3); c.lineWidth = 1.4;
  for (let yy = first + 7; yy < yFront; yy += 7) { c.beginPath(); c.moveTo(X, yy); c.lineTo(X + W, yy); c.stroke(); }
  c.restore();
  weg(c, [[X, yFront + 4], [X + W, yFront + 4], [X + W - 6, first], [X + 6, first]]); fl(c, null);
  return first;
}
export function flachdach(c, x, w, yFront, d, col) { const X = x * TW - 3, W = w * TW + 6, D = d * TH; rr(c, X, yFront - D, W, D + 4, 3); fl(c, farbe(col, 0.1)); rr(c, X + 5, yFront - D + 4, W - 10, D - 6, 2); fl(c, farbe(col, -0.06), 1.2); }
export function kuppel(c, cx, yBasis, r, col) {
  c.beginPath(); c.ellipse(cx, yBasis, r, r * 0.95, 0, Math.PI, 0); c.closePath();
  const g = c.createRadialGradient(cx - r * 0.35, yBasis - r * 0.6, 1, cx, yBasis - r * 0.3, r * 1.2); g.addColorStop(0, farbe(col, 0.55)); g.addColorStop(0.55, col); g.addColorStop(1, farbe(col, -0.3));
  fl(c, g);
  c.beginPath(); c.ellipse(cx - r * 0.38, yBasis - r * 0.55, r * 0.16, r * 0.26, -0.5, 0, 7); c.fillStyle = 'rgba(255,255,255,.55)'; c.fill();
}
export function turmRund(c, cx, yBoden, r, h, col) {
  c.beginPath(); c.moveTo(cx - r, yBoden - h); c.lineTo(cx - r, yBoden); c.ellipse(cx, yBoden, r, r * 0.35, 0, Math.PI, 0, true); c.lineTo(cx + r, yBoden - h); c.closePath();
  const g = c.createLinearGradient(cx - r, 0, cx + r, 0); g.addColorStop(0, farbe(col, -0.25)); g.addColorStop(0.45, farbe(col, 0.12)); g.addColorStop(1, farbe(col, -0.2));
  fl(c, g);
  c.beginPath(); c.ellipse(cx, yBoden - h, r, r * 0.35, 0, 0, 7); fl(c, farbe(col, 0.2));
  return yBoden - h;
}
function zinnenReihe(c, x0, x1, y, col, n) { const w = (x1 - x0) / (n * 2 - 1); for (let i = 0; i < n; i++) { rr(c, x0 + i * 2 * w, y - 8, w, 9, 1.5); fl(c, farbe(col, 0.1), 1.6); } }
function fenster(c, x, y, w, h, col = '#ffe7a0', rahmen = '#5a3a22') {
  rr(c, x - w / 2 - 2, y - h - 2, w + 4, h + 4, 3); fl(c, rahmen, 1.6);
  rr(c, x - w / 2, y - h, w, h, 2); c.fillStyle = col; c.fill();
  c.strokeStyle = rahmen; c.lineWidth = 1.4; c.beginPath(); c.moveTo(x, y - h); c.lineTo(x, y); c.moveTo(x - w / 2, y - h / 2); c.lineTo(x + w / 2, y - h / 2); c.stroke();
}
function tuer(c, x, y, w, h, col = '#7a4a26') {
  c.beginPath(); c.moveTo(x - w / 2, y); c.lineTo(x - w / 2, y - h + w / 2); c.arc(x, y - h + w / 2, w / 2, Math.PI, 0); c.lineTo(x + w / 2, y); c.closePath(); fl(c, col);
  c.strokeStyle = farbe(col, -0.3); c.lineWidth = 1.2; c.beginPath(); c.moveTo(x, y - h + 3); c.lineTo(x, y); c.stroke(); punkt(c, x + w * 0.28, y - h * 0.42, 1.4, '#ffd23f', 1);
}
function fahne(c, x, y, h, col, w = 0) {
  c.strokeStyle = RAND; c.lineWidth = 3.5; c.beginPath(); c.moveTo(x, y); c.lineTo(x, y - h); c.stroke();
  c.strokeStyle = '#a07a52'; c.lineWidth = 1.8; c.beginPath(); c.moveTo(x, y); c.lineTo(x, y - h); c.stroke();
  c.beginPath(); c.moveTo(x + 1, y - h); c.quadraticCurveTo(x + 12, y - h - 4 + w, x + 22, y - h + 2); c.lineTo(x + 20, y - h + 14); c.quadraticCurveTo(x + 10, y - h + 10 + w, x + 1, y - h + 13); c.closePath(); fl(c, col, 1.8);
  punkt(c, x, y - h - 2, 2.5, '#ffd23f', 1.2);
}
function kamin(c, x, y, col) { rr(c, x, y - 18, 10, 18, 1); fl(c, col, 1.8); rr(c, x - 2, y - 21, 14, 5, 1); fl(c, farbe(col, -0.15), 1.6); }
function rauch(c, x, y) { c.fillStyle = 'rgba(235,235,240,.85)'; for (let i = 0; i < 3; i++) { c.beginPath(); c.arc(x + i * 4, y - i * 9, 4 + i * 2, 0, 7); c.fill(); } }

export const MATERIAL = [
  { wand: '#e8c48c', dach: '#c8553a', holz: '#9a6234', akzent: '#d63a2f', stein: '#cbbf9f' },
  { wand: '#f1e6cc', dach: '#d4593e', holz: '#9a6234', akzent: '#d63a2f', stein: '#ddd2b4' },
  { wand: '#c9c3b5', dach: '#4f6da8', holz: '#7a5130', akzent: '#3466c9', stein: '#b3ad9f' },
  { wand: '#f2dcb4', dach: '#b04333', holz: '#7a5130', akzent: '#8a46c2', stein: '#dccdae' },
  { wand: '#b9604a', dach: '#51535f', holz: '#4f3727', akzent: '#d6ab2c', stein: '#977565' },
  { wand: '#cfd3d8', dach: '#5f6a76', holz: '#4c5560', akzent: '#3f7bd0', stein: '#a3aab1' },
  { wand: '#dde3e6', dach: '#78886a', holz: '#5c6650', akzent: '#94d23a', stein: '#bbc2c6' },
  { wand: '#eef4f8', dach: '#3f92ba', holz: '#55707f', akzent: '#3fbbe0', stein: '#cbd8e0', glas: true },
  { wand: '#f3f5ff', dach: '#4a5ed8', holz: '#7a86b8', akzent: '#6380ff', stein: '#dde1f7', glas: true, neon: '#86a6ff' },
  { wand: '#fdf2fd', dach: '#b844aa', holz: '#b38bb0', akzent: '#ff62e4', stein: '#efdcef', glas: true, neon: '#ff86f2' },
  { wand: '#363b5a', dach: '#22253f', holz: '#4e5478', akzent: '#ffd36a', stein: '#525a80', glas: true, neon: '#ffe486' },
];
export function bildZeitalter(typ, stufe, zentrumZa) {
  if (typ === 'zentrum') return Math.max(0, stufe - 1);
  return Math.max(0, Math.min(zentrumZa ?? 10, Math.floor((Math.max(1, stufe) - 1) / 2)));
}

// ------------------------------------------------------------ Gebäude-Sprites
const cache = new Map();
const AUFL = 2, PAD = 28;
/** { bild, ox, oy, w, h }: bild bei (bx - ox, by - oy) zeichnen; (bx, by) = linke obere Ecke der Grundfläche */
export function gebaeudeSprite(typ, stufe, za, variante = 0) {
  const key = typ + '|' + stufe + '|' + za + '|' + variante;
  let e = cache.get(key); if (e) return e;
  const gr = GEBAEUDE[typ].gr;
  const hoch = 160 + gr * 22;
  const w = gr * TW + PAD * 2, h = hoch + gr * TH + 14;
  const cv = document.createElement('canvas'); cv.width = w * AUFL; cv.height = h * AUFL;
  const c = cv.getContext('2d'); c.scale(AUFL, AUFL); c.translate(PAD, hoch);
  if (GEBAEUDE[typ].kat !== 'deko' || typ === 'statue') { c.save(); c.fillStyle = 'rgba(30,45,20,.16)'; c.beginPath(); c.ellipse(gr * TW / 2 + 3, gr * TH - 4, gr * TW * 0.5, gr * TH * 0.26, 0, 0, 7); c.fill(); c.restore(); }
  (ZEICHNER[typ] || standard)(c, gr, stufe, za, MATERIAL[za], variante);
  e = { bild: cv, ox: PAD, oy: hoch, w, h };
  cache.set(key, e);
  return e;
}
function standard(c, gr, s, za, M) { const q = quader(c, 0.15, 0.4, gr - 0.3, gr - 0.6, 34, M.wand); satteldach(c, 0.15, gr - 0.3, q.top, gr - 0.6, 18, M.dach); }

function haus(c, x, y, w, d, wandH, M, opt = {}) {
  const q = quader(c, x, y, w, d, wandH, opt.wand || M.wand, { ohneDeckel: true });
  const vorn = (y + d) * TH;
  if (opt.balken) { c.strokeStyle = M.holz; c.lineWidth = 3; c.strokeRect(q.X + 3, q.top + 3, q.W - 6, wandH - 6); }
  if (opt.fenster) { const n = opt.fenster; for (let i = 0; i < n; i++) { const fx = q.X + q.W * (i + 0.5) / n; if (opt.tuer && Math.abs(fx - (q.X + q.W / 2)) < 12) continue; fenster(c, fx, vorn - wandH * 0.38, 9, 10, M.glas ? '#bfeaff' : '#ffe7a0'); } }
  if (opt.tuer) tuer(c, q.X + q.W / 2, vorn, 14, Math.min(22, wandH * 0.7));
  let first = q.top;
  if (opt.dach === 'flach') { flachdach(c, x, w, q.top, d, M.dach); first = q.top - d * TH; }
  else if (opt.dach !== 'keins') first = satteldach(c, x, w, q.top, d, opt.dachH || 18, opt.dachFarbe || M.dach);
  else { rr(c, q.X, q.top - d * TH, q.W, d * TH, 2); fl(c, farbe(opt.wand || M.wand, 0.15)); }
  return { ...q, first, vorn };
}

const ZEICHNER = {
  zentrum(c, gr, s, za, M) {
    const W = gr * TW, vorn = gr * TH;
    if (za <= 2) {
      const st = za === 0 ? M.holz : M.stein;
      const keep = haus(c, 1.0, 0.3, 2.0, 1.4, 58 + za * 8, M, { wand: st, fenster: 2, dach: za === 0 ? 'sattel' : 'keins', dachH: 24, dachFarbe: M.dach });
      if (za >= 1) zinnenReihe(c, keep.X, keep.X + keep.W, keep.top - keep.D + 1, st, 4);
      fahne(c, W / 2, za === 0 ? keep.first + 2 : keep.top - keep.D - 6, 30, M.akzent);
      for (const tx of [0.2, 3.2]) {
        const t = quader(c, tx, 1.8, 0.6, 0.6, 52, st);
        if (za >= 1) zinnenReihe(c, t.X, t.X + t.W, t.Y - 52, st, 2);
        else { weg(c, [[t.X - 4, t.Y - 52], [t.X + t.W / 2, t.Y - 74], [t.X + t.W + 4, t.Y - 52]]); fl(c, M.dach); }
      }
      const m = quader(c, 0.8, 2.6, 2.4, 0.5, 36, st);
      if (za >= 1) zinnenReihe(c, m.X, m.X + m.W, m.top - m.D + 1, st, 5);
      else for (let i = 0; i < 9; i++) { weg(c, [[m.X + i * m.W / 9, m.top], [m.X + (i + 0.5) * m.W / 9, m.top - 7], [m.X + (i + 1) * m.W / 9, m.top]]); fl(c, farbe(st, 0.1), 1.4); }
      tuer(c, W / 2, vorn - 0.9 * TH + 2, 22, 28, '#6b3f1f');
    } else if (za <= 4) {
      const mitte = haus(c, 1.3, 0.3, 1.4, 1.1, 82, M, { fenster: 1, dach: 'keins' });
      kuppel(c, W / 2, mitte.top - mitte.D + 2, 25, za === 4 ? '#6fa59f' : '#e0b43a');
      fahne(c, W / 2, mitte.top - mitte.D - 22, 26, M.akzent);
      const h = haus(c, 0.15, 1.4, 3.7, 1.8, 48, M, { fenster: 5, tuer: true, dachH: 22 });
      for (let i = 0; i < 4; i++) { const x = h.X + 16 + i * (h.W - 32) / 3; rr(c, x - 3, h.vorn - 46, 6, 46, 2); fl(c, '#f6efe1', 1.4); }
    } else if (za <= 7) {
      const turmH = 104 + (za - 5) * 18;
      const t = quader(c, 0.9, 0.5, 2.2, 1.7, turmH, M.wand);
      for (let r = 0; r < Math.floor(turmH / 14) - 1; r++) for (let i = 0; i < 5; i++) { rr(c, t.X + 6 + i * (t.W - 12) / 5, t.top + 8 + r * 14, (t.W - 12) / 5 - 4, 8, 1); c.fillStyle = r % 3 ? '#9fd0ec' : '#d8f1ff'; c.fill(); }
      rr(c, t.X + t.W / 2 - 3, t.top - t.D - 36, 6, 36, 1); fl(c, '#9aa3ad', 1.4); punkt(c, t.X + t.W / 2, t.top - t.D - 38, 4, '#ff4d4d', 1.4);
      const so = quader(c, 0.15, 2.3, 3.7, 1.5, 24, M.stein);
      tuer(c, W / 2, so.Y + so.D, 24, 20, '#3f4a55');
    } else {
      quader(c, 0.15, 2.2, 3.7, 1.6, 20, M.stein);
      const yb = vorn - 1.1 * TH;
      const top = turmRund(c, W / 2, yb, 46, 96 + za * 6, M.wand);
      c.save(); c.shadowColor = M.neon; c.shadowBlur = 12; c.strokeStyle = M.neon; c.lineWidth = 4; c.beginPath(); c.ellipse(W / 2, yb - 50, 47, 16, 0, 0, Math.PI); c.stroke(); c.restore();
      weg(c, [[W / 2 - 36, top], [W / 2, top - 70 - za * 4], [W / 2 + 36, top]]); fl(c, vertikal(c, top - 80, top, farbe(M.akzent, 0.3), M.akzent));
      glow(c, W / 2, top - 76 - za * 4, 7, M.neon);
    }
  },
  goldmine(c, gr, s, za, M) {
    const W = gr * TW, vorn = gr * TH;
    c.beginPath(); c.moveTo(4, vorn - 6); c.quadraticCurveTo(10, vorn - 72, W * 0.42, vorn - 86); c.quadraticCurveTo(W * 0.82, vorn - 94, W - 6, vorn - 30); c.lineTo(W - 4, vorn - 6); c.closePath();
    fl(c, vertikal(c, vorn - 92, vorn, '#bda47c', '#7d6748'), 2.2);
    for (const [x, y, r] of [[0.25, 0.55, 5], [0.62, 0.42, 6], [0.8, 0.66, 4], [0.4, 0.3, 4]]) punkt(c, W * x, vorn - 90 * y - 10, r, '#8d7a5c', 1.4);
    const sx = W * 0.36, sy = vorn - 8;
    c.beginPath(); c.moveTo(sx - 15, sy); c.lineTo(sx - 15, sy - 18); c.arc(sx, sy - 18, 15, Math.PI, 0); c.lineTo(sx + 15, sy); c.closePath(); fl(c, '#241a12');
    c.strokeStyle = RAND; c.lineWidth = 7; c.beginPath(); c.moveTo(sx - 17, sy); c.lineTo(sx - 17, sy - 26); c.lineTo(sx + 17, sy - 26); c.lineTo(sx + 17, sy); c.stroke();
    c.strokeStyle = M.holz; c.lineWidth = 4.5; c.stroke();
    c.strokeStyle = '#6b5a4a'; c.lineWidth = 2; c.beginPath(); c.moveTo(sx - 8, sy); c.lineTo(sx + 30, vorn + 2); c.moveTo(sx + 4, sy); c.lineTo(sx + 44, vorn + 2); c.stroke();
    lore(c, sx + 36, vorn - 2);
    goldHaufen(c, W * 0.8, vorn - 8, 7 + Math.min(10, s));
    if (za >= 4) { const t = quader(c, 2.25, 0.2, 0.55, 0.55, 46, M.stein); rauch(c, t.X + 12, t.top - t.D - 4); }
  },
  schatzkammer(c, gr, s, za, M) {
    const W = gr * TW;
    const h = haus(c, 0.25, 0.9, 2.5, 1.7, 42 + za * 2, M, { wand: M.stein, tuer: true, dach: 'keins' });
    for (const x of [h.X + 10, h.X + h.W - 10]) { rr(c, x - 4, h.top, 8, 42 + za * 2, 2); fl(c, '#f4efe2', 1.4); }
    kuppel(c, W / 2, h.top - h.D * 0.3, 38, za >= 8 ? M.neon : '#f0bf30');
    goldHaufen(c, h.X + 4, h.vorn + 4, 5); goldHaufen(c, h.X + h.W - 4, h.vorn + 4, 5);
  },
  rohstofflager(c, gr, s, za, M) {
    haus(c, 0.15, 0.3, 2.0, 1.5, 36, M, { tuer: true, balken: za < 4, dachH: 16 });
    kiste(c, 2.45, 2.05, M); kiste(c, 2.55, 2.75, M); kiste(c, 0.5, 2.7, M); fass(c, 1.35 * TW, 2.85 * TH, '#9a6234');
  },
  handwerkerhuette(c, gr, s, za, M) {
    const h = haus(c, 0.15, 0.3, 1.35, 1.2, 30, M, { tuer: true, balken: za < 4, dachH: 16 });
    kamin(c, h.X + h.W - 18, h.first + 12, M.stein);
    holzStapel(c, 1.7 * TW, 1.85 * TH);
    hammerSchild(c, h.X + h.W - 8, h.vorn - 26);
  },
  akademie(c, gr, s, za, M) {
    const W = gr * TW;
    const h = haus(c, 0.15, 0.9, 2.7, 1.8, 48, M, { dach: 'keins' });
    for (let i = 0; i < 5; i++) { const x = h.X + 10 + i * (h.W - 20) / 4; rr(c, x - 4, h.top + 6, 8, 42, 2); fl(c, '#f6f0e2', 1.4); }
    weg(c, [[h.X - 6, h.top + 6], [W / 2, h.top - 22], [h.X + h.W + 6, h.top + 6]]); fl(c, farbe(M.wand, 0.15));
    kuppel(c, W * 0.75, h.top - h.D * 0.6, 18, za >= 6 ? '#e3e9f0' : '#8cb6d6');
    c.strokeStyle = RAND; c.lineWidth = 5; c.beginPath(); c.moveTo(W * 0.75, h.top - h.D * 0.6 - 14); c.lineTo(W * 0.75 + 16, h.top - h.D * 0.6 - 30); c.stroke(); c.strokeStyle = '#c9a227'; c.lineWidth = 3; c.stroke();
    tuer(c, W / 2, h.vorn, 14, 24);
  },
  unterkunft(c, gr, s, za, M) {
    if (za <= 1) {
      zelt(c, 0.9 * TW, 1.6 * TH, 32, M.akzent); zelt(c, 2.2 * TW, 1.4 * TH, 30, '#efe3c6'); zelt(c, 1.5 * TW, 2.75 * TH, 32, '#efe3c6');
      lagerfeuer(c, 2.45 * TW, 2.65 * TH);
    } else haus(c, 0.15, 0.6, 2.7, 2.1, 38 + Math.min(za, 6) * 3, M, { fenster: 4, tuer: true, dachH: 18, dach: za >= 5 ? 'flach' : 'sattel' });
  },
  kaserne(c, gr, s, za, M) {
    const W = gr * TW;
    const h = haus(c, 0.15, 0.4, 2.7, 1.8, 40 + za, M, { fenster: 2, dach: za <= 4 ? 'sattel' : 'flach', dachH: 18, balken: za < 3 });
    tor(c, W / 2, h.vorn, 24, 28);
    schwerterSchild(c, W / 2, h.top + 12, M.akzent);
    fahne(c, 0.3 * TW, 2.92 * TH, 46, M.akzent);
    puppe(c, 2.65 * TW, 2.9 * TH, M);
  },
  schiessstand(c, gr, s, za, M) {
    haus(c, 0.1, 0.3, 1.3, 1.6, 30, M, { dachH: 14, balken: za < 4 });
    zielscheibe(c, 2.25 * TW, 1.45 * TH); zielscheibe(c, 2.6 * TW, 2.6 * TH);
    if (za <= 2) heuballen(c, 1.4 * TW, 2.85 * TH);
  },
  stall(c, gr, s, za, M) {
    const W = gr * TW;
    if (za >= 5) { const h = haus(c, 0.15, 0.6, 2.7, 1.9, 42, M, { dach: 'flach' }); for (let i = 0; i < 2; i++) garagenTor(c, h.X + h.W * (0.28 + i * 0.44), h.vorn, 30, 28); return; }
    const h = haus(c, 0.15, 0.4, 2.7, 1.6, 36, M, { wand: M.holz, dachH: 20 });
    stalltuer(c, W / 2, h.vorn, 26, 26);
    heuballen(c, 2.6 * TW, 2.7 * TH); zaun(c, 0.1 * TW, 2.9 * TH, 1.8 * TW);
  },
  werkstatt(c, gr, s, za, M) {
    const h = haus(c, 0.15, 0.5, 2.1, 1.8, 38, M, { tuer: true, fenster: 2, dachH: 16 });
    zahnrad(c, h.X + h.W - 14, h.top + 12, 9, '#aab4bf');
    kran(c, 2.65 * TW, 1.7 * TH, M);
    if (za >= 4) { const k = quader(c, 0.25, 0.15, 0.4, 0.4, 70, M.stein); rauch(c, k.X + 10, k.top - k.D - 4); }
  },
  flugfeld(c, gr, s, za, M) {
    const W = gr * TW, D = gr * TH;
    rr(c, 2, D * 0.45, W - 4, D * 0.55, 4); fl(c, '#6c727a');
    for (let i = 0; i < 6; i++) { c.fillStyle = '#f2f2f2'; c.fillRect(10 + i * (W - 20) / 6, D * 0.72, 18, 4); }
    haus(c, 0.15, 0.1, 1.9, 1.3, 34, M, { dach: 'flach', fenster: 2 });
    const t = turmRund(c, 3.4 * TW, 1.4 * TH, 9, 56, M.stein); rr(c, 3.4 * TW - 14, t - 14, 28, 14, 3); fl(c, '#8fd0ee');
  },
  heilhaus(c, gr, s, za, M) {
    const W = gr * TW;
    const h = haus(c, 0.15, 0.5, 2.7, 1.9, 42, M, { wand: '#f7f3ea', fenster: 4, tuer: true, dachFarbe: '#4fae63', dachH: 18 });
    punkt(c, W / 2, h.top - 14, 12, '#fff', 2);
    c.fillStyle = '#2fbf5f'; c.fillRect(W / 2 - 3, h.top - 22, 6, 16); c.fillRect(W / 2 - 8, h.top - 17, 16, 6);
    kraeuter(c, 0.35 * TW, 2.9 * TH); kraeuter(c, 2.7 * TW, 2.9 * TH);
  },
  ruestkammer(c, gr, s, za, M) {
    haus(c, 0.15, 0.5, 2.1, 1.8, 40, M, { wand: M.stein, tuer: true, dachH: 16 });
    const k = quader(c, 0.3, 0.2, 0.45, 0.45, 78, M.stein); rauch(c, k.X + 10, k.top - k.D - 4);
    amboss(c, 2.6 * TW, 2.75 * TH); glow(c, 2.6 * TW - 14, 2.75 * TH - 10, 5, '#ff9a3c');
  },
  mauer(c, gr, s, za, M, v) {
    // v: Nachbarn als Bits (1 rechts, 2 unten, 4 links, 8 oben)
    const hoehe = 24 + Math.min(za, 8) * 3;
    const col = za === 0 ? M.holz : M.stein;
    if (za === 0) {
      const pfahl = (x, y) => { rr(c, x - 5, y - hoehe, 10, hoehe, 2); fl(c, vertikal(c, y - hoehe, y, farbe(col, 0.1), farbe(col, -0.2)), 1.6); weg(c, [[x - 5, y - hoehe], [x, y - hoehe - 7], [x + 5, y - hoehe]]); fl(c, farbe(col, 0.1), 1.6); };
      const liste = [];
      if (v & 8) liste.push([TW / 2, 0.1 * TH], [TW / 2, 0.4 * TH]);
      if (v & 4) liste.push([0.05 * TW, 0.7 * TH], [0.3 * TW, 0.7 * TH]);
      liste.push([TW / 2, 0.7 * TH]);
      if (v & 1) liste.push([0.75 * TW, 0.7 * TH], [1.0 * TW, 0.7 * TH]);
      if (v & 2) liste.push([TW / 2, 1.0 * TH], [TW / 2, 1.3 * TH]);
      liste.sort((a, b) => a[1] - b[1]).forEach(([x, y]) => pfahl(x, y));
      return;
    }
    const block = (x, y, w, d) => quader(c, x, y, w, d, hoehe, col, { r: 1 });
    if (v & 8) block(0.3, 0, 0.4, 0.5);
    if (v & 4) block(0, 0.3, 0.5, 0.4);
    block(0.22, 0.22, 0.56, 0.56);
    if (v & 1) block(0.5, 0.3, 0.5, 0.4);
    if (v & 2) block(0.3, 0.5, 0.4, 0.5);
    if (za >= 7) glow(c, TW / 2, 0.22 * TH - hoehe + 4, 3, M.neon || M.akzent);
  },
  wachturm(c, gr, s, za, M) {
    const W = gr * TW, vorn = gr * TH;
    const h = 66 + za * 5;
    if (za === 0) {
      for (const x of [0.35, 1.65]) { rr(c, x * TW - 4, vorn - 8 - h, 8, h, 2); fl(c, M.holz, 1.6); }
      c.strokeStyle = RAND; c.lineWidth = 5; c.beginPath(); c.moveTo(0.35 * TW, vorn - 14); c.lineTo(1.65 * TW, vorn - h * 0.6); c.moveTo(1.65 * TW, vorn - 14); c.lineTo(0.35 * TW, vorn - h * 0.6); c.stroke();
      c.strokeStyle = M.holz; c.lineWidth = 3; c.stroke();
      rr(c, 0.12 * TW, vorn - 14 - h, 1.76 * TW, 16, 2); fl(c, farbe(M.holz, 0.1));
      wache(c, W / 2, vorn - 14 - h, za);
      for (const x of [0.25, 1.75]) { c.strokeStyle = RAND; c.lineWidth = 4.5; c.beginPath(); c.moveTo(x * TW, vorn - 14 - h); c.lineTo(x * TW, vorn - 42 - h); c.stroke(); c.strokeStyle = M.holz; c.lineWidth = 2.5; c.stroke(); }
      weg(c, [[0.02 * TW, vorn - 40 - h], [W / 2, vorn - 66 - h], [1.98 * TW, vorn - 40 - h]]); fl(c, M.dach);
    } else if (za <= 4) {
      const top = turmRund(c, W / 2, vorn - 10, 26, h, M.stein);
      for (let i = 0; i < 4; i++) { rr(c, W / 2 - 22 + i * 12, top - 10, 8, 10, 1.5); fl(c, farbe(M.stein, 0.1), 1.4); }
      fenster(c, W / 2, vorn - 10 - h * 0.45, 7, 11, '#3a2a1c');
      wache(c, W / 2, top - 2, za);
      if (za >= 2) { weg(c, [[W / 2 - 30, top - 26], [W / 2, top - 58], [W / 2 + 30, top - 26]]); fl(c, M.dach); }
    } else if (za <= 7) {
      quader(c, 0.45, 0.6, 1.1, 1.1, h, M.stein);
      const p = quader(c, 0.25, 0.4, 1.5, 1.2, 12, M.wand, {});
      void p;
      geschuetz(c, W / 2, 0.4 * TH - h - 6, za);
    } else {
      const top = turmRund(c, W / 2, vorn - 10, 18, h, M.wand);
      c.save(); c.shadowColor = M.neon; c.shadowBlur = 10; c.strokeStyle = M.neon; c.lineWidth = 3; c.beginPath(); c.ellipse(W / 2, vorn - 10 - h * 0.5, 19, 6, 0, 0, Math.PI); c.stroke(); c.restore();
      kuppel(c, W / 2, top, 20, M.akzent); glow(c, W / 2, top - 22, 6, M.neon);
    }
  },
  moerser(c, gr, s, za, M) {
    const W = gr * TW;
    const b = quader(c, 0.3, 0.9, 2.4, 1.8, 36 + za * 2, M.stein);
    zinnenReihe(c, b.X, b.X + b.W, b.top - b.D + 1, M.stein, 5);
    const cx = W / 2, cy = b.top - b.D * 0.4;
    if (za <= 2) {
      c.strokeStyle = RAND; c.lineWidth = 9; c.beginPath(); c.moveTo(cx - 20, cy); c.lineTo(cx + 22, cy - 46); c.stroke();
      c.strokeStyle = M.holz; c.lineWidth = 5.5; c.stroke();
      punkt(c, cx + 24, cy - 48, 8, '#8a8070');
    } else { c.save(); c.translate(cx, cy); c.rotate(-0.8); rr(c, -9, -40, 18, 46, 6); fl(c, '#3f4752'); rr(c, -11, -44, 22, 8, 3); fl(c, '#2f353e'); c.restore(); }
  },
  falle(c, gr, s, za) {
    c.globalAlpha = 0.6; c.fillStyle = '#6b5636'; c.beginPath(); c.ellipse(TW / 2, TH * 0.6, 17, 9, 0, 0, 7); c.fill();
    c.fillStyle = za >= 4 ? '#3b3b42' : '#d4cdbb';
    for (let i = -1; i <= 1; i++) { c.beginPath(); c.moveTo(TW / 2 + i * 7 - 3, TH * 0.6 + 2); c.lineTo(TW / 2 + i * 7, TH * 0.6 - 9); c.lineTo(TW / 2 + i * 7 + 3, TH * 0.6 + 2); c.fill(); }
    c.globalAlpha = 1;
  },
  bunker(c, gr) { const W = gr * TW, vorn = gr * TH; kuppel(c, W / 2, vorn - 8, 40, '#949a9f'); rr(c, W / 2 - 22, vorn - 30, 44, 7, 3); fl(c, '#1d1d22', 1.4); rr(c, W / 2 - 2, vorn - 29, 24, 4, 2); fl(c, '#4b4f55', 1); },
  flak(c, gr) {
    const W = gr * TW;
    const b = quader(c, 0.15, 0.6, 1.7, 1.2, 14, '#7c8580');
    c.save(); c.translate(W / 2, b.top - b.D * 0.5); punkt(c, 0, 0, 13, '#5d6b5f');
    for (const d of [-6, 6]) { c.save(); c.translate(d, -2); c.rotate(-1.2); rr(c, 0, -3, 34, 6, 2); fl(c, '#3f4a42', 1.6); c.restore(); }
    c.restore();
  },
  laserturm(c, gr, s, za, M) { const W = gr * TW, vorn = gr * TH; quader(c, 0.4, 0.7, 1.2, 1.0, 18, M.stein); const top = turmRund(c, W / 2, vorn - 22, 8, 52, '#e3e8f6'); kristall(c, W / 2, top - 18, M.neon || '#86a6ff'); },
  schildgen(c, gr, s, za, M) { const W = gr * TW; const b = quader(c, 0.3, 0.6, 1.4, 1.1, 22, M.wand); const top = turmRund(c, W / 2, b.top - b.D * 0.4, 8, 26, M.stein); c.save(); c.globalAlpha = 0.35; c.fillStyle = M.neon; c.beginPath(); c.arc(W / 2, top - 14, 22, 0, 7); c.fill(); c.restore(); punkt(c, W / 2, top - 14, 7, M.neon); },
  ionenkanone(c, gr, s, za, M) {
    const W = gr * TW, vorn = gr * TH;
    quader(c, 0.15, 1.0, 2.7, 1.8, 18, M.stein);
    const top = turmRund(c, W / 2, vorn - 24, 36, 26, M.wand);
    c.save(); c.translate(W / 2, top - 6); c.rotate(-0.5); rr(c, -11, -70, 22, 74, 6); fl(c, '#3b3f5c'); c.fillStyle = M.neon; c.fillRect(-5, -74, 10, 8); c.restore();
  },
  fahne(c, gr, s, za, M, v) { punkt(c, TW / 2, TH * 0.75, 4, '#9a8f7a'); fahne(c, TW / 2, TH * 0.75, 52, ['#3fa34d', '#e8322a', '#ffd23f', '#2f6fe0', '#8a46c2'][v % 5]); },
  baum(c, gr, s, za, M, v) { baum(c, TW / 2, TH * 0.85, v); },
  statue(c, gr, s, za, M) {
    const W = gr * TW;
    const b = quader(c, 0.4, 0.9, 1.2, 0.9, 20, '#ddd6c6');
    const g = '#cfa94e', y = b.top - b.D * 0.5;
    rr(c, W / 2 - 9, y - 34, 18, 34, 6); fl(c, g); punkt(c, W / 2, y - 42, 8, g);
    c.strokeStyle = RAND; c.lineWidth = 5; c.beginPath(); c.moveTo(W / 2 + 8, y - 30); c.lineTo(W / 2 + 18, y - 58); c.stroke(); c.strokeStyle = g; c.lineWidth = 2.5; c.stroke();
  },
};

// ------------------------------------------------------------ Kleinteile
function goldHaufen(c, x, y, n) { for (let i = 0; i < n; i++) { const a = i * 2.4, r = 2 + (i % 4) * 2.4; const px = x + Math.cos(a) * r * 1.3, py = y - 2 - (n - i) * 1 + Math.sin(a) * r * 0.45; c.beginPath(); c.ellipse(px, py, 5, 3, 0, 0, 7); fl(c, '#ffcf3a', 1.2); } }
function lore(c, x, y) { weg(c, [[x - 11, y - 15], [x + 11, y - 15], [x + 8, y - 4], [x - 8, y - 4]]); fl(c, '#6b5236'); punkt(c, x - 6, y - 2, 3.5, '#333', 1.4); punkt(c, x + 6, y - 2, 3.5, '#333', 1.4); c.beginPath(); c.ellipse(x, y - 16, 9, 4, 0, Math.PI, 0); fl(c, '#ffcf3a', 1.4); }
function kiste(c, tx, ty, M) { const q = quader(c, tx - 0.3, ty - 0.35, 0.6, 0.45, 18, M.holz); c.strokeStyle = farbe(M.holz, -0.35); c.lineWidth = 1.6; c.beginPath(); c.moveTo(q.X + 3, q.top + 3); c.lineTo(q.X + q.W - 3, q.Y + q.D - 3); c.moveTo(q.X + q.W - 3, q.top + 3); c.lineTo(q.X + 3, q.Y + q.D - 3); c.stroke(); }
function fass(c, x, y, col) { turmRund(c, x, y, 10, 22, col); c.strokeStyle = '#4a3a2a'; c.lineWidth = 2; for (const k of [6, 16]) { c.beginPath(); c.ellipse(x, y - k, 10, 3.5, 0, 0, Math.PI); c.stroke(); } }
function holzStapel(c, x, y) { for (let r = 0; r < 3; r++) for (let i = 0; i < 3 - r; i++) { const px = x - 9 + i * 9 + r * 4.5, py = y - 5 - r * 8; punkt(c, px, py, 4.5, '#b07a43', 1.4); c.fillStyle = '#e8c08a'; c.beginPath(); c.arc(px, py, 2, 0, 7); c.fill(); } }
function hammerSchild(c, x, y) { rr(c, x - 10, y - 10, 20, 18, 3); fl(c, '#f3e3b5'); c.strokeStyle = '#6d4a2a'; c.lineWidth = 3; c.beginPath(); c.moveTo(x - 5, y + 4); c.lineTo(x + 4, y - 4); c.stroke(); rr(c, x + 1, y - 8, 8, 5, 1); fl(c, '#8a96a3', 1.2); }
function schwerterSchild(c, x, y, col) { weg(c, [[x - 11, y - 10], [x + 11, y - 10], [x + 11, y + 2], [x, y + 11], [x - 11, y + 2]]); fl(c, col); c.strokeStyle = '#fff'; c.lineWidth = 2.2; c.beginPath(); c.moveTo(x - 6, y + 4); c.lineTo(x + 6, y - 6); c.moveTo(x + 6, y + 4); c.lineTo(x - 6, y - 6); c.stroke(); }
function tor(c, x, y, w, h) { c.beginPath(); c.moveTo(x - w / 2, y); c.lineTo(x - w / 2, y - h + w / 2); c.arc(x, y - h + w / 2, w / 2, Math.PI, 0); c.lineTo(x + w / 2, y); c.closePath(); fl(c, '#4a2c18'); c.strokeStyle = '#2a1a10'; c.lineWidth = 1.4; for (let i = 1; i < 4; i++) { c.beginPath(); c.moveTo(x - w / 2 + i * w / 4, y - h + 6); c.lineTo(x - w / 2 + i * w / 4, y); c.stroke(); } }
function stalltuer(c, x, y, w, h) { rr(c, x - w / 2, y - h, w, h, 2); fl(c, '#7a4a26'); c.strokeStyle = '#f1e2c4'; c.lineWidth = 2.5; c.beginPath(); c.moveTo(x - w / 2 + 3, y - h + 3); c.lineTo(x + w / 2 - 3, y - 3); c.moveTo(x + w / 2 - 3, y - h + 3); c.lineTo(x - w / 2 + 3, y - 3); c.stroke(); }
function garagenTor(c, x, y, w, h) { rr(c, x - w / 2, y - h, w, h, 2); fl(c, '#626d78'); c.strokeStyle = '#4b545d'; c.lineWidth = 1.5; for (let i = 1; i < 5; i++) { c.beginPath(); c.moveTo(x - w / 2 + 2, y - h + i * h / 5); c.lineTo(x + w / 2 - 2, y - h + i * h / 5); c.stroke(); } }
function zelt(c, x, y, h, col) { weg(c, [[x - 24, y], [x, y - h], [x + 24, y]]); fl(c, vertikal(c, y - h, y, farbe(col, 0.15), farbe(col, -0.12))); weg(c, [[x - 6, y], [x, y - h * 0.55], [x + 6, y]]); fl(c, '#3a2416', 1.4); c.strokeStyle = RAND; c.lineWidth = 2; c.beginPath(); c.moveTo(x, y - h); c.lineTo(x, y - h - 8); c.stroke(); }
function lagerfeuer(c, x, y) { for (let i = 0; i < 7; i++) punkt(c, x + Math.cos(i) * 9, y + Math.sin(i) * 3.5, 2.4, '#8d8a80', 1.1); c.beginPath(); c.moveTo(x - 6, y); c.quadraticCurveTo(x - 4, y - 14, x, y - 22); c.quadraticCurveTo(x + 4, y - 14, x + 6, y); c.closePath(); fl(c, '#ff8a2a', 1.4); c.beginPath(); c.moveTo(x - 3, y); c.quadraticCurveTo(x, y - 12, x + 3, y); c.fillStyle = '#ffe14a'; c.fill(); }
function puppe(c, x, y, M) { c.strokeStyle = RAND; c.lineWidth = 4.5; c.beginPath(); c.moveTo(x, y); c.lineTo(x, y - 24); c.moveTo(x - 9, y - 18); c.lineTo(x + 9, y - 18); c.stroke(); c.strokeStyle = M.holz; c.lineWidth = 2.5; c.stroke(); punkt(c, x, y - 28, 5, '#e6cc9c'); }
function zielscheibe(c, x, y) { c.strokeStyle = RAND; c.lineWidth = 3; c.beginPath(); c.moveTo(x - 6, y); c.lineTo(x, y - 16); c.lineTo(x + 6, y); c.stroke(); for (const [r, col] of [[12, '#fff'], [9, '#e8322a'], [6, '#fff'], [3, '#e8322a']]) { c.beginPath(); c.arc(x, y - 24, r, 0, 7); c.fillStyle = col; c.fill(); } c.beginPath(); c.arc(x, y - 24, 12, 0, 7); fl(c, null, 1.8); }
function heuballen(c, x, y) { turmRund(c, x, y, 12, 14, '#e8c55e'); }
function zaun(c, x, y, len) { for (let i = 0; i <= len / 10; i++) { rr(c, x + i * 10 - 2, y - 14, 4, 14, 1); fl(c, '#9a6234', 1.2); } c.strokeStyle = RAND; c.lineWidth = 3.5; c.beginPath(); c.moveTo(x, y - 9); c.lineTo(x + len, y - 9); c.stroke(); c.strokeStyle = '#9a6234'; c.lineWidth = 2; c.stroke(); }
function zahnrad(c, x, y, r, col) { c.beginPath(); for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2, q = i % 2 ? r : r * 1.3; c.lineTo(x + Math.cos(a) * q, y + Math.sin(a) * q); } c.closePath(); fl(c, col, 1.6); punkt(c, x, y, r * 0.35, '#5c6670', 1.2); }
function kran(c, x, y, M) { c.strokeStyle = RAND; c.lineWidth = 5; c.beginPath(); c.moveTo(x, y); c.lineTo(x, y - 66); c.lineTo(x - 30, y - 60); c.stroke(); c.strokeStyle = M.holz; c.lineWidth = 3; c.stroke(); c.strokeStyle = RAND; c.lineWidth = 1.2; c.beginPath(); c.moveTo(x - 28, y - 60); c.lineTo(x - 28, y - 36); c.stroke(); rr(c, x - 34, y - 36, 12, 10, 1); fl(c, '#b07a43', 1.4); }
function kraeuter(c, x, y) { for (let i = 0; i < 5; i++) { c.beginPath(); c.ellipse(x - 8 + i * 4, y - 6, 3, 7, (i - 2) * 0.3, 0, 7); fl(c, i % 2 ? '#3ccf7a' : '#2a9d55', 1.1); } }
function amboss(c, x, y) { weg(c, [[x - 12, y - 14], [x + 14, y - 14], [x + 8, y - 8], [x + 5, y], [x - 5, y], [x - 6, y - 8]]); fl(c, '#4b5059'); }
function wache(c, x, y, za) { punkt(c, x, y - 12, 6, '#ffd9b3', 1.4); rr(c, x - 6, y - 7, 12, 8, 3); fl(c, '#8a6a4a', 1.4); c.strokeStyle = za >= 3 ? '#333' : '#6d4a2a'; c.lineWidth = 2; c.beginPath(); if (za < 3) c.arc(x + 8, y - 6, 7, -1.2, 1.2); else { c.moveTo(x + 2, y - 4); c.lineTo(x + 18, y - 10); } c.stroke(); }
function geschuetz(c, x, y, za) { c.save(); c.translate(x, y); c.beginPath(); c.ellipse(0, 0, 13, 7, 0, 0, 7); fl(c, '#5c6670'); c.rotate(-0.35); rr(c, 0, -4, 26 + za, 7, 2); fl(c, '#3b444d', 1.6); c.restore(); }
function kristall(c, x, y, col) { c.save(); c.shadowColor = col; c.shadowBlur = 14; weg(c, [[x, y - 16], [x + 9, y], [x, y + 14], [x - 9, y]]); c.fillStyle = col; c.fill(); c.restore(); weg(c, [[x, y - 16], [x + 9, y], [x, y + 14], [x - 9, y]]); fl(c, null, 1.6); weg(c, [[x, y - 16], [x - 9, y], [x, y - 2]]); c.fillStyle = 'rgba(255,255,255,.6)'; c.fill(); }
export function baum(c, x, y, v = 0) {
  rr(c, x - 4, y - 20, 8, 20, 2); fl(c, '#8a5a30', 1.8);
  if (v % 3 === 2) { for (let i = 0; i < 3; i++) { weg(c, [[x - 20 + i * 4, y - 14 - i * 14], [x, y - 44 - i * 14], [x + 20 - i * 4, y - 14 - i * 14]]); fl(c, i % 2 ? '#3f9a4c' : '#348540', 2); } return; }
  const col = ['#5cbf55', '#72c95a', '#4fae58'][v % 3];
  const kreise = [[-11, -30, 13], [11, -30, 13], [0, -44, 15], [0, -26, 14]];
  c.beginPath(); for (const [dx, dy, r] of kreise) { c.moveTo(x + dx + r, y + dy); c.arc(x + dx, y + dy, r, 0, 7); } c.strokeStyle = RAND; c.lineWidth = 4; c.stroke();
  c.fillStyle = col; c.fill();
  c.fillStyle = farbe(col, 0.3); c.beginPath(); c.arc(x - 6, y - 50, 6, 0, 7); c.arc(x - 15, y - 34, 4, 0, 7); c.fill();
}

// ------------------------------------------------------------ Boden
export function bodenBild(N) {
  const R0 = 6;
  const w = (N + R0 * 2) * TW, h = (N + R0 * 2) * TH;
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  const c = cv.getContext('2d');
  const ox = R0 * TW, oy = R0 * TH;
  c.fillStyle = '#74c254'; c.fillRect(0, 0, w, h);
  c.translate(ox, oy);
  const z = (x, y, s) => { const q = Math.sin(x * 127.1 + y * 311.7 + s * 74.7) * 43758.5453; return q - Math.floor(q); };
  for (let i = 0; i < 1500; i++) { const x = (z(i, 1, 1) * (N + 12) - 6) * TW, y = (z(i, 2, 1) * (N + 12) - 6) * TH; c.fillStyle = z(i, 3, 1) < 0.5 ? 'rgba(140,210,100,.22)' : 'rgba(95,175,70,.16)'; c.beginPath(); c.ellipse(x, y, 20 + z(i, 4, 1) * 40, 10 + z(i, 5, 1) * 18, 0, 0, 7); c.fill(); }
  for (let i = 0; i < 2800; i++) {
    const x = (z(i, 6, 2) * (N + 12) - 6) * TW, y = (z(i, 7, 2) * (N + 12) - 6) * TH;
    const r = z(i, 8, 2);
    if (r < 0.84) { c.strokeStyle = r < 0.4 ? '#4f9d3d' : '#5aa846'; c.lineWidth = 1.6; c.beginPath(); c.moveTo(x - 3, y); c.lineTo(x - 4, y - 6); c.moveTo(x, y); c.lineTo(x + 1, y - 8); c.moveTo(x + 3, y); c.lineTo(x + 5, y - 5); c.stroke(); }
    else { c.fillStyle = ['#fff7a8', '#ffffff', '#ffb3c7', '#b9d9ff'][Math.floor(r * 40) % 4]; c.beginPath(); c.arc(x, y, 2.3, 0, 7); c.fill(); c.fillStyle = '#ffd23f'; c.beginPath(); c.arc(x, y, 0.9, 0, 7); c.fill(); }
  }
  // Erdweg rund um das Lager
  c.strokeStyle = '#c9a36a'; c.lineWidth = 18; c.beginPath(); c.roundRect(-0.3 * TW, -0.3 * TH, (N + 0.6) * TW, (N + 0.6) * TH, 30); c.stroke();
  c.strokeStyle = 'rgba(120,85,45,.45)'; c.lineWidth = 2.5; c.beginPath(); c.roundRect(-0.3 * TW - 9, -0.3 * TH - 9, (N + 0.6) * TW + 18, (N + 0.6) * TH + 18, 36); c.stroke(); c.beginPath(); c.roundRect(-0.3 * TW + 9, -0.3 * TH + 9, (N + 0.6) * TW - 18, (N + 0.6) * TH - 18, 24); c.stroke();
  for (let i = 0; i < 160; i++) { const t = z(i, 12, 4); const seite = Math.floor(z(i, 13, 4) * 4); let x, y; if (seite === 0) { x = t * N; y = -0.3; } else if (seite === 1) { x = t * N; y = N + 0.3; } else if (seite === 2) { x = -0.3; y = t * N; } else { x = N + 0.3; y = t * N; } c.fillStyle = 'rgba(140,105,60,.6)'; c.beginPath(); c.arc(x * TW + (z(i, 14, 4) - 0.5) * 10, y * TH + (z(i, 15, 4) - 0.5) * 8, 1.5 + z(i, 16, 4) * 2, 0, 7); c.fill(); }
  // Wald außen
  const baeume = [];
  for (let i = 0; i < 300; i++) {
    const x = z(i, 9, 3) * (N + 12) - 6, y = z(i, 10, 3) * (N + 12) - 6;
    if (x > -1.3 && y > -1.0 && x < N + 1.3 && y < N + 1.6) continue;
    baeume.push([x, y, Math.floor(z(i, 11, 3) * 9)]);
  }
  baeume.sort((a, b) => a[1] - b[1]);
  for (const [x, y, v] of baeume) baum(c, x * TW, y * TH, v);
  return { bild: cv, ox, oy };
}

// ------------------------------------------------------------ Einheiten
const HAUT = ['#ffd9b3', '#f0c193', '#d39a6a', '#9a6a46'];
// Kleidung je Zeitalter: [Hose, Stiefel, Gürtel]
const KLEID = [['#8a6040', '#5a3a22', '#6b4a2a'], ['#d9c9a0', '#7a5030', '#8a6a3a'], ['#6d6a64', '#3a3028', '#5a4030'], ['#ece4d0', '#2a2018', '#6b4a2a'], ['#f0ebe0', '#1a1a1a', '#222'], ['#6b7550', '#3a3020', '#4a4030'], ['#5d6a50', '#2a2a24', '#3a3a30'], ['#3b4250', '#1a1d22', '#2a2d35'], ['#dfe4f5', '#7a86b8', '#4a5ed8'], ['#f3e3f3', '#b38bb0', '#b844aa'], ['#3b3f5c', '#22253f', '#ffd36a']];

/** Zeichnet eine Einheit, Füße bei (x, y). team: 'blau' (deine) oder 'rot' (Gegner). Stufe = zweite Farbe. */
export function zeichneEinheit(c, x, y, typ, stufe, team = 'blau', phase = 0, dir = 1, opt = {}) {
  const d = EINHEITEN[typ]; if (!d) return;
  const T = TEAM[team];
  const sk = opt.skala || 1;
  const t = opt.zeit ?? (typeof performance !== 'undefined' ? performance.now() / 1000 : 0);
  c.save(); c.translate(x, y); c.scale(sk, sk);
  const S = stufenStil(c, stufe, -12, 12, t);
  c.fillStyle = 'rgba(25,35,15,.25)'; c.beginPath(); c.ellipse(0, 0, d.platz >= 2 ? 18 : 11, d.platz >= 2 ? 6 : 4.5, 0, 0, 7); c.fill();
  if (stufe === 7) { c.save(); c.globalAlpha = 0.3 + Math.sin(t * 4) * 0.12; glow(c, 0, -22, 8, '#ffd23f'); c.restore(); }
  c.scale(dir, 1);
  const L = d.linie, za = d.zeitalter;
  if (L === 'luft') flugzeug(c, za, T, S, phase);
  else if (L === 'kav' && za >= 5) fahrzeug(c, za, T, S, phase);
  else if (L === 'belagerung') belagerer(c, za, T, S, phase);
  else if (L === 'kav') reiter(c, za, T, S, phase);
  else if (L === 'fern' && (za === 3 || za === 4)) { geschuetzWagen(c, za, T, S); figur(c, -13, 0, za, T, S, phase, 'leer', 0.85); }
  else if (L === 'fern' && za === 8) { figur(c, 0, 0, za, T, S, phase, 'fernbedienung'); for (let i = 0; i < 3; i++) drohne(c, -11 + i * 11, -52 - Math.sin(phase * 6 + i) * 3, S || T.a); }
  else figur(c, 0, 0, za, T, S, phase, waffeVon(L, za));
  c.restore();
  if (opt.verwundet) { const vx = x + 12 * sk, vy = y - 46 * sk; punkt(c, vx, vy, 6.5, '#fff', 1.8); c.fillStyle = '#e8322a'; c.fillRect(vx - 1.6, vy - 4, 3.2, 8); c.fillRect(vx - 4, vy - 1.6, 8, 3.2); }
}
export function einheitHoehe(typ) { const d = EINHEITEN[typ]; if (d.linie === 'luft') return 66; if (d.linie === 'kav') return d.zeitalter >= 5 ? 34 : 56; if (d.linie === 'belagerung') return 42; return 48; }

function waffeVon(L, za) {
  if (L === 'nahkampf') return ['keule', 'kurzschwert', 'langschwert', 'muskete', 'gewehr', 'gewehr', 'gewehr', 'karabiner', 'energieklinge', 'plasmaklinge', 'sternsaebel'][za];
  if (L === 'fern') return ['schleuder', 'bogen', 'armbrust', '', '', 'mg', 'rohr', 'laser', '', 'plasmakanone', 'ionengewehr'][za];
  if (L === 'speer') return ['speer', 'speerschild', 'pike', 'pike', 'granate', 'bazooka', 'rohr', 'rohr', 'antenne', 'energieschild', 'lanze'][za];
  return 'keule';
}

function figur(c, x, y, za, T, S, phase, waffe, sk = 1) {
  c.save(); c.translate(x, y); c.scale(sk, sk);
  const schritt = Math.sin(phase * Math.PI * 2);
  const bob = Math.abs(schritt) * 1.2;
  const [hose, stiefel, guertel] = KLEID[za];
  const haut = HAUT[za % 4];
  for (const [s, dx] of [[schritt, -4], [-schritt, 3.5]]) {
    c.save(); c.translate(dx, -13); c.rotate(s * 0.45);
    rr(c, -3, 0, 6, 10, 2.5); fl(c, hose, 1.8);
    rr(c, -3.6, 8.5, 8, 4.5, 2.2); fl(c, stiefel, 1.8);
    c.restore();
  }
  c.translate(0, -bob);
  arm(c, -7, -27, schritt * 0.5 + 0.15, T.b, haut);
  // Körper in Teamfarbe
  rr(c, -9, -33, 18, 21, 7); fl(c, vertikal(c, -33, -12, farbe(T.a, 0.18), T.b), 2.2);
  if (za === 1 || za === 2) { rr(c, -9, -33, 18, 12, 6); fl(c, za === 1 ? '#e0ac44' : '#b3bcc6', 1.6); }
  if (za >= 8) { rr(c, -6, -30, 12, 6, 3); c.fillStyle = 'rgba(255,255,255,.55)'; c.fill(); }
  c.fillStyle = guertel; c.fillRect(-9, -17, 18, 3.4);
  // Stufenfarbe: Schärpe quer über den Körper
  if (S) { c.save(); rr(c, -9, -33, 18, 21, 7); c.clip(); weg(c, [[-11, -31], [-4, -34], [11, -15], [4, -12]]); c.fillStyle = S; c.fill(); c.strokeStyle = RAND; c.lineWidth = 1.4; c.stroke(); c.restore(); rr(c, -9, -33, 18, 21, 7); fl(c, null, 2.2); }
  // Kopf
  const ky = -42;
  c.beginPath(); c.arc(0, ky, 9.5, 0, 7); fl(c, haut, 2.2);
  c.fillStyle = RAND; c.beginPath(); c.ellipse(3.5, ky - 0.5, 1.4, 2.1, 0, 0, 7); c.ellipse(7.4, ky - 0.5, 1.2, 1.9, 0, 0, 7); c.fill();
  c.fillStyle = '#fff'; c.beginPath(); c.arc(3.9, ky - 1.2, 0.5, 0, 7); c.fill();
  c.fillStyle = 'rgba(255,110,110,.35)'; c.beginPath(); c.arc(5.5, ky + 4, 2.2, 0, 7); c.fill();
  helm(c, za, ky, T, S);
  arm(c, 7, -27, -schritt * 0.4 - 0.25, T.a, haut, (cc) => waffeZeichnen(cc, waffe, za));
  if (waffe === 'kurzschwert' || waffe === 'speerschild') schild(c, -10, -23, waffe === 'speerschild' ? 10 : 8, za === 1 ? '#c9a227' : T.a, S);
  c.restore();
}
function arm(c, x, y, w, col, haut, inHand) {
  c.save(); c.translate(x, y); c.rotate(w);
  rr(c, -3, 0, 6, 11, 3); fl(c, col, 1.8);
  punkt(c, 0, 12, 3.2, haut, 1.6);
  if (inHand) { c.translate(0, 12); inHand(c); }
  c.restore();
}
function helm(c, za, y, T, S) {
  const busch = S || null;
  const kappe = (col, r = 10) => { c.beginPath(); c.arc(0, y - 1, r, Math.PI * 1.05, -0.05); c.closePath(); fl(c, col, 2); };
  switch (za) {
    case 0: c.beginPath(); c.arc(0, y - 3, 9.5, Math.PI, 0); c.fillStyle = '#5a3a22'; c.fill(); rr(c, -9.5, y - 7, 19, 4.5, 2); fl(c, busch || '#c9a26a', 1.6); if (busch) { weg(c, [[-9, y - 5], [-15, y + 2], [-10, y + 1]]); fl(c, busch, 1.3); } break;
    case 1: kappe('#e0ac44'); c.beginPath(); c.moveTo(-2, y - 10); c.quadraticCurveTo(-13, y - 24, -18, y - 6); c.lineTo(-11, y - 6); c.quadraticCurveTo(-9, y - 15, 2, y - 10); c.closePath(); fl(c, busch || '#d63a2f', 1.6); break;
    case 2: kappe('#b3bcc6'); rr(c, -10.5, y - 3, 21, 3.4, 1); fl(c, '#7b8490', 1.4); c.strokeStyle = '#7b8490'; c.lineWidth = 2.4; c.beginPath(); c.moveTo(0, y - 11); c.lineTo(0, y + 4); c.stroke(); if (busch) punkt(c, 0, y - 12.5, 3, busch, 1.4); break;
    case 3: c.beginPath(); c.moveTo(-13, y - 2); c.lineTo(0, y - 14); c.lineTo(13, y - 2); c.quadraticCurveTo(0, y - 6, -13, y - 2); fl(c, '#2a2a2e', 1.8); if (busch) punkt(c, 9, y - 7, 3, busch, 1.3); break;
    case 4: rr(c, -8, y - 20, 16, 14, 2); fl(c, '#1f2937', 1.8); c.fillStyle = '#d6ab2c'; c.fillRect(-8, y - 9, 16, 2.6); if (busch) { rr(c, -2, y - 27, 4, 8, 2); fl(c, busch, 1.3); } break;
    case 5: c.beginPath(); c.ellipse(0, y - 3, 13, 4.5, 0, 0, 7); fl(c, '#5b6b4a', 1.6); kappe('#5b6b4a'); if (busch) { c.fillStyle = busch; c.fillRect(-9, y - 6, 18, 2.4); } break;
    case 6: kappe('#6b7a5c', 10.5); if (busch) { c.fillStyle = busch; c.fillRect(-10, y - 5, 20, 2.4); } break;
    case 7: kappe('#3b4250', 10.5); rr(c, -1, y - 5, 11, 4.5, 2); fl(c, '#7fe7ff', 1.3); if (busch) { c.fillStyle = busch; c.fillRect(-10, y - 8, 7, 2.6); } break;
    case 8: kappe('#eef2ff', 11); rr(c, -1, y - 4, 12, 5.5, 2.5); fl(c, '#5f7cff', 1.3); if (busch) { c.fillStyle = busch; c.fillRect(-11, y - 6, 7, 3); } break;
    case 9: kappe('#fbe7fb', 11); rr(c, -1, y - 4, 12, 5.5, 2.5); fl(c, '#ff62e4', 1.3); if (busch) { c.fillStyle = busch; c.fillRect(-11, y - 6, 7, 3); } break;
    default: c.save(); c.globalAlpha = 0.45; c.fillStyle = '#c6f2ff'; c.beginPath(); c.arc(0, y, 12, 0, 7); c.fill(); c.restore(); c.beginPath(); c.arc(0, y, 12, 0, 7); fl(c, null, 2.2); if (busch) { rr(c, -5, y + 9, 10, 3.5, 1.5); fl(c, busch, 1.2); } break;
  }
}
function strich(c, x1, y1, x2, y2, col, lw = 2.6) { c.lineCap = 'round'; c.strokeStyle = RAND; c.lineWidth = lw + 2.4; c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke(); c.strokeStyle = col; c.lineWidth = lw; c.stroke(); }
function waffeZeichnen(c, w) {
  const licht = { energieklinge: '#86a6ff', plasmaklinge: '#ff86f2', sternsaebel: '#ffe486', laser: '#ff4d4d', ionengewehr: '#ffe486', plasmakanone: '#ff86f2' }[w];
  switch (w) {
    case 'keule': strich(c, 0, 2, 0, -15, '#9a6234', 3.6); punkt(c, 0, -17, 5, '#9a6234', 2); break;
    case 'kurzschwert': strich(c, 0, 3, 0, -16, '#e5ebf2', 3); strich(c, -4.5, 0, 4.5, 0, '#8a6a3a', 2.2); break;
    case 'langschwert': strich(c, 0, 4, 0, -24, '#eef2f6', 3.2); strich(c, -5.5, 0, 5.5, 0, '#c9a227', 2.4); break;
    case 'muskete': case 'gewehr': case 'karabiner': c.save(); c.rotate(1.2); strich(c, -7, 0, 19, 0, w === 'karabiner' ? '#2a2f38' : '#7a4a26', 3.2); if (w === 'muskete') strich(c, 19, 0, 25, 0, '#e5ebf2', 1.6); c.restore(); break;
    case 'energieklinge': case 'plasmaklinge': case 'sternsaebel': c.save(); c.shadowColor = licht; c.shadowBlur = 10; strich(c, 0, 2, 0, -26, licht, 3.2); c.restore(); strich(c, -3, 1, 3, 1, '#555', 2.2); break;
    case 'schleuder': c.strokeStyle = RAND; c.lineWidth = 2.2; c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(11, -11, 4, -20); c.stroke(); punkt(c, 4, -21, 2.6, '#8d8a80', 1.3); break;
    case 'bogen': c.strokeStyle = RAND; c.lineWidth = 5; c.beginPath(); c.arc(-2, -4, 13, -1.3, 1.3); c.stroke(); c.strokeStyle = '#9a6234'; c.lineWidth = 2.8; c.stroke(); c.strokeStyle = '#f2f2f2'; c.lineWidth = 1.1; c.beginPath(); c.moveTo(1.4, -16.5); c.lineTo(1.4, 8.5); c.stroke(); break;
    case 'armbrust': c.save(); c.rotate(1.25); strich(c, -4, 0, 15, 0, '#7a4a26', 3.2); strich(c, 11, -7, 11, 7, '#444', 2.4); c.restore(); break;
    case 'mg': c.save(); c.rotate(1.25); strich(c, -6, 0, 21, 0, '#2a2f38', 4.4); strich(c, 4, 2, 2, 9, '#2a2f38', 1.8); c.restore(); break;
    case 'rohr': case 'bazooka': c.save(); c.rotate(1.35); strich(c, -15, -4, 17, -4, w === 'bazooka' ? '#5b6b4a' : '#3b4250', 6.4); c.restore(); break;
    case 'laser': case 'ionengewehr': case 'plasmakanone': c.save(); c.rotate(1.25); strich(c, -6, 0, 19, 0, '#e6ebf5', w === 'plasmakanone' ? 5.4 : 3.6); c.shadowColor = licht; c.shadowBlur = 8; punkt(c, 19, 0, 2.6, licht, 1); c.restore(); break;
    case 'speer': case 'speerschild': strich(c, 0, 10, 0, -28, '#9a6234', 2.6); weg(c, [[0, -37], [-4, -27], [4, -27]]); fl(c, '#d6ab2c', 1.6); break;
    case 'pike': strich(c, 0, 14, 0, -40, '#9a6234', 2.4); weg(c, [[0, -49], [-4, -39], [4, -39]]); fl(c, '#e5ebf2', 1.6); break;
    case 'granate': punkt(c, 0, -2, 4.4, '#4a5530', 1.8); break;
    case 'antenne': strich(c, 0, 0, 0, -24, '#3b4250', 2.2); glow(c, 0, -26, 2, '#86a6ff'); break;
    case 'energieschild': c.save(); c.globalAlpha = 0.6; c.beginPath(); c.ellipse(6, -8, 6.5, 15, 0, 0, 7); c.fillStyle = '#ff86f2'; c.fill(); c.restore(); c.beginPath(); c.ellipse(6, -8, 6.5, 15, 0, 0, 7); fl(c, null, 1.8); break;
    case 'lanze': c.save(); c.shadowColor = '#ffe486'; c.shadowBlur = 8; strich(c, 0, 12, 0, -40, '#ffd36a', 2.8); c.restore(); break;
    case 'fernbedienung': rr(c, -4.5, -3, 10, 6.5, 1.5); fl(c, '#3b4250', 1.3); break;
    default: break;
  }
}
function schild(c, x, y, r, col, S) { c.beginPath(); c.arc(x, y, r, 0, 7); fl(c, col, 2); c.beginPath(); c.arc(x, y, r - 3.2, 0, 7); c.strokeStyle = S || farbe(col, -0.25); c.lineWidth = 3; c.stroke(); punkt(c, x, y, 2, '#e5ebf2', 1.1); }
function drohne(c, x, y, col) { rr(c, x - 4.5, y - 2, 9, 4.5, 1.5); fl(c, '#3b4250', 1.3); c.strokeStyle = RAND; c.lineWidth = 1.4; c.beginPath(); c.moveTo(x - 9, y - 3); c.lineTo(x + 9, y - 3); c.stroke(); c.fillStyle = col; c.fillRect(x - 2, y - 1, 4, 2.2); }

function pferd(c, phase, col) {
  const s = Math.sin(phase * Math.PI * 2);
  for (const [lx, o] of [[-12, s], [-6, -s], [7, -s], [13, s]]) { c.save(); c.translate(lx, -15); c.rotate(o * 0.35); rr(c, -2.4, 0, 4.8, 15, 2); fl(c, farbe(col, -0.15), 1.7); c.restore(); }
  c.beginPath(); c.ellipse(0, -21, 17, 8.5, 0, 0, 7); fl(c, vertikal(c, -29, -12, farbe(col, 0.18), farbe(col, -0.1)), 2.2);
  weg(c, [[10, -24], [17, -39], [26, -36], [20, -22]]); fl(c, col, 2.2);
  c.beginPath(); c.moveTo(12, -28); c.lineTo(16, -41); c.lineTo(14, -29); c.fillStyle = '#3a2416'; c.fill();
  punkt(c, 21, -34, 1.3, RAND, 0.5);
  c.strokeStyle = RAND; c.lineWidth = 5; c.beginPath(); c.moveTo(-16, -23); c.quadraticCurveTo(-23, -17, -21, -8); c.stroke(); c.strokeStyle = '#3a2416'; c.lineWidth = 3.2; c.stroke();
}
function reiter(c, za, T, S, phase) {
  if (za === 0) {
    pferd(c, phase, '#b07a43');
    rr(c, -32, -26, 20, 13, 3); fl(c, '#9a6234'); punkt(c, -22, -9, 7.5, '#7a4a26', 2); punkt(c, -22, -9, 2, '#3a2416', 1);
    figur(c, -22, -13, 0, T, S, 0, 'speer', 0.78); return;
  }
  pferd(c, phase, ['#b07a43', '#7a4a26', '#f0eee8', '#3a2a1c', '#9a6234'][za]);
  rr(c, -11, -28, 20, 7, 2.5); fl(c, S || T.a, 1.8);
  figur(c, -1, -20, za, T, S, phase * 0.2, za === 1 ? 'speer' : za === 2 ? 'pike' : za === 3 ? 'langschwert' : 'karabiner', 0.82);
}
function fahrzeug(c, za, T, S, phase) {
  const col = za >= 9 ? '#eef0ff' : za >= 8 ? '#dfe4ff' : ['#62724f', '#68745a', '#76866a', '#9aa08a'][Math.min(3, za - 5)];
  if (za === 8) {
    const s = Math.sin(phase * Math.PI * 2) * 4;
    for (const [x, o] of [[-8, s], [8, -s]]) { c.strokeStyle = RAND; c.lineWidth = 6; c.beginPath(); c.moveTo(x, -20); c.lineTo(x + o, -9); c.lineTo(x, 0); c.stroke(); c.strokeStyle = '#9aa3c8'; c.lineWidth = 3.6; c.stroke(); }
    rr(c, -15, -40, 30, 21, 7); fl(c, vertikal(c, -40, -19, '#fff', col), 2.2);
    rr(c, 2, -35, 10, 6, 2.5); fl(c, '#5f7cff', 1.3);
    c.fillStyle = S || T.a; c.fillRect(-13, -25, 26, 3.5);
    return;
  }
  const schwebe = za >= 9 ? -8 - Math.sin(phase * Math.PI * 2) * 1.5 : 0;
  c.save(); c.translate(0, schwebe);
  if (za < 9) { rr(c, -22, -11, 44, 11, 5.5); fl(c, '#2a2f38', 2.2); for (let i = 0; i < 5; i++) punkt(c, -16 + i * 8, -5.5, 3, '#6b7580', 1.3); }
  else { c.save(); c.shadowColor = za === 9 ? '#ff86f2' : '#ffe486'; c.shadowBlur = 12; c.fillStyle = c.shadowColor; c.fillRect(-17, -3, 34, 3); c.restore(); }
  weg(c, [[-23, -11], [-19, -22], [19, -22], [24, -11]]); fl(c, vertikal(c, -22, -11, farbe(col, 0.18), farbe(col, -0.1)), 2.2);
  rr(c, -10, -32, 19, 11, 4.5); fl(c, farbe(col, -0.06), 2.2);
  strich(c, 7, -27, 28 + (za - 5) * 1.6, -27, '#2a2f38', 3.8);
  c.fillStyle = T.a; c.fillRect(-20, -19, 9, 5.5);
  if (S) { c.save(); weg(c, [[-23, -11], [-19, -22], [19, -22], [24, -11]]); c.clip(); c.fillStyle = S; c.fillRect(-24, -15.5, 50, 3.6); c.restore(); }
  c.restore();
}
function belagerer(c, za, T, S, phase) {
  const holz = '#9a6234';
  const rad = (x, r = 6) => { punkt(c, x, -r, r, '#6b4a2a', 2); c.strokeStyle = '#3a2416'; c.lineWidth = 1.3; c.beginPath(); c.moveTo(x - r, -r); c.lineTo(x + r, -r); c.moveTo(x, -2 * r); c.lineTo(x, 0); c.stroke(); };
  const band = (x, y, w) => { if (S) { rr(c, x, y, w, 3.6, 1); fl(c, S, 1.1); } };
  if (za === 0) { rr(c, -18, -18, 36, 8, 2); fl(c, holz); weg(c, [[-19, -18], [0, -35], [19, -18]]); fl(c, '#c08a4f'); rr(c, 16, -17, 9, 6, 2); fl(c, '#5c6670', 1.5); rad(-12); rad(12); c.fillStyle = T.a; c.fillRect(-5, -29, 10, 5); band(-15, -16, 30); return; }
  if (za === 1 || za === 2) {
    rr(c, -17, -15, 34, 7, 2); fl(c, holz);
    const a = -0.9 + Math.sin(phase * Math.PI * 2) * 0.1;
    c.save(); c.translate(-5, -15); c.rotate(a); rr(c, 0, -3, za === 2 ? 40 : 32, 6, 2); fl(c, holz, 1.8); punkt(c, za === 2 ? 40 : 32, 0, 5.5, '#8a8070'); c.restore();
    if (za === 2) { c.strokeStyle = RAND; c.lineWidth = 6; c.beginPath(); c.moveTo(-13, -15); c.lineTo(-5, -38); c.lineTo(3, -15); c.stroke(); c.strokeStyle = holz; c.lineWidth = 3.6; c.stroke(); }
    rad(-11); rad(11); c.fillStyle = T.a; c.fillRect(-17, -15, 8, 7); band(-8, -13, 20); return;
  }
  if (za <= 5) {
    rad(-7, 8); weg(c, [[-19, -8], [6, -13], [6, -5]]); fl(c, za === 3 ? '#7a4a26' : '#4c5560');
    c.save(); c.translate(0, -15); c.rotate(-0.25 - (za - 3) * 0.12); rr(c, -4, -5.5, 30 + za * 2, 11, 5); fl(c, za === 3 ? '#8a6a3a' : '#4b5059', 2.2); c.restore();
    c.fillStyle = T.a; c.fillRect(-15, -13, 8, 5.5); band(-15, -6.5, 13); return;
  }
  const col = za >= 8 ? '#e6ebff' : '#6b7a5c';
  rr(c, -19, -9, 38, 9, 3.5); fl(c, '#2a2f38', 2.2);
  rr(c, -18, -21, 36, 13, 3.5); fl(c, vertikal(c, -21, -8, farbe(col, 0.18), col), 2.2);
  c.save(); c.translate(-2, -22); c.rotate(-0.5);
  if (za === 9) { rr(c, 0, -4, 40, 8, 2); fl(c, '#3b3f5c'); c.shadowColor = '#ff86f2'; c.shadowBlur = 8; c.fillStyle = '#ff86f2'; c.fillRect(2, -1, 36, 2.4); }
  else if (za === 10) { punkt(c, 10, -5, 9, '#ffd36a'); glow(c, 10, -5, 3.4, '#ffe486'); }
  else { rr(c, 0, -7.5, 26, 15, 2.5); fl(c, farbe(col, -0.2)); for (let i = 0; i < 3; i++) punkt(c, 24, -4.5 + i * 4.5, 1.6, '#e8322a', 0.8); }
  c.restore(); c.fillStyle = T.a; c.fillRect(-16, -19, 8, 5.5); band(-6, -12.5, 22);
}
function geschuetzWagen(c, za, T, S) {
  punkt(c, 3, -7.5, 7.5, '#6b4a2a', 2);
  c.save(); c.translate(5, -14); c.rotate(-0.2); rr(c, -2, -5, 28, 10, 4.5); fl(c, za === 3 ? '#3e3e3e' : '#4b5059', 2.2); if (za === 4) for (let i = 0; i < 3; i++) { c.strokeStyle = '#222'; c.lineWidth = 1.6; c.beginPath(); c.moveTo(22, -3.5 + i * 3.5); c.lineTo(31, -3.5 + i * 3.5); c.stroke(); } c.restore();
  if (S) { rr(c, -3, -19, 9, 4.5, 1.5); fl(c, S, 1.2); } else { c.fillStyle = T.a; c.fillRect(-3, -19, 9, 4.5); }
}
function flugzeug(c, za, T, S, phase) {
  const h = 44 + Math.sin(phase * Math.PI * 2) * 2;
  c.fillStyle = 'rgba(25,35,15,.2)'; c.beginPath(); c.ellipse(0, 0, 18, 5.5, 0, 0, 7); c.fill();
  c.save(); c.translate(0, -h);
  const col = za === 5 ? '#d1b67e' : za === 6 ? '#a2acb6' : za === 7 ? '#3b3f47' : za === 8 ? '#e6ebff' : za === 9 ? '#fbe7fb' : '#3b3f5c';
  if (za === 9) { for (let i = 0; i < 11; i++) punkt(c, Math.cos(i * 2.1 + phase * 6) * 13, Math.sin(i * 1.7 + phase * 5) * 8, 2.4, typeof S === 'string' ? S : '#ff86f2', 1.1); c.restore(); return; }
  if (za === 7) { weg(c, [[24, 0], [-17, -17], [-10, 0], [-17, 17]]); fl(c, col, 2.2); }
  else {
    weg(c, [[2, -1], [-6, -19], [-12, -18], [-7, 0]]); fl(c, farbe(col, -0.1), 2);
    c.beginPath(); c.ellipse(0, 0, 22, 6, 0, 0, 7); fl(c, vertikal(c, -6, 6, farbe(col, 0.28), col), 2.2);
    weg(c, [[2, 1], [-6, 17], [-12, 16], [-7, 0]]); fl(c, col, 2);
    if (za === 5) { c.strokeStyle = '#333'; c.lineWidth = 2.8; c.beginPath(); c.moveTo(23, -8 * Math.cos(phase * 40)); c.lineTo(23, 8 * Math.cos(phase * 40)); c.stroke(); }
    if (za >= 8) { c.save(); c.shadowColor = za === 10 ? '#ffe486' : '#86a6ff'; c.shadowBlur = 10; punkt(c, -22, 0, 3.2, c.shadowColor, 1); c.restore(); }
  }
  c.fillStyle = T.a; c.beginPath(); c.arc(-2, 0, 3.4, 0, 7); c.fill();
  if (S) { rr(c, -9, -13, 5, 26, 1.5); fl(c, S, 1.1); }
  c.restore();
}

export function sternForm(c, x, y, r, col) { c.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, q = i % 2 ? r * 0.45 : r; c.lineTo(x + Math.cos(a) * q, y + Math.sin(a) * q); } c.closePath(); fl(c, col, 1); }

// ------------------------------------------------------------ Bilder für die Oberfläche
const portraitCache = new Map();
export function einheitPortrait(typ, stufe, team = 'blau', groesse = 64) {
  const key = typ + '|' + stufe + '|' + team + '|' + groesse;
  if (portraitCache.has(key)) return portraitCache.get(key);
  const cv = document.createElement('canvas'); cv.width = groesse * 2; cv.height = groesse * 2;
  const c = cv.getContext('2d'); c.scale(2, 2);
  const h = einheitHoehe(typ);
  const sk = Math.min(2.4, (groesse * 0.84) / (h + 6));
  zeichneEinheit(c, groesse / 2 + 2, groesse * 0.92, typ, stufe, team, 0.25, 1, { skala: sk, zeit: 0 });
  const url = cv.toDataURL();
  portraitCache.set(key, url);
  return url;
}
function rahmenVon(cv) {
  const c = cv.getContext('2d'); const { width: w, height: h } = cv;
  const d = c.getImageData(0, 0, w, h).data;
  let x0 = w, y0 = h, x1 = 0, y1 = 0;
  for (let y = 0; y < h; y += 2) for (let x = 0; x < w; x += 2) if (d[(y * w + x) * 4 + 3] > 40) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  return x1 > x0 ? { x0, y0, x1, y1 } : { x0: 0, y0: 0, x1: w, y1: h };
}
export function gebaeudePortrait(typ, stufe, za) {
  const key = 'g|' + typ + '|' + stufe + '|' + za;
  if (portraitCache.has(key)) return portraitCache.get(key);
  const sp = gebaeudeSprite(typ, Math.max(1, stufe), za);
  if (!sp.rahmen) sp.rahmen = rahmenVon(sp.bild);
  const r = sp.rahmen, N = 128;
  const cv = document.createElement('canvas'); cv.width = N; cv.height = N;
  const c = cv.getContext('2d');
  const bw = r.x1 - r.x0 + 8, bh = r.y1 - r.y0 + 8;
  const sk = Math.min(N / bw, N / bh) * 0.94;
  c.drawImage(sp.bild, r.x0 - 4, r.y0 - 4, bw, bh, (N - bw * sk) / 2, (N - bh * sk) / 2, bw * sk, bh * sk);
  const url = cv.toDataURL();
  portraitCache.set(key, url);
  return url;
}
