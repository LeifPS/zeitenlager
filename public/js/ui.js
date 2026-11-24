// Oberfläche: obere Leiste, untere Knöpfe, Auswahl-Leiste, Fenster (Bauen, Ausbilden, Armee, Forschung, Einstellungen).
import {
  GEBAEUDE, GEBAEUDE_IDS, EINHEITEN, FORSCHUNG, FORSCHUNG_IDS, ROHSTOFFE, ROHSTOFF_IDS, STUFEN, ZEITALTER, ROEMISCH, LINIEN, LINIE_GEBAEUDE, EINHEIT_FOLGE,
  bauKosten, bauZeit, goldProStunde, goldLager, rohstoffLager, platzVon, forschungsTempo, einheitWerte, abwehrWerte, gebaeudeHp, PRODUKTION_MAX_STUNDEN,
  heilSlots, ausbildungsZeitalter, handwerkerTraglast,
} from '../shared/daten.js';
import * as R from '../shared/regeln.js';
import { icon, sterneHtml } from './icons.js';
import { zahl, dauer, esc } from './format.js';
import { einheitPortrait, gebaeudePortrait } from './grafik.js';

const $ = (sel, el = document) => el.querySelector(sel);
export function kostenHtml(s, k, mitFehlend = true) {
  const teile = [];
  for (const r in k) {
    if (!k[r]) continue;
    const fehlt = mitFehlend && (r === 'gold' ? s.gold < k[r] : (s.res[r] || 0) < k[r]);
    teile.push(`<span class="kosten ${fehlt ? 'fehlt' : ''}">${icon(r)}${zahl(k[r])}</span>`);
  }
  return teile.join('') || '<span class="kosten">kostenlos</span>';
}

export class UI {
  constructor(spiel) {
    this.spiel = spiel;
    this.oben = $('#oben'); this.unten = $('#unten'); this.auswahl = $('#auswahl'); this.fenster = $('#fenster'); this.toasts = $('#toasts'); this.baumodus = $('#baumodus');
    this.unten.innerHTML = [
      ['bauen', 'Bauen'], ['armee', 'Armee'], ['forschung', 'Forschung'], ['karte', 'Karte'], ['angriff', 'Angriff'],
    ].map(([id, t]) => `<button class="knopf rund" data-u="${id}">${icon(id)}<span>${t}</span></button>`).join('');
    this.unten.addEventListener('click', (e) => { const b = e.target.closest('[data-u]'); if (b) { this.spiel.ton('klick'); this.oeffne(b.dataset.u); } });
    $('#ecke').innerHTML = `<button class="knopf klein" data-u="rangliste" title="Rangliste">${icon('ruhm')}</button><button class="knopf klein" data-u="meldungen" title="Meldungen">${icon('liste')}<b class="punkt" hidden></b></button><button class="knopf klein" data-u="einstellungen" title="Einstellungen">${icon('zahnrad')}</button>`;
    $('#ecke').addEventListener('click', (e) => { const b = e.target.closest('[data-u]'); if (b) { this.spiel.ton('klick'); this.oeffne(b.dataset.u); } });
    this.fenster.addEventListener('click', (e) => { if (e.target === this.fenster) this.schliessen(); });
    this.baumodus.addEventListener('click', (e) => { const b = e.target.closest('[data-b]'); if (b) this.spiel.baumodusKnopf(b.dataset.b); });
    this.offen = null;
    addEventListener('pointerdown', () => { this.zeigerUnten = true; }, true);
    addEventListener('pointerup', () => { setTimeout(() => { this.zeigerUnten = false; }, 50); }, true);
    addEventListener('pointercancel', () => { this.zeigerUnten = false; }, true);
  }

  // ---------------------------------------------------- Leisten
  obenAktualisieren() {
    const s = this.spiel.s; if (!s) return;
    const gm = R.goldMax(s), za = R.zeitalter(s);
    const pm = R.platzMax(s), pb = R.platzBelegt(s);
    const e = R.effekte(s);
    const res = ROHSTOFF_IDS.filter((r) => e.sicht.has(r) || s.res[r] > 0);
    const rm = R.rohstoffMax(s);
    this.oben.innerHTML = `
      <div class="balkenbox gold" title="Gold"><span class="ic-gross">${icon('gold')}</span><div class="bb"><b>${zahl(s.gold)}</b><i style="width:${Math.min(100, s.gold / gm * 100)}%"></i></div><small>max ${zahl(gm)}</small></div>
      <div class="balkenbox platz" title="Platz für Einheiten"><span class="ic-gross">${icon('platz')}</span><div class="bb"><b>${pb}/${pm}</b><i style="width:${Math.min(100, pb / pm * 100)}%"></i></div></div>
      ${res.length ? `<button class="resleiste" data-u="rohstoffe" title="Rohstoffe (max ${zahl(rm)} je Sorte)">${res.slice(0, 6).map((r) => `<span>${icon(r)}${zahl(s.res[r])}</span>`).join('')}${res.length > 6 ? `<span>+${res.length - 6}</span>` : ''}</button>` : ''}
      <div class="zeitalter" style="--za:${ZEITALTER[za].farbe}" title="Dein Zeitalter">${ZEITALTER[za].name}</div>
      <div class="ruhm" title="Ruhm">${icon('ruhm')}<b>${zahl(s.ruhm)}</b></div>`;
    const rl = $('.resleiste', this.oben); if (rl) rl.onclick = () => this.oeffne('rohstoffe');
    const ungelesen = (s.meldungen || []).length;
    const p = $('#ecke .punkt'); if (p) p.hidden = !ungelesen;
  }

