<script setup>
import ToolCallCard from './ToolCallCard.vue'
import { computed } from 'vue'
import { formatDebugValue, renderChatMarkdown } from '../utils/chat-format'

const props = defineProps({
  panel: {
    type: Object,
    required: true,
  },
})

const emit = defineEmits(['reset', 'send'])
const showDebugPanels = true

const renderedMessages = computed(() => {
  return (Array.isArray(props.panel?.messages) ? props.panel.messages : []).map((message) => ({
    ...message,
    renderedHtml: renderChatMarkdown(message.content || ''),
  }))
})

const skillDebugLines = computed(() => {
  const skillDebug = props.panel?.skillDebug || {}
  return [
    `agentId: ${props.panel?.agentId || '[]'}`,
    `本轮触发 skill: ${Array.isArray(skillDebug.activatedSkills) && skillDebug.activatedSkills.length ? '是' : '否'}`,
    `已触发 skills: ${Array.isArray(skillDebug.activatedSkills) && skillDebug.activatedSkills.length ? skillDebug.activatedSkills.join(', ') : '[]'}`,
    `已加载 skill 文件: ${Array.isArray(skillDebug.loadedSkillFiles) && skillDebug.loadedSkillFiles.length ? skillDebug.loadedSkillFiles.join(' | ') : '[]'}`,
    `skill 注入字符数: ${Number(skillDebug.skillPromptChars) || 0}`,
    `skill 触发原因: ${Array.isArray(skillDebug.skillMatchReason) && skillDebug.skillMatchReason.length ? skillDebug.skillMatchReason.join(', ') : '[]'}`,
  ]
})

const profileDebugLines = computed(() => {
  const data = props.panel?.profileDebugData || {}
  const profileSnapshot = data.profileSnapshot || {}
  const gaokaoSnapshot = data.gaokaoSnapshot || {}
  const gaokaoProfile = gaokaoSnapshot.gaokaoProfile || {}
  const consultationProgress = gaokaoSnapshot.consultationProgress || {}
  const userProfile = profileSnapshot.userProfile || profileSnapshot.profile || {}
  const intelligence = profileSnapshot.intelligence || {}
  const recentQuestionSummaries = Array.isArray(gaokaoSnapshot.recentQuestionSummaries)
    ? gaokaoSnapshot.recentQuestionSummaries.map((item) => ({
        id: item?.id,
        sessionId: item?.sessionId,
        currentStage: item?.currentStage,
        questionSummary: item?.sourceMessageSummary || item?.questionSummary || '',
        concerns: Array.isArray(item?.concerns) ? item.concerns : [],
      }))
    : []
  const recentUserMessages = Array.isArray(data.recentUserMessages) ? data.recentUserMessages : []

  return [
    `sessionId: ${data.sessionId || props.panel?.sessionId || '[]'}`,
    `最近刷新: ${data.fetchedAt || '[]'}`,
    `debugError: ${data.error || '[]'}`,
    `分数: ${formatDebugValue(gaokaoProfile.score ?? userProfile.score)}`,
    `位次: ${formatDebugValue(gaokaoProfile.rank ?? gaokaoSnapshot.position ?? userProfile.rank)}`,
    `科类/模式: ${formatDebugValue(gaokaoProfile.subjectMode ?? gaokaoProfile.examType ?? userProfile.subjectMode)}`,
    `选科: ${formatDebugValue(gaokaoProfile.selectedSubjects ?? userProfile.selectedSubjects)}`,
    `专业偏好: ${formatDebugValue(gaokaoProfile.majorPreferences ?? userProfile.majorPreferences)}`,
    `专业避坑: ${formatDebugValue(gaokaoProfile.majorAvoidances)}`,
    `城市偏好: ${formatDebugValue(gaokaoProfile.preferredCities ?? userProfile.preferredCities)}`,
    `省份偏好: ${formatDebugValue(gaokaoProfile.preferredProvinces)}`,
    `省内优先: ${formatDebugValue(gaokaoProfile.inProvincePriority)}`,
    `学校层次: ${formatDebugValue(gaokaoProfile.targetSchoolLevels)}`,
    `公办民办偏好: ${formatDebugValue(gaokaoProfile.ownershipPreference)}`,
    `风险偏好: ${formatDebugValue(gaokaoProfile.riskPreference)}`,
    `就业/升学目标: ${formatDebugValue(gaokaoProfile.careerGoals)}`,
    `预算备注: ${formatDebugValue(gaokaoProfile.budgetNote)}`,
    `家庭约束: ${formatDebugValue(gaokaoProfile.familyConstraints)}`,
    `距离偏好: ${formatDebugValue(gaokaoProfile.distancePreference)}`,
    `必须避开: ${formatDebugValue(gaokaoProfile.mustAvoidFactors)}`,
    `当前阶段: ${formatDebugValue(consultationProgress.currentStage ?? intelligence.currentStage)}`,
    `主要顾虑: ${formatDebugValue(consultationProgress.mainConcerns ?? gaokaoSnapshot.mainConcerns ?? intelligence.mainConcerns)}`,
    `待补字段: ${formatDebugValue(gaokaoSnapshot.missingKeyFields ?? intelligence.missingKeyFields)}`,
    `推荐下一问: ${formatDebugValue(gaokaoSnapshot.recommendedNextQuestion ?? intelligence.recommendedNextQuestion)}`,
    `最近问题摘要: ${formatDebugValue(recentQuestionSummaries ?? intelligence.recentQuestionSummaries)}`,
    `会话用户原话: ${formatDebugValue(recentUserMessages.map((item) => item.content).filter(Boolean))}`,
    `用户结构化画像: ${formatDebugValue(profileSnapshot)}`,
    `高考结构化状态: ${formatDebugValue(gaokaoSnapshot)}`,
  ]
})
</script>

