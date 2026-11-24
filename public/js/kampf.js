// Angriffe: Auswahl (Kampagne, Barbaren, Raid, Berichte), Vorschau mit Seitenwahl und Kampf-Wiedergabe.
import { GEBAEUDE, EINHEITEN, ZEITALTER, ROHSTOFFE, LAGER_GROESSE, einheitMacht } from '../shared/daten.js';
import * as R from '../shared/regeln.js';
import { Kampf, KAMPF_DAUER, DT } from '../shared/kampf.js';
import { KAMPAGNE, erzeugeDorf, dorfMacht } from '../shared/barbaren.js';
import { api } from './api.js';
import { icon, sterneHtml } from './icons.js';
import { zahl, dauer, esc } from './format.js';
import { TW, TH, iso, gebaeudeSprite, bildZeitalter, zeichneEinheit, bodenBild, einheitHoehe, glow, RAND, farbe, einheitPortrait, sternForm } from './grafik.js';
import { kostenHtml } from './ui.js';
import { Audio } from './audio.js';

const N = LAGER_GROESSE;
const SEITEN_NAMEN = { ol: 'oben links', or: 'oben rechts', ur: 'unten rechts', ul: 'unten links' };

function beuteHtml(b) { return Object.entries(b || {}).filter(([k, v]) => v > 0 && (k === 'gold' || ROHSTOFFE[k])).map(([k, v]) => `<span class="kosten">${icon(k)}${zahl(v)}</span>`).join('') || '<span class="kosten">nichts</span>'; }

class KampfAnsicht {
  constructor(spiel) {
    this.spiel = spiel;
    this.el = document.getElementById('vollbild');
    this.boden = null;
  }
  get s() { return this.spiel.s; }

