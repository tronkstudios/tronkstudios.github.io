# Anuncios con recompensa

Tronk Survivors comparte con Bio-Lab Defense y Tronk GravityRunners el proveedor de [AdSense H5 Games Ads](https://developers.google.com/ad-placement/docs/signup). El identificador público se configura en `rewarded-adsense-client`. Para servir anuncios reales, el sitio debe estar listo en AdSense y la cuenta debe tener acceso a H5 Games Ads. Se pueden mantener desactivados los anuncios automáticos.

Cada juego prepara AdSense al entrar en una pantalla donde se puede conseguir una recompensa. Cuando el servicio está listo, un toque en **Ver anuncio** solicita y abre el vídeo si hay inventario. Si Google no tiene inventario o aún no está listo, el juego muestra un aviso y permite reintentar. La recompensa se acredita al recibir la confirmación de Google. El módulo compartido vive en `js/h5-rewards.js`.

Survivors admite un bloque web de [Google Ad Manager](https://developers.google.com/publisher-tag/samples/display-rewarded-ad) cuando se configura `rewarded-ad-unit` con el formato `/código-de-red/nombre-del-bloque`.

Los anuncios son voluntarios. En el cofre se pueden ganar 50 monedas con 15 minutos de espera o guardar un lote de cinco aperturas gratuitas cada 24 horas. El lote se canjea por separado y usa la animación y las probabilidades habituales. No gasta monedas ni la primera apertura gratis.

En la ficha de cada personaje bloqueado se puede avanzar su desbloqueo completando 1 anuncio si es común, 2 si es raro, 3 si es épico y 5 si es legendario. Cada anuncio acredita un paso para ese personaje. El último lo desbloquea con una estrella. El cofre y los hitos de partida siguen siendo vías de desbloqueo.

La recompensa requiere la confirmación del proveedor y se aplica cuando se cierra el anuncio. Las cancelaciones y las solicitudes sin anuncio disponible no consumen la espera. El progreso usa el guardado actual del juego y el formato web se valida con eventos simulados mediante `node tests/survivors.rewarded.cjs`. La prueba no realiza solicitudes publicitarias de producción.

En el hangar de Gravity Runners, cada chasis acumula sus propios anuncios: 2 para raros, 3 para épicos, 5 para legendarios y 7 para míticos. Aether Valkyrie requiere 1 anuncio. La compra con energía y los hitos siguen disponibles.

### Comprobar el circuito de Google en local

Desde la raíz del repositorio, inicia `python3 -m http.server 8789 --bind 127.0.0.1`. En un navegador con conexión, abre `http://127.0.0.1:8789/survivors/?ads=test` o `http://127.0.0.1:8789/juegos/tronk-gravity-runners/?ads=test`. El parámetro activa los anuncios de ejemplo del SDK de Google exclusivamente en localhost. Puedes usar un perfil nuevo para que las monedas y las esperas empiecen desde cero.

En Survivor, entra en el cofre y pulsa **Ver anuncio · +50 monedas**. En Gravity, termina una carrera normal y elige **Ver anuncio · Continuar una vez**. Si la oferta tarda y el navegador necesita otro toque, aparecerá **Reproducir anuncio**. Espera a que termine la cuenta atrás del ejemplo y ciérralo. El saldo debe subir 50 monedas en Survivor y la misma carrera debe reanudarse en Gravity. Los anuncios de ejemplo no se facturan.

Con Playwright y Chromium instalados, `node tests/h5-google-test-mode.browser.cjs` verifica ambos recorridos con el servidor local en marcha. Para cancelación, falta de inventario y respuestas duplicadas, ejecuta `node tests/h5-rewards.browser.cjs`, que simula el proveedor.
