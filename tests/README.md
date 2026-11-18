# Pruebas de Tronk Survivors

Las pruebas de simulación no requieren dependencias:

```sh
node --test tests/survivors.test.cjs tests/survivors.depth.cjs tests/survivors.clarity.cjs tests/survivors.roster.cjs tests/survivors.impacts.cjs tests/survivors.audit.cjs tests/survivors.quality.cjs
```

Las 163 pruebas cubren el cofre, pausa de efectos, desconexiones durante elecciones,
instantáneas online, 30 personajes con su arma y técnicas propias, jefes finales de los cuatro
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
node tests/survivors.clarity.browser.cjs
node tests/survivors.depth.browser.cjs
node tests/survivors.browser.cjs
node tests/survivors.mobile.cjs
node tests/survivors.mobile-design.cjs
node tests/survivors.features.cjs
node tests/survivors.polish.cjs
node tests/survivors.expansion.cjs
node tests/survivors.rewards.cjs
node tests/survivors.gacha-theatre.cjs
node tests/survivors.online.cjs
node tests/survivors.strategy.cjs
node tests/survivors.characters.cjs
node tests/survivors.world.cjs
node tests/survivors.insights.cjs
node tests/survivors.specializations.cjs
node tests/survivors.combat.cjs
node tests/survivors.impacts.browser.cjs
node tests/survivors.visual.cjs
node tests/survivors.equipment.browser.cjs
node tests/survivors.threats.browser.cjs
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
- **Coherencia de personajes:** 2.250 fotogramas por dispositivo (30 personajes,
  cinco direcciones, reposo, ocho pasos y seis ataques), pantalones compartidos con
  el menú, contacto de los pies, retratos con cámara común, visor de Boro solo de
  frente y ausencia de ojos duplicados en máscaras. Verifica que el mazo no
  atraviese el suelo, que el arco tenga su propia postura y que la cuerda y el
  agarre coincidan con las manos y que los retratos de las cinco vistas no se recorten.
- **Contenido nuevo:** los 30 personajes, sus diez técnicas y habilidad en 2D/3D,
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
  armas, técnicas I–X, barras de vida configurables, objetivo de brecha,
  reanimación cooperativa y traducción de los nuevos ajustes en móvil y escritorio.
  La simulación comprueba también los requisitos de nivel/tiempo, las recompensas
  de brechas y que superponer tornados no multiplique el daño de Duna.
- **Móvil emulado:** entrar desde el menú, joystick, varios dedos, habilidad
  mientras te mueves, soltar el joystick, pausa, elección de mejora, rotación,
  distribución con arma propia, diez técnicas y seis pasivas y reinicio. Se usa 2D por defecto
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
- **Resultados y planificación:** golpes finales con fuente/tipo/daño real,
  récords personales, reanimaciones, próximos encuentros, pausa cooperativa
  informativa, miniatura de playa con arena y mar y colisiones desde el centro
  de obstáculos. Comprueba foco y cambios rápidos entre pantallas; los invitados
  reciben su propio personaje, racha y resumen. La simulación verifica además
  proyectiles de un solo impacto, historial acotado, tiempos del reto diario y
  conservación del resumen de un compañero caído hasta el fin del equipo.
- **Especializaciones:** tres etapas con ventajas y costes, requisitos de nivel y
  tiempo, comparaciones numéricas, ficha de estadísticas en pausa y resumen final
  en escritorio y móvil. Las 163 pruebas de simulación cubren las nueve opciones
  en los 30 personajes, cofres, reinicio y recargas proporcionales de armas,
  habilidad, técnicas, drones y contactos orbitales.
- **Combate propio y reliquias:** dieciocho comportamientos para espada, arco y
  viento, iconos distintos, treinta fotogramas de estocada y sus destellos,
  recompensas opcionales de reliquia, resumen local y avisos de pinza en 3D y
  móvil 2D. La simulación compara el daño nominal anunciado con el emitido y
  comprueba rebote único, recorrido real, recargas, curación acotada, compatibilidad
  y propiedad. El protocolo online comprueba reliquias distintas por jugador.
