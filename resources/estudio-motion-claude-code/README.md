# Estudio de Motion Graphics con Claude Code y Opus 5.5

Este paquete contiene los **archivos 100 % reales** utilizados en el tutorial largo de YouTube de **Cristian López (`@milodev10`)** para convertir **Claude Code (con Opus 5.5)** en un estudio determinista de motion graphics — desde la primera prueba en crudo hasta el Prompt Maestro en XML y la arquitectura que reduce el consumo de tokens en un **80 %** (de `US$ 13.04` a `US$ 2.40` por pieza).

---

## 1. Qué incluye este paquete

```text
estudio-motion-claude-code/
├── README.md                              # Esta guía paso a paso en español
├── CLAUDE.md                              # Las 4 leyes del motor determinista (con guía en español)
├── sistema-de-marca.md                    # ADN visual reutilizable extraído con Playwright (ejemplo: Notion)
├── prompts-6-pruebas.md                   # Los 6 prompts reales progresivos listos para copiar y pegar
├── package.json                           # Dependencia única del motor: Playwright
├── .claude/
│   └── skills/
│       └── motion-reel/
│           └── SKILL.md                   # Skill empaquetada para lanzar videos con un solo comando
├── engine/                                # Motor nativo de renderizado determinista (Movez / Studio)
│   ├── render.mjs                         # Renderiza window.seek(t) en paralelo con caché por segundo y motion blur
│   ├── sheet.mjs                          # Genera la hoja de contacto (out/contact.png) con 1 cuadro por pulso
│   ├── check.mjs                          # Auditoría automática (determinismo, ritmo, contraste, LUFS)
│   ├── sfx.mjs                            # Sintetizador de efectos de interfaz (click, pop, whoosh, thump, chime)
│   ├── mix.mjs                            # Mezcla música + efectos y normaliza a -14 LUFS (2 pasadas loudnorm)
│   ├── beats.py                           # Extrae BPM y rejilla de pulsos (beats.json) de una pista de audio
│   ├── critique.sh                        # Genera contact.png, strip.png, phone.png y prueba de determinismo
│   ├── critique-pass.txt                  # Prompt de autocrítica severa para Opus 5.5
│   └── lib/                               # Librerías de resortes en forma cerrada (motion.js, kit.js, score-kit.mjs)
└── ejemplos/                              # Las 6 películas HTML reales generadas en las 6 pruebas del video
    ├── 01-delivery-crudo/                 # Prueba 1: App de domicilios sin CLAUDE.md
    ├── 02-delivery-con-reglas/            # Prueba 2: App de domicilios con CLAUDE.md + hoja de contacto + notas 1-10
    ├── 03-showreel/                       # Prueba 3: Showreel de motion designer de 15 s a 60 fps
    ├── 04-con-referencia/                 # Prueba 4: Ingeniería inversa de una referencia de whatships.com
    ├── 05-marca-real/                     # Prueba 5: Lanzamiento de marca real en 5 actos con Playwright
    └── 06-xml-maestro/                    # Prueba 6: Prompt Maestro en XML (1 contenedor sin cortes + track(t))
```

---

## 2. Requisitos previos

1. **Node.js 20+** (`node -v`)
2. **FFmpeg** instalado en tu sistema (`ffmpeg -version`)
   - En Ubuntu/Debian/WSL: `sudo apt install ffmpeg`
   - En macOS: `brew install ffmpeg`
   - En Windows: `winget install Gyan.FFmpeg`
3. **yt-dlp** (solo para la Prueba 4, para descargar videos de referencia desde X / `whatships.com`):
   - `pip install -U yt-dlp` o `brew install yt-dlp`
4. **Claude Code** (`npm install -g @anthropic-ai/claude-code`) con suscripción Pro/Max o API Key con acceso a **Opus 5.5**.

---

## 3. Instalación rápida (2 comandos)

Abre una terminal en la raíz de esta carpeta (`estudio-motion-claude-code/`) y ejecuta:

```bash
npm install
npx playwright install chromium
```

¡Listo! Con eso tienes Chromium sin cabeza (*headless*) y el motor determinista listos para grabar cualquier película en `HTML + Canvas + SVG + JS`.

---

## 4. Cómo reproducir las 6 Pruebas Progresivas del video

Todos los prompts exactos están en [`prompts-6-pruebas.md`](./prompts-6-pruebas.md).

### Paso a paso para correrlas con Claude Code:
1. Abre Claude Code dentro de esta carpeta:
   ```bash
   claude
   ```
2. **Para la Prueba 1 (En crudo, sin reglas):**
   - Si quieres ver qué hace la IA cuando **no** tiene reglas de dirección, renombra temporalmente `CLAUDE.md` (`mv CLAUDE.md CLAUDE.off.md`) y pega el prompt de la **Prueba 1** de `prompts-6-pruebas.md`.
   - Luego restaura `mv CLAUDE.off.md CLAUDE.md`.
