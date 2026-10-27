# TronkStudios · Videojuegos y determinación

Web oficial del estudio TronkStudios: **https://tronkstudios.github.io/**

Aquí se pueden ver nuestros juegos, jugar a cuatro minijuegos en el navegador
(Antitronks, Protect Mogos, Stick Drill y Tronk Fight), crear una cuenta, proponer y votar
ideas, y escribir al soporte (Tronker o formulario de correo).

## Qué hay dentro

| Parte | Tecnología | Dónde |
|---|---|---|
| Web estática | HTML + CSS + JavaScript, sin frameworks | raíz, `css/`, `js/` |
| Minijuegos | Canvas 2D + Web Audio API (sin archivos de audio) | `js/games/` |
| Cuentas y sugerencias | Supabase (Auth + base de datos) | `js/auth.js`, `js/suggestions.js` |
| Perfiles, deseados, récords y clasificación | Supabase | `js/profiles.js`, `docs/supabase/plataforma.sql` |
| Soporte | Cloudflare Worker + Resend + Turnstile | `index.js` (raíz), `js/support.js` |
| Alojamiento | GitHub Pages | rama `master` |

## Estructura

```
index.html                 Página única (secciones con <section>)
partials/                  Ventanas de los minijuegos (se añaden al abrir cada juego)
css/                       Estilos por partes, en este orden (ver ADR 0003):
  base.css                 Tokens (variables CSS), modo claro/oscuro, cabecera y botones
  secciones.css            Tarjetas de juegos y minijuegos, tráileres y «Sobre nosotros»
  soporte.css              Menú de soporte, chat de Tronker y formulario
  portada.css              Portada, ficha del juego, comunidad y diario
  plataforma.css           Perfiles, clasificación, iconos, ideas y panel del equipo
  contenido.css            Logo de la portada, ajustes para todas las pantallas, YouTube y Roblox
  extras.css               Fondos animados, avisos, atajos, mascota y comentarios
  funciones.css            Modo jefe, logros, galería, calendario, podio y demos grabadas
  minijuegos.css           Ventanas de los minijuegos (solo al abrir uno)
  tronk-fight.css          Estilos de Tronk Fight (prefijo tf-; solo al abrir el juego)
js/
  core.js                  Configuración de Supabase y elementos de la página
  theme.js                 Modo claro / oscuro guardado en el navegador
  ui.js                    Modales, cliente Supabase y mensajes
  auth.js                  Login, registro, contraseña y sesión
  suggestions.js           Sugerencias: cargar, votar, buscar y filtrar
  projects.js              Tarjetas y ficha de los juegos en desarrollo (datos en PROJECTS)
  profiles.js              Perfiles, deseados, avisos, récords, insignias y clasificación
  community.js             Estado de las ideas, encuestas, notificaciones y diario de Supabase
  team.js                  Panel del equipo (ideas, encuestas, diario, récords, lanzamientos y avisos)
  journey.js               «Cómo lo hicimos»: línea temporal paso a paso
  apis.js                  Últimos vídeos de YouTube y datos en directo de Roblox (vía el Worker)
  pwa.js                   App instalable: registra sw.js, botón «Instalar app» y aviso sin conexión
  i18n.js                  Versión en inglés: traductor de la página
  i18n-en.js               Diccionario de inglés (solo se descarga si la web va en inglés)
sw.js                      Service worker: guarda la web para usarla sin internet
manifest.webmanifest       Datos de la app instalable (nombre, iconos, colores)
  news.js                  Diario de desarrollo: filtros y «Ver entradas anteriores»
  hero.js                  Fondo de partículas de la portada
  games/loader.js          Carga cada minijuego (ventana, estilos y código) al abrirlo
  games/results.js         Resultados, rachas y «Retar a un amigo»
  games/audio.js           Música y efectos generados con Web Audio
  games/antitronks.js      Minijuego Antitronks
  games/protect-mogos.js   Minijuego Protect Mogos
  games/stick-drill.js     Minijuego Stick Drill
  games/tronk-fight.js     Minijuego Tronk Fight (juego de lucha completo)
  app.js                   Arranque, menú móvil y navegación
  support.js               Menú de soporte, chat de Tronker y formulario
img/juegos/                Capturas de los juegos en WebP (mini/: miniaturas de las tarjetas)
video/                     Una partida grabada de cada minijuego (MP4 + póster WebP), en el desplegable «Ver vídeo» de su tarjeta
img/avatars/               Avatares dibujados para los perfiles (SVG)
index.js                   Backend de soporte (Cloudflare Worker)
docs/adr/                  Decisiones de arquitectura
docs/lighthouse/           Mediciones de Lighthouse (antes y después)
docs/prompts/              Órdenes clave que le dimos a la IA
CHANGELOG.md               Historia de la web por versiones
```

