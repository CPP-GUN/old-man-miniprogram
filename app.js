// app.js
import { initWs } from "./utils/ws";
App({
    onLaunch() {
        const loginStatus = wx.getStorageSync("loginStatus");
        if (loginStatus == "") {
            this.globalData.userInfo = loginStatus;
        }
        if (
            this.globalData.autoConnectWebSocket &&
            loginStatus &&
            loginStatus.token
        ) {
            this.connectWebSocketWithAutoRetry();
        } else {
            console.warn(
                "app.js：跳过了WebSocket连接环节（未登录或配置关闭），本次运行期间将不会接收推送消息（对话信息＆跌倒警告），请不要将本配置用于生产环境！"
            );
            // 未登录或不连接WS时，直接跳转首页（或登录页）
            wx.switchTab({
                url: "/pages/index/index",
                fail: () => {
                    wx.redirectTo({
                        url: "/pages/index/index",
                    });
                },
            });
        }
        if (this.globalData.needClearLoginStatus) {
            console.warn(
                "app.js：强制每次启动时自动清除登陆状态信息，本次启动将跳转至登录页面，请不要将本配置用于生产环境！"
            );
        }
    },
    // 带自动重连的 WebSocket 初始化
    async connectWebSocketWithAutoRetry() {
        wx.showLoading({
            title: "连接服务器...",
            mask: true,
        });

        const navigateToHome = () => {
            wx.hideLoading();
            wx.switchTab({
                url: "/pages/index/index",
                fail: () => {
                    wx.redirectTo({
                        url: "/pages/index/index",
                    });
                },
            });
        };

        try {
            const loginStatus = wx.getStorageSync("loginStatus");
            const token = loginStatus ? loginStatus.token : "";

            // 尝试连接
            const res = await initWs(
                this.globalData.serverIp,
                this.globalData.wsProxy,
                false,
                false,
                token
            );

            if (res.allowLaunch && res.ws) {
                // 连接成功
                this.globalData.ws = res.ws;

                // 监听后续断连
                res.ws.onClose(() => {
                    console.log("🔌 WebSocket 被动断开，准备自动重连...");
                    this.globalData.ws = undefined;
                    this.handleWsDisconnect();
                });
                res.ws.onMessage((data) => {
                    if (data.data != "ping") {
                        const msgContent = JSON.parse(data.data);
                        if (msgContent.msgType == 1) {
                            // fallDownWarning(msgContent.msg);
                            this.triggerFallWarning();
                        }
                        // 分发消息给所有注册的回调
                        this.globalData.messageCallbacks.forEach((callback) =>
                            callback(msgContent)
                        );
                    }
                });

                // 连接成功，立即跳转
                navigateToHome();
                return res;
            } else {
                const timeStr = new Date().toLocaleTimeString("en-GB", {
                    hour12: false,
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                });
                console.error(`❌ [${timeStr}] 连接被拒绝或未返回有效 ws`);

                // 连接被拒绝，提示用户重试
                wx.hideLoading();
                this.promptRestart("服务器拒绝连接");
                return {};
            }
        } catch (err) {
            const timeStr = new Date().toLocaleTimeString("en-GB", {
                hour12: false,
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
            });
            console.error(`❌ [${timeStr}] WebSocket 连接失败:`, err);

            // 首次连接失败，提示用户重试
            wx.hideLoading();
            this.promptRestart("连接失败，请检查网络");
        }
    },

    // 处理断连后的自动重连逻辑
    handleWsDisconnect() {
        if (
            this.globalData.wsReconnectAttempts >=
            this.globalData.maxReconnectAttempts
        ) {
            // 超过最大重试次数，提示用户
            const timeStr = new Date().toLocaleTimeString("en-GB", {
                hour12: false,
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
            });
            console.error(
                `❌[${timeStr}] WebSocket 重连失败，已达最大重试次数`
            );
            this.promptRestart("服务器连接已断开，请检查网络后重试");
            return;
        }

        // 执行重连（在后台进行，不影响页面）
        const reconnect = async () => {
            this.globalData.wsReconnectAttempts++;
            try {
                const res = await initWs(
                    this.globalData.serverIp,
                    this.globalData.wsProxy,
                    false,
                    true
                );
                const timeStr = new Date().toLocaleTimeString("en-GB", {
                    hour12: false,
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                });
                if (res.allowLaunch && res.ws) {
                    this.globalData.ws = res.ws;
                    this.globalData.wsConnected = true;
                    this.globalData.wsReconnectAttempts = 0;

                    res.ws.onClose(() => {
                        this.globalData.wsConnected = false;
                        this.globalData.ws = null;
                        this.handleWsDisconnect();
                    });
                    console.log(`✅ [${timeStr}] WebSocket 自动重连成功`);
                    // 可选：通知页面连接恢复（如通过事件总线）
                } else {
                    this.promptRestart(`❌ [${timeStr}] 服务器拒绝连接`);
                }
            } catch (err) {
                const timeStr = new Date().toLocaleTimeString("en-GB", {
                    hour12: false,
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                });
                console.error(
                    `❌ [${timeStr}] 重连第 ${this.globalData.wsReconnectAttempts} 次失败`,
                    err
                );
                // 继续重试（递归）
                if (
                    this.globalData.wsReconnectAttempts <=
                    this.globalData.maxReconnectAttempts
                ) {
                    this.handleWsDisconnect(); // 会再次进入退避等待
                }
            }
        };

        // 启动重连（注意：首次调用 handleWsDisconnect 时，wsReconnectAttempts 已 +1）
        reconnect();
    },

    // 统一失败提示（仅在彻底失败时调用）
    promptRestart(message) {
        wx.showModal({
            title: "连接失败",
            content: message || "无法连接到服务器，请检查网络后重试",
            showCancel: true,
            cancelText: "退出",
            confirmText: "重试",
            success: (res) => {
                if (res.confirm) {
                    // 重置状态并重试
                    this.globalData.wsReconnectAttempts = 0;
                    this.connectWebSocketWithAutoRetry();
                } else if (res.cancel) {
                    wx.exitMiniProgram();
                }
            },
        });
    },
    globalData: {
        hasLaunched: false,
        needClearLoginStatus: false,
        // serverIp: "192.168.157.240:8080",
        // apiProxy: "http://",
        // wsProxy: "ws://",
        serverIp: "older.api.lumirant.top",
        apiProxy: "https://",
        wsProxy: "wss://",
        ws: undefined,
        autoConnectWebSocket: true,
        wsConnected: false,
        wsReconnectAttempts: 0,
        maxReconnectAttempts: 5,
        lastMessageId: "0",
        hasFallWarning: false, // 标记是否有未处理的警告
        messageCallbacks: [], // 存储 WebSocket 消息回调
    },

    // 注册 WebSocket 消息回调
    registerMessageCallback(callback) {
        this.globalData.messageCallbacks.push(callback);
    },

    // 注销 WebSocket 消息回调
    unregisterMessageCallback(callback) {
        this.globalData.messageCallbacks =
            this.globalData.messageCallbacks.filter((cb) => cb !== callback);
    },

    // 触发全局摔倒警告
    triggerFallWarning() {
        this.globalData.hasFallWarning = true;
        const pages = getCurrentPages();
        const currentPage = pages[pages.length - 1];
        // 简单判断是否是 tab 页 (根据 route)
        const tabPages = [
            "pages/index/index",
            "pages/care/care",
            "pages/message/message",
            "pages/user/user",
        ];
        if (tabPages.includes(currentPage.route)) {
            if (typeof currentPage.getTabBar === "function") {
                const tabBar = currentPage.getTabBar();
                if (tabBar) {
                    tabBar.showFallWarning();
                    this.globalData.hasFallWarning = false; // 已处理
                }
            }
        } else {
            // 非 Tab 页，强制跳转
            wx.switchTab({ url: "/pages/index/index" });
            // 首页 onShow 会再次检查 globalData.hasFallWarning 并触发
        }
    },
});
