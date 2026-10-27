# Minijuegos: cerrar solo con la X, mensajes y rachas

- **Fecha:** 16 de octubre de 2026
- **Herramienta:** Claude Code (Claude, de Anthropic)
- **Commit o PR relacionado:** `12a2226`

## Qué necesitábamos

Arreglar cosas que vimos jugando: los juegos se cerraban sin querer y el mensaje de récord se confundía con la descripción.

## El prompt

```
hola, he vuelto. Esque me he dado cuenta de que al pulsar fuera de los jeugos, se cierran,quiero que solo se pueda salir al darle a la x o con el escape,  luego, quiero que mejores los mensajes, que se pueda distinguir facil lo de nuevo record y la descripcion del juego, ademas quiero que añadas rachas en antitronks y protect mogos, pero que eso no sea publico porque sino demasiado, luego quiero que en lo de eventos, el porcentaje sea real, porque he creado uno y a pesar de haber hecho algo, no ha subido de 0%, quiero que ponga el porcentaje exacto, incluyendo decimales y todo, con un maximo de 10 decimales, luego quiero que al hacer click en el evento se abra una tarjeta como en los juegos en desarrollo, que muestre la descripcion del evento el tiutullo el proreso, todo y ademas los mejores contribuidores, y haz muchas mas fotos de perfil
```

## Qué hicimos con la respuesta

- **Aceptado:** cerrar solo con la X o Escape, mensajes de récord distintos, rachas privadas (en el navegador, no en la clasificación), porcentaje exacto en los retos y su ficha.
- **Cambiado por nosotros:** nada, pero lo probamos todo jugando antes de darlo por bueno.
- **Descartado y por qué:** nada.
