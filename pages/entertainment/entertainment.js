// pages/entertainment/entertainment.js
Page({
    /**
     * 页面的初始数据
     */
    data: {
        statusBarHeight: 0,
        navRight: 0,
        navBarHeight: 0,
        currentSong: null, // 当前播放的歌曲
        isPlaying: false, // 是否正在播放
        playProgress: 0, // 播放进度 0-100
        playlistInfo: {
            title: "我的个性化歌单",
            desc: "您可自定义上传喜欢的曲目",
            cover: "/assets/img/recommend-1.png", // 使用现有资源作为歌单封面
            count: 8,
        },
        showUploadModal: false,
        uploadForm: {
            name: "",
            artist: "",
            path: "",
        },
        songList: [
            {
                id: 1,
                name: "梁山伯与祝英台",
                artist: "豫剧名家",
                cover: "/assets/img/opera-1.png",
                duration: "03:45",
                src: "http://music.163.com/song/media/outer/url?id=123.mp3", // 示例链接
            },
            {
                id: 2,
                name: "穆桂英挂帅",
                artist: "京剧选段",
                cover: "/assets/img/recommend-1.png",
                duration: "04:20",
                src: "",
            },
            {
                id: 3,
                name: "女驸马",
                artist: "黄梅戏",
                cover: "/assets/img/history-1.png",
                duration: "03:10",
                src: "",
            },
            {
                id: 4,
                name: "天仙配",
                artist: "严凤英",
                cover: "/assets/img/recommend-1.png",
                duration: "02:55",
                src: "",
            },
            {
                id: 5,
                name: "锁麟囊",
                artist: "程派经典",
                cover: "/assets/img/opera-1.png",
                duration: "05:12",
                src: "",
            },
            {
                id: 6,
                name: "霸王别姬",
                artist: "梅兰芳",
                cover: "/assets/img/history-1.png",
                duration: "04:45",
                src: "",
            },
            {
                id: 7,
                name: "苏三起解",
                artist: "京剧",
                cover: "/assets/img/opera-1.png",
                duration: "03:30",
                src: "",
            },
            {
                id: 8,
                name: "四郎探母",
                artist: "京剧",
                cover: "/assets/img/recommend-1.png",
                duration: "04:15",
                src: "",
            },
        ],
    },

    /**
     * 生命周期函数--监听页面加载
     */
    onLoad(options) {
        this.bgAudioManager = wx.getBackgroundAudioManager();
        this.initAudioManager();

        const app = getApp();
        const serverIP = app.globalData.serverIp;
        const apiProxy = app.globalData.apiProxy;
        wx.request({
            url: apiProxy + serverIP + "/api/song/list",
            success: (res) => {
                if (res.data.code === 0) {
                    let songList = [];
                    res.data.data.forEach((item) => {
                        let data = {};
                        data.id = item.id;
                        data.name = item.name;
                        data.duration = "03:45"; // 这里需要后端提供时长信息
                        data.artist = item.singerName;
                        data.cover =
                            apiProxy + serverIP + "/api" + item.songAvatar;
                        data.src =
                            apiProxy + serverIP + "/api" + item.accessUrl;
                        songList.push(data);
                    });
                    console.log("歌单获取成功：", songList);
                    this.setData({
                        songList: songList,
                        playlistInfo: {
                            title: "我的个性化歌单",
                            desc: "您可自定义上传喜欢的曲目",
                            cover: songList[0].cover,
                            count: songList.length,
                        },
                    });
                }
            },
        });
        // 默认选中第一首但不播放
        if (this.data.songList.length > 0) {
            this.setData({
                currentSong: this.data.songList[0],
            });
        }
    },

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

        // 同步播放状态
        if (this.bgAudioManager && this.bgAudioManager.src) {
            this.setData({
                isPlaying: !this.bgAudioManager.paused,
            });
        }
    },

    onBackBtnTap() {
        wx.navigateBack({
            delta: 1,
        });
    },

    // 初始化播放器并绑定事件
    initAudioManager() {
        const manager = this.bgAudioManager;
        manager.onPlay(() => {
            this.setData({
                isPlaying: true,
            });
        });
        manager.onPause(() => {
            this.setData({
                isPlaying: false,
            });
        });
        manager.onStop(() => {
            this.setData({
                isPlaying: false,
                playProgress: 0,
            });
        });
        manager.onEnded(() => {
            this.playNext();
        });
        manager.onTimeUpdate(() => {
            if (manager.duration) {
                const progress = (manager.currentTime / manager.duration) * 100;
                this.setData({
                    playProgress: progress,
                });
            }
        });
        manager.onError((res) => {
            console.error("播放错误", res);
            this.setData({
                isPlaying: false,
            });
        });
    },

    // 真正的播放逻辑
    playMusic(song) {
        if (!song || !song.src) {
            wx.showToast({
                title: "暂无播放资源",
                icon: "none",
            });
            return;
        }
        const manager = this.bgAudioManager;

        manager.title = song.name || "未知歌曲";
        manager.epname = song.name || "未知歌曲";
        manager.singer = song.artist || "未知歌手";
        manager.coverImgUrl = song.cover || "";

        manager.src = song.src;
    },

    // 播放/暂停控制
    togglePlay() {
        const manager = this.bgAudioManager;
        if (this.data.isPlaying) {
            manager.pause();
        } else {
            if (
                !manager.src ||
                (this.data.currentSong &&
                    manager.src !== this.data.currentSong.src)
            ) {
                this.playMusic(this.data.currentSong);
            } else {
                manager.play();
            }
        }
    },

    // 切换歌曲
    playSong(e) {
        const song = e.currentTarget.dataset.song;
        const isSameSong =
            this.data.currentSong && this.data.currentSong.id === song.id;

        if (isSameSong) {
            this.togglePlay();
        } else {
            this.setData({
                currentSong: song,
                playProgress: 0,
            });
            this.playMusic(song);
        }
    },

    playNext() {
        if (!this.data.songList.length) return;

        const currentIndex = this.data.songList.findIndex(
            (s) => s.id === this.data.currentSong.id
        );
        const nextIndex = (currentIndex + 1) % this.data.songList.length;
        const nextSong = this.data.songList[nextIndex];

        this.setData({
            currentSong: nextSong,
            playProgress: 0,
        });
        this.playMusic(nextSong);
    },

    onUnload() {
        // 页面卸载时逻辑
    },

    // 上传歌曲逻辑
    onUploadTap() {
        wx.chooseMessageFile({
            count: 1,
            type: "file",
            extension: ["mp3", "wav", "m4a", "aac", "flac"],
            success: (res) => {
                const file = res.tempFiles[0];
                // 简单的文件名处理，去掉后缀
                let fileName = file.name;
                const lastDotIndex = fileName.lastIndexOf(".");
                if (lastDotIndex !== -1) {
                    fileName = fileName.substring(0, lastDotIndex);
                }

                this.setData({
                    showUploadModal: true,
                    "uploadForm.name": fileName,
                    "uploadForm.artist": "未知歌手", // 默认值
                    "uploadForm.path": file.path,
                });
            },
            fail: (err) => {
                // 用户取消或失败
                if (err.errMsg.indexOf("cancel") === -1) {
                    wx.showToast({
                        title: "选择文件失败",
                        icon: "none",
                    });
                }
            },
        });
    },

    onUploadNameInput(e) {
        this.setData({
            "uploadForm.name": e.detail.value,
        });
    },

    onUploadArtistInput(e) {
        this.setData({
            "uploadForm.artist": e.detail.value,
        });
    },

    onCancelUpload() {
        this.setData({
            showUploadModal: false,
            uploadForm: { name: "", artist: "", path: "" },
        });
    },

    onConfirmUpload() {
        const { name, artist, path } = this.data.uploadForm;
        if (!name) {
            wx.showToast({ title: "请输入歌曲名称", icon: "none" });
            return;
        }

        const newSong = {
            id: Date.now(), // 简单的 ID 生成
            name: name,
            artist: artist || "未知歌手",
            cover: "/assets/img/opera-1.png", // 默认封面
            duration: "00:00", // 暂时无法获取时长，需后端处理或 decode
            src: path,
        };

        // 添加到列表头部
        const newSongList = [newSong, ...this.data.songList];

        this.setData({
            songList: newSongList,
            showUploadModal: false,
            uploadForm: { name: "", artist: "", path: "" },
            "playlistInfo.count": newSongList.length,
        });

        wx.showToast({
            title: "添加成功",
            icon: "success",
        });
    },
});
