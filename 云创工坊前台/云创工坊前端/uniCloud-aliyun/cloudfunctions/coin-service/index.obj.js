const authUtils = require('auth-utils')

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
      this.currentToken = token
    }

    delete params._token
  },

  /**
   * 获取新币余额
   * @returns {object} 新币余额
   */
  async getCoinBalance() {
    if (!this.currentUser) return { code: 0, message: '未登录', data: { coins: 0 } }
    try {
      const { uid } = this.currentUser
      const db = uniCloud.database()

      const userRes = await db.collection('uni-id-users')
        .doc(uid)
        .field({ wallet: true })
        .get()

      const coins = userRes.data[0]?.wallet?.coins || 0

      return {
        code: 0,
        message: '获取成功',
        data: { coins }
      }
    } catch (error) {
      console.error('[coin-service][getCoinBalance] 获取失败:', error)
      return {
        code: -1,
        message: error.message || '获取失败',
        data: null
      }
    }
  },

  /**
   * 获取新币统计数据
   * @returns {object} 包含：current_balance(当前余额)、today_income(今日新增)、total_income(累计收入)
   */
  async getCoinStats() {
    if (!this.currentUser) return { code: 0, message: '未登录', data: { current_balance: 0, today_income: 0, total_income: 0 } }
    try {
      const { uid } = this.currentUser
      const db = uniCloud.database()
      const dbCmd = db.command

      // 1. 获取当前余额
      const userRes = await db.collection('uni-id-users')
        .doc(uid)
        .field({ wallet: true })
        .get()

      const current_balance = userRes.data[0]?.wallet?.coins || 0

      // 2. 计算今日新增（今天 00:00:00 到现在）
      const now = new Date()
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()

      const todayLogsRes = await db.collection('coin_logs')
        .where({
          user_id: uid,
          amount: dbCmd.gt(0), // 只统计收入
          status: 'success', // 只统计已完成的
          create_date: dbCmd.gte(todayStart)
        })
        .get()

      const today_income = todayLogsRes.data.reduce((sum, log) => sum + (log.amount || 0), 0)

      // 3. 计算累计收入（所有历史记录）
      const allIncomeLogs = await db.collection('coin_logs')
        .where({
          user_id: uid,
          amount: dbCmd.gt(0), // 只统计收入
          status: 'success' // 只统计已完成的
        })
        .get()

      const total_income = allIncomeLogs.data.reduce((sum, log) => sum + (log.amount || 0), 0)

      console.log('[coin-service][getCoinStats] 统计成功, userId:', uid, '当前余额:', current_balance, '今日新增:', today_income, '累计收入:', total_income)

      return {
        code: 0,
        message: '获取成功',
        data: {
          current_balance,
          today_income,
          total_income
        }
      }
    } catch (error) {
      console.error('[coin-service][getCoinStats] 获取失败:', error)
      return {
        code: -1,
        message: error.message || '获取统计数据失败',
        data: null
      }
    }
  },

  /**
   * 获取新币流水记录
   * @param {object} params
   * @param {number} params.limit - 获取条数
   * @param {number} params.offset - 偏移量
   * @param {string} params.status - 可选：按状态筛选（如 processing/success/failed/cancelled）
   * @param {string} params.type - 可选：记录类型（income/exchange/withdraw 等）
   */
  async getCoinLogs({ limit = 20, offset = 0, status, type } = {}) {
    if (!this.currentUser) return { code: 0, message: '未登录', data: { list: [], total: 0 } }
    try {
      const { uid } = this.currentUser
      const db = uniCloud.database()

      console.log('[coin-service][getCoinLogs] 查询参数:', { uid, limit, offset, status, type })

      const where = { user_id: uid }
      if (status) where.status = status
      if (type) where.type = type

      const res = await db.collection('coin_logs')
        .where(where)
        .orderBy('create_date', 'desc')
        .skip(offset)
        .limit(limit)
        .get()

      console.log('[coin-service][getCoinLogs] 查询结果:', res.data.length, '条记录')

      const countRes = await db.collection('coin_logs')
        .where(where)
        .count()

      console.log('[coin-service][getCoinLogs] 总数:', countRes.total)

      return {
        code: 0,
        message: '获取成功',
        data: {
          list: res.data,
          total: countRes.total
        }
      }
    } catch (error) {
      console.error('[coin-service][getCoinLogs] 获取失败:', error)
      return {
        code: -1,
        message: error.message || '获取记录失败',
        data: null
      }
    }
  },

  /**
   * 申请新币提现（进入审核队列）
   * @param {object} params
   * @param {number} params.coins - 要提现的新币数量
   * @param {string} params.contact_type - 联系方式类型
   * @param {string} params.contact_value - 联系方式值
   * @param {string} params.payment_qrcode - 提现收款码URL
   */
  async applyWithdrawCoins({ coins, contact_type, contact_value, payment_qrcode } = {}) {
    try {
      if (!coins || typeof coins !== 'number' || coins <= 0) {
        throw new Error('提现数量必须大于0')
      }
      if (!Number.isInteger(coins)) {
        throw new Error('新币提现仅支持整数数量')
      }
      // Contact info is optional now
      // if (!contact_type || !contact_value) {
      //   throw new Error('请填写联系方式及渠道')
      // }

      const { uid } = this.currentUser
      const db = uniCloud.database()
      const dbCmd = db.command

      // 查询新币余额
      const userRes = await db.collection('uni-id-users')
        .doc(uid)
        .field({ wallet: true })
        .get()

      const currentCoins = userRes.data[0]?.wallet?.coins || 0

      if (currentCoins < coins) {
        throw new Error('新币余额不足')
      }

      // 更新用户收款码（如果提供了）
      if (payment_qrcode) {
        await db.collection('uni-id-users')
          .doc(uid)
          .update({
            'wallet.payment_qrcode': payment_qrcode
          })
      }

      // 扣除新币余额（进入审核期，不可用）
      await db.collection('uni-id-users')
        .doc(uid)
        .update({
          'wallet.coins': dbCmd.inc(-coins)
        })

      // 创建提现申请记录
      const requestRes = await db.collection('coin_withdraw_requests')
        .add({
          user_id: uid,
          coins_amount: coins,
          contact_type: contact_type || '',
          contact_value: contact_value || '',
          payment_qrcode: payment_qrcode || '', // 记录申请时的收款码
          status: 'processing', // processing=审核中, approved=已通过, rejected=已拒绝, cancelled=已取消
          create_date: Date.now(),
          update_date: Date.now()
        })

      // 记录新币流水（扣除）
      await db.collection('coin_logs')
        .add({
          user_id: uid,
          amount: -coins,
          type: 'withdraw',
          status: 'processing',
          ref_id: requestRes.id,
          remark: `申请提现，提交 ${coins} 新币`,
          create_date: Date.now()
        })

      console.log('[coin-service][applyWithdrawCoins] 申请成功, userId:', uid, 'coins:', coins, 'requestId:', requestRes.id)

      return {
        code: 0,
        message: '提现申请已提交，请等待审核',
        data: {
          success: true,
          request_id: requestRes.id,
          coins_amount: coins
        }
      }
    } catch (error) {
      console.error('[coin-service][applyWithdrawCoins] 申请失败:', error)
      return {
        code: -1,
        message: error.message || '申请失败',
        data: null
      }
    }
  },

  /**
   * 年度新币统计（个人/团队/公司）
   * @param {number} year - 年份（如 2025），不传则用当前年
   */
  async getAnnualCoinStats({ year } = {}) {
    try {
      const { uid } = this.currentUser
      const db = uniCloud.database()
      const dbCmd = db.command

      const now = new Date()
      const y = typeof year === 'number' ? year : now.getFullYear()
      const start = new Date(y, 0, 1, 0, 0, 0, 0).getTime()
      const end = new Date(y + 1, 0, 1, 0, 0, 0, 0).getTime()

      // 用户所在团队
      const userRes = await db.collection('uni-id-users')
        .doc(uid)
        .field({ team_info: true })
        .get()
      const teamInfo = userRes.data[0]?.team_info

      // 个人年度收入
      const userLogs = await db.collection('coin_logs')
        .where({ user_id: uid, amount: dbCmd.gt(0), status: 'success', create_date: dbCmd.gte(start).and(dbCmd.lt(end)) })
        .field({ amount: true })
        .get()
      const user_year_income = (userLogs.data || []).reduce((s, it) => s + (it.amount || 0), 0)

      // 团队年度收入（当前用户所在团队）
      let team_year_income = 0
      if (teamInfo && teamInfo.team_id) {
        const members = await db.collection('uni-id-users')
          .where({ 'team_info.team_id': teamInfo.team_id, 'team_info.status': 'active' })
          .field({ _id: true })
          .get()
        const ids = (members.data || []).map(m => m._id)
        if (ids.length) {
          const teamLogs = await db.collection('coin_logs')
            .where({ user_id: dbCmd.in(ids), amount: dbCmd.gt(0), status: 'success', create_date: dbCmd.gte(start).and(dbCmd.lt(end)) })
            .field({ amount: true })
            .get()
          team_year_income = (teamLogs.data || []).reduce((s, it) => s + (it.amount || 0), 0)
        }
      }

      // 公司年度收入（全量）
      const companyLogs = await db.collection('coin_logs')
        .where({ amount: dbCmd.gt(0), status: 'success', create_date: dbCmd.gte(start).and(dbCmd.lt(end)) })
        .field({ amount: true })
        .get()
      const company_year_income = (companyLogs.data || []).reduce((s, it) => s + (it.amount || 0), 0)

      return { code: 0, message: '获取成功', data: { user_year_income, team_year_income, company_year_income } }
    } catch (error) {
      console.error('[coin-service][getAnnualCoinStats] 获取失败:', error)
      return { code: -1, message: error.message || '获取失败', data: null }
    }
  },

  /**
   * 获取昨日收益统计（个人/团队）
   */
  async getYesterdayStats() {
    try {
      const { uid } = this.currentUser
      const db = uniCloud.database()
      const dbCmd = db.command

      const now = new Date()
      // Yesterday Start: 00:00:00 yesterday
      const yesterdayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1).getTime()
      // Yesterday End: 00:00:00 today
      const yesterdayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()

      // 1. Personal Yesterday Income（仅统计成功到账的正向流水）
      const userLogs = await db.collection('coin_logs')
        .where({
          user_id: uid,
          amount: dbCmd.gt(0),
          status: 'success',
          create_date: dbCmd.gte(yesterdayStart).and(dbCmd.lt(yesterdayEnd))
        })
        .field({ amount: true })
        .get()
      const user_yesterday_income = (userLogs.data || []).reduce((s, it) => s + (it.amount || 0), 0)

      // 2. Direct referral (1-level) yesterday income
      const referralRes = await db.collection('uni-id-users')
        .where({ inviter_uid: uid })
        .field({ _id: true })
        .get()

      let team_yesterday_income = 0
      const referralIds = (referralRes.data || []).map(m => m._id)
      if (referralIds.length) {
        const teamLogs = await db.collection('coin_logs')
          .where({
            user_id: dbCmd.in(referralIds),
            amount: dbCmd.gt(0),
            status: 'success',
            create_date: dbCmd.gte(yesterdayStart).and(dbCmd.lt(yesterdayEnd))
          })
          .field({ amount: true })
          .get()
        team_yesterday_income = (teamLogs.data || []).reduce((s, it) => s + (it.amount || 0), 0)
      }

      const direct_level_income = team_yesterday_income

      return {
        code: 0,
        message: '获取成功',
        data: {
          user_yesterday_income,
          team_yesterday_income: direct_level_income,
          direct_level_income
        }
      }

    } catch (error) {
      console.error('[coin-service][getYesterdayStats] 获取失败:', error)
      return { code: -1, message: error.message || '获取失败', data: null }
    }
  },

  async applyExchangeCoinsToPoints({ coins } = {}) {
    const exchangeHelper = require('./exchange-helper.js')
    return await exchangeHelper.applyExchangeCoinsToPoints(this.currentUser, { coins, token: this.currentToken })
  },

  /**
   * 获取兑换申请列表
   * @param {object} params
   * @param {number} params.limit - 获取条数
   * @param {number} params.offset - 偏移量
   * @param {string} params.status - 可选：按状态筛选
   */
  async getExchangeRequests({ limit = 20, offset = 0, status } = {}) {
    try {
      const { uid } = this.currentUser
      const db = uniCloud.database()

      const where = { user_id: uid }
      if (status) where.status = status

      const res = await db.collection('coin_exchange_requests')
        .where(where)
        .orderBy('create_date', 'desc')
        .skip(offset)
        .limit(limit)
        .get()

      const countRes = await db.collection('coin_exchange_requests')
        .where(where)
        .count()

      return {
        code: 0,
        message: '获取成功',
        data: {
          list: res.data,
          total: countRes.total
        }
      }
    } catch (error) {
      console.error('[coin-service][getExchangeRequests] 获取失败:', error)
      return {
        code: -1,
        message: error.message || '获取失败',
        data: null
      }
    }
  },

  /**
   * 取消兑换申请（仅限审核中状态）
   * @param {string} requestId - 申请ID
   */
  async cancelExchangeRequest({ requestId } = {}) {
    try {
      if (!requestId) {
        throw new Error('缺少申请ID')
      }

      const { uid } = this.currentUser
      const db = uniCloud.database()
      const dbCmd = db.command

      // 获取申请记录
      const requestRes = await db.collection('coin_exchange_requests')
        .doc(requestId)
        .get()

      if (!requestRes.data || requestRes.data.length === 0) {
        throw new Error('申请记录不存在')
      }

      const request = requestRes.data[0]

      if (request.user_id !== uid) {
        throw new Error('无权操作')
      }

      if (request.status !== 'processing') {
        throw new Error('只能取消审核中的申请')
      }

      // 更新申请状态
      await db.collection('coin_exchange_requests')
        .doc(requestId)
        .update({
          status: 'cancelled',
          update_date: Date.now()
        })

      // 退还新币
      await db.collection('uni-id-users')
        .doc(uid)
        .update({
          'wallet.coins': dbCmd.inc(request.coins_amount)
        })

      // 更新流水状态
      await db.collection('coin_logs')
        .where({
          user_id: uid,
          ref_id: requestId,
          type: 'exchange'
        })
        .update({
          status: 'cancelled'
        })

      console.log('[coin-service][cancelExchangeRequest] 取消成功, requestId:', requestId)

      return {
        code: 0,
        message: '已取消兑换申请',
        data: { success: true }
      }
    } catch (error) {
      console.error('[coin-service][cancelExchangeRequest] 取消失败:', error)
      return {
        code: -1,
        message: error.message || '取消失败',
        data: null
      }
    }
  }
}
