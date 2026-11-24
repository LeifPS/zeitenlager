// Alle festen Spieldaten von Zeitenlager: Zeitalter, Stufen, Rohstoffe, Einheiten, Gebäude, Forschungen.
// Wird vom Browser und vom Server (Worker) gleich benutzt. Keine Zufälle, keine Uhrzeit hier.

export const ZEITALTER = [
  { id: 0, name: 'Antike', farbe: '#c99a5b' },
  { id: 1, name: 'Klassik', farbe: '#d7c48a' },
  { id: 2, name: 'Mittelalter', farbe: '#8fa36b' },
  { id: 3, name: 'Renaissance', farbe: '#b77ac2' },
  { id: 4, name: 'Industriezeitalter', farbe: '#9a7b62' },
  { id: 5, name: 'Moderne', farbe: '#6f93b8' },
  { id: 6, name: 'Atomzeitalter', farbe: '#9ccc3d' },
  { id: 7, name: 'Informationszeitalter', farbe: '#3fb6d6' },
  { id: 8, name: 'KI-Zeitalter', farbe: '#5f7cff' },
  { id: 9, name: 'Synthetisches Zeitalter', farbe: '#e05fd0' },
  { id: 10, name: 'Interstellares Zeitalter', farbe: '#ffd166' },
];

// 8 Stufen. Zwei gleiche Einheiten gleicher Stufe ergeben eine Einheit der nächsten Stufe.
export const STUFEN = [
  { name: 'Normal', farbe: null, sterne: 0 },
  { name: 'Rot', farbe: '#e8322a', sterne: 1 },
  { name: 'Blau', farbe: '#2f6fe0', sterne: 2 },
  { name: 'Schwarz', farbe: '#1c1c22', sterne: 3 },
  { name: 'Silber', farbe: '#cfd6de', sterne: 4 },
  { name: 'Gold', farbe: '#ffc61a', sterne: 5 },
  { name: 'Regenbogen', farbe: 'regenbogen', sterne: 6 },
  { name: 'Legende', farbe: 'legende', sterne: 7 },
];
// Anzeigefarbe einer Stufe für die Oberfläche (Regenbogen als Verlauf)
export const STUFE_CSS = [null, '#e8322a', '#2f6fe0', '#1c1c22', '#cfd6de', '#ffc61a', 'linear-gradient(90deg,#e8322a,#ff9a1a,#ffd21a,#3cc35a,#2f6fe0,#8a3fd6)', 'linear-gradient(90deg,#1c1c22,#ffc61a,#e8322a,#2f6fe0,#ffc61a,#1c1c22)'];
export const STUFE_FAKTOR = 2.05; // Werte pro Stufe (etwas mehr als 2, damit Mergen sich lohnt)
export const ROEMISCH = ['', '', '', '', '', '', '', ''];

// Strategische Rohstoffe (wie in Civilization). Sichtbar auf der Karte erst nach der Forschung.
// dauer: Minuten Arbeit pro Ladung am Feld (je seltener, desto länger), ladung: Menge pro Ladung (Grundwert)
export const ROHSTOFFE = {
  kupfer:     { name: 'Kupfer', zeitalter: 0, farbe: '#d9773a', dauer: 4, ladung: 6 },
  pferde:     { name: 'Pferde', zeitalter: 0, farbe: '#a86b3c', dauer: 5, ladung: 4 },
  eisen:      { name: 'Eisen', zeitalter: 1, farbe: '#8d99a6', dauer: 8, ladung: 5 },
  salpeter:   { name: 'Salpeter', zeitalter: 3, farbe: '#e9e4d0', dauer: 14, ladung: 5 },
  kohle:      { name: 'Kohle', zeitalter: 4, farbe: '#3b3b42', dauer: 18, ladung: 6 },
  oel:        { name: 'Öl', zeitalter: 5, farbe: '#20232b', dauer: 25, ladung: 5 },
  aluminium:  { name: 'Aluminium', zeitalter: 6, farbe: '#cfd8e3', dauer: 32, ladung: 5 },
  uran:       { name: 'Uran', zeitalter: 6, farbe: '#9cff3d', dauer: 45, ladung: 3 },
  erden:      { name: 'Seltene Erden', zeitalter: 7, farbe: '#ff8fb3', dauer: 55, ladung: 4 },
  silizium:   { name: 'Silizium', zeitalter: 8, farbe: '#6a7dff', dauer: 75, ladung: 4 },
  nanofasern: { name: 'Nanofasern', zeitalter: 9, farbe: '#ff5fe1', dauer: 100, ladung: 3 },
  helium3:    { name: 'Helium-3', zeitalter: 10, farbe: '#fff07a', dauer: 140, ladung: 3 },
};
export const ROHSTOFF_IDS = Object.keys(ROHSTOFFE);
// Rohstoff, den Gebäude-Ausbauten im jeweiligen Zeitalter zusätzlich kosten
export const BAU_ROHSTOFF = ['kupfer', 'eisen', 'eisen', 'salpeter', 'kohle', 'oel', 'aluminium', 'erden', 'silizium', 'nanofasern', 'helium3'];

// ---------------------------------------------------------------- Einheiten
export const LINIEN = {
  nahkampf:   { name: 'Nahkampf', hp: 130, schaden: 15, rw: 0.9, tempo: 1.0, rate: 1.0, platz: 1, gegen: { speer: 1.5 } },
  fern:       { name: 'Fernkampf', hp: 62, schaden: 13, rw: 4.6, tempo: 0.9, rate: 1.2, platz: 1, gegen: { nahkampf: 1.35 }, trifftLuft: true },
  speer:      { name: 'Abwehr', hp: 120, schaden: 12, rw: 1.1, tempo: 0.9, rate: 1.0, platz: 1, gegen: { kav: 2.4 } },
  kav:        { name: 'Schnell', hp: 165, schaden: 17, rw: 0.9, tempo: 1.8, rate: 1.0, platz: 2, gegen: { fern: 1.6, belagerung: 1.6 } },
  belagerung: { name: 'Belagerung', hp: 150, schaden: 46, rw: 5.2, tempo: 0.6, rate: 2.6, platz: 3, gegenGebaeude: 4, nurGebaeude: true, flaeche: 0.9 },
  luft:       { name: 'Luft', hp: 170, schaden: 30, rw: 3.0, tempo: 2.3, rate: 1.3, platz: 3, flug: true, trifftLuft: true },
};
export const ZEITALTER_FAKTOR = 1.8;

