# La CLI tareas sobre la web

- **Fecha:** 16/11/2026
- **Herramienta:** Claude Code (Claude, de Anthropic) y nuestra CLI `tareas` (github.com/tronkstudios/cli-tareas)
- **Commit o PR relacionado:** ver CHANGELOG 6.43

## Qué necesitábamos

Probar con la web de verdad la herramienta de terminal que hicimos para el
proyecto de clase, y arreglar lo que encontrara.

## El prompt

```
Ahora aprovecha y usa esta herramienta que tú has creado para mejorar lo de Tronc Studios con más facilidad.
```

## Qué hicimos con la respuesta

- **Aceptado:**
  - `tareas ejecutar revisar-pesos`: solo avisó de `video/tronk-survivors.mp4`
    (357 KB), por encima de los 300 KB del ADR 0003. Se volvió a codificar a
    170 kbps en dos pasadas: 258 KB (−28 %), mismo tamaño, duración y
    fotogramas, sin diferencia visible.
  - `tareas ejecutar subir-cache`: `CACHE_VERSION` de 6 a 7, para que nadie se
    quede con el vídeo viejo guardado.
  - `tareas ejecutar nuevo-prompt`: creó este archivo con el número y la fecha.
  - `tareas ejecutar limpiar-basura --simular`: no había nada que limpiar.
- **Cambiado por nosotros:** `revisar-pesos` usaba 200 KB también para los
  vídeos; en `acciones.json` de la CLI separamos imágenes (200 KB) y vídeos
  (300 KB), sin tocar su código.
- **Descartado y por qué:** `borrador-changelog` (con IA): los modelos del
  centro no respondían ese día; la entrada del CHANGELOG se escribió a mano.
