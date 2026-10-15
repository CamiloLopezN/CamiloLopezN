# Motion studio rules

## Render contract
- Every film is a pure function of time: `window.seek(t)` paints frame `t`.
- No CSS transitions, no setTimeout, no requestAnimationFrame in render mode,
  no state carried between frames. Seeded noise only (`mulberry32`), never `Math.random`.
- Render with `node render.mjs`, encode H.264 `yuv420p`, CRF 16.

## Look
- Banned defaults: centered title on gradient, everything fading in,
  corner labels and frame borders, glow on UI chrome, generic particle bursts.
- One display face, one UI face. One accent color unless the brief says otherwise.
- Every 2 to 4 seconds something new must happen on screen.

## Sound
- Score and SFX are synthesized in code unless a track is supplied.
- Place hits on the measured beat grid (`beats.json`). Loudness `-14 LUFS`.

## Loop before you show me anything
1. Render one frame per beat as a contact sheet (`contact.png`) and LOOK at it.
2. Score it 1-10 on: hook in first 2s, readability at phone size,
   motion quality, variety, brand accuracy, sound sync.
3. Fix the 3 worst problems. Repeat until every score is 8+.
4. Only then do the full render.

---

# Guía comentada en español (línea por línea)

> Este archivo `CLAUDE.md` se coloca en la raíz de tu carpeta de proyecto. Claude Code lo lee automáticamente antes de escribir cualquier línea de código.

1. **Contrato de render (`Render contract`):**
   - Cada película es una función matemática pura del tiempo: `window.seek(t)` dibuja exactamente el segundo `t` (por ejemplo, `window.seek(2.45)`).
   - Se prohíben `CSS transitions`, `setTimeout`, `requestAnimationFrame` en modo render y `Math.random()`. En su lugar se usa ruido con semilla fija (`mulberry32`), para que si renderizas dos veces o en paralelo con varios procesos de Chromium, cada cuadro coincida píxel por píxel.
   - Se codifica con `FFmpeg` en H.264 (`yuv420p`), calidad `CRF 16` y desenfoque de movimiento (`motion blur`) promediando 4 subcuadros por fotograma (`tmix=frames=4`).

2. **Dirección visual (`Look`):**
   - Prohibidos los vicios típicos de IA: título centrado sobre fondo degradado genérico, todo entrando con un simple `fade-in`, etiquetas flotantes en las 4 esquinas, bordes brillantes de neón o explosiones de partículas sin sentido.
   - Máximo dos familias tipográficas (una *display* para titulares cinéticos y una *UI* para interfaz) y un color de acento principal.
   - **Regla del ritmo:** cada 2 a 4 segundos debe ocurrir un cambio visual claro en pantalla.

3. **Sonido (`Sound`):**
   - La música y los efectos (`click`, `pop`, `thump`, `whoosh`, `chime`) se sintetizan en código sobre la rejilla exacta de pulsos (`beats.json`) y se mezclan a `-14 LUFS` (estándar de YouTube, TikTok, Instagram y Spotify).

4. **El bucle obligatorio antes de mostrarte nada (`Loop before you show me anything`):**
   - Antes de renderizar el video completo, Claude debe generar una **hoja de contacto (`contact.png`)** con 1 cuadro por pulso, **abrirla con su herramienta de visión**, calificarse de `1 a 10` en 6 criterios y corregir los 3 peores fallos hasta que todas las notas estén en `8+`.
