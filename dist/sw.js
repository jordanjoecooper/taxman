'use strict';
const CACHE = 'taxman-' + new URL(self.registration.scope).pathname + '-e4a1400ebfb6';
const ASSETS = ["index.html","taxman-offline.html","engine.js","API.md","SOURCES.md","input.schema.json","llms.txt","cli.cjs"];
self.addEventListener('install', event => { event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting())); });
self.addEventListener('activate', event => { event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('taxman-' + new URL(self.registration.scope).pathname + '-') && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url), scope = new URL(self.registration.scope);
  if (url.origin !== scope.origin || !url.pathname.startsWith(scope.pathname)) return;
  event.respondWith(fetch(event.request).catch(() => caches.open(CACHE).then(cache => cache.match(event.request, {ignoreSearch:true}).then(hit => hit || (event.request.mode === 'navigate' ? cache.match('index.html') : Response.error())))));
});
