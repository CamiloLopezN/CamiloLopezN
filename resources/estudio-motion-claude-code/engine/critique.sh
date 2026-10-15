#!/usr/bin/env bash
# Curso de Movez, §11 «Critique - make Opus watch its own frames». Se corre desde la carpeta de la película.
#   critique.sh                 hoja, tira, prueba de teléfono y prueba de bucle de out/final.mp4
#   critique.sh --strip 4.1     la tira de 12 cuadros alrededor de una acción rápida (por defecto, 4.1 s)
#   critique.sh determinismo    renderiza dos veces 5 s y compara el hash
# Después: abrir out/contact.png, out/strip.png y out/phone.png y seguir engine/motion/critique-pass.txt.
set -euo pipefail
AQUI="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VIDEO="out/final.mp4"; [ -f "$VIDEO" ] || VIDEO="out/silent.mp4"
STRIP=4.1

if [ "${1:-}" = "determinismo" ]; then
  # Determinism check: frame 300 rendered twice must hash the same
  node "$AQUI/render.mjs" --dur 5 --fps 60 --sub 1 --no-cache --out out/det-a.mp4
  node "$AQUI/render.mjs" --dur 5 --fps 60 --sub 1 --no-cache --out out/det-b.mp4
  A=$(md5sum out/det-a.mp4 | cut -d' ' -f1); B=$(md5sum out/det-b.mp4 | cut -d' ' -f1)
  echo "$A  out/det-a.mp4"; echo "$B  out/det-b.mp4"
  rm -f out/det-a.mp4 out/det-b.mp4
  [ "$A" = "$B" ] && { echo "determinista"; exit 0; } || { echo "NO determinista: hay Math.random, timers o estado entre cuadros"; exit 1; }
fi
[ "${1:-}" = "--strip" ] && STRIP="$2"

# Contact sheet: 2 frames per second, 6 across
ffmpeg -v error -y -i "$VIDEO" -vf "fps=2,scale=270:-1,tile=6x5" -frames:v 1 out/contact.png

# Strip: 12 consecutive frames around a fast action at 4.2s (catch pops)
ffmpeg -v error -y -ss "$STRIP" -i "$VIDEO" -vf "scale=320:-1,tile=12x1" -frames:v 1 out/strip.png

# Phone test: how it reads at 360 px wide
ffmpeg -v error -y -i "$VIDEO" -vf "fps=1,scale=360:-1,tile=5x3" -frames:v 1 out/phone.png

# Loop check: play it twice back to back and watch the seam
ffmpeg -v error -y -stream_loop 1 -i "$VIDEO" -c copy out/loop_check.mp4

echo "out/contact.png out/strip.png out/phone.png out/loop_check.mp4"
