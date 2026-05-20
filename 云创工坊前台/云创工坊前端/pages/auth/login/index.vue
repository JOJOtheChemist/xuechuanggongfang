<template>
  <view class="login-page">
    <view class="content-wrapper">
      <view class="header-area">
        <text class="app-name">学创工坊</text>
        <view class="brand-slogan-box subtitle-position" @tap="goToIntro">
          <text class="brand-slogan">在这里，让每一次学创都有所回响 ✨</text>
        </view>
      </view>

      <view class="card">
        <view class="ambassador-badge-deco">
          <view class="ambassador-badge-glow"></view>
          <image
            class="ambassador-badge-img"
            src="https://xuechuang.xyz/oss/share-assets/xuechuang/profile/badges/campus-partner-badge-v1.png"
            mode="aspectFit"
          />
          <text class="ambassador-badge-label">校园大使</text>
        </view>

        <view v-if="isLoggedIn" class="user-block">
          <image v-if="userAvatar" :src="userAvatar" class="avatar" mode="aspectFill" />
          <view class="user-text">
            <text class="welcome">Hi, 欢迎回来</text>
            <text class="nickname">{{ userNickname || '同学' }}</text>
          </view>
          <button class="enter-btn" hover-class="btn-hover" @click="goHome">进入首页</button>
        </view>

        <view v-else class="action-block">
          <view class="guest-highlight">
            <button class="guest-btn" hover-class="btn-hover" @click="goHome">
              游客试用
            </button>
          </view>

          <button
            class="wx-btn"
            hover-class="btn-hover"
            :loading="loginLoading"
            @click="wechatLogin"
          >
            {{ loginLoading ? '登录中...' : '微信一键登录' }}
          </button>
          
          <view class="agreement-box">
            <view class="checkbox-area" @click="togglePrivacy">
              <view class="checkbox" :class="{ checked: isPrivacyChecked }">
                <text v-if="isPrivacyChecked" class="check-icon">✓</text>
              </view>
            </view>
            <view class="agreement-text">
              <text class="text-gray">登录即代表同意</text>
              <text class="link" @click.stop="openUserAgreement">《用户协议》</text>
              <text class="text-gray">与</text>
              <text class="link" @click.stop="openPrivacyPolicy">《隐私政策》</text>
            </view>
          </view>
        </view>
      </view>
    </view>
    <!-- Unified Debug Footer (Standardized) -->
    <!-- Hidden recruitment debug tags
    <view class="global-debug" style="margin-top: 40rpx; padding-bottom: 60rpx; font-size: 20rpx; color: #ccc; text-align: center; display: flex; flex-direction: column; gap: 6rpx;">
      <text>UID: {{ global_uid || '未登录' }}</text>
      <text>终身: {{ global_lifetime_inviter }}</text>
      <text>团队: {{ global_team_inviter }}</text>
      <text>业务: {{ global_business_inviter }}</text>
    </view>
    -->
  </view>
</template>

