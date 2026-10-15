# Changelog

Historia de la web de TronkStudios agrupada por versiones. Cada versión
resume los commits de esa etapa, que se pueden ver en el historial de GitHub.

## [v7] · Octubre de 2026 · Perfiles, deseados y clasificación

### Añadido
- **Perfiles**: avatar, nombre, biografía, fecha de alta, ideas, votos recibidos,
  insignias, lista de deseados y récords. Se editan desde «Cuenta → Ver mi perfil»
  y se abren pulsando el nombre de alguien en Comunidad o en la clasificación.
- **Lista de deseados** y **«Avísame cuando salga»** en la ficha de cada juego,
  con cuántas personas lo tienen en su lista.
- **Avisos por correo** del lanzamiento, enviados por el Worker una vez al día.
- **Récords en la cuenta**: al acabar una partida con sesión iniciada; al entrar se
  suben los récords que ya había en el navegador. Tronk Fight cuenta victorias contra el bot.
- **Clasificación** de los 4 minijuegos (los 10 mejores).
- **10 insignias** calculadas con datos reales (Fundador, Primera idea, Fan...).
- Botones de **tienda** en la ficha cuando un juego tiene `stores` (Steam, itch.io...).
- `docs/supabase/plataforma.sql` con las tablas y sus reglas de seguridad.

### Cambiado
- Tronker añade Tronk Fight y explica que con sesión los récords se guardan en la cuenta.

## [v6.1] · Octubre de 2026 · Logo animado

### Cambiado
- El logo de la portada entra con un zoom, flota, su brillo azul late y le cruza
  un reflejo de luz cada pocos segundos (sin animación con «reducir movimiento»).
- The Sundered Sky aparece con la plataforma PC.
- Las cifras de la portada son reales: «juegos finalizados» y «juegos en desarrollo»
  se cuentan solas a partir de las tarjetas de cada sección.

### Quitado
- La sección «Nuestras Aplicaciones», su enlace del menú y la categoría
  Aplicación/Aplicaciones de las sugerencias y del soporte.

## [v6] · Octubre de 2026 · Portada, fichas, comunidad y diario

### Añadido
- **Portada nueva**: logo, frase «Videojuegos y determinación», botones
  «Explorar los juegos» y «Jugar minijuegos», y un fondo de partículas
  (`js/hero.js`) que solo se anima cuando la portada se ve y respeta
  «reducir movimiento».
- **Fichas completas** de los juegos en desarrollo: género, plataformas, estado, lanzamiento estimado y capturas (miniaturas que se ven
  en grande). Los datos rápidos también salen en la tarjeta.
- **Diario de desarrollo** (sección Novedades) con fechas y etiquetas
  Desarrollo, Actualización y Anuncio, filtros y «Ver entradas anteriores».
- **Sobre TronkStudios**: qué es el estudio, qué juegos creamos, qué nos
  diferencia, objetivos y tecnologías.

### Cambiado
- **Comunidad**: resumen de ideas y votos, ordenar por «Más votadas» o
  «Más recientes» y aviso para crear una cuenta. Sin sesión, «Sugerir una idea»
  y votar abren directamente la ventana de Cuenta.

## [v5.5] · Octubre de 2026 · Nuevo orden de secciones

### Cambiado
- **Juegos en desarrollo** pasa a ser la primera sección de la página.
- **Minijuegos** se mueve al final, justo encima de Comunidad (sugerencias).
- El menú de navegación sigue el mismo orden: En desarrollo, Nuestros Juegos,
  Aplicaciones, Roblox, Minijuegos, Comunidad y Sobre nosotros.

## [v5.4] · Octubre de 2026 · Quitar votos en sugerencias

### Cambiado
- En Sugerencias, si ya has votado una idea, al pulsar otra vez 👍 se quita tu voto
  en lugar de mostrar «Ya votaste».
- Nueva función `unvote_suggestion` de Supabase en `docs/supabase/votos.sql`.

## [v5.3] · Octubre de 2026 · Tronk Fight en móvil

### Cambiado
- En móvil y tablet, la ventana de Tronk Fight ocupa toda la pantalla.
- Los controles táctiles van fuera de la imagen del juego: a los lados en horizontal
  y debajo en vertical, para que no tapen a los luchadores.
- Con dos jugadores, cada uno tiene su mando en su lado de la pantalla.

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
