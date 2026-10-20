# Changelog

Historia de la web de TronkStudios agrupada por versiones. Cada versión
resume los commits de esa etapa, que se pueden ver en el historial de GitHub.

## [v6] · Octubre de 2026 · La nueva web de TronkStudios

La mayor actualización de la web: portada nueva, perfiles, comunidad con panel
del equipo, app instalable, versión en inglés y diseño que se adapta a cualquier
pantalla. Estas son sus partes, de la más reciente a la primera.

### 6.34 · La galería se abre en una pestaña

#### Corregido
- Con la web instalada como app, los enlaces a la galería se abrían dentro
  de la app. Ahora se abre primero una pestaña vacía del navegador y luego
  se lleva a la galería, para que Chrome no la pase a la app. Desde la app
  instalada, la galería se abre dentro de la propia app.
- «← Volver a TronkStudios» en la galería cierra su pestaña y te deja en la
  web de la que venías (en la app, vuelve a la portada dentro de la app).
  La pestaña de la galería mantiene la relación con la que la abrió, para
  que el navegador deje cerrarla.

### 6.33 · Pie de página ordenado y acceso grande a la galería

#### Cambiado
- **Pie de página** como antes: © a la izquierda y los botones a la derecha
  en una sola fila; los enlaces a los minijuegos van en una fila aparte,
  debajo y separados con una línea. El botón «Modo jefe» tiene el mismo
  estilo que los demás y no sale en el móvil.
- **Acceso grande a la Galería de fans** al final de la sección Comunidad:
  un cartel con los azules de TronkStudios y el botón «Abrir la galería»
  (en otra pestaña).

### 6.32 · Podio de los 3 mejores

#### Añadido
- **Podio en cada juego**: los 3 mejores jugadores en pedestales de oro,
  plata y bronce (el 1.º en el centro, más alto y con corona), con su avatar,
  nombre y récord. Sale en la **Clasificación** de cada minijuego (la lista
  sigue debajo desde el 4.º) y, en pequeño, en la **pantalla de inicio** de
  Antitronks, Protect Mogos, Stick Drill y El Juego Miente. Al pulsar un
  jugador se abre su perfil.

#### Cambiado
- **Portada menos cargada**: la **Galería de fans** tiene su propia página
  (`?vista=galeria`), que el menú abre en una pestaña nueva, con un enlace
  para volver. Los avisos antiguos con `#galeria` llevan ahí.
- La **Clasificación** va recogida tras el botón «Mostrar los mejores
  jugadores» (y recuerda si la dejaste abierta).

### 6.31 · Barras de desplazamiento con el estilo de la web

#### Cambiado
- Las barras de desplazamiento de toda la web (página, ventanas, panel de
  notificaciones, chat, listas) tienen los colores del tema claro u oscuro,
  son redondeadas y se ponen azules al pasar el ratón. Dentro de ventanas y
  paneles son más finas.
- El **modo jefe** no se activa en el móvil ni en la tablet: avisa de que
  solo funciona en PC.

### 6.30 · Juegos editables, calendario y notificaciones push

#### Añadido
- **Juegos editables desde el panel del equipo** (pestaña «Juegos»): crear,
  editar, ocultar y borrar los juegos de «En desarrollo» y «Nuestros juegos»
  (título, descripción, fase, plataformas, géneros, imagen principal,
  capturas, tráiler, tiendas y Roblox). Las imágenes se suben a Storage.
  Si no hay datos en Supabase, la web sigue con los de `js/projects.js`.
  Necesita `docs/supabase/proyectos.sql`.
- **Calendario** (sección «Calendario»): lanzamientos, torneos, concursos y
  directos. Cada evento se añade a Google Calendar o se descarga (.ics), y el
  calendario entero se puede suscribir (Google, iPhone, Outlook) desde el
  Worker (`/calendar.ics`). Las fechas de «Lanzamientos» salen solas. El
  equipo añade eventos en la pestaña «Calendario».
  Necesita `docs/supabase/calendario.sql`.
- **Notificaciones push**: en el panel de la campanita, «Activar» recibe los
  avisos en ese dispositivo aunque la web esté cerrada (en el iPhone, con la
  app instalada). El Worker los envía cada minuto con Web Push (VAPID y
  aes128gcm, sin librerías). Necesita `docs/supabase/push.sql` y las claves
  VAPID en el Worker.

