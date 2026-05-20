<template>
	<view class="chat-page-root">
		<ChatPageShell :bottom-reserve-rpx="shellBottomReserveRpx">
			<template #hero>
			<ChatHeroCard
				:display-mode="visualMode"
				:assistant-name="displayAssistantName"
				:assistant-role="assistantRole"
				:assistant-avatar-url="assistantAvatarUrl"
				:connection-text="connectionText"
				:agent-id="agentId"
				:session-id="sessionId"
				:ai-power-text="aiPowerText"
				:quick-prompts="quickPrompts"
				:quick-action-disabled="isSending || showLoginPrompt || showPowerPrompt"
				:top-image-url="resolvedVisualTopImageUrl"
				@back="goBack"
				@reset="resetSession"
				@copy="copyText"
				@refresh-power="refreshAiPowerBalance"
				@quick-select="handleQuickActionSelect"
			/>
			</template>

			<template #intro-visual>
			<ChatIntroVisualPanel
				v-if="showVisualIntroInHead"
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
				v-if="!showScrollableIntroPanel"
				:prompt-type="chatAccessPromptType"
				:assistant-name="displayAssistantName"
				:remaining="aiPowerRemaining"
				:display-mode="visualMode"
				@login="goToLogin"
			/>
			<view
				v-if="showVolunteerUnlockPrompt && !showScrollableIntroPanel"
				class="chat-volunteer-unlock-wrap"
				:class="{ 'chat-volunteer-unlock-wrap-gaokao': visualMode === 'gaokao' }"
			>
				<volunteer-unlock-gate-card
					:user-logged-in="userLoggedIn"
					:loading="unlockStatusLoading"
					:payment-loading="unlockPaymentProcessing"
					:invite-count="admissionUnlockStatus.inviteCount"
					:required-invite-count="admissionUnlockStatus.requiredInviteCount"
					:user-nickname="currentUserName"
					:customer-service-phone="customerServicePhone"
					@login="goToLogin"
					@share-tap="showShareUnlockPrompt"
					@pay="handleAdmissionUnlockPayment"
					@refresh="refreshAdmissionUnlockState"
					@contact="contactCustomerService"
				/>
			</view>
			</template>

			<template #messages>
			<ChatMessagePanel
				v-if="shouldRenderMessagePanel"
				:display-mode="visualMode"
				:assistant-name="displayAssistantName"
				:assistant-avatar-url="assistantAvatarUrl"
				:current-user-name="currentUserName"
				:current-user-avatar-url="currentUserAvatarUrl"
				:messages="messages"
				:is-sending="isSending"
				:show-typing-indicator="isSending && !streamReplyStarted"
				:scroll-into-view-target="scrollIntoViewTarget"
				:bottom-space-rpx="messagePanelBottomSpaceRpx"
				@membership-action="handleMembershipCardAction"
				@school-card-tap="handleSchoolCardTap"
				@choice-select="handleChoiceCardSelect"
			>
				<template #top-content>
					<view
						v-if="showVolunteerStatusBanners"
						class="chat-volunteer-status-wrap"
						:class="{ 'chat-volunteer-status-wrap-gaokao': visualMode === 'gaokao' }"
					>
						<volunteer-access-status-upsell-banners
							:status="admissionUnlockStatus"
							:remaining-query-banner="remainingQueryBannerUrl"
							:vip-banner="vipBannerUrl"
							:customer-service-phone="customerServicePhone"
							@invite="showShareUnlockPrompt"
							@vip="handleAdmissionUnlockPayment"
							@vip-opened="showVipOpenedServiceModal"
						/>
					</view>
				</template>
			</ChatMessagePanel>
			<ChatMessageScrollContainer
				v-else-if="showScrollableIntroPanel"
				class="chat-intro-scroll-panel"
				:bottom-space-rpx="50"
			>
				<view class="chat-intro-scroll-inner">
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
					<view
						v-if="showVolunteerStatusBanners"
						class="chat-volunteer-status-wrap"
						:class="{ 'chat-volunteer-status-wrap-gaokao': visualMode === 'gaokao' }"
					>
						<volunteer-access-status-upsell-banners
							:status="admissionUnlockStatus"
							:remaining-query-banner="remainingQueryBannerUrl"
							:vip-banner="vipBannerUrl"
							:customer-service-phone="customerServicePhone"
							@invite="showShareUnlockPrompt"
							@vip="handleAdmissionUnlockPayment"
							@vip-opened="showVipOpenedServiceModal"
						/>
					</view>
					<ChatAccessStatePanel
						:prompt-type="chatAccessPromptType"
						:assistant-name="displayAssistantName"
						:remaining="aiPowerRemaining"
						:display-mode="visualMode"
						@login="goToLogin"
					/>
					<view
						v-if="showVolunteerUnlockPrompt"
						class="chat-volunteer-unlock-wrap"
						:class="{ 'chat-volunteer-unlock-wrap-gaokao': visualMode === 'gaokao' }"
					>
						<volunteer-unlock-gate-card
							:user-logged-in="userLoggedIn"
							:loading="unlockStatusLoading"
							:payment-loading="unlockPaymentProcessing"
							:invite-count="admissionUnlockStatus.inviteCount"
							:required-invite-count="admissionUnlockStatus.requiredInviteCount"
							:user-nickname="currentUserName"
							:customer-service-phone="customerServicePhone"
							@login="goToLogin"
							@share-tap="showShareUnlockPrompt"
							@pay="handleAdmissionUnlockPayment"
							@refresh="refreshAdmissionUnlockState"
							@contact="contactCustomerService"
						/>
					</view>
				</view>
			</ChatMessageScrollContainer>
			</template>

			<template #composer>
			<view
				id="chat-composer-wrap"
				class="composer"
				:class="{
					'composer-xiaochunlu': visualMode === 'xiaochunlu',
					'composer-gaokao': visualMode === 'gaokao'
				}"
			>
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
		<view
			v-if="shareInviteSheetVisible"
			class="share-invite-sheet-mask"
			@tap="closeShareInviteSheet"
		>
			<view class="share-invite-sheet" @tap.stop>
				<text class="share-invite-sheet-title">分享高考 AI / 查分链接</text>
				<text class="share-invite-sheet-desc">
					分享后好友登录成功才会计入解锁进度，AI 高考对话和直接查分共用这套权限。
				</text>
				<button
					class="share-invite-sheet-primary"
					open-type="share"
				>
					去邀请
				</button>
				<view class="share-invite-sheet-secondary" @tap="closeShareInviteSheet">
					<text>暂不邀请</text>
				</view>
			</view>
		</view>
		<view
			v-if="showMainDebugPanel"
			class="chat-debug-overlay"
			:class="{ 'chat-debug-overlay-open': debugPanelOpen }"
		>
			<view class="chat-debug-panel" :class="{ 'chat-debug-panel-open': debugPanelOpen }">
				<view class="chat-debug-header" @tap="debugPanelOpen = !debugPanelOpen">
					<text class="chat-debug-title">Debug</text>
					<view class="chat-debug-actions">
						<text class="chat-debug-copy" @tap.stop="copyDebugSummary">一键复制</text>
						<text class="chat-debug-toggle">{{ debugPanelOpen ? '收起' : '展开' }}</text>
					</view>
				</view>
				<view v-if="debugPanelOpen" class="chat-debug-body">
					<text class="chat-debug-line">requestedAgentId: {{ agentId }}</text>
					<text class="chat-debug-line">resolvedAgentId: {{ resolvedAgentId || '[]' }}</text>
					<text class="chat-debug-line">resolvedAgentName: {{ resolvedAgentName || assistantName || '[]' }}</text>
					<text class="chat-debug-line">sessionId: {{ sessionId }}</text>
					<text class="chat-debug-line">本轮触发 skill: {{ debugSummary.skillAttached }}</text>
					<text class="chat-debug-line">已触发 skills: {{ debugSummary.activatedSkills }}</text>
					<text class="chat-debug-line">已加载 skill 文件: {{ debugSummary.loadedSkillFiles }}</text>
					<text class="chat-debug-line">skill 注入字符数: {{ debugSummary.skillPromptChars }}</text>
					<text class="chat-debug-line">skill 触发原因: {{ debugSummary.skillMatchReason }}</text>
				</view>
			</view>
		</view>
		<view
			v-if="showProfileDebugPanel"
			class="chat-profile-debug-overlay"
			:class="{ 'chat-profile-debug-overlay-open': profileDebugPanelOpen }"
		>
			<view class="chat-profile-debug-panel" :class="{ 'chat-profile-debug-panel-open': profileDebugPanelOpen }">
				<view class="chat-profile-debug-header" @tap="profileDebugPanelOpen = !profileDebugPanelOpen">
					<text class="chat-profile-debug-title">用户画像 Debug</text>
					<view class="chat-profile-debug-actions">
						<text class="chat-profile-debug-copy" @tap.stop="copyProfileDebugSummary">一键复制</text>
						<text class="chat-profile-debug-toggle">{{ profileDebugPanelOpen ? '收起' : '展开' }}</text>
					</view>
				</view>
				<view v-if="profileDebugPanelOpen" class="chat-profile-debug-body">
					<text class="chat-profile-debug-line">sessionId: {{ profileDebugSummary.sessionId }}</text>
					<text class="chat-profile-debug-line">最近刷新: {{ profileDebugSummary.fetchedAt }}</text>
					<text class="chat-profile-debug-line">debugError: {{ profileDebugSummary.error }}</text>
					<text class="chat-profile-debug-line">分数: {{ profileDebugSummary.score }}</text>
					<text class="chat-profile-debug-line">位次: {{ profileDebugSummary.rank }}</text>
					<text class="chat-profile-debug-line">科类/模式: {{ profileDebugSummary.subjectMode }}</text>
					<text class="chat-profile-debug-line">选科: {{ profileDebugSummary.selectedSubjects }}</text>
					<text class="chat-profile-debug-line">专业偏好: {{ profileDebugSummary.majorPreferences }}</text>
					<text class="chat-profile-debug-line">专业避坑: {{ profileDebugSummary.majorAvoidances }}</text>
					<text class="chat-profile-debug-line">城市偏好: {{ profileDebugSummary.preferredCities }}</text>
					<text class="chat-profile-debug-line">省份偏好: {{ profileDebugSummary.preferredProvinces }}</text>
					<text class="chat-profile-debug-line">省内优先: {{ profileDebugSummary.inProvincePriority }}</text>
					<text class="chat-profile-debug-line">学校层次: {{ profileDebugSummary.targetSchoolLevels }}</text>
					<text class="chat-profile-debug-line">公办民办偏好: {{ profileDebugSummary.ownershipPreference }}</text>
					<text class="chat-profile-debug-line">风险偏好: {{ profileDebugSummary.riskPreference }}</text>
					<text class="chat-profile-debug-line">就业/升学目标: {{ profileDebugSummary.careerGoals }}</text>
					<text class="chat-profile-debug-line">预算备注: {{ profileDebugSummary.budgetNote }}</text>
					<text class="chat-profile-debug-line">家庭约束: {{ profileDebugSummary.familyConstraints }}</text>
					<text class="chat-profile-debug-line">距离偏好: {{ profileDebugSummary.distancePreference }}</text>
					<text class="chat-profile-debug-line">必须避开: {{ profileDebugSummary.mustAvoidFactors }}</text>
					<text class="chat-profile-debug-line">当前阶段: {{ profileDebugSummary.currentStage }}</text>
					<text class="chat-profile-debug-line">主要顾虑: {{ profileDebugSummary.mainConcerns }}</text>
					<text class="chat-profile-debug-line">待补字段: {{ profileDebugSummary.missingKeyFields }}</text>
					<text class="chat-profile-debug-line">推荐下一问: {{ profileDebugSummary.recommendedNextQuestion }}</text>
					<text class="chat-profile-debug-line">最近问题摘要: {{ profileDebugSummary.recentQuestionSummaries }}</text>
					<text class="chat-profile-debug-line">会话用户原话: {{ profileDebugSummary.recentUserMessages }}</text>
					<text class="chat-profile-debug-line">用户结构化画像: {{ profileDebugSummary.profileJson }}</text>
					<text class="chat-profile-debug-line">高考结构化状态: {{ profileDebugSummary.gaokaoJson }}</text>
				</view>
			</view>
		</view>
	</view>
