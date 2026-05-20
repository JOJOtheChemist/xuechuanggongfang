<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import ChatPanel from './components/ChatPanel.vue'
import ControlBar from './components/ControlBar.vue'
import PromptComposer from './components/PromptComposer.vue'
import StatusStrip from './components/StatusStrip.vue'
import VolunteerUnlockPanel from './components/VolunteerUnlockPanel.vue'
import { stripEmojis } from './utils/chat-format'

const LOCAL_API_BASE = 'http://127.0.0.1:8001/api/v1'
const LOCAL_API_FALLBACKS = [
  'http://127.0.0.1:8001/api/v1',
  'http://localhost:8001/api/v1',
  'http://127.0.0.1:3001/api/v1',
  'http://localhost:3001/api/v1',
]
const PROD_API_BASE = 'https://xuechuang.xyz/api/v1'
const STORAGE_API_BASE_KEY = 'gaokao-web-api-base'
const STORAGE_TOKEN_KEY = 'gaokao-web-token'
const STORAGE_USER_KEY = 'gaokao-web-user'
const VOLUNTEER_UNLOCK_REQUIRED_INVITE_COUNT = 6
const VOLUNTEER_CUSTOMER_SERVICE_PHONE = '15087599770'

const samplePrompts = [
  '我云南物理类，520分，想学计算机，先帮我按冲稳保筛学校。',
  '我家孩子历史类，485分，想留昆明，师范和汉语言哪个好报？',
  '临床医学和口腔医学到底怎么选？普通家庭更适合哪个？',
  '如果只看就业，云南本地读书和去省外读书怎么选？',
]

function createSessionId(prefix) {
  const stamp = Date.now().toString(36)
  const seed = Math.random().toString(36).slice(2, 8)
  return `${prefix}-${stamp}-${seed}`
}

function createPanel(version, title, agentId, accent) {
  return reactive({
    version,
    title,
    agentId,
    accent,
    sessionId: createSessionId(version.toLowerCase()),
    loading: false,
    error: '',
    lastDurationMs: 0,
    activeMessageId: '',
    skillDebug: {
      activatedSkills: [],
      loadedSkillFiles: [],
      skillPromptChars: 0,
      skillMatchReason: [],
    },
    profileDebugData: {
      sessionId: '',
      fetchedAt: '',
      error: '',
      profileSnapshot: null,
      gaokaoSnapshot: null,
      recentUserMessages: [],
    },
    messages: [
      {
        id: `${version}-welcome`,
        role: 'assistant',
        content: `这里是 ${title} 测试窗口。你可以单独发问，也可以上面“同时发给 V4 / V5”做同题对比。`,
        streaming: false,
      },
    ],
  })
}

function parseSseEventBlock(block) {
  const lines = String(block || '').split(/\r?\n/)
  let eventType = 'message'
  const dataLines = []

  for (const line of lines) {
    if (!line || line.startsWith(':')) continue
    if (line.startsWith('event:')) {
      eventType = line.slice(6).trim() || 'message'
      continue
    }
    if (line.startsWith('data:')) {
      dataLines.push(line.slice(5).replace(/^\s/, ''))
    }
  }

  if (!dataLines.length) return null
  const rawData = dataLines.join('\n')

  try {
    return { type: eventType, data: JSON.parse(rawData) }
  } catch (error) {
    return { type: eventType, data: rawData }
  }
}

function consumeSseBuffer(buffer) {
  const normalized = String(buffer || '').replace(/\r\n/g, '\n')
  const segments = normalized.split('\n\n')
  const rest = segments.pop() || ''
  return {
    rest,
    events: segments.map(parseSseEventBlock).filter(Boolean),
  }
}

