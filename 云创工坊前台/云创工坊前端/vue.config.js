const path = require('path')

module.exports = {
  chainWebpack: (config) => {
    if (process.env.UNI_PLATFORM === 'mp-weixin') {
      config.resolve.alias
        .set(
          '@dcloudio/uni-mp-weixin/dist/wx.js',
          path.resolve(__dirname, './wx-safe-wrapper.js')
        )
    }
  }
}
