const CACHE_NAME = 'shader-metaballs-v1';
const urlsToCache = [
  '/shader-tool/',
  '/shader-tool/index.html',
  '/shader-tool/sketch.js',
  '/shader-tool/shader.vert',
  '/shader-tool/shader.frag',
  '/shader-tool/p5.js',
  '/shader-tool/p5.sound.min.js',
  '/shader-tool/Roboto-Regular.ttf',
  '/shader-tool/style.css'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response;
        }
        return fetch(event.request);
      }
    )
  );
}); 