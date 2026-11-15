# Especializaciones y lectura de mejoras

Cada personaje puede elegir tres especializaciones durante una partida. Se
ofrecen al subir de nivel cuando se cumplen ambos requisitos de la etapa:

| Etapa | Nivel mínimo | Tiempo mínimo | Opciones |
| --- | --- | --- | --- |
| 1 | 15 | 5:00 | Dominio del arma, Cobertura, Paso ligero |
| 2 | 30 | 12:00 | Ritmo de combate, Guardia firme, Recuperación |
| 3 | 50 | 20:00 | Sobrecarga ofensiva, Control del terreno, Última resistencia |

Cada opción combina una ventaja con una penalización. Los porcentajes se suman
como puntos a las bonificaciones del personaje y sus pasivas. La recarga mantiene
el límite existente del 45 % del tiempo base; las cartas comparan el resultado
real después de aplicar ese límite. Aumentar vida máxima añade también la
diferencia a la vida actual, como las pasivas existentes; reducirla limita la
vida actual al nuevo máximo. Un compañero caído mantiene cero de vida hasta
ser reanimado; aumentar su máximo no lo cura mientras está caído.

La elección consume una subida de nivel normal, no ocupa un espacio de pasiva,
no añade armas de otro personaje y no se guarda entre partidas. No se pueden
cambiar estas tres opciones con una tirada: todas están disponibles. Las etapas
se completan en orden, una por subida, aunque el jugador haya alcanzado los
requisitos de varias etapas. Un cofre conserva sus recompensas habituales.

En cooperativo cada jugador elige su propia especialización. El anfitrión calcula
los efectos y envía identificadores y estadísticas en las instantáneas. Los
resultados y la pausa muestran las elecciones del jugador local; la pausa permite
desplegar sus estadísticas y consultar el siguiente requisito. El resumen
desplegable forma parte de la navegación con Tab dentro del diálogo.

Las cartas de pasivas y especializaciones comparan valores antes y después,
señalando ganancias y costes. Las mejoras del arma comparan hasta tres cambios
de potencia nominal por impacto, recarga, cantidad y área, incluyendo maestría
y bonificaciones del personaje. La potencia nominal no representa el daño
final después de armadura, críticos, combos o condiciones del enemigo. Las
curaciones muestran el incremento de vida posible, respetando el máximo.
La descripción de técnicas tiene en cuenta los multiplicadores de Concentración
y de la técnica definitiva.

## Recargas

Cambiar el multiplicador de recarga conserva el porcentaje pendiente de la
habilidad activa, el arma, las técnicas, los drones y los contactos orbitales.
También se alargan proporcionalmente al elegir una penalización de recarga.
Los contactos ya vencidos no se retrasan. Los indicadores de preparación se
limitan a 0–100 %, tanto para anfitrión como para invitado.

## Validación

Las 75 pruebas de simulación cubren las nueve opciones, requisitos para los 24
personajes, recompensas de cofre, elecciones independientes, reinicio, vistas
previas sin mutaciones, transmisión de estadísticas y ajuste de recargas.
`survivors.specializations.cjs` comprueba cartas, penalizaciones, resumen de
pausa y resultados en escritorio y móvil emulado. La prueba online comprueba
opciones distintas entre anfitrión e invitado mediante transporte simulado;
esto no verifica WebRTC entre redes reales ni dispositivos iOS físicos.
