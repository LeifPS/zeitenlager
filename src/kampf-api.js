// Server-Teil für Karte, Barbarendörfer, Raids, Berichte und Rangliste.
import { tick, armeeMacht, kampfAuswerten, pluendern, pluenderbar, zeitalter } from '../public/shared/regeln.js';
import { einheitMacht } from '../public/shared/daten.js';
import { simuliere } from '../public/shared/kampf.js';
import { KAMPAGNE, erzeugeDorf, neueBarbaren, BARBAREN_NEU_NACH } from '../public/shared/barbaren.js';

const H = 3600000;
const ONLINE = 3 * 60000;
const zufallsSaat = () => { const a = new Uint32Array(1); crypto.getRandomValues(a); return a[0] || 1; };
const SEITEN = ['ol', 'or', 'ur', 'ul'];
export function suchKosten(za) { return Math.round(40 * Math.pow(2.3, za)); }

function gesundeArmee(s) { return s.einheiten.filter((u) => !u.verwundet && !u.gesperrt).map((u) => ({ id: u.id, typ: u.typ, stufe: u.stufe })); }
function basisVon(s) {
  return {
    gebaeude: s.gebaeude.filter((g) => g.stufe >= 1).map((g) => ({ id: g.id, typ: g.typ, x: g.x, y: g.y, stufe: g.stufe })),
    einheiten: gesundeArmee(s),
  };
}
function barbarenAktuell(s, jetzt) {
  if (!s.barbaren || jetzt - s.barbaren.zeit > BARBAREN_NEU_NACH || s.barbaren.liste.every((d) => d.besiegt)) {
    s.barbaren = neueBarbaren(Math.max(150, armeeMacht(s, einheitMacht)), zeitalter(s), jetzt, zufallsSaat());
  }
  return s.barbaren;
}
function melde(s, text, art) { s.meldungen.push({ t: s.zeit, text, art }); if (s.meldungen.length > 40) s.meldungen.splice(0, s.meldungen.length - 40); }

