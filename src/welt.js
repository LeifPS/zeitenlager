// Server von Zeitenlager mit D1 (SQLite): Konten, Sitzungen, Spielstände, Berichte.
// Der Server ist verbindlich: Er wendet jede Aktion mit denselben Regeln an wie der Browser.
// Gleichzeitige Änderungen am selben Spielstand werden über eine Versionsnummer (rev) erkannt und wiederholt.
import { neuerZustand, aktion, tick } from '../public/shared/regeln.js';
import { heimatVon } from '../public/shared/karte.js';
import { kampfApi } from './kampf-api.js';

const PBKDF2 = 100000;
const SITZUNG = 60 * 24 * 3600 * 1000;
const enc = new TextEncoder();
const hex = (b) => [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, '0')).join('');
function zufall(n) { const a = new Uint8Array(n); crypto.getRandomValues(a); return hex(a); }
async function hashe(pw, salz, it = PBKDF2) {
  const key = await crypto.subtle.importKey('raw', enc.encode(pw), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: new Uint8Array(salz.match(/../g).map((h) => parseInt(h, 16))), iterations: it }, key, 256);
  return hex(bits);
}
function gleich(a, b) { if (a.length !== b.length) return false; let x = 0; for (let i = 0; i < a.length; i++) x |= a.charCodeAt(i) ^ b.charCodeAt(i); return x === 0; }
export const json = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });

const SCHEMA = [
  'CREATE TABLE IF NOT EXISTS konten (k TEXT PRIMARY KEY, name TEXT, salz TEXT, hash TEXT, iter INTEGER, nr INTEGER, erstellt INTEGER, gesperrt INTEGER DEFAULT 0)',
  'CREATE TABLE IF NOT EXISTS sitzungen (token TEXT PRIMARY KEY, k TEXT, ablauf INTEGER)',
  'CREATE TABLE IF NOT EXISTS staende (k TEXT PRIMARY KEY, daten TEXT, rev INTEGER DEFAULT 0, ruhm INTEGER, zeitalter INTEGER, macht REAL, schild INTEGER, gesehen INTEGER, hx INTEGER, hy INTEGER)',
  'CREATE TABLE IF NOT EXISTS berichte (id INTEGER PRIMARY KEY AUTOINCREMENT, k TEXT, t INTEGER, daten TEXT)',
  'CREATE INDEX IF NOT EXISTS berichte_k ON berichte(k, t)',
];
let schemaOk = false;
const versuche = new Map(); // im Speicher je Worker-Instanz (reicht gegen Durchprobieren)

export class Welt {
  constructor(env) { this.db = env.DB; }
  async schema() { if (schemaOk) return; await this.db.batch(SCHEMA.map((q) => this.db.prepare(q))); schemaOk = true; }
  async eins(q, ...p) { return this.db.prepare(q).bind(...p).first(); }
  async alle(q, ...p) { return (await this.db.prepare(q).bind(...p).all()).results; }
  async los(q, ...p) { return this.db.prepare(q).bind(...p).run(); }

  begrenzt(s) { const x = versuche.get(s); return x && x.n >= 8 && x.bis > Date.now(); }
  fehl(s) { const x = versuche.get(s); if (!x || x.bis <= Date.now()) versuche.set(s, { n: 1, bis: Date.now() + 15 * 60000 }); else x.n++; }

  async ladeStand(k) {
    const r = await this.eins('SELECT daten, rev FROM staende WHERE k = ?', k);
    if (!r) return null;
    const s = JSON.parse(r.daten); s._rev = r.rev;
    return s;
  }
  /** Speichert nur, wenn niemand zwischendurch geschrieben hat. Gibt true/false zurück. */
  async speichere(k, s) {
    const rev = s._rev ?? 0;
    delete s._rev;
    const z = s.gebaeude.find((g) => g.typ === 'zentrum');
    const daten = JSON.stringify(s);
    const r = await this.los('UPDATE staende SET daten = ?, rev = rev + 1, ruhm = ?, zeitalter = ?, macht = ?, schild = ?, gesehen = ?, hx = ?, hy = ? WHERE k = ? AND rev = ?',
      daten, s.ruhm | 0, z ? z.stufe - 1 : 0, kampfApi.macht(s), Math.max(s.schildBis || 0, s.neulingBis || 0), s.gesehen || 0, s.heim.x, s.heim.y, k, rev);
    const ok = r.meta.changes > 0;
    s._rev = rev + (ok ? 1 : 0);
    return ok;
  }
  /** Lädt, ändert (f) und speichert; bei gleichzeitiger Änderung bis zu 4 Versuche. */
  async aendere(k, f) {
    for (let i = 0; i < 4; i++) {
      const s = await this.ladeStand(k);
      const r = await f(s);
      if (r && r.nichtSpeichern) return { s, r };
      if (await this.speichere(k, s)) return { s, r };
    }
    throw new Error('Der Spielstand wurde gerade woanders geändert. Bitte nochmal versuchen.');
  }

  async konto(request) {
    const a = request.headers.get('authorization') || '';
    const token = a.startsWith('Bearer ') ? a.slice(7) : '';
    if (!token) return null;
    const r = await this.eins('SELECT k, ablauf FROM sitzungen WHERE token = ?', token);
    if (!r || r.ablauf < Date.now()) return null;
    return r.k;
  }

