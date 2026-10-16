"use strict";

/* TronkStudios · js/mascot-early.js
   Si el visitante había ocultado a Tronker, lo oculta antes de que se
   vea la página (va sin defer, justo después del robot en index.html).
   El resto de la mascota está en js/mascot.js. */

try {
  if (localStorage.getItem("tronk-mascot") === "off") {
    document.getElementById("mascot").hidden = true;
  }
} catch {
  // Sin almacenamiento: se ve el robot
}
