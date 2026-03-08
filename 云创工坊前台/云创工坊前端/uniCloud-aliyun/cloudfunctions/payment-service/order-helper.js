const payConfig = require('wx-pay-config/config')
const payUtils = require('wx-pay-config/utils')

/**
 * 计算最终支付金额
 * @param {string|number} businessId - 业务ID
 * @param {number} amount - 传入的金额
 * @returns {number} 最终金额（元）
 */
function calculateAmount(businessId, amount, dbPrice) {
    console.log('[order-helper] calculateAmount incoming:', amount, 'dbPrice:', dbPrice, 'isTestMode:', payConfig.isTestMode)

    // 1. 如果有数据库配置的价格，优先级最高
    if (dbPrice !== null && dbPrice !== undefined && !payConfig.isTestMode) {
        return Number(dbPrice)
    }

    // 2. 如果 payConfig 强制了测试模式金额，则使用测试金额
    if (payConfig.isTestMode) {
        return payConfig.testAmount
    }

    // 3. 传入的 amount (前端传来的)
    if (amount) {
        return Number(amount)
    }

    // 4. 默认兜底
    return payConfig.productionAmount
}

/**
 * 创建订单记录
 * @param {object} params - 订单参数
 * @returns {object} 订单创建结果
 */
async function createOrderRecord({ uid, businessId, businessName, amount, totalFee, openid, signupId, extraData }) {
    const db = uniCloud.database()

    // 生成订单号
    const outTradeNo = payUtils.generateOrderNo()

    // 创建订单记录
    const orderData = {
        order_no: outTradeNo,
        user_id: uid,
        business_id: businessId,
        business_name: businessName || '学创工坊业务',
        amount: amount,
        total_fee: totalFee,
        status: 'created', // created, paid, failed, cancelled
        openid: openid,
        create_date: Date.now(),
        update_date: Date.now()
    }

    // 如果传入了 signupId，则关联报名记录
    if (signupId) {
        orderData.signup_id = signupId
    }

    if (extraData && typeof extraData === 'object') {
        orderData.extra_data = extraData
    }

    const orderRes = await db.collection('payment_orders').add(orderData)

    console.log('[order-helper][createOrderRecord] 订单创建成功', outTradeNo, uid)

    return {
        id: orderRes.id,
        order_no: outTradeNo
    }
}

/**
 * 更新订单状态
 * @param {string} orderNo - 订单号
 * @param {object} updateData - 更新数据
 */
async function updateOrderStatus(orderNo, updateData) {
    const db = uniCloud.database()

    await db.collection('payment_orders')
        .where({ order_no: orderNo })
        .update({
            ...updateData,
            update_date: Date.now()
        })
}

/**
 * 通过订单号查询订单
 * @param {string} orderNo - 订单号
 * @param {string} userId - 用户ID（可选，用于权限校验）
 * @returns {object} 订单信息
 */
async function getOrderByNo(orderNo, userId = null) {
    const db = uniCloud.database()

    const where = { order_no: orderNo }
    if (userId) {
        where.user_id = userId
    }

    const res = await db.collection('payment_orders')
        .where(where)
        .get()

    if (!res.data || res.data.length === 0) {
        throw new Error('订单不存在')
    }

    return res.data[0]
}

/**
 * 更新订单 prepay_id
 * @param {string} orderId - 订单ID
 * @param {string} prepayId - 预支付ID
 */
async function updateOrderPrepayId(orderId, prepayId) {
    const db = uniCloud.database()

    await db.collection('payment_orders').doc(orderId).update({
        prepay_id: prepayId,
        update_date: Date.now()
    })
}

module.exports = {
    calculateAmount,
    createOrderRecord,
    updateOrderStatus,
    getOrderByNo,
    updateOrderPrepayId
}
