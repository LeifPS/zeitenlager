# Zeitenlager

Kriegslager-Strategiespiel: Einheiten ausbilden und gleiche Einheiten zu höheren Stufen mergen (Normal bis Legende),
11 Zeitalter von der Antike bis zum Interstellaren Zeitalter, Civ-artiger Forschungsbaum, gemeinsame Karte mit Handwerkern,
Auto-Kämpfe gegen Barbarendörfer und Raids auf andere Spieler.

- Läuft als Cloudflare Worker (`src/worker.js`) mit einem Durable Object (`src/welt.js`, SQLite) für Konten und Spielstände.
- Die Spielregeln (`public/shared/`) laufen gleich im Browser und auf dem Server; der Server ist verbindlich.
- Deploy: Push auf `main` (Cloudflare Workers Builds) oder `npx wrangler deploy`.
- Lokal: `npm install`, `npx wrangler dev`, Browsertest: `node tools/browsertest.mjs`.
- Musik: MP3-Dateien nach `public/musik/` legen (`lager.mp3`, später `kampf.mp3`).
