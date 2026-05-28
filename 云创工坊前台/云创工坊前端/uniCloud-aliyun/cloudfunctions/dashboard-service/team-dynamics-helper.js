/**
 * 团队动态帮助函数
 */

const LEVEL_TEXT_MAP = ['零级', '一级', '二级', '三级', '四级', '五级', '六级', '七级', '八级', '九级', '十级']

function formatLevelLabel(level) {
    const numericLevel = Number(level) || 0
    if (numericLevel === 0) return '本人'
    return LEVEL_TEXT_MAP[numericLevel] || `${numericLevel}级`
}

async function buildInviteMemberLevelMap(db, uid, maxLevel = 10) {
    const dbCmd = db.command
    const memberLevelMap = { [uid]: 0 }
    const allSubordinateIds = [uid]

    try {
        let currentLevelIds = [uid]
        let level = 1

        while (level <= maxLevel && currentLevelIds.length > 0) {
            const queryIds = currentLevelIds.slice(0, 1000)
            if (queryIds.length === 0) break

            const [usersRes, logsRes] = await Promise.all([
                db.collection('uni-id-users')
                    .where({ inviter_uid: dbCmd.in(queryIds) })
                    .field({ _id: true })
                    .get(),
                db.collection('invite_logs')
                    .where({ inviter_id: dbCmd.in(queryIds) })
                    .field({ new_user_id: true })
                    .get()
            ])

            const nextIdsFromUsers = usersRes.data.map(u => u._id)
            const nextIdsFromLogs = logsRes.data.map(l => l.new_user_id)
            const nextLevelIds = Array.from(new Set([...nextIdsFromUsers, ...nextIdsFromLogs]))
                .filter(id => id && memberLevelMap[id] === undefined)

            if (!nextLevelIds.length) {
                currentLevelIds = []
                level++
                continue
            }

            nextLevelIds.forEach(id => {
                memberLevelMap[id] = level
            })
            allSubordinateIds.push(...nextLevelIds)
            currentLevelIds = nextLevelIds
            level++
        }
    } catch (e) {
        console.error('[team-dynamics-helper] 获取下级关系失败:', e)
    }

    return {
        memberLevelMap,
        allSubordinateIds: Array.from(new Set(allSubordinateIds))
    }
}

/**
 * 获取团队动态（综合：拉新、开单、打卡）- 改为获取三级下级开单动态
 * @param {object} db - 数据库实例
 * @param {string} uid - 用户ID
 * @param {number} limit - 数量限制
 * @returns {object} 团队动态数组
 */
