# Claridad y controles sobre las mecánicas existentes

Esta tanda implementa las doce mejoras aprobadas sobre el combate, las
variantes activas, las demostraciones, los orígenes y los resultados existentes.
Conserva el plantel de 24 personajes, sus armas y el jefe final de 25:00.

| Mejora | Resultado |
| --- | --- |
| Postura visible | Barra dorada de acumulación; ! durante interrupción; × y barra gris rayada durante resistencia. |
| Enlace visible | Concentración se ilumina y muestra los segundos que quedan para aprovechar el enlace. |
| Marcas de Iria | Rombo persistente de color por atacante con duración, hasta consumir la marca o agotarse. |
| Demostración completa | Arma y técnicas con rango 1–5; activa base y sus dos variantes con descripciones y costes. |
| Personalidad de activas | 48 nombres propios y modificaciones del comportamiento nativo por familia; Duna conserva sus dos tornados. |
| Pulsación anticipada | Una orden recibida en los últimos doce pasos de recarga se guarda hasta estar lista. |
| Colocación de orígenes | Huella seca, sin obstáculos, alejada de otros puntos y con dos accesos locales despejados. |
| Resurrección explicada | Línea de trazos entre sepulcro y aparición, cruz y progreso durante el aviso. |
| Diseño por entorno | Origen orgánico del bosque, sepulcro, antena de ciudad y nido de coral de playa. |
| Brújula fijada | Elección en pausa o pulsando la brújula; mantiene el objetivo pese a otras prioridades automáticas. |
| Rendimiento comparable | Daño por segundo de tiempo disponible, excluyendo pausa, elecciones y tiempo caído. |
| Partidas equivalentes | Comparación exige iguales estrellas, mejoras iniciales, equipo y reglas. |

## Señales y controles

Las mismas funciones dibujan postura y marcas en el mundo 2D y en la capa de
pantalla del 3D. El anfitrión envía acumulación, resistencia, interrupción y marca
con su tiempo de simulación; el invitado no inventa estados de combate. Los
símbolos distinguen acumulación e inmunidad sin depender únicamente del color.
La pausa incluye una leyenda. El enlace muestra un número y una barra; actualizar
el tiempo no reconstruye toda la fila de iconos del HUD.

La pulsación anticipada acepta solo los últimos doce pasos (0,2 segundos a 60 Hz)
y dispara una sola vez. Una pulsación más temprana no queda esperando toda la
recarga. La pausa, desactivar controles, caer y desconectarse cancelan la orden
local. Abrir el menú del anfitrión no borra la orden de sus compañeros. En online
la simulación sigue siendo del anfitrión; la cola no añade comandos ni cambia
la autoridad de combate.

La brújula permite escoger cofres o puntos de interés conocidos desde la pausa.
Pulsarla abre ese selector, también con teclado y táctil. El pin es local y un
invitado puede usarlo sin modificar la partida del resto. Se libera al alcanzar
un punto, cuando desaparece el objetivo o al volver a Automático. Se reinicia
por partida. El modo automático conserva prioridades de rescate y curación.

## Variantes activas nativas

Las 24 fichas ofrecen nombres y descripciones por personaje. Los comportamientos
se comparten donde corresponde a la familia del arma, sin presentar cada nombre
como un sistema completamente distinto ni añadir armas ajenas.

- Espada y estocadas: protección de un proyectil frente a un eco de mayor alcance.
- Arco, virotes, abanico y marea: velocidad y penetración frente a trayectorias abiertas.
- Martillo y puños: +40 % de acumulación de postura por impacto activo, aplicado
  tras el límite normal, frente a ondas de mayor alcance. No incrementa el empuje.
- Hachas: mayor recorrido frente a retorno anticipado del eco. Balones: velocidad y penetración frente a mayor duración.
- Hielo y pulso: ralentización prolongada frente a alcance ampliado.
- Meteoros y ácido: inicio más rápido frente a área o duración del eco.
- Fuego: llamaradas más largas y estrechas frente a cobertura más amplia.
- Discos y rayos: control adicional frente a alcance ampliado.
- Dron: láseres largos y estrechos frente a abanico abierto; dibujo y daño usan la misma geometría.
- Perfume: protección un segundo más larga frente a un refugio breve con el eco.
- Lumen: cura concentrada en el aliado más herido o avance de reanimación frente
  a curaciones compartidas de mayor alcance.
- Duna: tornado viajero o remolino estacionario, con su límite compartido de daño.

Se mantienen los costes de recarga y potencia de cada rama existentes. Los cambios
de área durante un lanzamiento se restauran al terminar; proyectiles y zonas
conservan su fuente y potencia para el daño diferido. Las demostraciones ejecutan
el eco y simulan el rango elegido; no alteran estado, azar ni avisos de la partida.
La activa escala con el nivel de la partida y por eso su selector de rango se
inhabilita; el rango se aplica al arma o a la técnica seleccionada.

## Orígenes y acceso

Se prueban hasta 32 posiciones. La huella debe ser seca y libre de obstáculos;
se exige separación de otros puntos y al menos dos corredores de aproximación
local. Si no se encuentra una posición, se vuelve a intentar treinta segundos
después. Esto verifica acceso local, no promete un camino global por cualquier
configuración de terreno.

Cada origen conserva su identificador, vida, límite de refuerzos y recompensa.
Su tema viaja en la instantánea, y ambos renderizadores muestran la misma
estructura. La antena tiene mástil y señal; el coral tiene ramas y cavidad; el
sepulcro mantiene su lápida. El aviso de resurrección referencia su origen y se
elimina al destruirlo. No añade otro sistema de enemigos o monedas.

## Estadísticas y guardado

Cada habilidad acumula pasos disponibles desde que se posee, solo con el jugador
vivo y la simulación activa. El daño efectivo se divide por ese tiempo; incluye
la recarga normal, no equivale a daño por segundo de animación ni se interpreta
como una puntuación automática de utilidad. Los registros de prueba o antiguos
sin tiempo muestran — en vez de inventar una tasa.

La firma de configuración normaliza personajes, estrellas, mejoras permanentes,
composición de equipo, mapa, modificadores y ayuda inicial. Los diarios incluyen
su semilla. Nombres de jugador y decisiones tomadas durante la partida no cambian
la equivalencia. El historial valida y conserva la firma; entradas antiguas sin
ella se guardan, pero no se usan para afirmar que las reglas eran iguales.

## Verificación

126 pruebas de simulación, incluidos los 23 casos nuevos. La prueba específica
de navegador recorre rangos y variantes, señales, objetivos, diseños por mapa,
tasas de daño, comparación estricta y traducción. Se conserva la regresión visual
de siete resoluciones, recorridos generales y el cooperativo con transporte
simulado. Chromium móvil emula controles y tamaños; no sustituye una prueba
física de Safari/iOS ni acredita WebRTC entre redes reales. El balance debe
contrastarse con partidas humanas.
