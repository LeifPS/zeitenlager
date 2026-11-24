// Das isometrische Kriegslager: Zeichnen, Kamera, Antippen, Ziehen (Mergen, Bauen, Verschieben).
import { GEBAEUDE, EINHEITEN, LAGER_GROESSE, STUFEN, PRODUKTION_MAX_STUNDEN } from '../shared/daten.js';
import { passt, mineInhalt, zeitalter, goldRate } from '../shared/regeln.js';
import { TW, TH, iso, gebaeudeSprite, bildZeitalter, zeichneEinheit, bodenBild, einheitHoehe, glow, sternForm, RAND } from './grafik.js';
import { iconBild } from './icons.js';

const N = LAGER_GROESSE;

export class Lager {
  constructor(canvas, spiel) {
    this.cv = canvas; this.c = canvas.getContext('2d'); this.spiel = spiel;
    this.cam = { x: N * TW / 2, y: N * TH / 2, zoom: 1 };
    this.boden = bodenBild(N);
    this.vis = new Map(); // Einheiten-Darstellung
    this.effekte = [];
    this.modus = null; // {art:'bauen', typ, x, y} | {art:'verschieben', id, x, y}
    this.auswahl = null;
    this.zeiger = new Map();
    this.ziehen = null;
    this.resize();
    addEventListener('resize', () => this.resize());
    this.eingabe();
    this.zoomStart();
  }
  zoomStart() { const k = Math.min(this.W / 1500, this.H / 900); this.cam.zoom = Math.max(0.7, Math.min(1.4, k * 1.6)); }
  resize() {
    this.dpr = Math.min(2, devicePixelRatio || 1);
    this.W = innerWidth; this.H = innerHeight;
    this.cv.width = this.W * this.dpr; this.cv.height = this.H * this.dpr;
    this.cv.style.width = this.W + 'px'; this.cv.style.height = this.H + 'px';
  }
  get s() { return this.spiel.s; }

  // --------------------------------------------------- Koordinaten
  zuBild(wx, wy) { return [(wx - this.cam.x) * this.cam.zoom + this.W / 2, (wy - this.cam.y) * this.cam.zoom + this.H / 2]; }
  zuWelt(bx, by) { return [(bx - this.W / 2) / this.cam.zoom + this.cam.x, (by - this.H / 2) / this.cam.zoom + this.cam.y]; }
  feldBei(bx, by) { const [wx, wy] = this.zuWelt(bx, by); return [wx / TW, wy / TH]; }
  begrenzeKamera() {
    const minY = -40, maxY = N * TH + 40;
    this.cam.x = Math.max(0, Math.min(N * TW, this.cam.x));
    this.cam.y = Math.max(minY, Math.min(maxY, this.cam.y));
    this.cam.zoom = Math.max(0.35, Math.min(2.2, this.cam.zoom));
  }

