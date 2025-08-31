/**
 * ملف serviceworker.js - نظام العمل بدون اتصال
 * يدير تخزين الموارد محلياً للعمل بدون إنترنت
 * يستخدم استراتيجية Cache-First للموارد الثابتة
 * يدعم تحديث التطبيق وإدارة نسخ الكاش
 * 
 * المشاكل المحتملة:
 * - لا يوجد آلية لتحديث الكاش بذكاء (يجب تغيير CACHE_NAME يدوياً)
 * - قد يخزن موارد CDN قديمة دون تحديث
 * - لا يدعم مزامنة البيانات في الخلفية
 * - معالجة الأخطاء بسيطة جداً
 * - لا يعطي تحديثات للمستخدم عن حالة الاتصال
 */

const CACHE_NAME = 'network-cards-cache-v1.7';

/**
 * قائمة الموارد الحرجة المطلوبة لعمل التطبيق
 * تشمل جميع ملفات JavaScript وHTML والأيقونات الأساسية
 * يتم تحميلها مسبقاً عند تثبيت Service Worker
 */
// Critical local assets to guarantee offline app shell
const CRITICAL_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './fonts/Amiri-Regular.woff2',
  './app.js',
  './js/security.js',
  './js/encryption.js',
  './js/safeDOM.js',
  './js/dataValidator.js',
  './js/utils.js',
  './js/reports.js',
  './js/inventory.js',
  './js/sales.js',
  './js/payments.js',
  './js/expenses.js',
  './js/stores.js',
  './js/packages.js',
  './js/storage.js',
  './js/backup.js',
  './js/backupManager.js',
  './js/trash.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png'
];

// Third-party CDN assets required for the UI to render offline
const CDN_ASSETS = [
  'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/moment.js/2.29.4/moment.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/moment.js/2.29.4/locale/ar.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.4/jspdf.plugin.autotable.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js'
];

// Whitelist of origins that we are allowed to cache cross-origin responses from
const ALLOWED_CDN_ORIGINS = Array.from(new Set(CDN_ASSETS.map(u => new URL(u).origin)));

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    // Precaching critical assets deterministically
    await cache.addAll(CRITICAL_ASSETS);
    // Best-effort precaching for CDN assets (opaque responses are acceptable)
    await Promise.all(CDN_ASSETS.map(async (url) => {
      try {
        await cache.add(url);
      } catch (err) {
        // Ignore failures (e.g., temporary network/CORS hiccups)
      }
    }));
    self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const cacheNames = await caches.keys();
    await Promise.all(
      cacheNames.map((name) => name !== CACHE_NAME ? caches.delete(name) : Promise.resolve())
    );
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const request = event.request;

  // Offline-first for navigation: fall back to cached index.html
  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const networkResponse = await fetch(request);
        return networkResponse;
      } catch (err) {
        const cache = await caches.open(CACHE_NAME);
        const cachedIndex = await cache.match('./index.html');
        return cachedIndex || new Response('<h1>Offline</h1>', { headers: { 'Content-Type': 'text/html' } });
      }
    })());
    return;
  }

  // Cache-first for others, then network; cache successful GETs (same-origin and allowed CDN origins)
  event.respondWith((async () => {
    const cached = await caches.match(request);
    if (cached) return cached;
    try {
      const response = await fetch(request);
      if (request.method === 'GET') {
        const requestOrigin = new URL(request.url).origin;
        const isSameOrigin = requestOrigin === self.location.origin;
        const isAllowedCdn = ALLOWED_CDN_ORIGINS.includes(requestOrigin);
        if (isSameOrigin || isAllowedCdn) {
          const cache = await caches.open(CACHE_NAME);
          cache.put(request, response.clone());
        }
      }
      return response;
    } catch (err) {
      return new Response('', { status: 504, statusText: 'Offline' });
    }
  })());
});