const storedApiBase = localStorage.getItem(STORAGE_API_BASE_KEY)?.trim()
const apiBase = ref(storedApiBase || LOCAL_API_BASE)
const draft = ref(samplePrompts[0])
const authToken = ref(localStorage.getItem(STORAGE_TOKEN_KEY) || '')
const currentUser = ref(JSON.parse(localStorage.getItem(STORAGE_USER_KEY) || 'null'))
const loginLoading = ref(false)
const powerLoading = ref(false)
const remainingPower = ref(0)
const globalError = ref('')
const sendingBoth = ref(false)
const unlockStatusLoading = ref(false)
const unlockPaymentLoading = ref(false)
const admissionUnlockStatus = ref({
  inviteCount: 0,
  requiredInviteCount: VOLUNTEER_UNLOCK_REQUIRED_INVITE_COUNT,
  unlocked: false,
  paymentAmount: 19.9,
})

const panels = reactive([
  createPanel('V5', '云南雪峰哥', 'yunnan-gaokao-volunteer-consultant-v5', 'navy'),
])

const isLoggedIn = computed(() => !!authToken.value)
const hasVolunteerUnlock = computed(() => Boolean(admissionUnlockStatus.value?.unlocked))
const currentUserName = computed(() => {
  return currentUser.value?.nickname || currentUser.value?.username || currentUser.value?.userId || '未登录'
})

function persistApiBase() {
  localStorage.setItem(STORAGE_API_BASE_KEY, apiBase.value.trim())
}

function persistAuth(payload) {
  authToken.value = payload.token || ''
  currentUser.value = payload.user || null
  localStorage.setItem(STORAGE_TOKEN_KEY, authToken.value)
  localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(currentUser.value))
}

function clearAuth() {
  authToken.value = ''
  currentUser.value = null
  remainingPower.value = 0
  admissionUnlockStatus.value = {
    inviteCount: 0,
    requiredInviteCount: VOLUNTEER_UNLOCK_REQUIRED_INVITE_COUNT,
    unlocked: false,
    paymentAmount: 19.9,
  }
  localStorage.removeItem(STORAGE_TOKEN_KEY)
  localStorage.removeItem(STORAGE_USER_KEY)
}

function normalizeUnlockStatus(payload = {}) {
  const inviteCount = Math.max(0, Number(payload.inviteCount || payload.invite_count || 0) || 0)
  const requiredInviteCount = Math.max(
    1,
    Number(payload.requiredInviteCount || payload.required_invite_count || VOLUNTEER_UNLOCK_REQUIRED_INVITE_COUNT) ||
      VOLUNTEER_UNLOCK_REQUIRED_INVITE_COUNT,
  )
  const unlocked =
    Boolean(payload.unlocked) ||
    String(payload.unlockMode || payload.unlock_mode || '').trim() === 'paid' ||
    String(payload.unlockMode || payload.unlock_mode || '').trim() === 'invite' ||
    inviteCount >= requiredInviteCount

  return {
    inviteCount,
    requiredInviteCount,
    unlocked,
    paymentAmount: Number(payload.paymentAmount || payload.payment_amount || 19.9) || 19.9,
  }
}

