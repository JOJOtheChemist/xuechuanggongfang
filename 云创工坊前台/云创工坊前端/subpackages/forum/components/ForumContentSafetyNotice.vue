<template>
  <view v-if="visible" class="safety-mask" @tap.self="handleClose">
    <view class="safety-card">
      <text class="safety-title">内容发布失败</text>
      <text class="safety-message">{{ displayMessage }}</text>
      <button class="safety-btn" @tap="handleClose">我知道了</button>
    </view>
  </view>
</template>

<script>
import {
  CONTENT_SECURITY_VIOLATION_MESSAGE,
  normalizeContentSafetyMessage
} from '@/utils/contentSafety.js'

export default {
  name: 'ForumContentSafetyNotice',
  props: {
    visible: {
      type: Boolean,
      default: false
    },
    message: {
      type: String,
      default: ''
    }
  },
  computed: {
    displayMessage() {
      return normalizeContentSafetyMessage(this.message, CONTENT_SECURITY_VIOLATION_MESSAGE)
    }
  },
  methods: {
    handleClose() {
      this.$emit('close')
    }
  }
}
</script>

<style scoped>
.safety-mask {
  position: fixed;
  left: 0;
  top: 0;
  right: 0;
  bottom: 0;
  background: rgba(15, 23, 42, 0.55);
  z-index: 9998;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 36rpx;
  box-sizing: border-box;
}

.safety-card {
  width: 100%;
  max-width: 640rpx;
  background: #ffffff;
  border-radius: 18rpx;
  padding: 34rpx 28rpx 30rpx;
  box-sizing: border-box;
}

.safety-title {
  display: block;
  font-size: 34rpx;
  line-height: 1.4;
  font-weight: 700;
  color: #0f172a;
}

.safety-message {
  display: block;
  margin-top: 14rpx;
  font-size: 28rpx;
  line-height: 1.7;
  color: #334155;
  white-space: pre-wrap;
}

.safety-btn {
  margin-top: 28rpx;
  height: 80rpx;
  line-height: 80rpx;
  border-radius: 14rpx;
  background: #1d4ed8;
  color: #ffffff;
  font-size: 28rpx;
  font-weight: 600;
}
</style>
