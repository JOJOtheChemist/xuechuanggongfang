<template>
  <view class="section-card">
    <view class="section-head">
      <text class="section-title">学校内容</text>
    </view>
    <text class="section-copy">{{ overviewText }}</text>
  </view>
</template>

<script>
export default {
  name: 'VolunteerDetailContentSection',
  props: {
    overviewText: {
      type: String,
      default: ''
    }
  }
}
</script>

<style scoped>
.section-card {
  padding: 28rpx;
  margin-bottom: 20rpx;
  border-radius: 28rpx;
  background: #f8fafc;
  box-shadow: 0 12rpx 28rpx rgba(15, 23, 42, 0.04);
}

.section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16rpx;
  margin-bottom: 20rpx;
}

.section-title {
  font-size: 34rpx;
  font-weight: 700;
  color: #111827;
}

.section-copy {
  font-size: 30rpx;
  line-height: 1.8;
  color: #475569;
}
</style>