  // --------------------------------------------------- Einheiten bewegen (nur Optik)
  belegtGitter() {
    const g = new Uint8Array(N * N);
    for (const b of this.s.gebaeude) { const gr = GEBAEUDE[b.typ].gr; for (let y = b.y; y < b.y + gr; y++) for (let x = b.x; x < b.x + gr; x++) if (x >= 0 && y >= 0 && x < N && y < N) g[y * N + x] = GEBAEUDE[b.typ].kat === 'deko' && b.typ !== 'statue' ? 0 : 1; }
    return g;
  }
  frei(g, x, y) { const ix = Math.floor(x), iy = Math.floor(y); return ix > 0 && iy > 0 && ix < N - 1 && iy < N - 1 && !g[iy * N + ix]; }
  zielSuchen(g, v, nahe) {
    for (let i = 0; i < 30; i++) {
      let x, y;
      if (nahe) { x = nahe.x + (Math.random() - 0.5) * 6; y = nahe.y + (Math.random() - 0.5) * 6; }
      else { x = v.x + (Math.random() - 0.5) * 12; y = v.y + (Math.random() - 0.5) * 12; }
      if (this.frei(g, x, y) && this.linieFrei(g, v.x, v.y, x, y)) return [x, y];
    }
    return null;
  }
  linieFrei(g, x0, y0, x1, y1) { const n = Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 3); for (let i = 1; i <= n; i++) if (!this.frei(g, x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n)) return false; return true; }
  einheitenAktualisieren(dt) {
    const s = this.s; if (!s) return;
    const g = this.gitter || (this.gitter = this.belegtGitter());
    const ids = new Set();
    const heil = s.gebaeude.find((b) => b.typ === 'heilhaus' && b.stufe >= 1) || s.gebaeude.find((b) => b.typ === 'zentrum');
    const rk = s.gebaeude.find((b) => b.typ === 'ruestkammer');
    for (const u of s.einheiten) {
      ids.add(u.id);
      let v = this.vis.get(u.id);
      if (!v) {
        const z = s.gebaeude.find((b) => b.typ === 'kaserne') || s.gebaeude[0];
        let x = z.x + 1.5, y = z.y + GEBAEUDE[z.typ].gr + 0.6;
        for (let i = 0; i < 40 && !this.frei(g, x, y); i++) { x = 3 + Math.random() * (N - 6); y = 3 + Math.random() * (N - 6); }
        v = { x, y, tx: x, ty: y, warte: Math.random() * 2, phase: Math.random(), dir: 1 };
        this.vis.set(u.id, v);
      }
      if (this.ziehen && this.ziehen.id === u.id) continue;
      if (!this.frei(g, v.x, v.y)) { const z = this.zielSuchen(g, { x: N / 2, y: N / 2 }); if (z) { v.x = z[0]; v.y = z[1]; v.tx = v.x; v.ty = v.y; } }
      const d = EINHEITEN[u.typ];
      const ankerB = u.verwundet ? heil : u.gesperrt ? rk : null;
      const anker = ankerB ? { x: ankerB.x + GEBAEUDE[ankerB.typ].gr / 2, y: ankerB.y + GEBAEUDE[ankerB.typ].gr + 0.8 } : null;
      const dx = v.tx - v.x, dy = v.ty - v.y, dist = Math.hypot(dx, dy);
      if (dist < 0.05) {
        v.warte -= dt; v.laeuft = false;
        if (v.warte <= 0) {
          const z = this.zielSuchen(g, v, anker);
          if (z) { v.tx = z[0]; v.ty = z[1]; }
          v.warte = 1.5 + Math.random() * (u.verwundet ? 9 : 4);
        }
      } else {
        const tempo = (u.verwundet ? 0.25 : 0.55 + d.tempo * 0.25) * dt;
        const k = Math.min(1, tempo / dist);
        const nx = v.x + dx * k, ny = v.y + dy * k;
        if (this.frei(g, nx, ny) || d.linie === 'luft') { v.x = nx; v.y = ny; } else { v.tx = v.x; v.ty = v.y; }
        v.phase = (v.phase + dt * (1.2 + d.tempo * 0.6)) % 1; v.laeuft = true;
        if (Math.abs(dx) > 0.01) v.dir = dx > 0 ? 1 : -1;
      }
    }
    for (const id of [...this.vis.keys()]) if (!ids.has(id)) this.vis.delete(id);
  }
  neuesGitter() { this.gitter = null; }

  // --------------------------------------------------- Zeichnen
  zeichne(t, dt) {
    const c = this.c, s = this.s;
    c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    c.fillStyle = '#3f8a34'; c.fillRect(0, 0, this.W, this.H);
    if (!s) return;
    this.einheitenAktualisieren(dt);
    const z = this.cam.zoom;
    c.setTransform(this.dpr * z, 0, 0, this.dpr * z, this.dpr * (this.W / 2 - this.cam.x * z), this.dpr * (this.H / 2 - this.cam.y * z));
    c.imageSmoothingEnabled = true;
    c.drawImage(this.boden.bild, -this.boden.ox, -this.boden.oy);
    // Raster im Baumodus
    if (this.modus) this.rasterZeichnen(c);
    const za = zeitalter(s);
    const mauern = this.mauerMasken();
    const liste = [];
    for (const b of s.gebaeude) {
      const gr = GEBAEUDE[b.typ].gr;
      const verschoben = this.modus && this.modus.art === 'verschieben' && this.modus.id === b.id;
      if (verschoben) continue;
      liste.push({ tiefe: b.y + gr - 0.05, f: () => this.gebaeudeZeichnen(c, b, za, mauern, t) });
    }
    for (const u of s.einheiten) {
      const v = this.vis.get(u.id); if (!v) continue;
      liste.push({ tiefe: v.y + (EINHEITEN[u.typ].linie === 'luft' ? 100 : 0), f: () => this.einheitZeichnen(c, u, v, t) });
    }
    if (this.modus) {
      const m = this.modus; const typ = m.art === 'bauen' ? m.typ : s.gebaeude.find((b) => b.id === m.id).typ;
      liste.push({ tiefe: 9999, f: () => this.geistZeichnen(c, typ, m) });
    }
    liste.sort((a, b) => a.tiefe - b.tiefe);
    for (const e of liste) e.f();
    // Effekte
    this.effekte = this.effekte.filter((e) => (e.zeit += dt) < e.dauer);
    for (const e of this.effekte) this.effektZeichnen(c, e);
    c.setTransform(1, 0, 0, 1, 0, 0);
  }
  rasterZeichnen(c) {
    c.save(); c.strokeStyle = 'rgba(255,255,255,0.22)'; c.lineWidth = 1;
    for (let i = 1; i < N; i++) { c.beginPath(); c.moveTo(i * TW, TH); c.lineTo(i * TW, (N - 1) * TH); c.stroke(); c.beginPath(); c.moveTo(TW, i * TH); c.lineTo((N - 1) * TW, i * TH); c.stroke(); }
    c.restore();
  }
  mauerMasken() {
    const m = new Map(), pos = new Set();
    for (const b of this.s.gebaeude) if (b.typ === 'mauer') pos.add(b.x + ',' + b.y);
    for (const b of this.s.gebaeude) if (b.typ === 'mauer') m.set(b.id, (pos.has((b.x + 1) + ',' + b.y) ? 1 : 0) | (pos.has(b.x + ',' + (b.y + 1)) ? 2 : 0) | (pos.has((b.x - 1) + ',' + b.y) ? 4 : 0) | (pos.has(b.x + ',' + (b.y - 1)) ? 8 : 0));
    return m;
  }
  gebaeudeZeichnen(c, b, za, mauern, t) {
    const [x, y] = iso(b.x, b.y);
    const stufe = Math.max(1, b.stufe);
    const bz = bildZeitalter(b.typ, stufe, za);
    const variante = b.typ === 'mauer' ? mauern.get(b.id) : (b.typ === 'baum' || b.typ === 'fahne') ? b.id % 7 : 0;
    const sp = gebaeudeSprite(b.typ, stufe, bz, variante);
    const neu = b.stufe === 0;
    if (neu) c.globalAlpha = 0.55;
    c.drawImage(sp.bild, x - sp.ox, y - sp.oy, sp.w, sp.h);
    c.globalAlpha = 1;
    const gr = GEBAEUDE[b.typ].gr;
    const [mx, my] = iso(b.x + gr / 2, b.y + gr / 2);
    if (this.auswahl === b.id) {
      c.save(); c.strokeStyle = '#fff'; c.lineWidth = 2.5 / this.cam.zoom; c.setLineDash([8, 6]); c.lineDashOffset = -t * 30;
      c.beginPath(); c.roundRect(b.x * TW, b.y * TH, gr * TW, gr * TH, 6); c.stroke(); c.restore();
    }
    if (b.bauBis) {
      this.geruest(c, b, gr);
      const ges = b.bauBis - b.bauStart, rest = b.bauBis - this.spiel.jetzt();
      this.balken(c, mx, my - 70 - gr * 6, 1 - rest / ges, '#ffd23f');
    }
    // Volle Goldmine: Blase mit Münze
    if (b.typ === 'goldmine' && b.stufe >= 1) {
      const inh = mineInhalt(this.s, b, this.spiel.jetzt());
      const voll = inh / (goldRate(this.s, b) * PRODUKTION_MAX_STUNDEN);
      if (inh >= 50 && voll > 0.08) this.blase(c, mx, my - 64 + Math.sin(t * 3 + b.id) * 3, 'gold', voll >= 0.999);
    }
    // Ausbildung läuft
    const q = this.s.ausbildung[b.id];
    if (q && q.length && q[0].bis) {
      const ges = q[0].bis - q[0].start, rest = q[0].bis - this.spiel.jetzt();
      this.balken(c, mx, my - 72 - gr * 4, 1 - rest / ges, '#5fa8ff');
    }
    if (b.typ === 'akademie' && this.s.forschung.aktiv) { glow(c, mx + 10, my - 74, 2 + Math.sin(t * 4), '#7fe7ff'); }
    if (b.typ === 'heilhaus' && this.s.heilung.length) { glow(c, mx, my - 60, 2 + Math.sin(t * 3), '#5be38c'); }
  }
  geruest(c, b, gr) {
    c.save(); c.strokeStyle = '#8a5a2b'; c.lineWidth = 3;
    const x0 = b.x * TW + 4, x1 = (b.x + gr) * TW - 4, y = (b.y + gr) * TH - 2, h = 40 + gr * 10;
    for (const x of [x0, (x0 + x1) / 2, x1]) { c.beginPath(); c.moveTo(x, y); c.lineTo(x, y - h); c.stroke(); }
    for (const hh of [h * 0.4, h * 0.85]) { c.beginPath(); c.moveTo(x0, y - hh); c.lineTo(x1, y - hh); c.stroke(); }
    c.restore();
  }
  balken(c, x, y, p, col) {
    p = Math.max(0, Math.min(1, p));
    const w = 54;
    c.fillStyle = RAND; c.beginPath(); c.roundRect(x - w / 2 - 2, y - 2, w + 4, 10, 5); c.fill();
    c.fillStyle = '#3a2a1c'; c.beginPath(); c.roundRect(x - w / 2, y, w, 6, 3); c.fill();
    c.fillStyle = col; c.beginPath(); c.roundRect(x - w / 2, y, Math.max(6, w * p), 6, 3); c.fill();
  }
  blase(c, x, y, ic, voll) {
    c.save(); c.fillStyle = '#fff'; c.strokeStyle = RAND; c.lineWidth = 1.8;
    c.beginPath(); c.arc(x, y - 6, 15, 0, 7); c.fill(); c.stroke();
    c.beginPath(); c.moveTo(x - 5, y + 7); c.lineTo(x, y + 14); c.lineTo(x + 5, y + 7); c.fill();
    const img = iconBild(ic); if (img.complete) c.drawImage(img, x - 11, y - 17, 22, 22);
    if (voll) { c.fillStyle = '#e0453a'; c.beginPath(); c.arc(x + 11, y - 18, 5, 0, 7); c.fill(); }
    c.restore();
  }
  einheitZeichnen(c, u, v, t) {
    const [x, y] = iso(v.x, v.y);
    const ziehe = this.ziehen && this.ziehen.id === u.id;
    let px = x, py = y;
    if (ziehe) { const [wx, wy] = this.zuWelt(this.ziehen.bx, this.ziehen.by); px = wx; py = wy + 10; }
    // Ziel-Hervorhebung beim Ziehen
    if (this.ziehen && !ziehe) {
      const z = this.s.einheiten.find((e) => e.id === this.ziehen.id);
      if (z && z.typ === u.typ && z.stufe === u.stufe && !u.verwundet && !u.gesperrt && u.stufe < STUFEN.length - 1) {
        c.save(); c.strokeStyle = '#5be38c'; c.lineWidth = 3; c.globalAlpha = 0.6 + Math.sin(t * 8) * 0.3;
        c.beginPath(); c.ellipse(x, y, 16, 8, 0, 0, 7); c.stroke(); c.restore();
      }
    }
    if (u.gesperrt) c.globalAlpha = 0.6;
    zeichneEinheit(c, px, py - (ziehe ? 8 : 0), u.typ, u.stufe, 'blau', v.laeuft || ziehe ? v.phase : 0.25, v.dir, { verwundet: u.verwundet, skala: 1.15 });
    c.globalAlpha = 1;
    if (this.einheitAuswahl === u.id) { c.save(); c.strokeStyle = '#fff'; c.lineWidth = 2; c.beginPath(); c.ellipse(x, y, 13, 6.5, 0, 0, 7); c.stroke(); c.restore(); }
  }
  geistZeichnen(c, typ, m) {
    const gr = GEBAEUDE[typ].gr;
    const ok = passt(this.s, typ, m.x, m.y, m.id);
    c.save();
    c.fillStyle = ok ? 'rgba(80,230,120,0.45)' : 'rgba(240,70,60,0.45)';
    c.beginPath(); c.roundRect(m.x * TW, m.y * TH, gr * TW, gr * TH, 6); c.fill();
    c.globalAlpha = 0.85;
    const b = this.s.gebaeude.find((x) => x.id === m.id);
    const st = b ? Math.max(1, b.stufe) : 1;
    const sp = gebaeudeSprite(typ, st, bildZeitalter(typ, st, zeitalter(this.s)), 0);
    const [x, y] = iso(m.x, m.y);
    c.drawImage(sp.bild, x - sp.ox, y - sp.oy, sp.w, sp.h);
    c.restore();
    m.ok = ok;
  }
  effektZeichnen(c, e) {
    const p = e.zeit / e.dauer;
    if (e.art === 'text') {
      c.save(); c.globalAlpha = 1 - p * p; c.font = `bold ${16}px "Lilita One", sans-serif`; c.textAlign = 'center';
      c.lineWidth = 4; c.strokeStyle = RAND; c.strokeText(e.text, e.x, e.y - p * 40); c.fillStyle = e.farbe || '#ffe066'; c.fillText(e.text, e.x, e.y - p * 40); c.restore();
    } else if (e.art === 'funken') {
      for (let i = 0; i < 14; i++) {
        const a = i / 14 * Math.PI * 2, r = 8 + p * 46;
        c.save(); c.globalAlpha = 1 - p; sternForm(c, e.x + Math.cos(a) * r, e.y - 14 + Math.sin(a) * r * 0.6 - p * 10, 4 * (1 - p) + 1, e.farbe); c.restore();
      }
      c.save(); c.globalAlpha = (1 - p) * 0.8; glow(c, e.x, e.y - 16, 8 * (1 - p) + 2, e.farbe); c.restore();
    } else if (e.art === 'muenzen') {
      for (let i = 0; i < 8; i++) {
        const a = -Math.PI / 2 + (i - 3.5) * 0.25, r = p * 60;
        const x = e.x + Math.cos(a) * r, y = e.y + Math.sin(a) * r + p * p * 80;
        c.save(); c.globalAlpha = 1 - p; c.fillStyle = '#ffcf3a'; c.beginPath(); c.ellipse(x, y, 5, 4, 0, 0, 7); c.fill(); c.strokeStyle = '#a86a0c'; c.stroke(); c.restore();
      }
    }
  }
  effekt(e) { this.effekte.push({ zeit: 0, dauer: 1.2, ...e }); }
  textBeiFeld(tx, ty, text, farbe) { const [x, y] = iso(tx, ty); this.effekt({ art: 'text', x, y: y - 60, text, farbe }); }

  // --------------------------------------------------- Treffer
  gebaeudeBei(bx, by) {
    const [wx, wy] = this.zuWelt(bx, by);
    const [fx, fy] = this.feldBei(bx, by);
    const liste = [...this.s.gebaeude].sort((a, b) => (b.y + GEBAEUDE[b.typ].gr) - (a.y + GEBAEUDE[a.typ].gr));
    // erst Grundriss
    for (const b of liste) { const gr = GEBAEUDE[b.typ].gr; if (fx >= b.x && fy >= b.y && fx < b.x + gr && fy < b.y + gr) return b; }
    // dann hohe Teile (alles, was über der Grundfläche nach oben ragt)
    for (const b of liste) {
      const gr = GEBAEUDE[b.typ].gr; if (GEBAEUDE[b.typ].kat === 'deko' && b.typ !== 'statue') continue;
      const x0 = b.x * TW, x1 = (b.x + gr) * TW, y1 = (b.y + gr) * TH, y0 = y1 - gr * TH - 40 - gr * 14;
      if (wx >= x0 && wx <= x1 && wy >= y0 && wy <= y1) return b;
    }
    return null;
  }
  einheitBei(bx, by) {
    const [wx, wy] = this.zuWelt(bx, by);
    let best = null, bd = 18;
    for (const u of this.s.einheiten) {
      const v = this.vis.get(u.id); if (!v) continue;
      const [x, y] = iso(v.x, v.y);
      const h = einheitHoehe(u.typ);
      const d = Math.hypot(wx - x, (wy - (y - h / 2)) * 0.8);
      if (d < bd + h * 0.25) { bd = d; best = u; }
    }
    return best;
  }

  // --------------------------------------------------- Eingabe
  eingabe() {
    const cv = this.cv;
    cv.addEventListener('pointerdown', (e) => this.runter(e));
    addEventListener('pointermove', (e) => this.bewegen(e));
    addEventListener('pointerup', (e) => this.hoch(e));
    addEventListener('pointercancel', (e) => this.hoch(e, true));
    cv.addEventListener('wheel', (e) => { e.preventDefault(); this.zoomUm(e.clientX, e.clientY, Math.exp(-e.deltaY * 0.0015)); }, { passive: false });
    cv.addEventListener('contextmenu', (e) => e.preventDefault());
  }
  zoomUm(bx, by, f) {
    const [wx, wy] = this.zuWelt(bx, by);
    this.cam.zoom *= f; this.begrenzeKamera();
    const [nx, ny] = this.zuWelt(bx, by);
    this.cam.x += wx - nx; this.cam.y += wy - ny; this.begrenzeKamera();
  }
  runter(e) {
    if (!this.s) return;
    this.cv.setPointerCapture?.(e.pointerId);
    this.zeiger.set(e.pointerId, { x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, t: performance.now() });
    if (this.zeiger.size === 2) { const [a, b] = [...this.zeiger.values()]; this.pinch = { d: Math.hypot(a.x - b.x, a.y - b.y) }; this.ziehen = null; this.geistZiehen = false; return; }
    this.bewegt = false;
    this.geistZiehen = false;
    if (this.modus) {
      const [fx, fy] = this.feldBei(e.clientX, e.clientY);
      const typ = this.modus.art === 'bauen' ? this.modus.typ : this.s.gebaeude.find((b) => b.id === this.modus.id).typ;
      const gr = GEBAEUDE[typ].gr;
      if (fx >= this.modus.x - 1 && fy >= this.modus.y - 1 && fx < this.modus.x + gr + 1 && fy < this.modus.y + gr + 1) { this.geistZiehen = { dx: fx - this.modus.x, dy: fy - this.modus.y }; return; }
    }
    const u = !this.modus && this.einheitBei(e.clientX, e.clientY);
    this.kandidat = u ? { art: 'einheit', u } : null;
  }
  bewegen(e) {
    const p = this.zeiger.get(e.pointerId); if (!p) return;
    const dx = e.clientX - p.x, dy = e.clientY - p.y;
    p.x = e.clientX; p.y = e.clientY;
    if (this.pinch && this.zeiger.size === 2) {
      const [a, b] = [...this.zeiger.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      this.zoomUm((a.x + b.x) / 2, (a.y + b.y) / 2, d / this.pinch.d); this.pinch.d = d;
      return;
    }
    if (Math.hypot(e.clientX - p.sx, e.clientY - p.sy) > 7) this.bewegt = true;
    if (this.geistZiehen) {
      const [fx, fy] = this.feldBei(e.clientX, e.clientY);
      const nx = Math.round(fx - this.geistZiehen.dx), ny = Math.round(fy - this.geistZiehen.dy);
      if (nx !== this.modus.x || ny !== this.modus.y) { this.modus.x = nx; this.modus.y = ny; this.spiel.modusGeaendert?.(); }
      return;
    }
    if (this.kandidat && this.kandidat.art === 'einheit' && this.bewegt && !this.ziehen) {
      if (!this.kandidat.u.verwundet && !this.kandidat.u.gesperrt) this.ziehen = { id: this.kandidat.u.id, bx: e.clientX, by: e.clientY };
      else { this.kandidat = null; }
    }
    if (this.ziehen) { this.ziehen.bx = e.clientX; this.ziehen.by = e.clientY; this.randScroll(e.clientX, e.clientY); return; }
    if (this.bewegt) { this.cam.x -= dx / this.cam.zoom; this.cam.y -= dy / this.cam.zoom; this.begrenzeKamera(); }
  }
  randScroll(x, y) { const r = 50, v = 8 / this.cam.zoom; if (x < r) this.cam.x -= v; if (x > this.W - r) this.cam.x += v; if (y < r + 40) this.cam.y -= v; if (y > this.H - r - 60) this.cam.y += v; this.begrenzeKamera(); }
  hoch(e, abbruch) {
    const p = this.zeiger.get(e.pointerId); if (!p) return;
    this.zeiger.delete(e.pointerId);
    if (this.pinch) { if (this.zeiger.size < 2) this.pinch = null; this.bewegt = true; return; }
    if (abbruch) { this.ziehen = null; return; }
    if (this.geistZiehen) { this.geistZiehen = false; return; }
    if (this.ziehen) {
      const quelle = this.s.einheiten.find((u) => u.id === this.ziehen.id);
      const ziel = this.einheitBeiOhne(e.clientX, e.clientY, this.ziehen.id);
      const v = this.vis.get(this.ziehen.id);
      if (v) { const [fx, fy] = this.feldBei(e.clientX, e.clientY + 10); if (this.frei(this.gitter || this.belegtGitter(), fx, fy)) { v.x = fx; v.y = fy; v.tx = fx; v.ty = fy; v.warte = 2; } }
      this.ziehen = null;
      if (quelle && ziel) this.spiel.mergen(quelle, ziel);
      return;
    }
    if (this.bewegt) return;
    // Antippen
    if (this.modus) return;
    const u = this.einheitBei(e.clientX, e.clientY);
    if (u) { this.einheitAuswahl = u.id; this.auswahl = null; this.spiel.einheitAngetippt(u); return; }
    const b = this.gebaeudeBei(e.clientX, e.clientY);
    this.einheitAuswahl = null;
    if (b) {
      if (b.typ === 'goldmine' && b.stufe >= 1 && mineInhalt(this.s, b, this.spiel.jetzt()) >= 1 && this.auswahl !== b.id) this.spiel.einsammeln(b);
      this.auswahl = b.id; this.spiel.gebaeudeAngetippt(b);
    } else { this.auswahl = null; this.spiel.gebaeudeAngetippt(null); }
  }
  einheitBeiOhne(bx, by, ohne) {
    const [wx, wy] = this.zuWelt(bx, by);
    let best = null, bd = 30;
    for (const u of this.s.einheiten) {
      if (u.id === ohne) continue;
      const v = this.vis.get(u.id); if (!v) continue;
      const [x, y] = iso(v.x, v.y);
      const d = Math.hypot(wx - x, wy - (y - 14));
      if (d < bd) { bd = d; best = u; }
    }
    return best;
  }
  // Kamera auf ein Feld
  zeigeFeld(tx, ty) { const [x, y] = iso(tx, ty); this.cam.x = x; this.cam.y = y; this.begrenzeKamera(); }
  mitteFeld() { const [fx, fy] = this.feldBei(this.W / 2, this.H / 2); return [Math.round(fx), Math.round(fy)]; }
  einheitPosition(id) { const v = this.vis.get(id); return v ? iso(v.x, v.y) : null; }
}
