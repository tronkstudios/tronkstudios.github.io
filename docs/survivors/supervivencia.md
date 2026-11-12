# Supervivencia, agua y nuevos personajes

La partida tiene una sola progresión. Durante los primeros diez minutos aparecen
hordas y los tres jefes intermedios. Al segundo 600 llega el jefe final del mapa,
también en el reto diario con jefes acelerados. La partida sigue hasta que todos
los jugadores caen; vaciar la barra final inicia otra fase, sin ventana de victoria.

Superar su primera fase cuenta como la victoria usada por logros, desbloqueos y
cuenta. Los finales anteriores a ese hito siguen siendo derrotas. Las fases
posteriores del mismo jefe no suman jefes distintos a las estadísticas. Así se
mantienen las validaciones de la cuenta existentes y no hace falta una migración
SQL para jugar. La clasificación final se envía tras superar la primera fase.

## Escalada

`difficultyAt(t)` en `survivors/js/game.js` centraliza los multiplicadores. Para
`m` minutos de simulación:

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

## Agua

El agua conserva el 58 % del desplazamiento de jugadores y enemigos terrestres,
con pequeñas ondas visuales en los pies del jugador. Afecta también a las cargas
que atraviesan el agua. Los voladores, proyectiles y objetos siguen su comportamiento
normal. Ya no se devuelve a un personaje a la orilla. La dirección de apuntado se
normaliza aparte de la intensidad del joystick y del movimiento diagonal.

## Nix, Savia y Brasa

Los tres se consiguen por el Cofre Tronk con las mismas probabilidades por rareza.
Sus armas también aparecen en las opciones normales de subida de nivel, con seis
niveles cada una.

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
