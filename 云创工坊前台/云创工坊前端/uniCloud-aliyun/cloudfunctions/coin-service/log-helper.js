/**
 * 新币流水记录查询相关功能
 */

/**
 * 获取新币流水记录
 * @param {object} currentUser - 当前用户信息
 * @param {object} params
 * @param {number} params.limit - 获取条数
 * @param {number} params.offset - 偏移量
 * @param {string} params.status - 可选：按状态筛选（如 processing/success/failed/cancelled）
 * @param {string} params.type - 可选：记录类型（income/exchange/withdraw 等）
 */
async function getCoinLogs(currentUser, { limit = 20, offset = 0, status, type } = {}) {
    if (!currentUser) return { code: 0, message: '未登录', data: { list: [], total: 0 } }
    try {
        const { uid } = currentUser
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
}

module.exports = {
    getCoinLogs
}
