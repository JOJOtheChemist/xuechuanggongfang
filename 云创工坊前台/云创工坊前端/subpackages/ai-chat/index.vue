<template>
	<ChatPageShell>
		<template #hero>
			<ChatHeroCard
				:display-mode="visualMode"
				:assistant-name="assistantName"
				:assistant-role="assistantRole"
				:assistant-avatar-url="assistantAvatarUrl"
				:connection-text="connectionText"
				:agent-id="agentId"
				:session-id="sessionId"
				:ai-power-text="aiPowerText"
				:debug-info="debugInfo"
				:quick-prompts="quickPrompts"
				:quick-action-disabled="isSending || showLoginPrompt || showPowerPrompt"
				:top-image-url="resolvedVisualTopImageUrl"
				@back="goBack"
				@reset="resetSession"
				@copy="copyText"
				@copy-debug="copyDebugInfo"
				@refresh-power="refreshAiPowerBalance"
				@refresh-debug="refreshDebugPanel"
				@quick-select="handleQuickActionSelect"
			/>
		</template>

		<template #intro-visual>
			<ChatIntroVisualPanel
				v-if="showVisualIntro"
				class="chat-intro-visual-wrap"
				:class="{ 'chat-intro-visual-wrap-gaokao': visualMode === 'gaokao' }"
				:display-mode="visualMode"
				:section-image-urls="resolvedVisualIntroSectionImageUrls"
				:topics="visualIntroTopics"
				:active-topic-key="activeVisualTopicKey"
				:guess-prompts="resolvedVisualGuessPrompts"
				:suggestion-prompts="resolvedVisualSuggestionPrompts"
				:topic-disabled="isSending || showLoginPrompt || showPowerPrompt"
				:prompt-disabled="isSending || showLoginPrompt || showPowerPrompt"
				:show-guess-refresh="canRotateVisualGuessPrompts"
				:guess-refresh-disabled="isSending || showLoginPrompt || showPowerPrompt"
				:guess-prompt-render-key="visualGuessPromptBatchRenderKey"
				@select-topic="handleIntroTopicSelect"
				@select-prompt="handleIntroPromptSelect"
				@refresh-guess="handleGuessPromptRefresh"
			/>
		</template>

		<template #prompt>
			<ChatAccessStatePanel
				:prompt-type="chatAccessPromptType"
				:assistant-name="assistantName"
				:remaining="aiPowerRemaining"
				:display-mode="visualMode"
				@login="goToLogin"
			/>
		</template>

		<template #messages>
			<ChatMessagePanel
				v-if="shouldRenderMessagePanel"
				:display-mode="visualMode"
				:assistant-name="assistantName"
				:assistant-avatar-url="assistantAvatarUrl"
				:current-user-name="currentUserName"
				:current-user-avatar-url="currentUserAvatarUrl"
				:messages="messages"
				:is-sending="isSending"
				:scroll-into-view-target="scrollIntoViewTarget"
				@membership-action="handleMembershipCardAction"
				@school-card-tap="handleSchoolCardTap"
				@choice-select="handleChoiceCardSelect"
			/>
		</template>

		<template #composer>
			<view class="composer" :class="{ 'composer-gaokao': visualMode === 'gaokao' }">
				<ChatComposerBar
					:value="draftText"
					:display-mode="visualMode"
					:disabled="isComposerDisabled"
					:loading="isSending"
					:placeholder="composerPlaceholder"
					:background-image-url="resolvedComposerBackgroundImageUrl"
					:send-button-image-url="resolvedComposerSendButtonImageUrl"
					@input="draftText = $event"
					@submit="sendMessage"
				/>
				<text v-if="!resolvedComposerBackgroundImageUrl" class="composer-ai-note">以上内容由 AI 生成，仅供参考</text>
			</view>
		</template>
	</ChatPageShell>
</template>

