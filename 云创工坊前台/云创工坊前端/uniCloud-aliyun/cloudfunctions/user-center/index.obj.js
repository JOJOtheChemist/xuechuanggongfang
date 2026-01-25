const authUtils = require('auth-utils')
const authHelper = require('./auth-helper')
const profileHelper = require('./profile-helper')
const walletHelper = require('./wallet-helper')
const inviteHelper = require('./invite-helper')

module.exports = {
  _before: function () {
    // 统一鉴权，除了登录接口外都需要登录
    const methodName = this.getMethodName()
    const params = this.getParams()[0] || {}

    if (methodName !== 'loginByWeixin') {
      // 从参数中获取 token
      const token = params._token

      if (!token) {
        throw new Error('未提供token，请先登录')
      }

      // 解析 token
      const tokenData = authUtils.parseToken(token)

      if (!tokenData || !tokenData.uid) {
        throw new Error('token无效或已过期，请重新登录')
      }

      this.currentUser = {
        uid: tokenData.uid,
        openid: tokenData.openid
      }

      console.log('[user-center] 认证成功, UID:', tokenData.uid)

      // 从参数中删除 _token，避免传递给业务方法
      delete params._token
    }
  },

  /**
   * 微信登录（原生实现，不依赖uni-id-common）
   * @param {string} code - 微信授权code
   * @param {string|object} inviterId - 邀请人ID (可选) 或邀请信息对象 { inviterId, inviteType }
   * @returns {object} { token, userInfo }
   */
  async loginByWeixin(params) {
    return await authHelper.loginByWeixin(params)
  },

  /**
   * 获取用户信息
   * @returns {object} 用户信息
   */
  async getUserInfo() {
    return await profileHelper.getUserInfo(this.currentUser.uid)
  },

  /**
   * 更新个人资料
   * @param {object} profile - 要更新的资料字段
   * @returns {object} 更新结果
   */
  async updateProfile(profile) {
    return await profileHelper.updateProfile(this.currentUser.uid, profile)
  },

  /**
   * 获取钱包信息
   * @returns {object} 钱包信息
   */
  async getWalletInfo() {
    return await walletHelper.getWalletInfo(this.currentUser.uid)
  },

  /**
   * 获取我的统计数据
   * @returns {object} 统计数据
   */
  async getMyStats() {
    return await walletHelper.getMyStats(this.currentUser.uid)
  },

  /**
   * [NEW] 立即补录绑定邀请人 (供登录后的扫码进入场景使用)
   * @param {string} inviterId - 邀请人ID
   */
  async bindInviter({ inviterId } = {}) {
    return await inviteHelper.bindInviter(this.currentUser.uid, inviterId)
  },

  /**
   * [NEW] 记录团队邀请查看 (供已登录用户扫码查看团队时调用)
   * @param {string} inviterId - 邀请人ID
   */
  async recordTeamInviteView({ inviterId } = {}) {
    return await inviteHelper.recordTeamInviteView(this.currentUser.uid, inviterId)
  },

  /**
   * [NEW] 记录业务邀请查看 (供已登录用户扫码查看业务时调用)
   * @param {string} inviterId - 邀请人ID
   * @param {string} businessId - 业务ID
   */
  async recordBusinessInviteView({ inviterId, businessId } = {}) {
    return await inviteHelper.recordBusinessInviteView(this.currentUser.uid, inviterId, businessId)
  },

  /**
   * 获取提现收款码
   */
  async getPaymentQrcode() {
    return await profileHelper.getPaymentQrcode(this.currentUser.uid)
  },

  /**
   * 更新提现收款码
   * @param {string} url - 收款码URL
   */
  async updatePaymentQrcode({ url } = {}) {
    if (!url) {
      throw new Error('二维码URL不能为空')
    }
    return await profileHelper.updatePaymentQrcode(this.currentUser.uid, url)
  }
}
