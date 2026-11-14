# Estrategia, cofres y mapas

## Dos caminos de evolución

Los 24 personajes conservan su arma y sus seis técnicas. Con el arma a nivel 6
y su pasiva de evolución, un cofre ofrece dos ramas excluyentes y suministros:

- **Impacto:** sobre los valores evolucionados, +45 % de daño, −15 % de área
  y recarga un 18 % más lenta.
- **Dominio:** +40 % de área, dos ataques adicionales, −20 % de daño y recarga
  un 10 % más rápida.

Duna tiene nombres y comportamientos propios: **Ojo del huracán** genera un
huracán potente que sigue al personaje; **Vientos errantes** genera más tornados,
más amplios y rápidos, que avanzan en línea recta. Sus técnicas conservan sus
patrones y aplican los modificadores de la rama. El límite compartido de daño
evita multiplicar el daño al superponer tornados del mismo jugador.

La elección queda fijada durante la partida. Nombre y rama se muestran en la
pausa y el inventario y se sincronizan con los invitados.

## Cofres tácticos

Recoger un cofre da 40 monedas al equipo y abre una elección por jugador conectado.
Sin evolución disponible ofrece una mejora propia, apoyo y suministros. Si no
quedan mejoras, las alternativas son monedas o curación. Los suministros curan
40 puntos, atraen las gemas existentes y suman 20 monedas al equipo.

Los cofres no gastan ni sustituyen niveles pendientes. Se resuelven en cola y
se pausa la simulación mientras se elige. No tienen cambio de opciones; la
interfaz bloquea brevemente la entrada al abrir cada elección para evitar que
una doble pulsación seleccione la siguiente recompensa. Los desconectados no
reciben una recompensa pendiente.

## Roles y jefes

- **Guardián**, desde 4:00: su escudo frontal reduce el daño al 22 %. Gira con
  velocidad limitada, permitiendo rodearlo. Las farolas activas anulan el escudo.
- **Sanador de la horda**, desde 7:00: cura un 8 % de vida máxima a hasta cinco
  enemigos normales cercanos cada cuatro segundos; no resucita ni cura jefes.
- **Tirador de precisión**, desde 10:00: marca una posición durante un segundo
  y dispara hacia ella; deja tiempo para apartarse.

Estos roles tienen límites de aparición natural y señales propias en 2D/3D.
El ritmo general de dificultad y el jefe final a 25:00 se conservan.

Los siete tipos de jefe cambian de táctica al cruzar dos tercios y un tercio de
vida. Combinan cargas con trayectoria marcada, anillos con una abertura verde,
ráfagas dirigidas, refuerzos anunciados, emboscadas o charcos peligrosos según
su identidad. Las cargas, ráfagas y peligros de suelo avisan un segundo antes;
el HUD muestra la táctica actual. Las invocaciones tienen límite por jefe y se
cancelan si el jefe muere antes de materializarlas. Superar la barra del jefe
final sigue iniciando otra ronda más difícil, hasta caer.

## Mecánicas de cada mapa

Se activan permaneciendo dos segundos en el círculo. Cada punto se usa una sola
vez; el HUD indica progreso, duración o guardianes restantes.

| Mapa | Mecánica |
| --- | --- |
| Bosque | Tres campamentos: curan 2 puntos por segundo durante 20 segundos a los jugadores cercanos. |
| Cementerio | Tres altares: invocan guardián, sanador y esqueleto. Derrotar a los tres entrega un cofre. |
| Ciudad | Tres farolas: durante 20 segundos curan, revelan fantasmas, anulan escudos y ralentizan enemigos cercanos. |
| Playa | Corrientes que desplazan jugadores y enemigos terrestres en el agua, incluso en reposo. Se pueden contrarrestar moviéndose. |

El agua sigue siendo transitable y ralentiza. Los refugios tienen modelos e
indicadores en ambos renderizadores; las luces 3D se desactivan en efectos bajos.

## Combinaciones cooperativas y respuesta visual

Un tornado cerca de una llamarada de otro jugador conectado se convierte durante
tres segundos en **Vórtice ígneo**, naranja y con +30 % de daño. El hielo marca a
los enemigos como mojados durante tres segundos; el agua también los moja.
Electricidad sobre un enemigo mojado por otra fuente causa +25 % de daño y puede
saltar a dos enemigos cercanos con daño reducido, una vez cada dos segundos por
objetivo. Los saltos no generan nuevos saltos. El HUD anuncia las combinaciones.

Los golpes añaden trazos breves y limitados por fotograma, las armas evolucionadas
usan dorado o turquesa según la rama y el ataque desplaza ligeramente la pose
sin cambiar la colisión. El movimiento reducido desactiva ese desplazamiento;
los efectos bajos reducen también los impactos.

El objeto de curación se llama exactamente **jensalada** en ambos idiomas. Su
icono y modelo representan un porro con papel, filtro y brasa. Conserva la
curación: 30 puntos al recogerlo del suelo y 40 en la carta de curación.
La clave interna `bocadillo` se mantiene para compatibilidad.

## Validación

Las 59 pruebas de simulación y las pruebas de estrategia, escritorio, móvil,
contenido, cofres y protocolo online comprueban estas rutas. El transporte online
se probó con canales simulados por la política ICE del entorno; no acredita
conectividad WebRTC entre redes. El equilibrio necesita partidas humanas y
Safari/iOS requiere una prueba en un dispositivo físico. No hay migración nueva
de base de datos; sigue siendo necesaria la migración de partidas de más de
30 minutos descrita en [Supervivencia](supervivencia.md).

La ampliación de rachas, recogidas, objetos y modelos se describe en
[Sensaciones y objetos](sensaciones-y-objetos.md).
