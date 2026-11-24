// Selbst gezeichnete Symbole als SVG (keine Emojis).
import { ROHSTOFFE } from '../shared/daten.js';

const R = '#2a1d12'; // Umrandung
const S = (inner, vb = 24) => `<svg class="ic" viewBox="0 0 ${vb} ${vb}" aria-hidden="true">${inner}</svg>`;

const ICONS = {
  gold: S(`<defs><radialGradient id="gG" cx=".35" cy=".3"><stop offset="0" stop-color="#fff6b0"/><stop offset=".5" stop-color="#ffcf3a"/><stop offset="1" stop-color="#d48a0e"/></radialGradient></defs>
    <circle cx="12" cy="12" r="9.5" fill="url(#gG)" stroke="${R}" stroke-width="1.6"/><circle cx="12" cy="12" r="6.3" fill="none" stroke="#b9720c" stroke-width="1.3"/><path d="M12 8.2l1.2 2.5 2.7.4-2 1.9.5 2.7-2.4-1.3-2.4 1.3.5-2.7-2-1.9 2.7-.4z" fill="#fff3b0" stroke="#9a5d08" stroke-width="1" stroke-linejoin="round"/>`),
  forschung: S(`<path d="M9 3h6M10 3v6l-5 9a2 2 0 002 3h10a2 2 0 002-3l-5-9V3" fill="#bfe8ff" stroke="${R}" stroke-width="1.6" stroke-linejoin="round"/><path d="M7.4 15h9.2l1.6 3a1 1 0 01-.9 1.5H6.7A1 1 0 015.8 18z" fill="#58d68d"/><circle cx="11" cy="17" r="1" fill="#fff"/><circle cx="13.5" cy="15.8" r=".7" fill="#fff"/>`),
  bauen: S(`<path d="M4 20l9-9" stroke="#8a5a2b" stroke-width="3.2" stroke-linecap="round"/><path d="M4 20l9-9" stroke="${R}" stroke-width="1" stroke-linecap="round" opacity=".4"/><path d="M11 6l3-3 7 7-3 3z" fill="#aab4bf" stroke="${R}" stroke-width="1.5" stroke-linejoin="round"/><path d="M12.5 7.5l4 4" stroke="#fff" stroke-width="1" opacity=".6"/>`),
  armee: S(`<path d="M5 19L17 5l2 .1-.1 2L5 19" fill="#dfe6ee" stroke="${R}" stroke-width="1.4"/><path d="M19 19L7 5 5 5.1l.1 2L19 19" fill="#dfe6ee" stroke="${R}" stroke-width="1.4"/><path d="M3.5 16.5l4 4M20.5 16.5l-4 4" stroke="#8a5a2b" stroke-width="2.6" stroke-linecap="round"/>`),
  karte: S(`<path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2z" fill="#f3e3b5" stroke="${R}" stroke-width="1.5" stroke-linejoin="round"/><path d="M9 4v14M15 6v14" stroke="${R}" stroke-width="1" opacity=".5"/><path d="M6 13c2-3 4 1 6-2s3 0 5-2" stroke="#d0453a" stroke-width="1.5" fill="none" stroke-dasharray="1.6 1.4"/><circle cx="17" cy="9" r="1.6" fill="#d0453a"/>`),
  angriff: S(`<path d="M12 2l2.5 5 5.5.8-4 3.9.9 5.5L12 14.6 7.1 17.2 8 11.7 4 7.8l5.5-.8z" fill="#ff6b4a" stroke="${R}" stroke-width="1.5" stroke-linejoin="round"/><path d="M6 21l12 0" stroke="${R}" stroke-width="1.5" stroke-linecap="round"/>`),
  ruhm: S(`<path d="M7 3h10v4a5 5 0 01-10 0z" fill="#ffcf3a" stroke="${R}" stroke-width="1.5"/><path d="M7 5H4a3 3 0 003 4M17 5h3a3 3 0 01-3 4" fill="none" stroke="${R}" stroke-width="1.5"/><path d="M10 12h4l.5 4h-5z" fill="#d99a1c" stroke="${R}" stroke-width="1.3"/><rect x="7.5" y="16" width="9" height="4" rx="1" fill="#8a5a2b" stroke="${R}" stroke-width="1.3"/>`),
  schild: S(`<path d="M12 2l8 3v6c0 5-3.5 9-8 11-4.5-2-8-6-8-11V5z" fill="#5fa8ff" stroke="${R}" stroke-width="1.6" stroke-linejoin="round"/><path d="M12 4.3v15.5c3.3-1.8 6-5 6-8.8V6.4z" fill="#3b7fd6"/>`),
  uhr: S(`<circle cx="12" cy="12" r="9" fill="#fff" stroke="${R}" stroke-width="1.6"/><path d="M12 6.5V12l3.5 2.2" stroke="${R}" stroke-width="1.8" stroke-linecap="round" fill="none"/>`),
  platz: S(`<circle cx="8" cy="8" r="3" fill="#ffd9b3" stroke="${R}" stroke-width="1.3"/><path d="M3 19a5 5 0 0110 0z" fill="#5fa8ff" stroke="${R}" stroke-width="1.3"/><circle cx="16" cy="9" r="3" fill="#ffd9b3" stroke="${R}" stroke-width="1.3"/><path d="M11 20a5 5 0 0110 0z" fill="#ff7a5c" stroke="${R}" stroke-width="1.3"/>`),
  stern: S(`<path d="M12 2.5l2.8 5.8 6.3.9-4.6 4.4 1.1 6.3L12 17l-5.6 2.9 1.1-6.3-4.6-4.4 6.3-.9z" fill="#ffd23f" stroke="${R}" stroke-width="1.4" stroke-linejoin="round"/>`),
  zahnrad: S(`<path d="M12 8.5a3.5 3.5 0 110 7 3.5 3.5 0 010-7z" fill="none" stroke="${R}" stroke-width="1.6"/><path d="M10.5 2h3l.5 2.6 2 .9 2.2-1.5 2.1 2.1-1.5 2.2.9 2 2.6.5v3l-2.6.5-.9 2 1.5 2.2-2.1 2.1-2.2-1.5-2 .9-.5 2.6h-3l-.5-2.6-2-.9-2.2 1.5-2.1-2.1 1.5-2.2-.9-2L2 13.5v-3l2.6-.5.9-2L4 5.8l2.1-2.1 2.2 1.5 2-.9z" fill="#c9d1da" stroke="${R}" stroke-width="1.3" stroke-linejoin="round"/><circle cx="12" cy="12" r="3" fill="#7d8894"/>`),
  liste: S(`<rect x="4" y="3" width="16" height="18" rx="2" fill="#f3e3b5" stroke="${R}" stroke-width="1.5"/><path d="M8 8h8M8 12h8M8 16h5" stroke="${R}" stroke-width="1.6" stroke-linecap="round"/>`),
  handwerker: S(`<circle cx="12" cy="7" r="3.3" fill="#ffd9b3" stroke="${R}" stroke-width="1.4"/><path d="M8 5.5a4 4 0 018 0z" fill="#f2b632" stroke="${R}" stroke-width="1.2"/><path d="M6 21a6 6 0 0112 0z" fill="#8a5a2b" stroke="${R}" stroke-width="1.4"/><path d="M15 13l5 5" stroke="#aab4bf" stroke-width="2.4" stroke-linecap="round"/>`),
  auge: S(`<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z" fill="#fff" stroke="${R}" stroke-width="1.5"/><circle cx="12" cy="12" r="3.6" fill="#3b7fd6" stroke="${R}" stroke-width="1.2"/><circle cx="13" cy="11" r="1" fill="#fff"/>`),
  heilen: S(`<rect x="3" y="3" width="18" height="18" rx="5" fill="#fff" stroke="${R}" stroke-width="1.5"/><path d="M12 7v10M7 12h10" stroke="#3ccf7a" stroke-width="3.4" stroke-linecap="round"/>`),
  verschieben: S(`<path d="M12 2l3 3h-2v6h6V9l3 3-3 3v-2h-6v6h2l-3 3-3-3h2v-6H5v2l-3-3 3-3v2h6V5H9z" fill="#fff" stroke="${R}" stroke-width="1.2" stroke-linejoin="round"/>`),
  pfeilhoch: S(`<path d="M12 3l7 8h-4v9H9v-9H5z" fill="#58d68d" stroke="${R}" stroke-width="1.5" stroke-linejoin="round"/>`),
  blitz: S(`<path d="M13 2L5 13h6l-1 9 8-12h-6z" fill="#ffd23f" stroke="${R}" stroke-width="1.4" stroke-linejoin="round"/>`),
  x: S(`<path d="M6 6l12 12M18 6L6 18" stroke="${R}" stroke-width="3.4" stroke-linecap="round"/><path d="M6 6l12 12M18 6L6 18" stroke="#ff6b5c" stroke-width="1.8" stroke-linecap="round"/>`),
  haken: S(`<path d="M5 12.5l4.5 4.5L19 7.5" stroke="${R}" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round" fill="none"/><path d="M5 12.5l4.5 4.5L19 7.5" stroke="#5be38c" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`),
  ton: S(`<path d="M4 9h4l5-4v14l-5-4H4z" fill="#fff" stroke="${R}" stroke-width="1.5" stroke-linejoin="round"/><path d="M16 8.5a5 5 0 010 7M18.5 6a8.5 8.5 0 010 12" stroke="${R}" stroke-width="1.6" fill="none" stroke-linecap="round"/>`),
  buch: S(`<path d="M3 5c3-1.5 6-1.5 9 0v15c-3-1.5-6-1.5-9 0z" fill="#fff" stroke="${R}" stroke-width="1.4" stroke-linejoin="round"/><path d="M21 5c-3-1.5-6-1.5-9 0v15c3-1.5 6-1.5 9 0z" fill="#f3e3b5" stroke="${R}" stroke-width="1.4" stroke-linejoin="round"/>`),
  kundschafter: S(`<circle cx="10" cy="10" r="6" fill="#bfe8ff" stroke="${R}" stroke-width="1.6"/><path d="M14.5 14.5l6 6" stroke="#8a5a2b" stroke-width="3" stroke-linecap="round"/><path d="M7.5 8.5a3 3 0 013-2" stroke="#fff" stroke-width="1.4" fill="none" stroke-linecap="round"/>`),
};

