<script setup>
import { computed, ref } from 'vue'
import { renderChatMarkdown } from '../utils/chat-format'

const props = defineProps({
  tools: {
    type: Array,
    default: () => [],
  },
})

const expandedToolIds = ref({})

function stringifyParams(value) {
  if (value === null || value === undefined) return ''
  if (typeof value === 'string') return value.trim()
  try {
    return JSON.stringify(value, null, 2)
  } catch (error) {
    return String(value)
  }
}

function stringifyOutput(value) {
  if (value === null || value === undefined) return ''
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) return ''
    if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
      try {
        return JSON.stringify(JSON.parse(trimmed), null, 2)
      } catch (error) {
        return trimmed
      }
    }
    return trimmed
  }
  try {
    return JSON.stringify(value, null, 2)
  } catch (error) {
    return String(value)
  }
}

function compactText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim()
}

function parseJsonLikeToolPayload(value) {
  if (typeof value !== 'string') return null
  const text = String(value || '').trim()
  if (!text) return null
  if ((text.startsWith('{') && text.endsWith('}')) || (text.startsWith('[') && text.endsWith(']'))) {
    try {
      return JSON.parse(text)
    } catch (error) {
      return null
    }
  }
  return null
}

function resolveWebResearchLoadingText(tool = {}) {
  const normalizedName = compactText(tool?.name).toLowerCase()
  const normalizedLabel = compactText(tool?.label).toLowerCase()
  const isWebSearch =
    normalizedName === 'web_search' ||
    normalizedLabel === 'web research summary' ||
    normalizedLabel === '网页研究总结'
  const isWebFetch =
    normalizedName === 'web_fetch' ||
    normalizedLabel === '网页正文抓取'

  if (isWebSearch) return '正在搜索'
  if (isWebFetch) return '正在抓取网页正文'
  return '正在调用网页工具'
}

function extractTextCandidate(value) {
  if (value === null || value === undefined) return ''
  if (typeof value === 'string') return String(value).trim()
  if (typeof value === 'object') {
    const parsed = value
    return String(
      parsed.summary ||
      parsed.content ||
      parsed.body ||
      parsed.text ||
      parsed.message ||
      '',
    ).trim()
  }
  return String(value || '').trim()
}

function resolveWebResearchSummaryText(tool = {}) {
  const candidates = [
    tool.summary,
    tool.output,
    tool.rawOutput,
  ]

  for (const candidate of candidates) {
    const text = extractTextCandidate(candidate)
    if (text) return text
  }

  const outputText = stringifyOutput(
    Object.prototype.hasOwnProperty.call(tool, 'rawOutput')
      ? tool.rawOutput
      : tool.output,
  )
  const parsed = parseJsonLikeToolPayload(outputText)
  if (parsed && typeof parsed === 'object') {
    return extractTextCandidate(parsed)
  }

  return ''
}

function resolveToolOutputText(tool = {}) {
  return stringifyOutput(
    Object.prototype.hasOwnProperty.call(tool, 'rawOutput')
      ? tool.rawOutput
      : tool.output,
  )
}

function extractSafeWebResearchText(value) {
  const text = compactText(value)
  if (!text) return ''

  const parsed = parseJsonLikeToolPayload(text)
  if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
    return compactText(
      parsed.summary ||
      parsed.content ||
      parsed.body ||
      parsed.text ||
      parsed.message ||
      ''
    )
  }

  if (
    /^\s*\{/.test(text) ||
    /^\s*"?\s*(query|url|link|href|keyword|keywords|search)\s*"?\s*:/i.test(text)
  ) {
    return ''
  }

  return text
}

