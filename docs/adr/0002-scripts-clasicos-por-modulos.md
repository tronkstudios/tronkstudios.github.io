# ADR 0002 · Scripts clásicos divididos por responsabilidad

- **Estado:** aceptada
- **Fecha:** octubre de 2026

## Contexto

Todo el JavaScript de la web estaba en un solo `script.js` de unas
**8.000 líneas**: cuentas, sugerencias, tema, los tres minijuegos y la navegación.
Encontrar algo costaba mucho, cualquier cambio tocaba el mismo archivo y en
el historial de git no se veía qué parte había cambiado.

## Decisión

Dividirlo en **11 archivos por responsabilidad** (ver la estructura del README)
y cargarlos como **scripts clásicos con `defer`**, en un orden fijo en `index.html`.

Con `defer`, el navegador descarga todos los archivos a la vez pero los
**ejecuta en el orden en que aparecen**, después de leer el HTML. Las variables
y funciones de nivel superior de un script clásico se comparten con los
siguientes, así que el comportamiento es **idéntico** al del archivo único:
el código no ha cambiado, solo se ha repartido.

Reglas que hay que respetar:

1. `core.js` va primero, porque crea las variables que usan todos los demás.
2. `app.js` va último, porque es el que **arranca** todo (`initializeProjects()`,
   `initializeStickDrillGame()`...), y para entonces ya están cargadas todas las funciones.
3. El código de nivel superior de un archivo solo puede llamar a funciones
   de ese archivo o de los anteriores.

## Alternativas descartadas

- **ES modules (`type="module"` con `import`/`export`)**: es lo ideal a largo
  plazo, pero obligaría a reescribir cómo se comparten cientos de variables
  entre archivos. Hacerlo de golpe tenía mucho riesgo de romper los minijuegos.
  Queda como siguiente paso, archivo a archivo.
- **Un empaquetador (Vite, webpack)**: añade un paso de compilación que GitHub
  Pages no hace solo. Para una web de este tamaño no compensa.

## Cómo se comprobó

Se cargó la versión antigua y la nueva en Chromium y se compararon los mensajes
de la consola: en las dos aparecen «script cargado correctamente» e
«inicialización completada», sin errores nuevos, y los minijuegos y la ficha
de Z Tronks se abren igual.

## Consecuencias

- 👍 Cada archivo tiene un solo tema y es fácil encontrar las cosas.
- 👍 Los commits dicen qué parte cambió (por ejemplo, solo `js/games/stick-drill.js`).
- 👎 El orden de los `<script>` en `index.html` importa y no hay que cambiarlo sin pensar.
- 👎 Siguen existiendo variables globales compartidas; los ES modules lo resolverían.
