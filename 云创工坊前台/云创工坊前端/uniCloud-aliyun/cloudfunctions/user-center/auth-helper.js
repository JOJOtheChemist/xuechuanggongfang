// uniCloud is global in cloud functions
// internal imports not needed for this function based on analysis
const INVITE_REWARD_POINTS = 5

async function getOrCreatePointsAccount(db, userId) {
    const pointsCollection = db.collection('user_points')
    const accountRes = await pointsCollection.where({ user_id: userId }).limit(1).get()

    if (accountRes.data && accountRes.data.length > 0) {
        const account = accountRes.data[0]
        return {
            accountId: account._id,
            balance: account.balance || 0,
            totalPoints: account.total_points || 0
        }
    }

    const addRes = await pointsCollection.add({
        user_id: userId,
        balance: 0,
        total_points: 0,
        create_date: Date.now(),
        update_date: Date.now()
    })

    return {
        accountId: addRes.id,
        balance: 0,
        totalPoints: 0
    }
}

async function grantInviteRewardPoints({
    db,
    inviterId,
    inviteeUid,
    source,
    remark
}) {
    if (!inviterId || !inviteeUid || inviterId === inviteeUid) {
        return { rewarded: false, points: 0 }
    }

    const existingReward = await db.collection('points_logs').where({
        user_id: inviterId,
        reason: 'recommend_reward',
        ref_id: inviteeUid
    }).limit(1).get()

    if (existingReward.data && existingReward.data.length > 0) {
        return { rewarded: false, points: 0 }
    }

    const account = await getOrCreatePointsAccount(db, inviterId)
    const newBalance = account.balance + INVITE_REWARD_POINTS
    const newTotal = account.totalPoints + INVITE_REWARD_POINTS

    await db.collection('user_points').doc(account.accountId).update({
        balance: newBalance,
        total_points: newTotal,
        update_date: Date.now()
    })

    await db.collection('points_logs').add({
        user_id: inviterId,
        change: INVITE_REWARD_POINTS,
        balance_after: newBalance,
        reason: 'recommend_reward',
        source,
        ref_id: inviteeUid,
        remark,
        create_date: Date.now()
    })

    return { rewarded: true, points: INVITE_REWARD_POINTS }
}

/**
 * 微信登录（原生实现，不依赖uni-id-common）
 * @param {object} params
 * @param {string} params.code - 微信授权code
 * @param {string|object} params.inviterId - 邀请人ID (可选) 或邀请信息对象 { inviterId, inviteType }
 * @returns {object} { token, userInfo }
 */
