# Música distinta para cada minijuego

- **Fecha:** 19 de octubre de 2026
- **Herramienta:** Claude Code (Claude, de Anthropic)
- **Commit o PR relacionado:** `00c3d3c`, PR #50

## Qué necesitábamos

Todos los minijuegos sonaban igual.

## El prompt

```
quiero que cada minijuego tenga una musica distinta, en funcion del tipo de juego que sea y quiero que el ninja morado de protect mogos haga un sonido como de esquive
```

## Qué hicimos con la respuesta

- **Aceptado:** música generada con Web Audio (js/games/audio.js) distinta para cada juego y el sonido de esquive del ninja morado, sin archivos de audio que descargar.
- **Cambiado por nosotros:** nada.
- **Descartado y por qué:** nada.
