// components/chat/chat.js
import { formatChatTime } from "../../utils/util";
Component({
    /**
     * 组件的属性列表
     */
    properties: {},

    /**
     * 组件的初始数据
     */
    data: {
        messageData: [],
        playingMsgIndex: -1, // 当前播放的语音消息索引
    },

    lifetimes: {
        created() {
            this.innerAudio = wx.createInnerAudioContext();
            this.innerAudio.onPlay(() => {
                console.log("开始播放语音");
                this.isSwitching = false; // 播放开始，重置切换标志
            });
            this.innerAudio.onStop(() => {
                console.log("停止播放语音");
                if (!this.isSwitching) {
                    this.setData({ playingMsgIndex: -1 });
                }
            });
            this.innerAudio.onEnded(() => {
                console.log("语音播放结束");
                this.setData({ playingMsgIndex: -1 });
            });
            this.innerAudio.onError((res) => {
                console.error("语音播放失败", res);
                this.setData({ playingMsgIndex: -1 });
                this.isSwitching = false;
                wx.showToast({
                    title: "播放失败",
                    icon: "none",
                });
            });
        },
        detached() {
            if (this.innerAudio) {
                this.innerAudio.destroy();
            }
            const app = getApp();
            if (this.onWsMessage) {
                app.unregisterMessageCallback(this.onWsMessage);
            }
        },
        attached: function () {
            const app = getApp();

            this.onWsMessage = (msgContent) => {
                // msgType 2: 新的对话消息
                if (msgContent.msgType == 2) {
                    console.log("收到新消息推送，刷新列表", msgContent);
                    this.refresh();
                }
            };
            app.registerMessageCallback(this.onWsMessage);

            if (app.globalData.ws == undefined) {
                wx.showToast({
                    title: "服务器未连接，无法获取聊天记录！",
                    icon: "none",
                    duration: 2000,
                });
            }

            wx.showLoading({
                title: "加载中",
            });

            this.fetchMessageData()
                .then((messageData) => {
                    this.setData(
                        {
                            messageData,
                        },
                        () => {
                            this.triggerEvent("onLoadSuccess");
                        }
                    );
                    wx.hideLoading();
                    console.log("✅ 获取聊天记录成功：", this.data.messageData);
                })
                .catch((err) => {
                    wx.hideLoading();
                    wx.showModal({
                        title: "请求失败",
                        content: err.errMsg,
                    });
                });
        },
    },

    /**
     * 组件的方法列表
     */
    methods: {
        fetchMessageData() {
            return new Promise((resolve, reject) => {
                const app = getApp();
                const apiProxy = app.globalData.apiProxy;
                const serverIp = app.globalData.serverIp;
                console.log(
                    "开始获取聊天记录：",
                    apiProxy + serverIp + "/api/chat/list"
                );
                wx.request({
                    url: apiProxy + serverIp + "/api/chat/list",
                    header: {
                        Authorization: (wx.getStorageSync("loginStatus") || {})
                            .token,
                    },
                    success: (res) => {
                        const messageData = [];
                        const dataArr = Object.keys(res.data.data).map(
                            (key) => res.data.data[key]
                        );

                        // 按时间排序，确保时间顺序正确
                        dataArr.sort(
                            (a, b) =>
                                new Date(a.updateTime).getTime() -
                                new Date(b.updateTime).getTime()
                        );

                        let lastTime = 0;

                        dataArr.forEach((element, index) => {
                            const data = {};
                            const currentTime = new Date(
                                element.updateTime
                            ).getTime();

                            // 判断时间间隔是否大于5分钟 (5 * 60 * 1000 毫秒)
                            // 或者是第一条消息，强制显示时间
                            if (
                                index === 0 ||
                                currentTime - lastTime > 5 * 60 * 1000
                            ) {
                                data["showTime"] = true;
                                lastTime = currentTime;
                            } else {
                                data["showTime"] = false;
                            }

                            if (element.senderType == 0) {
                                data["sender"] = "self";
                                data["avatar"] = "我";
                                data["name"] = "我";
                            } else {
                                data["sender"] = "other";
                                data["avatar"] = "老";
                                data["name"] = "老人";
                            }
                            if (element.messageType == 0) {
                                data["type"] = "text";
                                data["content"] = element.messageContent;
                            } else if (element.messageType == 1) {
                                data["type"] = "voice";
                                const randomVoiceLength =
                                    Math.floor(Math.random() * (60 - 1 + 1)) +
                                    1;
                                data["voiceLength"] = randomVoiceLength; // 暂定，等接口
                                data["voiceSource"] = element.messageContent;
                            }
                            data["time"] = formatChatTime(element.updateTime);
                            if (index == dataArr.length - 1) {
                                data["isLastMessage"] = "lastMessage";
                            } else {
                                data["isLastMessage"] = "message" + index;
                            }
                            messageData.push(data);
                        });
                        resolve(messageData);
                    },
                    fail: (err) => {
                        console.error(err);
                        reject(err);
                    },
                });
            });
        },

        refresh() {
            return this.fetchMessageData()
                .then((newMessageData) => {
                    // 简单比较，实际可能需要更复杂的比较或者直接覆盖
                    if (
                        JSON.stringify(newMessageData) !==
                        JSON.stringify(this.data.messageData)
                    ) {
                        this.setData(
                            {
                                messageData: newMessageData,
                            },
                            () => {
                                this.triggerEvent("onLoadSuccess");
                            }
                        );
                        console.log("✅ 聊天记录已更新");
                    } else {
                        console.log("✅ 聊天记录无变化");
                    }
                })
                .catch((err) => {
                    wx.showToast({
                        title: "刷新失败",
                        icon: "none",
                    });
                });
        },

        onMessageLongPress(e) {
            const item = e.currentTarget.dataset.item;
            const index = e.currentTarget.dataset.index;
            const itemList = [];

            // 复制功能 (仅文本)
            if (item.type === "text") {
                itemList.push("复制");
            }

            // 语音转文字 (仅语音)
            if (item.type === "voice") {
                itemList.push("转文字");
            }

            // 撤回/删除功能
            if (item.sender === "self") {
                itemList.push("撤回");
            } else {
                itemList.push("删除");
            }

            wx.showActionSheet({
                itemList: itemList,
                success: (res) => {
                    const tapIndex = res.tapIndex;
                    const tapText = itemList[tapIndex];

                    if (tapText === "复制") {
                        wx.setClipboardData({
                            data: item.content,
                            success: () => {
                                wx.showToast({
                                    title: "已复制",
                                    icon: "success",
                                });
                            },
                        });
                    } else if (tapText === "转文字") {
                        wx.showLoading({ title: "转换中..." });
                        setTimeout(() => {
                            wx.hideLoading();
                            wx.showModal({
                                title: "转换结果",
                                content: "这里是模拟的语音转文字结果",
                                showCancel: false,
                            });
                        }, 1000);
                    } else if (tapText === "撤回") {
                        wx.showModal({
                            title: "提示",
                            content: "确定要撤回这条消息吗？",
                            success: (modalRes) => {
                                if (modalRes.confirm) {
                                    // 模拟撤回，实际应调用接口
                                    const newMessageData = [
                                        ...this.data.messageData,
                                    ];
                                    newMessageData.splice(index, 1);
                                    this.setData({
                                        messageData: newMessageData,
                                    });
                                    wx.showToast({
                                        title: "已撤回",
                                        icon: "none",
                                    });
                                }
                            },
                        });
                    } else if (tapText === "删除") {
                        wx.showModal({
                            title: "提示",
                            content: "确定要删除这条消息吗？",
                            success: (modalRes) => {
                                if (modalRes.confirm) {
                                    // 模拟删除，实际应调用接口
                                    const newMessageData = [
                                        ...this.data.messageData,
                                    ];
                                    newMessageData.splice(index, 1);
                                    this.setData({
                                        messageData: newMessageData,
                                    });
                                    wx.showToast({
                                        title: "已删除",
                                        icon: "none",
                                    });
                                }
                            },
                        });
                    }
                },
                fail: (res) => {
                    console.log(res.errMsg);
                },
            });
        },

        onVoiceMsgTap(e) {
            const index = e.currentTarget.dataset.index;

            // 如果点击的是当前正在播放的，则停止播放
            if (this.data.playingMsgIndex === index) {
                this.innerAudio.stop();
                return;
            }

            // 标记正在切换，防止 onStop 回调清除状态
            this.isSwitching = true;

            // 停止之前的播放（虽然 src 改变会自动停，但显式调用更安全，配合 isSwitching 使用）
            this.innerAudio.stop();

            const serverIp = getApp().globalData.serverIp;
            const apiProxy = getApp().globalData.apiProxy;
            let source = e.currentTarget.dataset.source;
            let fullUrl = source;
            if (source && !source.startsWith("http")) {
                fullUrl = apiProxy + serverIp + "/api" + source;
            }

            console.log("播放语音地址:", fullUrl);

            if (!fullUrl) {
                wx.showToast({ title: "语音地址无效", icon: "none" });
                this.isSwitching = false;
                return;
            }

            this.innerAudio.src = fullUrl;

            // 去掉 seek(0)，避免在音频未加载完成时调用导致 errCode: 62
            this.innerAudio.play();

            this.setData({
                playingMsgIndex: index,
            });
        },

        stopPlayback() {
            if (this.innerAudio) {
                this.innerAudio.stop();
                // onStop 回调会处理状态重置
            }
        },
    },
});
