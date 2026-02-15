// pages/index.js
Page({
    /**
     * 页面的初始数据
     */
    data: {
        scheduleList: [],
        isDataBoxPressed: false,
        showScheduleListModal: false, // Bottom sheet
        isClosingScheduleList: false,
        showScheduleModal: false, // Center modal
        isClosingScheduleModal: false,
        isEditing: false,
        editingSchedule: {
            id: null,
            title: "",
            time: "09:00",
            finish: false,
            pass: false,
            isDaily: false,
        },
        currentDate: new Date(new Date().setDate(new Date().getDate() - 1))
            .toISOString()
            .split("T")[0],
    },

    /**
     * 生命周期函数--监听页面加载
     */
    onLoad(options) {
        if (getApp().globalData.needClearLoginStatus) {
            wx.removeStorageSync("loginStatus");
            getApp().globalData.needClearLoginStatus = false;
        }
        if (wx.getStorageSync("loginStatus") == "") {
            wx.showToast({
                title: "请先登录",
                icon: "none",
            });
            wx.redirectTo({ url: "/pages/login/login" });
        }
    },

    onDataBoxPressStart() {
        this.setData({ isPressed: true });
    },

    onDataBoxPressEnd() {
        this.setData({ isPressed: false });
    },

    onMessageBtnTap() {
        wx.switchTab({
            url: "/pages/message/message",
        });
    },

    onWarningBtnTap() {
        wx.navigateTo({
            url: "/pages/notice/notice",
        });
    },

    onMusicOnDemandTap() {
        wx.navigateTo({
            url: "/pages/entertainment/entertainment",
        });
    },

    onScheduleBtnTap() {}, // Deprecated

    onOpenScheduleList() {
        this.setData({ showScheduleListModal: true });
    },

    onEditSchedule(e) {
        const item = e.currentTarget.dataset.item;
        this.setData({
            showScheduleModal: true,
            isEditing: true,
            editingSchedule: Object.assign({}, item),
        });
    },

    onAddSchedule() {
        const now = new Date();
        const dateStr = now.toISOString().split("T")[0];
        this.setData({
            showScheduleModal: true,
            isEditing: false,
            editingSchedule: {
                id: null,
                title: "",
                time: "09:00",
                endDate: dateStr,
                finish: false,
                pass: false,
                isDaily: false,
            },
        });
    },

    onCloseScheduleList() {
        this.setData({ isClosingScheduleList: true });
        setTimeout(() => {
            this.setData({
                showScheduleListModal: false,
                isClosingScheduleList: false,
            });
        }, 300);
    },

    onCloseScheduleModal() {
        this.setData({ isClosingScheduleModal: true });
        setTimeout(() => {
            this.setData({
                showScheduleModal: false,
                isClosingScheduleModal: false,
            });
        }, 200);
    },

    preventBubble() {},

    onScheduleTitleInput(e) {
        this.setData({ "editingSchedule.title": e.detail.value });
    },

    onTimeChange(e) {
        this.setData({ "editingSchedule.time": e.detail.value });
    },

    onEndDateChange(e) {
        this.setData({ "editingSchedule.endDate": e.detail.value });
    },

    onRepeatChange(e) {
        this.setData({ "editingSchedule.isDaily": e.detail.value });
    },

    onScheduleFinishChange(e) {
        this.setData({ "editingSchedule.finish": e.detail.value });
    },

    onSaveSchedule() {
        const { editingSchedule, isEditing, scheduleList } = this.data;
        if (!editingSchedule.title) {
            wx.showToast({ title: "请输入标题", icon: "none" });
            return;
        }
        const newSchedule = {
            title: editingSchedule.title,
            taskType: editingSchedule.isDaily ? 2 : 1,
        };
        if (editingSchedule.isDaily) {
            newSchedule.endTime = editingSchedule.endDate + "T23:59:59";
        } else {
            const now = new Date();
            const dateStr = now.toISOString().split("T")[0];
            newSchedule.endTime = dateStr + "T23:59:59";
        }

        if (isEditing) {
            newSchedule.id = editingSchedule.id;
            newSchedule.status = editingSchedule.finish ? 3 : 1;
        } else {
            newSchedule.userId = 0;
            newSchedule.content = editingSchedule.title;
        }
        const now = new Date();
        const timeParts = editingSchedule.time.split(":");
        const hours = timeParts[0];
        const minutes = timeParts[1];
        const nowHours = now.getHours();
        const nowMinutes = now.getMinutes();
        if (hours < nowHours || (hours === nowHours && minutes <= nowMinutes)) {
            now.setDate(now.getDate() + 1);
        }
        const dateStr = now.toISOString().split("T")[0];
        newSchedule.nextExecuteTime = `${dateStr}T${editingSchedule.time}:00`;
        newSchedule.triggerTime = `${dateStr}T${editingSchedule.time}:00`;
        console.log(JSON.stringify(newSchedule));
        const app = getApp();
        const apiProxy = app.globalData.apiProxy;
        const serverIp = app.globalData.serverIp;
        let newList = scheduleList.slice();
        if (isEditing) {
            wx.request({
                url: apiProxy + serverIp + "/api/reminderTask/update",
                method: "POST",
                data: newSchedule,
                header: {
                    Authorization: (wx.getStorageSync("loginStatus") || {})
                        .token,
                    "Content-Type": "application/json",
                },
                complete: (res) => {
                    console.log(res.data);
                },
                success: (res) => {
                    if (res.data.code === 0) {
                        wx.showToast({ title: "保存成功" });
                        const index = newList.findIndex(
                            (item) => item.id === editingSchedule.id
                        );
                        if (index !== -1) {
                            newList[index] = editingSchedule;
                        }
                        newList.push(editingSchedule);
                        this.setData({
                            scheduleList: newList,
                        });
                    } else {
                        wx.showToast({ title: "保存失败", icon: "none" });
                    }
                },
                fail: (res) => {
                    wx.showToast({ title: "保存失败", icon: "none" });
                },
            });
        } else {
            editingSchedule.id = Date.now(); // Simple ID
            wx.request({
                url: apiProxy + serverIp + "/api/reminderTask/add",
                method: "POST",
                data: newSchedule,
                header: {
                    Authorization: (wx.getStorageSync("loginStatus") || {})
                        .token,
                    "Content-Type": "application/json",
                },
                complete: (res) => {
                    console.log(res.data);
                },
                success: (res) => {
                    if (res.data.code === 0) {
                        wx.showToast({ title: "新建成功" });
                        editingSchedule.id = res.data.data.id;
                        newList.push(editingSchedule);
                        this.setData({
                            scheduleList: newList,
                        });
                    } else {
                        wx.showToast({ title: "新建失败", icon: "none" });
                    }
                },
                fail: (res) => {
                    wx.showToast({ title: "新建失败", icon: "none" });
                },
            });
        }
        this.onCloseScheduleModal();
    },

    onDeleteSchedule() {
        const { editingSchedule, scheduleList } = this.data;
        wx.showModal({
            title: "提示",
            content: "确定要删除这个日程吗？",
            success: (res) => {
                const app = getApp();
                const apiProxy = app.globalData.apiProxy;
                const serverIp = app.globalData.serverIp;
                if (res.confirm) {
                    wx.request({
                        url: apiProxy + serverIp + "/api/reminderTask/delete",
                        method: "POST",
                        data: {
                            id: editingSchedule.id,
                        },
                        header: {
                            Authorization: (
                                wx.getStorageSync("loginStatus") || {}
                            ).token,
                            "Content-Type": "application/json",
                        },
                        complete: (res) => {
                            console.log(res.data);
                        },
                        success: (res) => {
                            if (res.data.code === 0) {
                                wx.showToast({ title: "删除成功" });
                            } else {
                                wx.showToast({
                                    title: "删除失败",
                                    icon: "none",
                                });
                            }
                        },
                        fail: (res) => {
                            wx.showToast({ title: "删除失败", icon: "none" });
                        },
                    });
                    const newList = scheduleList.filter(
                        (item) => item.id !== editingSchedule.id
                    );
                    this.setData({
                        scheduleList: newList,
                    });
                    this.onCloseScheduleModal();
                    wx.showToast({ title: "已删除", icon: "none" });
                }
            },
        });
    },

    onDataBoxTap() {
        wx.switchTab({
            url: "/pages/care/care",
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
        wx.hideHomeButton();
        if (typeof this.getTabBar === "function" && this.getTabBar()) {
            this.getTabBar().setData({
                selected: 0,
            });
        }
        const app = getApp();
        if (app.globalData.openScheduleList) {
            this.setData({ showScheduleListModal: true });
            app.globalData.openScheduleList = false;
        }
        // 检查是否有未处理的摔倒警告
        if (app.globalData.hasFallWarning) {
            app.triggerFallWarning();
        }
        const apiProxy = app.globalData.apiProxy;
        const serverIp = app.globalData.serverIp;
        wx.request({
            url: apiProxy + serverIp + "/api/reminderTask/list",
            method: "POST",
            data: {},
            header: {
                Authorization: (wx.getStorageSync("loginStatus") || {}).token,
            },
            success: (res) => {
                if (res.data.code === 0) {
                    const data = [];
                    if (res.data.data && Array.isArray(res.data.data)) {
                        res.data.data.forEach((item) => {
                            const time = item.nextExecuteTime
                                .split("T")[1]
                                .substring(0, 5);
                            const now = new Date();
                            const nextExecuteDate = new Date(
                                item.nextExecuteTime
                            );
                            let finish = false;
                            let pass = false;
                            if (item.status === 1) {
                                // 这里的逻辑是：
                                // 如果下次执行时间仍然是今天，那么就是unpass
                                // 如果下次执行时间是明天，那么就是pass且未完成
                                if (nextExecuteDate <= now) {
                                    if (item.taskType === 1) {
                                        return;
                                    } else pass = true;
                                } else if (nextExecuteDate > now) {
                                    // 如果已经到下一天了，那就是pass
                                    if (
                                        nextExecuteDate.getDate() >
                                            now.getDate() ||
                                        nextExecuteDate.getMonth() >
                                            now.getMonth() ||
                                        nextExecuteDate.getFullYear() >
                                            now.getFullYear()
                                    ) {
                                        pass = true;
                                        if (item.status === 3) {
                                            finish = true;
                                        }
                                    }
                                }
                            } else if (item.status === 3) {
                                pass = true;
                                finish = true;
                            } else if (item.status === 2) {
                                return;
                            }
                            data.push({
                                id: item.id,
                                title: item.title,
                                time: time,
                                endDate: item.endTime.split("T")[0],
                                finish,
                                pass,
                                isDaily: item.taskType == 2,
                            });
                        });
                    }
                    console.log("提醒任务列表获取成功:", data);
                    this.setData({
                        scheduleList: data,
                    });
                } else {
                    console.error("提醒任务列表获取失败:", res.data.msg);
                    wx.showToast({ title: "日程信息获取失败", icon: "none" });
                }
            },
        });
        let emotionData = [];
        const emotionType = {
            angryRatio: "生气",
            disgustRatio: "厌恶",
            fearRatio: "害怕",
            happyRatio: "开心",
            neutralRatio: "平静",
            sadRatio: "悲伤",
            surpriseRatio: "惊喜",
        };

        // 构造昨天的起止时间
        const date = new Date(this.data.currentDate);
        console.log("Selected date:", this.data.currentDate);
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, "0");
        const d = String(date.getDate()).padStart(2, "0");
        const dateStr = `${y}-${m}-${d}`;
        const startTime = `${dateStr}T00:00:00`;
        const endTime = `${dateStr}T23:59:59`;

        wx.request({
            url: apiProxy + serverIp + "/api/ratio/getByTime",
            method: "GET",
            header: {
                Authorization: (wx.getStorageSync("loginStatus") || {}).token,
            },
            data: {
                timeDimension: 1,
                startTime: startTime,
                endTime: endTime,
            },
            success: (res) => {
                if (res.data.code === 0 && res.data.data) {
                    const data = res.data.data;
                    let totalHappy = 0,
                        totalSurprise = 0,
                        totalNeutral = 0;
                    let totalAngry = 0,
                        totalDisgust = 0,
                        totalFear = 0,
                        totalSad = 0;

                    // Handle both array and single object response
                    const list = Array.isArray(data) ? data : [data];
                    const count = list.length;

                    if (count > 0) {
                        list.forEach((item) => {
                            totalHappy += item.happyRatio || 0;
                            totalSurprise += item.surpriseRatio || 0;
                            totalNeutral += item.neutralRatio || 0;
                            totalAngry += item.angryRatio || 0;
                            totalDisgust += item.disgustRatio || 0;
                            totalFear += item.fearRatio || 0;
                            totalSad += item.sadRatio || 0;
                        });

                        // Calculate averages
                        const avgHappy = totalHappy / count;
                        const avgSurprise = totalSurprise / count;
                        const avgNeutral = totalNeutral / count;
                        const avgAngry = totalAngry / count;
                        const avgDisgust = totalDisgust / count;
                        const avgFear = totalFear / count;
                        const avgSad = totalSad / count;

                        // Ratios
                        const goodRatio = avgHappy + avgSurprise + avgNeutral;
                        const badRatio =
                            avgAngry + avgDisgust + avgFear + avgSad;

                        // Weighted Score Calculation
                        // Weights: Happy(100), Surprise(90), Neutral(70), Sad(40), Fear(20), Angry(10), Disgust(0)
                        const score =
                            avgHappy * 1.0 +
                            avgSurprise * 1.0 +
                            avgNeutral * 0.5 +
                            avgSad * 0.3 +
                            avgFear * 0.2 +
                            avgAngry * 0.1 +
                            avgDisgust * 0.1;

                        this.setData({
                            emotionGoodRatio: goodRatio.toFixed(0),
                            emotionBadRatio: badRatio.toFixed(0),
                            emotionScore: Math.round(score),
                        });
                    }
                }
            },
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
