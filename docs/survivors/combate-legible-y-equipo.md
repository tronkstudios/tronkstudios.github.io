# Combate legible y equipo consultable

Esta ampliación mejora lo existente: impactos coherentes, decisiones de mejora y
amenazas que se puedan leer. Mantiene los 30 personajes, diez técnicas por
personaje, el impulso y la entrada del jefe final a 25:00.

## Correcciones de combate

- Un disparo enemigo que cruza varios compañeros golpea primero al que encuentra
  en su trayectoria, sin depender del orden de los jugadores en la sala.
- Las llamas usan el torso y radio del enemigo, igual que los cortes. El contacto
  con los bordes del cono causa daño; un enemigo fuera del cono queda excluido.
- Sin objetivo, el apuntado respeta el vector vertical completo; no añade una
  componente horizontal por la orientación del personaje.
- La corriente de playa se reparte entre los subpasos de movimiento. El impulso
  conserva su velocidad y ralentización por agua sin multiplicar la fuerza de la
  corriente.

## Amenazas y rendimiento

Los enemigos a distancia avisan durante medio segundo. Fijan las trayectorias al
iniciar el aviso y no persiguen al jugador con la puntería mientras carga. Desde
10:00 anuncian sus tres trayectorias. El aviso sigue la posición del tirador si
recibe empuje y se cancela al morir o perder su postura. El tiempo de preparación
forma parte de la cadencia existente. El francotirador conserva su segundo de
preparación y también limpia los avisos cancelados.

Los brujos anuncian cada invocación durante un segundo. Cada origen mantiene como
máximo seis invocados vivos; las reservas pendientes cuentan para ese límite y
para el presupuesto global. La resolución comprueba otra vez los límites y que
el origen siga vivo. También se aplica el presupuesto global a invocaciones de
jefes, evitando acumulaciones que degraden el rendimiento.

Balas, estrellas, masas de baba y orbes tienen siluetas y colores diferenciados
en 2D/3D. La posición de los disparos hostiles 3D corresponde ahora al espacio de
colisión del torso y no se desplaza al activar contraste. Los avisos de peligro
incorporan una cuenta atrás y las zonas activas una cruz central. El modo de
movimiento reducido detiene el vaivén de gemas y la vibración de rayos 3D.

## Elecciones y consulta

Cambiar opciones prioriza mejoras que no estaban en la selección anterior. Si
quedan pocas, rellena con las anteriores sin duplicarlas. Si no existe ninguna
alternativa, conserva tanto las cartas como la carga. No consume niveles ni
avanza la simulación. Los invitados reciben la respuesta aunque no pueda cambiar
la selección.

Las 300 técnicas muestran su icono propio y recarga real. Las cartas presentan el
rango actual, siguiente y máximo. En pausa, cada pieza de equipo es un botón de
44 píxeles: muestra descripción, rango, recarga de técnicas y daño, curación o
control atribuidos a esa pieza. Las pasivas distinguen su efecto por rango.

La habilidad activa admite Enter, Espacio y activación accesible sin duplicarse.
Las cartas del invitado se bloquean inmediatamente tras elegir, mientras llega
la respuesta del anfitrión. La firma de reglas pasa a versión 5; los historiales
anteriores se conservan sin mezclar comparaciones entre reglas distintas.

## Verificación

163 pruebas de simulación, incluyendo reproducciones que fallaban antes de estas
correcciones. Recorridos de navegador para equipo, rangos, amenazas, accesibilidad,
HUD completo y cooperativo. Las pruebas móviles usan Chromium emulado; el
cooperativo usa transporte simulado. No equivalen a validación en teléfonos
físicos, Safari/iOS o conexiones entre redes reales.
