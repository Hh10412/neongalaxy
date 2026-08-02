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

    function showUpdateBar(worker) {
      const btn = document.getElementById('sw-update-btn');
      if (!btn) return;
      
      btn.style.display = 'block';
      btn.innerHTML = '✨ ĐÃ CÓ BẢN CẬP NHẬT MỚI';
      
      btn.onclick = () => {
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