<template>
  <article class="chat-panel" :data-accent="panel.accent">
    <header class="panel-head">
      <div>
        <p class="panel-version">{{ panel.version }}</p>
        <h3>{{ panel.title }}</h3>
        <p class="panel-meta">{{ panel.agentId }}</p>
        <p class="panel-meta">session: {{ panel.sessionId }}</p>
      </div>
      <div class="panel-actions">
        <span class="panel-latency" v-if="panel.lastDurationMs">{{ panel.lastDurationMs }} ms</span>
        <button class="ghost" @click="emit('reset')">重置会话</button>
      </div>
    </header>

    <div class="message-list">
      <div
        v-for="message in renderedMessages"
        :key="message.id"
        class="message-row"
        :data-role="message.role"
      >
        <div class="message-bubble">
          <div class="message-role">
            {{ message.role === 'user' ? '你' : message.role === 'assistant' ? panel.title : '系统' }}
          </div>
          <div class="message-markdown" v-html="message.renderedHtml || '<p></p>'"></div>
          <div v-if="message.streaming" class="stream-tag">生成中...</div>
          <div v-if="typeof message.toolCalls === 'number'" class="tool-call-note">
            工具调用数：{{ message.toolCalls }}
          </div>
          <ToolCallCard v-if="Array.isArray(message.tools) && message.tools.length" :tools="message.tools" />
        </div>
      </div>
    </div>

    <div v-if="showDebugPanels" class="debug-stack">
      <details class="debug-card">
        <summary>Debug</summary>
        <div class="debug-body">
          <p v-for="line in skillDebugLines" :key="line" class="debug-line">{{ line }}</p>
        </div>
      </details>

      <details class="debug-card">
        <summary>用户画像 Debug</summary>
        <div class="debug-body">
          <p v-for="line in profileDebugLines" :key="line" class="debug-line">{{ line }}</p>
        </div>
      </details>
    </div>

    <div class="panel-footer">
      <button class="ghost" :disabled="panel.loading" @click="emit('send')">
        {{ panel.loading ? '发送中...' : `继续发给 ${panel.version}` }}
      </button>
      <p v-if="panel.error" class="error-text">{{ panel.error }}</p>
    </div>
  </article>
</template>
