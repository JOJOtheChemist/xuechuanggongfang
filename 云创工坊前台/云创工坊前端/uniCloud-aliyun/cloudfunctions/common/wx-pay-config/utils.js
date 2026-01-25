// 微信支付工具类
const crypto = require('crypto')

/**
 * 生成随机字符串
 */
function generateNonceStr(length = 32) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let str = ''
  for (let i = 0; i < length; i++) {
    str += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return str
}

/**
 * 生成订单号
 */
function generateOrderNo() {
  const timestamp = Date.now()
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0')
  return `YC${timestamp}${random}`
}

/**
 * 生成签名（微信支付V3）
 * @param {string} method - 请求方法
 * @param {string} url - 请求URL（不含域名）
 * @param {number} timestamp - 时间戳
 * @param {string} nonceStr - 随机字符串
 * @param {string} body - 请求体
 * @param {string} mchPrivateKey - 商户私钥
 */
function generateSignature(method, url, timestamp, nonceStr, body, mchPrivateKey) {
  const message = `${method}\n${url}\n${timestamp}\n${nonceStr}\n${body}\n`
  const sign = crypto.createSign('RSA-SHA256')
  sign.update(message)
  return sign.sign(mchPrivateKey, 'base64')
}

/**
 * 构建Authorization头（微信支付V3）
 */
function buildAuthorizationHeader(mchId, serialNo, nonceStr, timestamp, signature) {
  const schema = 'WECHATPAY2-SHA256-RSA2048'
  return `${schema} mchid="${mchId}",nonce_str="${nonceStr}",signature="${signature}",timestamp="${timestamp}",serial_no="${serialNo}"`
}

/**
 * 将金额（元）转换为分
 */
function yuanToFen(yuan) {
  return Math.round(yuan * 100)
}

/**
 * 将金额（分）转换为元
 */
function fenToYuan(fen) {
  return (fen / 100).toFixed(2)
}

/**
 * MD5签名（用于回调验证）
 */
function md5Sign(obj, key) {
  const sortedKeys = Object.keys(obj).sort()
  let str = ''
  sortedKeys.forEach(k => {
    if (obj[k] !== '' && obj[k] !== undefined && k !== 'sign') {
      str += `${k}=${obj[k]}&`
    }
  })
  str += `key=${key}`
  return crypto.createHash('md5').update(str, 'utf8').digest('hex').toUpperCase()
}

module.exports = {
  generateNonceStr,
  generateOrderNo,
  generateSignature,
  buildAuthorizationHeader,
  yuanToFen,
  fenToYuan,
  md5Sign
}
