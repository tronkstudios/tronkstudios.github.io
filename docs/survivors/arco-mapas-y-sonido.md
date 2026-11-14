# Arco, mapas y sonido

Iria usa una postura de arquera propia. La mano adelantada coincide con la
empuñadura y la otra tensa la cuerda; los dos renderizadores comparten las
articulaciones y la geometría del arco. La cuerda vuelve a su posición al soltar
y la flecha cargada desaparece durante la liberación. Sus proyectiles tienen
asta, punta y plumas y se dibujan a la altura del arco. El daño, velocidad y
colisión se conservan. El arco deja de mostrar el destello y sonido de un arma
de fuego, y también sus técnicas emiten el sonido de cuerda.

## Diseño de los mapas

- **Bosque:** caminos sinuosos continuos y suelo de variación suave, con bordes
  de tierra mezclados con hierba. Vegetación y flores menos repetitivas.
- **Cementerio:** pasillos de losas y tumbas alineadas; iluminación menos oscura
  para distinguir enemigos y objetos.
- **Ciudad:** calles continuas, intersecciones, pasos de peatones, bordillos,
  pavimento y pequeñas zonas de lluvia. Farolas, bancos y contenedores se sitúan
  junto a las calles; los coches aparcan fuera de las intersecciones. Se añaden
  detalles a farolas y contenedores y se orientan las ruedas de los coches.
- **Playa:** una línea de costa continua, arena uniforme con pequeñas ondulaciones,
  franja húmeda y agua turquesa. Las olas siguen la costa; se eliminan las grandes
  manchas de arena de distinto color.

La decoración se valida en su posición real y en varios puntos de su huella:
no nace sobre el agua ni bloquea los caminos del bosque o cementerio. Tras
ajustarla a una calle, conserva la casilla usada por las consultas de colisión.
Los clientes usan el mismo terreno determinista y las mismas texturas en 2D/3D.
Se comprueban también coordenadas negativas. El agua sigue siendo transitable
y ralentizando, con corrientes en la playa.

Los refugios tienen indicadores más discretos y dejan de cubrir el terreno con
un disco amarillo. El radio de activación se muestra al mantener la posición.
El campamento 3D tiene tienda triangular, entrada, postes y cuerdas, y conserva
sus tres luces compartidas, desactivadas con efectos bajos.

## Sonido

Se añaden 19 efectos sintetizados: arco, tambor, campanillas, bobina eléctrica,
abanico, frasco, fuego, gruñido, huesos, fantasma, murciélago, moco, radio, rugido,
escudo, curación enemiga, apuntado, magia enemiga y mecha. Completan los golpes,
espadas, disparos y explosiones existentes.

Los monstruos cercanos emiten voces de su familia cada cinco a siete segundos;
no se crea una voz por cada criatura. Sanadores, tiradores, kamikazes, escudos y
jefes tienen avisos ligados a sus acciones. El volumen de los sonidos con origen
en el mundo disminuye con la distancia y los muy lejanos se omiten. Los invitados
calculan su propio volumen desde la posición recibida.

Hay un intervalo mínimo por sonido, un máximo de ocho eventos por paso y un
presupuesto menor para golpes, bajas y gemas. Esto limita también los eventos
enviados por el anfitrión. La pausa detiene su reloj de simulación. Los ajustes de
volumen y silencio siguen aplicándose; las señales visuales se conservan.

## Ayudas para encontrar y entender los recursos

La brújula mantiene la prioridad de reanimar compañeros. Con menos del 35 % de
vida busca jensalada cercana; después señala cofres y, si no hay ninguno,
puntos del mapa sin usar. Los refugios que siguen activos también sirven de
objetivo a jugadores heridos. No dirige a un jugador con vida crítica hacia un
altar. La dirección, distancia y nombre se calculan también para invitados.

El aviso de cada punto explica su recompensa o efecto antes de activarlo. En
ajustes se pueden escuchar muestras de arco, monstruo y magia al volumen actual.
Si los efectos están silenciados, indica que hay que subir su volumen; no cambia
el ajuste de sonido por su cuenta. Los controles y avisos están traducidos.

## Validación

63 pruebas de simulación; 1.800 fotogramas de personajes por dispositivo; revisión
de mapas y técnicas en 2D/3D y móvil emulado; protocolo cooperativo con transporte
simulado. La prueba de mapas inspecciona huellas de decoración, texturas y
coordenadas negativas. La prueba de sonido genera audio con OfflineAudioContext
y verifica señal, silencio, atenuación, repetición y muestras finitas.

WebRTC entre redes, Safari/iOS físico y la percepción del sonido en altavoces de
distintos dispositivos requieren una comprobación adicional.
