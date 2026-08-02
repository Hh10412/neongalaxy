    (() => {
    let W, H; let isHardcoreMode = false; let isEndlessMode = false; let state = 'MENU';  
    let player, enemies = [], bullets = [], particles = [], items = [], stars = [], texts = [], trails = [];  
    let game = { frame: 0, score: 0, lvl: 1, exp: 0, nextExp: 100, ult: 0, flash: 0, shake: 0, boss:false, surviveFrames:0 };  
    let tX = window.innerWidth / 2; let tY = window.innerHeight - 150;
    let gData = JSON.parse(localStorage.getItem('neonGalaxyData')) || {
    gold: 0,
    highScore: 0,
    gems: 0,
    hasSeenIntro: false,
    // Thêm hệ thống skillLevels mới, xóa bỏ skillTree kiểu true/false cũ
    skillLevels: {
        dmg: 0,       // Gốc: Sát thương
        hp: 0,        // Nhánh 1: Máu
        invinc: 0,    // Nhánh 1.1: Bất tử (0.5s/cấp)
        fireRate: 0,  // Nhánh 2: Tốc độ bắn
        crit: 0       // Nhánh 2.1: Chí mạng
    }
};

// Đảm bảo dữ liệu cũ không bị lỗi nếu trước đó chưa có skillLevels
if(!gData.skillLevels) {
    gData.skillLevels = { dmg: 0, hp: 0, invinc: 0, fireRate: 0, crit: 0 };
}

    let currentUsername = ""; let dbListener = null;
    // --- HỆ THỐNG THỜI GIAN BẢO MẬT ---
let serverTimeOffset = 0; // Độ lệch giữa server và client
let lastKnownOnlineTime = 0;
async function syncData() {
  if (!navigator.onLine) return;

  const local = JSON.parse(localStorage.getItem("gameData") || "{}");

  const cloudSnap = await fb.getDoc(fb.doc(db, "users", auth.currentUser.uid));
  const cloud = cloudSnap.exists() ? cloudSnap.data() : null;

  if (!cloud) {
    // chưa có cloud → đẩy local lên
    await fb.setDoc(fb.doc(db, "users", auth.currentUser.uid), local);
    return;
  }

  // So sánh thời gian
  if ((local.lastUpdate || 0) > (cloud.lastUpdate || 0)) {
    // local mới hơn → push lên cloud
    await fb.setDoc(fb.doc(db, "users", auth.currentUser.uid), local);
  } else {
    // cloud mới hơn → ghi đè local
    localStorage.setItem("gameData", JSON.stringify(cloud));
    gData = cloud;
  }
}
async function claimOfflineReward() {
  const now = await getServerTime();

  const last = gData.lastClaimTime || now;
  const diff = now - last;

  if (diff <= 0) return;

  // ví dụ: 1 giây = 1 coin
  const reward = Math.floor(diff / 1000);

  gData.coin += reward;
  gData.lastClaimTime = now;

  save();
}
// Gọi hàm này khi bắt đầu game hoặc khi có mạng lại
async function getServerTime() {
  try {
    const res = await fetch('https://worldtimeapi.org/api/timezone/Etc/UTC');
    const data = await res.json();
    return new Date(data.utc_datetime).getTime();
  } catch {
    return Date.now(); // fallback nếu offline
  }
}
async function syncServerTimeOffset() {
    try {
        const res = await fetch('https://worldtimeapi.org/api/timezone/Etc/UTC');
        const data = await res.json();
        const serverTime = new Date(data.utc_datetime).getTime();
        serverTimeOffset = serverTime - Date.now();
    } catch {
        serverTimeOffset = 0; // Fallback nếu offline
    }
}
// Gọi hàm này ngay khi game vừa load lên
syncServerTimeOffset();
// Hàm thay thế cho Date.now() và new Date()
function getSecureTime() {
    return Date.now() + serverTimeOffset; 
}

function getSecureDate() {
    return new Date(getSecureTime());
}

    const uiCache = { hpBar: document.getElementById('hpBar'), xpBar: document.getElementById('xpBar'), hudScore: document.getElementById('hudScore'), hudLvl: document.getElementById('hudLvl'), hudCoin: document.getElementById('hudCoin'), bossHpBar: document.getElementById('bossHpBar'), ultBtn: document.getElementById('ultBtn'), ultPerc: document.getElementById('ultPerc') };
    
    class ObjectPool {
        constructor(factory, size) { this.pool = []; this.factory = factory; for (let i = 0; i < size; i++) this.pool.push(this.factory()); }
        get() { return this.pool.length > 0 ? this.pool.pop() : null; } release(obj) { this.pool.push(obj); }
    }
    
    const ePool = new ObjectPool(() => ({}), 20); const pPool = new ObjectPool(() => ({}), 300); const bPool = new ObjectPool(() => ({}), 100); const tPool = new ObjectPool(() => ({}), 50);
    
    const BULLET_PATTERNS = { SPREAD: 'spread', LASER: 'laser', SPIRAL: 'spiral', HOMING: 'homing', WAVE: 'wave' };
    function pickRandomWeapons(allowedTypes, slotCount) { const shuffled = [...allowedTypes].sort(() => 0.5 - Math.random()); return shuffled.slice(0, Math.min(slotCount, allowedTypes.length)); }
    
    const BOSS_TEMPLATES = [ { id: 1, name: "Vanguard Alpha", hpMult: 20, slots: 1, allowed: [BULLET_PATTERNS.SPREAD, BULLET_PATTERNS.LASER], color: '#ff3333' }, { id: 2, name: "Spinner Drone", hpMult: 30, slots: 2, allowed: [BULLET_PATTERNS.SPIRAL, BULLET_PATTERNS.SPREAD], color: '#33ff33' }, { id: 3, name: "Laser Core", hpMult: 40, slots: 2, allowed: [BULLET_PATTERNS.LASER, BULLET_PATTERNS.HOMING], color: '#3333ff' }, { id: 4, name: "Wave Rider", hpMult: 50, slots: 2, allowed: [BULLET_PATTERNS.WAVE, BULLET_PATTERNS.SPIRAL], color: '#00ffff' }, { id: 5, name: "Hunter Killer", hpMult: 60, slots: 3, allowed: [BULLET_PATTERNS.HOMING, BULLET_PATTERNS.SPREAD, BULLET_PATTERNS.LASER], color: '#ff00ff' }, { id: 6, name: "Galaxy Crusher", hpMult: 70, slots: 2, allowed: [BULLET_PATTERNS.WAVE, BULLET_PATTERNS.SPREAD], color: '#ffff00' }, { id: 7, name: "Neon Phantom", hpMult: 80, slots: 3, allowed: [BULLET_PATTERNS.SPIRAL, BULLET_PATTERNS.LASER, BULLET_PATTERNS.HOMING], color: '#ffffff' }, { id: 8, name: "Aegis Defender", hpMult: 90, slots: 1, allowed: [BULLET_PATTERNS.SPIRAL, BULLET_PATTERNS.WAVE], color: '#ffaa00' }, { id: 9, name: "Oblivion Engine", hpMult: 120, slots: 3, allowed: [BULLET_PATTERNS.SPREAD, BULLET_PATTERNS.LASER, BULLET_PATTERNS.SPIRAL, BULLET_PATTERNS.WAVE], color: '#b200ff' }, { id: 10, name: "Neural Overlord", hpMult: 200, slots: 4, allowed: Object.values(BULLET_PATTERNS), color: '#ff0000' } ];

    // Gắn thẳng securitySeed vào gData để nó được lưu lại qua các lần chơi
let coinHash = 0; 
const syncHash = () => { 
    if(!gData.securitySeed) gData.securitySeed = Math.floor(Math.random() * 999) + 100;
    coinHash = gData.coins ^ gData.securitySeed; 
};
const verifyIntegrity = () => { 
    if(!gData.securitySeed) gData.securitySeed = Math.floor(Math.random() * 999) + 100;
    if ((gData.coins ^ gData.securitySeed) !== coinHash) { 
        alert("Phát hiện dữ liệu bất thường. Trận đấu sẽ khởi động lại."); 
        location.reload(); 
        return false; 
    } 
    return true; 
};
    const secureAddCoins = (amt) => { if(verifyIntegrity()){ gData.coins += amt; if(typeof trackQuest === 'function') trackQuest('gold', amt); syncHash(); save(); } };
    const secureDeductCoins = (amt) => { if(!verifyIntegrity()) return false; if(gData.coins >= amt) { gData.coins -= amt; syncHash(); save(); return true; } return false; };
     
    const SECRET_KEY = "NEON_GALAXY_ULTRA_SECRET_2026"; const SAVE_KEY = "neonGalaxySave_Secure_v4"; 
    const secureSaveLocal = (data) => { try { if (typeof CryptoJS !== 'undefined') { localStorage.setItem(SAVE_KEY, CryptoJS.AES.encrypt(JSON.stringify(data), SECRET_KEY).toString()); } else { localStorage.setItem(SAVE_KEY + "_backup", JSON.stringify(data)); } } catch(e){} };
    const secureLoadLocal = () => {
  try {
    let dataEnc = null;
    let dataBackup = null;

    // đọc file mã hóa
    if (typeof CryptoJS !== 'undefined') {
      const encrypted = localStorage.getItem(SAVE_KEY);
      if (encrypted) {
        try {
          dataEnc = JSON.parse(
            CryptoJS.AES.decrypt(encrypted, SECRET_KEY)
              .toString(CryptoJS.enc.Utf8)
          );
        } catch {}
      }
    }

    // đọc backup
    const backup = localStorage.getItem(SAVE_KEY + "_backup");
    if (backup) {
      try {
        dataBackup = JSON.parse(backup);
      } catch {}
    }

    // chọn cái mới hơn
    if (dataEnc && dataBackup) {
      return (dataEnc.lastUpdate || 0) > (dataBackup.lastUpdate || 0)
        ? dataEnc
        : dataBackup;
    }

    return dataEnc || dataBackup || null;

  } catch (e) {
    return null;
  }
};
    window.AuthSys = {
        isLoginMode: true,
        toEmail: function(u) { return u.toLowerCase() + "@neongalaxy.io"; },
        setLoading: function(isLoading) { document.getElementById('authBtns').style.display = isLoading ? 'none' : 'flex'; document.getElementById('loadingText').style.display = isLoading ? 'block' : 'none'; },
        toggleMode: function() { this.isLoginMode = !this.isLoginMode; document.getElementById('authTitle').innerHTML = this.isLoginMode ? 'HỆ THỐNG<br><span style="color:var(--s)">ĐĂNG NHẬP</span>' : 'HỆ THỐNG<br><span style="color:var(--s)">ĐĂNG KÝ</span>'; document.getElementById('authMainBtn').innerText = this.isLoginMode ? 'ĐĂNG NHẬP' : 'TẠO TÀI KHOẢN'; document.getElementById('authMainBtn').onclick = this.isLoginMode ? () => this.login() : () => this.register(); document.getElementById('authSubText').innerText = this.isLoginMode ? 'Bạn chưa có tài khoản?' : 'Đã có tài khoản?'; document.getElementById('authSubLink').innerText = this.isLoginMode ? 'Đăng ký ngay' : 'Đăng nhập'; this.msg(""); },
        init: function(isOffline = false) {
            let localData = secureLoadLocal(); if(localData) gData = localData; syncHash();
            if (isOffline || !navigator.onLine) {
                this.setLoading(true); let loadText = document.getElementById('loadingText'); loadText.innerText = "ĐANG OFFLINE - VÀO GAME SAU 3S..."; loadText.style.color = "var(--r)"; 
                setTimeout(() => { this.setLoading(false); loadText.innerText = "ĐANG KẾT NỐI MÁY CHỦ..."; loadText.style.color = "var(--y)"; currentUsername = gData.username || "GUEST"; document.getElementById('menuUsername').innerText = currentUsername.toUpperCase() + " (OFFLINE)"; document.getElementById('menuAvatar').src = `https://api.dicebear.com/7.x/bottts/svg?seed=${gData.avatar || 'guest'}`; document.getElementById('authScreen').classList.add('hidden'); if (!gData.hasSeenIntro) { window.playIntroFlow(); } else { document.getElementById('menuScreen').classList.remove('hidden'); } }, 3000); return;
            }
            window.fbAuth.onAuthStateChanged(window.auth, async (user) => { if (user) { this.setLoading(true); this.msg("Đang tải dữ liệu từ Cloud...", "var(--y)"); await this.fetchAndLoadProfile(user.uid, user.email.split('@')[0]); } else { this.setLoading(false); document.getElementById('authScreen').classList.remove('hidden'); document.getElementById('authClose').classList.add('hidden'); } });
        },
        login: async function() { let u = document.getElementById('inpUser').value.trim(), p = document.getElementById('inpPass').value.trim(); if(!u || !p) return this.msg("Nhập đầy đủ thông tin!"); this.setLoading(true); try { await window.fbAuth.signInWithEmailAndPassword(window.auth, this.toEmail(u), p); } catch(e) { this.setLoading(false); this.msg("Sai tài khoản hoặc mật khẩu!"); } },
        register: async function() {
            let u = document.getElementById('inpUser').value.trim(); let p = document.getElementById('inpPass').value.trim(); if(!u || !p) return this.msg("Nhập đầy đủ thông tin!"); if(u.length < 3) return this.msg("Tên quá ngắn!");
            this.setLoading(true); try { const userCredential = await window.fbAuth.createUserWithEmailAndPassword(window.auth, this.toEmail(u), p); let initialData = { username: u, coins: 0, stats: { atk:0, hp:0, luck:0, crit:0, mag:0 }, owned: ['w1', 'h1'], equip: { w:'w1', h:'h1' }, maxLvl: 1, maxScore: 0, hasWon: false, maxTime: 0, avatar: u, lastUpdated: Date.now(), hasSeenIntro: false }; await window.fb.setDoc(window.fb.doc(window.db, "users", userCredential.user.uid), { data: initialData }); this.msg("Tạo thành công!", "#0f0"); } catch(e) { this.setLoading(false); switch (e.code) { case 'auth/email-already-in-use': this.msg("Tên này đã có người xài!"); break; case 'auth/weak-password': this.msg("Mật khẩu phải từ 6 ký tự!"); break; default: this.msg("Lỗi server: " + (e.code || "Unknown")); } }
        },
                fetchAndLoadProfile: async function(uid, u) {
            currentUsername = u; 
            try { 
                let localData = secureLoadLocal(); 
                const docSnap = await window.fb.getDoc(window.fb.doc(window.db, "users", uid));
                if(docSnap.exists()) { 
                    let cloudData = docSnap.data().data; 
                    if (localData && localData.username.toLowerCase() !== u.toLowerCase()) { 
                        gData = cloudData; 
                    } else if (localData) { 
                        let localTime = localData.lastUpdated || 0; 
                        let cloudTime = cloudData.lastUpdated || 0; 
                        gData = (localTime > cloudTime) ? localData : cloudData; 
                        gData.maxScore = Math.max(localData.maxScore || 0, cloudData.maxScore || 0); 
                        gData.maxLvl = Math.max(localData.maxLvl || 1, cloudData.maxLvl || 1); 
                        gData.maxScore_hc = Math.max(localData.maxScore_hc || 0, cloudData.maxScore_hc || 0); 
                        gData.maxLvl_hc = Math.max(localData.maxLvl_hc || 1, cloudData.maxLvl_hc || 1); 
                    } else { 
                        gData = cloudData; 
                    } 
                } else { 
                    gData = { username: u, coins: 0, stats: { atk:0, hp:0, luck:0, crit:0, mag:0 }, owned: ['w1', 'h1'], equip: { w:'w1', h:'h1' }, maxLvl: 1, maxScore: 0, hasWon: false, maxTime: 0, avatar: u, lastUpdated: Date.now(), hasSeenIntro: false }; 
                }
                syncHash(); secureSaveLocal(gData); this.saveSync(); 
                
                document.getElementById('menuUsername').innerText = currentUsername.toUpperCase(); 
                document.getElementById('menuAvatar').src = `https://api.dicebear.com/7.x/bottts/svg?seed=${gData.avatar}`; 
                this.setLoading(false); 
                document.getElementById('authScreen').classList.add('hidden'); 
                if (!gData.hasSeenIntro) { window.playIntroFlow(); } else { document.getElementById('menuScreen').classList.remove('hidden'); } 

                // =======================================================
                // BẮT ĐẦU THÊM MỚI: LẮNG NGHE ĐỒNG BỘ REAL-TIME TỪ CLOUD
                // =======================================================
                if (this.syncListener) this.syncListener(); // Xóa listener cũ tránh chạy ngầm nhiều lần
                this.syncListener = window.fb.onSnapshot(window.fb.doc(window.db, "users", uid), (doc) => {
                    if (doc.exists()) {
                        let cloudData = doc.data().data;
                        let localTime = gData.lastUpdated || 0;
                        let cloudTime = cloudData.lastUpdated || 0;
                        
                        // Nếu dữ liệu trên Cloud mới hơn (do thiết bị khác vừa chơi/cập nhật)
                        if (cloudTime > localTime) {
    // CHẶN: Nếu người chơi đang trong trận, KHÔNG ĐƯỢC overwrite data
    if (typeof state !== 'undefined' && (state === 'PLAYING' || state.startsWith('PAUSED'))) {
        console.warn("Cloud data mới hơn nhưng đang trong trận, hoãn đồng bộ!");
        return; 
    }
    
    gData = cloudData;
    syncHash();
                            secureSaveLocal(gData);
                            
                            // 1. Làm mới UI ở màn hình chính
                            if(document.getElementById('menuUsername')) document.getElementById('menuUsername').innerText = currentUsername.toUpperCase();
                            if(document.getElementById('menuAvatar')) document.getElementById('menuAvatar').src = `https://api.dicebear.com/7.x/bottts/svg?seed=${gData.avatar}`;
                            
                            // 2. Cập nhật số Vàng ở mọi nơi đang hiển thị
                            if(document.getElementById('hudCoin')) document.getElementById('hudCoin').innerText = gData.coins;
                            if(document.getElementById('eqCoin')) document.getElementById('eqCoin').innerText = gData.coins;
                            if(document.getElementById('shopCoin')) document.getElementById('shopCoin').innerText = gData.coins;
                            
                            // 3. Cập nhật Hồ sơ & Gacha
                            if(document.getElementById('profLvl')) document.getElementById('profLvl').innerText = gData.maxLvl || 1;
                            if(document.getElementById('profScore')) document.getElementById('profScore').innerText = gData.maxScore || 0;
                            if(document.getElementById('gachaTicketCount')) document.getElementById('gachaTicketCount').innerText = gData.tickets || 0;
                            
                            // 4. Tự động Refresh các màn hình phụ nếu thiết bị B đang mở chúng
                            if (typeof updateCraftingUI === 'function' && !document.getElementById('craftScreen').classList.contains('hidden')) updateCraftingUI();
                            if (typeof renderQuests === 'function' && !document.getElementById('questScreen').classList.contains('hidden')) renderQuests();
                            if (typeof openEquip === 'function' && !document.getElementById('equipScreen').classList.contains('hidden')) openEquip();
                            if (typeof updateMenuGachaBadge === 'function') updateMenuGachaBadge();
                        }
                    }
                });
                // =======================================================

            } catch(e) { console.error("Lỗi đồng bộ:", e); }
        },

        openSwitchAccount: function() { gData = { username: "", coins: 0, stats: {}, owned: [], equip: {} }; document.getElementById('menuScreen').classList.add('hidden'); document.getElementById('authScreen').classList.remove('hidden'); document.getElementById('authClose').classList.remove('hidden'); document.getElementById('inpUser').value = ''; document.getElementById('inpPass').value = ''; this.msg("Vui lòng đăng nhập tài khoản khác", "var(--y)"); },
        cancelAuth: function() { if(!window.auth.currentUser) return; document.getElementById('authScreen').classList.add('hidden'); document.getElementById('menuScreen').classList.remove('hidden'); },
        deleteAccount: async function() { let p = prompt("CẢNH BÁO TỐI CAO!\nNhập lại mật khẩu của bạn để XÓA VĨNH VIỄN tài khoản:"); if(!p) return; let user = window.auth.currentUser; if(!user) return; try { await window.fbAuth.reauthenticateWithCredential(user, window.fbAuth.EmailAuthProvider.credential(user.email, p)); await window.fb.deleteDoc(window.fb.doc(window.db, "users", user.uid)); await window.fbAuth.deleteUser(user); localStorage.removeItem(SAVE_KEY); alert("Tài khoản đã bị hủy diệt hoàn toàn!"); location.reload(); } catch(e) { alert("Sai mật khẩu hoặc lỗi kết nối. Không thể xóa!"); } },
        saveSync: async function() { if(!verifyIntegrity()) return; gData.lastUpdated = Date.now(); secureSaveLocal(gData); let user = window.auth?.currentUser; if(!user || !navigator.onLine) return; window.fb.setDoc(window.fb.doc(window.db, "users", user.uid), { data: gData }, { merge: true }).catch(e => console.log("Cloud sync pending...")); },
        msg: function(text, color="var(--r)") { let m = document.getElementById('authMsg'); m.innerText = text; m.style.color = color; },
        isLbHardcore: false, currentLbSortBy: "maxLvl", currentLbTab: null,
        toggleLbMode: function(isHardcore) { this.isLbHardcore = isHardcore; document.getElementById('btnLbNormal').className = isHardcore ? "btn-main btn-small btn-sec" : "btn-main btn-small"; document.getElementById('btnLbNormal').style.border = isHardcore ? "2px solid var(--s)" : "2px solid var(--p)"; document.getElementById('btnLbHardcore').className = isHardcore ? "btn-main btn-small" : "btn-main btn-small btn-sec"; document.getElementById('btnLbHardcore').style.border = isHardcore ? "2px solid var(--r)" : "2px solid var(--s)"; let activeTab = document.querySelector('.lb-tab.active'); if(activeTab) this.showLB(this.currentLbSortBy, activeTab); },
        showLB: function(sortBy, btnEl) {
            this.currentLbSortBy = sortBy; this.currentLbTab = btnEl; document.querySelectorAll('.lb-tab').forEach(e => e.classList.remove('active')); btnEl.classList.add('active');
            if (!navigator.onLine || typeof window.fb === 'undefined') { document.getElementById('lbContent').innerHTML = "<div style='text-align:center; padding: 20px; color:var(--r); font-weight:bold; font-size:16px;'>BẠN ĐANG OFFLINE<br><span style='font-size:11px;color:#aaa;font-weight:normal;'>Hãy kết nối mạng để xem Bảng Xếp Hạng</span></div>"; return; }
            document.getElementById('lbContent').innerHTML = "<div style='text-align:center; padding: 20px; color:#aaa;'>Đang kết nối Cloud...</div>"; if (dbListener) dbListener();
            let queryField = sortBy; if (this.isLbHardcore && (sortBy === 'maxLvl' || sortBy === 'maxScore')) { queryField = sortBy + "_hc"; }
            const q = window.fb.query(window.fb.collection(window.db, "users"), window.fb.orderBy(`data.${queryField}`, "desc"), window.fb.limit(10));
            dbListener = window.fb.onSnapshot(q, (snapshot) => { let arr = []; snapshot.forEach((doc) => { let d = doc.data().data; arr.push({ name: d.username || 'Khuyết Danh', val: d[queryField] || 0, uid: doc.id }); }); let html = '', suffix = sortBy === 'coins' ? ' 💰' : (sortBy==='maxLvl' ? ' LVL' : (sortBy==='maxTime' ? ' Giây' : ' PTS')), myUid = window.auth.currentUser ? window.auth.currentUser.uid : null; arr.forEach((u, idx) => { html += `<div class="lb-row" ${u.uid === myUid ? 'style="background:rgba(0,255,255,0.1); border-left:3px solid var(--p);"' : ''}><div class="lb-rank">#${idx+1}</div><div class="lb-name">${u.name} ${u.uid === myUid ? '(Bạn)' : ''}</div><div class="lb-val">${u.val}${suffix}</div></div>`; }); if(arr.length === 0) html = "<div style='text-align:center; padding: 20px; color:#666;'>Chưa có dữ liệu phi công</div>"; document.getElementById('lbContent').innerHTML = html; });
        }
    };
    
    window.addEventListener('firebaseReady', () => { window.AuthSys.init(false); }); window.addEventListener('offlineReady', () => { window.AuthSys.init(true); });
    
    const avatarSeeds = ['Neon', 'Cyber', 'Matrix', 'Pulse', 'Vortex', 'Nova', 'Mecha', 'Zenith'];
    function openProfile() { document.getElementById('menuScreen').classList.add('hidden'); document.getElementById('profileScreen').classList.remove('hidden'); document.getElementById('profUsername').innerText = currentUsername.toUpperCase(); document.getElementById('profLvl').innerText = gData.maxLvl || 1; document.getElementById('profScore').innerText = gData.maxScore || 0; let currentAv = gData.avatar || currentUsername; document.getElementById('profAvatarPreview').src = `https://api.dicebear.com/7.x/bottts/svg?seed=${currentAv}`; renderAvatarList(currentAv); }
    function closeProfile() { document.getElementById('profileScreen').classList.add('hidden'); document.getElementById('menuScreen').classList.remove('hidden'); document.getElementById('avatarSelect').classList.add('hidden'); }
    function toggleAvatarSelect() { document.getElementById('avatarSelect').classList.toggle('hidden'); }
    function renderAvatarList(currentAv) { let html = ''; if(!avatarSeeds.includes(currentAv)) html += `<img src="https://api.dicebear.com/7.x/bottts/svg?seed=${currentAv}" class="avatar-item active" onclick="setAvatar('${currentAv}')">`; avatarSeeds.forEach(av => { html += `<img src="https://api.dicebear.com/7.x/bottts/svg?seed=${av}" class="avatar-item ${currentAv===av?'active':''}" onclick="setAvatar('${av}')">`; }); document.getElementById('avatarListDiv').innerHTML = html; }
    function setAvatar(seed) { gData.avatar = seed; save(); document.getElementById('profAvatarPreview').src = `https://api.dicebear.com/7.x/bottts/svg?seed=${seed}`; document.getElementById('menuAvatar').src = `https://api.dicebear.com/7.x/bottts/svg?seed=${seed}`; renderAvatarList(seed); }
    function openChangePass() { document.getElementById('profileScreen').classList.add('hidden'); document.getElementById('changePassScreen').classList.remove('hidden'); document.getElementById('inpOldPass').value = ''; document.getElementById('inpNewPass').value = ''; document.getElementById('inpConfirmPass').value = ''; document.getElementById('changePassMsg').innerText = ''; }
    function closeChangePass() { document.getElementById('changePassScreen').classList.add('hidden'); document.getElementById('profileScreen').classList.remove('hidden'); }
    async function executeChangePass() { let oldP = document.getElementById('inpOldPass').value.trim(), newP = document.getElementById('inpNewPass').value.trim(), confP = document.getElementById('inpConfirmPass').value.trim(), msgEl = document.getElementById('changePassMsg'); if(!oldP || !newP || !confP) return (msgEl.innerText = "Vui lòng nhập đủ!", msgEl.style.color="var(--r)"); if(newP !== confP) return (msgEl.innerText = "Mật khẩu mới không khớp!", msgEl.style.color="var(--r)"); if(newP.length < 6) return (msgEl.innerText = "Mật khẩu mới phải từ 6 ký tự!", msgEl.style.color="var(--r)"); let user = window.auth.currentUser; if(!user) return; msgEl.innerText = "Đang kiểm tra hệ thống..."; msgEl.style.color = "var(--y)"; try { await window.fbAuth.reauthenticateWithCredential(user, window.fbAuth.EmailAuthProvider.credential(user.email, oldP)); await window.fbAuth.updatePassword(user, newP); alert("Mật khẩu đã được cập nhật an toàn!"); closeChangePass(); } catch(e) { msgEl.innerText = e.code === 'auth/invalid-credential' ? "Mật khẩu hiện tại không đúng!" : "Lỗi kết nối máy chủ!"; msgEl.style.color = "var(--r)"; } }
    
    const AudioSys = {  
        ctx: null, master: null, enabled: true, bgmInterval: null,  
        init: function() { if(this.ctx) return; const A = window.AudioContext || window.webkitAudioContext; this.ctx = new A(); this.master = this.ctx.createGain(); this.master.gain.value = 1; this.master.connect(this.ctx.destination); },  
        updateButtons: function() { const text = this.enabled ? 'ÂM THANH: BẬT 🔔' : 'ÂM THANH: TẮT 🔕', color = this.enabled ? 'var(--p)' : '#fff', border = this.enabled ? 'var(--p)' : '#555'; ['sndBtnProf', 'sndBtnInGame'].forEach(id=>{let b=document.getElementById(id); if(b){b.innerHTML=text; b.style.color=color; b.style.borderColor=border;}}); },
        toggle: function() { this.enabled = !this.enabled; this.updateButtons(); if(this.enabled) { this.init(); if(this.ctx.state === 'suspended') this.ctx.resume(); if(state === 'PLAYING') this.playBGM(); } else { this.stopBGM(); } },  
        playTone: function(freq, type, dur, vol = 1, slide = 0) { if(!this.enabled) return; try { const o = this.ctx.createOscillator(); const g = this.ctx.createGain(); o.type = type; o.frequency.setValueAtTime(freq, this.ctx.currentTime); if(slide) o.frequency.exponentialRampToValueAtTime(slide, this.ctx.currentTime + dur); g.gain.setValueAtTime(vol, this.ctx.currentTime); g.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + dur); o.connect(g); g.connect(this.master); o.start(); o.stop(this.ctx.currentTime + dur); } catch(e) {} },  
        playNoise: function(dur) { if(!this.enabled) return; const bufSize = this.ctx.sampleRate * dur; const buf = this.ctx.createBuffer(1, bufSize, this.ctx.sampleRate); const data = buf.getChannelData(0); for(let i=0; i<bufSize; i++) data[i] = Math.random()*2 - 1; const src = this.ctx.createBufferSource(); src.buffer = buf; const g = this.ctx.createGain(); const f = this.ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 1000; g.gain.setValueAtTime(1, this.ctx.currentTime); g.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + dur); src.connect(f); f.connect(g); g.connect(this.master); src.start(); },  
        playBGM: function() { if(!this.enabled) return; this.stopBGM(); const notes = [110, 110, 220, 110, 164.81, 110, 146.83, 110]; let step = 0; this.bgmInterval = setInterval(() => { this.playTone(notes[step % notes.length], 'sawtooth', 0.2, 0.15); step++; }, 220); },  
        stopBGM: function() { if(this.bgmInterval) { clearInterval(this.bgmInterval); this.bgmInterval = null; } },  
        sfxShoot: function(type) { if(type === 'laser' || type === 'omega') this.playTone(900, 'sawtooth', 0.1, 0.2, 100); else if(type === 'spread' || type === 'nova') this.playTone(200, 'square', 0.1, 0.3, 50); else if(type === 'dark') this.playTone(100, 'square', 0.3, 0.4, 20); else this.playTone(500, 'triangle', 0.1, 0.2, 200); },  
        sfxExplode: function() { this.playNoise(0.3); }, sfxHit: function() { this.playTone(150, 'sawtooth', 0.2, 0.5, 50); }, sfxCoin: function() { this.playTone(1200, 'sine', 0.1, 0.2, 1800); }, sfxHeal: function() { this.playTone(600, 'sine', 0.3, 0.4, 1200); }, sfxLevel: function() { this.playTone(440, 'sine', 0.3, 0.5); setTimeout(()=>this.playTone(880, 'sine', 0.5, 0.5), 150); }  
    };  
      
    const EQUIP_DB = {  
    weapons: { 
        w1: { n: "Blaster", d: "Cơ bản", cost: 0, type:'std', color:'#0ff', fr: 15 }, 
        w2: { n: "Shotgun", d: "Bắn chùm", cost: 500, type:'spread', color:'#ff0', fr: 35 }, 
        w3: { n: "Laser", d: "Xuyên thấu", cost: 1200, type:'laser', color:'#f0f', fr: 45 }, 
        w4: { n: "Plasma", d: "Tìm mục tiêu", cost: 2500, type:'homing', color:'#0f0', fr: 50 }, 
        w5: { n: "Gatling", d: "Siêu tốc", cost: 5000, type:'gatling', color:'#ff9900', fr: 6 }, 
        w6: { n: "Supernova", d: "Đạn 5 tia", cost: 12000, type:'nova', color:'#ff0055', fr: 35 }, 
        w7: { n: "Dark Matter", d: "Cầu hủy diệt", cost: 30000, type:'dark', color:'#6600ff', fr: 60 }, 
        w8: { n: "Omega Beam", d: "Tia phán xét", cost: 80000, type:'omega', color:'#ffffff', fr: 20 },
        // --- TIER MỚI (CÀY CUỐC) ---
        w9: { n: "Pulse Rifle", d: "Liên thanh đạn to", cost: 150000, type:'std', color:'#00ffcc', fr: 10 },
        w10:{ n: "Hellfire", d: "Chùm lửa rộng", cost: 300000, type:'spread', color:'#ff3300', fr: 25 },
        w11:{ n: "Death Ray", d: "Laser sạc nhanh", cost: 500000, type:'laser', color:'#ff0000', fr: 30 },
        w12:{ n: "Swarm", d: "Bầy ong Plasma", cost: 850000, type:'homing', color:'#33cc33', fr: 35 },
        w13:{ n: "Vulcan", d: "Gatling tối thượng", cost: 1500000, type:'gatling', color:'#ffcc00', fr: 4 },
        w14:{ n: "Hypernova", d: "Đạn 5 tia lướt", cost: 2800000, type:'nova', color:'#ff00aa', fr: 25 },
        w15:{ n: "Void Sphere", d: "Hố đen kép", cost: 5000000, type:'dark', color:'#4400cc', fr: 45 },
        w16:{ n: "Genesis Ray", d: "Ánh sáng chói", cost: 8000000, type:'omega', color:'#ccffff', fr: 15 },
        w17:{ n: "Starfall", d: "Mưa đạn chùm", cost: 12000000, type:'spread', color:'#ffff99', fr: 18 },
        w18:{ n: "Eclipse", d: "Laser hủy diệt", cost: 18000000, type:'laser', color:'#1a1a1a', fr: 20 },
        w19:{ n: "Neutron", d: "Tự động săn lùng", cost: 25000000, type:'homing', color:'#00ff66', fr: 20 },
        w20:{ n: "Annihilator", d: "Quét sạch bản đồ", cost: 35000000, type:'gatling', color:'#ff0033', fr: 3 },
        w21:{ n: "Cosmic Storm", d: "Siêu bão Nova", cost: 50000000, type:'nova', color:'#ff33cc', fr: 15 },
        w22:{ n: "Singularity", d: "Hố đen nguyên thủy", cost: 75000000, type:'dark', color:'#110033', fr: 30 },
        w23:{ n: "God's Wrath", d: "Phán quyết", cost: 120000000, type:'omega', color:'#ffee00', fr: 10 },
        w24:{ n: "Reality Tear", d: "Rách không gian", cost: 200000000, type:'spread', color:'#ff00ff', fr: 10 },
        w25:{ n: "THE OVERDRIVE", d: "VŨ KHÍ TỐI THƯỢNG", cost: 500000000, type:'omega', color:'#ffffff', fr: 5 }
    },  
    hulls: { 
        h1: { n: "Standard", d: "Máu 100", cost: 0, hp:0, spd:0 }, 
        h2: { n: "Tanker", d: "Máu +200, Chậm", cost: 800, hp:200, spd:-0.03 }, 
        h3: { n: "Racer", d: "Máu -20, Nhanh", cost: 1000, hp:-20, spd:0.06 }, 
        h4: { n: "Titan", d: "Máu +500", cost: 3000, hp:500, spd:-0.05 }, 
        h5: { n: "Phantom", d: "Máu -50, Tốc độ", cost: 6000, hp:-50, spd:0.09 }, 
        h6: { n: "Juggernaut", d: "Máu +1000, Rùa", cost: 15000, hp:1000, spd:-0.07 }, 
        h7: { n: "Eclipse", d: "Máu +300", cost: 35000, hp:300, spd:0.04 }, 
        h8: { n: "Genesis", d: "Máu +1500", cost: 80000, hp:1500, spd:0.08 },
        // --- TIER MỚI (CÀY CUỐC) ---
        h9: { n: "Gladiator", d: "Máu +2000", cost: 150000, hp:2000, spd:-0.02 },
        h10:{ n: "Valkyrie", d: "Máu +1200, Nhanh", cost: 300000, hp:1200, spd:0.05 },
        h11:{ n: "Colossus", d: "Máu +3500", cost: 550000, hp:3500, spd:-0.08 },
        h12:{ n: "Wraith", d: "Máu +800, Siêu Nhanh", cost: 900000, hp:800, spd:0.12 },
        h13:{ n: "Behemoth", d: "Máu +6000", cost: 1600000, hp:6000, spd:-0.06 },
        h14:{ n: "Interceptor", d: "Máu +2500, Nhanh", cost: 3000000, hp:2500, spd:0.06 },
        h15:{ n: "Dreadnought", d: "Máu +10000", cost: 5500000, hp:10000, spd:-0.1 },
        h16:{ n: "Spectre", d: "Máu +4000, Tốc độ", cost: 9000000, hp:4000, spd:0.08 },
        h17:{ n: "Leviathan", d: "Máu +18000", cost: 15000000, hp:18000, spd:-0.05 },
        h18:{ n: "Comet", d: "Máu +6000, Tốc ánh sáng", cost: 24000000, hp:6000, spd:0.15 },
        h19:{ n: "Aegis", d: "Máu +30000", cost: 40000000, hp:30000, spd:-0.02 },
        h20:{ n: "Pulsar", d: "Máu +12000, Cân bằng", cost: 65000000, hp:12000, spd:0.07 },
        h21:{ n: "Galactus", d: "Máu +50000", cost: 100000000, hp:50000, spd:-0.05 },
        h22:{ n: "Quasar", d: "Máu +25000, Nhanh", cost: 160000000, hp:25000, spd:0.09 },
        h23:{ n: "Supermassive", d: "Máu +80000", cost: 250000000, hp:80000, spd:-0.08 },
        h24:{ n: "Event Horizon", d: "Máu +40000, Tốc độ", cost: 380000000, hp:40000, spd:0.1 },
        h25:{ n: "IMMORTAL", d: "VỎ TÀU BẤT TỬ", cost: 600000000, hp:150000, spd:0.12 }
    },
    drones: {
        d1: { n: "Scout Orb", d: "Bắn đạn thường", cost: 2000, color: '#0ff', fr: 60, dmg: 0.3, type: 'std' },
        d2: { n: "Laser Bit", d: "Tia xuyên thấu", cost: 15000, color: '#f0f', fr: 90, dmg: 1.0, type: 'laser' },
        d3: { n: "Plasma Core", d: "Đạn đuổi tự động", cost: 45000, color: '#0f0', fr: 120, dmg: 0.8, type: 'homing' },
        d4: { n: "Nova Star", d: "Bắn chùm lửa", cost: 120000, color: '#ff3300', fr: 80, dmg: 0.6, type: 'spread' },
        d5: { n: "Void Eye", d: "Mắt xé rách hư không", cost: 50000000, color: '#b200ff', fr: 45, dmg: 2.0, type: 'homing' }
    }
};

    const UPGRADES = { atk: { n: "Damage", cost: 100, max: 20, desc: "+10% ST" }, hp: { n: "Armor", cost: 100, max: 20, desc: "+50 Máu" }, luck: { n: "Luck", cost: 200, max: 10, desc: "Tỷ lệ đồ xịn" }, crit: { n: "Critical", cost: 150, max: 10, desc: "+5% Chí mạng" }, mag: { n: "Magnet", cost: 100, max: 10, desc: "Tầm hút đồ" } };  
    
    function save() { window.AuthSys.saveSync(); }  
    function enterFullScreen() { if (document.documentElement.requestFullscreen) document.documentElement.requestFullscreen().catch(()=>{}); }
    
    const cvs = document.getElementById('gameCanvas'); const ctx = cvs.getContext('2d', { alpha: false }); 
      
    function resize() { W = cvs.width = window.innerWidth; H = cvs.height = window.innerHeight; initStars(); }  
    window.addEventListener('resize', resize); resize();  
      
    function initStars() {  
        stars = []; for(let i=0; i<100; i++) stars.push({ x: Math.random()*W, y: Math.random()*H, s: Math.random()*2+0.5, r: Math.random()*1.5+0.5, layer: Math.random()>0.8?2:1 });  
    }  
      
    function spawnBullet(obj) { let b = bPool.get(); b.isEnemy = false; b.type = 'std'; b.r = 0; b.w = 4; b.h = 15; Object.assign(b, obj); bullets.push(b); }
    function addText(val, x, y, isCrit = false, customColor = null, big = false) { let t = tPool.get(); t.text = val; t.x = x + (Math.random()*20-10); t.y = y; t.life = 1.0; t.color = customColor || (isCrit ? '#ffcc00' : '#fff'); t.size = big ? 24 : (isCrit ? 20 : 14); t.vy = isCrit ? -2 : -1; texts.push(t); }  
      
    function startGame() {  
    document.getElementById('bossHud').style.display = 'none';
        enterFullScreen(); 
        if (!gData.inventory) {
    gData.inventory = { mat_scrap: 0, mat_plasma: 0, mat_crystal: 0, mat_void: 0, card_bronze: 0, card_silver: 0, card_gold: 0, card_plat: 0 };
}
        if (!gData.hiddenSkills) {
            if (!gData.itemCards) {
                gData.itemCards = {}; 
            }
            gData.hiddenSkills = { 
                aura: { unlockedBlueprint: false, activated: false, crafted: false }, 
                nano: { unlockedBlueprint: false, activated: false, crafted: false }, 
                overclock: { unlockedBlueprint: false, activated: false, crafted: false }, 
                aegis: { unlockedBlueprint: false, activated: false, crafted: false } 
            };
        } else {
            // Cập nhật cho save game cũ: Tự động đánh dấu là 'Đã mua' nếu trước đó 'Đã kích hoạt'
            for (let k in gData.hiddenSkills) {
                if (typeof gData.hiddenSkills[k].crafted === 'undefined') {
                    gData.hiddenSkills[k].crafted = gData.hiddenSkills[k].activated;
                }
            }
        }

        if (AudioSys.enabled) { AudioSys.init(); if (AudioSys.ctx && AudioSys.ctx.state === 'suspended') AudioSys.ctx.resume(); AudioSys.playBGM(); }
          
        state = 'PLAYING'; document.querySelectorAll('.overlay').forEach(e => e.classList.add('hidden')); document.getElementById('uiLayer').classList.remove('hidden');  
        const hull = EQUIP_DB.hulls[gData.equip.h]; const upHP = (gData.stats.hp || 0) * 50;  
// Lấy các thẻ của đúng trang bị ĐANG MẶC
let activeCards = [
    ...(gData.itemCards[gData.equip.w] || []), 
    ...(gData.itemCards[gData.equip.h] || [])
].filter(c => c !== null);

let cardHp = 0, cardAtkMult = 0, cardCrit = 0, hasPlat = false;
let highestTier = -1; let auraColor = null;

activeCards.forEach(c => {
    // Xác định màu aura dựa theo thẻ cao cấp nhất
    let t = -1, clr = '';
    if(c.includes('bronze')) { t = 1; clr = '#cd7f32'; }
    if(c.includes('silver')) { t = 2; clr = '#c0c0c0'; }
    if(c.includes('gold')) { t = 3; clr = '#ffd700'; }
    if(c.includes('plat')) { t = 4; clr = '#b200ff'; }
    if(t > highestTier) { highestTier = t; auraColor = clr; }

    // Tính chỉ số
    if(c === 'bronze' || c === 'card_bronze') { cardHp += 5; cardAtkMult += 0.02; }
    if(c === 'silver' || c === 'card_silver') { cardHp += 15; cardAtkMult += 0.05; }
    if(c === 'gold' || c === 'card_gold') { cardAtkMult += 0.1; cardCrit += 0.03; }
    if(c === 'plat' || c === 'card_plat') { cardAtkMult += 0.2; hasPlat = true; }
});

let totalAtk = 10 * (1 + (gData.stats.atk||0) * 0.1 + cardAtkMult);
let totalHp = 100 + hull.hp + upHP + cardHp;

player = { 
    x: W/2, y: H-150, r: 15, 
    hp: totalHp, maxHp: totalHp, 
    atk: totalAtk, 
    spd: 0.12 + hull.spd, 
    crit: ((gData.stats.crit || 0) * 0.05) + cardCrit, 
    magRadius: 100 + (gData.stats.mag || 0) * 40, 
    wep: gData.equip.w, fr: 0, nextFr: EQUIP_DB.weapons[gData.equip.w].fr || 12,  
    mult: 1 + (hasPlat ? 1 : 0), invuln: 0, 
    auraColor: auraColor // <--- Thêm dòng này để lưu màu Aura
};  

// Logic Kỹ năng Ẩn: Overclock (Quá tải)
if(gData.hiddenSkills.overclock.activated) {
    player.nextFr = Math.floor(player.nextFr * 0.5); // Bắn x2 tốc độ ngay từ đầu
    player.atk *= 1.5;
}

        const firerates = {w2:35, w3:45, w4:50, w5:5, w6:35, w7:60, w8:15}; if(firerates[player.wep]) player.nextFr = firerates[player.wep];
      
        enemies.forEach(e => ePool.release(e)); enemies = []; bullets.forEach(b => bPool.release(b)); bullets = []; particles.forEach(p => pPool.release(p)); particles = []; texts.forEach(t => tPool.release(t)); texts = []; items = []; trails = [];  
    
        game = { frame: 0, score: 0, lvl: 1, exp: 0, nextExp: 100, ult: 0, flash: 0, shake: 0, boss:false, surviveFrames: 0, lastTime: performance.now(), activeEvent: null, pendingEventRoll: false, droneAngle: 0, combo: 0, comboTimer: 0, maxCombo: 0 }; 
player.drone = gData.equip.d || '';

        if (isEndlessMode) {
            document.getElementById('lvlContainer').style.display = 'none'; document.getElementById('hudTimer').style.display = 'block';
        } else {
            document.getElementById('lvlContainer').style.display = 'block'; document.getElementById('hudTimer').style.display = 'none';
        }
        tX = W/2; tY = H-150; loop();  
    }  
    
    function togglePause() {
        const pauseScreen = document.getElementById('pauseScreen'), mainPause = document.getElementById('mainPauseMenu'), confirmMenu = document.getElementById('confirmQuitMenu');
        if (state === 'PLAYING') { state = 'PAUSED_MANUAL'; AudioSys.stopBGM(); pauseScreen.classList.remove('hidden'); mainPause.classList.remove('hidden'); confirmMenu.classList.add('hidden'); AudioSys.updateButtons(); } 
        else if (state === 'PAUSED_MANUAL') { state = 'PLAYING'; if (AudioSys.enabled) AudioSys.playBGM(); pauseScreen.classList.add('hidden'); loop(); }
    }
    
    function showConfirmQuit(isShowing) { isShowing ? (document.getElementById('mainPauseMenu').classList.add('hidden'), document.getElementById('confirmQuitMenu').classList.remove('hidden')) : (document.getElementById('mainPauseMenu').classList.remove('hidden'), document.getElementById('confirmQuitMenu').classList.add('hidden')); }
    
    window.returnToMenu = function() {
        state = 'MENU'; if (typeof AudioSys !== 'undefined' && AudioSys.enabled) { AudioSys.stopBGM(); }
        enemies.forEach(e => ePool.release(e)); enemies = []; bullets.forEach(b => bPool.release(b)); bullets = []; particles.forEach(p => pPool.release(p)); particles = []; texts.forEach(t => tPool.release(t)); texts = []; items = []; trails = [];
        document.getElementById('uiLayer').classList.add('hidden'); document.getElementById('overScreen').classList.add('hidden'); document.getElementById('pauseScreen').classList.add('hidden'); document.getElementById('menuScreen').classList.remove('hidden');
    };

    function executeQuit() { 
        if(isEndlessMode) {
            let totalSecs = Math.floor(game.surviveFrames / 60); if(totalSecs > (gData.maxTime || 0)) gData.maxTime = totalSecs;
        } else if(isHardcoreMode) {
            if(game.lvl > (gData.maxLvl_hc || 0)) gData.maxLvl_hc = game.lvl; if(game.score > (gData.maxScore_hc || 0)) gData.maxScore_hc = game.score;
        } else {
            if(game.lvl > (gData.maxLvl || 0)) gData.maxLvl = game.lvl; if(game.score > (gData.maxScore || 0)) gData.maxScore = game.score;
        }
        save(); window.returnToMenu(); 
    }

    function doShake(amt) { game.shake = Math.min(amt, 30); }  
      
    function loop(timestamp) {  
    if(state !== 'PLAYING') return; 
    requestAnimationFrame(loop); 

    // --- CƠ CHẾ CÂN BẰNG TỐC ĐỘ (CAP TẠI 60 FPS) ---
    if (!timestamp) timestamp = performance.now();
    let dt = timestamp - (game.lastTime || 0);
    // 16.66ms tương đương với 60 Frames/Giây. Nếu frame xuất hiện sớm hơn, ta bỏ qua không xử lý.
    if (dt < 16.66) return; 
    // Trừ đi số dư để frame sau mượt mà hơn
    game.lastTime = timestamp - (dt % 16.66);
    // ----------------------------------------------

    // (Phần code bên dưới giữ nguyên)
    if(isEndlessMode && !game.boss) {
        game.surviveFrames++;
        if(game.surviveFrames % 3600 === 0) { 
        game.lvl++; 
        if(game.lvl % 5 === 0) {
            trackQuest('games', 1); 
            spawnBoss(); 
        }
        AudioSys.sfxLevel(); 
        showLvlUp(); 
    }
}
        if(state !== 'PLAYING') return; requestAnimationFrame(loop); game.frame++;  
        ctx.save();  
        if(game.shake > 0) { ctx.translate((Math.random()-0.5)*game.shake, (Math.random()-0.5)*game.shake); game.shake *= 0.85; if(game.shake < 0.5) game.shake = 0; }  
        // Xử lý kích hoạt sự kiện sau khi lên cấp (chờ Boss chết mới chạy)
if (game.pendingEventRoll && !game.boss) {
    game.pendingEventRoll = false;
    if (Math.random() < 0.1) { // 35% tỷ lệ xảy ra sự kiện
        game.activeEvent = Math.random() < 0.5 ? 'meteor' : 'supply';
        let alertColor = game.activeEvent === 'meteor' ? '#ff4444' : '#00ffff';
        let alertText = game.activeEvent === 'meteor' ? "BÃO THIÊN THẠCH" : "HẠM ĐỘI TIẾP TẾ";
        addText("CẢNH BÁO: " + alertText, W/2, H/2, true, alertColor, true);
        
        // Còi báo động (Tít... Tít...)
        AudioSys.playTone(400, 'square', 0.4, 0.4, 300); 
        setTimeout(() => AudioSys.playTone(400, 'square', 0.4, 0.4, 300), 500);
    }
}

// Đổi màu nền nếu đang có sự kiện
let bgFill = '#050508';
if (game.activeEvent === 'meteor') bgFill = '#1a0505'; // Nền hơi đỏ tía
else if (game.activeEvent === 'supply') bgFill = '#051a1a'; // Nền hơi xanh lơ
ctx.fillStyle = bgFill; 
ctx.fillRect(-20,-20,W+40,H+40); 

          
        ctx.fillStyle = '#fff';  
        stars.forEach(st => { st.y += st.s * st.layer + (game.flash > 0 ? 15 : 0); if(st.y > H) { st.y = 0; st.x = Math.random()*W; } ctx.globalAlpha = st.layer === 2 ? 1 : 0.4; let sz = st.r * st.layer * 2; ctx.fillRect(st.x - sz/2, st.y - sz/2, sz, sz); }); ctx.globalAlpha = 1;  
      
        let dx = tX - player.x, dy = (tY - 80) - player.y;  
        if(Math.abs(dx) > 1) player.x += dx * player.spd; if(Math.abs(dy) > 1) player.y += dy * player.spd;  
        if(player.invuln > 0) player.invuln--; 
      
        trails.push({x: player.x, y: player.y + 15, life: 1.0});  
        for(let i=trails.length-1; i>=0; i--) { let t = trails[i]; t.y += 2; t.life -= 0.1; if(t.life <= 0) { trails.splice(i, 1); continue; } ctx.fillStyle = `rgba(0, 255, 255, ${t.life * 0.5})`; ctx.beginPath(); ctx.arc(t.x, t.y, 8 * t.life, 0, Math.PI*2); ctx.fill(); }  
          
        ctx.save(); ctx.translate(player.x, player.y);  
        if(player.invuln > 0) { ctx.globalAlpha = game.frame % 10 < 5 ? 0.3 : 0.8; if(player.invuln > 60) { ctx.beginPath(); ctx.arc(0, 0, player.r + 10, 0, Math.PI*2); ctx.strokeStyle = '#0ff'; ctx.lineWidth = 2; ctx.stroke(); } }
        
        // --- VẼ AURA MÀU THEO THẺ ---
        if(player.auraColor) {
            ctx.save();
            ctx.beginPath();
            // Bán kính nhấp nháy theo thời gian
            let pulse = Math.sin(game.frame * 0.1) * 3;
            ctx.arc(0, 0, player.r + 6 + pulse, 0, Math.PI * 2);
            ctx.shadowBlur = 15;
            ctx.shadowColor = player.auraColor;
            ctx.strokeStyle = player.auraColor;
            ctx.lineWidth = 2;
            ctx.globalAlpha = 0.7;
            ctx.stroke();
            ctx.restore();
        }
        // -----------------------------

        ctx.rotate((dx * 0.05) * Math.PI/180 * 20); ctx.fillStyle = EQUIP_DB.weapons[player.wep].color;  
        ctx.beginPath(); ctx.moveTo(0,-20); ctx.lineTo(18,15); ctx.lineTo(0,10); ctx.lineTo(-18,15); ctx.fill();  
                ctx.fillStyle = '#fff'; ctx.fillRect(-2,-2,4,4); ctx.restore(); ctx.globalAlpha = 1;  
    
        // --- LOGIC DRONE BAY QUANH TÀU VÀ TỰ BẮN ---
        if (player.drone && EQUIP_DB.drones[player.drone]) {
            let dDb = EQUIP_DB.drones[player.drone];
            game.droneAngle += 0.05; // Tốc độ quay quanh tàu
            let dX = player.x + Math.cos(game.droneAngle) * 50; // Bán kính 50
            let dY = player.y + Math.sin(game.droneAngle) * 30; // Bán kính quỹ đạo elip

            // Vẽ Drone
            ctx.save();
            ctx.translate(dX, dY);
            ctx.rotate(game.frame * 0.1); // Drone tự xoay tròn
            ctx.fillStyle = dDb.color;
            ctx.beginPath(); ctx.arc(0, 0, 8, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(0, 0, 3, 0, Math.PI * 2); ctx.fill(); // Lõi phát sáng
            // Vẽ vòng năng lượng
            ctx.strokeStyle = `rgba(255,255,255, ${0.3 + Math.sin(game.frame*0.2)*0.2})`;
            ctx.beginPath(); ctx.arc(0, 0, 12, 0, Math.PI * 2); ctx.stroke();
            ctx.restore();

            // Drone tự động nhả đạn
            if (game.frame % dDb.fr === 0 && enemies.length > 0) {
                let dDmg = player.atk * dDb.dmg;
                if(dDb.type === 'laser') {
                    spawnBullet({x: dX, y: dY - 10, vx: 0, vy: -30, dmg: dDmg, c: dDb.color, type: 'pierce', h: 60, w: 4});
                } else if (dDb.type === 'homing') {
                    spawnBullet({x: dX, y: dY - 10, vx: (Math.random()-0.5)*4, vy: -5, dmg: dDmg, c: dDb.color, type: 'homing', r: 5});
                } else if (dDb.type === 'spread') {
                    for(let i=-1; i<=1; i++) spawnBullet({x:dX, y:dY-10, vx:i*2, vy:-10, dmg:dDmg*0.7, c:dDb.color, type:'std', w:3, h:8});
                } else {
                    spawnBullet({x: dX, y: dY - 10, vx: 0, vy: -15, dmg: dDmg, c: dDb.color, type: 'std', w: 3, h: 10});
                }
            }
        }
        // ------------------------------------------

        if(game.frame % player.nextFr === 0) fire(); 
        
        // 1. TĂNG TỐC ĐỘ: Càng lên level, quái ra càng nhanh (nhanh nhất là 20 frame / đợt thay vì 60 như cũ)
        let spawnRate = Math.max(20, 100 - game.lvl * 3); 
        
        if(game.frame % spawnRate === 0 && !game.boss) {
            
            // 2. TĂNG SỐ LƯỢNG: Cứ mỗi 5 level, đẻ thêm 1 con quái cùng lúc trong một đợt
            let spawnCount = 1 + Math.floor(game.lvl / 5);
            
            for(let i = 0; i < spawnCount; i++) {
                // Nếu có sự kiện, 30% quái sinh ra sẽ là quái sự kiện
                if (game.activeEvent && Math.random() < 0.3) {
                    let e = ePool.get();
                    if (e) {
                        if (game.activeEvent === 'meteor') {
                            Object.assign(e, { type: 'meteor', x: Math.random()*(W-50)+25, y: -50, r: 25, hp: 100 + game.lvl*5, maxHp: 100 + game.lvl*5, s: 2 + Math.random()*2, color: '#aaaaaa', angle: 0 });
                        } else {
                            Object.assign(e, { type: 'supply', x: Math.random()*(W-40)+20, y: -50, r: 20, hp: 500 + game.lvl*20, maxHp: 500 + game.lvl*20, s: 4, color: '#00ffff', angle: 0 });
                        }
                        e.baseX = e.x;
                        enemies.push(e);
                    }
                } else {
                    spawnEnemy(); // 70% còn lại là quái thường
                }
            }
        }
 
        
// Logic Kỹ Năng Ẩn: Black Hole Aura
if(gData.hiddenSkills.aura.activated) {
    ctx.beginPath(); ctx.arc(player.x, player.y, player.magRadius * 1.5, 0, Math.PI*2);
    ctx.strokeStyle = 'rgba(178, 0, 255, 0.2)'; ctx.lineWidth = 2; ctx.stroke();
    player.magRadius = 250; // Hút cực xa
    // Làm chậm đạn địch
    bullets.forEach(b => { if(b.isEnemy && Math.hypot(b.x-player.x, b.y-player.y) < 150) { b.vx*=0.95; b.vy*=0.95; } });
}

        updateBullets(); updateEnemies(); updateParticles(); updateItems(); updateTexts(); AudioSys.updateButtons();
      
        if(game.flash > 0) { ctx.fillStyle = `rgba(255, 255, 255, ${game.flash})`; ctx.fillRect(-20,-20,W+40,H+40); game.flash -= 0.05; }  
        ctx.restore(); 
        
        // VẼ HUD COMBO & TÍNH TOÁN GIẢM COMBO
        if (game.comboTimer > 0) {
            game.comboTimer--;
            if (game.comboTimer <= 0 && game.combo > 5) { addText("COMBO DROPPED", player.x, player.y - 40, false, '#aaa'); game.combo = 0; }
        }
        if (game.combo > 1) {
            ctx.save();
            ctx.fillStyle = `rgba(255, 215, 0, ${Math.min(1, game.comboTimer/60)})`;
            ctx.font = "italic 900 24px Orbitron"; ctx.textAlign = "right"; ctx.shadowBlur = 10; ctx.shadowColor = "#ff0";
            ctx.fillText(game.combo + " COMBO", W - 20, 160);
            ctx.font = "700 12px Orbitron"; ctx.fillStyle = "#0ff"; ctx.shadowColor = "#0ff";
            ctx.fillText("+" + (game.combo * 2) + "% THƯỞNG", W - 20, 180);
            ctx.restore();
        }
        
        updateHUD(); 
    }  
      
    function spawnEnemy() {  
        let e = ePool.get(); if (!e) return; 
        let diff = 1 + game.lvl*0.2, type = 'norm', r = 16, hp = 30 * diff, s = 1 + Math.random(), c = '#ff3333', rnd = Math.random();  
        if(rnd > 0.85 - (game.lvl * 0.01)) { type='tank'; r=30; hp*=4; s*=0.5; c='#0f0'; } else if(rnd > 0.65 - (game.lvl * 0.01)) { type='rusher'; r=14; hp*=0.6; s*=2.5; c='#ff0'; } else if(rnd > 0.50 - (game.lvl * 0.01)) { type='sniper'; r=12; hp*=0.8; s*=3; c='#b200ff'; }
        Object.assign(e, { type: type, x: Math.random()*(W-r*2)+r, y: -50, baseX: 0, r: r, hp: hp, maxHp: hp, s: s, color: c, angle: 0, sineAmp: Math.random()*2, fireTimer: 0 });
        e.baseX = e.x; enemies.push(e);  
    }
      
        function spawnBoss(){ 
        let template;
        if (!gData.hasWon) {
            if (game.lvl === 50) {
                template = BOSS_TEMPLATES.find(b => b.id === 10);
            } else {
                let regularBosses = BOSS_TEMPLATES.filter(b => b.id !== 10);
                template = regularBosses[Math.floor(Math.random() * regularBosses.length)];
            }
        } else {
            template = BOSS_TEMPLATES[Math.floor(Math.random() * BOSS_TEMPLATES.length)];
        }
        
        let hp = player.maxHp * template.hpMult * (1 + game.lvl * 0.1); 
        uiCache.bossHpBar.parentElement.parentElement.style.display = 'block'; uiCache.bossHpBar.parentElement.previousElementSibling.innerText = template.name.toUpperCase();
        let e = ePool.get(); if(!e) return;
        Object.assign(e, { type:'boss', name: template.name, x: W/2, y: -100, r: 60, hp: hp, maxHp: hp, s: 1.5, color: template.color, angle: 0, fireTimer: 0, equippedWeapons: pickRandomWeapons(template.allowed, template.slots) });
        enemies.push(e); game.boss = true; 
    }  
      
    function fire() {  
        const w = EQUIP_DB.weapons[player.wep]; AudioSys.sfxShoot(w.type); let dmg = player.atk;  
        if(w.type === 'spread') { for(let i=-1; i<=1; i++) spawnBullet({x:player.x, y:player.y-20, vx:i*3, vy:-15, dmg:dmg*0.7, c:w.color, type:'std', w:4, h:10}); } 
        else if(w.type === 'laser') spawnBullet({x:player.x, y:player.y-20, vx:0, vy:-30, dmg:dmg*2.5, c:w.color, type:'pierce', h:80, w:6});  
        else if(w.type === 'homing') spawnBullet({x:player.x, y:player.y-20, vx:(Math.random()-0.5)*6, vy:-6, dmg:dmg*2, c:w.color, type:'homing', r:6});  
        else if(w.type === 'gatling') spawnBullet({x:player.x + (Math.random()*12-6), y:player.y-20, vx:(Math.random()*2-1), vy:-25, dmg:dmg*0.4, c:w.color, type:'std', w:3, h:15});
        else if(w.type === 'nova') { for(let i=-2; i<=2; i++) spawnBullet({x:player.x, y:player.y-20, vx:i*4, vy:-15, dmg:dmg*0.9, c:w.color, type:'std', w:5, h:12}); } 
        else if(w.type === 'dark') spawnBullet({x:player.x, y:player.y-30, vx:0, vy:-8, dmg:dmg*8, c:w.color, type:'pierce', w:40, h:40});
        else if(w.type === 'omega') spawnBullet({x:player.x, y:player.y-20, vx:0, vy:-50, dmg:dmg*4, c:w.color, type:'pierce', h:200, w:20});
        else { spawnBullet({x:player.x, y:player.y-20, vx:0, vy:-20, dmg:dmg, c:w.color, type:'std', w:4, h:15}); if(player.mult > 1) { spawnBullet({x:player.x-15, y:player.y-5, vx:-1, vy:-18, dmg:dmg*0.8, c:w.color, type:'std', w:4, h:15}); spawnBullet({x:player.x+15, y:player.y-5, vx:1, vy:-18, dmg:dmg*0.8, c:w.color, type:'std', w:4, h:15}); } }  
    }  
      
    function updateBullets() {  
        for(let i=bullets.length-1; i>=0; i--) {  
            let b = bullets[i];  
            if(b.type === 'homing' && !b.isEnemy && enemies.length > 0) {  
                let target = enemies[0], minDistSq = Infinity;  
                enemies.forEach(e => { let dx=e.x-b.x, dy=e.y-b.y, dSq=dx*dx+dy*dy; if(dSq < minDistSq) { minDistSq = dSq; target = e; } });  
                let ang = Math.atan2(target.y - b.y, target.x - b.x); b.vx += Math.cos(ang) * 1.5; b.vy += Math.sin(ang) * 1.5;  
                let spdSq = b.vx*b.vx + b.vy*b.vy; if(spdSq > 225) { let spd = Math.sqrt(spdSq); b.vx = (b.vx/spd)*15; b.vy = (b.vy/spd)*15; }  
            }  
            b.x += b.vx; b.y += b.vy; ctx.fillStyle = b.c;  
            if(b.isEnemy) {  
                // Thêm check: nếu là laser (pierce) thì vẽ hình chữ nhật, ngược lại vẽ hình tròn
                if(b.type === 'pierce') {
                    ctx.fillRect(b.x - b.w/2, b.y, b.w, b.h);
                } else {
                    ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI*2); ctx.fill();  
                }
                
                let pdx = b.x-player.x, pdy = b.y-player.y;
                if(player.invuln <= 0 && (pdx*pdx + pdy*pdy < (b.r + 10)*(b.r + 10))) {  
if(isHardcoreMode) player.hp = 0; else player.hp -= b.dmg; 

// KỸ NĂNG AEGIS
if (player.hp <= 0 && gData.hiddenSkills.aegis.activated && !player.aegisUsed) {
    player.hp = player.maxHp * 0.2; // Cứu sống, hồi 20% máu
    player.invuln = 180; // Bất tử 3 giây (60fps * 3)
    player.aegisUsed = true;
    addText("AEGIS PROTECT!", player.x, player.y - 40, true, '#00ffff', true);
}

player.invuln = 40; doShake(10); addText(isHardcoreMode ? "FATAL!" : "-" + Math.floor(b.dmg), player.x, player.y - 30, false, '#ff3333'); AudioSys.sfxHit(); 
                    bPool.release(b); bullets.splice(i, 1); 
if(player.hp <= 0) { gameOver(); return; } // Dùng return để thoát hẳn khỏi hàm
continue;  
                }  
            } else { if(b.type==='homing') { ctx.fillRect(b.x-b.r, b.y-b.r, b.r*2, b.r*2); } else ctx.fillRect(b.x-b.w/2, b.y, b.w, b.h); }
            if(b.y < -100 || b.y > H+100 || b.x < -50 || b.x > W+50) { bPool.release(b); bullets.splice(i,1); }  
        }  }
    
    function getEnemyDamage(type) { let baseTankDmg = 10 + (game.lvl - 1) * 5; if (type === 'rusher') return baseTankDmg + (player.maxHp * 0.05); if (type === 'tank') return baseTankDmg; if (type === 'sniper') return baseTankDmg * 1.2; return baseTankDmg * 0.8; }
      
    function updateEnemies() {  
        for(let i=enemies.length-1; i>=0; i--) {  
            let e = enemies[i]; 
            if(e.type !== 'boss' && e.type !== 'sniper') e.y += e.s; e.angle += 0.05; 
            if(e.type === 'norm') e.x = e.baseX + Math.sin(e.y * 0.05) * 40 * e.sineAmp; 
            if (e.hp <= 0) continue; 
    
            if(e.type === 'tank') { e.fireTimer++; if(e.fireTimer % 90 === 0) spawnBullet({x: e.x, y: e.y + e.r, vx: 0, vy: 5, dmg: getEnemyDamage('tank'), c: '#0f0', isEnemy: true, r: 6}); }
            if(e.type === 'sniper') { if(e.y < 120) e.y += e.s; else e.x = e.baseX + Math.sin(game.frame * 0.03) * 50; e.fireTimer++; if(e.fireTimer % 120 === 0 && e.y >= 120) { let ang = Math.atan2(player.y - e.y, player.x - e.x); spawnBullet({x: e.x, y: e.y, vx: Math.cos(ang)*10, vy: Math.sin(ang)*10, dmg: getEnemyDamage('sniper'), c: '#b200ff', isEnemy: true, r: 4}); } }
            if(e.type === 'boss') { 
                if(e.y < 150) e.y += e.s; else e.x = W/2 + Math.sin(game.frame * 0.02) * (W/3); e.fireTimer++; let bossBulletDmg = (player.maxHp / 10) * (game.lvl / 5); 
                e.equippedWeapons.forEach(weapon => {
                    if(weapon === BULLET_PATTERNS.SPREAD && e.fireTimer % 100 === 0) { for(let a=0; a<Math.PI*2; a+=Math.PI/6) spawnBullet({x:e.x, y:e.y, vx:Math.cos(a)*5, vy:Math.sin(a)*5, dmg: bossBulletDmg, c:e.color, isEnemy:true, r:10}); }
                    else if(weapon === BULLET_PATTERNS.LASER && e.fireTimer % 120 === 60) { spawnBullet({x:e.x, y:e.y + 40, vx:0, vy:18, dmg: bossBulletDmg*2, c:'#fff', isEnemy:true, w:12, h:80, type:'pierce'}); }
                    else if(weapon === BULLET_PATTERNS.HOMING && e.fireTimer % 90 === 30) { let ang = Math.atan2(player.y - e.y, player.x - e.x); spawnBullet({x:e.x, y:e.y, vx:Math.cos(ang)*4, vy:Math.sin(ang)*4, dmg: bossBulletDmg, c:'#0f0', isEnemy:true, r:12, type:'homing'}); }
                    else if(weapon === BULLET_PATTERNS.SPIRAL && e.fireTimer % 12 === 0) { let sAng = e.fireTimer * 0.1; spawnBullet({x:e.x, y:e.y, vx:Math.cos(sAng)*6, vy:Math.sin(sAng)*6, dmg: bossBulletDmg*0.5, c:'#ff0', isEnemy:true, r:8}); spawnBullet({x:e.x, y:e.y, vx:Math.cos(sAng+Math.PI)*6, vy:Math.sin(sAng+Math.PI)*6, dmg: bossBulletDmg*0.5, c:'#ff0', isEnemy:true, r:8}); }
                    else if(weapon === BULLET_PATTERNS.WAVE && e.fireTimer % 80 === 0) { for(let i=-2; i<=2; i++) spawnBullet({x:e.x, y:e.y, vx:i*3, vy:7, dmg: bossBulletDmg, c:'#0ff', isEnemy:true, r:9}); }
                });
            }
    
            if(e.type === 'rusher') { ctx.beginPath(); ctx.setLineDash([15, 15]); ctx.moveTo(e.x, e.y); ctx.lineTo(e.x, H); ctx.strokeStyle = 'rgba(255, 50, 50, 0.6)'; ctx.lineWidth = 3; ctx.stroke(); ctx.setLineDash([]); }
            ctx.save(); ctx.translate(e.x, e.y); ctx.rotate(e.angle); ctx.strokeStyle = e.color; ctx.lineWidth = 3; ctx.beginPath(); 
            if(e.type === 'rusher') { ctx.moveTo(0, e.r); ctx.lineTo(-e.r, -e.r); ctx.lineTo(e.r, -e.r); } else if(e.type === 'tank') { ctx.rect(-e.r, -e.r, e.r*2, e.r*2); } else if(e.type === 'sniper') { ctx.moveTo(0, -e.r); ctx.lineTo(e.r, e.r); ctx.lineTo(-e.r, e.r); } else { ctx.moveTo(0, -e.r); ctx.lineTo(e.r, 0); ctx.lineTo(0, e.r); ctx.lineTo(-e.r, 0); } 
            ctx.closePath(); ctx.stroke(); ctx.fillStyle = 'rgba(255,255,255,0.15)'; ctx.fill(); ctx.restore();  
      
            if(e.hp < e.maxHp) { ctx.fillStyle = 'rgba(255,0,0,1)'; ctx.fillRect(e.x - e.r, e.y - e.r - 8, (e.r * 2) * (e.hp / e.maxHp), 4); }
    
            let pEdx = e.x - player.x, pEdy = e.y - player.y;
            if(pEdx*pEdx + pEdy*pEdy < (e.r + 12)*(e.r + 12)) {  
                if(player.invuln <= 0) {  
                    let dmg = e.type === 'boss' ? Math.floor(player.maxHp * 0.3) : Math.floor(getEnemyDamage(e.type));
                    if(isHardcoreMode) player.hp = 0; else player.hp -= dmg; 

// KỸ NĂNG AEGIS
if (player.hp <= 0 && gData.hiddenSkills.aegis.activated && !player.aegisUsed) {
    player.hp = player.maxHp * 0.2; // Cứu sống, hồi 20% máu
    player.invuln = 180; // Bất tử 3 giây
    player.aegisUsed = true;
    addText("AEGIS PROTECT!", player.x, player.y - 40, true, '#00ffff', true);
}
player.invuln = 50; 
                    if(e.type === 'boss') { let impactDmg = player.atk * 10; e.hp -= impactDmg; addText(Math.floor(impactDmg), e.x, e.y, true, '#ffaa00'); spawnParticles(e.x, e.y, e.color, 15); }
                    doShake(Math.min(dmg / 10, 30)); addText(isHardcoreMode ? "FATAL!" : "-" + Math.floor(dmg), player.x, player.y - 30, false, '#ff3333'); AudioSys.sfxHit(); spawnParticles(player.x, player.y, '#f00', 20, 2);  
                    if(e.type !== 'boss') { ePool.release(e); enemies.splice(i, 1); } 
                    if(player.hp <= 0) { gameOver(); return; } // Thêm return
                                        if(e.type === 'boss' && e.hp <= 0) { 
                        game.boss = false; uiCache.bossHpBar.parentElement.parentElement.style.display='none'; game.score += 5000; if (e.name === "Neural Overlord") gData.hasWon = true; save(); AudioSys.sfxExplode(); spawnParticles(e.x, e.y, e.color, 50); ePool.release(e); enemies.splice(i, 1); 
                    }
                } 
                continue;  
            }
            
            for(let j=bullets.length-1; j>=0; j--) {  
                let b = bullets[j]; if(b.isEnemy) continue; 
                let hitRadius = e.type === 'tank' && game.lvl > 10 ? e.r + 10 : e.r, hitboxExt = (b.type === 'pierce') ? (b.w || 4) / 2 : (b.w || 4);
                let distSq = (e.x - b.x)*(e.x - b.x) + (e.y - b.y)*(e.y - b.y), radiusSum = hitRadius + hitboxExt;
                if (distSq < radiusSum * radiusSum) { 
                    let isCrit = Math.random() < player.crit; let dmg = b.dmg * (isCrit ? 2.5 : (Math.random()>0.85 ? 1.5 : 1)); e.hp -= dmg;  
                    addText(Math.floor(dmg), e.x, e.y - 15, isCrit, isCrit ? '#ffcc00' : '#fff'); spawnParticles(b.x, b.y, b.c, 3, 0.5); 
                    if(b.type !== 'pierce') { bPool.release(b); bullets.splice(j,1); }  
    
                    if(e.hp < 0.2) {   
                        // Nếu là quái sự kiện
if(e.type === 'meteor' || e.type === 'supply') {
    if (e.type === 'meteor') {
        AudioSys.playNoise(0.15); // Tiếng "đùm" ngắn, vừa tai, không điếc tai
        doShake(5); // Rung nhẹ hơn tàu tiếp tế
        
        // Cột bụi bốc thẳng lên trên (không lan ra 4 phía che màn hình)
        for(let p_i=0; p_i<15; p_i++) {
            let p = pPool.get();
            if(p) {
                p.x = e.x + (Math.random()*20-10);
                p.y = e.y;
                p.color = '#777777';
                p.vx = (Math.random()-0.5) * 1.5; // Tạt ngang rất ít
                p.vy = -Math.random() * 5 - 2; // Bay thốc lên trên
                p.life = 1.0; p.decay = 0.05; p.size = Math.random()*4+2;
                particles.push(p);
            }
        }
    } else {
        AudioSys.sfxExplode(); spawnParticles(e.x, e.y, e.color, 30); doShake(10);
    }

    // Rớt nguyên liệu chế tạo (Đã cân bằng tỷ lệ)
    let mType = 'mat_scrap';
    let r = Math.random();
    if(e.type === 'supply') { 
        if(r < 0.08) mType = 'mat_void';        // 8% Hạt hư vô
        else if(r < 0.3) mType = 'mat_plasma'; // 30% Plasma
        else mType = 'mat_scrap';               // 62% Kim loại
    } else { 
        if(r < 0.05) mType = 'mat_crystal';     // 5% Tinh thể
        else if(r < 0.25) mType = 'mat_plasma'; // 20% Plasma
        else mType = 'mat_scrap';               // 75% Kim loại
    }
    
    items.push({x: e.x, y: e.y, t: 'mat', mType: mType});
    ePool.release(e); enemies.splice(i,1); break;
}

const coinMultiplier = isHardcoreMode ? 1.5 : 1; let rewardAmount = 0;
game.ult = Math.min(100, game.ult + (e.type==='tank'?8:4)); AudioSys.sfxExplode(); doShake(e.type==='tank'?10:4); spawnParticles(e.x, e.y, e.color, e.type==='tank'?35:20);

if(e.type === 'boss') { 
    trackQuest('boss', 1);
    game.boss = false; uiCache.bossHpBar.parentElement.parentElement.style.display='none'; 
    
    // --- LOGIC MỚI: Đánh bại Boss ở mốc level nhất định chắc chắn rơi Bản thiết kế ---
    let bpType = null;
    if (game.lvl === 10 && !gData.hiddenSkills.aura.unlockedBlueprint) bpType = 'aura';
    else if (game.lvl === 20 && !gData.hiddenSkills.nano.unlockedBlueprint) bpType = 'nano';
    else if (game.lvl === 30 && !gData.hiddenSkills.overclock.unlockedBlueprint) bpType = 'overclock';
    else if (game.lvl === 40 && !gData.hiddenSkills.aegis.unlockedBlueprint) bpType = 'aegis';
        if(bpType) items.push({x: e.x, y: e.y, t: 'bp', bpId: bpType});
    
    // Thêm tỷ lệ rớt Thẻ (Card) - CHỈ RƠI TỪ BOSS VỚI TỶ LỆ CŨ
    let cardRng = Math.random();
    if (cardRng < 0.0005) { items.push({x:e.x, y:e.y, t: 'card', cType: 'card_plat'}); }
    else if (cardRng < 0.001) { items.push({x:e.x, y:e.y, t: 'card', cType: 'card_gold'}); }
    else if (cardRng < 0.005) { items.push({x:e.x, y:e.y, t: 'card', cType: 'card_silver'}); }
    else if (cardRng < 0.01) { items.push({x:e.x, y:e.y, t: 'card', cType: 'card_bronze'}); }

    // ---------------------------------------------------------------------------------

    rewardAmount = Math.floor(500 * coinMultiplier); secureAddCoins(rewardAmount);

    addText("BOSS BONUS +" + rewardAmount, e.x, e.y - 40, true, '#ffd700', true);
    if (e.name === "Neural Overlord") gData.hasWon = true; save();
    } else { 
    trackQuest('kills', 1); 
    // XỬ LÝ TĂNG COMBO
    game.combo++; game.comboTimer = 180; // Giữ combo trong 3 giây (ở 60fps)
    if (game.combo > game.maxCombo) game.maxCombo = game.combo;
    
    let comboMultiplier = 1 + (game.combo * 0.02); // Mỗi combo tăng 2% thưởng
    game.score += Math.floor((e.type==='tank'?400:150) * comboMultiplier); 
    rewardAmount = Math.floor(20 * coinMultiplier * comboMultiplier);
    
    let rngDrop = Math.random();

    // Thêm tỷ lệ rớt Thẻ (Card)

     if(rngDrop < 0.025) { items.push({x:e.x, y:e.y, t: 'b'}); } 
    else if(rngDrop < 0.045) { items.push({x:e.x, y:e.y, t: 's'}); } 
    else if(rngDrop < (player.hp < player.maxHp * 0.35 ? 0.3 : 0.06)) { items.push({x:e.x, y:e.y, t: 'h'}); } 
    else if(rngDrop > (0.9 - (gData.stats.luck||0)*0.05)) { if (isEndlessMode) items.push({x: e.x, y: e.y, t: 'c', val: rewardAmount}); else items.push({x:e.x, y:e.y, t: 'x'}); } 
    else { items.push({x: e.x, y: e.y, t: 'c', val: rewardAmount}); }
}
ePool.release(e); enemies.splice(i,1); break;

                    }
                }  
            }  
            if(e.y > H + 50) { ePool.release(e); enemies.splice(i,1); }  
        }  
    }
    
    function spawnParticles(x, y, c, n, spd = 1) { for(let i=0; i<n; i++) { let p = pPool.get(); p.x = x; p.y = y; p.color = c; const a = Math.random() * Math.PI * 2, s = (Math.random() * 5 + 2) * spd; p.vx = Math.cos(a) * s; p.vy = Math.sin(a) * s; p.life = 1.0; p.decay = Math.random() * 0.03 + 0.02; p.size = Math.random() * 3 + 1; particles.push(p); } }  
    function updateParticles() { for(let i=particles.length-1; i>=0; i--) { let p = particles[i]; p.x += p.vx; p.y += p.vy; p.vx *= 0.92; p.vy *= 0.92; p.life -= p.decay; ctx.globalAlpha = Math.max(0, p.life); ctx.fillStyle = p.color; ctx.fillRect((p.x - p.size) | 0, (p.y - p.size) | 0, (p.size * 2) | 0, (p.size * 2) | 0); if(p.life <= 0) { pPool.release(p); particles.splice(i,1); } } ctx.globalAlpha = 1; }  
    function updateTexts() { ctx.textAlign = "center"; for(let i=texts.length-1; i>=0; i--) { let t = texts[i]; t.y += t.vy; t.life -= 0.03; if(t.life <= 0) { tPool.release(t); texts.splice(i,1); continue; } ctx.fillStyle = t.color; ctx.globalAlpha = Math.max(0, t.life); ctx.font = `bold ${t.size}px Orbitron`; ctx.fillText(t.text, t.x, t.y); } ctx.globalAlpha = 1; ctx.textAlign = "left"; }  
    
    function updateItems() { 
    const MAT_COLORS = {mat_scrap: '#aaa', mat_plasma: '#0ff', mat_crystal: '#f0f', mat_void: '#800080'};
        ctx.font = "20px Arial"; ctx.textAlign = "center"; 
        for(let i=items.length-1; i>=0; i--) { 
            let it = items[i]; let dx=it.x-player.x, dy=it.y-player.y, distSq = dx*dx + dy*dy; 
            if(distSq < player.magRadius*player.magRadius) { it.x += (player.x - it.x)*0.15; it.y += (player.y - it.y)*0.15; } else { it.y += 2; }
            let icon = '💰'; ctx.fillStyle = '#ffd700'; 
            if(it.t === 'x') { icon = '💠'; ctx.fillStyle = '#0ff'; } if(it.t === 'h') { icon = '💚'; ctx.fillStyle = '#0f0'; } if(it.t === 's') { icon = '🛡️'; ctx.fillStyle = '#0ff'; } if(it.t === 'b') { icon = '💣'; ctx.fillStyle = '#f00'; } 
                        else if(it.t === 'mat') { 
                ctx.fillStyle = MAT_COLORS[it.mType]; 
                if(it.mType === 'mat_void') icon = '🌌';
                else if(it.mType === 'mat_crystal') icon = '💎';
                else if(it.mType === 'mat_plasma') icon = '🔋';
                else icon = '⚙️';
            }
           else if(it.t === 'card') { icon = '🃏'; ctx.fillStyle = it.cType.includes('plat') ? '#b200ff' : (it.cType.includes('gold') ? '#ffff00' : '#fff'); }
           else if(it.t === 'bp') { icon = '📜'; ctx.fillStyle = '#ff00ff'; }

            ctx.fillText(icon, it.x, it.y); 
            if(distSq < 900) { 
                if(it.t==='c') { let amount = it.val || 20; secureAddCoins(amount); AudioSys.sfxCoin(); addText("+" + amount, player.x, player.y-20, false, '#ffd700'); }
                else if(it.t==='x') { game.exp += 30; addText("EXP", player.x, player.y-20, false, '#0ff'); checkLvl(); } 
                else if(it.t==='h') { let heal = Math.floor(player.maxHp * 0.15); player.hp = Math.min(player.maxHp, player.hp + heal); AudioSys.sfxHeal(); addText("+" + heal, player.x, player.y-25, false, '#0f0'); } 
                else if(it.t==='s') { player.invuln = 300; addText("SHIELD!", player.x, player.y-25, true, '#0ff', true); AudioSys.playTone(800, 'sine', 0.5); }
                else if(it.t==='b') { enemies.forEach(en => { en.hp -= player.atk*20; spawnParticles(en.x, en.y, '#ffaa00', 10); }); for(let j=bullets.length-1; j>=0; j--) { if(bullets[j].isEnemy) { bPool.release(bullets[j]); bullets.splice(j,1); } } doShake(20); game.flash = 0.8; addText("NUKE!", player.x, player.y-25, true, '#ff0000', true); AudioSys.sfxExplode(); }
                else if(it.t==='mat') { 
    gData.inventory[it.mType]++; 
    addText("+1 Nguyên liệu", player.x, player.y-25, false, MAT_COLORS[it.mType]); 
}
else if(it.t==='card') { 
    gData.inventory[it.cType]++; 
    addText("THẺ NÂNG CẤP!", player.x, player.y-25, true, '#ffff00'); AudioSys.playTone(800, 'sine', 0.5); 
}
else if(it.t==='bp') { 
    gData.hiddenSkills[it.bpId].unlockedBlueprint = true; save();
    addText("BẢN THIẾT KẾ ẨN!", player.x, player.y-35, true, '#ff00ff', true); AudioSys.playTone(1000, 'sawtooth', 0.8);
}
                items.splice(i,1); 
            }        
        } ctx.textAlign = "left"; 
    }  
    
    function checkLvl() { 
    if(game.exp >= game.nextExp) { 
        state = 'PAUSED'; 
        game.exp -= game.nextExp; // Trừ đi EXP cần thiết để giữ lại EXP thừa
        game.nextExp = Math.floor(game.nextExp * 1.4); 
        game.lvl++; 
        
        game.activeEvent = null; // Tắt sự kiện của cấp cũ
        game.pendingEventRoll = true; // Sẵn sàng roll sự kiện cho cấp mới
        
        // Gộp trackQuest và spawnBoss vào chung điều kiện mỗi 5 level
        if(game.lvl % 5 === 0) {
            trackQuest('games', 1); 
            spawnBoss(); 
        }
        
        AudioSys.sfxLevel(); 
        showLvlUp(); 
    } 
}

    function showLvlUp() { const screen = document.getElementById('lvlScreen'), con = document.getElementById('skillContainer'); screen.classList.remove('hidden'); con.innerHTML = ''; const skills = [ {n:'TĂNG HỎA LỰC', d:'+20% Sát thương', f:()=>{player.atk*=1.2}}, {n:'SÚNG KÉP', d:'Tăng lượng đạn', f:()=>{player.mult++}}, {n:'SỬA CHỮA', d:'Hồi 50% Máu', f:()=>{player.hp = Math.min(player.maxHp, player.hp+(player.maxHp*0.5))}}, {n:'TĂNG TỐC', d:'Tốc độ x1.2', f:()=>{player.spd*=1.2}}, {n:'NẠP SIÊU NHANH', d:'Tốc độ bắn x1.6', f:()=>{ player.nextFr = Math.max(3, Math.floor(player.nextFr * 0.6)); }} ]; skills.sort(()=>Math.random()-0.5).slice(0,3).forEach(s => { let btn = document.createElement('button'); btn.className = 'btn-main'; btn.style = 'width:130px; height:150px; font-size:12px; border:2px solid var(--p); display:flex; flex-direction:column; justify-content:center; align-items:center; box-shadow: 0 0 15px rgba(0,255,255,0.2) inset;'; btn.innerHTML = `<b style="font-size:16px;color:var(--y);margin-bottom:15px;text-align:center;">${s.n}</b><span style="color:#aaa;text-align:center;">${s.d}</span>`; btn.onclick = () => { s.f(); screen.classList.add('hidden'); state = 'PLAYING'; loop(); }; con.appendChild(btn); }); }  
    
    function tryUlt() { 
        if(game.ult >= 100) { 
            game.ult = 0; game.flash = 1.0; doShake(30); AudioSys.playTone(100, 'sawtooth', 2.0, 1.0, 10); 
            for (let i = enemies.length - 1; i >= 0; i--) {
                let e = enemies[i];
                if (e.type === 'boss') {
                    let ultDmg = player.atk * 10; e.hp -= ultDmg; addText("ULTIMATE TẬP KÍCH!", e.x, e.y - 40, true, '#ff00ff', true); addText("-" + Math.floor(ultDmg), e.x, e.y, true, '#ffaa00'); spawnParticles(e.x, e.y, e.color, 60, 2.5);
                    if (e.hp <= 0.2) { trackQuest('boss', 1); game.boss = false; uiCache.bossHpBar.parentElement.parentElement.style.display = 'none'; game.score += 5000; game.exp += 50; let coinMultiplier = isHardcoreMode ? 1.5 : 1; let rewardAmount = Math.floor(500 * coinMultiplier); secureAddCoins(rewardAmount); addText("BOSS BONUS +" + rewardAmount, e.x, e.y - 40, true, '#ffd700', true); if (e.name === "Neural Overlord") gData.hasWon = true; save(); AudioSys.sfxExplode(); doShake(20); ePool.release(e); enemies.splice(i, 1); }                    
                                } else {
                    trackQuest('kills', 1); // Quái thường chết bằng Ulti
                    spawnParticles(e.x, e.y, e.color, 40, 2); items.push({x: e.x, y: e.y, t: 'c'}); game.score += 50; ePool.release(e); enemies.splice(i, 1);
                }
            }
        } 
    } 

    function gameOver() { 
        state = 'OVER'; AudioSys.stopBGM(); AudioSys.sfxExplode(); document.getElementById('uiLayer').classList.add('hidden'); document.getElementById('overScreen').classList.remove('hidden'); 
        let modeName = "BÌNH THƯỜNG"; let statsHtml = `CẤP ĐỘ ĐẠT ĐƯỢC: ${game.lvl}<br>ĐIỂM CHUẨN: ${game.score}`;
        if(isEndlessMode) { let totalSecs = Math.floor(game.surviveFrames / 60); if(totalSecs > (gData.maxTime || 0)) gData.maxTime = totalSecs; modeName = "VÔ TẬN"; statsHtml = `THỜI GIAN SỐNG SÓT: ${totalSecs} GIÂY<br>TIÊU DIỆT: ${Math.floor(game.score/50)} KẺ ĐỊCH`; } else if(isHardcoreMode) { if(game.lvl > (gData.maxLvl_hc || 0)) gData.maxLvl_hc = game.lvl; if(game.score > (gData.maxScore_hc || 0)) gData.maxScore_hc = game.score; modeName = "HARDCORE"; } else { if(game.lvl > (gData.maxLvl || 0)) gData.maxLvl = game.lvl; if(game.score > (gData.maxScore || 0)) gData.maxScore = game.score; }
        document.getElementById('finalStats').innerHTML = `${statsHtml}<br><span style="color:${isEndlessMode?'#b200ff':(isHardcoreMode?'var(--r)':'var(--p)')}; font-size:12px;">CHẾ ĐỘ: ${modeName}</span><br><br><div style="border-top: 1px solid rgba(255,215,0,0.3); margin-top: 10px; padding-top: 10px;"><div style="color:#aaa; font-size: 14px;">TÀI SẢN HIỆN TẠI</div><div style="color:var(--gold); font-size: 32px; text-shadow: 0 0 15px var(--gold);">${gData.coins.toLocaleString()} 💰</div><div style="color:#0f0; font-size: 11px; margin-top: 5px;">[ ĐÃ ĐỒNG BỘ CLOUD ]</div></div>`; 
        save(); 
    }  
    
    function updateHUD() { 
        uiCache.hpBar.style.width = Math.max(0, player.hp/player.maxHp*100) + '%'; uiCache.xpBar.style.width = (game.exp/game.nextExp*100) + '%'; uiCache.hudScore.innerText = game.score; uiCache.hudLvl.innerText = game.lvl; uiCache.hudCoin.innerText = gData.coins; 
        if(game.boss) { let b = enemies.find(e => e.type === 'boss'); if(b) uiCache.bossHpBar.style.width = Math.max(0, (b.hp/b.maxHp*100)) + '%'; } 
        uiCache.ultBtn.style.background = `conic-gradient(var(--p) ${game.ult}%, rgba(0,0,0,0.8) 0)`; uiCache.ultPerc.innerText = Math.floor(game.ult)+'%'; if(game.ult >= 100) uiCache.ultBtn.classList.add('ready'); else uiCache.ultBtn.classList.remove('ready'); 
        if (isEndlessMode) { let totalSecs = Math.floor(game.surviveFrames / 60); let m = Math.floor(totalSecs / 60).toString().padStart(2, '0'); let s = (totalSecs % 60).toString().padStart(2, '0'); document.getElementById('hudTimer').innerText = m + ":" + s; }
    }  
      
    function openLeaderboard() { document.getElementById('menuScreen').classList.add('hidden'); document.getElementById('lbScreen').classList.remove('hidden'); if (gData.hasWon) document.getElementById('lbTabEndless').style.display = 'block'; window.AuthSys.showLB('maxLvl', document.querySelector('.lb-tab')); }
    function closeLeaderboard() { document.getElementById('lbScreen').classList.add('hidden'); document.getElementById('menuScreen').classList.remove('hidden'); }
    window.switchEqTab = function(tab) {
        ['w', 'h', 'd'].forEach(t => {
            document.getElementById('tabEq' + t.toUpperCase()).classList.remove('active');
            document.getElementById('wrapEq' + t.toUpperCase()).style.display = 'none';
        });
        document.getElementById('tabEq' + tab.toUpperCase()).classList.add('active');
        document.getElementById('wrapEq' + tab.toUpperCase()).style.display = 'flex';
    };

    function openEquip() { 
    if(!gData.equip.d) gData.equip.d = ''; 
    document.getElementById('menuScreen').classList.add('hidden'); 
    document.getElementById('equipScreen').classList.remove('hidden'); 
    document.getElementById('eqCoin').innerText = gData.coins; 
        
    renderEquipGrid('weaponGrid', EQUIP_DB.weapons, 'w'); 
    renderEquipGrid('hullGrid', EQUIP_DB.hulls, 'h'); 
    renderEquipGrid('droneGrid', EQUIP_DB.drones, 'd'); 
}  

     // --- LOGIC GACHA ---
