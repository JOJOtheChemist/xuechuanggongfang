/**
 * 新币余额与统计相关功能
 */

/**
 * 获取新币余额
 * @param {object} currentUser - 当前用户信息
 * @returns {object} 新币余额
 */
async function getCoinBalance(currentUser) {
    if (!currentUser) return { code: 0, message: '未登录', data: { coins: 0 } }
    try {
        const { uid } = currentUser
        const db = uniCloud.database()

        const userRes = await db.collection('uni-id-users')
            .doc(uid)
            .field({ wallet: true })
            .get()

        const coins = userRes.data[0]?.wallet?.coins || 0

        return {
            code: 0,
            message: '获取成功',
            data: { coins }
        }
    } catch (error) {
        console.error('[coin-service][getCoinBalance] 获取失败:', error)
        return {
            code: -1,
            message: error.message || '获取失败',
            data: null
        }
    }
}

/**
 * 获取新币统计数据
 * @param {object} currentUser - 当前用户信息
 * @returns {object} 包含：current_balance(当前余额)、today_income(今日新增)、total_income(累计收入)
 */
async function getCoinStats(currentUser) {
    if (!currentUser) return { code: 0, message: '未登录', data: { current_balance: 0, today_income: 0, total_income: 0 } }
    try {
        const { uid } = currentUser
        const db = uniCloud.database()
        const dbCmd = db.command

        // 1. 获取当前余额
        const userRes = await db.collection('uni-id-users')
            .doc(uid)
            .field({ wallet: true })
            .get()

        const current_balance = userRes.data[0]?.wallet?.coins || 0

        // 2. 计算今日新增（今天 00:00:00 到现在）
        const now = new Date()
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()

        const todayLogsRes = await db.collection('coin_logs')
            .where({
                user_id: uid,
                amount: dbCmd.gt(0), // 只统计收入
                status: 'success', // 只统计已完成的
                create_date: dbCmd.gte(todayStart)
            })
            .get()

        const today_income = todayLogsRes.data.reduce((sum, log) => sum + (log.amount || 0), 0)

        // 3. 计算累计收入（所有历史记录）
        const allIncomeLogs = await db.collection('coin_logs')
            .where({
                user_id: uid,
                amount: dbCmd.gt(0), // 只统计收入
                status: 'success' // 只统计已完成的
            })
            .get()

        const total_income = allIncomeLogs.data.reduce((sum, log) => sum + (log.amount || 0), 0)

        console.log('[coin-service][getCoinStats] 统计成功, userId:', uid, '当前余额:', current_balance, '今日新增:', today_income, '累计收入:', total_income)

        return {
            code: 0,
            message: '获取成功',
            data: {
                current_balance,
                today_income,
                total_income
            }
        }
    } catch (error) {
        console.error('[coin-service][getCoinStats] 获取失败:', error)
        return {
            code: -1,
            message: error.message || '获取统计数据失败',
            data: null
        }
    }
}

/**
 * 年度新币统计（个人/团队/公司）
 * @param {object} currentUser - 当前用户信息
 * @param {object} params
 * @param {number} params.year - 年份（如 2025），不传则用当前年
 */
