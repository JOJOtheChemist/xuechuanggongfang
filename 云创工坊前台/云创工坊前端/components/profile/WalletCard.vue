<template>
  <view class="wallet-wrapper">
    <!-- 钱包卡片 -->
    <view class="wallet-card">
      <!-- 装饰背景圆 -->
      <view class="deco-circle"></view>
      
      <!-- 顶部：标题 + 历史按钮 -->
      <view class="card-header">
        <view class="wallet-label">
          <text>新币余额</text>
        </view>
        <button class="history-btn" @tap="openModal">新币明细 ></button>
      </view>

      <!-- 金额区域 -->
      <view class="balance-area">
        <text class="balance-num">{{ displayAmount }}</text>
        <text class="currency-label">新币</text>
      </view>

      <!-- 统计数据区域 -->
      <view class="stats-row">
        <view class="stat-item">
          <text class="stat-label">今日新增</text>
          <text class="stat-value">+{{ displayTodayIncome }}</text>
        </view>
        <view class="stat-divider"></view>
        <view class="stat-item">
          <text class="stat-label">累计收入</text>
          <text class="stat-value">{{ displayTotalIncome }}</text>
        </view>
      </view>

      <!-- 审核中提示（合并显示，只显示一条） -->
      <view v-if="combinedPendingCount > 0" class="audit-status-bar" @tap="openModal">
        <view class="audit-info">
          <view class="audit-dot"></view>
          <text>有 {{ combinedPendingCount }} 笔申请在审核中</text>
        </view>
        <text class="arrow-icon">></text>
      </view>

      <!-- 底部操作按钮 -->
      <view class="btn-row">
        <button class="action-btn exch" @tap="showWithdrawModal">兑换积分</button>
        <button class="action-btn cash" @tap="showWithdrawCashModal">提现</button>
      </view>
    </view>

    <!-- 资金明细弹窗逻辑已移除，改为事件触发 -->
  </view>
</template>

<script>
import { getHttpService, getCurrentUserInfo, getCurrentUserToken } from '@/utils/http-services'

