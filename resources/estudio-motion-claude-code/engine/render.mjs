// node render.mjs --fps 60 --dur 15 --sub 4
// Course §07: walk the timeline, call window.seek(t) in headless Chromium, pipe every frame to ffmpeg; H.264 yuv420p
// CRF 16, with SUB subframes per frame averaged by tmix (motion blur). Run from the film folder (the one with
// index.html). Output: out/silent.mp4.
//
// Same film, same frames, faster:
//   · the timeline is cut into chunks of whole output frames (--chunk seconds, 1 by default) and N workers render them
//     at the same time, each in its own Chromium (--jobs, default: half the CPU threads, STUDIO_RENDER_JOBS); the
//     chunks are joined without re-encoding. tmix never crosses a chunk edge, so every frame averages exactly its
//     own SUB subframes, as in a single pass.
//   · frames are captured through the DevTools protocol (no per-call element checks; fast PNG encoder, lossless).
//   · chunk cache: each chunk keeps a fingerprint (a quarter-size capture of every frame). On the next render a chunk
//     whose fingerprint did not change is reused, so a fix in second 12 re-renders only the chunks it touched.
//     --no-cache renders everything.
//   · adaptive subframes: a frame whose first and last subframes are the same (compared in the page on a 135×240
//     copy, ignoring grain, sub-pixel drift and a mascot that only breathes or blinks) is captured once and repeated SUB times — tmix of equal images is that
//     image, so still moments cost one capture instead of SUB. Moving frames keep all SUB subframes. --no-adapt turns
//     it off; films whose canvas cannot be read back (tainted) keep all subframes.
//   · STUDIO_RENDER_GPU=1 turns on GPU rasterisation in Chromium.
//   · --draft: one subframe and NVENC (or fast x264) for a quick look; never for the final file.
// Also: --w/--h (9:16, 1:1 and 16:9 from the same timeline, §12), --from/--to (only those seconds, §11), --out.
import { openFilm, GPU } from './lib/film-page.mjs';
import { spawn, spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

let _nvenc = null;
function hasNvenc() {
  if (_nvenc === null) {
    _nvenc = spawnSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-f', 'lavfi', '-i', 'color=s=256x256:d=0.1', '-c:v', 'h264_nvenc', '-f', 'null', '-'], { stdio: 'ignore' }).status === 0;
  }
  return _nvenc;
}
const EN_JUEGO = false;

const argv = process.argv.slice(2);
const has = (k) => argv.includes('--' + k);
const arg = (k, d) => { const i = argv.indexOf('--' + k); return i >= 0 ? Number(argv[i + 1]) : d; };
const sarg = (k, d) => { const i = argv.indexOf('--' + k); return i >= 0 ? argv[i + 1] : d; };
const DRAFT = has('draft');
const FPS = arg('fps', 60), DUR = arg('dur', 15), SUB = DRAFT ? 1 : arg('sub', 4);
const W = arg('w', 1080), H = arg('h', 1920), FROM = arg('from', 0), TO = arg('to', DUR);
const OUT = sarg('out', 'out/silent.mp4');
const CHUNK = arg('chunk', 1);
const CACHE = !has('no-cache') && !DRAFT && process.env.STUDIO_RENDER_NO_CACHE !== '1';
const ADAPT = !has('no-adapt') && SUB > 1;
const defaultJobs = EN_JUEGO ? 1 : Math.max(1, Math.floor(os.cpus().length / 2));
const JOBS = Math.max(1, arg('jobs', Number(process.env.STUDIO_RENDER_JOBS) || defaultJobs));
const MAX_BROWSER_CHUNKS = Math.max(0, Number(process.env.STUDIO_BROWSER_MAX_CHUNKS) || 0);

fs.mkdirSync(path.dirname(path.resolve(OUT)), { recursive: true });
const DIR = path.resolve('out', '.chunks', `${W}x${H}@${FPS}x${SUB}${DRAFT ? '-draft' : ''}`);
fs.mkdirSync(DIR, { recursive: true });
const MANIFEST = path.join(DIR, 'manifest.json');
const manifest = (() => { try { return JSON.parse(fs.readFileSync(MANIFEST, 'utf8')); } catch { return {}; } })();

// ---------- chunks of whole output frames ----------
const f0 = Math.round(FROM * FPS), f1 = Math.round(TO * FPS), per = Math.max(1, Math.round(CHUNK * FPS));
const chunks = [];
for (let a = Math.floor(f0 / per) * per; a < f1; a += per) {
  const s = Math.max(a, f0), e = Math.min(a + per, f1);
  if (s < e) chunks.push({ s, e, file: path.join(DIR, `${String(s).padStart(6, '0')}-${String(e).padStart(6, '0')}.mp4`) });
}

// ---------- encoders ----------
const nvenc = hasNvenc();
const codec = DRAFT
  ? (nvenc ? ['-c:v', 'h264_nvenc', '-preset', 'p4', '-cq', '23'] : ['-c:v', 'libx264', '-preset', 'veryfast', '-crf', '23'])
  : (nvenc ? ['-c:v', 'h264_nvenc', '-preset', 'p4', '-cq', '16'] : ['-c:v', 'libx264', '-crf', '10', '-preset', 'fast', '-tune', 'stillimage']);
// tmix averages SUB consecutive subframes; select keeps the last of each group (motion blur)
const vf = SUB > 1 ? ['-vf', `tmix=frames=${SUB},select='eq(mod(n\\,${SUB})\\,${SUB - 1})'`] : [];
const threads = String(EN_JUEGO ? 2 : Math.max(1, Math.floor(os.cpus().length / JOBS)));
function encoder(file) {
  const p = spawn('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS * SUB), '-i', '-',
    ...vf, '-r', String(FPS), ...codec, '-threads', threads, '-pix_fmt', 'yuv420p', file], { stdio: ['pipe', 'inherit', 'inherit'] });
  const done = new Promise((ok, ko) => { p.on('error', ko); p.on('close', (c) => (c === 0 ? ok() : ko(new Error(`ffmpeg exited with ${c}`)))); });
  return { write: (b) => (p.stdin.write(b) ? null : new Promise((r) => p.stdin.once('drain', r))), end: () => { p.stdin.end(); return done; } };
}

