# Los 6 Prompts Progresivos del Estudio (Claude Code + Opus 5.5)

## Galería de Referencias de Lanzamientos en X
- **What Ships:** https://whatships.com (`Discover startup launch videos from X` — clic en `Original on X` para ver autor y post original)

---

## Prueba 1 · App de Delivery en Crudo (Sin `CLAUDE.md`)
```text
Haz un video de motion graphics de 10 segundos de una app de domicilios siguiendo un pedido: el pedido se confirma, la moto sale del restaurante, cruza el mapa hasta la casa y el contador de minutos baja hasta cero. Renderiza en MP4 y guárdalo en resultados/01-delivery-crudo.mp4. No uses HyperFrames, ni Remotion, ni ninguna skill. Créalo de tu manera natural en HTML, CSS, SVG y JS.
```

---

## Prueba 2 · App de Delivery CON Reglas (`CLAUDE.md` + Hoja de Contacto + Tabla de Notas)
```text
Haz un video de motion graphics de 10 segundos de una app de domicilios siguiendo un pedido: el pedido se confirma, la moto sale del restaurante, cruza el mapa hasta la casa y el contador de minutos baja hasta cero. Renderiza en MP4 y guárdalo en resultados/02-delivery-con-reglas.mp4.

No uses HyperFrames, ni Remotion, ni ninguna skill. Créalo de tu manera natural siguiendo CLAUDE.md.

Importante:
- Este es un proyecto nuevo. Crea todo en una carpeta nueva llamada delivery-con-reglas/ y trabaja solo dentro de ella.
- No borres ni sobrescribas resultados/01-delivery-crudo.mp4.
- Guarda también la hoja de contacto en resultados/02-hoja-de-contacto.png y muéstrame la tabla de calificaciones (1-10) de cada ronda antes del video final.
```

---

## Prueba 3 · Showreel de Motion Designer (15 segundos)
```text
Haz un video de motion graphics dinámico de 15 segundos que muestre el increíble motion designer que eres, como si fuera tu showreel para un portafolio. Ve con todo.
Guárdalo en resultados/03-showreel.mp4.
No uses HyperFrames ni librerías externas. Sigue las instrucciones de CLAUDE.md, guarda la hoja de contacto en resultados/03-hoja-de-contacto.png y muéstrame la tabla de notas de cada ronda antes del render final.
```

---

## Prueba 4 · Ingeniería Inversa de una Referencia (`yt-dlp` + `ffmpeg` + `whatships.com`)
```text
Referencia: [URL_DEL_VIDEO_EN_X_DESDE_WHATSHIPS_COM]

1. Descarga el video con yt-dlp en notion-referencia/ref.mp4 y extrae un cuadro cada 0.5s con ffmpeg en notion-referencia/ref/frames/. Estudia los cuadros.
2. Escribe notion-referencia/docs/guia-de-estilo.md: paleta (hex), tipografía (familia, peso, espaciado), duración de planos, tipos de transición, movimientos de cámara, textura y cómo entra y sale el texto.
3. Escribe notion-referencia/docs/lista-de-planos.md para un video de lanzamiento de 15s, 16:9, sobre Notion (https://www.notion.com) EN ESE estilo. Usa capturas de pantalla y logo reales del sitio. Toma la gramática visual de la referencia.
4. Muéstrame los dos archivos y espera mi OK antes de escribir cualquier línea de código. Cuando apruebe, renderiza en resultados/04-con-referencia.mp4.
```

---

## Prueba 5 · Lanzamiento de Marca Real con Playwright (5 Actos · 16:9 y 9:16)
```text
Haz un video de motion graphics dinámico de 20 segundos para Notion (https://www.notion.com), con la energía del showreel de un motion designer. Ve con todo.

Materiales:
- Visita el sitio con Playwright. Usa capturas de pantalla reales, el logo real, los colores y las fuentes reales. Guarda todo en notion/assets y lista lo que encontraste antes de animar.
- Nunca redibujes la interfaz del producto desde la imaginación. Recorta y anima las capturas reales.

Historia (un momento por pulso, de 2 a 4 segundos cada uno):
1. Gancho: el problema en 5 palabras de tipografía cinética enorme ("Mil pestañas abiertas. Ninguna respuesta.").
2. El producto aparece, la interfaz se arma pieza por pieza.
3. Tres funciones clave, cada una como un momento de interfaz con un cursor haciendo una acción real.
4. Un número real publicado en el sitio que pruebe su escala ("100 millones de usuarios en más de 50 países"). Si no hay cifra publicada, omite este acto y no inventes.
5. Cierre con el logo oficial + "notion.com".

Sonido:
- Música original a 120 BPM sintetizada en código. Clics y whooshes de interfaz en el pulso.

Formato: 1920x1080 (16:9) primero, y luego 1080x1920 (9:16) desde la misma línea de tiempo.
Antes del render completo, muéstrame la hoja de contacto de un cuadro por pulso. Guarda en resultados/05-marca-real.mp4.
```

---

## Prueba 6 · El Prompt Maestro en XML (Un Contenedor que Nunca Corta · `track(t)`)
```xml
<entradas>
Producto: Notion (https://www.notion.com). Usa como frase del producto el titular principal del sitio.
Toma el logo real, los colores de marca, las fuentes y las capturas de interfaz con Playwright. Elige un color de acento de la marca.
Música: sintetiza una pista original en código a 120 BPM.
Formato: 1920x1080 (16:9).
</entradas>

<direccion>
Película de producto con interfaz en movimiento. Un único contenedor que nunca corta: cada estado es el mismo elemento cambiando de tamaño, radio de borde y relleno, mientras el contenido se intercambia detrás de un desenfoque corto. Un cursor conduce cada cambio. Fondo neutro cálido, un color de acento. Resortes con mínimo sobreimpulso. Prohibido: rebotes exagerados, brillos neón, degradados en bordes de UI, explosiones de partículas, tiempo muerto.
</direccion>

<estructura>
120 BPM, 8 compases, algo ocurre en cada pulso.
logo + página en blanco con título escribiéndose ("Plan de lanzamiento") -> la página se transforma en un tablero Kanban de tres columnas ("Por hacer", "En curso", "Listo") -> el cursor arrastra la tarjeta "Escribir anuncio" de "Por hacer" a "En curso" -> la tarjeta se abre y se marca una casilla de verificación -> la tarjeta pasa a "Listo" -> el tablero se encoge y se convierte en el botón "Compartir" -> logo + notion.com.
</estructura>

<construccion>
1. Un archivo HTML, un canvas, window.seek(t). Sin transiciones CSS, sin timers, sin estado arrastrado entre cuadros.
2. Resortes en forma cerrada (track(t)): un valor con múltiples objetivos es la suma de un resorte por cambio.
3. El texto dentro de un contenedor que se transforma sale antes de encoger y entra después de empezar a abrir.
4. Indicadores de pestañas: borde delantero y trasero en resortes distintos para que se crucen con elasticidad.
5. Rejilla de pulsos medida en código (120 BPM). Sonidos de UI clavados en el pulso.
6. Muéstrame primero la tabla de estados en la rejilla de pulsos antes de escribir código. Cuando dé el OK, renderiza a 60 fps con motion blur de 4 subcuadros en resultados/06-xml-maestro.mp4.
</construccion>
```
