<script setup>
defineProps({
  apiBase: {
    type: String,
    default: '',
  },
  loginLoading: {
    type: Boolean,
    default: false,
  },
  powerLoading: {
    type: Boolean,
    default: false,
  },
  isLoggedIn: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits([
  'update:apiBase',
  'persist-api-base',
  'use-local',
  'use-prod',
  'login',
  'refresh-power',
  'clear-auth',
])
</script>

<template>
  <section class="control-bar">
    <div class="api-box">
      <label for="api-base">后端地址</label>
      <input
        id="api-base"
        :value="apiBase"
        type="text"
        placeholder="http://127.0.0.1:8001/api/v1"
        @input="emit('update:apiBase', $event.target.value)"
        @change="emit('persist-api-base')"
      />
      <div class="api-actions">
        <button class="ghost" @click="emit('use-local')">本地</button>
        <button class="ghost" @click="emit('use-prod')">线上</button>
      </div>
    </div>

    <div class="auth-actions">
      <button class="primary" :disabled="loginLoading" @click="emit('login')">
        {{ loginLoading ? '登录中...' : '测试用户登录' }}
      </button>
      <button class="ghost" :disabled="powerLoading || !isLoggedIn" @click="emit('refresh-power')">
        刷新算力
      </button>
      <button class="ghost danger" :disabled="!isLoggedIn" @click="emit('clear-auth')">
        退出测试登录
      </button>
    </div>
  </section>
</template>
