export function fallDownWarning(msg) {
  wx.showModal({
    title: '警告！！！',
    content: msg,
  })
}