#### Corregido
- Al repintar las tarjetas no se duplican los avisos de imagen rota.

### 6.29 · Galería de fans, logros secretos y modo jefe

#### Añadido
- **Galería de fans** (sección «Galería»): la comunidad sube dibujos y
  capturas de los juegos de TronkStudios y los vota. El más votado de la
  semana sale como **Dibujo de la semana**. Las imágenes se encogen en el
  navegador antes de subirse (máx. 1600 px, WebP) y **nada se publica sin
  que el equipo lo apruebe** desde su panel (pestaña «Galería»); al autor le
  llega un aviso. Necesita `docs/supabase/galeria.sql`.
- **Logros secretos absurdos** (12): no se dice cómo conseguirlos; al
  desbloquear uno sale un aviso con botón de compartir y en tu perfil se ve
  la lista con los que faltan como «???». Se guardan en el navegador.
- **Modo jefe**: con la tecla **B** (o el botón del pie) la web se tapa con
  una hoja de cálculo de mentira, se para el sonido, los minijuegos se
  congelan y la pestaña cambia de título e icono. Con B o Esc se vuelve.
- **Historial de cambios en la web**: el «v6» del pie abre este CHANGELOG.

#### Corregido
- La web no dejaba cargar imágenes guardadas en Supabase (política de
  seguridad); ahora sí, para la galería.

### 6.28 · Quinto minijuego: El Juego Miente

#### Añadido
- **El Juego Miente**, un juego de reacción: sale una palabra de color escrita
  en otro color y una regla («Obedece a la palabra», «Obedece al color»,
  «Ni uno ni otro» o «¡No pulses nada!»). La regla cambia cada pocas rondas,
  el tiempo se acorta y el juego miente cada vez más: los botones cambian de
  sitio y sus nombres dejan de decir la verdad. Teclas 1-4 o tocar, 3 vidas.
- Tiene su música (concurso con reloj), sus sonidos, rachas privadas,
  récord en la cuenta, pestaña en la clasificación, retos de la comunidad
  («aciertos»), «Retar a un amigo», ayuda en el chat de Tronker y su página
  para Google en `/juegos/el-juego-miente/`.
- Necesita `docs/supabase/el-juego-miente.sql`.
- Miniatura en inglés («The Game Lies») cuando la web está en inglés. Las
  imágenes pueden tener versión en inglés con `data-src-en`.

#### Cambiado
- La insignia «Todoterreno» pide récord en 4 minijuegos (de los 5).

### 6.27 · Tronker más natural

#### Cambiado
- «¿Qué pasa, Tronk?» se dice una sola vez, al abrir el chat: la IA ya no lo
  repite en cada respuesta.
- La IA ya no avisa de que no tiene internet en cada respuesta; solo lo
  menciona si le piden noticias, resultados o precios de hoy.

### 6.26 · Tronker sabe la fecha

#### Cambiado
- La IA de Tronker recibe la fecha y la hora de España en cada conversación,
  así puede responder «¿qué día es hoy?» o «¿cuánto falta para...?».

### 6.25 · Comentarios, rachas, retos entre amigos y páginas de juego

#### Añadido
- **Comentarios en las sugerencias**: botón con el número de comentarios en
  cada idea y una ficha para leerlos y opinar. Al autor de la idea le llega un
  aviso. Cada uno borra los suyos y el equipo puede borrar cualquiera.
  Necesita `docs/supabase/comentarios.sql`.
- **Racha de días entrando a la web** con una llama en el perfil, aviso al
  subir la racha e insignias nuevas: «Constante» (7 días) e «Imparable»
  (30 días). Necesita `docs/supabase/rachas.sql`.
- **Retar a un amigo** desde los resultados de Antitronks, Protect Mogos y
  Stick Drill: crea un enlace «Supera mis 850 puntos en Protect Mogos». Quien
  lo abre ve el reto, y al acabar sabe si lo ha superado o cuánto le falta.
- **Páginas de cada minijuego para Google** (`/juegos/antitronks/`,
  `/juegos/protect-mogos/`, `/juegos/stick-drill/`, `/juegos/tronk-fight/`)
  con cómo se juega, controles, preguntas frecuentes y datos estructurados,
  más `sitemap.xml` y `robots.txt`. El botón «Jugar gratis ahora» abre el
  juego en la web.

