# ADR 0001 · Backend de soporte en un Cloudflare Worker

- **Estado:** aceptada
- **Fecha:** septiembre de 2026 (commit «Conectar soporte con el backend»)

## Contexto

Queríamos que cualquier persona pudiera escribirnos desde la web y que el
mensaje nos llegara al correo, no solo un enlace `mailto:`.

Para enviar correos hace falta una clave secreta de un servicio de envío
(Resend). Pero la web está en GitHub Pages: todo lo que hay en el repositorio
es público y cualquiera puede leer el JavaScript desde el navegador. Si la clave
estuviera en `support.js`, cualquiera podría copiarla y mandar correos en
nuestro nombre.

## Decisión

Crear un backend pequeño aparte, un **Cloudflare Worker** (`index.js` de la raíz del repo):

- Las claves (`RESEND_API_KEY`, `TURNSTILE_SECRET`...) se guardan como
  *secrets* de Cloudflare con `npx wrangler secret put` y nunca se escriben
  en el código.
- La web solo conoce la dirección pública del Worker.
- El Worker valida todo otra vez, porque lo que llega del navegador se puede falsificar.
- Usamos Cloudflare Turnstile para frenar bots y un límite de envíos por IP.
- La Content-Security-Policy de `index.html` solo permite conectarse a Supabase
  y a este Worker.

## Alternativas descartadas

- **`mailto:`**: no envía nada; depende de que el visitante tenga configurada
  una aplicación de correo. Lo dejamos solo como plan B si el Worker no responde.
- **Formspree / Web3Forms**: más fácil, pero no controlamos la validación,
  ni la respuesta automática, ni qué se guarda.
- **Enviar el correo desde Supabase**: mezclaría las cuentas con el soporte;
  preferimos que el soporte funcione aunque Supabase falle.

## Consecuencias

- 👍 El código público no tiene ninguna clave secreta.
- 👍 Podemos añadir funciones en el servidor, como la respuesta automática al visitante.
- 👎 Hay una pieza más que mantener y desplegar (`wrangler deploy`).
- 👎 Para que la respuesta automática llegue a cualquier dirección,
  Resend exige tener un dominio verificado en `MAIL_FROM`.