  // ------------------------------------------------ Vorschau
  vorschau(ziel) {
    // ziel: { art: 'kampagne'|'dorf'|'raid', titel, basis, za, beute, info, i }
    this.ziel = ziel; this.seite = this.seite || 'ul'; this.modus = 'vorschau';
    this.oeffnen();
    this.neueVorschau();
    this.leiste();
  }
  armee() { return this.s.einheiten.filter((u) => !u.verwundet && !u.gesperrt).map((u) => ({ id: u.id, typ: u.typ, stufe: u.stufe })); }
  neueVorschau() { this.kampf = new Kampf({ saat: 1, seite: this.seite, angreifer: this.armee(), basis: this.ziel.basis }); }
  oeffnen() {
    if (!this.boden) this.boden = bodenBild(N);
    this.el.hidden = false; this.spiel.verdeckt = true;
    this.el.innerHTML = `<canvas></canvas><div class="vb-oben"></div><div class="kampf-seiten"></div><div class="vb-panel" hidden></div><div class="vb-unten"></div>`;
    this.cv = this.el.querySelector('canvas'); this.c = this.cv.getContext('2d');
    this.cam = null;
    this.resize(); this.ro = () => this.resize(); addEventListener('resize', this.ro);
    this.eingabe();
    this.effekte = []; this.laeuft = true; this.tempo = 1; this.akku = 0; this.letzt = performance.now();
    const lauf = (t) => { if (!this.laeuft) return; this.rahmen(t); requestAnimationFrame(lauf); };
    requestAnimationFrame(lauf);
  }
  schliessen() { this.laeuft = false; this.el.hidden = true; this.el.innerHTML = ''; this.spiel.verdeckt = false; removeEventListener('resize', this.ro); Audio.musikStart(); }
  resize() {
    this.dpr = Math.min(2, devicePixelRatio || 1); this.W = innerWidth; this.H = innerHeight;
    this.cv.width = this.W * this.dpr; this.cv.height = this.H * this.dpr; this.cv.style.width = this.W + 'px'; this.cv.style.height = this.H + 'px';
    this.cam = null;
  }
  kameraStart() {
    // Auf das Dorf samt Aufstellung zoomen
    const k = this.kampf; let x0 = N, y0 = N, x1 = 0, y1 = 0;
    for (const b of k.gebaeude) { x0 = Math.min(x0, b.x); y0 = Math.min(y0, b.y); x1 = Math.max(x1, b.x + b.gr); y1 = Math.max(y1, b.y + b.gr); }
    for (const u of k.einheiten) { x0 = Math.min(x0, u.x - 1); y0 = Math.min(y0, u.y - 1); x1 = Math.max(x1, u.x + 1); y1 = Math.max(y1, u.y + 1); }
    const ecken = [iso(x0, y0), iso(x1, y0), iso(x1, y1), iso(x0, y1)];
    const minX = Math.min(...ecken.map((e) => e[0])), maxX = Math.max(...ecken.map((e) => e[0])), minY = Math.min(...ecken.map((e) => e[1])) - 60, maxY = Math.max(...ecken.map((e) => e[1]));
    const z = Math.min((this.W - 40) / (maxX - minX), (this.H - 170) / (maxY - minY));
    this.cam = { x: (minX + maxX) / 2, y: (minY + maxY) / 2 + 10, z: Math.max(0.5, Math.min(1.6, z)) };
  }
  eingabe() {
    const cv = this.cv, zeiger = new Map(); let pinch = null;
    cv.addEventListener('pointerdown', (e) => { cv.setPointerCapture?.(e.pointerId); zeiger.set(e.pointerId, { x: e.clientX, y: e.clientY }); if (zeiger.size === 2) { const [a, b] = [...zeiger.values()]; pinch = Math.hypot(a.x - b.x, a.y - b.y); } });
    cv.addEventListener('pointermove', (e) => {
      const p = zeiger.get(e.pointerId); if (!p || !this.cam) return;
      const dx = e.clientX - p.x, dy = e.clientY - p.y; p.x = e.clientX; p.y = e.clientY;
      if (zeiger.size === 2 && pinch) { const [a, b] = [...zeiger.values()]; const d = Math.hypot(a.x - b.x, a.y - b.y); this.cam.z = Math.max(0.4, Math.min(2.5, this.cam.z * d / pinch)); pinch = d; return; }
      this.cam.x -= dx / this.cam.z; this.cam.y -= dy / this.cam.z;
    });
    const hoch = (e) => { zeiger.delete(e.pointerId); if (zeiger.size < 2) pinch = null; };
    cv.addEventListener('pointerup', hoch); cv.addEventListener('pointercancel', hoch);
    cv.addEventListener('wheel', (e) => { e.preventDefault(); if (this.cam) this.cam.z = Math.max(0.4, Math.min(2.5, this.cam.z * Math.exp(-e.deltaY * 0.0015))); }, { passive: false });
  }
  leiste() {
    const oben = this.el.querySelector('.vb-oben'), unten = this.el.querySelector('.vb-unten'), seiten = this.el.querySelector('.kampf-seiten');
    if (this.modus === 'vorschau') {
      const z = this.ziel;
      const meine = this.armee();
      const macht = meine.reduce((m, u) => m + einheitMacht(u.typ, u.stufe), 0);
      oben.innerHTML = `<span class="chip">${esc(z.titel)}</span><span class="chip">${ZEITALTER[z.za].name}</span><span class="chip">${icon('armee')} Gegner ${zahl(z.macht ?? dorfMacht(z.basis))}</span><span class="chip">${icon('armee')} Du ${zahl(macht)}</span><button class="knopf klein" data-zu>${icon('x')}</button>`;
      seiten.innerHTML = Object.keys(SEITEN_NAMEN).map((k) => `<button class="seiten-knopf ${k} ${k === this.seite ? 'an' : ''}" data-seite="${k}" title="Angriff von ${SEITEN_NAMEN[k]}">${icon('pfeilrechts')}</button>`).join('');
      unten.innerHTML = `<div class="kampf-armee">${this.armeeLeiste(meine)}</div><div class="kampf-info">Beute: ${beuteHtml(z.beute)}</div><button class="knopf gross rot" data-los ${meine.length ? '' : 'disabled'}>${icon('angriff')} Angriff!</button>`;
      oben.querySelector('[data-zu]').onclick = () => { this.spiel.ton('klick'); this.schliessen(); };
      seiten.querySelectorAll('[data-seite]').forEach((b) => b.onclick = () => { this.seite = b.dataset.seite; this.spiel.ton('klick'); this.neueVorschau(); this.leiste(); });
      unten.querySelector('[data-los]').onclick = () => this.angreifen();
      if (!meine.length) this.panel('<h3>Keine Einheiten bereit</h3><p class="hinweis">Bilde Einheiten aus oder warte, bis die Verwundeten geheilt sind.</p>');
    } else if (this.modus === 'kampf') {
      seiten.innerHTML = '';
      oben.innerHTML = `<span class="chip" data-prozent></span><span class="chip" data-sterne></span><span class="chip" data-zeit></span><button class="knopf klein2" data-tempo>Tempo ${this.tempo}x</button><button class="knopf klein2" data-skip>Zum Ende</button>`;
      unten.innerHTML = '';
      oben.querySelector('[data-tempo]').onclick = (e) => { this.tempo = this.tempo >= 4 ? 1 : this.tempo * 2; e.target.textContent = `Tempo ${this.tempo}x`; };
      oben.querySelector('[data-skip]').onclick = () => { this.tempo = 50; };
    }
  }
  armeeLeiste(liste) {
    const g = new Map();
    for (const u of liste) { const k = u.typ + '|' + u.stufe; g.set(k, (g.get(k) || 0) + 1); }
    return [...g.entries()].sort((a, b) => EINHEITEN[b[0].split('|')[0]].zeitalter - EINHEITEN[a[0].split('|')[0]].zeitalter).slice(0, 12).map(([k, n]) => { const [typ, st] = k.split('|'); return `<div class="ka-e"><img src="${einheitPortrait(typ, +st, 'blau', 48)}" alt=""><b>${n}</b>${+st ? sterneHtml(Math.min(5, +st), '#ffd23f') : ''}</div>`; }).join('') || '<span class="hinweis">Keine Einheiten bereit</span>';
  }
  panel(html) { const p = this.el.querySelector('.vb-panel'); if (!p) return; p.innerHTML = html; p.hidden = !html; return p; }

