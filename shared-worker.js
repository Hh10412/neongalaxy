const connections = [];
let masterData = null;
let isSyncLocked = false;
let activeGamePort = null;

self.onconnect = function(event) {
    const port = event.ports[0];
    connections.push(port);

    port.onmessage = function(e) {
        const { type, payload } = e.data;

        switch (type) {
            case 'INIT_DATA':
                // Chỉ nhận dữ liệu từ tab mở lên đầu tiên
                if (!masterData) masterData = payload;
                break;
                
            case 'UPDATE_DATA':
                // Nếu không có tab nào đang trong trận, cho phép nhận data và phát sóng
                if (!isSyncLocked) {
                    masterData = payload;
                    broadcast('SYNC_DATA', masterData, port);
                }
                break;
                
            case 'GAME_START':
                // Khóa đồng bộ, bảo vệ tab đang chơi
                isSyncLocked = true;
                activeGamePort = port;
                break;
                
            case 'GAME_END':
                // Chỉ tab đang giữ quyền chơi mới được phép mở khóa và cập nhật data sau trận
                if (activeGamePort === port) {
                    isSyncLocked = false;
                    activeGamePort = null;
                    masterData = payload;
                    broadcast('SYNC_DATA', masterData, port);
                }
                break;
        }
    };
    
    port.start();
};

// Hàm phát sóng dữ liệu tới tất cả các tab, ngoại trừ tab vừa gửi đi
function broadcast(type, payload, excludePort = null) {
    connections.forEach(port => {
        if (port !== excludePort) {
            port.postMessage({ type, payload });
        }
    });
}
