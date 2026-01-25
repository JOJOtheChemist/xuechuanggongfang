/**
 * 团队加入辅助模块
 * 包含团队加入申请、获取我的团队等功能
 */

module.exports = {
    /**
     * 申请加入团队
     * @param {string} teamId - 团队ID
     * @param {string} inviterId - 邀请人ID（可选，用于记录谁邀请的）
     * @param {string} orderNo - 订单号
     * @param {object} currentUser - 当前用户信息
     * @returns {object} 申请结果
     */
    async applyJoinTeam({ teamId, inviterId, orderNo } = {}, currentUser) {
        try {
            console.log('[team-join-helper][applyJoinTeam] 收到请求 - teamId:', teamId, 'inviterId:', inviterId, 'orderNo:', orderNo)

            if (!teamId) {
                throw new Error('缺少团队ID')
            }

            const { uid } = currentUser
            console.log('[team-join-helper][applyJoinTeam] 当前用户 uid:', uid)

            const db = uniCloud.database()

            // 检查用户是否已经在团队中
            const userRes = await db.collection('uni-id-users')
                .doc(uid)
                .field({ team_info: true, role: true })
                .get()

            const user = userRes.data[0]
            const userRoles = Array.isArray(user.role) ? user.role : []
            const isPrivileged = userRoles.includes('admin') || userRoles.includes('team_admin')

            console.log('[team-join-helper][applyJoinTeam] 用户现有 team_info:', JSON.stringify(user.team_info))

            if (user.team_info && user.team_info.team_id) {
                console.log('[team-join-helper][applyJoinTeam] 用户已在团队中:', user.team_info.team_id)
                throw new Error('您已经在其他团队中')
            }

            // 获取团队信息
            const teamRes = await db.collection('teams')
                .doc(teamId)
                .get()

            if (!teamRes.data || teamRes.data.length === 0) {
                console.log('[team-join-helper][applyJoinTeam] 团队不存在:', teamId)
                throw new Error('团队不存在')
            }

            const team = teamRes.data[0]
            console.log('[team-join-helper][applyJoinTeam] 团队信息:', team.team_name)

            const teamRequirePayment = team.require_payment === true || (typeof team.join_fee === 'number' && team.join_fee > 0)
            const shouldValidateOrder = (teamRequirePayment && !isPrivileged) || !!orderNo
            let consumedOrderId = null

            console.log('[team-join-helper][applyJoinTeam] 支付验证 - teamRequirePayment:', teamRequirePayment, 'shouldValidateOrder:', shouldValidateOrder)

            if (shouldValidateOrder) {
                if (!orderNo) {
                    throw new Error('请先完成支付，再申请加入团队')
                }

                const orderRes = await db.collection('payment_orders')
                    .where({
                        order_no: orderNo,
                        user_id: uid
                    })
                    .get()

                if (!orderRes.data || orderRes.data.length === 0) {
                    console.log('[team-join-helper][applyJoinTeam] 未找到订单:', orderNo)
                    throw new Error('未找到对应的支付订单')
                }

                const order = orderRes.data[0]
                console.log('[team-join-helper][applyJoinTeam] 订单状态:', order.status)

                if (order.status !== 'paid') {
                    throw new Error('支付尚未完成，请稍后再试')
                }

                const extra = order.extra_data || {}
                if (extra.teamId && extra.teamId !== teamId) {
                    throw new Error('支付订单与当前团队不匹配')
                }

                if (order.join_team_id && order.join_team_id !== teamId) {
                    throw new Error('该订单已被使用')
                }

                consumedOrderId = order._id
            }

            // 更新用户团队信息，并在 partner_info 中记录 inviter_id（如果有传入）
            const updateData = {
                'team_info.team_id': teamId,
                'team_info.team_name': team.team_name,
                'team_info.team_level': team.team_level,
                'team_info.position': '组员',
                'team_info.join_team_date': new Date().getTime(),
                'team_info.status': 'active',
                role: db.command.addToSet('team_member')
            }

            if (inviterId) {
                updateData['partner_info.inviter_id'] = inviterId
                console.log('[team-join-helper][applyJoinTeam] 将保存邀请人ID到 partner_info:', inviterId)
            } else {
                console.warn('[team-join-helper][applyJoinTeam] 警告：inviterId 为空，将不会记录邀请关系')
            }

            console.log('[team-join-helper][applyJoinTeam] 准备更新用户数据:', JSON.stringify(updateData))

            await db.collection('uni-id-users')
                .doc(uid)
                .update(updateData)

            console.log('[team-join-helper][applyJoinTeam] 用户数据更新成功')

            // 更新团队成员数量
            await db.collection('teams')
                .doc(teamId)
                .update({
                    member_count: db.command.inc(1)
                })

            if (orderNo && consumedOrderId) {
                await db.collection('payment_orders')
                    .doc(consumedOrderId)
                    .update({
                        join_team_id: teamId,
                        update_date: Date.now()
                    })
            }

            if (inviterId && orderNo) {
                try {
                    console.log('[team-join-helper][applyJoinTeam] 准备写入 team_join_logs')
                    const logCollection = db.collection('team_join_logs')
                    const existedLog = await logCollection.where({
                        team_id: teamId,
                        inviter_id: inviterId,
                        new_user_id: uid
                    }).limit(1).get()
                    if (!existedLog.data || existedLog.data.length === 0) {
                        await logCollection.add({
                            team_id: teamId,
                            inviter_id: inviterId,
                            new_user_id: uid,
                            order_no: orderNo,
                            status: 'paid',
                            create_date: Date.now()
                        })
                        console.log('[team-join-helper][applyJoinTeam] team_join_logs 写入成功')
                    } else {
                        console.log('[team-join-helper][applyJoinTeam] team_join_logs 已存在，跳过')
                    }
                } catch (logErr) {
                    console.warn('[team-join-helper][applyJoinTeam] 写入 team_join_logs 失败', logErr)
                }
            } else {
                console.log('[team-join-helper][applyJoinTeam] 不满足写入 team_join_logs 条件 - inviterId:', inviterId, 'orderNo:', orderNo)
            }

            console.log('[team-join-helper][applyJoinTeam] 加入成功, userId:', uid, 'teamId:', teamId, 'inviterId:', inviterId || '无')

            return {
                code: 0,
                message: '加入团队成功',
                data: { success: true, order_no: orderNo || null }
            }
        } catch (error) {
            console.error('[team-join-helper][applyJoinTeam] 加入失败:', error)
            return {
                code: -1,
                message: error.message || '加入失败',
                data: null
            }
        }
    },

    /**
     * 获取我的团队信息
     * @param {object} currentUser - 当前用户信息
     * @returns {object} 我的团队
     */
    async getMyTeam(currentUser) {
        if (!currentUser) return { code: 0, message: '未登录', data: null }
        try {
            const { uid } = currentUser
            const db = uniCloud.database()

            // [NEW] 1. 优先查付费记录，确定当前"名义上"属于哪个队（以支付为准）
            const latestPaidLog = await db.collection('team_join_logs')
                .where({
                    new_user_id: uid,
                    status: 'paid'
                })
                .orderBy('create_date', 'desc')
                .limit(1)
                .get()

            let activeTeamId = ''
            if (latestPaidLog.data && latestPaidLog.data.length > 0) {
                activeTeamId = latestPaidLog.data[0].team_id
            }

            // [NEW] 2. 如果没有付费记录，查一下是否是某个队的队长
            if (!activeTeamId) {
                const leaderRes = await db.collection('teams')
                    .where({
                        leader_id: uid,
                        status: 'active'
                    })
                    .limit(1)
                    .get()
                if (leaderRes.data && leaderRes.data.length > 0) {
                    activeTeamId = leaderRes.data[0]._id
                }
            }

            // [NEW] 3. 自动纠错/同步 uni-id-users 的 team_info
            const userRes = await db.collection('uni-id-users')
                .doc(uid)
                .field({ team_info: true })
                .get()

            const userData = userRes.data[0] || {}
            let teamInfo = userData.team_info || {}
            const currentTeamIdInProfile = teamInfo.team_id

            if (activeTeamId) {
                // 如果查到的有效团队和个人资料里的不一致，进行同步更新
                if (activeTeamId !== currentTeamIdInProfile) {
                    console.log(`[team-join-helper][getMyTeam] 检测到团队不一致/过期: profile(${currentTeamIdInProfile}) -> log(${activeTeamId}), 开始自动同步...`)

                    const teamDetailRes = await db.collection('teams').doc(activeTeamId).get()
                    const td = teamDetailRes.data[0] || {}

                    const syncData = {
                        'team_info.team_id': activeTeamId,
                        'team_info.team_name': td.team_name || '',
                        'team_info.team_level': td.team_level || '',
                        'team_info.status': 'active'
                    }
                    await db.collection('uni-id-users').doc(uid).update(syncData)

                    // 更新本地内存变量供后续逻辑使用
                    teamInfo = {
                        team_id: activeTeamId,
                        team_name: td.team_name || '',
                        team_level: td.team_level || '',
                        status: 'active'
                    }
                }
            } else {
                // 彻底没有有效团队（既没付过款也不是队长），如果资料里还有残留，则清除
                if (currentTeamIdInProfile) {
                    console.log(`[team-join-helper][getMyTeam] 用户无有效入团记录且非队长，清除过期 team_info: ${currentTeamIdInProfile}`)
                    await db.collection('uni-id-users').doc(uid).update({
                        team_info: db.command.remove()
                    })
                }
                return {
                    code: 0,
                    message: '您还未加入团队',
                    data: null
                }
            }

            // 获取团队详细信息（基础信息）
            const teamRes = await db.collection('teams')
                .doc(teamInfo.team_id)
                .get()

            const teamDetail = teamRes.data[0] || {}

            // 计算今日新增人数 (只统计付费成员)
            const today = new Date()
            today.setHours(0, 0, 0, 0)
            const todayTimestamp = today.getTime()

            // ✅ 从 team_join_logs 统计今日付费加入的人数
            const todayNewMembersRes = await db.collection('team_join_logs')
                .where({
                    team_id: teamInfo.team_id,
                    status: 'paid',  // ✅ 只统计付费的
                    create_date: db.command.gte(todayTimestamp)
                })
                .count()

            // 计算昨日新增人数（昨天 00:00 - 今天 00:00）
            const yesterday = new Date(today.getTime())
            yesterday.setDate(yesterday.getDate() - 1)
            yesterday.setHours(0, 0, 0, 0)
            const yesterdayTimestamp = yesterday.getTime()

            // ✅ 从 team_join_logs 统计昨日付费加入的人数
            const yesterdayNewMembersRes = await db.collection('team_join_logs')
                .where({
                    team_id: teamInfo.team_id,
                    status: 'paid',  // ✅ 只统计付费的
                    create_date: db.command.gte(yesterdayTimestamp).and(db.command.lt(todayTimestamp))
                })
                .count()

            // 实时统计当前团队有效成员数量（只统计付费成员）
            // ✅ 从 team_join_logs 获取所有付费成员
            const paidMembersRes = await db.collection('team_join_logs')
                .where({
                    team_id: teamInfo.team_id,
                    status: 'paid'
                })
                .count()

            teamDetail.member_count = paidMembersRes.total  // ✅ 使用付费成员数量

            const mergedTeamInfo = Object.assign({}, teamInfo, {
                team_name: teamDetail.team_name || (teamInfo && teamInfo.team_name) || '',
                team_level: teamDetail.team_level || (teamInfo && teamInfo.team_level) || ''
            })

            return {
                code: 0,
                message: '获取成功',
                data: {
                    ...mergedTeamInfo,
                    team_detail: teamDetail,
                    today_new_members: todayNewMembersRes.total,
                    yesterday_new_members: yesterdayNewMembersRes.total,
                    member_count: paidMembersRes.total  // ✅ 使用付费成员数量
                }
            }
        } catch (error) {
            console.error('[team-join-helper][getMyTeam] 获取失败:', error)
            return {
                code: -1,
                message: error.message || '获取失败',
                data: null
            }
        }
    }
}
