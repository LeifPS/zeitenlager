// Spielregeln von Zeitenlager. Läuft gleich im Browser (sofortige Anzeige) und auf dem Server (verbindlich).
// Der Zustand "s" eines Spielers ist ein reines JSON-Objekt. Alle Zeiten in Millisekunden.
import {
  GEBAEUDE, EINHEITEN, FORSCHUNG, ROHSTOFFE, ROHSTOFF_IDS, LINIE_GEBAEUDE, EINHEIT_FOLGE, STUFEN, LAGER_GROESSE,
  START_EINHEITEN, START_GEBAEUDE, SOFORT_FAKTOR, PRODUKTION_MAX_STUNDEN,
  bauKosten, bauZeit, goldProStunde, goldLager, zentrumGoldLager, rohstoffLager, zentrumRohstoffLager, platzVon,
  forschungsTempo, handwerkerTraglast, handwerkerTempo, heilSlots, heilFaktor, ausbildungFaktor, ausbildungsZeitalter,
} from './daten.js';
import { feldRohstoff, sichtbar, abstand, START_SICHT, KUNDSCHAFT_SICHT, HANDWERKER_FELDER_PRO_MIN, KUNDSCHAFTER_FELDER_PRO_MIN } from './karte.js';

export const VERSION = 1;
const H = 3600000;
const MIN = 60000;
export const NEULINGSSCHUTZ = 3 * 24 * H;
export const AUSBILDUNG_MAX = 10; // Plätze in der Warteschlange je Ausbildungs-Stätte
export const FORSCHUNG_SCHLANGE = 3;

// ---------------------------------------------------------------- Neuer Spieler
export function neuerZustand(name, heim, jetzt) {
  const s = {
    v: VERSION, name, erstellt: jetzt, zeit: jetzt, aktiv: jetzt, nid: 1,
    gold: 600, res: {},
    gebaeude: [], einheiten: [], ausbildung: {}, heilung: [], aufruesten: null,
    forschung: { fertig: [], aktiv: null, fortschritt: 0, schlange: [] },
    heim, sicht: [[heim.x, heim.y, START_SICHT]], handwerker: [], kundschafter: [],
    ruhm: 0, schildBis: 0, neulingBis: jetzt + NEULINGSSCHUTZ, kampagne: 0, siege: 0, tutorial: 0, meldungen: [],
  };
  for (const r of ROHSTOFF_IDS) s.res[r] = 0;
  const m = LAGER_GROESSE / 2;
  baueSofort(s, 'zentrum', m - 2, m - 2, 1);
  baueSofort(s, 'goldmine', m + 4, m - 3, 1, jetzt);
  baueSofort(s, 'schatzkammer', m - 7, m - 2, 1);
  baueSofort(s, 'kaserne', m - 2, m + 4, 1);
  baueSofort(s, 'unterkunft', m + 3, m + 3, 1);
  baueSofort(s, 'handwerkerhuette', m - 6, m + 3, 1);
  for (const [x, y] of [[6, 7], [8, 30], [31, 9], [33, 31], [12, 15], [29, 20], [10, 25], [26, 33]]) baueSofort(s, 'baum', x, y, 1);
  for (let i = 0; i < 3; i++) s.einheiten.push({ id: s.nid++, typ: 'krieger', stufe: 0 });
  s.einheiten.push({ id: s.nid++, typ: 'schleuderer', stufe: 0 });
  return s;
}
function baueSofort(s, typ, x, y, stufe, jetzt) {
  const g = { id: s.nid++, typ, x, y, stufe };
  if (typ === 'goldmine') { g.vorrat = 0; g.seit = jetzt || s.zeit; }
  s.gebaeude.push(g);
  return g;
}

// ---------------------------------------------------------------- Abfragen
export function zentrumStufe(s) { const z = s.gebaeude.find((g) => g.typ === 'zentrum'); return z ? z.stufe : 1; }
export function zeitalter(s) { return zentrumStufe(s) - 1; }

