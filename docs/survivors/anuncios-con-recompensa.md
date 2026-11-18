# Anuncios con recompensa

La integración usa el formato [Rewarded de Google Publisher Tag](https://developers.google.com/publisher-tag/samples/display-rewarded-ad).
Para habilitarla, introduce el identificador de un bloque web con recompensa de Google Ad Manager en la etiqueta `rewarded-ad-unit` de `survivors/index.html` (formato `/código-de-red/nombre-del-bloque`).
El valor vacío deja los botones ocultos. Configura la entrega y el consentimiento aplicable en el sitio antes de habilitar el bloque en producción y comprueba que haya inventario en los dispositivos de destino.

Los anuncios son voluntarios. En el cofre se pueden ganar 50 monedas con 15 minutos de espera o guardar un lote de cinco aperturas gratuitas cada 24 horas. El lote se canjea por separado y usa la animación y las probabilidades habituales. No gasta monedas ni la primera apertura gratis.

En la ficha de cada personaje bloqueado se puede avanzar su desbloqueo completando 1 anuncio si es común, 2 si es raro, 3 si es épico y 5 si es legendario. Cada anuncio acredita un paso para ese personaje. El último lo desbloquea con una estrella. El cofre y los hitos de partida siguen siendo vías de desbloqueo.

La recompensa requiere la confirmación de GPT y se aplica cuando se cierra el anuncio. Las cancelaciones y las solicitudes sin anuncio disponible no consumen la espera. El progreso usa el guardado actual del juego y el formato web se valida con eventos simulados mediante `node tests/survivors.rewarded.cjs`. La prueba no realiza solicitudes publicitarias de producción.
