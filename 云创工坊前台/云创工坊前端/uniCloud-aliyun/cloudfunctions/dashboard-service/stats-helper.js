/**
 * 统计卡片数据帮助函数
 */

/**
 * 获取统计卡片数据
 * @param {object} db - 数据库实例
 * @param {string} uid - 用户ID
 * @returns {object} 统计数据
 */
async function getStatsCard(db, uid) {
    try {
        const dbCmd = db.command

        // 获取用户数据
        const userRes = await db.collection('uni-id-users')
            .doc(uid)
            .field({
                stats: true,
                wallet: true
            })
            .get()

        const userData = userRes.data[0] || {}
        const currentCoins = userData.wallet?.coins || 0

        // 统计业务报名的订单量（本人促成的）
        const ordersRes = await db.collection('business_signups')
            .where({
                referrer_uid: uid,
                status: dbCmd.in(['pending', 'handled'])
            })
            .count()

        // 统计今日新增订单（本人促成的）
        const todayStart = new Date()
        todayStart.setHours(0, 0, 0, 0)

        const todayOrdersRes = await db.collection('business_signups')
            .where({
                referrer_uid: uid,
                status: dbCmd.in(['pending', 'handled']),
                create_date: dbCmd.gte(todayStart.getTime())
            })
            .count()

        // 统计本人拉新用户数 (直接查询 status=registered 且 inviter_id=当前用户)
        const inviteStatsRes = await db.collection('invite_logs')
            .where({
                inviter_id: uid,
                status: 'registered'
            })
            .count()

        const newUsersCount = inviteStatsRes.total

        // 统计当月新币利润（本月 00:00 到现在）
        const monthStart = new Date()
        monthStart.setDate(1)
        monthStart.setHours(0, 0, 0, 0)

        const monthCoinLogsRes = await db.collection('coin_logs')
            .where({
                user_id: uid,
                amount: dbCmd.gt(0),
                status: 'success',
                create_date: dbCmd.gte(monthStart.getTime())
            })
            .get()

        const monthProfit = monthCoinLogsRes.data.reduce((sum, log) => sum + (log.amount || 0), 0)

        // 统计今日新币利润
        const todayCoinLogsRes = await db.collection('coin_logs')
            .where({
                user_id: uid,
                amount: dbCmd.gt(0),
                status: 'success',
                create_date: dbCmd.gte(todayStart.getTime())
            })
            .get()

        const todayProfit = todayCoinLogsRes.data.reduce((sum, log) => sum + (log.amount || 0), 0)

        return {
            code: 0,
            message: '获取成功',
            data: {
                monthProfit: monthProfit,
                todayProfit: todayProfit,
                currentCoins: currentCoins,
                newUsers: newUsersCount || 0,
                teamCount: 0,
                orderCount: ordersRes.total || 0,
                todayNewOrders: todayOrdersRes.total || 0,
                totalBalance: userData.wallet?.balance || 0
            }
        }
    } catch (error) {
        console.error('[stats-helper][getStatsCard] 获取失败:', error)
        return {
            code: -1,
            message: error.message || '获取失败',
            data: null
        }
    }
}

module.exports = {
    getStatsCard
}
