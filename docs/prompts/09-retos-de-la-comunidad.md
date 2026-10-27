# Retos de la comunidad

- **Fecha:** 16 de octubre de 2026
- **Herramienta:** Claude Code (Claude, de Anthropic)
- **Commit o PR relacionado:** `2cfe9d4`, PR #40

## Qué necesitábamos

Que jugar a los minijuegos sumara para algo común y la gente jugara junta.

## El prompt

```
Retos de la comunidad: “entre todos, derrotad 10.000 ninjas esta semana”, con una barra que se llena con las partidas de todos.
```

## Qué hicimos con la respuesta

- **Aceptado:** retos con barra de progreso que suma las partidas de todos (Supabase), creados desde el panel del equipo.
- **Cambiado por nosotros:** después pedimos que el porcentaje fuera exacto (hasta 10 decimales) porque con números pequeños se quedaba en 0 %, y una ficha de cada reto con los mejores contribuidores.
- **Descartado y por qué:** nada.
