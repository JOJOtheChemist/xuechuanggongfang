/**
 * QRCode Helper - 二维码生成与邀请码解析
 * 包含业务板块拉新二维码生成、短邀请码解析等功能
 */

/**
 * 生成业务板块拉新专属二维码
 * 每个用户在每个业务板块只会生成一张二维码图片，
 * 第一次点击时生成并缓存到 uni-id-users.business_invites 下，之后复用。
 * @param {string} uid - 用户ID
 * @param {number|string} businessId - 业务板块的前端ID（如 1,2,3...）
 * @returns {object} 响应对象
 */
async function generateBusinessInviteQrcode(uid, { businessId } = {}) {
    try {
        if (!uid) {
            throw new Error('请先登录')
        }
        if (!businessId && businessId !== 0) {
            throw new Error('缺少业务板块ID')
        }

        const db = uniCloud.database()
        const usersCollection = db.collection('uni-id-users')

        const bizKey = String(businessId)

        // 读取用户已有的业务板块邀请配置 + 短邀请码
        const userRes = await usersCollection
            .doc(uid)
            .field({ business_invites: true, nickname: true, my_invite_code: true })
            .get()

        if (!userRes.data || !userRes.data.length) {
            throw new Error('用户不存在')
        }

        const user = userRes.data[0]
        // 检查是否有短邀请码，没有则生成一个随机6位码 (简单实现，实际生产建议用nanoid或自增ID)
        let inviteCode = user.my_invite_code
        if (!inviteCode) {
            // 生成 6 位随机码 (A-Z, 0-9)
            const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
            let code = ''
            for (let i = 0; i < 6; i++) {
                code += chars.charAt(Math.floor(Math.random() * chars.length))
            }
            inviteCode = code
            // 保存生成的短码供后续使用
            await usersCollection.doc(uid).update({ my_invite_code: inviteCode })
            console.log('[business-service] 为用户生成新短邀请码:', uid, inviteCode)
        }

        const businessInvites = user.business_invites || {}
        const existed = businessInvites[bizKey]

        // 如果该板块已经生成过二维码，则直接复用
        if (existed && existed.qrcode_url && existed.scene) {
            // [兼容性] 如果旧scene是长UID格式，建议也可以复用，或者强行更新为短码。
            // 这里为了简单，如果已经存在就直接复用旧的。
            console.log('[business-service][generateBusinessInviteQrcode] 复用二维码', uid, bizKey)
            return {
                code: 0,
                message: '获取成功',
                data: {
                    qrcode_url: existed.qrcode_url,
                    scene: existed.scene,
                    business_id: bizKey,
                    inviter_id: uid,
                    invite_code: inviteCode,
                    inviter_name: user.nickname || '未知'
                }
            }
        }

        // 未生成过，则创建新的 scene：使用短码 c=CODE 替代 i=UID
        // scene 长度限制 32，现在 b=xx,c=XXXXXX 长度仅为 10-12 位，非常安全
        const scene = `b=${bizKey},c=${inviteCode}`

        // 1. 获取 access_token（沿用 user-center / team-service 中的配置）
        const APPID = 'wxd7918f6ffc6e4234'
        const SECRET = '607588d26e9df050892c321579063f8e'

        const tokenRes = await uniCloud.httpclient.request(
            `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${APPID}&secret=${SECRET}`,
            {
                method: 'GET',
                dataType: 'json'
            }
        )

        if (!tokenRes.data || !tokenRes.data.access_token) {
            throw new Error('获取 access_token 失败：' + JSON.stringify(tokenRes.data))
        }

        const accessToken = tokenRes.data.access_token

        // 2. 调用 getwxacodeunlimit 生成小程序码
        const codeRes = await uniCloud.httpclient.request(
            `https://api.weixin.qq.com/wxa/getwxacodeunlimit?access_token=${accessToken}`,
            {
                method: 'POST',
                dataType: 'arraybuffer',
                headers: { 'Content-Type': 'application/json' },
                data: {
                    scene,
                    page: 'pages/extra/invite-handler', // 扫码直达专用处理页
                    width: 430,
                    check_path: false // [修复] 防止未发布页面导致 invalid page 报错
                }
            }
        )

        // 判断是否为错误 JSON
        const headerStr = Buffer.from(codeRes.data).toString('utf8', 0, 20)
        if (headerStr.indexOf('{"errcode"') === 0) {
            const errObj = JSON.parse(Buffer.from(codeRes.data).toString('utf8'))
            throw new Error('生成小程序码失败：' + (errObj.errmsg || JSON.stringify(errObj)))
        }

        // 3. 上传到云存储
        const timestamp = Date.now()
        const fileName = `business-invite-qrcode/${bizKey}/${uid}-${timestamp}.png`
        const uploadRes = await uniCloud.uploadFile({
            cloudPath: fileName,
            fileContent: Buffer.from(codeRes.data)
        })

        const qrcodeUrl = uploadRes.fileID

        // 4. 缓存到用户文档，后续复用
        const updatePathBase = `business_invites.${bizKey}`
        await usersCollection.doc(uid).update({
            [`${updatePathBase}.qrcode_url`]: qrcodeUrl,
            [`${updatePathBase}.scene`]: scene,
            [`${updatePathBase}.business_id`]: bizKey,
            update_date: Date.now()
        })

        console.log('[business-service][generateBusinessInviteQrcode] 生成成功', uid, bizKey, scene)

        return {
            code: 0,
            message: '生成成功',
            data: {
                qrcode_url: qrcodeUrl,
                scene,
                business_id: bizKey,
                inviter_id: uid, // 依然返回真实ID供前端直接使用（如果是生成者查看）
                invite_code: inviteCode,
                inviter_name: user.nickname || '未知'
            }
        }
    } catch (error) {
        console.error('[business-service][generateBusinessInviteQrcode] 生成失败:', error)
        return {
            code: -1,
            message: error.message || '生成失败',
            data: null
        }
    }
}

/**
 * 解析短邀请码，获取真实用户信息
 * @param {string} inviteCode - 6位邀请码
 * @returns {object} 响应对象
 */
async function resolveInviteCode(inviteCode) {
    try {
        if (!inviteCode) return { code: -1, message: '缺少邀请码' }

        const db = uniCloud.database()
        const res = await db.collection('uni-id-users')
            .where({ my_invite_code: inviteCode })
            .field({ _id: true, nickname: true, avatar: true, mobile: true })
            .limit(1)
            .get()

        if (!res.data || res.data.length === 0) {
            return { code: 404, message: '邀请码无效', data: null }
        }

        const user = res.data[0]
        return {
            code: 0,
            message: '解析成功',
            data: {
                inviter_id: user._id,
                nickname: user.nickname || '神秘同学',
                avatar: user.avatar
            }
        }
    } catch (e) {
        console.error('[business-service] 解析短码失败', e)
        return { code: -1, message: e.message }
    }
}

module.exports = {
    generateBusinessInviteQrcode,
    resolveInviteCode
}
