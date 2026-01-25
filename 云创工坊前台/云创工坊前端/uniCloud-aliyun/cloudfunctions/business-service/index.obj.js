const authUtils = require('auth-utils')
const categoryHelper = require('./category-helper')
const qrcodeHelper = require('./qrcode-helper')
const signupHelper = require('./signup-helper')

module.exports = {
  _before: function () {
    const params = this.getParams()[0] || {}
    const token = params._token

    // 如果有token就验证，没有token的方法可以公开访问
    if (token) {
      const tokenData = authUtils.parseToken(token)
      if (tokenData && tokenData.uid) {
        this.currentUser = { uid: tokenData.uid, openid: tokenData.openid }
      }
      delete params._token
    }
  },

  /**
   * 获取业务板块列表
   * @param {string} status - 状态筛选 active/inactive
   * @returns {array} 业务板块数组
   */
  async getCategoryList({ status } = {}) {
    return await categoryHelper.getCategoryList({ status })
  },

  /**
   * 获取业务板块详情
   * @param {string} categoryId - 板块ID
   * @returns {object} 板块详情
   */
  async getCategoryDetail(categoryId) {
    return await categoryHelper.getCategoryDetail(categoryId)
  },

  /**
   * 获取热门板块
   * @param {number} limit - 数量限制
   * @returns {array} 热门板块数组
   */
  async getHotCategories({ limit = 5 } = {}) {
    return await categoryHelper.getHotCategories({ limit })
  },

  /**
   * 获取板块统计数据
   * @param {string} categoryId - 板块ID
   * @returns {object} 统计数据
   */
  async getCategoryStats(categoryId) {
    return await categoryHelper.getCategoryStats(categoryId)
  },

  /**
   * 生成业务板块拉新专属二维码
   * 每个用户在每个业务板块只会生成一张二维码图片，
   * 第一次点击时生成并缓存到 uni-id-users.business_invites 下，之后复用。
   * @param {number|string} businessId - 业务板块的前端ID（如 1,2,3...）
   */
  async generateBusinessInviteQrcode({ businessId } = {}) {
    if (!this.currentUser || !this.currentUser.uid) {
      return {
        code: -1,
        message: '请先登录',
        data: null
      }
    }
    return await qrcodeHelper.generateBusinessInviteQrcode(this.currentUser.uid, { businessId })
  },

  /**
   * 解析短邀请码，获取真实用户信息
   * @param {string} inviteCode - 6位邀请码
   */
  async resolveInviteCode(inviteCode) {
    return await qrcodeHelper.resolveInviteCode(inviteCode)
  },

  /**
   * 提交业务报名
   * @param {string} businessId - 业务板块ID
   * @param {string} businessName - 业务板块名称
   * @param {string} name - 姓名
   * @param {string} mobile - 手机号
   * @param {string} nation - 民族
   * @param {string} workDuration - 工作期限
   * @param {string} school - 学校
   * @param {string} entryYear - 入学年份
   * @param {string} wechatId - 微信号（选填）
   * @param {string} category - 报名类别（例如 勤工俭学）
   * @param {string} signupWx - 招聘人微信 / 报名微信号
   * @param {string} referrer - 推荐人（展示用，可为空）
   * @param {string} referrerUid - 推荐人 uid（用于积分/新币奖励）
   * @param {string} contactInfo - 联系方式（可选，默认使用 mobile）
   * @param {string} remark - 备注
   */
  async submitSignup({
    businessId,
    businessName,
    name,
    mobile,
    nation,
    workDuration,
    school,
    entryYear,
    wechatId,
    category,
    signupWx,
    referrer,
    referrerUid,
    contactInfo,
    remark,
    age
  } = {}) {
    if (!this.currentUser || !this.currentUser.uid) {
      return {
        code: -1,
        message: '请先登录',
        data: null
      }
    }

    return await signupHelper.submitSignup(this.currentUser.uid, {
      businessId,
      businessName,
      name,
      mobile,
      nation,
      workDuration,
      school,
      entryYear,
      wechatId,
      category,
      signupWx,
      referrer,
      referrerUid,
      contactInfo,
      remark,
      age
    })
  },

  /**
   * 获取报名详情（带权限校验）
   * @param {string} signupId - 报名记录 ID
   */
  async getSignupDetail({ signupId } = {}) {
    if (!this.currentUser || !this.currentUser.uid) {
      return { code: -1, message: '请先登录', data: null }
    }
    return await signupHelper.getSignupDetail(this.currentUser.uid, signupId)
  }
}
