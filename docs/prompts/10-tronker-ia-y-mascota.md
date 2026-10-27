# Tronker: chat con IA y mascota 3D

- **Fecha:** 16 de octubre de 2026
- **Herramienta:** Claude Code (Claude, de Anthropic)
- **Commit o PR relacionado:** `409dbe4` (IA gratis), `d304365` (frases), `3dc4fb7` (escribir o temas) y `4d16486` (mascota 3D), PR #43

## Qué necesitábamos

Un asistente que respondiera de verdad y una mascota que hiciera la web más viva.

## El prompt

```
arreegla la x que se ve torcida, y, una de 2, que tronker sea una ia funcional con la que puedas chatear, o mejorar las conversaciones predefinidas
```

```
a ver yo queria una ia propia, pero si va a estar super limitada pues me quedo con lo que has hecho y cuando se acabe el limite dirario, pues pasar al sistema de frases, asi que mejoralo de todos modos
```

```
quiero mejorar el menú de la ia, en lugar de que aparezcan mil opciones, que hayan como temas, y tu los eliges, y que antes de nada, te pregunte si quieres hablar escribiendo o por frases
```

```
ahora quiero que aparezca un robot, como si fuera la mascota que comentabamos antes, pero que al hacerle click, se abra tronker, que el robot tenga animaciones y haga cosas, que te vea jugar y diga, muy buena cuando haces algo bien, o por los pelos y esas cosas, que se sienta vivo, quiero que sea 3d y que se vea bien en el movi, si esta en pc es mas grande, en movil es mas pequeño. Con animaciones fluidas
```

## Qué hicimos con la respuesta

- **Aceptado:** el chat con una IA gratuita a través del Worker (la clave nunca llega al navegador), el sistema de frases cuando se acaba el límite diario y la mascota 3D con Three.js, que reacciona a lo que haces en los minijuegos.
- **Cambiado por nosotros:** pedimos que primero preguntara si quieres escribir o elegir temas, y más animaciones y frases según la sección.
- **Descartado y por qué:** entrenar una IA propia desde cero: con nuestros medios habría quedado muy limitada, así que usamos una API gratuita y dejamos las frases como plan B.
