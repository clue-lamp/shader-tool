const CACHE_NAME = 'shader-metaballs-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/sketch.js',
  '/shader.vert',
  '/shader.frag',
  '/p5.js',
  '/p5.sound.min.js',
  '/Roboto-Regular.ttf',
  '/style.css'
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