// [linie, zeitalter, id, name, rohstoffe]
const E = [
  ['nahkampf', 0, 'krieger', 'Krieger', {}],
  ['nahkampf', 1, 'schwertkaempfer', 'Schwertkämpfer', { eisen: 1 }],
  ['nahkampf', 2, 'langschwert', 'Langschwertkämpfer', { eisen: 2 }],
  ['nahkampf', 3, 'musketier', 'Musketier', { salpeter: 1 }],
  ['nahkampf', 4, 'linieninfanterie', 'Linieninfanterie', { salpeter: 1, kohle: 1 }],
  ['nahkampf', 5, 'infanterie', 'Infanterie', { kohle: 1 }],
  ['nahkampf', 6, 'mechinfanterie', 'Mech. Infanterie', { oel: 1, aluminium: 1 }],
  ['nahkampf', 7, 'spezialeinheit', 'Spezialeinheit', { erden: 1 }],
  ['nahkampf', 8, 'exosoldat', 'Exo-Soldat', { silizium: 1 }],
  ['nahkampf', 9, 'synthkrieger', 'Synth-Krieger', { nanofasern: 1 }],
  ['nahkampf', 10, 'sternenlegionaer', 'Sternenlegionär', { helium3: 1 }],

  ['fern', 0, 'schleuderer', 'Schleuderer', {}],
  ['fern', 1, 'bogenschuetze', 'Bogenschütze', {}],
  ['fern', 2, 'armbrust', 'Armbrustschütze', { eisen: 1 }],
  ['fern', 3, 'feldkanone', 'Feldkanone', { salpeter: 2 }],
  ['fern', 4, 'gatling', 'Gatling-Geschütz', { kohle: 2 }],
  ['fern', 5, 'mgtrupp', 'Maschinengewehr', { oel: 1 }],
  ['fern', 6, 'raketentrupp', 'Raketentrupp', { aluminium: 1 }],
  ['fern', 7, 'praezision', 'Präzisionsschütze', { erden: 1 }],
  ['fern', 8, 'drohnenschwarm', 'Drohnenschwarm', { silizium: 2 }],
  ['fern', 9, 'plasmawerfer', 'Plasmawerfer', { nanofasern: 1 }],
  ['fern', 10, 'ionenkanonier', 'Ionenkanonier', { helium3: 1 }],

  ['speer', 0, 'speertraeger', 'Speerträger', { kupfer: 1 }],
  ['speer', 1, 'hoplit', 'Hoplit', { kupfer: 1, eisen: 1 }],
  ['speer', 2, 'pikenier', 'Pikenier', { eisen: 1 }],
  ['speer', 3, 'pikeschuss', 'Pike & Schuss', { salpeter: 1 }],
  ['speer', 4, 'grenadier', 'Grenadier', { kohle: 1 }],
  ['speer', 5, 'panzerabwehr', 'Panzerabwehr', { oel: 1 }],
  ['speer', 6, 'panzerjaeger', 'Panzerjäger', { aluminium: 1 }],
  ['speer', 7, 'lenkrakete', 'Lenkraketentrupp', { erden: 1 }],
  ['speer', 8, 'stoersender', 'Störsender', { silizium: 1 }],
  ['speer', 9, 'nanowall', 'Nanowall-Trupp', { nanofasern: 1 }],
  ['speer', 10, 'gravlanzer', 'Gravitationslanzer', { helium3: 1 }],

  ['kav', 0, 'streitwagen', 'Streitwagen', { pferde: 1 }],
  ['kav', 1, 'reiterei', 'Reiterei', { pferde: 1 }],
  ['kav', 2, 'ritter', 'Ritter', { pferde: 1, eisen: 1 }],
  ['kav', 3, 'kuerassier', 'Kürassier', { pferde: 1, salpeter: 1 }],
  ['kav', 4, 'kavallerie', 'Kavallerie', { pferde: 1, kohle: 1 }],
  ['kav', 5, 'panzer', 'Panzer', { oel: 2 }],
  ['kav', 6, 'kampfpanzer', 'Kampfpanzer', { oel: 1, aluminium: 1 }],
  ['kav', 7, 'modpanzer', 'Moderner Panzer', { erden: 1, uran: 1 }],
  ['kav', 8, 'roboläufer', 'Robo-Läufer', { silizium: 2 }],
  ['kav', 9, 'schwebepanzer', 'Schwebepanzer', { nanofasern: 2 }],
  ['kav', 10, 'sturmgleiter', 'Sturmgleiter', { helium3: 2 }],

  ['belagerung', 0, 'rammbock', 'Rammbock', {}],
  ['belagerung', 1, 'katapult', 'Katapult', { kupfer: 1 }],
  ['belagerung', 2, 'trebuchet', 'Trebuchet', { eisen: 1 }],
  ['belagerung', 3, 'bombarde', 'Bombarde', { salpeter: 2 }],
  ['belagerung', 4, 'artillerie', 'Artillerie', { kohle: 2 }],
  ['belagerung', 5, 'haubitze', 'Haubitze', { oel: 1, kohle: 1 }],
  ['belagerung', 6, 'raketenartillerie', 'Raketenartillerie', { aluminium: 1, uran: 1 }],
  ['belagerung', 7, 'marschflugkoerper', 'Marschflugkörper', { erden: 2 }],
  ['belagerung', 8, 'autoartillerie', 'Autonome Artillerie', { silizium: 2 }],
  ['belagerung', 9, 'railgun', 'Railgun', { nanofasern: 2 }],
  ['belagerung', 10, 'orbitalziel', 'Orbital-Zielgeber', { helium3: 2 }],

  ['luft', 5, 'doppeldecker', 'Doppeldecker', { oel: 2 }],
  ['luft', 6, 'duesenjaeger', 'Düsenjäger', { aluminium: 2 }],
  ['luft', 7, 'tarnkappe', 'Tarnkappenbomber', { erden: 2, uran: 1 }],
  ['luft', 8, 'kampfdrohne', 'Kampfdrohne', { silizium: 2 }],
  ['luft', 9, 'nanoschwarm', 'Nanoschwarm', { nanofasern: 2 }],
  ['luft', 10, 'raumjaeger', 'Raumjäger', { helium3: 2 }],
];