<script>
import { getHttpService, getCurrentUserInfo, getCurrentUserToken, normalizeUserInfo } from '@/utils/http-services'
import { getApiBaseUrl } from '@/utils/api-switch.js'
export default {
  data() {
    return {
      isLoggedIn: false,
      loginLoading: false,
      loginRetryCount: 0,
      forceLogin: false,
      userId: '',
      userNickname: '',
      userAvatar: '',
      isPrivacyChecked: false,
      inviterId: '',
      inviterName: '',
      inviterLoading: false,
      teamInviter: '',
      businessInviter: '',
      redirectUrl: ''
    }
  },
  onLoad(options) {
    console.log('[login] 页面 onLoad 入参:', JSON.stringify(options))
    this.redirectUrl = options.redirect ? decodeURIComponent(options.redirect) : ''
    this.forceLogin = String(options.forceLogin || options.force_login || '').trim() === '1'
    
    // [双重保险] 优先从 URL 参数（桌号）获取邀请人信息
    if (options.inviter_id) {
      this.inviterId = options.inviter_id
      this.inviteType = options.type || ''
      this.inviteScene = options.scene ? decodeURIComponent(options.scene) : ''
      console.log('[login] 从 URL 获取到桌号 - inviterId:', this.inviterId, 'type:', this.inviteType)
      
      // 如果是业务邀请且带了完整 scene，手动解析并放入缓存（作为备选保证 signup 页能拿到）
      if (this.inviteScene && this.inviteScene.indexOf('b=') !== -1) {
        const bizData = { 
          type: 'business_invite', 
          inviter: this.inviterId,
          timestamp: Date.now(),
          source: 'login_url_param'
        }
        this.inviteScene.split(',').forEach(part => {
          const kv = part.split('=')
          if (kv.length === 2) {
            if (kv[0] === 'b') bizData.businessId = kv[1]
          }
        })
        if (bizData.businessId) {
          uni.setStorageSync('pending_business_invite', bizData)
          console.log('[login] 已根据 URL scene 同步业务邀请缓存:', bizData)
        }
      } else if (this.inviteType === 'team' || !this.inviteType) {
        // 团队邀请同步缓存(带时间戳)
        uni.setStorageSync('pending_team_invite', {
          inviter: this.inviterId,
          type: 'team_invite',
          timestamp: Date.now(),
          source: 'login_url_param'
        })
        console.log('[login] 已将URL参数同步到团队邀请缓存')
      }
    } else {
      // [双重保险] 兜底：如果URL没有参数，尝试从缓存读取
      console.log('[login] URL无inviter_id参数，尝试从缓存读取')
      const cachedTeam = uni.getStorageSync('pending_team_invite')
      const cachedBiz = uni.getStorageSync('pending_business_invite')
      
      if (cachedTeam && cachedTeam.inviter) {
        this.inviterId = cachedTeam.inviter
        this.inviteType = 'team'
        console.log('[login] 从缓存恢复团队邀请人:', this.inviterId)
      } else if (cachedBiz && cachedBiz.inviter) {
        this.inviterId = cachedBiz.inviter
        this.inviteType = 'business'
        console.log('[login] 从缓存恢复业务邀请人:', this.inviterId)
      }
    }

    // 进入登录页时，先检查本地是否已有登录态
    this.initInviterInfo()
    if (this.forceLogin) {
      console.log('[login] 检测到 forceLogin，清理本地会话后等待重新登录')
      this.clearLocalSession()
      return
    }
    this.tryRestoreSession()
  },
  computed: {
    inviterDisplay() {
      if (this.inviterLoading) return '识别中...'
      if (this.inviterName) return this.inviterName
      return '没有'
    }
  },
  methods: {
    isWechatCodeInvalid(result) {
      const errcode = Number(result && result.details && result.details.errcode)
      const combinedMessage = String(
        (result && (result.message || result.error)) ||
        ''
      )

      return errcode === 40029 || /invalid code/i.test(combinedMessage)
    },

    getWechatLoginCode() {
      return new Promise((resolve, reject) => {
        uni.login({
          provider: 'weixin',
          success: (loginRes) => {
            const code = String(loginRes && loginRes.code || '').trim()
            if (!code) {
              reject(new Error('未获取到登录凭证'))
              return
            }

            resolve(code)
          },
          fail: (err) => {
            reject(err || new Error('获取登录凭证失败'))
          }
        })
      })
    },

    async submitWechatLogin(code, retryCount = 0) {
      const inviterId = String(this.inviterId || this.getPendingInviterId() || '').trim()
      const inviteType = String(this.inviteType || '').trim()
      const requestPayload = { code }
      if (inviterId) {
        requestPayload.inviterId = inviterId
        requestPayload.inviter_id = inviterId
        if (inviteType) {
          requestPayload.inviteType = inviteType
        }
      }

      console.log('[login] 准备登录，inviterId:', inviterId, 'inviteType:', inviteType, '来源:', this.inviterId ? 'URL参数' : '缓存', 'retryCount:', retryCount)

      const result = await this.requestWechatLoginWithFallback(requestPayload)

      if (result && result.ok && result.sessionToken) {
        return result
      }

      if (retryCount < 2 && this.isWechatCodeInvalid(result)) {
        console.warn('[login] 微信 code 已失效，自动重新获取后重试一次:', result)
        const nextCode = await this.getWechatLoginCode()
        this.loginRetryCount = retryCount + 1
        return this.submitWechatLogin(nextCode, retryCount + 1)
      }

      return result
    },

    async requestWechatLoginRaw(url, payload) {
      const response = await uni.request({
        url,
        method: 'POST',
        data: payload,
        header: {
          'Content-Type': 'application/json'
        },
        timeout: 12000
      })

      return Array.isArray(response) ? response[1] : response
    },

    normalizeWechatLoginResult(response) {
      const statusCode = Number(response && response.statusCode) || 0
      const body = response && response.data
      const payload = body && typeof body === 'object' ? body : {}
      const data = payload && payload.data && typeof payload.data === 'object' ? payload.data : payload
      const sessionToken = String(
        (data && (data.accessToken || data.access_token || data.token)) ||
        (payload && (payload.accessToken || payload.access_token || payload.token || payload.access_token)) ||
        ''
      ).trim()
      const refreshToken = String((data && data.refreshToken) || payload.refreshToken || '').trim()
      const userInfo = data && (data.userInfo || data.user) ? (data.userInfo || data.user) : (payload.user || null)
      const message = String(
        payload.message ||
        payload.error ||
        (payload.details && payload.details.errmsg) ||
        ''
      ).trim()

      return {
        statusCode,
        raw: response,
        payload,
        data,
        ok: (payload.code === 0 || payload.ok === true || statusCode === 200) && !!sessionToken,
        sessionToken,
        refreshToken,
        userInfo,
        uid: data && (data.uid || data.userId || data.user_id || data.id),
        isNewUser: Boolean(data && data.isNewUser),
        message: message || (statusCode === 200 ? '登录成功' : `登录失败(${statusCode || 'unknown'})`),
        error: String(payload.error || '').trim(),
        details: payload.details && typeof payload.details === 'object' ? payload.details : {}
      }
    },

    async requestWechatLoginWithFallback(payload) {
      const baseUrl = String(getApiBaseUrl() || '').replace(/\/+$/, '')
      const candidateUrls = [
        `${baseUrl}/auth/login/wechat`,
        `${baseUrl}/auth/wechat-login`
      ]

      let lastResult = null

      for (let index = 0; index < candidateUrls.length; index += 1) {
        const url = candidateUrls[index]
        try {
          const response = await this.requestWechatLoginRaw(url, payload)
          const result = this.normalizeWechatLoginResult(response)

          if (result.ok) {
            return result
          }

          lastResult = result

          const isRetryableWechatCodeError = this.isWechatCodeInvalid(result)
          const shouldTryNextEndpoint = !isRetryableWechatCodeError && index < candidateUrls.length - 1
          if (shouldTryNextEndpoint) {
            continue
          }

          return result
        } catch (error) {
          lastResult = {
            ok: false,
            sessionToken: '',
            refreshToken: '',
            userInfo: null,
            uid: '',
            isNewUser: false,
            message: String(error && (error.message || error.errMsg) || '登录异常').trim(),
            error: String(error && error.error || '').trim(),
            details: {}
          }
        }
      }

      return lastResult || {
        ok: false,
        sessionToken: '',
        refreshToken: '',
        userInfo: null,
        uid: '',
        isNewUser: false,
        message: '登录失败',
        error: '',
        details: {}
      }
    },

    async requestCurrentUserProfile(token) {
      const sessionToken = String(token || '').trim()
      if (!sessionToken) return null

      try {
        const response = await uni.request({
          url: `${String(getApiBaseUrl() || '').replace(/\/+$/, '')}/users/me`,
          method: 'GET',
          header: {
            Authorization: `Bearer ${sessionToken}`,
            'X-Access-Token': sessionToken
          },
          timeout: 12000
        })
        const raw = Array.isArray(response) ? response[1] : response
        const statusCode = Number(raw && raw.statusCode) || 0
        const payload = raw && raw.data && typeof raw.data === 'object' ? raw.data : {}
        if (statusCode !== 200) return null

        const data = payload && payload.data && typeof payload.data === 'object' ? payload.data : payload
        return data && typeof data === 'object' ? data : null
      } catch (error) {
        console.warn('[login] 补拉用户信息失败:', error)
        return null
      }
    },

    clearLocalSession() {
      uni.removeStorageSync('token')
      uni.removeStorageSync('accessToken')
      uni.removeStorageSync('refreshToken')
      uni.removeStorageSync('userInfo')
      uni.removeStorageSync('userId')
      uni.removeStorageSync('uni_id_token')
      uni.removeStorageSync('uni_id_token_expired')
      this.isLoggedIn = false
      this.userId = ''
      this.userNickname = ''
      this.userAvatar = ''
    },

    async tryRestoreSession() {
      const token = getCurrentUserToken()
      if (!token) {
        this.clearLocalSession()
        return
      }

      const cachedUser = getCurrentUserInfo()
      this.userId = cachedUser.userId || cachedUser.uid || ''
      this.userNickname = cachedUser.nickname || cachedUser.username || ''
      this.userAvatar = cachedUser.avatar || ''

      try {
        const userCenter = getHttpService('user-center')
        const res = await userCenter.getUserInfo({ _token: token })

        if (res && res.code === 0 && res.data) {
          const latestUserInfo = normalizeUserInfo(res.data)
          this.isLoggedIn = true
          this.userId = latestUserInfo.userId || latestUserInfo.uid || ''
          this.userNickname = latestUserInfo.nickname || latestUserInfo.username || ''
          this.userAvatar = latestUserInfo.avatar || ''
          uni.setStorageSync('userInfo', latestUserInfo)
          this.handleLoginSuccess()
          return
        }

        if (res && (res.error === 'AUTH_REQUIRED' || res.statusCode === 401)) {
          console.warn('[login] 本地 token 已失效，清理登录态')
          this.clearLocalSession()
          return
        }

        console.warn('[login] 会话校验未通过，停留登录页:', res)
      } catch (error) {
        console.error('[login] 会话校验异常:', error)
      }

      this.isLoggedIn = false
    },

    goHome() {
      // 尝试返回上一页
      const pages = getCurrentPages()
      if (pages.length > 1) {
        uni.navigateBack()
        return
      }
      // 否则回首页
      uni.reLaunch({
        url: '/subpackages/forum/index'
      })
    },

    getPendingInviterId() {
      const cached = uni.getStorageSync('pending_inviter_id')
      if (cached) return cached
      const teamInvite = uni.getStorageSync('pending_team_invite')
      if (teamInvite && teamInvite.inviter) return teamInvite.inviter
      const bizInvite = uni.getStorageSync('pending_business_invite')
      if (bizInvite && bizInvite.inviter) return bizInvite.inviter
      return ''
    },

    initInviterInfo() {
      // 获取团队邀请人
      const teamInvite = uni.getStorageSync('pending_team_invite')
      if (teamInvite && teamInvite.inviter) {
        this.teamInviter = teamInvite.inviter
        console.log('[login] 团队邀请人ID:', this.teamInviter)
      } else {
        this.teamInviter = ''
        console.log('[login] 没有团队邀请人')
      }

      // 获取业务邀请人
      const bizInvite = uni.getStorageSync('pending_business_invite')
      if (bizInvite && bizInvite.inviter) {
        this.businessInviter = bizInvite.inviter
        console.log('[login] 学习板块邀请人ID:', this.businessInviter)
      } else {
        this.businessInviter = ''
        console.log('[login] 没有学习板块邀请人')
      }

      // 保留原有逻辑
      const inviterId = this.getPendingInviterId()
      this.inviterId = inviterId
      this.inviterName = ''

      if (!inviterId) {
        this.inviterLoading = false
        return
      }

      this.fetchInviterName(inviterId)
    },

    async fetchInviterName(inviterId) {
      try {
        this.inviterLoading = true
        const teamService = getHttpService('team-service')
        const res = await teamService.getTeamInfoByInviter(inviterId)

        if (res?.code === 0 && res.data?.inviter_name) {
          this.inviterName = res.data.inviter_name
        } else {
          this.inviterName = ''
        }
      } catch (err) {
        console.error('[login] 获取邀请人信息失败:', err)
        this.inviterName = ''
      } finally {
        this.inviterLoading = false
      }
    },

    // 复用测试页已验证的微信快捷登录逻辑
    wechatLogin() {
      if (!this.isPrivacyChecked) {
        uni.showModal({
          title: '温馨提示',
          content: '请先阅读并同意《用户协议》和《隐私政策》',
          showCancel: false,
          confirmText: '我知道了',
          confirmColor: '#7C3AED'
        })
        return
      }

      if (this.loginLoading) return
      this.loginLoading = true
      this.loginRetryCount = 0

      ;(async () => {
        try {
          const code = await this.getWechatLoginCode()
          const result = await this.submitWechatLogin(code)

          if (result && result.ok && result.sessionToken) {
            const remoteUserInfo = result.userInfo || await this.requestCurrentUserProfile(result.sessionToken) || {}
            const latestUserInfo = normalizeUserInfo(remoteUserInfo)
            const sessionToken = result.sessionToken

            this.isLoggedIn = true
            this.userId = result.uid || latestUserInfo.uid || latestUserInfo.userId || ''
            this.userNickname = latestUserInfo.nickname || latestUserInfo.username || ''
            this.userAvatar = latestUserInfo.avatar || ''

            uni.setStorageSync('userId', this.userId)
            uni.setStorageSync('token', sessionToken)
            uni.setStorageSync('accessToken', sessionToken)
            uni.setStorageSync('uni_id_token', sessionToken)
            if (result.refreshToken) {
              uni.setStorageSync('refreshToken', result.refreshToken)
            }
            uni.setStorageSync('userInfo', latestUserInfo)

            uni.showToast({
              title: result.isNewUser ? 'Welcome!' : '登录成功',
              icon: 'success'
            })

            this.handleLoginSuccess()
            return
          }

          uni.showToast({
            title: (result && result.message) || '登录失败',
            icon: 'none'
          })
        } catch (e) {
          console.error('[login] 登录异常:', e)
          uni.showToast({
            title: e.message || '登录异常',
            icon: 'none'
          })
        } finally {
          this.loginLoading = false
        }
      })()
    },
    // 统一处理登录后的跳转逻辑
    async handleLoginSuccess() {
      console.log('[login] 登录成功/已登录，开始处理邀请跳转逻辑')

      if (this.redirectUrl) {
        this.redirectAfterLogin()
        return
      }
      
      // 优先处理业务邀请（报名）
      const jumpedToBusiness = await this.handlePendingBusinessInvite()
      
      // 如果没有业务邀请，再处理团队邀请
      let jumpedToTeam = false
      if (!jumpedToBusiness) {
        jumpedToTeam = await this.handlePendingTeamInvite()
      }

      // 如果没有任何跳转，回到首页
      if (!jumpedToBusiness && !jumpedToTeam) {
        console.log('[login] 没有检测到有效跳转指令，回首页')
        setTimeout(() => {
          this.goHome()
        }, 500)
      }
    },
    redirectAfterLogin() {
      const targetUrl = String(this.redirectUrl || '').trim()
      if (!targetUrl) {
        this.goHome()
        return
      }

      const tabBarPages = [
        '/pages/dashboard/index',
        '/pages/business/index',
        '/pages/task-center/index',
        '/pages/profile/index'
      ]
      const targetPath = targetUrl.split('?')[0]
      const isAiChatTarget = targetPath === '/subpackages/ai-chat/index'
      const pages = typeof getCurrentPages === 'function' ? getCurrentPages() : []
      const previousPage = pages.length > 1 ? pages[pages.length - 2] : null
      const previousPath = previousPage && previousPage.route
        ? `/${String(previousPage.route).replace(/^\/+/, '')}`
        : ''

      if (previousPath && previousPath === targetPath && !isAiChatTarget) {
        uni.navigateBack()
        return
      }

      if (tabBarPages.includes(targetPath)) {
        uni.switchTab({
          url: targetPath,
          fail: () => {
            uni.reLaunch({
              url: targetUrl
            })
          }
        })
        return
      }

      uni.redirectTo({
        url: targetUrl,
        fail: () => {
          uni.reLaunch({
            url: targetUrl
          })
        }
      })
    },

    // 登录后如果存在业务邀请，引导到报名页
    async handlePendingBusinessInvite() {
      try {
        // 优先查看内存里的“桌号”
        let invite = null
        if (this.inviterId && (this.inviteType === 'business' || this.inviteScene.indexOf('b=') !== -1)) {
          console.log('[login] 使用内存桌号处理业务邀请')
          const bizId = this.inviteScene.split(',').find(p => p.startsWith('b='))?.split('=')[1]
          invite = { businessId: bizId, inviter: this.inviterId }
        }

        // 兜底查看缓存
        if (!invite || !invite.businessId) {
          invite = uni.getStorageSync('pending_business_invite')
        }

        if (!invite || !invite.businessId) {
          console.log('[login] handlePendingBusinessInvite: 无效业务邀请')
          return false
        }

        console.log('[login] 准备跳转业务报名:', JSON.stringify(invite))
        
        // 构建报名页URL
        let url = `/pages/extra/signup/index?id=${invite.businessId}`
        if (invite.inviter) {
          url += `&inviter_id=${encodeURIComponent(invite.inviter)}`
        }

        // [NEW] 如果是新人分享板块 (id: 12)，则不跳转报名页，改为跳转简介页
        if (String(invite.businessId) === '12') {
          console.log('[login] 检测到新人板块(12)，重定向到简介页')
          url = '/pages/extra/functions'
        }
        
        // [双重保险] 延迟清除缓存，等跳转成功后再清除
        setTimeout(() => {
          console.log('[login] 执行跳转:', url)
          uni.navigateTo({ 
            url,
            success: () => {
              // 跳转成功后才清除缓存
              console.log('[login] 跳转成功，清除业务邀请缓存')
              uni.removeStorageSync('pending_business_invite')
              uni.removeStorageSync('pending_inviter_id')
            },
            fail: (err) => {
              console.error('[login] 跳转失败，保留缓存以便重试:', err)
            }
          })
        }, 300)
        
        return true
      } catch (e) {
        console.error('[login] 处理业务邀请失败:', e)
        return false
      }
    },

    // 登录后如果存在团队邀请，引导到加入确认页
    async handlePendingTeamInvite() {
      try {
        // 优先查看内存里的“桌号”
        let inviteInviterId = this.inviterId && (this.inviteType === 'team' || !this.inviteType) ? this.inviterId : ''
        
        // 兜底查看缓存
        if (!inviteInviterId) {
          const invite = uni.getStorageSync('pending_team_invite')
          inviteInviterId = invite?.inviter
        }

        if (!inviteInviterId) {
          console.log('[login] handlePendingTeamInvite: 无效团队邀请')
          return false
        }

        console.log('[login] 准备跳转团队确认，邀请人ID:', inviteInviterId)
        const url = `/pages/extra/join-team-confirm?inviter_id=${inviteInviterId}`
        
        // [双重保险] 延迟清除缓存，等跳转成功后再清除
        setTimeout(() => {
          console.log('[login] 执行跳转团队确认页:', url)
          uni.navigateTo({ 
            url,
            success: () => {
              // 跳转成功后才清除缓存
              console.log('[login] 跳转成功，清除团队邀请缓存')
              uni.removeStorageSync('pending_team_invite')
              uni.removeStorageSync('pending_inviter_id')
            },
            fail: (err) => {
              console.error('[login] 跳转失败，保留缓存以便重试:', err)
            }
          })
        }, 300)
        
        return true
      } catch (e) {
        console.error('[login] 处理团队邀请失败:', e)
        return false
      }
    },
    
    togglePrivacy() {
      this.isPrivacyChecked = !this.isPrivacyChecked
    },
    
    openUserAgreement() {
      uni.navigateTo({
        url: '/pages/auth/login/privacy?type=service'
      })
    },
    
    openPrivacyPolicy() {
      uni.navigateTo({
        url: '/pages/auth/login/privacy?type=privacy'
      })
    },
    
    goToIntro() {
      uni.navigateTo({
        url: '/pages/extra/functions'
      })
    }
  }
}
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  justify-content: center;
  position: relative;
  /* Lighter, Campus-style Purple Background */
  background-color: #EEE6FF;
  overflow: hidden;
  /* Ensure a cute font stack */
  font-family: "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Varela Round", sans-serif;
}

