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
        <view v-if="isLoggedIn" class="user-block">
          <image v-if="userAvatar" :src="userAvatar" class="avatar" mode="aspectFill" />
          <view class="user-text">
            <text class="welcome">Hi, 欢迎回来</text>
            <text class="nickname">{{ userNickname || '同学' }}</text>
          </view>
          <button class="enter-btn" hover-class="btn-hover" @click="goHome">进入首页</button>
        </view>

        <view v-else class="action-block">
          <button
            class="wx-btn"
            hover-class="btn-hover"
            :loading="loginLoading"
            @click="wechatLogin"
          >
            {{ loginLoading ? '登录中...' : '微信一键登录' }}
          </button>

          <button class="guest-btn" hover-class="btn-hover" @click="goHome">
            游客试用
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
export default {
  data() {
    return {
      isLoggedIn: false,
      loginLoading: false,
      userId: '',
      userNickname: '',
      userAvatar: '',
      isPrivacyChecked: false,
      inviterId: '',
      inviterName: '',
      inviterLoading: false,
      teamInviter: '',
      businessInviter: ''
    }
  },
  onLoad(options) {
    console.log('[login] 页面 onLoad 入参:', JSON.stringify(options))
    
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
    const token = uni.getStorageSync('token')
    const userId = uni.getStorageSync('userId')
    const userInfo = uni.getStorageSync('userInfo') || {}

    if (token && userId) {
      this.isLoggedIn = true
      this.userId = userId
      this.userNickname = userInfo.nickname || ''
      this.userAvatar = userInfo.avatar || ''
      // 已登录则直接执行跳转逻辑
      this.handleLoginSuccess()
      return
    }

    this.initInviterInfo()
  },
  computed: {
    inviterDisplay() {
      if (this.inviterLoading) return '识别中...'
      if (this.inviterName) return this.inviterName
      return '没有'
    }
  },
  methods: {
    goHome() {
      // 尝试返回上一页
      const pages = getCurrentPages()
      if (pages.length > 1) {
        uni.navigateBack()
        return
      }
      // 否则回首页
      uni.switchTab({
        url: '/pages/dashboard/index'
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
        const teamService = uniCloud.importObject('team-service')
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

      uni.login({
        // provider 在多数平台可省略，这里显式指定微信小程序
        provider: 'weixin',
        success: async (loginRes) => {
          const code = loginRes.code
          if (!code) {
            uni.showToast({ title: '未获取到登录凭证', icon: 'none' })
            this.loginLoading = false
            return
          }

          try {
            // [双重保险] 优先使用URL参数的inviterId，兜底使用缓存
            const inviterId = this.inviterId || this.getPendingInviterId()
            const inviteType = this.inviteType || '' // 从 onLoad 时设置的 inviteType 读取
            console.log('[login] 准备登录，inviterId:', inviterId, 'inviteType:', inviteType, '来源:', this.inviterId ? 'URL参数' : '缓存')
            
            const userCenter = uniCloud.importObject('user-center')
            // [修改] 传递对象格式的 inviterId 参数
            const inviterParam = inviterId ? { inviterId, inviteType } : undefined
            const result = await userCenter.loginByWeixin({ code, inviterId: inviterParam })

            if (result.code === 0 && result.data) {
              const { uid, token, userInfo, isNewUser } = result.data

              this.isLoggedIn = true
              this.userId = uid
              this.userNickname = userInfo.nickname
              this.userAvatar = userInfo.avatar

              // 持久化登录态，供其它页面和接口共用
              uni.setStorageSync('userId', uid)
              uni.setStorageSync('token', token)
              uni.setStorageSync('userInfo', userInfo)
              
              uni.showToast({
                title: isNewUser ? 'Welcome!' : '登录成功',
                icon: 'success'
              })

              this.handleLoginSuccess()
            } else {
              uni.showToast({
                title: result.message || '登录失败',
                icon: 'none'
              })
            }
          } catch (e) {
            console.error('[login] 登录异常:', e)
            uni.showToast({
              title: e.message || '登录异常',
              icon: 'none'
            })
          } finally {
            this.loginLoading = false
          }
        },
        fail: (err) => {
          console.error('uni.login 失败:', err)
          uni.showToast({ title: '获取登录凭证失败', icon: 'none' })
          this.loginLoading = false
        }
      })
    },
    // 统一处理登录后的跳转逻辑
    async handleLoginSuccess() {
      console.log('[login] 登录成功/已登录，开始处理邀请跳转逻辑')
      
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
  background: #A78BFA;
  color: #ffffff;
  font-size: 34rpx;
  font-weight: 700;
  /* Cute 3D button effect */
  box-shadow: 0 12rpx 0 rgba(139, 92, 246, 1);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 12rpx;
}

.wx-btn:active {
  box-shadow: 0 4rpx 0 rgba(139, 92, 246, 1);
  transform: translateY(8rpx);
}

.guest-btn {
  width: 100%;
  height: 100rpx;
  line-height: 100rpx;
  border-radius: 50rpx;
  background: #ffffff;
  color: #7C3AED;
  font-size: 34rpx;
  font-weight: 700;
  box-shadow: 0 8rpx 0 #ddd6fe;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 12rpx;
  margin-top: 24rpx;
}

.guest-btn:active {
  box-shadow: 0 4rpx 0 #ddd6fe;
  transform: translateY(4rpx);
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
