"use strict";

/* TronkStudios · sw.js
   Service worker: hace que la web se pueda instalar como una app y que
   los minijuegos funcionen sin internet.

   - Al instalarse, guarda la página y todos los archivos que enlaza
     index.html (CSS, JS, imágenes), más los avatares.
   - La página se pide primero a internet; sin conexión, sale la guardada.
   - El resto de archivos sale de lo guardado y se actualiza por detrás.
   - Supabase, YouTube y Cloudflare siempre van por internet (cuentas,
     sugerencias, vídeos y soporte necesitan conexión).

   Si algún día algo se queda «pegado» en una versión vieja, sube el
   número de CACHE_VERSION. */

const CACHE_VERSION = 2;
const CACHE_NAME = `tronkstudios-v${CACHE_VERSION}`;

const AVATARS = [
  "tronk", "robot", "zombie", "ninja", "knight", "wizard",
  "astronaut", "alien", "fox", "ghost", "pirate", "slime",
  "tronker", "antitronk", "king", "stickman", "samurai", "viking",
  "cat", "dog", "panda", "dragon", "dino", "cowboy",
  "chef", "vampire", "mummy", "frog", "penguin", "owl",
  "cyborg", "gamer", "witch", "shark", "pumpkin", "ufo"
];

const CORE_FILES = [
  "./",
  "index.html",
  "manifest.webmanifest",
  "img/icons/icon-192.png",
  "img/icons/icon-512.png",
  ...AVATARS.map((name) => `img/avatars/${name}.svg`)
];

// Librería de Supabase (de otro dominio): también se guarda para que la
// web cargue sin errores aunque no haya conexión
const CACHEABLE_CROSS_ORIGIN = ["https://cdn.jsdelivr.net/npm/@supabase/"];

/* Archivos locales que enlaza index.html (src="..." y href="...") */
async function filesFromIndex() {
  const response = await fetch("index.html", { cache: "no-cache" });
  const html = await response.text();
  const files = new Set();

  for (const match of html.matchAll(/\b(?:src|href)="([^"#:]+)"/g)) {
    const path = match[1];

    if (!path.startsWith("//") && !path.startsWith("data:")) {
      files.add(path);
    }
  }

  return [...files];
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      await cache.addAll(CORE_FILES);

      // Si alguno falla, el resto se guarda igualmente
      const files = await filesFromIndex().catch(() => []);
      await Promise.allSettled(files.map((file) => cache.add(file)));

      await self.skipWaiting();
    })()
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(
        names
          .filter((name) => name.startsWith("tronkstudios-") && name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
      await self.clients.claim();
    })()
  );
});

/* Primero internet; sin conexión, lo guardado (para la página) */
async function networkFirst(request) {
  const cache = await caches.open(CACHE_NAME);

  try {
    const response = await fetch(request);

    if (response.ok) {
      cache.put("index.html", response.clone());
    }

    return response;
  } catch {
    return (
      (await cache.match(request, { ignoreSearch: true })) ||
      (await cache.match("index.html"))
    );
  }
}

/* Lo guardado al momento y, por detrás, se actualiza desde internet */
async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);

  const update = fetch(request)
    .then((response) => {
      if (response.ok || response.type === "opaque") {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => null);

  return cached || (await update) || Response.error();
}

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") {
    return;
  }

  const url = new URL(request.url);

  if (request.mode === "navigate" && url.origin === self.location.origin) {
    event.respondWith(networkFirst(request));
    return;
  }

  if (
    url.origin === self.location.origin ||
    CACHEABLE_CROSS_ORIGIN.some((prefix) => request.url.startsWith(prefix))
  ) {
    event.respondWith(staleWhileRevalidate(request));
  }

  // Todo lo demás (Supabase, YouTube, Cloudflare...) va directo a internet
});
