let isFirebaseLoaded = false; 
let isOfflineTriggered = false; 
let realTimeTracker = 0; 
let lastSystemTime = Date.now(); 
let isTimeValid = true;

setInterval(() => {
  const currentSystemTime = Date.now(); const elapsedSystemTime = (currentSystemTime - lastSystemTime) / 1000;
  if (Math.abs(elapsedSystemTime) > 10 || elapsedSystemTime < 0) { isTimeValid = false; alert("Phát hiện thay đổi thời gian hệ thống! Vui lòng chỉnh lại giờ chuẩn."); } 
  else { realTimeTracker += elapsedSystemTime; }
  lastSystemTime = currentSystemTime;
}, 2000);

window.secureClaimReward = async function() {
  try { const response = await fetch('https://worldtimeapi.org/api/timezone/Etc/UTC'); const data = await response.json(); const serverTime = new Date(data.utc_datetime).getTime(); processReward(serverTime); return; } catch (e) { }
  const savedSafeTime = localStorage.getItem('safe_time_stamp') || 0; const currentSystemTime = Date.now();
  if (currentSystemTime < savedSafeTime) { alert("Gian lận: Thời gian hiện tại nhỏ hơn thời gian đã chơi trước đó!"); } else if (!isTimeValid) { alert("Vui lòng không chỉnh sửa đồng hồ khi đang chơi."); } else { processReward(currentSystemTime); localStorage.setItem('safe_time_stamp', currentSystemTime); }
}

const triggerOffline = () => { if (!isOfflineTriggered) { isOfflineTriggered = true; window.dispatchEvent(new Event('offlineReady')); } };

const initFirebase = async () => {
  if (!navigator.onLine) throw new Error("Offline");
  const { initializeApp } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js");
  const { getFirestore, doc, setDoc, getDoc, collection, query, orderBy, limit, onSnapshot, deleteDoc } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js");
  const { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, updatePassword, EmailAuthProvider, reauthenticateWithCredential, deleteUser, onAuthStateChanged } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js");
  
  const firebaseConfig = { apiKey: atob("QUl6YVN5QjRhYkU3TVNNcGFjX3poZDJoMFZqb1hlXzZZWW56YW1R"), authDomain: atob("bmVvbmdhbGF4eS0zM2E1ZS5maXJlYmFzZWFwcC5jb20="), projectId: atob("bmVvbmdhbGF4eS0zM2E1ZQ=="), storageBucket: atob("bmVvbmdhbGF4eS0zM2E1ZS5maXJlYmFzZXN0b3JhZ2UuYXBw"), messagingSenderId: atob("ODU0MDc3Mjk1ODE3"), appId: atob("MTo4NTQwNzcyOTU4MTc6d2ViOjI5NjEzOThlM2Y4NWQ3MzNjMTkxMTg=") };
  const app = initializeApp(firebaseConfig); window.db = getFirestore(app); window.auth = getAuth(app); 
  window.fb = { doc, setDoc, getDoc, collection, query, orderBy, limit, onSnapshot, deleteDoc };
  window.fbAuth = { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, updatePassword, EmailAuthProvider, reauthenticateWithCredential, deleteUser, onAuthStateChanged };
  isFirebaseLoaded = true; window.dispatchEvent(new Event('firebaseReady'));
};

initFirebase().catch((e) => { triggerOffline(); });
setTimeout(() => { if (!isFirebaseLoaded) triggerOffline(); }, 3000);
