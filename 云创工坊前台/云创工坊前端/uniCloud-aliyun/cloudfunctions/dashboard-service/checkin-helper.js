/**
 * 打卡相关帮助函数
 */

/**
 * 获取最新打卡动态（含用户信息）
 * @param {object} db - 数据库实例
 * @param {number} limit
 * @returns {object}
 */
async function getRecentCheckIns(db, limit = 20) {
    try {
        const dbCmd = db.command
        const res = await db.collection('check_in_records')
            .orderBy('create_date', 'desc')
            .limit(limit)
            .get()

        const records = res.data || []
        if (records.length === 0) {
            return {
                code: 0,
                message: '获取成功',
                data: []
            }
        }

        const userIds = Array.from(new Set(records.map(item => item.user_id).filter(Boolean)))
        const userMap = {}
        if (userIds.length > 0) {
            const usersRes = await db.collection('uni-id-users')
                .where({
                    _id: dbCmd.in(userIds)
                })
                .field({
                    _id: true,
                    nickname: true,
                    username: true,
                    avatar: true
                })
                .get()

                ; (usersRes.data || []).forEach(user => {
                    userMap[user._id] = user
                })
        }

        let fileIDs = []
        const getAvatar = (uid) => {
            const user = userMap[uid]
            if (!user || !user.avatar) return 'https://vkceyugu.cdn.bspapp.com/VKCEYUGU-uni-id-avatar/default-avatar.png'
            if (user.avatar.startsWith('cloud://')) fileIDs.push(user.avatar)
            return user.avatar
        }
        const getName = (uid) => {
            const user = userMap[uid]
            return user ? (user.nickname || user.username || '') : ''
        }

        const result = records.map(item => ({
            _id: item._id,
            user_id: item.user_id,
            user_name: getName(item.user_id),
            user_avatar: getAvatar(item.user_id),
            check_in_date: item.check_in_date,
            create_date: item.create_date
        }))

        if (fileIDs.length > 0) {
            try {
                const fileRes = await uniCloud.getTempFileURL({
                    fileList: Array.from(new Set(fileIDs))
                })
                const urlMap = {}
                    ; (fileRes.fileList || []).forEach(f => { urlMap[f.fileID] = f.tempFileURL })
                result.forEach(item => {
                    if (item.user_avatar && urlMap[item.user_avatar]) {
                        item.user_avatar = urlMap[item.user_avatar]
                    }
                })
            } catch (err) {
                console.error('[checkin-helper][getRecentCheckIns] 转换头像失败:', err)
            }
        }

        return {
            code: 0,
            message: '获取成功',
            data: result
        }
    } catch (error) {
        console.error('[checkin-helper][getRecentCheckIns] 获取失败:', error)
        return {
            code: -1,
            message: error.message || '获取失败',
            data: []
        }
    }
}

/**
 * 获取打卡动态（内部使用）
 * @param {object} db - 数据库实例
 * @param {number} limit 
 * @returns {Promise<Array>}
 */
async function getCheckInDynamics(db, limit = 5) {
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
        console.warn('[checkin-helper][getCheckInDynamics] 获取打卡动态失败:', e)
        return []
    }
}

module.exports = {
    getRecentCheckIns,
    getCheckInDynamics
}