let gachaInterval = null;

function openGacha() {
    initQuestData();
    document.getElementById('menuScreen').classList.add('hidden');
    document.getElementById('gachaScreen').classList.remove('hidden');
    document.getElementById('gachaResult').innerHTML = "Hãy dùng Phiếu để quét trạm không gian nhận Vũ khí, Vỏ Tàu hoặc Vàng!";
    updateGachaUI();
    
    // Timer đếm ngược 24h
    gachaInterval = setInterval(updateGachaUI, 1000);
}

function closeGacha() {
    clearInterval(gachaInterval);
    document.getElementById('gachaScreen').classList.add('hidden');
    document.getElementById('menuScreen').classList.remove('hidden');
}

function updateGachaUI() {
    if(!gData.quests) return;
    document.getElementById('gachaTicketCount').innerText = gData.tickets;
    
    let now = getSecureTime(); // ĐÃ ĐỔI
    let timeDiff = now - (gData.lastFreeSpin || 0);
    let ms24h = 86400000;
    // ... giữ nguyên phần tính h, m, s bên dưới ...
    
    let btnFree = document.getElementById('btnFreeSpin');
    let badge = document.getElementById('gachaTimerBadge');
    
    if (timeDiff >= ms24h || gData.lastFreeSpin === 0) {
        btnFree.disabled = false;
        btnFree.innerText = "QUAY MIỄN PHÍ";
        btnFree.style.filter = "none";
        badge.innerText = "SẴN SÀNG";
        badge.style.color = "#0f0";
        badge.style.borderColor = "#0f0";
    } else {
        btnFree.disabled = true;
        btnFree.style.filter = "grayscale(1)";
        let remain = ms24h - timeDiff;
        let h = Math.floor(remain / 3600000).toString().padStart(2, '0');
        let m = Math.floor((remain % 3600000) / 60000).toString().padStart(2, '0');
        let s = Math.floor((remain % 60000) / 1000).toString().padStart(2, '0');
        btnFree.innerText = `CHỜ HỒI NĂNG LƯỢNG (${h}:${m}:${s})`;
        badge.innerText = `${h}:${m}`;
        badge.style.color = "var(--p)";
        badge.style.borderColor = "var(--p)";
    }
}

