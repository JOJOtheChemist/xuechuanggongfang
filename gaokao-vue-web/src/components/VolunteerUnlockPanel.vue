<script setup>
import { computed } from 'vue'

const props = defineProps({
  isLoggedIn: {
    type: Boolean,
    default: false,
  },
  loading: {
    type: Boolean,
    default: false,
  },
  paymentLoading: {
    type: Boolean,
    default: false,
  },
  inviteCount: {
    type: Number,
    default: 0,
  },
  requiredInviteCount: {
    type: Number,
    default: 6,
  },
  unlocked: {
    type: Boolean,
    default: false,
  },
  userName: {
    type: String,
    default: '',
  },
  phone: {
    type: String,
    default: '',
  },
})

const emit = defineEmits(['login', 'invite', 'pay', 'refresh', 'contact'])

const normalizedRequired = computed(() => {
  const value = Number(props.requiredInviteCount)
  return Number.isFinite(value) && value > 0 ? value : 6
})

const normalizedInvite = computed(() => {
  const value = Number(props.inviteCount)
  return Number.isFinite(value) && value > 0 ? value : 0
})

const remaining = computed(() => Math.max(normalizedRequired.value - normalizedInvite.value, 0))
const progressPercent = computed(() => {
  if (normalizedRequired.value <= 0) return 0
  return Math.max(0, Math.min(100, Math.round((normalizedInvite.value / normalizedRequired.value) * 100)))
})

const title = computed(() => {
  if (!props.isLoggedIn) return '登录后解锁 AI 高考对话'
  if (props.unlocked) return 'AI 高考对话已解锁'
  return '邀请或付费解锁 AI 高考对话'
})

const description = computed(() => {
  if (!props.isLoggedIn) {
    return `免费邀请 ${normalizedRequired.value} 人，或付费后即可使用 AI 对话和查分能力。`
  }
  if (props.unlocked) {
    return '当前账号已经具备 AI 高考对话和直接查分权限。'
  }
  return remaining.value > 0
    ? `还差 ${remaining.value} 人即可免费解锁，也可以直接付费开通。`
    : '邀请人数已达标，刷新进度后即可解锁。'
})

const progressText = computed(() => `已邀请 ${normalizedInvite.value}/${normalizedRequired.value} 人`)
</script>

<template>
  <section class="unlock-panel">
    <div class="unlock-copy">
      <p class="unlock-badge">高考 AI 权限</p>
      <h2>{{ title }}</h2>
      <p class="unlock-desc">{{ description }}</p>
    </div>

    <div class="unlock-grid">
      <div class="unlock-card unlock-card-share">
        <p class="unlock-card-title">邀请好友免费解锁</p>
        <p class="unlock-progress-text">{{ progressText }}</p>
        <div class="unlock-progress-bar">
          <div class="unlock-progress-fill" :style="{ width: `${progressPercent}%` }"></div>
        </div>
        <button v-if="isLoggedIn" class="ghost" @click="emit('invite')">复制邀请链接</button>
        <button v-else class="ghost" @click="emit('login')">先登录再邀请</button>
      </div>

      <div class="unlock-card unlock-card-pay">
        <p class="unlock-card-title">付费立即开通</p>
        <p class="unlock-pay-text">桌面测试页仅展示入口，正式支付请在小程序完成。</p>
        <button class="primary" :disabled="paymentLoading" @click="emit('pay')">
          {{ paymentLoading ? '处理中...' : '查看付费说明' }}
        </button>
        <button class="ghost unlock-contact" @click="emit('contact')">
          客服 {{ phone || '15087599770' }}
        </button>
      </div>
    </div>

    <div v-if="isLoggedIn" class="unlock-footer">
      <span>{{ userName || '当前账号' }}</span>
      <button class="ghost" :disabled="loading" @click="emit('refresh')">
        {{ loading ? '同步中...' : '刷新解锁进度' }}
      </button>
    </div>
  </section>
</template>