// ---------- workers: one Chromium each ----------
const worker = () => openFilm({ w: W, h: H });

// fingerprint of a chunk: a quarter-size capture of every output frame
async function fingerprint(w, c) {
  const h = crypto.createHash('sha1');
  for (let f = c.s; f < c.e; f++) { await w.seek(f / FPS); h.update(await w.shot(0.25)); }
  return h.digest('hex');
}

let doneFrames = 0, lastSecond = -1;
const total = f1 - f0;
const tick = (n) => {
  doneFrames += n;
  const s = Math.floor(doneFrames / FPS);
  if (s !== lastSecond) { lastSecond = s; console.log(`rendered ${(FROM + s).toFixed(0)}s`); }
};

// true when the frame does not move between its first and last subframe (the canvas is left at the last one)
const still = (w, a, b) => w.page.evaluate(async ([a, b]) => {
  const c = document.querySelector('#c');
  if (!(c instanceof HTMLCanvasElement)) return false;
  try {
    const o = new OffscreenCanvas(135, 240), x = o.getContext('2d', { willReadFrequently: true });
    await window.seek(a); x.drawImage(c, 0, 0, 135, 240); const d1 = x.getImageData(0, 0, 135, 240).data;
    await window.seek(b); x.clearRect(0, 0, 135, 240); x.drawImage(c, 0, 0, 135, 240); const d2 = x.getImageData(0, 0, 135, 240).data;
    let n = 0;
    for (let i = 0; i < d1.length; i += 4) if (Math.abs(d1[i] - d2[i]) + Math.abs(d1[i + 1] - d2[i + 1]) + Math.abs(d1[i + 2] - d2[i + 2]) > 36) n++;
    return n <= 40;                                   // ≤ 0.12 % of the copy: breathing, blinking, grain — no blur to make
  } catch { return false; }                          // tainted canvas: no read-back, render every subframe
}, [a, b]);
let stillFrames = 0;

async function renderChunk(w, c, fp) {
  const tmp = c.file + '.tmp.mp4';
  const enc = encoder(tmp);
  for (let f = c.s; f < c.e; f++) {
    if (ADAPT && await still(w, (f * SUB) / (FPS * SUB), (f * SUB + SUB - 1) / (FPS * SUB))) {
      const b = await w.shot(1);
      for (let k = 0; k < SUB; k++) await enc.write(b);
      stillFrames++; tick(1); continue;
    }
    for (let k = 0; k < SUB; k++) {
      await w.seek((f * SUB + k) / (FPS * SUB));
      await enc.write(await w.shot(1));
    }
    tick(1);
  }
  await enc.end();
  fs.renameSync(tmp, c.file);
  manifest[path.basename(c.file)] = { fp, at: new Date().toISOString() };
  if (CACHE) {
    fs.writeFileSync(MANIFEST + '.tmp', JSON.stringify(manifest, null, 1));
    fs.renameSync(MANIFEST + '.tmp', MANIFEST);
  }
}

const queue = [...chunks];
let reused = 0;
const workers = await Promise.all(Array.from({ length: Math.min(JOBS, chunks.length) }, worker));
await Promise.all(workers.map(async (initialWorker) => {
  let w = initialWorker, browserChunks = 0;
  try {
    for (let c; (c = queue.shift());) {
      if (MAX_BROWSER_CHUNKS && browserChunks >= MAX_BROWSER_CHUNKS) {
        await w.close(); w = await worker(); browserChunks = 0;
      }
      const fp = CACHE ? await fingerprint(w, c) : null;
      browserChunks++;
      if (fp && manifest[path.basename(c.file)]?.fp === fp && fs.existsSync(c.file)) { reused++; tick(c.e - c.s); continue; }
      await renderChunk(w, c, fp);
    }
  } finally { await w.close(); }
}));
fs.writeFileSync(MANIFEST, JSON.stringify(manifest, null, 1));

// ---------- join without re-encoding ----------
const list = path.join(DIR, `concat-${process.pid}.txt`);
fs.writeFileSync(list, chunks.map((c) => `file '${c.file.replace(/'/g, "'\\''")}'`).join('\n') + '\n');
const code = await new Promise((r) => spawn('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', list,
  '-c', 'copy', '-movflags', '+faststart', OUT], { stdio: 'inherit' }).on('close', r));
fs.rmSync(list, { force: true });
if (code !== 0) { console.error(`ffmpeg exited with ${code}`); process.exit(1); }
console.log(`render · ${chunks.length} chunks (${reused} from cache) · ${JOBS} worker(s)${GPU ? ' · GPU' : ''}${DRAFT ? ' · draft' : ''}${ADAPT ? ` · ${stillFrames} still frames captured once` : ''} → ${OUT}`);
