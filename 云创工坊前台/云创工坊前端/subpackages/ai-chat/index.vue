<template>
	<ChatPageShell>
		<template #hero>
			<ChatHeroCard
				:assistant-name="assistantName"
				:assistant-role="assistantRole"
				:connection-text="connectionText"
				:agent-id="agentId"
				:session-id="sessionId"
				:ai-power-text="aiPowerText"
				:debug-info="debugInfo"
				:quick-prompts="quickPrompts"
				:quick-action-disabled="isSending || showLoginPrompt || showPowerPrompt"
				@back="goBack"
				@reset="resetSession"
				@copy="copyText"
				@copy-debug="copyDebugInfo"
				@refresh-power="refreshAiPowerBalance"
				@refresh-debug="refreshDebugPanel"
				@quick-select="handleQuickActionSelect"
			/>
		</template>

		<template #prompt>
			<ChatAccessStatePanel
				:prompt-type="chatAccessPromptType"
				:assistant-name="assistantName"
				:remaining="aiPowerRemaining"
				@login="goToLogin"
			/>
		</template>

		<template #messages>
			<ChatMessagePanel
				:assistant-name="assistantName"
				:messages="messages"
				:is-sending="isSending"
				:scroll-into-view-target="scrollIntoViewTarget"
			/>
		</template>

		<template #composer>
			<view class="composer">
				<ChatComposerBar
					:value="draftText"
					:disabled="isComposerDisabled"
					:loading="isSending"
					:placeholder="composerPlaceholder"
					@input="draftText = $event"
					@submit="sendMessage"
				/>
			</view>
		</template>
	</ChatPageShell>
</template>

<script>
import ChatAccessStatePanel from './components/ChatAccessStatePanel.vue'
import ChatComposerBar from './components/ChatComposerBar.vue'
import ChatHeroCard from './components/ChatHeroCard.vue'
import ChatMessagePanel from './components/ChatMessagePanel.vue'
import ChatPageShell from './components/ChatPageShell.vue'
import {
	DEFAULT_AGENT_ID,
	createSessionId,
	normalizeText,
} from './utils/chat-auth.js'
import { getAgentUiConfig } from './utils/agent-ui-config.js'
import { chatPageMethods, createDefaultDebugInfo } from './utils/chat-page-methods.js'

export default {
	name: 'ai-chat-page',
	components: {
		ChatAccessStatePanel,
		ChatComposerBar,
		ChatHeroCard,
		ChatMessagePanel,
		ChatPageShell,
	},
	data() {
		const agentUi = getAgentUiConfig(DEFAULT_AGENT_ID)
		return {
			agentId: DEFAULT_AGENT_ID,
			sessionId: createSessionId(),
			assistantName: agentUi.assistantName,
			assistantRole: agentUi.assistantRole,
			connectionText: '连接中',
			draftText: '',
			messages: [],
			isSending: false,
			scrollIntoViewTarget: 'chat-bottom',
			aiPowerRemaining: 0,
			aiPowerLoading: false,
			chatAccessPromptType: '',
			debugInfo: createDefaultDebugInfo(),
			quickPrompts: agentUi.quickPrompts,
			composerPlaceholderOverride: agentUi.composerPlaceholder
		}
	},
	computed: {
		aiPowerText() {
			if (this.aiPowerLoading) return '--'
			return String(Math.max(0, Math.floor(Number(this.aiPowerRemaining) || 0)))
		},
		showLoginPrompt() {
			return this.chatAccessPromptType === 'login'
		},
		showPowerPrompt() {
			return this.chatAccessPromptType === 'power'
		},
		isComposerDisabled() {
			return this.isSending || this.showLoginPrompt || this.showPowerPrompt
		},
		composerPlaceholder() {
			if (this.showLoginPrompt) return '请先登录后再发送'
			if (this.showPowerPrompt) return '算力不足，先补充后再继续'
			return this.composerPlaceholderOverride || '直接把你现在最想解决的问题发给我'
		}
	},
	onLoad(options = {}) {
		this.agentId = normalizeText(options.agentId || DEFAULT_AGENT_ID, DEFAULT_AGENT_ID)
		this.sessionId = normalizeText(options.sessionId || createSessionId(), createSessionId())
		const agentUi = getAgentUiConfig(this.agentId)
		this.assistantName = agentUi.assistantName
		this.assistantRole = agentUi.assistantRole
		this.quickPrompts = Array.isArray(agentUi.quickPrompts) ? agentUi.quickPrompts : this.quickPrompts
		this.composerPlaceholderOverride = agentUi.composerPlaceholder || this.composerPlaceholderOverride
		this.refreshDebugPanel('onLoad')
		this.bootstrapPage()
	},
	onShow() {
		this.refreshDebugPanel('onShow')
		this.syncAccessState()
	},
	methods: chatPageMethods
}
</script>

<style scoped>
.composer {
	position: fixed;
	left: 24rpx;
	right: 24rpx;
	bottom: calc(24rpx + env(safe-area-inset-bottom, 0px));
	z-index: 20;
	padding-top: 2rpx;
}
</style>