## Decisiones de arquitectura

Las más importantes están explicadas en `docs/adr/`:

1. [ADR 0001 · Backend de soporte en un Cloudflare Worker](docs/adr/0001-backend-soporte-worker.md):
   por qué las claves secretas no están en la web y cómo viaja un mensaje
   del formulario hasta nuestro correo.
2. [ADR 0002 · Scripts clásicos divididos por responsabilidad](docs/adr/0002-scripts-clasicos-por-modulos.md):
   por qué partimos el antiguo `script.js` de 8.000 líneas en 11 archivos
   y por qué no usamos `type="module"` todavía.
3. [ADR 0003 · Estilos por partes y minijuegos que se cargan al abrirlos](docs/adr/0003-estilos-y-minijuegos-por-partes.md):
   cómo pasamos de 31 a 96 en el rendimiento de Lighthouse en móvil
   (mediciones en [`docs/lighthouse/`](docs/lighthouse/README.md)).

## Recorrido del dato en el formulario de contacto

1. El visitante rellena el formulario (`js/support.js`), que valida los campos
   y pide el token anti-bots de Cloudflare Turnstile.
2. La web hace `POST /contact` al Worker (`index.js` de la raíz).
3. El Worker comprueba el tamaño, los límites de cada campo, el tiempo mínimo
   de relleno, el límite de envíos por IP y el token de Turnstile.
4. Si todo está bien, envía el mensaje a nuestro correo con Resend
   (con `reply_to` al visitante, para contestarle con «Responder»).
5. Después envía al visitante una **respuesta automática** de confirmación,
   con texto fijo que no copia nada de lo que escribió.
6. La web muestra el mensaje de éxito.

El Worker no guarda los mensajes ni los escribe en los logs.

## Perfiles, deseados y clasificación

Con una cuenta, cada persona tiene un **perfil** (avatar, nombre, biografía,
insignias, lista de deseados y récords), puede **añadir juegos a deseados**,
pedir **aviso por correo** cuando salgan y sale en la **clasificación** de los
minijuegos. Para activarlo:

1. **Supabase → SQL Editor**: pegar `docs/supabase/plataforma.sql` y pulsar Run.
   Crea las tablas con sus reglas de seguridad (cada persona solo cambia lo suyo).
   Mientras no se ejecute, todo esto se esconde y la web funciona igual que antes.
2. **Aviso de lanzamiento en la web**: funciona solo. Cuando llega la fecha de
   `release` de `js/projects.js`, quien pidió aviso lo ve arriba al entrar con su cuenta.
3. **Avisos por correo** (opcional): el Worker revisa cada día a las 9:00 UTC
   qué juegos han salido (tabla `game_releases`) y escribe a quien pidió aviso.
   Necesita `npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY` y un dominio
   verificado en Resend en `MAIL_FROM`.
4. Para cambiar una fecha de lanzamiento, actualizarla en `js/projects.js`
   **y** en la tabla `game_releases`.

Los récords se comprueban en el servidor (valores posibles y, en Tronk Fight,
como mucho una victoria cada 20 segundos), pero como los juegos se ejecutan
en el navegador, alguien con conocimientos podría enviar un récord falso.
Si pasa, se borra la fila en la tabla `game_scores`.

