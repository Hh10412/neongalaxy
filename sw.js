const CACHE_NAME = "neon-galaxy-v5.8.5";
const ASSETS = [
    "./", "./index.html", "./manifest.json", "./shared-worker.js",
    "./css/style.css", "./js/game.js", "./js/story.js", "./js/firebase-init.js",
    "./js/sw-register.js", "https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&display=swap",
    "https://cdnjs.cloudflare.com/ajax/libs/crypto-js/4.1.1/crypto-js.min.js"
];

self.addEventListener("install", e => {
    self.skipWaiting();
    e.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS)));
});

self.addEventListener("activate", e => {
    e.waitUntil(
        caches.keys().then(keys => Promise.all(
            keys.map(key => {
                if (key !== CACHE_NAME) return caches.delete(key);
            })
        )).then(() => self.clients.claim())
    );
});

self.addEventListener("message", e => {
    // Đã fix Lỗi 4: Cấu trúc lại if cho tường minh
    if (e.data && (e.data.type === "SKIP_WAITING" || e.data.action === "skipWaiting")) {
        self.skipWaiting();
    }
});

// SỬA LỖI 2: Tách riêng luồng xử lý luồng ghi đệm độc lập để đưa vào waitUntil an toàn, chống treo tab
self.addEventListener("fetch", e => {
    if (e.request.method !== "GET" || e.request.url.includes("://googleapis.com")) {
        return;
    }

    e.respondWith(
        caches.match(e.request).then(cachedRes => {
            // Khởi tạo tiến trình tải mạng thực tế
            const fetchPromise = fetch(e.request).then(networkRes => {
                if (networkRes && networkRes.status === 200) {
                    const responseToCache = networkRes.clone();
                    
                    // Tách biệt luồng ghi đệm thành một Promise độc lập, không dính líu luồng mạng chính
                    const cacheUpdatePromise = caches.open(CACHE_NAME).then(cache => {
                        return cache.put(e.request, responseToCache);
                    });
                    
                    // Thông báo Service Worker giữ tiến trình sống để hoàn tất lưu dữ liệu
                    e.waitUntil(cacheUpdatePromise);
                }
                return networkRes;
            }).catch(() => cachedRes); // Trả về bộ nhớ đệm dự phòng nếu mất mạng

            // Trả phản hồi ngay lập tức cho giao diện người dùng nếu đã được lưu trong cache
            return cachedRes || fetchPromise;
        })
    );
});