function spinGacha(isFree) {
    let now = getSecureTime(); // Lấy giờ chuẩn để kiểm tra

    if (isFree) {
        if (now - (gData.lastFreeSpin || 0) < 86400000 && gData.lastFreeSpin !== 0) return;
        gData.lastFreeSpin = now; // Lưu giờ chuẩn vào data
    } else {
        if (gData.tickets <= 0) return alert("Bạn không đủ Phiếu Gacha!");
        gData.tickets--;
    }
    // ... giữ nguyên thuật toán quay số bên dưới ...
    
    // Tỷ lệ Gacha: 60% Vàng, 30% Đồ thường (Tier 2-4), 10% Đồ xịn (Tier 5-7)
    let roll = Math.random() * 100;
    let resHtml = "";
    
    if (roll < 60) {
        let amt = Math.floor(Math.random() * 9000) + 1000;
        secureAddCoins(amt);
        resHtml = `<span style="color:var(--gold); font-size:20px;">+${amt.toLocaleString()} 💰 VÀNG</span>`;
        AudioSys.sfxCoin();
    } else {
        let isRare = roll >= 90;
        let minTier = isRare ? 5 : 2;
        let maxTier = isRare ? 7 : 4;
        let prefix = Math.random() > 0.5 ? 'w' : 'h';
        let itemIndex = Math.floor(Math.random() * (maxTier - minTier + 1)) + minTier;
        let itemId = prefix + itemIndex;
        let item = EQUIP_DB[prefix === 'w' ? 'weapons' : 'hulls'][itemId];
        
        if (gData.owned.includes(itemId)) {
            let comp = Math.floor(item.cost * 0.3) || 500;
            secureAddCoins(comp);
            resHtml = `<span style="color:#aaa;">Đã có [${item.n}]</span><br><span style="color:var(--gold)">ĐỀN BÙ: +${comp} 💰</span>`;
            AudioSys.sfxCoin();
        } else {
            gData.owned.push(itemId);
            resHtml = `<span style="color:${isRare ? '#f0f' : '#0ff'}; font-size:22px;">🎉 NHẬN ĐƯỢC: ${item.n} 🎉</span>`;
            AudioSys.sfxLevel();
        }
    }
    
    document.getElementById('gachaResult').innerHTML = resHtml;
    updateGachaUI();
    save();
}
// --- HỆ THỐNG NHIỆM VỤ RANDOM (MỚI) ---
const QUEST_TEMPLATES = {
    daily: [
        // --- NHIỆM VỤ CHIẾN ĐẤU (Type: games, kills, boss) ---
        { desc: 'Tham chiến {amt} trận', type: 'games', amts: [3, 5, 10], rewType: 'gold', rewVals: [500, 1000, 2000] },
        { desc: 'Tiêu diệt {amt} kẻ địch', type: 'kills', amts: [50, 150, 300], rewType: 'gold', rewVals: [800, 2000, 4000] },
        { desc: 'Hạ gục {amt} Boss', type: 'boss', amts: [1, 2, 5], rewType: 'equip', min: 2, max: 4 },
        { desc: 'Cày {amt} ván game liên tục', type: 'games', amts: [4, 8], rewType: 'ticket', rewVals: [1, 2] },
        { desc: 'Quét sạch {amt} phi thuyền địch', type: 'kills', amts: [100, 250], rewType: 'ticket', rewVals: [1, 2] },

        // --- NHIỆM VỤ TÀI CHÍNH (Type: gold) ---
        { desc: 'Kiếm {amt} Vàng từ trận đấu', type: 'gold', amts: [2000, 5000, 10000], rewType: 'ticket', rewVals: [1, 2, 3] },
        { desc: 'Tích lũy {amt} Vàng', type: 'gold', amts: [3000, 7000], rewType: 'gold', rewVals: [1000, 2500] },
        
        // --- NHIỆM VỤ THỬ THÁCH MỚI (Nếu code bạn hỗ trợ các type này) ---
        { desc: 'Đạt mốc {amt} điểm trong một trận', type: 'score', amts: [10000, 20000], rewType: 'gold', rewVals: [1500, 3000] },
        { desc: 'Sống sót qua {amt} đợt quái', type: 'waves', amts: [10, 20], rewType: 'equip', min: 3, max: 5 }
    ],
    weekly: [
        // --- NHIỆM VỤ CÀY CUỐC (Số lượng lớn) ---
        { desc: 'Tổng tham chiến {amt} trận', type: 'games', amts: [25, 50, 100], rewType: 'gold', rewVals: [12000, 30000, 70000] },
        { desc: 'Tiêu diệt {amt} kẻ địch trong tuần', type: 'kills', amts: [1000, 2500, 5000], rewType: 'ticket', rewVals: [5, 10, 20] },
        { desc: 'Chinh phục {amt} Boss', type: 'boss', amts: [10, 25, 50], rewType: 'equip', min: 5, max: 10 },
        
        // --- NHIỆM VỤ TÀI SẢN ---
        { desc: 'Thu thập tổng {amt} Vàng', type: 'gold', amts: [50000, 150000, 300000], rewType: 'equip', min: 6, max: 12 },
        { desc: 'Kiếm được {amt} Vàng từ phần thưởng', type: 'gold', amts: [80000, 200000], rewType: 'ticket', rewVals: [6, 15] },
        
        // --- NHIỆM VỤ CAO CẤP ---
        { desc: 'Phá hủy {amt} tàu tinh nhuệ', type: 'kills', amts: [500, 1200], rewType: 'equip', min: 8, max: 15 },
        { desc: 'Đạt tổng điểm tuần {amt}', type: 'score', amts: [100000, 500000], rewType: 'gold', rewVals: [20000, 100000] }
    ]
};

