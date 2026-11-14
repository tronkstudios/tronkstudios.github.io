# Rachas, recogidas y objetos

Cada jugador mantiene una racha propia: tiene cuatro segundos desde la última
baja para encadenar otra y la pierde al recibir daño. A partir de dos bajas el
HUD muestra contador y tiempo restante. Los hitos 10, 25, 50 y cada 100 bajas
tienen un acento visual y un sonido corto. Los avisos temporales se sitúan
fuera de la brújula, la racha y la barra del jefe. Solo se atribuyen bajas al atacante;
romper objetos no suma racha. La mejor racha se conserva durante la partida.
No cambia el daño, la experiencia de los enemigos ni el precio de los cofres.

La recogida muestra experiencia, monedas y vida efectivamente recibidas en
ventanas de 2,5 segundos de simulación. Los valores se agregan para evitar un
aviso por gema. Las elecciones y la pausa detienen sus tiempos. Rachas y avisos
se incluyen en las instantáneas del anfitrión para que el invitado vea sus propios
datos. Los anillos de recogida tienen un límite de seis por paso y respetan el
presupuesto de efectos bajos. Las animaciones de las piezas nuevas se detienen
con movimiento reducido; la barra temporal mantiene su información.

## Correcciones

- **Curación cooperativa:** jensalada permanece en el suelo si todos tienen la
  vida completa. Entre los jugadores vivos, se dirige al herido más cercano;
  un compañero sano no la consume por pasar antes sobre ella.
- **Imán y muchas gemas:** la compactación de gemas conserva tanto su experiencia
  total como su estado de atracción. Las atraídas y las que siguen en el suelo
  se agrupan por separado, evitando detener el imán o atraer gemas gratuitamente.
- **Altares:** sus guardianes no participan en la reubicación de enemigos lejanos
  y vuelven hacia el altar cuando se alejan demasiado. Abandonar el lugar no
  teletransporta a los guardianes junto al jugador ni entrega su cofre.
- **Puntos de mapa:** se comprueba que sigan en tierra después de separarlos de
  obstáculos, probando más posiciones si hace falta.
- **Cofre 2D:** se escala desde el icono original y se centra con sus dimensiones
  reales; se elimina la doble ampliación que desajustaba su aspecto y posición.

## Diseño

Monedas, imanes, cofres y gemas comparten formas y paleta entre iconos y objetos.
Los cofres 3D añaden tapa escalonada, bandas metálicas, remaches y cerradura;
las monedas tienen relieve y los imanes separan cuerpo, caras y polos metálicos.
Jensalada conserva su papel, filtro, ceniza y brasa. Barriles, cajas y jarrones
añaden tablones, herrajes, bordes o bandas. Los detalles usan los lotes de
instancias y materiales existentes; no crean una luz por objeto.

Guardianes: armadura, hombreras y escudo con refuerzos y remaches. Sanadores:
mochila, marca médica y viales. Tiradores: protección, visor y equipo de espalda.
Los jefes humanoides añaden capa y hombreras metálicas. Las evoluciones se
distinguen también en las cartas, con dorado para Impacto y turquesa para Dominio.

Las pruebas de simulación verifican las correcciones y la sincronización. Las
pruebas de navegador comprueban los objetos y el HUD en 2D, 3D y móvil emulado,
además de escritorio, controles táctiles y protocolo online con transporte
simulado. Safari/iOS físico y la conexión WebRTC entre redes siguen pendientes.
