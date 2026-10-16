# Changelog

Historia de la web de TronkStudios agrupada por versiones. Cada versión
resume los commits de esa etapa, que se pueden ver en el historial de GitHub.

## [v6] · Octubre de 2026 · La nueva web de TronkStudios

La mayor actualización de la web: portada nueva, perfiles, comunidad con panel
del equipo, app instalable, versión en inglés y diseño que se adapta a cualquier
pantalla. Estas son sus partes, de la más reciente a la primera.

### 6.14 · Tronker: escribiendo o por temas

#### Cambiado
- Al abrir el chat, Tronker pregunta primero **cómo prefieres hablar**: escribiendo
  tus preguntas o eligiendo entre temas. Puedes cambiar de modo cuando quieras.
- El menú ya no tiene una lista larga de opciones: ahora hay **6 temas** (Mi cuenta,
  Juegos y minijuegos, Perfil, retos y comunidad, La web y TronkStudios, Algo no
  funciona y Hablar con el equipo), y cada uno abre sus propias opciones.
- La caja para escribir solo sale en el modo escribiendo.

### 6.13 · Tronker con IA

#### Añadido
- **Tronker responde preguntas escritas** con IA gratis (Workers AI de Cloudflare),
  sin perder los botones de siempre. Si la IA no está disponible, vuelve a los botones.
- Lo que sabe Tronker se ha puesto al día con todo lo nuevo de la web.
- **Sistema de frases** (`js/tronker.js`): sin IA, o cuando se acaba el uso gratis
  del día, Tronker entiende las preguntas escritas y lleva a la conversación
  adecuada. Aguanta faltas de ortografía, tildes, plurales y sinónimos.
- **Conversaciones nuevas** en el guion: juegos en desarrollo (con la fecha
  actualizada), controles de cada minijuego, perfil e insignias, retos, lista de
  deseados, notificaciones, instalar la app, idioma y atajos, Trabaja con nosotros
  y qué es TronkStudios. Hay botones para abrir la ficha de un juego, empezar
  un minijuego o ir a una sección.
- Si escribes mientras Tronker está escribiendo, tu pregunta espera su turno.

#### Arreglado
- Las **× de cerrar** ya no se ven torcidas: ahora son un icono dibujado y centrado.

### 6.12 · Retos de la comunidad y más detalles

#### Añadido
- **Retos de la comunidad** en Minijuegos: una barra que se llena con las partidas
  de todos («entre todos, derrotad 10.000 ninjas esta semana»), con tu aporte y el
  tiempo que queda. El equipo los crea y borra desde la pestaña **Retos** del panel
  (`docs/supabase/retos.sql`).
- **Pantalla completa** en los minijuegos: en el móvil se pone sola al abrir un
  juego; en el ordenador, con un botón nuevo junto al de sonido.
- **Atajos de teclado** en el ordenador: D, J, R, M, S, N y A van a cada sección;
  I vuelve arriba, C abre la cuenta, T cambia el tema y «?» enseña la lista.
- **Sonidos de la interfaz** al pulsar botones, votar, enviar ideas y conseguir
  insignias, con un botón en la cabecera para apagarlos.
- **Aviso de insignia nueva** cuando consigues una.
- **Fondos animados** en cada sección, con dibujos a juego: nubes y zombis en
  En desarrollo, cubos en Roblox, shuriken y mira en Minijuegos, bombillas en
  Comunidad… Solo se mueven cuando la sección se ve, y se paran si el sistema
  pide menos movimiento.
- **Trabaja con nosotros** en Sobre nosotros: arte, música y sonido, programación y
  pruebas. Abre el formulario de soporte con la categoría «Trabajar con nosotros».

### 6.11 · Autor de cada sugerencia

#### Añadido
- Cada sugerencia muestra la **foto de perfil y el nombre de usuario** de quien la
  envió. Al pulsarlos se abre su perfil. Si alguien cambia su foto o su nombre,
  sus ideas se actualizan también.

#### Cambiado
- Con la sesión iniciada ya no hay que escribir el nombre al enviar una idea:
  se firma con el nombre del perfil.

### 6.10 · Shorts en la web

#### Añadido
- Fila propia de **Shorts** en Novedades, con tarjetas verticales que se deslizan
  de lado. Los Shorts ya no ocupan el sitio de los vídeos normales (el tráiler sigue visible).

#### Cambiado
- El Worker marca cada vídeo como Short o no, enlaza los Shorts a `/shorts/` y
  guarda la lista 10 minutos en lugar de 30, así los vídeos nuevos aparecen antes.

### 6.9 · Vídeos de YouTube y datos de Roblox

