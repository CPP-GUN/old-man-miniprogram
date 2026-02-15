// pages/care/care.js
import * as echarts from "../../components/ec-canvas/echarts";
let chartInstance = null;

Page({
    /**
     * 页面的初始数据
     */
    data: {
        currentDate: "",
        userInfo: {
            age: 0,
            height: 0,
            weight: 0,
        },
        medicineData: {
            hasPlan: false,
            data: [],
        },
        ec: {
            lazyLoad: true, // 延迟加载，等待 onLoad 初始化
        },
    },

    onMessageBtnTap() {
        wx.navigateTo({
            url: "/pages/message/message",
        });
    },

    onBaseDataBoxTap() {
        wx.switchTab({
            url: "/pages/user/user",
        });
    },

    /**
     * 生命周期函数--监听页面加载
     */
    onLoad(options) {
        // 初始化日期为今天
        const now = new Date();
        now.setDate(now.getDate() - 1);
        const y = now.getFullYear();
        const m = String(now.getMonth() + 1).padStart(2, "0");
        const d = String(now.getDate()).padStart(2, "0");
        const yesterday = `${y}-${m}-${d}`;

        this.setData({
            currentDate: yesterday,
            ec: {
                onInit: this.initChart.bind(this),
            },
        });
        const info = wx.getStorageSync("userInfo");
        if (info) {
            this.setData({
                userInfo: {
                    age: info.elderlyAge,
                    height: info.elderlyHeight,
                    weight: info.elderlyWeight,
                },
            });
        }
    },

    initChart(canvas, width, height, dpr) {
        chartInstance = echarts.init(canvas, null, {
            width: width,
            height: height,
            devicePixelRatio: dpr, // 高清支持
        });
        canvas.setChart(chartInstance);

        this.fetchEmotionData();
        return chartInstance;
    },

    onDateChange(e) {
        this.setData({
            currentDate: e.detail.value,
        });
        this.fetchEmotionData();
    },

    fetchEmotionData() {
        if (!chartInstance) return;

        chartInstance.showLoading();

        const app = getApp();
        const apiProxy = app.globalData.apiProxy;
        const serverIp = app.globalData.serverIp;
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
                chartInstance.hideLoading();
                emotionData = []; // 清空旧数据

                if (res.data.code === 0 && res.data.data) {
                    for (const key in res.data.data) {
                        if (key === "id") continue;
                        if (Object.hasOwnProperty.call(res.data.data, key)) {
                            const element = res.data.data[key];
                            if (element > 0) {
                                // 只显示有数值的
                                emotionData.push({
                                    value: element,
                                    name: emotionType[key] || key,
                                });
                            }
                        }
                    }
                }

                // 如果没有数据，显示空状态或默认数据
                if (emotionData.length === 0) {
                    emotionData = [{ value: 0, name: "无数据" }];
                }

                const option = {
                    backgroundColor: "#ffffff",
                    color: [
                        "#5470c6",
                        "#91cc75",
                        "#fac858",
                        "#ee6666",
                        "#73c0de",
                        "#3ba272",
                        "#fc8452",
                        "#9a60b4",
                        "#ea7ccc",
                    ],
                    tooltip: {
                        trigger: "item",
                        formatter: "{b}: {c} ({d}%)",
                    },
                    series: [
                        {
                            name: "情绪分布",
                            type: "pie",
                            radius: ["55%", "70%"],
                            center: ["50%", "45%"],
                            data: emotionData,
                            avoidLabelOverlap: true,
                            itemStyle: {
                                borderRadius: 0,
                                borderColor: "#fff",
                                borderWidth: 0,
                            },
                            label: {
                                show: true,
                                position: "outside",
                                formatter: "{b}\n{d}%",
                                color: "#333",
                                fontSize: 12,
                                lineHeight: 18,
                            },
                            emphasis: {
                                label: {
                                    show: true,
                                    fontSize: 14,
                                    fontWeight: "bold",
                                },
                                itemStyle: {
                                    shadowBlur: 10,
                                    shadowOffsetX: 0,
                                    shadowColor: "rgba(0, 0, 0, 0.5)",
                                },
                            },
                            labelLine: {
                                show: true,
                                length: 15,
                                length2: 10,
                                smooth: true,
                            },
                        },
                    ],
                };
                chartInstance.setOption(option);
            },
            fail: () => {
                chartInstance.hideLoading();
                wx.showToast({
                    title: "获取数据失败",
                    icon: "none",
                });
            },
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
        if (typeof this.getTabBar === "function" && this.getTabBar()) {
            this.getTabBar().setData({
                selected: 2,
            });
        }
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
