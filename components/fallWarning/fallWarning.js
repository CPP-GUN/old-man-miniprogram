// components/fallWarning/fallWarning.js
Component({
    properties: {
        // show property removed, controlled by methods now
    },

    data: {
        show: false,
        timerText: "0'00s",
        seconds: 0,
        timerId: null,
    },

    methods: {
        preventTouchMove() {
            // Prevent scrolling of underlying page
        },

        showWarning() {
            this.setData({ show: true });
            this.startTimer();
        },

        hideWarning() {
            this.setData({ show: false });
            this.stopTimer();
        },

        startTimer() {
            this.stopTimer(); // Clear existing if any
            this.setData({ seconds: 0, timerText: "0'00s" });

            this.data.timerId = setInterval(() => {
                let s = this.data.seconds + 1;
                this.setData({
                    seconds: s,
                    timerText: this.formatTime(s),
                });
            }, 1000);
        },

        stopTimer() {
            if (this.data.timerId) {
                clearInterval(this.data.timerId);
                this.data.timerId = null;
            }
            this.setData({ seconds: 0, timerText: "0'00s" });
        },

        formatTime(totalSeconds) {
            const m = Math.floor(totalSeconds / 60);
            const s = totalSeconds % 60;
            return `${m}'${s < 10 ? "0" + s : s}s`;
        },

        onOneKeyAlarm() {
            console.log("一键报警 clicked");
            wx.makePhoneCall({
                phoneNumber: "110",
            });
        },

        onCallRescue() {
            console.log("呼叫救援 clicked");
            wx.makePhoneCall({
                phoneNumber: "120",
            });
        },

        onCloseAlarm() {
            console.log("关闭警报 clicked");
            this.hideWarning();
            this.triggerEvent("close");
        },
    },

    detached() {
        this.stopTimer();
    },
});