- **Revisión visual:** equipo completo y nombres largos con jefe, recogidas,
  racha, rescate y trece huecos de equipo en 1280×800, 1024×768, 800×600,
  320×568, 390×844,
  568×320 y 844×390, con densidad doble en móvil. Comprueba que los paneles y
  etiquetas no se superpongan, que la pausa admita estadísticas abiertas y que
  los avisos de una partida no entren en otra. Verifica follaje 3D atenuado
  por personajes y transparencia 2D por un compañero, conservando recompensas.
- **Online:** elección independiente de las evoluciones de cofre y especializaciones, sala, movimiento del invitado, entrega y guardado del resultado,
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

- **Profundidad de combate:** 103 comprobaciones de simulación entre las dos suites.
  Las 17 nuevas cubren variantes activas en los 30 personajes, daño diferido,
  postura, esquivas, enlaces, escoltas, refuerzos y resurrección limitada,
  semillas e historial validado. La suite de navegador adicional recorre las
  192 demostraciones por dispositivo, elección activa, sepulcro 2D/3D, resultados,
  historial, traducción y repetición. Online comprueba ramas activas distintas,
  origen destructible compartido y resultado local mediante transporte simulado.
  Véase `docs/survivors/profundidad-de-combate.md` para reglas y límites.

- **Claridad y uso de lo existente:** 126 pruebas de simulación entre las tres
  suites. Las 23 nuevas cubren pulsación anticipada, cancelación local, marcas y
  postura sincronizadas, las 48 ramas con nombres propios, trayectorias y control
  nativos, posición seca y accesible de orígenes, avisos vinculados al sepulcro,
  brújula fijada localmente, tiempo disponible por habilidad y firmas de reglas.
  `survivors.clarity.browser.cjs` recorre variantes/rangos, cuenta atrás de enlace,
  fijación de objetivo, tres diseños de origen, daño por segundo y comparación
  estricta en 2D móvil y 3D de escritorio; también comprueba inglés.
  Véase `docs/survivors/claridad-y-controles.md`.

- **Presentación móvil y arte 2D:** el recorrido adicional valida los cuatro
  terrenos, paneles legibles, plantel, ficha con demostración, pausa horizontal
  y regreso al menú sin errores. Puede guardar capturas y una hoja de los 24
  personajes con `SCREENSHOTS_DIR`. Los recorridos de sprites mantienen la
  comprobación de recorte, animación y siluetas en ambos renderizadores. Véase
  `docs/survivors/presentacion-movil-y-arte-2d.md`.

La ampliación actual y la apertura secuencial con luz dorada se documentan en
[Plantel y cofre](../docs/survivors/plantel-y-cofre.md). Las 163 pruebas de simulación
incluyen siete casos nuevos de contenido y ejecución real de ataques.

La revisión de impactos y dificultad añade 17 regresiones de simulación en
`tests/survivors.impacts.cjs`. `survivors.impacts.browser.cjs` comprueba los 300
iconos, 120 demostraciones de las cuatro técnicas ampliadas por dispositivo,
impulso con teclado y dos dedos, recarga y traducción. La prueba cooperativa
verifica el impulso del invitado en el anfitrión y su HUD. Ver
[Impactos, presión y movimiento](../docs/survivors/impactos-presion-y-movimiento.md).

- **Legibilidad y revisión de calidad:** siete regresiones de errores y seis
  pruebas de progresión/avisos verifican orden de impacto entre compañeros,
  llamas en el borde del torso, dirección vertical, corriente independiente de
  los subpasos, invocaciones con límite y aviso, opciones distintas y recargas
  de las 300 técnicas. Navegador verifica inspección del equipo con toque y
  teclado, marcadores de rango, activación accesible, elección única del invitado,
  cuatro siluetas hostiles, coordenadas 3D y movimiento reducido. Véase
  [Combate legible y equipo](../docs/survivors/combate-legible-y-equipo.md).

`node tests/survivors.fist-preview.cjs` comprueba que las demostraciones de guantes y puños ejecuten el combo, golpeen al muñeco y terminen. Admite `BASE_URL`, `CHROMIUM_PATH` y `ALLOW_TEST_PROXY_CERT`.

`node --test tests/survivors.walking.cjs` comprueba el apoyo de los pies, la conservación de brazos y armas al caminar atacando y el ritmo por distancia (agua, impulso y reposo). `survivors.characters.cjs` revisa también 120 fotogramas de ataques en movimiento por dispositivo.
