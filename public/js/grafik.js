// Zeichnen im Comic-Stil: isometrische Gebäude, Einheiten, Effekte. Alles prozedural, nichts geladen.
import { GEBAEUDE, EINHEITEN, STUFEN } from '../shared/daten.js';

export const TW = 64, TH = 32;
export const RAND = '#2a1d12';
export const TEAM = { blau: { a: '#3b82f6', b: '#1d4ed8', c: '#bfdbfe' }, rot: { a: '#e0453a', b: '#9f1d17', c: '#ffd0c9' } };

// ------------------------------------------------------------ Farbe
export function farbe(hex, f) { // f > 0 heller, f < 0 dunkler
  const n = parseInt(hex.slice(1), 16);
  let r = n >> 16, g = (n >> 8) & 255, b = n & 255;
  if (f > 0) { r += (255 - r) * f; g += (255 - g) * f; b += (255 - b) * f; } else { r *= 1 + f; g *= 1 + f; b *= 1 + f; }
  return '#' + ((1 << 24) | (Math.round(r) << 16) | (Math.round(g) << 8) | Math.round(b)).toString(16).slice(1);
}
export function iso(tx, ty) { return [(tx - ty) * TW / 2, (tx + ty) * TH / 2]; }

// ------------------------------------------------------------ Grundformen
function poly(c, pts, fill, stroke = RAND, lw = 1.4) {
  c.beginPath(); c.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]);
  c.closePath();
  if (fill) { c.fillStyle = fill; c.fill(); }
  if (stroke) { c.strokeStyle = stroke; c.lineWidth = lw; c.lineJoin = 'round'; c.stroke(); }
}
// Quader auf Feldern (x0,y0) Größe (sx,sy), von Höhe z bis z+h
export function quader(c, x0, y0, sx, sy, h, col, z = 0, opt = {}) {
  const P = (x, y, zz) => { const [a, b] = iso(x, y); return [a, b - zz]; };
  const A = P(x0, y0, z + h), B = P(x0 + sx, y0, z + h), C = P(x0 + sx, y0 + sy, z + h), D = P(x0, y0 + sy, z + h);
  const B0 = P(x0 + sx, y0, z), C0 = P(x0 + sx, y0 + sy, z), D0 = P(x0, y0 + sy, z);
  poly(c, [D, C, C0, D0], opt.links || farbe(col, -0.28));   // vorne links (+y)
  poly(c, [C, B, B0, C0], opt.rechts || farbe(col, -0.1));   // vorne rechts (+x)
  if (!opt.ohneDeckel) poly(c, [A, B, C, D], opt.oben || farbe(col, 0.12));
  return { A, B, C, D };
}
// Pyramidendach
export function pyramide(c, x0, y0, sx, sy, z, h, col) {
  const P = (x, y, zz) => { const [a, b] = iso(x, y); return [a, b - zz]; };
  const S = P(x0 + sx / 2, y0 + sy / 2, z + h);
  const B = P(x0 + sx, y0, z), C = P(x0 + sx, y0 + sy, z), D = P(x0, y0 + sy, z);
  poly(c, [D, C, S], farbe(col, -0.22));
  poly(c, [C, B, S], farbe(col, 0.05));
}
// Satteldach, First entlang x (achse='x') oder y
export function sattel(c, x0, y0, sx, sy, z, h, col, achse = 'x', ueber = 0.12) {
  const P = (x, y, zz) => { const [a, b] = iso(x, y); return [a, b - zz]; };
  x0 -= ueber; y0 -= ueber; sx += ueber * 2; sy += ueber * 2;
  if (achse === 'x') {
    const m = y0 + sy / 2;
    const F1 = P(x0, m, z + h), F2 = P(x0 + sx, m, z + h);
    poly(c, [P(x0, y0 + sy, z), P(x0 + sx, y0 + sy, z), F2, F1], farbe(col, -0.2));
    poly(c, [P(x0 + sx, y0, z), P(x0 + sx, y0 + sy, z), F2], farbe(col, -0.05));
    poly(c, [P(x0, y0, z), P(x0 + sx, y0, z), F2, F1], farbe(col, 0.12));
  } else {
    const m = x0 + sx / 2;
    const F1 = P(m, y0, z + h), F2 = P(m, y0 + sy, z + h);
    poly(c, [P(x0 + sx, y0, z), P(x0 + sx, y0 + sy, z), F2, F1], farbe(col, 0.02));
    poly(c, [P(x0, y0 + sy, z), P(x0 + sx, y0 + sy, z), F2], farbe(col, -0.25));
    poly(c, [P(x0, y0, z), P(x0, y0 + sy, z), F2, F1], farbe(col, -0.12));
  }
}
// Zylinder (Turm) um Feldmitte (cx,cy) mit Radius r (in Feldern)
export function zylinder(c, cx, cy, r, z, h, col) {
  const [x, y] = iso(cx, cy);
  const rx = r * TW / Math.SQRT2 * 0.72, ry = rx / 2;
  const g = c.createLinearGradient(x - rx, 0, x + rx, 0);
  g.addColorStop(0, farbe(col, -0.32)); g.addColorStop(0.55, farbe(col, 0.05)); g.addColorStop(1, farbe(col, -0.15));
  c.beginPath(); c.ellipse(x, y - z, rx, ry, 0, 0, Math.PI); c.lineTo(x - rx, y - z - h); c.ellipse(x, y - z - h, rx, ry, 0, Math.PI, 0, true); c.closePath();
  c.fillStyle = g; c.fill(); c.strokeStyle = RAND; c.lineWidth = 1.4; c.stroke();
  c.beginPath(); c.ellipse(x, y - z - h, rx, ry, 0, 0, Math.PI * 2); c.fillStyle = farbe(col, 0.18); c.fill(); c.stroke();
  return { x, y: y - z - h, rx, ry };
}
export function kegel(c, cx, cy, r, z, h, col) {
  const [x, y] = iso(cx, cy);
  const rx = r * TW / Math.SQRT2 * 0.72, ry = rx / 2;
  const g = c.createLinearGradient(x - rx, 0, x + rx, 0);
  g.addColorStop(0, farbe(col, -0.3)); g.addColorStop(0.6, farbe(col, 0.1)); g.addColorStop(1, farbe(col, -0.1));
  c.beginPath(); c.ellipse(x, y - z, rx, ry, 0, 0, Math.PI); c.lineTo(x, y - z - h); c.closePath();
  c.fillStyle = g; c.fill(); c.strokeStyle = RAND; c.lineWidth = 1.4; c.stroke();
}
export function kuppel(c, cx, cy, r, z, col) {
  const [x, y] = iso(cx, cy);
  const rx = r * TW / Math.SQRT2 * 0.72, ry = rx / 2;
  const g = c.createRadialGradient(x - rx * 0.35, y - z - rx * 0.6, 1, x, y - z, rx * 1.2);
  g.addColorStop(0, farbe(col, 0.5)); g.addColorStop(0.5, col); g.addColorStop(1, farbe(col, -0.35));
  c.beginPath(); c.ellipse(x, y - z, rx, ry, 0, 0, Math.PI); c.ellipse(x, y - z, rx, rx * 0.95, 0, Math.PI, 0); c.closePath();
  c.fillStyle = g; c.fill(); c.strokeStyle = RAND; c.lineWidth = 1.4; c.stroke();
}
function fahne(c, x, y, h, col, wehen = 0) {
  c.strokeStyle = RAND; c.lineWidth = 2; c.beginPath(); c.moveTo(x, y); c.lineTo(x, y - h); c.stroke();
  c.beginPath(); c.moveTo(x, y - h); c.quadraticCurveTo(x + 9, y - h - 3 + wehen, x + 17, y - h + 2); c.lineTo(x + 16, y - h + 11); c.quadraticCurveTo(x + 8, y - h + 8 + wehen, x, y - h + 10); c.closePath();
  c.fillStyle = col; c.fill(); c.lineWidth = 1.2; c.stroke();
  c.fillStyle = '#ffd23f'; c.beginPath(); c.arc(x + 3, y - h, 2, 0, 7); c.fill();
}
function fenster(c, x, y, w, h, col = '#ffe8a3') {
  c.fillStyle = '#3a2a1c'; c.fillRect(x - w / 2 - 1, y - h - 1, w + 2, h + 2);
  c.fillStyle = col; c.fillRect(x - w / 2, y - h, w, h);
}
function punkt(c, x, y, r, col) { c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fillStyle = col; c.fill(); c.strokeStyle = RAND; c.lineWidth = 1.1; c.stroke(); }

// Material je Zeitalter
export const MATERIAL = [
  { wand: '#d2a86e', dach: '#b9653a', holz: '#8a5a2b', akzent: '#c43d2f', stein: '#c9bfa6' },
  { wand: '#e6dcc2', dach: '#c2533b', holz: '#8a5a2b', akzent: '#c43d2f', stein: '#d9cfb3' },
  { wand: '#b7b2a6', dach: '#5b7193', holz: '#6d4a2a', akzent: '#2f5fbf', stein: '#a9a397' },
  { wand: '#ecd3a9', dach: '#a33e2c', holz: '#6d4a2a', akzent: '#7d3fa8', stein: '#d6c7a8' },
  { wand: '#b05a42', dach: '#4b4d57', holz: '#4a3324', akzent: '#c9a227', stein: '#8d6e5c' },
  { wand: '#c4c9ce', dach: '#59636e', holz: '#4c5560', akzent: '#3b6fb5', stein: '#9aa1a8' },
  { wand: '#d5dbdf', dach: '#7c8a6a', holz: '#5c6650', akzent: '#9ccc3d', stein: '#b2b9bd' },
  { wand: '#e9f0f4', dach: '#3f8fb5', holz: '#55707f', akzent: '#3fb6d6', stein: '#c5d3db', glas: true },
  { wand: '#f1f4ff', dach: '#4659d4', holz: '#7a86b8', akzent: '#5f7cff', stein: '#d7dcf5', glas: true, neon: '#7ea0ff' },
  { wand: '#fbf0fb', dach: '#b13fa4', holz: '#b38bb0', akzent: '#ff5fe1', stein: '#ecd7ec', glas: true, neon: '#ff7ef0' },
  { wand: '#2f3450', dach: '#1d2036', holz: '#4a4f70', akzent: '#ffd166', stein: '#4b5275', glas: true, neon: '#ffe27a' },
];
export function bildZeitalter(typ, stufe, zentrumZa) {
  if (typ === 'zentrum') return Math.max(0, stufe - 1);
  return Math.max(0, Math.min(zentrumZa ?? 10, Math.floor((Math.max(1, stufe) - 1) / 2)));
}

