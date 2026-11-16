# Profundidad de combate y comparación de partidas

Esta tanda desarrolla las catorce mejoras aprobadas. Conserva los 24 personajes,
el arma propia, los cuatro mapas y el jefe final de 25:00. No añade monedas ni
progresión permanente de potencia.

| Propuesta | Implementación |
| --- | --- |
| Evoluciones de activa | Dos opciones por personaje desde nivel 20 y 8:00, en una subida normal. |
| Ritmo de técnicas | Separación mínima de 12 pasos entre técnicas automáticas del mismo jugador. |
| Postura | Los impactos de empuje fuerte acumulan desequilibrio y abren una interrupción limitada. |
| Esquivas precisas | Rozar un proyectil o salir por poco de un bombardeo reduce 45 pasos de recarga activa. |
| Protectores | Los guardianes se sitúan entre un sanador cercano y el jugador; conservan su escudo frontal. |
| Nidos | Orígenes destructibles con avisos, refuerzos limitados, cofre y refugio al destruirlos. |
| Enlaces de técnicas | La técnica defensiva prepara durante tres segundos una concentración con +35 % de daño. |
| Variantes de mapa | Escalas coherentes de caminos y costa, distribución de obstáculos y posición de puntos de interés. |
| Enemigos y entorno | Sepulcros del cementerio permiten resucitar una vez a esqueletos y zombis vinculados. |
| Demostración | Ocho ataques seleccionables por personaje, calculados con el combate real en una escena aislada. |
| Sonido direccional | Paneo estéreo por posición horizontal, además de atenuación por distancia. |
| Resultados por habilidad | Daño efectivo, curación activa y aplicaciones de control por fuente. |
| Comparador | Historial de hasta treinta partidas y comparación con la anterior del mismo personaje, mapa y categoría. |
| Repetición | Conserva una copia de personajes, estrellas, mejoras y reglas iniciales; online vuelve a sala con explicación. |

## Activas

La opción concentrada multiplica daño y curación por 1,35 y alarga la recarga
un 20 %. El eco repite la activa un segundo después al 45 % de daño y curación,
con recarga un 25 % más larga. El eco no cuenta como otra pulsación ni reinicia
la recarga. Los efectos de control conservan su comportamiento; un caído pierde
el eco pendiente. Los cambios mantienen el porcentaje de recarga.

Duna tiene dos comportamientos específicos: tornado viajero recto concentrado
o remolino estacionario más amplio que atrae durante cuatro segundos. Su segunda
rama no repite el tornado. Mantiene la ventana compartida de daño entre remolinos.
Las especializaciones pendientes tienen prioridad; el cofre nunca se sustituye.
Ambas opciones están disponibles y no se pueden volver a tirar. Se reinician por
partida y son individuales en cooperativo.

Las técnicas conservan sus periodos: si coinciden, la siguiente espera doce
pasos. El enlace defensiva → concentración se consume una vez por lanzamiento;
se transmite a proyectiles y zonas diferidos. Iria añade marca de tres segundos
con su técnica penetrante: un impacto concentrado la consume con +30 % de daño.

## Postura y esquivas

Los golpes con empuje de al menos tres suman como máximo 35 de postura por
impacto. El umbral es 100 normal o 150 jefe. La interrupción dura 45 o 20 pasos,
con inmunidad posterior de 240 o 600 pasos respectivamente. La postura decae tras
dos segundos sin impactos fuertes. Los jefes conservan su fase y patrón; no se
cancelan peligros ya anunciados. Los enemigos interrumpidos no dañan por contacto.

La esquiva exige movimiento, ausencia de invulnerabilidad y un acercamiento sin
impacto: proyectiles a 12 unidades adicionales del radio de colisión o bombardeos
a diez unidades de mundo adicionales de la explosión. Solo se recompensa una
cada tres segundos y la recarga nunca cae por debajo de cero. No añade un botón.

## Nidos y sepulcros

Desde 3:00 puede aparecer un origen a distancia del jugador; se intenta otro
cada 150 segundos, con máximo dos activos. Su vida aumenta con tiempo y equipo.
Se puede apuntar al origen con el arma automática, sin convertir los decorados
normales en objetivos prioritarios. El modelo y su barra de vida se dibujan tanto
en 2D como en 3D y se comparten con invitados.

Cada nueve segundos intenta anunciar durante 1,5 segundos hasta tres refuerzos,
con máximo nueve vivos por origen y respetando el límite global de enemigos. Solo
lo hace si hay jugadores próximos. Destruirlo cancela avisos y resurrecciones de
ese origen, detiene sus refuerzos y entrega una sola recompensa: cofre y círculo
curativo de diez segundos. Los enemigos ya presentes continúan luchando.

En el cementerio los orígenes son sepulcros. Los esqueletos y zombis vinculados
pueden resucitar una vez, tras tres segundos de aviso; hay máximo cuatro
resurrecciones pendientes por sepulcro. Destruirlo las cancela. Ningún origen
crea refuerzos ni resurrecciones durante el jefe final.

## Presentación, sonido y datos

Las demostraciones ofrecen arma base, seis técnicas y activa. Usan enemigos,
proyectiles y zonas reales sin consumir el azar de la partida, modificar su
estado, emitir avisos ni reproducir sonidos. Se detienen al salir de la ficha;
con movimiento reducido muestran un fotograma estático.

El paneo tiene alternativa mono automática si el navegador no ofrece
StereoPanner. Cada bus temporal se desconecta después del efecto, y la música
mantiene su bus independiente.

El daño por habilidad descuenta armadura y evita contar sobre-daño. La curación
activa se atribuye a quien la lanza; el control cuenta aplicaciones limitadas por
enemigo y segundo, además de rupturas de postura. No equivale a segundos de
aturdimiento. Los efectos diferidos conservan fuente y potencia, incluidos ecos
y enlaces. Los resultados se guardan para el jugador local, también de invitado.

El historial valida personajes, mapas, rangos y valores; conserva treinta entradas
entre dispositivo y cuenta y muestra las últimas cinco comparables. Compara solo
mismo personaje, mapa, solitario/cooperativo y categoría diaria/normal. Los retos
diarios de fechas distintas pueden tener reglas diferentes; las diferencias no
son una valoración automática del jugador. Conserva técnicas y rama activa.

## Validación

103 pruebas de simulación, demostraciones de los 192 ataques en Chromium de
escritorio y móvil emulado, nueva interfaz completa en 2D/3D y revisión visual
con siete resoluciones. Los recorridos de navegador generales verifican sprites,
mapas y estabilidad; el protocolo cooperativo usa transporte simulado en este
entorno. No acredita WebRTC entre redes reales ni sustituye teléfonos físicos o
Safari. El equilibrio y la diversión necesitan partidas humanas.

Se corrige además una oferta que podía perder la pasiva de evolución al insertar
una técnica nueva. Los orígenes usan identificadores separados de los puntos de
interés, evitando conceder su estado de destrucción al campamento equivocado.