/* Light Rings Texture */
.login-page::before {
  content: '';
  position: absolute;
  top: -10%;
  right: -20%;
  width: 800rpx;
  height: 800rpx;
  border-radius: 50%;
  border: 2rpx solid rgba(167, 139, 250, 0.3);
  background: radial-gradient(circle, rgba(167, 139, 250, 0.1) 0%, rgba(167, 139, 250, 0) 60%);
  filter: blur(2px);
  z-index: 1;
}

.login-page::after {
  content: '';
  position: absolute;
  bottom: -10%;
  left: -20%;
  width: 900rpx;
  height: 900rpx;
  border-radius: 50%;
  border: 40rpx solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 0 100rpx rgba(139, 92, 246, 0.2);
  z-index: 1;
}

/* Additional decorative ring */
.content-wrapper::before {
  content: '';
  position: absolute;
  top: 10%;
  left: 10%;
  width: 100rpx;
  height: 100rpx;
  border-radius: 50%;
  border: 4rpx solid rgba(196, 181, 253, 0.6);
  z-index: 0;
}

.content-wrapper {
  position: relative;
  z-index: 10;
  padding: 0 60rpx;
  width: 100%;
  box-sizing: border-box;
}

.header-area {
  margin-bottom: 60rpx;
  text-align: center;
}