  toast(text, art = '') {
    const d = document.createElement('div');
    d.className = 'toast ' + art; d.textContent = text;
    this.toasts.appendChild(d);
    setTimeout(() => d.classList.add('weg'), 2600);
    setTimeout(() => d.remove(), 3100);
    while (this.toasts.children.length > 4) this.toasts.firstChild.remove();
  }

  // Auswahl-Leiste für ein Gebäude
  zeigeAuswahl(b) {
    this.ausgewaehlt = b ? b.id : null;
    this.auswahlAktualisieren();
  }
  auswahlAktualisieren() {
    const s = this.spiel.s;
    const b = this.ausgewaehlt != null && s.gebaeude.find((x) => x.id === this.ausgewaehlt);
    if (!b || this.spiel.lager.modus) { this.auswahl.hidden = true; this.ausgewaehlt = b ? this.ausgewaehlt : null; return; }
    const g = GEBAEUDE[b.typ];
    const knoepfe = [];
    knoepfe.push(['info', 'buch', 'Info']);
    if (b.bauBis) knoepfe.push(['sofortBau', 'blitz', `${zahl(R.sofortGold(b.bauBis - this.spiel.jetzt(), s))}`]);
    else if (g.kat !== 'deko' && b.stufe < g.max(11)) knoepfe.push(['ausbauen', 'pfeilhoch', 'Ausbauen']);
    if (b.typ === 'goldmine' && b.stufe >= 1) knoepfe.push(['einsammeln', 'gold', 'Sammeln']);
    if (['kaserne', 'schiessstand', 'stall', 'werkstatt', 'flugfeld'].includes(b.typ) && b.stufe >= 1) knoepfe.push(['ausbilden', 'armee', 'Ausbilden']);
    if (b.typ === 'akademie') knoepfe.push(['forschung', 'forschung', 'Forschen']);
    if ((b.typ === 'heilhaus' || b.typ === 'ruestkammer') && b.stufe >= 1) knoepfe.push(['armee', 'armee', 'Armee']);
    if (b.typ === 'handwerkerhuette') knoepfe.push(['karte', 'karte', 'Karte']);
    knoepfe.push(['verschieben', 'verschieben', 'Verschieben']);
    if (['baum', 'fahne', 'statue', 'mauer', 'falle'].includes(b.typ)) knoepfe.push(['abreissen', 'x', 'Entfernen']);
    const rest = b.bauBis ? `<small class="bauzeit">${icon('uhr')}${dauer(b.bauBis - this.spiel.jetzt())}</small>` : '';
    this.auswahl.innerHTML = `<div class="titel">${esc(g.name)} <span class="stufe">${b.stufe === 0 ? 'im Bau' : 'Stufe ' + b.stufe}</span>${rest}</div>
      <div class="reihe">${knoepfe.map(([a, ic, t]) => `<button class="knopf rund mini ${a === 'sofortBau' ? 'gruen' : ''}" data-a="${a}">${icon(ic)}<span>${t}</span></button>`).join('')}</div>`;
    this.auswahl.hidden = false;
    this.auswahl.onclick = (e) => {
      const k = e.target.closest('[data-a]'); if (!k) return;
      this.spiel.ton('klick');
      const a = k.dataset.a;
      if (a === 'info' || a === 'ausbauen') this.oeffne('gebaeude', b.id);
      else if (a === 'sofortBau') this.spiel.aktion({ art: 'sofortBau', id: b.id });
      else if (a === 'einsammeln') this.spiel.einsammeln(b);
      else if (a === 'ausbilden') this.oeffne('ausbilden', b.id);
      else if (a === 'forschung' || a === 'armee' || a === 'karte') this.oeffne(a);
      else if (a === 'verschieben') this.spiel.verschiebenStarten(b);
      else if (a === 'abreissen') { this.spiel.aktion({ art: 'abreissen', id: b.id }); this.zeigeAuswahl(null); }
    };
  }
  zeigeBaumodus(an, ok = true) {
    this.baumodus.hidden = !an;
    if (an) this.baumodus.innerHTML = `<button class="knopf rund rot" data-b="nein">${icon('x')}</button><button class="knopf rund gruen ${ok ? '' : 'aus'}" data-b="ja">${icon('haken')}</button>`;
  }

  // ---------------------------------------------------- Fenster
  oeffne(art, arg) {
    this.offen = { art, arg };
    this.fenster.hidden = false;
    this.rendereFenster();
  }
  schliessen() { this.fenster.hidden = true; this.fenster.innerHTML = ''; this.offen = null; this.spiel.fensterZu?.(); }
  rendereFenster() {
    if (!this.offen) return;
    const f = this['f_' + this.offen.art];
    if (!f) { this.schliessen(); this.toast('Kommt mit dem nächsten Update!'); return; }
    const scroll = $('.inhalt', this.fenster)?.scrollTop || 0;
    const scrollX = $('.baum-scroll', this.fenster)?.scrollLeft;
    const r = f.call(this, this.offen.arg);
    if (!r) return;
    if (this.nurWennGeaendert && r.html === this.letztesHtml && r.titel === this.letzterTitel && this.fenster.firstChild) return;
    this.letztesHtml = r.html; this.letzterTitel = r.titel;
    this.fenster.innerHTML = `<div class="blatt ${r.klasse || ''}"><div class="kopf"><h2>${r.titel}</h2><button class="knopf zu" data-zu>${icon('x')}</button></div><div class="inhalt">${r.html}</div></div>`;
    $('[data-zu]', this.fenster).onclick = () => { this.spiel.ton('klick'); this.schliessen(); };
    const inh = $('.inhalt', this.fenster); inh.scrollTop = scroll;
    if (scrollX != null && $('.baum-scroll', this.fenster)) $('.baum-scroll', this.fenster).scrollLeft = scrollX;
    if (r.nach) r.nach($('.blatt', this.fenster));
  }
  aktualisiereFenster() {
    if (!this.offen || this.fenster.hidden) return;
    if (['f_forschung'].includes('f_' + this.offen.art) && this.detailOffen) return;
    if (document.activeElement && this.fenster.contains(document.activeElement) && document.activeElement.tagName === 'INPUT') return;
    if (this.zeigerUnten) return; // nicht während eines Klicks neu zeichnen
    this.nurWennGeaendert = true;
    try { this.rendereFenster(); } finally { this.nurWennGeaendert = false; }
  }

