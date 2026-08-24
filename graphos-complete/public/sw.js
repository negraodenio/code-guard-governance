// CodeGuard AI Governance OS — Service Worker stub
// This file exists to prevent 404 errors from browsers or extensions
// that automatically look for /sw.js. No service worker is registered.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', () => self.clients.claim());
