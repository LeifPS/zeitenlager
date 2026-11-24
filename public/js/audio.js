// Soundeffekte, im Browser erzeugt (Web Audio). Die Lautstärke des Hubs greift automatisch (lgh-vorlade.js).
// Musik: Dateien in /musik/ (z. B. lager.mp3 von Suno); fehlt die Datei, bleibt es still.
let ctx = null, master = null;
function ac() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null;
    ctx = new AC(); master = ctx.createGain(); master.gain.value = 0.5; master.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}
function ton(freq, dauer, { typ = 'sine', vol = 0.3, start = 0, gleit = 0, attack = 0.005 } = {}) {
  const c = ac(); if (!c) return;
  const t = c.currentTime + start;
  const o = c.createOscillator(), g = c.createGain();
  o.type = typ; o.frequency.setValueAtTime(freq, t);
  if (gleit) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq * gleit), t + dauer);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + attack); g.gain.exponentialRampToValueAtTime(0.0001, t + dauer);
  o.connect(g); g.connect(master); o.start(t); o.stop(t + dauer + 0.02);
}
function rauschen(dauer, { vol = 0.3, start = 0, filter = 1200, q = 1, typ = 'bandpass', gleit = 0 } = {}) {
  const c = ac(); if (!c) return;
  const t = c.currentTime + start;
  const n = Math.floor(c.sampleRate * dauer), buf = c.createBuffer(1, n, c.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
  const src = c.createBufferSource(); src.buffer = buf;
  const f = c.createBiquadFilter(); f.type = typ; f.frequency.setValueAtTime(filter, t); f.Q.value = q;
  if (gleit) f.frequency.exponentialRampToValueAtTime(filter * gleit, t + dauer);
  const g = c.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dauer);
  src.connect(f); f.connect(g); g.connect(master); src.start(t);
}

const SFX = {
  klick: () => { ton(820, 0.05, { typ: 'triangle', vol: 0.12 }); },
  gold: () => { [1320, 1760, 2093].forEach((f, i) => ton(f, 0.12, { typ: 'square', vol: 0.06, start: i * 0.05 })); ton(2637, 0.25, { typ: 'sine', vol: 0.08, start: 0.15 }); },
  bauen: () => { for (let i = 0; i < 3; i++) { rauschen(0.08, { vol: 0.35, start: i * 0.16, filter: 900, q: 3 }); ton(180, 0.08, { typ: 'square', vol: 0.12, start: i * 0.16, gleit: 0.5 }); } },
  fertig: () => { [523, 659, 784, 1047].forEach((f, i) => ton(f, 0.18, { typ: 'triangle', vol: 0.14, start: i * 0.07 })); },
  merge: () => { [392, 523, 659, 784, 1047, 1319].forEach((f, i) => ton(f, 0.2, { typ: 'triangle', vol: 0.12, start: i * 0.045 })); rauschen(0.5, { vol: 0.12, filter: 6000, typ: 'highpass', start: 0.2 }); ton(1568, 0.5, { vol: 0.1, start: 0.3 }); },
  ausbilden: () => { ton(110, 0.15, { typ: 'sine', vol: 0.4, gleit: 0.5 }); rauschen(0.06, { vol: 0.2, filter: 3000, start: 0.12 }); ton(110, 0.15, { typ: 'sine', vol: 0.3, start: 0.2, gleit: 0.5 }); },
  forschung: () => { [880, 1108, 1318, 1760].forEach((f, i) => ton(f, 0.6, { vol: 0.07, start: i * 0.09 })); },
  fehler: () => { ton(180, 0.18, { typ: 'sawtooth', vol: 0.1 }); ton(140, 0.22, { typ: 'sawtooth', vol: 0.1, start: 0.1 }); },
  heilen: () => { [660, 880, 990].forEach((f, i) => ton(f, 0.3, { vol: 0.08, start: i * 0.08, gleit: 1.02 })); },
  karte: () => { rauschen(0.3, { vol: 0.15, filter: 2500, q: 0.7, gleit: 0.5 }); },
  schwert: () => { rauschen(0.12, { vol: 0.12, filter: 4500, q: 4, gleit: 0.6 }); ton(1900, 0.08, { typ: 'square', vol: 0.03 }); },
  pfeil: () => { rauschen(0.15, { vol: 0.08, filter: 2500, q: 8, gleit: 2 }); },
  schuss: () => { rauschen(0.18, { vol: 0.25, filter: 900, q: 0.8, gleit: 0.4 }); ton(90, 0.15, { typ: 'square', vol: 0.12, gleit: 0.5 }); },
  laser: () => { ton(1800, 0.18, { typ: 'sawtooth', vol: 0.05, gleit: 0.3 }); },
  explosion: () => { rauschen(0.7, { vol: 0.4, filter: 500, q: 0.6, typ: 'lowpass', gleit: 0.3 }); ton(60, 0.5, { vol: 0.3, gleit: 0.4 }); },
  einsturz: () => { rauschen(0.9, { vol: 0.35, filter: 300, typ: 'lowpass', gleit: 0.5 }); },
  sieg: () => { [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => ton(f, i === 6 ? 0.8 : 0.18, { typ: 'triangle', vol: 0.14, start: i * 0.12 })); },
  niederlage: () => { [392, 349, 311, 262].forEach((f, i) => ton(f, 0.35, { typ: 'triangle', vol: 0.13, start: i * 0.22 })); },
  horn: () => { ton(196, 0.9, { typ: 'sawtooth', vol: 0.08, attack: 0.15 }); ton(294, 0.7, { typ: 'sawtooth', vol: 0.05, start: 0.3, attack: 0.1 }); },
};

export const Audio = {
  an: true,
  spiele(name) { if (!this.an) return; try { SFX[name] && SFX[name](); } catch { } },
  entsperren() { ac(); },
  musik: null, musikAn: false,
  musikStart(datei = 'musik/lager.mp3') {
    if (!this.musikAn) return;
    if (!this.musik) { this.musik = new window.Audio(datei); this.musik.loop = true; this.musik.volume = 0.35; this.musik.onerror = () => { this.musik = null; }; }
    this.musik.play().catch(() => { });
  },
  musikStopp() { if (this.musik) this.musik.pause(); },
};
