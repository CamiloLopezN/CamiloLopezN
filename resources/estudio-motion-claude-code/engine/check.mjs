// node check.mjs [--w 1080 --h 1920] [--hz 12] [--strict]
// Automatic pass of the critique (course §02 «Loop before you show me anything» and §11), run BEFORE looking at the
// contact sheet: the mechanical problems are found in text, so Claude only spends a look (an image) on taste.
// Run from the film folder. Writes out/check.json and prints a short report.
//
//   determinism   the same t painted twice is the same frame (no Math.random, timers or state between frames)
//   hook          something on screen and moving in the first 2 s
//   rhythm        something new every 2–4 s: new text or a cut/whip (longest gap without an event)
//   safe zone     9:16: text inside x 60–1020 · y 220–1500 of 1080×1920 (AGENTS.md), at every sampled moment
//   centred       9:16: equal margins: the box of what is drawn (pixels that are not the background, y 220–1500)
//                 centred within 40 px of x = 540 (AGENTS.md); the visual weight off by > 80 px is a warning
//   overlap       two readable texts on top of each other
//   phone size    text that would be under 12 px on a 360 px wide phone
//   contrast      text against what is behind it (p90/p10 luminance inside its box) under 3:1
//   read time     a text on screen for less time than it takes to read it
//   loudness      out/final.mp4 at −14 LUFS (±1), true peak ≤ −1 dBTP
//   beat sync     cues.json hits on the beat grid of beats.json (½ beat, ±40 ms)
// Boxes come from films built with lib/kit.js (window.__studio); pixel checks need a canvas #c.
import { openFilm } from './lib/film-page.mjs';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';

const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf('--' + k); return i >= 0 ? Number(argv[i + 1]) : d; };
const film = (() => { try { return JSON.parse(fs.readFileSync('film.json', 'utf8')); } catch { return {}; } })();
const f0 = (film.formatos ?? film.formats ?? [{ w: 1080, h: 1920 }])[0];
const W = arg('w', f0.w), H = arg('h', f0.h), DUR = arg('dur', film.dur ?? 15), HZ = arg('hz', 12);
const results = [];
const add = (name, status, detail, items = []) => results.push({ name, status, detail, items });

let F = await openFilm({ w: W, h: H, unsafe: true });
const MAX_BROWSER_SAMPLES = Math.max(0, Number(process.env.STUDIO_CHECK_BROWSER_MAX_SAMPLES) || 0);
const kit = await F.page.evaluate(() => !!window.__studio);
const canvas = await F.page.evaluate(() => document.querySelector('#c') instanceof HTMLCanvasElement);

// one sample: 48×(48·H/W) luminance thumbnail + text boxes with their contrast
const sample = (t) => F.page.evaluate(async ([t, wantBoxes]) => {
  await window.seek(t);                               // a film with footage loads its frames inside seek
  const c = document.querySelector('#c');
  const out = { t, boxes: [] };
  if (c instanceof HTMLCanvasElement) {
    const tw = 48, th = Math.round(48 * c.height / c.width);
    const o = new OffscreenCanvas(tw, th), x = o.getContext('2d'); x.drawImage(c, 0, 0, tw, th);
    const d = x.getImageData(0, 0, tw, th).data, lum = new Array(tw * th);
    let sum = 0, sq = 0;
    for (let i = 0; i < lum.length; i++) { const v = 0.2126 * d[i * 4] + 0.7152 * d[i * 4 + 1] + 0.0722 * d[i * 4 + 2]; lum[i] = v; sum += v; sq += v * v; }
    out.lum = lum; out.std = Math.sqrt(Math.max(0, sq / lum.length - (sum / lum.length) ** 2));
  }
  if (wantBoxes && window.__studio) {
    const ctx = c.getContext?.('2d');
    for (const b of window.__studio.boxes()) {
      const r = { ...b };
      if (ctx) {
        const x0 = Math.max(0, Math.floor(b.x)), y0 = Math.max(0, Math.floor(b.y)), w = Math.min(c.width - x0, Math.ceil(b.w)), h = Math.min(c.height - y0, Math.ceil(b.h));
        if (w > 2 && h > 2) {
          const d = ctx.getImageData(x0, y0, w, h).data, L = [];
          for (let i = 0; i < d.length; i += 16) { const v = (0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]) / 255; L.push(v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4); }
          L.sort((a, b) => a - b);
          const p = (q) => L[Math.min(L.length - 1, Math.floor(q * L.length))];
          r.contrast = (p(0.95) + 0.05) / (p(0.05) + 0.05);
        }
      }
      out.boxes.push(r);
    }
  }
  return out;
}, [t, kit]);

