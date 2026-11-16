# Plantel, equipamiento y apertura del cofre

El plantel pasa a 30 personajes. Cada uno mantiene su arma, ataque normal,
activa con dos variantes y ocho técnicas automáticas de cinco rangos (40 rangos).
El jefe final sigue entrando a 25:00. Las técnicas nuevas reutilizan el sistema
real del arma propia; no equipan armas de otro personaje.

| Personaje | Arma | Desbloqueo alternativo al cofre |
| --- | --- | --- |
| Cira | Tijeras de acero, dos cortes | Completar una partida |
| Mara | Garfio de abordaje, golpe y tirón | 250 enemigos acumulados |
| Ada | Diapasón industrial, ondas | Sobrevivir 10 minutos |
| Oriel | Prisma de refracción, haces enlazados | 1.000 enemigos acumulados |
| Yago | Estandarte, pulsos y activa protectora | Cinco jefes acumulados |
| Rook | Bumerán de rastreador, ida y vuelta | Sobrevivir 20 minutos |

Se reconocen también los requisitos ya cumplidos en una partida guardada. Estos
regalos no consumen monedas ni modifican estrellas de personajes conseguidos.
Los seis personajes participan además en el cofre normal y sus rarezas.

Seguimiento se ofrece desde el nivel 24 y 10:00: dos ataques sucesivos con el
arma propia. Ruptura aparece desde el nivel 40 y 16:00: un ataque pesado con
presión de postura. Los rangos se distribuyen por la progresión temporal existente.
Las técnicas listas esperan un objetivo, salvo la defensa ante proyectiles; se
intercalan cada 12 fotogramas, dando prioridad a Concentración cuando hay un
Enlace disponible. Iria concentra el ataque en un enemigo marcado a su alcance.

## Apariencia compartida

Diez perfiles de ropa cambian volumen del torso, hombreras, chalecos, abrigos,
capas cortas, botas, bufandas, carcajes y mochilas. La misma ficha genera retrato,
sprite y modelo 3D, con manos y agarres del esqueleto compartido. El arco conserva
el anclaje de cuerda y mano. Las armas nuevas tienen dibujo y geometría propios.
El 3D conserva grupos instanciados; no crea un objeto independiente por enemigo.

## Apertura

El cofre abre su tapa y deja salir luz cálida del interior: abertura luminosa,
halo y haz dorado ascendente. El personaje aparece grande desde la abertura y
vuela a su tarjeta. En una tirada de diez se presentan los diez en orden y se
colocan individualmente en una cuadrícula de cinco por dos. La luz se mantiene
mientras el cofre está abierto.

La tirada se guarda una sola vez antes de la presentación. «Ver todos» completa
la secuencia sin volver a sortear ni cobrar. Los callbacks y animaciones pendientes
se cancelan para evitar resultados repetidos. Movimiento reducido muestra todos
los premios inmediatamente y conserva el brillo estático. Hay composiciones
compactas para móvil vertical y horizontal.

## Ajustes de lo existente

El plantel permite buscar y filtrar por disponibilidad y familia de arma,
conservando el orden por rareza. El historial muestra hasta 30 partidas y permite
filtrar personaje y mapa. Resultados ordena las métricas por daño, curación o
aplicaciones de control. Las nuevas reglas usan firma de comparación versión 3;
las partidas anteriores se conservan, pero no se comparan como reglas idénticas.

Los ajustes añaden HUD discreto y anticipación opcional de cámara al caminar,
respetando movimiento reducido. Los nidos lejanos no ocupan los dos puestos de
refuerzos próximos al equipo. Bosque y playa agrupan la decoración con ruido
repetible y conservan los caminos despejados.

## Comprobaciones

`tests/survivors.roster.cjs` cubre contenido, desbloqueos retroactivos, conservación
de monedas/estrellas, espera de objetivos, prioridad del Enlace, segundo ataque
único con atribución correcta y daño de las seis armas nuevas.
`tests/survivors.gacha-theatre.cjs` comprueba apertura grande, brillo dorado,
colocación secuencial, salto sin doble premio, movimiento reducido y tamaños
móviles. Se complementan con las regresiones de simulación, personajes, HUD,
cuatro mapas, previsualizaciones y protocolo cooperativo.

Las pruebas móviles se ejecutan en Chromium emulado; no equivalen a una revisión
física en Android o Safari/iOS. El transporte cooperativo se prueba simulado.