export const EINHEITEN = {};
for (const [linie, za, id, name, res] of E) {
  const L = LINIEN[linie];
  const f = Math.pow(ZEITALTER_FAKTOR, za);
  EINHEITEN[id] = {
    id, name, linie, zeitalter: za,
    hp: Math.round(L.hp * f), schaden: Math.round(L.schaden * f * 10) / 10,
    rw: L.rw + (linie === 'fern' ? za * 0.08 : 0), tempo: L.tempo + za * 0.03, rate: L.rate, platz: L.platz,
    kosten: { gold: Math.round(40 * Math.pow(2.05, za) * L.platz), ...mal(res, 1 + Math.floor(za / 3)) },
    zeit: Math.round(14 * Math.pow(1.68, za) * (L.platz === 1 ? 1 : 1.4)),
  };
}
function mal(o, k) { const r = {}; for (const x in o) r[x] = o[x] * k; return r; }
export const EINHEIT_FOLGE = {}; // nächstes Zeitalter in derselben Linie (für die Rüstkammer)
for (const l of Object.keys(LINIEN)) {
  const liste = E.filter((e) => e[0] === l).sort((a, b) => a[1] - b[1]);
  for (let i = 0; i < liste.length - 1; i++) EINHEIT_FOLGE[liste[i][2]] = liste[i + 1][2];
}
// Welches Gebäude bildet welche Linie aus
export const LINIE_GEBAEUDE = { nahkampf: 'kaserne', speer: 'kaserne', fern: 'schiessstand', kav: 'stall', belagerung: 'werkstatt', luft: 'flugfeld' };

export function einheitWerte(typ, stufe) {
  const d = EINHEITEN[typ];
  const s = Math.pow(STUFE_FAKTOR, stufe);
  return { hp: d.hp * s, schaden: d.schaden * s };
}
export function einheitMacht(typ, stufe) {
  const w = einheitWerte(typ, stufe);
  return Math.sqrt(w.hp * w.schaden * 4 / LINIEN[EINHEITEN[typ].linie].rate);
}

