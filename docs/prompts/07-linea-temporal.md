# «Cómo lo hicimos» como línea temporal

- **Fecha:** 15 de octubre de 2026
- **Herramienta:** Claude Code (Claude, de Anthropic)
- **Commit o PR relacionado:** `ab9d60c`, PR #32

## Qué necesitábamos

Contar cómo se hizo la web sin soltar un texto enorme de golpe, y poder cambiar las fechas de estreno sin tocar código.

## El prompt

```
antes, haz que en la parte de como lo hicimos pon el proceso entero, desde el inicio hasta que creamos una web funcional que nos sirviera, y que no alga todo de colpe sino que sea como una linea temporal que al pulsar una flecha va saliendo la siguiente parte, y en lo de diario de desarrollo haz que se pueda ocultar, y que yo pueda modificar fechasd e estreno y que esos cambios se notifiquen a los usuarios
```

## Qué hicimos con la respuesta

- **Aceptado:** línea temporal con flechas (js/journey.js), diario de desarrollo plegable y fechas de estreno editables desde el panel del equipo, con aviso a quien sigue el juego.
- **Cambiado por nosotros:** quitamos después el texto de ejemplo del aviso y que el equipo eligiera a quién le llega: ahora llega a todos los que siguen el juego.
- **Descartado y por qué:** nada.