  // Bauen (Laden)
  f_bauen(arg) {
    const s = this.spiel.s, e = R.effekte(s), zl = R.zentrumStufe(s), za = R.zeitalter(s);
    const kat = arg || this.bauKat || 'wirtschaft'; this.bauKat = kat;
    const tabs = [['wirtschaft', 'Wirtschaft'], ['militaer', 'Militär'], ['verteidigung', 'Verteidigung'], ['deko', 'Schmuck']];
    const karten = GEBAEUDE_IDS.filter((id) => GEBAEUDE[id].kat === kat && id !== 'zentrum').map((id) => {
      const g = GEBAEUDE[id];
      const hat = s.gebaeude.filter((b) => b.typ === id).length, darf = g.anzahl(zl);
      const frei = e.gebaeude.has(id);
      const k = bauKosten(id, 1);
      let sperre = '';
      if (!frei) { const t = FORSCHUNG_IDS.find((f) => (FORSCHUNG[f].eff.gebaeude || []).includes(id)); sperre = 'Erforsche: ' + (t ? FORSCHUNG[t].name : '?'); }
      else if (hat >= darf) sperre = darf <= 0 ? 'Später verfügbar' : `${hat}/${darf} gebaut`;
      return `<button class="karte-g ${sperre ? 'gesperrt' : ''}" data-typ="${id}" ${sperre ? 'disabled' : ''}>
        <img src="${gebaeudePortrait(id, 1, Math.min(za, 0))}" alt="">
        <b>${g.name}</b><small>${hat}/${Math.max(0, darf)}</small>
        <div class="k">${sperre ? `<span class="sperre">${esc(sperre)}</span>` : kostenHtml(s, k)}</div>
        ${!sperre && bauZeit(id, 1) ? `<i class="z">${icon('uhr')}${dauer(bauZeit(id, 1) * 1000)}</i>` : ''}
      </button>`;
    }).join('');
    return {
      titel: 'Bauen', klasse: 'breit',
      html: `<div class="tabs">${tabs.map(([k, t]) => `<button class="tab ${k === kat ? 'an' : ''}" data-kat="${k}">${t}</button>`).join('')}</div><div class="raster">${karten}</div>
        <p class="hinweis">Baumeister frei: ${Math.max(0, R.baumeisterFrei(s, e))} von ${e.baumeister}</p>`,
      nach: (el) => {
        el.querySelectorAll('[data-kat]').forEach((b) => b.onclick = () => { this.spiel.ton('klick'); this.oeffne('bauen', b.dataset.kat); });
        el.querySelectorAll('[data-typ]').forEach((b) => b.onclick = () => { this.spiel.ton('klick'); this.schliessen(); this.spiel.bauenStarten(b.dataset.typ); });
      },
    };
  }