/** Alles, was die fertigen Forschungen freischalten und verbessern. */
export function effekte(s) {
  const e = { einheiten: new Set(START_EINHEITEN), gebaeude: new Set(START_GEBAEUDE), sicht: new Set(), gold: 0, forschung: 0, baumeister: 1, handwerker: 0, kundschafter: 1, handwerkerTempo: 0, platz: 0, zeitalterErlaubt: 0 };
  for (const id of s.forschung.fertig) {
    const f = FORSCHUNG[id]; if (!f) continue;
    const x = f.eff;
    (x.einheiten || []).forEach((u) => e.einheiten.add(u));
    (x.gebaeude || []).forEach((u) => e.gebaeude.add(u));
    (x.sicht || []).forEach((u) => e.sicht.add(u));
    for (const k of ['gold', 'forschung', 'baumeister', 'handwerker', 'kundschafter', 'handwerkerTempo', 'platz']) if (x[k]) e[k] += x[k];
    if (x.zeitalter) e.zeitalterErlaubt = Math.max(e.zeitalterErlaubt, x.zeitalter);
  }
  return e;
}

export function fertigeGebaeude(s, typ) { return s.gebaeude.filter((g) => g.typ === typ && g.stufe >= 1); }
export function hoechsteStufe(s, typ) { return fertigeGebaeude(s, typ).reduce((m, g) => Math.max(m, g.stufe), 0); }

export function goldMax(s) {
  let m = zentrumGoldLager(zentrumStufe(s));
  for (const g of fertigeGebaeude(s, 'schatzkammer')) m += goldLager(g.stufe);
  return m;
}
export function rohstoffMax(s) {
  let m = zentrumRohstoffLager(zentrumStufe(s));
  for (const g of fertigeGebaeude(s, 'rohstofflager')) m += rohstoffLager(g.stufe);
  return m;
}
export function platzMax(s, e = effekte(s)) {
  let p = 4;
  for (const g of fertigeGebaeude(s, 'unterkunft')) p += platzVon(g.stufe);
  return Math.floor(p * (1 + e.platz));
}
export function platzBelegt(s, mitAusbildung = true) {
  let p = 0;
  for (const u of s.einheiten) p += EINHEITEN[u.typ].platz;
  if (mitAusbildung) for (const k in s.ausbildung) for (const a of s.ausbildung[k]) p += EINHEITEN[a.typ].platz;
  return p;
}
export function baumeisterFrei(s, e = effekte(s)) { return e.baumeister - s.gebaeude.filter((g) => g.bauBis).length; }
export function forschungsTempoVon(s, e = effekte(s)) { return forschungsTempo(hoechsteStufe(s, 'akademie')) * (1 + e.forschung); }
export function goldRate(s, g, e) { return goldProStunde(g.stufe) * (1 + (e ? e.gold : effekte(s).gold)); }
export function mineInhalt(s, g, t, e) {
  if (g.typ !== 'goldmine' || g.stufe < 1) return 0;
  const rate = goldRate(s, g, e);
  return Math.min(rate * PRODUKTION_MAX_STUNDEN, (g.vorrat || 0) + rate * Math.max(0, t - g.seit) / H);
}
export function handwerkerAnzahl(s, e = effekte(s)) { return fertigeGebaeude(s, 'handwerkerhuette').length + e.handwerker; }
export function handwerkerStufe(s) { const h = fertigeGebaeude(s, 'handwerkerhuette'); return h.length ? Math.round(h.reduce((a, g) => a + g.stufe, 0) / h.length) : 1; }

export function gebaeudeAnzahlErlaubt(s, typ) { return GEBAEUDE[typ].anzahl(zentrumStufe(s)); }
export function gebaeudeMaxStufe(s, typ) { return GEBAEUDE[typ].max(zentrumStufe(s)); }

export function kannBezahlen(s, k) {
  if ((k.gold || 0) > s.gold + 1e-6) return false;
  for (const r in k) if (r !== 'gold' && (k[r] || 0) > (s.res[r] || 0) + 1e-6) return false;
  return true;
}
function bezahle(s, k) { for (const r in k) { if (r === 'gold') s.gold -= k[r]; else s.res[r] -= k[r]; } }
function erstatte(s, k, anteil = 1) {
  for (const r in k) {
    if (r === 'gold') s.gold = Math.min(goldMax(s), s.gold + k[r] * anteil);
    else s.res[r] = Math.min(rohstoffMax(s), (s.res[r] || 0) + k[r] * anteil);
  }
}
export function fehlendText(s, k) {
  const f = [];
  if ((k.gold || 0) > s.gold) f.push('Gold');
  for (const r in k) if (r !== 'gold' && k[r] > (s.res[r] || 0)) f.push(ROHSTOFFE[r].name);
  return f.length ? 'Dir fehlt: ' + f.join(', ') : '';
}
export function sofortGold(restMs, s) {
  const zl = zentrumStufe(s);
  return Math.ceil(restMs / H * goldProStunde(zl * 2) * 2.5) + 20;
}

