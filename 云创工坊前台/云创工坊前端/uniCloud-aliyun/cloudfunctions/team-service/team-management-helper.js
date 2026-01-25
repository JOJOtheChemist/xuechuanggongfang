/**
 * 团队管理辅助模块
 * 包含团队的创建、查询、成员管理等功能
 */

module.exports = {
    /**
     * 创建团队（仅管理员）
     * @param {string} team_name - 团队名称
     * @param {string} team_level - 团队等级
     * @param {string} leader_id - 组长ID
     * @param {string} description - 团队描述
     * @param {object} currentUser - 当前用户信息
     * @returns {object} 创建结果
     */
    async createTeam({ team_name, team_level, leader_id, description }, currentUser) {
        try {
            if (!currentUser.role.includes('admin')) {
                throw new Error('仅管理员可以创建团队')
            }

            if (!team_name || !team_level) {
                throw new Error('团队名称和等级不能为空')
            }

            const db = uniCloud.database()

            // 获取组长信息
            let leader_name = ''
            if (leader_id) {
                const leaderRes = await db.collection('uni-id-users')
                    .doc(leader_id)
                    .field({ nickname: true, username: true })
                    .get()
                leader_name = leaderRes.data[0]?.nickname || leaderRes.data[0]?.username || ''
            }

            const res = await db.collection('teams').add({
                team_name,
                team_level,
                leader_id: leader_id || '',
                leader_name,
                member_count: 0,
                description: description || '',
                status: 'active',
                create_date: new Date().getTime(),
                update_date: new Date().getTime()
            })

            console.log('[team-management-helper][createTeam] 创建成功, team_id:', res.id)

            return {
                code: 0,
                message: '创建成功',
                data: { team_id: res.id }
            }
        } catch (error) {
            console.error('[team-management-helper][createTeam] 创建失败:', error)
            return {
                code: -1,
                message: error.message || '创建失败',
                data: null
            }
        }
    },

    /**
     * 获取团队列表
     * @param {number} page - 页码
     * @param {number} pageSize - 每页数量
     * @returns {object} 团队列表
     */
    async getTeamList({ page = 1, pageSize = 10 } = {}) {
        try {
            const db = uniCloud.database()

            const countRes = await db.collection('teams')
                .where({ status: 'active' })
                .count()

            const res = await db.collection('teams')
                .where({ status: 'active' })
                .orderBy('create_date', 'desc')
                .skip((page - 1) * pageSize)
                .limit(pageSize)
                .get()

            return {
                code: 0,
                message: '获取成功',
                data: {
                    list: res.data,
                    total: countRes.total,
                    page,
                    pageSize
                }
            }
        } catch (error) {
            console.error('[team-management-helper][getTeamList] 获取失败:', error)
            return {
                code: -1,
                message: error.message || '获取失败',
                data: { list: [], total: 0, page, pageSize }
            }
        }
    },

    /**
     * 获取团队详情
     * @param {string} teamId - 团队ID
     * @returns {object} 团队详情
     */
    async getTeamDetail(teamId) {
        try {
            if (!teamId) {
                throw new Error('缺少团队ID')
            }

            const db = uniCloud.database()

            const res = await db.collection('teams')
                .doc(teamId)
                .get()

            if (!res.data || res.data.length === 0) {
                throw new Error('团队不存在')
            }

            return {
                code: 0,
                message: '获取成功',
                data: res.data[0]
            }
        } catch (error) {
            console.error('[team-management-helper][getTeamDetail] 获取失败:', error)
            return {
                code: -1,
                message: error.message || '获取失败',
                data: null
            }
        }
    },

    /**
     * 获取团队成员列表
     * @param {Object} params
     * @param {string} params.teamId - 团队ID
     * @returns {array} 成员列表
     */
    async getTeamMembers({ teamId } = {}) {
        try {
            if (!teamId) {
                throw new Error('缺少团队ID')
            }

            const db = uniCloud.database()

            // 1. 先从 team_join_logs 获取所有已付费成员的 UID 列表
            const paidLogsRes = await db.collection('team_join_logs')
                .where({
                    team_id: teamId,
                    status: 'paid'  // ✅ 只要支付成功的
                })
                .field({ new_user_id: true })
                .get()

            const paidUserIds = paidLogsRes.data.map(log => log.new_user_id)

            // 2. 如果没有任何付费成员,直接返回空
            if (paidUserIds.length === 0) {
                console.log('[team-management-helper][getTeamMembers] 该团队暂无付费成员')
                return {
                    code: 0,
                    message: '获取成功',
                    data: []
                }
            }

            // 3. 查询这些付费用户的详细信息
            const res = await db.collection('uni-id-users')
                .where({
                    _id: db.command.in(paidUserIds),  // ✅ 只查询付费用户
                    'team_info.team_id': teamId,
                    'team_info.status': 'active'
                })
                .field({
                    _id: true,
                    username: true,
                    nickname: true,
                    avatar: true,
                    role: true,
                    profile: true,
                    team_info: true
                })
                .orderBy('team_info.join_team_date', 'asc')
                .get()

            console.log('[team-management-helper][getTeamMembers] 返回已付费成员列表:', res.data.length, '人')

            return {
                code: 0,
                message: '获取成功',
                data: res.data
            }
        } catch (error) {
            console.error('[team-management-helper][getTeamMembers] 获取失败:', error)
            return {
                code: -1,
                message: error.message || '获取失败',
                data: []
            }
        }
    }
}
