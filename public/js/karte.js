// Die Weltkarte: Nebel, Rohstoff-Felder, Handwerker und Kundschafter, Lager der anderen Spieler.
import { ROHSTOFFE, ZEITALTER } from '../shared/daten.js';
import * as R from '../shared/regeln.js';
import { biom, feldRohstoff, sichtbar, abstand, BIOME, hash, KUNDSCHAFT_SICHT, HANDWERKER_FELDER_PRO_MIN, KUNDSCHAFTER_FELDER_PRO_MIN } from '../shared/karte.js';
import { handwerkerTempo, handwerkerTraglast } from '../shared/daten.js';
import { icon, iconBild } from './icons.js';
import { zahl, dauer, esc } from './format.js';
import { api } from './api.js';
import { RAND, farbe } from './grafik.js';

const T = 30; // Pixel pro Feld bei Zoom 1

class Karte {
  constructor(spiel) {
    this.spiel = spiel;
    this.el = document.getElementById('vollbild');
    this.cam = { x: 0, y: 0, z: 1.2 };
    this.nachbarn = [];
    this.wahl = null;
    this.zeiger = new Map();
  }
  get s() { return this.spiel.s; }
  oeffnen(ziel) {
    this.el.hidden = false; this.spiel.verdeckt = true;
    this.el.innerHTML = `<canvas></canvas><div class="vb-oben"><span class="chip" data-hw></span><span class="chip" data-ks></span><button class="knopf klein" data-zu title="Zurück zum Lager">${icon('x')}</button></div><div class="vb-panel" hidden></div><div class="vb-unten"><button class="knopf" data-heim>${icon('bauen')} Mein Lager</button><button class="knopf" data-liste>${icon('handwerker')} Handwerker</button></div>`;
    this.cv = this.el.querySelector('canvas'); this.c = this.cv.getContext('2d');
    this.panel = this.el.querySelector('.vb-panel');
    this.el.querySelector('[data-zu]').onclick = () => this.schliessen();
    this.el.querySelector('[data-heim]').onclick = () => { this.cam.x = this.s.heim.x; this.cam.y = this.s.heim.y; };
    this.el.querySelector('[data-liste]').onclick = () => this.zeigeListe();
    this.resize(); this.ro = () => this.resize(); addEventListener('resize', this.ro);
    const z = ziel || this.s.heim; this.cam.x = z.x; this.cam.y = z.y;
    this.eingabe();
    this.laeuft = true; this.wahl = null;
    const lauf = () => { if (!this.laeuft) return; this.zeichne(); requestAnimationFrame(lauf); };
    requestAnimationFrame(lauf);
    api('/nachbarn').then((r) => { if (r.ok) this.nachbarn = r.lager; });
    this.spiel.ton('karte');
    this.chips();
    this.chipTimer = setInterval(() => { this.chips(); if (this.wahl) this.zeigeFeld(this.wahl.x, this.wahl.y, true); }, 1000);
  }
  schliessen() { this.laeuft = false; this.el.hidden = true; this.el.innerHTML = ''; this.spiel.verdeckt = false; removeEventListener('resize', this.ro); clearInterval(this.chipTimer); }
  chips() {
    const s = this.s, e = R.effekte(s);
    const hw = this.el.querySelector('[data-hw]'); if (!hw) return;
    hw.innerHTML = `${icon('handwerker')} ${s.handwerker.filter((h) => !h.stopp).length}/${R.handwerkerAnzahl(s, e)} Handwerker`;
    this.el.querySelector('[data-ks]').innerHTML = `${icon('kundschafter')} ${s.kundschafter.length}/${e.kundschafter} Kundschafter`;
  }
  resize() { this.dpr = Math.min(2, devicePixelRatio || 1); this.W = innerWidth; this.H = innerHeight; this.cv.width = this.W * this.dpr; this.cv.height = this.H * this.dpr; this.cv.style.width = this.W + 'px'; this.cv.style.height = this.H + 'px'; }
  zuBild(x, y) { const k = T * this.cam.z; return [(x - this.cam.x) * k + this.W / 2, (y - this.cam.y) * k + this.H / 2]; }
  feldBei(bx, by) { const k = T * this.cam.z; return [Math.floor((bx - this.W / 2) / k + this.cam.x + 0.5), Math.floor((by - this.H / 2) / k + this.cam.y + 0.5)]; }

