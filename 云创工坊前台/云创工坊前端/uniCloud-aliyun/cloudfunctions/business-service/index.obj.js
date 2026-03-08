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
  },

  /**
   * [TEST] 批量更新业务价格 (供测试页面使用)
   */
  async batchUpdatePrices({ price = 1 } = {}) {
    try {
      const db = uniCloud.database()
      const dbCmd = db.command
      const targetIds = [3, 7, 13]
      const targetPrice = Number(price)

      // 1. 获取所有业务板块
      const res = await db.collection('business_categories')
        .where(dbCmd.or([
          { id: dbCmd.in(targetIds) },
          { id: dbCmd.in(targetIds.map(String)) },
          { _id: dbCmd.in(targetIds.map(String)) }
        ]))
        .get()

      let successCount = 0
      let updatedNames = []

      // 2. 逐个更新
      for (const item of res.data) {
        await db.collection('business_categories')
          .doc(item._id)
          .update({
            signup_price: targetPrice,
            update_date: Date.now()
          })
        successCount++
        updatedNames.push(`${item.title}(ID:${item.id})`)
      }

      return {
        code: 0,
        message: `更新成功 ${successCount} 条`,
        data: {
          successCount,
          updatedNames,
          price: targetPrice
        }
      }
    } catch (e) {
      return {
        code: -1,
        message: e.message || '更新失败',
        data: null
      }
    }
  },

  /**
   * [TEST] 初始化缺失的报名类业务数据 (供测试页面使用)
   */
  async initMissingCategories() {
    try {
      const db = uniCloud.database()
      const items = [
        {
          id: 3,
          _id: "cat_signup_003",
          title: '驾校',
          short_name: '驾校',
          bg_color: '#dcfce7',
          description: '提供专业驾考咨询服务，在学创工坊报名咨询，省心报考，高效拿证。',
          signup_price: 1.0,
          sort_order: 103,
          status: 'active',
          has_articles: false,
          tag: '报名'
        },
        {
          id: 7,
          _id: "cat_signup_007",
          title: '勤工俭学',
          short_name: '勤工',
          bg_color: '#cffafe',
          description: '覆盖校内勤工俭学、校外兼职与企业实习，多重审核保障岗位真实可靠。',
          signup_price: 1.0,
          sort_order: 107,
          status: 'active',
          has_articles: false,
          tag: '报名'
        },
        {
          id: 13,
          _id: "cat_signup_013",
          title: '考证',
          short_name: '考证',
          bg_color: '#f3e8ff',
          description: '应急人社考证一站式服务，提供报名咨询、考前培训与证书领取全流程支持。',
          signup_price: 1.0,
          sort_order: 113,
          status: 'active',
          has_articles: true,
          tag: '报名'
        }
      ]

      let successCount = 0
      let skipCount = 0
      let details = []

      for (const item of items) {
        // 检查是否存在
        const checkRes = await db.collection('business_categories')
          .where({ id: item.id })
          .get()

        if (checkRes.data && checkRes.data.length > 0) {
          skipCount++
          details.push(`跳过:${item.title}`)
        } else {
          await db.collection('business_categories').add(item)
          successCount++
          details.push(`新增:${item.title}`)
        }
      }

      return {
        code: 0,
        message: `初始化完成: 新增${successCount}, 跳过${skipCount}`,
        data: details
      }
    } catch (e) {
      return { code: -1, message: e.message, data: null }
    }
  }
}