// ---------------------------------------------------------------- Platzierung
export function belegt(s, ohneId) {
  const N = LAGER_GROESSE, gitter = new Int32Array(N * N);
  for (const g of s.gebaeude) {
    if (g.id === ohneId) continue;
    const gr = GEBAEUDE[g.typ].gr;
    for (let y = g.y; y < g.y + gr; y++) for (let x = g.x; x < g.x + gr; x++) if (x >= 0 && y >= 0 && x < N && y < N) gitter[y * N + x] = g.id;
  }
  return gitter;
}
export function passt(s, typ, x, y, ohneId) {
  const gr = GEBAEUDE[typ].gr, N = LAGER_GROESSE;
  if (x < 1 || y < 1 || x + gr > N - 1 || y + gr > N - 1) return false;
  const gt = belegt(s, ohneId);
  for (let yy = y; yy < y + gr; yy++) for (let xx = x; xx < x + gr; xx++) if (gt[yy * N + xx]) return false;
  return true;
}

// ---------------------------------------------------------------- Zeit vergehen lassen
/** Bringt den Zustand auf Zeitpunkt "jetzt". Ereignisse werden in der richtigen Reihenfolge abgearbeitet. */
export function tick(s, jetzt) {
  if (jetzt <= s.zeit) return s;
  let sicherung = 0;
  for (;;) {
    const ev = naechstesEreignis(s, jetzt);
    const t = ev ? ev.t : jetzt;
    forschungVoran(s, t);
    s.zeit = t;
    if (!ev) break;
    ev.f();
    if (++sicherung > 20000) break;
  }
  s.zeit = jetzt;
  return s;
}

function forschungVoran(s, t) {
  const f = s.forschung;
  if (f.aktiv && t > s.zeit) f.fortschritt += forschungsTempoVon(s) * (t - s.zeit) / H;
}

function naechstesEreignis(s, bis) {
  let best = null;
  const nimm = (t, f) => { if (t <= bis && (!best || t < best.t)) best = { t: Math.max(t, s.zeit), f }; };
  for (const g of s.gebaeude) if (g.bauBis) nimm(g.bauBis, () => bauFertig(s, g));
  for (const k in s.ausbildung) {
    const q = s.ausbildung[k];
    if (q.length && q[0].bis) nimm(q[0].bis, () => ausbildungFertig(s, k));
  }
  for (const h of s.heilung) nimm(h.bis, () => heilungFertig(s, h));
  if (s.aufruesten) nimm(s.aufruesten.bis, () => aufruestenFertig(s));
  const f = s.forschung;
  if (f.aktiv) {
    const rest = FORSCHUNG[f.aktiv].kosten - f.fortschritt;
    const tempo = forschungsTempoVon(s);
    nimm(s.zeit + Math.max(0, rest) / tempo * H, () => forschungFertig(s));
  }
  for (const h of s.handwerker) nimm(h.naechste, () => handwerkerSchritt(s, h));
  for (const k of s.kundschafter) nimm(k.naechste, () => kundschafterSchritt(s, k));
  return best;
}

function melde(s, text, art = 'info') {
  s.meldungen.push({ t: s.zeit, text, art });
  if (s.meldungen.length > 40) s.meldungen.splice(0, s.meldungen.length - 40);
}

function bauFertig(s, g) {
  if (g.typ === 'goldmine') { g.vorrat = mineInhalt(s, g, s.zeit); g.seit = s.zeit; }
  g.stufe += 1; delete g.bauBis; delete g.bauStart;
  melde(s, `${GEBAEUDE[g.typ].name} ${g.stufe === 1 ? 'fertig gebaut' : 'auf Stufe ' + g.stufe}`, 'bau');
  if (g.typ === 'heilhaus') heilungStarten(s);
  for (const k in s.ausbildung) ausbildungStarten(s, k);
}

function ausbildungFertig(s, k) {
  const q = s.ausbildung[k];
  const a = q.shift();
  s.einheiten.push({ id: s.nid++, typ: a.typ, stufe: 0 });
  ausbildungStarten(s, k);
}
function ausbildungStarten(s, k) {
  const q = s.ausbildung[k];
  if (!q || !q.length || q[0].bis) return;
  const g = s.gebaeude.find((x) => String(x.id) === String(k));
  const f = g ? ausbildungFaktor(Math.max(1, g.stufe)) : 1;
  q[0].start = s.zeit; q[0].bis = s.zeit + EINHEITEN[q[0].typ].zeit * 1000 * f;
}

