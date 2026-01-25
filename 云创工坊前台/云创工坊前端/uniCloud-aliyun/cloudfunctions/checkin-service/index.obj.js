const authUtils = require('auth-utils')

module.exports = {
  _before: function () {
    const params = this.getParams()[0] || {}
    const token = params._token
    if (!token) throw new Error('未提供token，请先登录')
    const tokenData = authUtils.parseToken(token)
    if (!tokenData || !tokenData.uid) throw new Error('token无效或已过期')
    this.currentUser = { uid: tokenData.uid, openid: tokenData.openid }
    // 在后续调用其他服务（如 points-service）时需要继续使用 token
    this.currentToken = token
    delete params._token
  },

  /**
   * 每日签到
   * @returns {object} 签到结果
   */
  async checkIn() {
    try {
      const { uid } = this.currentUser
      const db = uniCloud.database()
      const now = Date.now()
      const todayDate = new Date()
      const today = todayDate.toISOString().split('T')[0] // YYYY-MM-DD
      const todayStart = new Date(todayDate.getFullYear(), todayDate.getMonth(), todayDate.getDate()).getTime()
      const yesterdayStart = todayStart - 86400000
      const yesterdayEnd = todayStart
      const dbCmd = db.command

      // 检查今天是否已签到
      const existingCheckIn = await db.collection('check_in_records')
        .where({
          user_id: uid,
          check_in_date: today
        })
        .get()

      if (existingCheckIn.data.length > 0) {
        return {
          code: -1,
          message: '今天已经签到过了',
          data: {
            checked_in: true,
            check_in_time: existingCheckIn.data[0].create_date
          }
        }
      }

      // 创建签到记录
      await db.collection('check_in_records').add({
        user_id: uid,
        check_in_date: today,
        create_date: now
      })

      // 调用积分服务，签到奖励 +5 积分
      try {
        const pointsService = uniCloud.importObject('points-service')
        await pointsService.changePoints({
          _token: this.currentToken,
          delta: 5,
          reason: 'daily_checkin',
          source: 'checkin-service',
          ref_id: today,
          remark: '每日签到奖励+5积分'
        })
      } catch (pointsError) {
        console.error('[checkin-service][checkIn] 积分发放失败:', pointsError)
      }

      // -------------------------------------------------------------
      // Extra Bonus: 10% of direct referrals' yesterday income
      // -------------------------------------------------------------
      let referralBonus = 0
      try {
        const referralRes = await db.collection('uni-id-users')
          .where({ inviter_uid: uid })
          .field({ _id: true })
          .get()
        const referralIds = (referralRes.data || []).map(item => item._id)

        if (referralIds.length) {
          const referralLogs = await db.collection('coin_logs')
            .where({
              user_id: dbCmd.in(referralIds),
              amount: dbCmd.gt(0),
              status: 'success',
              create_date: dbCmd.gte(yesterdayStart).and(dbCmd.lt(yesterdayEnd))
            })
            .field({ amount: true })
            .get()

          const referralIncome = (referralLogs.data || []).reduce((sum, log) => sum + (log.amount || 0), 0)
          referralBonus = Math.floor(referralIncome * 0.05)

          if (referralBonus > 0) {
            await db.collection('uni-id-users')
              .doc(uid)
              .update({
                'wallet.coins': dbCmd.inc(referralBonus)
              })

            await db.collection('coin_logs').add({
              user_id: uid,
              amount: referralBonus,
              type: 'reward',
              status: 'success',
              remark: '每日签到奖励，直推收益加成5%',
              create_date: now
            })
          }
        }
      } catch (bonusError) {
        console.error('[checkin-service][checkIn] 计算签到加成失败:', bonusError)
      }

      // -------------------------------------------------------------

      console.log('[checkin-service][checkIn] 签到成功, userId:', uid)

      return {
        code: 0,
        message: referralBonus > 0 ? `签到成功，直推收益加成 (5%) +${referralBonus} 新币！` : '签到成功！',
        data: {
          checked_in: true,
          check_in_time: now,
          referral_bonus: referralBonus
        }
      }
    } catch (error) {
      console.error('[checkin-service][checkIn] 签到失败:', error)
      return {
        code: -1,
        message: error.message || '签到失败',
        data: null
      }
    }
  },

  /**
   * 获取今日签到状态
   * @returns {object} 签到状态
   */
  async getCheckInStatus(params = {}) {
    try {
      let uid = this.currentUser.uid
      // If user_id is provided, use it (allows checking other users)
      if (params.user_id) {
        uid = params.user_id
        // TODO: security check if needed (e.g. only team leader can check others)
      }

      console.log('[checkin-service] getCheckInStatus for uid:', uid)

      const db = uniCloud.database()
      const today = new Date().toISOString().split('T')[0]

      const checkInRes = await db.collection('check_in_records')
        .where({
          user_id: uid,
          check_in_date: today
        })
        .get()

      const isCheckedIn = checkInRes.data.length > 0

      return {
        code: 0,
        message: '获取成功',
        data: {
          is_checked_in: isCheckedIn,
          check_in_time: isCheckedIn ? checkInRes.data[0].create_date : null
        }
      }
    } catch (error) {
      console.error('[checkin-service][getCheckInStatus] 获取失败:', error)
      return {
        code: -1,
        message: error.message || '获取失败',
        data: null
      }
    }
  },

  /**
   * 获取签到历史
   * @param {number} page - 页码
   * @param {number} pageSize - 每页数量
   * @returns {object} 签到历史
   */
  async getCheckInHistory({ page = 1, pageSize = 10 } = {}) {
    try {
      const { uid } = this.currentUser
      const db = uniCloud.database()

      const countRes = await db.collection('check_in_records')
        .where({ user_id: uid })
        .count()

      const res = await db.collection('check_in_records')
        .where({ user_id: uid })
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
      console.error('[checkin-service][getCheckInHistory] 获取失败:', error)
      return {
        code: -1,
        message: error.message || '获取失败',
        data: { list: [], total: 0, page, pageSize }
      }
    }
  },

  /**
   * 获取签到统计
   * @returns {object} 签到天数统计
   */
  async getCheckInStats() {
    try {
      const { uid } = this.currentUser
      const db = uniCloud.database()

      const countRes = await db.collection('check_in_records')
        .where({ user_id: uid })
        .count()

      return {
        code: 0,
        message: '获取成功',
        data: {
          total_days: countRes.total
        }
      }
    } catch (error) {
      console.error('[checkin-service][getCheckInStats] 获取失败:', error)
      return {
        code: -1,
        message: error.message || '获取失败',
        data: null
      }
    }
  }
}
