# Pruebas de Tronk Survivors

Las pruebas de simulación no requieren dependencias:

```sh
node --test tests/survivors.test.cjs
```

Comprueban el cofre, la pausa de los efectos, desconexiones durante una elección,
instantáneas online atrasadas y entre partidas, movimiento y ataques online,
los 16 personajes con todas las armas y los jefes finales de los cuatro mapas
con la transición al modo infinito. Los escenarios de combate usan armadura y
armas reforzadas para verificar las rutas de ejecución; no evalúan el equilibrio.

La comprobación de navegador requiere Playwright y Chromium. Desde la raíz:

```sh
python3 -m http.server 8000
# En otra terminal, con Playwright disponible:
node tests/survivors.browser.cjs
```

Se pueden indicar `BASE_URL`, `CHROMIUM_PATH` y `SCREENSHOTS_DIR`.
`ALLOW_TEST_PROXY_CERT=1` permite certificados del proxy de pruebas cuando
Chromium no tiene su CA instalada; no modifica la configuración del juego.

Esta prueba abre el menú, genera todos los fotogramas de personajes y enemigos
stickman, detecta recortes y coordenadas de dibujo no finitas, prueba movimiento
y pausa y dibuja todos los mapas con sus personajes, enemigos y jefes. Se ejecuta
con WebGL y con la descarga de Three.js bloqueada para forzar el modo 2D.
Las peticiones de cuenta/clasificación pueden fallar si el servidor no está
accesible; los errores de JavaScript sí hacen fallar la prueba.

Las conexiones WebRTC entre redes distintas, TURN, cuentas y sincronización
remota de progreso requieren una prueba adicional con usuarios conectados.
