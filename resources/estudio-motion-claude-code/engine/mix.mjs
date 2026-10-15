// node mix.mjs [--dur 15] [--video out/silent.mp4] [--salida out/final.mp4]
// «node render.mjs → sfx.mjs → mix to -14 LUFS → out/final.mp4» (curso de Movez, §12). Se corre desde la carpeta de
// la película. Junta la imagen de out/silent.mp4 con lo que haya de sonido y deja la mezcla en -14 LUFS (dos pasadas
// de loudnorm):
//   audio/track.wav  pista entregada (se usa sin cambios)      out/score.wav  música sintetizada en código
//   audio/voz.wav    voz                                       out/sfx.wav    efectos de sfx.mjs
// Sin ningún sonido, out/final.mp4 es una copia de la imagen.
import { execFileSync, spawnSync } from 'node:child_process';
import { copyFileSync, existsSync } from 'node:fs';

const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? Number(process.argv[i + 1]) : d; };
const DUR = arg('dur', NaN);
const sarg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const VIDEO = sarg('video', 'out/silent.mp4'), SALIDA = sarg('salida', 'out/final.mp4');
const pistas = ['audio/track.wav', 'out/score.wav', 'audio/voz.wav', 'out/sfx.wav'].filter(existsSync);
if (!existsSync(VIDEO)) { console.error(`Falta ${VIDEO}: primero node render.mjs`); process.exit(1); }
if (!pistas.length) { copyFileSync(VIDEO, SALIDA); console.log(`${SALIDA} (sin sonido)`); process.exit(0); }

const entradas = pistas.flatMap((p) => ['-i', p]);
// With a voice, the music ducks under it (sidechain): the words always read over the score.
const iVoz = pistas.indexOf('audio/voz.wav');
const musica = pistas.map((p, i) => [p, i]).filter(([p]) => p === 'audio/track.wav' || p === 'out/score.wav').map(([, i]) => i);
const otras = pistas.map((_, i) => i).filter((i) => i !== iVoz && !musica.includes(i));
let mezcla;
if (iVoz >= 0 && musica.length) {
  const m = musica.length > 1 ? `${musica.map((i) => `[${i}:a]`).join('')}amix=inputs=${musica.length}:duration=longest:normalize=0,` : `[${musica[0]}:a]`;
  mezcla = `[${iVoz}:a]asplit=2[vz][vk];${m}${musica.length > 1 ? '' : 'anull,'}volume=0.55[mus];[mus][vk]sidechaincompress=threshold=0.04:ratio=8:attack=15:release=320:makeup=1[duck];` +
    `[vz][duck]${otras.map((i) => `[${i}:a]`).join('')}amix=inputs=${2 + otras.length}:duration=longest:normalize=0`;
} else {
  mezcla = pistas.length > 1 ? `${pistas.map((_, i) => `[${i}:a]`).join('')}amix=inputs=${pistas.length}:duration=longest:normalize=0` : '[0:a]anull';
}
const corte = Number.isFinite(DUR) ? `,atrim=0:${DUR}` : '';

// 1.ª pasada: medir la mezcla tal cual (loudnorm escribe la medida en stderr)
const medir = (cadena) => {
  const r = spawnSync('ffmpeg', ['-hide_banner', ...entradas, '-filter_complex', `${cadena},loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json`, '-f', 'null', '-'], { encoding: 'utf8' });
  const texto = r.stderr ?? '';
  return JSON.parse(texto.slice(texto.lastIndexOf('{'), texto.lastIndexOf('}') + 1));
};
const j0 = medir(`${mezcla}${corte}`);
// Un limitador antes de normalizar, con el techo a 11 dB sobre la sonoridad medida: tras subir a −14 LUFS los picos
// quedan bajo −3 dBFS y loudnorm aplica una ganancia lineal (sin bombeo). El limitador trabaja sobremuestreado a
// 192 kHz para atrapar los picos entre muestras; si aun así el AAC final pasa de −1 dBTP, se baja el techo lo que
// sobró y se repite (como mucho dos veces).
const picoFinal = () => {
  const r = spawnSync('ffmpeg', ['-hide_banner', '-i', SALIDA, '-map', '0:a', '-af', 'ebur128=peak=true', '-f', 'null', '-'], { encoding: 'utf8' });
  return Number((r.stderr ?? '').match(/True peak:\s*Peak:\s*(-?[\d.]+|-inf)/)?.[1] ?? NaN);
};
let margen = 11;
for (let intento = 0; intento < 3; intento++) {
  const techo = Math.min(1, 10 ** ((Number(j0.input_i) + margen) / 20));
  const limite = Number.isFinite(techo) && techo < 0.98 ? `,aresample=192000,alimiter=limit=${techo.toFixed(4)}:attack=2:release=80:level=false` : '';
  // 2.ª pasada: medir lo limitado; 3.ª: aplicar con lo medido y unir con la imagen sin recodificarla
  const j = limite ? medir(`${mezcla}${corte}${limite}`) : j0;
  const ln = `loudnorm=I=-14:TP=-1.5:LRA=11:measured_I=${j.input_i}:measured_TP=${j.input_tp}:measured_LRA=${j.input_lra}:measured_thresh=${j.input_thresh}:offset=${j.target_offset}:linear=true`;
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', VIDEO, ...entradas, '-filter_complex',
    `${mezcla.replaceAll(/\[(\d+):a\]/g, (_, n) => `[${Number(n) + 1}:a]`)}${corte}${limite},${ln},aresample=48000[a]`,
    '-map', '0:v', '-map', '[a]', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '256k', '-shortest', '-movflags', '+faststart', SALIDA]);
  const tp = picoFinal();
  if (!(tp > -1.05) || !limite) break;
  margen -= tp + 1.4;
}
console.log(`${SALIDA} · −14 LUFS · ${pistas.join(' + ')}`);