function heilDauer(s, u) {
  const hs = hoechsteStufe(s, 'heilhaus');
  return EINHEITEN[u.typ].zeit * 1000 * heilFaktor(hs) * (1 + u.stufe * 0.6);
}
export function heilKosten(u) { return Math.round(EINHEITEN[u.typ].kosten.gold * 0.25 * (1 + u.stufe)); }
function heilungStarten(s) {
  const slots = heilSlots(hoechsteStufe(s, 'heilhaus'));
  while (s.heilung.length < slots) {
    const u = s.einheiten.find((x) => x.verwundet && !s.heilung.some((h) => h.eid === x.id));
    if (!u) break;
    s.heilung.push({ eid: u.id, start: s.zeit, bis: s.zeit + heilDauer(s, u) });
  }
}
function heilungFertig(s, h) {
  s.heilung = s.heilung.filter((x) => x !== h);
  const u = s.einheiten.find((x) => x.id === h.eid);
  if (u) delete u.verwundet;
  heilungStarten(s);
}

function aufruestenFertig(s) {
  const a = s.aufruesten; s.aufruesten = null;
  const u = s.einheiten.find((x) => x.id === a.eid);
  if (u) { u.typ = a.ziel; delete u.gesperrt; melde(s, `Aufgerüstet: ${EINHEITEN[a.ziel].name}`, 'einheit'); }
}

function forschungFertig(s) {
  const f = s.forschung;
  const id = f.aktiv;
  f.fertig.push(id); f.aktiv = null; f.fortschritt = 0;
  melde(s, `Erforscht: ${FORSCHUNG[id].name}`, 'forschung');
  naechsteForschung(s);
}
function naechsteForschung(s) {
  const f = s.forschung;
  if (f.aktiv) return;
  const i = f.schlange.findIndex((id) => FORSCHUNG[id].vor.every((v) => f.fertig.includes(v)));
  if (i >= 0) { f.aktiv = f.schlange.splice(i, 1)[0]; f.fortschritt = 0; }
}

// Handwerker: hin -> arbeiten -> zurück -> abliefern, dann wieder hin (solange der Spieler in den letzten 2 Std da war)
export function wegDauer(s, ziel, proMin, e = effekte(s)) {
  return abstand(s.heim, ziel) / (proMin * (1 + e.handwerkerTempo)) * MIN;
}
function handwerkerSchritt(s, h) {
  const e = effekte(s);
  if (h.phase === 'hin') { h.phase = 'arbeit'; h.naechste = s.zeit + ROHSTOFFE[h.res].dauer * MIN / handwerkerTempo(handwerkerStufe(s)); }
  else if (h.phase === 'arbeit') { h.phase = 'zurueck'; h.naechste = s.zeit + wegDauer(s, h, HANDWERKER_FELDER_PRO_MIN * handwerkerTempo(handwerkerStufe(s)), e); }
  else if (h.phase === 'zurueck') {
    const menge = Math.round(ROHSTOFFE[h.res].ladung * handwerkerTraglast(handwerkerStufe(s)));
    s.res[h.res] = Math.min(rohstoffMax(s), (s.res[h.res] || 0) + menge);
    h.geliefert = (h.geliefert || 0) + menge;
    if (h.stopp || s.zeit - s.aktiv > PRODUKTION_MAX_STUNDEN * H) { s.handwerker = s.handwerker.filter((x) => x !== h); return; }
    h.phase = 'hin'; h.naechste = s.zeit + wegDauer(s, h, HANDWERKER_FELDER_PRO_MIN * handwerkerTempo(handwerkerStufe(s)), e);
  }
}
function kundschafterSchritt(s, k) {
  if (k.phase === 'hin') {
    s.sicht.push([k.x, k.y, KUNDSCHAFT_SICHT]);
    if (s.sicht.length > 400) s.sicht.splice(1, 1);
    k.phase = 'zurueck'; k.naechste = s.zeit + wegDauer(s, k, KUNDSCHAFTER_FELDER_PRO_MIN);
    melde(s, 'Ein Kundschafter hat neues Land erkundet.', 'karte');
  } else s.kundschafter = s.kundschafter.filter((x) => x !== k);
}

