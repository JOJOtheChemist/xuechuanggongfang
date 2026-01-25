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
   * 获取任务列表
   * @param {string} status - 任务状态
   * @param {number} page - 页码
   * @param {number} pageSize - 每页数量
   * @returns {object} 任务列表
   */
  async getTaskList({ status, page = 1, pageSize = 10 } = {}) {
    try {
      const { uid } = this.currentUser
      const db = uniCloud.database()

      let where = { user_id: uid }
      if (status) {
        where.status = status
      }

      const countRes = await db.collection('tasks')
        .where(where)
        .count()

      const res = await db.collection('tasks')
        .where(where)
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
      console.error('[task-service][getTaskList] 获取失败:', error)
      return {
        code: -1,
        message: error.message || '获取失败',
        data: { list: [], total: 0, page, pageSize }
      }
    }
  },

  /**
   * 获取任务详情
   * @param {string} taskId - 任务ID
   * @returns {object} 任务详情
   */
  async getTaskDetail(taskId) {
    try {
      if (!taskId) {
        throw new Error('缺少任务ID')
      }

      const db = uniCloud.database()

      const res = await db.collection('tasks')
        .doc(taskId)
        .get()

      if (!res.data || res.data.length === 0) {
        throw new Error('任务不存在')
      }

      return {
        code: 0,
        message: '获取成功',
        data: res.data[0]
      }
    } catch (error) {
      console.error('[task-service][getTaskDetail] 获取失败:', error)
      return {
        code: -1,
        message: error.message || '获取失败',
        data: null
      }
    }
  },

  /**
   * 创建任务
   * @param {object} taskData - 任务数据
   * @returns {object} 创建结果
   */
  async createTask({ title, description, type, priority, deadline }) {
    try {
      if (!title) {
        throw new Error('任务标题不能为空')
      }

      const { uid } = this.currentUser
      const db = uniCloud.database()

      const res = await db.collection('tasks').add({
        user_id: uid,
        title,
        description: description || '',
        type: type || 'custom',
        status: 'pending',
        priority: priority || 'medium',
        deadline: deadline || null,
        reward_points: 0,
        create_date: new Date().getTime(),
        update_date: new Date().getTime()
      })

      console.log('[task-service][createTask] 创建成功, taskId:', res.id)

      return {
        code: 0,
        message: '创建成功',
        data: { task_id: res.id }
      }
    } catch (error) {
      console.error('[task-service][createTask] 创建失败:', error)
      return {
        code: -1,
        message: error.message || '创建失败',
        data: null
      }
    }
  },

  /**
   * 更新任务
   * @param {string} taskId - 任务ID
   * @param {object} updateData - 更新数据
   * @returns {object} 更新结果
   */
  async updateTask({ taskId, title, description, status, priority }) {
    try {
      if (!taskId) {
        throw new Error('缺少任务ID')
      }

      const { uid } = this.currentUser
      const db = uniCloud.database()

      // 检查任务权限
      const taskRes = await db.collection('tasks')
        .doc(taskId)
        .get()

      if (!taskRes.data || taskRes.data.length === 0) {
        throw new Error('任务不存在')
      }

      if (taskRes.data[0].user_id !== uid) {
        throw new Error('无权操作')
      }

      const updateData = { update_date: new Date().getTime() }
      if (title) updateData.title = title
      if (description !== undefined) updateData.description = description
      if (status) updateData.status = status
      if (priority) updateData.priority = priority

      await db.collection('tasks')
        .doc(taskId)
        .update(updateData)

      console.log('[task-service][updateTask] 更新成功, taskId:', taskId)

      return {
        code: 0,
        message: '更新成功',
        data: { success: true }
      }
    } catch (error) {
      console.error('[task-service][updateTask] 更新失败:', error)
      return {
        code: -1,
        message: error.message || '更新失败',
        data: null
      }
    }
  },

/**
   * 完成任务
   * @param {object} params
   * @param {string} params.taskId - 任务ID
   * @returns {object} 完成结果
   */
  async completeTask({ taskId } = {}) {
    try {
      if (!taskId) {
        throw new Error('缺少任务ID')
      }

      const { uid } = this.currentUser
      const db = uniCloud.database()

      // 检查任务权限
      const taskRes = await db.collection('tasks')
        .doc(taskId)
        .get()

      if (!taskRes.data || taskRes.data.length === 0) {
        throw new Error('任务不存在')
      }

      if (taskRes.data[0].user_id !== uid) {
        throw new Error('无权操作')
      }

      // 更新任务状态
      await db.collection('tasks')
        .doc(taskId)
        .update({
          status: 'completed',
          complete_time: new Date().getTime(),
          update_date: new Date().getTime()
        })

      const rewardPoints = taskRes.data[0].reward_points || 0

      console.log('[task-service][completeTask] 完成成功, taskId:', taskId)

      return {
        code: 0,
        message: '任务已完成',
        data: {
          success: true,
          reward_points: rewardPoints
        }
      }
    } catch (error) {
      console.error('[task-service][completeTask] 完成失败:', error)
      return {
        code: -1,
        message: error.message || '完成失败',
        data: null
      }
    }
  },

  /**
   * 删除任务
   * @param {object} params
   * @param {string} params.taskId - 任务ID
   * @returns {object} 删除结果
   */
  async deleteTask({ taskId } = {}) {
    try {
      if (!taskId) {
        throw new Error('缺少任务ID')
      }

      const { uid } = this.currentUser
      const db = uniCloud.database()

      // 检查任务权限
      const taskRes = await db.collection('tasks')
        .doc(taskId)
        .get()

      if (!taskRes.data || taskRes.data.length === 0) {
        throw new Error('任务不存在')
      }

      if (taskRes.data[0].user_id !== uid) {
        throw new Error('无权操作')
      }

      await db.collection('tasks')
        .doc(taskId)
        .remove()

      console.log('[task-service][deleteTask] 删除成功, taskId:', taskId)

      return {
        code: 0,
        message: '删除成功',
        data: { success: true }
      }
    } catch (error) {
      console.error('[task-service][deleteTask] 删除失败:', error)
      return {
        code: -1,
        message: error.message || '删除失败',
        data: null
      }
    }
  },

  /**
   * 获取任务统计
   * @returns {object} 任务统计
   */
  async getTaskStats() {
    try {
      const { uid } = this.currentUser
      const db = uniCloud.database()

      const [pending, inProgress, completed] = await Promise.all([
        db.collection('tasks').where({ user_id: uid, status: 'pending' }).count(),
        db.collection('tasks').where({ user_id: uid, status: 'in_progress' }).count(),
        db.collection('tasks').where({ user_id: uid, status: 'completed' }).count()
      ])

      return {
        code: 0,
        message: '获取成功',
        data: {
          pending: pending.total,
          in_progress: inProgress.total,
          completed: completed.total
        }
      }
    } catch (error) {
      console.error('[task-service][getTaskStats] 获取失败:', error)
      return {
        code: -1,
        message: error.message || '获取失败',
        data: null
      }
    }
  }
}
