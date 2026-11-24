// Einstiegspunkt: /api/* geht an das Durable Object "Welt" (alle Spieler, eine Welt), alles andere sind statische Dateien.
export { Welt } from './welt.js';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname.startsWith('/api/')) {
      const id = env.WELT.idFromName('welt');
      return env.WELT.get(id).fetch(request);
    }
    return env.ASSETS.fetch(request);
  },
};
