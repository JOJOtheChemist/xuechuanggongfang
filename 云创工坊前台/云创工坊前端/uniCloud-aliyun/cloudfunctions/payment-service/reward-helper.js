/**
 * 检查是否应发放推荐人奖励
 * @param {object} order - 订单信息
 * @returns {boolean} 是否应发放
 */
function shouldGrantReferrerReward(order) {
    // 3=驾校, 7=勤工, 9=就业, 13=考证
    const targetBusinessIds = ['3', 3, '7', 7, '9', 9, '13', 13]

    return targetBusinessIds.includes(order.business_id)
        && order.signup_id
        && !order.referrer_reward_sent
}

/**
 * 获取或创建积分账户
 * @param {string} userId - 用户ID
 * @returns {object} 账户信息 { accountId, balance, totalPoints }
 */
async function getOrCreatePointsAccount(userId) {
    const db = uniCloud.database()
    const pointsColl = db.collection('user_points')

    const accountRes = await pointsColl.where({ user_id: userId }).get()

    let balance = 0
    let totalPoints = 0
    let accountId = null

    if (accountRes.data.length === 0) {
        // 创建新账户
        const addRes = await pointsColl.add({
            user_id: userId,
            balance: 0,
            total_points: 0,
            create_date: Date.now(),
            update_date: Date.now()
        })
        accountId = addRes.id
    } else {
        // 使用现有账户
        const account = accountRes.data[0]
        balance = account.balance || 0
        totalPoints = account.total_points || 0
        accountId = account._id
    }

    return {
        accountId,
        balance,
        totalPoints
    }
}

/**
 * 更新积分账户余额
 * @param {string} accountId - 账户ID
 * @param {number} points - 变动积分数
 * @param {number} currentBalance - 当前余额
 * @param {number} currentTotal - 当前总积分
 * @returns {number} 新余额
 */
async function updatePointsBalance(accountId, points, currentBalance, currentTotal) {
    const db = uniCloud.database()
    const pointsColl = db.collection('user_points')

    const newBalance = currentBalance + points
    const newTotal = currentTotal + points

    await pointsColl.doc(accountId).update({
        balance: newBalance,
        total_points: newTotal,
        update_date: Date.now()
    })

    return newBalance
}

/**
 * 记录积分流水
 * @param {object} params - 流水参数
 */
async function recordPointsLog({ userId, points, balanceAfter, refId, signupName }) {
    const db = uniCloud.database()

    await db.collection('points_logs').add({
        user_id: userId,
        change: points,
        balance_after: balanceAfter,
        reason: 'recommend_reward', // 推荐奖励
        source: 'payment-service',
        ref_id: refId,
        remark: `推荐用户 ${signupName || ''} 付费报名，奖励 ${points} 积分`,
        create_date: Date.now()
    })
}

/**
 * 标记奖励已发放
 * @param {string} orderNo - 订单号
 */
async function markRewardSent(orderNo) {
    const db = uniCloud.database()

    await db.collection('payment_orders')
        .where({ order_no: orderNo })
        .update({
            referrer_reward_sent: true
        })
}

/**
 * 给推荐人发放奖励
 * @param {object} order - 订单信息
 * @returns {number} 奖励积分数
 */
async function grantReferrerReward(order) {
    const db = uniCloud.database()

    // 查询报名记录，获取推荐人 ID
    const signupRes = await db.collection('business_signups')
        .doc(order.signup_id)
        .get()

    if (!signupRes.data || signupRes.data.length === 0) {
        return 0
    }

    const signup = signupRes.data[0]
    const referrerUid = signup.referrer_uid

    if (!referrerUid) {
        return 0
    }

    const rewardPoints = 10

    // 1. 获取或创建积分账户
    const account = await getOrCreatePointsAccount(referrerUid)

    // 2. 更新积分余额
    const newBalance = await updatePointsBalance(
        account.accountId,
        rewardPoints,
        account.balance,
        account.totalPoints
    )

    // 3. 记录积分流水
    await recordPointsLog({
        userId: referrerUid,
        points: rewardPoints,
        balanceAfter: newBalance,
        refId: order._id,
        signupName: signup.name || ''
    })

    // 4. 标记奖励已发放
    await markRewardSent(order.order_no)

    console.log(`[reward-helper] 给推荐人 ${referrerUid} 发放 ${rewardPoints} 积分`)

    return rewardPoints
}

module.exports = {
    shouldGrantReferrerReward,
    grantReferrerReward,
    getOrCreatePointsAccount,
    updatePointsBalance,
    recordPointsLog,
    markRewardSent
}
