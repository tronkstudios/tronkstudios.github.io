# Revisión visual antes de integrar

La revisión se centra en la presentación del juego, sin añadir sistemas de
combate. Se inspeccionan los 24 personajes en retrato y en cinco direcciones,
sus modelos 3D, los enemigos y las pantallas de menú, personajes, mapas,
ajustes, elección, pausa y resultados. Las hojas de modelos permiten comparar
ropa, arma, orientación, agarres y encuadre.

## Problemas corregidos

- En móvil horizontal, el bloque de reloj e información secundaria podía
  coincidir con la barra del jefe y la racha. Se distribuyen las columnas,
  reservando espacio para el estado, el jefe y los compañeros.
- En móvil estrecho, los nombres largos y las cifras de recogida podían
  invadir otras zonas. Los nombres conservan el texto completo en su atributo
  de título y los avisos de recogida se ajustan al ancho de su columna. Los
  títulos de jefe admiten dos líneas sin invadir el equipo.
- Los nombres flotantes de varios jugadores próximos se superponían. Ambos
  renderizadores usan ahora etiquetas en píxeles de pantalla, acotadas en ancho,
  con color por jugador, distribución que evita otras etiquetas, cuerpos y
  paneles del HUD, y líneas que identifican al compañero cuando se desplazan.
  El jugador local conserva su nombre en el HUD. Si no hay espacio libre se
  prioriza no tapar la acción; el panel del equipo mantiene la identificación.
- Las copas 3D podían ocultar completamente a un personaje. Árboles, pinos y
  palmeras usan follaje translúcido cuando un personaje queda en su zona de
  ocultación. Los troncos y las colisiones no cambian. Se emplean dos lotes de
  instancias con capacidad fija. En 2D, la transparencia existente se amplía a
  compañeros, además del jugador local.
- Los anuncios y avisos de una partida anterior podían verse tras iniciar otra
  rápidamente. Se limpian al cambiar de partida y los avisos diferidos de
  logros, misiones, mapas y tutorial conservan el identificador de su pantalla.
  Los premios se conceden al calcular el resultado, aunque el aviso se cancele.
- Durante el combate táctil solo se presenta un aviso temporal a la vez; el
  cálculo y el guardado de premios no cambian.

La distribución de etiquetas consulta las reservas del HUD con caché y se
invalida cuando se actualiza su contenido o cambia la resolución. No se leen
las posiciones de todos los paneles en cada fotograma.

## Comprobaciones

`tests/survivors.visual.cjs` monta un equipo de cuatro personajes con nombres
largos, técnicas y pasivas completas, dos reliquias, jefe, racha, recogidas y
reanimación. Comprueba límites e intersecciones de paneles y etiquetas en
1280×800, 1024×768, 800×600, 320×568, 390×844, 568×320 y 844×390. Incluye densidad de píxel doble
en móvil, estado de reanimación del jugador local, pausa con estadísticas abiertas y reinicio durante los avisos de
resultados. Verifica también que las recompensas ya concedidas se conservan.

La prueba gráfica de follaje distingue un personaje oculto por un árbol, un
personaje lejano y un enemigo. En 2D comprueba que el árbol se atenúa cuando
quien queda detrás es un compañero. El menú con demostración se revisa después
de volver de la partida para detectar errores exclusivos de esa transición.

La prueba general de navegador conserva la comprobación de sprites, destellos,
coordenadas finitas, movimiento, pausa y los cuatro mapas con 2D y 3D. Se
mantienen las 86 pruebas de simulación.

Las resoluciones móviles se emulan en Chromium; esta revisión no sustituye una
comprobación en Safari/iOS y Android físicos. La coincidencia exacta de fuentes,
antialiasing y rendimiento puede variar por dispositivo. La prueba 3D usa la
misma versión de Three.js del juego almacenada en caché local del entorno.