async function loginByWeixin({ code, inviterId }) {
    if (!code) {
        return {
            code: -1,
            message: '缺少微信授权code',
            data: null
        }
    }

    try {
        console.log('--- [user-center][loginByWeixin] 入口 ---')
        console.log('入参 code:', code)
        console.log('入参 inviterId (桌号):', inviterId || '无')

        // [NEW] 兼容新旧参数格式: inviterId 可能是字符串或对象
        let actualInviterId = ''
        let inviteType = '' // 'team' 或 'business'

        if (typeof inviterId === 'object' && inviterId !== null) {
            actualInviterId = inviterId.inviterId || ''
            inviteType = inviterId.inviteType || ''
            console.log('[user-center] 解析邀请信息对象 - inviterId:', actualInviterId, 'inviteType:', inviteType)
        } else if (typeof inviterId === 'string') {
            actualInviterId = inviterId
            console.log('[user-center] 使用字符串inviterId (兼容旧逻辑):', actualInviterId)
        }

        // 统一使用 actualInviterId 替代原来的 inviterId
        inviterId = actualInviterId

        // 1. 调用微信接口获取 openid 和 session_key
        const APPID = 'wxd7918f6ffc6e4234'
        const SECRET = '607588d26e9df050892c321579063f8e'
        const url = `https://api.weixin.qq.com/sns/jscode2session?appid=${APPID}&secret=${SECRET}&js_code=${code}&grant_type=authorization_code`

        console.log('[loginByWeixin] 调用微信API...')
        const wxRes = await uniCloud.httpclient.request(url, {
            method: 'GET',
            dataType: 'json'
        })

        if (wxRes.data.errcode) {
            return {
                code: -1,
                message: '微信登录失败: ' + (wxRes.data.errmsg || wxRes.data.errcode),
                data: null
            }
        }

        const { openid } = wxRes.data

        // 2. 查找或创建用户
        const db = uniCloud.database()
        const usersCollection = db.collection('uni-id-users')

        // 根据 openid 查找用户
        let userQuery = await usersCollection.where({
            'wx_openid.mp-weixin': openid
        }).get()

        let uid
        let isNewUser = false

        if (userQuery.data.length === 0) {
            // 新用户，创建账号
            isNewUser = true
            const newUser = {
                wx_openid: {
                    'mp-weixin': openid
                },
                nickname: '用户' + openid.substr(-6),
                role: ['user'],
                wallet: {
                    balance: 0,
                    frozen_balance: 0,
                    total_income: 0,
                    total_withdraw: 0,
                    coins: 0 // 初始化新币
                },
                stats: {
                    total_orders: 0,
                    total_sales: 0,
                    team_sales: 0,
                    company_sales: 0
                },
                check_in: {
                    last_check_in_date: '',
                    streak_days: 0,
                    total_check_in_days: 0
                },
                profile: {
                    is_profile_completed: false
                },
                register_date: Date.now(),
                last_login_date: Date.now()
            }

            // 绑定邀请关系
            if (inviterId) {
                newUser.inviter_uid = [inviterId] // uni-id 风格
                newUser.partner_info = { inviter_id: inviterId } // 业务风格
            }

            const addRes = await usersCollection.add(newUser)
            uid = addRes.id

            // 初始化积分账户：新用户赠送 20 积分
            try {
                const pointsCollection = db.collection('user_points')
                await pointsCollection.add({
                    user_id: uid,
                    balance: 20,
                    create_date: Date.now(),
                    update_date: Date.now()
                })
            } catch (pointsErr) {
                console.error('[user-center][loginByWeixin] 初始化积分账户失败:', pointsErr)
            }

            // ===================================
            // 新用户注册奖励逻辑 (发放给推荐人)
            // ===================================
            if (inviterId) {
                try {
                    console.log('[user-center][loginByWeixin] 处理推荐奖励，推荐人:', inviterId)

                    const rewardResult = await grantInviteRewardPoints({
                        db,
                        inviterId,
                        inviteeUid: uid,
                        source: 'user-center-login-new',
                        remark: '直推新用户注册奖励 +5 积分'
                    })

                    if (rewardResult.rewarded) {
                        console.log(`[user-center] 直推奖励发放成功: 给 ${inviterId} 发放 ${rewardResult.points} 积分 (New User: ${uid})`)
                    } else {
                        console.log(`[user-center] 该新用户(${uid})带来的奖励已发放过，跳过`)
                    }

                    // 2. 间推奖励逻辑已移除 (根据用户最新需求)
                } catch (rewardErr) {
                    console.error('[user-center] 发放新用户奖励失败:', rewardErr)
                    // 奖励失败不影响注册
                }
            }
        } else {
            // 老用户
            uid = userQuery.data[0]._id
            const existingUser = userQuery.data[0]

            // 默认只更新登录时间
            let updateData = {
                last_login_date: Date.now()
            }

            // [新增] 老用户绑定邀请关系逻辑
            // 如果老用户没有邀请人，且本次携带了 inviterId，则视为拉新
            // 注意：需确保 inviterId 不是自己
            if (inviterId && (!existingUser.inviter_uid || existingUser.inviter_uid.length === 0)) {
                console.log('[user-center] 老用户无邀请人，进行补录绑定:', uid, '推荐人:', inviterId)

                // 1. 绑定关系
                updateData.inviter_uid = [inviterId]
                updateData.partner_info = { inviter_id: inviterId } // 保持业务字段一致

                // 2. 发放奖励 (发放给推荐人)
                try {
                    const rewardResult = await grantInviteRewardPoints({
                        db,
                        inviterId,
                        inviteeUid: uid,
                        source: 'user-center-login-reactive',
                        remark: '直推(老用户唤醒)奖励 +5 积分'
                    })

                    if (rewardResult.rewarded) {
                        console.log(`[user-center] 老用户唤醒奖励发放成功: 给 ${inviterId} 发放 ${rewardResult.points} 积分 (UID: ${uid})`)
                    } else {
                        console.log(`[user-center] 该用户(${uid})带来的唤醒奖励已发放过，跳过`)
                    }
                } catch (rewardErr) {
                    console.error('[user-center] 发放老用户唤醒奖励失败:', rewardErr)
                }
            }

            await usersCollection.doc(uid).update(updateData)
        }

        // 3. 获取用户信息
        const finalUserRes = await usersCollection.doc(uid).get()
        const user = finalUserRes.data[0]

        // 3.1 记录拉新日志，方便业务统计
        if (inviterId) {
            // [修改] 只有当 inviterId 确实是该用户的邀请人时（无论是刚注册绑定的，还是老用户刚绑定的，或者是之前就已经绑定的），才记录日志
            // 避免 A 扫 B，但 A 已经是 C 的下线，导致 B 的日志里出现 A
            const isBoundInviter = user.inviter_uid && user.inviter_uid.includes(inviterId)

            if (isBoundInviter) {
                try {
                    const inviteLogs = db.collection('invite_logs')
                    const existed = await inviteLogs.where({
                        inviter_id: inviterId,
                        new_user_id: uid
                    }).limit(1).get()

                    if (!existed.data || existed.data.length === 0) {
                        // [NEW] 根据 inviteType 决定 status 和 source
                        let logStatus = 'registered'
                        let logSource = 'weixin_qr'

                        if (inviteType === 'team') {
                            logStatus = 'viewed' // 团队邀请: 登录时标记为"已查看"
                            logSource = 'team_qr'
                            console.log('[user-center] 创建团队邀请记录 - status: viewed')
                        } else if (inviteType === 'business') {
                            logStatus = 'registered' // 业务邀请: 保持原逻辑
                            logSource = 'business_qr'
                            console.log('[user-center] 创建业务邀请记录 - status: registered')
                        }

                        await inviteLogs.add({
                            inviter_id: inviterId,
                            new_user_id: uid,
                            new_user_nickname: user.nickname || user.username || '',
                            new_user_avatar: user.avatar || '',
                            source: logSource,
                            status: logStatus,
                            invite_type: inviteType || 'unknown', // [NEW] 记录邀请类型
                            create_date: Date.now()
                        })
                        console.log(`[user-center] invite_logs 记录创建成功 - inviteType: ${inviteType}, status: ${logStatus}`)
                    } else {
                        console.log(`[user-center] invite_logs 记录已存在，跳过创建`)
                    }
                } catch (logErr) {
                    console.warn('[user-center] 写入 invite_logs 失败:', logErr)
                }
            } else {
                console.log(`[user-center] 忽略拉新日志: 当前用户 ${uid} 的邀请人是 ${user.inviter_uid}，与本次参数 ${inviterId} 不一致`)
            }
        }

        // 4. 生成简单的 token
        const token = Buffer.from(JSON.stringify({
            uid,
            openid,
            timestamp: Date.now()
        })).toString('base64')

        return {
            code: 0,
            message: isNewUser ? '注册成功' : '登录成功',
            data: {
                token,
                uid,
                isNewUser,
                userInfo: {
                    uid: user._id,
                    nickname: user.nickname,
                    avatar: user.avatar || '',
                    mobile: user.mobile || '',
                    role: user.role || ['user'],
                    wallet: user.wallet || {},
                    profile: user.profile || {}
                }
            }
        }
    } catch (error) {
        console.error('[user-center][loginByWeixin] 登录失败:', error)
        return {
            code: -1,
            message: '登录异常: ' + error.message,
            data: null
        }
    }
}

module.exports = {
    loginByWeixin
}
