// Barbarendörfer: Kampagne (feste Dörfer pro Zeitalter) und endlose Dörfer in der Stärke des Spielers.
import { GEBAEUDE, EINHEITEN, STUFEN, BAU_ROHSTOFF, ROHSTOFFE, einheitMacht, abwehrMacht, goldProStunde, LAGER_GROESSE } from './daten.js';
import { zufall } from './kampf.js';

const N = LAGER_GROESSE;
const DORFNAMEN = [
  ['Lehmhütten am Fluss', 'Räuberhöhle', 'Steinkreis der Wilden', 'Knochenhügel', 'Lager des Keulenkönigs'],
  ['Säulenruine', 'Piratenbucht', 'Söldnerfeste', 'Bergpass der Plünderer', 'Burg des Warlords'],
  ['Raubritternest', 'Moorfeste', 'Turm der Gesetzlosen', 'Schwarze Abtei', 'Festung des Eisernen Barons'],
  ['Schmugglerhafen', 'Banditenvilla', 'Pulverturm', 'Söldnerkompanie', 'Zitadelle des Condottiere'],
  ['Zechensiedlung', 'Fabrik der Rebellen', 'Eisenbahnfort', 'Kohlenbaron', 'Dampffestung'],
  ['Schützengraben', 'Panzerdepot', 'Luftschiffhalle', 'Bunkerlinie', 'Hauptquartier des Generals'],
  ['Raketenbasis', 'Uranmine', 'Radarstation', 'Atombunker', 'Kommandozentrale Omega'],
  ['Hackerversteck', 'Satellitenschüssel', 'Serverfarm', 'Drohnenhangar', 'Netzwerkzitadelle'],
  ['Rebellen-KI', 'Robotfabrik', 'Neuronales Nest', 'Schwarmkern', 'Die Erwachte Maschine'],
  ['Nanolabor', 'Synthkolonie', 'Plasmaraffinerie', 'Klonturm', 'Der Gestaltwandler'],
  ['Mondaußenposten', 'Asteroidenmine', 'Sternenbasis', 'Warpportal', 'Imperator der Leere'],
];

export const KAMPAGNE = [];
for (let za = 0; za < 11; za++) for (let k = 0; k < 5; k++) {
  const ref = einheitMacht(['krieger', 'schwertkaempfer', 'langschwert', 'musketier', 'linieninfanterie', 'infanterie', 'mechinfanterie', 'spezialeinheit', 'exosoldat', 'synthkrieger', 'sternenlegionaer'][za], 0);
  const macht = Math.round(ref * (1.5 + k * 1.6) * (1 + za * 0.6) * Math.pow(1.3, za));
  const beute = { gold: Math.round(350 * Math.pow(2.7, za) * (1 + k * 0.6)) };
  if (za >= 1 || k >= 2) beute[BAU_ROHSTOFF[za]] = Math.round(8 * Math.pow(1.5, za) * (1 + k * 0.5));
  KAMPAGNE.push({ nr: KAMPAGNE.length, za, k, name: DORFNAMEN[za][k], macht, beute, boss: k === 4, saat: 1000 + za * 37 + k * 7 });
}

const ABWEHR_NACH_ZA = [
  ['wachturm'], ['wachturm', 'moerser'], ['wachturm', 'moerser', 'falle'], ['wachturm', 'moerser', 'falle'], ['wachturm', 'moerser', 'falle'],
  ['wachturm', 'moerser', 'falle', 'bunker', 'flak'], ['wachturm', 'moerser', 'falle', 'bunker', 'flak'], ['wachturm', 'moerser', 'falle', 'bunker', 'flak'],
  ['wachturm', 'moerser', 'falle', 'bunker', 'flak', 'laserturm'], ['wachturm', 'moerser', 'bunker', 'flak', 'laserturm', 'schildgen', 'falle'], ['wachturm', 'moerser', 'bunker', 'flak', 'laserturm', 'schildgen', 'ionenkanone', 'falle'],
];
const ABWEHR_WERT = 0.6; // Türme zählen bei der Stärke-Schätzung weniger, weil sie sich nicht bewegen
const LINIEN_NACH_ZA = (za) => ['nahkampf', 'fern', 'speer', 'kav', ...(za >= 5 ? ['luft'] : [])];