#### Cambiado
- **Tronk Fight en el móvil**: botones más grandes con icono, el joystick
  aparece donde pones el dedo, vibración al pulsar (Android) y el robot
  Tronker ya no tapa los mandos.

#### Corregido
- La app sin conexión podía guardar cualquier página como si fuera la portada.

### 6.24 · «¿Qué pasa, Tronk?»

#### Cambiado
- Tronker saluda en el chat con «¿Qué pasa, Tronk?» (también la IA cuando
  la saludan).

### 6.23 · Tronker responde a cualquier pregunta

#### Cambiado
- **Tronker ya no se limita al soporte**: en el modo «escribiendo» responde a
  cualquier pregunta (deberes, ciencia, idiomas, programación, ideas...) y
  sigue siendo el soporte de TronkStudios. Mantiene un tono apto para todos
  los públicos, avisa de que no tiene internet y nunca pide contraseñas.
- Respuestas algo más largas cuando hace falta (explicaciones o código).

### 6.22 · Música propia para cada minijuego

#### Cambiado
- **Cada minijuego tiene su música**, según el tipo de juego (todo generado
  con Web Audio, sin archivos):
  - **Antitronks:** acción nocturna con bajo de sintetizador y batería.
  - **Protect Mogos:** estilo japonés con koto, taikos y flauta.
  - **Stick Drill:** 8 bits rápido, como una recreativa.
  - **Tronk Fight** mantiene su música de combate.
- **El ninja morado de Protect Mogos** hace un sonido de esquive al dar la
  voltereta.

### 6.21 · Listas más cortas con «Mostrar más»

#### Cambiado
- **Clasificación:** en la página salen los 5 primeros (y tu puesto, si estás
  más abajo). «Mostrar más» abre una tarjeta con la clasificación completa.
- **Sugerencias:** en la página salen 4 (respetando la búsqueda, el filtro y
  el orden). «Mostrar más» abre una tarjeta con todas; se puede votar dentro
  y se actualiza sola.

### 6.20 · Avatares con cuerpo

#### Cambiado
- **Todos los avatares tienen cuerpo** (hombros, ropa o tronco según el
  personaje) y ya nada se sale del recuadro redondeado.
- **Rana, chef y mago redibujados**; el sombrero del mago ya tapa la frente.
- **Caballero nuevo**: yelmo ancho con penacho, hombreras y sobreveste.

#### Corregido
- El aviso de **iniciar sesión** (por ejemplo al pulsar «Avísame cuando
  salga») ahora sale delante de la ficha del juego, no detrás.

### 6.19 · Minijuegos, retos y avatares

#### Añadido
- **Rachas privadas** en Antitronks y Protect Mogos: contador «RACHA ×N» en el
  marcador y tu mejor racha al empezar y al acabar. Solo se guardan en tu
  navegador; no salen en ninguna clasificación.
- **Ficha de cada reto** al pulsarlo, como las de los juegos en desarrollo:
  título, descripción, progreso exacto, fechas, tu aporte y los 5 mejores
  contribuidores (con lo que ha aportado cada uno). El equipo puede escribir la
  descripción al crear el reto (vuelve a ejecutar `docs/supabase/retos.sql`).
- **24 avatares nuevos** (36 en total): Tronker, Antitronk, el rey de Protect
  Mogos, stickman, samurái, vikingo, gato, perro, panda, dragón, dinosaurio,
  vaquero, chef, vampiro, momia, rana, pingüino, búho, cíborg, gamer, bruja,
  tiburón, calabaza y OVNI.

#### Cambiado
- Los minijuegos **solo se cierran con la × o con Escape**: pulsar fuera ya no los
  cierra (y Antitronks y Stick Drill ahora también se cierran con Escape).
- En la ventana de inicio y fin de partida, la **descripción del juego va aparte**
  del **récord**: casillas con tus cifras y una cinta dorada «¡NUEVO RÉCORD!» que
  solo sale cuando lo consigues.
- El **porcentaje de los retos es exacto**, con hasta 10 decimales. Antes se
  redondeaba y con objetivos grandes se quedaba en 0 % aunque sí sumaba.
- Donde ponía «malos» ahora pone **Antitronks** (y «ANTITRONK ELIMINADO» en el juego).