// ------------------------------------------------------------ Gebäude
const cache = new Map();
const AUFL = 2; // Auflösung der Sprites
/** Gibt { bild, ox, oy } zurück: bild an (bildschirmX - ox, bildschirmY - oy) zeichnen, wobei bildschirm = obere Ecke des Grundrisses */
export function gebaeudeSprite(typ, stufe, za, variante = 0) {
  const key = typ + '|' + stufe + '|' + za + '|' + variante;
  let e = cache.get(key);
  if (e) return e;
  const gr = GEBAEUDE[typ].gr;
  const w = gr * TW + 40, hoch = 190 + gr * 8, h = gr * TH + hoch + 10;
  const cv = document.createElement('canvas');
  cv.width = w * AUFL; cv.height = h * AUFL;
  const c = cv.getContext('2d');
  c.scale(AUFL, AUFL);
  c.translate(w / 2, hoch);
  // Schatten am Boden
  c.save(); c.globalAlpha = 0.18; poly(c, [iso(0, 0), iso(gr + 0.25, 0), iso(gr + 0.25, gr + 0.25), iso(0, gr + 0.25)], '#000', null); c.restore();
  ZEICHNER[typ] ? ZEICHNER[typ](c, gr, stufe, za, MATERIAL[za], variante) : standard(c, gr, stufe, za, MATERIAL[za]);
  e = { bild: cv, ox: w / 2, oy: hoch, w, h };
  cache.set(key, e);
  return e;
}

function standard(c, gr, s, za, M) {
  quader(c, 0.3, 0.3, gr - 0.6, gr - 0.6, 26, M.wand);
  pyramide(c, 0.2, 0.2, gr - 0.4, gr - 0.4, 26, 22, M.dach);
}
function sockel(c, gr, M, h = 5) { quader(c, 0.08, 0.08, gr - 0.16, gr - 0.16, h, M.stein); }

