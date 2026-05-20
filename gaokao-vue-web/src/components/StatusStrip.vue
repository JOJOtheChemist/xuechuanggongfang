<script setup>
defineProps({
  isLoggedIn: {
    type: Boolean,
    default: false,
  },
  currentUserName: {
    type: String,
    default: '未登录',
  },
  remainingPower: {
    type: Number,
    default: 0,
  },
  powerLoading: {
    type: Boolean,
    default: false,
  },
})
</script>

<template>
  <section class="status-strip">
    <div class="status-pill">
      <span class="status-pill-label">登录</span>
      <strong>{{ isLoggedIn ? '已登录' : '未登录' }}</strong>
      <span class="status-pill-sub">{{ currentUserName }}</span>
    </div>
    <div class="status-pill">
      <span class="status-pill-label">算力</span>
      <strong>{{ powerLoading ? '读取中...' : `${remainingPower} 点` }}</strong>
      <span class="status-pill-sub">默认测试用户</span>
    </div>
  </section>
</template>