<script>
import ChatAccessStatePanel from './components/ChatAccessStatePanel.vue'
import ChatComposerBar from './components/ChatComposerBar.vue'
import ChatHeroCard from './components/ChatHeroCard.vue'
import ChatIntroVisualPanel from './components/ChatIntroVisualPanel.vue'
import ChatMessagePanel from './components/ChatMessagePanel.vue'
import ChatPageShell from './components/ChatPageShell.vue'
import { getCachedImageSync, resolveCachedImages } from '@/utils/remote-image-cache'
import {
	DEFAULT_AGENT_ID,
	createSessionId,
	extractDisplayUserInfo,
	normalizeText,
} from './utils/chat-auth.js'
import { getAgentUiConfig } from './utils/agent-ui-config.js'
import { getAiChatVisualConfig } from './utils/ai-chat-visual-config.js'
import { chatPageMethods, createDefaultDebugInfo } from './utils/chat-page-methods.js'
import {
	VISUAL_INTRO_SECTION_KEYS,
	createVisualPromptBatches,
	getCachedVisualIntroSectionImageUrls,
	normalizeVisualIntroSectionImageUrls,
	resolveDefaultTopicKey,
	resolveVisualImageUrl,
	resolveVisualIntroSectionImageUrls
} from './utils/visual-mode-helpers.js'