const ZEICHNER = {
  zentrum(c, gr, s, za, M) {
    sockel(c, gr, M, 7);
    const hoehe = 34 + za * 3;
    if (za <= 2) {
      // Palisade/Burg mit Bergfried
      quader(c, 0.4, 0.4, 3.2, 3.2, hoehe * 0.6, M.wand, 7);
      for (const [x, y] of [[0.4, 0.4], [3.0, 0.4], [0.4, 3.0], [3.0, 3.0]]) { quader(c, x, y, 0.6, 0.6, hoehe * 0.85, M.stein, 7); if (za >= 1) zinnen(c, x, y, 0.6, 0.6, 7 + hoehe * 0.85, M.stein); }
      quader(c, 1.2, 1.2, 1.6, 1.6, hoehe * 1.3, za === 0 ? M.holz : M.stein, 7);
      if (za === 0) pyramide(c, 1.05, 1.05, 1.9, 1.9, 7 + hoehe * 1.3, 24, M.dach); else zinnen(c, 1.2, 1.2, 1.6, 1.6, 7 + hoehe * 1.3, M.stein);
      tor(c, 2, 3.6, 7, M);
      const [fx, fy] = iso(2, 2); fahne(c, fx, fy - 7 - hoehe * 1.3 - (za === 0 ? 20 : 4), 22, M.akzent);
    } else if (za <= 4) {
      // Palast / Rathaus
      quader(c, 0.3, 0.6, 3.4, 2.8, hoehe * 0.8, M.wand, 7);
      sattel(c, 0.3, 0.6, 3.4, 2.8, 7 + hoehe * 0.8, 20, M.dach, 'x');
      quader(c, 1.4, 1.4, 1.2, 1.2, hoehe * 1.5, M.wand, 7);
      kuppel(c, 2, 2, 0.75, 7 + hoehe * 1.5, za === 4 ? '#7aa3a0' : '#c9a227');
      for (let i = 0; i < 4; i++) { const [x, y] = iso(0.7 + i * 0.85, 3.4); fenster(c, x, y - 12, 5, 9); }
      tor(c, 2, 3.4, 7, M);
      const [fx, fy] = iso(2, 2); fahne(c, fx, fy - 7 - hoehe * 1.5 - 30, 18, M.akzent);
    } else if (za <= 7) {
      // Hochhaus-Komplex
      quader(c, 0.3, 0.3, 3.4, 3.4, 18, M.stein, 7);
      quader(c, 0.8, 0.8, 2.4, 2.4, hoehe * (1.6 + (za - 5) * 0.3), M.wand, 25);
      glasStreifen(c, 0.8, 0.8, 2.4, 2.4, 25, hoehe * (1.6 + (za - 5) * 0.3), za >= 7 ? '#8fd8f5' : '#a8c4dc');
      const top = 25 + hoehe * (1.6 + (za - 5) * 0.3);
      quader(c, 1.5, 1.5, 1, 1, 14, M.akzent, top);
      const [ax, ay] = iso(2, 2); c.strokeStyle = RAND; c.lineWidth = 2; c.beginPath(); c.moveTo(ax, ay - top - 14); c.lineTo(ax, ay - top - 40); c.stroke(); punkt(c, ax, ay - top - 40, 3, '#ff4d4d');
    } else {
      // Zukunft: schwebende Spitze
      quader(c, 0.3, 0.3, 3.4, 3.4, 14, M.stein, 7);
      zylinder(c, 2, 2, 1.25, 21, hoehe * 1.2, M.wand);
      neonRing(c, 2, 2, 1.3, 21 + hoehe * 0.6, M.neon);
      kegel(c, 2, 2, 1.0, 21 + hoehe * 1.2, 46 + za * 4, M.akzent);
      const [x, y] = iso(2, 2); glow(c, x, y - 21 - hoehe * 1.2 - 60 - za * 4, 9, M.neon);
    }
  },
  goldmine(c, gr, s, za, M) {
    // Hügel mit Stolleneingang, Goldhaufen, Lore
    huegel(c, gr, za >= 5 ? '#8d8a80' : '#a3895f');
    const [ex, ey] = iso(1.5, 2.6);
    c.fillStyle = '#20150c'; c.beginPath(); c.ellipse(ex, ey - 12, 11, 13, 0, Math.PI, 0); c.lineTo(ex + 11, ey); c.lineTo(ex - 11, ey); c.closePath(); c.fill();
    c.strokeStyle = M.holz; c.lineWidth = 4; c.beginPath(); c.moveTo(ex - 12, ey); c.lineTo(ex - 12, ey - 15); c.lineTo(ex + 12, ey - 15); c.lineTo(ex + 12, ey); c.stroke();
    goldHaufen(c, 2.3, 1.2, 6 + Math.min(10, s));
    if (za >= 4) { quader(c, 0.2, 0.3, 0.8, 0.8, 34, M.wand, 0); const [x, y] = iso(0.6, 0.7); rauch(c, x, y - 40); }
    const [lx, ly] = iso(2.4, 2.4); lore(c, lx, ly);
  },
  schatzkammer(c, gr, s, za, M) {
    sockel(c, gr, M);
    quader(c, 0.4, 0.4, 2.2, 2.2, 26 + za * 1.5, M.stein, 5);
    if (za >= 8) { kuppel(c, 1.5, 1.5, 1.1, 31 + za * 1.5, M.neon); }
    else kuppel(c, 1.5, 1.5, 1.05, 31 + za * 1.5, '#e8b42f');
    const [x, y] = iso(1.5, 2.6); c.fillStyle = '#5a3a1a'; c.fillRect(x - 6, y - 22, 12, 17); c.strokeStyle = RAND; c.strokeRect(x - 6, y - 22, 12, 17);
    goldHaufen(c, 2.6, 0.5, 4); goldHaufen(c, 0.5, 2.7, 4);
  },
  rohstofflager(c, gr, s, za, M) {
    sockel(c, gr, M);
    quader(c, 0.3, 0.3, 2.4, 1.5, 24, M.wand, 5); sattel(c, 0.3, 0.3, 2.4, 1.5, 29, 14, M.dach, 'x');
    for (const [x, y] of [[0.5, 2.2], [1.2, 2.3], [2.2, 2.0]]) kiste(c, x, y, M);
    fass(c, 2.5, 2.6, '#8a5a2b');
  },
  handwerkerhuette(c, gr, s, za, M) {
    sockel(c, gr, M, 4);
    quader(c, 0.25, 0.25, 1.5, 1.3, 20, M.wand, 4); sattel(c, 0.25, 0.25, 1.5, 1.3, 24, 14, M.dach, 'y');
    const [x, y] = iso(1, 1.55); c.fillStyle = M.holz; c.fillRect(x - 4, y - 16, 8, 12);
    holzStapel(c, 1.65, 1.55);
    const [hx, hy] = iso(1.75, 0.6); hammerSchild(c, hx + 6, hy - 22);
  },
  akademie(c, gr, s, za, M) {
    sockel(c, gr, M);
    quader(c, 0.3, 0.5, 2.4, 2.0, 30, M.wand, 5);
    for (let i = 0; i < 4; i++) { const [x, y] = iso(0.5 + i * 0.6, 2.5); saeule(c, x, y - 5, 28, '#f3ede0'); }
    sattel(c, 0.3, 0.5, 2.4, 2.0, 35, 10, M.dach, 'x');
    kuppel(c, 1.5, 1.2, 0.6, 45, za >= 6 ? '#dfe6ee' : '#8cb6d6');
    const [x, y] = iso(1.5, 1.2); c.strokeStyle = RAND; c.lineWidth = 3; c.beginPath(); c.moveTo(x + 2, y - 55); c.lineTo(x + 16, y - 70); c.stroke();
  },
  unterkunft(c, gr, s, za, M) {
    if (za <= 1) {
      sockel(c, gr, { stein: '#b9a77f' }, 2);
      zelt(c, 0.9, 0.9, M.akzent); zelt(c, 2.1, 1.1, '#e8dcc0'); zelt(c, 1.3, 2.2, '#e8dcc0');
      lagerfeuer(c, 2.3, 2.3);
    } else {
      sockel(c, gr, M);
      quader(c, 0.3, 0.4, 2.4, 2.1, 22 + Math.min(za, 6) * 3, M.wand, 5);
      sattel(c, 0.3, 0.4, 2.4, 2.1, 27 + Math.min(za, 6) * 3, 14, M.dach, 'x');
      for (let i = 0; i < 3; i++) { const [x, y] = iso(0.6 + i * 0.8, 2.5); fenster(c, x, y - 12, 5, 7, M.glas ? '#bfe8ff' : '#ffe8a3'); }
    }
  },
  kaserne(c, gr, s, za, M) {
    sockel(c, gr, M);
    quader(c, 0.3, 0.3, 2.4, 1.8, 26 + za, M.wand, 5);
    if (za <= 4) sattel(c, 0.3, 0.3, 2.4, 1.8, 31 + za, 16, M.dach, 'x'); else quader(c, 0.25, 0.25, 2.5, 1.9, 4, M.dach, 31 + za);
    tor(c, 1.5, 2.1, 5, M);
    const [sx, sy] = iso(2.75, 1.2); schwerterSchild(c, sx + 4, sy - 28, M.akzent);
    const [fx, fy] = iso(0.4, 2.6); fahne(c, fx, fy, 38, M.akzent);
    puppe(c, 2.4, 2.6, M);
  },
  schiessstand(c, gr, s, za, M) {
    sockel(c, gr, { stein: '#b9a77f' }, 2);
    quader(c, 0.25, 0.25, 1.3, 2.4, 22, M.wand, 2); pyramide(c, 0.15, 0.15, 1.5, 2.6, 24, 14, M.dach);
    zielscheibe(c, 2.5, 0.8); zielscheibe(c, 2.5, 1.9);
    if (za <= 2) heuballen(c, 1.9, 2.6);
  },
  stall(c, gr, s, za, M) {
    if (za >= 5) { garage(c, gr, M); return; }
    sockel(c, gr, M, 3);
    quader(c, 0.3, 0.3, 2.4, 1.6, 22, M.holz, 3); sattel(c, 0.3, 0.3, 2.4, 1.6, 25, 15, M.dach, 'x');
    const [x, y] = iso(1.5, 1.9); c.fillStyle = '#3a2a1c'; c.fillRect(x - 8, y - 17, 16, 14);
    c.strokeStyle = '#e8dcc0'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(x - 8, y - 17); c.lineTo(x + 8, y - 3); c.moveTo(x + 8, y - 17); c.lineTo(x - 8, y - 3); c.stroke();
    heuballen(c, 2.5, 2.5); zaun(c, 0.2, 2.75, 2.6);
  },
  werkstatt(c, gr, s, za, M) {
    sockel(c, gr, M);
    quader(c, 0.3, 0.3, 2.0, 2.0, 24, M.wand, 5);
    sattel(c, 0.3, 0.3, 2.0, 2.0, 29, 12, M.dach, 'y');
    zahnrad(c, iso(1.3, 2.3)[0], iso(1.3, 2.3)[1] - 18, 8, '#aab4bf');
    kran(c, 2.5, 0.6, M);
    if (za >= 4) { const [x, y] = iso(0.6, 0.6); rauch(c, x, y - 48); quader(c, 0.4, 0.4, 0.4, 0.4, 44, M.stein, 0); }
  },
  flugfeld(c, gr, s, za, M) {
    quader(c, 0, 0, gr, gr, 3, '#6b7178');
    for (let i = 0; i < 4; i++) { const [a, b] = iso(0.4 + i, 2); c.fillStyle = '#fff'; c.fillRect(a - 6, b - 4, 12, 2); }
    quader(c, 0.2, 0.2, 1.6, 1.4, 22, M.wand, 3); sattel(c, 0.2, 0.2, 1.6, 1.4, 25, 12, M.dach, 'x');
    zylinder(c, 3.4, 0.6, 0.25, 3, 40, M.stein); quader(c, 3.15, 0.35, 0.5, 0.5, 10, '#7fc8e8', 43);
  },
  heilhaus(c, gr, s, za, M) {
    sockel(c, gr, M);
    quader(c, 0.3, 0.4, 2.4, 2.0, 26, '#f4f1ea', 5);
    sattel(c, 0.3, 0.4, 2.4, 2.0, 31, 14, '#5fa86a', 'x');
    const [x, y] = iso(1.5, 2.4);
    c.fillStyle = '#fff'; c.beginPath(); c.arc(x, y - 20, 8, 0, 7); c.fill(); c.strokeStyle = RAND; c.lineWidth = 1.2; c.stroke();
    c.fillStyle = '#2fbf5f'; c.fillRect(x - 2, y - 26, 4, 12); c.fillRect(x - 6, y - 22, 12, 4);
    kraeuter(c, 2.6, 2.7); kraeuter(c, 0.4, 2.7);
  },
  ruestkammer(c, gr, s, za, M) {
    sockel(c, gr, M);
    quader(c, 0.3, 0.3, 2.4, 2.0, 24, M.stein, 5); sattel(c, 0.3, 0.3, 2.4, 2.0, 29, 12, M.dach, 'x');
    const [ax, ay] = iso(1.6, 2.6); amboss(c, ax, ay);
    const [x, y] = iso(0.5, 0.5); quader(c, 0.3, 0.3, 0.5, 0.5, 46, M.stein, 0); rauch(c, x, y - 52); glow(c, ax - 18, ay - 8, 6, '#ff9a3c');
  },
  mauer(c, gr, s, za, M, v) {
    // v: Bitmaske Nachbarn (1=+x, 2=+y, 4=-x, 8=-y)
    const h = 14 + Math.min(za, 8) * 2.4;
    const col = za === 0 ? M.holz : M.stein;
    if (za === 0) {
      palisade(c, 0.5, 0.5, h + 4, col);
      if (v & 1) for (const t of [0.75, 1.0]) palisade(c, t, 0.5, h + 4, col);
      if (v & 2) for (const t of [0.75, 1.0]) palisade(c, 0.5, t, h + 4, col);
      return;
    }
    quader(c, 0.3, 0.3, 0.4, 0.4, h + 3, col);
    if (v & 1) quader(c, 0.5, 0.33, 0.5, 0.34, h, col);
    if (v & 2) quader(c, 0.33, 0.5, 0.34, 0.5, h, col);
    if (za >= 7) { const [x, y] = iso(0.5, 0.5); glow(c, x, y - h - 4, 3, M.neon || M.akzent); }
  },
  wachturm(c, gr, s, za, M) {
    const h = 44 + za * 4;
    if (za === 0) {
      for (const [x, y] of [[0.4, 0.4], [1.6, 0.4], [0.4, 1.6], [1.6, 1.6]]) quader(c, x - 0.08, y - 0.08, 0.16, 0.16, h, M.holz);
      quader(c, 0.3, 0.3, 1.4, 1.4, 8, M.holz, h);
      pyramide(c, 0.2, 0.2, 1.6, 1.6, h + 18, 16, M.dach);
      bogner(c, 1, 1, h + 8);
    } else if (za <= 4) {
      zylinder(c, 1, 1, 0.75, 0, h, M.stein);
      zylinderZinnen(c, 1, 1, 0.82, h, M.stein);
      bogner(c, 1, 1, h + 4, za >= 3 ? 'muskete' : 'bogen');
      if (za >= 2) kegel(c, 1, 1, 0.7, h + 22, 20, M.dach);
    } else if (za <= 7) {
      quader(c, 0.45, 0.45, 1.1, 1.1, h, M.stein);
      quader(c, 0.25, 0.25, 1.5, 1.5, 10, M.wand, h);
      geschuetz(c, 1, 1, h + 10, '#5c6670', za);
    } else {
      zylinder(c, 1, 1, 0.55, 0, h, M.wand); neonRing(c, 1, 1, 0.6, h * 0.5, M.neon);
      kuppel(c, 1, 1, 0.65, h, M.akzent); const [x, y] = iso(1, 1); glow(c, x, y - h - 18, 6, M.neon);
    }
  },
  moerser(c, gr, s, za, M) {
    sockel(c, gr, M, 6);
    quader(c, 0.4, 0.4, 2.2, 2.2, 22 + za * 2, M.stein, 6); zinnen(c, 0.4, 0.4, 2.2, 2.2, 28 + za * 2, M.stein);
    const [x, y] = iso(1.5, 1.5);
    if (za <= 2) { // Wurfarm
      c.strokeStyle = M.holz; c.lineWidth = 5; c.beginPath(); c.moveTo(x - 14, y - 34 - za * 2); c.lineTo(x + 18, y - 70 - za * 2); c.stroke();
      punkt(c, x + 20, y - 72 - za * 2, 6, '#7d7468');
    } else { c.save(); c.translate(x, y - 32 - za * 2); c.rotate(-0.7); c.fillStyle = '#3e4650'; c.fillRect(-6, -30, 12, 34); c.strokeStyle = RAND; c.strokeRect(-6, -30, 12, 34); c.restore(); }
  },
  falle(c, gr, s, za) {
    const [x, y] = iso(0.5, 0.5);
    c.globalAlpha = 0.55; c.fillStyle = '#5a4630'; c.beginPath(); c.ellipse(x, y, 16, 8, 0, 0, 7); c.fill();
    c.fillStyle = za >= 4 ? '#3b3b42' : '#c9c2b0';
    for (let i = -1; i <= 1; i++) { c.beginPath(); c.moveTo(x + i * 6 - 2, y + 1); c.lineTo(x + i * 6, y - 7); c.lineTo(x + i * 6 + 2, y + 1); c.fill(); }
    c.globalAlpha = 1;
  },
  bunker(c, gr, s, za, M) { kuppel(c, 1, 1, 0.9, 0, '#8d9399'); const [x, y] = iso(1, 1.6); c.fillStyle = '#1b1b1f'; c.fillRect(x - 10, y - 14, 20, 4); c.fillStyle = '#4b4f55'; c.fillRect(x - 2, y - 13, 12, 3); },
  flak(c, gr, s, za, M) { quader(c, 0.2, 0.2, 1.6, 1.6, 8, '#7c8580'); flakRohr(c, 1, 1, 8, za); },
  laserturm(c, gr, s, za, M) {
    quader(c, 0.4, 0.4, 1.2, 1.2, 14, M.stein); zylinder(c, 1, 1, 0.3, 14, 40, '#dfe6f5');
    const [x, y] = iso(1, 1); kristall(c, x, y - 66, M.neon || '#7ea0ff');
  },
  schildgen(c, gr, s, za, M) {
    quader(c, 0.3, 0.3, 1.4, 1.4, 16, M.wand); zylinder(c, 1, 1, 0.25, 16, 20, M.stein);
    const [x, y] = iso(1, 1); c.save(); c.globalAlpha = 0.35; c.fillStyle = M.neon; c.beginPath(); c.arc(x, y - 44, 18, 0, 7); c.fill(); c.restore(); punkt(c, x, y - 44, 6, M.neon);
  },
  ionenkanone(c, gr, s, za, M) {
    sockel(c, gr, M, 8); zylinder(c, 1.5, 1.5, 1.0, 8, 18, M.wand); neonRing(c, 1.5, 1.5, 1.05, 18, M.neon);
    const [x, y] = iso(1.5, 1.5); c.save(); c.translate(x, y - 34); c.rotate(-0.5);
    c.fillStyle = '#3b3f5c'; c.fillRect(-9, -52, 18, 54); c.strokeStyle = RAND; c.lineWidth = 1.4; c.strokeRect(-9, -52, 18, 54);
    c.fillStyle = M.neon; c.fillRect(-4, -54, 8, 6); c.restore();
  },
  fahne(c, gr, s, za, M, v) { const [x, y] = iso(0.5, 0.5); punkt(c, x, y, 3, M.stein); fahne(c, x, y, 44, ['#3b82f6', '#e0453a', '#ffd23f', '#3ccf7a'][v % 4]); },
  baum(c, gr, s, za, M, v) { baum(c, 0.5, 0.5, v); },
  statue(c, gr, s, za, M) {
    quader(c, 0.4, 0.4, 1.2, 1.2, 16, '#d9d2c3');
    const [x, y] = iso(1, 1); const g = '#c7a64a';
    c.fillStyle = g; c.strokeStyle = RAND; c.lineWidth = 1.3;
    c.beginPath(); c.moveTo(x - 8, y - 16); c.lineTo(x - 6, y - 40); c.lineTo(x + 6, y - 40); c.lineTo(x + 8, y - 16); c.closePath(); c.fill(); c.stroke();
    punkt(c, x, y - 46, 6, g); c.beginPath(); c.moveTo(x + 6, y - 38); c.lineTo(x + 16, y - 56); c.stroke();
  },
};

