# Changelog

Historia de la web de TronkStudios agrupada por versiones. Cada versión
resume los commits de esa etapa, que se pueden ver en el historial de GitHub.

## [v5.2] · Octubre de 2026 · Tronk Fight a dos jugadores

### Añadido
- Modo **Dos jugadores** en Tronk Fight, además del modo contra el bot.
- En ordenador, los dos juegan en el mismo teclado: J1 con WASD + J K L I y J2 con
  las flechas + , . - y Mayús derecha (o el teclado numérico).
- En móvil y tablet, cada jugador tiene su propio mando en su mitad de la pantalla.
- El marcador indica quién es J1 y J2, y el resultado muestra las estadísticas de los dos.

## [v5.1] · Octubre de 2026 · Tronk Fight dentro de la web

### Cambiado
- Tronk Fight se abre en una ventana dentro de la web, como Antitronks, Protect Mogos
  y Stick Drill, en vez de en una página aparte (`juegos/tronk-fight/` se elimina).
- Código en `js/games/tronk-fight.js` y estilos en `css/tronk-fight.css`, con prefijo `tf-`.
- Usa el botón de sonido común de los minijuegos.

### Quitado
- El presentador con voz sintética; los momentos clave se marcan con efectos de estadio.

## [v5] · Octubre de 2026 · Tronk Fight

### Añadido
- Nuevo minijuego **Tronk Fight** en `juegos/tronk-fight/`: duelo 2D de stickmans con 7 luchadores
  (Ranjay, Omogos, Finillos, Yant, Sulius, Chambas y Quizo), cada uno con su arma y su ataque especial.
- Parrys, esquivas, guardia que se rompe, sistema K.O. al mejor de 3 rondas, bot con 3 dificultades,
  5 escenarios y controles táctiles para móvil.
- Golpes por contacto real entre el arma y el cuerpo (el arma no atraviesa al rival).
- Sangre (desactivable), sonido sintetizado, música de combate y presentador.
- Equilibrado con miles de combates simulados de bot contra bot.
- Tarjeta del juego en la sección Minijuegos.

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
