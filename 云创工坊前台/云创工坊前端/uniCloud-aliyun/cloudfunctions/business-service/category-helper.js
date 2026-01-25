/**
 * Category Helper - 业务板块相关操作
 * 包含业务板块的查询、统计等功能
 */

/**
 * 获取业务板块列表
 * @param {string} status - 状态筛选 active/inactive
 * @returns {object} 响应对象
 */
async function getCategoryList({ status } = {}) {
    try {
        const db = uniCloud.database()
        const dbCmd = db.command

        let query = {}
        if (status) {
            query.status = status
        } else {
            query.status = 'active' // 默认只返回激活的
        }

        const res = await db.collection('business_categories')
            .where(query)
            .orderBy('sort_order', 'asc')
            .get()

        console.log('[business-service][getCategoryList] 获取成功, 数量:', res.data.length)

        return {
            code: 0,
            message: '获取成功',
            data: res.data
        }
    } catch (error) {
        console.error('[business-service][getCategoryList] 获取失败:', error)
        return {
            code: -1,
            message: error.message || '获取失败',
            data: []
        }
    }
}

/**
 * 获取业务板块详情
 * @param {string} categoryId - 板块ID
 * @returns {object} 响应对象
 */
async function getCategoryDetail(categoryId) {
    try {
        if (!categoryId) {
            throw new Error('缺少板块ID')
        }

        const db = uniCloud.database()

        const res = await db.collection('business_categories')
            .doc(categoryId)
            .get()

        if (!res.data || res.data.length === 0) {
            throw new Error('板块不存在')
        }

        return {
            code: 0,
            message: '获取成功',
            data: res.data[0]
        }
    } catch (error) {
        console.error('[business-service][getCategoryDetail] 获取失败:', error)
        return {
            code: -1,
            message: error.message || '获取失败',
            data: null
        }
    }
}

/**
 * 获取热门板块
 * @param {number} limit - 数量限制
 * @returns {object} 响应对象
 */
async function getHotCategories({ limit = 5 } = {}) {
    try {
        const db = uniCloud.database()

        const res = await db.collection('business_categories')
            .where({
                status: 'active',
                tag: '热门推荐'
            })
            .orderBy('sort_order', 'asc')
            .limit(limit)
            .get()

        return {
            code: 0,
            message: '获取成功',
            data: res.data
        }
    } catch (error) {
        console.error('[business-service][getHotCategories] 获取失败:', error)
        return {
            code: -1,
            message: error.message || '获取失败',
            data: []
        }
    }
}

/**
 * 获取板块统计数据
 * @param {string} categoryId - 板块ID
 * @returns {object} 响应对象
 */
async function getCategoryStats(categoryId) {
    try {
        if (!categoryId) {
            throw new Error('缺少板块ID')
        }

        const db = uniCloud.database()

        // 统计该板块下的文章数量
        const articleCount = await db.collection('articles')
            .where({
                category_id: categoryId
            })
            .count()

        // 统计总浏览量
        const articlesRes = await db.collection('articles')
            .where({
                category_id: categoryId
            })
            .field({
                'stats.views': true
            })
            .get()

        const totalViews = articlesRes.data.reduce((sum, article) => {
            return sum + (article.stats?.views || 0)
        }, 0)

        return {
            code: 0,
            message: '获取成功',
            data: {
                article_count: articleCount.total,
                total_views: totalViews
            }
        }
    } catch (error) {
        console.error('[business-service][getCategoryStats] 获取失败:', error)
        return {
            code: -1,
            message: error.message || '获取失败',
            data: null
        }
    }
}

module.exports = {
    getCategoryList,
    getCategoryDetail,
    getHotCategories,
    getCategoryStats
}
