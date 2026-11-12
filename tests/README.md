# Pruebas de Tronk Survivors

Las pruebas de simulación no requieren dependencias:

```sh
node --test tests/survivors.test.cjs
```

Las 11 pruebas cubren el cofre, pausa de efectos, desconexiones durante elecciones,
instantáneas online, 16 personajes con todas las armas, jefes finales de los cuatro
mapas y modo infinito, colisiones con enemigos grandes, ralentizaciones, recargas,
fusión de progreso remoto, datos guardados incompletos y tickets de partidas que
terminan mientras empieza otra. Los escenarios de combate usan armadura y armas
reforzadas para verificar las rutas de ejecución; no evalúan el equilibrio.

Las comprobaciones de navegador requieren Playwright y Chromium. Desde la raíz:

```sh
python3 -m http.server 8000
# En otra terminal, con Playwright disponible:
node tests/survivors.browser.cjs
node tests/survivors.mobile.cjs
node tests/survivors.online.cjs
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
- **Móvil emulado:** entrar desde el menú, joystick, varios dedos, habilidad
  mientras te mueves, soltar el joystick, pausa, elección de mejora, rotación,
  distribución con seis armas/seis pasivas y reinicio. Se usa 2D por defecto
  en dispositivos que solo tienen puntero táctil para reducir la carga gráfica.
- **Online:** sala, movimiento del invitado, entrega y guardado del resultado,
  segunda partida y desconexión con una elección pendiente. Supabase, cuenta
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