  // Gebäude-Info + Ausbau
  f_gebaeude(id) {
    const s = this.spiel.s; const b = s.gebaeude.find((x) => x.id === id); if (!b) return null;
    const g = GEBAEUDE[b.typ], za = R.zeitalter(s);
    const ziel = b.stufe + 1;
    const werte = this.gebaeudeWerte(b.typ, b.stufe, ziel, s);
    let ausbau = '';
    if (b.bauBis) ausbau = `<p class="hinweis">Wird gebaut: noch ${dauer(b.bauBis - this.spiel.jetzt())}</p><button class="knopf gross gruen" data-sofort>${icon('blitz')} Sofort fertig: ${icon('gold')}${zahl(R.sofortGold(b.bauBis - this.spiel.jetzt(), s))}</button>`;
    else if (g.kat === 'deko') ausbau = '';
    else if (ziel > g.max(11)) ausbau = '<p class="hinweis">Höchste Stufe erreicht.</p>';
    else {
      let sperre = '';
      if (b.typ === 'zentrum' && R.effekte(s).zeitalterErlaubt < b.stufe) sperre = `Erforsche zuerst „${FORSCHUNG['tor_' + b.stufe]?.name || 'Zeitenwende'}“.`;
      else if (b.typ !== 'zentrum' && ziel > R.gebaeudeMaxStufe(s, b.typ)) sperre = `Baue zuerst dein Zentrum auf Stufe ${R.zentrumStufe(s) + 1} aus.`;
      const k = bauKosten(b.typ, ziel);
      ausbau = `<div class="ausbau"><h3>Ausbau auf Stufe ${ziel}${b.typ === 'zentrum' ? ` – ${ZEITALTER[ziel - 1].name}` : ''}</h3>
        ${sperre ? `<p class="sperre">${esc(sperre)}</p>` : `<div class="kostenzeile">${kostenHtml(s, k)}<span class="kosten">${icon('uhr')}${dauer(bauZeit(b.typ, ziel) * 1000)}</span></div>
        <button class="knopf gross gruen" data-ausbauen ${R.kannBezahlen(s, k) ? '' : 'disabled'}>${icon('pfeilhoch')} Ausbauen</button>`}</div>`;
    }
    return {
      titel: `${g.name} <span class="stufe">${b.stufe ? 'Stufe ' + b.stufe : 'im Bau'}</span>`,
      html: `<div class="info-kopf"><img src="${gebaeudePortrait(b.typ, Math.max(1, b.stufe), Math.min(za, Math.floor((Math.max(1, b.stufe) - 1) / 2)))}" alt=""><p>${esc(g.text)}</p></div>
        <table class="werte">${werte}</table>${ausbau}`,
      nach: (el) => {
        const a = $('[data-ausbauen]', el); if (a) a.onclick = () => { this.spiel.aktion({ art: 'ausbauen', id: b.id }, () => { this.spiel.ton('bauen'); this.schliessen(); }); };
        const so = $('[data-sofort]', el); if (so) so.onclick = () => this.spiel.aktion({ art: 'sofortBau', id: b.id }, () => this.schliessen());
      },
    };
  }
  gebaeudeWerte(typ, st, ziel, s) {
    const zeilen = [];
    const z = (name, a, b) => zeilen.push(`<tr><td>${name}</td><td>${a}</td><td class="neu">${b != null && b !== a ? icon('pfeilrechts') + ' ' + b : ''}</td></tr>`);
    const hatZiel = ziel <= GEBAEUDE[typ].max(11) && GEBAEUDE[typ].kat !== 'deko';
    const st1 = Math.max(1, st);
    if (typ === 'goldmine') { const f = 1 + R.effekte(s).gold; z('Gold pro Stunde', zahl(goldProStunde(st1) * f), hatZiel ? zahl(goldProStunde(ziel) * f) : null); z('Fasst', zahl(goldProStunde(st1) * f * PRODUKTION_MAX_STUNDEN), hatZiel ? zahl(goldProStunde(ziel) * f * PRODUKTION_MAX_STUNDEN) : null); }
    if (typ === 'schatzkammer') z('Gold-Lager', zahl(goldLager(st1)), hatZiel ? zahl(goldLager(ziel)) : null);
    if (typ === 'rohstofflager') z('Lager je Rohstoff', zahl(rohstoffLager(st1)), hatZiel ? zahl(rohstoffLager(ziel)) : null);
    if (typ === 'unterkunft') z('Platz', platzVon(st1), hatZiel ? platzVon(ziel) : null);
    if (typ === 'akademie') z('Wissen pro Stunde', zahl(forschungsTempo(st1)), hatZiel ? zahl(forschungsTempo(ziel)) : null);
    if (typ === 'heilhaus') z('Heilt gleichzeitig', heilSlots(st1), hatZiel ? heilSlots(ziel) : null);
    if (typ === 'handwerkerhuette') z('Traglast', Math.round(handwerkerTraglast(st1) * 100) + ' %', hatZiel ? Math.round(handwerkerTraglast(ziel) * 100) + ' %' : null);
    if (LINIE_GEBAEUDE && Object.values(LINIE_GEBAEUDE).includes(typ)) z('Bildet aus bis', ZEITALTER[ausbildungsZeitalter(st1)].name, hatZiel ? ZEITALTER[ausbildungsZeitalter(ziel)].name : null);
    const a = abwehrWerte(typ, st1); if (a) z('Schaden', zahl(a.schaden), hatZiel ? zahl(abwehrWerte(typ, ziel).schaden) : null);
    if (a) z('Reichweite', a.rw + ' Felder');
    if (GEBAEUDE[typ].kat !== 'deko') z('Lebenspunkte', zahl(gebaeudeHp(typ, st1)), hatZiel ? zahl(gebaeudeHp(typ, ziel)) : null);
    if (typ === 'zentrum') { z('Gold-Lager', zahl(R.goldMax(s))); z('Zeitalter', ZEITALTER[st1 - 1].name); }
    return zeilen.join('');
  }

