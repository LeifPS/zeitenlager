// Zeitenlager: Steuerung. Anmeldung, Abgleich mit dem Server, Spielschleife, Aktionen.
import * as R from '../shared/regeln.js';
import { GEBAEUDE, STUFEN, EINHEITEN, einheitMacht } from '../shared/daten.js';
import { api, token, setzeToken } from './api.js';
import { Lager } from './lager.js';
import { UI } from './ui.js';
import { Audio } from './audio.js';
import { zahl, esc } from './format.js';
import { iso } from './grafik.js';
import { icon } from './icons.js';

const $ = (s) => document.querySelector(s);
const kopie = (o) => JSON.parse(JSON.stringify(o));
const EINST = 'zeitenlager_einst';

class Spiel {
  constructor() {
    this.s = null; this.versatz = 0; this.warte = []; this.unterwegs = false;
    let e = {}; try { e = JSON.parse(localStorage.getItem(EINST) || '{}'); } catch { }
    this.tonAn = e.ton !== false; this.musikAn = e.musik !== false;
    Audio.an = this.tonAn; Audio.musikAn = this.musikAn;
    this.lager = new Lager($('#welt'), this);
    this.ui = new UI(this);
    this.erweiterungen = [];
    addEventListener('pointerdown', () => { Audio.entsperren(); if (this.s) Audio.musikStart(); }, { once: true });
    document.addEventListener('visibilitychange', () => { if (!document.hidden && this.s) this.laden(); });
    this.letzte = performance.now();
    requestAnimationFrame((t) => this.schleife(t));
    setInterval(() => this.hintergrund(), 1000);
    setInterval(() => { if (this.s && !this.unterwegs && !this.warte.length && !document.hidden) this.laden(); }, 30000);
  }
  jetzt() { return Date.now() + this.versatz; }
  ton(n) { Audio.spiele(n); }
  macht() { return R.armeeMacht(this.s, einheitMacht); }
  setzeTon(an) { this.tonAn = an; Audio.an = an; this.einstSpeichern(); }
  setzeMusik(an) { this.musikAn = an; Audio.musikAn = an; if (an) Audio.musikStart(); else Audio.musikStopp(); this.einstSpeichern(); }
  einstSpeichern() { try { localStorage.setItem(EINST, JSON.stringify({ ton: this.tonAn, musik: this.musikAn })); } catch { } }

  // -------------------------------------------- Start
  async start() {
    if (!token()) return this.anmeldeMaske();
    const ok = await this.laden();
    if (!ok) return this.anmeldeMaske();
    this.spielZeigen();
  }
  async laden() {
    const r = await api('/zustand');
    if (!r.ok) { if (r.abgemeldet) { setzeToken(''); return false; } if (r.offline) this.ui.toast('Keine Verbindung zum Server', 'rot'); return !!this.s; }
    this.uebernehme(r.s, r.jetzt);
    this.name = r.name;
    return true;
  }
  uebernehme(s, jetzt) {
    const alteMeldungen = this.s ? this.s.meldungen.length : null;
    this.versatz = jetzt - Date.now();
    const vorher = this.s;
    this.s = s;
    for (const a of this.warte) R.aktion(this.s, kopie(a.a), this.jetzt());
    this.lager.neuesGitter();
    if (vorher && alteMeldungen != null && s.meldungen.length > alteMeldungen) {
      for (const m of s.meldungen.slice(alteMeldungen)) if (m.art === 'raid') this.ui.toast(m.text, 'rot');
    }
    this.ui.obenAktualisieren(); this.ui.auswahlAktualisieren(); this.ui.aktualisiereFenster();
  }
  spielZeigen() {
    $('#anmeldung').hidden = true; $('#spiel').hidden = false;
    const z = this.s.gebaeude.find((g) => g.typ === 'zentrum');
    this.lager.zeigeFeld(z.x + 2, z.y + 3);
    this.ui.obenAktualisieren();
    for (const f of this.erweiterungen) f(this);
    if (this.tutorial) this.tutorial.start();
  }
  anmeldeMaske() {
    $('#spiel').hidden = true; const a = $('#anmeldung'); a.hidden = false;
    let modus = 'anmelden';
    const zeichne = () => {
      a.innerHTML = `<div class="anm-blatt"><div class="logo">ZEITENLAGER</div><p class="unter">Vom Lagerfeuer bis zu den Sternen</p>
        <div class="tabs"><button class="tab ${modus === 'anmelden' ? 'an' : ''}" data-m="anmelden">Anmelden</button><button class="tab ${modus === 'neu' ? 'an' : ''}" data-m="neu">Neues Konto</button></div>
        <form><label>Benutzername<input name="name" autocomplete="username" required maxlength="20"></label>
        <label>Passwort<input name="pw" type="password" autocomplete="${modus === 'neu' ? 'new-password' : 'current-password'}" required></label>
        ${modus === 'neu' ? '<label>Name deines Lagers<input name="lager" maxlength="24" placeholder="z. B. Leifs Feste"></label>' : ''}
        <p class="fehler" hidden></p><button class="knopf gross gruen" type="submit">${modus === 'neu' ? 'Lager gründen' : 'Los geht\'s'}</button></form></div>`;
      a.querySelectorAll('[data-m]').forEach((b) => b.onclick = () => { modus = b.dataset.m; zeichne(); });
      a.querySelector('form').onsubmit = async (e) => {
        e.preventDefault();
        const f = new FormData(e.target);
        const btn = e.target.querySelector('button[type=submit]'); btn.disabled = true;
        const r = await api(modus === 'neu' ? '/registrieren' : '/anmelden', { name: f.get('name'), passwort: f.get('pw'), lager: f.get('lager') });
        btn.disabled = false;
        if (!r.ok) { const p = a.querySelector('.fehler'); p.hidden = false; p.textContent = r.fehler; return; }
        setzeToken(r.token);
        if (await this.laden()) { Audio.entsperren(); Audio.musikStart(); this.spielZeigen(); }
      };
    };
    zeichne();
  }
  async abmelden() { await api('/abmelden', {}); setzeToken(''); location.reload(); }

