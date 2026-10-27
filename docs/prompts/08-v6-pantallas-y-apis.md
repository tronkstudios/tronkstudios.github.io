# v6: todas las pantallas y APIs de YouTube y Roblox

- **Fecha:** 15 de octubre de 2026
- **Herramienta:** Claude Code (Claude, de Anthropic)
- **Commit o PR relacionado:** `d77bc5f` (v6, PR #36) y `1f69227` (YouTube y Roblox)

## Qué necesitábamos

Que la web se viera bien en cualquier tamaño de pantalla y que tuviera datos en directo, no solo texto.

## El prompt

```
ahora quiero mejorar como se ven las tarjetas de los juegos en movil, ademas de esto  Web instalable en el móvil (PWA): se añade como una app y los minijuegos funcionan sin internet.

11. Versión en inglés, para llegar a mucha más gente.
```

```
que mas hacemos, le ponemos alguna api? me gustaria tambien hacer que la web se adapte a cada resolucion de pantalla haz una nueva versión, la v6
```

```
la de yt y la de roblox
```

## Qué hicimos con la respuesta

- **Aceptado:** la v6 con diseño para todas las pantallas, la app instalable (PWA con service worker), la versión en inglés (js/i18n.js) y los últimos vídeos de YouTube y los datos de Roblox, pedidos a través del Worker para no exponer claves.
- **Cambiado por nosotros:** probamos las rutas del Worker nosotros (`/health`, `/youtube`) y pegamos los errores hasta que funcionaron.
- **Descartado y por qué:** otras APIs que salieron como idea; nos quedamos con las dos que tienen que ver con nuestros juegos.
