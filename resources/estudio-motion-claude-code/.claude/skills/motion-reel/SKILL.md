---
name: motion-reel
description: Make a product or showreel motion video rendered from code. Use when the user asks for a launch video, showreel, product reel, animated explainer — and in Studio, for every video of Scope, Lumia and the personal brand (news, trivia, plays, memes, long-form, reels). The film is one index.html with window.seek(t), rendered with Playwright and ffmpeg (engine/motion).
---

# Motion reel

Texto del curso de Movez, §12 («Package it as a skill»). Fuente completa: `docs/motion-studio-movez.md`. Las reglas
de la casa (§02) están en `CLAUDE.md`. La primera sección dice dónde está cada cosa en Studio.

## En Studio

- **Dónde va cada película.** En `brands/<marca>/formats/<formato>/pieces/<id>/`, con estos archivos:
  - `index.html` (importa `engine/motion/lib/kit.js`, la biblioteca de componentes) y `film.json`;
  - las carpetas `assets/`, `refs/`, `audio/`, `docs/` y `out/`.
  - La carpeta se crea con `node engine/motion/new.mjs brands/<marca>/formats/<formato>/pieces/<id> "Título"`.
- **Series:** si el formato tiene `template/film.js` (trivias de Lumia), no se escribe código por pieza: se escribe el
  guion y `pipeline/make-piece.mjs <id>` arma la pieza. La crítica hasta 8+ se hace sobre la plantilla, no por pieza.
- **El bucle de §02, en orden:** `check.mjs` (crítica automática) → arreglar lo que marque → `sheet.mjs --at …` y
  mirar la hoja → puntuar 1–10 → arreglar los 3 peores → repetir; el render completo solo con todo en 8+.
- **Motor** (`engine/motion/`, se corre desde la carpeta de la película):
  - `check.mjs`, `render.mjs` (`--draft` para mirar), `sheet.mjs` (un cuadro por pulso o `--at`, más el póster), `beats.py` y `sfx.mjs`;
  - `mix.mjs` (−14 LUFS) y `critique.sh` (contact, strip, phone, loop y determinismo);
  - `critique-pass.txt`.
- **Producción en la parrilla.**
  - Primero se registra el pedido: `ID=$(node engine/cli/job.mjs producir <formato> --tipo=… --titulo="…" --solo-registrar)`.
  - Las etapas de Claude se marcan con `job.mjs etapa $ID <etapa> --empezar|--avance 0.5|--listo`.
  - Al final se produce con `node engine/cli/job.mjs producir --trabajo=$ID --solo=<id>`, en segundo plano. Hace render, sonido, mezcla, revisión y entrega, y deja `<formato>/output/<id>.mp4` con `.contact.png` y `.poster.png`.
- **Claves:** van en `.env.local` y en el prompt se nombra la variable («the ElevenLabs key is ELEVENLABS_API_KEY in .env»).

## Inputs to collect first
Product + URL, duration, formats (9:16 / 1:1 / 16:9), brand colors + fonts, a reference (frame, video or image folder),
music (file or "synthesize").

(En Studio, los colores y las fuentes salen de `brands/<marca>/brand.json`; el tema y los datos verificados, de la ficha
de la pieza en la parrilla.)

## Pipeline
1. Gather assets from the URL with Playwright into ./assets. List them.
2. If a reference exists, write docs/style_guide.md from it.
3. Measure or synthesize music. beats.py → beats.json.
4. Write docs/shotlist.md on the beat grid. Show it and wait for OK.
5. Build index.html with window.seek(t) using lib/motion.js springs. Formats from a layout function.
6. Contact sheet → critique-pass (see critique-pass.txt) → fix.
7. node render.mjs → sfx.mjs → mix to -14 LUFS → out/final.mp4, all formats.
8. Deliver final.mp4, contact.png, poster.png. Say what you'd improve next.

## Hard rules
- Real product UI only. Never invent screens.
- No Math.random, no timers, no CSS transitions in render mode.
- Banned: corner labels, centered title on gradient, everything fading in.

## Prompts del curso para arrancar

**Prompt de marca** (§04):

```text
Make a dynamic 20-second motion graphics video for [PRODUCT] ([URL]), with the energy
of a motion designer's showreel. Go all out.

Assets
- Visit the site. Use real screenshots (Playwright), the real logo, real colors and fonts.
  Save everything to ./assets and list what you found before you animate.
- Never redraw the product UI from imagination. Crop and animate the real screenshots.

Story (one beat each, 2 to 4 seconds)
1. Hook: the problem in 5 words of huge kinetic type.
2. The product appears, the UI assembles itself piece by piece.
3. Three features, each as a UI moment with a cursor doing a real action.
4. One number that proves it works: [METRIC].
5. Logo lockup + [CTA].

Sound
- Original music, 120 BPM, synthesized in code. UI clicks and whooshes on the beat.

Format: 1080x1920 (9:16) first, then 1:1 and 16:9 from the same timeline.
Before the full render, show me a contact sheet of one frame per beat.
```

**Prompt de referencia** (§05):

```text
Reference: ./refs/launch.mp4 (and ./refs/frames/*.png)

1. Extract one frame every 0.5s with ffmpeg. Study them.
2. Write ./docs/style_guide.md: palette (hex), type (family, weight, tracking),
   shot lengths, transition types, camera moves, texture/grain, how text enters.
3. Write ./docs/shotlist.md for a [DURATION]s video about [SUBJECT] in that style.
   Take the grammar of the reference.
4. Show me both files. Wait for my OK before any code.
```

**Spec por estados** (§06):
- Plantilla XML completa en `docs/motion-studio-movez.md` §06.
- Partes: `<inputs>`, `<direction>`, `<structure>`, `<build>`, `<gotchas>` y `<start>`.

**Director's brief** (§10) para películas largas o de varias sesiones:
- Plantilla en `docs/motion-studio-movez.md` §10.
- Gates en este orden:
  1. plan;
  2. rig;
  3. stills;
  4. animatic a 960×540;
  5. full pass;
  6. polish;
  7. audio;
  8. render.
- Por capítulo hay un subagente; `docs/ANIMATION_GUIDE.md` les da a todos el mismo estilo y `docs/STORYBOARD.md` se escribe después de la primera generación.

**Esfuerzo:** medium para correcciones pequeñas y re-renders, xhigh para películas nuevas y max cuando los 3 primeros
segundos tienen que cargar un lanzamiento.
