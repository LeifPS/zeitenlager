// Die gemeinsame Weltkarte: unendlich groß, rein aus Koordinaten berechnet (jeder sieht dieselbe Welt).
// Rohstoff-Felder liefern unbegrenzt. Jeder Spieler hat seinen eigenen Nebel; neue Felder findet man nur durchs Erkunden.
import { ROHSTOFFE } from './daten.js';

export const KARTEN_SAAT = 0x5eed2026;

export function hash(x, y, s = KARTEN_SAAT) {
  let h = (Math.imul(x | 0, 0x27d4eb2d) ^ Math.imul(y | 0, 0x165667b1) ^ s) >>> 0;
  h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d) >>> 0;
  h = Math.imul(h ^ (h >>> 12), 0x297a2d39) >>> 0;
  return (h ^ (h >>> 15)) >>> 0;
}
function glatt(t) { return t * t * (3 - 2 * t); }
function wertRauschen(x, y, gr, s) {
  const gx = Math.floor(x / gr), gy = Math.floor(y / gr);
  const fx = glatt(x / gr - gx), fy = glatt(y / gr - gy);
  const v = (a, b) => hash(a, b, s) / 4294967296;
  const a = v(gx, gy), b = v(gx + 1, gy), c = v(gx, gy + 1), d = v(gx + 1, gy + 1);
  return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
}

export const BIOME = {
  wasser: { name: 'See', farbe: '#3d8fc4' },
  wiese: { name: 'Wiese', farbe: '#7cc45a' },
  wald: { name: 'Wald', farbe: '#4f9a45' },
  huegel: { name: 'Hügel', farbe: '#a7b46a' },
  wueste: { name: 'Steppe', farbe: '#d8c27a' },
  berg: { name: 'Gebirge', farbe: '#9b958c' },
  schnee: { name: 'Tundra', farbe: '#e6eef2' },
};
export function biom(x, y) {
  const h = wertRauschen(x, y, 11, 101) * 0.65 + wertRauschen(x, y, 4, 202) * 0.35;
  const f = wertRauschen(x, y, 17, 303);
  if (h < 0.28) return 'wasser';
  if (h > 0.8) return 'berg';
  if (f < 0.25) return h > 0.65 ? 'schnee' : 'wueste';
  if (h > 0.66) return 'huegel';
  if (f > 0.62) return 'wald';
  return 'wiese';
}

// Häufigkeit der Rohstoffe (seltene sind seltener)
const GEWICHT = { kupfer: 20, pferde: 16, eisen: 16, salpeter: 11, kohle: 10, oel: 9, aluminium: 7, uran: 4, erden: 5, silizium: 4, nanofasern: 3, helium3: 2.2 };
const BIOM_PASST = { pferde: ['wiese', 'wueste', 'huegel'], oel: ['wueste', 'schnee', 'wiese'], kohle: ['huegel', 'berg', 'wald'], eisen: ['huegel', 'berg', 'wiese'] };
const SUMME = Object.values(GEWICHT).reduce((a, b) => a + b, 0);

/** Rohstoff auf diesem Feld (oder null). Unabhängig vom Spieler. */
export function feldRohstoff(x, y) {
  const b = biom(x, y);
  if (b === 'wasser') return null;
  const h = hash(x, y, 777);
  if (h % 1000 >= 55) return null; // ~5,5 % der Felder
  let r = (hash(x, y, 999) / 4294967296) * SUMME;
  for (const id in GEWICHT) {
    r -= GEWICHT[id];
    if (r < 0) {
      const p = BIOM_PASST[id];
      if (p && !p.includes(b)) return (hash(x, y, 31) & 1) ? id : null;
      return id;
    }
  }
  return null;
}

/** Lagerplatz des n-ten Spielers (Spirale nach außen, alle ~14 Felder einer). */
export function heimatVon(n) {
  for (let k = 0; ; k++) {
    const m = n + k * 9973;
    const r = 6 + 13 * Math.sqrt(m + 0.5);
    const w = m * 2.399963;
    const x = Math.round(Math.cos(w) * r), y = Math.round(Math.sin(w) * r);
    if (biom(x, y) !== 'wasser' || k > 5) return { x, y };
  }
}

export function abstand(a, b) { return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2); }

export const START_SICHT = 6;     // Radius um das eigene Lager
export const KUNDSCHAFT_SICHT = 4; // Radius, den ein Kundschafter am Ziel aufdeckt
export const HANDWERKER_FELDER_PRO_MIN = 1;
export const KUNDSCHAFTER_FELDER_PRO_MIN = 2.2;

/** sicht: Liste [x, y, r] aufgedeckter Kreise */
export function sichtbar(sicht, x, y) {
  for (const [cx, cy, r] of sicht) if ((x - cx) ** 2 + (y - cy) ** 2 <= r * r + 0.5) return true;
  return false;
}

export function rohstoffInfo(id) { return ROHSTOFFE[id]; }
