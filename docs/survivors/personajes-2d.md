# Coherencia de los personajes 2D

Los 24 personajes usan una sola definición de apariencia para los fotogramas de
partida y los retratos. Se respetan los pantalones, calzado, tonos de piel y
accesorios definidos en sus datos. Los colores se comparten también con el
renderizador 3D. Sunk conserva su torso descubierto y sus pantalones propios.

El retrato ya no amplía o reduce al personaje según el tamaño de su arma. Cada
vista usa una cámara común calculada para toda la plantilla, con la misma escala
y altura de los pies. Las armas largas caben sin encoger solo a su propietario.
La ropa del torso y el calzado se dibujan también durante la partida.

Las piernas y brazos se ordenan por segmentos para que rodillas, codos y manos
se solapen según su profundidad. Los pies se normalizan contra el suelo durante
el reposo, los ocho pasos y los seis fotogramas de ataque. El agarre se dibuja
sobre el arma y Sunk tiene ambos puños. El movimiento de golpe pesado mantiene
la cabeza del mazo por encima del suelo al plegarse la muñeca; el motor 3D
comparte esa postura. El alcance y el daño de las habilidades se conservan.

Boro tiene su visor en las vistas frontal y lateral; no muestra la lente en
la nuca. Nix y Brasa dejan de superponer ojos normales sobre la abertura de la
máscara. El afro conserva un contorno con mechones al girar y los destellos
siguen usando la silueta exacta de cada fotograma, con su recorte y ancla.

`tests/survivors.characters.cjs` comprueba 1.800 fotogramas por dispositivo:
24 personajes × cinco vistas × 15 fotogramas. Verifica el pantalón en menú y
partida, el contacto del calzado, las cámaras comunes y los márgenes de los
retratos en las cinco vistas, la dirección del visor, las máscaras y la postura
del mazo. Se ejecuta en escritorio y móvil emulado. La regresión general revisa
también recortes y alfa de los destellos, movimiento y mapas en 2D/3D; las pruebas
de ampliación revisan los menús y los controles táctiles.
