# Primera tanda de combate propio y reliquias

Se aplica la primera tanda priorizada de la investigación: espada, arco y viento,
reliquias pequeñas y opcionales, coherencia de sus ataques y presión intermedia.
El plantel continúa en 24 personajes. El jefe final sigue llegando a 25:00; las
partidas continúan por fases hasta caer. No se cambia la economía de monedas.

## Tres kits con seis comportamientos

Se conservan los seis identificadores de técnica, sus cinco rangos y los
requisitos de nivel y tiempo existentes. Sus cartas y la guía explican el
comportamiento específico. Los iconos combinan el arma propia con un símbolo de
trayectoria o función. Las cartas de estas técnicas comparan potencia nominal por
impacto, incluida maestría, potencia del personaje y los coeficientes particulares
del ataque; no prometen daño final tras armadura, variación aleatoria o esquivas.

| Técnica | Ranjay: espada | Iria: arco | Duna: báculo de viento |
| --- | --- | --- | --- |
| I | Tres cortes frontales sucesivos | Tres flechas rápidas | Un tornado recto y estrecho |
| II | Giro completo repartido en cuatro sectores | Abanico frontal de cinco flechas | Dos remolinos fijos adelantados |
| III | Estocada estrecha que atraviesa una fila | Una flecha que atraviesa varios enemigos | Tornados rectos en un abanico estrecho |
| IV | Corte defensivo y bloqueo de un proyectil durante un segundo | Cuatro flechas cortas que ralentizan | Tres tornados orbitales |
| V | Corte frontal concentrado con preparación | Una flecha potente con preparación | Un gran remolino fijo sobre el objetivo |
| VI | Seis cortes sucesivos alrededor | Tres salvas frontales escalonadas | Seis tornados en espiral |

Los cortes de Ranjay aplican daño en su fotograma de impacto; sus estelas previas
no causan daño. La estocada conserva la espada y usa una pose propia tanto en
2D como en 3D. Sus treinta fotogramas nuevos y sus destellos mantienen encuadre
y pies. Los anchos de barrido se transmiten al renderizado. Las flechas usan
coordenadas de dibujo compatibles con su colisión y apuntan al cuerpo del
objetivo; la flecha concentrada y la de control tienen acentos distintos.

Los tornados mantienen la ventana compartida de daño por atacante. Generar más
remolinos superpuestos no multiplica su daño sin límite. Las otras familias
conservan sus ataques existentes.

## Tres reliquias de partida

Máximo de dos reliquias por jugador; no ocupan espacios de pasiva y se reinician
al empezar otra partida. En los cofres pares del equipo puede aparecer una
reliquia aún no poseída, en la segunda opción. La evolución y su pasiva requerida
conservan prioridad. Los suministros siguen disponibles como tercera opción.
No se consumen niveles pendientes para recoger una reliquia.

- **Prisma de desvío:** flechas, virotes, kunais y copos pueden dirigirse a otro
  enemigo tras un impacto, una vez por proyectil, con la mitad de potencia.
  Solo se ofrece a personajes con esas armas. No se cambia el tipo de proyectil.
- **Botas de resonancia:** recorrer 160 pasos reales genera una onda cercana
  de empuje y daño. Tiene una recarga mínima de tres segundos. No acumula
  recorrido a partir de pulsaciones sin desplazamiento ni de un teletransporte
  arbitrariamente grande; un jugador caído no puede activar la onda.
- **Semilla de refugio:** recoger jensalada deja un círculo de cinco segundos
  que cura dos puntos por segundo a los aliados vivos dentro de él. Cada
  jugador mantiene como máximo un círculo. La curación respeta la vida máxima
  y no reanima a caídos ni afecta a desconectados.

La pausa muestra nombre, icono, efecto y espacios usados. Los resultados
muestran las reliquias del jugador local. Las elecciones, propiedad, variantes
de flechas, pose de espada, círculos y avisos se transmiten a invitados.

## Pinzas de la horda entre el minuto 10 y el final

Desde 10:00 se intenta anunciar una formación cada 90 segundos. Se pospone
30 segundos si hay un jefe, una brecha, una brecha inminente o demasiados
enemigos. Se omiten los avisos que no podrían completarse antes del jefe final.

La formación avisa durante 1,5 segundos con una señal de radio y un círculo.
Una abertura turquesa de aproximadamente 120 grados y una línea de dirección
indican por dónde salir. Se crean como máximo veinte enemigos en el arco
contrario, a distancia del centro anunciado. No se generan enemigos dentro de
la abertura, aunque el terreno y los enemigos anteriores siguen existiendo.

La formación alterna casco, antitronk, corredor y esqueleto, con el escalado
normal existente. Comparte el límite de población de la oleada, ajustado al
tamaño del equipo y a los modificadores. No adapta a escondidas la dificultad
al daño del jugador ni añade multiplicadores específicos a esos enemigos.
La pausa informa del próximo intento; su fecha puede posponerse por las
condiciones anteriores. Los invitados reciben el mismo aviso y calendario.

## Validación y límites

Las 86 pruebas de simulación incluyen los dieciocho comportamientos, daño en
el instante de impacto, bloqueo de un solo proyectil, daño nominal de cartas,
requisitos y compatibilidad de reliquias, propiedad por jugador, reinicio,
rebote único, recarga de botas, curación limitada y sincronización. Las pruebas
comprueban también avisos, abertura, pausas y aplazamientos de la formación,
además de conservar el jefe final a 25:00.

La prueba `survivors.combat.cjs` comprueba iconos, fotogramas de estocada,
recompensas, pausa, resultados y avisos en escritorio 3D y móvil 2D emulado.
La prueba online verifica elecciones independientes de reliquia mediante
transporte simulado. Los tests existentes de contenido cubren los 24 personajes
con ambos renderizadores. El equilibrio se debe afinar con partidas humanas;
estas pruebas comprueban reglas, funcionamiento y presentación, no diversión.