.app-name {
  display: block;
  font-size: 80rpx;
  font-weight: 800;
  /* Solid cute purple */
  color: #7C3AED; 
  margin-bottom: 20rpx;
  letter-spacing: 4rpx;
  /* Rounded strokes if supported, simulated with stroke */
  -webkit-text-stroke: 2rpx #7C3AED;
}

.brand-slogan-box.subtitle-position {
  margin-top: 10rpx;
  opacity: 1;
}

.brand-slogan {
  font-size: 34rpx;
  color: #7C3AED;
  font-weight: 800;
  letter-spacing: 2rpx;
  text-shadow: 0 0 20rpx rgba(124, 58, 237, 0.1);
}


.invite-info-section {
  margin-top: 24rpx;
  background: rgba(255, 255, 255, 0.3);
  backdrop-filter: blur(10px);
  border-radius: 20rpx;
  padding: 20rpx 24rpx;
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.invite-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 24rpx;
}

.invite-label {
  color: #5B21B6;
  font-weight: 600;
  flex-shrink: 0;
}

.invite-value {
  margin-left: 8rpx;
  color: #2D1B69;
  font-weight: 700;
  font-family: 'Courier New', monospace;
  font-size: 22rpx;
  word-break: break-all;
  text-align: right;
}


.card {
  width: 100%;
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(20px);
  border-radius: 60rpx; /* Extra rounded */
  padding: 80rpx 50rpx;
  box-shadow: 0 20rpx 60rpx rgba(139, 92, 246, 0.1);
  box-sizing: border-box;
  animation: slideUp 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
  position: relative;
  overflow: visible;
}

