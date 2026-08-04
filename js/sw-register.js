if ('service-worker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js').then(reg => {
        if (reg.waiting) {
          showUpdateBar(reg.waiting);
        }
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              showUpdateBar(newWorker);
            }
          });
        });
      });
    });

    // Ghi đè vào sw-register.js hiện tại của bạn
function showUpdateBar(worker) {
    const btn = document.getElementById('sw-update-btn');
    if (!btn) return;
    
    // Thiết lập vòng lặp giám sát trạng thái trò chơi (chạy mỗi giây)
    const stateObserver = setInterval(() => {
        // Lấy trạng thái an toàn thông qua hàm getter đã gán ở game.js
        const currentState = typeof window.getGameState === 'function' ? window.getGameState() : 'MENU';
        
        if (currentState === 'PLAYING' || currentState.startsWith('PAUSED')) {
            btn.style.display = 'none'; // Ẩn hoàn toàn nút cập nhật đi
        } else {
            btn.style.display = 'block'; // Trả lại thanh cập nhật khi ở ngoài MENU
            btn.innerHTML = '✨ ĐÃ CÓ BẢN CẬP NHẬT MỚI';
        }
    }, 1000);
    
    btn.onclick = () => {
        // Hủy vòng lặp giám sát
        clearInterval(stateObserver);
        
        // Cố gắng đẩy dữ liệu lần cuối lên Firebase trước khi Restart trang
        if (typeof window.verifyIntegrity === 'function' && window.verifyIntegrity()) {
            if (window.AuthSys && typeof window.AuthSys.saveSync === 'function') {
                window.AuthSys.saveSync();
            }
        }
        
        // Tiến hành quy trình xóa cache và cài bản mới
        worker.postMessage({ type: 'SKIP_WAITING' });
        document.body.classList.add('sw-exit-active');
        sessionStorage.clear();
        
        setTimeout(() => {
            window.location.reload();
        }, 400);
    };
}

    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!refreshing) {
        window.location.reload();
        refreshing = true;
      }
    });
}
