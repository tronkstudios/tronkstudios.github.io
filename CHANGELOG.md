# Changelog

Historia de la web de TronkStudios agrupada por versiones. Cada versión
resume los commits de esa etapa, que se pueden ver en el historial de GitHub.

## [v4] · Octubre de 2026 · Orden y documentación

### Cambiado
- `script.js` (≈8.000 líneas) dividido en 11 archivos dentro de `js/`
  y `js/games/` (ver `docs/adr/0002`).
- CSS movido a `css/` e imágenes de los juegos a `img/juegos/`.

### Añadido
- Respuesta automática por correo al visitante cuando usa el formulario de soporte.
- Tráiler de Z Tronks en su tarjeta y en su ficha («Ver trailer»), con volumen y pantalla completa.
- Se quita «Nuestros vídeos» de Sobre nosotros: el único vídeo era el tráiler, que ya sale en Z Tronks.
- Sección «Sobre nosotros» ampliada: vídeos del canal de
  YouTube y «Cómo lo hicimos» con problemas reales, su solución y su resultado.
- Ese contenido queda plegado en un desplegable «Más información» (`<details>` nativo, accesible con teclado).
- `README.md`, decisiones de arquitectura (`docs/adr/`), plantillas de issues
  y pull requests y archivo de prompts (`docs/prompts/`).

## [v3] · 29 de septiembre de 2026 · Móvil, IA y seguridad

- Stick Drill jugable en el móvil, con joysticks táctiles («drill mobile», «joysticks fix», «drill fix and github»).
- Mejoras de la IA del soporte («ia update») y de las contraseñas («password»).
- Banner del canal de YouTube en la portada («youtube update», «banner»).
- Cambios en el orden de las secciones («order changes»).
- Refuerzo de la seguridad («security update»).

## [v2] · 28 de septiembre de 2026 · Soporte real y fusión de TronkWeb

- Soporte conectado a un backend propio («SuperMegaSupportUpdate», «Conectar soporte con el backend»).
- Corrección de las imágenes que no cargaban en GitHub Pages
  por las mayúsculas en los nombres («Image Fix», «Image bug fix», «arreglo nombre»).
- Vista previa grande al compartir el enlace y en Google («Permitir vista previa grande en Google»).
- Se elimina la carpeta TronkWeb, que ya estaba fusionada («Delete TronkWeb directory»).

## [v1] · Hasta el 26 de septiembre de 2026 · TronkWeb

- Primera versión de la web, desarrollada en el repositorio aparte
  [TronkWeb](https://github.com/tronkstudios/TronkWeb) y fusionada después en este
  («Merge branch 'master' of …/TronkWeb»).
- Mejoras visuales, descripciones y balance de los minijuegos
  («visual upt2», «descriptions update», «cambios balance»).
- Redirección de TronkWeb y nombre definitivo del sitio.
