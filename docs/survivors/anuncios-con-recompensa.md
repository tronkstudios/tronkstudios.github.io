# Anuncios con recompensa

La integración usa el formato [Rewarded de Google Publisher Tag](https://developers.google.com/publisher-tag/samples/display-rewarded-ad).
Para habilitarla, introduce el identificador de un bloque web con recompensa de Google Ad Manager en la etiqueta `rewarded-ad-unit` de `survivors/index.html` (formato `/código-de-red/nombre-del-bloque`).
El valor vacío deja los botones ocultos. Configura la entrega y el consentimiento aplicable en el sitio antes de habilitar el bloque en producción y comprueba que haya inventario en los dispositivos de destino.

Se solicita un anuncio únicamente al pulsar su botón en el cofre o la ficha de Tesia. Un anuncio completado añade 50 monedas en el cofre, con 15 minutos de espera entre premios de monedas, o desbloquea a Tesia con una estrella. También se consigue a Tesia en el cofre o derrotando a 600 enemigos.

La recompensa requiere la confirmación de GPT y se aplica cuando se cierra el anuncio. Las cancelaciones y las solicitudes sin anuncio disponible no consumen la espera. El progreso usa el guardado actual del juego y el formato web se valida con eventos simulados mediante `node tests/survivors.rewarded.cjs`. La prueba no realiza solicitudes publicitarias de producción.