// ------------------------------------------------------------ Kleinteile
function zinnen(c, x0, y0, sx, sy, z, col) {
  const n = Math.max(2, Math.round(sx * 3));
  for (let i = 0; i < n; i += 2) {
    quader(c, x0 + (i / n) * sx, y0 + sy - 0.12, sx / n, 0.12, 5, col, z);
    quader(c, x0 + sx - 0.12, y0 + (i / n) * sy, 0.12, sy / n, 5, col, z);
  }
}
function zylinderZinnen(c, cx, cy, r, z, col) {
  for (let i = 0; i < 6; i++) { const a = Math.PI * (0.05 + i / 5.5); quader(c, cx + Math.cos(a) * r * 0.75 - 0.08, cy + Math.sin(a) * r * 0.75 - 0.08, 0.16, 0.16, 6, col, z); }
}
function tor(c, x, y, z, M) {
  const [a, b] = iso(x, y); c.fillStyle = '#3a2416'; c.beginPath(); c.moveTo(a - 9, b - z); c.lineTo(a - 9, b - z - 12); c.quadraticCurveTo(a, b - z - 22, a + 9, b - z - 12); c.lineTo(a + 9, b - z); c.closePath(); c.fill(); c.strokeStyle = RAND; c.lineWidth = 1.3; c.stroke();
}
function glasStreifen(c, x0, y0, sx, sy, z, h, col) {
  const reihen = Math.floor(h / 10);
  for (let r = 1; r < reihen; r++) {
    for (let i = 0; i < 4; i++) {
      const [a, b] = iso(x0 + (i + 0.5) * sx / 4, y0 + sy); c.fillStyle = r % 3 === 0 ? farbe(col, 0.4) : col; c.fillRect(a - 4, b - z - r * 10, 8, 6);
      const [d, e] = iso(x0 + sx, y0 + (i + 0.5) * sy / 4); c.fillStyle = farbe(col, -0.1); c.fillRect(d - 4, e - z - r * 10, 8, 6);
    }
  }
}
function neonRing(c, cx, cy, r, z, col) { const [x, y] = iso(cx, cy); const rx = r * TW / Math.SQRT2 * 0.74; c.save(); c.shadowColor = col; c.shadowBlur = 10; c.strokeStyle = col; c.lineWidth = 3; c.beginPath(); c.ellipse(x, y - z, rx, rx / 2, 0, 0, Math.PI); c.stroke(); c.restore(); }
export function glow(c, x, y, r, col) { const g = c.createRadialGradient(x, y, 0, x, y, r * 3); g.addColorStop(0, '#fff'); g.addColorStop(0.3, col); g.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = g; c.beginPath(); c.arc(x, y, r * 3, 0, 7); c.fill(); }
function huegel(c, gr, col) {
  const [x, y] = iso(gr / 2, gr / 2);
  const g = c.createRadialGradient(x - 20, y - 30, 4, x, y, 70); g.addColorStop(0, farbe(col, 0.3)); g.addColorStop(1, farbe(col, -0.2));
  c.beginPath(); c.moveTo(...iso(0.1, gr - 0.1)); c.quadraticCurveTo(x - 60, y - 40, x - 10, y - 46); c.quadraticCurveTo(x + 30, y - 52, x + 58, y - 20); c.lineTo(...iso(gr - 0.1, 0.1 + gr * 0.0)); c.lineTo(...iso(gr - 0.1, gr - 0.1)); c.closePath();
  c.fillStyle = g; c.fill(); c.strokeStyle = RAND; c.lineWidth = 1.4; c.stroke();
  for (let i = 0; i < 5; i++) punkt(c, x - 30 + i * 14, y - 18 - (i % 2) * 10, 2.5, farbe(col, -0.3));
}
function goldHaufen(c, tx, ty, n) {
  const [x, y] = iso(tx, ty);
  for (let i = 0; i < n; i++) {
    const a = i * 2.4, r = 2 + (i % 4) * 2;
    const px = x + Math.cos(a) * r * 1.4, py = y - 2 - (n - i) * 0.9 + Math.sin(a) * r * 0.5;
    c.fillStyle = '#ffcf3a'; c.beginPath(); c.ellipse(px, py, 4, 2.4, 0, 0, 7); c.fill(); c.strokeStyle = '#a86a0c'; c.lineWidth = 0.9; c.stroke();
  }
}
function lore(c, x, y) { c.fillStyle = '#5c4630'; c.beginPath(); c.moveTo(x - 9, y - 12); c.lineTo(x + 9, y - 12); c.lineTo(x + 7, y - 3); c.lineTo(x - 7, y - 3); c.closePath(); c.fill(); c.strokeStyle = RAND; c.stroke(); punkt(c, x - 5, y - 2, 2.5, '#333'); punkt(c, x + 5, y - 2, 2.5, '#333'); c.fillStyle = '#ffcf3a'; c.beginPath(); c.ellipse(x, y - 13, 7, 3, 0, 0, 7); c.fill(); }
function rauch(c, x, y) { c.fillStyle = 'rgba(220,220,220,0.75)'; for (let i = 0; i < 3; i++) { c.beginPath(); c.arc(x + i * 5, y - i * 9, 5 + i * 2, 0, 7); c.fill(); } }
function kiste(c, x, y, M) { quader(c, x - 0.25, y - 0.25, 0.5, 0.5, 13, M.holz); const [a, b] = iso(x, y); c.strokeStyle = RAND; c.lineWidth = 1; c.beginPath(); c.moveTo(a - 8, b - 4); c.lineTo(a, b - 12); c.stroke(); }
function fass(c, x, y, col) { zylinder(c, x, y, 0.22, 0, 14, col); }
function holzStapel(c, tx, ty) { const [x, y] = iso(tx, ty); for (let r = 0; r < 3; r++) for (let i = 0; i < 3 - r; i++) { const px = x - 7 + i * 6 + r * 3, py = y - 3 - r * 5; c.fillStyle = '#b07a43'; c.beginPath(); c.arc(px, py, 3, 0, 7); c.fill(); c.strokeStyle = RAND; c.lineWidth = 0.9; c.stroke(); c.fillStyle = '#e2b77b'; c.beginPath(); c.arc(px, py, 1.3, 0, 7); c.fill(); } }
function hammerSchild(c, x, y) { c.fillStyle = '#f3e3b5'; c.fillRect(x - 8, y - 8, 16, 14); c.strokeStyle = RAND; c.lineWidth = 1.2; c.strokeRect(x - 8, y - 8, 16, 14); c.strokeStyle = '#6d4a2a'; c.lineWidth = 2; c.beginPath(); c.moveTo(x - 4, y + 4); c.lineTo(x + 3, y - 3); c.stroke(); c.fillStyle = '#7d8894'; c.fillRect(x, y - 6, 6, 4); }
function schwerterSchild(c, x, y, col) { c.fillStyle = col; c.beginPath(); c.moveTo(x - 9, y - 9); c.lineTo(x + 9, y - 9); c.lineTo(x + 9, y + 2); c.lineTo(x, y + 9); c.lineTo(x - 9, y + 2); c.closePath(); c.fill(); c.strokeStyle = RAND; c.lineWidth = 1.3; c.stroke(); c.strokeStyle = '#fff'; c.lineWidth = 1.6; c.beginPath(); c.moveTo(x - 5, y + 4); c.lineTo(x + 5, y - 6); c.moveTo(x + 5, y + 4); c.lineTo(x - 5, y - 6); c.stroke(); }
function saeule(c, x, y, h, col) { c.fillStyle = col; c.fillRect(x - 2.5, y - h, 5, h); c.strokeStyle = RAND; c.lineWidth = 1; c.strokeRect(x - 2.5, y - h, 5, h); }
function zelt(c, tx, ty, col) { const [x, y] = iso(tx, ty); c.beginPath(); c.moveTo(x - 20, y); c.lineTo(x, y - 30); c.lineTo(x + 20, y); c.lineTo(x, y + 8); c.closePath(); c.fillStyle = col; c.fill(); c.strokeStyle = RAND; c.lineWidth = 1.3; c.stroke(); c.beginPath(); c.moveTo(x, y - 30); c.lineTo(x, y + 8); c.lineTo(x + 20, y); c.closePath(); c.fillStyle = farbe(col, -0.2); c.fill(); c.stroke(); c.fillStyle = '#3a2416'; c.beginPath(); c.moveTo(x - 6, y + 4); c.lineTo(x, y - 12); c.lineTo(x + 1, y + 7); c.fill(); }
function lagerfeuer(c, tx, ty) { const [x, y] = iso(tx, ty); for (let i = 0; i < 6; i++) punkt(c, x + Math.cos(i) * 7, y + Math.sin(i) * 3.5, 2, '#8d8a80'); c.fillStyle = '#ff8a2a'; c.beginPath(); c.moveTo(x - 5, y); c.quadraticCurveTo(x, y - 18, x + 5, y); c.fill(); c.fillStyle = '#ffd23f'; c.beginPath(); c.moveTo(x - 2.5, y); c.quadraticCurveTo(x, y - 10, x + 2.5, y); c.fill(); }
function puppe(c, tx, ty, M) { const [x, y] = iso(tx, ty); c.strokeStyle = M.holz; c.lineWidth = 2.5; c.beginPath(); c.moveTo(x, y); c.lineTo(x, y - 20); c.moveTo(x - 7, y - 15); c.lineTo(x + 7, y - 15); c.stroke(); punkt(c, x, y - 22, 4, '#e2c79a'); }
function zielscheibe(c, tx, ty) { const [x, y] = iso(tx, ty); c.strokeStyle = '#6d4a2a'; c.lineWidth = 2; c.beginPath(); c.moveTo(x - 4, y); c.lineTo(x, y - 14); c.lineTo(x + 4, y); c.stroke(); for (const [r, col] of [[9, '#fff'], [6.5, '#e0453a'], [4, '#fff'], [2, '#e0453a']]) { c.fillStyle = col; c.beginPath(); c.ellipse(x, y - 20, r * 0.7, r, 0, 0, 7); c.fill(); } c.strokeStyle = RAND; c.lineWidth = 1; c.beginPath(); c.ellipse(x, y - 20, 6.3, 9, 0, 0, 7); c.stroke(); }
function heuballen(c, tx, ty) { zylinder(c, tx, ty, 0.28, 0, 10, '#e6c35c'); }
function zaun(c, x0, y0, len) { for (let i = 0; i <= len * 3; i++) { const [x, y] = iso(x0 + i / 3, y0); c.fillStyle = '#8a5a2b'; c.fillRect(x - 1, y - 10, 2, 10); } const [a, b] = iso(x0, y0), [d, e] = iso(x0 + len, y0); c.strokeStyle = '#8a5a2b'; c.lineWidth = 2; c.beginPath(); c.moveTo(a, b - 7); c.lineTo(d, e - 7); c.stroke(); }
function garage(c, gr, M) { sockel(c, gr, M); quader(c, 0.3, 0.3, 2.4, 2.2, 26, M.wand, 5); quader(c, 0.25, 0.25, 2.5, 2.3, 4, M.dach, 31); for (let i = 0; i < 2; i++) { const [x, y] = iso(0.9 + i * 1.2, 2.5); c.fillStyle = '#59636e'; c.fillRect(x - 9, y - 22, 18, 17); c.strokeStyle = RAND; c.strokeRect(x - 9, y - 22, 18, 17); for (let k = 0; k < 4; k++) { c.beginPath(); c.moveTo(x - 9, y - 18 + k * 4); c.lineTo(x + 9, y - 18 + k * 4); c.stroke(); } } }
function zahnrad(c, x, y, r, col) { c.fillStyle = col; c.beginPath(); for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2, rr = i % 2 ? r : r * 1.3; c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } c.closePath(); c.fill(); c.strokeStyle = RAND; c.lineWidth = 1.2; c.stroke(); punkt(c, x, y, r * 0.35, '#5c6670'); }
function kran(c, tx, ty, M) { const [x, y] = iso(tx, ty); c.strokeStyle = M.holz; c.lineWidth = 3; c.beginPath(); c.moveTo(x, y); c.lineTo(x, y - 56); c.lineTo(x - 24, y - 50); c.stroke(); c.lineWidth = 1; c.strokeStyle = RAND; c.beginPath(); c.moveTo(x - 22, y - 50); c.lineTo(x - 22, y - 30); c.stroke(); kisteKlein(c, x - 22, y - 30); }
function kisteKlein(c, x, y) { c.fillStyle = '#b07a43'; c.fillRect(x - 5, y, 10, 8); c.strokeStyle = RAND; c.strokeRect(x - 5, y, 10, 8); }
function kraeuter(c, tx, ty) { const [x, y] = iso(tx, ty); for (let i = 0; i < 5; i++) { c.fillStyle = i % 2 ? '#3ccf7a' : '#2a9d55'; c.beginPath(); c.ellipse(x - 6 + i * 3, y - 4, 2.5, 5, (i - 2) * 0.3, 0, 7); c.fill(); } }
function amboss(c, x, y) { c.fillStyle = '#4b5059'; c.beginPath(); c.moveTo(x - 10, y - 12); c.lineTo(x + 12, y - 12); c.lineTo(x + 6, y - 7); c.lineTo(x + 4, y); c.lineTo(x - 4, y); c.lineTo(x - 5, y - 7); c.closePath(); c.fill(); c.strokeStyle = RAND; c.lineWidth = 1.2; c.stroke(); }
function palisade(c, tx, ty, h, col) { const [x, y] = iso(tx, ty); c.fillStyle = col; c.beginPath(); c.moveTo(x - 4, y); c.lineTo(x - 4, y - h); c.lineTo(x, y - h - 5); c.lineTo(x + 4, y - h); c.lineTo(x + 4, y); c.closePath(); c.fill(); c.strokeStyle = RAND; c.lineWidth = 1.1; c.stroke(); c.fillStyle = farbe(col, -0.2); c.fillRect(x, y - h, 4, h); }
function bogner(c, tx, ty, z, art = 'bogen') { const [x, y] = iso(tx, ty); punkt(c, x, y - z - 8, 4.5, '#ffd9b3'); c.fillStyle = '#3b82f6'; c.fillRect(x - 4, y - z - 4, 8, 6); c.strokeStyle = art === 'bogen' ? '#6d4a2a' : '#333'; c.lineWidth = 1.6; c.beginPath(); if (art === 'bogen') c.arc(x + 6, y - z - 4, 6, -1.2, 1.2); else { c.moveTo(x, y - z - 2); c.lineTo(x + 14, y - z - 8); } c.stroke(); }
function geschuetz(c, tx, ty, z, col, za) { const [x, y] = iso(tx, ty); c.save(); c.translate(x, y - z); c.fillStyle = col; c.beginPath(); c.ellipse(0, 0, 10, 6, 0, 0, 7); c.fill(); c.strokeStyle = RAND; c.lineWidth = 1.2; c.stroke(); c.rotate(-0.4); c.fillStyle = farbe(col, -0.3); c.fillRect(0, -3, 20 + za, 5); c.strokeRect(0, -3, 20 + za, 5); c.restore(); }
function flakRohr(c, tx, ty, z, za) { const [x, y] = iso(tx, ty); c.save(); c.translate(x, y - z - 4); c.fillStyle = '#5d6b5f'; c.beginPath(); c.arc(0, 0, 10, 0, 7); c.fill(); c.strokeStyle = RAND; c.stroke(); for (const d of [-4, 4]) { c.save(); c.translate(d, 0); c.rotate(-1.1); c.fillStyle = '#3f4a42'; c.fillRect(0, -2, 26, 4); c.strokeRect(0, -2, 26, 4); c.restore(); } c.restore(); void za; }
function kristall(c, x, y, col) { c.save(); c.shadowColor = col; c.shadowBlur = 14; c.fillStyle = col; c.beginPath(); c.moveTo(x, y - 14); c.lineTo(x + 8, y); c.lineTo(x, y + 12); c.lineTo(x - 8, y); c.closePath(); c.fill(); c.restore(); c.strokeStyle = RAND; c.lineWidth = 1.2; c.stroke(); c.fillStyle = 'rgba(255,255,255,.6)'; c.beginPath(); c.moveTo(x, y - 14); c.lineTo(x - 8, y); c.lineTo(x, y - 2); c.fill(); }
export function baum(c, tx, ty, v = 0) {
  const [x, y] = iso(tx, ty);
  const tanne = v % 3 === 2;
  c.fillStyle = '#6d4a2a'; c.fillRect(x - 2.5, y - 14, 5, 14); c.strokeStyle = RAND; c.lineWidth = 1.1; c.strokeRect(x - 2.5, y - 14, 5, 14);
  if (tanne) { for (let i = 0; i < 3; i++) { c.beginPath(); c.moveTo(x - 15 + i * 3, y - 10 - i * 11); c.lineTo(x, y - 34 - i * 11); c.lineTo(x + 15 - i * 3, y - 10 - i * 11); c.closePath(); c.fillStyle = i % 2 ? '#3f8f4a' : '#347a3e'; c.fill(); c.stroke(); } return; }
  const col = ['#5cb85c', '#6cc35a', '#4fa05a'][v % 3];
  for (const [dx, dy, r] of [[-8, -22, 10], [8, -22, 10], [0, -32, 12], [0, -20, 11]]) { c.beginPath(); c.arc(x + dx, y + dy, r, 0, 7); c.fillStyle = col; c.fill(); c.stroke(); }
  c.fillStyle = farbe(col, 0.25); c.beginPath(); c.arc(x - 4, y - 36, 5, 0, 7); c.fill();
}