// ---------------------------------------------------------------- Gebäude
// gr: Kantenlänge in Feldern. kat: wirtschaft | militaer | verteidigung | deko
// kosten/zeit: Grundwert für Stufe 1, wachsen pro Stufe. max(zl): höchste Stufe bei Zentrum-Stufe zl. anzahl(zl): wie viele man bauen darf.
const G = (o) => o;
export const GEBAEUDE = {
  zentrum: G({ name: 'Zentrum', gr: 4, kat: 'wirtschaft', hp: 900, kosten: 0, zeit: 0, max: () => 11, anzahl: () => 1,
    text: 'Das Herz deines Lagers. Die Stufe des Zentrums ist dein Zeitalter. Bestimmt, wie hoch und wie viele Gebäude du bauen darfst.' }),
  goldmine: G({ name: 'Goldmine', gr: 3, kat: 'wirtschaft', hp: 500, kosten: 150, zeit: 20, max: (zl) => zl * 2, anzahl: (zl) => Math.min(7, 1 + Math.ceil(zl * 0.6)),
    text: 'Fördert Gold. Die Mine füllt sich bis zu 2 Stunden lang; tippe sie an, um das Gold einzusammeln.' }),
  schatzkammer: G({ name: 'Schatzkammer', gr: 3, kat: 'wirtschaft', hp: 700, kosten: 200, zeit: 25, max: (zl) => zl * 2, anzahl: (zl) => Math.min(4, 1 + Math.floor(zl / 3)),
    text: 'Lagert Gold. Ein Teil davon ist vor Plünderern geschützt.' }),
  rohstofflager: G({ name: 'Rohstofflager', gr: 3, kat: 'wirtschaft', hp: 650, kosten: 300, zeit: 40, max: (zl) => zl * 2, anzahl: (zl) => Math.min(3, 1 + Math.floor(zl / 4)), tech: 'bergbau',
    text: 'Lagert strategische Rohstoffe wie Eisen, Pferde oder Öl.' }),
  handwerkerhuette: G({ name: 'Handwerkerhütte', gr: 2, kat: 'wirtschaft', hp: 350, kosten: 120, zeit: 15, max: (zl) => zl * 2, anzahl: (zl) => Math.min(6, 2 + Math.floor(zl / 2)),
    text: 'Jede Hütte beherbergt einen Handwerker, den du auf der Karte zu Rohstoff-Feldern schicken kannst. Höhere Stufen tragen mehr und laufen schneller.' }),
  akademie: G({ name: 'Akademie', gr: 3, kat: 'wirtschaft', hp: 650, kosten: 250, zeit: 45, max: (zl) => zl * 2, anzahl: () => 1, tech: 'schrift',
    text: 'Bestimmt dein Forschungstempo. Je höher die Stufe, desto schneller wird geforscht.' }),
  unterkunft: G({ name: 'Unterkunft', gr: 3, kat: 'militaer', hp: 500, kosten: 180, zeit: 20, max: (zl) => zl * 2, anzahl: (zl) => Math.min(6, 1 + Math.ceil(zl / 2)),
    text: 'Platz für deine Einheiten. Jede Stufe bringt mehr Platz.' }),
  kaserne: G({ name: 'Kaserne', gr: 3, kat: 'militaer', hp: 600, kosten: 200, zeit: 25, max: (zl) => zl * 2, anzahl: () => 1,
    text: 'Bildet Nahkämpfer und Abwehr-Einheiten aus. Die Stufe bestimmt, aus welchem Zeitalter.' }),
  schiessstand: G({ name: 'Schießstand', gr: 3, kat: 'militaer', hp: 550, kosten: 220, zeit: 25, max: (zl) => zl * 2, anzahl: () => 1,
    text: 'Bildet Fernkämpfer aus.' }),
  stall: G({ name: 'Stall', gr: 3, kat: 'militaer', hp: 600, kosten: 350, zeit: 40, max: (zl) => zl * 2, anzahl: () => 1, tech: 'reitkunst',
    text: 'Bildet schnelle Einheiten aus: erst Streitwagen und Reiter, später Panzer.' }),
  werkstatt: G({ name: 'Werkstatt', gr: 3, kat: 'militaer', hp: 600, kosten: 400, zeit: 45, max: (zl) => zl * 2, anzahl: () => 1, tech: 'rad',
    text: 'Baut Belagerungsgerät, das Gebäude und Mauern zerstört.' }),
  flugfeld: G({ name: 'Flugfeld', gr: 4, kat: 'militaer', hp: 900, kosten: 50000, zeit: 600, max: (zl) => zl * 2, anzahl: () => 1, tech: 'flug',
    text: 'Bildet Flugzeuge aus. Sie fliegen über Mauern hinweg.' }),
  heilhaus: G({ name: 'Heilhaus', gr: 3, kat: 'militaer', hp: 550, kosten: 300, zeit: 40, max: (zl) => zl * 2, anzahl: () => 1, tech: 'heilkunde',
    text: 'Gefallene Einheiten sind verwundet und müssen geheilt werden, bevor sie wieder kämpfen. Das Heilhaus heilt viel schneller und mehrere zugleich.' }),
  ruestkammer: G({ name: 'Rüstkammer', gr: 3, kat: 'militaer', hp: 650, kosten: 8000, zeit: 300, max: (zl) => zl * 2, anzahl: () => 1, tech: 'militaertaktik',
    text: 'Rüstet eine Einheit auf die Einheit des nächsten Zeitalters ihrer Linie auf. Die Stufe (Sterne) bleibt erhalten.' }),

  mauer: G({ name: 'Mauer', gr: 1, kat: 'verteidigung', hp: 300, kosten: 30, zeit: 0, max: (zl) => zl * 2, anzahl: (zl) => Math.min(250, 20 + zl * 22), tech: 'steinmetz', mauer: true,
    text: 'Hält Angreifer auf. Nahkämpfer müssen sich durchschlagen oder einen Weg drumherum finden.' }),
  wachturm: G({ name: 'Wachturm', gr: 2, kat: 'verteidigung', hp: 400, kosten: 250, zeit: 30, max: (zl) => zl * 2, anzahl: (zl) => Math.min(8, 1 + zl), tech: 'steinmetz',
    abwehr: { schaden: 11, rw: 6.5, rate: 1.0, luft: true, boden: true },
    text: 'Schießt auf Angreifer in Reichweite, auch auf Flugzeuge.' }),
  moerser: G({ name: 'Wurfturm', gr: 3, kat: 'verteidigung', hp: 700, kosten: 2500, zeit: 120, max: (zl) => zl * 2, anzahl: (zl) => Math.min(4, Math.floor(zl / 2)), tech: 'mathematik',
    abwehr: { schaden: 40, rw: 8, minRw: 3, rate: 3.5, flaeche: 1.4, boden: true },
    text: 'Wirft Geschosse, die in einem Bereich Schaden machen. Trifft nichts direkt vor sich und keine Flugzeuge.' }),
  falle: G({ name: 'Falle', gr: 1, kat: 'verteidigung', hp: 1, kosten: 400, zeit: 10, max: (zl) => zl * 2, anzahl: (zl) => Math.min(16, zl * 2), tech: 'fallenbau', falle: true,
    abwehr: { schaden: 120, rw: 1.0, flaeche: 1.2, boden: true },
    text: 'Versteckt. Löst einmal pro Kampf aus und verletzt Bodeneinheiten in der Nähe.' }),
  bunker: G({ name: 'MG-Bunker', gr: 2, kat: 'verteidigung', hp: 1200, kosten: 120000, zeit: 900, max: (zl) => zl * 2, anzahl: (zl) => Math.min(5, zl - 4), tech: 'maschinengewehr',
    abwehr: { schaden: 9, rw: 5.5, rate: 0.2, boden: true },
    text: 'Feuert sehr schnell auf Bodeneinheiten.' }),
  flak: G({ name: 'Flak', gr: 2, kat: 'verteidigung', hp: 900, kosten: 150000, zeit: 900, max: (zl) => zl * 2, anzahl: (zl) => Math.min(5, zl - 4), tech: 'flak',
    abwehr: { schaden: 70, rw: 8, rate: 1.0, luft: true, flaeche: 0.8 },
    text: 'Holt Flugzeuge vom Himmel. Trifft nur Ziele in der Luft.' }),
  laserturm: G({ name: 'Laserturm', gr: 2, kat: 'verteidigung', hp: 1500, kosten: 9e6, zeit: 3600, max: (zl) => zl * 2, anzahl: (zl) => Math.min(4, zl - 7), tech: 'gerichteteenergie',
    abwehr: { schaden: 26, rw: 7, rate: 0.3, luft: true, boden: true, kette: 3 },
    text: 'Ein Strahl, der auf bis zu drei Ziele überspringt.' }),
  schildgen: G({ name: 'Schildgenerator', gr: 2, kat: 'verteidigung', hp: 1300, kosten: 4e7, zeit: 5400, max: (zl) => zl * 2, anzahl: (zl) => Math.min(3, zl - 8), tech: 'schildtechnik', schild: { rw: 5, anteil: 0.5 },
    text: 'Gebäude in der Nähe bekommen einen Schild, der Schaden zuerst abfängt.' }),
  ionenkanone: G({ name: 'Ionenkanone', gr: 3, kat: 'verteidigung', hp: 2600, kosten: 2e8, zeit: 7200, max: (zl) => zl * 2, anzahl: (zl) => Math.min(2, zl - 9), tech: 'ionenwaffen',
    abwehr: { schaden: 400, rw: 10, rate: 4, luft: true, boden: true, flaeche: 1.8 },
    text: 'Der stärkste Turm, den es gibt.' }),

  fahne: G({ name: 'Fahne', gr: 1, kat: 'deko', hp: 50, kosten: 500, zeit: 0, max: () => 1, anzahl: () => 10, text: 'Schmückt dein Lager.' }),
  baum: G({ name: 'Baum', gr: 1, kat: 'deko', hp: 50, kosten: 100, zeit: 0, max: () => 1, anzahl: () => 30, text: 'Ein Baum. Sieht schön aus.' }),
  statue: G({ name: 'Statue', gr: 2, kat: 'deko', hp: 50, kosten: 25000, zeit: 0, max: () => 1, anzahl: () => 3, tech: 'philosophie', text: 'Eine Statue deines Feldherrn.' }),
};
export const GEBAEUDE_IDS = Object.keys(GEBAEUDE);

