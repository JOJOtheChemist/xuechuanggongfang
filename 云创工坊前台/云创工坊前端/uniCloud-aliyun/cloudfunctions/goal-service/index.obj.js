const db = uniCloud.database()
const dbCmd = db.command
const authUtils = require('auth-utils')

module.exports = {
    _before: function () {
        const params = this.getParams()[0] || {}
        const token = params._token

        if (!token) {
            console.log('[goal-service] 未检测到 token，进入游客模式')
            this.uid = null
            return
        }

        // 尝试解析自定义 token
        const tokenData = authUtils.parseToken(token)
        if (!tokenData || !tokenData.uid) {
            console.log('[goal-service] Token 无效或解析失败')
            this.uid = null
        } else {
            this.uid = tokenData.uid
        }

        // 清理参数，避免污染业务方法
        delete params._token
    },

    /**
     * 获取当前月份的目标设定
     * @param {Object} params
     * @param {Number} params.year
     * @param {Number} params.month
     */
    async getMonthGoals(params) {
        if (!this.uid && !params.user_id) {
            return { code: 0, message: '未登录，返回空目标', data: { goals: [], stats: { total_target: 0, total_completed: 0 } } }
        }

        const { year, month } = params
        if (!year || !month) {
            throw new Error('缺少年份或月份')
        }

        // 目标 UID：优先使用传参中的 user_id，否则使用当前登录用户
        const targetUid = params.user_id || this.uid

        // Calculate start and end of the month timestamps
        const startDate = new Date(year, month - 1, 1).getTime()
        const endDate = new Date(year, month, 0, 23, 59, 59, 999).getTime()

        // 1. Get user goals
        const res = await db.collection('marketing_goals')
            .where({
                user_id: targetUid,
                year,
                month
            })
            .limit(1)
            .get()

        // 2. Use Static Categories (Synced with Business Page)
        const STATIC_CATEGORIES = [
            { id: 1, title: '四六级', short: '四六级' },
            { id: 2, title: '考公', short: '考公' },
            { id: 16, title: '考编', short: '考编' },
            { id: 4, title: '考研', short: '考研' },
            { id: 9, title: '就业', short: '就业' },
            { id: 6, title: '教资', short: '教资' },
            { id: 15, title: '升学', short: '升学' },
            { id: 5, title: '专升本', short: '专升本' },
            { id: 11, title: '计算机', short: '计算机' },
            { id: 14, title: '棉被', short: '棉被' },
            { id: 3, title: '驾校', short: '驾校' },
            { id: 7, title: '勤工', short: '勤工' },
            { id: 13, title: '考证', short: '考证' },
            { id: 12, title: '分享', short: '分享' }
        ]

        // 3. Get completed signups (referrals) for this month
        const signupsRes = await db.collection('business_signups')
            .where({
                referrer_uid: targetUid,
                status: dbCmd.in(['pending', 'handled']),
                create_date: dbCmd.gte(startDate).and(dbCmd.lte(endDate))
            })
            .get()

        const signups = signupsRes.data || []
        // Group signups by business_id to get counts
        const limitsMap = {}
        signups.forEach(s => {
            const bid = s.business_id
            if (bid) {
                limitsMap[bid] = (limitsMap[bid] || 0) + 1
            }
        })

        const userGoals = (res.data && res.data[0] && res.data[0].goals) || []

        // Map categories to goal structure
        const result = STATIC_CATEGORIES.map(cat => {
            const categoryId = cat.id
            const foundGoal = userGoals.find(g => g.category_id == categoryId)
            const completedCount = limitsMap[categoryId] || 0

            return {
                category_id: categoryId,
                title: cat.short || cat.title,
                target_value: foundGoal ? foundGoal.target_value : null,
                completed_value: completedCount,
                icon: ''
            }
        })

        const stats = {
            total_target: result.reduce((acc, cur) => acc + (Number(cur.target_value) || 0), 0),
            total_completed: signups.length
        }

        return {
            code: 0,
            data: {
                goals: result,
                stats
            }
        }
    },

    /**
     * 保存目标
     * @param {Object} params 
     * @param {Array} params.goals [{ category_id, target_value }]
     * @param {Number} params.year 
     * @param {Number} params.month
     */
    async saveGoals(params) {
        const { goals, year, month } = params

        if (!goals || !Array.isArray(goals)) {
            throw new Error('参数错误')
        }

        // 1. Check if record exists
        const checkRes = await db.collection('marketing_goals')
            .where({
                user_id: this.uid,
                year,
                month
            })
            .get()

        const dataToSave = {
            user_id: this.uid,
            year,
            month,
            goals: goals.map(g => ({
                category_id: g.category_id,
                target_value: Number(g.target_value)
            })).filter(g => g.target_value > 0), // Filter out 0 or empty
            update_date: Date.now()
        }

        if (checkRes.data.length > 0) {
            // Update
            await db.collection('marketing_goals')
                .doc(checkRes.data[0]._id)
                .update({
                    goals: dataToSave.goals,
                    update_date: Date.now()
                })
        } else {
            // Create
            dataToSave.create_date = Date.now()
            await db.collection('marketing_goals').add(dataToSave)
        }

        return {
            code: 0,
            msg: '保存成功'
        }
    }
}
