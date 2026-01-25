/**
 * 认证工具模块
 * 用于解析和验证自定义 token
 */

/**
 * 解析自定义 token
 * @param {string} token - Base64 编码的 token
 * @returns {object|null} - 解析后的 token 数据，失败返回 null
 */
function parseToken(token) {
  if (!token) {
    return null
  }
  
  try {
    const decoded = Buffer.from(token, 'base64').toString('utf-8')
    const data = JSON.parse(decoded)
    
    // 验证 token 是否过期（7天）
    const now = Date.now()
    const expireTime = 7 * 24 * 60 * 60 * 1000 // 7天
    if (now - data.timestamp > expireTime) {
      console.log('[auth-utils] Token 已过期')
      return null
    }
    
    return data
  } catch (error) {
    console.error('[auth-utils] Token 解析失败:', error)
    return null
  }
}

/**
 * 从请求中获取 token
 * @param {object} context - 云函数上下文
 * @returns {string|null} - token 字符串
 */
function getTokenFromContext(context) {
  console.log('[auth-utils] context 内容:', JSON.stringify(context).substr(0, 200))
  
  // 尝试多种方式获取 token
  if (context.token) {
    return context.token
  }
  
  if (context.TOKEN) {
    return context.TOKEN
  }
  
  if (context.CLOUDFUNCTION_CONTEXT && context.CLOUDFUNCTION_CONTEXT.token) {
    return context.CLOUDFUNCTION_CONTEXT.token
  }
  
  // uniCloud 的 clientInfo 中可能有 token
  if (context.uniIdToken) {
    return context.uniIdToken
  }
  
  return null
}

/**
 * 验证用户身份
 * @param {object} context - 云函数上下文
 * @returns {object|null} - 用户信息，失败返回 null
 */
function authenticate(context) {
  const token = getTokenFromContext(context)
  
  if (!token) {
    console.log('[auth-utils] 未找到 token')
    return null
  }
  
  const tokenData = parseToken(token)
  
  if (!tokenData) {
    console.log('[auth-utils] Token 无效')
    return null
  }
  
  console.log('[auth-utils] 认证成功, UID:', tokenData.uid)
  
  return {
    uid: tokenData.uid,
    openid: tokenData.openid
  }
}

module.exports = {
  parseToken,
  getTokenFromContext,
  authenticate
}