function generateQuests(type, count) {
    let templates = [...QUEST_TEMPLATES[type]].sort(() => 0.5 - Math.random());
    let selected = templates.slice(0, count);
    
    return selected.map((t, index) => {
        let diffIndex = Math.floor(Math.random() * t.amts.length); 
        let amt = t.amts[diffIndex];
        
        let rew = {};
        if (t.rewType === 'equip') { rew = { t: 'equip', min: t.min, max: t.max }; } 
        else { rew = { t: t.rewType, val: t.rewVals[diffIndex] }; }

        return {
            id: `${type[0]}${Date.now()}${index}`,
            desc: t.desc.replace('{amt}', amt),
            req: { type: t.type, amt: amt },
            rew: rew
        };
    });
}

function getWeekNumber(d) {
    d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay()||7));
    var yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
    return Math.ceil((((d - yearStart) / 86400000) + 1)/7);
}
 
 function initQuestData() {
    if (typeof gData.tickets === 'undefined') gData.tickets = 0;
    if (typeof gData.lastFreeSpin === 'undefined') gData.lastFreeSpin = 0;
    
    let secureNow = getSecureDate();
    let today = secureNow.getFullYear() + "-" + (secureNow.getMonth() + 1) + "-" + secureNow.getDate();
    
    // Khởi tạo 2 biến lưu stats riêng biệt cho Ngày và Tuần
    if (!gData.quests) {
        gData.quests = { dailyStats: { kills:0, boss:0, games:0, gold:0 }, weeklyStats: { kills:0, boss:0, games:0, gold:0 }, dClaim: [], wClaim: [], lastD: today, lastW: getWeekNumber(secureNow), activeDaily: [], activeWeekly: [] };
    }
    
    // Tương thích ngược: Nếu save cũ chỉ có 'stats', tự động chuyển đổi
    if (!gData.quests.dailyStats) gData.quests.dailyStats = gData.quests.stats || { kills:0, boss:0, games:0, gold:0 };
    if (!gData.quests.weeklyStats) gData.quests.weeklyStats = { kills:0, boss:0, games:0, gold:0 };
    
    if (!gData.quests.activeDaily) gData.quests.activeDaily = [];
    if (!gData.quests.activeWeekly) gData.quests.activeWeekly = [];
}