  // Ausbilden
  f_ausbilden(gid) {
    const s = this.spiel.s; const b = s.gebaeude.find((x) => x.id === gid); if (!b) return null;
    const e = R.effekte(s);
    const linien = Object.keys(LINIE_GEBAEUDE).filter((l) => LINIE_GEBAEUDE[l] === b.typ);
    const typen = Object.values(EINHEITEN).filter((d) => linien.includes(d.linie)).sort((a, z) => a.zeitalter - z.zeitalter || a.linie.localeCompare(z.linie));
    const max = ausbildungsZeitalter(b.stufe);
    const pm = R.platzMax(s), pb = R.platzBelegt(s);
    const karten = typen.filter((d) => d.zeitalter <= max + 1).map((d) => {
      const frei = e.einheiten.has(d.id) && d.zeitalter <= max;
      let sperre = '';
      if (!e.einheiten.has(d.id)) { const t = FORSCHUNG_IDS.find((f) => (FORSCHUNG[f].eff.einheiten || []).includes(d.id)); sperre = 'Erforsche: ' + (t ? FORSCHUNG[t].name : '?'); }
      else if (d.zeitalter > max) sperre = `${GEBAEUDE[b.typ].name} Stufe ${d.zeitalter * 2 + 1}`;
      return `<div class="karte-e ${frei ? '' : 'gesperrt'}">
        <img src="${einheitPortrait(d.id, 0)}" alt=""><b>${d.name}</b>
        <small>${LINIEN[d.linie].name} · ${ZEITALTER[d.zeitalter].name}</small>
        <div class="mini-werte"><span title="Lebenspunkte">LP ${zahl(d.hp)}</span><span title="Schaden">SCH ${zahl(d.schaden)}</span><span title="Platz">${icon('platz')}${d.platz}</span></div>
        ${sperre ? `<span class="sperre">${esc(sperre)}</span>` : `<div class="k">${kostenHtml(s, d.kosten)}</div>
        <div class="reihe2"><button class="knopf gruen" data-aus="${d.id}">${icon('uhr')}${dauer(d.zeit * 1000)}</button><button class="knopf gold" data-sofortkauf="${d.id}" title="Sofort kaufen">${icon('blitz')}${zahl(R.sofortKosten(d).gold)}</button></div>`}
      </div>`;
    }).join('');
    const q = s.ausbildung[gid] || [];
    const schlange = q.map((a, i) => {
      const rest = a.bis ? a.bis - this.spiel.jetzt() : EINHEITEN[a.typ].zeit * 1000;
      return `<div class="q-e ${i === 0 ? 'aktiv' : ''}"><img src="${einheitPortrait(a.typ, 0)}" alt=""><small>${i === 0 ? dauer(rest) : ''}</small><button class="x" data-ab="${i}" title="Abbrechen">${icon('x')}</button></div>`;
    }).join('');
    return {
      titel: `${GEBAEUDE[b.typ].name} <span class="stufe">Stufe ${b.stufe}</span>`, klasse: 'breit',
      html: `<div class="leiste-info"><span>${icon('platz')} Platz ${pb}/${pm}</span><span>Warteschlange ${q.length}/${R.AUSBILDUNG_MAX}</span>
        ${q.length && q[0].bis ? `<button class="knopf gold klein2" data-sofortaus>${icon('blitz')} Aktuelle sofort: ${zahl(R.sofortGold(q[0].bis - this.spiel.jetzt(), s))}</button>` : ''}</div>
        ${q.length ? `<div class="schlange">${schlange}</div>` : ''}<div class="raster">${karten}</div>`,
      nach: (el) => {
        el.querySelectorAll('[data-aus]').forEach((k) => k.onclick = () => this.spiel.aktion({ art: 'ausbilden', typ: k.dataset.aus }, () => this.spiel.ton('ausbilden')));
        el.querySelectorAll('[data-sofortkauf]').forEach((k) => k.onclick = () => this.spiel.aktion({ art: 'sofortKaufen', typ: k.dataset.sofortkauf }, () => this.spiel.ton('ausbilden')));
        el.querySelectorAll('[data-ab]').forEach((k) => k.onclick = () => this.spiel.aktion({ art: 'ausbildungAbbrechen', gid, i: +k.dataset.ab }));
        const so = $('[data-sofortaus]', el); if (so) so.onclick = () => this.spiel.aktion({ art: 'sofortAusbildung', gid });
      },
    };
  }

