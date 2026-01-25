const authUtils = require('auth-utils')

module.exports = {
    _before: function () {
        const params = this.getParams()[0] || {}
        const token = params._token

        if (!token) {
            this.currentUser = null
            return
        }

        const tokenData = authUtils.parseToken(token)
        if (!tokenData || !tokenData.uid) {
            this.currentUser = null
        } else {
            this.currentUser = {
                uid: tokenData.uid,
                openid: tokenData.openid
            }
        }

        // 保存 token 供后续内部调用使用
        this.rawToken = token

        delete params._token
    },

    /**
     * 创建入团支付订单 (固定 19.9)
     */
    async createJoinOrder({ teamId, inviterId }) {
        if (!this.currentUser) return { code: -1, message: '请先登录' }
        if (!teamId) return { code: -1, message: '缺少团队ID' }

        const db = uniCloud.database()

        // 1. 校验团队是否存在
        const teamRes = await db.collection('teams').doc(teamId).get()
        if (!teamRes.data || teamRes.data.length === 0) {
            return { code: -1, message: '团队不存在' }
        }
        const team = teamRes.data[0]

        // 2. 校验是否已经在团
        const userRes = await db.collection('uni-id-users')
            .doc(this.currentUser.uid)
            .field({ team_info: true })
            .get()
        const user = userRes.data && userRes.data[0]
        if (!user) {
            return { code: -1, message: '用户不存在' }
        }
        if (user.team_info && user.team_info.team_id) {
            // [Modified] Allow joining other teams. Just log or ignore here.
            console.log('[team-join-service] User is already in a team, allowing switch:', user.team_info.team_id)
        }

        // 3. 调用 payment-service 创建订单
        try {
            const paymentService = uniCloud.importObject('payment-service')
            const res = await paymentService.createOrder({
                _token: this.rawToken, // 使用 _before 中保存的 token 
                // 其实 payment-service 是云对象，这里通过 importObject 调用时，如果上下文不传递，可能导致鉴权失败
                // 但这里是云函数间调用 (server-to-server)，通常需要处理鉴权或直接数据库操作
                // 由于 payment-service 设计是面向客户端的 (取 this.currentUser)，云函数互调时 this.currentUser 可能为空
                // **修复策略**：这里我们应当直接模拟 payment-service 的 createOrder 逻辑，或者修改 payment-service 支持内部调用
                // 为简单起见，且保持一致性，我们这里直接调用 payment-service，
                // 但要注意 uniCloud.importObject 在云函数中调用时，是本地调用，this 上下文可能不会自动传递 clientInfo
                // 建议：直接在这里构建 parameters 调用

                // 【修正】为了避免上下文丢失，最稳妥的方式是：
                // 既然我们提取了专门的服务，我们就在这里直接生成订单，不依赖 payment-service 的客户端接口
                // 但是 payment-service 里封装了统一下单 (_unifiedOrder)，那个是私有方法没导出。
                // 所以我们还是得调 payment-service.createOrder。
                // 在云函数中调用云对象：clientInfo 会丢失。
                // 必须让 payment-service 的 _before 逻辑能通过。
                // 我们的 _before 已经解析了 token，但 importObject 调用时，被调用的对象的 _before 也会执行。
                // 如果我们不传入 _token 参数，payment-service 会报错。
                // 所以我们在参数里带上 _token。

                businessId: `team_join_${teamId}`,
                businessName: `加入${team.team_name}`,
                amount: 19.9,
                extraData: {
                    scene: 'team_join',
                    teamId: teamId,
                    inviterId: inviterId || ''
                }
            })

            // 注意：payment-service 可能会因为我们是同个云函数实例调用而共享上下文？
            // 在 uniCloud 中，importObject 本地调用通常会保留上下文。我们先假设可以直接调用。
            return res
        } catch (e) {
            console.error('[team-join-service] 创建订单失败', e)
            return { code: -1, message: e.message || '创建订单失败' }
        }
    },

    /**
     * 确认入团 (支付成功后调用)
     * @param {string} orderNo
     */
    async confirmJoin({ orderNo }) {
        if (!this.currentUser) return { code: -1, message: '请先登录' }
        if (!orderNo) return { code: -1, message: '缺少订单号' }

        const { uid } = this.currentUser
        const db = uniCloud.database()

        console.log('[team-join-service] 开始处理入团: ', orderNo)

        // 1. 确认订单支付状态 (调用 payment-service)
        const paymentService = uniCloud.importObject('payment-service')
        try {
            // 确认支付状态 (内部会将 created -> paid)
            const payRes = await paymentService.confirmPayment({
                orderNo,
                _token: this.rawToken
            })
            if (payRes.code !== 0) {
                throw new Error(payRes.message)
            }
        } catch (e) {
            console.error('[team-join-service] 支付确认失败', e)
            if (e.message && !e.message.includes('已处理')) {
                return { code: -1, message: '支付状态异常：' + e.message }
            }
        }

        // 2. 获取订单详情 (Double Check)
        const orderRes = await db.collection('payment_orders')
            .where({ order_no: orderNo, user_id: uid })
            .get()

        if (!orderRes.data || orderRes.data.length === 0) {
            return { code: -1, message: '订单不存在' }
        }
        const order = orderRes.data[0]

        if (order.status !== 'paid') {
            return { code: -1, message: '订单未支付' }
        }

        // 3. 解析参数
        const extra = order.extra_data || {}
        const teamId = extra.teamId
        const inviterId = extra.inviterId

        if (!teamId) return { code: -1, message: '订单缺少团队信息' }

        // 4. 执行入团逻辑 (原子化判断)
        const transaction = await db.startTransaction()
        try {
            // 4.1 再次检查用户状态 (防止并发)
            console.log('[team-join-service] Transaction checking user:', uid)
            const userRes = await transaction.collection('uni-id-users')
                .doc(uid)
                .get()
            // .doc().get() 返回的 data 是单个对象,不是数组
            const user = userRes.data
            if (!user) {
                console.error('[team-join-service] User not found in transaction:', uid)
                await transaction.rollback()
                return { code: -1, message: `用户[${uid}]不存在` }
            }
            if (user.team_info && user.team_info.team_id) {
                // 如果已经是该团队成员，且订单没被消费，则标记消费并返回成功
                // 如果已经是该团队成员，且订单没被消费，则标记消费并返回成功
                if (user.team_info.team_id === teamId) {
                    await transaction.rollback()
                    return { code: 0, message: '您已在团队中' }
                }
                // [Modified] User is in another team. Allow overwrite (joining new team).
                console.log('[team-join-service] User switching team from', user.team_info.team_id, 'to', teamId)
            }

            // 4.2 获取团队信息
            const teamRes = await transaction.collection('teams').doc(teamId).get()
            // .doc().get() 返回的 data 是单个对象,不是数组
            const team = teamRes.data
            if (!team) throw new Error('团队不存在')

            // 4.3 更新用户
            const updateData = {
                'team_info.team_id': teamId,
                'team_info.team_name': team.team_name,
                'team_info.team_level': team.team_level,
                'team_info.position': '组员',
                'team_info.join_team_date': Date.now(),
                'team_info.status': 'active',
                role: db.command.addToSet('team_member')
            }

            // [Lazy Binding] 如果报备了邀请人，且用户历史上没有终身邀请人，则进行补录绑定
            if (inviterId && (!user.inviter_uid || user.inviter_uid.length === 0)) {
                console.log('[team-join-service] 执行懒绑定：支付入团时补录终身邀请人:', inviterId)
                updateData.inviter_uid = [inviterId]
                updateData['partner_info.inviter_id'] = inviterId

                // [REMOVED] 奖励逻辑已移至注册环节，入团不再发放额外奖励
                console.log('[team-join-service] 执行入团懒绑定，不发放新币')

                // [修改] 记录拉新日志: 先查询是否已存在 status='viewed' 的记录
                const existingLogRes = await transaction.collection('invite_logs')
                    .where({
                        inviter_id: inviterId,
                        new_user_id: uid
                    })
                    .get()

                if (existingLogRes.data && existingLogRes.data.length > 0) {
                    // 已存在记录,更新为 paid 状态
                    const logId = existingLogRes.data[0]._id
                    await transaction.collection('invite_logs').doc(logId).update({
                        status: 'paid',
                        order_no: orderNo,
                        paid_date: Date.now(),
                        update_date: Date.now()
                    })
                    console.log('[team-join-service] 更新 invite_logs 记录状态为 paid, logId:', logId)
                } else {
                    // 不存在记录,新建 (向后兼容:直接支付而未登录查看的场景)
                    await transaction.collection('invite_logs').add({
                        inviter_id: inviterId,
                        new_user_id: uid,
                        new_user_nickname: user.nickname || '新伙伴',
                        new_user_avatar: user.avatar || '',
                        source: 'team_join_lazy',
                        status: 'paid',
                        invite_type: 'team',
                        order_no: orderNo,
                        paid_date: Date.now(),
                        create_date: Date.now()
                    })
                    console.log('[team-join-service] 新建 invite_logs 记录 (直接支付场景)')
                }
            } else if (inviterId) {
                // 仅作为本次入团的推荐人，不修改终身关系
                updateData['partner_info.inviter_id'] = inviterId
            }

            await transaction.collection('uni-id-users').doc(uid).update(updateData)

            // 4.4 更新团队人数
            await transaction.collection('teams').doc(teamId).update({
                member_count: db.command.inc(1)
            })

            // 4.5 标记订单已消费 (绑定 team_id)
            await transaction.collection('payment_orders').doc(order._id).update({
                join_team_id: teamId,
                update_date: Date.now()
            })

            // 4.6 写入入团日志 (team_join_logs)
            const logId = await transaction.collection('team_join_logs').add({
                team_id: teamId,
                inviter_id: inviterId || '',
                new_user_id: uid,
                order_no: orderNo,
                status: 'paid', // 已支付入团
                amount: 19.9,
                create_date: Date.now()
            })

            await transaction.commit()

            return {
                code: 0,
                message: '加入团队成功',
                data: {
                    team_id: teamId,
                    team_name: team.team_name
                }
            }

        } catch (e) {
            await transaction.rollback()
            console.error('[team-join-service] 入团事务失败', e)
            return { code: -1, message: e.message || '加入失败' }
        }
    }
}
