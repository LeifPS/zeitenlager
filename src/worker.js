// Einstiegspunkt: /api/* bedient der Server (D1-Datenbank), alles andere sind statische Dateien.
import { Welt, json } from './welt.js';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname.startsWith('/api/')) {
      if (!env.DB) return json({ ok: false, fehler: 'Server-Einrichtung fehlt: Datenbank DB ist nicht verbunden.' }, 500);
      return new Welt(env).fetch(request);
    }
    return env.ASSETS.fetch(request);
  },
};