  // Armee
  f_armee() {
    const s = this.spiel.s;
    const gruppen = new Map();
    for (const u of s.einheiten) {
      const k = u.typ + '|' + u.stufe;
      if (!gruppen.has(k)) gruppen.set(k, { typ: u.typ, stufe: u.stufe, liste: [] });
      gruppen.get(k).liste.push(u);
    }
    const sortiert = [...gruppen.values()].sort((a, b) => EINHEITEN[b.typ].zeitalter - EINHEITEN[a.typ].zeitalter || b.stufe - a.stufe || a.typ.localeCompare(b.typ));
    const hatRk = R.fertigeGebaeude(s, 'ruestkammer').length > 0;
    const jetzt = this.spiel.jetzt();
    const zeilen = sortiert.map((g) => {
      const d = EINHEITEN[g.typ], st = STUFEN[g.stufe];
      const gesund = g.liste.filter((u) => !u.verwundet && !u.gesperrt);
      const w = einheitWerte(g.typ, g.stufe);
      const verw = g.liste.filter((u) => u.verwundet);
      const folge = EINHEIT_FOLGE[g.typ];
      return `<div class="armee-z">
        <img src="${einheitPortrait(g.typ, g.stufe)}" alt="">
        <div class="az-text"><b>${d.name}</b> <span class="stufen-name" style="--st:${st.farbe}">${st.sterne ? sterneHtml(Math.min(5, st.sterne), st.farbe) + ' ' : ''}${st.name}${g.stufe ? ' ' + ROEMISCH[g.stufe] : ''}</span>
          <small>LP ${zahl(w.hp)} · Schaden ${zahl(w.schaden)} · ${LINIEN[d.linie].name}</small>
          ${verw.length ? `<small class="verw">${icon('heilen')} ${verw.length} verwundet${verw.map((u) => { const h = s.heilung.find((x) => x.eid === u.id); return h ? ' · ' + dauer(h.bis - jetzt) : ''; }).join('')}</small>` : ''}
        </div>
        <div class="az-anz"><small>Anzahl</small>${g.liste.length}</div>
        <div class="az-knoepfe">
          ${gesund.length >= 2 && g.stufe < 7 ? `<button class="knopf gruen klein2" data-merge="${g.typ}|${g.stufe}">${icon('stern')} Mergen</button>` : ''}
          ${verw.length ? `<button class="knopf gold klein2" data-heil="${verw[0].id}">${icon('blitz')} Heilen ${zahl(R.sofortGold(s.heilung.find((x) => x.eid === verw[0].id)?.bis - jetzt || R.heilDauerVon(s, verw[0]), s) + R.heilKosten(verw[0]))}</button>` : ''}
          ${hatRk && folge && gesund.length ? `<button class="knopf klein2" data-auf="${gesund[0].id}" title="Aufrüsten zu ${EINHEITEN[folge].name}">${icon('pfeilhoch')} ${EINHEITEN[folge].name}</button>` : ''}
          ${gesund.length ? `<button class="knopf rot klein2" data-weg="${gesund[0].id}" title="Eine entlassen">${icon('x')}</button>` : ''}
        </div></div>`;
    }).join('');
    const auf = s.aufruesten ? `<div class="hinweis">${icon('pfeilhoch')} Rüstkammer: ${EINHEITEN[s.aufruesten.ziel].name} in ${dauer(s.aufruesten.bis - jetzt)}</div>` : '';
    let aufInfo = '';
    if (this.aufFrage) {
      const u = s.einheiten.find((x) => x.id === this.aufFrage);
      if (u && EINHEIT_FOLGE[u.typ]) aufInfo = `<div class="frage">Aufrüsten: ${EINHEITEN[u.typ].name} ${STUFEN[u.stufe].name} ${icon('pfeilrechts')} <b>${EINHEITEN[EINHEIT_FOLGE[u.typ]].name}</b> (${dauer(R.aufruestDauer(s, u))})<div class="kostenzeile">${kostenHtml(s, R.aufruestKosten(u))}</div><button class="knopf gruen" data-aufja="${u.id}">Aufrüsten</button> <button class="knopf" data-aufnein>Abbrechen</button></div>`;
    }
    return {
      titel: 'Deine Armee', klasse: 'breit',
      html: `<p class="hinweis">Ziehe im Lager eine Einheit auf eine gleiche Einheit gleicher Stufe, um sie zu mergen – oder nutze den Knopf.</p>
        <div class="leiste-info"><span>${icon('platz')} Platz ${R.platzBelegt(s)}/${R.platzMax(s)}</span><span>${icon('armee')} Stärke ${zahl(this.spiel.macht())}</span></div>${auf}${aufInfo}
        <div class="armee-liste">${zeilen || '<p>Noch keine Einheiten.</p>'}</div>`,
      nach: (el) => {
        el.querySelectorAll('[data-merge]').forEach((k) => k.onclick = () => {
          const [typ, st] = k.dataset.merge.split('|');
          const g = s.einheiten.filter((u) => u.typ === typ && u.stufe === +st && !u.verwundet && !u.gesperrt);
          if (g.length >= 2) this.spiel.mergen(g[0], g[1]);
        });
        el.querySelectorAll('[data-heil]').forEach((k) => k.onclick = () => this.spiel.aktion({ art: 'sofortHeilen', id: +k.dataset.heil }, () => this.spiel.ton('heilen')));
        el.querySelectorAll('[data-weg]').forEach((k) => k.onclick = () => { if (confirm('Diese Einheit wirklich entlassen?')) this.spiel.aktion({ art: 'entlassen', id: +k.dataset.weg }); });
        el.querySelectorAll('[data-auf]').forEach((k) => k.onclick = () => { this.aufFrage = +k.dataset.auf; this.rendereFenster(); });
        const ja = $('[data-aufja]', el); if (ja) ja.onclick = () => { this.spiel.aktion({ art: 'aufruesten', id: +ja.dataset.aufja }, () => this.spiel.ton('bauen')); this.aufFrage = null; };
        const nein = $('[data-aufnein]', el); if (nein) nein.onclick = () => { this.aufFrage = null; this.rendereFenster(); };
      },
    };
  }