// ---------------------------------------------------------------- Aktionen
// Jede Aktion: aktion(s, {art, ...}, jetzt) -> { ok: true } oder { ok: false, fehler }
const nein = (fehler) => ({ ok: false, fehler });

export function aktion(s, a, jetzt) {
  tick(s, jetzt);
  s.aktiv = jetzt;
  const f = AKTIONEN[a && a.art];
  if (!f) return nein('Unbekannte Aktion.');
  const r = f(s, a, jetzt);
  return r || { ok: true };
}

const AKTIONEN = {
  bauen(s, a) {
    const g = GEBAEUDE[a.typ]; if (!g) return nein('Unbekanntes Gebäude.');
    const e = effekte(s);
    if (!e.gebaeude.has(a.typ)) return nein('Noch nicht erforscht.');
    if (s.gebaeude.filter((x) => x.typ === a.typ).length >= gebaeudeAnzahlErlaubt(s, a.typ)) return nein('Du hast schon so viele davon, wie dein Zentrum erlaubt.');
    if (!passt(s, a.typ, a.x | 0, a.y | 0)) return nein('Hier ist kein Platz.');
    const zeit = bauZeit(a.typ, 1);
    if (zeit > 0 && baumeisterFrei(s, e) < 1) return nein('Alle Baumeister sind beschäftigt.');
    const k = bauKosten(a.typ, 1);
    if (!kannBezahlen(s, k)) return nein(fehlendText(s, k));
    bezahle(s, k);
    const neu = { id: s.nid++, typ: a.typ, x: a.x | 0, y: a.y | 0, stufe: 0 };
    if (a.typ === 'goldmine') { neu.vorrat = 0; neu.seit = s.zeit; }
    s.gebaeude.push(neu);
    if (zeit > 0) { neu.bauStart = s.zeit; neu.bauBis = s.zeit + zeit * 1000; } else bauFertig(s, neu);
    return { ok: true, id: neu.id };
  },
  ausbauen(s, a) {
    const g = s.gebaeude.find((x) => x.id === a.id); if (!g) return nein('Gebäude nicht gefunden.');
    if (g.bauBis) return nein('Wird schon gebaut.');
    const ziel = g.stufe + 1;
    if (g.typ === 'zentrum') {
      if (effekte(s).zeitalterErlaubt < g.stufe) return nein('Erforsche zuerst die Zeitenwende ins nächste Zeitalter.');
    } else if (ziel > gebaeudeMaxStufe(s, g.typ)) return nein('Baue zuerst dein Zentrum aus.');
    if (ziel > GEBAEUDE[g.typ].max(11)) return nein('Höchste Stufe erreicht.');
    const zeit = bauZeit(g.typ, ziel);
    if (zeit > 0 && baumeisterFrei(s) < 1) return nein('Alle Baumeister sind beschäftigt.');
    const k = bauKosten(g.typ, ziel);
    if (!kannBezahlen(s, k)) return nein(fehlendText(s, k));
    bezahle(s, k);
    if (zeit > 0) { g.bauStart = s.zeit; g.bauBis = s.zeit + zeit * 1000; } else bauFertig(s, g);
  },
  sofortBau(s, a) {
    const g = s.gebaeude.find((x) => x.id === a.id); if (!g || !g.bauBis) return nein('Hier wird nichts gebaut.');
    const preis = sofortGold(g.bauBis - s.zeit, s);
    if (s.gold < preis) return nein('Dir fehlt Gold.');
    s.gold -= preis; g.bauBis = s.zeit; tick(s, s.zeit + 1);
  },
  verschieben(s, a) {
    const g = s.gebaeude.find((x) => x.id === a.id); if (!g) return nein('Gebäude nicht gefunden.');
    if (!passt(s, g.typ, a.x | 0, a.y | 0, g.id)) return nein('Hier ist kein Platz.');
    g.x = a.x | 0; g.y = a.y | 0;
  },
  abreissen(s, a) {
    const g = s.gebaeude.find((x) => x.id === a.id); if (!g) return nein('Gebäude nicht gefunden.');
    if (!['baum', 'fahne', 'statue', 'mauer', 'falle'].includes(g.typ)) return nein('Dieses Gebäude kann man nicht abreißen.');
    s.gebaeude = s.gebaeude.filter((x) => x !== g);
  },
  einsammeln(s, a) {
    const e = effekte(s);
    let summe = 0;
    const max = goldMax(s);
    for (const g of s.gebaeude) {
      if (g.typ !== 'goldmine' || g.stufe < 1 || (a.id && g.id !== a.id)) continue;
      const inh = mineInhalt(s, g, s.zeit, e);
      const nimm = Math.max(0, Math.min(inh, max - s.gold - summe));
      summe += nimm;
      g.vorrat = inh - nimm; g.seit = s.zeit;
    }
    s.gold += summe;
    return { ok: true, menge: Math.floor(summe) };
  },
  ausbilden(s, a) {
    const d = EINHEITEN[a.typ]; if (!d) return nein('Unbekannte Einheit.');
    if (!effekte(s).einheiten.has(a.typ)) return nein('Noch nicht erforscht.');
    const g = ausbildungsStaette(s, d);
    if (!g) return nein(`Baue zuerst: ${GEBAEUDE[LINIE_GEBAEUDE[d.linie]].name}.`);
    if (ausbildungsZeitalter(g.stufe) < d.zeitalter) return nein(`${GEBAEUDE[g.typ].name} muss mindestens Stufe ${d.zeitalter * 2 + 1} haben.`);
    const q = (s.ausbildung[g.id] = s.ausbildung[g.id] || []);
    if (q.length >= AUSBILDUNG_MAX) return nein('Die Warteschlange ist voll.');
    if (platzBelegt(s) + d.platz > platzMax(s)) return nein('Kein Platz mehr im Lager. Baue Unterkünfte aus oder merge Einheiten.');
    if (!kannBezahlen(s, d.kosten)) return nein(fehlendText(s, d.kosten));
    bezahle(s, d.kosten);
    q.push({ typ: a.typ });
    ausbildungStarten(s, g.id);
  },
  ausbildungAbbrechen(s, a) {
    const q = s.ausbildung[a.gid]; if (!q || !q[a.i]) return nein('Nichts zum Abbrechen.');
    const [x] = q.splice(a.i, 1);
    erstatte(s, EINHEITEN[x.typ].kosten);
    ausbildungStarten(s, a.gid);
  },
  sofortKaufen(s, a) {
    const d = EINHEITEN[a.typ]; if (!d) return nein('Unbekannte Einheit.');
    if (!effekte(s).einheiten.has(a.typ)) return nein('Noch nicht erforscht.');
    const g = ausbildungsStaette(s, d);
    if (!g || ausbildungsZeitalter(g.stufe) < d.zeitalter) return nein('Deine Ausbildungs-Stätte ist zu niedrig.');
    if (platzBelegt(s) + d.platz > platzMax(s)) return nein('Kein Platz mehr im Lager.');
    const k = sofortKosten(d);
    if (!kannBezahlen(s, k)) return nein(fehlendText(s, k));
    bezahle(s, k);
    s.einheiten.push({ id: s.nid++, typ: a.typ, stufe: 0 });
  },
  sofortAusbildung(s, a) {
    const q = s.ausbildung[a.gid]; if (!q || !q[0] || !q[0].bis) return nein('Nichts in Ausbildung.');
    const preis = sofortGold(q[0].bis - s.zeit, s);
    if (s.gold < preis) return nein('Dir fehlt Gold.');
    s.gold -= preis; q[0].bis = s.zeit; tick(s, s.zeit + 1);
  },
  mergen(s, a) {
    const x = s.einheiten.find((u) => u.id === a.a), y = s.einheiten.find((u) => u.id === a.b);
    if (!x || !y || x === y) return nein('Einheit nicht gefunden.');
    if (x.typ !== y.typ) return nein('Nur gleiche Einheiten lassen sich mergen.');
    if (x.stufe !== y.stufe) return nein('Nur Einheiten gleicher Stufe lassen sich mergen.');
    if (x.verwundet || y.verwundet) return nein('Verwundete Einheiten müssen erst geheilt werden.');
    if (x.gesperrt || y.gesperrt) return nein('Diese Einheit wird gerade aufgerüstet.');
    if (x.stufe >= STUFEN.length - 1) return nein('Legende ist die höchste Stufe.');
    s.einheiten = s.einheiten.filter((u) => u !== y);
    x.stufe += 1;
    return { ok: true, id: x.id, stufe: x.stufe };
  },
  entlassen(s, a) {
    const u = s.einheiten.find((x) => x.id === a.id); if (!u) return nein('Einheit nicht gefunden.');
    if (u.gesperrt) return nein('Diese Einheit wird gerade aufgerüstet.');
    s.einheiten = s.einheiten.filter((x) => x !== u);
    s.heilung = s.heilung.filter((h) => h.eid !== u.id);
    heilungStarten(s);
  },
  sofortHeilen(s, a) {
    const u = s.einheiten.find((x) => x.id === a.id); if (!u || !u.verwundet) return nein('Diese Einheit ist nicht verwundet.');
    const h = s.heilung.find((x) => x.eid === u.id);
    const rest = h ? h.bis - s.zeit : heilDauer(s, u);
    const preis = sofortGold(rest, s) + heilKosten(u);
    if (s.gold < preis) return nein('Dir fehlt Gold.');
    s.gold -= preis; delete u.verwundet;
    s.heilung = s.heilung.filter((x) => x.eid !== u.id);
    heilungStarten(s);
  },
  forschen(s, a) {
    const t = FORSCHUNG[a.id]; if (!t) return nein('Unbekannte Forschung.');
    const f = s.forschung;
    if (f.fertig.includes(a.id) || f.aktiv === a.id || f.schlange.includes(a.id)) return nein('Schon erforscht oder geplant.');
    const bekannt = new Set([...f.fertig, ...f.schlange, f.aktiv]);
    if (!t.vor.every((v) => bekannt.has(v))) return nein('Erforsche zuerst die Voraussetzungen.');
    if (!t.id.startsWith('tor_') && t.zeitalter > zeitalter(s)) return nein('Bring dein Zentrum zuerst in dieses Zeitalter.');
    if (f.aktiv && f.schlange.length >= FORSCHUNG_SCHLANGE) return nein('Die Warteschlange ist voll (3).');
    f.schlange.push(a.id);
    naechsteForschung(s);
  },
  forschungEntfernen(s, a) {
    const f = s.forschung;
    const raus = new Set([a.id]);
    let neu = true;
    while (neu) { neu = false; for (const id of f.schlange) if (!raus.has(id) && FORSCHUNG[id].vor.some((v) => raus.has(v))) { raus.add(id); neu = true; } }
    f.schlange = f.schlange.filter((id) => !raus.has(id));
    if (f.aktiv && raus.has(f.aktiv)) { f.aktiv = null; f.fortschritt = 0; naechsteForschung(s); }
  },
  aufruesten(s, a) {
    const u = s.einheiten.find((x) => x.id === a.id); if (!u) return nein('Einheit nicht gefunden.');
    if (!fertigeGebaeude(s, 'ruestkammer').length) return nein('Baue zuerst eine Rüstkammer.');
    if (s.aufruesten) return nein('Die Rüstkammer ist beschäftigt.');
    if (u.verwundet) return nein('Verwundete Einheiten müssen erst geheilt werden.');
    const ziel = EINHEIT_FOLGE[u.typ];
    if (!ziel) return nein('Für diese Einheit gibt es keine bessere.');
    if (!effekte(s).einheiten.has(ziel)) return nein(`Erforsche zuerst: ${EINHEITEN[ziel].name}.`);
    const k = aufruestKosten(u);
    if (!kannBezahlen(s, k)) return nein(fehlendText(s, k));
    bezahle(s, k);
    u.gesperrt = true;
    s.aufruesten = { eid: u.id, ziel, start: s.zeit, bis: s.zeit + aufruestDauer(s, u) };
  },
  handwerkerSchicken(s, a) {
    const e = effekte(s);
    const x = a.x | 0, y = a.y | 0;
    const res = feldRohstoff(x, y);
    if (!res || !e.sicht.has(res)) return nein('Hier gibt es keinen bekannten Rohstoff.');
    if (!sichtbar(s.sicht, x, y)) return nein('Dieses Feld ist noch nicht erkundet.');
    if (s.handwerker.filter((h) => !h.stopp).length >= handwerkerAnzahl(s, e)) return nein('Alle Handwerker sind unterwegs. Baue weitere Handwerkerhütten.');
    const h = { id: s.nid++, x, y, res, phase: 'hin', start: s.zeit };
    h.naechste = s.zeit + wegDauer(s, h, HANDWERKER_FELDER_PRO_MIN * handwerkerTempo(handwerkerStufe(s)), e);
    s.handwerker.push(h);
  },
  handwerkerZurueck(s, a) {
    const h = s.handwerker.find((x) => x.id === a.id); if (!h) return nein('Handwerker nicht gefunden.');
    h.stopp = true;
  },
  kundschafterSchicken(s, a) {
    const e = effekte(s);
    if (s.kundschafter.length >= e.kundschafter) return nein('Alle Kundschafter sind unterwegs.');
    const k = { id: s.nid++, x: a.x | 0, y: a.y | 0, phase: 'hin', start: s.zeit };
    if (abstand(s.heim, k) > 80) return nein('So weit kann ein Kundschafter nicht laufen.');
    k.naechste = s.zeit + wegDauer(s, k, KUNDSCHAFTER_FELDER_PRO_MIN, e);
    s.kundschafter.push(k);
  },
  tutorial(s, a) { s.tutorial = Math.max(s.tutorial, a.schritt | 0); },
  meldungenGelesen(s) { s.meldungen = []; },
};

