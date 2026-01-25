// uniCloud is global in cloud functions

/**
 * [NEW] 立即补录绑定邀请人 (供登录后的扫码进入场景使用)
 * @param {string} uid - 当前用户ID
 * @param {string} inviterId - 邀请人ID
 */
async function bindInviter(uid, inviterId) {
    try {
        if (!uid) {
            throw new Error('请先登录')
        }
        if (!inviterId) {
            throw new Error('缺少邀请人ID')
        }

        const db = uniCloud.database()
        const dbCmd = db.command
        const usersCollection = db.collection('uni-id-users')

        // 1. 获取当前用户信息，判断是否已有邀请人
        const userRes = await usersCollection.doc(uid).field({ inviter_uid: true, nickname: true, avatar: true }).get()
        if (!userRes.data || userRes.data.length === 0) {
            throw new Error('用户不存在')
        }
        const user = userRes.data[0]

        if (user.inviter_uid && user.inviter_uid.length > 0) {
            return { code: 0, message: '已有推荐人，无需重复绑定', data: { already_bound: true } }
        }

        // 2. 执行补录绑定
        console.log('[user-center][bindInviter] 执行补录绑定:', uid, '推荐人:', inviterId)

        // 2.1 绑定关系
        await usersCollection.doc(uid).update({
            inviter_uid: [inviterId],
            partner_info: { inviter_id: inviterId }
        })

        // 2.2 发放奖励 (发放给推荐人)
        try {
            const rewardCoins = 1

            // [Deduplication Check]
            const existingReward = await db.collection('coin_logs').where({
                user_id: inviterId,
                type: 'reward',
                ref_id: uid
            }).limit(1).get()

            if (!existingReward.data || existingReward.data.length === 0) {
                await usersCollection.doc(inviterId).update({
                    'wallet.coins': dbCmd.inc(rewardCoins)
                })

                await db.collection('coin_logs').add({
                    user_id: inviterId,
                    amount: rewardCoins,
                    type: 'reward',
                    status: 'success',
                    ref_id: uid, // Use new user's UID as ref_id
                    remark: '直推(扫码补录)奖励',
                    create_date: Date.now()
                })
                console.log(`[user-center] 扫码补录奖励发放成功: 给 ${inviterId} 发放 ${rewardCoins} 新币 (New User: ${uid})`)
            } else {
                console.log(`[user-center] 该新用户(${uid})带来的奖励已发放过，跳过`)
            }
        } catch (rewardErr) {
            console.error('[user-center] 发放扫码补录奖励失败:', rewardErr)
        }

        // 2.3 记录拉新日志
        try {
            await db.collection('invite_logs').add({
                inviter_id: inviterId,
                new_user_id: uid,
                new_user_nickname: user.nickname || '新伙伴',
                new_user_avatar: user.avatar || '',
                source: 'qr_immediate_bind',
                status: 'registered',
                create_date: Date.now()
            })
        } catch (logErr) {
            console.warn('[user-center] 写入 invite_logs 失败:', logErr)
        }

        return {
            code: 0,
            message: '绑定成功',
            data: { bound: true }
        }
    } catch (error) {
        console.error('[user-center][bindInviter] 失败:', error)
        return {
            code: -1,
            message: error.message || '绑定失败',
            data: null
        }
    }
}

/**
 * [NEW] 记录团队邀请查看 (供已登录用户扫码查看团队时调用)
 * @param {string} uid - 当前用户ID
 * @param {string} inviterId - 邀请人ID
 */