  // Forschungsbaum
  f_forschung() {
    const s = this.spiel.s, f = s.forschung, e = R.effekte(s);
    const tempo = R.forschungsTempoVon(s, e);
    // Spalten je Zeitalter, Tiefe innerhalb des Zeitalters
    const tiefe = {};
    const t = (id) => { if (tiefe[id] != null) return tiefe[id]; const x = FORSCHUNG[id]; let d = 0; for (const v of x.vor) if (FORSCHUNG[v].zeitalter === x.zeitalter) d = Math.max(d, t(v) + 1); return (tiefe[id] = d); };
    FORSCHUNG_IDS.forEach(t);
    const SPW = 210, ZH = 74, KW = 180;
    let xBasis = 20; const pos = {}; const spalten = [];
    for (let za = 0; za < ZEITALTER.length; za++) {
      const ids = FORSCHUNG_IDS.filter((id) => FORSCHUNG[id].zeitalter === za);
      const maxT = Math.max(...ids.map((id) => tiefe[id]));
      const zeilen = {};
      for (const id of ids) {
        const d = tiefe[id]; zeilen[d] = (zeilen[d] || 0) + 1;
        const r = zeilen[d] - 1;
        pos[id] = { x: xBasis + d * SPW, y: 50 + r * ZH };
      }
      spalten.push({ za, x: xBasis, w: (maxT + 1) * SPW });
      xBasis += (maxT + 1) * SPW + 30;
    }
    const hoehe = Math.max(...Object.values(pos).map((p) => p.y)) + ZH + 20;
    const bekannt = new Set([...f.fertig, ...f.schlange, f.aktiv]);
    let linien = '';
    for (const id of FORSCHUNG_IDS) for (const v of FORSCHUNG[id].vor) {
      const a = pos[v], b = pos[id];
      const fertig = f.fertig.includes(v);
      linien += `<path d="M${a.x + KW} ${a.y + 26} C${a.x + KW + 30} ${a.y + 26} ${b.x - 30} ${b.y + 26} ${b.x} ${b.y + 26}" class="${fertig ? 'an' : ''}"/>`;
    }
    const knoten = FORSCHUNG_IDS.map((id) => {
      const x = FORSCHUNG[id], p = pos[id];
      let zust = 'gesperrt';
      if (f.fertig.includes(id)) zust = 'fertig';
      else if (f.aktiv === id) zust = 'aktiv';
      else if (f.schlange.includes(id)) zust = 'schlange';
      else if (x.vor.every((v) => bekannt.has(v)) && (id.startsWith('tor_') || x.zeitalter <= R.zeitalter(s))) zust = 'frei';
      const prog = zust === 'aktiv' ? f.fortschritt / x.kosten : 0;
      const sym = (x.eff.einheiten || []).slice(0, 2).map((u) => `<img src="${einheitPortrait(u, 0, 'blau', 40)}" alt="">`).join('') + (x.eff.gebaeude || []).slice(0, 2 - Math.min(2, (x.eff.einheiten || []).length)).map((g) => `<img src="${gebaeudePortrait(g, 1, Math.min(R.zeitalter(s), x.zeitalter))}" alt="">`).join('') + (x.eff.sicht || []).slice(0, 1).map((r) => `<span class="ressym">${icon(r)}</span>`).join('');
      return `<button class="tech ${zust} ${id.startsWith('tor_') ? 'tor' : ''}" style="left:${p.x}px;top:${p.y}px" data-tech="${id}">
        <span class="sym">${sym || icon('forschung')}</span><span class="tn">${esc(x.name)}</span>
        <small>${zust === 'fertig' ? 'Erforscht' : zust === 'aktiv' ? dauer((x.kosten - f.fortschritt) / tempo * 3600000) : zust === 'schlange' ? 'Geplant ' + (f.schlange.indexOf(id) + 1) : dauer(x.kosten / tempo * 3600000)}</small>
        ${zust === 'aktiv' ? `<i class="prog" style="width:${prog * 100}%"></i>` : ''}</button>`;
    }).join('');
    const kopf = spalten.map((sp) => `<div class="za-kopf" style="left:${sp.x}px;width:${sp.w - 30}px;--za:${ZEITALTER[sp.za].farbe}">${ZEITALTER[sp.za].name}</div>`).join('');
    const det = this.techDetail ? this.techDetailHtml(this.techDetail) : '';
    return {
      titel: 'Forschung', klasse: 'voll',
      html: `<div class="leiste-info"><span>${icon('forschung')} ${zahl(tempo)} Wissen/Stunde</span>
        ${f.aktiv ? `<span>Aktuell: <b>${FORSCHUNG[f.aktiv].name}</b> · ${dauer((FORSCHUNG[f.aktiv].kosten - f.fortschritt) / tempo * 3600000)}</span>` : '<span class="warn">Keine Forschung aktiv</span>'}
        <span>Warteschlange ${f.schlange.length}/${R.FORSCHUNG_SCHLANGE}</span></div>
        <div class="baum-scroll"><div class="baum" style="width:${xBasis}px;height:${hoehe}px">${kopf}<svg class="baum-linien" width="${xBasis}" height="${hoehe}">${linien}</svg>${knoten}</div></div>${det}`,
      nach: (el) => {
        const sc = $('.baum-scroll', el);
        if (this.baumScroll == null) { const ziel = pos[f.aktiv || f.schlange[0] || FORSCHUNG_IDS.find((id) => !f.fertig.includes(id))]; if (ziel) sc.scrollLeft = Math.max(0, ziel.x - 120); this.baumScroll = 1; }
        // Ziehen zum Scrollen am PC
        let zieh = null;
        sc.onpointerdown = (e) => { if (e.pointerType === 'mouse') zieh = { x: e.clientX, l: sc.scrollLeft, y: e.clientY, t: sc.scrollTop, bewegt: false }; };
        sc.onpointermove = (e) => { if (zieh) { const dx = e.clientX - zieh.x; if (Math.abs(dx) > 4) zieh.bewegt = true; sc.scrollLeft = zieh.l - dx; sc.scrollTop = zieh.t - (e.clientY - zieh.y); } };
        sc.onpointerup = () => { setTimeout(() => { zieh = null; }, 0); };
        el.querySelectorAll('[data-tech]').forEach((k) => k.onclick = (ev) => { if (zieh && zieh.bewegt) { ev.preventDefault(); return; } this.spiel.ton('klick'); this.techDetail = k.dataset.tech; this.rendereFenster(); });
        const d = $('.tech-detail', el);
        if (d) {
          d.querySelector('[data-schliessen]').onclick = () => { this.techDetail = null; this.rendereFenster(); };
          const fo = d.querySelector('[data-forschen]'); if (fo) fo.onclick = () => this.spiel.aktion({ art: 'forschen', id: this.techDetail }, () => { this.spiel.ton('forschung'); this.techDetail = null; });
          const en = d.querySelector('[data-entfernen]'); if (en) en.onclick = () => this.spiel.aktion({ art: 'forschungEntfernen', id: this.techDetail }, () => { this.techDetail = null; });
        }
      },
    };
  }
  techDetailHtml(id) {
    const s = this.spiel.s, f = s.forschung, x = FORSCHUNG[id];
    const tempo = R.forschungsTempoVon(s);
    const bekannt = new Set([...f.fertig, ...f.schlange, f.aktiv]);
    const fehlend = x.vor.filter((v) => !bekannt.has(v));
    const eff = x.eff;
    const teile = [];
    (eff.einheiten || []).forEach((u) => teile.push(`<div class="frei-e"><img src="${einheitPortrait(u, 0)}" alt=""><span>${EINHEITEN[u].name}</span></div>`));
    (eff.gebaeude || []).forEach((g) => teile.push(`<div class="frei-e"><img src="${gebaeudePortrait(g, 1, Math.min(R.zeitalter(s), x.zeitalter))}" alt=""><span>${GEBAEUDE[g].name}</span></div>`));
    (eff.sicht || []).forEach((r) => teile.push(`<div class="frei-e"><span class="ressym gross">${icon(r)}</span><span>${ROHSTOFFE[r].name}</span></div>`));
    let knopf = '';
    if (f.fertig.includes(id)) knopf = '<p class="ok">Erforscht.</p>';
    else if (f.aktiv === id || f.schlange.includes(id)) knopf = `<button class="knopf rot" data-entfernen>${icon('x')} Aus der Warteschlange nehmen</button>`;
    else if (fehlend.length) knopf = `<p class="sperre">Zuerst: ${fehlend.map((v) => FORSCHUNG[v].name).join(', ')}</p>`;
    else if (!id.startsWith('tor_') && x.zeitalter > R.zeitalter(s)) knopf = `<p class="sperre">Bring dein Zentrum zuerst ins ${ZEITALTER[x.zeitalter].name}.</p>`;
    else knopf = `<button class="knopf gross gruen" data-forschen>${icon('forschung')} ${f.aktiv ? 'Einreihen' : 'Erforschen'} (${dauer(x.kosten / tempo * 3600000)})</button>`;
    return `<div class="tech-detail"><button class="knopf zu klein" data-schliessen>${icon('x')}</button><h3>${esc(x.name)}</h3><small>${ZEITALTER[x.zeitalter].name} · ${zahl(x.kosten)} Wissen</small><p>${esc(x.text)}</p><div class="frei-liste">${teile.join('')}</div>${knopf}</div>`;
  }

