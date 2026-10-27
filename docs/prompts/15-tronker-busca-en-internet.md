# Tronker con Groq y búsqueda con Tavily

- **Fecha:** 22 de octubre de 2026
- **Herramienta:** Claude Code (Claude, de Anthropic)
- **Commit o PR relacionado:** `20a4518`, PR #66

## Qué necesitábamos

La IA de Tronker no sabía responder a cosas actuales.

## El prompt

```
hay apis gratuitas de ia mejores que la que hemos puesto, que buscan en internet
```

```
he encontrado groq y tavily
```

## Qué hicimos con la respuesta

- **Aceptado:** el Worker usa Groq para responder y Tavily para buscar en internet cuando la pregunta es de actualidad (documentado en el README).
- **Cambiado por nosotros:** las dos APIs las encontramos nosotros; la IA las conectó.
- **Descartado y por qué:** nada.
