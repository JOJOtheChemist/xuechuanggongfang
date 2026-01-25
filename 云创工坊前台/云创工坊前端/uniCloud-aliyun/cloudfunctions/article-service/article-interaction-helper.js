// 文章交互辅助模块
// 处理用户与文章的交互操作（点赞、收藏等）

/**
 * 点赞文章
 * @param {Object} params - 参数对象
 * @param {String} params.articleId - 文章 ID
 * @param {String} params._token - 用户 token
 * @param {Object} context - 上下文对象
 * @param {Object} context.db - 数据库实例
 * @param {Object} context.dbCmd - 数据库命令
 * @param {Object} context.authUtils - 认证工具
 */
async function likeArticle({
    articleId,
    _token
} = {}, { db, dbCmd, authUtils }) {
    if (!articleId) {
        return {
            code: 400,
            message: '文章 ID 不能为空'
        }
    }

    try {
        // 使用自定义 token 解析当前用户
        const tokenData = authUtils.parseToken(_token)
        const userId = tokenData && tokenData.uid

        if (!userId) {
            return {
                code: 401,
                message: '请先登录'
            }
        }

        // 检查是否已点赞
        const existRes = await db.collection('article_interactions')
            .where({
                article_id: articleId,
                user_id: userId,
                type: 'like'
            })
            .get()

        if (existRes.data && existRes.data.length > 0) {
            return {
                code: 400,
                message: '已点赞过该文章'
            }
        }

        // 增加点赞数
        await db.collection('articles')
            .doc(articleId)
            .update({
                'stats.likes': dbCmd.inc(1)
            })

        // 记录点赞行为
        await db.collection('article_interactions').add({
            article_id: articleId,
            user_id: userId,
            type: 'like'
        })

        // 返回更新后的统计数据
        const articleRes = await db.collection('articles')
            .doc(articleId)
            .field({ stats: true })
            .get()

        return {
            code: 0,
            message: '点赞成功',
            data: {
                stats: articleRes.data[0]?.stats || {}
            }
        }
    } catch (error) {
        console.error('[likeArticle] error:', error)
        return {
            code: 500,
            message: '点赞失败',
            error: error.message
        }
    }
}

/**
 * 点赞文章（简化版）
 * @param {Object} params - 参数对象
 * @param {String} params.id - 文章 ID
 * @param {Object} context - 上下文对象
 */
async function like({ id }, { db, dbCmd }) {
    if (!id) {
        return {
            code: 400,
            msg: '文章 ID 不能为空'
        }
    }

    await db.collection('articles')
        .doc(id)
        .update({
            likeCount: dbCmd.inc(1)
        })

    return {
        code: 0,
        msg: '点赞成功'
    }
}

/**
 * 收藏文章
 * @param {Object} params - 参数对象
 * @param {String} params.id - 文章 ID
 * @param {Object} context - 上下文对象
 * @param {Function} context.getUniIdToken - 获取 UniId Token 的方法
 */
async function collect({ id }, { db, dbCmd, getUniIdToken }) {
    if (!id) {
        return {
            code: 400,
            msg: '文章 ID 不能为空'
        }
    }

    // 这里同样使用自定义 token 解析用户（collect 目前没有 _token 参数，可按需扩展）
    const userInfo = getUniIdToken && getUniIdToken()
    const userId = userInfo && userInfo.uid

    if (!userId) {
        return {
            code: 401,
            msg: '请先登录'
        }
    }

    // 检查是否已收藏
    const existRes = await db.collection('user_collect')
        .where({
            userId,
            articleId: id
        })
        .get()

    if (existRes.data.length > 0) {
        return {
            code: 400,
            msg: '已收藏过该文章'
        }
    }

    // 添加收藏记录
    await db.collection('user_collect').add({
        userId,
        articleId: id,
        createTime: Date.now()
    })

    // 增加文章收藏数
    await db.collection('articles')
        .doc(id)
        .update({
            collectCount: dbCmd.inc(1)
        })

    return {
        code: 0,
        msg: '收藏成功'
    }
}

module.exports = {
    likeArticle,
    like,
    collect
}
