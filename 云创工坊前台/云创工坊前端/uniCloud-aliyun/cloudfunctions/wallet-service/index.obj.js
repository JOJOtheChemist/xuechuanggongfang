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
   * 获取余额
   * @returns {object} 余额信息
   */
  async getBalance() {
    try {
      const { uid } = this.currentUser
      const db = uniCloud.database()

      const userRes = await db.collection('uni-id-users')
        .doc(uid)
        .field({ wallet: true })
        .get()

      const wallet = userRes.data[0]?.wallet || {
        balance: 0,
        frozen_balance: 0,
        total_income: 0,
        total_withdraw: 0
      }

      return {
        code: 0,
        message: '获取成功',
        data: wallet
      }
    } catch (error) {
      console.error('[wallet-service][getBalance] 获取失败:', error)
      return {
        code: -1,
        message: error.message || '获取失败',
        data: null
      }
    }
  },

  /**
   * 申请提现
   * @param {number} amount - 提现金额
   * @param {string} account_type - 账户类型
   * @param {object} account_info - 账户信息
   * @returns {object} 申请结果
   */
  async applyWithdraw({ amount, account_type, account_info }) {
    try {
      if (!amount || amount <= 0) {
        throw new Error('提现金额必须大于0')
      }

      if (!account_type || !account_info) {
        throw new Error('请填写提现账户信息')
      }

      const { uid } = this.currentUser
      const db = uniCloud.database()
      const dbCmd = db.command

      // 获取用户余额
      const userRes = await db.collection('uni-id-users')
        .doc(uid)
        .field({ wallet: true })
        .get()

      const balance = userRes.data[0]?.wallet?.balance || 0

      if (balance < amount) {
        throw new Error('余额不足')
      }

      // 计算手续费（简化处理，实际应根据提现金额阶梯计算）
      const fee = amount * 0.005 // 0.5%手续费
      const actualAmount = amount - fee

      // 创建提现申请
      const withdrawRes = await db.collection('withdrawals').add({
        user_id: uid,
        amount,
        fee,
        actual_amount: actualAmount,
        account_type,
        account_info,
        status: 'pending',
        apply_time: new Date().getTime(),
        create_date: new Date().getTime()
      })

      // 冻结余额
      await db.collection('uni-id-users')
        .doc(uid)
        .update({
          'wallet.balance': dbCmd.inc(-amount),
          'wallet.frozen_balance': dbCmd.inc(amount)
        })

      console.log('[wallet-service][applyWithdraw] 申请成功, withdrawalId:', withdrawRes.id)

      return {
        code: 0,
        message: '提现申请已提交，请等待审核',
        data: {
          success: true,
          withdrawal_id: withdrawRes.id
        }
      }
    } catch (error) {
      console.error('[wallet-service][applyWithdraw] 申请失败:', error)
      return {
        code: -1,
        message: error.message || '申请失败',
        data: null
      }
    }
  },

  /**
   * 获取提现记录
   * @param {number} page - 页码
   * @param {number} pageSize - 每页数量
   * @returns {object} 提现记录
   */
  async getWithdrawList({ page = 1, pageSize = 10 } = {}) {
    try {
      const { uid } = this.currentUser
      const db = uniCloud.database()

      const countRes = await db.collection('withdrawals')
        .where({ user_id: uid })
        .count()

      const res = await db.collection('withdrawals')
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
      console.error('[wallet-service][getWithdrawList] 获取失败:', error)
      return {
        code: -1,
        message: error.message || '获取失败',
        data: { list: [], total: 0, page, pageSize }
      }
    }
  },

  /**
   * 取消提现申请
   * @param {string} withdrawalId - 提现ID
   * @returns {object} 取消结果
   */
  async cancelWithdraw(withdrawalId) {
    try {
      if (!withdrawalId) {
        throw new Error('缺少提现ID')
      }

      const { uid } = this.currentUser
      const db = uniCloud.database()
      const dbCmd = db.command

      // 获取提现记录
      const withdrawRes = await db.collection('withdrawals')
        .doc(withdrawalId)
        .get()

      if (!withdrawRes.data || withdrawRes.data.length === 0) {
        throw new Error('提现记录不存在')
      }

      const withdrawal = withdrawRes.data[0]

      if (withdrawal.user_id !== uid) {
        throw new Error('无权操作')
      }

      if (withdrawal.status !== 'pending') {
        throw new Error('只能取消待审核的提现申请')
      }

      // 更新提现状态
      await db.collection('withdrawals')
        .doc(withdrawalId)
        .update({
          status: 'cancelled'
        })

      // 解冻余额
      await db.collection('uni-id-users')
        .doc(uid)
        .update({
          'wallet.balance': dbCmd.inc(withdrawal.amount),
          'wallet.frozen_balance': dbCmd.inc(-withdrawal.amount)
        })

      console.log('[wallet-service][cancelWithdraw] 取消成功, withdrawalId:', withdrawalId)

      return {
        code: 0,
        message: '已取消提现申请',
        data: { success: true }
      }
    } catch (error) {
      console.error('[wallet-service][cancelWithdraw] 取消失败:', error)
      return {
        code: -1,
        message: error.message || '取消失败',
        data: null
      }
    }
  },

}
