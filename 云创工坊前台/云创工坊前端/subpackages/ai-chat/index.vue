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
				:quick-prompts="visibleQuickPrompts"
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
				:topics="visibleVisualIntroTopics"
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
				:current-user-is-campus-partner="currentUserIsCampusPartner"
				:messages="messages"
				:is-sending="isSending"
				:show-typing-indicator="isSending && !streamReplyStarted"
				:scroll-into-view-target="scrollIntoViewTarget"
				:bottom-space-rpx="messagePanelBottomSpaceRpx"
				@membership-action="handleMembershipCardAction"
				@school-card-tap="handleSchoolCardTap"
				@school-card-copy="handleSchoolCardCopy"
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
						:topics="visibleVisualIntroTopics"
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
		<ChatDebugPanel
			v-if="showChatDebugPanel"
			:visible="showChatDebugPanel"
			:open="debugPanelOpen"
			:agent-id="agentId"
			:resolved-agent-id="resolvedAgentId"
			:resolved-agent-name="resolvedAgentName"
			:assistant-name="assistantName"
			:session-id="sessionId"
			:transport-mode="transportMode"
			:runtime-debug-summary="runtimeDebugSummary"
			:debug-summary="debugSummary"
			:profile-debug-data="profileDebugData"
			:membership-debug-data="membershipDebugSummary"
			@toggle="toggleDebugPanel"
			@copy="copyDebugSummary"
		/>
		<view
			v-if="shareInviteSheetVisible"
			class="share-invite-sheet-mask"
			@tap="closeShareInviteSheet"
		>
			<view class="share-invite-sheet" @tap.stop>
				<text class="share-invite-sheet-title">分享高考 AI / 查分链接</text>
				<text class="share-invite-sheet-desc">
					分享{{ admissionUnlockStatus.requiredInviteCount || 3 }}人登录成功才会计入解锁进度，AI 高考对话和直接查分共用这套权限。
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
	</view>
</template>

