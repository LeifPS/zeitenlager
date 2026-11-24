// Die eine Welt von Zeitenlager als Durable Object mit SQLite: Konten, Sitzungen, Spielstände, Berichte.
// Der Server ist verbindlich: Er wendet jede Aktion mit denselben Regeln an wie der Browser.
import { DurableObject } from 'cloudflare:workers';
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
const json = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });

export class Welt extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.sql = ctx.storage.sql;
    this.sql.exec(`CREATE TABLE IF NOT EXISTS konten (k TEXT PRIMARY KEY, name TEXT, salz TEXT, hash TEXT, iter INTEGER, nr INTEGER, erstellt INTEGER, gesperrt INTEGER DEFAULT 0)`);
    this.sql.exec(`CREATE TABLE IF NOT EXISTS sitzungen (token TEXT PRIMARY KEY, k TEXT, ablauf INTEGER)`);
    this.sql.exec(`CREATE TABLE IF NOT EXISTS staende (k TEXT PRIMARY KEY, daten TEXT, ruhm INTEGER, zeitalter INTEGER, macht REAL, schild INTEGER, gesehen INTEGER, hx INTEGER, hy INTEGER)`);
    this.sql.exec(`CREATE TABLE IF NOT EXISTS berichte (id INTEGER PRIMARY KEY AUTOINCREMENT, k TEXT, t INTEGER, daten TEXT)`);
    this.sql.exec(`CREATE INDEX IF NOT EXISTS berichte_k ON berichte(k, t)`);
    this.versuche = new Map();
    this.cache = new Map(); // k -> Zustand (im Speicher, solange das Objekt lebt)
  }

  begrenzt(s) { const x = this.versuche.get(s); return x && x.n >= 8 && x.bis > Date.now(); }
  fehl(s) { const x = this.versuche.get(s); if (!x || x.bis <= Date.now()) this.versuche.set(s, { n: 1, bis: Date.now() + 15 * 60000 }); else x.n++; }

  ladeStand(k) {
    if (this.cache.has(k)) return this.cache.get(k);
    const r = this.sql.exec('SELECT daten FROM staende WHERE k = ?', k).toArray()[0];
    if (!r) return null;
    const s = JSON.parse(r.daten);
    this.cache.set(k, s);
    return s;
  }
  speichere(k, s, macht) {
    this.cache.set(k, s);
    const z = s.gebaeude.find((g) => g.typ === 'zentrum');
    this.sql.exec('INSERT OR REPLACE INTO staende (k, daten, ruhm, zeitalter, macht, schild, gesehen, hx, hy) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      k, JSON.stringify(s), s.ruhm | 0, z ? z.stufe - 1 : 0, macht ?? 0, Math.max(s.schildBis || 0, s.neulingBis || 0), s.gesehen || 0, s.heim.x, s.heim.y);
  }

  konto(request) {
    const a = request.headers.get('authorization') || '';
    const token = a.startsWith('Bearer ') ? a.slice(7) : '';
    if (!token) return null;
    const r = this.sql.exec('SELECT k, ablauf FROM sitzungen WHERE token = ?', token).toArray()[0];
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
      if (pfad === '/registrieren') return json(await this.registrieren(body, ip));
      if (pfad === '/anmelden') return json(await this.anmelden(body, ip));
      if (pfad === '/status') return json({ ok: true, jetzt: Date.now() });
      const k = this.konto(request);
      if (!k) return json({ ok: false, fehler: 'Bitte melde dich an.', abgemeldet: true }, 401);
      const jetzt = Date.now();
      if (pfad === '/zustand') {
        const s = this.ladeStand(k);
        tick(s, jetzt); s.gesehen = jetzt;
        this.speichere(k, s, kampfApi.macht(s));
        return json({ ok: true, s, jetzt, name: this.sql.exec('SELECT name FROM konten WHERE k = ?', k).one().name });
      }
      if (pfad === '/aktion') {
        const s = this.ladeStand(k);
        const liste = Array.isArray(body.aktionen) ? body.aktionen.slice(0, 50) : [body.a];
        const ergebnisse = [];
        for (const a of liste) ergebnisse.push(aktion(s, a, jetzt));
        s.gesehen = jetzt;
        this.speichere(k, s, kampfApi.macht(s));
        return json({ ok: ergebnisse.every((r) => r.ok), ergebnisse, s, jetzt });
      }
      if (pfad === '/abmelden') {
        const a = request.headers.get('authorization') || '';
        this.sql.exec('DELETE FROM sitzungen WHERE token = ?', a.slice(7));
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
    if (this.sql.exec('SELECT k FROM konten WHERE k = ?', k).toArray().length) return { ok: false, fehler: 'Diesen Benutzernamen gibt es schon.' };
    const salz = zufall(16);
    const hash = await hashe(passwort, salz);
    const nr = this.sql.exec('SELECT COUNT(*) AS n FROM konten').one().n;
    const jetzt = Date.now();
    this.sql.exec('INSERT INTO konten (k, name, salz, hash, iter, nr, erstellt) VALUES (?, ?, ?, ?, ?, ?, ?)', k, name, salz, hash, PBKDF2, nr, jetzt);
    const s = neuerZustand(lname, heimatVon(nr), jetzt);
    this.speichere(k, s, kampfApi.macht(s));
    return { ok: true, token: this.sitzung(k), name };
  }

  async anmelden({ name, passwort }, ip) {
    if (typeof name !== 'string' || typeof passwort !== 'string') return { ok: false, fehler: 'Bitte Benutzername und Passwort eingeben.' };
    const k = name.toLowerCase();
    if (this.begrenzt('ip:' + ip) || this.begrenzt('k:' + k)) return { ok: false, fehler: 'Zu viele falsche Versuche. Bitte warte 15 Minuten.' };
    const r = this.sql.exec('SELECT * FROM konten WHERE k = ?', k).toArray()[0];
    if (!r) { this.fehl('ip:' + ip); return { ok: false, fehler: 'Benutzername oder Passwort ist falsch.' }; }
    const h = await hashe(passwort, r.salz, r.iter);
    if (!gleich(h, r.hash)) { this.fehl('ip:' + ip); this.fehl('k:' + k); return { ok: false, fehler: 'Benutzername oder Passwort ist falsch.' }; }
    if (r.gesperrt) return { ok: false, fehler: 'Dieses Konto ist gesperrt.' };
    return { ok: true, token: this.sitzung(k), name: r.name };
  }

  sitzung(k) {
    const t = zufall(24);
    this.sql.exec('INSERT INTO sitzungen (token, k, ablauf) VALUES (?, ?, ?)', t, k, Date.now() + SITZUNG);
    this.sql.exec('DELETE FROM sitzungen WHERE ablauf < ?', Date.now());
    return t;
  }
}
