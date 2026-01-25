const crypto = require('crypto')
// uniCloud is global in cloud functions

/**
 * 获取用户信息
 * @param {string} uid - 用户ID
 * @returns {object} 用户信息
 */
async function getUserInfo(uid) {
    try {
        const db = uniCloud.database()

        const userRes = await db.collection('uni-id-users')
            .doc(uid)
            .get()

        if (!userRes.data || userRes.data.length === 0) {
            throw new Error('用户不存在')
        }

        const userInfo = userRes.data[0]

        return {
            code: 0,
            message: '获取成功',
            data: {
                uid: userInfo._id,
                username: userInfo.username,
                nickname: userInfo.nickname,
                avatar: userInfo.avatar,
                mobile: userInfo.mobile,
                email: userInfo.email,
                role: userInfo.role,
                profile: userInfo.profile,
                team_info: userInfo.team_info,
                partner_info: userInfo.partner_info,
                wallet: userInfo.wallet,
                stats: userInfo.stats,
                check_in: userInfo.check_in,
                create_date: userInfo.create_date
            }
        }
    } catch (error) {
        console.error('[user-center][getUserInfo] 获取用户信息失败:', error)
        return {
            code: -1,
            message: error.message || '获取失败',
            data: null
        }
    }
}

/**
 * 更新个人资料
 * @param {string} uid - 用户ID
 * @param {object} profile - 要更新的资料字段
 * @returns {object} 更新结果
 */
async function updateProfile(uid, profile) {
    try {
        const db = uniCloud.database()

        // 先读取用户当前数据，用于判断头像/昵称是否发生实际变更
        const userRes = await db.collection('uni-id-users')
            .doc(uid)
            .field({ nickname: true, avatar: true, profile_edit: true })
            .get()

        if (!userRes.data || userRes.data.length === 0) {
            throw new Error('用户不存在')
        }

        const user = userRes.data[0]

        // 构建更新数据
        const updateData = {}

        // 允许更新的字段
        const allowedFields = ['nickname', 'avatar', 'mobile', 'email']
        allowedFields.forEach(field => {
            if (profile[field] !== undefined) {
                updateData[field] = profile[field]
            }
        })

        // profile 字段
        const profileFields = ['real_name', 'phone', 'nation', 'work_duration', 'school', 'enrollment_year', 'is_student']
        const profileUpdate = {}
        let hasProfileUpdate = false

        profileFields.forEach(field => {
            if (profile[field] !== undefined) {
                profileUpdate[`profile.${field}`] = profile[field]
                hasProfileUpdate = true
            }
        })

        // 检查是否完善了必要信息
        if (hasProfileUpdate) {
            const checkFields = ['real_name', 'phone', 'nation', 'work_duration']
            const allFilled = checkFields.every(field => profile[field])
            if (allFilled) {
                profileUpdate['profile.is_profile_completed'] = true
            }
        }

        // 判断本次是否修改了头像或昵称
        const willUpdateNickname = profile.nickname !== undefined && profile.nickname !== user.nickname
        const willUpdateAvatar = profile.avatar !== undefined && profile.avatar !== user.avatar

        if (willUpdateNickname || willUpdateAvatar) {
            // 头像、昵称分别计数：各自 7 天内最多 3 次
            const MAX_CHANGES = 5
            const WINDOW_DAYS = 7
            const now = Date.now()
            const windowMs = WINDOW_DAYS * 24 * 60 * 60 * 1000

            const profileEdit = user.profile_edit || {}
            // 兼容旧字段 avatar_nickname_changes：首次迁移为两份独立历史
            const baseHistory = Array.isArray(profileEdit.avatar_nickname_changes)
                ? profileEdit.avatar_nickname_changes
                : []
            let nicknameHistory = Array.isArray(profileEdit.nickname_changes)
                ? profileEdit.nickname_changes
                : baseHistory
            let avatarHistory = Array.isArray(profileEdit.avatar_changes)
                ? profileEdit.avatar_changes
                : baseHistory

            // 仅保留最近 7 天内的记录
            nicknameHistory = nicknameHistory.filter(ts => now - ts < windowMs)
            avatarHistory = avatarHistory.filter(ts => now - ts < windowMs)

            // 昵称单独限流
            if (willUpdateNickname && nicknameHistory.length >= MAX_CHANGES) {
                const oldest = nicknameHistory[0]
                const nextAvailableTime = oldest + windowMs

                return {
                    code: -1,
                    message: '昵称 7 天内最多可修改 5 次，请稍后再试',
                    data: {
                        success: false,
                        remaining: 0,
                        next_available_time: nextAvailableTime
                    }
                }
            }

            // 头像单独限流
            if (willUpdateAvatar && avatarHistory.length >= MAX_CHANGES) {
                const oldest = avatarHistory[0]
                const nextAvailableTime = oldest + windowMs

                return {
                    code: -1,
                    message: '头像 7 天内最多可修改 5 次，请稍后再试',
                    data: {
                        success: false,
                        remaining: 0,
                        next_available_time: nextAvailableTime
                    }
                }
            }

            // 本次修改分别计入对应记录
            if (willUpdateNickname) {
                nicknameHistory.push(now)
                updateData['profile_edit.nickname_changes'] = nicknameHistory
            }
            if (willUpdateAvatar) {
                avatarHistory.push(now)
                updateData['profile_edit.avatar_changes'] = avatarHistory
            }
        }

        // 合并更新数据
        Object.assign(updateData, profileUpdate)
        updateData.update_date = new Date().getTime()

        await db.collection('uni-id-users')
            .doc(uid)
            .update(updateData)

        console.log('[user-center][updateProfile] 更新成功, uid:', uid)

        return {
            code: 0,
            message: '更新成功',
            data: { success: true }
        }
    } catch (error) {
        console.error('[user-center][updateProfile] 更新失败:', error)
        return {
            code: -1,
            message: error.message || '更新失败',
            data: null
        }
    }
}


/**
 * 获取提现收款码
 * @param {string} uid - 用户ID
 * @returns {object} 收款码URL
 */
async function getPaymentQrcode(uid) {
    try {
        const db = uniCloud.database()
        const userRes = await db.collection('uni-id-users')
            .doc(uid)
            .field({ 'wallet.payment_qrcode': true })
            .get()

        if (!userRes.data || userRes.data.length === 0) {
            throw new Error('用户不存在')
        }

        const wallet = userRes.data[0].wallet || {}
        return {
            code: 0,
            message: '获取成功',
            data: {
                payment_qrcode: wallet.payment_qrcode || ''
            }
        }
    } catch (e) {
        console.error('[user-center][getPaymentQrcode] Failed:', e)
        return {
            code: -1,
            message: e.message || '获取失败',
            data: null
        }
    }
}

/**
 * 更新提现收款码
 * @param {string} uid - 用户ID
 * @param {string} qrcodeUrl - 收款码URL
 * @returns {object} 更新结果
 */
async function updatePaymentQrcode(uid, qrcodeUrl) {
    try {
        const db = uniCloud.database()
        await db.collection('uni-id-users')
            .doc(uid)
            .update({
                'wallet.payment_qrcode': qrcodeUrl
            })

        return {
            code: 0,
            message: '更新成功',
            data: {
                payment_qrcode: qrcodeUrl
            }
        }
    } catch (e) {
        console.error('[user-center][updatePaymentQrcode] Failed:', e)
        return {
            code: -1,
            message: e.message || '更新失败',
            data: null
        }
    }
}

module.exports = {
    getUserInfo,
    updateProfile,
    getPaymentQrcode,
    updatePaymentQrcode
}
