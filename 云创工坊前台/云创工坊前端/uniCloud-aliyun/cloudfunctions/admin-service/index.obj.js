const authUtils = require('auth-utils')

module.exports = {
  _before: function () {
    const params = this.getParams()[0] || {}
    const token = params._token
    if (!token) throw new Error('未提供token，请先登录')
    const tokenData = authUtils.parseToken(token)
    if (!tokenData || !tokenData.uid) throw new Error('token无效或已过期')
    this.currentUser = { uid: tokenData.uid, openid: tokenData.openid }
    delete params._token
    // 管理后台仅限管理员
    if (!this.currentUser.role.includes('admin')) {
      throw new Error('仅限管理员访问')
    }
  },

  /**
   * 用户管理
   * @param {string} action - 操作类型
   * @param {string} userId - 用户ID
   * @param {object} data - 操作数据
   * @returns {object} 操作结果
   */
  async manageUsers({ action, userId, data }) {
    try {
      const db = uniCloud.database()

      switch (action) {
        case 'list':
          // 获取用户列表
          const page = data?.page || 1
          const pageSize = data?.pageSize || 20

          const countRes = await db.collection('uni-id-users').count()
          const listRes = await db.collection('uni-id-users')
            .field({
              username: true,
              nickname: true,
              avatar: true,
              mobile: true,
              role: true,
              create_date: true
            })
            .orderBy('create_date', 'desc')
            .skip((page - 1) * pageSize)
            .limit(pageSize)
            .get()

          return {
            code: 0,
            message: '获取成功',
            data: {
              list: listRes.data,
              total: countRes.total,
              page,
              pageSize
            }
          }

        case 'detail':
          // 获取用户详情
          if (!userId) throw new Error('缺少用户ID')

          const userRes = await db.collection('uni-id-users')
            .doc(userId)
            .get()

          return {
            code: 0,
            message: '获取成功',
            data: userRes.data[0]
          }

        case 'update':
          // 更新用户
          if (!userId || !data) throw new Error('参数缺失')

          await db.collection('uni-id-users')
            .doc(userId)
            .update(data)

          return {
            code: 0,
            message: '更新成功',
            data: { success: true }
          }

        case 'delete':
          // 删除用户
          if (!userId) throw new Error('缺少用户ID')

          await db.collection('uni-id-users')
            .doc(userId)
            .remove()

          return {
            code: 0,
            message: '删除成功',
            data: { success: true }
          }

        default:
          throw new Error('不支持的操作')
      }
    } catch (error) {
      console.error('[admin-service][manageUsers] 操作失败:', error)
      return {
        code: -1,
        message: error.message || '操作失败',
        data: null
      }
    }
  },

  /**
   * 团队管理
   * @param {string} action - 操作类型
   * @param {string} teamId - 团队ID
   * @param {object} data - 操作数据
   * @returns {object} 操作结果
   */
  async manageTeams({ action, teamId, data }) {
    try {
      const db = uniCloud.database()

      switch (action) {
        case 'list':
          const page = data?.page || 1
          const pageSize = data?.pageSize || 20

          const countRes = await db.collection('teams').count()
          const listRes = await db.collection('teams')
            .orderBy('create_date', 'desc')
            .skip((page - 1) * pageSize)
            .limit(pageSize)
            .get()

          return {
            code: 0,
            message: '获取成功',
            data: {
              list: listRes.data,
              total: countRes.total,
              page,
              pageSize
            }
          }

        case 'detail':
          if (!teamId) throw new Error('缺少团队ID')

          const teamRes = await db.collection('teams')
            .doc(teamId)
            .get()

          return {
            code: 0,
            message: '获取成功',
            data: teamRes.data[0]
          }

        case 'update':
          if (!teamId || !data) throw new Error('参数缺失')

          await db.collection('teams')
            .doc(teamId)
            .update(data)

          return {
            code: 0,
            message: '更新成功',
            data: { success: true }
          }

        case 'delete':
          if (!teamId) throw new Error('缺少团队ID')

          await db.collection('teams')
            .doc(teamId)
            .update({ status: 'disbanded' })

          return {
            code: 0,
            message: '解散成功',
            data: { success: true }
          }

        default:
          throw new Error('不支持的操作')
      }
    } catch (error) {
      console.error('[admin-service][manageTeams] 操作失败:', error)
      return {
        code: -1,
        message: error.message || '操作失败',
        data: null
      }
    }
  },

  /**
   * 文章管理
   * @param {string} action - 操作类型
   * @param {string} articleId - 文章ID
   * @param {object} data - 操作数据
   * @returns {object} 操作结果
   */
  async manageArticles({ action, articleId, data }) {
    try {
      const db = uniCloud.database()

      switch (action) {
        case 'list':
          const page = data?.page || 1
          const pageSize = data?.pageSize || 20

          const countRes = await db.collection('articles').count()
          const listRes = await db.collection('articles')
            .orderBy('create_date', 'desc')
            .skip((page - 1) * pageSize)
            .limit(pageSize)
            .get()

          return {
            code: 0,
            message: '获取成功',
            data: {
              list: listRes.data,
              total: countRes.total,
              page,
              pageSize
            }
          }

        case 'create':
          if (!data) throw new Error('缺少数据')

          const createRes = await db.collection('articles').add({
            ...data,
            author_id: this.currentUser.uid,
            stats: { views: 0, likes: 0, dislikes: 0 },
            publish_time: new Date().getTime(),
            create_date: new Date().getTime(),
            update_date: new Date().getTime()
          })

          return {
            code: 0,
            message: '创建成功',
            data: { article_id: createRes.id }
          }

        case 'update':
          if (!articleId || !data) throw new Error('参数缺失')

          await db.collection('articles')
            .doc(articleId)
            .update({
              ...data,
              update_date: new Date().getTime()
            })

          return {
            code: 0,
            message: '更新成功',
            data: { success: true }
          }

        case 'delete':
          if (!articleId) throw new Error('缺少文章ID')

          await db.collection('articles')
            .doc(articleId)
            .remove()

          return {
            code: 0,
            message: '删除成功',
            data: { success: true }
          }

        default:
          throw new Error('不支持的操作')
      }
    } catch (error) {
      console.error('[admin-service][manageArticles] 操作失败:', error)
      return {
        code: -1,
        message: error.message || '操作失败',
        data: null
      }
    }
  },

  /**
   * 提现审核
   * @param {string} action - 操作类型
   * @param {string} withdrawalId - 提现ID
   * @param {object} data - 操作数据
   * @returns {object} 操作结果
   */
  async manageWithdrawals({ action, withdrawalId, data }) {
    try {
      const db = uniCloud.database()
      const dbCmd = db.command

      switch (action) {
        case 'list':
          const page = data?.page || 1
          const pageSize = data?.pageSize || 20
          const status = data?.status

          let where = {}
          if (status) where.status = status

          const countRes = await db.collection('withdrawals').where(where).count()
          const listRes = await db.collection('withdrawals')
            .where(where)
            .orderBy('create_date', 'desc')
            .skip((page - 1) * pageSize)
            .limit(pageSize)
            .get()

          return {
            code: 0,
            message: '获取成功',
            data: {
              list: listRes.data,
              total: countRes.total,
              page,
              pageSize
            }
          }

        case 'approve':
          // 审核通过
          if (!withdrawalId) throw new Error('缺少提现ID')

          const approveRes = await db.collection('withdrawals')
            .doc(withdrawalId)
            .get()

          const withdrawal = approveRes.data[0]

          await db.collection('withdrawals')
            .doc(withdrawalId)
            .update({
              status: 'completed',
              complete_time: new Date().getTime()
            })

          // 更新用户钱包
          await db.collection('uni-id-users')
            .doc(withdrawal.user_id)
            .update({
              'wallet.frozen_balance': dbCmd.inc(-withdrawal.amount),
              'wallet.total_withdraw': dbCmd.inc(withdrawal.actual_amount)
            })

          return {
            code: 0,
            message: '审核通过',
            data: { success: true }
          }

        case 'reject':
          // 审核拒绝
          if (!withdrawalId || !data?.reject_reason) throw new Error('参数缺失')

          const rejectRes = await db.collection('withdrawals')
            .doc(withdrawalId)
            .get()

          const rejectedWithdrawal = rejectRes.data[0]

          await db.collection('withdrawals')
            .doc(withdrawalId)
            .update({
              status: 'rejected',
              reject_reason: data.reject_reason
            })

          // 解冻余额
          await db.collection('uni-id-users')
            .doc(rejectedWithdrawal.user_id)
            .update({
              'wallet.balance': dbCmd.inc(rejectedWithdrawal.amount),
              'wallet.frozen_balance': dbCmd.inc(-rejectedWithdrawal.amount)
            })

          return {
            code: 0,
            message: '审核拒绝',
            data: { success: true }
          }

        default:
          throw new Error('不支持的操作')
      }
    } catch (error) {
      console.error('[admin-service][manageWithdrawals] 操作失败:', error)
      return {
        code: -1,
        message: error.message || '操作失败',
        data: null
      }
    }
  },

  /**
   * 系统统计数据
   * @returns {object} 统计数据
   */
  async getSystemStats() {
    try {
      const db = uniCloud.database()

      const [
        totalUsers,
        totalArticles,
        totalTeams,
        pendingWithdrawals
      ] = await Promise.all([
        db.collection('uni-id-users').count(),
        db.collection('articles').count(),
        db.collection('teams').where({ status: 'active' }).count(),
        db.collection('withdrawals').where({ status: 'pending' }).count()
      ])

      return {
        code: 0,
        message: '获取成功',
        data: {
          total_users: totalUsers.total,
          total_articles: totalArticles.total,
          total_teams: totalTeams.total,
          pending_withdrawals: pendingWithdrawals.total
        }
      }
    } catch (error) {
      console.error('[admin-service][getSystemStats] 获取失败:', error)
      return {
        code: -1,
        message: error.message || '获取失败',
        data: null
      }
    }
  }
}
