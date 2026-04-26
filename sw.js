// sw.js - Service Worker cho Neon Galaxy (Fixed & Optimized)

const CACHE_NAME = 'neon-galaxy-v5.8.3.2';

// Gom tất cả vào một mảng ASSETS duy nhất
const ASSETS = [
    './',
    './index.html',
    './manifest.json',
    './css/style.css',
    './js/game.js',
    './js/story.js',
    './js/firebase-init.js',
    './js/sw-register.js',
    'https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&display=swap',
    'https://cdnjs.cloudflare.com/ajax/libs/crypto-js/4.1.1/crypto-js.min.js'
];

// 1. Cài đặt: Lưu trữ tài nguyên vào Cache
self.addEventListener('install', (event) => {
    self.skipWaiting(); 
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            // Sử dụng cache.addAll để tải tất cả cùng lúc
            return cache.addAll(ASSETS);
        })
    );
});

// 2. Kích hoạt: Dọn dẹp Cache cũ
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.map((key) => {
                    if (key !== CACHE_NAME) {
                        return caches.delete(key);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

// 3. Lắng nghe lệnh từ Main UI
self.addEventListener('message', (event) => {
    if (!event.data) return;
    if (event.data.type === 'SKIP_WAITING' || event.data.action === 'skipWaiting') {
        self.skipWaiting();
    }
});

// 4. Xử lý yêu cầu mạng (Stale-While-Revalidate)
self.addEventListener('fetch', (event) => {
    // Chỉ xử lý các yêu cầu GET và không xử lý Firebase/Analytics nếu cần
    if (event.request.method !== 'GET' || event.request.url.includes('firestore.googleapis.com')) return;

    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            const fetchPromise = fetch(event.request).then((networkResponse) => {
                if (networkResponse && networkResponse.status === 200) {
                    const responseToCache = networkResponse.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseToCache);
                    });
                }
                return networkResponse;
            }).catch(() => cachedResponse);

            return cachedResponse || fetchPromise;
        })
    );
});