// ------------------------------------------------------------ Boden
export function bodenBild(N) {
  const w = N * TW + TW * 8, h = N * TH + TH * 8;
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  const c = cv.getContext('2d');
  const ox = w / 2, oy = TH * 4;
  c.fillStyle = '#4e9a3c'; c.fillRect(0, 0, w, h);
  c.translate(ox, oy);
  for (let y = -4; y < N + 4; y++) for (let x = -4; x < N + 4; x++) {
    const innen = x >= 0 && y >= 0 && x < N && y < N;
    const n = (x * 7349 + y * 1931 + x * y * 17) % 7;
    let col = innen ? ((x + y) % 2 ? '#86cc5c' : '#7fc457') : '#5aa548';
    if (innen && n === 0) col = '#8bd162';
    const [a, b] = iso(x, y);
    c.beginPath(); c.moveTo(a, b); c.lineTo(a + TW / 2, b + TH / 2); c.lineTo(a, b + TH); c.lineTo(a - TW / 2, b + TH / 2); c.closePath();
    c.fillStyle = col; c.fill();
    if (innen && n === 3) { c.fillStyle = ['#fff7a8', '#ffffff', '#ffb3c7'][(x + y) % 3]; c.beginPath(); c.arc(a + 6, b + TH / 2, 1.6, 0, 7); c.fill(); }
    if (innen && n === 5) { c.strokeStyle = '#5ea844'; c.lineWidth = 1; c.beginPath(); c.moveTo(a - 4, b + 18); c.lineTo(a - 2, b + 12); c.moveTo(a, b + 18); c.lineTo(a + 1, b + 11); c.stroke(); }
  }
  // Rand: dunkler Streifen
  c.strokeStyle = 'rgba(40,80,30,0.5)'; c.lineWidth = 3;
  c.beginPath(); c.moveTo(...iso(0, 0)); c.lineTo(...iso(N, 0)); c.lineTo(...iso(N, N)); c.lineTo(...iso(0, N)); c.closePath(); c.stroke();
  return { bild: cv, ox, oy };
}

