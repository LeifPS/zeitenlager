// Einstiegspunkt: /api/* geht an das Durable Object "Welt" (alle Spieler, eine Welt), alles andere sind statische Dateien.
export { Welt } from './welt.js';

const fehler = (text) => new Response(JSON.stringify({ ok: false, fehler: text }), { status: 500, headers: { 'content-type': 'application/json; charset=utf-8' } });

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname.startsWith('/api/')) {
      if (!env.WELT) return fehler('Server-Einrichtung fehlt: Durable Object WELT ist nicht verbunden (Deploy mit "npx wrangler deploy").');
      try {
        const id = env.WELT.idFromName('welt');
        return await env.WELT.get(id).fetch(request);
      } catch (e) {
        return fehler('Serverfehler: ' + (e && e.message || e));
      }
    }
    return env.ASSETS.fetch(request);
  },
};
