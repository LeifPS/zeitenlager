// Server-Teil für Karte, Kämpfe, Raids und Rangliste.
import { armeeMacht } from '../public/shared/regeln.js';
import { einheitMacht } from '../public/shared/daten.js';

export const kampfApi = {
  macht(s) { return armeeMacht(s, einheitMacht); },

  async route(welt, pfad, k, body, jetzt) {
    if (pfad === '/nachbarn') {
      const s = await welt.ladeStand(k);
      const r = await welt.alle('SELECT staende.k AS k, konten.name AS name, hx, hy, zeitalter, ruhm FROM staende JOIN konten ON konten.k = staende.k WHERE ABS(hx - ?) < 60 AND ABS(hy - ?) < 60 LIMIT 200', s.heim.x, s.heim.y);
      return { ok: true, lager: r.filter((x) => x.k !== k).map((x) => ({ name: x.name, x: x.hx, y: x.hy, zeitalter: x.zeitalter, ruhm: x.ruhm })) };
    }
    if (pfad === '/rangliste') {
      const r = await welt.alle('SELECT konten.name AS name, ruhm, zeitalter, macht FROM staende JOIN konten ON konten.k = staende.k ORDER BY ruhm DESC, zeitalter DESC LIMIT 100');
      return { ok: true, liste: r.map((x) => ({ name: x.name, ruhm: x.ruhm, zeitalter: x.zeitalter, macht: Math.round(x.macht) })) };
    }
    void body; void jetzt;
    return null;
  },
};