export default {
	name: 'ai-chat-page',
	components: {
		ChatAccessStatePanel,
		ChatComposerBar,
		ChatHeroCard,
		ChatIntroVisualPanel,
		ChatMessagePanel,
		ChatPageShell,
	},
	data() {
		const agentUi = getAgentUiConfig(DEFAULT_AGENT_ID)
		const visualConfig = getAiChatVisualConfig(DEFAULT_AGENT_ID)
		const currentUser = extractDisplayUserInfo()
		return {
			agentId: DEFAULT_AGENT_ID,
			sessionId: createSessionId(),
			assistantName: agentUi.assistantName,
			assistantRole: agentUi.assistantRole,
			assistantAvatarUrl: agentUi.assistantAvatarUrl || '',
			currentUserName: currentUser.nickname || '我',
			currentUserAvatarUrl: currentUser.avatar || '',
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
			visualIntroTopics: Array.isArray(agentUi.introTopics) ? agentUi.introTopics : [],
			activeVisualTopicKey: resolveDefaultTopicKey(agentUi.introTopics),
			visualGuessPrompts: Array.isArray(agentUi.introQuickPrompts) ? agentUi.introQuickPrompts : [],
			visualGuessPromptBatchIndex: 0,
			visualSuggestionPrompts: Array.isArray(agentUi.introSuggestionPrompts) ? agentUi.introSuggestionPrompts : [],
			composerPlaceholderOverride: '',
			visualMode: visualConfig.mode,
			visualTopImageUrl: visualConfig.topImageUrl,
			visualIntroSectionImageUrls: normalizeVisualIntroSectionImageUrls(visualConfig.introSectionImageUrls),
			visualComposerBackgroundImageUrl: visualConfig.composerBackgroundImageUrl || '',
			visualComposerSendButtonImageUrl: visualConfig.composerSendButtonImageUrl || '',
			cachedVisualTopImageUrl: getCachedImageSync(visualConfig.topImageUrl),
			cachedVisualIntroSectionImageUrls: getCachedVisualIntroSectionImageUrls(visualConfig.introSectionImageUrls),
			cachedVisualComposerBackgroundImageUrl: getCachedImageSync(visualConfig.composerBackgroundImageUrl),
			cachedVisualComposerSendButtonImageUrl: getCachedImageSync(visualConfig.composerSendButtonImageUrl),
			hideWelcomeMessage: visualConfig.hideWelcomeMessage
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
		hasUserSentMessage() {
			return this.messages.some((message) => message && message.role === 'user')
		},
		hasVisualIntroImages() {
			const images = this.resolvedVisualIntroSectionImageUrls
			return VISUAL_INTRO_SECTION_KEYS.some((key) => !!String(images[key] || '').trim())
		},
		showVisualIntro() {
			return (this.visualMode === 'xiaochunlu' || this.visualMode === 'gaokao')
				&& !this.hasUserSentMessage
				&& this.hasVisualIntroImages
		},
		resolvedVisualTopImageUrl() {
			return resolveVisualImageUrl(this.visualTopImageUrl, this.cachedVisualTopImageUrl)
		},
		resolvedVisualIntroSectionImageUrls() {
			return resolveVisualIntroSectionImageUrls(
				this.visualIntroSectionImageUrls,
				this.cachedVisualIntroSectionImageUrls
			)
		},
		resolvedComposerBackgroundImageUrl() {
			return resolveVisualImageUrl(
				this.visualComposerBackgroundImageUrl,
				this.cachedVisualComposerBackgroundImageUrl
			)
		},
		resolvedComposerSendButtonImageUrl() {
			return resolveVisualImageUrl(
				this.visualComposerSendButtonImageUrl,
				this.cachedVisualComposerSendButtonImageUrl
			)
		},
		activeVisualTopic() {
			return this.visualIntroTopics.find((item) => item && item.topicKey === this.activeVisualTopicKey) || null
		},
		resolvedVisualGuessPromptPool() {
			const prompts = this.activeVisualTopic && Array.isArray(this.activeVisualTopic.guessPrompts)
				? this.activeVisualTopic.guessPrompts
				: this.visualGuessPrompts
			return Array.isArray(prompts) ? prompts.slice(0, 18) : []
		},
		resolvedVisualGuessPromptBatches() {
			return createVisualPromptBatches(this.resolvedVisualGuessPromptPool)
		},
		canRotateVisualGuessPrompts() {
			return this.resolvedVisualGuessPromptBatches.length > 1
		},
		resolvedVisualGuessPrompts() {
			const batches = this.resolvedVisualGuessPromptBatches
			if (!batches.length) return []
			const nextIndex = this.visualGuessPromptBatchIndex % batches.length
			return batches[nextIndex] || batches[0] || []
		},
		visualGuessPromptBatchRenderKey() {
			return `${this.activeVisualTopicKey || 'default'}-${this.visualGuessPromptBatchIndex}`
		},
		resolvedVisualSuggestionPrompts() {
			const prompts = this.activeVisualTopic && Array.isArray(this.activeVisualTopic.suggestionPrompts)
				? this.activeVisualTopic.suggestionPrompts
				: this.visualSuggestionPrompts
			return Array.isArray(prompts) ? prompts.slice(0, 4) : []
		},
		isXiaochunluAgent() {
			const normalizedAgentId = normalizeText(this.agentId, '')
			return (
				normalizedAgentId === 'xiaochunlu-ai-v2' ||
				normalizedAgentId === 'xiaochunlu-campus-startup-mentor' ||
				this.visualMode === 'xiaochunlu' ||
				normalizeText(this.assistantName, '') === '小春鹿'
			)
		},
		shouldRenderMessagePanel() {
			if (!this.messages.length && !this.isSending) return false
			if ((this.visualMode === 'xiaochunlu' || this.visualMode === 'gaokao') && !this.hasUserSentMessage && !this.isSending) {
				return false
			}
			return true
		},
		composerPlaceholder() {
			if (this.showLoginPrompt) return '请先登录后再发送'
			if (this.showPowerPrompt) return '算力不足，先补充后再继续'
			const placeholder = normalizeText(this.composerPlaceholderOverride, '')
			if (this.isXiaochunluAgent && /(分数|位次|科类|城市|专业方向)/.test(placeholder)) {
				return '问我文章、业务或 19.9 校园大使'
			}
			return placeholder || '直接把你现在最想解决的问题发给我'
		}
	},
	onLoad(options = {}) {
		this.agentId = normalizeText(options.agentId || DEFAULT_AGENT_ID, DEFAULT_AGENT_ID)
		this.sessionId = normalizeText(options.sessionId || createSessionId(), createSessionId())
		const agentUi = getAgentUiConfig(this.agentId)
		const visualConfig = getAiChatVisualConfig(this.agentId)
		this.assistantName = agentUi.assistantName
		this.assistantRole = agentUi.assistantRole
		this.assistantAvatarUrl = agentUi.assistantAvatarUrl || ''
		this.quickPrompts = Array.isArray(agentUi.quickPrompts) ? agentUi.quickPrompts : this.quickPrompts
		this.visualIntroTopics = Array.isArray(agentUi.introTopics) ? agentUi.introTopics : []
		this.activeVisualTopicKey = resolveDefaultTopicKey(this.visualIntroTopics)
		this.visualGuessPrompts = Array.isArray(agentUi.introQuickPrompts) ? agentUi.introQuickPrompts : []
		this.visualGuessPromptBatchIndex = 0
		this.visualSuggestionPrompts = Array.isArray(agentUi.introSuggestionPrompts) ? agentUi.introSuggestionPrompts : []
		this.composerPlaceholderOverride = agentUi.composerPlaceholder || this.composerPlaceholderOverride
		this.visualMode = visualConfig.mode
		this.visualTopImageUrl = visualConfig.topImageUrl
		this.visualIntroSectionImageUrls = normalizeVisualIntroSectionImageUrls(visualConfig.introSectionImageUrls)
		this.visualComposerBackgroundImageUrl = visualConfig.composerBackgroundImageUrl || ''
		this.visualComposerSendButtonImageUrl = visualConfig.composerSendButtonImageUrl || ''
		this.cachedVisualTopImageUrl = getCachedImageSync(this.visualTopImageUrl)
		this.cachedVisualIntroSectionImageUrls = getCachedVisualIntroSectionImageUrls(this.visualIntroSectionImageUrls)
		this.cachedVisualComposerBackgroundImageUrl = getCachedImageSync(this.visualComposerBackgroundImageUrl)
		this.cachedVisualComposerSendButtonImageUrl = getCachedImageSync(this.visualComposerSendButtonImageUrl)
		this.hideWelcomeMessage = visualConfig.hideWelcomeMessage
		this.syncVisualImages()
		this.refreshDebugPanel('onLoad')
		this.bootstrapPage()
	},
	onShow() {
		this.refreshDebugPanel('onShow')
		this.syncAccessState()
	},
	methods: {
		...chatPageMethods,
		handleIntroTopicSelect(item) {
			const topicKey = normalizeText(item && item.topicKey, '')
			if (topicKey) {
				this.activeVisualTopicKey = topicKey
				this.visualGuessPromptBatchIndex = 0
			}
		},
		handleGuessPromptRefresh() {
			const batches = this.resolvedVisualGuessPromptBatches
			if (batches.length <= 1) return
			this.visualGuessPromptBatchIndex = (this.visualGuessPromptBatchIndex + 1) % batches.length
		},
		handleIntroPromptSelect(item) {
			const prompt = normalizeText(item && item.action, '')
			if (!prompt) return
			this.sendMessage(prompt)
		},
		async syncVisualImages() {
			const topSource = String(this.visualTopImageUrl || '').trim()
			const introSources = VISUAL_INTRO_SECTION_KEYS
				.map((key) => String((this.visualIntroSectionImageUrls && this.visualIntroSectionImageUrls[key]) || '').trim())
				.filter(Boolean)
			const composerSources = [
				String(this.visualComposerBackgroundImageUrl || '').trim(),
				String(this.visualComposerSendButtonImageUrl || '').trim()
			].filter(Boolean)
			const sources = [topSource, ...introSources, ...composerSources].filter(Boolean)
			if (!sources.length) return

			try {
				const cachedUrls = await resolveCachedImages(sources)
				let cacheIndex = 0
				if (topSource) {
					this.cachedVisualTopImageUrl = cachedUrls[cacheIndex] || topSource
					cacheIndex += 1
				}
				this.cachedVisualIntroSectionImageUrls = VISUAL_INTRO_SECTION_KEYS.reduce((result, key) => {
					const source = String((this.visualIntroSectionImageUrls && this.visualIntroSectionImageUrls[key]) || '').trim()
					result[key] = source ? cachedUrls[cacheIndex++] || source : ''
					return result
				}, {})
				if (this.visualComposerBackgroundImageUrl) {
					this.cachedVisualComposerBackgroundImageUrl =
						cachedUrls[cacheIndex++] || this.visualComposerBackgroundImageUrl
				}
				if (this.visualComposerSendButtonImageUrl) {
					this.cachedVisualComposerSendButtonImageUrl =
						cachedUrls[cacheIndex++] || this.visualComposerSendButtonImageUrl
				}
			} catch (error) {
				console.warn('[ai-chat] 视觉图片缓存失败', error)
			}
		}
	}
}
</script>

<style scoped>
.chat-intro-visual-wrap {
	position: relative;
	margin-top: -24rpx;
	z-index: 3;
}

.chat-intro-visual-wrap-gaokao {
	margin-top: 0;
}

.composer {
	position: fixed;
	left: 24rpx;
	right: 24rpx;
	bottom: calc(24rpx + env(safe-area-inset-bottom, 0px));
	z-index: 20;
	padding-top: 2rpx;
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 12rpx;
}

.composer-gaokao {
	left: 0;
	right: 0;
	bottom: 0;
	padding-top: 0;
	gap: 0;
}

.composer-ai-note {
	font-size: 22rpx;
	line-height: 1.4;
	color: rgba(57, 77, 124, 0.58);
	text-align: center;
}
</style>