// Hàm cộng điểm theo Ngày
function trackDaily(type, amount) {
    if(!gData.quests) initQuestData();
    if(gData.quests.dailyStats[type] !== undefined) gData.quests.dailyStats[type] += amount;
}

// Hàm cộng điểm theo Tuần
function trackWeek(type, amount) {
    if(!gData.quests) initQuestData();
    if(gData.quests.weeklyStats[type] !== undefined) gData.quests.weeklyStats[type] += amount;
}

// Giữ lại tên hàm trackQuest cũ làm "trạm trung chuyển", tự động gọi cả 2 hàm trên
// (Cách này giúp bạn KHÔNG PHẢI SỬA code ở các chỗ rớt vàng, bắn boss...)
function trackQuest(type, amount) {
    trackDaily(type, amount);
    trackWeek(type, amount);
}

let currentQuestTab = 'daily';

function checkQuestReset() {
    initQuestData();
    let secureNow = getSecureDate();
    let today = secureNow.getFullYear() + "-" + (secureNow.getMonth() + 1) + "-" + secureNow.getDate();
    let thisWeek = getWeekNumber(secureNow);
    let isChanged = false;

    if (gData.quests.activeDaily.length === 0) { 
        gData.quests.activeDaily = generateQuests('daily', 4); 
        isChanged = true; 
    }
    if (gData.quests.activeWeekly.length === 0) { 
        gData.quests.activeWeekly = generateQuests('weekly', 4); 
        isChanged = true; 
    }

    // Reset Ngày (Chỉ làm sạch dailyStats)
    if (gData.quests.lastD !== today) {
        gData.quests.dClaim = []; 
        gData.quests.lastD = today;
        gData.quests.dailyStats = { games: 0, kills: 0, boss: 0, gold: 0 }; 
        gData.quests.activeDaily = generateQuests('daily', 4);
        isChanged = true;
    }
    
    // Reset Tuần (Chỉ làm sạch weeklyStats)
    if (gData.quests.lastW !== thisWeek) {
        gData.quests.wClaim = []; 
        gData.quests.lastW = thisWeek;
        gData.quests.weeklyStats = { games: 0, kills: 0, boss: 0, gold: 0 };
        gData.quests.activeWeekly = generateQuests('weekly', 4);
        isChanged = true;
    }
    if(isChanged) save();
}

