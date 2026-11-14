# Pruebas de Tronk Survivors

Las pruebas de simulación no requieren dependencias:

```sh
node --test tests/survivors.test.cjs
```

Las 63 pruebas cubren el cofre, pausa de efectos, desconexiones durante elecciones,
instantáneas online, 24 personajes con su arma y técnicas propias, jefes finales de los cuatro
mapas y fases finales sucesivas, colisiones con enemigos grandes, ralentizaciones, recargas,
fusión de progreso remoto, datos guardados incompletos y tickets de partidas que
terminan mientras empieza otra. Añaden agua transitable con ralentización,
escalada de enemigos vivos, resistencia del jefe a las ralentizaciones,
daño de las tres armas nuevas, bloqueo de armas ajenas, técnicas y sincronización,
escalada repartida en 25 minutos y una prueba de supervivencia con equipo muy fuerte. Los escenarios de combate usan armadura y armas
reforzadas para verificar las rutas de ejecución; no evalúan el equilibrio.

Las pruebas nuevas también cubren élites, sus límites y recompensas, presupuesto de
cambio de opciones por jugador, curación real, métricas sin daño sobrante, pasiva
de evolución, brújula, cofres de compañeros desconectados y sincronización. También verifican curaciones
reservadas a jugadores heridos, conservación de experiencia y atracción al agrupar
gemas, guardianes anclados a su altar, rachas por atacante y avisos de recogida
sincronizados con los invitados.

Las comprobaciones de navegador requieren Playwright y Chromium. Desde la raíz:

```sh
python3 -m http.server 8000
# En otra terminal, con Playwright disponible:
node tests/survivors.browser.cjs
node tests/survivors.mobile.cjs
node tests/survivors.features.cjs
node tests/survivors.polish.cjs
node tests/survivors.expansion.cjs
node tests/survivors.rewards.cjs
node tests/survivors.online.cjs
node tests/survivors.strategy.cjs
node tests/survivors.characters.cjs
node tests/survivors.world.cjs
# Probar el protocolo de juego con transporte simulado:
RTC_TEST_MODE=mock node tests/survivors.online.cjs
```

Se pueden indicar `BASE_URL`, `CHROMIUM_PATH` y `SCREENSHOTS_DIR`.
`ALLOW_TEST_PROXY_CERT=1` permite certificados del proxy de pruebas cuando
Chromium no tiene su CA instalada; no modifica la configuración del juego.

- **Ordenador:** menú, movimiento, pausa y los cuatro mapas con todos los
  personajes, enemigos y jefes, con WebGL y con Three.js bloqueado para forzar
  2D. Detecta recortes y coordenadas de dibujo no finitas en todos los fotogramas
  normales; comprueba que sus destellos conservan las dimensiones, pies y alfa.
- **Coherencia de personajes:** 1.800 fotogramas por dispositivo (24 personajes,
  cinco direcciones, reposo, ocho pasos y seis ataques), pantalones compartidos con
  el menú, contacto de los pies, retratos con cámara común, visor de Boro solo de
  frente y ausencia de ojos duplicados en máscaras. Verifica que el mazo no
  atraviese el suelo, que el arco tenga su propia postura y que la cuerda y el
  agarre coincidan con las manos y que los retratos de las cinco vistas no se recorten.
- **Contenido nuevo:** los 24 personajes, sus seis técnicas y habilidad en 2D/3D,
  efectos de sus armas, HUD final al minuto 25 y vista cercana de enemigos 3D.
- **Diseño y usabilidad:** menú, HUD con élites y brújula, recargas de técnicas,
  guía de evolución, métricas, cambios de opciones, foco de teclado dentro de
  modales, pausa al perder el foco y persistencia de cámara/accesibilidad;
  ordenador con 3D, fallback 2D y móvil.
- **Cofres y objetos:** apertura real de 1 y 10 premios con animaciones y
  movimiento reducido, en ordenador 3D y móvil 2D; nombres e imágenes visibles,
  pulsación doble sin gasto duplicado, orden por rareza sin alterar el reto diario,
  recogida desde cuatro direcciones y aviso de recompensa para invitados online.
- **Ampliación de combate:** 24 ilustraciones sin recortes, iconos de todas las
  armas, técnicas I–VI, barras de vida configurables, objetivo de brecha,
  reanimación cooperativa y traducción de los nuevos ajustes en móvil y escritorio.
  La simulación comprueba también los requisitos de nivel/tiempo, las recompensas
  de brechas y que superponer tornados no multiplique el daño de Duna.
- **Móvil emulado:** entrar desde el menú, joystick, varios dedos, habilidad
  mientras te mueves, soltar el joystick, pausa, elección de mejora, rotación,
  distribución con arma propia, seis técnicas y seis pasivas y reinicio. Se usa 2D por defecto
  en dispositivos que solo tienen puntero táctil para reducir la carga gráfica.
- **Estrategia y mapas:** dos evoluciones por arma, elecciones de cofre para cada
  jugador, señales de ataques y roles, combos y jensalada en 2D, 3D y móvil;
  campamentos, altares, farolas y corrientes en los cuatro mapas; exposición de objetos
  y HUD de rachas/recogidas sin superposición con la barra del jefe. La simulación
  comprueba además el daño frontal del escudo, curación sin resurrección, avisos
  de tirador, siete patrones de jefe, recompensas únicas y combos entre propietarios.
- **Mapas y audio:** carreteras y pasillos continuos, costa coherente, terreno
  opaco en casillas positivas/negativas y decoración repetible fuera del agua y
  los caminos. Renderiza 19 sonidos en OfflineAudioContext: señal audible, salida
  finita, silencio, atenuación y límite de repetición desde el instante cero.
  La simulación verifica además sonido del arco, avisos de monstruos, límites de
  eventos y sonidos cercanos/lejanos de invitados. Comprueba también la prueba de
  sonidos en ajustes, su silencio y traducción; la brújula prioriza rescates,
  curación a vida crítica y cofres antes de proponer puntos del mapa.
- **Online:** elección independiente de las evoluciones de cofre, sala, movimiento del invitado, entrega y guardado del resultado,
  segunda partida, cambio de opciones del invitado y desconexión con una elección pendiente. Supabase, cuenta
  y TURN se sustituyen por un punto de encuentro local. En modo normal usa
  WebRTC real; si Chromium no genera candidatos ICE, informa de que omite la
  prueba de transporte. En modo `mock` verifica las rutas del protocolo mediante
  canales simulados, sin afirmar conectividad WebRTC real.

Las peticiones de cuenta/clasificación del navegador pueden fallar si el servidor
no está accesible; los errores JavaScript sí hacen fallar las comprobaciones.
La política `WebRtcIPHandling=disable_non_proxied_udp` del Chromium gestionado
impidió probar WebRTC local en el entorno cloud. No se cambia esa política.
TURN, conexiones entre redes distintas, guardado en producción y Safari/iOS en
un teléfono físico requieren una comprobación adicional con esos servicios y
dispositivos.