export function ausbildungsStaette(s, d) {
  const typ = LINIE_GEBAEUDE[d.linie];
  return fertigeGebaeude(s, typ).sort((a, b) => b.stufe - a.stufe)[0] || null;
}
export function sofortKosten(d) {
  const k = { ...d.kosten }; k.gold = d.kosten.gold * SOFORT_FAKTOR; return k;
}
export function aufruestKosten(u) {
  const z = EINHEITEN[EINHEIT_FOLGE[u.typ]];
  const f = Math.pow(1.7, u.stufe);
  const k = { gold: Math.round(z.kosten.gold * 2 * f) };
  for (const r in z.kosten) if (r !== 'gold') k[r] = Math.ceil(z.kosten[r] * f);
  return k;
}
export function aufruestDauer(s, u) {
  const z = EINHEITEN[EINHEIT_FOLGE[u.typ]];
  const rk = hoechsteStufe(s, 'ruestkammer');
  return z.zeit * 1000 * 3 * (1 + u.stufe * 0.5) / (1 + 0.08 * (rk - 1));
}
export function heilDauerVon(s, u) { return heilDauer(s, u); }

/** Gesamtstärke der gesunden Armee (für Gegner-Auswahl und Anzeige) */
export function armeeMacht(s, macht) {
  let m = 0;
  for (const u of s.einheiten) if (!u.verwundet) m += macht(u.typ, u.stufe);
  return m;
}

