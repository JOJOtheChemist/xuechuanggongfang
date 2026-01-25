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
  },

  /**
   * 获取提现申请列表（管理员）
   * @param {string} status - 可选：筛选状态 pending/approved/transferred/rejected
   * @returns {object} 提现申请列表
   */
  async getWithdrawalList({ status } = {}) {
    try {
      const { uid } = this.currentUser
      const db = uniCloud.database()
      const dbCmd = db.command

      // 简单验证：检查是否为管理员（可根据实际情况调整）
      // 这里假设管理员密码验证已在前端完成
      console.log('[withdrawal-service][getWithdrawalList] 管理员查询, uid:', uid)

      // 构建查询条件
      const where = {}
      if (status && status !== 'all') {
        // 前端使用 'pending'，数据库使用 'processing'
        if (status === 'pending') {
          where.status = 'processing'
        } else if (status === 'transferred') {
          // 已转账状态映射
          where.status = 'approved' // 或者创建新的 'transferred' 状态
        } else {
          where.status = status
        }
      }

      // 获取提现申请列表
      const requestsRes = await db.collection('coin_withdraw_requests')
        .where(where)
        .orderBy('create_date', 'desc')
        .get()

      // 获取所有涉及的用户ID
      const userIds = [...new Set(requestsRes.data.map(r => r.user_id))]

      // 批量获取用户信息
      const usersRes = await db.collection('uni-id-users')
        .where({
          _id: dbCmd.in(userIds)
        })
        .field({
          _id: true,
          nickname: true,
          username: true,
          avatar: true,
          wx_openid: true,
          wallet: true
        })
        .get()

      // 创建用户信息映射
      const userMap = {}
      usersRes.data.forEach(user => {
        userMap[user._id] = user
      })

      // 新币兑换现金的汇率（1新币 = 1元）
      const COIN_TO_CASH_RATE = 1

      // 组装返回数据
      const list = requestsRes.data.map(item => {
        const user = userMap[item.user_id] || {}
        const cashAmount = Math.round(item.coins_amount * COIN_TO_CASH_RATE * 100) / 100 // 保留两位小数

        // 状态映射
        let frontendStatus = item.status
        if (item.status === 'processing') {
          frontendStatus = 'pending'
        }

        return {
          _id: item._id,
          user_id: item.user_id,
          user_nickname: user.nickname || user.username || '用户',
          user_avatar: user.avatar || '',
          amount: cashAmount,
          coins_spent: item.coins_amount,
          payment_method: item.contact_type || '微信',
          payment_account: item.contact_value || '',
          payment_qrcode: item.payment_qrcode || user.wallet?.payment_qrcode || '',
          status: frontendStatus,
          create_time: item.create_date,
          approved_time: item.approve_date || item.update_date
        }
      })

      // 统计各状态数量
      const allRequests = await db.collection('coin_withdraw_requests').get()
      const counts = {
        total: allRequests.data.length,
        pending: allRequests.data.filter(r => r.status === 'processing').length,
        approved: allRequests.data.filter(r => r.status === 'approved').length,
        transferred: 0, // 如果需要单独的已转账状态，需要在数据库中添加
        rejected: allRequests.data.filter(r => r.status === 'rejected').length
      }

      console.log('[withdrawal-service][getWithdrawalList] 查询成功, 共', list.length, '条记录')

      return {
        code: 0,
        message: '获取成功',
        data: {
          list,
          total: list.length,
          counts
        }
      }
    } catch (error) {
      console.error('[withdrawal-service][getWithdrawalList] 获取失败:', error)
      return {
        code: -1,
        message: error.message || '获取失败',
        data: {
          list: [],
          total: 0,
          counts: {}
        }
      }
    }
  },

  /**
   * 更新提现申请状态（管理员）
   * @param {string} withdrawal_id - 提现申请ID
   * @param {string} status - 新状态：approved/transferred/rejected
   * @returns {object} 更新结果
   */
  async updateWithdrawalStatus({ withdrawal_id, status } = {}) {
    try {
      if (!withdrawal_id) {
        throw new Error('缺少提现申请ID')
      }

      if (!status || !['approved', 'transferred', 'rejected'].includes(status)) {
        throw new Error('无效的状态')
      }

      const { uid } = this.currentUser
      const db = uniCloud.database()
      const dbCmd = db.command

      console.log('[withdrawal-service][updateWithdrawalStatus] 管理员操作, uid:', uid, 'withdrawalId:', withdrawal_id, 'newStatus:', status)

      // 获取提现申请记录
      const requestRes = await db.collection('coin_withdraw_requests')
        .doc(withdrawal_id)
        .get()

      if (!requestRes.data || requestRes.data.length === 0) {
        throw new Error('提现申请不存在')
      }

      const request = requestRes.data[0]

      if (request.status !== 'processing') {
        throw new Error('只能处理审核中的申请')
      }

      // 更新申请状态
      const updateData = {
        update_date: Date.now()
      }

      if (status === 'approved' || status === 'transferred') {
        updateData.status = 'approved'
        updateData.approve_date = Date.now()
        updateData.approved_by = uid

        // 更新相关的新币流水状态
        await db.collection('coin_logs')
          .where({
            user_id: request.user_id,
            ref_id: withdrawal_id,
            type: 'withdraw'
          })
          .update({
            status: 'success',
            remark: dbCmd.set(`提现成功，${request.coins_amount} 新币已兑换为现金`)
          })

      } else if (status === 'rejected') {
        updateData.status = 'rejected'
        updateData.reject_date = Date.now()
        updateData.rejected_by = uid

        // 退还新币
        await db.collection('uni-id-users')
          .doc(request.user_id)
          .update({
            'wallet.coins': dbCmd.inc(request.coins_amount)
          })

        // 更新相关的新币流水状态
        await db.collection('coin_logs')
          .where({
            user_id: request.user_id,
            ref_id: withdrawal_id,
            type: 'withdraw'
          })
          .update({
            status: 'failed',
            remark: dbCmd.set(`提现申请被拒绝，${request.coins_amount} 新币已退回`)
          })

        // 添加一条退回记录
        await db.collection('coin_logs')
          .add({
            user_id: request.user_id,
            amount: request.coins_amount,
            type: 'refund',
            status: 'success',
            ref_id: withdrawal_id,
            remark: `提现申请被拒绝，退回 ${request.coins_amount} 新币`,
            create_date: Date.now()
          })
      }

      await db.collection('coin_withdraw_requests')
        .doc(withdrawal_id)
        .update(updateData)

      console.log('[withdrawal-service][updateWithdrawalStatus] 更新成功, withdrawalId:', withdrawal_id, 'newStatus:', status)

      return {
        code: 0,
        message: '操作成功',
        data: {
          success: true,
          withdrawal_id,
          status
        }
      }
    } catch (error) {
      console.error('[withdrawal-service][updateWithdrawalStatus] 更新失败:', error)
      return {
        code: -1,
        message: error.message || '操作失败',
        data: null
      }
    }
  }
}