async function getAnnualCoinStats(currentUser, { year } = {}) {
    try {
        const { uid } = currentUser
        const db = uniCloud.database()
        const dbCmd = db.command

        const now = new Date()
        const y = typeof year === 'number' ? year : now.getFullYear()
        const start = new Date(y, 0, 1, 0, 0, 0, 0).getTime()
        const end = new Date(y + 1, 0, 1, 0, 0, 0, 0).getTime()

        // 用户所在团队
        const userRes = await db.collection('uni-id-users')
            .doc(uid)
            .field({ team_info: true })
            .get()
        const teamInfo = userRes.data[0]?.team_info

        // 个人年度收入
        const userLogs = await db.collection('coin_logs')
            .where({ user_id: uid, amount: dbCmd.gt(0), status: 'success', create_date: dbCmd.gte(start).and(dbCmd.lt(end)) })
            .field({ amount: true })
            .get()
        const user_year_income = (userLogs.data || []).reduce((s, it) => s + (it.amount || 0), 0)

        // 团队年度收入（当前用户所在团队）
        let team_year_income = 0
        if (teamInfo && teamInfo.team_id) {
            const members = await db.collection('uni-id-users')
                .where({ 'team_info.team_id': teamInfo.team_id, 'team_info.status': 'active' })
                .field({ _id: true })
                .get()
            const ids = (members.data || []).map(m => m._id)
            if (ids.length) {
                const teamLogs = await db.collection('coin_logs')
                    .where({ user_id: dbCmd.in(ids), amount: dbCmd.gt(0), status: 'success', create_date: dbCmd.gte(start).and(dbCmd.lt(end)) })
                    .field({ amount: true })
                    .get()
                team_year_income = (teamLogs.data || []).reduce((s, it) => s + (it.amount || 0), 0)
            }
        }

        // 公司年度收入（全量）
        const companyLogs = await db.collection('coin_logs')
            .where({ amount: dbCmd.gt(0), status: 'success', create_date: dbCmd.gte(start).and(dbCmd.lt(end)) })
            .field({ amount: true })
            .get()
        const company_year_income = (companyLogs.data || []).reduce((s, it) => s + (it.amount || 0), 0)

        return { code: 0, message: '获取成功', data: { user_year_income, team_year_income, company_year_income } }
    } catch (error) {
        console.error('[coin-service][getAnnualCoinStats] 获取失败:', error)
        return { code: -1, message: error.message || '获取失败', data: null }
    }
}

/**
 * 获取昨日收益统计（个人/团队）
 * @param {object} currentUser - 当前用户信息
 */
async function getYesterdayStats(currentUser) {
    try {
        const { uid } = currentUser
        const db = uniCloud.database()
        const dbCmd = db.command

        const now = new Date()
        // Yesterday Start: 00:00:00 yesterday
        const yesterdayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1).getTime()
        // Yesterday End: 00:00:00 today
        const yesterdayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()

        // 1. Personal Yesterday Income（仅统计成功到账的正向流水）
        const userLogs = await db.collection('coin_logs')
            .where({
                user_id: uid,
                amount: dbCmd.gt(0),
                status: 'success',
                create_date: dbCmd.gte(yesterdayStart).and(dbCmd.lt(yesterdayEnd))
            })
            .field({ amount: true })
            .get()
        const user_yesterday_income = (userLogs.data || []).reduce((s, it) => s + (it.amount || 0), 0)

        // 2. Direct referral (1-level) yesterday income
        const referralRes = await db.collection('uni-id-users')
            .where({ inviter_uid: uid })
            .field({ _id: true })
            .get()

        let team_yesterday_income = 0
        const referralIds = (referralRes.data || []).map(m => m._id)
        if (referralIds.length) {
            const teamLogs = await db.collection('coin_logs')
                .where({
                    user_id: dbCmd.in(referralIds),
                    amount: dbCmd.gt(0),
                    status: 'success',
                    create_date: dbCmd.gte(yesterdayStart).and(dbCmd.lt(yesterdayEnd))
                })
                .field({ amount: true })
                .get()
            team_yesterday_income = (teamLogs.data || []).reduce((s, it) => s + (it.amount || 0), 0)
        }

        const direct_level_income = team_yesterday_income

        return {
            code: 0,
            message: '获取成功',
            data: {
                user_yesterday_income,
                team_yesterday_income: direct_level_income,
                direct_level_income
            }
        }

    } catch (error) {
        console.error('[coin-service][getYesterdayStats] 获取失败:', error)
        return { code: -1, message: error.message || '获取失败', data: null }
    }
}

module.exports = {
    getCoinBalance,
    getCoinStats,
    getAnnualCoinStats,
    getYesterdayStats
}
