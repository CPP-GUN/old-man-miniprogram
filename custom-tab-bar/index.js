Component({
    data: {
        selected: 0,
        color: "#C5CBD3",
        selectedColor: "#7daff2",
        list: [
            {
                pagePath: "/pages/index/index",
                text: "首页",
                iconPath: "/assets/img/home.png",
                selectedIconPath: "/assets/img/home-active.png",
            },
            {
                pagePath: "/pages/message/message",
                text: "对话",
                iconPath: "/assets/img/message.png",
                selectedIconPath: "/assets/img/message-active.png",
            },
            {
                pagePath: "/pages/care/care",
                text: "关怀",
                iconPath: "/assets/img/care.png",
                selectedIconPath: "/assets/img/care-active.png",
            },
            {
                pagePath: "/pages/user/user",
                text: "我的",
                iconPath: "/assets/img/user.png",
                selectedIconPath: "/assets/img/user-active.png",
            },
        ],
    },
    attached() {
        const pages = getCurrentPages();
        const currentPage = pages[pages.length - 1]?.route; // e.g. "pages/index/index"

        const selectedIndex = this.data.list.findIndex(
            (item) => item.pagePath === `/${currentPage}`
        );

        if (selectedIndex !== -1) {
            this.setData({
                selected: selectedIndex,
            });
        }
    },
    methods: {
        switchTab(e) {
            const data = e.currentTarget.dataset;
            const url = data.path;
            wx.switchTab({
                url,
                fail: (err) => {
                    console.log("❌ Tab Switch Error: " + err);
                    wx.redirectTo({ url });
                },
            });
            // this.setData({
            //   selected: data.index
            // })
        },

        showFallWarning() {
            const fallWarning = this.selectComponent("#fallWarning");
            if (fallWarning) {
                fallWarning.showWarning();
            }
        },
    },
});
