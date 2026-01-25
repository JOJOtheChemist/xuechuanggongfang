/**
 * 新币提现申请相关功能
 */

/**
 * 申请新币提现（进入审核队列）
 * @param {object} currentUser - 当前用户信息
 * @param {object} params
 * @param {number} params.coins - 要提现的新币数量
 * @param {string} params.contact_type - 联系方式类型
 * @param {string} params.contact_value - 联系方式值
 */
async function applyWithdrawCoins(currentUser, { coins, contact_type, contact_value, payment_qrcode } = {}) {
    try {
        if (!coins || typeof coins !== 'number' || coins <= 0) {
            throw new Error('提现数量必须大于0')
        }
        if (!Number.isInteger(coins)) {
            throw new Error('新币提现仅支持整数数量')
        }
        // Contact info is optional now
        // if (!contact_type || !contact_value) {
        //     throw new Error('请填写联系方式及渠道')
        // }

        const { uid } = currentUser
        const db = uniCloud.database()
        const dbCmd = db.command

        // 查询新币余额
        const userRes = await db.collection('uni-id-users')
            .doc(uid)
            .field({ wallet: true })
            .get()

        const currentCoins = userRes.data[0]?.wallet?.coins || 0

        if (currentCoins < coins) {
            throw new Error('新币余额不足')
        }

        // 扣除新币余额（进入审核期，不可用）
        await db.collection('uni-id-users')
            .doc(uid)
            .update({
                'wallet.coins': dbCmd.inc(-coins)
            })

        // 创建提现申请记录
        const requestRes = await db.collection('coin_withdraw_requests')
            .add({
                user_id: uid,
                coins_amount: coins,
                contact_type: contact_type || '',
                contact_value: contact_value || '',
                payment_qrcode: payment_qrcode || '',
                status: 'processing', // processing=审核中, approved=已通过, rejected=已拒绝, cancelled=已取消
                create_date: Date.now(),
                update_date: Date.now()
            })

        // 记录新币流水（扣除）
        await db.collection('coin_logs')
            .add({
                user_id: uid,
                amount: -coins,
                type: 'withdraw',
                status: 'processing',
                ref_id: requestRes.id,
                remark: `申请提现，提交 ${coins} 新币`,
                create_date: Date.now()
            })

        console.log('[coin-service][applyWithdrawCoins] 申请成功, userId:', uid, 'coins:', coins, 'requestId:', requestRes.id)

        return {
            code: 0,
            message: '提现申请已提交，请等待审核',
            data: {
                success: true,
                request_id: requestRes.id,
                coins_amount: coins
            }
        }
    } catch (error) {
        console.error('[coin-service][applyWithdrawCoins] 申请失败:', error)
        return {
            code: -1,
            message: error.message || '申请失败',
            data: null
        }
    }
}

module.exports = {
    applyWithdrawCoins
}
