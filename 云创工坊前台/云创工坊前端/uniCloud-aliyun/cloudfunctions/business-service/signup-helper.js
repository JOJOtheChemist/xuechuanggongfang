/**
 * Signup Helper - 业务报名相关操作
 * 包含业务报名提交、懒绑定等功能
 */
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

    const existLog = await db.collection('points_logs').where({
        user_id: inviterId,
        reason: 'recommend_reward',
        ref_id: inviteeUid
    }).limit(1).get()

    if (existLog.data && existLog.data.length > 0) {
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
 * 提交业务报名
 * @param {string} uid - 用户ID
 * @param {object} signupData - 报名数据
 * @param {string} signupData.businessId - 业务板块ID
 * @param {string} signupData.businessName - 业务板块名称
 * @param {string} signupData.name - 姓名
 * @param {string} signupData.mobile - 手机号
 * @param {string} signupData.nation - 民族
 * @param {string} signupData.workDuration - 工作期限
 * @param {string} signupData.school - 学校
 * @param {string} signupData.entryYear - 入学年份
 * @param {string} signupData.wechatId - 微信号（选填）
 * @param {string} signupData.category - 报名类别（例如 勤工俭学）
 * @param {string} signupData.signupWx - 招聘人微信 / 报名微信号
 * @param {string} signupData.referrer - 推荐人（展示用，可为空）
 * @param {string} signupData.referrerUid - 推荐人 uid（用于拉新积分奖励）
 * @param {string} signupData.contactInfo - 联系方式（可选，默认使用 mobile）
 * @param {string} signupData.remark - 备注
 * @param {string} signupData.age - 年龄
 * @returns {object} 响应对象
 */
async function submitSignup(uid, signupData = {}) {
    try {
        if (!uid) {
            throw new Error('请先登录')
        }

        const {
            businessId,
            businessName,
            name,
            mobile,
            nation,
            workDuration,
            school,
            entryYear,
            wechatId,
            category,
            signupWx,
            referrer,
            referrerUid,
            contactInfo,
            remark,
            age
        } = signupData

        if (!businessId) {
            throw new Error('缺少业务板块ID')
        }
        if (!name) {
            throw new Error('缺少姓名')
        }
        if (!mobile) {
            throw new Error('缺少手机号')
        }

        const db = uniCloud.database()
        const signupsCollection = db.collection('business_signups')

        // 获取用户基础信息，补充到报名表里方便查看
        const userRes = await db.collection('uni-id-users').doc(uid).field({
            mobile: true,
            nickname: true,
            wx_openid: true,
            inviter_uid: true,
            partner_info: true
        }).get()
        const userInfo = userRes.data[0] || {}

        // [Lazy Binding] 如果当前用户还没有终身推荐人，且本次提交带了推荐人，则进行补录绑定
        if (referrerUid && (!userInfo.inviter_uid || userInfo.inviter_uid.length === 0)) {
            console.log('[business-service] 执行懒绑定：老用户补录邀请人:', referrerUid)
            try {
                // 1. 绑定关系 (始终执行绑定，即使奖励已发放)
                await db.collection('uni-id-users').doc(uid).update({
                    inviter_uid: [referrerUid],
                    partner_info: { inviter_id: referrerUid }
                })

                const rewardResult = await grantInviteRewardPoints({
                    db,
                    inviterId: referrerUid,
                    inviteeUid: uid,
                    source: 'business-signup-lazy-bind',
                    remark: '直推(业务补录)奖励 +5 积分'
                })

                if (!rewardResult.rewarded) {
                    console.log(`[business-service] 忽略重复奖励: 推荐人 ${referrerUid} 已经获得过针对用户 ${uid} 的奖励`)
                } else {
                    // 3. 记录邀请日志 (invite_logs)
                    await db.collection('invite_logs').add({
                        inviter_id: referrerUid,
                        new_user_id: uid,
                        new_user_nickname: userInfo.nickname || '新伙伴',
                        new_user_avatar: userInfo.avatar || '',
                        source: 'business_signup_lazy',
                        status: 'registered',
                        create_date: Date.now()
                    })
                    console.log(`[business-service] 懒绑定及奖励发放成功，发放 ${rewardResult.points} 积分`)
                }
            } catch (bindErr) {
                console.error('[business-service] 懒绑定失败:', bindErr)
            }
        }

        // 最终存入的联系方式：优先用前端传的，其次用绑定的手机号
        const finalContact = contactInfo || mobile || userInfo.mobile || '未填写'

        const res = await signupsCollection.add({
            user_id: uid,
            business_id: businessId,
            business_name: businessName,
            category: category || '',
            signup_wechat: signupWx || '',
            referrer: referrer || '',
            referrer_uid: referrerUid || '',
            contact_info: finalContact,
            name,
            mobile,
            nation: nation || '',
            work_duration: workDuration || '',
            school: school || '',
            entry_year: entryYear || '',
            wechat_id: wechatId || '',
            remark: remark || '',
            age: age || '',
            user_nickname: userInfo.nickname,
            status: 'pending', // pending, handled, rejected
            create_date: Date.now()
        })

        // 推荐奖励：根据最新规则，报名本身不发奖励，仅绑定关系。
        // 付费业务的奖励在 payment-service.confirmPayment 中处理。
        // 免费业务暂无明确奖励规则，且用户提示"报名只是为了绑定邀请关系"。
        // 故此处只保留日志或不做操作。
        console.log('[business-service][submitSignup] 报名成功，推荐人UID:', referrerUid)

        console.log('[business-service][submitSignup] 报名成功', uid, businessId, res.id)

        return {
            code: 0,
            message: '报名成功',
            data: {
                signup_id: res.id
            }
        }
    } catch (error) {
        console.error('[business-service][submitSignup] 报名失败:', error)
        return {
            code: -1,
            message: error.message || '报名失败',
            data: null
        }
    }
}

/**
 * 获取报名详情
 * @param {string} uid - 当前用户ID
 * @param {string} signupId - 报名记录ID
 */
async function getSignupDetail(uid, signupId) {
    if (!uid) throw new Error('请先登录')
    if (!signupId) throw new Error('参数错误')

    const db = uniCloud.database()
    const dbCmd = db.command

    try {
        // 1. 获取报名记录
        const res = await db.collection('business_signups').doc(signupId).get()
        if (res.data.length === 0) {
            return { code: -1, message: '记录不存在', data: null }
        }
        const record = res.data[0]

        // 2. 权限校验
        // a. 本人查看 或 订单直推人查看
        if (record.user_id === uid || record.referrer_uid === uid) {
            return { code: 0, message: '获取成功', data: record }
        }

        // b. 关系链直推人查看 (即：用户关系是我的直推，但订单推荐人可能填了别人或空)
        // 用户提到“数字等于1的人”即一级下级。我们需要校验 record.user_id 是否是 uid 的直推下级。
        try {
            const userRes = await db.collection('uni-id-users')
                .doc(record.user_id)
                .field({ inviter_uid: true })
                .get()

            if (userRes.data && userRes.data.length > 0) {
                const orderUser = userRes.data[0]
                // 如果订单用户的邀请人是当前用户，说明是直推下级（Level 1），允许查看
                if (orderUser.inviter_uid && orderUser.inviter_uid[0] === uid) {
                    return { code: 0, message: '获取成功', data: record }
                }
            }
        } catch (e) {
            console.warn('[signup-helper] 校验直推关系失败', e)
        }

        // c. 其他人 -> 无权限
        return { code: -403, message: '无权限查看详情（仅直推可见详情）', data: null }

    } catch (e) {
        console.error('[signup-helper] 获取详情失败:', e)
        return { code: -1, message: '获取详情失败', data: null }
    }
}

module.exports = {
    submitSignup,
    getSignupDetail
}