// ---------- determinism ----------
{
  const ts = [0.37, DUR * 0.41, DUR * 0.83].map((x) => Math.min(DUR - 0.01, x));
  const bad = [];
  for (const t of ts) {
    await F.seek(t); const a = await F.shot(0.25);
    await F.seek(Math.max(0, t - 1.3)); await F.seek(DUR * 0.6);
    await F.seek(t); const b = await F.shot(0.25);
    if (!a.equals(b)) bad.push(t.toFixed(2));
  }
  add('determinism', bad.length ? 'FAIL' : 'PASS', bad.length ? `frames differ when painted twice at ${bad.join(', ')} s: Math.random, timers or state between frames` : 'same frame every time');
}

// ---------- timeline sampling ----------
const N = Math.floor(DUR * HZ);
const S = [];
for (let i = 0; i < N; i++) {
  if (i && MAX_BROWSER_SAMPLES && i % MAX_BROWSER_SAMPLES === 0) {
    await F.close(); F = await openFilm({ w: W, h: H, unsafe: true });
  }
  S.push(await sample(i / HZ + 0.5 / HZ));
}
await F.close();
const diff = (a, b) => (a.lum && b.lum ? a.lum.reduce((s, v, i) => s + Math.abs(v - b.lum[i]), 0) / a.lum.length : 0);
const D = S.map((s, i) => (i ? diff(s, S[i - 1]) : 0));

// ---------- hook ----------
if (canvas) {
  const first = S.filter((s) => s.t < 2);
  const moving = D.slice(1, first.length).reduce((a, b) => a + b, 0);
  const firstVisible = S.find((s) => s.std > 6 || s.boxes.length)?.t;
  const ok = firstVisible != null && firstVisible < 0.5 && moving > 15;
  add('hook', ok ? 'PASS' : 'WARN', `first content at ${firstVisible?.toFixed(2) ?? '—'} s, motion in 0–2 s = ${moving.toFixed(0)}`);
}

// ---------- rhythm: events = new text appears, or a big visual change ----------
{
  const events = [0];
  let prev = new Set();
  S.forEach((s, i) => {
    const now = new Set(s.boxes.map((b) => b.txt));
    const nuevo = [...now].some((x) => !prev.has(x));
    if ((nuevo && now.size) || D[i] > 22) events.push(s.t);
    prev = now;
  });
  events.push(DUR);
  let worst = { gap: 0, at: 0 };
  for (let i = 1; i < events.length; i++) if (events[i] - events[i - 1] > worst.gap) worst = { gap: events[i] - events[i - 1], at: events[i - 1] };
  add('rhythm', worst.gap > 4 ? 'FAIL' : worst.gap > 3 ? 'WARN' : 'PASS', `longest stretch without anything new: ${worst.gap.toFixed(1)} s from ${worst.at.toFixed(1)} s`);
}