#### Arreglado
- Fallos de dibujo en los avatares: el penacho del caballero estaba suelto, los
  ojos del ninja parecían un bigote, los cuernos del vikingo flotaban, el sombrero
  del vaquero dejaba ver la frente, el samurái parecía llevar un sombrero de bruja
  (ahora lleva casco kabuto con cuernos dorados y armadura), y el pelo del rey, la bruja, el vampiro, el
  gamer, el mago y el zombi (que tenía calva) estaba mal. Ahora todos tienen
  cuello y cuerpo, y el pelo cae por detrás de forma natural.

### 6.18 · Animaciones de Tronker mejor hechas

#### Cambiado
- Las animaciones de la mascota se han rehecho con **fotogramas clave**: cada gesto
  tiene preparación y remate (se agacha antes de saltar, se aplasta al aterrizar y
  se recoloca), y todo se mueve con suavizado real, igual de fluido a cualquier
  velocidad de pantalla. Los tiempos son los mismos.
- **Brazos con codo de verdad**, que se doblan hacia delante: al pensar, la mano va
  a la mandíbula (antes se iba detrás de la cabeza); al saludar, a la sien; al
  encogerse de hombros, abre las manos.
- Al **acercarse a mirar** ya no se hace más grande: se inclina hacia delante desde
  la cintura, con los brazos hacia atrás y la cabeza levantada.
- Aplastar y estirar sin cambiar de volumen, **antena con rebote** al mover la
  cabeza y el cuerpo acompaña un poco la mirada.
- El turbo y la voltereta ya no se salen por arriba.

### 6.17 · Tronker más vivo

#### Añadido
- **Animaciones nuevas** para la mascota: baile, voltereta hacia atrás, pensar con la
  mano en la barbilla, encogerse de hombros, saludo militar, turbo con el propulsor,
  escáner del visor (efecto Tron), acercarse a mirar, sacudirse, señalar y bostezar
  antes de dormirse. Al pulsarlo, a veces da una voltereta.
- **Comenta lo que tienes debajo del ratón**: si te quedas un momento sobre una
  sección o una tarjeta (un minijuego, Z Tronks, los retos, una idea, los vídeos...),
  hay una probabilidad de que diga algo sobre eso y lo señale con el brazo.

#### Cambiado
- La mascota **sale al instante**: viene en el HTML con una imagen del robot y pasa
  al 3D en cuanto está listo (antes esperaba a que cargara toda la página). Si el
  navegador no puede con el 3D, se queda la imagen en lugar de desaparecer.

#### Arreglado
- El marco brillante al usar los accesos rápidos del menú se cortaba en el móvil
  (solo se veían las líneas de arriba y abajo). Ahora nunca se sale de la pantalla.

### 6.16 · Arrastrar en los minijuegos

#### Arreglado
- Al hacer clic y arrastrar dentro de un minijuego (por ejemplo, en Protect Mogos)
  el navegador ya no arrastra la imagen del juego ni selecciona texto. Pasaba sobre
  todo en Safari, Firefox y en el móvil al mantener pulsado.

### 6.15 · Tronker en 3D

#### Añadido
- **Mascota 3D** (`js/mascot.js`): un robot con casco estilo Tron (visor negro y
  líneas de neón) y cuerpo de clanker (metal, remaches, brazos con pinzas y un
  propulsor que lo hace flotar). Al pulsarlo se abre el chat de Tronker.
- Tiene vida propia: flota, respira, parpadea, sigue el ratón con la cabeza,
  saluda, mira alrededor, se estira y se duerme si no haces nada. Sus ojos y su
  antena cambian de forma y de color según cómo se siente.
- **Te ve jugar**: en los minijuegos se hace pequeño y comenta lo que pasa
  («¡Buena!», «¡Por los pelos!», «¡Última vida!», «¡Nuevo récord!»...).
- Al entrar en la web saluda con «¿Qué pasa, Tronk?». Se puede ocultar (y volver
  a mostrar desde el pie de la página).
- Más grande en ordenador y más pequeño en el móvil. Jugando en el móvil se pone
  donde no estorba (en Protect Mogos, abajo a la derecha, sobre la torre del castillo). Three.js va dentro de la web
  (`js/vendor`) y se carga cuando la página ya está lista.

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
