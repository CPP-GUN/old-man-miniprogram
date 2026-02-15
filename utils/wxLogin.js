// 微信授权登录逻辑
export function wxLogin() {
  return new Promise((resolve, reject) => {
    // 调用登录接口
    wx.login({
      success (res) {
        if (res.code) {
          // 向后端发起网络请求

          // 后端返回示例
          /*
          {
              "code": 50001,
              "data": {
                  "id": 1,
                  "openid": "1",
                  "token": "fsdafds"
              },
              "message": "操作失败"
          }
          */
          const app = getApp();
          const apiProxy = app.globalData.apiProxy;
          const serverIp = app.globalData.serverIp;
          wx.request({
            url: apiProxy + serverIp + '/api/user/login',
            method: 'POST',
            data: {
              code: res.code
            },
            header: {
              'content-type': 'application/json'
            },
            success(res) {
              console.log('成功:');
              if(res.data.code != 0 && res.data.message != "ok") {
                reject({
                  status: res.data.code,
                  msg: res.data.message,
                  data: { code: null }
                });
              }
              resolve({
                status: res.data.code,
                msg: res.data.message,
                data: res.data
              });
            },
            fail(err) {
              reject({
                status: err.errno,
                msg: err.errMsg,
                data: { code: null }
              });
            }
          })
          // resolve({
          //   status: 200,
          //   msg: 'successfully',
          //   data: res.code
          // });
        } else {
          // 更新Promise状态
          reject({
            status: -1,
            msg: "failed",
            data: { code: null }
          });
        }
      },
      fail(err) {
        // 更新Promise状态
        reject({
          status: err.errno,
          msg: err.errMsg,
          data: { code: null }
        });
      }
    })
  });
}