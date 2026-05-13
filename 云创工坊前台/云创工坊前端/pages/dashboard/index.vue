<template>
  <view class="forum-entry-page">
    <view class="entry-card">
      <text class="entry-title">正在进入校园广场...</text>
      <text class="entry-desc">如果没有自动跳转，请点击下方按钮。</text>
      <button class="entry-btn" @tap="openForum">进入广场</button>
    </view>
  </view>
</template>

<script>
const FORUM_SUBPACKAGE_PATH = '/subpackages/forum/index'

export default {
  data() {
    return {
      hasRedirected: false
    }
  },
  onLoad() {
    this.openForum()
  },
  onShow() {
    this.openForum()
  },
  methods: {
    openForum() {
      if (this.hasRedirected) return
      this.hasRedirected = true

      uni.reLaunch({
        url: FORUM_SUBPACKAGE_PATH,
        fail: () => {
          this.hasRedirected = false
          uni.navigateTo({
            url: FORUM_SUBPACKAGE_PATH
          })
        }
      })
    }
  }
}
</script>

<style scoped>
.forum-entry-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32rpx;
  background: #f8fafc;
  box-sizing: border-box;
}

.entry-card {
  width: 100%;
  max-width: 640rpx;
  padding: 48rpx 36rpx;
  border-radius: 28rpx;
  background: #ffffff;
  box-shadow: 0 12rpx 32rpx rgba(15, 23, 42, 0.08);
  text-align: center;
}

.entry-title {
  display: block;
  font-size: 34rpx;
  font-weight: 700;
  color: #0f172a;
}

.entry-desc {
  display: block;
  margin-top: 16rpx;
  font-size: 24rpx;
  color: #64748b;
  line-height: 1.7;
}

.entry-btn {
  margin-top: 32rpx;
  border: none;
  border-radius: 999rpx;
  background: #0f172a;
  color: #ffffff;
  font-size: 28rpx;
}
</style>