function openQuests() {
    checkQuestReset();
    document.getElementById('menuScreen').classList.add('hidden');
    document.getElementById('questScreen').classList.remove('hidden');
    renderQuests();
}

function closeQuests() {
    document.getElementById('questScreen').classList.add('hidden');
    document.getElementById('menuScreen').classList.remove('hidden');
}

function switchQuestTab(tab) {
    currentQuestTab = tab;
    document.getElementById('tabDaily').classList.toggle('active', tab === 'daily');
    document.getElementById('tabWeekly').classList.toggle('active', tab === 'weekly');
    renderQuests();
}

function renderQuests() {
    let listEl = document.getElementById('questList');
    listEl.innerHTML = "";
    
    let activeQuests = currentQuestTab === 'daily' ? gData.quests.activeDaily : gData.quests.activeWeekly;
    let claimedArr = currentQuestTab === 'daily' ? gData.quests.dClaim : gData.quests.wClaim;
    
    // Đọc đúng nguồn dữ liệu tiến độ (Ngày hoặc Tuần)
    let stats = currentQuestTab === 'daily' ? gData.quests.dailyStats : gData.quests.weeklyStats;
    
    activeQuests.forEach(q => {
        let isClaimed = claimedArr.includes(q.id);
        let currentProg = stats[q.req.type] || 0;
        let isDone = currentProg >= q.req.amt;
        
        let rewText = "";
        if (q.rew.t === 'gold') rewText = `${q.rew.val.toLocaleString()} 💰`;
        else if (q.rew.t === 'ticket') rewText = `${q.rew.val} 🎫 Phiếu`;
        else if (q.rew.t === 'equip') rewText = `Trang bị (Tier ${q.rew.min}-${q.rew.max})`;
        
        let bg = isClaimed ? "rgba(0,255,0,0.1)" : "rgba(255,255,255,0.05)";
        let border = isClaimed ? "#0f0" : (isDone ? "var(--gold)" : "#555");
        
        let html = `
            <div style="background:${bg}; border:1px solid ${border}; padding:10px; border-radius:5px; display:flex; justify-content:space-between; align-items:center;">
                <div>
                    <div style="font-weight:bold; color:${isDone && !isClaimed ? 'var(--gold)' : '#fff'}; font-size:14px;">${q.desc}</div>
                    <div style="font-size:11px; color:#aaa; margin-top:5px;">Tiến độ: ${Math.min(currentProg, q.req.amt)} / ${q.req.amt}</div>
                    <div style="font-size:12px; color:var(--p); margin-top:2px;">Quà: ${rewText}</div>
                </div>
                <div>
                    ${isClaimed ? 
                        `<button class="btn-main btn-small" disabled style="filter:grayscale(1);">ĐÃ NHẬN</button>` : 
                        `<button class="btn-main btn-small" ${!isDone ? 'disabled style="filter:grayscale(1);"' : `onclick="claimQuest('${q.id}', '${currentQuestTab}')"`} style="background:var(--gold); color:#000;">NHẬN QUÀ</button>`
                    }
                </div>
            </div>
        `;
        listEl.innerHTML += html;
    });
}

