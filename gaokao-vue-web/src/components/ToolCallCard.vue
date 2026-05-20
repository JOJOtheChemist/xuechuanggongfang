<script setup>
import { computed, ref } from 'vue'

const props = defineProps({
  tools: {
    type: Array,
    default: () => [],
  },
})

const expanded = ref({})

function stringifyParams(value) {
  if (value === null || value === undefined) return ''
  if (typeof value === 'string') return value.trim()
  try {
    return JSON.stringify(value, null, 2)
  } catch (error) {
    return String(value)
  }
}

function compactText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim()
}

function hasParams(value) {
  if (value === null || value === undefined) return false
  if (typeof value === 'string') return !!value.trim()
  if (Array.isArray(value)) return value.length > 0
  if (typeof value === 'object') return Object.keys(value).length > 0
  return true
}

function resolveStateLabel(state) {
  const normalized = String(state || '').trim().toLowerCase()
  if (normalized === 'completed' || normalized === 'success') return '成功'
  if (normalized === 'failed' || normalized === 'error') return '失败'
  if (normalized === 'executing' || normalized === 'running' || normalized === 'pending') return '进行中'
  if (normalized === 'denied') return '已拒绝'
  return '已结束'
}

function resolveStateTone(state) {
  const normalized = String(state || '').trim().toLowerCase()
  if (normalized === 'completed' || normalized === 'success') return 'success'
  if (normalized === 'failed' || normalized === 'error' || normalized === 'denied') return 'error'
  if (normalized === 'executing' || normalized === 'running' || normalized === 'pending') return 'pending'
  return 'neutral'
}

function toggle(id) {
  expanded.value = {
    ...expanded.value,
    [id]: !expanded.value[id],
  }
}

const normalizedTools = computed(() => {
  return (Array.isArray(props.tools) ? props.tools : [])
    .filter(Boolean)
    .map((tool, index) => {
      const id = String(tool.id || `${tool.name || 'tool'}-${index}`)
      const params = Object.prototype.hasOwnProperty.call(tool, 'params') ? tool.params : tool.input
      const paramText = stringifyParams(params)
      const durationMs = Number(tool.durationMs)
      return {
        ...tool,
        id,
        label: String(tool.label || tool.name || '工具').trim(),
        inputPreview: compactText(tool.input || paramText).slice(0, 120),
        summary: compactText(tool.summary || ''),
        hasParams: typeof tool.hasParams === 'boolean' ? tool.hasParams : hasParams(params),
        paramText,
        durationText: Number.isFinite(durationMs) && durationMs >= 0 ? `${durationMs}ms` : '',
        tone: resolveStateTone(tool.state),
        stateLabel: resolveStateLabel(tool.state),
      }
    })
    .filter((tool) => tool.label || tool.summary || tool.inputPreview || tool.hasParams)
})

const toolLabelSummary = computed(() => {
  return Array.from(new Set(normalizedTools.value.map((tool) => tool.label).filter(Boolean)))
    .slice(0, 3)
    .join('、')
})
</script>

<template>
  <div v-if="normalizedTools.length" class="tool-panel">
    <div class="tool-panel-head">
      <span class="tool-panel-title">本次调用工具 {{ normalizedTools.length }} 次</span>
      <span v-if="toolLabelSummary" class="tool-panel-subtitle">{{ toolLabelSummary }}</span>
    </div>

    <div class="tool-stack">
      <div v-for="tool in normalizedTools" :key="tool.id" class="tool-card">
        <div class="tool-card-head">
          <div class="tool-card-main">
            <div class="tool-title-row">
              <span class="tool-title">{{ tool.label }}</span>
              <span class="tool-state-chip" :data-tone="tool.tone">{{ tool.stateLabel }}</span>
            </div>
            <p v-if="tool.summary || tool.inputPreview" class="tool-summary">
              {{ tool.summary || tool.inputPreview }}
            </p>
          </div>

          <div class="tool-card-side">
            <span v-if="tool.durationText" class="tool-duration">{{ tool.durationText }}</span>
            <button v-if="tool.hasParams" class="tool-toggle" @click="toggle(tool.id)">
              {{ expanded[tool.id] ? '收起 JSON' : '展开 JSON' }}
            </button>
          </div>
        </div>

        <div v-if="tool.hasParams && expanded[tool.id]" class="tool-section">
          <div class="tool-section-title">调用参数</div>
          <pre class="tool-code">{{ tool.paramText }}</pre>
        </div>

        <div v-if="tool.summary && expanded[tool.id]" class="tool-section">
          <div class="tool-section-title">执行结果</div>
          <p class="tool-section-text">{{ tool.summary }}</p>
        </div>
      </div>
    </div>
  </div>
</template>