<script>
import ChatAccessStatePanel from './components/ChatAccessStatePanel.vue'
import ChatComposerBar from './components/ChatComposerBar.vue'
import ChatHeroCard from './components/ChatHeroCard.vue'
import ChatIntroVisualPanel from './components/ChatIntroVisualPanel.vue'
import ChatDebugPanel from './components/ChatDebugPanel.vue'
import ChatMessagePanel from './components/ChatMessagePanel.vue'
import ChatMessageScrollContainer from './components/ChatMessageScrollContainer.vue'
import ChatPageShell from './components/ChatPageShell.vue'
import VolunteerAccessStatusUpsellBanners from '../../components/volunteer/AccessStatusUpsellBanners.vue'
import VolunteerUnlockGateCard from '../../components/volunteer/UnlockGateCard.vue'
import { getStaticAssetUrl } from '@/utils/cloud-static-assets'
import { getCachedImageSync, resolveCachedImages } from '@/utils/remote-image-cache'
import { getCurrentUserInfo } from '@/utils/http-services'
import {
	VOLUNTEER_CUSTOMER_SERVICE_PHONE,
	createDefaultUnlockStatus
} from '@/utils/volunteer-local-admission.js'
import {
	DEFAULT_AGENT_ID,
	createSessionId,
	extractDisplayUserInfo,
	normalizeText,
	resolveAiChatAgentId,
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
const GAOKAO_DEBUG_PANEL_ENABLED = false

function isRecord(value) {
	return !!value && typeof value === 'object' && !Array.isArray(value)
}

function toIdentitySignalList(value) {
	if (Array.isArray(value)) {
		return value
	}
	if (value === undefined || value === null || value === '') {
		return []
	}
	return [value]
}

function hasCampusPartnerIdentity(userInfo = {}) {
	const source = isRecord(userInfo) ? userInfo : {}
	const profile = isRecord(source.profile) ? source.profile : {}
	const membership = isRecord(source.membership) ? source.membership : {}
	const teamInfo = isRecord(source.team_info)
		? source.team_info
		: (isRecord(source.teamInfo) ? source.teamInfo : {})
	const partnerInfo = isRecord(source.partner_info)
		? source.partner_info
		: (isRecord(source.partnerInfo) ? source.partnerInfo : {})
	const signals = [
		...toIdentitySignalList(source.role),
		...toIdentitySignalList(source.type),
		...toIdentitySignalList(source.identities),
		...toIdentitySignalList(source.identityTags),
		source.membership_segment,
		source.membership_segment_label,
		source.memberIdentity,
		source.memberIdentityLabel,
		source.badge,
		membership.segment,
		membership.segmentLabel,
		membership.memberIdentity,
		membership.memberIdentityLabel,
		membership.hasCampusPartnerMembership ? 'campus_partner' : '',
		(source.team_id || source.teamId || teamInfo.team_id || teamInfo.teamId) ? 'campus_partner' : '',
		source.team_id || source.teamId,
		teamInfo.team_id || teamInfo.teamId,
		teamInfo.position,
		teamInfo.status,
		partnerInfo.level,
		partnerInfo.status,
		partnerInfo.partner_id,
		profile.badge,
		profile.role,
		profile.type
	]
		.map((item) => normalizeText(item, '').toLowerCase())
		.filter(Boolean)

	return signals.some((item) => /校园合伙人|校园大使|共建者|campus[_-\s]?partner|partner/.test(item))
}

function safeJsonStringify(value, fallback = '[]') {
	try {
		return JSON.stringify(value, null, 2)
	} catch (error) {
		return fallback
	}
}

function formatDebugValue(value) {
	if (value === null || typeof value === 'undefined' || value === '') return '[]'
	if (Array.isArray(value)) return value.length ? value.map((item) => formatDebugValue(item)).join(', ') : '[]'
	if (isRecord(value)) return safeJsonStringify(value, '[]')
	return String(value)
}

function buildStructuredDebugMessages(messages = []) {
	if (!Array.isArray(messages)) return []
	return messages.map((item, index) => {
		const role = normalizeText(item && item.role, 'unknown')
		const type = normalizeText(item && item.type, 'message')
		const provider = normalizeText(item && (item.provider || item.providerName), '[]')
		const model = normalizeText(item && item.model, '[]')
		const text = normalizeText(
			item && (
				item.content ||
				item.text ||
				item.message ||
				(item.delta && item.delta.text)
			),
			''
		)
		const summary = normalizeText(item && item.summary, '') || (text ? `${text.slice(0, 88)}${text.length > 88 ? '…' : ''}` : '[]')
		return {
			key: `${role}-${type}-${index}`,
			level: 1,
			role,
			type,
			provider,
			model,
			summary,
			text: text || safeJsonStringify(item, '[]')
		}
	})
}

function shouldShowGaokaoDebugPanel(visualMode) {
	return GAOKAO_DEBUG_PANEL_ENABLED && visualMode === 'gaokao'
}

export default {
	name: 'ai-chat-page',
	components: {
		ChatAccessStatePanel,
		ChatComposerBar,
		ChatDebugPanel,
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
		const cachedUserInfo = getCurrentUserInfo()
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
			currentUserProfileInfo: cachedUserInfo,
			currentUserIsCampusPartner: hasCampusPartnerIdentity(cachedUserInfo),
			connectionText: '连接中',
			draftText: '',
			messages: [],
			isSending: false,
			streamReplyStarted: false,
			activeAssistantMessageId: '',
			activeAssistantSegmentKind: '',
			activeAssistantSegmentText: '',
			messageIdSeed: 0,
			scrollIntoViewTarget: 'chat-bottom',
			aiPowerRemaining: 0,
			aiPowerLoading: false,
			chatAccessPromptType: '',
			quickPrompts: agentUi.quickPrompts,
			fixedQaEntries: [],
			fixedQaReplyMap: {},
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
			enableDebugTools: shouldShowGaokaoDebugPanel(visualConfig.mode),
			debugPanelOpen: shouldShowGaokaoDebugPanel(visualConfig.mode),
			admissionUnlockStatus: createDefaultUnlockStatus(),
			unlockStatusInitialized: false,
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
			},
			runtimeDebugData: {
				sessionId: '',
				fetchedAt: '',
				error: '',
				provider: '',
				model: '',
				baseUrl: '',
				requestApi: '',
				requestMethod: '',
				requestTransportMode: '',
				requestStartedAt: '',
				firstReplyAt: '',
				firstReplyMs: 0,
				firstReplyEventType: '',
				requestCompletedAt: '',
				requestTotalMs: 0,
				lastStatusCode: 0,
				runtimeMessagesPath: '',
				fileExists: false,
				parseError: '',
				rawFileText: '',
				rawMessages: [],
				formattedMessages: [],
				streamEvents: [],
				streamEventSeq: 0,
				liveThinkingText: '',
				liveRenderedText: '',
				lastCompletedPayload: null
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
			return this.requiresVolunteerUnlock
				&& this.unlockStatusInitialized
				&& !this.showLoginPrompt
				&& !this.hasVolunteerAccess
		},
		showVolunteerStatusBanners() {
			return this.requiresVolunteerUnlock
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
			if (this.visualMode === 'gaokao') {
				return 220
			}
			if (this.visualMode === 'xiaochunlu') {
				return 160
			}
			return 50
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
		visibleQuickPrompts() {
			const prompts = Array.isArray(this.quickPrompts) ? this.quickPrompts : []
			if (!this.isXiaochunluAgent || !this.currentUserIsCampusPartner) {
				return prompts
			}
			return prompts.filter((item) => {
				const text = normalizeText(
					(item && (item.label || item.action || item.reply || item.fixedReply)) || item,
					''
				)
				return !/校园合伙人|19\.9/.test(text)
			})
		},
		visibleVisualIntroTopics() {
			const topics = Array.isArray(this.visualIntroTopics) ? this.visualIntroTopics : []
			if (!this.isXiaochunluAgent || !this.currentUserIsCampusPartner) {
				return topics
			}
			return topics.filter((item) => {
				const topicKey = normalizeText(item && item.topicKey, '').toLowerCase()
				const label = normalizeText(item && item.label, '')
				const action = normalizeText(item && item.action, '')
				return !(
					topicKey === 'campus-partner' ||
					/校园合伙人/.test(`${label} ${action}`)
				)
			})
		},
		visibleVisualSuggestionPrompts() {
			const prompts = Array.isArray(this.visualSuggestionPrompts) ? this.visualSuggestionPrompts : []
			if (!this.isXiaochunluAgent || !this.currentUserIsCampusPartner) {
				return prompts
			}
			return prompts.filter((item) => {
				const text = normalizeText(
					(item && (item.label || item.action || item.reply || item.fixedReply)) || item,
					''
				)
				return !/校园合伙人|19\.9/.test(text)
			})
		},
		activeVisualTopic() {
			const topics = this.visibleVisualIntroTopics
			return topics.find((item) => item && item.topicKey === this.activeVisualTopicKey) || topics[0] || null
		},
		resolvedVisualGuessPromptPool() {
			const prompts = this.activeVisualTopic && Array.isArray(this.activeVisualTopic.guessPrompts)
				? this.activeVisualTopic.guessPrompts
				: this.visibleVisualIntroTopics.length
					? this.visibleVisualIntroTopics[0].guessPrompts || this.visualGuessPrompts
					: this.visualGuessPrompts
			const fallbackPrompts = Array.isArray(prompts) && prompts.length
				? prompts
				: this.visibleVisualSuggestionPrompts
			return Array.isArray(fallbackPrompts) ? fallbackPrompts.slice(0, 18) : []
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
				: this.visibleVisualSuggestionPrompts
			return Array.isArray(prompts) ? prompts.slice(0, 4) : []
		},
		isXiaochunluAgent() {
			const normalizedAgentId = normalizeText(this.agentId, '')
			return (
				normalizedAgentId === 'xiaochunlu-ai-v2' ||
				normalizedAgentId === 'xiaochunlu-ai-v3' ||
				normalizedAgentId === 'xiaochunlu-ai-v4' ||
				normalizedAgentId === 'xiaochunlu-ai-v5' ||
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
			if (this.showLoginPrompt) return '登录后发送'
			if (this.showPowerPrompt) return '算力不足，暂不可发送'
			if (this.requiresVolunteerUnlock && !this.unlockStatusInitialized && this.unlockStatusLoading) {
				return '正在确认查分权限...'
			}
			if (this.showVolunteerUnlockPrompt) return '解锁后发送'
			const placeholder = normalizeText(this.composerPlaceholderOverride, '')
			if (this.isXiaochunluAgent && /(分数|位次|科类|城市|专业方向)/.test(placeholder)) {
				return '问我文章、业务或校园合伙人'
			}
			return placeholder || '直接提问'
		},
		showChatDebugPanel() {
			return shouldShowGaokaoDebugPanel(this.visualMode) && this.enableDebugTools
		},
		membershipDebugSummary() {
			const source = isRecord(this.currentUserProfileInfo) ? this.currentUserProfileInfo : {}
			const profile = isRecord(source.profile) ? source.profile : {}
			const membership = isRecord(source.membership) ? source.membership : {}
			const teamInfo = isRecord(source.team_info)
				? source.team_info
				: (isRecord(source.teamInfo) ? source.teamInfo : {})
			const partnerInfo = isRecord(source.partner_info)
				? source.partner_info
				: (isRecord(source.partnerInfo) ? source.partnerInfo : {})

			return {
				isCampusPartner: this.currentUserIsCampusPartner,
				userId: normalizeText(this.currentUserId, ''),
				nickname: normalizeText(this.currentUserName, ''),
				membershipSegment: normalizeText(source.membership_segment || source.membershipSegment || membership.segment || profile.membership_segment || '', ''),
				membershipSegmentLabel: normalizeText(source.membership_segment_label || source.membershipSegmentLabel || membership.segmentLabel || profile.membership_segment_label || '', ''),
				memberIdentity: normalizeText(source.memberIdentity || membership.memberIdentity || profile.memberIdentity || '', ''),
				memberIdentityLabel: normalizeText(source.memberIdentityLabel || membership.memberIdentityLabel || profile.memberIdentityLabel || '', ''),
				teamId: normalizeText(source.team_id || source.teamId || teamInfo.team_id || teamInfo.teamId || '', ''),
				teamStatus: normalizeText(teamInfo.status || '', ''),
				partnerStatus: normalizeText(partnerInfo.status || '', ''),
				profileSnapshot: this.currentUserProfileInfo || null
			}
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
		runtimeDebugSummary() {
			const runtime = this.runtimeDebugData || {}
			const streamEvents = Array.isArray(runtime.streamEvents) ? runtime.streamEvents : []
			const rawMessages = Array.isArray(runtime.rawMessages) ? runtime.rawMessages : []
			const formattedMessages = Array.isArray(runtime.formattedMessages) ? runtime.formattedMessages : []
			const frontendMessages = Array.isArray(this.messages) ? this.messages : []
			return {
				provider: normalizeText(runtime.provider, '[]'),
				model: normalizeText(runtime.model, '[]'),
				providerBaseUrl: normalizeText(runtime.baseUrl, '[]'),
				requestApi: normalizeText(runtime.requestApi, '[]'),
				requestMethod: normalizeText(runtime.requestMethod, '[]'),
				requestStartedAt: normalizeText(runtime.requestStartedAt, '[]'),
				firstReplyEvent: normalizeText(runtime.firstReplyEventType, '[]'),
				firstReplyAt: normalizeText(runtime.firstReplyAt, '[]'),
				firstReplyMs: Number(runtime.firstReplyMs) || 0,
				requestCompletedAt: normalizeText(runtime.requestCompletedAt, '[]'),
				requestTotalMs: Number(runtime.requestTotalMs) || 0,
				lastStatusCode: Number(runtime.lastStatusCode) || 0,
				streamEventCount: streamEvents.length,
				rawMessageCount: rawMessages.length,
				formattedMessageCount: formattedMessages.length,
				runtimeMessagesPath: normalizeText(runtime.runtimeMessagesPath, '[]'),
				error: normalizeText(runtime.error, '[]'),
				parseError: normalizeText(runtime.parseError, '[]'),
				lastStreamEvent: streamEvents.length
					? `${normalizeText(streamEvents[streamEvents.length - 1].type, '')}#${Number(streamEvents[streamEvents.length - 1].seq) || streamEvents.length}`
					: '[]',
				lastCompletedReply: formatDebugValue(runtime.lastCompletedPayload && (runtime.lastCompletedPayload.reply || runtime.lastCompletedPayload.message)),
				liveThinkingText: normalizeText(runtime.liveThinkingText, '[]'),
				liveRenderedText: normalizeText(runtime.liveRenderedText, '[]'),
				structuredRawMessages: buildStructuredDebugMessages(rawMessages),
				structuredFrontendMessages: buildStructuredDebugMessages(frontendMessages),
				structuredFormattedMessages: buildStructuredDebugMessages(formattedMessages),
				streamEventsJson: safeJsonStringify(streamEvents, '[]'),
				rawMessagesJson: safeJsonStringify(rawMessages, '[]'),
				frontendMessagesJson: safeJsonStringify(frontendMessages, '[]'),
				formattedMessagesJson: safeJsonStringify(formattedMessages, '[]')
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
		this.agentId = resolveAiChatAgentId(options.agentId || DEFAULT_AGENT_ID, DEFAULT_AGENT_ID)
		this.resolvedAgentId = this.agentId
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
		const shouldShowDebugPanel = shouldShowGaokaoDebugPanel(this.visualMode)
		this.enableDebugTools = shouldShowDebugPanel
		this.debugPanelOpen = shouldShowDebugPanel
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
			toggleDebugPanel() {
				this.debugPanelOpen = !this.debugPanelOpen
			},
			copyDebugSummary() {
				const lines = [
					`requestedAgentId: ${this.agentId}`,
					`resolvedAgentId: ${this.resolvedAgentId || '[]'}`,
					`resolvedAgentName: ${this.resolvedAgentName || this.assistantName || '[]'}`,
					`sessionId: ${this.sessionId}`,
					`transportMode: ${this.transportMode || '[]'}`,
					`provider: ${this.runtimeDebugSummary.provider}`,
					`model: ${this.runtimeDebugSummary.model}`,
					`requestApi: ${this.runtimeDebugSummary.requestApi}`,
					`requestTotalMs: ${this.runtimeDebugSummary.requestTotalMs}`,
					`lastStatusCode: ${this.runtimeDebugSummary.lastStatusCode}`,
					`本轮触发 skill: ${this.debugSummary.skillAttached}`,
					`已触发 skills: ${this.debugSummary.activatedSkills}`,
					`已加载 skill 文件: ${this.debugSummary.loadedSkillFiles}`,
					`skill 注入字符数: ${this.debugSummary.skillPromptChars}`,
					`skill 触发原因: ${this.debugSummary.skillMatchReason}`,
					`membershipDebug.isCampusPartner: ${this.membershipDebugSummary.isCampusPartner ? '是' : '否'}`,
					`membershipDebug.nickname: ${this.membershipDebugSummary.nickname || '[]'}`,
					`membershipDebug.teamId: ${this.membershipDebugSummary.teamId || '[]'}`,
					`membershipDebug.teamStatus: ${this.membershipDebugSummary.teamStatus || '[]'}`,
					`membershipDebug.partnerStatus: ${this.membershipDebugSummary.partnerStatus || '[]'}`,
					`membershipDebug.memberIdentity: ${this.membershipDebugSummary.memberIdentity || '[]'}`,
					`profileDebug.sessionId: ${this.profileDebugData.sessionId || this.sessionId || '[]'}`,
					`profileDebug.fetchedAt: ${this.profileDebugData.fetchedAt || '[]'}`,
					`profileDebug.error: ${this.profileDebugData.error || '[]'}`,
					`profileDebug.profileSnapshot: ${safeJsonStringify(this.profileDebugData.profileSnapshot, '[]')}`,
					`profileDebug.gaokaoSnapshot: ${safeJsonStringify(this.profileDebugData.gaokaoSnapshot, '[]')}`,
					`profileDebug.recentUserMessages: ${safeJsonStringify(this.profileDebugData.recentUserMessages, '[]')}`
				]
				this.copyText(lines.join('\n'))
			},
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
		openPromptRoute(routeUrl) {
			const targetUrl = normalizeText(routeUrl, '')
			if (!targetUrl) return false
			const plainPath = targetUrl.split('?')[0]
			const openPage = plainPath === '/pages/business/index'
				? uni.switchTab
				: uni.navigateTo
			openPage({
				url: plainPath === '/pages/business/index' ? plainPath : targetUrl,
				fail: () => {
					uni.showToast({ title: '页面打开失败', icon: 'none' })
				}
			})
			return true
		},
		applyPromptSelection(item) {
			const targetRoute = normalizeText(item && item.routeUrl, '')
			if (targetRoute) {
				return this.openPromptRoute(targetRoute)
			}

			const fixedReply = normalizeText(
				typeof this.resolveFixedQaReply === 'function'
					? this.resolveFixedQaReply(item)
					: item && (item.reply || item.fixedReply),
				''
			)
			if (fixedReply) {
				const promptText = normalizeText(item && (item.action || item.label || item.question), '')
				if (promptText && typeof this.appendUserMessage === 'function') {
					this.appendUserMessage(promptText)
				}
				this.appendAssistantMessage(fixedReply)
				this.scrollToBottom()
				return true
			}

			const prompt = normalizeText(item && (item.action || item.label), '')
			if (!prompt) return false
			this.draftText = prompt
			return true
		},
		handleIntroPromptSelect(item) {
			this.applyPromptSelection(item)
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
