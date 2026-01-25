// 文章查询辅助模块
// 处理所有文章查询相关的操作

/**
 * 获取热门文章（按浏览量排序）
 * @param {Object} params - 参数对象
 * @param {String} params.category_id - 业务板块分类 ID
 * @param {Number} params.limit - 返回文章数量，默认 3
 * @param {String} params._token - 用户 token（可选）
 * @param {Object} context - 上下文对象
 * @param {Object} context.db - 数据库实例
 * @param {Object} context.dbCmd - 数据库命令
 * @param {Object} context.authUtils - 认证工具
 */
async function getHotArticles({
    category_id,
    limit = 3,
    _token
} = {}, { db, dbCmd, authUtils }) {
    if (!category_id) {
        return {
            code: 400,
            msg: '分类 ID 不能为空'
        }
    }

    try {
        // 查询该板块下浏览量最高的文章（热门文章）
        const res = await db.collection('articles')
            .where({
                category_id
            })
            .orderBy('stats.views', 'desc') // 按浏览量降序
            .limit(limit)
            .field({
                _id: true,
                title: true,
                summary: true,
                cover_image: true,
                price_points: true,
                stats: true,
                publish_time: true
            })
            .get()

        const articles = res.data || []

        // 如果提供了 token，查询用户的解锁状态
        if (_token && articles.length > 0) {
            try {
                const tokenData = authUtils.parseToken(_token)
                const userId = tokenData && tokenData.uid

                if (userId) {
                    const articleIds = articles.map(a => a._id)

                    // 查询用户已解锁的文章
                    const unlockRes = await db.collection('article_interactions')
                        .where({
                            user_id: userId,
                            article_id: dbCmd.in(articleIds),
                            type: 'unlock'
                        })
                        .field({ article_id: true })
                        .get()

                    const unlockedIds = new Set((unlockRes.data || []).map(item => item.article_id))

                    // 给每篇文章添加 unlocked 属性
                    articles.forEach(article => {
                        article.unlocked = article.price_points <= 0 || unlockedIds.has(article._id)
                    })
                }
            } catch (e) {
                console.error('[getHotArticles] 查询解锁状态失败:', e)
                // 失败不影响主流程，默认未解锁
            }
        }

        return {
            code: 0,
            msg: 'ok',
            data: {
                list: articles
            }
        }
    } catch (error) {
        console.error('[getHotArticles] error:', error)
        return {
            code: 500,
            msg: '查询失败',
            error: error.message
        }
    }
}

/**
 * 获取文章详情（支持身份认证和解锁逻辑）
 * @param {Object} params - 参数对象
 * @param {String} params.articleId - 文章 ID
 * @param {String} params._token - 用户 token
 * @param {Object} context - 上下文对象
 */
async function getArticleDetail({
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

        // 查询文章信息
        const articleRes = await db.collection('articles')
            .doc(articleId)
            .get()

        if (!articleRes.data || articleRes.data.length === 0) {
            return {
                code: 404,
                message: '文章不存在'
            }
        }

        const article = articleRes.data[0]
        const pricePoints = article.price_points || 0

        // 增加浏览量
        await db.collection('articles')
            .doc(articleId)
            .update({
                'stats.views': dbCmd.inc(1)
            })

        // 记录查看行为
        await db.collection('article_interactions').add({
            article_id: articleId,
            user_id: userId,
            type: 'view'
        })

        // 如果文章免费，直接返回完整内容
        if (pricePoints <= 0) {
            return {
                code: 0,
                data: {
                    ...article,
                    unlocked: true
                }
            }
        }

        // 检查用户是否已解锁该文章
        const unlockRes = await db.collection('article_interactions')
            .where({
                article_id: articleId,
                user_id: userId,
                type: 'unlock'
            })
            .get()

        const isUnlocked = unlockRes.data && unlockRes.data.length > 0

        if (isUnlocked) {
            // 已解锁，返回完整内容
            return {
                code: 0,
                data: {
                    ...article,
                    unlocked: true
                }
            }
        } else {
            // 未解锁，只返回基本信息
            return {
                code: 0,
                data: {
                    _id: article._id,
                    title: article.title,
                    summary: article.summary,
                    cover_image: article.cover_image,
                    author_name: article.author_name,
                    publish_time: article.publish_time,
                    price_points: article.price_points,
                    stats: article.stats,
                    unlocked: false
                    // 不返回 content 字段
                }
            }
        }
    } catch (error) {
        console.error('[getArticleDetail] error:', error)
        return {
            code: 500,
            message: '获取文章失败',
            error: error.message
        }
    }
}

/**
 * 获取文章列表
 * @param {Object} params - 参数对象
 * @param {Number} params.pageNum - 页码，默认 1
 * @param {Number} params.pageSize - 每页条数，默认 10
 * @param {String} params.categoryId - 分类 ID（可选）
 * @param {String} params.keyword - 搜索关键词（可选）
 * @param {Number} params.status - 状态（可选）
 * @param {Array} params.tags - 标签数组（可选）
 * @param {Object} context - 上下文对象
 */
async function getList({
    pageNum = 1,
    pageSize = 10,
    categoryId = '',
    keyword = '',
    status,
    tags
} = {}, { db, dbCmd }) {
    const where = {}

    // 筛选已发布的文章
    // where.status = 1 // 暂时注释掉状态过滤，方便调试
    if (status) {
        where.status = status
    }

    // 分类筛选
    if (categoryId) {
        where.category_id = categoryId
    }

    // 关键词搜索（标题或内容）
    if (keyword) {
        where.$or = [
            { title: new RegExp(keyword, 'i') },
            { content: new RegExp(keyword, 'i') }
        ]
    }

    // 标签筛选 - 查询包含所有指定标签的文章
    if (tags && Array.isArray(tags) && tags.length > 0) {
        where.tags = dbCmd.all(tags)
    }

    // 查询总数
    const countRes = await db.collection('articles')
        .where(where)
        .count()

    // 查询列表
    const listRes = await db.collection('articles')
        .where(where)
        .orderBy('createTime', 'desc')
        .skip((pageNum - 1) * pageSize)
        .limit(pageSize)
        .get()

    return {
        code: 0,
        msg: 'ok',
        data: {
            list: listRes.data,
            total: countRes.total,
            pageNum,
            pageSize
        }
    }
}

/**
 * 获取文章详情（简化版）
 * @param {Object} params - 参数对象
 * @param {String} params.id - 文章 ID
 * @param {Object} context - 上下文对象
 */
async function getDetail({ id }, { db, dbCmd }) {
    if (!id) {
        return {
            code: 400,
            msg: '文章 ID 不能为空'
        }
    }

    const res = await db.collection('articles')
        .doc(id)
        .get()

    if (res.data.length === 0) {
        return {
            code: 404,
            msg: '文章不存在'
        }
    }

    // 增加阅读量
    await db.collection('articles')
        .doc(id)
        .update({
            viewCount: dbCmd.inc(1)
        })

    return {
        code: 0,
        msg: 'ok',
        data: res.data[0]
    }
}

module.exports = {
    getHotArticles,
    getArticleDetail,
    getList,
    getDetail
}