  async fetch(request) {
    const url = new URL(request.url);
    const pfad = url.pathname.replace(/^\/api/, '');
    const ip = request.headers.get('cf-connecting-ip') || '?';
    let body = {};
    if (request.method === 'POST') { try { body = await request.json(); } catch { body = {}; } }
    try {
      await this.schema();
      if (pfad === '/registrieren') return json(await this.registrieren(body, ip));
      if (pfad === '/anmelden') return json(await this.anmelden(body, ip));
      if (pfad === '/status') return json({ ok: true, jetzt: Date.now() });
      const k = await this.konto(request);
      if (!k) return json({ ok: false, fehler: 'Bitte melde dich an.', abgemeldet: true }, 401);
      const jetzt = Date.now();
      if (pfad === '/zustand') {
        const { s } = await this.aendere(k, (s) => {
          const vorher = s.gesehen || 0;
          tick(s, jetzt); s.gesehen = jetzt;
          // Nur speichern, wenn es sich lohnt (spart Schreibzugriffe)
          if (jetzt - vorher < 5 * 60000) return { nichtSpeichern: true };
          return {};
        });
        delete s._rev;
        const n = await this.eins('SELECT name FROM konten WHERE k = ?', k);
        return json({ ok: true, s, jetzt, name: n && n.name });
      }
      if (pfad === '/aktion') {
        const liste = Array.isArray(body.aktionen) ? body.aktionen.slice(0, 50) : [body.a];
        const { s, r } = await this.aendere(k, (s) => {
          const ergebnisse = [];
          for (const a of liste) ergebnisse.push(aktion(s, a, jetzt));
          s.gesehen = jetzt;
          return ergebnisse;
        });
        delete s._rev;
        return json({ ok: r.every((x) => x.ok), ergebnisse: r, s, jetzt });
      }
      if (pfad === '/abmelden') {
        const a = request.headers.get('authorization') || '';
        await this.los('DELETE FROM sitzungen WHERE token = ?', a.slice(7));
        return json({ ok: true });
      }
      const r = await kampfApi.route(this, pfad, k, body, jetzt);
      if (r) return json(r);
      return json({ ok: false, fehler: 'Unbekannt.' }, 404);
    } catch (e) {
      return json({ ok: false, fehler: 'Serverfehler: ' + (e && e.message || e) }, 500);
    }
  }

  async registrieren({ name, passwort, lager }, ip) {
    if (typeof name !== 'string' || name.length < 3 || name.length > 20 || !/^[a-zA-Z0-9äöüÄÖÜß_.-]+$/.test(name)) return { ok: false, fehler: 'Benutzername: 3 bis 20 Zeichen, nur Buchstaben, Ziffern, Punkt, Bindestrich, Unterstrich.' };
    if (typeof passwort !== 'string' || passwort.length < 6 || passwort.length > 200) return { ok: false, fehler: 'Das Passwort muss mindestens 6 Zeichen lang sein.' };
    let lname = typeof lager === 'string' ? lager.trim().slice(0, 24) : '';
    if (!lname) lname = name;
    if (this.begrenzt('reg:' + ip)) return { ok: false, fehler: 'Zu viele Versuche. Bitte warte ein paar Minuten.' };
    this.fehl('reg:' + ip);
    const k = name.toLowerCase();
    if (await this.eins('SELECT k FROM konten WHERE k = ?', k)) return { ok: false, fehler: 'Diesen Benutzernamen gibt es schon.' };
    const salz = zufall(16);
    const hash = await hashe(passwort, salz);
    const nr = (await this.eins('SELECT COUNT(*) AS n FROM konten')).n;
    const jetzt = Date.now();
    const s = neuerZustand(lname, heimatVon(nr), jetzt);
    const z = s.gebaeude.find((g) => g.typ === 'zentrum');
    await this.db.batch([
      this.db.prepare('INSERT INTO konten (k, name, salz, hash, iter, nr, erstellt) VALUES (?, ?, ?, ?, ?, ?, ?)').bind(k, name, salz, hash, PBKDF2, nr, jetzt),
      this.db.prepare('INSERT INTO staende (k, daten, rev, ruhm, zeitalter, macht, schild, gesehen, hx, hy) VALUES (?, ?, 0, 0, ?, ?, ?, ?, ?, ?)').bind(k, JSON.stringify(s), z.stufe - 1, kampfApi.macht(s), s.neulingBis, jetzt, s.heim.x, s.heim.y),
    ]);
    return { ok: true, token: await this.sitzung(k), name };
  }

  async anmelden({ name, passwort }, ip) {
    if (typeof name !== 'string' || typeof passwort !== 'string') return { ok: false, fehler: 'Bitte Benutzername und Passwort eingeben.' };
    const k = name.toLowerCase();
    if (this.begrenzt('ip:' + ip) || this.begrenzt('k:' + k)) return { ok: false, fehler: 'Zu viele falsche Versuche. Bitte warte 15 Minuten.' };
    const r = await this.eins('SELECT * FROM konten WHERE k = ?', k);
    if (!r) { this.fehl('ip:' + ip); return { ok: false, fehler: 'Benutzername oder Passwort ist falsch.' }; }
    const h = await hashe(passwort, r.salz, r.iter);
    if (!gleich(h, r.hash)) { this.fehl('ip:' + ip); this.fehl('k:' + k); return { ok: false, fehler: 'Benutzername oder Passwort ist falsch.' }; }
    if (r.gesperrt) return { ok: false, fehler: 'Dieses Konto ist gesperrt.' };
    return { ok: true, token: await this.sitzung(k), name: r.name };
  }

  async sitzung(k) {
    const t = zufall(24);
    await this.db.batch([
      this.db.prepare('INSERT INTO sitzungen (token, k, ablauf) VALUES (?, ?, ?)').bind(t, k, Date.now() + SITZUNG),
      this.db.prepare('DELETE FROM sitzungen WHERE ablauf < ?').bind(Date.now()),
    ]);
    return t;
  }
}
