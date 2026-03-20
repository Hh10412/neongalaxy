const CACHE_NAME = 'neon-galaxy-v4.5.1'; // Đổi tên này (v4.6, v4.7...) để kích hoạt cập nhật
const urlsToCache = [
    './',
    './1.html',
    'https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&display=swap',
    'https://cdnjs.cloudflare.com/ajax/libs/crypto-js/4.1.1/crypto-js.min.js'
];

// Cài đặt và lưu vào bộ nhớ đệm
self.addEventListener('install', (e) => {
    e.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(urlsToCache))
    );
});

// Kích hoạt SW và xóa cache cũ
self.addEventListener('activate', (e) => {
    e.waitUntil(
        caches.keys().then((keyList) => {
            return Promise.all(keyList.map((key) => {
                if (key !== CACHE_NAME) return caches.delete(key);
            }));
        })
    );
});

// Lắng nghe lệnh cập nhật tức thì
self.addEventListener('message', (event) => {
    if (event.data.action === 'skipWaiting') {
        self.skipWaiting();
    }
});

// Xử lý yêu cầu mạng
self.addEventListener('fetch', (e) => {
    e.respondWith(
        caches.match(e.request).then((res) => {
            return res || fetch(e.request).then((fetchRes) => {
                if (e.request.method === 'GET' && e.request.url.startsWith('http')) {
                    return caches.open(CACHE_NAME).then((cache) => {
                        cache.put(e.request, fetchRes.clone());
                        return fetchRes;
                    });
                }
                return fetchRes;
            });
        }).catch(() => new Response('', { status: 404 }))
    );
});
