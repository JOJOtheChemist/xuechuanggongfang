/**
 * 新币兑换积分相关功能
 */

/**
 * 申请新币兑换积分（进入审核队列）
 * @param {object} currentUser - 当前用户信息
 * @param {object} params
 * @param {number} params.coins - 要兑换的新币数量
 */
async function applyExchangeCoinsToPoints(currentUser, { coins, token } = {}) {
    try {
        if (!coins || typeof coins !== 'number' || coins <= 0) {
            throw new Error('兑换数量必须大于0')
        }

        if (coins < 1) {
            throw new Error('最低兑换 1 新币')
        }

        const { uid } = currentUser
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

        // 兑换比例：1 新币 = 5 积分
        const EXCHANGE_RATE = 5
        const points = Math.floor(coins * EXCHANGE_RATE)

        if (points <= 0) {
            throw new Error('兑换数量太少')
        }

        // 扣除新币余额（冻结）
        await db.collection('uni-id-users')
            .doc(uid)
            .update({
                'wallet.coins': dbCmd.inc(-coins)
            })

        // 创建兑换申请记录
        const requestRes = await db.collection('coin_exchange_requests')
            .add({
                user_id: uid,
                coins_amount: coins,
                points_amount: points,
                status: 'approved', // 直接完成
                create_date: Date.now(),
                update_date: Date.now()
            })

        // 记录新币流水（扣除）
        await db.collection('coin_logs')
            .add({
                user_id: uid,
                amount: -coins,
                type: 'exchange',
                status: 'success', // 直接成功
                ref_id: requestRes.id,
                remark: `兑换积分，扣除 ${coins} 新币，获得 ${points} 积分`,
                create_date: Date.now()
            })

        // 即时发放积分
        if (token) {
            try {
                const pointsService = uniCloud.importObject('points-service')
                await pointsService.changePoints({
                    _token: token,
                    delta: points,
                    reason: 'coin_exchange',
                    source: 'coin-service',
                    ref_id: requestRes.id,
                    remark: `新币兑换所得：${coins}新币 -> ${points}积分`
                })
            } catch (pointsError) {
                console.error('[coin-service][applyExchangeCoinsToPoints] 积分发放失败:', pointsError)
            }
        }

        console.log('[coin-service][applyExchangeCoinsToPoints] 申请成功, userId:', uid, 'coins:', coins, 'points:', points, 'requestId:', requestRes.id)

        return {
            code: 0,
            message: '兑换成功',
            data: {
                success: true,
                request_id: requestRes.id,
                coins_amount: coins,
                points_amount: points
            }
        }
    } catch (error) {
        console.error('[coin-service][applyExchangeCoinsToPoints] 申请失败:', error)
        return {
            code: -1,
            message: error.message || '申请失败',
            data: null
        }
    }
}

/**
 * 获取兑换申请列表
 * @param {object} currentUser - 当前用户信息
 * @param {object} params
 * @param {number} params.limit - 获取条数
 * @param {number} params.offset - 偏移量
 * @param {string} params.status - 可选：按状态筛选
 */
async function getExchangeRequests(currentUser, { limit = 20, offset = 0, status } = {}) {
    try {
        const { uid } = currentUser
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
}

/**
 * 取消兑换申请（仅限审核中状态）
 * @param {object} currentUser - 当前用户信息
 * @param {object} params
 * @param {string} params.requestId - 申请ID
 */
async function cancelExchangeRequest(currentUser, { requestId } = {}) {
    try {
        if (!requestId) {
            throw new Error('缺少申请ID')
        }

        const { uid } = currentUser
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

module.exports = {
    applyExchangeCoinsToPoints,
    getExchangeRequests,
    cancelExchangeRequest
}
