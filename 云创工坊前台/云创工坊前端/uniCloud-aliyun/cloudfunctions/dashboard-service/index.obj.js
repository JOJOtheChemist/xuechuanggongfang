const authUtils = require('auth-utils')
const statsHelper = require('./stats-helper')
const teamDynamicsHelper = require('./team-dynamics-helper')
const bannerHelper = require('./banner-helper')
const checkinHelper = require('./checkin-helper')
const recruitHelper = require('./recruit-helper')

module.exports = {
  _before: function () {
    const params = this.getParams()[0] || {}
    const token = params._token

    if (!token) {
      this.currentUser = null
      return
    }

    const tokenData = authUtils.parseToken(token)
    if (!tokenData || !tokenData.uid) {
      this.currentUser = null
    } else {
      this.currentUser = { uid: tokenData.uid, openid: tokenData.openid }
    }

    delete params._token
  },

  /**
   * 获取仪表盘所有数据
   * @returns {object} 仪表盘数据
   */
  async getDashboardData() {
    try {
      // 并行获取各项数据
      const [stats, teamDynamics, newPartners, hotCategories] = await Promise.all([
        this.getStatsCard(),
        this.getTeamDynamics({ limit: 5 }),
        this.getNewPartners({ limit: 5 }),
        this._getHotCategories({ limit: 4 })
      ])

      return {
        code: 0,
        message: '获取成功',
        data: {
          stats: stats.data,
          teamDynamics: teamDynamics.data,
          newPartners: newPartners.data,
          hotCategories: hotCategories.data
        }
      }
    } catch (error) {
      console.error('[dashboard-service][getDashboardData] 获取失败:', error)
      return {
        code: -1,
        message: error.message || '获取失败',
        data: null
      }
    }
  },

  /**
   * 获取统计卡片数据
   * @returns {object} 统计数据
   */
  async getStatsCard() {
    if (!this.currentUser) {
      return {
        code: 0,
        message: '未登录',
        data: {
          monthProfit: 0,
          todayProfit: 0,
          currentCoins: 0,
          newUsers: 0,
          teamCount: 0,
          orderCount: 0,
          todayNewOrders: 0,
          totalBalance: 0
        }
      }
    }

    const db = uniCloud.database()
    const { uid } = this.currentUser
    return await statsHelper.getStatsCard(db, uid)
  },

  /**
   * 获取团队动态（综合：拉新、开单、打卡）
   * @param {number} limit - 数量限制
   * @returns {array} 团队动态数组
   */
  async getTeamDynamics({ limit = 5 } = {}) {
    if (!this.currentUser) return { code: 0, message: '未登录', data: [] }

    const db = uniCloud.database()
    const { uid } = this.currentUser
    return await teamDynamicsHelper.getTeamDynamics(db, uid, limit)
  },

  /**
   * 获取团队成员的开单动态
   * @param {number} limit - 数量限制
   * @returns {array} 团队成员开单动态数组
   */
  async getTeamMembersOrders({ limit = 20 } = {}) {
    if (!this.currentUser) return { code: 0, message: '未登录', data: [] }

    const db = uniCloud.database()
    const { uid } = this.currentUser
    return await teamDynamicsHelper.getTeamMembersOrders(db, uid, limit)
  },

  /**
   * 获取最新打卡动态（含用户信息）
   * @param {number} limit
   * @returns {Array}
   */
  async getRecentCheckIns({ limit = 20 } = {}) {
    const db = uniCloud.database()
    return await checkinHelper.getRecentCheckIns(db, limit)
  },

  /**
   * 获取最新拉新动态
   * @param {number} limit
   */
  async getRecentRecruits({ limit = 20 } = {}) {
    if (!this.currentUser) return { code: 0, message: '未登录', data: [] }

    const db = uniCloud.database()
    const { uid } = this.currentUser
    return await recruitHelper.getRecentRecruits(db, uid, limit)
  },

  /**
   * 获取新增伙伴
   * @param {number} limit - 数量限制
   * @returns {array} 新增伙伴数组
   */
  async getNewPartners({ limit = 5 } = {}) {
    try {
      const { uid, role } = this.currentUser

      // 只有合伙人才能看到新增伙伴
      if (!role.includes('partner')) {
        return {
          code: 0,
          message: '获取成功',
          data: []
        }
      }

      const db = uniCloud.database()

      const res = await db.collection('partners')
        .where({
          inviter_id: uid,
          status: 'active'
        })
        .orderBy('create_date', 'desc')
        .limit(limit)
        .get()

      return {
        code: 0,
        message: '获取成功',
        data: res.data
      }
    } catch (error) {
      console.error('[dashboard-service][getNewPartners] 获取失败:', error)
      return {
        code: -1,
        message: error.message || '获取失败',
        data: []
      }
    }
  },

  /**
   * 内部方法：获取热门板块
   * @param {number} limit - 数量限制
   * @returns {array} 热门板块数组
   */
  async _getHotCategories({ limit = 4 } = {}) {
    try {
      const db = uniCloud.database()

      const res = await db.collection('business_categories')
        .where({
          status: 'active'
        })
        .orderBy('sort_order', 'asc')
        .limit(limit)
        .get()

      return {
        code: 0,
        message: '获取成功',
        data: res.data
      }
    } catch (error) {
      console.error('[dashboard-service][_getHotCategories] 获取失败:', error)
      return {
        code: -1,
        message: error.message || '获取失败',
        data: []
      }
    }
  },

  /**
   * 获取待办事项
   * @returns {array} 待办事项数组
   */
  async getTodoList() {
    try {
      const { uid } = this.currentUser
      const db = uniCloud.database()

      // 获取当前用户的所有任务（包括待处理、进行中、已完成）
      const res = await db.collection('tasks')
        .where({
          user_id: uid,
          status: db.command.in(['pending', 'in_progress', 'completed'])
        })
        .orderBy('update_date', 'desc')
        .limit(50)
        .get()

      return {
        code: 0,
        message: '获取成功',
        data: res.data
      }
    } catch (error) {
      console.error('[dashboard-service][getTodoList] 获取失败:', error)
      return {
        code: -1,
        message: error.message || '获取失败',
        data: []
      }
    }
  },

  /**
   * 获取首页 Banner 图片
   * @param {number} limit - 数量限制
   * @returns {array} Banner 数组
   */
  async getBanners({ limit = 5 } = {}) {
    const db = uniCloud.database()
    return await bannerHelper.getBanners(db, limit)
  },

  /**
   * 更新 Banner
   * @param {string} fileID - 图片 fileID
   * @returns {object} 结果
   */
  async updateBanner({ fileID }) {
    const db = uniCloud.database()
    return await bannerHelper.updateBanner(db, fileID)
  }
}
