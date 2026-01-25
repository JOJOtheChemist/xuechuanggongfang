const authUtils = require('auth-utils')
const teamManagement = require('./team-management-helper')
const teamJoin = require('./team-join-helper')
const teamInvite = require('./team-invite-helper')

module.exports = {
  _before: function () {
    const methodName = this.getMethodName()
    const NO_AUTH_Methods = ['getTeamInfoByInviter', 'getTeamDetail'] // 白名单方法，不需要登录即可调用

    if (NO_AUTH_Methods.includes(methodName)) {
      return // 跳过鉴权
    }

    const params = this.getParams()[0] || {}
    const token = params._token

    if (!token) {
      // 这里的逻辑改为非阻塞，允许特定业务方法自行决定是否需要登录
      this.currentUser = null
      return
    }

    const tokenData = authUtils.parseToken(token)

    if (!tokenData || !tokenData.uid) {
      this.currentUser = null
    } else {
      this.currentUser = {
        uid: tokenData.uid,
        openid: tokenData.openid
      }
      console.log('[team-service] 认证成功, UID:', tokenData.uid)
    }

    delete params._token
  },

  /**
   * 创建团队（仅管理员）
   */
  async createTeam(params) {
    return teamManagement.createTeam(params, this.currentUser)
  },

  /**
   * 获取团队列表
   */
  async getTeamList(params) {
    return teamManagement.getTeamList(params)
  },

  /**
   * 获取团队详情
   */
  async getTeamDetail(teamId) {
    return teamManagement.getTeamDetail(teamId)
  },

  /**
   * 获取团队成员列表
   */
  async getTeamMembers(params) {
    return teamManagement.getTeamMembers(params)
  },

  /**
   * 申请加入团队
   */
  async applyJoinTeam(params) {
    return teamJoin.applyJoinTeam(params, this.currentUser)
  },

  /**
   * 获取我的团队信息
   */
  async getMyTeam() {
    return teamJoin.getMyTeam(this.currentUser)
  },

  /**
   * 获取邀请统计
   */
  async getInviteStats() {
    return teamInvite.getInviteStats(this.currentUser)
  },

  /**
   * 根据邀请人ID获取其所在的团队信息（用于扫码后的预览页）
   */
  async getTeamInfoByInviter(inviterId) {
    return teamInvite.getTeamInfoByInviter(inviterId)
  },

  /**
   * 生成邀请二维码（小程序码）
   */
  async generateInviteQrcode() {
    return teamInvite.generateInviteQrcode(this.currentUser)
  }
}