// ------------------------------------------------------------ Einheiten
const HAUT = ['#ffd9b3', '#e8b98f', '#c98d63', '#8d5a3b'];
const HELM = [
  (c, x, y, t) => { c.fillStyle = '#8a5a2b'; c.fillRect(x - 6, y - 3, 12, 3); },                     // Stirnband
  (c, x, y, t) => { helmKappe(c, x, y, '#d9a441'); c.fillStyle = t.a; c.fillRect(x - 1.5, y - 14, 3, 7); }, // Kammhelm
  (c, x, y) => { helmKappe(c, x, y, '#a3acb6'); c.fillStyle = '#6b7480'; c.fillRect(x - 6.5, y - 3, 13, 2); },
  (c, x, y, t) => { c.fillStyle = '#2a2a2a'; c.beginPath(); c.moveTo(x - 9, y - 3); c.lineTo(x, y - 10); c.lineTo(x + 9, y - 3); c.closePath(); c.fill(); c.fillStyle = t.a; c.fillRect(x - 2, y - 8, 4, 2); },
  (c, x, y, t) => { c.fillStyle = '#1f2937'; c.fillRect(x - 5, y - 13, 10, 10); c.fillStyle = '#c9a227'; c.fillRect(x - 5, y - 5, 10, 2); c.fillStyle = t.a; c.fillRect(x - 1, y - 16, 2, 4); },
  (c, x, y) => { c.fillStyle = '#5b6b4a'; c.beginPath(); c.ellipse(x, y - 4, 9, 3, 0, 0, 7); c.fill(); helmKappe(c, x, y, '#5b6b4a'); },
  (c, x, y) => helmKappe(c, x, y, '#6b7a5c'),
  (c, x, y) => { helmKappe(c, x, y, '#3b4250'); c.fillStyle = '#7fe7ff'; c.fillRect(x - 5, y - 3, 10, 2.5); },
  (c, x, y) => { helmKappe(c, x, y, '#eef2ff', 7.5); c.fillStyle = '#5f7cff'; c.fillRect(x - 6, y - 2, 12, 4); },
  (c, x, y) => { helmKappe(c, x, y, '#fbe7fb', 7.5); c.fillStyle = '#ff5fe1'; c.fillRect(x - 6, y - 2, 12, 4); },
  (c, x, y) => { c.save(); c.globalAlpha = 0.5; c.fillStyle = '#bfefff'; c.beginPath(); c.arc(x, y, 9, 0, 7); c.fill(); c.restore(); c.strokeStyle = '#ffd166'; c.lineWidth = 1.6; c.beginPath(); c.arc(x, y, 9, 0, 7); c.stroke(); },
];
function helmKappe(c, x, y, col, r = 7) { c.fillStyle = col; c.beginPath(); c.arc(x, y - 1, r, Math.PI, 0); c.closePath(); c.fill(); c.strokeStyle = RAND; c.lineWidth = 1; c.stroke(); }

const UNIFORM = ['#a9744a', null, '#6b7480', null, null, '#6b7a4a', '#5f6b52', '#3b4250', '#e6ebff', '#f6e6f6', '#3b3f5c'];

/** Zeichnet eine Einheit mit den Füßen bei (x, y). phase: 0..1 Laufschritt, dir: 1 oder -1 */
export function zeichneEinheit(c, x, y, typ, stufe, team = 'blau', phase = 0, dir = 1, opt = {}) {
  const d = EINHEITEN[typ]; if (!d) return;
  const T = TEAM[team];
  const sk = opt.skala || 1;
  c.save(); c.translate(x, y); c.scale(dir * sk, sk);
  // Stufen-Aura
  const st = STUFEN[stufe];
  c.fillStyle = 'rgba(0,0,0,0.22)'; c.beginPath(); c.ellipse(0, 0, d.platz >= 2 ? 15 : 9, d.platz >= 2 ? 6 : 4, 0, 0, 7); c.fill();
  if (stufe >= 1) {
    c.save(); if (stufe >= 3) { c.shadowColor = st.farbe; c.shadowBlur = 6 + stufe * 2; }
    c.strokeStyle = st.farbe; c.lineWidth = 2; c.beginPath(); c.ellipse(0, 0, d.platz >= 2 ? 16 : 10, d.platz >= 2 ? 7 : 5, 0, 0, 7); c.stroke(); c.restore();
  }
  const bob = Math.sin(phase * Math.PI * 2) * 1.2;
  const L = d.linie, za = d.zeitalter;
  if (L === 'luft') flugzeug(c, za, T, phase, st);
  else if (L === 'kav' && za >= 5) fahrzeug(c, za, T, phase, st);
  else if (L === 'belagerung') belagerer(c, za, T, phase, st);
  else if (L === 'kav') reiter(c, za, T, phase, st);
  else if (L === 'fern' && (za === 3 || za === 4)) { geschuetzWagen(c, za, T); figur(c, -9, 0, za, T, phase, 'leer', st, bob, 0.85); }
  else if (L === 'fern' && za === 8) { figur(c, 0, 0, za, T, phase, 'fernbedienung', st, bob); for (let i = 0; i < 3; i++) drohne(c, -8 + i * 8, -34 - Math.sin(phase * 6 + i) * 3, T); }
  else figur(c, 0, 0, za, T, phase, waffeVon(L, za), st, bob);
  c.restore();
  if (stufe >= 1 && !opt.ohneSterne) sterne(c, x, y - (opt.hoehe || einheitHoehe(typ)) * sk - 4, stufe);
  if (opt.verwundet) { c.save(); c.globalAlpha = 0.9; c.fillStyle = '#fff'; c.beginPath(); c.arc(x + 9, y - 30 * sk, 5, 0, 7); c.fill(); c.strokeStyle = RAND; c.lineWidth = 1; c.stroke(); c.fillStyle = '#e0453a'; c.fillRect(x + 8, y - 33 * sk, 2, 6); c.fillRect(x + 6, y - 31 * sk, 6, 2); c.restore(); }
}
export function einheitHoehe(typ) { const d = EINHEITEN[typ]; if (d.linie === 'luft') return 52; if (d.linie === 'kav') return d.zeitalter >= 5 ? 26 : 38; if (d.linie === 'belagerung') return 34; return 30; }

function waffeVon(L, za) {
  if (L === 'nahkampf') return ['keule', 'kurzschwert', 'langschwert', 'muskete', 'gewehr', 'gewehr', 'gewehr', 'karabiner', 'energieklinge', 'plasmaklinge', 'sternsaebel'][za];
  if (L === 'fern') return ['schleuder', 'bogen', 'armbrust', '', '', 'mg', 'rohr', 'laser', '', 'plasmakanone', 'ionengewehr'][za];
  if (L === 'speer') return ['speer', 'speerschild', 'pike', 'pike', 'granate', 'bazooka', 'rohr', 'rohr', 'antenne', 'energieschild', 'lanze'][za];
  return 'keule';
}

