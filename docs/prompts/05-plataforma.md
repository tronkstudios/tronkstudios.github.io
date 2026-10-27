# Convertir la web en una plataforma

- **Fecha:** 15 de octubre de 2026
- **Herramienta:** Claude Code (Claude, de Anthropic)
- **Commit o PR relacionado:** `765b304` (portada, fichas, comunidad, diario) y `9181f76` (perfiles, deseados, avisos y clasificación)

## Qué necesitábamos

La web solo enseñaba los juegos. Queríamos que la gente tuviera cuenta y una razón para volver: guardar juegos, recibir avisos y aparecer en una clasificación.

## El prompt

```
hacemos que esta pagina sea una plataforma en la que comprar lista de deseados, perfiles y todo eso
```

```
haz todo eso pues
```

## Qué hicimos con la respuesta

- **Aceptado:** perfiles con avatar, lista de deseados, «avísame cuando salga», récords guardados en la cuenta y clasificación, todo con Supabase y sus políticas de seguridad (RLS).
- **Cambiado por nosotros:** antes pedimos quitar la sección de aplicaciones y que las cifras de la portada salieran de los datos reales, no inventadas.
- **Descartado y por qué:** la «tienda» con compras: no vendemos nada todavía, así que se quedó en enlaces a Roblox y Steam.
