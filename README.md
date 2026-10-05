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
| Soporte | Cloudflare Worker + Resend + Turnstile | `index.js` (raíz), `js/support.js` |
| Alojamiento | GitHub Pages | rama `master` |

## Estructura

```
index.html                 Página única (secciones con <section>)
css/styles.css             Estilos con tokens (variables CSS) y modo claro/oscuro
js/
  core.js                  Configuración de Supabase y elementos de la página
  theme.js                 Modo claro / oscuro guardado en el navegador
  ui.js                    Modales, cliente Supabase y mensajes
  auth.js                  Login, registro, contraseña y sesión
  suggestions.js           Sugerencias: cargar, votar, buscar y filtrar
  projects.js              Tarjetas y ficha de los juegos en desarrollo
  games/audio.js           Música y efectos generados con Web Audio
  games/antitronks.js      Minijuego Antitronks
  games/protect-mogos.js   Minijuego Protect Mogos
  games/stick-drill.js     Minijuego Stick Drill
  app.js                   Arranque, menú móvil y navegación
  support.js               Menú de soporte, chat de Tronker y formulario
juegos/tronk-fight/        Tronk Fight: juego de lucha completo en un solo archivo
  voces/                   (opcional) grabaciones del presentador
img/juegos/                Imágenes de las tarjetas
index.js                   Backend de soporte (Cloudflare Worker)
docs/adr/                  Decisiones de arquitectura
docs/prompts/              Órdenes clave que le dimos a la IA
CHANGELOG.md               Historia de la web por versiones
```

## Decisiones de arquitectura

Las dos más importantes están explicadas en `docs/adr/`:

1. [ADR 0001 · Backend de soporte en un Cloudflare Worker](docs/adr/0001-backend-soporte-worker.md):
   por qué las claves secretas no están en la web y cómo viaja un mensaje
   del formulario hasta nuestro correo.
2. [ADR 0002 · Scripts clásicos divididos por responsabilidad](docs/adr/0002-scripts-clasicos-por-modulos.md):
   por qué partimos el antiguo `script.js` de 8.000 líneas en 11 archivos
   y por qué no usamos `type="module"` todavía.

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

## Tronk Fight

Es un juego independiente en un solo archivo (`juegos/tronk-fight/index.html`), con
su propio motor: la lógica va a 60 pasos por segundo separada del dibujo, lo que
permite simular miles de combates de bot contra bot para equilibrar las armas.
Los golpes se calculan con la forma real del arma contra el cuerpo del rival.

**Voz del presentador:** si se añaden grabaciones en `juegos/tronk-fight/voces/`
con estos nombres, el juego las usa en vez de la voz del navegador:
`ronda1.mp3`, `ronda2.mp3`, `ronda3.mp3`, `lucha.mp3`, `ko.mp3`, `perfecto.mp3`,
`tiempo.mp3`, `combo.mp3`, `parry.mp3`, `guardia.mp3`, `limite.mp3` y `especial.mp3`.

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
