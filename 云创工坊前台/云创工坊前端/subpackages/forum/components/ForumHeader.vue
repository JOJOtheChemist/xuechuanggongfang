<template>
  <view class="forum-header">
    <view class="top-bar">
      <text class="forum-title">校园论坛</text>
      <view class="school-selector" @tap="$emit('open-school-popup')">
        <text class="selector-arrow">⇄</text>
        <text class="selector-text">{{ displaySchool }}</text>
      </view>
    </view>

    <view class="tabs">
      <view
        class="tab-item"
        :class="{ active: activeTab === 'local' }"
        @tap="$emit('change-tab', 'local')"
      >
        <text>本校</text>
      </view>
      <view
        class="tab-item"
        :class="{ active: activeTab === 'hot' }"
        @tap="$emit('change-tab', 'hot')"
      >
        <text>热门</text>
      </view>
    </view>
  </view>
</template>

<script>
export default {
  name: 'ForumHeader',
  props: {
    activeTab: {
      type: String,
      default: 'local'
    },
    currentSchool: {
      type: String,
      default: ''
    }
  },
  computed: {
    displaySchool() {
      const school = String(this.currentSchool || '').trim()
      if (!school) return '选择学校'
      if (school.toLowerCase() === 'campus' || school === '其他') return '神秘学校'
      return school
    }
  }
}
</script>

<style scoped>
.forum-header {
  position: sticky;
  top: 0;
  z-index: 10;
  padding: calc(var(--status-bar-height) + 16rpx) 24rpx 16rpx;
  background: #ffffff;
  border-bottom: 1rpx solid #eeeeee;
}

.top-bar {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  row-gap: 12rpx;
  margin-bottom: 18rpx;
}

.forum-title {
  width: 100%;
  text-align: center;
  font-size: 34rpx;
  color: #333333;
  font-weight: 700;
}

.school-selector {
  display: flex;
  align-items: center;
  align-self: flex-start;
  max-width: 100%;
}

.selector-arrow {
  color: #ff5722;
  margin-right: 10rpx;
  font-size: 38rpx;
  line-height: 1;
}

.selector-text {
  font-size: 33rpx;
  font-weight: 700;
  color: #111111;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tabs {
  display: flex;
  column-gap: 54rpx;
}

.tab-item {
  position: relative;
  padding: 8rpx 0;
  font-size: 32rpx;
  color: #999999;
}

.tab-item.active {
  color: #000000;
  font-weight: 700;
}

.tab-item.active::after {
  content: '';
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  bottom: 0;
  width: 30rpx;
  height: 7rpx;
  border-radius: 4rpx;
  background: #fdd835;
}
</style>