export default {
  name: 'WalletCard',
  data() {
    return {
      amount: 0,
      loading: false,
      error: '',
      // 新币统计
      todayIncome: 0,
      totalIncome: 0,
      pendingCount: 0,
      withdrawPendingCount: 0
    }
  },
  computed: {
    displayAmount() {
      return this.formatCoinAmount(this.amount)
    },
    displayTodayIncome() {
      return this.formatCoinAmount(this.todayIncome)
    },
    displayTotalIncome() {
      return this.formatCoinAmount(this.totalIncome)
    },
    calcPoints() {
      const val = parseFloat(this.withdrawAmount)
      if (isNaN(val) || val <= 0) return 0
      // 100新币 = 1积分
      return Math.floor(val / 100)
    },
    combinedPendingCount() {
      const a = Number(this.pendingCount) || 0 // 兑换待审
      const b = Number(this.withdrawPendingCount) || 0 // 提现待审
      return a + b
    }
  },
  methods: {
    getToken() {
      return getCurrentUserToken()
    },
    getMissingAuthMessage() {
      const cachedUser = getCurrentUserInfo()
      if (cachedUser && (cachedUser.uid || cachedUser.userId || cachedUser.nickname || cachedUser.username)) {
        return '本地有用户信息，但登录令牌缺失或失效，请重新登录'
      }
      return '未登录，无法获取余额'
    },
    normalizeWalletErrorMessage(input, fallback = '获取余额失败') {
      const message = String(
        (input && (input.message || input.errMsg || input.error)) ||
        fallback
      )

      if (/ERR_CONNECTION_CLOSED|request:fail|HTTP_REQUEST_FAILED|network|socket/i.test(message)) {
        return '网络连接异常，请稍后重试'
      }
      if (/401|未登录|登录状态|token|Unauthorized|AUTH_REQUIRED/i.test(message)) {
        return '登录状态已失效，请重新登录'
      }
      return message || fallback
    },
    formatCoinAmount(value) {
      const numericValue = Number(value)
      if (!Number.isFinite(numericValue)) {
        return '0'
      }

      const fixed = numericValue.toFixed(2)
      const [integerPart, decimalPart] = fixed.split('.')
      const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',')

      if (!decimalPart || decimalPart === '00') {
        return formattedInteger
      }

      return `${formattedInteger}.${decimalPart.replace(/0+$/, '')}`
    },
    openModal() {
      this.$emit('showHistory')
    },
    openWithdrawList() {
      // 预留：可跳转到提现记录页，当前仅做提示
      uni.showToast({ title: '提现记录开发中', icon: 'none' })
    },
    async loadPendingCount() {
      // 只统计“审核中”的新币记录数量
      try {
        const token = this.getToken()
        if (!token) return

        const coinService = getHttpService('coin-service')
        const res = await coinService.getCoinLogs({
          limit: 1,
          offset: 0,
          status: 'processing',
          type: 'exchange',
          _token: token
        })

        if (res.code === 0 && res.data) {
          this.pendingCount = res.data.total || 0
        } else {
          this.pendingCount = 0
        }
      } catch (e) {
        console.error('Failed to load pending coin logs count', e)
        this.pendingCount = 0
      }
    },
    showWithdrawModal() {
      uni.navigateTo({
        url: `/pages/extra/wallet-exchange?balance=${this.amount}`
      })
    },
    showWithdrawCashModal() {
      uni.navigateTo({
        url: `/pages/extra/wallet-withdraw?balance=${this.amount}`
      })
    },
    async loadBalance() {
      try {
        this.loading = true
        this.error = ''

        const token = this.getToken()
        if (!token) {
          this.error = this.getMissingAuthMessage()
          this.amount = 0
          this.todayIncome = 0
          this.totalIncome = 0
          return
        }

        const coinService = getHttpService('coin-service')
        // 使用新的统计接口，同时获取余额和统计数据
        const res = await coinService.getCoinStats({ _token: token })

        if (!res || res.code !== 0 || !res.data) {
          this.error = this.normalizeWalletErrorMessage(res, '获取余额失败')
          return
        }

        this.amount = res.data.current_balance || 0
        this.todayIncome = res.data.today_income || 0
        this.totalIncome = res.data.total_income || 0
      } catch (e) {
        console.error('[WalletCard] 获取新币余额失败', e)
        this.error = this.normalizeWalletErrorMessage(e, '获取余额失败')
      } finally {
        this.loading = false
      }
    },

    async loadWithdrawPendingCount() {
      try {
        const token = this.getToken()
        if (!token) return
        const coinService = getHttpService('coin-service')
        const res = await coinService.getCoinLogs({ _token: token, limit: 1, offset: 0, status: 'processing', type: 'withdraw' })
        if (res && res.code === 0 && res.data) {
          this.withdrawPendingCount = res.data.total || 0
        } else {
          this.withdrawPendingCount = 0
        }
      } catch (e) {
        console.error('[WalletCard] 获取提现待审数量失败', e)
        this.withdrawPendingCount = 0
      }
    },

    onWalletBalanceUpdated(newBalance) {
      const n = Number(newBalance)
      if (!isNaN(n)) {
        this.amount = n
      }
    },
    onSelectContactType(e) {
      // e.detail.value 是索引
      this.contactTypeIndex = parseInt(e.detail.value || 0)
    }
  },
  created() {
    this.loadBalance()
    this.loadPendingCount()
    this.loadWithdrawPendingCount()
    
    if (typeof uni !== 'undefined' && uni.$on) {
      uni.$on('wallet-balance-updated', this.onWalletBalanceUpdated)
      uni.$on('wallet-refresh', this.loadBalance)
    }
  },
  beforeDestroy() {
    if (typeof uni !== 'undefined' && uni.$off) {
      uni.$off('wallet-balance-updated', this.onWalletBalanceUpdated)
      uni.$off('wallet-refresh', this.loadBalance)
    }
  }
}
</script>

<style scoped>
.wallet-wrapper {
  width: 100%;
}