  // ------------------------------------------------ Angriff
  async angreifen() {
    const z = this.ziel;
    const los = this.el.querySelector('[data-los]'); if (los) los.disabled = true;
    Audio.spiele('horn');
    let r;
    if (z.art === 'raid') r = await api('/raid/angriff', { seite: this.seite });
    else r = await api('/barbaren/angriff', { quelle: z.art === 'kampagne' ? 'kampagne' : 'dorf', i: z.i, seite: this.seite });
    if (!r.ok) { this.spiel.ui.toast(r.fehler || 'Fehler', 'rot'); Audio.spiele('fehler'); if (los) los.disabled = false; return; }
    this.spiel.uebernehme(r.s, r.jetzt);
    this.abspielen(r.eingabe, r.ergebnis, z.titel);
  }
  abspielen(eingabe, ergebnis, titel, wiederholung = false) {
    if (this.el.hidden) this.oeffnen();
    this.kampf = new Kampf(eingabe);
    this.ergebnisServer = ergebnis; this.titel = titel; this.wiederholung = wiederholung;
    this.modus = 'kampf'; this.tempo = 1; this.akku = 0; this.effekte = []; if (wiederholung) this.cam = null;
    this.panel('');
    this.leiste();
    Audio.musikStopp();
  }
  ende() {
    this.modus = 'ende';
    const e = this.ergebnisServer || this.kampf.ergebnis();
    const sieg = e.sterne >= 1;
    Audio.spiele(sieg ? 'sieg' : 'niederlage');
    const gef = (e.gefallenA || []).length;
    const sterne = [0, 1, 2].map((i) => `<span class="gross-stern ${i < e.sterne ? 'an' : ''}">${icon('stern')}</span>`).join('');
    const p = this.panel(`<h3 class="${sieg ? 'sieg' : 'niederlage'}">${sieg ? 'Sieg!' : 'Niederlage'}</h3><div class="sterne-gross">${sterne}</div>
      <p><b>${e.prozent} %</b> zerstört · ${esc(this.titel || '')}</p>
      ${this.wiederholung ? '' : `<p>Beute: ${beuteHtml(e.beute)}</p>${e.ruhm != null ? `<p>${icon('ruhm')} ${e.ruhm >= 0 ? '+' : ''}${e.ruhm} Ruhm</p>` : ''}${gef ? `<p class="hinweis">${icon('heilen')} ${gef} ${gef === 1 ? 'Einheit ist' : 'Einheiten sind'} verwundet und ${gef === 1 ? 'muss' : 'müssen'} geheilt werden.</p>` : ''}`}
      <button class="knopf gross gruen" data-fertig>${icon('haken')} Zurück ins Lager</button>`);
    p.querySelector('[data-fertig]').onclick = () => { this.spiel.ton('klick'); this.schliessen(); this.spiel.tutorial?.ereignis('kampf'); };
    const oben = this.el.querySelector('.vb-oben'); if (oben) oben.querySelectorAll('[data-tempo],[data-skip]').forEach((x) => x.remove());
  }

