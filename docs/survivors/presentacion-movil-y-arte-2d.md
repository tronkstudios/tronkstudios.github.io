# Presentación móvil, modelos 2D y terreno

La interfaz táctil usa paneles oscuros consistentes para mantener el contraste
sobre arena, hierba, piedra y asfalto. La vida y el nivel comparten encabezado;
reloj y fase tienen su tarjeta; la información del mapa ocupa una franja breve.
Estado, jefe y equipo conservan sus espacios reservados. Los avisos y las
recompensas no se modifican.

El equipo, las indicaciones de evolución y el siguiente desbloqueo tienen fondos
legibles. Los iconos son mayores en vertical y compactos en horizontal para dejar
libre la zona de juego. Joystick, activa y pausa tienen bordes más definidos,
contraste y tamaños táctiles; conservan sus eventos y captura independiente de
cada dedo. Se respetan las áreas seguras del dispositivo.

Los menús, fichas, cartas de mejora y ajustes usan espaciado y tipografía más
consistentes. El plantel tiene tres columnas y tarjetas compactas en vertical.
La ficha conserva retrato, demostración y controles de rango sin desbordamiento.
No se usan filtros de desenfoque durante el combate ni se fuerza la rotación.
Los estilos están aislados en `survivors/css/mobile.css` para punteros táctiles.

## Modelos 2D

El renderizador compartido añade iluminación dentro de las extremidades y un
sombreado de tejido con cuello, costuras y hebilla. Los enemigos humanoides
reciben volumen de torso y los soldados bolsillos de uniforme. Hebillas y
bolsillos se dibujan solo en las vistas frontales correspondientes. Cabezas,
peinados, colores, equipo, manos, armas y esqueleto se mantienen.

Las mismas funciones generan retratos, reposo, marcha, ataque y siluetas de
impacto. Los detalles no cambian los pies, el tamaño del fotograma ni los puntos
de agarre del arco y de las otras armas. No se aumenta la resolución de sprites
ni se añade geometría de colisión.

## Terreno

- Bosque: manchas de vegetación, pequeñas agrupaciones, suelo y bordes que
  mezclan el sendero con la hierba.
- Cementerio: losas alternadas con tonos y musgo, evitando una cuadrícula
  uniforme de piedra sin desgaste.
- Ciudad: juntas de pavimento alternadas, manteniendo calles, bordillos y pasos.
- Playa: ondulaciones de arena y pequeños detalles de conchas, con arena húmeda
  y costa reconocible.

El detalle se pinta en los fragmentos de terreno ya almacenados en caché. El ruido
adicional de vegetación comparte muestras por celdas de ocho unidades, y las
agrupaciones decorativas quedan dentro del fragmento para evitar recortes en sus
bordes. Se conserva el mapa lógico: las colisiones, caminos, puntos de interés y
agua transitable con ralentización no cambian. Las texturas se comparten con el
renderizado 3D; las mejoras de modelos corresponden al 2D.

## Validación

126 pruebas de simulación; controles móviles con dos dedos, activa, pausa,
subida de nivel, equipo completo y reinicio; revisión visual de siete
resoluciones con nombres largos, jefe y cooperativo; sprites y cuatro mapas en
2D y 3D. `tests/survivors.mobile-design.cjs` comprueba además menús, plantel,
demostraciones, contraste del HUD por bioma, modalidad horizontal y regreso al
menú. Las hojas de referencia revisan los 24 personajes en reposo y ataque.

Las comprobaciones móviles usan Chromium emulado con densidad doble. No
sustituyen una revisión física de Android o Safari/iOS.
