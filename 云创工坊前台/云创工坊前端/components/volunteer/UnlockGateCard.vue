<template>
  <view class="unlock-gate-card">
    <text class="unlock-title">{{ title }}</text>
    <text class="unlock-desc">{{ description }}</text>

    <view class="unlock-method-list">
      <view class="unlock-method unlock-method-share">
        <text class="unlock-method-title">{{ shareUnlockTitle }}</text>
        <view class="unlock-progress-card">
          <text class="unlock-progress-main">{{ progressText }}</text>
          <view class="unlock-progress-bar">
            <view class="unlock-progress-fill" :style="{ width: progressPercent + '%' }"></view>
          </view>
        </view>
        <button
          v-if="userLoggedIn"
          class="unlock-method-button unlock-method-button-ghost"
          open-type="share"
          @tap="emitShareTap"
        >
          去邀请好友
        </button>
        <button v-else class="unlock-method-button unlock-method-button-ghost" @tap="$emit('login')">
          登录后邀请
        </button>
      </view>

      <view class="unlock-method unlock-method-pay">
        <text class="unlock-method-title">支付 19.9 元立即解锁</text>
        <button
          class="unlock-method-button"
          :disabled="paymentLoading"
          @tap="$emit('pay')"
        >
          {{ paymentLoading ? '创建订单中...' : '19.9元立即解锁' }}
        </button>
        <view class="unlock-contact-chip" @tap="copyPhone">
          <text class="unlock-contact-label">客服电话</text>
          <text class="unlock-contact-phone">{{ customerServicePhone }}</text>
        </view>
      </view>
    </view>

    <view v-if="userLoggedIn" class="unlock-refresh" @tap="$emit('refresh')">
      <text>{{ loading ? '正在同步...' : '我已邀请，刷新进度' }}</text>
    </view>
  </view>
</template>

<script>
export default {
  name: 'VolunteerUnlockGateCard',
  props: {
    userLoggedIn: {
      type: Boolean,
      default: false
    },
    loading: {
      type: Boolean,
      default: false
    },
    paymentLoading: {
      type: Boolean,
      default: false
    },
    inviteCount: {
      type: Number,
      default: 0
    },
    requiredInviteCount: {
      type: Number,
      default: 0
    },
    userNickname: {
      type: String,
      default: ''
    },
    customerServicePhone: {
      type: String,
      default: ''
    }
  },
  computed: {
    normalizedRequiredInviteCount() {
      const count = Number(this.requiredInviteCount)
      return Number.isFinite(count) && count > 0 ? count : 0
    },
    shareUnlockTitle() {
      return this.normalizedRequiredInviteCount > 0
        ? `分享 ${this.normalizedRequiredInviteCount} 人免费解锁`
        : '分享邀请免费解锁'
    },
    progressText() {
      if (this.normalizedRequiredInviteCount > 0) {
        return `已邀请 ${this.inviteCount}/${this.normalizedRequiredInviteCount} 人`
      }

      return `已邀请 ${this.inviteCount} 人`
    },
    progressPercent() {
      if (this.normalizedRequiredInviteCount <= 0) return 0
      return Math.max(0, Math.min(100, Math.round((this.inviteCount / this.normalizedRequiredInviteCount) * 100)))
    },
    title() {
      return this.userLoggedIn ? '解锁志愿填报系统' : '登录后解锁志愿填报系统'
    },
    displayName() {
      const name = String(this.userNickname || '').trim()
      return name || '你'
    },
    description() {
      if (!this.userLoggedIn) {
        return this.normalizedRequiredInviteCount > 0
          ? `登录后可选择分享 ${this.normalizedRequiredInviteCount} 人免费解锁，或支付 19.9 元立即解锁。`
          : '登录后可选择分享邀请免费解锁，或支付 19.9 元立即解锁。'
      }

      const remaining = Math.max(this.normalizedRequiredInviteCount - this.inviteCount, 0)
      if (remaining <= 0) {
        return `${this.displayName}已满足分享解锁条件，可继续查看或直接支付解锁。`
      }

      return `${this.displayName}距离分享解锁还差 ${remaining} 人，也可以直接支付 19.9 元立即解锁。`
    }
  },
  methods: {
    emitShareTap() {
      this.$emit('share-tap')
    },
    copyPhone() {
      const phone = String(this.customerServicePhone || '').trim()
      if (!phone) return

      uni.setClipboardData({
        data: phone,
        success: () => {
          uni.showToast({
            title: '号码已复制',
            icon: 'none'
          })
          this.$emit('contact')
        }
      })
    }
  }
}
</script>

<style scoped>
.unlock-gate-card {
  padding: 34rpx 28rpx;
  border-radius: 30rpx;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.98) 0%, rgba(247, 250, 255, 0.98) 100%);
  box-shadow: 0 24rpx 48rpx rgba(15, 23, 42, 0.14);
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

.unlock-title {
  font-size: 36rpx;
  font-weight: 700;
  color: #0f172a;
}

.unlock-desc {
  font-size: 26rpx;
  line-height: 1.5;
  color: #475569;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.unlock-progress-bar {
  height: 14rpx;
  border-radius: 999rpx;
  background: rgba(226, 232, 240, 0.95);
  overflow: hidden;
}

.unlock-progress-fill {
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #fb7185 0%, #f59e0b 48%, #2563eb 100%);
}

.unlock-progress-text {
  font-size: 24rpx;
  color: #475569;
}

.unlock-method-list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16rpx;
}

.unlock-method {
  padding: 22rpx 20rpx;
  border-radius: 24rpx;
  display: flex;
  flex-direction: column;
  gap: 14rpx;
  min-height: 280rpx;
  box-sizing: border-box;
}

.unlock-method-share {
  background: rgba(255, 247, 237, 0.9);
}

.unlock-method-pay {
  background: rgba(239, 246, 255, 0.92);
}

.unlock-method-title {
  font-size: 28rpx;
  font-weight: 700;
  color: #0f172a;
}

.unlock-progress-card {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 18rpx;
}

.unlock-progress-main {
  font-size: 34rpx;
  font-weight: 800;
  line-height: 1.35;
  color: #c2410c;
}

.unlock-method-button {
  min-height: 78rpx;
  border-radius: 20rpx;
  border: none;
  background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
  color: #ffffff;
  font-size: 24rpx;
  font-weight: 700;
  white-space: nowrap;
}

.unlock-method-button::after {
  border: none;
}

.unlock-method-button[disabled] {
  opacity: 0.6;
}

.unlock-method-button-ghost {
  background: rgba(255, 255, 255, 0.85);
  color: #c2410c;
  border: none;
}

.unlock-contact-chip {
  margin-top: auto;
  padding: 18rpx 20rpx;
  border-radius: 20rpx;
  background: rgba(29, 78, 216, 0.1);
  display: flex;
  flex-direction: column;
  gap: 8rpx;
  box-sizing: border-box;
}

.unlock-contact-label {
  font-size: 22rpx;
  line-height: 1.4;
  color: #2563eb;
}

.unlock-contact-phone {
  font-size: 30rpx;
  font-weight: 800;
  line-height: 1.35;
  color: #1d4ed8;
}

.unlock-refresh {
  min-height: 78rpx;
  border-radius: 20rpx;
  background: rgba(15, 23, 42, 0.05);
  color: #0f172a;
  font-size: 25rpx;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
