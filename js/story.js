const story = [
    "ĐANG THIẾT LẬP KẾT NỐI VỚI TRẠM QUYỀN LỰC CUỐI CÙNG...",
    "MÃ LỆNH: OLYMPUS-FALLEN. Tình trạng: Tuyệt vọng.",
    "Năm 2142, nhân loại không còn nhìn thấy ánh sáng mặt trời.",
    "Thực thể cơ khí 'Neural Overlord' đã nuốt chửng 12 tinh hệ.",
    "Hàng tỷ sinh mạng đã tan biến thành mã số trong hư vô.",
    "Phòng tuyến Titan đã sụp đổ sau 400 ngày cầm cự.",
    "Chúng ta không còn hạm đội, không còn đồng minh.",
    "Chỉ còn duy nhất một lõi năng lượng Overdrive chưa bị đồng hóa.",
    "Và nó đang nằm trong tay bạn - Phi công số hiệu 00-X.",
    "Kẻ địch đang tràn ngập tại Tầng 50, lõi Neutron đang nóng dần.",
    "Nếu nó đạt ngưỡng 100%, thực tại này sẽ bị xóa sổ.",
    "Nhiệm vụ của bạn: Một mình xuyên thủng 49 tầng địa ngục máy.",
    "Không có tiếp tế. Không có đường quay lại.",
    "Bạn không chiến đấu để chiến thắng. Bạn chiến đấu để tồn tại.",
    "Vì nếu bạn gục ngã, nhân loại sẽ chỉ còn là một dòng ghi chú lỗi.",
    "KÍCH HOẠT HỆ THỐNG... CHUẨN BỊ NHẢY VÀO VÙNG CHIẾN SỰ!"
];
let lineIndex = 0;
let charIndex = 0;
let isIntroDone = false;

function typeStory() {
    const introTextEl = document.getElementById('introText');
    const skipBtn = document.getElementById('skipIntroBtn');
    const container = document.getElementById('introContainer');
    
    if (!introTextEl) return;
    
    if (lineIndex >= Math.floor(story.length / 3)) skipBtn.style.display = "block";
    
    if (lineIndex < story.length) {
        if (charIndex < story[lineIndex].length) {
            introTextEl.innerHTML += story[lineIndex].charAt(charIndex);
            charIndex++;
            container.scrollTop = container.scrollHeight;
            setTimeout(typeStory, 50); 
        } else {
            introTextEl.innerHTML += "<br><br>";
            lineIndex++;
            charIndex = 0;
            container.scrollTop = container.scrollHeight;
            setTimeout(typeStory, 1000); 
        }
    } else {
        if (!isIntroDone) { 
            isIntroDone = true; 
            skipBtn.innerText = "XUẤT PHÁT NGAY!"; 
        }
    }
}

window.playIntroFlow = function() {
    // Fetch the elements locally for this function
    const introScreen = document.getElementById('introScreen');
    const introTextEl = document.getElementById('introText');
    const skipBtn = document.getElementById('skipIntroBtn');

    if (!introScreen || !introTextEl || !skipBtn) return; // Safety check

    // Sử dụng hàm an toàn thay vì gọi trực tiếp gData
    if (typeof window.isIntroSeen === 'function' && window.isIntroSeen()) {
        introScreen.classList.add('hidden');
        if (typeof window.startMode === 'function') { 
            window.startMode(false); 
        } else { 
            window.startGame(); 
        }
        return;
    }
    
    introScreen.classList.remove('hidden'); 
    introTextEl.innerHTML = ""; 
    lineIndex = 0; 
    charIndex = 0; 
    isIntroDone = false; 
    skipBtn.style.display = "none"; 
    skipBtn.innerText = "BỎ QUA / VÀO TRẬN"; 
    typeStory();
};

document.addEventListener("DOMContentLoaded", () => {
    const skipBtn = document.getElementById('skipIntroBtn');
    if (skipBtn) {
        skipBtn.onclick = () => {
    // Kích hoạt lưu dữ liệu thông qua cầu nối
    if (typeof window.completeIntro === 'function') { window.completeIntro(); }
    
    introScreen.classList.add('hidden');
    if (typeof AudioSys !== 'undefined' && AudioSys.enabled) {
        AudioSys.init(); if (AudioSys.ctx && AudioSys.ctx.state === 'suspended') AudioSys.ctx.resume(); AudioSys.playTone(300, 'sawtooth', 1.0, 0.5, 1500);
    }
    if (typeof window.startMode === 'function') { window.startMode(false); } else { window.startGame(); }
       };
    }
});