</template>

<script>
import ChatAccessStatePanel from './components/ChatAccessStatePanel.vue'
import ChatComposerBar from './components/ChatComposerBar.vue'
import ChatHeroCard from './components/ChatHeroCard.vue'
import ChatIntroVisualPanel from './components/ChatIntroVisualPanel.vue'
import ChatMessagePanel from './components/ChatMessagePanel.vue'
import ChatMessageScrollContainer from './components/ChatMessageScrollContainer.vue'
import ChatPageShell from './components/ChatPageShell.vue'
import VolunteerAccessStatusUpsellBanners from '../../components/volunteer/AccessStatusUpsellBanners.vue'
import VolunteerUnlockGateCard from '../../components/volunteer/UnlockGateCard.vue'
import { getStaticAssetUrl } from '@/utils/cloud-static-assets'
import { getCachedImageSync, resolveCachedImages } from '@/utils/remote-image-cache'
import {
	VOLUNTEER_CUSTOMER_SERVICE_PHONE,
	createDefaultUnlockStatus
} from '@/utils/volunteer-local-admission.js'
import {
	DEFAULT_AGENT_ID,
	createSessionId,
	extractDisplayUserInfo,
	normalizeText,
} from './utils/chat-auth.js'
import { getAgentUiConfig } from './utils/agent-ui-config.js'
import { getAiChatVisualConfig } from './utils/ai-chat-visual-config.js'
import { chatPageMethods } from './utils/chat-page-methods.js'
import {
	VISUAL_INTRO_SECTION_KEYS,
	createVisualPromptBatches,
	getCachedVisualIntroSectionImageUrls,
	normalizeVisualIntroSectionImageUrls,
	resolveDefaultTopicKey,
	resolveVisualImageUrl,
	resolveVisualIntroSectionImageUrls
} from './utils/visual-mode-helpers.js'

