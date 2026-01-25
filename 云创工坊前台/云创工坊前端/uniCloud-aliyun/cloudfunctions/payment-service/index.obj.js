const authUtils = require('auth-utils')
const payConfig = require('wx-pay-config/config')
const payUtils = require('wx-pay-config/utils')

// 引入 helper 模块
const wechatPayHelper = require('./wechat-pay-helper')
const orderHelper = require('./order-helper')
const withdrawHelper = require('./withdraw-helper')
const rewardHelper = require('./reward-helper')

module.exports = {
  _before: function () {
    const methodName = this.getMethodName()
    // paymentNotify 为微信回调，不需要 token
    if (methodName === 'paymentNotify') {
      return
    }

    const params = this.getParams()[0] || {}
    const token = params._token
    if (!token) throw new Error('未提供token，请先登录')
    const tokenData = authUtils.parseToken(token)
    if (!tokenData || !tokenData.uid) throw new Error('token无效或已过期')
    this.currentUser = { uid: tokenData.uid, openid: tokenData.openid }
    delete params._token
  },

  /**
   * 创建支付订单（统一下单）
   */
  async createOrder({ businessId, businessName, amount, signupId, extraData } = {}) {
    try {
      const { uid, openid } = this.currentUser

      if (!openid) {
        throw new Error('缺少用户openid，请重新登录')
      }

      if (!businessId) {
        throw new Error('缺少业务ID')
      }

      // 检查支付配置
      if (!payConfig.apiKey) {
        throw new Error('支付配置未完成，请先在 wx-pay-config/config.js 填写 apiKey (v2)')
      }

      // 1. 计算金额
      const finalAmount = orderHelper.calculateAmount(businessId, amount)
      const totalFee = payUtils.yuanToFen(finalAmount) // 转换为分

      // 2. 创建订单记录
      const orderResult = await orderHelper.createOrderRecord({
        uid,
        businessId,
        businessName,
        amount: finalAmount,
        totalFee,
        openid,
        signupId,
        extraData
      })

      // 3. 调用微信统一下单接口
      const unifiedOrderResult = await wechatPayHelper.unifiedOrder({
        outTradeNo: orderResult.order_no,
        totalFee,
        openid,
        body: businessName || payConfig.description
      })

      // 4. 更新订单 prepay_id
      await orderHelper.updateOrderPrepayId(orderResult.id, unifiedOrderResult.prepay_id)

      // 5. 生成小程序支付参数
      const payParams = wechatPayHelper.generatePayParams(unifiedOrderResult.prepay_id)

      return {
        code: 0,
        message: '订单创建成功',
        data: {
          order_id: orderResult.id,
          order_no: orderResult.order_no,
          amount: finalAmount,
          pay_params: payParams
        }
      }
    } catch (error) {
      console.error('[payment-service][createOrder] 创建失败:', error)
      return {
        code: -1,
        message: error.message || '创建订单失败',
        data: null
      }
    }
  },

  /**
   * 查询订单状态
   */
  async queryOrder(orderNo) {
    try {
      const { uid } = this.currentUser

      const order = await orderHelper.getOrderByNo(orderNo, uid)

      return {
        code: 0,
        message: '查询成功',
        data: order
      }
    } catch (error) {
      console.error('[payment-service][queryOrder] 查询失败:', error)
      return {
        code: -1,
        message: error.message || '查询失败',
        data: null
      }
    }
  },

  /**
   * 获取提现记录
   */
  async getWithdrawRecords({ limit = 20, offset = 0 } = {}) {
    try {
      const { uid } = this.currentUser

      const result = await withdrawHelper.getWithdrawRecordsByUser(uid, limit, offset)

      return {
        code: 0,
        message: '获取成功',
        data: result
      }
    } catch (error) {
      console.error('[payment-service][getWithdrawRecords] 获取失败:', error)
      return {
        code: -1,
        message: error.message || '获取记录失败',
        data: null
      }
    }
  },

  /**
   * 申请提现
   */
  async withdraw({ amount, realName } = {}) {
    try {
      const { uid, openid } = this.currentUser
      if (!uid || !openid) throw new Error('用户未登录')

      // 1. 验证金额和余额
      await withdrawHelper.validateWithdrawAmount(amount, uid)

      const totalFee = payUtils.yuanToFen(amount)

      // 2. 先扣除余额 (防止并发提现)
      await withdrawHelper.deductUserBalance(uid, amount)

      // 3. 创建提现记录
      const withdrawRecord = await withdrawHelper.createWithdrawRecord({
        uid,
        openid,
        amount,
        totalFee
      })

      try {
        // 4. (暂时跳过自动转账) 提交人工审核
        // 暂时不调用微信自动转账接口，等待管理员线下转账
        /*
        const transferResult = await wechatPayHelper.transfer({
          partnerTradeNo: withdrawRecord.order_no,
          openid,
          amount: totalFee,
          realName,
          desc: '用户余额提现'
        })
        
        // 更新为成功状态
        await withdrawHelper.updateWithdrawStatus(withdrawRecord.id, {
          status: 'success',
          payment_no: transferResult.payment_no,
          payment_time: transferResult.payment_time
        })
        */

        return {
          code: 0,
          message: '提现申请已提交',
          data: {
            amount,
            is_manual: true // 标记为人工处理
          }
        }
      } catch (err) {
        console.error('[payment-service][withdraw] 提现申请处理异常:', err)

        // 回滚余额
        await withdrawHelper.refundUserBalance(uid, amount)

        // 更新提现记录为失败
        await withdrawHelper.updateWithdrawStatus(withdrawRecord.id, {
          status: 'failed',
          fail_reason: err.message
        })

        throw err
      }

    } catch (error) {
      console.error('[payment-service][withdraw] 提现失败:', error)
      return {
        code: -1,
        message: error.message || '提现失败',
        data: null
      }
    }
  },

  /**
   * 客户端支付成功后调用（用于更新订单状态和发放奖励）
   */
  async confirmPayment({ orderNo } = {}) {
    try {
      if (!orderNo) throw new Error('缺少订单号')

      const { uid } = this.currentUser

      // 1. 查询订单
      const order = await orderHelper.getOrderByNo(orderNo, uid)

      // 如果已经是 paid 状态，直接返回
      if (order.status === 'paid') {
        return {
          code: 0,
          message: '订单已处理',
          data: { already_paid: true }
        }
      }

      // 2. 更新订单状态
      await orderHelper.updateOrderStatus(orderNo, {
        status: 'paid',
        pay_time: Date.now()
      })

      console.log('[payment-service][confirmPayment] 订单确认成功', orderNo)

      // 3. 发放推荐人奖励
      let rewardCoins = 0
      try {
        if (rewardHelper.shouldGrantReferrerReward(order)) {
          rewardCoins = await rewardHelper.grantReferrerReward(order)
        }
      } catch (rewardErr) {
        console.error('[payment-service][confirmPayment] 发放推荐人奖励失败:', rewardErr)
      }

      return {
        code: 0,
        message: '支付确认成功',
        data: {
          success: true,
          reward_coins: rewardCoins
        }
      }
    } catch (error) {
      console.error('[payment-service][confirmPayment] 处理失败:', error)
      return {
        code: -1,
        message: error.message || '确认失败',
        data: null
      }
    }
  },

  /**
   * 支付回调通知处理
   */
  async paymentNotify(xmlData) {
    try {
      const data = wechatPayHelper.xmlToObj(xmlData)

      // 验证签名
      const sign = data.sign
      delete data.sign
      const checkSign = payUtils.md5Sign(data, payConfig.apiKey)

      if (sign !== checkSign) {
        throw new Error('签名验证失败')
      }

      if (data.return_code !== 'SUCCESS' || data.result_code !== 'SUCCESS') {
        throw new Error('支付失败')
      }

      const outTradeNo = data.out_trade_no
      const transactionId = data.transaction_id

      // 1. 查询订单
      const order = await orderHelper.getOrderByNo(outTradeNo)

      // 2. 更新订单状态
      await orderHelper.updateOrderStatus(outTradeNo, {
        status: 'paid',
        transaction_id: transactionId,
        pay_time: Date.now()
      })

      console.log('[payment-service][paymentNotify] 支付成功', outTradeNo)

      // 3. 发放推荐人奖励
      try {
        if (rewardHelper.shouldGrantReferrerReward(order)) {
          await rewardHelper.grantReferrerReward(order)
        }
      } catch (rewardErr) {
        console.error('[payment-service][paymentNotify] 发放推荐人奖励失败:', rewardErr)
      }

      // 返回成功响应给微信
      return '<xml><return_code><![CDATA[SUCCESS]]></return_code><return_msg><![CDATA[OK]]></return_msg></xml>'
    } catch (error) {
      console.error('[payment-service][paymentNotify] 处理失败:', error)
      return '<xml><return_code><![CDATA[FAIL]]></return_code><return_msg><![CDATA[' + error.message + ']]></return_msg></xml>'
    }
  }
}
