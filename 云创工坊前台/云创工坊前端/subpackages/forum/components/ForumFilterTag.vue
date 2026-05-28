<template>
  <view
    class="forum-filter-tag"
    :class="{ active: selected }"
    hover-class="none"
    hover-stop-propagation="true"
    @tap="$emit('select')"
  >
    <text class="forum-filter-tag-text">{{ label }}</text>
  </view>
</template>

<script>
export default {
  name: 'ForumFilterTag',
  props: {
    label: {
      type: String,
      default: ''
    },
    selected: {
      type: Boolean,
      default: false
    }
  }
}
</script>

<style scoped>
.forum-filter-tag {
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

.forum-filter-tag-text {
  font-size: 28rpx;
  font-weight: 600;
  color: #2563eb;
  line-height: 1;
  white-space: nowrap;
}

.forum-filter-tag.active {
  border-color: #2563eb;
  background: #2563eb;
}

.forum-filter-tag.active .forum-filter-tag-text {
  color: #ffffff;
}
</style>