Para vender un juego, se añade su tienda en `stores` dentro de `js/projects.js`
(por ejemplo Steam o itch.io) y sale el botón de compra en su ficha.

## Comunidad y panel del equipo

Tras `plataforma.sql`, ejecutar `docs/supabase/comunidad.sql` en el SQL Editor
(pegando TODO su contenido) y después, con vuestro correo, entrar en el equipo:

```sql
insert into public.team_members (user_id)
select id from auth.users where email = 'vuestro-correo@ejemplo.com'
on conflict do nothing;
```

Con eso aparece **Panel del equipo** en «Cuenta», desde donde se puede:
- poner el **estado** de cada idea (Pendiente, En estudio, Planeada, Hecha o Descartada)
  y una **respuesta del equipo**, o borrarla;
- crear, cerrar y borrar **encuestas**;
- publicar **entradas del diario** sin tocar código;
- borrar **récords falsos**;
- cambiar la **fecha de lanzamiento** de un juego (necesita además
  `docs/supabase/lanzamientos.sql`). Quien lo tiene en su lista de deseados
  recibe una notificación, y la fecha de la tabla `game_releases` manda sobre
  la de `js/projects.js`;
- enviar **avisos** a todos los usuarios (necesita `docs/supabase/avisos.sql`).
  Llegan a la campana;
- crear y borrar **retos de la comunidad** (pestaña «Retos», necesita
  `docs/supabase/retos.sql`). Por ejemplo: «Entre todos, derrotad 10.000 ninjas
  esta semana». Cada partida con la sesión iniciada suma a la barra que sale en
  Minijuegos. Hay un máximo por partida y una pausa de 8 segundos entre partidas,
  para que nadie haga trampas. Al superarlo, quien ha ayudado recibe un aviso.

Cada persona recibe **notificaciones** (campana de la cabecera) cuando su idea
llega a 1, 5, 10, 25, 50 o 100 votos, cuando el equipo cambia su estado o le
responde, y cuando alguien le quita el primer puesto de un minijuego.

## Iconos y avatares

Los iconos están dibujados en un `<svg class="icon-sprite">` al principio de
`index.html` y se usan con `<svg class="icon"><use href="#i-nombre"></use></svg>`
o, desde JavaScript, con `makeIcon("nombre")` (`js/core.js`). Los avatares de
perfil son los SVG de `img/avatars/`.

## YouTube y Roblox

El Worker (`index.js`) tiene dos rutas públicas, sin claves:
- `GET /youtube`: los últimos vídeos y Shorts del canal (feed RSS de YouTube), guardados 10 minutos.
- `GET /roblox?place=NÚMERO`: jugadores ahora, visitas, favoritos y «me gusta»
  de un juego de Roblox, guardados 1 minuto.

La web (`js/apis.js`) enseña los 3 últimos vídeos en Novedades y, para cada
juego con `roblox.placeId` en `js/projects.js`, sus cifras en la sección Roblox
y en su ficha (se actualizan cada minuto). El placeId es el número de la
dirección del juego: `roblox.com/games/NÚMERO/nombre`. Tras cambiar `index.js`
hay que volver a desplegar el Worker (`npx.cmd wrangler deploy`).

## Mascota 3D

`js/mascot.js` dibuja a Tronker en 3D con Three.js (`js/vendor/three.module.min.js`,
licencia MIT en `js/vendor/three.LICENSE.txt`). Se carga cuando la página ya está
lista y, si el navegador no tiene WebGL, simplemente no aparece.
- Al pulsarlo abre el chat (`window.openTronkerChat`, de `js/support.js`).
- Los minijuegos le avisan con `window.TronkMascot?.react("great")`. Tipos: `start`,
  `great`, `combo`, `close`, `oops`, `hurt`, `lastLife`, `special`, `record`,
  `gameover`, `win`, `lose`, `roundWin` y `roundLose`. Las frases están en `LINES`.
- Jugando se dibuja a 30 imágenes por segundo para no quitarle potencia al juego.

