window._appSectorA = "NEON_";

if ("serviceWorker" in navigator) {
  window.addEventListener("load", async () => {
    let refreshing = false;
    let pendingWorker = null;

    const updateButton = () => document.getElementById("sw-update-btn");
    const updateDot = () => document.getElementById("updateDot");

    const showUpdateNotice = worker => {
      pendingWorker = worker;
      const button = updateButton();
      const dot = updateDot();

      if (dot) dot.style.display = "block";
      if (button) {
        button.style.display = "inline-block";
        button.innerText = "✨ CÓ BẢN CẬP NHẬT MỚI";
        button.onclick = () => {
          const profile = document.getElementById("profileScreen");
          const menu = document.getElementById("menuScreen");
          document.querySelectorAll(".overlay").forEach(screen => screen.classList.add("hidden"));
          if (profile) profile.classList.add("hidden");
          if (menu) menu.classList.remove("hidden");
          button.innerText = "ĐANG CẬP NHẬT...";
          if (pendingWorker) {
            pendingWorker.postMessage({ type: "SKIP_WAITING" });
          } else {
            window.location.reload();
          }
        };
      }
    };

    try {
      const registration = await navigator.serviceWorker.register("./sw.js", {
        updateViaCache: "none",
      });

      if (registration.waiting && navigator.serviceWorker.controller) {
        showUpdateNotice(registration.waiting);
      }

      registration.addEventListener("updatefound", () => {
        const worker = registration.installing;
        if (!worker) return;
        worker.addEventListener("statechange", () => {
          if (worker.state === "installed" && navigator.serviceWorker.controller) {
            showUpdateNotice(worker);
          }
        });
      });

      if (navigator.onLine) {
        registration.update().catch(error => {
          console.warn("Không thể kiểm tra bản cập nhật Service Worker:", error);
        });
      }
    } catch (error) {
      console.error("Service Worker registration failed:", error);
    }

    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    });
  });
}