function figur(c, x, y, za, T, phase, waffe, st, bob = 0, sk = 1) {
  c.save(); c.translate(x, y); c.scale(sk, sk);
  const schritt = Math.sin(phase * Math.PI * 2) * 3;
  // Beine
  c.strokeStyle = RAND; c.lineWidth = 1;
  const hose = za >= 4 ? '#2f3542' : '#5c4630';
  c.fillStyle = hose; c.fillRect(-4 + schritt * 0.4, -9, 3.2, 9); c.strokeRect(-4 + schritt * 0.4, -9, 3.2, 9);
  c.fillRect(1 - schritt * 0.4, -9, 3.2, 9); c.strokeRect(1 - schritt * 0.4, -9, 3.2, 9);
  // Körper
  const uni = UNIFORM[za] || T.a;
  const yb = -9 + bob * 0.3;
  c.beginPath(); c.moveTo(-6, yb); c.lineTo(-7, yb - 12); c.quadraticCurveTo(0, yb - 15, 7, yb - 12); c.lineTo(6, yb); c.closePath();
  c.fillStyle = uni; c.fill(); c.lineWidth = 1.2; c.stroke();
  // Teamfarbe: Schärpe/Brust
  c.fillStyle = T.a; c.beginPath(); c.moveTo(-6.5, yb - 11); c.lineTo(-3, yb - 12.5); c.lineTo(6, yb - 1); c.lineTo(2.5, yb); c.closePath(); c.fill();
  if (st.sterne >= 1) { c.fillStyle = st.farbe; c.fillRect(-6, yb - 2, 12, 2); }
  // Kopf
  const kopfY = yb - 18;
  c.fillStyle = HAUT[(za * 3 + (T === TEAM.rot ? 1 : 0)) % 4]; c.beginPath(); c.arc(0, kopfY, 6, 0, 7); c.fill(); c.stroke();
  c.fillStyle = RAND; c.fillRect(1.5, kopfY - 1, 1.6, 2); c.fillRect(4, kopfY - 1, 1.4, 2);
  HELM[za](c, 0, kopfY, T);
  // Waffe
  waffeZeichnen(c, waffe, yb, za, T);
  c.restore();
}
function waffeZeichnen(c, w, yb, za, T) {
  const hx = 6, hy = yb - 7;
  c.strokeStyle = RAND; c.lineWidth = 1.2;
  const strich = (x1, y1, x2, y2, col, lw = 2.2) => { c.strokeStyle = RAND; c.lineWidth = lw + 1.4; c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke(); c.strokeStyle = col; c.lineWidth = lw; c.stroke(); };
  switch (w) {
    case 'keule': strich(hx, hy + 2, hx + 7, hy - 9, '#8a5a2b', 2.6); punkt(c, hx + 7.5, hy - 10, 3, '#8a5a2b'); break;
    case 'kurzschwert': strich(hx, hy + 1, hx + 7, hy - 9, '#dfe6ee'); schildRund(c, -7, yb - 6, 6, T.a); break;
    case 'langschwert': strich(hx, hy + 2, hx + 9, hy - 14, '#e9eef3'); strich(hx - 2, hy, hx + 3, hy + 3, '#6d4a2a', 1.6); break;
    case 'muskete': case 'gewehr': case 'karabiner': strich(hx - 4, hy + 3, hx + 12, hy - 7, w === 'karabiner' ? '#2a2f38' : '#6d4a2a', 2.2); if (w === 'muskete') strich(hx + 12, hy - 7, hx + 15, hy - 9, '#dfe6ee', 1.2); break;
    case 'energieklinge': case 'plasmaklinge': case 'sternsaebel': { const col = w === 'energieklinge' ? '#7ea0ff' : w === 'plasmaklinge' ? '#ff7ef0' : '#ffe27a'; c.save(); c.shadowColor = col; c.shadowBlur = 8; strich(hx, hy + 1, hx + 9, hy - 14, col, 2.4); c.restore(); break; }
    case 'schleuder': c.strokeStyle = '#6d4a2a'; c.lineWidth = 1.4; c.beginPath(); c.moveTo(hx, hy); c.quadraticCurveTo(hx + 8, hy - 14, hx + 2, hy - 16); c.stroke(); punkt(c, hx + 2, hy - 16, 1.8, '#8d8a80'); break;
    case 'bogen': c.strokeStyle = '#6d4a2a'; c.lineWidth = 2; c.beginPath(); c.arc(hx + 1, hy - 3, 8, -1.3, 1.3); c.stroke(); c.strokeStyle = '#eee'; c.lineWidth = 0.8; c.beginPath(); c.moveTo(hx + 3, hy - 11); c.lineTo(hx + 3, hy + 5); c.stroke(); break;
    case 'armbrust': strich(hx - 2, hy + 1, hx + 10, hy - 3, '#6d4a2a'); c.strokeStyle = '#333'; c.lineWidth = 1.6; c.beginPath(); c.moveTo(hx + 8, hy - 9); c.lineTo(hx + 9, hy + 3); c.stroke(); break;
    case 'mg': strich(hx - 3, hy + 2, hx + 14, hy - 2, '#2a2f38', 3); strich(hx + 6, hy + 1, hx + 4, hy + 7, '#2a2f38', 1.2); break;
    case 'rohr': case 'bazooka': strich(hx - 9, hy - 4, hx + 12, hy - 9, w === 'bazooka' ? '#5b6b4a' : '#3b4250', 4.5); break;
    case 'laser': case 'ionengewehr': case 'plasmakanone': { const col = w === 'laser' ? '#ff4d4d' : w === 'ionengewehr' ? '#ffe27a' : '#ff7ef0'; strich(hx - 3, hy + 2, hx + 13, hy - 4, '#e6ebf5', w === 'plasmakanone' ? 4 : 2.6); c.save(); c.shadowColor = col; c.shadowBlur = 6; punkt(c, hx + 13, hy - 4, 1.8, col); c.restore(); break; }
    case 'speer': strich(hx - 2, hy + 6, hx + 6, hy - 18, '#8a5a2b', 1.8); c.fillStyle = '#c9a227'; c.beginPath(); c.moveTo(hx + 6, hy - 18); c.lineTo(hx + 4, hy - 13); c.lineTo(hx + 8, hy - 14); c.fill(); break;
    case 'speerschild': strich(hx - 2, hy + 6, hx + 6, hy - 18, '#8a5a2b', 1.8); schildRund(c, -6, yb - 7, 8, '#c9a227', T.a); break;
    case 'pike': strich(hx - 4, hy + 8, hx + 9, hy - 24, '#8a5a2b', 1.8); c.fillStyle = '#dfe6ee'; c.beginPath(); c.moveTo(hx + 9, hy - 24); c.lineTo(hx + 7, hy - 18); c.lineTo(hx + 11, hy - 19); c.fill(); break;
    case 'granate': punkt(c, hx + 3, hy - 9, 3, '#3f4a2c'); strich(hx - 3, hy + 3, hx + 10, hy - 5, '#6d4a2a', 2); break;
    case 'antenne': c.fillStyle = '#3b4250'; c.fillRect(-9, yb - 12, 5, 10); c.strokeStyle = '#3b4250'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(-7, yb - 12); c.lineTo(-9, yb - 26); c.stroke(); glow(c, -9, yb - 27, 1.5, '#7ea0ff'); break;
    case 'energieschild': c.save(); c.globalAlpha = 0.55; c.fillStyle = '#ff7ef0'; c.beginPath(); c.ellipse(9, yb - 7, 5, 11, 0, 0, 7); c.fill(); c.restore(); c.strokeStyle = '#ff5fe1'; c.lineWidth = 1.4; c.beginPath(); c.ellipse(9, yb - 7, 5, 11, 0, 0, 7); c.stroke(); break;
    case 'lanze': c.save(); c.shadowColor = '#ffe27a'; c.shadowBlur = 8; strich(hx - 4, hy + 8, hx + 9, hy - 24, '#ffd166', 2.2); c.restore(); break;
    case 'fernbedienung': c.fillStyle = '#3b4250'; c.fillRect(hx - 2, hy - 4, 6, 4); break;
    default: break;
  }
}
function schildRund(c, x, y, r, col, rand) { c.fillStyle = col; c.beginPath(); c.arc(x, y, r, 0, 7); c.fill(); c.strokeStyle = RAND; c.lineWidth = 1.2; c.stroke(); if (rand) { c.strokeStyle = rand; c.lineWidth = 1.6; c.beginPath(); c.arc(x, y, r - 2.5, 0, 7); c.stroke(); } }
function drohne(c, x, y, T) { c.fillStyle = '#3b4250'; c.fillRect(x - 3, y - 1.5, 6, 3); c.strokeStyle = '#3b4250'; c.lineWidth = 1; c.beginPath(); c.moveTo(x - 6, y - 2); c.lineTo(x + 6, y - 2); c.stroke(); c.fillStyle = T.a; c.fillRect(x - 1, y - 1, 2, 2); }