async function request(path, options = {}) {
  const url = `${apiBase.value.replace(/\/+$/, '')}${path}`
  const response = await fetch(url, {
    method: options.method || 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(authToken.value ? { Authorization: `Bearer ${authToken.value}` } : {}),
      ...(options.headers || {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  })

  let payload = {}
  try {
    payload = await response.json()
  } catch (error) {
    payload = {}
  }

  if (!response.ok || payload.ok === false) {
    throw new Error(payload.error || payload.message || `请求失败（${response.status}）`)
  }

  return payload
}

async function tryProbeApiBase(candidate) {
  const base = String(candidate || '').trim().replace(/\/+$/, '')
  if (!base) return false

  try {
    const response = await fetch(`${base}/auth/login/test-gaokao`, {
      method: 'OPTIONS',
      headers: {
        'Access-Control-Request-Method': 'POST',
      },
    })
    return response.ok
  } catch (error) {
    return false
  }
}

async function ensureWorkingApiBase() {
  const candidates = [apiBase.value, ...LOCAL_API_FALLBACKS.filter((item) => item !== apiBase.value)]

  for (const candidate of candidates) {
    if (await tryProbeApiBase(candidate)) {
      apiBase.value = candidate
      persistApiBase()
      return true
    }
  }

  apiBase.value = LOCAL_API_BASE
  persistApiBase()
  return false
}

async function loginTestUser() {
  loginLoading.value = true
  globalError.value = ''

  try {
    await ensureWorkingApiBase()
    const payload = await request('/auth/login/test-gaokao', {
      method: 'POST',
      body: {},
    })
    persistAuth(payload)
    remainingPower.value = Number(payload.user?.computing_power || 0)
    await refreshPower()
  } catch (error) {
    globalError.value = `测试用户自动登录失败：${error.message}`
    clearAuth()
  } finally {
    loginLoading.value = false
  }
}

async function refreshPower() {
  if (!authToken.value) return
  powerLoading.value = true

  try {
    const payload = await request('/chat/credit/status')
    const data = payload.data || payload
    remainingPower.value = Number(data.remaining ?? data.balance ?? 0)
  } catch (error) {
    globalError.value = error.message
  } finally {
    powerLoading.value = false
  }
}

async function refreshVolunteerUnlockStatus() {
  if (!authToken.value) {
    admissionUnlockStatus.value = normalizeUnlockStatus({})
    return
  }

  unlockStatusLoading.value = true
  try {
    const payload = await request('/admission/unlock-status')
    const data = payload.data || payload
    admissionUnlockStatus.value = normalizeUnlockStatus(data)
  } catch (error) {
    globalError.value = error.message
    admissionUnlockStatus.value = normalizeUnlockStatus({})
  } finally {
    unlockStatusLoading.value = false
  }
}

async function copyInviteLink() {
  if (!currentUser.value?.userId) {
    globalError.value = '当前没有可用用户信息，请先登录测试用户。'
    return
  }

  const link = `${window.location.origin}/#/pages/volunteer/index?entry=direct_score&inviter_id=${encodeURIComponent(
    currentUser.value.userId,
  )}&type=business&businessId=admission_unlock&source=volunteer_unlock`

  try {
    await navigator.clipboard.writeText(link)
    globalError.value = '邀请链接已复制，可以发给好友去小程序登录解锁。'
  } catch (error) {
    globalError.value = `复制失败：${error.message}`
  }
}

function showPaymentGuide() {
  unlockPaymentLoading.value = true
  window.setTimeout(() => {
    unlockPaymentLoading.value = false
  }, 240)
  globalError.value = '桌面测试页不直接拉起微信支付，请到小程序“AI高考对话”或“直接查分”页面完成 19.9 元解锁。'
}

async function copyServicePhone() {
  try {
    await navigator.clipboard.writeText(VOLUNTEER_CUSTOMER_SERVICE_PHONE)
    globalError.value = '客服电话已复制。'
  } catch (error) {
    globalError.value = `复制客服电话失败：${error.message}`
  }
}

function pushMessage(panel, role, content, meta = {}) {
  const id = `${panel.version}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
  panel.messages.push({
    id,
    role,
    content: stripEmojis(content),
    streaming: false,
    ...meta,
  })
  return id
}

function beginAssistantStream(panel) {
  const id = `${panel.version}-assistant-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
  panel.activeMessageId = id
  panel.messages.push({
    id,
    role: 'assistant',
    content: '',
    streaming: true,
    toolCalls: 0,
    tools: [],
  })
  return id
}

function patchAssistantMessage(panel, updater) {
  const messageId = panel.activeMessageId || beginAssistantStream(panel)
  panel.messages = panel.messages.map((message) => {
    if (message.id !== messageId) return message
    return updater(message)
  })
}

function updateAssistantStream(panel, content, meta = {}) {
  patchAssistantMessage(panel, (message) => ({
    ...message,
    content: stripEmojis(content),
    ...meta,
  }))
}

function finalizeAssistantStream(panel, content, meta = {}) {
  updateAssistantStream(panel, content, {
    streaming: false,
    ...meta,
  })
}

function upsertStreamingTool(panel, toolPatch) {
  patchAssistantMessage(panel, (message) => {
    const currentTools = Array.isArray(message.tools) ? [...message.tools] : []
    const toolName = String(toolPatch.name || 'tool').trim() || 'tool'
    const explicitId = toolPatch.id ? String(toolPatch.id) : ''
    const toolIndex = currentTools.findIndex((item) => {
      if (explicitId && item.id === explicitId) return true
      return !explicitId && item.name === toolName && !['completed', 'failed', 'error'].includes(String(item.state || ''))
    })

    if (toolIndex >= 0) {
      currentTools[toolIndex] = {
        ...currentTools[toolIndex],
        ...toolPatch,
        id: currentTools[toolIndex].id || explicitId || `${toolName}-${toolIndex}`,
        label: currentTools[toolIndex].label || toolPatch.label || toolName,
      }
    } else {
      currentTools.push({
        id: explicitId || `${toolName}-${currentTools.length}`,
        label: toolPatch.label || toolName,
        ...toolPatch,
      })
    }

    return {
      ...message,
      tools: currentTools,
      toolCalls: currentTools.length,
    }
  })
}

function markLatestToolState(panel, toolName, nextState, extra = {}) {
  patchAssistantMessage(panel, (message) => {
    const currentTools = Array.isArray(message.tools) ? [...message.tools] : []

    for (let index = currentTools.length - 1; index >= 0; index -= 1) {
      const item = currentTools[index]
      if (String(item.name || '').trim() !== String(toolName || '').trim()) continue
      if (['completed', 'failed', 'error'].includes(String(item.state || ''))) continue

      currentTools[index] = {
        ...item,
        state: nextState,
        ...extra,
      }

      return {
        ...message,
        tools: currentTools,
        toolCalls: currentTools.length,
      }
    }

    return message
  })
}

async function sendStreamRequest(panel, question) {
  const url = `${apiBase.value.replace(/\/+$/, '')}/chat`
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
      ...(authToken.value ? { Authorization: `Bearer ${authToken.value}` } : {}),
    },
    body: JSON.stringify({
      message: question,
      agentId: panel.agentId,
      sessionId: panel.sessionId,
    }),
  })

  if (!response.ok || !response.body) {
    let message = `请求失败（${response.status}）`
    try {
      const payload = await response.json()
      message = payload.error || payload.message || message
    } catch (error) {
      // ignore
    }
    throw new Error(message)
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder('utf-8')
  let buffer = ''
  let streamedText = ''
  let completedPayload = null

  beginAssistantStream(panel)

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const parsed = consumeSseBuffer(buffer)
    buffer = parsed.rest

    for (const event of parsed.events) {
      const eventData = event.data && typeof event.data === 'object' ? event.data : {}

      if (eventData.sessionId) {
        panel.sessionId = eventData.sessionId
      }

      if (event.type === 'start') {
        continue
      }

      if (event.type === 'text') {
        streamedText += String(eventData.delta || '')
        updateAssistantStream(panel, streamedText, { streaming: true })
        continue
      }

      if (event.type === 'tool_start') {
        upsertStreamingTool(panel, {
          name: eventData.name,
          label: eventData.name,
          input: eventData.input,
          params: eventData.input,
          hasParams: eventData.input !== undefined && eventData.input !== null,
          summary: '',
          state: 'running',
          durationMs: null,
        })
        continue
      }

      if (event.type === 'tool_end') {
        markLatestToolState(panel, eventData.name, 'completed', {
          durationMs: Number.isFinite(Number(eventData.duration)) ? Number(eventData.duration) : null,
          summary:
            typeof eventData.output === 'string'
              ? eventData.output
              : eventData.output
                ? JSON.stringify(eventData.output)
                : '',
        })
        continue
      }

      if (event.type === 'tool') {
        upsertStreamingTool(panel, {
          name: eventData.name,
          label: eventData.name,
          input: eventData.input,
          params: eventData.input,
          hasParams: eventData.input !== undefined && eventData.input !== null,
          summary:
            typeof eventData.output === 'string'
              ? eventData.output
              : eventData.output
                ? JSON.stringify(eventData.output)
                : '',
          durationMs: Number.isFinite(Number(eventData.duration)) ? Number(eventData.duration) : null,
          state: eventData.state || 'completed',
        })
        continue
      }

      if (event.type === 'complete') {
        completedPayload = eventData
        panel.skillDebug = {
          activatedSkills: Array.isArray(eventData.skillDebug?.activatedSkills) ? eventData.skillDebug.activatedSkills : [],
          loadedSkillFiles: Array.isArray(eventData.skillDebug?.loadedSkillFiles) ? eventData.skillDebug.loadedSkillFiles : [],
          skillPromptChars: Number(eventData.skillDebug?.skillPromptChars) || 0,
          skillMatchReason: Array.isArray(eventData.skillDebug?.skillMatchReason) ? eventData.skillDebug.skillMatchReason : [],
        }
      }

      if (event.type === 'error') {
        panel.skillDebug = {
          ...panel.skillDebug,
          skillMatchReason: [
            ...((Array.isArray(panel.skillDebug?.skillMatchReason) ? panel.skillDebug.skillMatchReason : []).slice(0, 4)),
            `stream_error:${eventData.message || '聊天服务异常'}`,
          ],
        }
        throw new Error(eventData.message || '聊天服务异常')
      }
    }
  }

  buffer += decoder.decode()
  const parsed = consumeSseBuffer(buffer)
  for (const event of parsed.events) {
    const eventData = event.data && typeof event.data === 'object' ? event.data : {}
    if (event.type === 'text') {
      streamedText += String(eventData.delta || '')
      updateAssistantStream(panel, streamedText, { streaming: true })
    } else if (event.type === 'tool_start') {
      upsertStreamingTool(panel, {
        name: eventData.name,
        label: eventData.name,
        input: eventData.input,
        params: eventData.input,
        hasParams: eventData.input !== undefined && eventData.input !== null,
        summary: '',
        state: 'running',
        durationMs: null,
      })
    } else if (event.type === 'tool_end') {
      markLatestToolState(panel, eventData.name, 'completed', {
        durationMs: Number.isFinite(Number(eventData.duration)) ? Number(eventData.duration) : null,
        summary:
          typeof eventData.output === 'string'
            ? eventData.output
            : eventData.output
              ? JSON.stringify(eventData.output)
              : '',
      })
    } else if (event.type === 'tool') {
      upsertStreamingTool(panel, {
        name: eventData.name,
        label: eventData.name,
        input: eventData.input,
        params: eventData.input,
        hasParams: eventData.input !== undefined && eventData.input !== null,
        summary:
          typeof eventData.output === 'string'
            ? eventData.output
            : eventData.output
              ? JSON.stringify(eventData.output)
              : '',
        durationMs: Number.isFinite(Number(eventData.duration)) ? Number(eventData.duration) : null,
        state: eventData.state || 'completed',
      })
    } else if (event.type === 'complete') {
      completedPayload = eventData
      panel.skillDebug = {
        activatedSkills: Array.isArray(eventData.skillDebug?.activatedSkills) ? eventData.skillDebug.activatedSkills : [],
        loadedSkillFiles: Array.isArray(eventData.skillDebug?.loadedSkillFiles) ? eventData.skillDebug.loadedSkillFiles : [],
        skillPromptChars: Number(eventData.skillDebug?.skillPromptChars) || 0,
        skillMatchReason: Array.isArray(eventData.skillDebug?.skillMatchReason) ? eventData.skillDebug.skillMatchReason : [],
      }
    } else if (event.type === 'error') {
      throw new Error(eventData.message || '聊天服务异常')
    }
  }

  if (completedPayload?.agentId) {
    panel.agentId = completedPayload.agentId
  }

  if (completedPayload) {
    finalizeAssistantStream(panel, completedPayload.reply || streamedText || '（空回复）', {
      toolCalls: Array.isArray(completedPayload.toolCalls) ? completedPayload.toolCalls.length : 0,
      tools: Array.isArray(completedPayload.toolCalls) ? completedPayload.toolCalls : [],
    })
    return completedPayload
  }

  if (streamedText) {
    finalizeAssistantStream(panel, streamedText)
    return { reply: streamedText }
  }

  throw new Error('流式回复为空，请稍后再试')
}