#### Añadido
- **Últimos vídeos** del canal de YouTube en Novedades, con fecha y visualizaciones.
- **Datos en directo de Roblox** (jugando ahora, visitas, favoritos y «me gusta»)
  en la sección Roblox y en la ficha de cada juego publicado, con botón
  «Jugar en Roblox». Se actualizan cada minuto.
- Rutas `/youtube` y `/roblox` en el Worker, con caché de Cloudflare (`js/apis.js`).

### 6.8 · Se adapta a cada pantalla

#### Cambiado
- **Tablet** (701–1023 px): menú desplegable ☰ en lugar de dos filas de enlaces;
  la cabecera pasa de 164 px a 64 px de alto.
- **Pantallas grandes**: desde 1600 px el contenido se ensancha a 1320 px y la
  letra crece; desde 2200 px, a 1560 px. Antes todo quedaba pequeño en el centro.
- **Móviles muy estrechos** (320–359 px): portada, etiquetas y minijuegos más compactos.
- **Móvil en horizontal**: portada en dos columnas y más baja.
- Versión visible en el pie de la web.

### 6.7 · Móvil, app instalable e inglés

#### Añadido
- **Web instalable** (PWA): `manifest.webmanifest`, iconos, `sw.js` y botón
  «Instalar app». Los minijuegos funcionan **sin internet** y sale un aviso cuando
  no hay conexión.
- **Versión en inglés** con el botón ES / EN de la cabecera (`js/i18n.js`): toda la
  web, el chat de Tronker y los minijuegos.

#### Cambiado
- **Tarjetas de juegos en móvil**: a todo el ancho, portada de borde a borde con
  fondo desenfocado, tráiler plegable y minijuegos en dos columnas con botón de jugar.

### 6.6 · Logo que reacciona y avisos del equipo

#### Añadido
- Al pulsar el **logo flotante** de la portada, gira, salta o tiembla, suelta chispas
  y empuja las partículas del fondo. También funciona con el teclado.
- Pestaña **Avisos** en el panel del equipo: enviar una notificación a todos los
  usuarios (`docs/supabase/avisos.sql`).

### 6.5 · Historia, diario plegable y fechas de estreno

#### Añadido
- **Cómo lo hicimos** pasa a ser una línea temporal con todo el proceso, desde la
  idea hasta la web actual, que va apareciendo paso a paso con una flecha.
- El **diario de desarrollo** se puede ocultar y mostrar (se recuerda en el navegador).
- Pestaña **Lanzamientos** en el panel del equipo: cambiar la fecha de estreno de
  cada juego avisa a quien lo tiene en su lista de deseados
  (`docs/supabase/lanzamientos.sql`).

#### Cambiado
- El perfil solo muestra las insignias conseguidas.

### 6.4 · Comunidad, iconos y avatares

#### Añadido
- **Estado de cada idea** (Pendiente, En estudio, Planeada, Hecha, Descartada),
  **respuesta del equipo** y filtro por estado.
- **Panel del equipo**: estados y respuestas, encuestas, entradas del diario y
  borrar récords falsos (`js/team.js`).
- **Encuestas** en Comunidad, con resultados en directo y voto que se puede cambiar.
- **Notificaciones** en la cabecera: votos de tu idea, cambios de estado,
  respuestas del equipo y récords superados.
- Entradas del **diario** escritas desde el panel, guardadas en Supabase.
- `docs/supabase/comunidad.sql` con tablas, reglas de seguridad y funciones.

#### Cambiado
- **Iconos propios en SVG** en lugar de emojis en toda la web (el de YouTube se mantiene).
- **12 avatares dibujados** para los perfiles en lugar de emojis.

### 6.3 · Aviso de lanzamiento en la web

#### Añadido
- Si pediste «Avísame cuando salga» y el juego ya ha salido, al entrar en la web
  con tu cuenta aparece arriba un aviso con un botón para ver su ficha. Al cerrarlo
  no vuelve a salir en ese navegador. No necesita correo ni dominio.

### 6.2 · Perfiles, deseados y clasificación

#### Añadido
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

#### Cambiado
- Tronker añade Tronk Fight y explica que con sesión los récords se guardan en la cuenta.

### 6.1 · Logo animado

#### Cambiado
- El logo de la portada entra con un zoom, flota, su brillo azul late y le cruza
  un reflejo de luz cada pocos segundos (sin animación con «reducir movimiento»).
- The Sundered Sky aparece con la plataforma PC.
- Las cifras de la portada son reales: «juegos finalizados» y «juegos en desarrollo»
  se cuentan solas a partir de las tarjetas de cada sección.

#### Quitado
- La sección «Nuestras Aplicaciones», su enlace del menú y la categoría
  Aplicación/Aplicaciones de las sugerencias y del soporte.

### 6.0 · Portada, fichas, comunidad y diario

#### Añadido
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

#### Cambiado
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