function claimQuest(qId, tab) {
    let activeQuests = tab === 'daily' ? gData.quests.activeDaily : gData.quests.activeWeekly;
    let q = activeQuests.find(x => x.id === qId);
    if (!q) return;
    
    if (q.rew.t === 'gold') {
        secureAddCoins(q.rew.val);
        AudioSys.sfxCoin();
    } else if (q.rew.t === 'ticket') {
        gData.tickets += q.rew.val;
        AudioSys.sfxLevel();
    } else if (q.rew.t === 'equip') {
        let prefix = Math.random() > 0.5 ? 'w' : 'h';
        let itemIndex = Math.floor(Math.random() * (q.rew.max - q.rew.min + 1)) + q.rew.min;
        let itemId = prefix + itemIndex;
        
        if (!gData.owned.includes(itemId)) {
            gData.owned.push(itemId);
            alert(`Chúc mừng! Bạn nhận được Trang bị: ${EQUIP_DB[prefix === 'w' ? 'weapons' : 'hulls'][itemId].n}`);
        } else {
            let comp = 1000 * q.rew.min;
            secureAddCoins(comp);
            alert(`Bạn đã có trang bị này, được đền bù ${comp} Vàng!`);
        }
        AudioSys.sfxLevel();
    }
    
    if (tab === 'daily') gData.quests.dClaim.push(qId);
    else gData.quests.wClaim.push(qId);
    
    save();
    renderQuests(); 
}
// --- KẾT THÚC HỆ THỐNG NHIỆM VỤ ---
    function renderEquipGrid(id, db, type) { 
        const el = document.getElementById(id); el.innerHTML = ''; 
        for(let k in db) { 
            let item = db[k], owned = gData.owned.includes(k), equipped = gData.equip[type] === k; 
            let div = document.createElement('div'); 
            div.className = `equip-card ${equipped?'active':''} ${owned?'owned':''}`; 
            
            let pressTimer = null;
            let isScrolling = false;
            let startY = 0;

            div.onmousedown = div.ontouchstart = (e) => { 
                isScrolling = false;
                startY = e.touches ? e.touches[0].clientY : e.clientY;
                
                pressTimer = window.setTimeout(() => { 
                    if (!isScrolling) {
                        openCardPopup(k, type, item.n); 
                    }
                    pressTimer = null; 
                }, 500); 
            };
            
            // Thêm sự kiện bắt chuyển động để nhận diện lướt
            div.onmousemove = div.ontouchmove = (e) => {
                let currentY = e.touches ? e.touches[0].clientY : e.clientY;
                // Nếu ngón tay di chuyển hơn 10px, đánh dấu là đang lướt
                if (Math.abs(currentY - startY) > 10) {
                    isScrolling = true;
                    if (pressTimer) {
                        clearTimeout(pressTimer);
                        pressTimer = null;
                    }
                }
            };

            div.onmouseup = div.ontouchend = (e) => { 
                // Chỉ kích hoạt thao tác mua/mặc đồ nếu KHÔNG phải đang lướt
                if(pressTimer && !isScrolling) { 
                    clearTimeout(pressTimer); 
                    pressTimer = null;
                    handleEquipClick(k, type, db[k].cost); 
                } 
            };
            
            div.onmouseleave = div.ontouchcancel = () => { 
                if(pressTimer) {
                    clearTimeout(pressTimer);
                    pressTimer = null;
                }
            };
            
            div.innerHTML = `<span class="equip-icon" style="color:${item.color||'#fff'}">${type=='w' ? '⚔️' : (type=='h' ? '🛡️' : '🛸')}</span><span class="equip-name">${item.n}</span><span class="equip-stat">${item.d}</span>${equipped ? '<b style="color:var(--p);font-size:11px">ĐANG DÙNG</b>' : (owned ? '<span style="color:#ff0;font-size:10px">SỞ HỮU</span>' : `<span class="cost-badge">${item.cost} 💰</span>`)}`; 
            el.appendChild(div); 
        } 
    }
    function handleEquipClick(id, type, cost) { if(gData.owned.includes(id)) { gData.equip[type] = id; save(); openEquip(); AudioSys.playTone(600, 'sine', 0.1); } else { if(secureDeductCoins(cost)) { gData.owned.push(id); gData.equip[type] = id; save(); openEquip(); AudioSys.sfxCoin(); } else { alert("Không đủ vàng hoặc lỗi bảo mật!"); } } }  
    function openShop() { document.getElementById('menuScreen').classList.add('hidden'); document.getElementById('shopScreen').classList.remove('hidden'); document.getElementById('shopCoin').innerText = gData.coins; const g = document.getElementById('shopGrid'); g.innerHTML = ''; for(let k in UPGRADES) { let u = UPGRADES[k], lv = gData.stats[k] || 0, cost = Math.floor(u.cost * Math.pow(1.5, lv)), isMax = lv >= u.max; g.innerHTML += `<div class="equip-card"><span class="equip-name">${u.n} <span style="color:var(--y)">(Lv ${lv})</span></span><span class="equip-stat">${u.desc}</span><button class="btn-main" style="padding:8px; font-size:11px; width:100%; margin:0;" onclick="buyUpgrade('${k}', ${cost}, ${u.max})">${isMax ? 'MAX' : cost + ' 💰'}</button></div>`; } }  
    function buyUpgrade(key, cost, max) { if(!verifyIntegrity()) return; if((gData.stats[key]||0) >= max) return; if(secureDeductCoins(cost)) { gData.stats[key] = (gData.stats[key]||0) + 1; save(); openShop(); AudioSys.sfxCoin(); } else { alert("Cày thêm vàng để nâng!"); } }  
    function closeEquip() { document.getElementById('equipScreen').classList.add('hidden'); document.getElementById('menuScreen').classList.remove('hidden'); }  
    function closeShop() { document.getElementById('shopScreen').classList.add('hidden'); document.getElementById('menuScreen').classList.remove('hidden'); }  
    function toggleAudio() { AudioSys.toggle(); }  
    
    cvs.addEventListener('touchstart', e=>{tX=e.touches[0].clientX; tY=e.touches[0].clientY}); cvs.addEventListener('touchmove', e=>{e.preventDefault(); tX=e.touches[0].clientX; tY=e.touches[0].clientY}, {passive:false}); cvs.addEventListener('mousemove', e=>{tX=e.clientX; tY=e.clientY});  
    // Hàm cập nhật Badge Gacha ngoài Menu
    window.updateMenuGachaBadge = function() {
        let badge = document.getElementById('gachaTimerBadge');
        if (!badge || typeof gData === 'undefined') return;
        
        // Khởi tạo nếu biến chưa tồn tại
        if (typeof gData.lastFreeSpin === 'undefined') gData.lastFreeSpin = 0;
        
        // Dùng thời gian an toàn từ server
        let now = typeof getSecureTime === 'function' ? getSecureTime() : Date.now();
        let timeDiff = now - gData.lastFreeSpin;
        
        if (timeDiff >= 86400000 || gData.lastFreeSpin === 0) {
            badge.innerText = "SẴN SÀNG"; 
            badge.style.color = "#0f0"; 
            badge.style.borderColor = "#0f0";
        } else {
            let remain = 86400000 - timeDiff;
            let h = Math.floor(remain / 3600000).toString().padStart(2, '0');
            let m = Math.floor((remain % 3600000) / 60000).toString().padStart(2, '0');
            // Cập nhật cả giờ và phút hiển thị ngoài menu
            badge.innerText = `${h}:${m}`; 
            badge.style.color = "var(--p)"; 
            badge.style.borderColor = "var(--p)";
        }
    };

    // Cho chạy liên tục mỗi 1 giây (1000ms) để đồng bộ ngay khi load game
    setInterval(window.updateMenuGachaBadge, 1000);

    window.startGame = startGame; window.togglePause = togglePause; window.buyUpgrade = buyUpgrade; 