async function recordTeamInviteView(uid, inviterId) {
    try {
        if (!uid) {
            throw new Error('请先登录')
        }
        if (!inviterId) {
            throw new Error('缺少邀请人ID')
        }

        const db = uniCloud.database()

        // 1. 查询是否已存在记录
        const existingLogRes = await db.collection('invite_logs')
            .where({
                inviter_id: inviterId,
                new_user_id: uid
            })
            .limit(1)
            .get()

        if (existingLogRes.data && existingLogRes.data.length > 0) {
            console.log('[user-center][recordTeamInviteView] 记录已存在,跳过创建')
            return { code: 0, message: '记录已存在', data: { already_exists: true } }
        }

        // 2. 获取当前用户信息
        const userRes = await db.collection('uni-id-users')
            .doc(uid)
            .field({ nickname: true, avatar: true })
            .get()

        if (!userRes.data || userRes.data.length === 0) {
            throw new Error('用户不存在')
        }
        const user = userRes.data[0]

        // 3. 创建查看记录
        await db.collection('invite_logs').add({
            inviter_id: inviterId,
            new_user_id: uid,
            new_user_nickname: user.nickname || '伙伴',
            new_user_avatar: user.avatar || '',
            source: 'team_qr_logged_in',
            status: 'viewed',
            invite_type: 'team',
            create_date: Date.now()
        })

        console.log(`[user-center][recordTeamInviteView] 记录创建成功 - inviter: ${inviterId}, viewer: ${uid}`)

        // 4. [REMOVED] 奖励逻辑已移至注册或补录环节，查看不产生奖励
        console.log(`[user-center][recordTeamInviteView] 查看记录已更新 - inviter: ${inviterId}, viewer: ${uid}`)

        return {
            code: 0,
            message: '记录成功',
            data: { recorded: true }
        }
    } catch (error) {
        console.error('[user-center][recordTeamInviteView] 失败:', error)
        return {
            code: -1,
            message: error.message || '记录失败',
            data: null
        }
    }
}

/**
 * [NEW] 记录业务邀请查看 (供已登录用户扫码查看业务时调用)
 * @param {string} uid - 当前用户ID
 * @param {string} inviterId - 邀请人ID
 * @param {string} businessId - 业务ID
 */
async function recordBusinessInviteView(uid, inviterId, businessId) {
    try {
        if (!uid) {
            throw new Error('请先登录')
        }
        if (!inviterId) {
            throw new Error('缺少邀请人ID')
        }
        if (!businessId) {
            throw new Error('缺少业务ID')
        }

        const db = uniCloud.database()

        // 1. 查询是否已存在记录
        const existingLogRes = await db.collection('invite_logs')
            .where({
                inviter_id: inviterId,
                new_user_id: uid,
                business_id: businessId
            })
            .limit(1)
            .get()

        if (existingLogRes.data && existingLogRes.data.length > 0) {
            console.log('[user-center][recordBusinessInviteView] 记录已存在,跳过创建')
            return { code: 0, message: '记录已存在', data: { already_exists: true } }
        }

        // 2. 获取当前用户信息
        const userRes = await db.collection('uni-id-users')
            .doc(uid)
            .field({ nickname: true, avatar: true })
            .get()

        if (!userRes.data || userRes.data.length === 0) {
            throw new Error('用户不存在')
        }
        const user = userRes.data[0]

        // 3. 创建查看记录
        await db.collection('invite_logs').add({
            inviter_id: inviterId,
            new_user_id: uid,
            new_user_nickname: user.nickname || '伙伴',
            new_user_avatar: user.avatar || '',
            source: 'business_qr_logged_in',
            status: 'viewed',
            invite_type: 'business',
            business_id: businessId,
            create_date: Date.now()
        })

        console.log(`[user-center][recordBusinessInviteView] 记录创建成功 - inviter: ${inviterId}, viewer: ${uid}, businessId: ${businessId}`)

        // 4. [REMOVED] 奖励逻辑已移至注册或补录环节，查看不产生奖励
        console.log(`[user-center][recordBusinessInviteView] 查看记录已更新 - inviter: ${inviterId}, viewer: ${uid}`)

        return {
            code: 0,
            message: '记录成功',
            data: { recorded: true }
        }
    } catch (error) {
        console.error('[user-center][recordBusinessInviteView] 失败:', error)
        return {
            code: -1,
            message: error.message || '记录失败',
            data: null
        }
    }
}

module.exports = {
    bindInviter,
    recordTeamInviteView,
    recordBusinessInviteView
}