  zeichne() {
    const c = this.c, s = this.s; if (!s) return;
    const e = R.effekte(s);
    c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    c.fillStyle = '#1a2430'; c.fillRect(0, 0, this.W, this.H);
    const k = T * this.cam.z;
    const x0 = Math.floor(this.cam.x - this.W / 2 / k) - 1, x1 = Math.ceil(this.cam.x + this.W / 2 / k) + 1;
    const y0 = Math.floor(this.cam.y - this.H / 2 / k) - 1, y1 = Math.ceil(this.cam.y + this.H / 2 / k) + 1;
    const zeit = performance.now() / 1000;
    // Gelände
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const [bx, by] = this.zuBild(x, y);
      const sieht = sichtbar(s.sicht, x, y);
      const b = biom(x, y);
      let col = BIOME[b].farbe;
      const h = hash(x, y, 5);
      if (b !== 'wasser') col = farbe(col, ((h & 15) - 7) / 120);
      c.fillStyle = col; c.fillRect(bx - k / 2, by - k / 2, k + 0.6, k + 0.6);
      if (k > 14) this.deko(c, b, bx, by, k, h, zeit);
      if (!sieht) { c.fillStyle = 'rgba(14,20,30,0.82)'; c.fillRect(bx - k / 2, by - k / 2, k + 0.6, k + 0.6); }
    }
    // Wolkenränder des Nebels (weich)
    // Rohstoffe
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const r = R.rohstoffAuf(s, x, y); if (!r || !e.sicht.has(r) || !sichtbar(s.sicht, x, y)) continue;
      const [bx, by] = this.zuBild(x, y);
      const rad = Math.max(8, k * 0.42);
      c.fillStyle = 'rgba(255,255,255,0.9)'; c.strokeStyle = RAND; c.lineWidth = 2;
      c.beginPath(); c.arc(bx, by, rad, 0, 7); c.fill(); c.stroke();
      c.strokeStyle = ROHSTOFFE[r].farbe; c.lineWidth = 3; c.beginPath(); c.arc(bx, by, rad - 3, 0, 7); c.stroke();
      const img = iconBild(r); if (img.complete) c.drawImage(img, bx - rad * 0.75, by - rad * 0.75, rad * 1.5, rad * 1.5);
    }
    // Lager der anderen
    for (const n of this.nachbarn) {
      if (!sichtbar(s.sicht, n.x, n.y)) continue;
      const [bx, by] = this.zuBild(n.x, n.y);
      this.lagerSymbol(c, bx, by, k, '#e0453a', n.name, ZEITALTER[n.zeitalter]?.name);
    }
    const [hx, hy] = this.zuBild(s.heim.x, s.heim.y);
    this.lagerSymbol(c, hx, hy, k, '#3b82f6', s.name, 'Dein Lager');
    // Wege und Wanderer
    const jetzt = this.spiel.jetzt();
    for (const h of s.handwerker) this.wanderer(c, h, jetzt, '#ffd23f', 'handwerker');
    for (const q of s.kundschafter) this.wanderer(c, q, jetzt, '#7fe7ff', 'kundschafter');
    // Auswahl
    if (this.wahl) {
      const [bx, by] = this.zuBild(this.wahl.x, this.wahl.y);
      c.strokeStyle = '#fff'; c.lineWidth = 3; c.setLineDash([6, 4]); c.lineDashOffset = -zeit * 20;
      c.strokeRect(bx - k / 2, by - k / 2, k, k); c.setLineDash([]);
      if (!sichtbar(s.sicht, this.wahl.x, this.wahl.y)) { c.strokeStyle = 'rgba(127,231,255,0.6)'; c.lineWidth = 2; c.beginPath(); c.arc(bx, by, KUNDSCHAFT_SICHT * k, 0, 7); c.stroke(); }
    }
  }
  deko(c, b, x, y, k, h, t) {
    const r = (h >>> 4) % 100 / 100;
    if (b === 'wald' && r < 0.7) { c.fillStyle = '#2f6e33'; c.beginPath(); c.moveTo(x - k * 0.25, y + k * 0.25); c.lineTo(x, y - k * 0.3); c.lineTo(x + k * 0.25, y + k * 0.25); c.fill(); }
    else if (b === 'berg') { c.fillStyle = '#7a756d'; c.beginPath(); c.moveTo(x - k * 0.4, y + k * 0.35); c.lineTo(x, y - k * 0.35); c.lineTo(x + k * 0.4, y + k * 0.35); c.fill(); c.fillStyle = '#f2f2f2'; c.beginPath(); c.moveTo(x - k * 0.12, y - k * 0.12); c.lineTo(x, y - k * 0.35); c.lineTo(x + k * 0.12, y - k * 0.12); c.fill(); }
    else if (b === 'huegel' && r < 0.5) { c.fillStyle = 'rgba(80,90,40,0.35)'; c.beginPath(); c.ellipse(x, y + k * 0.1, k * 0.35, k * 0.2, 0, Math.PI, 0); c.fill(); }
    else if (b === 'wasser' && r < 0.3) { c.strokeStyle = 'rgba(255,255,255,0.35)'; c.lineWidth = 1.5; c.beginPath(); const w = Math.sin(t + h) * k * 0.05; c.moveTo(x - k * 0.25, y + w); c.quadraticCurveTo(x, y - k * 0.12 + w, x + k * 0.25, y + w); c.stroke(); }
    else if (b === 'wiese' && r < 0.12) { c.fillStyle = '#fff7a8'; c.beginPath(); c.arc(x, y, Math.max(1, k * 0.05), 0, 7); c.fill(); }
    else if (b === 'schnee' && r < 0.3) { c.fillStyle = '#4f7f5f'; c.beginPath(); c.moveTo(x - k * 0.18, y + k * 0.2); c.lineTo(x, y - k * 0.22); c.lineTo(x + k * 0.18, y + k * 0.2); c.fill(); }
  }
  lagerSymbol(c, x, y, k, col, name, unter) {
    const g = Math.max(14, k * 0.8);
    c.fillStyle = col; c.strokeStyle = RAND; c.lineWidth = 2.5;
    c.beginPath(); c.moveTo(x - g * 0.7, y + g * 0.5); c.lineTo(x, y - g * 0.6); c.lineTo(x + g * 0.7, y + g * 0.5); c.closePath(); c.fill(); c.stroke();
    c.fillStyle = RAND; c.beginPath(); c.moveTo(x - g * 0.2, y + g * 0.5); c.lineTo(x, y + g * 0.05); c.lineTo(x + g * 0.2, y + g * 0.5); c.fill();
    c.font = `${Math.max(12, Math.min(17, k * 0.5))}px "Lilita One"`; c.textAlign = 'center';
    c.lineWidth = 4; c.strokeText(name, x, y + g * 0.5 + 16); c.fillStyle = '#fff'; c.fillText(name, x, y + g * 0.5 + 16);
    if (unter) { c.font = '11px Nunito'; c.lineWidth = 3; c.strokeText(unter, x, y + g * 0.5 + 29); c.fillStyle = '#ffe9a8'; c.fillText(unter, x, y + g * 0.5 + 29); }
  }
  wanderer(c, h, jetzt, col, art) {
    const s = this.s;
    const [ax, ay] = this.zuBild(s.heim.x, s.heim.y), [bx, by] = this.zuBild(h.x, h.y);
    c.strokeStyle = 'rgba(255,255,255,0.45)'; c.lineWidth = 2; c.setLineDash([4, 6]);
    c.beginPath(); c.moveTo(ax, ay); c.lineTo(bx, by); c.stroke(); c.setLineDash([]);
    const ges = Math.max(1, h.naechste - (h.ab || h.start));
    const p = Math.max(0, Math.min(1, (jetzt - (h.ab || h.start)) / ges));
    let x, y;
    if (h.phase === 'hin') { x = ax + (bx - ax) * p; y = ay + (by - ay) * p; }
    else if (h.phase === 'zurueck') { x = bx + (ax - bx) * p; y = by + (ay - by) * p; }
    else { x = bx + Math.sin(jetzt / 200) * 3; y = by - 6; }
    c.fillStyle = col; c.strokeStyle = RAND; c.lineWidth = 2;
    c.beginPath(); c.arc(x, y, 8, 0, 7); c.fill(); c.stroke();
    const img = iconBild(art); if (img.complete) c.drawImage(img, x - 7, y - 7, 14, 14);
    if (h.phase === 'zurueck' && h.res) { const im = iconBild(h.res); if (im.complete) c.drawImage(im, x + 4, y - 14, 12, 12); }
  }

  // ---------------------------------------- Bedienung
  eingabe() {
    const cv = this.cv;
    cv.addEventListener('pointerdown', (e) => { cv.setPointerCapture?.(e.pointerId); this.zeiger.set(e.pointerId, { x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY }); if (this.zeiger.size === 2) { const [a, b] = [...this.zeiger.values()]; this.pinch = Math.hypot(a.x - b.x, a.y - b.y); } this.bewegt = false; });
    cv.addEventListener('pointermove', (e) => {
      const p = this.zeiger.get(e.pointerId); if (!p) return;
      const dx = e.clientX - p.x, dy = e.clientY - p.y; p.x = e.clientX; p.y = e.clientY;
      if (this.zeiger.size === 2) { const [a, b] = [...this.zeiger.values()]; const d = Math.hypot(a.x - b.x, a.y - b.y); this.zoom(d / this.pinch); this.pinch = d; this.bewegt = true; return; }
      if (Math.hypot(e.clientX - p.sx, e.clientY - p.sy) > 6) this.bewegt = true;
      if (this.bewegt) { const k = T * this.cam.z; this.cam.x -= dx / k; this.cam.y -= dy / k; }
    });
    const hoch = (e) => {
      if (!this.zeiger.has(e.pointerId)) return;
      this.zeiger.delete(e.pointerId);
      if (!this.bewegt && this.zeiger.size === 0) { const [x, y] = this.feldBei(e.clientX, e.clientY); this.zeigeFeld(x, y); }
      if (this.zeiger.size < 2) this.pinch = null;
    };
    cv.addEventListener('pointerup', hoch); cv.addEventListener('pointercancel', hoch);
    cv.addEventListener('wheel', (e) => { e.preventDefault(); this.zoom(Math.exp(-e.deltaY * 0.0015)); }, { passive: false });
  }
  zoom(f) { this.cam.z = Math.max(0.35, Math.min(3, this.cam.z * f)); }

  zeigeFeld(x, y, nurAktualisieren) {
    const s = this.s, e = R.effekte(s);
    if (!nurAktualisieren) { this.wahl = { x, y }; this.spiel.ton('klick'); }
    const sieht = sichtbar(s.sicht, x, y);
    const r = R.rohstoffAuf(s, x, y);
    const b = biom(x, y);
    const dist = abstand(s.heim, { x, y });
    let html = '';
    if (x === s.heim.x && y === s.heim.y) html = `<h3>${esc(s.name)}</h3><p>Dein Lager.</p>`;
    else if (!sieht) {
      const weg = dist / (KUNDSCHAFTER_FELDER_PRO_MIN * (1 + e.handwerkerTempo)) * 60000;
      html = `<h3>Unerkundetes Land</h3><p class="hinweis">Ein Kundschafter deckt hier ${KUNDSCHAFT_SICHT} Felder im Umkreis auf. Weg: ${dauer(weg)}.</p>
        <button class="knopf blau" data-ks ${s.kundschafter.length >= e.kundschafter ? 'disabled' : ''}>${icon('kundschafter')} Kundschafter schicken</button>`;
    } else if (r && e.sicht.has(r)) {
      const st = R.handwerkerStufe(s);
      const tempo = HANDWERKER_FELDER_PRO_MIN * handwerkerTempo(st) * (1 + e.handwerkerTempo);
      const weg = dist / tempo * 60000, arbeit = ROHSTOFFE[r].dauer * 60000 / handwerkerTempo(st);
      const ladung = Math.round(ROHSTOFFE[r].ladung * handwerkerTraglast(st));
      const hier = s.handwerker.filter((h) => h.x === x && h.y === y);
      const frei = R.handwerkerAnzahl(s, e) - s.handwerker.filter((h) => !h.stopp).length;
      html = `<h3><span class="ressym gross">${icon(r)}</span> ${ROHSTOFFE[r].name}-Feld</h3>
        <p class="hinweis">Liefert unbegrenzt. Pro Runde: ${dauer(weg)} hin, ${dauer(arbeit)} Arbeit, ${dauer(weg)} zurück, Ertrag <b>${ladung} ${ROHSTOFFE[r].name}</b>. Handwerker laufen immer wieder, solange du in den letzten 2 Stunden im Spiel warst.</p>
        ${hier.length ? `<p>${hier.length} Handwerker arbeiten hier.</p>` : ''}
        <button class="knopf gruen" data-hw ${frei < 1 ? 'disabled' : ''}>${icon('handwerker')} Handwerker schicken (${Math.max(0, frei)} frei)</button>
        ${hier.filter((h) => !h.stopp).length ? `<button class="knopf rot" data-zurueck="${hier.find((h) => !h.stopp).id}">Einen zurückrufen</button>` : ''}`;
    } else if (r) html = `<h3>${BIOME[b].name}</h3><p class="hinweis">Hier liegt etwas im Boden, das du noch nicht kennst. Forsche weiter!</p>`;
    else html = `<h3>${BIOME[b].name}</h3><p class="hinweis">Kein Rohstoff auf diesem Feld. Entfernung: ${dist.toFixed(1)} Felder.</p>`;
    const n = this.nachbarn.find((q) => q.x === x && q.y === y);
    if (n && sieht) html = `<h3>${esc(n.name)}</h3><p>Lager eines anderen Spielers · ${ZEITALTER[n.zeitalter]?.name} · ${icon('ruhm')} ${zahl(n.ruhm)}</p>`;
    this.panel.innerHTML = html; this.panel.hidden = false;
    const ks = this.panel.querySelector('[data-ks]'); if (ks) ks.onclick = () => this.spiel.aktion({ art: 'kundschafterSchicken', x, y }, () => { this.spiel.ton('karte'); this.chips(); this.zeigeFeld(x, y, true); });
    const hw = this.panel.querySelector('[data-hw]'); if (hw) hw.onclick = () => this.spiel.aktion({ art: 'handwerkerSchicken', x, y }, () => { this.spiel.ton('klick'); this.chips(); this.zeigeFeld(x, y, true); this.spiel.tutorial?.ereignis('handwerker'); });
    const zu = this.panel.querySelector('[data-zurueck]'); if (zu) zu.onclick = () => this.spiel.aktion({ art: 'handwerkerZurueck', id: +zu.dataset.zurueck }, () => this.zeigeFeld(x, y, true));
  }
  zeigeListe() {
    const s = this.s, jetzt = this.spiel.jetzt();
    this.wahl = null;
    const zeilen = s.handwerker.map((h) => `<div class="hw-z"><span class="ressym">${icon(h.res)}</span> ${ROHSTOFFE[h.res].name} (${h.x}|${h.y}) · ${h.phase === 'hin' ? 'unterwegs' : h.phase === 'arbeit' ? 'arbeitet' : 'kommt zurück'} · ${dauer(h.naechste - jetzt)}${h.stopp ? ' · kehrt heim' : ''} <button class="knopf klein2" data-geh="${h.x},${h.y}">Zeigen</button></div>`).join('');
    const ks = s.kundschafter.map((k) => `<div class="hw-z">${icon('kundschafter')} Kundschafter (${k.x}|${k.y}) · ${k.phase === 'hin' ? 'erkundet' : 'kommt zurück'} · ${dauer(k.naechste - jetzt)}</div>`).join('');
    this.panel.innerHTML = `<h3>Unterwegs</h3>${zeilen || ''}${ks || ''}${!zeilen && !ks ? '<p class="hinweis">Niemand ist unterwegs. Tippe ein Rohstoff-Feld an, um einen Handwerker zu schicken, oder ein dunkles Feld für einen Kundschafter.</p>' : ''}`;
    this.panel.hidden = false;
    this.panel.querySelectorAll('[data-geh]').forEach((b) => b.onclick = () => { const [x, y] = b.dataset.geh.split(',').map(Number); this.cam.x = x; this.cam.y = y; this.zeigeFeld(x, y); });
  }
}

export function einbauen(spiel) {
  const karte = new Karte(spiel);
  spiel.karte = karte;
  spiel.ui.f_karte = function () { this.schliessen(); karte.oeffnen(); return null; };
}