export const kampfApi = {
  macht(s) { return armeeMacht(s, einheitMacht); },

  async route(welt, pfad, k, body, jetzt) {
    if (pfad === '/nachbarn') {
      const s = await welt.ladeStand(k);
      const r = await welt.alle('SELECT staende.k AS k, konten.name AS name, hx, hy, zeitalter, ruhm FROM staende JOIN konten ON konten.k = staende.k WHERE ABS(hx - ?) < 60 AND ABS(hy - ?) < 60 LIMIT 200', s.heim.x, s.heim.y);
      return { ok: true, lager: r.filter((x) => x.k !== k).map((x) => ({ name: x.name, x: x.hx, y: x.hy, zeitalter: x.zeitalter, ruhm: x.ruhm })) };
    }
    if (pfad === '/rangliste') {
      const r = await welt.alle('SELECT konten.name AS name, staende.k AS k, ruhm, zeitalter, macht FROM staende JOIN konten ON konten.k = staende.k ORDER BY ruhm DESC, zeitalter DESC, macht DESC LIMIT 100');
      return { ok: true, liste: r.map((x) => ({ name: x.name, ich: x.k === k, ruhm: x.ruhm, zeitalter: x.zeitalter, macht: Math.round(x.macht) })) };
    }

    // ---------------------------------------- Barbaren
    if (pfad === '/barbaren') {
      const { s } = await welt.aendere(k, (s) => { tick(s, jetzt); const vorher = s.barbaren && s.barbaren.zeit; barbarenAktuell(s, jetzt); return s.barbaren.zeit === vorher ? { nichtSpeichern: true } : {}; });
      return { ok: true, kampagne: s.kampagne || 0, barbaren: s.barbaren, neuIn: s.barbaren.zeit + BARBAREN_NEU_NACH - jetzt };
    }
    if (pfad === '/barbaren/angriff') {
      const seite = SEITEN.includes(body.seite) ? body.seite : 'ul';
      const saat = zufallsSaat();
      const { s, r } = await welt.aendere(k, (s) => {
        tick(s, jetzt); s.aktiv = jetzt;
        const armee = gesundeArmee(s);
        if (!armee.length) return { ok: false, fehler: 'Du hast keine einsatzbereiten Einheiten.', nichtSpeichern: true };
        let def;
        if (body.quelle === 'kampagne') { def = KAMPAGNE[s.kampagne || 0]; if (!def) return { ok: false, fehler: 'Du hast die ganze Kampagne geschafft!', nichtSpeichern: true }; }
        else { const b = barbarenAktuell(s, jetzt); def = b.liste[body.i | 0]; if (!def || def.besiegt) return { ok: false, fehler: 'Dieses Dorf gibt es nicht mehr.', nichtSpeichern: true }; }
        const basis = erzeugeDorf(def);
        const eingabe = { saat, seite, angreifer: armee, basis };
        const erg = simuliere(eingabe);
        const beute = {};
        if (erg.sterne >= 1) {
          const f = body.quelle === 'kampagne' ? 1 : 0.3 + 0.7 * erg.prozent / 100;
          for (const x in def.beute) beute[x] = Math.round(def.beute[x] * f);
        }
        kampfAuswerten(s, erg.gefallenA, beute);
        if (body.quelle === 'kampagne' && erg.sterne >= 1) { s.kampagne = (s.kampagne || 0) + 1; s.kampagneSterne = s.kampagneSterne || {}; s.kampagneSterne[def.nr] = erg.sterne; }
        if (body.quelle !== 'kampagne') { const d = s.barbaren.liste[body.i | 0]; d.besiegt = true; }
        s.siege = (s.siege || 0) + (erg.sterne >= 1 ? 1 : 0);
        melde(s, `${erg.sterne >= 1 ? 'Sieg' : 'Niederlage'} gegen ${def.name}: ${erg.prozent} % zerstört.`, 'kampf');
        return { ok: true, eingabe, ergebnis: { ...erg, beute }, name: def.name };
      });
      if (!r.ok) return r;
      await welt.los('INSERT INTO berichte (k, t, daten) VALUES (?, ?, ?)', k, jetzt, JSON.stringify({ art: 'barbar', t: jetzt, name: r.name, angreifer: true, eingabe: r.eingabe, ergebnis: r.ergebnis }));
      delete s._rev;
      return { ...r, s, jetzt };
    }

    // ---------------------------------------- Raids
    if (pfad === '/raid/suchen') {
      let fehler = null, gefunden = null;
      const { s } = await welt.aendere(k, async (s) => {
        tick(s, jetzt);
        const za = zeitalter(s), preis = suchKosten(za);
        if (!gesundeArmee(s).length) { fehler = 'Du hast keine einsatzbereiten Einheiten.'; return { nichtSpeichern: true }; }
        if (s.gold < preis) { fehler = 'Für die Suche fehlt dir Gold.'; return { nichtSpeichern: true }; }
        const liste = await welt.alle('SELECT staende.k AS k, konten.name AS name, ruhm, zeitalter FROM staende JOIN konten ON konten.k = staende.k WHERE staende.k != ? AND zeitalter BETWEEN ? AND ? AND schild < ? AND gesehen < ? ORDER BY ABS(ruhm - ?) LIMIT 12',
          k, za - 1, za + 1, jetzt, jetzt - ONLINE, s.ruhm | 0);
        const ohneLetzten = liste.filter((x) => !s.raidZiel || x.k !== s.raidZiel.k);
        const auswahl = ohneLetzten.length ? ohneLetzten : liste;
        const wahl = auswahl[Math.floor(Math.random() * Math.min(5, auswahl.length))];
        if (!wahl) { fehler = 'Gerade findet sich kein passender Gegner (alle geschützt, online oder in einem anderen Zeitalter). Versuch es später oder greif Barbaren an.'; return { nichtSpeichern: true }; }
        const g = await welt.ladeStand(wahl.k);
        tick(g, jetzt);
        s.gold -= preis;
        s.raidZiel = { k: wahl.k, bis: jetzt + 5 * 60000 };
        gefunden = { name: wahl.name, lager: g.name, ruhm: g.ruhm | 0, zeitalter: zeitalter(g), basis: basisVon(g), beute: pluenderbar(g) };
        return {};
      });
      delete s._rev;
      if (fehler) return { ok: false, fehler };
      return { ok: true, gegner: gefunden, s, jetzt };
    }
    if (pfad === '/raid/angriff') {
      const seite = SEITEN.includes(body.seite) ? body.seite : 'ul';
      const a = await welt.ladeStand(k);
      tick(a, jetzt);
      if (!a.raidZiel || a.raidZiel.bis < jetzt) return { ok: false, fehler: 'Die Suche ist abgelaufen. Such einen neuen Gegner.' };
      const armee = gesundeArmee(a);
      if (!armee.length) return { ok: false, fehler: 'Du hast keine einsatzbereiten Einheiten.' };
      const vk = a.raidZiel.k;
      const g0 = await welt.ladeStand(vk);
      tick(g0, jetzt);
      if (Math.max(g0.schildBis || 0, g0.neulingBis || 0) > jetzt) return { ok: false, fehler: 'Dieses Lager steht inzwischen unter Schutz.' };
      if ((g0.gesehen || 0) > jetzt - ONLINE) return { ok: false, fehler: 'Der Spieler ist gerade online. Such einen anderen Gegner.' };
      const saat = zufallsSaat();
      const eingabe = { saat, seite, angreifer: armee, basis: basisVon(g0) };
      const erg = simuliere(eingabe);
      const ar = a.ruhm | 0, vr = g0.ruhm | 0;
      const basisRuhm = Math.max(6, Math.min(40, Math.round(20 + (vr - ar) / 25)));
      const ruhm = erg.sterne >= 1 ? Math.max(1, Math.round(basisRuhm * erg.sterne / 3)) : -Math.round(basisRuhm * 0.5);
      const anName = (await welt.eins('SELECT name FROM konten WHERE k = ?', k)).name;
      const vName = (await welt.eins('SELECT name FROM konten WHERE k = ?', vk)).name;
      // Verteidiger zuerst: Verluste feststellen
      let verlust = {};
      await welt.aendere(vk, (g) => {
        tick(g, jetzt);
        verlust = erg.prozent > 0 ? pluendern(g, Math.min(1, erg.prozent / 100 + (erg.sterne >= 2 ? 0.15 : 0))) : {};
        kampfAuswerten(g, erg.gefallenV, null);
        g.ruhm = Math.max(0, (g.ruhm | 0) - ruhm);
        const schild = erg.sterne >= 3 ? 16 : erg.sterne === 2 ? 12 : erg.sterne === 1 || erg.prozent >= 40 ? 8 : 0;
        if (schild) g.schildBis = Math.max(g.schildBis || 0, jetzt + schild * H);
        melde(g, `${anName} hat dein Lager angegriffen: ${erg.prozent} % zerstört, ${erg.sterne} ${erg.sterne === 1 ? 'Stern' : 'Sterne'}.${schild ? ` Du hast ${schild} Std Schutz.` : ''}`, 'raid');
        g.verteidigungen = (g.verteidigungen || 0) + 1;
        return {};
      });
      const { s } = await welt.aendere(k, (s) => {
        tick(s, jetzt); s.aktiv = jetzt;
        kampfAuswerten(s, erg.gefallenA, verlust);
        s.ruhm = Math.max(0, (s.ruhm | 0) + ruhm);
        s.schildBis = 0; s.neulingBis = Math.min(s.neulingBis || 0, jetzt);
        s.raidZiel = null;
        s.siege = (s.siege || 0) + (erg.sterne >= 1 ? 1 : 0);
        melde(s, `Raid auf ${vName}: ${erg.prozent} % zerstört, ${ruhm >= 0 ? '+' : ''}${ruhm} Ruhm.`, 'kampf');
        return {};
      });
      const bericht = JSON.stringify({ art: 'raid', t: jetzt, angreiferName: anName, verteidigerName: vName, eingabe, ergebnis: { ...erg, beute: verlust, ruhm } });
      await welt.db.batch([
        welt.db.prepare('INSERT INTO berichte (k, t, daten) VALUES (?, ?, ?)').bind(k, jetzt, bericht),
        welt.db.prepare('INSERT INTO berichte (k, t, daten) VALUES (?, ?, ?)').bind(vk, jetzt, bericht),
      ]);
      delete s._rev;
      return { ok: true, eingabe, ergebnis: { ...erg, beute: verlust, ruhm }, name: vName, s, jetzt };
    }
    if (pfad === '/berichte') {
      const r = await welt.alle('SELECT id, t, daten FROM berichte WHERE k = ? ORDER BY t DESC LIMIT 25', k);
      const ich = (await welt.eins('SELECT name FROM konten WHERE k = ?', k)).name;
      return { ok: true, ich, liste: r.map((x) => { const d = JSON.parse(x.daten); delete d.eingabe; return { id: x.id, ...d }; }) };
    }
    if (pfad === '/bericht') {
      const r = await welt.eins('SELECT daten FROM berichte WHERE k = ? AND id = ?', k, body.id | 0);
      if (!r) return { ok: false, fehler: 'Bericht nicht gefunden.' };
      return { ok: true, bericht: JSON.parse(r.daten) };
    }
    return null;
  },
};