async function getTeamDynamics(db, uid, limit = 5) {
    try {
        const dbCmd = db.command

        // 1. 获取多级直推关系和层级映射
        const { memberLevelMap, allSubordinateIds } = await buildInviteMemberLevelMap(db, uid)

        // 2. 查询这些用户的开单记录 (business_signups)
        // 核心逻辑：只有当我或我的下级是“推荐人/促成人”时，才是我们的动态。
        const includeStatuses = ['pending', 'handled', 'success', 'paid', 'confirmed']
        const excludedBusinessIds = ['cat_006', 'cat_010', 'cat_012']
        let signupRaw = []
        try {
            const signupRes = await db.collection('business_signups')
                .where(dbCmd.and([
                    { status: dbCmd.in(includeStatuses) },
                    dbCmd.or([
                        { referrer_uid: dbCmd.in(allSubordinateIds) },
                        { user_id: dbCmd.in(allSubordinateIds) }
                    ])
                ]))
                .orderBy('create_date', 'desc')
                .limit(limit * 3)
                .get()

            if (signupRes.data && signupRes.data.length > 0) {
                signupRaw = signupRes.data
                    .filter(item => !excludedBusinessIds.includes(item.business_id || ''))
                    .map(item => ({
                        type: 'order',
                        ts: item.create_date,
                        data: item
                    }))
            }
        } catch (e) {
            console.error('[team-dynamics-helper] 获取开单动态失败:', e)
        }

        // 去重并按时间倒序排序
        let rawList = [...signupRaw]
        rawList.sort((a, b) => b.ts - a.ts)
        const finalRaw = rawList.slice(0, limit)

        if (finalRaw.length === 0) {
            return { code: 0, message: '获取成功', data: [] }
        }

        // 3. 收集涉及的用户ID (主要是邀请人/推荐人，即下级自己；以及被邀请人/客户)
        let userIds = new Set()
        finalRaw.forEach(item => {
            if (item.type === 'order') {
                if (item.data.referrer_uid) userIds.add(item.data.referrer_uid)
                if (item.data.user_id) userIds.add(item.data.user_id)
            }
        })

        // 4. 批量查询用户信息
        let userMap = {}
        if (userIds.size > 0) {
            try {
                const usersRes = await db.collection('uni-id-users')
                    .where({ _id: dbCmd.in(Array.from(userIds)) })
                    .field({ _id: true, nickname: true, username: true, avatar: true })
                    .get()
                usersRes.data.forEach(u => { userMap[u._id] = u })
            } catch (e) {
                console.error('[team-dynamics-helper] 获取用户信息失败', e)
            }
        }

        // 5. 转换头像 fileID
        let fileIDs = []
        const getUserAvatar = (uid) => {
            const u = userMap[uid]
            if (!u || !u.avatar) return 'https://vkceyugu.cdn.bspapp.com/VKCEYUGU-uni-id-avatar/default-avatar.png'
            if (u.avatar.startsWith('cloud://')) fileIDs.push(u.avatar)
            return u.avatar
        }
        const getUserName = (uid, defaultName) => {
            const u = userMap[uid]
            return u ? (u.nickname || u.username || defaultName) : defaultName
        }

        const result = finalRaw.map(item => {
            const d = item.data
            let resItem = {
                id: d._id,
                create_date: item.ts,
                inviter_avatar: '',
                inviter_name: '',
                invitee_name: '',
                business_name: '',
                level: 0,
                level_label: ''
            }

            if (item.type === 'order') {
                const isReferrerInTeam = !!(
                    d.referrer_uid &&
                    memberLevelMap[d.referrer_uid] !== undefined &&
                    d.referrer_uid !== d.user_id
                )
                const subjectUid = isReferrerInTeam ? d.referrer_uid : d.user_id
                const subjectLevel = memberLevelMap[subjectUid] || 0

                resItem.level = subjectLevel
                resItem.level_label = formatLevelLabel(subjectLevel)

                if (isReferrerInTeam) {
                    // 推荐人在团队内，显示邀请关系 (张三 邀请了 李四)
                    resItem.inviter_id = d.referrer_uid
                    resItem.inviter_avatar = getUserAvatar(d.referrer_uid)
                    resItem.inviter_name = getUserName(d.referrer_uid, d.referrer || `用户${d.referrer_uid || ''}`)
                    resItem.invitee_name = getUserName(d.user_id, d.name || `用户${d.user_id || ''}`)
                    resItem.action_type = 'invite'
                } else {
                    // 推荐人不在团队内，或没有推荐人，或推荐人就是自己，显示“报名”
                    resItem.inviter_id = d.user_id
                    resItem.inviter_avatar = getUserAvatar(d.user_id)
                    resItem.inviter_name = getUserName(d.user_id, d.name || `用户${d.user_id || ''}`)
                    resItem.invitee_name = ''
                    resItem.action_type = 'signup'
                }
                resItem.business_name = d.business_name || d.category || '业务'
            }

            return resItem
        })

        // 6. 转换头像 URL
        if (fileIDs.length > 0) {
            try {
                const fileRes = await uniCloud.getTempFileURL({ fileList: Array.from(new Set(fileIDs)) })
                const urlMap = {}
                    ; (fileRes.fileList || []).forEach(f => { urlMap[f.fileID] = f.tempFileURL })
                result.forEach(item => {
                    if (item.inviter_avatar && urlMap[item.inviter_avatar]) {
                        item.inviter_avatar = urlMap[item.inviter_avatar]
                    }
                })
            } catch (e) {
                console.error('[team-dynamics-helper][getTeamDynamics] 转换头像URL失败:', e)
            }
        }

        return {
            code: 0,
            message: '获取成功',
            data: result
        }
    } catch (error) {
        console.error('[team-dynamics-helper][getTeamDynamics] 获取失败:', error)
        return {
            code: 0,
            message: error.message || '获取失败',
            data: []
        }
    }
}

/**
 * 获取团队成员的开单动态
 * @param {object} db - 数据库实例
 * @param {string} uid - 用户ID
 * @param {number} limit - 数量限制
 * @returns {object} 团队成员开单动态数组
 */
async function getTeamMembersOrders(db, uid, limit = 20) {
    try {
        return await getTeamDynamics(db, uid, limit)
    } catch (error) {
        console.error('[team-dynamics-helper][getTeamMembersOrders] 获取失败:', error)
        return {
            code: 0,
            message: error.message || '获取失败',
            data: []
        }
    }
}

/**
 * 内部方法：获取拉新动态
 */
async function _getRecruitDynamics(db, limit = 5, uid) {
    if (!uid) return []

    const dbCmd = db.command
    try {
        const res = await db.collection('invite_logs')
            .where({
                inviter_id: uid
            })
            .orderBy('create_date', 'desc')
            .limit(limit)
            .get()

        const list = []
        if (res.data && res.data.length > 0) {
            res.data.forEach(log => {
                list.push({
                    type: 'recruit',
                    ts: log.create_date,
                    data: {
                        _id: log.new_user_id,
                        nickname: log.new_user_nickname,
                        inviter_uid: [log.inviter_id],
                        register_date: log.create_date,
                        ...log
                    }
                })
            })
        }
        return list
    } catch (e) {
        console.warn('[team-dynamics-helper][_getRecruitDynamics] 失败:', e)
        return []
    }
}

/**
 * 内部方法：获取打卡动态
 */
async function _getCheckInDynamics(db, limit = 5) {
    try {
        const res = await db.collection('check_in_records')
            .orderBy('create_date', 'desc')
            .limit(limit)
            .get()

        const list = []
        if (res.data && res.data.length > 0) {
            res.data.forEach(item => {
                list.push({
                    type: 'checkin',
                    ts: item.create_date,
                    data: item
                })
            })
        }
        return list
    } catch (e) {
        console.warn('[team-dynamics-helper][_getCheckInDynamics] 失败:', e)
        return []
    }
}

module.exports = {
    getTeamDynamics,
    getTeamMembersOrders
}
