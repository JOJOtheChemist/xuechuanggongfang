const payUtils = require('wx-pay-config/utils')

/**
 * 验证提现金额和用户余额
 * @param {number} amount - 提现金额（元）
 * @param {string} uid - 用户ID
 * @returns {object} 验证结果 { valid: boolean, balance: number }
 */
async function validateWithdrawAmount(amount, uid) {
    if (!amount || amount <= 0) {
        throw new Error('提现金额必须大于0')
    }

    // 最小提现金额限制（例如 0.3 元）
    if (amount < 0.3) {
        throw new Error('提现金额最低为 0.3 元')
    }

    const db = uniCloud.database()

    // 检查用户余额
    const userRes = await db.collection('uni-id-users').doc(uid).field({ wallet: true }).get()
    const user = userRes.data[0]
    const userBalance = user && user.wallet && user.wallet.balance ? user.wallet.balance : 0

    if (userBalance < amount) {
        throw new Error('余额不足')
    }

    return {
        valid: true,
        balance: userBalance
    }
}

/**
 * 扣除用户余额
 * @param {string} uid - 用户ID
 * @param {number} amount - 扣除金额（元）
 * @returns {boolean} 是否成功
 */
async function deductUserBalance(uid, amount) {
    const db = uniCloud.database()

    const deductRes = await db.collection('uni-id-users').doc(uid).update({
        'wallet.balance': db.command.inc(-amount),
        'wallet.total_withdraw': db.command.inc(amount)
    })

    if (deductRes.updated !== 1) {
        throw new Error('扣款失败，请重试')
    }

    return true
}

/**
 * 回滚用户余额（提现失败时）
 * @param {string} uid - 用户ID
 * @param {number} amount - 回滚金额（元）
 */
async function refundUserBalance(uid, amount) {
    const db = uniCloud.database()

    await db.collection('uni-id-users').doc(uid).update({
        'wallet.balance': db.command.inc(amount),
        'wallet.total_withdraw': db.command.inc(-amount)
    })
}

/**
 * 创建提现记录
 * @param {object} params - 提现参数
 * @returns {object} 提现记录
 */
async function createWithdrawRecord({ uid, openid, amount, totalFee }) {
    const db = uniCloud.database()

    // 生成提现订单号
    const partnerTradeNo = payUtils.generateOrderNo()

    const withdrawRes = await db.collection('payment_withdraws').add({
        user_id: uid,
        openid: openid,
        amount: amount,
        total_fee: totalFee,
        order_no: partnerTradeNo,
        status: 'processing',
        create_date: Date.now()
    })

    return {
        id: withdrawRes.id,
        order_no: partnerTradeNo
    }
}

/**
 * 更新提现记录状态
 * @param {string} withdrawId - 提现记录ID
 * @param {object} updateData - 更新数据
 */
async function updateWithdrawStatus(withdrawId, updateData) {
    const db = uniCloud.database()

    await db.collection('payment_withdraws').doc(withdrawId).update({
        ...updateData,
        finish_date: Date.now()
    })
}

/**
 * 获取用户提现记录
 * @param {string} uid - 用户ID
 * @param {number} limit - 获取条数
 * @param {number} offset - 偏移量
 * @returns {object} 提现记录列表
 */
async function getWithdrawRecordsByUser(uid, limit = 20, offset = 0) {
    const db = uniCloud.database()

    const res = await db.collection('payment_withdraws')
        .where({ user_id: uid })
        .orderBy('create_date', 'desc')
        .skip(offset)
        .limit(limit)
        .get()

    const countRes = await db.collection('payment_withdraws')
        .where({ user_id: uid })
        .count()

    // 统计审核中的数量
    const pendingRes = await db.collection('payment_withdraws')
        .where({
            user_id: uid,
            status: 'processing'
        })
        .count()

    return {
        list: res.data,
        total: countRes.total,
        pending_count: pendingRes.total
    }
}

module.exports = {
    validateWithdrawAmount,
    deductUserBalance,
    refundUserBalance,
    createWithdrawRecord,
    updateWithdrawStatus,
    getWithdrawRecordsByUser
}
