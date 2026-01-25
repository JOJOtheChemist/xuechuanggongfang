// 文章解锁辅助模块
// 处理文章解锁和积分扣除逻辑

/**
 * 解锁文章（扣除积分）
 * @param {Object} params - 参数对象
 * @param {String} params.articleId - 文章 ID
 * @param {String} params._token - 用户 token
 * @param {Object} context - 上下文对象
 * @param {Object} context.db - 数据库实例
 * @param {Object} context.authUtils - 认证工具
 */
async function unlockArticle({
    articleId,
    _token
} = {}, { db, authUtils }) {
    if (!articleId) {
        return {
            code: 400,
            message: '文章 ID 不能为空'
        }
    }

    try {
        // 解析用户 token
        const tokenData = authUtils.parseToken(_token)
        const userId = tokenData && tokenData.uid

        if (!userId) {
            return {
                code: 401,
                message: '请先登录'
            }
        }

        // 查询文章信息
        const articleRes = await db.collection('articles')
            .doc(articleId)
            .field({ price_points: true, title: true })
            .get()

        if (!articleRes.data || articleRes.data.length === 0) {
            return {
                code: 404,
                message: '文章不存在'
            }
        }

        const article = articleRes.data[0]
        const pricePoints = article.price_points || 0

        // 检查是否已解锁
        const unlockRes = await db.collection('article_interactions')
            .where({
                article_id: articleId,
                user_id: userId,
                type: 'unlock'
            })
            .get()

        if (unlockRes.data && unlockRes.data.length > 0) {
            return {
                code: 400,
                message: '已解锁过该文章'
            }
        }

        // 免费文章直接解锁
        if (pricePoints <= 0) {
            await db.collection('article_interactions').add({
                article_id: articleId,
                user_id: userId,
                type: 'unlock',
                create_time: Date.now()
            })

            return {
                code: 0,
                message: '解锁成功',
                data: {
                    pricePoints: 0,
                    articleTitle: article.title
                }
            }
        }

        // 查询或初始化用户积分账户（与 points-service 对齐：user_points 表）
        const pointsColl = db.collection('user_points')
        const accountRes = await pointsColl.where({ user_id: userId }).get()
        let currentPoints = 0
        let accountId = null
        if (!accountRes.data || accountRes.data.length === 0) {
            // 初始化账户（余额为0）
            const addRes = await pointsColl.add({
                user_id: userId,
                balance: 0,
                total_points: 0,
                create_date: Date.now(),
                update_date: Date.now()
            })
            accountId = addRes.id
            currentPoints = 0
        } else {
            const account = accountRes.data[0]
            accountId = account._id
            currentPoints = account.balance || 0
        }

        // 积分不足
        if (currentPoints < pricePoints) {
            return {
                code: 400,
                message: `积分不足，需要 ${pricePoints} 积分，当前 ${currentPoints} 积分`
            }
        }

        // 扣除积分（更新 user_points.balance）
        const newBalance = currentPoints - pricePoints
        await pointsColl.doc(accountId).update({
            balance: newBalance,
            update_date: Date.now()
        })

        // 写入积分流水（points_logs），保持与 points-service 一致
        await db.collection('points_logs').add({
            user_id: userId,
            change: -pricePoints,
            balance_after: newBalance,
            reason: 'unlock_article',
            source: 'article-service',
            ref_id: articleId,
            remark: `解锁文章《${article.title}》`,
            create_date: Date.now()
        })

        // 记录解锁行为
        await db.collection('article_interactions').add({
            article_id: articleId,
            user_id: userId,
            type: 'unlock',
            create_time: Date.now()
        })

        return {
            code: 0,
            message: `解锁成功，消耗 ${pricePoints} 积分`,
            data: {
                remainingPoints: currentPoints - pricePoints,
                pricePoints: pricePoints,
                articleTitle: article.title
            }
        }
    } catch (error) {
        console.error('[unlockArticle] error:', error)
        return {
            code: 500,
            message: '解锁失败',
            error: error.message
        }
    }
}

module.exports = {
    unlockArticle
}
