const authUtils = require('auth-utils')

module.exports = {
  _before() {
    const params = this.getParams()[0] || {}
    const token = params._token
    if (!token) throw new Error('未提供token，请先登录')
    const tokenData = authUtils.parseToken(token)
    if (!tokenData || !tokenData.uid) throw new Error('token无效或已过期')
    this.currentUser = { uid: tokenData.uid, openid: tokenData.openid }
    delete params._token
  },

  /**
   * 变更用户积分（统一入口）
   * @param {number} delta - 变更值，正数为增加，负数为减少
   * @param {string} reason - 变动原因，如 daily_checkin / read_article 等
   * @param {string} [source] - 来源服务，如 checkin-service
   * @param {string} [ref_id] - 关联业务ID
   * @param {string} [remark] - 备注
   */
  async changePoints({ delta, reason, source = '', ref_id = '', remark = '' } = {}) {
    if (!delta || typeof delta !== 'number') {
      throw new Error('delta 必须为非零数字')
    }
    if (!reason) {
      throw new Error('reason 不能为空')
    }

    const { uid } = this.currentUser
    const db = uniCloud.database()

    // 查询或初始化积分账户
    const accountRes = await db.collection('user_points')
      .where({ user_id: uid })
      .get()

    let balance = 0
    let accountId = null

    if (accountRes.data.length === 0) {
      // 没有账户则创建
      const addRes = await db.collection('user_points').add({
        user_id: uid,
        balance: 0,
        total_points: 0,
        create_date: Date.now(),
        update_date: Date.now()
      })
      accountId = addRes.id || (addRes.insertedId && addRes.insertedId.toString())
    } else {
      const account = accountRes.data[0]
      balance = account.balance || 0
      accountId = account._id
    }

    const newBalance = balance + delta
    if (newBalance < 0) {
      throw new Error('积分不足')
    }

    // 更新账户余额，如果是加分则同时更新 total_points
    const updateData = {
      balance: newBalance,
      update_date: Date.now()
    }
    
    // 只有加分时才累计到 total_points
    if (delta > 0) {
      const currentAccount = await db.collection('user_points')
        .doc(accountId)
        .field({ total_points: true })
        .get()
      const currentTotalPoints = (currentAccount.data && currentAccount.data[0] && currentAccount.data[0].total_points) || 0
      updateData.total_points = currentTotalPoints + delta
    }
    
    await db.collection('user_points')
      .doc(accountId)
      .update(updateData)

    // 写入积分流水
    await db.collection('points_logs').add({
      user_id: uid,
      change: delta,
      balance_after: newBalance,
      reason,
      source,
      ref_id,
      remark,
      create_date: Date.now()
    })

    return {
      code: 0,
      message: '积分变更成功',
      data: {
        balance: newBalance
      }
    }
  },

  /**
   * 获取当前用户积分余额
   */
  async getUserPoints() {
    const { uid } = this.currentUser
    const db = uniCloud.database()

    const accountRes = await db.collection('user_points')
      .where({ user_id: uid })
      .get()

    if (accountRes.data.length === 0) {
      return {
        code: 0,
        message: '获取成功',
        data: {
          balance: 0
        }
      }
    }

    return {
      code: 0,
      message: '获取成功',
      data: {
        balance: accountRes.data[0].balance || 0
      }
    }
  },

  /**
   * 获取用户徽章数据
   * 每次从积分流水实时统计历史所有正向积分之和，并回写到 user_points.total_points
   */
  async getUserBadgeData() {
    const { uid } = this.currentUser
    const db = uniCloud.database()
    const dbCmd = db.command

    // 1. 从积分流水实时计算历史累计正向积分
    const logsRes = await db.collection('points_logs')
      .where({
        user_id: uid,
        change: dbCmd.gt(0)
      })
      .field({ change: true })
      .get()

    const totalPoints = (logsRes.data || []).reduce((sum, item) => {
      const delta = typeof item.change === 'number' ? item.change : 0
      return sum + delta
    }, 0)

    // 2. 同步回写到 user_points.total_points，并读取当前余额
    let balance = 0
    const accountColl = db.collection('user_points')
    const accountRes = await accountColl
      .where({ user_id: uid })
      .get()

    if (accountRes.data && accountRes.data.length > 0) {
      const account = accountRes.data[0]
      balance = account.balance || 0

      await accountColl
        .doc(account._id)
        .update({
          total_points: totalPoints,
          update_date: Date.now()
        })
    } else {
      // 没有账户时，只返回累计积分；余额视为 0
      balance = 0
    }

    return {
      code: 0,
      message: '获取成功',
      data: {
        total_points: totalPoints,
        balance
      }
    }
  },

  /**
   * 获取积分统计（当前余额 & 今日新增 & 累计获得）
   */
  async getPointsStats() {
    const { uid } = this.currentUser
    const db = uniCloud.database()
    const dbCmd = db.command

    // 获取当前积分余额
    const pointsRes = await db.collection('user_points')
      .where({ user_id: uid })
      .get()

    const balance = pointsRes.data.length === 0
      ? 0
      : (pointsRes.data[0].balance || 0)

    // 计算今日新增积分（只统计正向变动）
    const startOfDay = new Date()
    startOfDay.setHours(0, 0, 0, 0)
    const startTs = startOfDay.getTime()

    const logsRes = await db.collection('points_logs')
      .where({
        user_id: uid,
        change: dbCmd.gt(0),
        create_date: dbCmd.gte(startTs)
      })
      .get()

    const todayAdded = (logsRes.data || []).reduce((sum, item) => {
      const delta = typeof item.change === 'number' ? item.change : 0
      return sum + delta
    }, 0)

    // 计算累计获得积分（历史所有正向变动之和）
    const totalLogsRes = await db.collection('points_logs')
      .where({
        user_id: uid,
        change: dbCmd.gt(0)
      })
      .get()

    const totalAdded = (totalLogsRes.data || []).reduce((sum, item) => {
      const delta = typeof item.change === 'number' ? item.change : 0
      return sum + delta
    }, 0)

    return {
      code: 0,
      message: '获取成功',
      data: {
        balance,
        today_added: todayAdded,
        total_added: totalAdded
      }
    }
  },

  /**
   * 获取当前用户的积分和名次
   * rank = 所有积分余额大于当前用户的人数 + 1
   */
  async getMyPointsAndRank() {
    const { uid } = this.currentUser
    const db = uniCloud.database()
    const dbCmd = db.command

    // 1. 获取当前用户积分账户
    const accountRes = await db.collection('user_points')
      .where({ user_id: uid })
      .get()

    let balance = 0
    if (accountRes.data.length > 0) {
      balance = accountRes.data[0].balance || 0
    }

    // 2. 统计总用户数
    const totalRes = await db.collection('user_points').count()
    const totalUsers = totalRes.total || 0

    let rank = null
    if (totalUsers > 0 && balance > 0) {
      // 3. 统计积分高于当前用户的人数
      const higherRes = await db.collection('user_points')
        .where({ balance: dbCmd.gt(balance) })
        .count()
      rank = (higherRes.total || 0) + 1
    }

    // 4. 获取当前用户昵称和头像
    const userRes = await db.collection('uni-id-users')
      .doc(uid)
      .field({ nickname: true, avatar: true })
      .get()

    const userDoc = (userRes.data && userRes.data[0]) || {}

    return {
      code: 0,
      message: '获取成功',
      data: {
        balance,
        rank,
        total_users: totalUsers,
        nickname: userDoc.nickname || '匿名用户',
        avatar: userDoc.avatar || ''
      }
    }
  },

  /**
   * 积分充值
   * @param {number} amount - 充值金额（元）
   * @param {number} points - 充值积分数量
   * @param {string} orderNo - 支付订单号
   */
  async rechargePoints({ amount, points, orderNo } = {}) {
    if (!amount || typeof amount !== 'number' || amount <= 0) {
      throw new Error('充值金额必须为正数')
    }
    if (!points || typeof points !== 'number' || points <= 0) {
      throw new Error('充值积分必须为正整数')
    }
    if (!orderNo) {
      throw new Error('缺少订单号')
    }

    const { uid } = this.currentUser
    const db = uniCloud.database()

    // 验证订单是否存在
    const orderRes = await db.collection('payment_orders')
      .where({
        order_no: orderNo,
        user_id: uid
      })
      .get()

    if (!orderRes.data || orderRes.data.length === 0) {
      throw new Error('订单不存在')
    }

    const order = orderRes.data[0]
    
    // 检查订单是否已经充值过
    if (order.points_recharged) {
      throw new Error('该订单已经充值过积分')
    }
    
    // 如果订单还未标记为已支付，则手动标记（因为微信回调可能还没到）
    if (order.status !== 'paid') {
      await db.collection('payment_orders')
        .where({ order_no: orderNo })
        .update({
          status: 'paid',
          pay_time: Date.now(),
          update_date: Date.now()
        })
    }

    // 1. 查询或创建积分账户
    const accountRes = await db.collection('user_points')
      .where({ user_id: uid })
      .get()

    let balance = 0
    let accountId = null

    if (accountRes.data.length === 0) {
      // 没有账户则创建
      const addRes = await db.collection('user_points').add({
        user_id: uid,
        balance: 0,
        total_points: 0,
        create_date: Date.now(),
        update_date: Date.now()
      })
      accountId = addRes.id || (addRes.insertedId && addRes.insertedId.toString())
    } else {
      const account = accountRes.data[0]
      balance = account.balance || 0
      accountId = account._id
    }

    const newBalance = balance + points

    // 2. 更新账户余额，同时累积 total_points
    const currentAccount = await db.collection('user_points')
      .doc(accountId)
      .field({ total_points: true })
      .get()
    const currentTotalPoints = (currentAccount.data && currentAccount.data[0] && currentAccount.data[0].total_points) || 0

    await db.collection('user_points')
      .doc(accountId)
      .update({
        balance: newBalance,
        total_points: currentTotalPoints + points,
        update_date: Date.now()
      })

    // 3. 写入积分流水
    await db.collection('points_logs').add({
      user_id: uid,
      change: points,
      balance_after: newBalance,
      reason: 'recharge',
      source: 'points-service',
      ref_id: orderNo,
      remark: `充值￥${amount}元购买${points}积分`,
      create_date: Date.now()
    })

    // 4. 标记订单已充值
    await db.collection('payment_orders')
      .where({ order_no: orderNo })
      .update({
        points_recharged: true,
        recharged_points: points,
        recharge_time: Date.now(),
        update_date: Date.now()
      })

    return {
      code: 0,
      message: '充值成功',
      data: {
        balance: newBalance,
        recharged_points: points
      }
    }
  },

  /**
   * 获取积分光荣榜（按照当前积分余额降序）
   * @param {number} limit - 返回前 N 名，默认 3 名
   */
  async getPointsLeaderboard({ limit = 3 } = {}) {
    const db = uniCloud.database()
    const dbCmd = db.command

    // 限制一下最大返回数量，防止被误用
    const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 3, 1), 50)

    // 1. 先按积分余额降序获取前 N 名用户
    const pointsRes = await db.collection('user_points')
      .orderBy('balance', 'desc')
      .limit(safeLimit)
      .get()

    const accountList = pointsRes.data || []
    if (!accountList.length) {
      return {
        code: 0,
        message: '获取成功',
        data: []
      }
    }

    // 2. 批量查询这些用户的昵称和头像
    const userIds = accountList.map(item => item.user_id).filter(Boolean)

    const usersRes = await db.collection('uni-id-users')
      .where({
        _id: dbCmd.in(userIds)
      })
      .field({
        nickname: true,
        avatar: true
      })
      .get()

    const userMap = {}
    for (const user of usersRes.data || []) {
      userMap[user._id] = user
    }

    // 3. 组装排行榜数据
    const leaderboard = accountList.map(item => {
      const user = userMap[item.user_id] || {}
      return {
        user_id: item.user_id,
        balance: item.balance || 0,
        nickname: user.nickname || '匿名用户',
        avatar: user.avatar || ''
      }
    })

    return {
      code: 0,
      message: '获取成功',
      data: leaderboard
    }
  }
}