  // ------------------------------------------------ Zeichnen
  rahmen(t) {
    const dt = Math.min(0.1, (t - this.letzt) / 1000); this.letzt = t;
    const k = this.kampf;
    if (this.modus === 'kampf' && k && !k.ende) {
      this.akku += dt * this.tempo;
      let schritte = 0;
      while (this.akku >= DT && !k.ende && schritte++ < 400) { this.akku -= DT; k.schritt(); this.ereignisseVerarbeiten(k.ereignisse, this.tempo > 8); }
      if (k.ende) this.ende();
      const o = this.el.querySelector('.vb-oben');
      if (o) {
        const pz = o.querySelector('[data-prozent]'); if (pz) pz.textContent = `${k.prozent()} % zerstört`;
        const st = o.querySelector('[data-sterne]'); if (st) st.innerHTML = [0, 1, 2].map((i) => `<span class="mini-stern ${i < k.sterne() ? 'an' : ''}">${icon('stern')}</span>`).join('');
        const z = o.querySelector('[data-zeit]'); if (z) z.innerHTML = `${icon('uhr')} ${dauer((KAMPF_DAUER - k.zeit) * 1000)}`;
      }
    }
    this.zeichne(t / 1000, dt);
  }
  ereignisseVerarbeiten(ev, still) {
    let ton = {};
    for (const e of ev) {
      if (e.art === 'schuss' || e.art === 'turm') {
        this.effekte.push({ art: 'geschoss', ...e, zeit: 0, dauer: e.art === 'turm' && (e.typ === 'moerser' || e.typ === 'ionenkanone') ? 0.6 : e.linie === 'belagerung' ? 0.6 : 0.22 });
        const za = e.za ?? 3;
        if (e.typ === 'laserturm' || e.typ === 'ionenkanone' || za >= 8) ton.laser = 1; else if (e.linie === 'belagerung' || e.typ === 'moerser') ton.schuss = 1; else if (za <= 2 && e.art === 'schuss') ton.pfeil = 1; else ton.schuss = 1;
      } else if (e.art === 'hieb') { this.effekte.push({ art: 'hieb', x: e.zx, y: e.zy, zeit: 0, dauer: 0.2 }); ton.schwert = 1; }
      else if (e.art === 'knall') { this.effekte.push({ art: 'knall', x: e.x, y: e.y, r: e.r, zeit: 0, dauer: 0.5 }); ton.explosion = 1; }
      else if (e.art === 'einsturz') { this.effekte.push({ art: 'staub', x: e.x, y: e.y, gr: e.gr, zeit: 0, dauer: 1.1 }); ton.einsturz = 1; }
      else if (e.art === 'tot') this.effekte.push({ art: 'puff', x: e.x, y: e.y, zeit: 0, dauer: 0.6 });
      else if (e.art === 'falle') { this.effekte.push({ art: 'knall', x: e.x, y: e.y, r: 1.2, zeit: 0, dauer: 0.5 }); ton.explosion = 1; }
    }
    if (!still) { const jetzt = performance.now(); this.tonZeit = this.tonZeit || {}; for (const n in ton) if (!this.tonZeit[n] || jetzt - this.tonZeit[n] > 90) { this.tonZeit[n] = jetzt; Audio.spiele(n); } }
    if (this.effekte.length > 300) this.effekte.splice(0, this.effekte.length - 300);
  }
  zeichne(t, dt) {
    const c = this.c, k = this.kampf; if (!k) return;
    c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    c.fillStyle = '#3f8a34'; c.fillRect(0, 0, this.W, this.H);
    if (!this.cam) this.kameraStart();
    const z = this.cam.z, mx = this.cam.x, my = this.cam.y;
    c.setTransform(this.dpr * z, 0, 0, this.dpr * z, this.dpr * (this.W / 2 - mx * z), this.dpr * (this.H / 2 - 20 - my * z));
    c.drawImage(this.boden.bild, -this.boden.ox, -this.boden.oy);
    if (this.modus === 'vorschau') this.seitenZone(c, t);
    const za = this.ziel ? this.ziel.za : Math.max(0, (k.zentrum ? k.zentrum.stufe : 1) - 1);
    const liste = [];
    for (const b of k.gebaeude) liste.push({ tiefe: b.x + b.y + b.gr * 2 - 0.5, f: () => this.gebaeude(c, b, za) });
    for (const u of k.einheiten) if (!u.tot) liste.push({ tiefe: u.x + u.y + 0.3 + (u.flug ? 100 : 0), f: () => this.einheit(c, u, t) });
    liste.sort((a, b) => a.tiefe - b.tiefe);
    for (const e of liste) e.f();
    this.effekte = this.effekte.filter((e) => (e.zeit += dt * Math.min(this.tempo, 4)) < e.dauer);
    for (const e of this.effekte) this.effekt(c, e);
  }
  seitenZone(c, t) {
    const s = this.seite, a = 0.25 + Math.sin(t * 4) * 0.1;
    const ecken = { ol: [[0, 0], [3, 0], [3, N], [0, N]], or: [[0, 0], [N, 0], [N, 3], [0, 3]], ur: [[N - 3, 0], [N, 0], [N, N], [N - 3, N]], ul: [[0, N - 3], [N, N - 3], [N, N], [0, N]] }[s];
    c.save(); c.fillStyle = `rgba(80,160,255,${a})`; c.beginPath(); ecken.forEach(([x, y], i) => { const [px, py] = iso(x, y); i ? c.lineTo(px, py) : c.moveTo(px, py); }); c.closePath(); c.fill(); c.restore();
  }
  gebaeude(c, b, za) {
    const [x, y] = iso(b.x, b.y);
    if (b.weg) {
      if (b.falle) return;
      // Trümmer
      const [mx, my] = iso(b.x + b.gr / 2, b.y + b.gr / 2);
      c.save(); c.fillStyle = 'rgba(60,45,30,0.55)';
      c.beginPath(); c.moveTo(...iso(b.x + 0.1, b.y + 0.1)); c.lineTo(...iso(b.x + b.gr - 0.1, b.y + 0.1)); c.lineTo(...iso(b.x + b.gr - 0.1, b.y + b.gr - 0.1)); c.lineTo(...iso(b.x + 0.1, b.y + b.gr - 0.1)); c.closePath(); c.fill();
      for (let i = 0; i < b.gr * 3; i++) { const a = i * 2.3, r = (i % 3 + 1) * b.gr * 4; c.fillStyle = i % 2 ? '#8d8a80' : '#6d6a62'; c.beginPath(); c.arc(mx + Math.cos(a) * r, my + Math.sin(a) * r * 0.5 - 3, 2 + (i % 3), 0, 7); c.fill(); }
      c.restore();
      return;
    }
    if (b.falle && this.modus !== 'vorschau') return;
    const bz = bildZeitalter(b.typ, b.stufe, za);
    const sp = gebaeudeSprite(b.typ, b.stufe, bz, b.mauer ? this.mauerMaske(b) : (b.id % 7));
    c.drawImage(sp.bild, x - sp.ox, y - sp.oy, sp.w, sp.h);
    if (b.hp < b.max && !b.mauer) {
      const [mx, my] = iso(b.x + b.gr / 2, b.y + b.gr / 2);
      const w = 18 + b.gr * 10, p = b.hp / b.max;
      c.fillStyle = RAND; c.fillRect(mx - w / 2 - 1.5, my - 50 - b.gr * 8 - 1.5, w + 3, 7);
      c.fillStyle = p > 0.5 ? '#5be38c' : p > 0.25 ? '#ffd23f' : '#ff6b5c'; c.fillRect(mx - w / 2, my - 50 - b.gr * 8, w * p, 4);
      if (b.schild > 0) { c.fillStyle = '#7fe7ff'; c.fillRect(mx - w / 2, my - 54 - b.gr * 8, w * Math.min(1, b.schild / b.max), 2.5); }
    }
  }
  mauerMaske(b) {
    if (!this._mm || this._mmK !== this.kampf) {
      this._mmK = this.kampf; this._mm = new Map();
      const pos = new Set(this.kampf.gebaeude.filter((g) => g.mauer).map((g) => g.x + ',' + g.y));
      for (const g of this.kampf.gebaeude) if (g.mauer) this._mm.set(g.i, (pos.has((g.x + 1) + ',' + g.y) ? 1 : 0) | (pos.has(g.x + ',' + (g.y + 1)) ? 2 : 0));
    }
    return this._mm.get(b.i) || 0;
  }
  einheit(c, u, t) {
    const [x, y] = iso(u.x, u.y);
    zeichneEinheit(c, x, y, u.typ, u.stufe, u.seite === 'a' ? 'blau' : 'rot', u.laeuft ? u.phase : 0.25, u.dir, { skala: 1.35 });
    if (u.hp < u.max) {
      const h = einheitHoehe(u.typ) * 1.35 + 8, w = u.flug ? 22 : 18, p = Math.max(0, u.hp / u.max);
      c.fillStyle = RAND; c.fillRect(x - w / 2 - 1, y - h - 1, w + 2, 5);
      c.fillStyle = u.seite === 'a' ? '#5be38c' : '#ff6b5c'; c.fillRect(x - w / 2, y - h, w * p, 3);
    }
  }
  effekt(c, e) {
    const p = e.zeit / e.dauer;
    if (e.art === 'geschoss') {
      const [ax, ay] = iso(e.ax, e.ay), [zx, zy] = iso(e.zx, e.zy);
      const hA = e.art === 'turm' ? 40 : 18, hZ = e.flug ? 40 : 12;
      const bog = (e.linie === 'belagerung' || e.typ === 'moerser') ? 70 : 0;
      const x = ax + (zx - ax) * p, y = ay - hA + (zy - hZ - ay + hA) * p - Math.sin(p * Math.PI) * bog;
      const za = e.za ?? (e.typ === 'laserturm' ? 8 : e.typ === 'ionenkanone' ? 10 : e.typ === 'wachturm' ? 2 : 5);
      if (e.typ === 'laserturm' || e.typ === 'ionenkanone' || (za >= 8 && e.linie !== 'belagerung')) {
        c.save(); c.globalAlpha = 1 - p; c.strokeStyle = za >= 10 ? '#ffe27a' : za >= 9 ? '#ff7ef0' : '#7ea0ff'; c.shadowColor = c.strokeStyle; c.shadowBlur = 8; c.lineWidth = e.typ === 'ionenkanone' ? 6 : 2.5;
        c.beginPath(); c.moveTo(ax, ay - hA); c.lineTo(zx, zy - hZ); c.stroke(); c.restore();
      } else if (e.linie === 'belagerung' || e.typ === 'moerser') {
        c.fillStyle = za <= 2 ? '#7d7468' : '#2a2f38'; c.beginPath(); c.arc(x, y, 4, 0, 7); c.fill(); c.strokeStyle = RAND; c.lineWidth = 1; c.stroke();
      } else if (za <= 2) {
        const w = Math.atan2(zy - hZ - (ay - hA), zx - ax);
        c.save(); c.translate(x, y); c.rotate(w); c.strokeStyle = '#6d4a2a'; c.lineWidth = 1.6; c.beginPath(); c.moveTo(-7, 0); c.lineTo(5, 0); c.stroke(); c.fillStyle = '#ddd'; c.beginPath(); c.moveTo(7, 0); c.lineTo(3, -2); c.lineTo(3, 2); c.fill(); c.restore();
      } else {
        c.save(); c.strokeStyle = '#ffe9a0'; c.lineWidth = 2; c.globalAlpha = 0.9; c.beginPath(); c.moveTo(x, y); c.lineTo(x - (zx - ax) * 0.08, y - (zy - ay) * 0.08); c.stroke(); c.restore();
        if (p < 0.3) glow(c, ax, ay - hA, 2, '#ffd23f');
      }
    } else if (e.art === 'hieb') {
      const [x, y] = iso(e.x, e.y);
      c.save(); c.globalAlpha = 1 - p; c.strokeStyle = '#fff'; c.lineWidth = 2.5; c.beginPath(); c.arc(x, y - 16, 9 + p * 6, -0.8, 0.8); c.stroke(); c.restore();
    } else if (e.art === 'knall') {
      const [x, y] = iso(e.x, e.y);
      const r = (e.r || 1) * TW * 0.45 * (0.4 + p);
      c.save(); c.globalAlpha = 1 - p;
      const g = c.createRadialGradient(x, y - 8, 0, x, y - 8, r); g.addColorStop(0, '#fff6b0'); g.addColorStop(0.4, '#ff9a3c'); g.addColorStop(1, 'rgba(120,60,20,0)');
      c.fillStyle = g; c.beginPath(); c.ellipse(x, y - 8, r, r * 0.7, 0, 0, 7); c.fill(); c.restore();
    } else if (e.art === 'staub') {
      const [x, y] = iso(e.x, e.y);
      c.save(); c.globalAlpha = (1 - p) * 0.8;
      for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; const r = e.gr * 10 + p * 30; c.fillStyle = i % 2 ? '#c9bfa6' : '#a99d85'; c.beginPath(); c.arc(x + Math.cos(a) * r, y - 14 + Math.sin(a) * r * 0.5 - p * 20, 10 + p * 10, 0, 7); c.fill(); }
      c.restore();
    } else if (e.art === 'puff') {
      const [x, y] = iso(e.x, e.y);
      c.save(); c.globalAlpha = 1 - p; for (let i = 0; i < 5; i++) { c.fillStyle = '#eee'; c.beginPath(); c.arc(x + Math.cos(i * 1.3) * p * 14, y - 10 - p * 16 + Math.sin(i * 1.3) * p * 6, 5 * (1 - p) + 2, 0, 7); c.fill(); }
      c.restore();
    }
  }
}

