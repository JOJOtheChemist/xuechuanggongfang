// uniCloud is global in cloud functions

/**
 * 获取钱包信息
 * @param {string} uid - 用户ID
 * @returns {object} 钱包信息
 */
async function getWalletInfo(uid) {
    try {
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
        console.error('[user-center][getWalletInfo] 获取钱包信息失败:', error)
        return {
            code: -1,
            message: error.message || '获取失败',
            data: null
        }
    }
}

/**
 * 获取我的统计数据
 * @param {string} uid - 用户ID
 * @returns {object} 统计数据
 */
async function getMyStats(uid) {
    try {
        const db = uniCloud.database()

        const userRes = await db.collection('uni-id-users')
            .doc(uid)
            .field({ stats: true })
            .get()

        const stats = userRes.data[0]?.stats || {
            total_orders: 0,
            total_sales: 0,
            team_sales: 0,
            company_sales: 0
        }

        return {
            code: 0,
            message: '获取成功',
            data: stats
        }
    } catch (error) {
        console.error('[user-center][getMyStats] 获取统计数据失败:', error)
        return {
            code: -1,
            message: error.message || '获取失败',
            data: null
        }
    }
}

module.exports = {
    getWalletInfo,
    getMyStats
}
