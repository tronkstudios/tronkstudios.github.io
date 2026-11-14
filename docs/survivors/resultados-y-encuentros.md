# Resultados y planificación

## Entender una derrota

Cada jugador conserva en memoria sus últimos cuatro golpes de los diez segundos
anteriores. El registro incluye tiempo, enemigo, clase de ataque y vida realmente
perdida, sin contar el daño sobrante. Contactos, cargas, proyectiles, explosiones,
bombardeos y zonas peligrosas transmiten su fuente hasta el cálculo del daño.
Las protecciones que evitan daño tampoco crean entradas.

Al caer, los resultados muestran los golpes de esa vida y una indicación para
evitar el ataque final. El compañero que cae antes conserva su propio resumen
hasta el final del equipo, aunque pasen varios minutos. Una reanimación o segunda
vida inicia un registro nuevo; las estadísticas totales de daño se conservan.
El registro no se guarda como historial permanente. Terminar manualmente una
partida estando vivo no muestra un resumen de muerte.

## Progreso y equipo

La pausa y los resultados muestran la mejor racha de la partida y las
reanimaciones. Solo recibe el crédito quien completa la reanimación y solo una
vez por cada compañero levantado. La mejor racha se guarda en `best.streak`,
y se muestra también en el menú, manteniendo la compatibilidad con partidas guardadas antiguas y la fusión de
progreso remoto. Los récords mejorados de tiempo, bajas, nivel y racha se señalan
al terminar; no añaden monedas ni alteran la puntuación.

Los invitados usan su propia posición en las estadísticas y resúmenes del
resultado, y el personaje real de la partida al guardar el resultado. No se
atribuye al invitado la racha del anfitrión.

## Pausa y mapas

La pausa muestra hasta tres encuentros próximos o activos: jefes, brechas y jefe
final. Usa el reloj de simulación y el multiplicador del reto diario para los
intermedios; el final continúa fijado a 25:00. Las instantáneas incluyen el
próximo momento de brecha para informar también a los invitados.

En cooperativo el menú avisa de que la simulación continúa. El anfitrión ve
«Terminar partida para todos» y el invitado no puede terminar la partida del
equipo desde ese botón. La selección de mapas explica su mecánica y la miniatura
de playa encuadra arena y costa, en lugar de un fragmento que solo contiene mar.

## Correcciones adicionales

- Un proyectil enemigo de un solo impacto deja de dañar a varios jugadores
  superpuestos en el mismo paso. Los ataques de área siguen afectando al grupo.
- Si un personaje coincide exactamente con el centro de un obstáculo, se separa
  con una dirección válida. En troncos y coches se desplaza perpendicularmente
  al segmento para no permanecer dentro de él.
- Las cargas pendientes de pantalla y los resultados diferidos se invalidan al
  iniciar otra partida o volver al menú. Una pantalla vieja no puede reaparecer
  por encima de la nueva.
- Los resultados abren desde arriba, con el título enfocado sin desplazar el
  contenido. Tab y Mayús+Tab permanecen dentro del diálogo.

Las 69 pruebas de simulación cubren las reglas y la persistencia. La prueba de
resultados recorre ordenador y móvil, colisiones exactas, miniatura, récords,
resúmenes, encuentros, menú cooperativo, foco y transiciones. El protocolo online
se comprueba con transporte simulado; Safari/iOS físico y la conexión WebRTC
entre redes siguen necesitando una comprobación adicional.
