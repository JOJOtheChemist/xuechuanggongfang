import App from './App'

// #ifndef VUE3
import Vue from 'vue'
import './uni.promisify.adaptor'
Vue.config.productionTip = false
App.mpType = 'app'

// [Global Mixin] 自动注入全局用户ID，方便页面调试和逻辑判断
// [Global Mixin] 自动注入全局用户ID及邀请人信息，方便页面调试和逻辑判断
Vue.mixin({
  data() {
    return {
      global_uid: '', // 全局变量：当前登录用户的 UID (Real UID)
      global_lifetime_inviter: '', // 全局变量：终身邀请人
      global_team_inviter: '', // 全局变量：团队邀请人 (临时)
      global_business_inviter: '' // 全局变量：业务邀请人 (临时)
    }
  },
  onShow() {
    // 每次页面显示时，自动获取最新的 UID
    const userInfo = uniCloud.getCurrentUserInfo()
    // 优先使用标准接口，如果没有（因项目自定义了storage key），则回退到本地缓存 'userId'
    this.global_uid = userInfo.uid || uni.getStorageSync('userId')

    // 2. 获取终身邀请人 (优先查标准字段，再查项目自定义字段)
    const storageInfo = uni.getStorageSync('userInfo') || {}
    this.global_lifetime_inviter = userInfo.inviter_uid ||
      storageInfo.inviter_uid ||
      (storageInfo.partner_info && storageInfo.partner_info.inviter_id) ||
      '未绑定'

    // 3. 获取临时邀请人缓存
    const pendingTeam = uni.getStorageSync('pending_team_invite')
    this.global_team_inviter = pendingTeam?.inviter || '无'

    // 4. 获取业务邀请人缓存
    const pendingBusiness = uni.getStorageSync('pending_business_invite')
    this.global_business_inviter = pendingBusiness?.inviter || '无'

    // 简单日志，确认状态
    if (this.global_uid) {
      // console.log('[Global] Current Page UID:', this.global_uid)
    }
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