async function refreshPanelProfileDebug(panel) {
  if (!authToken.value) return

  try {
    const payload = await request(
      `/chat/agents/${encodeURIComponent(panel.agentId)}/debug-profile?sessionId=${encodeURIComponent(panel.sessionId)}`,
    )
    const data = payload.data || payload
    panel.profileDebugData = {
      sessionId: String(data.sessionId || panel.sessionId || ''),
      fetchedAt: String(data.fetchedAt || ''),
      error: '',
      profileSnapshot: data.profileSnapshot || null,
      gaokaoSnapshot: data.gaokaoSnapshot || null,
      recentUserMessages: Array.isArray(data.recentUserMessages) ? data.recentUserMessages : [],
    }
  } catch (error) {
    panel.profileDebugData = {
      sessionId: panel.sessionId,
      fetchedAt: '',
      error: stripEmojis(error.message || 'profile debug 拉取失败'),
      profileSnapshot: null,
      gaokaoSnapshot: null,
      recentUserMessages: [],
    }
  }
}

async function sendToPanel(panel, prompt) {
  const question = String(prompt || '').trim()
  if (!question) return

  if (!authToken.value) {
    await loginTestUser()
    if (!authToken.value) return
  }

  if (!hasVolunteerUnlock.value) {
    globalError.value = '当前测试账号还没有 AI 高考对话权限，请先邀请好友或在小程序完成付费解锁。'
    return
  }

  panel.loading = true
  panel.error = ''
  pushMessage(panel, 'user', question)
  const startedAt = performance.now()

  try {
    await ensureWorkingApiBase()
    const payload = await sendStreamRequest(panel, question)
    panel.lastDurationMs = Math.round(performance.now() - startedAt)
    if (payload?.sessionId) {
      panel.sessionId = payload.sessionId
    }
    await refreshPanelProfileDebug(panel)
    await refreshPower()
    await refreshVolunteerUnlockStatus()
  } catch (error) {
    panel.error = error.message
    pushMessage(panel, 'system', `请求失败：${error.message}`)
    await refreshPanelProfileDebug(panel)
  } finally {
    panel.loading = false
    panel.activeMessageId = ''
  }
}

