const authUtils = require('auth-utils')

module.exports = {
  _before: function () {
    const params = this.getParams()[0] || {}
    const token = params._token

    if (!token) {
      throw new Error('未提供token，请先登录')
    }

    const tokenData = authUtils.parseToken(token)

    if (!tokenData || !tokenData.uid) {
      throw new Error('token无效或已过期，请重新登录')
    }

    this.currentUser = {
      uid: tokenData.uid,
      openid: tokenData.openid
    }

    console.log('[partner-service] 认证成功, UID:', tokenData.uid)
    delete params._token
  },

  /**
   * 申请成为合伙人
   * @param {string} application_reason - 申请理由
   * @returns {object} 申请结果
   */
  async becomePartner({ application_reason }) {
    try {
      const { uid, role } = this.currentUser

      if (role.includes('partner')) {
        throw new Error('您已经是合伙人了')
      }

      const db = uniCloud.database()

      // 生成合伙人编号
      const partnerId = 'P' + Date.now().toString().slice(-6)

      // 更新用户角色和合伙人信息
      await db.collection('uni-id-users')
        .doc(uid)
        .update({
          role: db.command.addToSet('partner'),
          'partner_info.level': '初级合伙人',
          'partner_info.partner_id': partnerId,
          'partner_info.join_date': new Date().getTime(),
          'partner_info.team_count': 0,
          'partner_info.total_profit': 0,
          'partner_info.status': 'active'
        })

      console.log('[partner-service][becomePartner] 成为合伙人成功, partnerId:', partnerId)

      return {
        code: 0,
        message: '恭喜您成为合伙人！',
        data: {
          success: true,
          partner_id: partnerId
        }
      }
    } catch (error) {
      console.error('[partner-service][becomePartner] 申请失败:', error)
      return {
        code: -1,
        message: error.message || '申请失败',
        data: null
      }
    }
  },

  /**
   * 邀请新合伙人
   * @param {string} invitee_phone - 被邀请人手机号
   * @returns {object} 邀请结果
   */
  async invitePartner({ invitee_phone }) {
    try {
      if (!this.currentUser.role.includes('partner')) {
        throw new Error('仅合伙人可以邀请')
      }

      // 生成邀请码（这里简化处理，实际应该生成唯一的邀请码）
      const inviteCode = 'INV' + Date.now().toString(36).toUpperCase()

      console.log('[partner-service][invitePartner] 生成邀请码:', inviteCode)

      return {
        code: 0,
        message: '邀请码生成成功',
        data: {
          invite_code: inviteCode,
          inviter_id: this.currentUser.uid
        }
      }
    } catch (error) {
      console.error('[partner-service][invitePartner] 邀请失败:', error)
      return {
        code: -1,
        message: error.message || '邀请失败',
        data: null
      }
    }
  },

  /**
   * 获取我的团队列表
   * @param {number} page - 页码
   * @param {number} pageSize - 每页数量
   * @returns {object} 团队列表
   */
  async getMyTeam({ page = 1, pageSize = 10 } = {}) {
    try {
      if (!this.currentUser.role.includes('partner')) {
        throw new Error('仅合伙人可以查看')
      }

      const { uid } = this.currentUser
      const db = uniCloud.database()

      const countRes = await db.collection('partners')
        .where({
          inviter_id: uid,
          status: 'active'
        })
        .count()

      const res = await db.collection('partners')
        .where({
          inviter_id: uid,
          status: 'active'
        })
        .orderBy('create_date', 'desc')
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .get()

      return {
        code: 0,
        message: '获取成功',
        data: {
          list: res.data,
          total: countRes.total,
          page,
          pageSize
        }
      }
    } catch (error) {
      console.error('[partner-service][getMyTeam] 获取失败:', error)
      return {
        code: -1,
        message: error.message || '获取失败',
        data: { list: [], total: 0, page, pageSize }
      }
    }
  },

  /**
   * 获取团队统计
   * @returns {object} 统计数据
   */
  async getTeamStats() {
    try {
      if (!this.currentUser.role.includes('partner')) {
        throw new Error('仅合伙人可以查看')
      }

      const { uid } = this.currentUser
      const db = uniCloud.database()

      // 获取用户的合伙人信息
      const userRes = await db.collection('uni-id-users')
        .doc(uid)
        .field({ partner_info: true })
        .get()

      const partnerInfo = userRes.data[0]?.partner_info || {}

      // 统计团队人数
      const teamCount = await db.collection('partners')
        .where({
          inviter_id: uid,
          status: 'active'
        })
        .count()

      return {
        code: 0,
        message: '获取成功',
        data: {
          team_count: teamCount.total,
          total_profit: partnerInfo.total_profit || 0,
          partner_level: partnerInfo.level || '初级合伙人',
          partner_id: partnerInfo.partner_id || '',
          invite_earnings: teamCount.total * 5
        }
      }
    } catch (error) {
      console.error('[partner-service][getTeamStats] 获取失败:', error)
      return {
        code: -1,
        message: error.message || '获取失败',
        data: null
      }
    }
  },

  /**
   * 获取新增伙伴
   * @param {number} limit - 数量限制
   * @returns {array} 新增伙伴
   */
  async getNewPartners({ limit = 5 } = {}) {
    try {
      if (!this.currentUser.role.includes('partner')) {
        throw new Error('仅合伙人可以查看')
      }

      const { uid } = this.currentUser
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
      console.error('[partner-service][getNewPartners] 获取失败:', error)
      return {
        code: -1,
        message: error.message || '获取失败',
        data: []
      }
    }
  },

  /**
   * 获取团队动态
   * @param {number} limit - 数量限制
   * @returns {array} 团队动态
   */
  async getTeamDynamics({ limit = 5 } = {}) {
    try {
      const db = uniCloud.database()

      const res = await db.collection('team_dynamics')
        .orderBy('create_date', 'desc')
        .limit(limit)
        .get()

      return {
        code: 0,
        message: '获取成功',
        data: res.data
      }
    } catch (error) {
      console.error('[partner-service][getTeamDynamics] 获取失败:', error)
      return {
        code: -1,
        message: error.message || '获取失败',
        data: []
      }
    }
  }
}
