# Supervivencia, agua y nuevos personajes

La partida tiene una sola progresión. Durante los primeros veinticinco minutos aparecen
hordas y los tres jefes intermedios. Al segundo 1500 llega el jefe final del mapa,
también en el reto diario con jefes acelerados. La partida sigue hasta que todos
los jugadores caen; vaciar la barra final inicia otra fase, sin ventana de victoria.

Superar su primera fase cuenta como la victoria usada por logros, desbloqueos y
cuenta. Los finales anteriores a ese hito siguen siendo derrotas. Las fases
posteriores del mismo jefe no suman jefes distintos a las estadísticas. Se conservan las validaciones de la cuenta. Para registrar partidas que
superen los treinta minutos hay que aplicar `docs/supabase/survivors-25-minutes.sql`
en Supabase; amplía el límite a cuatro horas sin retirar las demás validaciones. La clasificación final se envía tras superar la primera fase.

## Escalada

`difficultyAt(t)` en `survivors/js/game.js` centraliza los multiplicadores. Para
`m = minutos de simulación × 10 / 25` (curva repartida en 25 minutos):

- Vida de enemigos normales: `1 + 0.35m + 0.06m²`.
- Vida de jefes: `1 + 0.08m + 0.01m²`.
- Daño: `1 + 0.10m + 0.012m²`, también en los proyectiles de los jefes.
- Velocidad normal: `1 + min(0.65, 0.035m)`.

Los enemigos vivos se actualizan cada segundo conservando su porcentaje de vida;
no basta con matar una primera oleada para dejar enemigos débiles en pantalla.
Los objetos rompibles conservan sus valores. La dificultad cooperativa cuenta a
los jugadores conectados, incluidos los que todavía pueden ser revividos.

En cada nueva fase final la vida y daño del jefe multiplican además por
`1 + 0.22 × (fase - 1)`. Su persecución acelera con el tiempo, hasta multiplicar
por cuatro la velocidad normal escalada. Cada vez admite menos ralentización,
hasta un máximo del 8 %. Sigue siendo inmune al empuje como los demás jefes.
El General final avanza en vez de huir permanentemente de armas de corto alcance.

Los bombardeos adicionales avisan un segundo antes en rojo y las descargas son
radiales. La frecuencia aumenta con el tiempo y las fases. Vaciar una barra da
un cofre, recupera un 15 % de vida y concede un segundo de protección. Los ataques
anteriores se reinician para evitar prolongar accidentalmente una carga del jefe.
Los límites de población siguen evitando un número ilimitado de mallas y enemigos.

Estas curvas son un punto de partida de equilibrio: las pruebas comprueban la
escalada y que una configuración fuerte inmóvil acaba cayendo, pero no sustituyen
partidas de jugadores con todos los equipos y niveles de habilidad.

## Ataques propios

Cada uno de los 19 personajes conserva su arma: ataque automático base, dos
técnicas automáticas que se aprenden y mejoran al subir de nivel, y habilidad
activa. Las técnicas tienen tres niveles y recargas propias. Las mejoras y
cofres solo refuerzan el arma del personaje; no conceden armas ajenas. Ranjay
barre con espada y Yant estoca con lanza. Los efectos de perfume, discos,
viales, dron y fuego también conservan su familia visual en 2D y 3D.

La ficha del personaje explica los cuatro movimientos. El HUD muestra las dos
técnicas con distintivos I/II y el nivel aprendido. Se sincronizan con el invitado
mediante las instantáneas online. El daño del arma propia aumenta además un
2,5 % por nivel de personaje, con un máximo del 150 % adicional.

Las oleadas, hordas y jefes intermedios se distribuyen en los 25 minutos:
los jefes intermedios llegan a 7:30, 12:30 y 18:45. El modificador diario de
jefes adelantados solo afecta a los intermedios; el final siempre llega a 25:00.

## Agua

El agua conserva el 58 % del desplazamiento de jugadores y enemigos terrestres,
con pequeñas ondas visuales en los pies del jugador. Afecta también a las cargas
que atraviesan el agua. Los voladores, proyectiles y objetos siguen su comportamiento
normal. Ya no se devuelve a un personaje a la orilla. La dirección de apuntado se
normaliza aparte de la intensidad del joystick y del movimiento diagonal.

## Nix, Savia y Brasa

Los tres se consiguen por el Cofre Tronk con las mismas probabilidades por rareza.
Sus armas tienen seis niveles, y solo aparecen para su propietario.

| Personaje | Arma | Habilidad | Evolución y pasiva |
| --- | --- | --- | --- |
| Nix, rara, casco con antena y equipo turquesa | Discos magnéticos que orbitan y golpean al contacto | Polaridad atrae enemigos normales y descarga daño | Corona Magnética + Imán |
| Savia, épica, sombrero de hongo y frascos | Viales que dejan ácido persistente y ralentizan | Jardín Cáustico crea seis charcos y cura un 15 % | Mar de Veneno + Tiritas |
| Brasa, legendaria, máscara de forja y depósitos | Lanzallamas en cono que sigue al jugador durante la ráfaga | Sobrecarga lanza fuego en todas direcciones | Aliento de la Forja + Escudo |

Hay iconos, retratos, vistas y armas 2D/3D y traducciones al inglés. Los enemigos
3D añaden torsos, armaduras, pouches, cinturones, botas, costillas, heridas y
accesorios según su tipo. Murciélagos, fantasmas y mocos tienen geometría y
caras más detalladas; el Moco Rey lleva corona. Las piezas se dibujan con las
mismas instancias compartidas para conservar el rendimiento.