/** Wird nach einem Kampf aufgerufen: gefallene Einheiten verwunden, Beute gutschreiben */
export function kampfAuswerten(s, gefalleneIds, beute) {
  const gef = new Set(gefalleneIds);
  for (const u of s.einheiten) if (gef.has(u.id)) u.verwundet = true;
  if (beute) {
    if (beute.gold) s.gold = Math.min(goldMax(s), s.gold + beute.gold);
    for (const r in beute) if (r !== 'gold' && r !== 'ruhm') s.res[r] = Math.min(rohstoffMax(s), (s.res[r] || 0) + beute[r]);
  }
  heilungStarten(s);
}
export function heilungAnstossen(s) { heilungStarten(s); }

/** Beute, die ein Angreifer maximal holen kann (Anteil am ungeschützten Lager) */
export function pluenderbar(s) {
  const geschuetzt = Math.min(s.gold, goldMax(s) * 0.25);
  const r = { gold: Math.floor((s.gold - geschuetzt) * 0.2) };
  let minen = 0; const e = effekte(s);
  for (const g of fertigeGebaeude(s, 'goldmine')) minen += mineInhalt(s, g, s.zeit, e);
  r.gold += Math.floor(minen * 0.5);
  for (const id of ROHSTOFF_IDS) if (s.res[id] > 0) r[id] = Math.floor(s.res[id] * 0.12);
  return r;
}
export function pluendern(s, anteil) {
  const p = pluenderbar(s);
  const e = effekte(s);
  const verlust = {};
  // Minen zuerst
  let ausMinen = 0;
  for (const g of fertigeGebaeude(s, 'goldmine')) {
    const inh = mineInhalt(s, g, s.zeit, e);
    const n = inh * 0.5 * anteil; ausMinen += n;
    g.vorrat = inh - n; g.seit = s.zeit;
  }
  const ausLager = Math.min(s.gold, Math.max(0, Math.floor((s.gold - Math.min(s.gold, goldMax(s) * 0.25)) * 0.2 * anteil)));
  s.gold -= ausLager;
  verlust.gold = Math.floor(ausMinen + ausLager);
  for (const id of ROHSTOFF_IDS) if (p[id]) { const n = Math.floor(p[id] * anteil); s.res[id] -= n; if (n) verlust[id] = n; }
  return verlust;
}
