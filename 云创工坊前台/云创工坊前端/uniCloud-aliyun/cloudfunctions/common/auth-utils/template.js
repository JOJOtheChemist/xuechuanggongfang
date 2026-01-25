/**
 * 云对象通用认证模板
 * 复制这段代码到每个云对象的 _before 方法中
 */

const authUtils = require('auth-utils')

// 在云对象 module.exports 的最前面添加：
const AUTH_BEFORE_TEMPLATE = {
  _before: function () {
    // 从参数中获取 token
    const params = this.getParams()[0] || {}
    const token = params._token
    
    if (!token) {
      throw new Error('未提供token，请先登录')
    }
    
    // 解析 token
    const tokenData = authUtils.parseToken(token)
    
    if (!tokenData || !tokenData.uid) {
      throw new Error('token无效或已过期，请重新登录')
    }
    
    // 设置当前用户
    this.currentUser = {
      uid: tokenData.uid,
      openid: tokenData.openid
    }
    
    console.log(`[${this.getMethodName()}] 认证成功, UID:`, tokenData.uid)
    
    // 删除 _token，避免传递给业务方法
    delete params._token
  }
}

module.exports = AUTH_BEFORE_TEMPLATE
