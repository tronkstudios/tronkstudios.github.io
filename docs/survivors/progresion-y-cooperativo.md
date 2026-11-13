# Progresión, encuentros y cooperativo

La ampliación se centra en la partida: cinco supervivientes nuevos, más técnicas
propias, presión creciente, objetivos intermedios y mejor lectura del combate.

## Plantel y ataques

El plantel suma 24 personajes. Los nuevos se consiguen mediante el Cofre Tronk,
con las probabilidades de su rareza existentes; no se añaden monedas o compras.

| Personaje | Rareza | Arma | Función y habilidad |
| --- | --- | --- | --- |
| Lumen | Épica | Báculo faro | Pulsos de luz; cura un 25 % a aliados cercanos y adelanta la reanimación de los caídos. Reanima un 50 % más rápido. |
| Iria | Rara | Arco | Flechas penetrantes y una corona de flechas con su activa. |
| Boro | Épica | Bobina Tesla | Descargas encadenadas y control eléctrico cercano. |
| Vega | Legendaria | Abanico de acero | Cuchillas, movilidad y barrido circular. |
| Tala | Rara | Tambor de guerra | Ondas de percusión, empuje y protección breve de aliados. |

Cada personaje conserva su arma durante toda la partida. Las nuevas armas usan
primitivas de combate existentes cuando corresponden (flechas, rayos, cuchillas,
ondas), con sus modelos, iconos, nombres y evoluciones propios.

Hay seis técnicas automáticas por personaje, además del ataque base y la
habilidad activa. Cada técnica admite cinco rangos, para 30 mejoras de técnicas.

| Técnica | Nivel mínimo | Tiempo mínimo |
| --- | --- | --- |
| I y II | 1 | 0:00 |
| III | 8 | 3:00 |
| IV | 18 | 7:00 |
| V | 32 | 12:00 |
| VI | 48 | 18:00 |

Cada rango posterior requiere otros cuatro niveles y 75 segundos de simulación.
Se deben cumplir ambos requisitos. El último rango de VI no puede aparecer antes
del nivel 64 y el minuto 23. Los cofres respetan los mismos requisitos. Cuando
se habilita una técnica todavía no aprendida, aparece entre las elecciones.
La ficha explica sus requisitos; el HUD indica el siguiente desbloqueo y muestra
las recargas con distintivos I–VI. Las elecciones y las pausas no adelantan el reloj.

Duna recibe cuatro patrones nuevos de tornado: avance recto, órbita defensiva,
remolino fijo y espiral. Se mantiene el báculo de viento en todos sus movimientos.
Los tornados de un mismo jugador comparten una ventana de daño de 12 pasos sobre
cada enemigo. Un impacto más fuerte dentro de esa ventana solo aporta la
diferencia respecto al anterior: superponer veinte tornados no multiplica veinte
veces su daño. Los jugadores distintos siguen aportando daño por separado.

## Encuentros y dificultad

La primera brecha aparece al minuto 2. Se intenta iniciar otra tres minutos
después del comienzo de la anterior, cuando ya no hay una activa. Cada brecha
marca cuatro enemigos normales con halo turquesa y barra de vida. Tienen vida
multiplicada por 2,2 y daño por 1,2, además del escalado temporal. Derrotar a los
cuatro deja un cofre y un imán, una sola vez. El HUD muestra cuántos quedan.
Al empezar el jefe final dejan de generarse brechas nuevas.

Se mantienen los élites dorados regulares. Puede haber hasta cuatro regulares y
los cuatro marcados de una brecha. Los élites reciben menos empuje, su
ralentización se limita al 25 % y los tornados los atraen con menos fuerza.

La curva de vida y daño usa ahora `m = minutos × 1000 / TS.RUN_SECONDS`;
con una duración de 25 minutos equivale a dos tercios del minuto real. Al minuto
15, la vida normal multiplica por 10,5 y el daño por 3,2 (antes 5,26 y 2,032).
El jefe final sigue llegando a 25:00. Se conserva su crecimiento por fases.
Estas cifras requieren también pruebas de equilibrio con jugadores humanos;
las pruebas automáticas comprueban reglas, límites y funcionamiento.

## Lectura visual y cooperativo

Las barras de vida de enemigos normales pueden verse al recibir daño (valor
inicial), siempre u ocultarse. Los élites conservan su indicador propio y los
jefes su HUD. La fracción de vida se sincroniza para invitados.

Las ilustraciones 2D de los menús se dibujan de nuevo a alta resolución,
con prendas, cinturones, pantalones y accesorios; no son una ampliación de los
fotogramas de combate. Su encuadre conserva el arma completa. Las siluetas de
combate y las colisiones no cambian por este dibujo.

La reanimación permite acercarse hasta 40,8 unidades de juego. Participa el
compañero conectado con mayor velocidad de reanimación que esté cerca, sin
sumar la velocidad de todo el equipo. El porcentaje aparece en el HUD del caído
y en el equipo; las desconexiones se distinguen y no se pueden reanimar.
La habilidad de Lumen no revive instantáneamente ni cura a un desconectado.

No hay una migración SQL nueva para estos cambios; sigue siendo aplicable la migración de duración del recorrido
de 25 minutos si todavía no se ha ejecutado.
