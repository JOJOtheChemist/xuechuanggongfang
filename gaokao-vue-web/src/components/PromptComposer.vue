<script setup>
defineProps({
  draft: {
    type: String,
    default: '',
  },
  samplePrompts: {
    type: Array,
    default: () => [],
  },
  sendingBoth: {
    type: Boolean,
    default: false,
  },
  leftLoading: {
    type: Boolean,
    default: false,
  },
  rightLoading: {
    type: Boolean,
    default: false,
  },
  globalError: {
    type: String,
    default: '',
  },
  disabled: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits([
  'update:draft',
  'clear-all',
  'apply-sample',
  'send-both',
  'send-left',
  'send-right',
])
</script>

<template>
  <section class="composer-card">
    <div class="composer-head">
      <h2>统一提问</h2>
      <button class="ghost" @click="emit('clear-all')">清空两边会话</button>
    </div>
    <textarea
      :value="draft"
      rows="4"
      :disabled="disabled"
      placeholder="输入高考咨询问题，比如分数、位次、科类、城市、专业偏好..."
      @input="emit('update:draft', $event.target.value)"
    />
    <div class="sample-list">
      <button
        v-for="prompt in samplePrompts"
        :key="prompt"
        class="sample-chip"
        :disabled="disabled"
        @click="emit('apply-sample', prompt)"
      >
        {{ prompt }}
      </button>
    </div>
    <div class="composer-actions">
      <button class="primary" :disabled="sendingBoth || disabled" @click="emit('send-both')">
        {{ sendingBoth ? '发送中...' : '同时发给 V4 / V5' }}
      </button>
      <button class="ghost" :disabled="leftLoading || disabled" @click="emit('send-left')">
        只发给 V4
      </button>
      <button class="ghost" :disabled="rightLoading || disabled" @click="emit('send-right')">
        只发给 V5
      </button>
    </div>
    <p v-if="globalError" class="error-text">{{ globalError }}</p>
  </section>
</template>