function extractWebResearchPreviewText(tool = {}, fallback = '') {
  const normalizedName = compactText(tool?.name).toLowerCase()
  const normalizedLabel = compactText(tool?.label).toLowerCase()
  const isWebSearch =
    normalizedName === 'web_search' ||
    normalizedLabel === 'web research summary' ||
    normalizedLabel === '网页研究总结'
  const isWebFetch =
    normalizedName === 'web_fetch' ||
    normalizedLabel === '网页正文抓取'

  if (!isWebSearch && !isWebFetch) return compactText(fallback)

  return extractSafeWebResearchText(fallback) || resolveWebResearchLoadingText(tool)
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

function shouldHideStateChip(tool) {
  const name = String(tool?.name || '').trim().toLowerCase()
  const label = String(tool?.label || '').trim()
  return name === 'web_search' || label === 'Web Research Summary'
}

function resolveToolVariant(tool = {}) {
  const normalizedName = compactText(tool?.name).toLowerCase()
  const normalizedLabel = compactText(tool?.label).toLowerCase()
  if (
    normalizedName === 'web_search' ||
    normalizedLabel === 'web search' ||
    normalizedLabel === 'web research summary' ||
    normalizedLabel === '网页研究总结'
  ) {
    return 'web-search'
  }
  if (normalizedName === 'web_fetch' || normalizedLabel === '网页正文抓取') {
    return 'web-fetch'
  }
  return ''
}

function buildPreviewText(text, maxLength = 120) {
  const normalized = compactText(text)
  if (!normalized) return ''
  if (normalized.length <= maxLength) return normalized
  return `${normalized.slice(0, maxLength).trim()}...`
}

function shouldShowRawOutput(toolVariant = '', outputText = '', summaryText = '') {
  const normalizedOutput = compactText(outputText)
  if (!normalizedOutput) return false

  if (toolVariant !== 'web-search' && toolVariant !== 'web-fetch') {
    return normalizedOutput !== compactText(summaryText)
  }

  if (!/^[\[{]/.test(normalizedOutput)) {
    return normalizedOutput !== compactText(summaryText)
  }

  return true
}

function shouldDefaultExpandTool(tool = {}) {
  const toolVariant = resolveToolVariant(tool)
  return toolVariant === 'web-search' || toolVariant === 'web-fetch'
}

function isExpanded(toolId) {
  const id = String(toolId)
  if (Object.prototype.hasOwnProperty.call(expandedToolIds.value, id)) {
    return Boolean(expandedToolIds.value[id])
  }
  const tool = normalizedTools.value.find((item) => String(item.id) === id)
  return shouldDefaultExpandTool(tool)
}

function toggleExpanded(toolId) {
  const id = String(toolId)
  const nextExpanded = !isExpanded(id)
  expandedToolIds.value = {
    ...expandedToolIds.value,
    [id]: nextExpanded,
  }
}

const normalizedTools = computed(() => {
  return (Array.isArray(props.tools) ? props.tools : [])
    .filter(Boolean)
    .map((tool, index) => {
      const id = String(tool.id || `${tool.name || 'tool'}-${index}`)
      const params = Object.prototype.hasOwnProperty.call(tool, 'params') ? tool.params : tool.input
      const paramText = stringifyParams(params)
      const toolVariant = resolveToolVariant(tool)
      const rawInputPreview = compactText(tool.input || paramText).slice(0, 120)
      const richSummaryText = toolVariant === 'web-search' || toolVariant === 'web-fetch'
        ? resolveWebResearchSummaryText(tool)
        : ''
      const summaryText = String(tool.summary || '').trim()
      const summaryHtml = toolVariant === 'web-search' || toolVariant === 'web-fetch'
        ? renderChatMarkdown(richSummaryText)
        : ''
      const outputText = resolveToolOutputText(tool)
      const summaryPreview = toolVariant === 'web-search' || toolVariant === 'web-fetch'
        ? buildPreviewText(richSummaryText || summaryText || rawInputPreview)
        : summaryText
      const inputPreview = (toolVariant === 'web-search' || toolVariant === 'web-fetch')
        ? extractWebResearchPreviewText(tool, rawInputPreview).slice(0, 120)
        : rawInputPreview
      const showRawOutput = shouldShowRawOutput(toolVariant, outputText, richSummaryText || summaryText)
      const canExpand = Boolean(summaryHtml) || showRawOutput
      const durationMs = Number(tool.durationMs)
      return {
        ...tool,
        id,
        label: String(tool.label || tool.name || '工具').trim(),
        inputPreview,
        summary: summaryText,
        summaryPreview,
        summaryHtml,
        outputText,
        showRawOutput,
        hasParams: typeof tool.hasParams === 'boolean' ? tool.hasParams : hasParams(params),
        paramText,
        canExpand,
        durationText: Number.isFinite(durationMs) && durationMs >= 0 ? `${durationMs}ms` : '',
        tone: resolveStateTone(tool.state),
        stateLabel: resolveStateLabel(tool.state),
        showStateChip: !shouldHideStateChip(tool),
      }
    })
    .filter((tool) => tool.label || tool.summary || tool.inputPreview || tool.outputText || tool.hasParams)
})

</script>

<template>
  <div v-if="normalizedTools.length" class="tool-panel">
    <div class="tool-stack">
      <div v-for="tool in normalizedTools" :key="tool.id" class="tool-card">
        <div class="tool-card-head">
          <div class="tool-card-main">
            <div class="tool-title-row">
              <span class="tool-title">{{ tool.label }}</span>
              <span v-if="tool.showStateChip" class="tool-state-chip" :data-tone="tool.tone">{{ tool.stateLabel }}</span>
            </div>
            <p
              v-if="tool.summaryPreview || tool.inputPreview"
              class="tool-summary"
              :class="{ 'tool-summary-preview': tool.canExpand }"
            >
              {{ tool.summaryPreview || tool.inputPreview }}
            </p>
          </div>

          <div class="tool-card-side">
            <span v-if="tool.durationText" class="tool-duration">{{ tool.durationText }}</span>
          </div>
        </div>
        <div v-if="tool.canExpand" class="tool-details">
          <button type="button" class="tool-toggle" @click="toggleExpanded(tool.id)">
            {{ isExpanded(tool.id)
              ? (tool.label === '网页研究总结' ? '收起研究总结' : '收起完整内容')
              : (tool.label === '网页研究总结' ? '查看完整研究总结' : '查看完整内容') }}
          </button>
          <div v-if="isExpanded(tool.id)" class="tool-expand-body">
            <div v-if="tool.summaryHtml" class="tool-section">
              <div class="tool-section-title">{{ tool.label === '网页研究总结' ? '完整研究总结' : '完整内容' }}</div>
              <div class="message-markdown tool-section-markdown" v-html="tool.summaryHtml"></div>
            </div>
            <div v-if="tool.showRawOutput" class="tool-section">
              <div class="tool-section-title">工具原始返回</div>
              <pre class="tool-code">{{ tool.outputText }}</pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
