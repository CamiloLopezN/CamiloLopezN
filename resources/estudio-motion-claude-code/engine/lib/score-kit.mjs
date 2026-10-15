// Score synthesized in code for any timeline (course §09: «Score and SFX are synthesized in code unless a track is
// supplied»). Same instruments as the score of the Lumia film that passed the critique (kick, clap, hats, bass, pluck
// arpeggio, risers, chord stab), arranged by sections so the music follows the film: a hook that builds, a full
// groove, tension under a countdown, a hit on each reveal and a chord to close. Deterministic (seeded noise).
//
//   renderScore({bpm: 120, dur: 48, sections: [{t0: 0, t1: 2.5, kind: 'hook'}, {t0: 2.5, t1: 9, kind: 'groove'},
//                {t0: 9, t1: 14, kind: 'tension'}, {t0: 14, kind: 'hit'}, …, {t0: 45, t1: 48, kind: 'outro'}],
//                key: 'Am'}, 'out/score.wav')
import fs from 'node:fs';
import path from 'node:path';

const SR = 48000;
const KEYS = {                                  // chords per bar (MIDI), roots for the bass
  Am: { chords: [[57, 60, 64, 71], [53, 57, 60, 67], [48, 52, 55, 62], [55, 59, 62, 69]], roots: [45, 41, 48, 43] },
  Em: { chords: [[52, 55, 59, 66], [48, 52, 55, 62], [55, 59, 62, 69], [50, 54, 57, 64]], roots: [40, 36, 43, 38] },
  C: { chords: [[48, 52, 55, 62], [55, 59, 62, 69], [57, 60, 64, 71], [53, 57, 60, 67]], roots: [48, 43, 45, 41] },
};

