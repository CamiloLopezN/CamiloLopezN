# Guía de Estilo Extraída por Ingeniería Inversa (`yt-dlp` + `ffmpeg 2 fps`)

## 1. Paleta Cromática (Cero Color de Fábrica de Claude)
- **Fondo Principal (`Canvas`):** `#F7F6F3` (Blanco cálido papel Notion) y `#FFFFFF` (Tarjetas de interfaz).
- **Tinta Principal (`Ink`):** `#111111` (Negro editorial de alto contraste).
- **Tinta Secundaria / Bordes:** `#787774` (Gris medio) y `#E6E5E1` (Borde fino de 1.5px).
- **Acento Único de Marca:** `#2383E2` (Azul Notion oficial) + `#E8F3FC` (Pastilla azul suave para palabra clave).

## 2. Tipografía y Jerarquía
- **Titulares (`Display`):** `Inter` 700 / 800, tracking `-0.03em`, entrada palabra por palabra con máscara vertical y resorte crítico (`k=210, c=24`).
- **Interfaz y Etiquetas (`UI`):** `Inter` 500 / 600, tamaño `18px–24px`.
- **Metadatos Técnicos (`Mono`):** `DejaVuSansMono` 500, `15px`.

## 3. Ritmo de Planos y Movimiento de Cámara
- **Duración media de plano:** `3.2s – 4.5s` (cortes guiados por la acción del cursor y paneos con resorte).
- **Movimientos de cámara:** Paneo y zoom continuo en 2.5D (`scale 1.0 -> 1.28`) siguiendo al cursor sobre capturas reales de `notion.com`.
- **Sombra de tarjetas:** `rgba(17, 17, 17, 0.08)`, `blur 36px`, `offsetY 16px`.
