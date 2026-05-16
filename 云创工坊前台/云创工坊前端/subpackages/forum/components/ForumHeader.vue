<template>
  <view class="forum-header">
    <view class="header-main-row">
      <view class="school-selector" @tap="$emit('open-school-popup')">
        <text class="selector-text">{{ displaySchool }}</text>
        <text class="selector-switch">切换</text>
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
  position: relative;
  width: 100%;
  height: 128rpx;
  padding: 0 24rpx;
  background: transparent;
  border-bottom: 0;
}

.header-main-row {
  position: relative;
  width: 100%;
  height: 100%;
}

.school-selector {
  position: absolute;
  top: 58rpx;
  left: 72rpx;
  min-width: 0;
  max-width: 320rpx;
  display: flex;
  align-items: center;
  column-gap: 8rpx;
}

.selector-text {
  min-width: 0;
  font-size: 26rpx;
  font-weight: 600;
  color: #0f172a;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.selector-switch {
  flex-shrink: 0;
  font-size: 20rpx;
  color: #64748b;
}

.tabs {
  position: absolute;
  top: 115rpx;
  left: 24rpx;
  display: flex;
  align-items: center;
  column-gap: 14rpx;
}

.tab-item {
  min-width: 100rpx;
  height: 52rpx;
  padding: 0 28rpx;
  border-radius: 999rpx;
  border: 2rpx solid #bfdbfe;
  background: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
}

.tab-item text {
  font-size: 28rpx;
  font-weight: 600;
  color: #2563eb;
  line-height: 1;
}

.tab-item.active {
  border-color: #2563eb;
  background: #2563eb;
}

.tab-item.active text {
  color: #ffffff;
}
</style>