// Thêm 2 cầu nối để xử lý Intro an toàn
window.completeIntro = function() { gData.hasSeenIntro = true; save(); };
window.isIntroSeen = function() { return gData.hasSeenIntro === true; };
    window.openCrafting = function() {
    document.getElementById('menuScreen').classList.add('hidden');
    document.getElementById('craftScreen').classList.remove('hidden');
    updateCraftingUI();
};
window.closeCrafting = function() {
    document.getElementById('craftScreen').classList.add('hidden');
    document.getElementById('menuScreen').classList.remove('hidden');
};

function updateCraftingUI() {
    document.getElementById('txtScrap').innerText = gData.inventory.mat_scrap;
    document.getElementById('txtPlasma').innerText = gData.inventory.mat_plasma;
    document.getElementById('txtCrystal').innerText = gData.inventory.mat_crystal;
    document.getElementById('txtVoid').innerText = gData.inventory.mat_void;
    document.getElementById('txtCB').innerText = gData.inventory.card_bronze;
    document.getElementById('txtCS').innerText = gData.inventory.card_silver;
    document.getElementById('txtCG').innerText = gData.inventory.card_gold;
    document.getElementById('txtCP').innerText = gData.inventory.card_plat;

    let skillHTML = "";
    const skillsDef = [
        { id: 'aura', n: 'Trường Lực Hút', d: 'Hút cực rộng, làm chậm đạn địch', req: [0, 100, 10, 0] },
        { id: 'nano', n: 'Bầy Nanobot', d: 'Hồi máu khi giết địch', req: [0, 200, 30, 0] },
        { id: 'overclock', n: 'Giao Thức Quá Tải', d: 'X2 Sát thương & Tốc đánh', req: [0, 0, 50, 10] },
        { id: 'aegis', n: 'Khiên Lượng Tử', d: 'Chặn sát thương chí mạng', req: [0, 0, 100, 50] }
    ];

    skillsDef.forEach(s => {
        let sk = gData.hiddenSkills[s.id];
        // Đồng bộ dữ liệu cũ nếu thiếu thuộc tính crafted
        if(typeof sk.crafted === 'undefined') sk.crafted = sk.activated;

        if(!sk.unlockedBlueprint) {
            skillHTML += `<div style="padding:10px; border:1px dashed #555; text-align:center; color:#555; border-radius:5px;">Kỹ năng ??? (Cần Bản thiết kế từ Boss)</div>`;
        } else if (sk.crafted) {
            if (sk.activated) {
                // UI Đang Trang Bị (Có nút tháo ra)
                skillHTML += `<div style="padding:10px; border:1px solid #0f0; background:rgba(0,255,0,0.1); display:flex; justify-content:space-between; align-items:center; border-radius:5px;">
                    <div style="text-align:left; color:#0f0;"><b>${s.n}</b><br><span style="font-size:10px; color:#aaa;">${s.d}</span></div>
                    <button class="btn-main btn-small" onclick="toggleSkill('${s.id}')" style="margin:0; background:var(--r); color:#fff; border:none; box-shadow:0 0 10px var(--r);">THÁO RA</button>
                </div>`;
            } else {
                // UI Đã mua nhưng Chưa Trang Bị (Có nút lắp vào)
                skillHTML += `<div style="padding:10px; border:1px solid #555; background:rgba(255,255,255,0.05); display:flex; justify-content:space-between; align-items:center; border-radius:5px;">
                    <div style="text-align:left; color:#aaa;"><b>${s.n}</b><br><span style="font-size:10px; color:#888;">${s.d}</span></div>
                    <button class="btn-main btn-small" onclick="toggleSkill('${s.id}')" style="margin:0; background:#333; color:var(--p); border:1px solid var(--p);">TRANG BỊ</button>
                </div>`;
            }
        } else {
            // Tự động lọc ra chỉ các nguyên liệu có yêu cầu > 0
            let costArr = [];
            if(s.req[1] > 0) costArr.push(s.req[1] + " Plasma");
            if(s.req[2] > 0) costArr.push(s.req[2] + " Crystal");
            if(s.req[3] > 0) costArr.push(s.req[3] + " Void");
            let costString = "Cần: " + costArr.join(", ");

            // Chuyển thành div vuông vắn (border-radius:5px) giống các ô khác
            skillHTML += `<div style="padding:10px; border:1px solid var(--y); background:rgba(255,255,0,0.05); display:flex; justify-content:space-between; align-items:center; border-radius:5px;">
                <div style="text-align:left;">
                    <b style="color:var(--y); font-size:14px;">${s.n}</b><br>
                    <span style="font-size:10px; color:#aaa;">${s.d}</span><br>
                    <span style="font-size:10px; color:#0ff; margin-top:4px; display:inline-block;">${costString}</span>
                </div>
                <button class="btn-main btn-small" onclick="unlockSkill('${s.id}', ${s.req[0]}, ${s.req[1]}, ${s.req[2]}, ${s.req[3]})" style="margin:0; background:#333; color:var(--y); border:1px solid var(--y); box-shadow:0 0 10px rgba(255,255,0,0.2);">MỞ KHÓA</button>
            </div>`;
        }
    });
    document.getElementById('hiddenSkillsGrid').innerHTML = skillHTML;    
}

window.craftCard = function(cType, sc, pl, cr, vo) {
    // Thêm check: Kiểm tra xem có phôi thẻ không
    if((gData.inventory[cType] || 0) < 1) {
        return alert("Bạn không có đủ Phôi Thẻ (" + cType.replace('card_', '') + ") trong kho!");
    }

    if(gData.inventory.mat_scrap >= sc && gData.inventory.mat_plasma >= pl && gData.inventory.mat_crystal >= cr && gData.inventory.mat_void >= vo) {
        // Trừ nguyên liệu
        gData.inventory.mat_scrap -= sc; gData.inventory.mat_plasma -= pl; gData.inventory.mat_crystal -= cr; gData.inventory.mat_void -= vo;
        
        // TRỪ PHÔI THẺ
        gData.inventory[cType] -= 1;
        
        let type = cType.replace('card_', ''); // Chuyển 'card_bronze' thành 'bronze'
        if(!gData.craftedCards) gData.craftedCards = {};
        gData.craftedCards[type] = (gData.craftedCards[type] || 0) + 1;
        
        save();
        updateCraftingUI();
        alert("Đã ép thành công! Thẻ đã có trong kho Trang bị.");
    } else alert("Không đủ nguyên liệu!");
};

window.unlockSkill = function(id, sc, pl, cr, vo) {
    if(gData.inventory.mat_scrap >= sc && gData.inventory.mat_plasma >= pl && gData.inventory.mat_crystal >= cr && gData.inventory.mat_void >= vo) {
        gData.inventory.mat_scrap -= sc; gData.inventory.mat_plasma -= pl; gData.inventory.mat_crystal -= cr; gData.inventory.mat_void -= vo;
        gData.hiddenSkills[id].crafted = true;
        gData.hiddenSkills[id].activated = true; // Auto trang bị ngay sau khi chế tạo
        save(); updateCraftingUI(); alert("Đã khôi phục và trang bị công nghệ!");
    } else alert("Thiếu nguyên liệu cấu thành!");
};

window.toggleSkill = function(id) {
    gData.hiddenSkills[id].activated = !gData.hiddenSkills[id].activated;
    save();
    updateCraftingUI();
    if (typeof AudioSys !== 'undefined' && AudioSys.enabled) {
        AudioSys.playTone(gData.hiddenSkills[id].activated ? 800 : 400, 'sine', 0.1); 
    }
};

        // Gắn các hàm Gacha và Quest vào global window
    window.openGacha = openGacha; 
    window.closeGacha = closeGacha; 
    window.spinGacha = spinGacha;
    window.openQuests = openQuests; 
    window.closeQuests = closeQuests; 
    window.switchQuestTab = switchQuestTab; 
    window.claimQuest = claimQuest;
    window.openProfile = openProfile; window.closeProfile = closeProfile; window.toggleAvatarSelect = toggleAvatarSelect; window.setAvatar = setAvatar; window.openChangePass = openChangePass; window.closeChangePass = closeChangePass; window.executeChangePass = executeChangePass; window.openEquip = openEquip; window.closeEquip = closeEquip; window.openShop = openShop; window.closeShop = closeShop; window.openLeaderboard = openLeaderboard; window.closeLeaderboard = closeLeaderboard; window.toggleAudio = toggleAudio; window.showConfirmQuit = showConfirmQuit; window.executeQuit = executeQuit; window.tryUlt = tryUlt;
let currentPopupItemId = null;

// Khởi tạo data chứa Thẻ Đã Ép (Nếu chưa có)
if (!gData.craftedCards) gData.craftedCards = { bronze: 0, silver: 0, gold: 0, plat: 0 };

window.openCardPopup = function(itemId, type, itemName) {
    if(!gData.owned.includes(itemId)) return alert("Bạn phải mua/sở hữu trang bị này trước!");
    if(type === 'd') return alert("Drone không có tính năng lắp thẻ!");
    
    currentPopupItemId = itemId;
    document.getElementById('cpTitle').innerText = `KHE THẺ: ${itemName.toUpperCase()}`;
    document.getElementById('cardPopup').classList.remove('hidden');
    renderCardPopup();
};

window.closeCardPopup = function() {
    document.getElementById('cardPopup').classList.add('hidden');
    currentPopupItemId = null;
};

window.renderCardPopup = function() {
    if(!currentPopupItemId) return;
    if(!gData.itemCards) gData.itemCards = {};
    if(!gData.itemCards[currentPopupItemId]) gData.itemCards[currentPopupItemId] = [null, null];
    if(!gData.craftedCards) gData.craftedCards = { bronze: 0, silver: 0, gold: 0, plat: 0 };

    // 1. KHE CẮM (Chỉ hiện thẻ đang cắm)
    let slotsHtml = '';
    for(let i=0; i<2; i++) {
        let card = gData.itemCards[currentPopupItemId][i];
        if(card) {
            let color = card === 'plat' ? '#b200ff' : (card === 'gold' ? '#ffd700' : (card === 'silver' ? '#c0c0c0' : '#cd7f32'));
            slotsHtml += `<button class="btn-main btn-small" onclick="unequipCardFromItem(${i})" style="border-color:${color}; color:${color}; margin:0; flex:1;">[${card.toUpperCase()}]<br><span style="font-size:8px;color:#fff">Bấm để gỡ</span></button>`;
        } else {
            slotsHtml += `<button class="btn-sec btn-small" style="margin:0; border-style:dashed; color:#888; border-color:#555; flex:1; cursor:default;">+ Trống</button>`;
        }
    }
    document.getElementById('cpSlots').innerHTML = slotsHtml;

    // 2. KHO THẺ ĐÃ ÉP
    let craftedHtml = '';
    ['bronze', 'silver', 'gold', 'plat'].forEach(c => {
        let count = gData.craftedCards[c] || 0;
        let color = c === 'plat' ? '#b200ff' : (c === 'gold' ? '#ffd700' : (c === 'silver' ? '#c0c0c0' : '#cd7f32'));
        craftedHtml += `<button class="btn-main btn-small" onclick="equipCardToItem('${c}')" ${count===0?'disabled style="filter:grayscale(1); cursor:not-allowed;"':''} style="border-color:${color}; color:${color}; padding: 10px 5px; margin:0;">${c.toUpperCase()} (ĐÃ ÉP)<br><span style="font-size:10px; color:#fff">SẴN SÀNG: ${count}</span></button>`;
    });
    document.getElementById('cpCrafted').innerHTML = craftedHtml;
};

// Hàm bấm ÉP THẺ: Tốn phôi + Tốn vàng -> Sinh ra thẻ đã ép
window.craftRawCard = function(type, cost) {
    let invKey = 'card_' + type;
    if(gData.inventory[invKey] > 0) {
        if(secureDeductCoins(cost)) {
            gData.inventory[invKey]--;
            gData.craftedCards[type] = (gData.craftedCards[type] || 0) + 1;
            save(); 
            AudioSys.playTone(1000, 'sine', 0.2); // Âm thanh báo ép thành công
            renderCardPopup();
        } else {
            alert("Bạn không có đủ Vàng để ép phôi thẻ này!");
        }
    }
};

// Hàm bấm LẮP THẺ vào súng/giáp
window.equipCardToItem = function(cardType) {
    let slots = gData.itemCards[currentPopupItemId];
    let emptyIdx = slots.indexOf(null);
    if(emptyIdx === -1) return alert("Trang bị này đã cắm đầy khe! Hãy gỡ thẻ cũ ra trước.");
    
    if(gData.craftedCards[cardType] > 0) {
        gData.craftedCards[cardType]--;
        slots[emptyIdx] = cardType;
        save(); renderCardPopup();
        AudioSys.playTone(600, 'sine', 0.1);
    }
};

// Hàm bấm GỠ THẺ khỏi súng/giáp
window.unequipCardFromItem = function(slotIndex) {
    let card = gData.itemCards[currentPopupItemId][slotIndex];
    if(card) {
        // Trả lại đúng kho thẻ ĐÃ ÉP
        gData.craftedCards[card] = (gData.craftedCards[card] || 0) + 1;
        gData.itemCards[currentPopupItemId][slotIndex] = null;
        save(); renderCardPopup();
    }
};

    window.addEventListener('online', async () => { const userLabel = document.getElementById('menuUsername'); if (userLabel) userLabel.innerText = currentUsername.toUpperCase(); if (window.AuthSys) { window.AuthSys.msg("ĐÃ KHÔI PHỤC KẾT NỐI CLOUD!", "#0f0"); if (window.auth && window.auth.currentUser) { await window.AuthSys.saveSync(); } } });
    window.addEventListener('offline', () => { const userLabel = document.getElementById('menuUsername'); if (userLabel) userLabel.innerText = currentUsername.toUpperCase() + " (OFFLINE)"; if (window.AuthSys) { window.AuthSys.msg("BẠN ĐANG CHƠI CHẾ ĐỘ OFFLINE", "var(--r)"); } });
    
    function showNetworkBanner(text, type) { if (state === 'PLAYING' || state === 'PAUSED' || state === 'PAUSED_MANUAL') return; let banner = document.getElementById('network-status-alert'); if (!banner) { banner = document.createElement('div'); banner.id = 'network-status-alert'; document.body.appendChild(banner); } banner.innerText = text; banner.style.fontFamily = "'Orbitron', sans-serif"; banner.style.textTransform = "uppercase"; banner.style.fontSize = "12px"; if (type === 'online') { banner.className = 'online-style show'; banner.style.borderBottom = "2px solid var(--p)"; banner.style.boxShadow = "0 0 15px rgba(0, 255, 255, 0.4)"; } else { banner.className = 'offline-style show'; banner.style.borderBottom = "2px solid var(--r)"; banner.style.boxShadow = "0 0 15px rgba(255, 51, 51, 0.4)"; } setTimeout(() => { banner.classList.remove('show'); }, 3000); }
    window.addEventListener('online', () => { 
    showNetworkBanner(">> HỆ THỐNG: ĐÃ TRỰC TUYẾN (CLOUD ON)", "online"); 
    const userLabel = document.getElementById('menuUsername'); 
    if (userLabel) userLabel.innerText = currentUsername.toUpperCase(); 
    // Không ép tải lên (saveSync) ngay khi có mạng nữa, để onSnapshot tự kéo dữ liệu mới nhất về
});

    window.addEventListener('offline', () => { showNetworkBanner(">> CẢNH BÁO: CHẾ ĐỘ NGOẠI TUYẾN (OFFLINE)", "offline"); const userLabel = document.getElementById('menuUsername'); if (userLabel) userLabel.innerText = currentUsername.toUpperCase() + " (OFFLINE)"; });
    
    window.openModeScreen = function() { document.getElementById('menuScreen').classList.add('hidden'); document.getElementById('modeScreen').classList.remove('hidden'); if (gData.hasWon) { document.getElementById('btnModeEndless').style.display = 'block'; document.getElementById('lockedEndless').style.display = 'none'; } else { document.getElementById('btnModeEndless').style.display = 'none'; document.getElementById('lockedEndless').style.display = 'block'; } };
    window.startMode = function(mode) { isHardcoreMode = (mode === 1 || mode === true); isEndlessMode = (mode === 2); document.getElementById('modeScreen').classList.add('hidden'); startGame(); };
    window.closeModeScreen = function() { document.getElementById('modeScreen').classList.add('hidden'); document.getElementById('menuScreen').classList.remove('hidden'); document.getElementById('menuScreen').classList.remove('hidden'); if(typeof window.updateMenuGachaBadge === 'function') window.updateMenuGachaBadge(); };
    window.togglePassCheckbox = function(inputId, checkbox) {
    document.getElementById(inputId).type = checkbox.checked ? "text" : "password";
};

  })(); 