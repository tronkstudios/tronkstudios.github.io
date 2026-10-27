# Rendimiento, imágenes y arquitectura para la corrección

- **Fecha:** 27 de octubre de 2026
- **Herramienta:** Claude Code (Claude, de Anthropic)
- **Commit o PR relacionado:** PR #69 (ver CHANGELOG 6.40)

## Qué necesitábamos

La corrección del proyecto pedía imágenes optimizadas, un vídeo propio, Lighthouse ≥ 90 y trocear `index.html` y `styles.css`.

## El prompt

```
arreglalo todo para sacar un 10, porque si corrigo todo me sube la nota
```

## Qué hicimos con la respuesta

- **Aceptado:** imágenes en WebP con miniaturas, demos grabadas en vídeo, minijuegos que se cargan al abrirlos (partials/ y js/games/loader.js), estilos en 8 partes, diccionario de inglés aparte y Three.js solo al interactuar. Lighthouse de la portada en móvil pasó de 31 a 96 (ver docs/lighthouse/).
- **Cambiado por nosotros:** el caso «problema → solución → resultado» de la sección «Sobre» lo escribiremos nosotros, porque tiene que contar nuestro papel con nuestras palabras.
- **Descartado y por qué:** pasar todo a módulos ES de golpe: se explica en docs/adr/0003.