// ---------- boxes: safe zone, overlap, size, contrast, read time ----------
const spans = (list) => {                       // [{key, t}] → merged time ranges per key
  const m = new Map();
  for (const { key, t } of list) {
    const r = m.get(key);
    if (r && t - r.at(-1)[1] <= 1.5 / HZ) r.at(-1)[1] = t; else (r ?? m.set(key, []).get(key)).push([t, t]);
  }
  return [...m].map(([key, rs]) => `${key} @ ${rs.map(([a, b]) => (a === b ? a.toFixed(2) : `${a.toFixed(2)}–${b.toFixed(2)}`)).join(', ')} s`);
};
if (kit) {
  const sx = W / 1080, sy = H / 1920, vertical = H / W > 1.6;
  const out = [], over = [], small = [], low = [], offc = [];
  for (const s of S) {
    const bs = s.boxes.filter((b) => b.role !== 'beat' && b.w > 1 && b.h > 1 && b.x + b.w > 0 && b.y + b.h > 0 && b.x < W && b.y < H);
    for (const b of bs) {
      if (b.moving) continue;                                                   // in a transition
      const crossing = b.x < 0 || b.y < 0 || b.x + b.w > W || b.y + b.h > H;      // entering or leaving the frame
      if (vertical && !crossing && (b.x < 60 * sx - 2 || b.x + b.w > 1020 * sx + 2 || b.y < 220 * sy - 2 || b.y + b.h > 1500 * sy + 2)) out.push({ key: `«${b.txt}»`, t: s.t });
      if (b.size * 360 / W < 12) small.push({ key: `«${b.txt}» (${(b.size * 360 / W).toFixed(1)} px)`, t: s.t });
      if (b.contrast != null && b.contrast < 3) low.push({ key: `«${b.txt}» (${b.contrast.toFixed(1)}:1)`, t: s.t });
    }
    const still = bs.filter((b) => !b.moving);
    for (let i = 0; i < still.length; i++) for (let j = i + 1; j < still.length; j++) {
      const a = still[i], b = still[j];
      const ix = Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)), iy = Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
      if (ix * iy > 0.12 * Math.min(a.w * a.h, b.w * b.h)) over.push({ key: `«${a.txt}» × «${b.txt}»`, t: s.t });
    }
  }
  if (vertical) add('safe zone', out.length ? 'FAIL' : 'PASS', out.length ? 'text outside x 60–1020 · y 220–1500' : 'all text inside', spans(out));
  if (vertical) for (const s of S) {
    if (!s.lum) continue;
    const tw = 48, th = s.lum.length / tw, y0 = Math.round(th * 220 / 1920), y1 = Math.round(th * 1500 / 1920);
    const sorted = s.lum.slice().sort((a, b) => a - b), bg = sorted[Math.floor(sorted.length * 0.3)];
    let m = 0, mx = 0; const col = new Array(tw).fill(0);
    for (let y = y0; y < y1; y++) for (let x = 0; x < tw; x++) { const d = Math.abs(s.lum[y * tw + x] - bg); if (d > 6) { m += d; mx += d * (x + 0.5); col[x]++; } }
    const occ = col.map((c) => c >= 2), x0 = occ.indexOf(true), x1 = occ.lastIndexOf(true);
    if (m > 0 && x0 >= 0) offc.push({ t: s.t, d: ((x0 + x1 + 1) / 2 / tw - 0.5) * W, mass: (mx / m / tw - 0.5) * W });
  }
  if (vertical && offc.length) {
    // margins: the box of what is drawn, centred on x = 540 (the rule); weight: where the ink is (a hint)
    const med = (k) => { const v = offc.map((o) => o[k]).sort((a, b) => a - b); return v[Math.floor(v.length / 2)] / sx; };
    const box = med('d'), mass = med('mass'), lim = 40;
    const bad = offc.filter((o) => Math.abs(o.d / sx) > lim);
    add('centred', Math.abs(box) > lim ? 'FAIL' : bad.length > offc.length * 0.25 || Math.abs(mass) > 80 ? 'WARN' : 'PASS',
      `margins: content box ${box >= 0 ? '+' : ''}${box.toFixed(0)} px from x = 540 (median) · visual weight ${mass >= 0 ? '+' : ''}${mass.toFixed(0)} px${bad.length ? ` · box off by > ${lim} px in ${Math.round(100 * bad.length / offc.length)} % of moments` : ''}`,
      spans(bad.map((o) => ({ key: `${o.d > 0 ? '+' : ''}${(o.d / sx).toFixed(0)} px`, t: o.t }))).slice(0, 6));
  }
  add('overlap', over.length ? 'FAIL' : 'PASS', over.length ? 'texts on top of each other' : 'no overlaps', spans(over));
  add('phone size', small.length ? 'WARN' : 'PASS', small.length ? 'under 12 px on a 360 px phone' : 'readable on a phone', spans(small));
  add('contrast', low.length ? 'WARN' : 'PASS', low.length ? 'under 3:1 against what is behind' : 'all text ≥ 3:1', spans(low));
  // read time: a text group on screen shorter than ~0.25 s per word + 0.4 s
  const life = new Map();
  for (const s of S) for (const b of s.boxes) { if (b.role === 'beat') continue; const r = life.get(b.txt) ?? { a: s.t, b: s.t }; r.b = s.t; life.set(b.txt, r); }
  const lines = [...life].filter(([txt, r]) => r.b - r.a + 1 / HZ < 0.4 + 0.25 * txt.split(/\s+/).length && r.b < DUR - 0.5);
  add('read time', lines.length ? 'WARN' : 'PASS', lines.length ? 'on screen too briefly to read' : 'every text stays long enough', lines.map(([txt, r]) => `«${txt}» ${(r.b - r.a + 1 / HZ).toFixed(2)} s @ ${r.a.toFixed(2)}`));
} else add('boxes', 'SKIP', 'the film does not use lib/kit.js: safe zone, overlap, size and contrast are left to the eye');