// Rohstoff-Symbole: jede Sorte eigene Form
const FORM = {
  kupfer: (f) => `<path d="M4 15l4-9h8l4 9-8 5z" fill="${f}" stroke="${R}" stroke-width="1.5" stroke-linejoin="round"/><path d="M8 6l4 4 4-4M12 10v10" stroke="#fff" stroke-width="1" opacity=".5" fill="none"/>`,
  pferde: (f) => `<path d="M7 21v-5c-2-1-3-4-1-7l4-6 2 2 3-1 1 4 3 3-2 2-3-1-1 3v6z" fill="${f}" stroke="${R}" stroke-width="1.4" stroke-linejoin="round"/><circle cx="13.5" cy="7.5" r=".9" fill="${R}"/>`,
  eisen: (f) => `<path d="M3 15l5-3h11l2 3-5 3H5z" fill="${f}" stroke="${R}" stroke-width="1.4" stroke-linejoin="round"/><path d="M5 12l5-3h9l2 3" fill="#b9c3cd" stroke="${R}" stroke-width="1.4" stroke-linejoin="round"/>`,
  salpeter: (f) => `<path d="M5 20h14l-2-10H7z" fill="#c69c6d" stroke="${R}" stroke-width="1.4" stroke-linejoin="round"/><path d="M6 10c2-3 10-3 12 0" fill="${f}" stroke="${R}" stroke-width="1.4"/><path d="M8 6l2 2M14 5l1 2" stroke="${f}" stroke-width="1.6" stroke-linecap="round"/>`,
  kohle: (f) => `<path d="M3 17l3-6 5-2 4 2 5-1 1 6-6 4H8z" fill="${f}" stroke="#000" stroke-width="1.4" stroke-linejoin="round"/><path d="M8 12l3 2 4-2" stroke="#777" stroke-width="1" fill="none"/>`,
  oel: (f) => `<path d="M12 3c3 5 6 8 6 12a6 6 0 01-12 0c0-4 3-7 6-12z" fill="${f}" stroke="#000" stroke-width="1.4"/><path d="M9.5 14a2.5 2.5 0 002 3" stroke="#fff" stroke-width="1.3" fill="none" opacity=".7" stroke-linecap="round"/>`,
  aluminium: (f) => `<rect x="4" y="8" width="16" height="9" rx="1.5" fill="${f}" stroke="${R}" stroke-width="1.4"/><path d="M4 11h16" stroke="#fff" stroke-width="1.2"/><path d="M6 15h6" stroke="#8a96a3" stroke-width="1.2"/>`,
  uran: (f) => `<path d="M12 3l7 4v10l-7 4-7-4V7z" fill="${f}" stroke="${R}" stroke-width="1.4" stroke-linejoin="round"/><circle cx="12" cy="12" r="2" fill="${R}"/><path d="M12 9.5V6M14.2 13.3l3 1.7M9.8 13.3l-3 1.7" stroke="${R}" stroke-width="1.8"/>`,
  erden: (f) => `<path d="M12 2l6 6-6 14L6 8z" fill="${f}" stroke="${R}" stroke-width="1.4" stroke-linejoin="round"/><path d="M6 8h12M12 2v20" stroke="#fff" stroke-width="1" opacity=".55"/>`,
  silizium: (f) => `<rect x="6" y="6" width="12" height="12" rx="1.5" fill="${f}" stroke="${R}" stroke-width="1.4"/><rect x="9.5" y="9.5" width="5" height="5" fill="#bcc6ff"/><path d="M9 2v4M15 2v4M9 18v4M15 18v4M2 9h4M2 15h4M18 9h4M18 15h4" stroke="${R}" stroke-width="1.4"/>`,
  nanofasern: (f) => `<path d="M3 12c3-6 6 6 9 0s6 6 9 0" stroke="${R}" stroke-width="4" fill="none" stroke-linecap="round"/><path d="M3 12c3-6 6 6 9 0s6 6 9 0" stroke="${f}" stroke-width="2.2" fill="none" stroke-linecap="round"/><circle cx="12" cy="12" r="1.5" fill="#fff"/>`,
  helium3: (f) => `<circle cx="12" cy="12" r="8" fill="${f}" stroke="${R}" stroke-width="1.4"/><ellipse cx="12" cy="12" rx="10.5" ry="3.5" fill="none" stroke="${R}" stroke-width="1.3" transform="rotate(-25 12 12)"/><circle cx="9.5" cy="9.5" r="2" fill="#fff" opacity=".7"/>`,
};

export function icon(name) {
  if (ICONS[name]) return ICONS[name];
  if (ROHSTOFFE[name]) return S(FORM[name](ROHSTOFFE[name].farbe));
  return '';
}

// Für Canvas: SVG als Bild
const bilder = {};
export function iconBild(name) {
  if (bilder[name]) return bilder[name];
  const img = new Image();
  img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(icon(name).replace('<svg class="ic"', '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48"'));
  bilder[name] = img;
  return img;
}
