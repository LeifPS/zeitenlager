// Kurzes geführtes Tutorial für den Anfang. Fortschritt steht im Spielstand (s.tutorial).
import { icon } from './icons.js';

const SCHRITTE = [
  { text: 'Willkommen in deinem <b>Zeitenlager</b>! Hier beginnt deine Reise von der Antike bis zu den Sternen. Ich zeige dir kurz das Wichtigste.', knopf: 'Los geht\'s' },
  { text: 'Deine <b>Goldmine</b> fördert Gold. Tippe sie an, um das Gold einzusammeln.', warte: 'gold' },
  { text: 'Zwei gleiche Einheiten werden zu einer stärkeren. <b>Ziehe einen Krieger auf einen anderen Krieger</b> – so entsteht ein Bronze-Krieger.', warte: 'merge' },
  { text: 'Öffne die <b>Forschung</b> und erforsche etwas, zum Beispiel <b>Schrift</b> oder <b>Bergbau</b>. Fast alles im Spiel wird erforscht.', warte: 'forschung', zeige: '[data-u=forschung]' },
  { text: 'Mehr Gold, mehr Armee: Öffne <b>Bauen</b> und baue eine zweite <b>Goldmine</b>.', warte: 'bauen:goldmine', zeige: '[data-u=bauen]' },
  { text: 'Zeit für den ersten Kampf! Öffne <b>Angriff</b> und greif das erste Barbarendorf der Kampagne an. Der Kampf läuft von selbst.', warte: 'kampf', zeige: '[data-u=angriff]' },
  { text: 'Super! Gefallene Einheiten sind nur <b>verwundet</b> und werden geheilt. Später holen deine <b>Handwerker</b> auf der Karte Rohstoffe wie Kupfer und Pferde. Viel Spaß!', knopf: 'Fertig' },
];

class Tutorial {
  constructor(spiel) { this.spiel = spiel; this.el = null; }
  get schritt() { return this.spiel.s ? this.spiel.s.tutorial || 0 : 99; }
  start() { if (this.schritt < SCHRITTE.length) this.zeigen(); }
  setze(n) { this.spiel.aktion({ art: 'tutorial', schritt: n }); this.zeigen(); }
  ereignis(name) {
    const st = SCHRITTE[this.schritt];
    if (st && st.warte === name) { this.spiel.ton('fertig'); this.setze(this.schritt + 1); }
  }
  zeigen() {
    document.querySelectorAll('.zeige').forEach((e) => e.classList.remove('zeige'));
    const st = SCHRITTE[this.schritt];
    if (!st) { if (this.el) this.el.remove(); this.el = null; return; }
    if (!this.el) { this.el = document.createElement('div'); this.el.id = 'tutorial'; document.getElementById('spiel').appendChild(this.el); }
    this.el.innerHTML = `<div class="tut-figur">${icon('buch')}</div><div class="tut-text"><p>${st.text}</p><div class="tut-knoepfe">${st.knopf ? `<button class="knopf gruen" data-weiter>${st.knopf}</button>` : ''}<button class="knopf klein2" data-ueber>Überspringen</button><small>${this.schritt + 1}/${SCHRITTE.length}</small></div></div>`;
    const w = this.el.querySelector('[data-weiter]'); if (w) w.onclick = () => { this.spiel.ton('klick'); this.setze(this.schritt + 1); };
    this.el.querySelector('[data-ueber]').onclick = () => { this.spiel.ton('klick'); this.setze(SCHRITTE.length); };
    if (st.zeige) { const z = document.querySelector(st.zeige); if (z) z.classList.add('zeige'); }
  }
}

export function einbauen(spiel) {
  spiel.tutorial = new Tutorial(spiel);
  spiel.tutorialNeu = () => { spiel.aktion({ art: 'tutorialNeu' }); spiel.tutorial.zeigen(); };
}
