# Iconos y avatares propios, sin emojis

- **Fecha:** 15 de octubre de 2026
- **Herramienta:** Claude Code (Claude, de Anthropic)
- **Commit o PR relacionado:** `15ef980`, PR #30

## Qué necesitábamos

La comunidad usaba emojis para todo y se veía genérico. Queríamos una identidad propia.

## El prompt

```
aplica los cambios de comunidad que me ha gustado, tambien, deja de usar emojis para casi todo, haz inconos tú, fotos de perfil, tú
```

## Qué hicimos con la respuesta

- **Aceptado:** un sprite de iconos SVG dibujados a mano (`<symbol>` en index.html, `makeIcon()` en core.js) y avatares SVG propios; estados de las ideas, panel del equipo, encuestas y notificaciones.
- **Cambiado por nosotros:** después pedimos muchos más avatares, que todos tuvieran cuerpo y arreglar varios que no se veían bien (el mago, la rana, el chef, el caballero).
- **Descartado y por qué:** nada importante; algún avatar se rehízo varias veces hasta que nos gustó.
