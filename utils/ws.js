export function initWs(
    serverIp,
    wsProxy,
    skip = false,
    isRetry = false,
    token = ""
) {
    if (!isRetry) {
        wx.showLoading({
            title: "加载中",
        });
    }
    return new Promise((resolve, reject) => {
        const ws = wx.connectSocket({
            url: wsProxy + serverIp + "/api/clientWs",
            header: {
                Authorization: token,
            },
            success: () => {
                console.log(
                    `✅ [${getTime()}] WebSocket 请求已发送: ` +
                        wsProxy +
                        serverIp +
                        "/api/clientWs"
                );
            },
            fail: () => {
                console.error(`❌[${getTime()}] WebSocket 请求发送失败`);
                if (!isRetry) wx.hideLoading();
                reject({ res: undefined, allowLaunch: false, errno: 0 });
            },
        });
        ws.onMessage((data) => {
            if (data.data == "ping") {
                ws.send({
                    data: "pong",
                    success() {
                        console.log(`✅ 心跳包响应成功`);
                    },
                    fail(err) {
                        console.error(err);
                    },
                });
            } else {
                console.log("Recieve Web Socket Message: ", data);
            }
        });

        ws.onOpen(() => {
            if (!isRetry) wx.hideLoading();
            console.log(`✅ [${getTime()}] WebSocket 连接已开启`);
            resolve({ ws: ws, allowLaunch: true });
        });

        ws.onClose(() => {
            console.log(`❌ [${getTime()}] WebSocket 已关闭`);
            resolve({ ws: undefined, allowLaunch: false, errno: 1 });
        });

        // 超时兜底（首次连接）
        const timeout = setTimeout(() => {
            if (!isRetry) wx.hideLoading();
            reject({
                ws: undefined,
                allowLaunch: false,
                errno: 2,
                timeout: true,
            });
        }, 10000);

        // 清理超时
        ws.onOpen(() => clearTimeout(timeout));
        ws.onClose(() => clearTimeout(timeout));

        if (skip) {
            setTimeout(() => {
                wx.showToast({
                    title: "已跳过WebSocket连接环节，相关功能将无法使用！",
                    icon: "none",
                    duration: 1000,
                });
                setTimeout(() => {
                    resolve({ ws: undefined, allowLaunch: true });
                }, 1000);
            }, 1000);
        }
    });
}

function getTime() {
    return new Date().toLocaleTimeString("en-GB", {
        hour12: false,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
    });
}
