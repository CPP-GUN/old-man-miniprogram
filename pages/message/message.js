// pages/message/message.js

Page({
    /**
     * 页面的初始数据
     */
    data: {
        navHeight: 0,
        isRecording: false,
        isCanceling: false,
        recordDuration: 0,
        showRecordHint: 0,
        lastMessageId: "",
        isRefreshing: false,
    },

    onRefresherRefresh() {
        this.setData({
            isRefreshing: true,
        });
        const chatComponent = this.selectComponent("#chatComponent");
        if (chatComponent) {
            chatComponent
                .refresh()
                .then(() => {
                    this.setData({
                        isRefreshing: false,
                    });
                })
                .catch(() => {
                    this.setData({
                        isRefreshing: false,
                    });
                });
        } else {
            this.setData({
                isRefreshing: false,
            });
        }
    },

    /**
     * 生命周期函数--监听页面加载
     */
    onLoad(options) {
        this.innerAudio = wx.createInnerAudioContext();
        this.recorderManager = wx.getRecorderManager();
        this.recordInfo = {
            tempFilePath: "",
            duration: 0,
            fileSize: 0,
        };
        this.recorderManager.onStart(() => {
            console.log("开始录音");
        });
        this.recorderManager.onStop((res) => {
            console.log("录音结束", res);
            if (this.shouldSend === false) {
                console.log("录音已取消，不发送");
                return;
            }
            this.resetRecordInfo();
            this.setRecordInfo(res);
            this.innerAudio.src = res.tempFilePath;
            if (this.innerAudio.src && !this.data.isCanceling) {
                wx.uploadFile({
                    url:
                        getApp().globalData.apiProxy +
                        getApp().globalData.serverIp +
                        "/api/chat/add",
                    filePath: res.tempFilePath,
                    name: "file",
                    header: {
                        Authorization: (wx.getStorageSync("loginStatus") || {})
                            .token,
                    },
                    formData: {
                        // 如果接口需要其他参数，可以在这里添加
                        // 'duration': res.duration
                    },
                    success: (res) => {
                        // wx.uploadFile 返回的 res.data 是字符串，需要 parse
                        const data = JSON.parse(res.data);
                        if (data.code === 0) {
                            console.log("消息发送成功:", data);
                            const chatComponent =
                                this.selectComponent("#chatComponent");
                            if (chatComponent) {
                                chatComponent.refresh();
                            }
                        } else {
                            console.error("消息发送失败:", data);
                            wx.showToast({
                                title: "消息发送失败！",
                                icon: "none",
                            });
                        }
                    },
                    fail: (err) => {
                        console.error("语音消息发送失败:", err);
                        wx.showToast({
                            title: "消息发送失败！",
                            icon: "none",
                        });
                        wx.showModal({
                            title: "系统错误",
                            content:
                                "语音消息发送失败，请检查网络连接！\n" +
                                err.message,
                        });
                    },
                });
            }
        });
        this.innerAudio.onError((e) => console.error("播放错误", e));
    },

    resetRecordInfo() {
        this.recordInfo = {
            tempFilePath: "",
            duration: 0,
            fileSize: 0,
        };
    },

    setRecordInfo(newRecordInfo) {
        this.recordInfo = {
            tempFilePath:
                newRecordInfo.tempFilePath != null
                    ? newRecordInfo.tempFilePath
                    : "",
            duration: newRecordInfo.duration ?? 0,
            fileSize: newRecordInfo.fileSize ?? 0,
        };
    },

    startRecord(customOptions = {}) {
        this.recorderManager.start(customOptions);
    },

    scrollToBottom() {
        this.setData(
            {
                lastMessageId: "",
            },
            () => {
                this.setData({
                    lastMessageId: "bottom-placeholder",
                });
            }
        );
    },

    /**
     * 生命周期函数--监听页面初次渲染完成
     */
    onReady() {},

    /**
     * 生命周期函数--监听页面显示
     */
    onShow() {
        if (typeof this.getTabBar === "function" && this.getTabBar()) {
            this.getTabBar().setData({
                selected: 1,
            });
        }
        const menuButton = wx.getMenuButtonBoundingClientRect();
        this.setData({
            navHeight: menuButton.top + menuButton.height + 5,
        });
    },

    onRecordBtnTap(e) {
        // 录音开始时，停止播放语音
        const chatComponent = this.selectComponent("#chatComponent");
        if (chatComponent) {
            chatComponent.stopPlayback();
        }

        this.startY = e.touches[0].clientY;
        this.shouldSend = true;
        this.setData({
            isRecording: true,
            isCanceling: false,
        });
        const options = {
            duration: 60000,
            sampleRate: 16000,
            numberOfChannels: 1,
            encodeBitRate: 24000,
            format: "aac",
            frameSize: 1024,
        };
        this.startRecord(options);
        this.recordtTimer = setInterval(() => {
            const currentDuration = this.data.recordDuration + 1;
            if (currentDuration == 60) {
                this.onRecordBtnEndTap();
                this.setData({
                    recordDuration: 0,
                    showRecordHint: 0,
                });
                clearInterval(this.recordtTimer);
            } else {
                const showHint = currentDuration >= 55 ? 1 : 0;
                // console.log("已录制" + currentDuration + "秒");
                this.setData({
                    recordDuration: currentDuration,
                    showRecordHint: showHint,
                });
            }
        }, 1000);
    },

    onRecordBtnMove(e) {
        const currentY = e.touches[0].clientY;
        const deltaY = currentY - this.startY;

        // If moved up by more than 50px, consider it as canceling
        if (deltaY < -50) {
            if (!this.data.isCanceling) {
                this.setData({ isCanceling: true });
                wx.vibrateShort({ type: "medium" });
            }
        } else {
            if (this.data.isCanceling) {
                this.setData({ isCanceling: false });
            }
        }
    },
    onRecordBtnEndTap() {
        if (this.data.isCanceling) {
            this.shouldSend = false;
            wx.showToast({
                title: "已取消",
                icon: "none",
            });
        }

        this.setData({
            isRecording: false,
            isCanceling: false,
            recordDuration: 0,
            showRecordHint: 0,
        });
        if (this.recordtTimer) {
            clearInterval(this.recordtTimer);
        }
        this.recorderManager.stop();
    },

    /**
     * 生命周期函数--监听页面隐藏
     */
    onHide() {},

    /**
     * 生命周期函数--监听页面卸载
     */
    onUnload() {
        if (this.innerAudio) {
            this.innerAudio.destroy();
            this.innerAudio = null;
        }
    },

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
