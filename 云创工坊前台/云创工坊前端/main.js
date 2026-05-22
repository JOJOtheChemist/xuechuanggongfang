import App from './App'
import { normalizeAvatarUrl } from './utils/avatar'
import {
  buildDefaultSharePayload,
  buildDefaultTimelinePayload,
  cacheIncomingInvite,
  isPageLikeOptions,
  showGlobalShareMenu
} from './utils/share'
import { readStorageSync } from './utils/storage-bridge'

// #ifndef VUE3
import Vue from 'vue'
import './uni.promisify.adaptor'

Vue.config.productionTip = false
App.mpType = 'app'

Vue.config.optionMergeStrategies.onShareAppMessage = function mergeShareAppMessage(parent, child) {
  return child || parent
}

Vue.config.optionMergeStrategies.onShareTimeline = function mergeShareTimeline(parent, child) {
  return child || parent
}

// [Global Mixin] 自动注入全局用户ID，方便页面调试和逻辑判断
// [Global Mixin] 自动注入全局用户ID及邀请人信息，方便页面调试和逻辑判断
Vue.mixin({
  onLoad(options = {}) {
    if (!isPageLikeOptions(this.$options || {})) {
      return
    }

    const route = (this && this.route) ||
      (this && this.$page && this.$page.route) ||
      (this && this.$scope && this.$scope.route) ||
      ''

    this.__shareRoute = route
    this.__shareOptions = options
    void cacheIncomingInvite(options, route)
  },
  data() {
    return {
      global_uid: '', // 全局变量：当前登录用户的 UID (Real UID)
      global_lifetime_inviter: '', // 全局变量：终身邀请人
      global_team_inviter: '', // 全局变量：团队邀请人 (临时)
      global_business_inviter: '' // 全局变量：业务邀请人 (临时)
    }
  },
  methods: {
    normalizeAvatarUrl(url, fallback) {
      return normalizeAvatarUrl(url, fallback)
    },
    async refreshGlobalUserState() {
      const storedUserInfo = (await readStorageSync('userInfo', {})) || {}
      const storedUserId = await readStorageSync('userId', '')
      const resolvedUserId =
        storedUserInfo.uid ||
        storedUserInfo.userId ||
        storedUserInfo.user_id ||
        storedUserInfo.id ||
        storedUserId ||
        ''

      this.global_uid = resolvedUserId

      // 2. 获取终身邀请人 (优先查标准字段，再查项目自定义字段)
      this.global_lifetime_inviter =
        storedUserInfo.inviter_uid ||
        (storedUserInfo.partner_info && storedUserInfo.partner_info.inviter_id) ||
        '未绑定'

      // 3. 获取临时邀请人缓存
      const pendingTeam = await readStorageSync('pending_team_invite', null)
      this.global_team_inviter = pendingTeam?.inviter || '无'

      // 4. 获取业务邀请人缓存
      const pendingBusiness = await readStorageSync('pending_business_invite', null)
      this.global_business_inviter = pendingBusiness?.inviter || '无'

      // 简单日志，确认状态
      if (this.global_uid) {
        // console.log('[Global] Current Page UID:', this.global_uid)
      }
    }
  },
  onShow() {
    if (isPageLikeOptions(this.$options || {})) {
      showGlobalShareMenu()
    }

    void this.refreshGlobalUserState()
  },
  onShareAppMessage() {
    if (!isPageLikeOptions(this.$options || {})) {
      return {
        title: '学创工坊',
        path: '/pages/dashboard/index'
      }
    }

    return buildDefaultSharePayload(this)
  },
  onShareTimeline() {
    if (!isPageLikeOptions(this.$options || {})) {
      return {
        title: '学创工坊',
        query: ''
      }
    }

    return buildDefaultTimelinePayload(this)
  }
})

const app = new Vue({
  ...App
})
app.$mount()
// #endif

// #ifdef VUE3
import { createSSRApp } from 'vue'
export function createApp() {
  const app = createSSRApp(App)
  return {
    app
  }
}
// #endif