  // -------------------------------------------- Aktionen
  /** Wendet die Aktion sofort an und schickt sie an den Server. danach(ergebnis) bei Erfolg. */
  aktion(a, danach) {
    if (!this.s) return;
    const r = R.aktion(this.s, kopie(a), this.jetzt());
    if (!r.ok) { this.ui.toast(r.fehler, 'rot'); this.ton('fehler'); return r; }
    this.warte.push({ a });
    this.lager.neuesGitter();
    this.ui.obenAktualisieren(); this.ui.auswahlAktualisieren(); this.ui.aktualisiereFenster();
    if (danach) danach(r);
    this.senden();
    return r;
  }
  async senden() {
    if (this.unterwegs || !this.warte.length) return;
    this.unterwegs = true;
    const paket = this.warte.splice(0, this.warte.length);
    const r = await api('/aktion', { aktionen: paket.map((x) => x.a) });
    this.unterwegs = false;
    if (r.abgemeldet) { setzeToken(''); location.reload(); return; }
    if (!r.s) { this.warte.unshift(...paket); this.ui.toast(r.fehler || 'Verbindungsproblem – versuche es gleich nochmal', 'rot'); setTimeout(() => this.senden(), 3000); return; }
    const fehler = (r.ergebnisse || []).find((x) => !x.ok);
    if (fehler) this.ui.toast(fehler.fehler, 'rot');
    this.uebernehme(r.s, r.jetzt);
    if (this.warte.length) this.senden();
  }