/* 钱包卡片 */
.wallet-card {
  background: linear-gradient(135deg, #7C3AED, #5B21B6);
  border-radius: var(--profile-card-radius, 20rpx);
  padding: 40rpx 36rpx;
  color: white;
  box-shadow: 0 20rpx 50rpx rgba(124, 58, 237, 0.18); /* softer shadow to avoid affecting next card */
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  /* justify-content: space-between;  <-- 去掉这个，避免强制拉开间距 */
  margin-bottom: 0;
}

/* 装饰背景圆 */
.deco-circle {
  content: '';
  position: absolute;
  top: -100rpx;
  right: -100rpx;
  width: 260rpx; /* smaller highlight */
  height: 260rpx;
  background: rgba(255, 255, 255, 0.08); /* lighter */
  border-radius: 50%;
  pointer-events: none;
}

/* 顶部：标题 + 历史按钮 */
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24rpx;
  position: relative;
  z-index: 1;
  width: 100%; /* 强制满宽，确保 space-between 生效 */
}

.header-left {
  display: flex;
  align-items: center;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.qr-small-box {
  width: 60rpx;
  height: 60rpx;
  background: rgba(255,255,255,0.2);
  border-radius: 12rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border: 1px solid rgba(255,255,255,0.3);
}

.qr-small-img {
  width: 100%;
  height: 100%;
}

.qr-small-placeholder {
  font-size: 16rpx;
  color: #fff;
  text-align: center;
  line-height: 1;
}

.qr-small-text {
  font-size: 16rpx;
}

.wallet-label {
  font-size: 28rpx;
  opacity: 0.9;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 12rpx;
  flex-shrink: 0;
}

.wallet-icon {
  font-size: 32rpx;
}

/* 历史记录按钮 */
.history-btn {
  background: rgba(255, 255, 255, 0.15);
  border: 2rpx solid rgba(255, 255, 255, 0.1);
  color: white;
  font-size: 24rpx;
  padding: 12rpx 24rpx;
  border-radius: 999rpx;
  backdrop-filter: blur(8rpx);
  line-height: 1;
}

.history-btn::after {
  border: none;
}

/* 金额区域 */
.balance-area {
  margin-bottom: 20rpx; /* 减少间距 */
  position: relative;
  z-index: 1;
  display: flex;
  align-items: baseline;
  gap: 12rpx;
}

.balance-num {
  font-size: 84rpx;
  font-weight: 800;
  letter-spacing: -2rpx;
  line-height: 1;
}

.currency-label {
  font-size: 32rpx;
  font-weight: 600;
  opacity: 0.9;
}

/* 统计数据区域 */
.stats-row {
  display: flex;
  align-items: center;
  justify-content: space-around;
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(16rpx);
  border-radius: var(--profile-card-soft-radius, 16rpx);
  padding: 16rpx 24rpx;
  margin-bottom: 24rpx;
  position: relative;
  z-index: 1;
}

.stat-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8rpx;
}

.stat-label {
  font-size: 22rpx;
  font-weight: 500;
  opacity: 0.8;
}

.stat-value {
  font-size: 28rpx;
  font-weight: 700;
}

.stat-divider {
  width: 2rpx;
  height: 40rpx;
  background: rgba(255, 255, 255, 0.2);
}

/* 审核状态条 */
.audit-status-bar {
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(16rpx);
  border-radius: var(--profile-card-soft-radius, 16rpx);
  padding: 16rpx 24rpx; /* 稍微减小 padding */
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24rpx; /* 减少间距 */
  position: relative;
  z-index: 1;
}

.audit-info {
  display: flex;
  align-items: center;
  gap: 16rpx;
  font-size: 24rpx;
  font-weight: 500;
}

.audit-dot {
  width: 16rpx;
  height: 16rpx;
  background: #F59E0B;
  border-radius: 50%;
  box-shadow: 0 0 16rpx rgba(245, 158, 11, 0.6);
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.6; transform: scale(1.2); }
  100% { opacity: 1; transform: scale(1); }
}

.arrow-icon {
  font-size: 36rpx;
  font-weight: 600;
}

