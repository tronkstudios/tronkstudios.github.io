# Diseño y calidad de juego

## Dirección visual

La interfaz cambia de púrpura saturado y bloques monoespaciados a paneles de tinta
azul, acentos de latón y turquesa y tipografía de sistema. El dorado señala la
acción principal y las evoluciones; el turquesa distingue las técnicas y la
habilidad lista. Las cifras conservan anchura uniforme. Menú, selección, mapas,
mejoras, pausa y resultados comparten superficies, bordes y jerarquía.

El menú presenta al superviviente sobre una composición circular; en móviles
pasa a una ficha horizontal compacta. Se conserva el dibujo del personaje y su
arma. El ajuste de movimiento reducido detiene también su giro.

El terreno usa manchas de ruido suave y grupos de hierba y flores, en vez de
seleccionar un color aleatorio en cada píxel. El bosque tiene verdes apagados,
agua azul verdosa y tierra cálida. La misma textura alimenta el modo 2D y el 3D.
Los árboles 3D añaden raíces, ramas y capas de copa; los pinos, cuatro estratos;
las rocas, piezas secundarias y musgo. La luz solar es cálida y la ambiental fría.
Las piezas siguen usando las mallas de instancias existentes.

## Combate y progresión

- A los 5:00 aparece el primer élite; se intenta añadir otro cada 90 segundos,
  hasta cuatro vivos. Solo se convierten enemigos normales. Conservan su IA,
  tienen tres veces la vida, un 35 % más de daño, un 12 % más de velocidad y
  una silueta un 18 % mayor. Sus valores siguen escalando con el tiempo.
- Halo dorado, rombo y barra de vida distinguen a los élites en 2D y 3D. Dan
  cinco veces la experiencia y cinco monedas extra. Su contador pertenece al
  jugador que da el último golpe.
- Cada jugador tiene tres cambios de opciones por partida. Solo se consumen
  durante su elección pendiente. El anfitrión valida el presupuesto también
  para invitados. No afectan al arma propia ni avanzan el reloj.
- Cuando el arma llega al nivel cuatro, la pasiva necesaria para evolucionar
  aparece en las opciones si aún cabe en el inventario. La carta la señala.
  La ficha y la pausa explican la receta: arma seis + pasiva + cofre. La guía
  avisa si ya no hay espacio para esa pasiva.
- Las técnicas muestran potencia y recarga en su carta; sus huecos del HUD
  indican cuánto falta para atacar. El sombreado se actualiza sin reconstruir
  los iconos a cada cambio de recarga.

El jefe final sigue llegando exactamente a 25:00 y la partida continúa hasta
caer. Estas mejoras no añaden armas ajenas a ningún personaje. El equilibrio
de élites y recompensas necesita también partidas de jugadores reales.

## Información y accesibilidad

La brújula señala el cofre más cercano y prioriza compañeros caídos conectados.
Las distancias son pasos de juego. Las instantáneas incluyen los cofres lejanos
para que el invitado pueda encontrarlos. El HUD señala el agua, un jefe que vaya
a llegar en los próximos 30 segundos y la vida crítica mediante un borde fijo.

Pausa y resultados muestran daño real causado (sin daño sobrante), daño recibido,
vida recuperada (sin curación sobrante) y élites derrotados. Las métricas son por
jugador y viajan en las instantáneas y el resultado cooperativo. Los cofres
recogidos se cuentan por equipo. La curación ya no muestra siempre +30 aunque
solo falten unos pocos puntos de vida, y no cambia la vida de compañeros caídos.
Los cofres dejan de asignar mejoras a jugadores desconectados.

Ajustes persistentes:

- Movimiento y destellos reducidos, con el valor del sistema como opción inicial.
- Contorno de alto contraste en proyectiles enemigos, en ambos renderizadores.
- Cámara amplia, equilibrada (predeterminada) y cercana. Cambiar la calidad
  gráfica no cambia su escala.

El modo de efectos bajos reduce también la resolución 3D y desactiva sombras.
Los modales contienen el foco de Tab y ofrecen contornos visibles. La pausa
permite activar pantalla completa si el navegador lo admite. Una partida en
solitario se pausa al perder el foco; requiere pulsar Seguir para continuar.
Las partidas online siguen activas mientras se abre la pausa local. Los avisos
simultáneos se limitan a cuatro para no cubrir toda la pantalla.

## Comprobación y publicación

`tests/survivors.polish.cjs` comprueba el recorrido con 3D, fallback 2D y móvil.
`tests/survivors.online.cjs` comprueba también un cambio de opciones del invitado.
La simulación tiene 42 casos. Véase `tests/README.md` para reproducirlos.

La migración de duración `docs/supabase/survivors-25-minutes.sql` incluida en la
misma PR sigue siendo necesaria para guardar derrotas que superen los treinta
minutos. No hay un cambio de esquema adicional por los nuevos élites o métricas.

La ampliación a 24 personajes, seis técnicas por personaje, ilustraciones de menú
y brechas se documenta en [Progresión y cooperativo](progresion-y-cooperativo.md).
