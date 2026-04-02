const CACHE_NAME = 'neon-galaxy-v5.8.1.3'; // Đổi tên này (v4.6, v4.7...) để kích hoạt cập nhật
const urlsToCache = [
    './',
    './index.html',
    './manifest.json',
    'https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&display=swap',
    'https://cdnjs.cloudflare.com/ajax/libs/crypto-js/4.1.1/crypto-js.min.js'
];

// 1. Cài đặt và lưu vào bộ nhớ đệm
self.addEventListener('install', (e) => {
    e.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(urlsToCache))
    );
});

// 2. Kích hoạt SW và xóa cache cũ
self.addEventListener('activate', (e) => {
    e.waitUntil(
        caches.keys().then((keyList) => {
            return Promise.all(keyList.map((key) => {
                if (key !== CACHE_NAME) return caches.delete(key);
            }));
        }).then(() => {
            // Thêm dòng này để chiếm quyền điều khiển ngay lập tức
            return self.clients.claim();
        })
    );
});

// 3. Lắng nghe lệnh từ trang chính (Main UI)
self.addEventListener('message', (event) => {
    // Lệnh bỏ qua chờ đợi để cập nhật ngay lập tức
    if (event.data.action === 'skipWaiting') {
        self.skipWaiting();
    }

    // Lệnh kiểm tra kết nối Server (On/Off)
    if (event.data.action === 'checkConnection') {
        // Thử tải một file cực nhỏ từ server để kiểm tra kết nối thực tế
        // Sử dụng cache: 'no-store' để đảm bảo không lấy từ cache mà phải ra mạng
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

// 4. Xử lý yêu cầu mạng (Network-First hoặc Stale-While-Revalidate)
self.addEventListener('fetch', (e) => {
    // Chỉ xử lý các yêu cầu GET
    if (e.request.method !== 'GET') return;

    e.respondWith(
        caches.match(e.request).then((cachedResponse) => {
            // Nếu có trong cache, trả về luôn, nhưng vẫn fetch ngầm để cập nhật (Stale-while-revalidate)
            const fetchPromise = fetch(e.request).then((networkResponse) => {
                // Kiểm tra xem response có hợp lệ để lưu không (status 200)
                if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
                    const responseToCache = networkResponse.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(e.request, responseToCache);
                    });
                }
                return networkResponse;
            }).catch(() => {
                // Nếu offline hoàn toàn và không có cache, trả về response lỗi nhẹ nhàng
                return cachedResponse || new Response('Offline', { status: 503 });
            });

            return cachedResponse || fetchPromise;
        })
    );
});
