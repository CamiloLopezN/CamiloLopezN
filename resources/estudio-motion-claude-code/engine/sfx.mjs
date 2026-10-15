// Native Scope effects on the film timeline: synthesized cues or supplied library samples.
// node sfx.mjs cues.json out/sfx.wav
import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
const SR = 48000, cues = JSON.parse(readFileSync(process.argv[2], 'utf8'));
if (!Array.isArray(cues) || cues.some(c => !Number.isFinite(c.t) || c.t < 0 || !Number.isFinite(c.gain ?? 0.8))) {
  throw new Error('Cues must have finite, nonnegative times and finite gains');
}
const samples = new Map();
for (const c of cues.filter(c => c.file)) {
  const file = path.resolve(c.file);
  if (!samples.has(file)) {
    const pcm = execFileSync('ffmpeg', ['-v', 'error', '-i', file, '-map', '0:a:0', '-ac', '1', '-ar', String(SR), '-f', 'f32le', '-'], {maxBuffer: 64 * 1024 * 1024});
    const data = new Float32Array(pcm.length / 4);
    for (let i = 0; i < data.length; i++) data[i] = pcm.readFloatLE(i * 4);
    samples.set(file, data);
  }
}
const last = Math.max(1, ...cues.map(c => c.t + (c.file ? samples.get(path.resolve(c.file)).length / SR : 1.2)));
const buf = new Float32Array(Math.ceil(last * SR));

let s = 42; const noise = () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296 * 2 - 1;
const VOICES = {
  click:  [0.05, t => Math.sin(2 * Math.PI * 1800 * t) * Math.exp(-t * 90)],
  pop:    [0.15, t => Math.sin(2 * Math.PI * (600 + 900 * t) * t) * Math.exp(-t * 30)],
  thump:  [0.50, t => Math.sin(2 * Math.PI * (90 - 60 * t) * t) * Math.exp(-t * 8)],
  whoosh: [0.35, t => noise() * Math.sin(Math.PI * Math.min(1, t / 0.35)) * 0.5],
  tick:   [0.04, t => Math.sin(2 * Math.PI * 2600 * t) * Math.exp(-t * 140) * 0.6],
  chime:  [1.20, t => (Math.sin(2 * Math.PI * 1318.5 * t) + 0.6 * Math.sin(2 * Math.PI * 1975.5 * t) + 0.35 * Math.sin(2 * Math.PI * 2637 * t)) * Math.exp(-t * 3.2) * 0.35],
  // game: a cartoon hop, the right answer (two rising notes), the wrong one (two falling square notes), a coin for XP
  boing:  [0.35, t => Math.sin(2 * Math.PI * (180 + 520 * Math.sin(Math.min(1, t / 0.3) * Math.PI / 2) ** 2) * t) * Math.exp(-t * 7) * 0.55],
  correct:[0.60, t => { const n = t < 0.11 ? 1046.5 : 1568; const e = t < 0.11 ? Math.exp(-t * 18) : Math.exp(-(t - 0.11) * 6); return (Math.sin(2 * Math.PI * n * t) + 0.3 * Math.sin(4 * Math.PI * n * t)) * e * 0.5; }],
  wrong:  [0.55, t => { const n = t < 0.16 ? 233 : 175; const e = t < 0.16 ? 1 : Math.exp(-(t - 0.16) * 7); return Math.sign(Math.sin(2 * Math.PI * n * t)) * e * 0.18 * Math.min(1, t * 200); }],
  coin:   [0.35, t => Math.sin(2 * Math.PI * (t < 0.07 ? 1975.5 : 2637) * t) * Math.exp(-t * 9) * 0.35],
};
for (const c of cues) {
  if (c.file) {
    const data = samples.get(path.resolve(c.file)), start = Math.round(c.t * SR);
    for (let i = 0; i < data.length && start + i < buf.length; i++) buf[start + i] += data[i] * (c.gain ?? 0.8);
    continue;
  }
  const [len, fn] = VOICES[c.type] ?? VOICES.pop, start = Math.floor(c.t * SR);
  for (let i = 0; i < len * SR && start + i < buf.length; i++) buf[start + i] += fn(i / SR) * (c.gain ?? 0.8);
}

const n = buf.length, b = Buffer.alloc(44 + n * 2); // 16-bit mono WAV
b.write('RIFF', 0); b.writeUInt32LE(36 + n * 2, 4); b.write('WAVEfmt ', 8);
b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22);
b.writeUInt32LE(SR, 24); b.writeUInt32LE(SR * 2, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34);
b.write('data', 36); b.writeUInt32LE(n * 2, 40);
for (let i = 0; i < n; i++) b.writeInt16LE(Math.round(Math.max(-1, Math.min(1, buf[i])) * 32767), 44 + i * 2);
writeFileSync(process.argv[3], b);
