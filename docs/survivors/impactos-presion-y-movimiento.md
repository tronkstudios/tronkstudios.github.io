# Impactos, presión y movimiento

Esta revisión corrige impactos que podían verse sin causar daño y añade decisiones
de movimiento y ataque. El jefe final conserva su entrada a 25:00.

## Impactos que conectan

Los proyectiles comprueban todo el segmento que recorren en cada paso, incluidos
los disparos enemigos. Un proyectil rápido ya no puede saltarse un objetivo entre
dos posiciones. Los contactos se resuelven por distancia de entrada, para que una
flecha sin penetración golpee al primero que cruza y no al primero de una celda.

Los enemigos en fase no consumen penetración ni se registran como golpeados.
Una esquiva de ninja tampoco aplica la marca de Iria ni consume la marca de su
Concentración antes de confirmar el impacto. Los
cortes normales aplican daño durante una ventana breve de su animación, no antes
de mostrarla; cada enemigo recibe un único impacto por corte. El radio del cuerpo
cuenta al tocar el borde del arco o la punta de una estocada. Los puñetazos usan
el centro de contacto del torso en lugar del punto de apoyo de los pies.

Seguimiento y Ruptura ahora ejecutan también las armas que tenían su rutina fuera
del disparo normal: drones, discos, perfume y puños. Los golpes diferidos y las
posiciones de fuego conservan propietario, técnica y multiplicador de daño.
Las cartas tienen en cuenta el golpe fuerte de los puños y los pulsos de perfume.

## Más presión, con velocidad limitada

La curva de salud, daño y salud de jefes crece más desde el tercer minuto. La
frecuencia de aparición aumenta gradualmente después de 3:00, manteniendo el
presupuesto de enemigos vivos. Las pinzas conservan su aviso y abertura, pero su
intervalo baja con el tiempo sin superponerse a una brecha o jefe.

| Minuto | Vida normal anterior | Vida normal nueva |
| --- | ---: | ---: |
| 5 | ×2,83 | ×2,96 |
| 10 | ×6,00 | ×7,83 |
| 15 | ×10,50 | ×16,52 |
| 25 | ×23,50 | ×48,02 |

A 25:00 la vida de jefe pasa de ×5,11 a ×14,79 y el daño de ×6 a ×9,87.
La velocidad normal tiene un límite de ×1,85. Los tiradores a distancia disparan
más deprisa con el tiempo; desde 10:00 añaden dos trayectorias laterales, con
velocidad de proyectil limitada al 135 % de la original. Las ralentizaciones
pierden eficacia ante jefes, élites y enemigos tardíos; no se convierten en una
forma de inmovilizar indefinidamente a toda la horda.

## Impulso manual

Mayúsculas o el botón «Impulso» desplazan durante diez pasos en la dirección
solicitada. Sin dirección se usa la orientación de ataque. Recarga fija de seis
segundos y sin invulnerabilidad: sirve para salir de una trayectoria, no para
atravesar enemigos sin consecuencias. Cada tramo corto resuelve agua y obstáculos.

El control funciona con el joystick mantenido y un segundo dedo. También admite
teclado y activación accesible. El anfitrión simula el movimiento del invitado y
sincroniza su estado y recarga. El HUD del invitado puede dibujarse antes de
recibir la primera instantánea de la partida.

## Diez técnicas por personaje

Los 30 personajes pasan de ocho a diez técnicas, con cinco rangos cada una:
300 técnicas y 50 rangos por personaje, además del arma base y la activa.

- **Fuego cruzado:** desde nivel 16 / 5:00, dos ataques nativos con orígenes en
  los flancos y trayectorias diferentes.
- **Baluarte:** desde nivel 34 / 14:00, una posición fija que emite cuatro ataques
  del arma durante dos segundos. Solo puede existir una por jugador. Su círculo
  y cuatro marcas indican de dónde dispara y cuántas emisiones quedan.

Ambas usan el arma propia, también en sus efectos y estadísticas. Las diez
variantes de icono tienen señales diferentes sobre el icono del arma. El HUD
muestra I–X y se compacta en móviles pequeños para mantener visibles equipo,
compañeros y controles. Las comparaciones de historial usan firma versión 4,
conservando los registros anteriores sin mezclar reglas de dificultad distintas.

## Validación y límites

Las 150 pruebas de simulación incluyen regresiones de segmentos rápidos y orden de contacto,
objetivos fuera de trayectoria, fase, ventanas de corte, bordes de estocada,
daño real y atribución de cuatro técnicas en las 30 armas, impulso, disparos
hostiles, curva de dificultad y arranque del invitado sin instantánea.

En un escenario fijo con semilla 37, espada evolucionada, estadísticas fuertes y
todas las técnicas al máximo, una configuración inmóvil durante 90 segundos desde
15:00 pasa de cero daño recibido a 157. Se prueban por separado arco y viento.
Es una prueba de presión con equipamiento forzado, no una medición de dificultad
para una partida humana con progresión normal.

Las comprobaciones de navegador cubren escritorio 3D, móvil 2D, 300 iconos,
previsualizaciones, movimiento con teclado y dos dedos, HUD completo en siete
resoluciones y protocolo cooperativo con transporte simulado. Móvil emulado en
Chromium; no acredita una revisión física en Android/iOS ni conexiones entre
redes reales.