async function sendToBoth() {
  const question = String(draft.value || '').trim()
  if (!question || sendingBoth.value) return

  sendingBoth.value = true
  globalError.value = ''
  try {
    await Promise.all(panels.map((panel) => sendToPanel(panel, question)))
  } finally {
    sendingBoth.value = false
  }
}

function resetPanel(panel) {
  panel.sessionId = createSessionId(panel.version.toLowerCase())
  panel.loading = false
  panel.error = ''
  panel.lastDurationMs = 0
  panel.activeMessageId = ''
  panel.skillDebug = {
    activatedSkills: [],
    loadedSkillFiles: [],
    skillPromptChars: 0,
    skillMatchReason: [],
  }
  panel.profileDebugData = {
    sessionId: panel.sessionId,
    fetchedAt: '',
    error: '',
    profileSnapshot: null,
    gaokaoSnapshot: null,
    recentUserMessages: [],
  }
  panel.messages = [
    {
      id: `${panel.version}-welcome-reset`,
      role: 'assistant',
      content: `这里是 ${panel.title} 测试窗口。新会话已经重置，可以重新开始测试。`,
      streaming: false,
    },
  ]
}

function clearAllChats() {
  panels.forEach((panel) => resetPanel(panel))
}

function usePresetApiBase(target) {
  apiBase.value = target
  persistApiBase()
}

