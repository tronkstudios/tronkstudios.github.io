# Anuncios con recompensa

Tronk Survivors comparte con Bio-Lab Defense y Tronk GravityRunners el proveedor de [AdSense H5 Games Ads](https://developers.google.com/ad-placement/docs/signup). El identificador público se configura en `rewarded-adsense-client`. Para servir anuncios reales, el sitio debe estar listo en AdSense y la cuenta debe tener acceso a H5 Games Ads. Se pueden mantener desactivados los anuncios automáticos.

Cada juego prepara AdSense al entrar en una pantalla donde se puede conseguir una recompensa. Cuando el servicio está listo, un toque en **Ver anuncio** solicita y abre el vídeo si hay inventario. Si Google sigue preparando el anuncio o no hay inventario, el mismo toque abre una promoción de TronkStudios. El vídeo se sirve desde la web del estudio y concede la recompensa al terminar. Cerrarlo antes cancela la recompensa. El módulo compartido vive en `js/h5-rewards.js`.

Survivors admite un bloque web de [Google Ad Manager](https://developers.google.com/publisher-tag/samples/display-rewarded-ad) cuando se configura `rewarded-ad-unit` con el formato `/código-de-red/nombre-del-bloque`.

Los anuncios son voluntarios. En el cofre se pueden ganar 50 monedas con 15 minutos de espera o guardar un lote de cinco aperturas gratuitas cada 24 horas. El lote se canjea por separado y usa la animación y las probabilidades habituales. No gasta monedas ni la primera apertura gratis.

En la ficha de cada personaje bloqueado se puede avanzar su desbloqueo completando 1 anuncio si es común, 2 si es raro, 3 si es épico y 5 si es legendario. Cada anuncio acredita un paso para ese personaje. El último lo desbloquea con una estrella. El cofre y los hitos de partida siguen siendo vías de desbloqueo.

La recompensa requiere la confirmación del proveedor y se aplica cuando se cierra el anuncio. Las cancelaciones y las solicitudes sin anuncio disponible no consumen la espera. El progreso usa el guardado actual del juego y el formato web se valida con eventos simulados mediante `node tests/survivors.rewarded.cjs`. La prueba no realiza solicitudes publicitarias de producción.