export const STUFE_WACHSTUM = 1.42;
export function bauKosten(typ, stufe) { // Kosten, um Stufe "stufe" zu erreichen (stufe >= 1)
  const g = GEBAEUDE[typ];
  if (typ === 'zentrum') {
    const k = { gold: Math.round(1500 * Math.pow(3.1, stufe - 2)) };
    if (stufe >= 3) k[BAU_ROHSTOFF[stufe - 2]] = Math.round(20 * Math.pow(1.6, stufe - 2));
    if (stufe >= 8) k.uran = Math.round(10 * Math.pow(1.6, stufe - 7));
    return k;
  }
  const k = { gold: Math.round(g.kosten * Math.pow(STUFE_WACHSTUM, stufe - 1)) };
  const za = Math.floor((stufe - 1) / 2);
  if (stufe >= 2 && g.kat !== 'deko' && !g.mauer) k[BAU_ROHSTOFF[za]] = Math.round(4 * Math.pow(1.55, za) * (1 + ((stufe - 1) % 2)));
  return k;
}
export function bauZeit(typ, stufe) { // Sekunden
  const g = GEBAEUDE[typ];
  if (typ === 'zentrum') return stufe <= 1 ? 0 : Math.round(120 * Math.pow(2.6, stufe - 2));
  if (g.zeit === 0) return 0;
  return Math.min(4 * 86400, Math.round(g.zeit * Math.pow(1.45, stufe - 1)));
}

// Werte der Gebäude je Stufe
export function goldProStunde(stufe) { return Math.round(400 * Math.pow(STUFE_WACHSTUM, stufe - 1)); }
export const PRODUKTION_MAX_STUNDEN = 2; // Minen füllen sich höchstens so lange (gilt auch offline)
export function goldLager(stufe) { return Math.round(3000 * Math.pow(1.5, stufe - 1)); }
export function zentrumGoldLager(stufe) { return Math.round(2500 * Math.pow(1.6, stufe - 1)); }
export function rohstoffLager(stufe) { return Math.round(60 * Math.pow(1.45, stufe - 1)); }
export function zentrumRohstoffLager(stufe) { return Math.round(30 * Math.pow(1.45, stufe - 1)); }
export function platzVon(stufe) { return 6 + (stufe - 1) * 2; }
export function forschungsTempo(akademieStufe) { return akademieStufe ? 90 * Math.pow(1.34, akademieStufe - 1) : 60; } // Wissen pro Stunde
export function gebaeudeHp(typ, stufe) { return Math.round(GEBAEUDE[typ].hp * Math.pow(1.4, stufe - 1)); }
export function abwehrWerte(typ, stufe) {
  const a = GEBAEUDE[typ].abwehr;
  return a ? { ...a, schaden: a.schaden * Math.pow(1.4, stufe - 1) } : null;
}
export function handwerkerTraglast(stufe) { return 1 + (stufe - 1) * 0.25; }
export function handwerkerTempo(stufe) { return 1 + (stufe - 1) * 0.08; }
export function heilSlots(stufe) { return stufe ? 1 + Math.floor(stufe / 3) : 1; }
export function heilFaktor(stufe) { return stufe ? 0.5 / (1 + 0.15 * (stufe - 1)) : 2; } // mal Ausbildungszeit
export function ausbildungFaktor(stufe) { return 1 / (1 + 0.06 * (stufe - 1)); }
// Welches Zeitalter eine Ausbildungs-Stätte der Stufe s ausbilden kann
export function ausbildungsZeitalter(stufe) { return Math.floor((stufe - 1) / 2); }

