import test from 'node:test';
import assert from 'node:assert/strict';
import * as R from '../public/shared/regeln.js';
import { FORSCHUNG } from '../public/shared/daten.js';

const H = 3600e3;
function neu() { return R.neuerZustand('T', { x: 10, y: 10 }, 1e12); }

test('Startzustand und Mergen', () => {
  const s = neu();
  assert.equal(s.einheiten.length, 4);
  assert.ok(s.startfelder.length >= 4);
  const [a, b] = s.einheiten;
  assert.ok(R.aktion(s, { art: 'mergen', a: a.id, b: b.id }, s.zeit).ok);
  assert.equal(s.einheiten.find((u) => u.id === a.id).stufe, 1);
  assert.equal(R.aktion(s, { art: 'mergen', a: a.id, b: s.einheiten[2].id }, s.zeit).ok, false);
});

test('Goldmine füllt sich höchstens 2 Stunden', () => {
  const s = neu();
  const m = s.gebaeude.find((g) => g.typ === 'goldmine');
  R.tick(s, s.zeit + 10 * H);
  assert.equal(Math.round(R.mineInhalt(s, m, s.zeit)), 800);
});

test('Handwerker liefern und hören nach 2 Std Abwesenheit auf', () => {
  const s = neu();
  let t = s.zeit;
  R.aktion(s, { art: 'forschen', id: 'bergbau' }, t);
  t += 2 * H; R.tick(s, t);
  assert.ok(s.forschung.fertig.includes('bergbau'));
  const f = s.startfelder.find((q) => q.res === 'kupfer');
  const r = R.aktion(s, { art: 'handwerkerSchicken', x: f.x, y: f.y }, t);
  assert.ok(r.ok, r.fehler);
  R.tick(s, t + 30 * 3600e3);
  assert.ok(s.res.kupfer > 0);
  assert.equal(s.handwerker.length, 0);
});

test('Zeitalter: Zentrum braucht die Zeitenwende', () => {
  const s = neu();
  const z = s.gebaeude.find((g) => g.typ === 'zentrum');
  s.gold = 1e6;
  assert.equal(R.aktion(s, { art: 'ausbauen', id: z.id }, s.zeit).ok, false);
  s.forschung.fertig.push(...Object.keys(FORSCHUNG).filter((k) => FORSCHUNG[k].zeitalter === 0));
  const r = R.aktion(s, { art: 'ausbauen', id: z.id }, s.zeit);
  assert.ok(r.ok, r.fehler);
  R.tick(s, s.zeit + 3 * H);
  assert.equal(R.zeitalter(s), 1);
});

test('Ausbildung braucht Platz und läuft der Reihe nach', () => {
  const s = neu(); s.gold = 1e5;
  for (let i = 0; i < 6; i++) assert.ok(R.aktion(s, { art: 'ausbilden', typ: 'krieger' }, s.zeit).ok);
  assert.equal(R.aktion(s, { art: 'ausbilden', typ: 'krieger' }, s.zeit).ok, false);
  R.tick(s, s.zeit + H);
  assert.equal(s.einheiten.length, 10);
});
