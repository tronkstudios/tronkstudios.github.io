# Lighthouse

Mediciones de rendimiento, accesibilidad, buenas prácticas y SEO hechas con
Lighthouse 12 (Chrome sin ventana), en modo móvil (4G lenta y CPU 4 veces más
lenta) y escritorio. Servidor local con gzip y caché de 10 minutos, como
GitHub Pages. Los datos completos están en `resultados-2026-10-27.json`.

## 27 de octubre de 2026

| Página | Modo | Rendimiento | Accesibilidad | Buenas prácticas | SEO | LCP | TBT |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Portada (antes de los cambios) | móvil | 31 | 96 | 96 | 100 | 7,2 s | 40.890 ms |
| Portada (antes de los cambios) | escritorio | 78 | 96 | 96 | 100 | 2,5 s | 230 ms |
| **Portada** | móvil | **96** | **100** | 96 | 100 | 2,5 s | 90 ms |
| **Portada** | escritorio | **100** | **100** | 96 | 100 | 0,6 s | 0 ms |
| Portada en inglés | móvil | 93 | 100 | 96 | 100 | 3,1 s | 60 ms |
| Portada en inglés | escritorio | 99 | 100 | 96 | 100 | 0,9 s | 0 ms |
| Página de Antitronks | móvil | 100 | 100 | 100 | 100 | 1,5 s | 0 ms |
| Página de Antitronks | escritorio | 100 | 100 | 100 | 100 | 0,4 s | 0 ms |
| Página de Tronk Survivors | móvil | 99 | 100 | 100 | 100 | 2,0 s | 0 ms |
| Página de Tronk Survivors | escritorio | 100 | 100 | 100 | 100 | 0,5 s | 0 ms |
| Juego Tronk Survivors | móvil | 56 | 100 | 89 | 100 | 3,0 s | 16.510 ms |
| Juego Tronk Survivors | escritorio | 63 | 100 | 93 | 100 | 0,7 s | 2.060 ms |

- Entre una medición y otra la puntuación varía 2–3 puntos (en la portada en
  móvil salió entre 95 y 97).
- **Buenas prácticas** sale 96 en la portada porque en el entorno de pruebas no
  hay conexión con Supabase y la consola muestra errores de red. En la web
  publicada esa conexión sí funciona.
- **El juego Tronk Survivors** es la excepción: es un juego completo que, en la
  pantalla de carga, dibuja todos los personajes antes de enseñar el menú, y
  eso cuenta como bloqueo del hilo principal. Solo se juega en ordenador.

Qué se cambió para pasar de 31 a 96: ver
[`docs/adr/0003-estilos-y-minijuegos-por-partes.md`](../adr/0003-estilos-y-minijuegos-por-partes.md).

## Cómo repetir la medición

```bash
npx lighthouse https://tronkstudios.github.io/ --view
npx lighthouse https://tronkstudios.github.io/ --preset=desktop --view
```

O en Chrome: F12 → pestaña *Lighthouse* → *Analizar la carga de la página*.
