<template>
  <view class="section-card">
    <view class="section-head">
      <text class="section-title">基础信息</text>
    </view>

    <view
      v-for="field in baseFields"
      :key="field.label"
      class="info-row"
    >
      <text class="info-label">{{ field.label }}</text>
      <text class="info-value">{{ field.value }}</text>
    </view>
  </view>
</template>

<script>
export default {
  name: 'VolunteerDetailBaseInfoSection',
  props: {
    baseFields: {
      type: Array,
      default() {
        return []
      }
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

.info-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20rpx;
  padding: 18rpx 0;
  border-bottom: 1rpx solid #e5e7eb;
}

.info-row:last-child {
  padding-bottom: 0;
  border-bottom: none;
}

.info-label {
  flex-shrink: 0;
  font-size: 28rpx;
  color: #6b7280;
}

.info-value {
  flex: 1;
  text-align: right;
  font-size: 28rpx;
  line-height: 1.6;
  color: #111827;
}
</style>
