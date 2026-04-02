// sw.js - Service Worker cho Neon Galaxy (Optimized Version)

const CACHE_NAME = 'neon-galaxy-v5.8.1.3';
const ASSETS = [
    './',
    './index.html',
    './manifest.json',
    'https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&display=swap',
    'https://cdnjs.cloudflare.com/ajax/libs/crypto-js/4.1.1/crypto-js.min.js'
    // Bạn có thể thêm các file .png, .jpg, .css khác vào đây
];

// 1. Cài đặt: Lưu trữ tài nguyên vào Cache
self.addEventListener('install', (event) => {
    // Ép SW này trở thành active ngay lập tức sau khi cài xong
    self.skipWaiting(); 
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS);
        })
    );
});

// 2. Kích hoạt: Dọn dẹp Cache cũ để giải phóng dung lượng
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
        }).then(() => self.clients.claim()) // Chiếm quyền điều khiển trang ngay lập tức
    );
});

// 3. Lắng nghe lệnh từ giao diện (Main UI)
self.addEventListener('message', (event) => {
    if (!event.data) return;

    // Lệnh bỏ qua chờ đợi (dùng cho nút bấm cập nhật)
    if (event.data.type === 'SKIP_WAITING' || event.data.action === 'skipWaiting') {
        self.skipWaiting();
    }

    // Lệnh kiểm tra kết nối Server thực tế (Ping test)
    if (event.data.action === 'checkConnection') {
        fetch('./favicon.ico', { method: 'HEAD', cache: 'no-store' })
            .then(() => {
                if (event.ports && event.ports[0]) {
                    event.ports[0].postMessage({ status: 'online' });
                }
            })
            .catch(() => {
                if (event.ports && event.ports[0]) {
                    event.ports[0].postMessage({ status: 'offline' });
                }
            });
    }
});

// 4. Xử lý yêu cầu mạng (Chiến lược: Stale-While-Revalidate)
// Ưu điểm: Tốc độ cực nhanh vì lấy từ cache trước, nhưng vẫn tải ngầm bản mới để cập nhật cho lần sau.
self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET') return;

    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            const fetchPromise = fetch(event.request).then((networkResponse) => {
                // Nếu tải mới thành công, cập nhật lại cache
                if (networkResponse && networkResponse.status === 200) {
                    const responseToCache = networkResponse.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseToCache);
                    });
                }
                return networkResponse;
            }).catch(() => {
                // Nếu mất mạng hoàn toàn, trả về cache
                return cachedResponse;
            });

            return cachedResponse || fetchPromise;
        })
    );
});