3. **Para las Pruebas 2, 3, 4, 5 y 6 (Con el estudio completo):**
   - Con `CLAUDE.md` activo en la raíz (y `sistema-de-marca.md` para mantener el ADN visual de la marca), copia y pega cualquiera de los prompts de `prompts-6-pruebas.md`.
   - Verás cómo Claude Code genera primero la hoja de contacto (`contact.png`), la inspecciona visualmente, puntúa de `1 a 10` cada criterio y corrige los fallos antes de hacer el render completo.

---

## 5. Cómo renderizar, auditar y mezclar cualquiera de los 6 ejemplos incluidos

Puedes probar el motor ahora mismo entrando a cualquiera de las carpetas dentro de `ejemplos/` (por ejemplo, `ejemplos/06-xml-maestro` o `ejemplos/02-delivery-con-reglas`):

```bash
cd ejemplos/02-delivery-con-reglas
```

### A. Generar la hoja de contacto (`out/contact.png`) en segundos
Antes de gastar tiempo renderizando todos los cuadros, genera la cuadrícula de revisión visual:
```bash
node ../../engine/sheet.mjs --w 1920 --h 1080 --dur 10
```
Esto crea `out/contact.png` con un fotograma cada `0.5 s` (o un fotograma por cada pulso de `beats.json`).

### B. Correr la auditoría técnica automática (`out/check.json`)
Comprueba que `window.seek(t)` sea 100 % determinista (que pintar el mismo segundo dos veces produzca exactamente los mismos píxeles) y que haya ritmo visual cada 2–4 segundos:
```bash
node ../../engine/check.mjs --w 1920 --h 1080 --dur 10
```

### C. Renderizar la película completa (`out/silent.mp4`)
Para un render rápido de prueba (`--draft`, 1 subcuadro):
```bash
node ../../engine/render.mjs --w 1920 --h 1080 --fps 30 --dur 10 --draft
```
Para el render de calidad final con **motion blur real de 4 subcuadros** (`--sub 4`) a `60 fps`:
```bash
node ../../engine/render.mjs --w 1920 --h 1080 --fps 60 --dur 10 --sub 4
```

### D. Re-renderizar únicamente un tramo de 2 segundos (`--from` / `--to`)
Si corregiste un texto o un resorte entre el segundo `2` y el segundo `4`, **no vuelvas a renderizar todo el video**. El motor guarda caché por segundo en `out/.chunks/` y puedes pedir solo ese tramo:
```bash
node ../../engine/render.mjs --w 1920 --h 1080 --fps 60 --dur 10 --from 2 --to 4
```

### E. Sintetizar la música, los efectos de sonido y mezclar a `-14 LUFS` (`out/final.mp4`)
Cada ejemplo incluye su partitura en código (`score.mjs`) y su mapa de efectos (`cues.json`):
```bash
# 1. Sintetizar la música original (out/score.wav)
node score.mjs

# 2. Sintetizar los efectos de sonido clavados en la rejilla (out/sfx.wav)
node ../../engine/sfx.mjs cues.json out/sfx.wav

# 3. Mezclar video + música + efectos normalizados a -14 LUFS (out/final.mp4)
node ../../engine/mix.mjs --dur 10
```
El video terminado con audio masterizado queda en `out/final.mp4`.

---

## 6. Arquitectura de Ahorro del 80 % de Tokens (`De US$ 13.04 a US$ 2.40`)

Cuando trabajas con **Opus 5.5** en proyectos visuales largos, tres errores disparan la factura de tokens. Así los resuelve este flujo:

| Problema que quema tokens | Solución en este estudio | Ahorro real |
|---|---|---|
| **1. Usar Opus 5.5 para navegar la web con Playwright** (el árbol DOM y las capturas llenan la ventana de contexto a precio de Opus). | Delegar la exploración de Playwright y la extracción de colores/logos/capturas a un **subagente con Haiku 5.5** (`40× más económico`), que guarda todo en `assets/` y escribe `sistema-de-marca.md`. | **-65 % en fase de investigación** |
| **2. Pasar decenas de fotogramas PNG sueltos a Opus para revisar la animación.** | Generar **una única imagen compuesta (`out/contact.png`)** con `sheet.mjs` (`scale=270:-1,tile=6x5`). Opus evalúa toda la película de un vistazo con **1 sola lectura de imagen**. | **-85 % en tokens de visión** |
| **3. Re-escribir y re-renderizar toda la película por un detalle en el segundo 3.** | Usar `--from 2 --to 4` y la caché por segundo (`out/.chunks/manifest.json`). Solo se re-renderizan los segundos cuyo hash visual cambió. | **-75 % en iteraciones de ajuste** |

---

## 7. Enlaces útiles

- **Guía interactiva en la web:** [cristianlopez.site/motion](https://cristianlopez.site/motion)
- **Galería de videos de lanzamiento en X (para la Prueba 4):** [whatships.com](https://whatships.com)
- **Canal de YouTube:** [@milodev10](https://www.youtube.com/@milodev10)