/* 提现按钮 */
.btn-row {
  display: flex;
  gap: 16rpx;
}

.action-btn {
  flex: 1;
  background: white;
  color: #6D28D9;
  border: none;
  height: 88rpx;
  line-height: 88rpx;
  border-radius: 999rpx;
  font-size: 32rpx;
  font-weight: 700;
  box-shadow: 0 10rpx 30rpx rgba(0, 0, 0, 0.1);
}

.action-btn::after { border: none; }

.action-btn.exch { color: #6D28D9; }
.action-btn.exch { color: #6D28D9; }
.action-btn.cash { color: #2563EB; }




/* 左侧连线 */
.timeline-item:not(:last-child)::before {
  content: '';
  position: absolute;
  left: 38rpx;
  top: 76rpx;
  bottom: 0;
  width: 4rpx;
  background: #F3F4F6;
}

/* 左侧图标容器 */
.timeline-icon-box {
  width: 80rpx;
  height: 80rpx;
  border-radius: 50%;
  background: #F3F4F6;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-right: 30rpx;
  z-index: 2;
  border: 6rpx solid white;
}

.timeline-icon {
  font-size: 36rpx;
}

/* 状态颜色 - 审核中 */
.status-pending .timeline-icon-box {
  background: #FFF7ED;
  color: #F59E0B;
}

.status-pending .item-amount {
  color: #1F2937;
}

/* 状态颜色 - 已完成 */
.status-success .timeline-icon-box {
  background: #ECFDF5;
  color: #10B981;
}

.status-success .item-amount {
  color: #1F2937;
}

/* 右侧内容 */
.item-content {
  flex-grow: 1;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding-top: 4rpx;
}

.item-main {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.item-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #374151;
}

.item-date {
  font-size: 22rpx;
  color: #9CA3AF;
}

.item-right {
  text-align: right;
}

.item-amount {
  font-size: 32rpx;
  font-weight: 700;
}

.item-status-text {
  font-size: 22rpx;
  font-weight: 500;
  margin-top: 8rpx;
}

.status-pending .item-status-text {
  color: #F59E0B;
}

.status-success .item-status-text {
  color: #10B981;
}

.empty-state {
  padding: 120rpx 0;
  text-align: center;
}

.empty-text {
  font-size: 28rpx;
  color: #9CA3AF;
}

.loading-more {
  padding: 48rpx 0;
  text-align: center;
  font-size: 24rpx;
  color: #CBD5E1;
}


/* QR Modal Styles (Copied & Adapted) */
.qr-modal {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.6);
  z-index: 999;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.3s;
}

.qr-modal.active {
  opacity: 1;
  pointer-events: auto;
}

.qr-card-large {
  width: 600rpx;
  background: #fff;
  border-radius: 32rpx;
  padding: 40rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
}

.close-qr {
  position: absolute;
  top: 24rpx;
  right: 24rpx;
  font-size: 40rpx;
  color: #999;
  padding: 10rpx;
  line-height: 1;
}

.qr-modal-title {
  font-size: 32rpx;
  font-weight: 700;
  color: #333;
  margin-bottom: 32rpx;
}

.qr-image-placeholder {
  width: 400rpx;
  height: 400rpx;
  background: #F3F4F6;
  border-radius: 20rpx;
  margin-bottom: 32rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  position: relative;
  border: 2rpx dashed #ccc;
}

.qr-image {
  width: 100%;
  height: 100%;
}

.loading-qr {
  color: #999;
  font-size: 24rpx;
}

.qr-overlay-hint {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: rgba(0,0,0,0.5);
  color: white;
  font-size: 20rpx;
  text-align: center;
  padding: 8rpx 0;
}

.modal-actions {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.upload-btn {
  width: 100%;
  background: #4f46e5;
  color: white;
  border-radius: 999rpx;
  font-size: 28rpx;
}

.save-img-btn {
  width: 100%;
  background: #EEF2FF;
  color: #4f46e5;
  border-radius: 999rpx;
  font-size: 28rpx;
}
</style>
