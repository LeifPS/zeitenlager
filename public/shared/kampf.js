// Deterministische Kampfsimulation (Auto-Kampf). Läuft auf dem Server (verbindliches Ergebnis)
// und im Browser (Anzeige) mit denselben Eingaben und demselben Zufall.
import { GEBAEUDE, EINHEITEN, LINIEN, LAGER_GROESSE, einheitWerte, gebaeudeHp, abwehrWerte } from './daten.js';

const N = LAGER_GROESSE;
export const KAMPF_DAUER = 180; // Sekunden
export const DT = 0.1;
const AGGRO_V = 7, AGGRO_A = 3.5;
const OHNE_WERTUNG = new Set(['mauer', 'falle', 'baum', 'fahne', 'statue']);

export function zufall(saat) {
  let a = saat >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

class Haufen { // Min-Heap für Dijkstra
  constructor() { this.k = []; this.v = []; this.n = 0; }
  rein(k, v) {
    let i = this.n++; this.k[i] = k; this.v[i] = v;
    while (i > 0) { const p = (i - 1) >> 1; if (this.k[p] <= k) break; this.k[i] = this.k[p]; this.v[i] = this.v[p]; i = p; }
    this.k[i] = k; this.v[i] = v;
  }
  raus() {
    const k0 = this.k[0], v0 = this.v[0];
    const n = --this.n; const k = this.k[n], v = this.v[n];
    let i = 0;
    for (;;) { let c = 2 * i + 1; if (c >= n) break; if (c + 1 < n && this.k[c + 1] < this.k[c]) c++; if (this.k[c] >= k) break; this.k[i] = this.k[c]; this.v[i] = this.v[c]; i = c; }
    this.k[i] = k; this.v[i] = v;
    return [k0, v0];
  }
}

export const SEITEN = { ol: 'links', or: 'oben', ur: 'rechts', ul: 'unten' };

/**
 * eingabe: { saat, seite, angreifer: [{id, typ, stufe}], basis: { gebaeude: [{id, typ, x, y, stufe}], einheiten: [{id, typ, stufe}] } }
 */
export class Kampf {
  constructor(eingabe) {
    this.e = eingabe;
    this.rnd = zufall(eingabe.saat || 1);
    this.zeit = 0; this.ende = false; this.ereignisse = [];
    this.gebaeude = []; this.einheiten = [];
    this.gitter = new Int32Array(N * N).fill(-1); // Index des Gebäudes oder -1
    for (const g of eingabe.basis.gebaeude) {
      const d = GEBAEUDE[g.typ]; if (!d || g.stufe < 1) continue;
      if (d.kat === 'deko' && g.typ !== 'statue') continue;
      const hp = gebaeudeHp(g.typ, g.stufe);
      const b = { i: this.gebaeude.length, id: g.id, typ: g.typ, x: g.x, y: g.y, gr: d.gr, stufe: g.stufe, hp, max: hp, schild: 0, cd: 0, weg: false, mauer: !!d.mauer, falle: !!d.falle, scharf: true, abwehr: abwehrWerte(g.typ, g.stufe), wertung: !OHNE_WERTUNG.has(g.typ) };
      this.gebaeude.push(b);
      if (!b.falle) for (let y = g.y; y < g.y + d.gr; y++) for (let x = g.x; x < g.x + d.gr; x++) if (x >= 0 && y >= 0 && x < N && y < N) this.gitter[y * N + x] = b.i;
    }
    // Schilde
    for (const s of this.gebaeude) if (GEBAEUDE[s.typ].schild) {
      const sc = GEBAEUDE[s.typ].schild;
      for (const b of this.gebaeude) if (b !== s && !b.mauer && this.abstandGeb(s.x + s.gr / 2, s.y + s.gr / 2, b) <= sc.rw) b.schild = Math.max(b.schild, b.max * sc.anteil);
    }
    this.wertungGesamt = this.gebaeude.filter((b) => b.wertung).length || 1;
    this.zentrum = this.gebaeude.find((b) => b.typ === 'zentrum');
    this.aufstellen();
    this.felder = new Map();
  }

  // ---------------------------------------- Aufstellung
  aufstellen() {
    const A = this.e.angreifer.map((u) => ({ ...u, d: EINHEITEN[u.typ] })).filter((u) => u.d);
    const reihe = (u) => ({ nahkampf: 0, speer: 0, kav: 0, fern: 1, luft: 1, belagerung: 2 })[u.d.linie];
    A.sort((a, b) => reihe(a) - reihe(b) || a.id - b.id);
    const proReihe = [[], [], []];
    for (const u of A) proReihe[reihe(u)].push(u);
    const seite = this.e.seite || 'ul';
    // Aufstellung kurz vor dem Dorf (nicht am Kartenrand)
    let bx0 = N, by0 = N, bx1 = 0, by1 = 0;
    for (const b of this.gebaeude) { bx0 = Math.min(bx0, b.x); by0 = Math.min(by0, b.y); bx1 = Math.max(bx1, b.x + b.gr); by1 = Math.max(by1, b.y + b.gr); }
    if (bx1 <= bx0) { bx0 = by0 = 8; bx1 = by1 = N - 8; }
    const abstand = { ol: bx0, or: by0, ur: N - bx1, ul: N - by1 }[seite];
    const versatz = Math.max(0, abstand - 3.2);
    for (let r = 0; r < 3; r++) {
      const liste = proReihe[r];
      const breite = Math.min(N - 6, Math.max(4, liste.length * 0.9));
      liste.forEach((u, k) => {
        const t = liste.length === 1 ? 0.5 : k / (liste.length - 1);
        const quer = N / 2 - breite / 2 + t * breite + (this.rnd() - 0.5) * 0.4;
        const tief = versatz + 0.6 + (2 - r) * 1.1 + this.rnd() * 0.3;
        let x, y;
        if (seite === 'ol') { x = tief; y = quer; } else if (seite === 'or') { x = quer; y = tief; } else if (seite === 'ur') { x = N - tief; y = quer; } else { x = quer; y = N - tief; }
        this.neueEinheit('a', u, x, y);
      });
    }
    // Verteidiger um das Zentrum
    const mitte = this.zentrum ? [this.zentrum.x + 2, this.zentrum.y + 2] : [N / 2, N / 2];
    for (const u of this.e.basis.einheiten || []) {
      if (!EINHEITEN[u.typ]) continue;
      let x = mitte[0], y = mitte[1];
      for (let k = 0; k < 40; k++) {
        const w = this.rnd() * Math.PI * 2, r = 2.5 + this.rnd() * 5;
        const nx = mitte[0] + Math.cos(w) * r, ny = mitte[1] + Math.sin(w) * r;
        if (this.begehbar(nx, ny)) { x = nx; y = ny; break; }
      }
      this.neueEinheit('v', u, x, y);
    }
  }
  neueEinheit(seite, u, x, y) {
    const d = EINHEITEN[u.typ], L = LINIEN[d.linie], w = einheitWerte(u.typ, u.stufe);
    this.einheiten.push({ i: this.einheiten.length, id: u.id, seite, typ: u.typ, stufe: u.stufe, linie: d.linie, za: d.zeitalter, hp: w.hp, max: w.hp, schaden: w.schaden, rw: d.rw, tempo: d.tempo, rate: L.rate, flug: !!L.flug, trifftLuft: !!L.trifftLuft, nurGeb: !!L.nurGebaeude, gegen: L.gegen || {}, gegenGeb: L.gegenGebaeude || 1, flaeche: d.zeitalter >= 1 ? L.flaeche || 0 : 0, x, y, cd: 0.3 + this.rnd() * 0.6, ziel: null, tot: false, aktiv: seite === 'a', dir: 1, laeuft: false, phase: this.rnd() });
  }

  // ---------------------------------------- Hilfen
  begehbar(x, y) { const ix = Math.floor(x), iy = Math.floor(y); if (ix < 0 || iy < 0 || ix >= N || iy >= N) return ix >= -2 && iy >= -2 && ix < N + 2 && iy < N + 2; const g = this.gitter[iy * N + ix]; return g < 0; }
  abstandGeb(x, y, b) { const dx = Math.max(b.x - x, 0, x - (b.x + b.gr)), dy = Math.max(b.y - y, 0, y - (b.y + b.gr)); return Math.sqrt(dx * dx + dy * dy); }
  lebende(seite) { return this.einheiten.filter((u) => !u.tot && u.seite === seite); }

  // Abstandsfeld (Dijkstra) zu einem Gebäude: Mauern kosten extra, andere Gebäude sind gesperrt
  feld(b) {
    let f = this.felder.get(b.i);
    if (f) return f;
    f = new Float64Array(N * N).fill(1e9);
    const offen = [];
    for (let y = b.y - 1; y <= b.y + b.gr; y++) for (let x = b.x - 1; x <= b.x + b.gr; x++) {
      if (x < 0 || y < 0 || x >= N || y >= N) continue;
      const g = this.gitter[y * N + x];
      if (g === b.i) continue;
      if (g >= 0 && !this.gebaeude[g].mauer) continue;
      const k = g >= 0 ? 8 : 0;
      if (k < f[y * N + x]) { f[y * N + x] = k; offen.push(y * N + x); }
    }
    // einfache Prioritätsliste (Bucket-artig über Sortierung, Feld ist klein)
    const nb = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, 1.42], [1, -1, 1.42], [-1, 1, 1.42], [-1, -1, 1.42]];
    const q = new Haufen();
    for (const i of offen) q.rein(f[i], i);
    while (q.n) {
      const [d, i] = q.raus();
      if (d > f[i]) continue;
      const x = i % N, y = (i - x) / N;
      for (const [dx, dy, c] of nb) {
        const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= N || ny >= N) continue;
        const j = ny * N + nx, g = this.gitter[j];
        if (g === b.i) continue;
        if (g >= 0 && !this.gebaeude[g].mauer) continue;
        if (dx && dy) { const a1 = this.gitter[y * N + nx], a2 = this.gitter[ny * N + x]; if ((a1 >= 0 && a1 !== b.i) || (a2 >= 0 && a2 !== b.i)) continue; }
        const nd = d + c + (g >= 0 ? 8 : 0);
        if (nd < f[j]) { f[j] = nd; q.rein(nd, j); }
      }
    }
    this.felder.set(b.i, f);
    return f;
  }
  feldWert(f, x, y) { const ix = Math.max(0, Math.min(N - 1, Math.floor(x))), iy = Math.max(0, Math.min(N - 1, Math.floor(y))); return f[iy * N + ix] + (x < 0 || y < 0 || x >= N || y >= N ? 2 : 0); }

  // ---------------------------------------- Ablauf
  schritt() {
    if (this.ende) return;
    this.ereignisse = [];
    this.zeit += DT;
    for (const u of this.einheiten) if (!u.tot) this.einheitDenken(u);
    for (const b of this.gebaeude) if (!b.weg && (b.abwehr)) this.abwehrDenken(b);
    // Ende?
    const angreiferDa = this.einheiten.some((u) => !u.tot && u.seite === 'a');
    const reste = this.gebaeude.some((b) => !b.weg && b.wertung);
    if (!angreiferDa || !reste || this.zeit >= KAMPF_DAUER) this.ende = true;
  }
  bisEnde() { let n = 0; while (!this.ende && n++ < KAMPF_DAUER / DT + 10) this.schritt(); return this.ergebnis(); }

  einheitDenken(u) {
    u.cd -= DT;
    const feinde = this.einheiten;
    // Verteidiger warten, bis jemand nahe kommt
    if (u.seite === 'v' && !u.aktiv) {
      for (const f of feinde) if (!f.tot && f.seite === 'a' && (u.trifftLuft || !f.flug) && (f.x - u.x) ** 2 + (f.y - u.y) ** 2 < AGGRO_V * AGGRO_V) { u.aktiv = true; break; }
      if (!u.aktiv) { u.laeuft = false; return; }
    }
    // Ziel prüfen
    let z = u.ziel;
    if (z && (z.tot || z.weg)) z = u.ziel = null;
    if (u.seite === 'a' && !u.nurGeb) {
      // nahe Verteidiger haben Vorrang
      let best = null, bd = (z && z.seite ? 1e9 : AGGRO_A * AGGRO_A);
      if (z && z.seite) bd = (z.x - u.x) ** 2 + (z.y - u.y) ** 2;
      for (const f of feinde) if (!f.tot && f.seite === 'v' && (!f.flug || u.trifftLuft || u.flug)) { const d = (f.x - u.x) ** 2 + (f.y - u.y) ** 2; if (d < bd) { bd = d; best = f; } }
      if (best) z = u.ziel = best;
    }
    // Wer von einem nahen Turm beschossen wird, greift diesen an
    if (u.seite === 'a' && u.beschossen && !u.beschossen.weg && (!z || (!z.seite && !z.abwehr && !z.mauer)) && this.abstandGeb(u.x, u.y, u.beschossen) < 6) z = u.ziel = u.beschossen;
    if (!z) z = u.ziel = this.neuesZiel(u);
    if (!z) { u.laeuft = false; return; }
    // In Reichweite?
    const istGeb = !z.seite;
    const d = istGeb ? this.abstandGeb(u.x, u.y, z) : Math.hypot(z.x - u.x, z.y - u.y);
    if (d <= u.rw + (istGeb ? 0.05 : 0.35)) {
      u.laeuft = false;
      const zx = istGeb ? z.x + z.gr / 2 : z.x;
      u.dir = zx - u.x >= 0 ? 1 : -1;
      if (u.cd <= 0) { u.cd = u.rate; this.angriff(u, z); }
      return;
    }
    this.bewege(u, z);
  }
  neuesZiel(u) {
    if (u.seite === 'v') {
      let best = null, bd = 1e9;
      for (const f of this.einheiten) if (!f.tot && f.seite === 'a' && (!f.flug || u.trifftLuft)) { const d = (f.x - u.x) ** 2 + (f.y - u.y) ** 2; if (d < bd) { bd = d; best = f; } }
      return best;
    }
    // Angreifer: nächstes Gebäude (Belagerung bevorzugt Abwehr, keine Mauern als Ziel)
    let best = null, bd = 1e9;
    for (const b of this.gebaeude) {
      if (b.weg || b.mauer || b.falle) continue;
      let d = this.abstandGeb(u.x, u.y, b);
      if (u.nurGeb && b.abwehr) d *= 0.6;
      if (d < bd) { bd = d; best = b; }
    }
    return best;
  }
  bewege(u, z) {
    const v = u.tempo * DT;
    let tx, ty;
    if (u.flug || u.seite === 'v' || z.seite) { tx = z.seite ? z.x : z.x + z.gr / 2; ty = z.seite ? z.y : z.y + z.gr / 2; }
    else {
      // Abstandsfeld folgen
      const f = this.feld(z);
      const ix = Math.floor(u.x), iy = Math.floor(u.y);
      let bx = null, bw = this.feldWert(f, u.x, u.y);
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue;
        const nx = ix + dx, ny = iy + dy;
        if (nx < -2 || ny < -2 || nx > N + 1 || ny > N + 1) continue;
        const w = this.feldWert(f, nx + 0.5, ny + 0.5) + (dx && dy ? 0.42 : 0);
        if (w < bw - 0.01) { bw = w; bx = [nx + 0.5, ny + 0.5]; }
      }
      if (!bx) { tx = z.x + z.gr / 2; ty = z.y + z.gr / 2; }
      else {
        const gi = (bx[1] | 0) >= 0 && (bx[0] | 0) >= 0 && (bx[1] | 0) < N && (bx[0] | 0) < N ? this.gitter[(bx[1] | 0) * N + (bx[0] | 0)] : -1;
        if (gi >= 0 && gi !== z.i && this.gebaeude[gi].mauer) { u.ziel = this.gebaeude[gi]; return; } // Mauer im Weg: einreißen
        tx = bx[0]; ty = bx[1];
      }
    }
    const dx = tx - u.x, dy = ty - u.y, dd = Math.hypot(dx, dy) || 1;
    const nx = u.x + dx / dd * Math.min(v, dd), ny = u.y + dy / dd * Math.min(v, dd);
    if (u.flug || this.begehbar(nx, ny)) { u.x = nx; u.y = ny; }
    else if (this.begehbar(nx, u.y)) u.x = nx; else if (this.begehbar(u.x, ny)) u.y = ny;
    u.laeuft = true; u.phase = (u.phase + DT * (1 + u.tempo * 0.7)) % 1;
    if (Math.abs(dx) > 0.01) u.dir = dx > 0 ? 1 : -1;
  }
  angriff(u, z) {
    let s = u.schaden;
    if (z.seite) { s *= u.gegen[z.linie] || 1; }
    else s *= u.gegenGeb;
    const zx = z.seite ? z.x : z.x + z.gr / 2, zy = z.seite ? z.y : z.y + z.gr / 2;
    this.ereignisse.push({ art: u.rw > 1.5 ? 'schuss' : 'hieb', linie: u.linie, za: u.za, ax: u.x, ay: u.y, zx, zy, seite: u.seite, flug: u.flug });
    if (u.flaeche && u.rw > 1.5) this.flaechenSchaden(zx, zy, u.flaeche, s, u.seite === 'a' ? 'v' : 'a', !z.seite || u.nurGeb, z);
    else this.treffe(z, s, u);
  }
  treffe(z, s, quelle) {
    if (z.seite) {
      z.hp -= s;
      if (z.seite === 'v' && !z.aktiv) z.aktiv = true;
      if (z.hp <= 0 && !z.tot) { z.tot = true; this.ereignisse.push({ art: 'tot', x: z.x, y: z.y, seite: z.seite }); }
    } else {
      if (z.schild > 0) { const a = Math.min(z.schild, s); z.schild -= a; s -= a; }
      z.hp -= s;
      if (z.hp <= 0 && !z.weg) this.zerstoere(z);
    }
    void quelle;
  }
  flaechenSchaden(x, y, r, s, seite, gebaeudeAuch, hauptziel) {
    for (const e of this.einheiten) if (!e.tot && e.seite === seite && !e.flug && (e.x - x) ** 2 + (e.y - y) ** 2 <= r * r) this.treffe(e, s * (e === hauptziel ? 1 : 0.6));
    if (gebaeudeAuch) for (const b of this.gebaeude) if (!b.weg && !b.falle && this.abstandGeb(x, y, b) <= r * 0.5) this.treffe(b, s * (b === hauptziel ? 1 : 0.5));
    this.ereignisse.push({ art: 'knall', x, y, r });
  }
  zerstoere(b) {
    b.weg = true; b.hp = 0;
    if (!b.falle) for (let y = b.y; y < b.y + b.gr; y++) for (let x = b.x; x < b.x + b.gr; x++) if (x >= 0 && y >= 0 && x < N && y < N) this.gitter[y * N + x] = -1;
    this.felder.clear();
    this.ereignisse.push({ art: 'einsturz', x: b.x + b.gr / 2, y: b.y + b.gr / 2, gr: b.gr, typ: b.typ });
  }
  abwehrDenken(b) {
    const a = b.abwehr;
    if (b.falle) {
      if (!b.scharf) return;
      for (const u of this.einheiten) if (!u.tot && u.seite === 'a' && !u.flug && Math.hypot(u.x - (b.x + 0.5), u.y - (b.y + 0.5)) <= a.rw) {
        b.scharf = false; b.weg = true;
        this.flaechenSchaden(b.x + 0.5, b.y + 0.5, a.flaeche, a.schaden, 'a', false);
        this.ereignisse.push({ art: 'falle', x: b.x + 0.5, y: b.y + 0.5 });
        return;
      }
      return;
    }
    b.cd -= DT;
    if (b.cd > 0) return;
    const cx = b.x + b.gr / 2, cy = b.y + b.gr / 2;
    let best = null, bd = 1e9;
    for (const u of this.einheiten) {
      if (u.tot || u.seite !== 'a') continue;
      if (u.flug ? !a.luft : !a.boden) continue;
      const d = Math.hypot(u.x - cx, u.y - cy) - b.gr / 2;
      if (d > a.rw || (a.minRw && d < a.minRw)) continue;
      if (d < bd) { bd = d; best = u; }
    }
    if (!best) return;
    b.cd = a.rate;
    this.ereignisse.push({ art: 'turm', typ: b.typ, ax: cx, ay: cy, zx: best.x, zy: best.y, flug: best.flug });
    for (const u of this.einheiten) if (!u.tot && u.seite === 'a' && (u.x - best.x) ** 2 + (u.y - best.y) ** 2 < 16) u.beschossen = b;
    if (a.flaeche) this.flaechenSchaden(best.x, best.y, a.flaeche, a.schaden, 'a', false, best);
    else this.treffe(best, a.schaden);
    if (a.kette) {
      let letzter = best; const getroffen = new Set([best]);
      for (let k = 1; k < a.kette; k++) {
        let n = null, nd = 4;
        for (const u of this.einheiten) if (!u.tot && u.seite === 'a' && !getroffen.has(u)) { const d = Math.hypot(u.x - letzter.x, u.y - letzter.y); if (d < nd) { nd = d; n = u; } }
        if (!n) break;
        this.ereignisse.push({ art: 'turm', typ: b.typ, ax: letzter.x, ay: letzter.y, zx: n.x, zy: n.y, kette: true });
        this.treffe(n, a.schaden * 0.7); getroffen.add(n); letzter = n;
      }
    }
  }

  prozent() { const w = this.gebaeude.filter((b) => b.wertung); return Math.round(w.filter((b) => b.weg).length / (w.length || 1) * 100); }
  sterne() {
    const p = this.prozent();
    return (p >= 50 ? 1 : 0) + (this.zentrum && this.zentrum.weg ? 1 : 0) + (p >= 100 ? 1 : 0);
  }
  ergebnis() {
    return {
      sterne: this.sterne(), prozent: this.prozent(), zeit: Math.round(this.zeit),
      gefallenA: this.einheiten.filter((u) => u.seite === 'a' && u.tot).map((u) => u.id),
      gefallenV: this.einheiten.filter((u) => u.seite === 'v' && u.tot).map((u) => u.id),
    };
  }
}

export function simuliere(eingabe) { return new Kampf(eingabe).bisEnde(); }
