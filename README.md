# 🌌 Neon Galaxy: Overdrive (v5.8.4.2)

Trò chơi bắn tàu không gian 2D sở hữu đồ họa Neon rực rỡ tích hợp hiệu ứng Bloom & Glitch độc đáo. Hệ thống được trang bị cơ chế bảo mật đa tầng, chống gian lận local và đồng bộ đám mây thời gian thực.

🚀 **[BẤM VÀO ĐÂY ĐỂ CHIẾN NGAY](https://github.io)**

---

## 🌟 Tính năng nổi bật

- **Progressive Web App (PWA):** Tự động đóng gói và lưu trữ tài nguyên qua Service Worker (`sw.js`). Hỗ trợ cài đặt lên màn hình chính và trải nghiệm Ngoại tuyến (Offline Mode) mượt mà.
- **Real-time Cloud Sync & Failover:** Tự động đồng bộ tiến trình, bảng xếp hạng dữ liệu qua Firebase Auth và Cloud Firestore. Tích hợp bộ đếm Timeout 3.5s tự động chuyển sang chế độ lưu trữ cục bộ (Offline Fallback) khi mất mạng hoặc nghẽn server.
- **Giao thức đồng bộ đa Tab (Shared Worker):** Đồng bộ hóa tài sản, tiền vàng thời gian thực giữa các tab trình duyệt đang mở đồng thời. Tự động khóa đồng bộ khi bắt đầu trận (`GAME_START`) để tránh xung đột hoặc ghi đè dữ liệu của tab đang chơi.
- **Hệ thống Trang bị & Thẻ nâng cấp (Card Socket):** 
  - Kho vũ khí đồ sộ lên tới 25 cấp độ (từ Blaster cơ bản đến THE OVERDRIVE tối thượng) và 25 loại vỏ tàu chống chịu.
  - Cơ chế hỗ trợ Drone tự động chiến đấu bay quanh phi thuyền với 5 chủng loại khác nhau.
  - Tính năng chế tạo và khảm thẻ nâng cấp (Đồng, Bạc, Vàng, Bạch Kim) vào vũ khí hoặc giáp để kích hoạt hào quang (Aura) và gia tăng chỉ số vượt trội.
- **Trạm lắp ráp cổ đại (Crafting Hidden Skills):** Sưu tầm các mảnh nguyên liệu (Kim loại, Plasma, Tinh thể, Hạt hư vô) đánh rơi từ Boss hoặc tàu tiếp tế để chế tạo 4 Siêu công nghệ ẩn: Trường Lực Hút, Bầy Nanobot, Giao Thức Quá Tải và Khiên Lượng Tử.
- **Vòng quay Gacha & Trạm nhiệm vụ:** Hệ thống nhiệm vụ ngẫu nhiên theo Ngày (Daily) và theo Tuần (Weekly) giúp săn vàng, phiếu quay gacha hoặc trang bị cao cấp. Vòng quay may mắn nhận thưởng miễn phí mỗi 24 giờ.
- **Chống gian lận tuyệt đối (Anti-Cheat):** Mã hóa dữ liệu lưu trữ local bằng thuật toán CryptoJS AES. Kiểm tra tính toàn vẹn của bộ nhớ qua bitwise XOR (`securitySeed`), đi kèm hệ thống giám sát đồng hồ hệ thống tránh hack thời gian offline.

## 🛠️ Công nghệ sử dụng

- **Frontend core:** HTML5 Canvas, CSS3 (Bloom & Glitch effect animation), Vanilla JavaScript (IIFE architecture).
- **PWA & Sync core:** Service Worker API, Shared Worker API, BroadcastChannel API (Cơ chế đồng bộ dự phòng cho trình duyệt cũ).
- **Backendless & Security:** Firebase Auth, Cloud Firestore (Security Rules mã hóa base64 cấu hình), CryptoJS (Mã hóa lưu trữ local).
- **API bên thứ ba:** [WorldTimeAPI](https://worldtimeapi.org) (Đồng bộ thời gian thực từ máy chủ UTC), [Dicebear API](https://dicebear.com) (Tự động sinh Avatar Bot ngẫu nhiên theo tên phi công).

## 🎮 Hướng dẫn điều khiển & Chế độ chơi

### Cách điều khiển
- **Di chuyển:** Vuốt màn hình (Điện thoại) hoặc Di chuyển chuột (Máy tính) để điều khiển phi thuyền né tránh làn đạn từ quái vật và thiên thạch.
- **Tấn công:** Hệ thống tự động xả đạn. Khi thanh năng lượng đạt mốc 100%, nhấn nút **ULT** ở góc màn hình để kích hoạt siêu kỹ năng tối thượng càn quét toàn bản đồ.

### Chế độ chơi
1. **BÌNH THƯỜNG:** Chế độ cơ bản tăng tiến theo cấp độ, phi thuyền có khả năng hồi máu khi nhặt vật phẩm.
2. **HARDCORE:** Thử thách sinh tồn siêu khó, trúng 1 đạn đồng nghĩa với việc nổ tàu ngay lập tức (1 Hit = Chết).
3. **VÔ TẬN:** Sinh tồn cực độ tính theo thời gian sống sót, quái vật và Boss xuất hiện liên tục theo từng đợt.

---
© 2026 Hh10412. Phát triển với đam mê lập trình game Web tĩnh.
