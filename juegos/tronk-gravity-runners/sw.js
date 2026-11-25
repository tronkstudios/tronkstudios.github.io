const CACHE='gravity-shift-3e9884b6198faf';const FILES=["./","./assets/characters/ATTRIBUTION.md","./assets/characters/runner.glb","./assets/fonts/jetbrains-mono-latin-400-normal.woff2","./assets/fonts/jetbrains-mono-latin-500-normal.woff2","./assets/fonts/jetbrains-mono-latin-600-normal.woff2","./assets/fonts/jetbrains-mono-latin-700-normal.woff2","./assets/fonts/space-grotesk-latin-400-normal.woff2","./assets/fonts/space-grotesk-latin-500-normal.woff2","./assets/fonts/space-grotesk-latin-600-normal.woff2","./assets/fonts/space-grotesk-latin-700-normal.woff2","./assets/icons/css/all.min.css","./assets/icons/icon-192.png","./assets/icons/icon-512.png","./assets/icons/mark.svg","./assets/icons/maskable-512.png","./assets/icons/webfonts/fa-brands-400.woff2","./assets/icons/webfonts/fa-regular-400.woff2","./assets/icons/webfonts/fa-solid-900.woff2","./game.3e9884b6198f.js","./index.html","./licenses/fontawesome.txt","./licenses/jetbrains-mono.txt","./licenses/space-grotesk.txt","./licenses/three.txt","./manifest.webmanifest","./privacy.html","./styles.f6963d1399dc.css"];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(FILES)));});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('gravity-shift-')&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim()));});
self.addEventListener('message',event=>{if(event.data?.type==='ACTIVATE_UPDATE')self.skipWaiting();});
self.addEventListener('fetch',event=>{const url=new URL(event.request.url);if(event.request.method!=='GET'||url.origin!==self.location.origin)return;
 if(!url.pathname.startsWith(new URL(self.registration.scope).pathname))return;
 if (event.request.mode === 'navigate') {
   event.respondWith(navigate(event));
   return;
 }
 const local='./'+url.pathname.slice(new URL(self.registration.scope).pathname.length);
 if(FILES.includes(local))event.respondWith(caches.match(local).then(cached=>cached||fetch(event.request)));
});
async function navigate(event) {
  const request = event.request;
  const path = new URL(request.url).pathname;
  const scope = new URL(self.registration.scope).pathname;
  const isGame = path === scope || path === scope + 'index.html';
  let response;
  try {
    response = await fetch(request, { cache: 'no-cache' });
  } catch {
    // Sin red, se usa la copia instalada.
  }
  if (response?.ok) {
    if (isGame) event.waitUntil(refreshGamePage(response.clone()).catch(() => {}));
    return response;
  }
  const cache = await caches.open(CACHE);
  const offline = isGame ? await cache.match('./index.html') : await cache.match(request, { ignoreSearch: true });
  return offline || response || Response.error();
}

async function refreshGamePage(response) {
  // Mantener juntos el documento y los archivos de juego disponibles sin conexión.
  const html = await response.clone().text();
  const assets = FILES.filter(file => file.startsWith('./game.') || file.startsWith('./styles.'));
  if (assets.every(file => html.includes('"' + file + '"'))) {
    const cache = await caches.open(CACHE);
    await cache.put('./index.html', response);
  }
}
