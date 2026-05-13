<template>
  <view class="overview-grid">
    <view class="overview-card">
      <text class="overview-label">参考录取分</text>
      <text class="overview-value">{{ referenceScoreText }}</text>
    </view>

    <view class="overview-card">
      <text class="overview-label">收录专业</text>
      <text class="overview-value">{{ majorCountText }}</text>
    </view>
  </view>
</template>

<script>
export default {
  name: 'VolunteerDetailOverviewGrid',
  props: {
    referenceScoreText: {
      type: String,
      default: '待补充'
    },
    majorCountText: {
      type: String,
      default: '待补充'
    }
  }
}
</script>

<style scoped>
.overview-grid {
  display: flex;
  flex-wrap: nowrap;
  gap: 16rpx;
  margin-bottom: 20rpx;
}

.overview-card {
  flex: 1 1 0;
  min-width: 0;
  box-sizing: border-box;
  padding: 24rpx;
  border-radius: 24rpx;
  background: #f8fafc;
  box-shadow: 0 10rpx 22rpx rgba(15, 23, 42, 0.04);
}

.overview-label {
  display: block;
  font-size: 26rpx;
  color: #64748b;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.overview-value {
  display: block;
  margin-top: 12rpx;
  font-size: 36rpx;
  line-height: 1.3;
  font-weight: 700;
  color: #1f2937;
}
</style>
