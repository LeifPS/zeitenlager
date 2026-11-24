import { Kampf } from '../public/shared/kampf.js';
import { KAMPAGNE, erzeugeDorf, dorfMacht } from '../public/shared/barbaren.js';
import { einheitMacht } from '../public/shared/daten.js';
const armee = (liste) => liste.map(([typ, stufe], i) => ({ id: i + 1, typ, stufe }));
const macht = (a) => a.reduce((m, u) => m + einheitMacht(u.typ, u.stufe), 0);
function test(name, a, dorf) {
  let t0 = Date.now();
  const k = new Kampf({ saat: 7, seite: 'ul', angreifer: a, basis: dorf });
  const r = k.bisEnde();
  console.log(name.padEnd(28), 'Armee', Math.round(macht(a)), 'Dorf', Math.round(dorfMacht(dorf)), '→', r.sterne + '★', r.prozent + '%', r.zeit + 's', 'gefallen', r.gefallenA.length + '/' + a.length, (Date.now() - t0) + 'ms');
}
const start = armee([['krieger', 0], ['krieger', 0], ['krieger', 0], ['schleuderer', 0]]);
for (const k of KAMPAGNE.slice(0, 6)) test(k.name, start, erzeugeDorf(k));
const a2 = armee([['krieger', 1], ['krieger', 1], ['krieger', 1], ['schleuderer', 1], ['schleuderer', 1], ['speertraeger', 0], ['streitwagen', 0], ['streitwagen', 0]]);
for (const k of KAMPAGNE.slice(0, 6)) test('A2 ' + k.name, a2, erzeugeDorf(k));
const a3 = armee([['schwertkaempfer', 2], ['schwertkaempfer', 2], ['bogenschuetze', 2], ['bogenschuetze', 1], ['hoplit', 1], ['reiterei', 1], ['katapult', 1], ['katapult', 0]]);
for (const k of KAMPAGNE.slice(5, 11)) test('A3 ' + k.name, a3, erzeugeDorf(k));
for (const f of [0.65, 0.95, 1.3]) test('Endlos ' + f, a2, erzeugeDorf({ saat: 99, macht: macht(a2) * f, za: 0 }));