function applySamplePrompt(prompt) {
  draft.value = prompt
}

persistApiBase()

onMounted(async () => {
  await ensureWorkingApiBase()

  if (authToken.value) {
    await refreshPower()
    await refreshVolunteerUnlockStatus()
    await Promise.all(panels.map((panel) => refreshPanelProfileDebug(panel)))
    if (remainingPower.value > 0) return
  }

  await loginTestUser()
  if (authToken.value) {
    await refreshVolunteerUnlockStatus()
    await Promise.all(panels.map((panel) => refreshPanelProfileDebug(panel)))
  }
})
</script>

<template>
  <div class="page-shell">
    <section class="hero hero-compact">
      <div class="hero-copy">
        <p class="eyebrow">Desktop Vue Lab</p>
        <h1>云南高考咨询 V4 / V5 对比测试站</h1>
        <p class="hero-text">
          这是独立电脑网站，不走小程序页面。现在改成和小程序一致的流式回复，方便你直接对比 V4 和 V5 的实时输出。
        </p>
      </div>
    </section>

    <StatusStrip
      :is-logged-in="isLoggedIn"
      :current-user-name="currentUserName"
      :remaining-power="remainingPower"
      :power-loading="powerLoading"
    />

    <VolunteerUnlockPanel
      :is-logged-in="isLoggedIn"
      :loading="unlockStatusLoading"
      :payment-loading="unlockPaymentLoading"
      :invite-count="admissionUnlockStatus.inviteCount"
      :required-invite-count="admissionUnlockStatus.requiredInviteCount"
      :unlocked="admissionUnlockStatus.unlocked"
      :user-name="currentUserName"
      :phone="VOLUNTEER_CUSTOMER_SERVICE_PHONE"
      @login="loginTestUser"
      @invite="copyInviteLink"
      @pay="showPaymentGuide"
      @refresh="refreshVolunteerUnlockStatus"
      @contact="copyServicePhone"
    />

    <ControlBar
      v-model:api-base="apiBase"
      :login-loading="loginLoading"
      :power-loading="powerLoading"
      :is-logged-in="isLoggedIn"
      @persist-api-base="persistApiBase"
      @use-local="usePresetApiBase(LOCAL_API_BASE)"
      @use-prod="usePresetApiBase(PROD_API_BASE)"
      @login="loginTestUser"
      @refresh-power="refreshPower"
      @clear-auth="clearAuth"
    />

    <PromptComposer
      :draft="draft"
      :sample-prompts="samplePrompts"
      :sending-both="sendingBoth"
      :left-loading="panels[0].loading"
      :right-loading="panels[1].loading"
      :global-error="globalError"
      :disabled="!isLoggedIn || !hasVolunteerUnlock"
      @update:draft="draft = $event"
      @clear-all="clearAllChats"
      @apply-sample="applySamplePrompt"
      @send-both="sendToBoth"
      @send-left="sendToPanel(panels[0], draft)"
      @send-right="sendToPanel(panels[1], draft)"
    />

    <section class="compare-grid">
      <ChatPanel
        :panel="panels[0]"
        @reset="resetPanel(panels[0])"
        @send="sendToPanel(panels[0], draft)"
      />
      <ChatPanel
        :panel="panels[1]"
        @reset="resetPanel(panels[1])"
        @send="sendToPanel(panels[1], draft)"
      />
    </section>
  </div>
</template>
