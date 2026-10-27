# ADR 0003 · Estilos por partes y minijuegos que se cargan al abrirlos

- **Estado:** aceptada
- **Fecha:** 27 de octubre de 2026

## Contexto

La corrección del proyecto señaló tres problemas de rendimiento y arquitectura:

- `index.html` pesaba **158 KB** y `css/styles.css` **157 KB**.
- La portada cargaba **más de 30 scripts** al entrar, aunque nadie jugara.
- No había ninguna medición de Lighthouse.

Medimos la portada con Lighthouse en modo móvil (servidor local con gzip,
como GitHub Pages): **31 de rendimiento**, 40,9 s de bloqueo del hilo
principal (TBT) y 7,2 s hasta el elemento más grande (LCP). Lo que más
pesaba:

| Qué | Peso | Cuándo hacía falta |
| --- | --- | --- |
| Three.js (mascota 3D) | 672 KB | Nunca para leer la página |
| Los 5 minijuegos + sonido | ~330 KB de JS | Solo al abrir un juego |
| Diccionario de inglés | 110 KB | Solo si la web va en inglés |
| Logo en base64 dentro del HTML | 28 KB | Se podía cachear como archivo |
| Supabase sin `defer` | — | Frenaba el primer dibujo |

## Decisión

1. **Minijuegos bajo demanda** (`js/games/loader.js`). La ventana de cada juego
   pasa de `index.html` a una plantilla en `partials/<juego>.html`. Al pulsar
   una tarjeta `[data-minigame]` (o al pasar el ratón por encima), el cargador
   descarga la plantilla, `css/minijuegos.css`, `js/games/audio.js` y el código
   del juego, arranca el juego y repite el clic. Los enlaces `?jugar=` y los
   retos siguen funcionando porque solo hacen `card.click()`. Cuando llega una
   ventana nueva se lanza el evento `tronk:game-added`, que escuchan
   `js/extras.js` (pantalla completa) y `js/mascot.js`.
2. **Estilos por partes.** `styles.css` se divide, sin cambiar ninguna regla
   ni su orden, en 8 archivos por tema (`base`, `secciones`, `soporte`,
   `portada`, `plataforma`, `contenido`, `extras` y `funciones`) que
   `index.html` carga en ese orden. Lo exclusivo de los minijuegos va a
   `css/minijuegos.css`, que se carga con ellos. El archivo más grande pasa a
   pesar 26 KB.
3. **Inglés aparte.** `js/i18n.js` se queda con el traductor (7 KB) y el
   diccionario va a `js/i18n-en.js`, que solo se descarga en inglés.
   `js/view-early.js` lo precarga y oculta la página hasta que está traducida,
   para que no se vea un momento en español.
4. **Three.js al interactuar.** Hasta que el visitante mueve el ratón, toca,
   hace scroll o pulsa una tecla (o pasan 12 s) se ve la imagen del robot.
5. **Imágenes.** Todas las capturas pasan a WebP (de 0,8–1 MB a 20–120 KB),
   con miniaturas en `img/juegos/mini/` para las tarjetas, `loading` en todas
   las imágenes y `width`/`height` para que no se mueva la página.

## Resultado

Lighthouse de la portada (ver `docs/lighthouse/`):

| | Antes | Después |
| --- | --- | --- |
| Rendimiento (móvil) | 31 | **96** |
| Rendimiento (escritorio) | 78 | **100** |
| Accesibilidad | 96 | **100** |
| SEO | 100 | 100 |
| TBT (móvil) | 40,9 s | 0,09 s |
| LCP (móvil) | 7,2 s | 2,5 s |
| `index.html` | 158 KB | 109 KB |

## Alternativas descartadas

- **Pasar todo a módulos ES de golpe.** Seguimos con los scripts clásicos del
  ADR 0002: comparten cientos de funciones globales y reescribirlo todo a la vez
  podía romper los minijuegos. El cargador ya consigue lo importante (no
  descargar lo que no se usa). Lo nuevo puede ir como módulo, como ya hace la
  mascota (`js/mascot.js`).
- **Un empaquetador (Vite, webpack).** Añadiría un paso de compilación que
  GitHub Pages no hace solo.
- **Cargar estilos no críticos en diferido.** Muchas ventanas están ocultas
  con reglas de esos mismos estilos: si llegaran tarde, se verían un instante
  sin estilo.
