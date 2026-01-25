/**
 * 团队邀请辅助模块
 * 包含邀请统计、二维码生成等功能
 */

module.exports = {
    /**
     * 获取邀请统计
     * @param {object} currentUser - 当前用户信息
     * @returns {object} 邀请统计
     */
    async getInviteStats(currentUser) {
        try {
            const { uid } = currentUser
            const db = uniCloud.database()

            const joinCount = await db.collection('team_join_logs')
                .where({
                    inviter_id: uid,
                    status: 'paid'
                })
                .count()

            let inviteEarnings = 0
            try {
                const rewardLogs = await db.collection('points_logs')
                    .where({
                        user_id: uid,
                        reason: 'recommend_reward'
                    })
                    .field({ change: true })
                    .get()
                inviteEarnings = (rewardLogs.data || []).reduce((sum, log) => sum + (log.change || 0), 0)
            } catch (pointsErr) {
                console.warn('[team-invite-helper][getInviteStats] 统计积分失败', pointsErr)
            }

            return {
                code: 0,
                message: '获取成功',
                data: {
                    invited_count: joinCount.total,
                    invite_earnings: inviteEarnings
                }
            }
        } catch (error) {
            console.error('[team-invite-helper][getInviteStats] 获取失败:', error)
            return {
                code: -1,
                message: error.message || '获取失败',
                data: null
            }
        }
    },

    /**
     * 根据邀请人ID获取其所在的团队信息（用于扫码后的预览页）
     * @param {string} inviterId - 邀请人ID
     * @returns {object} 团队摘要信息
     */
    async getTeamInfoByInviter(inviterId) {
        try {
            if (!inviterId) {
                throw new Error('缺少邀请人ID')
            }

            const db = uniCloud.database()

            // 1. 查邀请人信息，获取 team_id
            const userRes = await db.collection('uni-id-users')
                .doc(inviterId)
                .field({ team_info: true, nickname: true, avatar: true })
                .get()

            if (!userRes.data || userRes.data.length === 0) {
                throw new Error('邀请人不存在')
            }

            const inviter = userRes.data[0]
            const teamId = inviter.team_info?.team_id

            if (!teamId) {
                throw new Error('该推荐人尚未加入任何团队')
            }

            // 2. 查团队基础信息
            const teamRes = await db.collection('teams')
                .doc(teamId)
                .field({ team_name: true, team_level: true, description: true, member_count: true })
                .get()

            if (!teamRes.data || teamRes.data.length === 0) {
                throw new Error('团队不存在或已解散')
            }

            const team = teamRes.data[0]

            return {
                code: 0,
                message: '获取成功',
                data: {
                    team_id: teamId,
                    team_name: team.team_name,
                    team_level: team.team_level,
                    description: team.description,
                    member_count: team.member_count,
                    inviter_name: inviter.nickname || '神秘伙伴',
                    inviter_avatar: inviter.avatar
                }
            }

        } catch (error) {
            console.error('[team-invite-helper][getTeamInfoByInviter] 获取失败:', error)
            return {
                code: -1,
                message: error.message || '获取失败',
                data: null
            }
        }
    },

    /**
     * 生成邀请二维码（小程序码）
     * @param {object} currentUser - 当前用户信息
     * @returns {object} 二维码URL
     */
    async generateInviteQrcode(currentUser) {
        try {
            const { uid } = currentUser
            const db = uniCloud.database()

            // 获取用户团队信息
            const userRes = await db.collection('uni-id-users')
                .doc(uid)
                .field({ team_info: true, nickname: true })
                .get()

            const user = userRes.data[0]
            const teamInfo = user?.team_info

            if (!teamInfo || !teamInfo.team_id) {
                throw new Error('您还未加入团队')
            }

            // 每个用户在当前团队有自己的专属邀请码
            // 1) 先看用户的 team_info 里是否已经有邀请码缓存
            if (teamInfo.invite_qrcode_url && teamInfo.invite_scene) {
                console.log('[team-invite-helper][generateInviteQrcode] 复用用户专属二维码', uid, teamInfo.team_id)
                return {
                    code: 0,
                    message: '获取成功',
                    data: {
                        qrcode_url: teamInfo.invite_qrcode_url,
                        scene: teamInfo.invite_scene,
                        team_id: teamInfo.team_id,
                        team_name: teamInfo.team_name,
                        inviter_id: uid,
                        inviter_name: user.nickname || '未知'
                    }
                }
            }

            // 2) 没有缓存时，生成新的 scene（只带 inviter，长度必须 <= 32）
            const scene = `i=${uid}`

            // ----------------------
            // 1. 获取 access_token
            // ----------------------
            // 这里直接复用 user-center 里用的 APPID / SECRET（你可以抽成配置）
            const APPID = 'wxd7918f6ffc6e4234'
            const SECRET = '52ced0fa2c741ddd1d98aa16fd3db8d0'

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

            // ----------------------
            // 2. 调用 getwxacodeunlimit 生成小程序码
            // 文档：https://developers.weixin.qq.com/miniprogram/dev/OpenApiDoc/qrcode-link/qr-code/getUnlimitedQRCode.html
            // ----------------------
            const codeRes = await uniCloud.httpclient.request(
                `https://api.weixin.qq.com/wxa/getwxacodeunlimit?access_token=${accessToken}`,
                {
                    method: 'POST',
                    dataType: 'arraybuffer', // 拿到图片二进制
                    headers: { 'Content-Type': 'application/json' },
                    data: {
                        scene, // 我们自定义的场景值，扫码后在首页解析 options.scene 再自行跳转
                        width: 430,
                        check_path: false // [修复] 防止未发布页面导致 invalid page 报错
                    }
                }
            )

            // 微信接口如果出错，返回的是 JSON，不是图片，这里简单做个判断
            // 尝试把前几个字节转成字符串看是不是以 "{\"errcode\"" 开头（略做防御）
            const headerStr = Buffer.from(codeRes.data).toString('utf8', 0, 20)
            if (headerStr.indexOf('{"errcode"') === 0) {
                const errObj = JSON.parse(Buffer.from(codeRes.data).toString('utf8'))
                throw new Error('生成小程序码失败：' + (errObj.errmsg || JSON.stringify(errObj)))
            }

            // ----------------------
            // 3. 把小程序码图片上传到云存储，返回可访问地址
            // ----------------------
            const timestamp = Date.now()
            const fileName = `team-invite-qrcode/${teamInfo.team_id}-${timestamp}.png`
            const uploadRes = await uniCloud.uploadFile({
                cloudPath: fileName,
                fileContent: Buffer.from(codeRes.data)
            })

            const qrcodeUrl = uploadRes.fileID

            // 将生成的二维码和 scene 缓存到当前用户的 team_info，后续复用
            await db.collection('uni-id-users')
                .doc(uid)
                .update({
                    'team_info.invite_qrcode_url': qrcodeUrl,
                    'team_info.invite_scene': scene,
                    update_date: Date.now()
                })

            console.log('[team-invite-helper][generateInviteQrcode] 生成成功, userId:', uid, 'teamId:', teamInfo.team_id, 'scene:', scene)

            return {
                code: 0,
                message: '生成成功',
                data: {
                    qrcode_url: qrcodeUrl,
                    scene: scene,
                    team_id: teamInfo.team_id,
                    team_name: teamInfo.team_name,
                    inviter_id: uid,
                    inviter_name: user.nickname || '未知'
                }
            }
        } catch (error) {
            console.error('[team-invite-helper][generateInviteQrcode] 生成失败:', error)
            return {
                code: -1,
                message: error.message || '生成失败',
                data: null
            }
        }
    }
}
