const authUtils = require('auth-utils')

module.exports = {
  _before: function () {
    const params = this.getParams()[0] || {}
    const token = params._token
    if (!token) throw new Error('未提供token，请先登录')
    const tokenData = authUtils.parseToken(token)
    if (!tokenData || !tokenData.uid) throw new Error('token无效或已过期')
    this.currentUser = { uid: tokenData.uid, openid: tokenData.openid }
    delete params._token
  },

  /**
   * 创建成长日志
   * @param {string} title - 标题
   * @param {string} content - 内容
   * @param {string} log_date - 日志日期（可选）
   * @returns {object} 创建结果
   */
  async createLog({ title, content, log_date } = {}) {
    try {
      const { uid } = this.currentUser
      const db = uniCloud.database()
      const now = Date.now()
      
      if (!title || !content) {
        throw new Error('标题和内容不能为空')
      }
      
      // 如果没有指定日期，使用今天
      const logDate = log_date || new Date().toISOString().split('T')[0]
      
      const result = await db.collection('growth_logs').add({
        user_id: uid,
        title: title.trim(),
        content: content.trim(),
        log_date: logDate,
        create_date: now,
        update_date: now
      })
      
      console.log('[growth-log-service][createLog] 创建成功, userId:', uid, 'logId:', result.id)
      
      return {
        code: 0,
        message: '创建成功',
        data: {
          id: result.id
        }
      }
    } catch (error) {
      console.error('[growth-log-service][createLog] 创建失败:', error)
      return {
        code: -1,
        message: error.message || '创建失败',
        data: null
      }
    }
  },

  /**
   * 获取日志列表
   * @param {number} page - 页码
   * @param {number} pageSize - 每页数量
   * @returns {object} 日志列表
   */
  async getLogList({ page = 1, pageSize = 10 } = {}) {
    try {
      const { uid } = this.currentUser
      const db = uniCloud.database()
      
      const countRes = await db.collection('growth_logs')
        .where({ user_id: uid })
        .count()
      
      const res = await db.collection('growth_logs')
        .where({ user_id: uid })
        .orderBy('log_date', 'desc')
        .orderBy('create_date', 'desc')
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .get()
      
      return {
        code: 0,
        message: '获取成功',
        data: {
          list: res.data,
          total: countRes.total,
          page,
          pageSize
        }
      }
    } catch (error) {
      console.error('[growth-log-service][getLogList] 获取失败:', error)
      return {
        code: -1,
        message: error.message || '获取失败',
        data: { list: [], total: 0, page, pageSize }
      }
    }
  },

  /**
   * 获取单个日志详情
   * @param {string} log_id - 日志ID
   * @returns {object} 日志详情
   */
  async getLogDetail({ log_id } = {}) {
    try {
      const { uid } = this.currentUser
      const db = uniCloud.database()
      
      if (!log_id) {
        throw new Error('日志ID不能为空')
      }
      
      const res = await db.collection('growth_logs')
        .where({
          _id: log_id,
          user_id: uid
        })
        .get()
      
      if (res.data.length === 0) {
        throw new Error('日志不存在')
      }
      
      return {
        code: 0,
        message: '获取成功',
        data: res.data[0]
      }
    } catch (error) {
      console.error('[growth-log-service][getLogDetail] 获取失败:', error)
      return {
        code: -1,
        message: error.message || '获取失败',
        data: null
      }
    }
  },

  /**
   * 更新日志
   * @param {string} log_id - 日志ID
   * @param {string} title - 标题
   * @param {string} content - 内容
   * @param {string} log_date - 日志日期
   * @returns {object} 更新结果
   */
  async updateLog({ log_id, title, content, log_date } = {}) {
    try {
      const { uid } = this.currentUser
      const db = uniCloud.database()
      
      if (!log_id) {
        throw new Error('日志ID不能为空')
      }
      
      const updateData = {
        update_date: Date.now()
      }
      
      if (title !== undefined) updateData.title = title.trim()
      if (content !== undefined) updateData.content = content.trim()
      if (log_date !== undefined) updateData.log_date = log_date
      
      const result = await db.collection('growth_logs')
        .where({
          _id: log_id,
          user_id: uid
        })
        .update(updateData)
      
      if (result.updated === 0) {
        throw new Error('日志不存在或无权修改')
      }
      
      console.log('[growth-log-service][updateLog] 更新成功, logId:', log_id)
      
      return {
        code: 0,
        message: '更新成功',
        data: {
          updated: result.updated
        }
      }
    } catch (error) {
      console.error('[growth-log-service][updateLog] 更新失败:', error)
      return {
        code: -1,
        message: error.message || '更新失败',
        data: null
      }
    }
  },

  /**
   * 删除日志
   * @param {string} log_id - 日志ID
   * @returns {object} 删除结果
   */
  async deleteLog({ log_id } = {}) {
    try {
      const { uid } = this.currentUser
      const db = uniCloud.database()
      
      if (!log_id) {
        throw new Error('日志ID不能为空')
      }
      
      const result = await db.collection('growth_logs')
        .where({
          _id: log_id,
          user_id: uid
        })
        .remove()
      
      if (result.deleted === 0) {
        throw new Error('日志不存在或无权删除')
      }
      
      console.log('[growth-log-service][deleteLog] 删除成功, logId:', log_id)
      
      return {
        code: 0,
        message: '删除成功',
        data: {
          deleted: result.deleted
        }
      }
    } catch (error) {
      console.error('[growth-log-service][deleteLog] 删除失败:', error)
      return {
        code: -1,
        message: error.message || '删除失败',
        data: null
      }
    }
  }
}
