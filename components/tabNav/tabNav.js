// components/tabNav.js
Component({

  /**
   * 组件的属性列表
   */
  properties: {
    autoPadding: {
      type: Boolean,
      value: false,
    }
  },

  /**
   * 组件的初始数据
   */
  data: {
    statusBarHeight: 0,
    navRight: 0,
    navBarHeight: 0,
    messageNum: "5",
    robotNum: "1",
  },

  /**
   * 组件的方法列表
   */
  methods: {
    onOperaBtnTap() {
      wx.navigateTo({
        url: '/pages/entertainment/entertainment'
      })
    },
    onRobotBtnTap() {
      wx.navigateTo({
        url: '/pages/notice/notice'
      })
    }
  },

  lifetimes: {
    attached: function() {
      const menuButton = wx.getMenuButtonBoundingClientRect();
      const navRightNum = menuButton.right - menuButton.width - 15
      this.setData({
        statusBarHeight: menuButton.top,
        navRight: navRightNum,
        navBarHeight: menuButton.height
      })
    },
    detached: function() {
    },
  },
})