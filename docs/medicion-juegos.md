# Medición de Survivor y Gravity Runners

Los participantes activan la medición por separado en los ajustes de cada juego. El navegador conserva el día UTC de alta y el de la última visita enviada. Desactivar la opción borra esos dos valores. El Worker recibe el juego, un evento y el día de alta. La dirección IP sirve para limitar peticiones. El conjunto de Analytics Engine guarda únicamente el juego, el evento y el día de alta.

La recepción en producción requiere desplegar la configuración del Worker con el binding GAME_EVENTS. Publicar solo GitHub Pages actualiza el juego. Las partidas funcionan sin conexión al servicio.

## Consultar la primera semana

En Cloudflare Analytics Engine, esta consulta agrupa las visitas de cada cohorte por el día de regreso. El día cero es la referencia para calcular el porcentaje que vuelve los días uno y siete. Usa cohortes con al menos siete días de antigüedad para comparar D7. Cada navegador con consentimiento puede emitir una visita por juego y día. Borrar almacenamiento, jugar sin red o cambiar de dispositivo afecta al recuento.

```sql
SELECT index1 AS juego, double1 AS dia_alta,
       floor(toUnixTimestamp(timestamp) / 86400) - double1 AS dia_regreso,
       sum(_sample_interval) AS visitas
FROM tronk_game_events
WHERE blob1 = 'visit'
GROUP BY juego, dia_alta, dia_regreso
ORDER BY dia_alta, juego, dia_regreso
```

## Consultar las partidas

```sql
SELECT index1 AS juego, blob1 AS evento, sum(_sample_interval) AS total
FROM tronk_game_events
WHERE timestamp >= NOW() - INTERVAL '7' DAY
GROUP BY juego, evento
ORDER BY juego, evento
```

Compara `challenge_finish` con `challenge_start`. En Gravity, `gate_one` y `gate_two` sitúan los abandonos entre puntos de control. En Survivor, `first_choice` cuenta la primera elección de cada prueba. `second_start` cuenta la segunda partida en la misma carga de página. `shared_open` cuenta aperturas del enlace con la medición ya activada. `share` cuenta pulsaciones del botón de compartir.

Compara `ad_request`, `ad_reward` y `ad_incomplete` con los datos del proveedor por periodo y juego. El proveedor publicitario informa de las impresiones pagadas y los importes. El navegador solo observa el intento y su resultado. Los participantes con medición activada son una muestra voluntaria.