export function renderScore({ bpm = 120, dur, sections, key = 'Am', seed = 7, gain = 1 }, out) {
  const BEAT = 60 / bpm, BAR = 4 * BEAT, N = Math.ceil((dur + 2) * SR);
  const L = new Float32Array(N), R = new Float32Array(N);
  let s = seed; const noise = () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296 * 2 - 1;
  const hz = (m) => 440 * 2 ** ((m - 69) / 12);
  const add = (t0, len, fn, g = 1, pan = 0) => {
    const i0 = Math.floor(t0 * SR), n = Math.floor(len * SR), gl = g * gain * Math.min(1, 1 - pan), gr = g * gain * Math.min(1, 1 + pan);
    for (let i = 0; i < n && i0 + i < N; i++) { if (i0 + i < 0) continue; const v = fn(i / SR, i); L[i0 + i] += v * gl; R[i0 + i] += v * gr; }
  };
  const saw = (f, t) => 2 * ((f * t) % 1) - 1;
  const K = KEYS[key] ?? KEYS.Am;
  const bar = (t) => Math.floor(t / BAR + 1e-6) % 4;

  const kick = (t0, g = 1) => { let ph = 0; add(t0, 0.45, (t) => { const f = 45 + 110 * Math.exp(-t * 28); ph += f / SR; return Math.sin(2 * Math.PI * ph) * Math.exp(-t * 7.5); }, 0.9 * g); };
  const clap = (t0) => { let a = 0, b = 0; add(t0, 0.22, (t) => { const n = noise(); a += 0.25 * (n - a); b += 0.05 * (a - b); const env = Math.exp(-t * 22) + 0.5 * Math.exp(-((t - 0.012) ** 2) / 0.00002); return (a - b) * env * 2.2; }, 0.45); };
  const hat = (t0, open = false, g = 1) => { let lp = 0; add(t0, open ? 0.3 : 0.06, (t) => { const n = noise(); lp += 0.5 * (n - lp); return (n - lp) * Math.exp(-t * (open ? 9 : 70)); }, 0.16 * g, (t0 * 4) % 2 ? 0.35 : -0.35); };
  const bass = (t0, m, len = 0.24, g = 1) => { const f = hz(m - 12); let lp = 0; add(t0, len, (t) => { const v = saw(f, t) * 0.6 + Math.sin(2 * Math.PI * f * t); lp += 0.08 * (v - lp); return lp * Math.min(1, t * 200) * Math.exp(-t * 3); }, 0.55 * g); };
  const pluck = (t0, m, g = 0.18, pan = 0) => { const f = hz(m); let lp = 0; add(t0, 0.35, (t) => { const v = saw(f, t) + 0.5 * saw(f * 1.005, t); lp += (0.05 + 0.4 * Math.exp(-t * 18)) * (v - lp); return lp * Math.exp(-t * 9); }, g, pan); };
  const padNote = (t0, m, len, pan) => { const f = hz(m); let lp = 0; add(t0, len, (t) => { const v = saw(f, t) + saw(f * 1.004, t) * 0.7 + saw(f * 0.996, t) * 0.7; lp += (0.03 + 0.2 * Math.exp(-t * 6)) * (v - lp); return lp * Math.exp(-t * 1.6) * Math.min(1, t * 120); }, 0.12, pan); };
  const stab = (t0, notes, len = 2) => notes.forEach((m, k) => padNote(t0 + k * 0.012, m, len, k % 2 ? 0.3 : -0.3));
  const riser = (t0, len) => { let lp = 0; add(t0, len, (t) => { const x = t / len, n = noise(); lp += (0.01 + 0.5 * x * x) * (n - lp); return lp * x * x * 1.6 + Math.sin(2 * Math.PI * (200 + 900 * x * x) * t) * 0.08 * x; }, 0.5); };
  const drone = (t0, len, m) => { const f = hz(m - 12); add(t0, len, (t) => (Math.sin(2 * Math.PI * f * t) + 0.3 * Math.sin(2 * Math.PI * f * 2 * t)) * Math.min(1, t * 4) * Math.min(1, (len - t) * 6), 0.22); };

  const grid = (t0, t1, step) => { const out = []; for (let t = Math.ceil(t0 / step - 1e-6) * step; t < t1 - 1e-6; t += step) out.push(t); return out; };
  for (const sec of sections) {
    const t0 = sec.t0, t1 = sec.t1 ?? sec.t0 + BAR;
    switch (sec.kind) {
      case 'hook':
        drone(t0, t1 - t0, K.roots[0]);
        for (const t of sec.hits ?? grid(t0, t1, BEAT)) kick(t, 0.9);
        riser(Math.max(t0, t1 - 1.2), Math.min(1.2, t1 - t0));
        break;
      case 'groove':
        for (const t of grid(t0, t1, BEAT / 2)) {
          const b = Math.round(t / (BEAT / 2));
          if (b % 2 === 0) kick(t);
          if (b % 4 === 2) clap(t);
          hat(t + BEAT / 4, b % 8 === 7);
          bass(t, K.roots[bar(t)] + (b % 4 === 3 ? 12 : 0));
        }
        grid(t0, t1, BEAT / 4).forEach((t) => { const k = Math.round(t / (BEAT / 4)), a = K.chords[bar(t)]; pluck(t, a[[0, 1, 2, 3, 2, 1][k % 6]] + 12, 0.1, k % 2 ? 0.45 : -0.45); });
        break;
      case 'tension':                           // under a countdown: no melody, ticking hats, pulsing bass, a riser into the hit
        for (const t of grid(t0, t1, BEAT / 4)) hat(t, false, 0.8);
        for (const t of grid(t0, t1, BEAT)) { kick(t, 0.55); bass(t, K.roots[0], 0.18, 0.8); }
        riser(Math.max(t0, t1 - 1.0), Math.min(1.0, t1 - t0));
        break;
      case 'hit':                               // the reveal
        kick(t0, 1.2); clap(t0); stab(t0, K.chords[bar(t0)].map((m) => m + 12), 1.4); bass(t0, K.roots[bar(t0)], 0.6);
        break;
      case 'outro':
        kick(t0, 1.1); stab(t0, [45, 57, 64, 69, 71, 76].map((m) => m - 45 + K.roots[0]), Math.max(2, t1 - t0)); bass(t0, K.roots[0], Math.max(1.5, t1 - t0 - 0.2));
        break;
      default: break;
    }
  }
  // short cross echo for air, ceiling at −3 dBFS
  const d = Math.floor(0.375 * SR);
  for (let i = d; i < N; i++) { L[i] += R[i - d] * 0.18; R[i] += L[i - d] * 0.18; }
  let peak = 0; for (let i = 0; i < N; i++) peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
  const k = 0.7 / (peak || 1), n = Math.ceil(dur * SR);
  const b = Buffer.alloc(44 + n * 4);
  b.write('RIFF', 0); b.writeUInt32LE(36 + n * 4, 4); b.write('WAVEfmt ', 8);
  b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(2, 22); b.writeUInt32LE(SR, 24);
  b.writeUInt32LE(SR * 4, 28); b.writeUInt16LE(4, 32); b.writeUInt16LE(16, 34); b.write('data', 36); b.writeUInt32LE(n * 4, 40);
  for (let i = 0; i < n; i++) {
    const fade = Math.min(1, (n - i) / (SR * 0.05));
    b.writeInt16LE(Math.round(Math.max(-1, Math.min(1, L[i] * k * fade)) * 32767), 44 + i * 4);
    b.writeInt16LE(Math.round(Math.max(-1, Math.min(1, R[i] * k * fade)) * 32767), 46 + i * 4);
  }
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, b);
  return out;
}
