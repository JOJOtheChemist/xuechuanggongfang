<template>
  <view class="support-card">
    <view class="support-copy">
      <text class="support-title">{{ title }}</text>
      <text v-if="normalizedDescription" class="support-desc">{{ normalizedDescription }}</text>
      <view v-if="normalizedRules.length" class="support-rules">
        <view
          v-for="(rule, index) in normalizedRules"
          :key="`${index}-${rule}`"
          class="support-rule-item"
        >
          <text class="support-rule-dot"></text>
          <text class="support-rule-text">{{ rule }}</text>
        </view>
      </view>
    </view>
    <view class="support-action" @tap="copyPhone">
      <text>{{ phone }}</text>
      <text class="support-action-hint">点击复制</text>
    </view>
  </view>
</template>

<script>
export default {
  name: 'VolunteerSupportPhoneCard',
  props: {
    title: {
      type: String,
      default: '志愿填报客服'
    },
    description: {
      type: String,
      default: ''
    },
    rules: {
      type: Array,
      default() {
        return []
      }
    },
    phone: {
      type: String,
      default: ''
    }
  },
  computed: {
    normalizedDescription() {
      return String(this.description || '').trim()
    },
    normalizedRules() {
      return Array.isArray(this.rules)
        ? this.rules.map((item) => String(item || '').trim()).filter(Boolean)
        : []
    }
  },
  methods: {
    copyPhone() {
      const phone = String(this.phone || '').trim()
      if (!phone) return

      uni.setClipboardData({
        data: phone,
        success: () => {
          uni.showToast({
            title: '号码已复制',
            icon: 'none'
          })
          this.$emit('copied', phone)
        }
      })
    }
  }
}
</script>

<style scoped>
.support-card {
  padding: 28rpx 24rpx;
  border-radius: 24rpx;
  background: linear-gradient(180deg, #ffffff 0%, #f4f8ff 100%);
  box-shadow: 0 12rpx 28rpx rgba(15, 23, 42, 0.05);
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 20rpx;
}

.support-copy {
  flex: 1;
  min-width: 0;
}

.support-title {
  display: block;
  font-size: 30rpx;
  font-weight: 700;
  line-height: 1.4;
  color: #17337e;
}

.support-desc {
  display: block;
  margin-top: 8rpx;
  font-size: 24rpx;
  line-height: 1.6;
  color: #64748b;
}

.support-rules {
  margin-top: 16rpx;
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.support-rule-item {
  display: flex;
  align-items: flex-start;
  gap: 10rpx;
}

.support-rule-dot {
  width: 10rpx;
  height: 10rpx;
  margin-top: 12rpx;
  border-radius: 50%;
  background: #17337e;
  flex-shrink: 0;
}

.support-rule-text {
  flex: 1;
  min-width: 0;
  font-size: 23rpx;
  line-height: 1.7;
  color: #475569;
}

.support-action {
  width: 100%;
  padding: 18rpx 20rpx;
  border-radius: 18rpx;
  background: #17337e;
  color: #ffffff;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  gap: 8rpx;
  box-sizing: border-box;
}

.support-action text {
  line-height: 1.3;
}

.support-action-hint {
  font-size: 20rpx;
  color: rgba(255, 255, 255, 0.75);
}
</style>
