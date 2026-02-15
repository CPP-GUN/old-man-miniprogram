// pages/notice/notice.js
Page({
    /**
     * 页面的初始数据
     */
    data: {
        statusBarHeight: 0,
        navRight: 0,
        navBarHeight: 0,
        noticeList: [],
        isRefreshing: false,
    },

    /**
     * 生命周期函数--监听页面加载
     */
    onLoad(options) {
        this.fetchNoticeList();
    },

    onRefresherRefresh() {
        console.log("onRefresherRefresh triggered");
        this.setData({
            isRefreshing: true,
        });
        this.fetchNoticeList(() => {
            this.setData({
                isRefreshing: false,
            });
        });
    },

    fetchNoticeList(callback) {
        // TODO: 替换为真实的 API 请求
        const app = getApp();
        wx.request({
            url:
                app.globalData.apiProxy +
                app.globalData.serverIp +
                "/api/fall/list",
            header: { Authorization: wx.getStorageSync("loginStatus").token },
            success: (res) => {
                if (res.data.code === 0) {
                    this.processData(res.data.data);
                }
            },
            fail: (err) => {
                console.error("系统通知信息获取失败:", err);
                wx.showModal({
                    title: "系统错误",
                    content:
                        "系统通知信息获取失败，请检查网络连接！\n" +
                        err.message,
                });
            },
            complete: () => {
                if (callback) callback();
            },
        });
    },

    processData(list) {
        const formattedList = list.map((item) => {
            return {
                id: item.id,
                time: this.formatTime(item.createTime),
                title: "摔倒报警",
                content: "⚠️ 检测到老人摔倒，请及时处理！",
                type: "alert", // 用于区分样式
            };
        });

        this.setData({
            noticeList: formattedList,
        });
    },

    formatTime(isoString) {
        if (!isoString) return "";
        const date = new Date(isoString);
        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, "0");
        const day = date.getDate().toString().padStart(2, "0");
        const hour = date.getHours().toString().padStart(2, "0");
        const minute = date.getMinutes().toString().padStart(2, "0");
        const second = date.getSeconds().toString().padStart(2, "0");
        return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
    },

    onBackBtnTap() {
        wx.navigateBack({
            delta: 1,
        });
    },

    /**
     * 生命周期函数--监听页面初次渲染完成
     */
    onReady() {},

    /**
     * 生命周期函数--监听页面显示
     */
    onShow() {
        const menuButton = wx.getMenuButtonBoundingClientRect();
        const navRightNum = menuButton.right - menuButton.width - 15;
        this.setData({
            statusBarHeight: menuButton.top,
            navRight: navRightNum,
            navBarHeight: menuButton.height,
        });
    },

    /**
     * 生命周期函数--监听页面隐藏
     */
    onHide() {},

    /**
     * 生命周期函数--监听页面卸载
     */
    onUnload() {},

    /**
     * 页面相关事件处理函数--监听用户下拉动作
     */
    onPullDownRefresh() {},

    /**
     * 页面上拉触底事件的处理函数
     */
    onReachBottom() {},

    /**
     * 用户点击右上角分享
     */
    onShareAppMessage() {},
});
