const CACHE_NAME = 'neon-galaxy-v5.8.0.4'; // Đổi tên này (v4.6, v4.7...) để kích hoạt cập nhật
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

// 4. Xử lý yêu cầu mạng (Cache-first strategy)
self.addEventListener('fetch', (e) => {
    e.respondWith(
        caches.match(e.request).then((res) => {
            // Trả về từ cache nếu có, không thì fetch từ mạng
            return res || fetch(e.request).then((fetchRes) => {
                // Chỉ lưu vào cache các yêu cầu GET thành công
                if (e.request.method === 'GET' && e.request.url.startsWith('http')) {
                    return caches.open(CACHE_NAME).then((cache) => {
                        cache.put(e.request, fetchRes.clone());
                        return fetchRes;
                    });
                }
                return fetchRes;
            });
        }).catch(() => {
            // Nếu lỗi (ví dụ offline hoàn toàn), trả về lỗi 404 rỗng
            return new Response('', { status: 404 });
        })
    );
});