// ---------- loudness ----------
const video = ['out/final.mp4'].find((f) => fs.existsSync(f));
if (video) {
  const r = spawnSync('ffmpeg', ['-hide_banner', '-nostats', '-i', video, '-af', 'ebur128=peak=true', '-f', 'null', '-'], { encoding: 'utf8' });
  const I = Number(/I:\s+(-?[\d.]+) LUFS/.exec(r.stderr.split('Summary:').pop())?.[1]);
  const P = Number(/Peak:\s+(-?[\d.]+) dBFS/.exec(r.stderr.split('Summary:').pop())?.[1]);
  const ok = Math.abs(I + 14) <= 1 && !(P > -1);
  add('loudness', Number.isFinite(I) ? (ok ? 'PASS' : 'FAIL') : 'SKIP', Number.isFinite(I) ? `${I.toFixed(1)} LUFS, true peak ${P.toFixed(1)} dBTP` : 'no audio');
}

// ---------- beat sync ----------
if (fs.existsSync('cues.json') && fs.existsSync('beats.json')) {
  const cues = JSON.parse(fs.readFileSync('cues.json', 'utf8')), beats = JSON.parse(fs.readFileSync('beats.json', 'utf8')).beats ?? [];
  const grid = beats.flatMap((b, i) => (i + 1 < beats.length ? [b, (b + beats[i + 1]) / 2] : [b]));
  // hits land on the grid; whooshes and risers lead into it and pops follow the motion, so they are not checked
  const HITS = new Set(['thump', 'click', 'hit', 'impact', 'kick', 'snap', 'tick', 'chime', 'correct', 'wrong']);
  const off = (Array.isArray(cues) ? cues : cues.cues ?? []).filter((c) => HITS.has(c.type) && grid.length && Math.min(...grid.map((b) => Math.abs(b - c.t))) > 0.04);
  add('beat sync', off.length ? 'WARN' : 'PASS', off.length ? 'hits off the beat grid (½ beat, ±40 ms)' : 'every hit on the grid', off.map((c) => `${c.type ?? 'cue'} @ ${c.t}`));
}

// ---------- report ----------
fs.mkdirSync('out', { recursive: true });
fs.writeFileSync('out/check.json', JSON.stringify({ w: W, h: H, dur: DUR, hz: HZ, results }, null, 1));
const mark = { PASS: '✓', WARN: '!', FAIL: '✗', SKIP: '·' };
for (const r of results) {
  console.log(`${mark[r.status]} ${r.name.padEnd(12)} ${r.detail}`);
  for (const it of r.items.slice(0, 6)) console.log(`    ${it}`);
  if (r.items.length > 6) console.log(`    … ${r.items.length - 6} more (out/check.json)`);
}
const fails = results.filter((r) => r.status === 'FAIL').length, warns = results.filter((r) => r.status === 'WARN').length;
console.log(`check · ${fails} to fix, ${warns} to look at · out/check.json`);
if (argv.includes('--strict') && fails) process.exitCode = 1;
