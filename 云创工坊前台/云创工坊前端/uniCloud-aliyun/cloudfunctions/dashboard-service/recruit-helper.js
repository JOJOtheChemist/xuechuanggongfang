/**
 * 拉新相关帮助函数
 */

/**
 * 获取最新拉新动态
 * @param {object} db - 数据库实例
 * @param {string} uid - 用户ID
 * @param {number} limit
 * @returns {object}
 */
async function getRecentRecruits(db, uid, limit = 20) {
    try {
        const dbCmd = db.command

        // 切换到 invite_logs 表，支持老用户扫码记录，且只查本人拉新
        const res = await db.collection('invite_logs')
            .where({
                inviter_id: uid
            })
            .orderBy('create_date', 'desc')
            .limit(limit)
            .get()

        const recruits = res.data || []
        if (recruits.length === 0) {
            return {
                code: 0,
                message: '获取成功',
                data: []
            }
        }

        // 收集涉及的用户ID用于头像补全
        const userIds = new Set()
        recruits.forEach(item => {
            if (item.inviter_id) userIds.add(item.inviter_id)
            if (item.new_user_id) userIds.add(item.new_user_id)
        })

        const userMap = {}
        if (userIds.size > 0) {
            const usersRes = await db.collection('uni-id-users')
                .where({
                    _id: dbCmd.in(Array.from(userIds))
                })
                .field({ _id: true, nickname: true, username: true, avatar: true })
                .get()
                ; (usersRes.data || []).forEach(user => {
                    userMap[user._id] = user
                })
        }

        let fileIDs = []
        const getAvatar = (uid) => {
            const info = userMap[uid]
            if (!info || !info.avatar) return 'https://vkceyugu.cdn.bspapp.com/VKCEYUGU-uni-id-avatar/default-avatar.png'
            if (info.avatar.startsWith('cloud://')) fileIDs.push(info.avatar)
            return info.avatar
        }
        const getName = (uid, fallback) => {
            const info = userMap[uid]
            return info ? (info.nickname || info.username || fallback) : fallback
        }

        const result = recruits.map(item => {
            return {
                _id: item._id,
                invitee_name: getName(item.new_user_id, item.new_user_nickname || '新伙伴'),
                invitee_avatar: getAvatar(item.new_user_id),
                inviter_id: item.inviter_id,
                inviter_name: getName(item.inviter_id, '伙伴'),
                inviter_avatar: getAvatar(item.inviter_id),
                register_date: item.create_date
            }
        })

        if (fileIDs.length > 0) {
            try {
                const fileRes = await uniCloud.getTempFileURL({
                    fileList: Array.from(new Set(fileIDs))
                })
                const urlMap = {}
                    ; (fileRes.fileList || []).forEach(f => { urlMap[f.fileID] = f.tempFileURL })
                result.forEach(item => {
                    if (item.inviter_avatar && urlMap[item.inviter_avatar]) {
                        item.inviter_avatar = urlMap[item.inviter_avatar]
                    }
                    if (item.invitee_avatar && urlMap[item.invitee_avatar]) {
                        item.invitee_avatar = urlMap[item.invitee_avatar]
                    }
                })
            } catch (err) {
                console.error('[recruit-helper][getRecentRecruits] 转换头像失败:', err)
            }
        }

        return {
            code: 0,
            message: '获取成功',
            data: result
        }
    } catch (error) {
        console.error('[recruit-helper][getRecentRecruits] 获取失败:', error)
        return {
            code: -1,
            message: error.message || '获取失败',
            data: []
        }
    }
}

/**
 * 获取拉新动态（内部使用）
 * @param {object} db - 数据库实例
 * @param {number} limit 
 * @returns {Promise<Array>}
 */
async function getRecruitDynamics(db, limit = 5) {
    try {
        const dbCmd = db.command

        // 查询有邀请人的最新用户
        const res = await db.collection('uni-id-users')
            .where({
                inviter_uid: dbCmd.neq(null)
            })
            .field({
                _id: true,
                nickname: true,
                username: true,
                avatar: true,
                inviter_uid: true,
                register_date: true
            })
            .orderBy('register_date', 'desc')
            .limit(limit)
            .get()

        const list = []
        if (res.data && res.data.length > 0) {
            res.data.forEach(item => {
                if (item.inviter_uid && Array.isArray(item.inviter_uid) && item.inviter_uid.length > 0) {
                    list.push({
                        type: 'recruit',
                        ts: item.register_date,
                        data: item
                    })
                }
            })
        }
        return list
    } catch (e) {
        console.warn('[recruit-helper][getRecruitDynamics] 获取拉新动态失败:', e)
        return []
    }
}

module.exports = {
    getRecentRecruits,
    getRecruitDynamics
}
