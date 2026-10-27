# Tronk Survivors

- **Fecha:** 22 de octubre de 2026
- **Herramienta:** Claude Code (Claude, de Anthropic)
- **Commit o PR relacionado:** `51a4c0d`, `8793c22` y `baf9ea4`, PR #67

## Qué necesitábamos

Un juego más grande que los minijuegos, al estilo de los «survivors» de navegador, pero nuestro.

## El prompt

```
https://pokesurvivor.com/  quiero hacer un juego web de este estilo que ideas tienes para que no sea igual
```

```
yo haria un tronk survivors, que los personajes jugables sean los de tronkfight pero hechos mas a detalle y pixel art, y añade también unos cuantos más, los enemigos que sean zombis, antitronks(atacan a distancia) ninjas, y muchos tipos de enemigos mas
```

```
haz todo menos el 2, 10, 13
```

```
1. Dificultad (el 2 que dejaste fuera). En mis pruebas el personaje muere entre los 40 y los 110 segundos casi sin moverse. [...]
2. Online en algunas redes. [...] Se arregla con un servidor de reenvío (TURN) [...]
3. Trampas en los récords. [...]
(lista de mejoras que nos propuso la IA y que le devolvimos como orden; recortada)
```

## Qué hicimos con la respuesta

- **Aceptado:** 16 personajes, cofre con monedas del juego, online con código de sala, mapas, jefes, evoluciones, reto diario, logros, servidor TURN, récords comprobados en el servidor, modo infinito y misiones.
- **Cambiado por nosotros:** la idea es nuestra: Tronk Survivors con los luchadores de Tronk Fight y nuestros enemigos. De la lista de mejoras elegimos qué hacer y qué no.
- **Descartado y por qué:** cobrar con dinero real por el cofre: no queremos que se pague para jugar, así que el cofre usa monedas que se ganan jugando.