const REMAINING_QUERY_BANNER_URL = getStaticAssetUrl('/static/volunteer-guide/remaining-query-banner.webp')
const VIP_BANNER_URL = getStaticAssetUrl('/static/volunteer-guide/vip-banner-large.webp')
const GAOKAO_DISPLAY_ASSISTANT_NAME = '云南志愿填报老师 雪峰哥'

export default {
	name: 'ai-chat-page',
	components: {
		ChatAccessStatePanel,
		ChatComposerBar,
		ChatHeroCard,
		ChatIntroVisualPanel,
		ChatMessagePanel,
		ChatMessageScrollContainer,
		ChatPageShell,
		VolunteerAccessStatusUpsellBanners,
		VolunteerUnlockGateCard
	},
	data() {
		const agentUi = getAgentUiConfig(DEFAULT_AGENT_ID)
		const visualConfig = getAiChatVisualConfig(DEFAULT_AGENT_ID)
		const currentUser = extractDisplayUserInfo()
		return {
			agentId: DEFAULT_AGENT_ID,
			resolvedAgentId: DEFAULT_AGENT_ID,
			resolvedAgentName: agentUi.assistantName,
			sessionId: createSessionId(),
			assistantName: agentUi.assistantName,
			assistantRole: agentUi.assistantRole,
			assistantAvatarUrl: agentUi.assistantAvatarUrl || '',
			currentUserId: currentUser.userId || '',
			currentUserName: currentUser.nickname || '我',
			currentUserAvatarUrl: currentUser.avatar || '',
			connectionText: '连接中',
			draftText: '',
			messages: [],
			isSending: false,
			streamReplyStarted: false,
			activeAssistantMessageId: '',
			scrollIntoViewTarget: 'chat-bottom',
			aiPowerRemaining: 0,
			aiPowerLoading: false,
			chatAccessPromptType: '',
			quickPrompts: agentUi.quickPrompts,
			visualIntroTopics: Array.isArray(agentUi.introTopics) ? agentUi.introTopics : [],
			activeVisualTopicKey: resolveDefaultTopicKey(agentUi.introTopics),
			visualGuessPrompts: Array.isArray(agentUi.introQuickPrompts) ? agentUi.introQuickPrompts : [],
			visualGuessPromptBatchIndex: 0,
			visualSuggestionPrompts: Array.isArray(agentUi.introSuggestionPrompts) ? agentUi.introSuggestionPrompts : [],
			composerPlaceholderOverride: '',
			transportMode: agentUi.transportMode || 'stream',
			visualMode: visualConfig.mode,
			visualTopImageUrl: visualConfig.topImageUrl,
			visualIntroSectionImageUrls: normalizeVisualIntroSectionImageUrls(visualConfig.introSectionImageUrls),
			visualComposerBackgroundImageUrl: visualConfig.composerBackgroundImageUrl || '',
			visualComposerSendButtonImageUrl: visualConfig.composerSendButtonImageUrl || '',
			cachedVisualTopImageUrl: getCachedImageSync(visualConfig.topImageUrl),
			cachedVisualIntroSectionImageUrls: getCachedVisualIntroSectionImageUrls(visualConfig.introSectionImageUrls),
			cachedVisualComposerBackgroundImageUrl: getCachedImageSync(visualConfig.composerBackgroundImageUrl),
			cachedVisualComposerSendButtonImageUrl: getCachedImageSync(visualConfig.composerSendButtonImageUrl),
			hideWelcomeMessage: visualConfig.hideWelcomeMessage,
			showDebugPanels: false,
			showMainDebugPanel: true,
			showProfileDebugPanel: false,
			debugPanelOpen: true,
			profileDebugPanelOpen: false,
			admissionUnlockStatus: createDefaultUnlockStatus(),
			unlockStatusLoading: false,
			unlockPaymentProcessing: false,
			shareInviteSheetVisible: false,
			remainingQueryBannerUrl: getCachedImageSync(REMAINING_QUERY_BANNER_URL) || REMAINING_QUERY_BANNER_URL,
			vipBannerUrl: getCachedImageSync(VIP_BANNER_URL) || VIP_BANNER_URL,
			skillDebug: {
				activatedSkills: [],
				loadedSkillFiles: [],
				skillPromptChars: 0,
				skillMatchReason: []
			},
			profileDebugData: {
				sessionId: '',
				requestedAgentId: DEFAULT_AGENT_ID,
				resolvedAgentId: DEFAULT_AGENT_ID,
				resolvedAgentName: agentUi.assistantName,
				sessionAgentId: '',
				fetchedAt: '',
				error: '',
				profileSnapshot: null,
				gaokaoSnapshot: null,
				recentUserMessages: []
			}
		}
	},
	computed: {
		aiPowerText() {
			if (this.aiPowerLoading) return '--'
			return String(Math.max(0, Math.floor(Number(this.aiPowerRemaining) || 0)))
		},
		displayAssistantName() {
			if (this.visualMode === 'gaokao') {
				return GAOKAO_DISPLAY_ASSISTANT_NAME
			}
			return this.assistantName
		},
		showLoginPrompt() {
			return this.chatAccessPromptType === 'login'
		},
		userLoggedIn() {
			return Boolean(this.currentUserId)
		},
		requiresVolunteerUnlock() {
			return this.visualMode === 'gaokao'
		},
		hasVolunteerAccess() {
			return !this.requiresVolunteerUnlock || Boolean(this.admissionUnlockStatus && this.admissionUnlockStatus.unlocked)
		},
		showVolunteerUnlockPrompt() {
			return this.requiresVolunteerUnlock && !this.showLoginPrompt && !this.hasVolunteerAccess
		},
		showVolunteerStatusBanners() {
			return this.requiresVolunteerUnlock
		},
		showPowerPrompt() {
			return this.chatAccessPromptType === 'power'
		},
		isComposerDisabled() {
			return this.isSending || this.showLoginPrompt || this.showPowerPrompt || this.showVolunteerUnlockPrompt
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
		showAccessStatePrompt() {
			return this.showLoginPrompt || this.showPowerPrompt
		},
		showScrollableIntroPanel() {
			return !this.shouldRenderMessagePanel && (
				this.showVisualIntro
				|| this.showVolunteerStatusBanners
				|| this.showAccessStatePrompt
				|| this.showVolunteerUnlockPrompt
			)
		},
		shellBottomReserveRpx() {
			return this.shouldRenderMessagePanel ? 0 : 184
		},
		messagePanelBottomSpaceRpx() {
			return this.visualMode === 'gaokao' ? 220 : 50
		},
		showVisualIntroInHead() {
			return this.showVisualIntro && !this.showScrollableIntroPanel
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
			if (this.showVolunteerUnlockPrompt) return '请先邀请好友或付费解锁后再发送'
			if (this.showPowerPrompt) return '算力不足，先补充后再继续'
			const placeholder = normalizeText(this.composerPlaceholderOverride, '')
			if (this.isXiaochunluAgent && /(分数|位次|科类|城市|专业方向)/.test(placeholder)) {
				return '问我文章、业务或 19.9 校园大使'
			}
			return placeholder || '直接把你现在最想解决的问题发给我'
		},
		debugSummary() {
			const debug = this.skillDebug || {}
			return {
				skillAttached: Array.isArray(debug.activatedSkills) && debug.activatedSkills.length ? '是' : '否',
				activatedSkills: Array.isArray(debug.activatedSkills) && debug.activatedSkills.length
					? debug.activatedSkills.join(', ')
					: '[]',
				loadedSkillFiles: Array.isArray(debug.loadedSkillFiles) && debug.loadedSkillFiles.length
					? debug.loadedSkillFiles.join(' | ')
					: '[]',
				skillPromptChars: Number(debug.skillPromptChars) || 0,
				skillMatchReason: Array.isArray(debug.skillMatchReason) && debug.skillMatchReason.length
					? debug.skillMatchReason.join(', ')
					: '[]'
			}
		},
		profileDebugSummary() {
			const payload = this.profileDebugData || {}
			const profile = payload.profileSnapshot && typeof payload.profileSnapshot === 'object'
				? payload.profileSnapshot
				: {}
			const gaokao = payload.gaokaoSnapshot && typeof payload.gaokaoSnapshot === 'object'
				? payload.gaokaoSnapshot
				: {}
			const gaokaoProfile = gaokao.gaokaoProfile && typeof gaokao.gaokaoProfile === 'object'
				? gaokao.gaokaoProfile
				: {}
			const progress = gaokao.consultationProgress && typeof gaokao.consultationProgress === 'object'
				? gaokao.consultationProgress
				: {}
			const recentNotes = Array.isArray(gaokao.recentQuestionSummaries) ? gaokao.recentQuestionSummaries : []
			const recentMessages = Array.isArray(payload.recentUserMessages) ? payload.recentUserMessages : []
			return {
				sessionId: String(payload.sessionId || this.sessionId || '').trim() || '[]',
				fetchedAt: String(payload.fetchedAt || '').trim() || '[]',
				error: String(payload.error || '').trim() || '[]',
				score: gaokaoProfile.score ?? '[]',
				rank: gaokaoProfile.rank ?? '[]',
				subjectMode: String(gaokaoProfile.subjectMode || gaokaoProfile.examType || '').trim() || '[]',
				selectedSubjects: Array.isArray(gaokaoProfile.selectedSubjects) && gaokaoProfile.selectedSubjects.length
					? gaokaoProfile.selectedSubjects.join(', ')
					: '[]',
				majorPreferences: Array.isArray(gaokaoProfile.majorPreferences) && gaokaoProfile.majorPreferences.length
					? gaokaoProfile.majorPreferences.join(', ')
					: '[]',
				majorAvoidances: Array.isArray(gaokaoProfile.majorAvoidances) && gaokaoProfile.majorAvoidances.length
					? gaokaoProfile.majorAvoidances.join(', ')
					: '[]',
				preferredCities: Array.isArray(gaokaoProfile.preferredCities) && gaokaoProfile.preferredCities.length
					? gaokaoProfile.preferredCities.join(', ')
					: '[]',
				preferredProvinces: Array.isArray(gaokaoProfile.preferredProvinces) && gaokaoProfile.preferredProvinces.length
					? gaokaoProfile.preferredProvinces.join(', ')
					: '[]',
				inProvincePriority: typeof gaokaoProfile.inProvincePriority === 'boolean'
					? String(gaokaoProfile.inProvincePriority)
					: '[]',
				targetSchoolLevels: Array.isArray(gaokaoProfile.targetSchoolLevels) && gaokaoProfile.targetSchoolLevels.length
					? gaokaoProfile.targetSchoolLevels.join(', ')
					: '[]',
				ownershipPreference: String(gaokaoProfile.ownershipPreference || '').trim() || '[]',
				riskPreference: String(gaokaoProfile.riskPreference || '').trim() || '[]',
				careerGoals: Array.isArray(gaokaoProfile.careerGoals) && gaokaoProfile.careerGoals.length
					? gaokaoProfile.careerGoals.join(', ')
					: '[]',
				budgetNote: String(gaokaoProfile.budgetNote || '').trim() || '[]',
				familyConstraints: String(gaokaoProfile.familyConstraints || '').trim() || '[]',
				distancePreference: String(gaokaoProfile.distancePreference || '').trim() || '[]',
				mustAvoidFactors: Array.isArray(gaokaoProfile.mustAvoidFactors) && gaokaoProfile.mustAvoidFactors.length
					? gaokaoProfile.mustAvoidFactors.join(', ')
					: '[]',
				currentStage: String(progress.currentStage || '').trim() || '[]',
				mainConcerns: Array.isArray(progress.mainConcerns) && progress.mainConcerns.length
					? progress.mainConcerns.join(', ')
					: '[]',
				missingKeyFields: Array.isArray(gaokao.missingKeyFields) && gaokao.missingKeyFields.length
					? gaokao.missingKeyFields.join(', ')
					: '[]',
				recommendedNextQuestion: String(gaokao.recommendedNextQuestion || '').trim() || '[]',
				recentQuestionSummaries: recentNotes.length
					? recentNotes.map((item) => ({
						...item,
						answerSummary: ''
					})).map((item) => String((item && (item.sourceMessageSummary || item.questionSummary)) || '').trim()).filter(Boolean).join(' || ')
					: '[]',
				recentUserMessages: recentMessages.length
					? recentMessages.map((item) => String(item && item.content || '').trim()).filter(Boolean).join(' || ')
					: '[]',
				profileJson: JSON.stringify(profile),
				gaokaoJson: JSON.stringify(gaokao)
			}
		},
		customerServicePhone() {
			return VOLUNTEER_CUSTOMER_SERVICE_PHONE
		}
	},
	onShareAppMessage() {
		this.shareInviteSheetVisible = false
		return this.buildVolunteerUnlockSharePayload()
	},
	onLoad(options = {}) {
		this.agentId = normalizeText(options.agentId || DEFAULT_AGENT_ID, DEFAULT_AGENT_ID)
		this.sessionId = normalizeText(options.sessionId || createSessionId(), createSessionId())
		this.showProfileDebugPanel = false
		this.profileDebugPanelOpen = false
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
		this.transportMode = agentUi.transportMode || this.transportMode || 'stream'
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
		this.syncVolunteerUnlockAssets()
		this.bootstrapPage()
	},
	onShow() {
		this.syncVolunteerUnlockAssets()
		this.syncAccessState()
	},
	methods: {
		...chatPageMethods,
		async syncVolunteerUnlockAssets() {
			try {
				const [remainingQueryBannerUrl, vipBannerUrl] = await resolveCachedImages([
					REMAINING_QUERY_BANNER_URL,
					VIP_BANNER_URL
				])
				this.remainingQueryBannerUrl = remainingQueryBannerUrl || REMAINING_QUERY_BANNER_URL
				this.vipBannerUrl = vipBannerUrl || VIP_BANNER_URL
			} catch (error) {
				console.warn('[ai-chat] volunteer unlock assets cache failed:', error)
				this.remainingQueryBannerUrl = REMAINING_QUERY_BANNER_URL
				this.vipBannerUrl = VIP_BANNER_URL
			}
		},
		copyDebugSummary() {
			const lines = [
				`requestedAgentId: ${this.agentId}`,
				`resolvedAgentId: ${this.resolvedAgentId || '[]'}`,
				`resolvedAgentName: ${this.resolvedAgentName || this.assistantName || '[]'}`,
				`sessionId: ${this.sessionId}`,
				`本轮触发 skill: ${this.debugSummary.skillAttached}`,
				`已触发 skills: ${this.debugSummary.activatedSkills}`,
				`已加载 skill 文件: ${this.debugSummary.loadedSkillFiles}`,
				`skill 注入字符数: ${this.debugSummary.skillPromptChars}`,
				`skill 触发原因: ${this.debugSummary.skillMatchReason}`
			]
			this.copyText(lines.join('\n'))
		},
		copyProfileDebugSummary() {
			const lines = [
				`sessionId: ${this.profileDebugSummary.sessionId}`,
				`最近刷新: ${this.profileDebugSummary.fetchedAt}`,
				`debugError: ${this.profileDebugSummary.error}`,
				`分数: ${this.profileDebugSummary.score}`,
				`位次: ${this.profileDebugSummary.rank}`,
				`科类/模式: ${this.profileDebugSummary.subjectMode}`,
				`选科: ${this.profileDebugSummary.selectedSubjects}`,
				`专业偏好: ${this.profileDebugSummary.majorPreferences}`,
				`城市偏好: ${this.profileDebugSummary.preferredCities}`,
				`当前阶段: ${this.profileDebugSummary.currentStage}`,
				`主要顾虑: ${this.profileDebugSummary.mainConcerns}`,
				`待补字段: ${this.profileDebugSummary.missingKeyFields}`,
				`推荐下一问: ${this.profileDebugSummary.recommendedNextQuestion}`,
				`最近问题摘要: ${this.profileDebugSummary.recentQuestionSummaries}`,
				`会话用户原话: ${this.profileDebugSummary.recentUserMessages}`,
				`用户结构化画像: ${this.profileDebugSummary.profileJson}`,
				`高考结构化状态: ${this.profileDebugSummary.gaokaoJson}`
			]
			this.copyText(lines.join('\n'))
		},
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
.chat-page-root {
	position: relative;
	min-height: 100vh;
}

.chat-debug-overlay {
	position: fixed;
	right: 24rpx;
	top: calc(224rpx + env(safe-area-inset-top, 0px));
	z-index: 120;
	display: flex;
	justify-content: flex-end;
	pointer-events: none;
}

.chat-debug-overlay-open {
	z-index: 130;
}

.chat-debug-panel {
	width: min(560rpx, calc(100vw - 48rpx));
	border-radius: 24rpx;
	background: rgba(37, 99, 235, 0.92);
	border: 1rpx solid rgba(191, 219, 254, 0.55);
	overflow: hidden;
	box-shadow: 0 18rpx 40rpx rgba(37, 99, 235, 0.24);
	pointer-events: auto;
}

.chat-debug-panel-open {
	background: rgba(15, 23, 42, 0.9);
	border-color: rgba(255, 255, 255, 0.12);
}

.chat-debug-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 18rpx 22rpx;
}

.chat-debug-actions {
	display: flex;
	align-items: center;
	gap: 18rpx;
}

.chat-debug-title {
	font-size: 24rpx;
	font-weight: 700;
	color: #f8fafc;
}

.chat-debug-copy {
	font-size: 22rpx;
	line-height: 1;
	color: #eff6ff;
	padding: 10rpx 16rpx;
	border-radius: 999rpx;
	background: rgba(255, 255, 255, 0.18);
}

.chat-debug-toggle {
	font-size: 22rpx;
	color: rgba(248, 250, 252, 0.92);
}

.chat-debug-body {
	display: flex;
	flex-direction: column;
	padding: 0 22rpx 20rpx;
	gap: 10rpx;
}

.chat-debug-line {
	font-size: 20rpx;
	line-height: 1.55;
	color: rgba(241, 245, 249, 0.92);
	word-break: break-all;
}

.chat-profile-debug-overlay {
	position: fixed;
	left: 24rpx;
	top: calc(264rpx + env(safe-area-inset-top, 0px));
	z-index: 120;
	display: flex;
	justify-content: flex-start;
	pointer-events: none;
}

.chat-profile-debug-overlay-open {
	z-index: 130;
}

.chat-profile-debug-panel {
	width: min(620rpx, calc(100vw - 48rpx));
	border-radius: 24rpx;
	background: rgba(12, 74, 110, 0.94);
	border: 1rpx solid rgba(165, 243, 252, 0.35);
	overflow: hidden;
	box-shadow: 0 18rpx 40rpx rgba(8, 47, 73, 0.28);
	pointer-events: auto;
}

.chat-profile-debug-panel-open {
	background: rgba(8, 47, 73, 0.96);
	border-color: rgba(165, 243, 252, 0.42);
}

.chat-profile-debug-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 18rpx 22rpx;
}

.chat-profile-debug-title {
	font-size: 24rpx;
	font-weight: 700;
	color: #ecfeff;
}

.chat-profile-debug-actions {
	display: flex;
	align-items: center;
	gap: 18rpx;
}

.chat-profile-debug-copy {
	font-size: 22rpx;
	line-height: 1;
	color: #ecfeff;
	padding: 10rpx 16rpx;
	border-radius: 999rpx;
	background: rgba(255, 255, 255, 0.12);
}

.chat-profile-debug-toggle {
	font-size: 22rpx;
	color: rgba(236, 254, 255, 0.92);
}

.chat-profile-debug-body {
	display: flex;
	flex-direction: column;
	padding: 0 22rpx 20rpx;
	gap: 10rpx;
}

.chat-profile-debug-line {
	font-size: 20rpx;
	line-height: 1.55;
	color: rgba(236, 254, 255, 0.94);
	word-break: break-all;
}
</style>

<style scoped>
.chat-intro-visual-wrap {
	position: relative;
	margin-top: -24rpx;
	z-index: 3;
}

.chat-intro-visual-wrap-gaokao {
	margin-top: 0;
}

.chat-intro-scroll-panel {
	flex: 1;
	height: 100%;
	min-height: 0;
}

.chat-intro-scroll-inner {
	display: flex;
	flex-direction: column;
	padding: 0 0 24rpx;
	box-sizing: border-box;
}

.chat-intro-blank-debug {
	padding: 48rpx 24rpx 0;
	display: flex;
	justify-content: center;
	align-items: center;
	font-size: 24rpx;
	line-height: 1.4;
	color: #e11d48;
}

.chat-volunteer-unlock-wrap {
	padding: 18rpx 24rpx 0;
	display: flex;
	flex-direction: column;
	gap: 18rpx;
}

.chat-volunteer-status-wrap {
	padding: 18rpx 24rpx 0;
}

.chat-volunteer-status-wrap-gaokao {
	padding-top: 20rpx;
}

.chat-volunteer-unlock-wrap-gaokao {
	padding-top: 14rpx;
}

.share-invite-sheet-mask {
	position: fixed;
	inset: 0;
	z-index: 150;
	background: rgba(15, 23, 42, 0.42);
	display: flex;
	align-items: flex-end;
	justify-content: center;
}

.share-invite-sheet {
	width: 100%;
	padding: 34rpx 28rpx calc(34rpx + env(safe-area-inset-bottom, 0px));
	border-radius: 34rpx 34rpx 0 0;
	background: #ffffff;
	display: flex;
	flex-direction: column;
	gap: 18rpx;
	box-shadow: 0 -18rpx 48rpx rgba(15, 23, 42, 0.16);
}

.share-invite-sheet-title {
	font-size: 34rpx;
	font-weight: 700;
	color: #0f172a;
}

.share-invite-sheet-desc {
	font-size: 26rpx;
	line-height: 1.6;
	color: #475569;
}

.share-invite-sheet-primary {
	height: 92rpx;
	line-height: 92rpx;
	border-radius: 24rpx;
	background: linear-gradient(135deg, #2563eb 0%, #0ea5e9 100%);
	color: #ffffff;
	font-size: 30rpx;
	font-weight: 700;
	border: none;
}

.share-invite-sheet-secondary {
	height: 84rpx;
	border-radius: 22rpx;
	background: #f8fafc;
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 28rpx;
	font-weight: 600;
	color: #475569;
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

.composer-xiaochunlu {
	bottom: calc(54rpx + env(safe-area-inset-bottom, 0px));
}

.composer-gaokao {
	left: 0;
	right: 0;
	bottom: 30rpx;
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