  // -------------------------------------------- Lager-Ereignisse
  gebaeudeAngetippt(b) { this.ui.zeigeAuswahl(b); if (b) this.ton('klick'); }
  einheitAngetippt(u) { this.ui.zeigeEinheit(u); this.ton('klick'); }
  einsammeln(b) {
    const r = this.aktion({ art: 'einsammeln', id: b.id });
    if (r && r.ok) {
      if (r.menge > 0) { const g = GEBAEUDE[b.typ].gr; const [x, y] = iso(b.x + g / 2, b.y + g / 2); this.lager.effekt({ art: 'muenzen', x, y: y - 40, dauer: 0.9 }); this.lager.textBeiFeld(b.x + g / 2, b.y + g / 2, '+' + zahl(r.menge)); this.ton('gold'); this.tutorial?.ereignis('gold'); }
      else if (this.s.gold >= R.goldMax(this.s) - 1) this.ui.toast('Dein Goldlager ist voll. Baue Schatzkammern aus.', 'rot');
    }
  }
  mergen(a, b) {
    if (a.typ !== b.typ) { this.ui.toast('Nur gleiche Einheiten lassen sich mergen.', 'rot'); this.ton('fehler'); return; }
    if (a.stufe !== b.stufe) { this.ui.toast('Nur Einheiten gleicher Stufe lassen sich mergen.', 'rot'); this.ton('fehler'); return; }
    const pos = this.lager.einheitPosition(b.id);
    const r = this.aktion({ art: 'mergen', a: b.id, b: a.id });
    if (r && r.ok) {
      const st = STUFEN[r.stufe];
      const col = st.farbe && st.farbe.startsWith('#') ? (r.stufe === 3 ? '#fff' : st.farbe) : '#ffd23f';
      if (pos) { this.lager.effekt({ art: 'funken', x: pos[0], y: pos[1], farbe: col, dauer: 1 }); this.lager.effekt({ art: 'text', x: pos[0], y: pos[1] - 60, text: `Stufe ${st.name}!`, farbe: col, dauer: 1.6 }); }
      this.ton('merge');
      this.tutorial?.ereignis('merge');
    }
  }
  bauenStarten(typ) {
    const [mx, my] = this.lager.mitteFeld();
    let best = null;
    const gr = GEBAEUDE[typ].gr;
    for (let r = 0; r < 20 && !best; r++) for (let dy = -r; dy <= r && !best; dy++) for (let dx = -r; dx <= r && !best; dx++) {
      const x = mx + dx - Math.floor(gr / 2), y = my + dy - Math.floor(gr / 2);
      if (R.passt(this.s, typ, x, y)) best = [x, y];
    }
    if (!best) best = [mx, my];
    this.lager.modus = { art: 'bauen', typ, x: best[0], y: best[1] };
    this.lager.auswahl = null; this.ui.zeigeAuswahl(null);
    this.modusGeaendert();
  }
  verschiebenStarten(b) { this.lager.modus = { art: 'verschieben', id: b.id, x: b.x, y: b.y }; this.ui.auswahl.hidden = true; this.modusGeaendert(); }
  modusGeaendert() {
    const m = this.lager.modus;
    if (!m) { this.ui.zeigeBaumodus(false); return; }
    const typ = m.art === 'bauen' ? m.typ : this.s.gebaeude.find((b) => b.id === m.id).typ;
    this.ui.zeigeBaumodus(true, R.passt(this.s, typ, m.x, m.y, m.id));
  }
  baumodusKnopf(k) {
    const m = this.lager.modus; if (!m) return;
    if (k === 'nein') { this.lager.modus = null; this.modusGeaendert(); this.ton('klick'); return; }
    if (m.art === 'bauen') {
      const r = this.aktion({ art: 'bauen', typ: m.typ, x: m.x, y: m.y });
      if (r && r.ok) {
        this.ton('bauen');
        this.tutorial?.ereignis('bauen:' + m.typ);
        // Mauern: gleich die nächste daneben anbieten
        const g = GEBAEUDE[m.typ];
        if (g.mauer && this.s.gebaeude.filter((b) => b.typ === m.typ).length < R.gebaeudeAnzahlErlaubt(this.s, m.typ) && R.kannBezahlen(this.s, { gold: 30 })) {
          const nx = m.x + 1; this.lager.modus = { art: 'bauen', typ: m.typ, x: nx, y: m.y }; this.modusGeaendert(); return;
        }
        this.lager.modus = null; this.lager.auswahl = r.id; this.ui.zeigeAuswahl(this.s.gebaeude.find((b) => b.id === r.id));
      }
    } else {
      const r = this.aktion({ art: 'verschieben', id: m.id, x: m.x, y: m.y });
      if (r && r.ok) { this.lager.modus = null; this.ton('klick'); this.ui.zeigeAuswahl(this.s.gebaeude.find((b) => b.id === m.id)); }
    }
    this.modusGeaendert();
  }

  // -------------------------------------------- Schleifen
  schleife(t) {
    const dt = Math.min(0.1, (t - this.letzte) / 1000); this.letzte = t;
    if (this.s && !$('#spiel').hidden && !this.verdeckt) this.lager.zeichne(t / 1000, dt);
    requestAnimationFrame((x) => this.schleife(x));
  }
  hintergrund() {
    if (!this.s) return;
    const vorher = this.s.meldungen.length;
    R.tick(this.s, this.jetzt());
    if (this.s.meldungen.length > vorher) {
      for (const m of this.s.meldungen.slice(vorher)) { this.ui.toast(m.text, m.art === 'forschung' ? 'blau' : 'gruen'); this.ton(m.art === 'forschung' ? 'forschung' : 'fertig'); }
      this.lager.neuesGitter();
    }
    this.ui.obenAktualisieren(); this.ui.auswahlAktualisieren(); this.ui.aktualisiereFenster();
  }
}

window.addEventListener('error', (e) => { console.error(e.error || e.message); });
const spiel = new Spiel();
window.zeitenlager = spiel;
export default spiel;
// Erweiterungen (Karte, Kampf, Tutorial) melden sich hier an, bevor das Spiel startet
const module = await Promise.allSettled([import('./karte.js'), import('./kampf.js'), import('./tutorial.js')]);
for (const m of module) if (m.status === 'fulfilled' && m.value.einbauen) m.value.einbauen(spiel); else if (m.status === 'rejected') console.warn(m.reason);
spiel.start();
void esc; void icon; void EINHEITEN;
