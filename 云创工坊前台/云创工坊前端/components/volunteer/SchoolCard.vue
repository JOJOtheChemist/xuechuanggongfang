<template>
  <view class="school-card" @tap="handleSelect">
    <view class="school-header">
      <view class="school-logo">
        <text class="school-logo-text">{{ school.badge }}</text>
      </view>
      <view class="school-title-box">
        <text class="school-name">{{ school.name }}</text>
        <text class="school-sub-tags">
          {{ school.city }} | {{ school.level }} | {{ school.nature }} | {{ school.category }}
        </text>
        <text class="school-admission-line">
          {{ school.referenceLabel || '录取分数' }}：{{ school.minScore }}
        </text>
      </view>
      <view class="rate-badge" :class="school.strategyTone ? `rate-badge-${school.strategyTone}` : ''">
        <text class="rate-value">{{ school.matchRate }}</text>
        <text class="rate-label">{{ school.tip }}</text>
      </view>
    </view>

    <view class="school-info-row">
      <view class="info-chip">
        <text class="info-label">{{ school.referenceLabel || '院校线' }}</text>
        <text class="info-value">{{ school.minScore }}</text>
      </view>
      <view class="info-chip">
        <text class="info-label">{{ school.middleLabel || '专业数量' }}</text>
        <text class="info-value">{{ school.middleValue || school.majorCount }}</text>
      </view>
      <view class="info-chip" :class="school.strategyTone ? `info-chip-${school.strategyTone}` : ''">
        <text class="info-label">填报建议</text>
        <text class="info-value">{{ school.strategy }}</text>
      </view>
    </view>

    <view class="major-list">
      <view
        v-for="major in school.majors"
        :key="major"
        class="major-item"
      >
        <text>{{ major }}</text>
      </view>
    </view>
  </view>
</template>

<script>
export default {
  name: 'VolunteerSchoolCard',
  props: {
    school: {
      type: Object,
      default() {
        return {}
      }
    }
  },
  methods: {
    handleSelect() {
      this.$emit('select', this.school)
    }
  }
}
</script>

<style scoped>
.school-card {
  padding: 28rpx;
  border-radius: 28rpx;
  background: #ffffff;
  box-shadow: 0 16rpx 36rpx rgba(124, 58, 237, 0.08);
}

.school-header {
  display: flex;
  align-items: center;
  margin-bottom: 24rpx;
}

.school-logo {
  width: 84rpx;
  height: 84rpx;
  border-radius: 42rpx;
  margin-right: 20rpx;
  background: #7C3AED;
  box-shadow: 0 10rpx 24rpx rgba(124, 58, 237, 0.22);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.school-logo-text {
  font-size: 24rpx;
  font-weight: 700;
  color: #ffffff;
}

.school-title-box {
  flex: 1;
  min-width: 0;
}

.school-name {
  display: block;
  margin-bottom: 8rpx;
  font-size: 32rpx;
  font-weight: 700;
  color: #4C1D95;
}

.school-sub-tags {
  display: block;
  font-size: 22rpx;
  color: #8B7AA7;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.school-admission-line {
  display: block;
  margin-top: 8rpx;
  font-size: 23rpx;
  font-weight: 600;
  color: #6D28D9;
}

.rate-badge {
  margin-left: 18rpx;
  padding: 14rpx 18rpx;
  border-radius: 20rpx;
  background: #F3E8FF;
  text-align: center;
}

.rate-badge-hard {
  background: #FFF7ED;
}

.rate-badge-stable {
  background: #ECFDF5;
}

.rate-badge-safe {
  background: #EFF6FF;
}

.rate-badge-supplement {
  background: #FFF1F2;
}

.rate-value {
  display: block;
  font-size: 28rpx;
  font-weight: 700;
  color: #6D28D9;
}

.rate-badge-hard .rate-value {
  color: #C2410C;
}

.rate-badge-stable .rate-value {
  color: #047857;
}

.rate-badge-safe .rate-value {
  color: #1D4ED8;
}

.rate-badge-supplement .rate-value {
  color: #BE123C;
}

.rate-label {
  display: block;
  margin-top: 4rpx;
  font-size: 20rpx;
  color: #7C3AED;
}

.rate-badge-hard .rate-label {
  color: #EA580C;
}

.rate-badge-stable .rate-label {
  color: #059669;
}

.rate-badge-safe .rate-label {
  color: #2563EB;
}

.rate-badge-supplement .rate-label {
  color: #E11D48;
}

.school-info-row {
  display: flex;
  gap: 14rpx;
  margin-bottom: 22rpx;
}

.info-chip {
  flex: 1;
  padding: 18rpx 16rpx;
  border-radius: 20rpx;
  background: #FAF5FF;
}

.info-chip-hard {
  background: #FFF7ED;
}

.info-chip-stable {
  background: #ECFDF5;
}

.info-chip-safe {
  background: #EFF6FF;
}

.info-chip-supplement {
  background: #FFF1F2;
}

.info-label {
  display: block;
  margin-bottom: 6rpx;
  font-size: 20rpx;
  color: #A78BFA;
}

.info-value {
  display: block;
  font-size: 24rpx;
  font-weight: 600;
  color: #5B21B6;
}

.info-chip-hard .info-label {
  color: #FB923C;
}

.info-chip-hard .info-value {
  color: #C2410C;
}

.info-chip-stable .info-label {
  color: #34D399;
}

.info-chip-stable .info-value {
  color: #047857;
}

.info-chip-safe .info-label {
  color: #60A5FA;
}

.info-chip-safe .info-value {
  color: #1D4ED8;
}

.info-chip-supplement .info-label {
  color: #FB7185;
}

.info-chip-supplement .info-value {
  color: #BE123C;
}

.major-list {
  padding-top: 18rpx;
}

.major-item {
  margin-bottom: 14rpx;
  padding: 22rpx 20rpx;
  border-radius: 22rpx;
  background: #FAF5FF;
  font-size: 28rpx;
  font-weight: 500;
  color: #312E81;
}

.major-item:last-child {
  margin-bottom: 0;
}
</style>