/** Erzeugt ein Dorf (Basis für den Kampf). */
export function erzeugeDorf({ saat, macht, za }) {
  const rnd = zufall(saat);
  const geb = []; let id = 1;
  const belegt = new Uint8Array(N * N);
  const frei = (typ, x, y) => { const gr = GEBAEUDE[typ].gr; if (x < 2 || y < 2 || x + gr > N - 2 || y + gr > N - 2) return false; for (let yy = y; yy < y + gr; yy++) for (let xx = x; xx < x + gr; xx++) if (belegt[yy * N + xx]) return false; return true; };
  const setze = (typ, x, y, stufe) => { const gr = GEBAEUDE[typ].gr; for (let yy = y; yy < y + gr; yy++) for (let xx = x; xx < x + gr; xx++) belegt[yy * N + xx] = 1; geb.push({ id: id++, typ, x, y, stufe: Math.max(1, stufe) }); };
  const platziere = (typ, stufe, rmin, rmax) => {
    for (let k = 0; k < 200; k++) {
      const w = rnd() * Math.PI * 2, r = rmin + rnd() * (rmax - rmin);
      const x = Math.round(N / 2 + Math.cos(w) * r - GEBAEUDE[typ].gr / 2), y = Math.round(N / 2 + Math.sin(w) * r - GEBAEUDE[typ].gr / 2);
      if (frei(typ, x, y)) { setze(typ, x, y, stufe); return true; }
    }
    return false;
  };
  const L = 2 * za + 1;
  setze('zentrum', N / 2 - 2, N / 2 - 2, za + 1);
  // Mauerring
  const ring = 6 + Math.min(3, Math.floor(macht / 4000));
  const luecken = za === 0 ? 3 : 1 + Math.floor(rnd() * 2);
  const ringFelder = [];
  for (let i = -ring; i <= ring; i++) { ringFelder.push([N / 2 + i, N / 2 - ring], [N / 2 + i, N / 2 + ring]); if (Math.abs(i) < ring) ringFelder.push([N / 2 - ring, N / 2 + i], [N / 2 + ring, N / 2 + i]); }
  const lueckenAt = new Set(); for (let k = 0; k < luecken; k++) lueckenAt.add(Math.floor(rnd() * ringFelder.length));
  // Verteidigung: etwa die Hälfte der Stärke
  const typen = ABWEHR_NACH_ZA[za];
  let abwehr = 0; let n = 0;
  while (abwehr < macht * 0.5 && n < 14) {
    const typ = typen[n % typen.length];
    if (typ === 'falle' && n > 8) { n++; continue; }
    const st = Math.max(1, L + (rnd() < 0.3 ? 1 : 0) - (n > 6 ? 1 : 0));
    if (platziere(typ, st, 2.5, ring - 1.5)) abwehr += abwehrMacht(typ, st) * ABWEHR_WERT;
    n++;
  }
  if (macht > 330) ringFelder.forEach(([x, y], i) => { if (!lueckenAt.has(i) && !lueckenAt.has(i - 2) && frei('mauer', x, y)) setze('mauer', x, y, Math.max(1, L - 1)); });
  // Wirtschaft (Beute-Gebäude) innen und außen
  for (const typ of ['goldmine', 'schatzkammer', 'unterkunft', 'kaserne', 'goldmine', 'handwerkerhuette']) platziere(typ, Math.max(1, L - 1), 3, ring + 4);
  if (za >= 1) platziere('rohstofflager', L - 1, 3, ring - 1);
  for (let k = 0; k < 5; k++) platziere('baum', 1, ring + 2, 17);
  // Besatzung
  const einh = []; let rest = Math.max(macht - abwehr, macht * 0.3);
  const linien = LINIEN_NACH_ZA(za);
  const kandidaten = Object.values(EINHEITEN).filter((d) => d.zeitalter === za && linien.includes(d.linie) && d.linie !== 'belagerung');
  let schutz = 0;
  while (rest > 0 && einh.length < 40 && schutz++ < 200) {
    const d = kandidaten[Math.floor(rnd() * kandidaten.length)];
    let st = 0;
    while (st < STUFEN.length - 1 && einheitMacht(d.id, st + 1) < rest / 3) st++;
    const m = einheitMacht(d.id, st);
    if (m > rest * 1.4 && einh.length) break;
    einh.push({ id: 1000 + einh.length, typ: d.id, stufe: st });
    rest -= m;
  }
  return { gebaeude: geb, einheiten: einh };
}

export function dorfMacht(basis) {
  let m = 0;
  for (const g of basis.gebaeude) m += abwehrMacht(g.typ, g.stufe) * ABWEHR_WERT;
  for (const u of basis.einheiten) m += einheitMacht(u.typ, u.stufe);
  return m;
}

/** Neue Auswahl endloser Dörfer in der Stärke des Spielers */
export const BARBAREN_NEU_NACH = 3 * 3600000;
export function neueBarbaren(macht, za, jetzt, saat) {
  const rnd = zufall(saat);
  const art = [['Leichtes Dorf', 0.55, 0.55], ['Dorf', 0.8, 1], ['Starkes Dorf', 1.1, 1.7]];
  return {
    zeit: jetzt,
    liste: art.map(([titel, f, b], i) => {
      const n = DORFNAMEN[za][Math.floor(rnd() * 4)];
      const beute = { gold: Math.round(goldProStunde(2 * za + 1) * 0.9 * b) };
      const res = [BAU_ROHSTOFF[za], BAU_ROHSTOFF[Math.max(0, za - 1)]];
      if (za >= 0 && rnd() < 0.5) res.push('pferde');
      for (const r of new Set(res)) beute[r] = Math.round(6 * Math.pow(1.45, za) * b * (r === 'pferde' ? 0.6 : 1));
      return { saat: Math.floor(rnd() * 1e9), titel, name: n, macht: Math.max(150, Math.round(macht * f)), za, beute, i };
    }),
  };
}
void ROHSTOFFE;
