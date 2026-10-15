// node sheet.mjs [--dur 15] [--cada 0.5] [--at 1.2,3.4,…] [--cols 6] [--w 1080 --h 1920] [--poster 1.2 [--solo-poster]]
// «Render one frame per beat as a contact sheet and LOOK at it» (curso de Movez, §02 y §10): fotos fijas de la
// película antes del render completo, sacadas de window.seek(t) en Chromium. Se corre desde la carpeta de la película.
//   · Un cuadro por pulso de beats.json («beats»); sin beats.json, uno cada --cada segundos.
//   · Salida: out/stills/NNN.png y out/contact.png (la hoja), y out/poster.png si se pide --poster <t>.
import { openFilm } from './lib/film-page.mjs';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';

const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? Number(process.argv[i + 1]) : d; };
const DUR = arg('dur', 15), CADA = arg('cada', 0.5), COLS = arg('cols', 6), W = arg('w', 1080), H = arg('h', 1920);
const POSTER = arg('poster', NaN), SOLO_POSTER = process.argv.includes('--solo-poster');

const AT = (() => { const i = process.argv.indexOf('--at'); return i > 0 ? process.argv[i + 1].split(',').map(Number) : null; })();
let tiempos;
if (AT) tiempos = AT;
else if (existsSync('beats.json')) tiempos = JSON.parse(readFileSync('beats.json', 'utf8')).beats.filter((t) => t < DUR);
else tiempos = Array.from({ length: Math.floor(DUR / CADA) }, (_, i) => +(i * CADA).toFixed(3));

mkdirSync('out', { recursive: true });
if (!SOLO_POSTER) { rmSync('out/stills', { recursive: true, force: true }); mkdirSync('out/stills', { recursive: true }); }

const film = await openFilm({ w: W, h: H });
const foto = async (t, ruta) => { await film.seek(t); writeFileSync(ruta, await film.shot(1)); };
if (!SOLO_POSTER) for (const [i, t] of tiempos.entries()) await foto(t, `out/stills/${String(i).padStart(3, '0')}.png`);
if (Number.isFinite(POSTER)) await foto(POSTER, 'out/poster.png');
await film.close();
if (SOLO_POSTER) { console.log('out/poster.png'); process.exit(process.exitCode ?? 0); }

const filas = Math.max(1, Math.ceil(tiempos.length / COLS));
execFileSync('ffmpeg', ['-v', 'error', '-y', '-framerate', '1', '-i', 'out/stills/%03d.png',
  '-vf', `scale=270:-1,tile=${COLS}x${filas}`, '-frames:v', '1', 'out/contact.png']);
console.log(`out/contact.png · ${tiempos.length} cuadros (${tiempos.map((t) => t + 's').join(' ')})`);