  f_rohstoffe() {
    const s = this.spiel.s, e = R.effekte(s), rm = R.rohstoffMax(s);
    const z = ROHSTOFF_IDS.map((r) => {
      const d = ROHSTOFFE[r], bek = e.sicht.has(r);
      return `<div class="res-z ${bek ? '' : 'gesperrt'}"><span class="ressym gross">${icon(r)}</span><b>${d.name}</b><span>${zahl(s.res[r])} / ${zahl(rm)}</span><small>${bek ? ZEITALTER[d.zeitalter].name : 'Noch unbekannt'}</small></div>`;
    }).join('');
    return { titel: 'Strategische Rohstoffe', html: `<p class="hinweis">Rohstoffe holen deine Handwerker von Feldern auf der Karte. Mehr Platz bringt das Rohstofflager.</p><div class="res-liste">${z}</div>` };
  }

  f_meldungen() {
    const s = this.spiel.s;
    const m = [...(s.meldungen || [])].reverse();
    const html = m.length ? m.map((x) => `<div class="meldung ${x.art}"><small>${new Date(x.t).toLocaleString('de-DE', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}</small> ${esc(x.text)}</div>`).join('') : '<p>Keine neuen Meldungen.</p>';
    return { titel: 'Meldungen', html: html + (m.length ? '<button class="knopf" data-gelesen>Alle gelesen</button>' : ''), nach: (el) => { const g = $('[data-gelesen]', el); if (g) g.onclick = () => this.spiel.aktion({ art: 'meldungenGelesen' }, () => this.schliessen()); } };
  }

  f_einstellungen() {
    const sp = this.spiel;
    return {
      titel: 'Einstellungen',
      html: `<div class="einst"><label class="schalter"><input type="checkbox" data-ton ${sp.tonAn ? 'checked' : ''}><span></span> Soundeffekte</label>
        <label class="schalter"><input type="checkbox" data-musik ${sp.musikAn ? 'checked' : ''}><span></span> Musik</label>
        <p>Angemeldet als <b>${esc(sp.name || '')}</b> · Lager „${esc(sp.s.name)}“</p>
        <button class="knopf" data-tut>Anleitung nochmal ansehen</button>
        <button class="knopf rot" data-ab>Abmelden</button>
        <p class="klein">Zeitenlager von Leif Schmale · Kontakt: leifps@icloud.com</p></div>`,
      nach: (el) => {
        $('[data-ton]', el).onchange = (e) => sp.setzeTon(e.target.checked);
        $('[data-musik]', el).onchange = (e) => sp.setzeMusik(e.target.checked);
        $('[data-ab]', el).onclick = () => sp.abmelden();
        $('[data-tut]', el).onclick = () => { this.schliessen(); sp.tutorialNeu(); };
      },
    };
  }

  // Einheit angetippt: kleine Info
  zeigeEinheit(u) {
    const d = EINHEITEN[u.typ], st = STUFEN[u.stufe], w = einheitWerte(u.typ, u.stufe);
    this.auswahl.innerHTML = `<div class="titel"><img class="mini-p" src="${einheitPortrait(u.typ, u.stufe, 'blau', 40)}" alt="">${d.name} <span class="stufen-name" style="--st:${st.farbe}">${st.name}${u.stufe ? ' ' + ROEMISCH[u.stufe] : ''}</span></div>
      <div class="reihe klein">LP ${zahl(w.hp)} · Schaden ${zahl(w.schaden)} · ${LINIEN[d.linie].name}${u.verwundet ? ' · <b class="verw">verwundet</b>' : ''}</div>
      <div class="reihe klein hint">Ziehe sie auf eine gleiche Einheit, um zu mergen.</div>`;
    this.auswahl.hidden = false; this.auswahl.onclick = null; this.ausgewaehlt = null;
  }
}