// ------------------------------------------------ Angriffs-Fenster (im UI)
export function einbauen(spiel) {
  const ansicht = new KampfAnsicht(spiel);
  spiel.kampf = ansicht;
  const ui = spiel.ui;
  ui.f_angriff = function (tab) {
    const s = spiel.s;
    tab = tab || this.angriffTab || 'kampagne'; this.angriffTab = tab;
    const tabs = [['kampagne', 'Kampagne'], ['barbaren', 'Barbaren'], ['raid', 'Spieler'], ['berichte', 'Berichte']];
    const gesund = s.einheiten.filter((u) => !u.verwundet && !u.gesperrt).length, verw = s.einheiten.filter((u) => u.verwundet).length;
    let inhalt = '';
    if (tab === 'kampagne') {
      const nr = s.kampagne || 0;
      const za = Math.min(10, KAMPAGNE[Math.min(nr, KAMPAGNE.length - 1)].za);
      const zeigen = KAMPAGNE.filter((k) => k.za <= Math.max(za, R.zeitalter(s)) + 0);
      const gruppen = {};
      for (const k of zeigen) (gruppen[k.za] = gruppen[k.za] || []).push(k);
      inhalt = Object.entries(gruppen).reverse().map(([z, liste]) => `<h3 class="za-titel" style="--za:${ZEITALTER[z].farbe}">${ZEITALTER[z].name}</h3><div class="kampagne">${liste.map((k) => {
        const fertig = k.nr < nr, aktuell = k.nr === nr;
        const st = (s.kampagneSterne || {})[k.nr] || 0;
        return `<button class="kamp-k ${fertig ? 'fertig' : aktuell ? 'aktuell' : 'zu'} ${k.boss ? 'boss' : ''}" data-kamp="${k.nr}" ${aktuell ? '' : 'disabled'}>
          <b>${esc(k.name)}</b><small>${k.boss ? 'Anführer' : 'Dorf ' + (k.k + 1)} · Stärke ${zahl(k.macht)}</small>
          ${fertig ? `<span class="kamp-sterne">${[0, 1, 2].map((i) => `<span class="mini-stern ${i < st ? 'an' : ''}">${icon('stern')}</span>`).join('')}</span>` : aktuell ? `<span class="k">${beuteHtml(k.beute)}</span>` : ''}</button>`;
      }).join('')}</div>`).join('');
      if (nr >= KAMPAGNE.length) inhalt = '<p class="ok">Du hast die ganze Kampagne geschafft!</p>' + inhalt;
      else if (KAMPAGNE[nr].za > R.zeitalter(s)) inhalt = `<p class="hinweis">Das nächste Dorf gehört zum ${ZEITALTER[KAMPAGNE[nr].za].name}. Du kannst es trotzdem schon angreifen.</p>` + inhalt;
    } else if (tab === 'barbaren') {
      if (!this.barbarenDaten || Date.now() - this.barbarenGeladen > 60000) {
        this.barbarenGeladen = Date.now();
        api('/barbaren').then((r) => { if (r.ok) { this.barbarenDaten = r; this.rendereFenster(); } });
      }
      const b = this.barbarenDaten;
      inhalt = !b ? '<p class="hinweis">Späher suchen Dörfer …</p>' : `<p class="hinweis">Dörfer in deiner Stärke. Neue Dörfer in ${dauer(b.neuIn - (Date.now() - this.barbarenGeladen))} oder wenn alle besiegt sind.</p><div class="raster dorf-raster">${b.barbaren.liste.map((d) => `
        <button class="dorf-k ${d.besiegt ? 'besiegt' : ''}" data-dorf="${d.i}" ${d.besiegt ? 'disabled' : ''}><b>${esc(d.titel)}</b><small>${esc(d.name)} · ${ZEITALTER[d.za].name}</small><span>${icon('armee')} Stärke ${zahl(d.macht)}</span><span class="k">${beuteHtml(d.beute)}</span>${d.besiegt ? '<em>Besiegt</em>' : ''}</button>`).join('')}</div>`;
    } else if (tab === 'raid') {
      const schutz = Math.max(s.schildBis || 0, s.neulingBis || 0) - spiel.jetzt();
      const preis = Math.round(40 * Math.pow(2.3, R.zeitalter(s)));
      inhalt = `<p class="hinweis">Greif das Lager eines anderen Spielers an. Es wehrt sich mit seinen Türmen, Mauern und Einheiten. Du bekommst einen Teil seines Goldes und seiner Rohstoffe und gewinnst oder verlierst Ruhm.</p>
        ${schutz > 0 ? `<p class="frage">${icon('schild')} Du bist noch ${dauer(schutz)} geschützt. Wenn du angreifst, endet dein Schutz.</p>` : ''}
        <button class="knopf gross rot" data-suchen>${icon('kundschafter')} Gegner suchen (${icon('gold')} ${zahl(preis)})</button>
        <div data-rang></div>`;
      api('/rangliste').then((r) => { const el = document.querySelector('[data-rang]'); if (el && r.ok) el.innerHTML = `<h3>Rangliste</h3><table class="rang">${r.liste.slice(0, 20).map((x, i) => `<tr class="${x.ich ? 'ich' : ''}"><td>${i + 1}.</td><td>${esc(x.name)}</td><td>${ZEITALTER[x.zeitalter].name}</td><td>${icon('ruhm')} ${zahl(x.ruhm)}</td></tr>`).join('')}</table>`; });
    } else if (tab === 'berichte') {
      if (!this.berichte || Date.now() - this.berichteGeladen > 20000) {
        this.berichteGeladen = Date.now();
        api('/berichte').then((r) => { if (r.ok) { this.berichte = r; this.rendereFenster(); } });
      }
      const b = this.berichte;
      inhalt = !b ? '<p class="hinweis">Lädt …</p>' : b.liste.length ? `<div class="berichte">${b.liste.map((x) => {
        const e = x.ergebnis, angr = x.art === 'barbar' || x.angreiferName === b.ich;
        const titel = x.art === 'barbar' ? `Angriff auf ${esc(x.name)}` : angr ? `Raid auf ${esc(x.verteidigerName)}` : `${esc(x.angreiferName)} hat dich angegriffen`;
        return `<div class="bericht ${angr ? '' : 'verteidigung'}"><div><b>${titel}</b><small>${new Date(x.t).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })} · ${e.prozent} % · ${[0, 1, 2].map((i) => `<span class="mini-stern ${i < e.sterne ? 'an' : ''}">${icon('stern')}</span>`).join('')}${e.ruhm != null ? ` · ${icon('ruhm')} ${angr ? (e.ruhm >= 0 ? '+' : '') + e.ruhm : (e.ruhm > 0 ? '-' : '+') + Math.abs(e.ruhm)}` : ''}</small><span class="k">${angr ? 'Beute' : 'Verloren'}: ${beuteHtml(e.beute)}</span></div><button class="knopf klein2" data-ansehen="${x.id}">${icon('auge')} Ansehen</button></div>`;
      }).join('')}</div>` : '<p class="hinweis">Noch keine Kämpfe.</p>';
    }
    return {
      titel: 'Angriff', klasse: 'breit',
      html: `<div class="tabs">${tabs.map(([k, t]) => `<button class="tab ${k === tab ? 'an' : ''}" data-at="${k}">${t}</button>`).join('')}</div>
        <div class="leiste-info"><span>${icon('armee')} ${gesund} bereit · Stärke ${zahl(spiel.macht())}</span>${verw ? `<span class="verw">${icon('heilen')} ${verw} verwundet</span>` : ''}</div>${inhalt}`,
      nach: (el) => {
        el.querySelectorAll('[data-at]').forEach((b) => b.onclick = () => { spiel.ton('klick'); this.oeffne('angriff', b.dataset.at); });
        el.querySelectorAll('[data-kamp]').forEach((b) => b.onclick = () => {
          const k = KAMPAGNE[+b.dataset.kamp]; this.schliessen();
          ansicht.vorschau({ art: 'kampagne', titel: k.name, basis: erzeugeDorf(k), za: k.za, beute: k.beute });
        });
        el.querySelectorAll('[data-dorf]').forEach((b) => b.onclick = () => {
          const d = this.barbarenDaten.barbaren.liste[+b.dataset.dorf]; this.schliessen();
          ansicht.vorschau({ art: 'dorf', i: d.i, titel: `${d.titel}: ${d.name}`, basis: erzeugeDorf(d), za: d.za, beute: d.beute, macht: d.macht });
        });
        const su = el.querySelector('[data-suchen]');
        if (su) su.onclick = async () => {
          if (Math.max(s.schildBis || 0, s.neulingBis || 0) > spiel.jetzt() && !confirm('Wenn du angreifst, endet dein Schutz. Trotzdem suchen?')) return;
          su.disabled = true;
          const r = await api('/raid/suchen', {});
          su.disabled = false;
          if (!r.ok) { this.toast(r.fehler, 'rot'); spiel.ton('fehler'); return; }
          spiel.uebernehme(r.s, r.jetzt);
          const g = r.gegner; this.schliessen();
          ansicht.vorschau({ art: 'raid', titel: `${g.name} (${g.lager})`, basis: g.basis, za: g.zeitalter, beute: g.beute });
        };
        el.querySelectorAll('[data-ansehen]').forEach((b) => b.onclick = async () => {
          const r = await api('/bericht', { id: +b.dataset.ansehen });
          if (!r.ok) { this.toast(r.fehler, 'rot'); return; }
          this.schliessen();
          const x = r.bericht;
          ansicht.ziel = null;
          ansicht.abspielen(x.eingabe, x.ergebnis, x.art === 'barbar' ? x.name : `${x.angreiferName} gegen ${x.verteidigerName}`, true);
        });
      },
    };
  };
  ui.f_rangliste = function () { this.angriffTab = 'raid'; return this.f_angriff('raid'); };
}
void kostenHtml; void GEBAEUDE; void farbe; void sternForm; void dauer;