## Tronker con IA (gratis)

El chat de Tronker responde con **Groq** (`AI_PROVIDER = "groq"`, modelo en
`GROQ_MODEL`) y **busca en internet con Tavily** cuando le preguntan algo actual
(noticias, resultados, precios...). Las dos son gratis con cuenta:
- Claves: `npx.cmd wrangler secret put GROQ_API_KEY` y
  `npx.cmd wrangler secret put TAVILY_API_KEY`. Sin la de Tavily responde sin buscar.
- Si Groq falla, tarda o se acaba su límite gratis, responde **Workers AI de
  Cloudflare** (bloque `[ai]` de `wrangler.toml` y `AI_MODEL`), sin clave.
- `/health` dice si la búsqueda está activa (`webSearch`).
- Lo que sabe Tronker está en `TRONK_KNOWLEDGE` (`index.js`). Cuando cambie la
  web, actualízalo y vuelve a desplegar el Worker.
- Si se acaba el uso gratis del día o la IA falla, Tronker sigue entendiendo
  lo que escribe la gente con el **sistema de frases** (`js/tronker.js`): busca
  la conversación del guion de `js/support.js` que mejor encaja, aunque haya
  faltas de ortografía o no haya tildes. Para que entienda más cosas, añade
  frases de ejemplo en `INTENTS`.
- Cada visitante puede enviar como mucho 8 preguntas por minuto.
- Para usar otra IA (Claude u otra compatible con OpenAI), cambia `AI_PROVIDER`
  y `AI_MODEL`, y guarda la clave con `npx.cmd wrangler secret put AI_API_KEY`.

## App instalable y sin conexión

La web es una PWA: en el móvil o en Chrome/Edge se puede **instalar como una app**
(botón «Instalar app» de la portada, o «Añadir a pantalla de inicio»).
`sw.js` guarda la página y todos los archivos que enlaza `index.html`, así que
los **minijuegos funcionan sin internet**. Cuentas, sugerencias y vídeos
necesitan conexión. Si algo se queda en una versión vieja, sube `CACHE_VERSION`
en `sw.js`.

## Versión en inglés

El botón **ES / EN** de la cabecera cambia el idioma (se recuerda en el navegador;
la primera vez se usa el del navegador). La web sigue escrita en español y
`js/i18n.js` traduce cada texto con el diccionario `I18N_EN`, también lo que se
añade después desde JavaScript. Para un texto nuevo, añade su traducción a
`I18N_EN` (o una regla a `I18N_PATTERNS` si lleva números o nombres). Lo que
escriben los usuarios no se traduce.

## Tronk Fight

Se abre en una ventana dentro de la web, como el resto de minijuegos.
Se puede jugar contra un bot (3 dificultades) o a dos jugadores en el mismo
teclado o en el mismo móvil o tablet, con un mando para cada uno.
Su código está en `js/games/tronk-fight.js`, metido entero dentro de una función
para que sus variables no choquen con las de la web, y sus estilos en
`css/tronk-fight.css`, con todos los nombres empezando por `tf-`.

Tiene su propio motor: la lógica va a 60 pasos por segundo separada del dibujo,
lo que permite simular miles de combates de bot contra bot para equilibrar las armas.
Los golpes se calculan con la forma real del arma contra el cuerpo del rival.
El juego solo se ejecuta mientras su ventana está abierta.

## Probarlo en local

Hace falta servirlo por HTTP (no vale abrir el `index.html` con doble clic,
por la política de seguridad CSP):

```bash
python3 -m http.server 8000
# y abrir http://localhost:8000
```

## Forma de trabajar

- Cada mejora grande empieza como **issue** y se hace en una **rama**
  (`feature/...`, `fix/...`) que se une a `master` con un **pull request**.
- Mensajes de commit en español con este formato:
  `tipo: qué cambia y para qué` (tipos: `feat`, `fix`, `refactor`, `docs`, `style`, `chore`).
- Cada versión se apunta en el [CHANGELOG](CHANGELOG.md).