.ambassador-badge-deco {
  position: absolute;
  top: -82rpx;
  right: 34rpx;
  width: 168rpx;
  height: 188rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  pointer-events: none;
  z-index: 3;
  transform: rotate(6deg);
}

.ambassador-badge-glow {
  position: absolute;
  width: 142rpx;
  height: 142rpx;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(251, 191, 36, 0.42) 0%, rgba(251, 191, 36, 0) 70%);
  filter: blur(3rpx);
}

.ambassador-badge-img {
  width: 134rpx;
  height: 138rpx;
  position: relative;
  z-index: 2;
  filter: drop-shadow(0 12rpx 18rpx rgba(124, 58, 237, 0.18));
}

.ambassador-badge-label {
  position: relative;
  z-index: 2;
  margin-top: -8rpx;
  padding: 6rpx 16rpx;
  border-radius: 999rpx;
  font-size: 18rpx;
  font-weight: 800;
  color: #7c2d12;
  background: rgba(255, 247, 237, 0.95);
  border: 2rpx solid rgba(251, 191, 36, 0.34);
  box-shadow: 0 8rpx 18rpx rgba(251, 146, 60, 0.16);
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(60rpx) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

/* User Logged In State */
.user-block {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.avatar {
  width: 160rpx;
  height: 160rpx;
  border-radius: 80rpx;
  margin-bottom: 30rpx;
  border: 8rpx solid #F3E8FF;
  box-shadow: 0 10rpx 25rpx rgba(124, 58, 237, 0.2);
}

.user-text {
  text-align: center;
  margin-bottom: 60rpx;
}

.welcome {
  display: block;
  font-size: 28rpx;
  color: #8B5CF6;
  margin-bottom: 10rpx;
  font-weight: 500;
}

.nickname {
  display: block;
  font-size: 40rpx;
  font-weight: 800;
  color: #5B21B6;
}

.enter-btn {
  width: 100%;
  height: 100rpx;
  line-height: 100rpx;
  border-radius: 50rpx;
  /* Solid Color */
  background: #8B5CF6;
  color: #ffffff;
  font-size: 34rpx;
  font-weight: 700;
  box-shadow: 0 12rpx 0 rgba(109, 40, 217, 1); /* 3D Cute Effect */
  transition: all 0.1s;
  margin-bottom: 12rpx; /* Space for shadow */
}

.enter-btn:active {
  box-shadow: 0 4rpx 0 rgba(109, 40, 217, 1);
  transform: translateY(8rpx);
}

/* Guest State */
.action-block {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.wx-btn {
  width: 100%;
  height: 100rpx;
  line-height: 100rpx;
  border-radius: 50rpx;
  /* Solid Color */
  background: #ffffff;
  border: 2rpx solid rgba(124, 58, 237, 0.28);
  color: #7C3AED;
  font-size: 30rpx;
  font-weight: 700;
  box-shadow: 0 8rpx 0 rgba(221, 214, 254, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 30rpx;
  margin-bottom: 12rpx;
}

.wx-btn:active {
  box-shadow: 0 3rpx 0 rgba(221, 214, 254, 0.9);
  transform: translateY(5rpx);
}

.guest-highlight {
  width: 100%;
  padding: 26rpx 24rpx 28rpx;
  border-radius: 38rpx;
  background: linear-gradient(135deg, #fffbeb 0%, #fff7ed 46%, #ffffff 100%);
  box-shadow: 0 18rpx 36rpx rgba(251, 146, 60, 0.2);
  box-sizing: border-box;
}

.guest-btn {
  width: 100%;
  height: 112rpx;
  line-height: 112rpx;
  border-radius: 56rpx;
  background: linear-gradient(135deg, #fb923c 0%, #f97316 50%, #ea580c 100%);
  color: #ffffff;
  font-size: 36rpx;
  font-weight: 900;
  letter-spacing: 2rpx;
  box-shadow: 0 14rpx 0 #c2410c, 0 20rpx 34rpx rgba(234, 88, 12, 0.28);
  display: flex;
  align-items: center;
  justify-content: center;
}

.guest-btn::after {
  border: none;
}

.guest-btn:active {
  box-shadow: 0 5rpx 0 #c2410c, 0 10rpx 22rpx rgba(234, 88, 12, 0.22);
  transform: translateY(9rpx);
}

.agreement-box {
  margin-top: 40rpx;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  padding: 0 10rpx;
}

.checkbox-area {
  padding: 10rpx;
  display: flex;
  align-items: center;
}

.checkbox {
  width: 32rpx;
  height: 32rpx;
  border: 2rpx solid #A78BFA;
  border-radius: 8rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  background-color: transparent;
}

.checkbox.checked {
  background-color: #7C3AED;
  border-color: #7C3AED;
}

.check-icon {
  color: #fff;
  font-size: 24rpx;
  font-weight: bold;
}

.agreement-text {
  font-size: 26rpx;
  margin-left: 6rpx;
  line-height: 1.4;
}

.text-gray {
  color: #9CA3AF;
}

.link {
  color: #7C3AED;
  font-weight: 500;
  display: inline-block;
  margin: 0 2rpx;
}

.brand-slogan-box {
  /* Removed old position styles */
}
</style>
