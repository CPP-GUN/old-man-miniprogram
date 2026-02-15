// pages/user/user.js
Page({
    /**
     * 页面的初始数据
     */
    data: {
        pageContainerShow: false,
        pageContainerPosition: "bottom",
        pageContainerContent: "changeAccount",
        userData: {},
        containerHeight: null, // 弹窗当前高度
        initialHeight: 0, // 弹窗初始高度
        startY: 0, // 触摸开始Y坐标
        transition: "", // 动画过渡属性
        medicalHistory: {
            chronicDiseases: ["糖尿病"],
            infectiousDiseases: ["肺结核", "肝炎"],
            tumorHistory: [],
            majorSurgeries: [
                {
                    date: "2023年10月12日",
                    hospital: "北京恒大医院",
                    reason: "脑溢血",
                    type: "开颅手术",
                },
            ],
            allergies: ["青霉素药物过敏", "花粉过敏"],
        },
        showAddHistoryModal: false,
        currentHistoryType: "",
        currentHistoryTitle: "",
        addHistoryForm: {
            name: "",
            date: "",
            hospital: "",
            reason: "",
            type: "",
        },
        isEditingHistory: false,
        editingHistoryIndex: -1,
    },

    /**
     * 生命周期函数--监听页面加载
     */
    onLoad(options) {},

    // 触摸开始
    onDragStart(e) {
        const query = wx.createSelectorQuery();
        query
            .select(".changeAccountContainer")
            .boundingClientRect((rect) => {
                if (rect) {
                    this.setData({
                        initialHeight: rect.height,
                        containerHeight: rect.height,
                        startY: e.touches[0].clientY,
                        transition: "none", // 拖拽时移除过渡动画，保证跟手
                    });
                }
            })
            .exec();
    },

    // 触摸移动
    onDragMove(e) {
        const { startY, initialHeight } = this.data;
        const currentY = e.touches[0].clientY;
        const deltaY = currentY - startY;

        // 只能向下滑动 (deltaY > 0)，高度减小
        if (deltaY > 0) {
            const newHeight = initialHeight - deltaY;
            // 高度不能小于0
            if (newHeight >= 0) {
                this.setData({
                    containerHeight: newHeight,
                });
            }
        }
    },

    // 触摸结束
    onDragEnd(e) {
        const { containerHeight, initialHeight } = this.data;
        // 调整阈值为初始高度的 2/3，即只要下滑超过 1/3 就可以关闭
        const threshold = initialHeight * (4 / 5);

        // 如果当前高度小于阈值，则关闭
        if (containerHeight < threshold) {
            // 直接关闭 page-container，让它执行原生的退出动画
            this.setData({
                pageContainerShow: false,
            });

            // 等待原生动画结束后，重置高度和过渡属性
            setTimeout(() => {
                this.setData({
                    containerHeight: null,
                    transition: "",
                });
            }, 300);
        } else {
            // 恢复过渡动画
            this.setData({
                transition: "height 0.3s ease-out",
                containerHeight: initialHeight,
            });
        }
    },

    onStatusImageTap() {
        wx.showToast({
            title: "该功能暂未实现！",
            icon: "none",
            duration: 2000,
        });
    },

    onScheduleBtnTap() {
        getApp().globalData.openScheduleList = true;
        wx.switchTab({
            url: "/pages/index/index",
        });
    },

    onWarningBtnTap() {
        wx.navigateTo({
            url: "/pages/notice/notice",
        });
    },

    onServiceBtnTap() {
        wx.showModal({
            title: "联系客服",
            content: "是否拨打客服电话：400-xxx-xxxx？",
            success(res) {
                if (res.confirm) {
                    wx.showToast({
                        title: "模拟拨打电话操作",
                        icon: "none",
                        duration: 2000,
                    });
                }
            },
        });
    },

    onChangeBtnTap() {
        this.setData({
            pageContainerShow: true,
            pageContainerPosition: "bottom",
            pageContainerContent: "changeAccount",
        });
    },

    onMedicalHistoryBtnTap() {
        this.setData({
            pageContainerShow: true,
            pageContainerPosition: "bottom",
            pageContainerContent: "medicalHistory",
        });
    },

    onAddHistoryTap(e) {
        const type = e.currentTarget.dataset.type;
        console.log("Add history item triggered for type:", type);

        this.setData({
            showAddHistoryModal: true,
            isEditingHistory: false,
            editingHistoryIndex: -1,
            currentHistoryType: type,
            currentHistoryTitle: this.getHistoryTypeName(type),
            // Reset form
            addHistoryForm: {
                name: "",
                date: "",
                hospital: "",
                reason: "",
            },
        });
    },

    onEditHistoryTap(e) {
        const { type, index, id, item } = e.currentTarget.dataset;
        console.log(
            "Edit history item triggered for type:",
            type,
            "index:",
            index,
            "id:",
            id
        );

        this.setData({
            showAddHistoryModal: true,
            isEditingHistory: true,
            editingHistoryIndex: index,
            editingHistoryId: id,
            currentHistoryType: type,
            currentHistoryTitle: this.getHistoryTypeName(type),
            addHistoryForm:
                type === "majorSurgeries" ? { ...item } : { name: item },
        });
    },

    onDeleteHistory() {
        const { editingHistoryId } = this.data;
        wx.showModal({
            title: "提示",
            content: "确定要删除这条记录吗？",
            success: (res) => {
                if (res.confirm) {
                    const app = getApp();
                    const apiProxy = app.globalData.apiProxy;
                    const serverIp = app.globalData.serverIp;
                    wx.request({
                        url:
                            apiProxy +
                            serverIp +
                            "/api/medicalHistory/delete?id=" +
                            editingHistoryId,
                        method: "DELETE",
                        header: {
                            Authorization: (
                                wx.getStorageSync("loginStatus") || {}
                            ).token,
                        },
                        success: (res) => {
                            if (res.data.code == 0) {
                                console.log("删除病史记录成功", res.data.data);
                                this.getMedicalHistoryList();
                                this.setData({
                                    showAddHistoryModal: false,
                                    isEditingHistory: false,
                                    currentHistoryType: "",
                                });
                                wx.showToast({
                                    title: "删除成功",
                                    icon: "success",
                                });
                            } else {
                                console.error("删除病史记录失败", res.data);
                                wx.showToast({
                                    title: "删除失败",
                                    icon: "none",
                                });
                            }
                        },
                        fail: (err) => {
                            console.error("删除病史记录失败", err);
                            wx.showToast({ title: "删除失败", icon: "none" });
                        },
                    });
                }
            },
        });
    },

    onCancelAddHistory() {
        this.setData({
            showAddHistoryModal: false,
            currentHistoryType: "",
            isEditingHistory: false,
            editingHistoryIndex: -1,
        });
    },

    onInputHistoryField(e) {
        const field = e.currentTarget.dataset.field;
        const value = e.detail.value;
        this.setData({
            [`addHistoryForm.${field}`]: value,
        });
    },

    onSaveHistory() {
        const {
            currentHistoryType,
            addHistoryForm,
            medicalHistory,
            isEditingHistory,
            editingHistoryIndex,
        } = this.data;

        if (currentHistoryType === "majorSurgeries") {
            if (
                !addHistoryForm.date ||
                !addHistoryForm.hospital ||
                !addHistoryForm.reason ||
                !addHistoryForm.type
            ) {
                wx.showToast({ title: "请填写完整信息", icon: "none" });
                return;
            }
        } else {
            if (!addHistoryForm.name) {
                wx.showToast({ title: "请输入内容", icon: "none" });
                return;
            }
        }

        const app = getApp();
        const apiProxy = app.globalData.apiProxy;
        const serverIp = app.globalData.serverIp;
        const url =
            apiProxy +
            serverIp +
            "/api/medicalHistory/" +
            (isEditingHistory ? "update" : "add");
        const typeMap = {
            chronicDiseases: 1,
            infectiousDiseases: 2,
            tumorHistory: 3,
            majorSurgeries: 4,
            allergies: 5,
        };

        let content = "";
        if (currentHistoryType === "majorSurgeries") {
            content = JSON.stringify({
                date: addHistoryForm.date,
                hospital: addHistoryForm.hospital,
                reason: addHistoryForm.reason,
                type: addHistoryForm.type,
            });
        } else {
            content = addHistoryForm.name;
        }

        let data = {};
        if (isEditingHistory) {
            data = {
                id: this.data.editingHistoryId,
                content,
            };
        } else {
            data = {
                diseaseType: typeMap[currentHistoryType],
                content,
            };
        }
        wx.request({
            url: url,
            method: isEditingHistory ? "PUT" : "POST",
            header: {
                Authorization: (wx.getStorageSync("loginStatus") || {}).token,
            },
            data,
            success: (res) => {
                if (res.data.code == 0) {
                    console.log("保存病史记录成功", res.data.data);
                    this.getMedicalHistoryList();
                    this.setData({
                        showAddHistoryModal: false,
                        isEditingHistory: false,
                        currentHistoryType: "",
                    });
                    wx.showToast({
                        title: isEditingHistory ? "修改成功" : "添加成功",
                        icon: "success",
                    });
                } else {
                    console.error("保存病史记录失败", res.data.message);
                    wx.showToast({
                        title: res.data.message || "保存失败",
                        icon: "none",
                    });
                }
            },
            fail: (err) => {
                console.error("保存病史记录失败", err);
                wx.showToast({
                    title: "保存失败",
                    icon: "none",
                });
            },
        });
    },

    preventBubble() {
        // 阻止事件冒泡
    },

    getHistoryTypeName(type) {
        const map = {
            chronicDiseases: "慢性病",
            infectiousDiseases: "传染病",
            tumorHistory: "肿瘤史",
            majorSurgeries: "重大手术",
            allergies: "过敏史",
        };
        return map[type] || "记录";
    },

    onPageContainerOverlayTap() {
        this.setData({
            pageContainerShow: false,
        });
    },

    onSwitchBtnTap() {
        wx.showToast({
            title: "功能暂未实现！",
            icon: "none",
        });
    },

    onLogoutBtnTap() {
        wx.removeStorageSync("loginStatus");
        wx.redirectTo({ url: "/pages/login/login" });
    },

    /**
     * 生命周期函数--监听页面初次渲染完成
     */
    onReady() {},

    /**
     * 生命周期函数--监听页面显示
     */
    onShow() {
        let userInfo = wx.getStorageSync("userInfo");
        if (userInfo == "") {
            wx.showToast({
                title: "请先登录",
                icon: "none",
            });
            wx.redirectTo({ url: "/pages/login/login" });
        }
        userInfo = {
            username: userInfo["username"],
            phone: userInfo["phone"],
            idNum: userInfo["childIdCard"],
            oldmanIdNum: userInfo["elderlyIdCard"],
            oldmanAge: userInfo["elderlyAge"],
            oldmanHeight: userInfo["elderlyHeight"],
            oldmanWeight: userInfo["elderlyWeight"],
            oldmanAddress: userInfo["elderlyAddress"],
            oldmanName: userInfo["oldmanName"],
        };
        this.getMedicalHistoryList();
        if (typeof this.getTabBar === "function" && this.getTabBar()) {
            this.getTabBar().setData({
                selected: 3,
            });
        }
        this.setData({
            userData: userInfo,
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

    getMedicalHistoryList() {
        const app = getApp();
        const apiProxy = app.globalData.apiProxy;
        const serverIp = app.globalData.serverIp;
        wx.request({
            url: apiProxy + serverIp + "/api/medicalHistory/list",
            method: "GET",
            data: {},
            header: {
                Authorization: (wx.getStorageSync("loginStatus") || {}).token,
            },
            success: (res) => {
                if (res.data.code == 0) {
                    const data = {
                        chronicDiseases: [],
                        infectiousDiseases: [],
                        tumorHistory: [],
                        majorSurgeries: [],
                        allergies: [],
                    };
                    const diseaseTypeMap = {
                        1: "chronicDiseases",
                        2: "infectiousDiseases",
                        3: "tumorHistory",
                        4: "majorSurgeries",
                        5: "allergies",
                    };
                    // 遍历返回的数据，按类型分类存储
                    res.data.data.forEach((item) => {
                        const type = item.diseaseType;
                        if (
                            type == "1" ||
                            type == "2" ||
                            type == "3" ||
                            type == "5"
                        ) {
                            data[diseaseTypeMap[type]].push({
                                id: item.id,
                                content: item.content,
                            });
                        } else if (type == "4") {
                            // 判断content是否为有效的JSON字符串
                            let surgeryDetails = {};
                            try {
                                surgeryDetails = JSON.parse(item.content);
                            } catch (error) {
                                console.error("JSON解析错误", error);
                                return;
                            }
                            data.majorSurgeries.push({
                                id: item.id,
                                content: surgeryDetails,
                            });
                        }
                    });
                    console.log("获取病史列表成功", data);
                    this.setData({
                        medicalHistory: data,
                    });
                } else {
                    console.error("获取病史列表失败", res.data.message);
                }
            },
            fail: (err) => {
                console.error("获取病史列表失败", err);
            },
        });
    },
});