function pferd(c, phase, col = '#8a5a2b') {
  const s = Math.sin(phase * Math.PI * 2) * 3;
  c.strokeStyle = RAND; c.lineWidth = 1.2;
  c.fillStyle = farbe(col, -0.2);
  for (const [lx, o] of [[-9, s], [-5, -s], [6, -s], [10, s]]) { c.fillRect(lx + o * 0.3, -11, 2.6, 11); c.strokeRect(lx + o * 0.3, -11, 2.6, 11); }
  c.fillStyle = col; c.beginPath(); c.ellipse(0, -15, 13, 6, 0, 0, 7); c.fill(); c.stroke();
  c.beginPath(); c.moveTo(9, -18); c.lineTo(14, -28); c.lineTo(19, -26); c.lineTo(15, -16); c.closePath(); c.fill(); c.stroke();
  c.fillStyle = '#3a2416'; c.beginPath(); c.moveTo(10, -20); c.lineTo(13, -29); c.lineTo(11, -21); c.fill();
  c.beginPath(); c.moveTo(-13, -16); c.quadraticCurveTo(-19, -12, -17, -5); c.lineWidth = 2.5; c.strokeStyle = '#3a2416'; c.stroke();
}
function reiter(c, za, T, phase, st) {
  if (za === 0) { // Streitwagen
    pferd(c, phase, '#a86b3c');
    c.save(); c.translate(-14, 0);
    c.fillStyle = '#8a5a2b'; c.fillRect(-9, -16, 14, 9); c.strokeStyle = RAND; c.strokeRect(-9, -16, 14, 9);
    punkt(c, -3, -5, 5, '#6d4a2a'); c.restore();
    figur(c, -16, -9, 0, T, 0, 'speer', st, 0, 0.85); return;
  }
  pferd(c, phase, ['#a86b3c', '#6d4a2a', '#f0eee8', '#3a2a1c', '#8a5a2b'][za]);
  if (za === 2) { c.fillStyle = T.a; c.beginPath(); c.moveTo(-12, -18); c.lineTo(10, -18); c.lineTo(8, -9); c.lineTo(-10, -9); c.closePath(); c.fill(); }
  figur(c, -1, -14, za, T, phase * 0.3, za === 1 ? 'speer' : za === 2 ? 'pike' : za === 3 ? 'langschwert' : 'karabiner', st, 0, 0.9);
}
function fahrzeug(c, za, T, phase, st) {
  const col = za >= 9 ? '#eef0ff' : za >= 8 ? '#dfe4ff' : ['#5b6b4a', '#5f6b52', '#6b7a5c', '#8a8f7a'][Math.min(3, za - 5)];
  if (za === 8) { // Robo-Läufer
    const s = Math.sin(phase * Math.PI * 2) * 4;
    c.strokeStyle = RAND; c.lineWidth = 3;
    for (const [x, o] of [[-6, s], [6, -s]]) { c.beginPath(); c.moveTo(x, -16); c.lineTo(x + o, -7); c.lineTo(x, 0); c.stroke(); }
    c.fillStyle = col; c.beginPath(); c.roundRect(-11, -30, 22, 15, 4); c.fill(); c.lineWidth = 1.3; c.stroke();
    c.fillStyle = '#5f7cff'; c.fillRect(2, -26, 7, 4); c.fillStyle = T.a; c.fillRect(-9, -18, 18, 2.5); return;
  }
  const schwebe = za >= 9 ? -6 - Math.sin(phase * Math.PI * 2) * 1.5 : 0;
  c.save(); c.translate(0, schwebe);
  if (za < 9) { c.fillStyle = '#2a2f38'; c.beginPath(); c.roundRect(-17, -9, 34, 9, 4); c.fill(); for (let i = 0; i < 5; i++) punkt(c, -13 + i * 6.5, -4.5, 2.4, '#5c6670'); }
  else { c.save(); c.shadowColor = za === 9 ? '#ff7ef0' : '#ffe27a'; c.shadowBlur = 10; c.fillStyle = za === 9 ? '#ff7ef0' : '#ffe27a'; c.fillRect(-14, -3, 28, 2); c.restore(); }
  c.fillStyle = col; c.strokeStyle = RAND; c.lineWidth = 1.3;
  c.beginPath(); c.moveTo(-18, -9); c.lineTo(-15, -17); c.lineTo(15, -17); c.lineTo(19, -9); c.closePath(); c.fill(); c.stroke();
  c.fillStyle = farbe(col, -0.15); c.beginPath(); c.roundRect(-8, -24, 15, 8, 3); c.fill(); c.stroke();
  c.fillStyle = '#2a2f38'; c.fillRect(6, -22, 16 + (za - 5) * 1.5, 3); c.strokeRect(6, -22, 16 + (za - 5) * 1.5, 3);
  c.fillStyle = T.a; c.fillRect(-15, -15, 6, 4);
  if (st.sterne >= 1) { c.fillStyle = st.farbe; c.fillRect(-14, -11, 28, 1.6); }
  c.restore();
}
function belagerer(c, za, T, phase, st) {
  const holz = '#8a5a2b', metall = '#4b5059';
  const rad = (x, r = 4.5) => { punkt(c, x, -r, r, '#5c4630'); c.strokeStyle = '#3a2416'; c.lineWidth = 1; c.beginPath(); c.moveTo(x - r, -r); c.lineTo(x + r, -r); c.moveTo(x, -2 * r); c.lineTo(x, 0); c.stroke(); };
  if (za === 0) { c.fillStyle = holz; c.fillRect(-15, -14, 30, 6); c.strokeStyle = RAND; c.strokeRect(-15, -14, 30, 6); c.beginPath(); c.moveTo(-16, -14); c.lineTo(0, -28); c.lineTo(16, -14); c.closePath(); c.fillStyle = '#b07a43'; c.fill(); c.stroke(); c.fillStyle = metall; c.fillRect(14, -13, 6, 4); rad(-10); rad(10); c.fillStyle = T.a; c.fillRect(-4, -24, 8, 4); return; }
  if (za === 1 || za === 2) {
    c.fillStyle = holz; c.fillRect(-14, -12, 28, 5); c.strokeStyle = RAND; c.strokeRect(-14, -12, 28, 5);
    const a = -0.9 + Math.sin(phase * Math.PI * 2) * 0.1;
    c.save(); c.translate(-4, -12); c.rotate(a); c.fillStyle = holz; c.fillRect(0, -2, za === 2 ? 34 : 26, 4); c.strokeRect(0, -2, za === 2 ? 34 : 26, 4); punkt(c, za === 2 ? 34 : 26, 0, 4, '#8d8a80'); c.restore();
    if (za === 2) { c.strokeStyle = holz; c.lineWidth = 3; c.beginPath(); c.moveTo(-10, -12); c.lineTo(-4, -30); c.lineTo(2, -12); c.stroke(); quaderKlein(c, -12, -24, '#6d6a62'); }
    rad(-9); rad(9); c.fillStyle = T.a; c.fillRect(-14, -12, 6, 5); return;
  }
  if (za <= 5) {
    rad(-6, 6); c.fillStyle = za === 3 ? '#6d4a2a' : '#4c5560'; c.beginPath(); c.moveTo(-16, -6); c.lineTo(4, -10); c.lineTo(4, -4); c.closePath(); c.fill();
    c.save(); c.translate(0, -12); c.rotate(-0.25 - (za - 3) * 0.12); c.fillStyle = za === 3 ? '#8a6a3a' : metall; c.beginPath(); c.roundRect(-4, -4, 24 + za * 2, 8, 3); c.fill(); c.strokeStyle = RAND; c.lineWidth = 1.2; c.stroke(); c.restore();
    c.fillStyle = T.a; c.fillRect(-12, -10, 6, 4); return;
  }
  // moderne Raketen-/Energie-Geschütze
  const col = za >= 8 ? '#e6ebff' : '#6b7a5c';
  c.fillStyle = '#2a2f38'; c.beginPath(); c.roundRect(-16, -7, 32, 7, 3); c.fill();
  c.fillStyle = col; c.strokeStyle = RAND; c.lineWidth = 1.3; c.beginPath(); c.roundRect(-15, -16, 30, 10, 3); c.fill(); c.stroke();
  c.save(); c.translate(-2, -17); c.rotate(-0.5);
  if (za === 9) { c.fillStyle = '#3b3f5c'; c.fillRect(0, -3, 34, 6); c.save(); c.shadowColor = '#ff7ef0'; c.shadowBlur = 8; c.fillStyle = '#ff7ef0'; c.fillRect(2, -1, 30, 2); c.restore(); }
  else if (za === 10) { c.fillStyle = '#ffd166'; c.beginPath(); c.arc(8, -4, 7, 0, 7); c.fill(); c.stroke(); glow(c, 8, -4, 3, '#ffe27a'); }
  else { c.fillStyle = farbe(col, -0.2); c.fillRect(0, -6, 22, 12); c.strokeRect(0, -6, 22, 12); for (let i = 0; i < 3; i++) punkt(c, 20, -3 + i * 3, 1.3, '#e0453a'); }
  c.restore(); c.fillStyle = T.a; c.fillRect(-13, -14, 6, 4);
}
function quaderKlein(c, x, y, col) { c.fillStyle = col; c.fillRect(x, y, 6, 6); c.strokeStyle = RAND; c.strokeRect(x, y, 6, 6); }
function geschuetzWagen(c, za, T) {
  punkt(c, 2, -6, 6, '#5c4630');
  c.save(); c.translate(4, -11); c.rotate(-0.2); c.fillStyle = za === 3 ? '#3e3e3e' : '#4b5059'; c.beginPath(); c.roundRect(-2, -3.5, 22, 7, 3); c.fill(); c.strokeStyle = RAND; c.lineWidth = 1.2; c.stroke();
  if (za === 4) for (let i = 0; i < 3; i++) { c.strokeStyle = '#222'; c.beginPath(); c.moveTo(16, -2 + i * 2); c.lineTo(24, -2 + i * 2); c.stroke(); }
  c.restore(); c.fillStyle = T.a; c.fillRect(-2, -14, 5, 3);
}
function flugzeug(c, za, T, phase, st) {
  const h = 34 + Math.sin(phase * Math.PI * 2) * 2;
  c.fillStyle = 'rgba(0,0,0,0.18)'; c.beginPath(); c.ellipse(0, 0, 14, 5, 0, 0, 7); c.fill();
  c.save(); c.translate(0, -h);
  const col = za === 5 ? '#c9b07a' : za === 6 ? '#9aa4ae' : za === 7 ? '#3b3f47' : za === 8 ? '#e6ebff' : za === 9 ? '#fbe7fb' : '#3b3f5c';
  c.strokeStyle = RAND; c.lineWidth = 1.3; c.fillStyle = col;
  if (za === 7) { c.beginPath(); c.moveTo(18, 0); c.lineTo(-14, -14); c.lineTo(-8, 0); c.lineTo(-14, 14); c.closePath(); c.fill(); c.stroke(); }
  else if (za === 9) { for (let i = 0; i < 9; i++) punkt(c, Math.cos(i * 2.1 + phase * 6) * 10, Math.sin(i * 1.7 + phase * 5) * 6, 1.8, '#ff7ef0'); }
  else {
    c.beginPath(); c.ellipse(0, 0, 17, 4.5, 0, 0, 7); c.fill(); c.stroke();
    c.beginPath(); c.moveTo(2, -1); c.lineTo(-4, -15); c.lineTo(-9, -14); c.lineTo(-5, 0); c.closePath(); c.fill(); c.stroke();
    c.beginPath(); c.moveTo(2, 1); c.lineTo(-4, 13); c.lineTo(-9, 12); c.lineTo(-5, 0); c.closePath(); c.fill(); c.stroke();
    if (za === 5) { c.beginPath(); c.moveTo(-2, -3); c.lineTo(-2, 3); c.stroke(); c.strokeStyle = '#333'; c.lineWidth = 2; c.beginPath(); c.moveTo(18, -6 * Math.cos(phase * 40)); c.lineTo(18, 6 * Math.cos(phase * 40)); c.stroke(); }
    if (za >= 8) { c.save(); c.shadowColor = za === 10 ? '#ffe27a' : '#7ea0ff'; c.shadowBlur = 10; punkt(c, -17, 0, 2.5, za === 10 ? '#ffe27a' : '#7ea0ff'); c.restore(); }
  }
  c.fillStyle = T.a; c.beginPath(); c.arc(-1, 0, 2.5, 0, 7); c.fill();
  c.restore();
  void st;
}
export function sterne(c, x, y, stufe) {
  const st = STUFEN[stufe];
  if (stufe >= 6) { krone(c, x, y, st.farbe, stufe === 7); return; }
  const n = st.sterne, w = 7;
  for (let i = 0; i < n; i++) sternForm(c, x - (n - 1) * w / 2 + i * w, y, 3.6, st.farbe);
}
export function sternForm(c, x, y, r, col) {
  c.beginPath();
  for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r; c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
  c.closePath(); c.fillStyle = col; c.fill(); c.strokeStyle = RAND; c.lineWidth = 0.9; c.stroke();
}
function krone(c, x, y, col, glitzer) {
  c.save(); if (glitzer) { c.shadowColor = '#fff1a8'; c.shadowBlur = 10; }
  c.beginPath(); c.moveTo(x - 8, y + 3); c.lineTo(x - 9, y - 5); c.lineTo(x - 4, y - 1); c.lineTo(x, y - 7); c.lineTo(x + 4, y - 1); c.lineTo(x + 9, y - 5); c.lineTo(x + 8, y + 3); c.closePath();
  c.fillStyle = col; c.fill(); c.restore(); c.strokeStyle = RAND; c.lineWidth = 1; c.stroke();
  punkt(c, x, y - 7, 1.4, '#ff4d6d');
}

/** Einheit als kleines Bild (für Listen in der Oberfläche) */
const portraitCache = new Map();
export function einheitPortrait(typ, stufe, team = 'blau', groesse = 64) {
  const key = typ + '|' + stufe + '|' + team + '|' + groesse;
  if (portraitCache.has(key)) return portraitCache.get(key);
  const cv = document.createElement('canvas'); cv.width = groesse * 2; cv.height = groesse * 2;
  const c = cv.getContext('2d'); c.scale(2, 2);
  const h = einheitHoehe(typ);
  const sk = Math.min(2.4, (groesse * 0.8) / (h + 8));
  zeichneEinheit(c, groesse / 2, groesse * 0.86, typ, stufe, team, 0.25, 1, { skala: sk, ohneSterne: true });
  const url = cv.toDataURL();
  portraitCache.set(key, url);
  return url;
}
export function gebaeudePortrait(typ, stufe, za) {
  const key = 'g|' + typ + '|' + stufe + '|' + za;
  if (portraitCache.has(key)) return portraitCache.get(key);
  const sp = gebaeudeSprite(typ, Math.max(1, stufe), za);
  const cv = document.createElement('canvas'); const N = 128; cv.width = N; cv.height = N;
  const c = cv.getContext('2d');
  const gr = GEBAEUDE[typ].gr;
  // Ausschnitt: Grundriss + Höhe
  const top = sp.oy - 110 - gr * 6, hoehe = sp.oy - top + gr * TH + 6;
  const breite = gr * TW + 20;
  const sk = Math.min(N / breite, N / hoehe);
  c.drawImage(sp.bild, (sp.ox - breite / 2) * AUFL, top * AUFL, breite * AUFL, hoehe * AUFL, (N - breite * sk) / 2, (N - hoehe * sk) / 2, breite * sk, hoehe * sk);
  const url = cv.toDataURL();
  portraitCache.set(key, url);
  return url;
}
