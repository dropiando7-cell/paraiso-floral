self.addEventListener('install', (event) => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(self.clients.claim());
});

// Basic fetch handler required for PWA installability in Chrome
self.addEventListener('fetch', (event) => {
    // Custom caching logic can be added here if needed in the future
});
