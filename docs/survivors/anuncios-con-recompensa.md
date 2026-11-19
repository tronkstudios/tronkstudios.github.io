# Anuncios con recompensa

El juego usa [AdSense H5 Games Ads](https://developers.google.com/ad-placement/docs/signup) con el identificador público de `rewarded-adsense-client` en `survivors/index.html`. El archivo `/ads.txt` autoriza a Google como vendedor para ese identificador. La etiqueta publicitaria se carga al pulsar un botón de recompensa y el juego solo solicita emplazamientos `reward`. Puedes mantener desactivados los anuncios automáticos en AdSense.

La cuenta y el sitio deben estar aprobados en AdSense y la cuenta debe tener [acceso a H5 Games Ads](https://adsense.google.com/start/h5-beta/?src=devsite). En AdSense, revisa **Sitios** y comprueba que el sitio figure como listo y que Google detecte `ads.txt`. Configura [el consentimiento que corresponda](https://support.google.com/adsense/answer/13554116) antes de servir anuncios en producción y comprueba la disponibilidad en los dispositivos de destino.

Si se configura un bloque web con recompensa de [Google Ad Manager](https://developers.google.com/publisher-tag/samples/display-rewarded-ad) en `rewarded-ad-unit` (formato `/código-de-red/nombre-del-bloque`), se usa ese proveedor. Si las dos etiquetas están vacías, el juego muestra un aviso y permite canjear las aperturas guardadas.

Los anuncios son voluntarios. En el cofre se pueden ganar 50 monedas con 15 minutos de espera o guardar un lote de cinco aperturas gratuitas cada 24 horas. El lote se canjea por separado y usa la animación y las probabilidades habituales. No gasta monedas ni la primera apertura gratis.

En la ficha de cada personaje bloqueado se puede avanzar su desbloqueo completando 1 anuncio si es común, 2 si es raro, 3 si es épico y 5 si es legendario. Cada anuncio acredita un paso para ese personaje. El último lo desbloquea con una estrella. El cofre y los hitos de partida siguen siendo vías de desbloqueo.

La recompensa requiere la confirmación de Google y se aplica cuando se cierra el anuncio. Las cancelaciones y las solicitudes sin anuncio disponible no consumen la espera. Para probar los dos proveedores con eventos simulados, ejecuta `node tests/survivors.rewarded.cjs` y `REWARDED_PROVIDER=adsense node tests/survivors.rewarded.cjs` con el servidor local en marcha. Las pruebas no realizan solicitudes publicitarias de producción.
