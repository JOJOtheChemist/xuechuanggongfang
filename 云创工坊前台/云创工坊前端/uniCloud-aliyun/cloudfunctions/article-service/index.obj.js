// 文章服务云对象
const db = uniCloud.database()
const dbCmd = db.command
const authUtils = require('auth-utils')

// 引入辅助模块
const articleQueryHelper = require('./article-query-helper.js')
const articleInteractionHelper = require('./article-interaction-helper.js')
const articleUnlockHelper = require('./article-unlock-helper.js')
const articleCreateHelper = require('./article-create-helper.js')

module.exports = {
	/**
	 * 获取热门文章（按浏览量排序）
	 * @param {String} category_id - 业务板块分类 ID
	 * @param {Number} limit - 返回文章数量，默认 3
	 * @param {String} _token - 用户 token（可选）
	 */
	async getHotArticles(params) {
		return articleQueryHelper.getHotArticles(params, { db, dbCmd, authUtils })
	},

	/**
	 * 获取文章详情（支持身份认证和解锁逻辑）
	 * @param {String} articleId - 文章 ID
	 * @param {String} _token - 用户 token
	 */
	async getArticleDetail(params) {
		return articleQueryHelper.getArticleDetail(params, { db, dbCmd, authUtils })
	},

	/**
	 * 点赞文章
	 * @param {String} articleId - 文章 ID
	 * @param {String} _token - 用户 token
	 */
	async likeArticle(params) {
		return articleInteractionHelper.likeArticle(params, { db, dbCmd, authUtils })
	},

	/**
	 * 获取文章列表
	 * @param {Number} pageNum - 页码，默认 1
	 * @param {Number} pageSize - 每页条数，默认 10
	 * @param {String} categoryId - 分类 ID（可选）
	 * @param {String} keyword - 搜索关键词（可选）
	 */
	async getList(params) {
		return articleQueryHelper.getList(params, { db, dbCmd })
	},

	/**
	 * 获取文章详情
	 * @param {String} id - 文章 ID
	 */
	async getDetail(params) {
		return articleQueryHelper.getDetail(params, { db, dbCmd })
	},

	/**
	 * 点赞文章
	 * @param {String} id - 文章 ID
	 */
	async like(params) {
		return articleInteractionHelper.like(params, { db, dbCmd })
	},

	/**
	 * 收藏文章
	 * @param {String} id - 文章 ID
	 */
	async collect(params) {
		return articleInteractionHelper.collect(params, {
			db,
			dbCmd,
			getUniIdToken: this.getUniIdToken
		})
	},

	/**
	 * 解锁文章（扣除积分）
	 * @param {String} articleId - 文章 ID
	 * @param {String} _token - 用户 token
	 */
	async unlockArticle(params) {
		return articleUnlockHelper.unlockArticle(params, { db, authUtils })
	},

	/**
	 * 创建文章
	 * @param {String} title - 文章标题
	 * @param {String} content - 文章正文内容
	 * @param {String} summary - 文章摘要（可选）
	 * @param {String} category_id - 分类 ID
	 * @param {String} cover_image - 封面图片 fileID（可选）
	 * @param {Array} attachments - 附件 fileID 数组（可选）
	 * @param {Number} price_points - 积分价格，默认 0
	 * @param {String} _token - 用户 token
	 */
	async createArticle(params) {
		return articleCreateHelper.createArticle(params, { db, authUtils })
	}
}
