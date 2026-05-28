/**
 * 统计卡片数据帮助函数
 */

async function resolveVisibleOrderScope(db, uid) {
    const userRes = await db.collection('uni-id-users')
        .doc(uid)
        .field({ team_info: true })
        .get()

    const user = userRes.data[0] || {}
    const teamInfo = user.team_info || {}
    const teamId = teamInfo.team_id || ''
    let resolvedTeamId = teamId

    let isLeader = teamInfo.position === '队长'
    let memberIds = [uid]

    if (!resolvedTeamId) {
        try {
            const leaderRes = await db.collection('teams')
                .where({
                    leader_id: uid,
                    status: 'active'
                })
                .limit(1)
                .get()
            const leaderTeam = leaderRes.data[0] || {}
            if (leaderTeam._id) {
                resolvedTeamId = leaderTeam._id
                isLeader = true
            }
        } catch (e) {
            console.warn('[stats-helper] 兜底查询团长团队失败:', e)
        }
    }

    if (resolvedTeamId) {
        try {
            const teamRes = await db.collection('teams')
                .doc(resolvedTeamId)
                .field({ leader_id: true })
                .get()
            const team = teamRes.data[0] || {}
            if (team.leader_id === uid) {
                isLeader = true
            }
        } catch (e) {
            console.warn('[stats-helper] 获取团队信息失败:', e)
        }

        try {
            const membersRes = await db.collection('uni-id-users')
                .where({
                    'team_info.team_id': resolvedTeamId,
                    'team_info.status': 'active'
                })
                .field({ _id: true })
                .get()

            memberIds = Array.from(new Set(
                [uid].concat((membersRes.data || []).map(item => item._id).filter(Boolean))
            ))
        } catch (e) {
            console.warn('[stats-helper] 获取团队成员失败:', e)
            memberIds = [uid]
        }
    }

    return {
        teamId: resolvedTeamId,
        isLeader,
        memberIds
    }
}

/**
 * 获取统计卡片数据
 * @param {object} db - 数据库实例
 * @param {string} uid - 用户ID
 * @returns {object} 统计数据
 */
async function getStatsCard(db, uid) {
    try {
        const dbCmd = db.command
        const scope = await resolveVisibleOrderScope(db, uid)
        const includeStatuses = ['pending', 'handled', 'paid', 'confirmed', 'success']

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

        // 统计今日新增订单
        const todayStart = new Date()
        todayStart.setHours(0, 0, 0, 0)
        let ordersRes
        let todayOrdersRes

        if (scope.teamId && scope.memberIds.length > 0) {
            ordersRes = await db.collection('business_signups')
                .where(dbCmd.and([
                    { status: dbCmd.in(includeStatuses) },
                    dbCmd.or([
                        { referrer_uid: dbCmd.in(scope.memberIds) },
                        { user_id: dbCmd.in(scope.memberIds) }
                    ])
                ]))
                .count()

            todayOrdersRes = await db.collection('business_signups')
                .where(dbCmd.and([
                    { status: dbCmd.in(includeStatuses) },
                    { create_date: dbCmd.gte(todayStart.getTime()) },
                    dbCmd.or([
                        { referrer_uid: dbCmd.in(scope.memberIds) },
                        { user_id: dbCmd.in(scope.memberIds) }
                    ])
                ]))
                .count()
        } else {
            ordersRes = await db.collection('business_signups')
                .where({
                    referrer_uid: uid,
                    status: dbCmd.in(includeStatuses)
                })
                .count()

            todayOrdersRes = await db.collection('business_signups')
                .where({
                    referrer_uid: uid,
                    status: dbCmd.in(includeStatuses),
                    create_date: dbCmd.gte(todayStart.getTime())
                })
                .count()
        }

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
