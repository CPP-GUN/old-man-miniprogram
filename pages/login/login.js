import { wxLogin } from "../../utils/wxLogin";

Page({
    data: {
        isChecked: false,
        fade: "",
    },
    onLoad(options) {
        wx.removeStorageSync("loginStatus");
    },
    // 勾选框被点击
    onCheckboxChange(e) {
        this.setData({
            isChecked: e.detail.value.length > 0,
        });
    },
    // 登录按钮被点击
    onLoginBtnTap(e) {
        console.log("Start to login");
        if (!this.data.isChecked) {
            wx.showToast({
                title: "请阅读并勾选同意《隐私协议》和《用户协议》！",
                icon: "none",
            });
            return;
        }
        wx.showLoading({
            title: "加载中...",
        });
        wxLogin().then((res) => {
            console.log("login successful");
            const app = getApp();
            const apiProxy = app.globalData.apiProxy;
            const serverIp = app.globalData.serverIp;
            wx.request({
                url: apiProxy + serverIp + "/api/user/info",
                success(info) {
                    wx.setStorageSync("loginStatus", res.data.data);
                    wx.setStorageSync("userInfo", info.data.data);
                    console.log(
                        "✅ Storage成功！",
                        wx.getStorageSync("loginStatus"),
                        wx.getStorageSync("userInfo")
                    );

                    // 登录成功后，手动触发 WebSocket 连接
                    app.connectWebSocketWithAutoRetry();

                    wx.hideLoading();
                    wx.showToast({
                        title: "登录成功！",
                        icon: "none",
                    });
                    wx.switchTab({
                        url: "/pages/index/index",
                        fail: (err) => {
                            wx.redirectTo({
                                url: "/pages/index/index",
                                fail: (err) => {
                                    console.error("❌ switchTab 失败", err);
                                    wx.showToast({
                                        title: "页面跳转失败，请尝试重启小程序或清除缓存重试",
                                        icon: "none",
                                    });
                                },
                            });
                            console.error("❌ switchTab 失败", err);
                        },
                    });
                },
                error(err) {
                    console.error(err);
                    wx.showModal({
                        title: "请求错误",
                        content:
                            "用户信息获取失败，请检查网络连接后点击“确定”按钮重启小程序！",
                        success(res) {
                            if (res.confirm) {
                                wx.restartMiniProgram({
                                    url: "/pages/bootSplash/bootSplash",
                                });
                            } else if (!res.confirm) {
                                wx.exitMiniProgram();
                            }
                        },
                    });
                },
            });
        });
    },

    onShow() {
        wx.hideHomeButton();
        setTimeout(() => {
            this.setData({
                fade: "fade",
            });
        }, 100);
    },
});