// ---------------------------------------------------------------- Forschung
// Jedes Zeitalter hat Forschungen, die letzte ("tor_*") erlaubt das Zentrum aufs nächste Zeitalter zu bringen.
// Kosten in Wissen; die Dauer ergibt sich aus Kosten / Forschungstempo.
const TECH_STUNDEN = [0.09, 0.45, 1.1, 2.1, 3.3, 5.5, 8, 11, 34, 58, 125]; // Ziel-Dauer bei üblichem Tempo
// [id, name, zeitalter, voraussetzungen, effekte, text]
const T = [
  ['bergbau', 'Bergbau', 0, [], { gebaeude: ['rohstofflager'], sicht: ['kupfer'] }, 'Kupfer wird auf der Karte sichtbar. Schaltet das Rohstofflager frei.'],
  ['bronzeguss', 'Bronzeguss', 0, ['bergbau'], { einheiten: ['speertraeger'] }, 'Speerträger: stark gegen schnelle Einheiten.'],
  ['reitkunst', 'Reitkunst', 0, [], { gebaeude: ['stall'], sicht: ['pferde'], einheiten: ['streitwagen'] }, 'Pferde werden sichtbar. Stall und Streitwagen.'],
  ['rad', 'Das Rad', 0, ['reitkunst'], { gebaeude: ['werkstatt'], einheiten: ['rammbock'], handwerkerTempo: 0.1 }, 'Werkstatt und Rammbock. Handwerker laufen 10 % schneller.'],
  ['steinmetz', 'Steinmetzkunst', 0, ['bergbau'], { gebaeude: ['mauer', 'wachturm'] }, 'Mauern und Wachtürme für dein Lager.'],
  ['schrift', 'Schrift', 0, [], { gebaeude: ['akademie'] }, 'Die Akademie: schnelleres Forschen.'],
  ['heilkunde', 'Heilkunde', 0, ['schrift'], { gebaeude: ['heilhaus'] }, 'Das Heilhaus heilt verwundete Einheiten viel schneller.'],
  ['tor_1', 'Zeitenwende: Klassik', 0, ['bronzeguss', 'rad', 'steinmetz', 'heilkunde'], { zeitalter: 1 }, 'Das Zentrum kann in die Klassik aufsteigen.'],

  ['eisenverhuettung', 'Eisenverhüttung', 1, ['tor_1'], { sicht: ['eisen'], einheiten: ['schwertkaempfer'] }, 'Eisen wird sichtbar. Schwertkämpfer.'],
  ['bogenbau', 'Bogenbau', 1, ['tor_1'], { einheiten: ['bogenschuetze'] }, 'Bogenschützen schießen weiter und härter.'],
  ['hoplitentaktik', 'Phalanx', 1, ['eisenverhuettung'], { einheiten: ['hoplit'] }, 'Hopliten: die eiserne Mauer gegen Reiter.'],
  ['reiterei', 'Reiterei', 1, ['eisenverhuettung'], { einheiten: ['reiterei'] }, 'Berittene Krieger.'],
  ['mathematik', 'Mathematik', 1, ['bogenbau'], { einheiten: ['katapult'], gebaeude: ['moerser'] }, 'Katapult und Wurfturm.'],
  ['baukunst', 'Baukunst', 1, ['tor_1'], { baumeister: 1 }, 'Ein zweiter Baumeister: zwei Gebäude gleichzeitig.'],
  ['waehrung', 'Währung', 1, ['tor_1'], { gold: 0.1 }, 'Goldminen fördern 10 % mehr.'],
  ['philosophie', 'Philosophie', 1, ['baukunst'], { forschung: 0.1, gebaeude: ['statue'] }, '10 % schnelleres Forschen. Statuen.'],
  ['tor_2', 'Zeitenwende: Mittelalter', 1, ['hoplitentaktik', 'reiterei', 'mathematik', 'philosophie', 'waehrung'], { zeitalter: 2 }, 'Das Zentrum kann ins Mittelalter aufsteigen.'],

  ['stahl', 'Stahl', 2, ['tor_2'], { einheiten: ['langschwert'] }, 'Langschwertkämpfer.'],
  ['ritterwesen', 'Ritterwesen', 2, ['tor_2'], { einheiten: ['ritter'] }, 'Schwer gepanzerte Ritter.'],
  ['armbrust', 'Maschinenbau', 2, ['tor_2'], { einheiten: ['armbrust'] }, 'Armbrustschützen.'],
  ['feudalismus', 'Feudalismus', 2, ['stahl'], { einheiten: ['pikenier'] }, 'Pikeniere halten jeden Reiterangriff auf.'],
  ['mechanik', 'Mechanik', 2, ['armbrust'], { einheiten: ['trebuchet'] }, 'Das Trebuchet.'],
  ['fallenbau', 'Fallenbau', 2, ['tor_2'], { gebaeude: ['falle'] }, 'Versteckte Fallen.'],
  ['militaertaktik', 'Militärtaktik', 2, ['ritterwesen', 'stahl'], { gebaeude: ['ruestkammer'] }, 'Die Rüstkammer rüstet Einheiten ins neue Zeitalter auf.'],
  ['universitaet', 'Universität', 2, ['tor_2'], { forschung: 0.1 }, '10 % schnelleres Forschen.'],
  ['tor_3', 'Zeitenwende: Renaissance', 2, ['feudalismus', 'mechanik', 'militaertaktik', 'universitaet', 'fallenbau'], { zeitalter: 3 }, 'Das Zentrum kann in die Renaissance aufsteigen.'],

  ['schiesspulver', 'Schießpulver', 3, ['tor_3'], { sicht: ['salpeter'], einheiten: ['musketier'] }, 'Salpeter wird sichtbar. Musketiere.'],
  ['metallguss', 'Metallguss', 3, ['schiesspulver'], { einheiten: ['bombarde'] }, 'Die Bombarde.'],
  ['ballistik', 'Ballistik', 3, ['schiesspulver'], { einheiten: ['feldkanone'] }, 'Feldkanonen.'],
  ['taktik', 'Taktik', 3, ['schiesspulver'], { einheiten: ['pikeschuss'] }, 'Pike & Schuss.'],
  ['reitertaktik', 'Reitertaktik', 3, ['tor_3'], { einheiten: ['kuerassier'] }, 'Kürassiere.'],
  ['astronomie', 'Astronomie', 3, ['tor_3'], { forschung: 0.1 }, '10 % schnelleres Forschen.'],
  ['bankwesen', 'Bankwesen', 3, ['tor_3'], { gold: 0.15, baumeister: 1 }, 'Goldminen fördern 15 % mehr. Ein weiterer Baumeister.'],
  ['kartografie', 'Kartografie', 3, ['astronomie'], { kundschafter: 1, handwerkerTempo: 0.15 }, 'Ein weiterer Kundschafter. Handwerker 15 % schneller.'],
  ['tor_4', 'Zeitenwende: Industrie', 3, ['metallguss', 'ballistik', 'taktik', 'reitertaktik', 'bankwesen', 'kartografie'], { zeitalter: 4 }, 'Das Zentrum kann ins Industriezeitalter aufsteigen.'],

  ['dampfkraft', 'Dampfkraft', 4, ['tor_4'], { sicht: ['kohle'], handwerkerTempo: 0.2 }, 'Kohle wird sichtbar. Handwerker 20 % schneller.'],
  ['militaerwissenschaft', 'Militärwissenschaft', 4, ['tor_4'], { einheiten: ['linieninfanterie'] }, 'Linieninfanterie.'],
  ['praezisionswerkzeug', 'Präzisionswerkzeug', 4, ['dampfkraft'], { einheiten: ['gatling'] }, 'Das Gatling-Geschütz.'],
  ['gewehrkavallerie', 'Gewehrkavallerie', 4, ['militaerwissenschaft'], { einheiten: ['kavallerie'] }, 'Kavallerie.'],
  ['stahlverarbeitung', 'Stahlverarbeitung', 4, ['dampfkraft'], { einheiten: ['artillerie'] }, 'Artillerie.'],
  ['sprengstoff', 'Sprengstoff', 4, ['militaerwissenschaft'], { einheiten: ['grenadier'] }, 'Grenadiere.'],
  ['wirtschaftslehre', 'Wirtschaftslehre', 4, ['tor_4'], { gold: 0.15 }, 'Goldminen fördern 15 % mehr.'],
  ['eisenbahn', 'Eisenbahn', 4, ['dampfkraft'], { handwerkerTempo: 0.25, handwerker: 1 }, 'Handwerker 25 % schneller und ein Handwerker mehr.'],
  ['tor_5', 'Zeitenwende: Moderne', 4, ['praezisionswerkzeug', 'gewehrkavallerie', 'stahlverarbeitung', 'sprengstoff', 'wirtschaftslehre', 'eisenbahn'], { zeitalter: 5 }, 'Das Zentrum kann in die Moderne aufsteigen.'],

  ['verbrennungsmotor', 'Verbrennungsmotor', 5, ['tor_5'], { sicht: ['oel'], einheiten: ['panzer'] }, 'Öl wird sichtbar. Panzer.'],
  ['flug', 'Flug', 5, ['verbrennungsmotor'], { gebaeude: ['flugfeld'], einheiten: ['doppeldecker'] }, 'Flugfeld und Doppeldecker.'],
  ['maschinengewehr', 'Maschinengewehr', 5, ['tor_5'], { einheiten: ['mgtrupp'], gebaeude: ['bunker'] }, 'MG-Trupps und MG-Bunker.'],
  ['wehrpflicht', 'Wehrpflicht', 5, ['tor_5'], { einheiten: ['infanterie'], platz: 0.1 }, 'Infanterie. 10 % mehr Platz in Unterkünften.'],
  ['panzerabwehrtaktik', 'Panzerabwehr', 5, ['wehrpflicht'], { einheiten: ['panzerabwehr'] }, 'Panzerabwehr-Trupps.'],
  ['haubitzen', 'Schwere Geschütze', 5, ['verbrennungsmotor'], { einheiten: ['haubitze'] }, 'Haubitzen.'],
  ['flak', 'Flugabwehr', 5, ['flug'], { gebaeude: ['flak'] }, 'Flak-Stellungen gegen Flugzeuge.'],
  ['funk', 'Funk', 5, ['tor_5'], { forschung: 0.1 }, '10 % schnelleres Forschen.'],
  ['elektrizitaet', 'Elektrizität', 5, ['funk'], { gold: 0.15, baumeister: 1 }, 'Goldminen fördern 15 % mehr. Ein weiterer Baumeister.'],
  ['tor_6', 'Zeitenwende: Atomzeitalter', 5, ['flak', 'maschinengewehr', 'panzerabwehrtaktik', 'haubitzen', 'elektrizitaet'], { zeitalter: 6 }, 'Das Zentrum kann ins Atomzeitalter aufsteigen.'],

  ['verbundwerkstoffe', 'Verbundwerkstoffe', 6, ['tor_6'], { sicht: ['aluminium'], einheiten: ['mechinfanterie'] }, 'Aluminium wird sichtbar. Mech. Infanterie.'],
  ['kernspaltung', 'Kernspaltung', 6, ['tor_6'], { sicht: ['uran'] }, 'Uran wird sichtbar.'],
  ['raketentechnik', 'Raketentechnik', 6, ['verbundwerkstoffe'], { einheiten: ['raketentrupp', 'raketenartillerie'] }, 'Raketentrupps und Raketenartillerie.'],
  ['duesenantrieb', 'Düsenantrieb', 6, ['verbundwerkstoffe'], { einheiten: ['duesenjaeger'] }, 'Düsenjäger.'],
  ['kampfpanzer', 'Kampfpanzer', 6, ['verbundwerkstoffe'], { einheiten: ['kampfpanzer'] }, 'Kampfpanzer.'],
  ['panzerjaeger', 'Panzerjäger', 6, ['raketentechnik'], { einheiten: ['panzerjaeger'] }, 'Panzerjäger.'],
  ['computer', 'Computer', 6, ['tor_6'], { forschung: 0.15 }, '15 % schnelleres Forschen.'],
  ['tor_7', 'Zeitenwende: Informationszeitalter', 6, ['kernspaltung', 'duesenantrieb', 'kampfpanzer', 'panzerjaeger', 'computer'], { zeitalter: 7 }, 'Das Zentrum kann ins Informationszeitalter aufsteigen.'],

  ['elektronik', 'Mikroelektronik', 7, ['tor_7'], { sicht: ['erden'], einheiten: ['spezialeinheit'] }, 'Seltene Erden werden sichtbar. Spezialeinheiten.'],
  ['tarnkappe', 'Tarnkappentechnik', 7, ['elektronik'], { einheiten: ['tarnkappe'] }, 'Tarnkappenbomber.'],
  ['lenkwaffen', 'Lenkwaffen', 7, ['elektronik'], { einheiten: ['lenkrakete', 'marschflugkoerper'] }, 'Lenkraketentrupps und Marschflugkörper.'],
  ['moderne_panzer', 'Moderne Rüstung', 7, ['elektronik'], { einheiten: ['modpanzer'] }, 'Moderne Panzer.'],
  ['laseroptik', 'Laseroptik', 7, ['tor_7'], { einheiten: ['praezision'] }, 'Präzisionsschützen.'],
  ['internet', 'Internet', 7, ['tor_7'], { forschung: 0.15 }, '15 % schnelleres Forschen.'],
  ['satelliten', 'Satelliten', 7, ['internet'], { kundschafter: 1, handwerkerTempo: 0.25 }, 'Ein weiterer Kundschafter. Handwerker 25 % schneller.'],
  ['tor_8', 'Zeitenwende: KI-Zeitalter', 7, ['tarnkappe', 'lenkwaffen', 'moderne_panzer', 'laseroptik', 'satelliten'], { zeitalter: 8 }, 'Das Zentrum kann ins KI-Zeitalter aufsteigen.'],

  ['halbleiter', 'Halbleiter', 8, ['tor_8'], { sicht: ['silizium'], einheiten: ['exosoldat'] }, 'Silizium wird sichtbar. Exo-Soldaten.'],
  ['maschinenlernen', 'Maschinelles Lernen', 8, ['tor_8'], { forschung: 0.2 }, '20 % schnelleres Forschen.'],
  ['drohnen', 'Drohnentechnik', 8, ['halbleiter'], { einheiten: ['drohnenschwarm', 'kampfdrohne'] }, 'Drohnenschwärme und Kampfdrohnen.'],
  ['robotik', 'Robotik', 8, ['halbleiter'], { einheiten: ['roboläufer', 'autoartillerie'] }, 'Robo-Läufer und autonome Artillerie.'],
  ['stoertechnik', 'Störtechnik', 8, ['halbleiter'], { einheiten: ['stoersender'] }, 'Störsender.'],
  ['gerichteteenergie', 'Gerichtete Energie', 8, ['maschinenlernen'], { gebaeude: ['laserturm'] }, 'Lasertürme.'],
  ['tor_9', 'Zeitenwende: Synthetisches Zeitalter', 8, ['drohnen', 'robotik', 'stoertechnik', 'gerichteteenergie'], { zeitalter: 9 }, 'Das Zentrum kann ins Synthetische Zeitalter aufsteigen.'],

  ['nanotechnik', 'Nanotechnik', 9, ['tor_9'], { sicht: ['nanofasern'], einheiten: ['synthkrieger'] }, 'Nanofasern werden sichtbar. Synth-Krieger.'],
  ['plasmaphysik', 'Plasmaphysik', 9, ['nanotechnik'], { einheiten: ['plasmawerfer'] }, 'Plasmawerfer.'],
  ['schwebetechnik', 'Schwebetechnik', 9, ['nanotechnik'], { einheiten: ['schwebepanzer'] }, 'Schwebepanzer.'],
  ['nanowall', 'Programmierbare Materie', 9, ['nanotechnik'], { einheiten: ['nanowall', 'nanoschwarm'] }, 'Nanowall-Trupps und Nanoschwärme.'],
  ['railgun', 'Elektromagnetik', 9, ['plasmaphysik'], { einheiten: ['railgun'] }, 'Railguns.'],
  ['schildtechnik', 'Schildtechnik', 9, ['tor_9'], { gebaeude: ['schildgen'] }, 'Schildgeneratoren.'],
  ['quantenrechner', 'Quantenrechner', 9, ['tor_9'], { forschung: 0.25 }, '25 % schnelleres Forschen.'],
  ['tor_10', 'Zeitenwende: Interstellares Zeitalter', 9, ['schwebetechnik', 'nanowall', 'railgun', 'schildtechnik', 'quantenrechner'], { zeitalter: 10 }, 'Das Zentrum kann ins Interstellare Zeitalter aufsteigen.'],

  ['fusion', 'Fusionsenergie', 10, ['tor_10'], { sicht: ['helium3'], einheiten: ['sternenlegionaer'] }, 'Helium-3 wird sichtbar. Sternenlegionäre.'],
  ['ionenwaffen', 'Ionenwaffen', 10, ['fusion'], { einheiten: ['ionenkanonier'], gebaeude: ['ionenkanone'] }, 'Ionenkanoniere und die Ionenkanone.'],
  ['gravitation', 'Gravitationstechnik', 10, ['fusion'], { einheiten: ['gravlanzer', 'sturmgleiter'] }, 'Gravitationslanzer und Sturmgleiter.'],
  ['raumfahrt', 'Raumfahrt', 10, ['fusion'], { einheiten: ['raumjaeger', 'orbitalziel'] }, 'Raumjäger und Orbital-Zielgeber.'],
  ['warp', 'Warp-Theorie', 10, ['ionenwaffen', 'gravitation', 'raumfahrt'], { gold: 0.5, forschung: 0.5 }, 'Das Ende der bekannten Wissenschaft. Gold und Forschung +50 %.'],
];
export const FORSCHUNG = {};
const proZeitalter = {};
for (const [id, name, za, vor, eff, text] of T) {
  const i = (proZeitalter[za] = (proZeitalter[za] || 0) + 1) - 1;
  const tempo = 90 * Math.pow(1.7956, za) * (1 + 0.1 * Math.min(za, 4));
  const kosten = Math.max(4, Math.round(TECH_STUNDEN[za] * tempo * (1 + 0.08 * i) * (id.startsWith('tor_') ? 1.4 : 1)));
  FORSCHUNG[id] = { id, name, zeitalter: za, vor, eff, text, kosten };
}
export const FORSCHUNG_IDS = Object.keys(FORSCHUNG);

// Was von Anfang an freigeschaltet ist
export const START_EINHEITEN = ['krieger', 'schleuderer'];
export const START_GEBAEUDE = ['zentrum', 'goldmine', 'schatzkammer', 'handwerkerhuette', 'unterkunft', 'kaserne', 'schiessstand', 'fahne', 'baum'];

export const LAGER_GROESSE = 40; // Felder pro Kante
export const SOFORT_FAKTOR = 4;  // Sofort kaufen kostet so viel mal den Goldpreis (plus Rohstoffe)

export function abwehrMacht(typ, stufe) {
  const a = abwehrWerte(typ, stufe); if (!a) return 0;
  const dps = a.schaden / (a.rate || 1) * (a.flaeche ? 1.8 : 1) * (a.kette || 1) * (a.rate ? 1 : 0.15);
  return Math.sqrt(gebaeudeHp(typ, stufe) * dps * 4) * (a.rw / 5);
}
