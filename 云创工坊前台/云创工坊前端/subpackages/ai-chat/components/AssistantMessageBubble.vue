<template>
	<view class="assistant-message">
		<view class="avatar-wrap">
			<view class="avatar-shell" :class="avatarShellClass">
				<image
					v-if="resolvedAvatarUrl"
					class="avatar-image"
					:src="resolvedAvatarUrl"
					mode="aspectFill"
					@error="handleAvatarError"
				/>
				<view v-else class="avatar-fallback" :class="avatarFallbackClass">
					<text class="avatar-fallback-text">{{ resolvedInitial }}</text>
				</view>
			</view>
			<view class="ai-badge" :class="aiBadgeClass">
				<text class="ai-badge-text">AI</text>
			</view>
		</view>

		<view class="message-content">
			<text class="message-name">{{ name }}</text>
			<view v-if="hasThinkingText" class="thinking-card" :class="{ 'thinking-card-open': thinkingExpanded }">
				<view class="thinking-card-head" @tap="toggleThinking">
					<view class="thinking-title-row">
						<text class="thinking-title">思考</text>
						<view class="thinking-state-chip">
							<text class="thinking-state-chip-text">{{ thinkingExpanded ? '收起' : '展开' }}</text>
						</view>
					</view>
					<text class="thinking-preview" :class="{ 'thinking-preview-animated': shouldAnimateThinkingPreview }">
						{{ currentThinkingPreview }}
					</text>
				</view>
				<scroll-view
					v-if="thinkingExpanded"
					class="thinking-body"
					scroll-y="true"
					:show-scrollbar="false"
				>
					<text class="thinking-body-text">{{ normalizedThinkingText }}</text>
				</scroll-view>
			</view>
			<view v-if="shouldRenderMessageCard" class="message-card">
				<slot>
					<ChatRichText v-if="text" :text="text" tone="assistant" />
				</slot>
			</view>
			<ToolCallListCard
				v-if="visibleToolCalls.length"
				class="message-tool-calls"
				:tools="visibleToolCalls"
			/>
			<ChatXiaochunluHardcodedCards
				v-if="unifiedShortcutCards.length"
				class="message-unified-shortcut-cards"
				:cards="unifiedShortcutCards"
				@select="handleShortcutCardSelect"
			/>
			<ChatSchoolCardList
				v-if="schoolCards.length"
				class="message-school-cards"
				:cards="schoolCards"
				@select="$emit('school-card-tap', $event)"
				@copy-url="$emit('school-card-copy', $event)"
			/>
			<ChatInviteCardList
				v-if="inviteCards.length"
				class="message-invite-cards"
				:cards="inviteCards"
			/>
			<ChatChoiceCard
				v-for="card in choiceCards"
				:key="card.id"
				class="message-choice-card"
				:question="card.question"
				:helper-text="card.helperText"
				:options="card.options"
				:disabled="cardDisabled"
				@select="$emit('choice-select', $event)"
			/>
		</view>
	</view>
</template>

<script>
import ChatRichText from './ChatRichText.vue'
import ToolCallListCard from './ToolCallListCard.vue'
import ChatXiaochunluHardcodedCards from './ChatXiaochunluHardcodedCards.vue'
import ChatSchoolCardList from './ChatSchoolCardList.vue'
import ChatInviteCardList from './ChatInviteCardList.vue'
import ChatChoiceCard from './ChatChoiceCard.vue'
import { normalizeAvatarUrl } from '@/utils/avatar.js'
import { DEFAULT_AGENT_ID } from '../utils/chat-auth.js'
import {
	GAOKAO_CONSULTANT_AVATAR_URL,
	XIAOCHUNLU_AVATAR_URL,
	XIAOCHUNLU_TOPIC_IMAGE_URLS
} from '../utils/agent-ui-config.js'

export default {
	name: 'AssistantMessageBubble',
	components: {
		ChatRichText,
		ToolCallListCard,
		ChatXiaochunluHardcodedCards,
		ChatSchoolCardList,
		ChatInviteCardList,
		ChatChoiceCard
	},
	props: {
		name: {
			type: String,
			default: 'AI 导师'
		},
		avatarUrl: {
			type: String,
			default: ''
		},
		text: {
			type: String,
			default: ''
		},
		thinkingText: {
			type: String,
			default: ''
		},
		toolCalls: {
			type: Array,
			default: () => []
		},
		businessCards: {
			type: Array,
			default: () => []
		},
		goalCards: {
			type: Array,
			default: () => []
		},
		articleCards: {
			type: Array,
			default: () => []
		},
		schoolCards: {
			type: Array,
			default: () => []
		},
		inviteCards: {
			type: Array,
			default: () => []
		},
		membershipCards: {
			type: Array,
			default: () => []
		},
		currentUserIsCampusPartner: {
			type: Boolean,
			default: false
		},
		choiceCards: {
			type: Array,
			default: () => []
		},
		cardDisabled: {
			type: Boolean,
			default: false
		},
		displayMode: {
			type: String,
			default: 'default'
		}
	},
	data() {
		return {
			avatarLoadFailed: false,
			thinkingExpanded: false,
			thinkingPreviewTick: 0,
			thinkingPreviewTimer: null
		}
	},
	computed: {
		resolvedAvatarUrl() {
			if (this.avatarLoadFailed) return ''
			return this.avatarUrl ? normalizeAvatarUrl(this.avatarUrl, '') : ''
		},
		resolvedInitial() {
			return String(this.name || 'AI').trim().slice(0, 1).toUpperCase() || 'AI'
		},
		isVisualImageMode() {
			return this.displayMode === 'xiaochunlu' || this.displayMode === 'gaokao'
		},
		visibleToolCalls() {
			return Array.isArray(this.toolCalls) ? this.toolCalls : []
		},
		visibleMembershipCards() {
			const cards = Array.isArray(this.membershipCards) ? this.membershipCards : []
			return this.currentUserIsCampusPartner
				? cards.filter((card) => String(card && card.cardType || '').trim() !== 'campus_partner')
				: cards
		},
		unifiedShortcutCards() {
			const articleCards = Array.isArray(this.articleCards)
				? this.articleCards.map((card) => this.normalizeArticleShortcutCard(card)).filter(Boolean)
				: []
			const businessCards = Array.isArray(this.businessCards)
				? this.businessCards.map((card) => this.normalizeBusinessShortcutCard(card)).filter(Boolean)
				: []
			const goalCards = Array.isArray(this.goalCards)
				? this.goalCards.map((card) => this.normalizeGoalShortcutCard(card)).filter(Boolean)
				: []
			const membershipCards = this.visibleMembershipCards
				.map((card) => this.normalizeMembershipShortcutCard(card))
				.filter(Boolean)

			return [...articleCards, ...businessCards, ...goalCards, ...membershipCards]
		},
		avatarShellClass() {
			return this.isVisualImageMode ? 'avatar-shell-xiaochunlu' : ''
		},
		avatarFallbackClass() {
			return this.isVisualImageMode ? 'avatar-fallback-xiaochunlu' : ''
		},
		aiBadgeClass() {
			return this.isVisualImageMode ? 'ai-badge-xiaochunlu' : ''
		},
		normalizedThinkingText() {
			return this.normalizeThinkingText(this.thinkingText)
		},
		thinkingSegments() {
			return this.splitThinkingSegments(this.normalizedThinkingText)
		},
		hasThinkingText() {
			return Boolean(this.normalizedThinkingText)
		},
		shouldAnimateThinkingPreview() {
			return !this.thinkingExpanded && this.thinkingSegments.length > 1
		},
		currentThinkingPreview() {
			if (!this.thinkingSegments.length) {
				return '正在整理思路'
			}
			if (this.shouldAnimateThinkingPreview) {
				return this.thinkingSegments[this.thinkingPreviewTick % this.thinkingSegments.length] || this.thinkingSegments[0]
			}
			return this.thinkingSegments[0]
		},
		shouldRenderMessageCard() {
			return Boolean(this.text)
		}
	},
	watch: {
		avatarUrl() {
			this.avatarLoadFailed = false
		},
		thinkingText: {
			immediate: true,
			handler(nextValue) {
				if (!String(nextValue || '').trim()) {
					this.thinkingExpanded = false
					this.stopThinkingPreviewTicker()
					return
				}
				if (!this.thinkingExpanded) {
					this.startThinkingPreviewTicker()
				}
			}
		}
	},
	mounted() {
		this.startThinkingPreviewTicker()
	},
	beforeDestroy() {
		this.stopThinkingPreviewTicker()
	},
	methods: {
		resolveArticleMeta(card = {}) {
			const tags = Array.isArray(card.tags) ? card.tags.filter(Boolean).slice(0, 2) : []
			if (card.categoryTitle && tags.length) {
				return `${card.categoryTitle} · ${tags.join(' · ')}`
			}
			if (card.categoryTitle) return card.categoryTitle
			if (tags.length) return tags.join(' · ')
			return '文章推荐'
		},
		resolveBusinessRoute(card = {}) {
			const explicitRoute = String(card.routeUrl || card.url || '').trim()
			if (explicitRoute) return explicitRoute
			const businessId = String(card.businessId || card.id || '').trim()
			if (!businessId) return ''
			const query = [`id=${encodeURIComponent(businessId)}`]
			const title = String(card.title || '').trim()
			if (title) query.push(`category=${encodeURIComponent(title)}`)
			query.push(`type=${encodeURIComponent(card.hasSignup ? 'signup' : 'consult')}`)
			if (businessId === '15') query.push('source=ai_chat_business')
			return `/pages/extra/signup/index?${query.join('&')}`
		},
		normalizeArticleShortcutCard(card = {}) {
			const articleId = String(card.articleId || '').trim()
			const title = String(card.title || '').trim()
			if (!articleId || !title) return null
			return {
				id: card.id || `article-${articleId}`,
				title,
				badge: card.unlocked ? '已解锁' : '文章卡片',
				summary: String(card.summary || '').trim(),
				meta: this.resolveArticleMeta(card),
				buttonText: '去看文章',
				coverImageUrl: XIAOCHUNLU_TOPIC_IMAGE_URLS.business,
				themeClass: 'hardcoded-card-article',
				actionType: 'article',
				articleId,
				tags: Array.isArray(card.tags) ? card.tags.filter(Boolean).slice(0, 2) : [],
				visualLabel: String(card.categoryTitle || '文章').trim()
			}
		},
		normalizeBusinessShortcutCard(card = {}) {
			const businessId = String(card.businessId || '').trim()
			const title = String(card.title || '').trim()
			if (!businessId || !title) return null
			return {
				id: card.id || `business-${businessId}`,
				title,
				badge: String(card.tag || '业务入口').trim(),
				summary: String(card.summary || '').trim(),
				meta: card.hasSignup ? '适合直接查看报名与详情' : '适合先看服务说明',
				buttonText: card.hasSignup ? '去看业务' : '去咨询',
				coverImageUrl: XIAOCHUNLU_TOPIC_IMAGE_URLS.business,
				themeClass: 'hardcoded-card-xiaochunlu',
				actionType: 'route',
				routeUrl: this.resolveBusinessRoute(card),
				tags: [],
				visualLabel: '业务'
			}
		},
		normalizeGoalShortcutCard(card = {}) {
			const routeUrl = String(card.routeUrl || '').trim()
			const title = String(card.title || '').trim()
			if (!routeUrl || !title) return null
			return {
				id: card.id || `goal-${title}`,
				title,
				badge: '成长动作',
				summary: String(card.summary || '').trim(),
				meta: '先把当前目标和节奏定下来',
				buttonText: String(card.buttonText || '去设目标').trim(),
				coverImageUrl: XIAOCHUNLU_TOPIC_IMAGE_URLS.business,
				themeClass: 'hardcoded-card-xiaochunlu',
				actionType: 'route',
				routeUrl,
				tags: [],
				visualLabel: '目标'
			}
		},
		normalizeMembershipShortcutCard(card = {}) {
			const cardType = String(card.cardType || '').trim()
			if (!cardType) return null
			const isGaokaoCard = cardType === 'gaokao_teacher' || cardType === 'campus_score_ambassador'
			const fallbackAvatarUrl = isGaokaoCard ? GAOKAO_CONSULTANT_AVATAR_URL : XIAOCHUNLU_AVATAR_URL
			return {
				id: card.id || `membership-${cardType}`,
				title: String(card.title || '').trim(),
				badge: String(card.badge || '').trim(),
				summary: String(card.summary || '').trim(),
				meta: String(card.pillText || '').trim(),
				buttonText: String(card.buttonText || '立即前往').trim(),
				avatarUrl: String(card.avatarUrl || fallbackAvatarUrl || '').trim(),
				themeClass: isGaokaoCard ? 'hardcoded-card-gaokao' : 'hardcoded-card-xiaochunlu',
				actionType: isGaokaoCard ? 'switch-agent' : 'route',
				agentId: isGaokaoCard ? DEFAULT_AGENT_ID : '',
				routeUrl: isGaokaoCard ? '' : String(card.routeUrl || '').trim(),
				tags: Array.isArray(card.benefits) ? card.benefits.filter(Boolean).slice(0, 2) : [],
				visualLabel: isGaokaoCard ? '高考' : '团队'
			}
		},
		handleShortcutCardSelect(card = {}) {
			this.$emit('shortcut-select', card)
		},
		handleAvatarError() {
			this.avatarLoadFailed = true
		},
		normalizeThinkingText(value = '') {
			return String(value || '')
				.replace(/\r\n/g, '\n')
				.replace(/\n{3,}/g, '\n\n')
				.trim()
		},
		splitThinkingSegments(value = '') {
			const source = String(value || '').trim()
			if (!source) return []
			return source
				.split(/[\n。！？!?；;]+/g)
				.map((item) => String(item || '').trim())
				.filter(Boolean)
				.slice(0, 8)
		},
		startThinkingPreviewTicker() {
			this.stopThinkingPreviewTicker()
			if (!this.hasThinkingText || this.thinkingSegments.length <= 1 || this.thinkingExpanded) return
			this.thinkingPreviewTimer = setInterval(() => {
				this.thinkingPreviewTick = (this.thinkingPreviewTick + 1) % this.thinkingSegments.length
			}, 1600)
		},
		stopThinkingPreviewTicker() {
			if (this.thinkingPreviewTimer) {
				clearInterval(this.thinkingPreviewTimer)
				this.thinkingPreviewTimer = null
			}
			this.thinkingPreviewTick = 0
		},
		toggleThinking() {
			if (!this.hasThinkingText) return
			this.thinkingExpanded = !this.thinkingExpanded
			if (this.thinkingExpanded) {
				this.stopThinkingPreviewTicker()
				return
			}
			this.startThinkingPreviewTicker()
		}
	}
}
</script>

<style scoped>
.assistant-message {
	display: flex;
	align-items: flex-start;
	gap: 20rpx;
	width: 100%;
	max-width: 100%;
	min-width: 0;
	box-sizing: border-box;
}

.avatar-wrap {
	position: relative;
	width: 80rpx;
	height: 80rpx;
	flex-shrink: 0;
	overflow: visible;
}

.avatar-shell {
	width: 80rpx;
	height: 80rpx;
	border-radius: 999rpx;
	overflow: hidden;
	border: 2rpx solid rgba(255, 215, 0, 0.82);
	box-shadow: 0 0 28rpx rgba(255, 215, 0, 0.28);
	background: linear-gradient(135deg, #fff7da, #ffd778);
}

.avatar-shell-xiaochunlu {
	border-color: rgba(150, 210, 255, 0.96);
	box-shadow: 0 0 30rpx rgba(150, 210, 255, 0.34);
	background: linear-gradient(135deg, #eef8ff, #c6e4ff);
}

.avatar-image {
	display: block;
	width: 100%;
	height: 100%;
}

.avatar-fallback {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 100%;
	height: 100%;
	background: linear-gradient(135deg, #ffd700, #ffc247);
}

.avatar-fallback-xiaochunlu {
	background: linear-gradient(135deg, #d9f1ff, #8ecfff);
}

.avatar-fallback-text {
	font-size: 30rpx;
	font-weight: 800;
	color: #050505;
}

.ai-badge {
	position: absolute;
	right: -8rpx;
	bottom: -4rpx;
	padding: 3rpx 8rpx;
	border-radius: 8rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	background: #ffd700;
	border: 1rpx solid #1a1a1a;
	box-sizing: border-box;
	line-height: 1;
	z-index: 10;
}

.ai-badge-xiaochunlu {
	background: linear-gradient(135deg, #d8f0ff, #8dccff);
	border-color: rgba(76, 132, 185, 0.22);
}

.ai-badge-text {
	font-size: 16rpx;
	font-weight: 900;
	line-height: 1;
	color: #ffffff;
}

.message-content {
	flex: 1;
	max-width: calc(100% - 150rpx);
	min-width: 0;
	display: flex;
	flex-direction: column;
	gap: 10rpx;
}

.message-name {
	font-size: 22rpx;
	color: rgba(57, 77, 124, 0.72);
	padding-left: 6rpx;
}

.thinking-card {
	width: 560rpx;
	max-width: calc(100vw - 190rpx);
	min-width: 0;
	box-sizing: border-box;
	padding: 18rpx 20rpx;
	border-radius: 26rpx;
	background: linear-gradient(180deg, rgba(248, 250, 252, 0.98), rgba(236, 241, 246, 0.98));
	border: 1rpx solid rgba(148, 163, 184, 0.28);
	box-shadow: 0 12rpx 26rpx rgba(71, 85, 105, 0.06);
	color: #5b6472;
}

.thinking-card-open {
	padding-bottom: 14rpx;
}

.thinking-card-head {
	display: flex;
	flex-direction: column;
	gap: 10rpx;
}

.thinking-title-row {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 12rpx;
}

.thinking-title {
	font-size: 20rpx;
	font-weight: 700;
	color: #6b7280;
}

.thinking-state-chip {
	display: inline-flex;
	align-items: center;
	padding: 2rpx 10rpx;
	border-radius: 999rpx;
	background: rgba(148, 163, 184, 0.14);
}

.thinking-state-chip-text {
	font-size: 18rpx;
	font-weight: 600;
	color: #718096;
}

.thinking-preview {
	font-size: 22rpx;
	line-height: 1.45;
	color: #6b7280;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.thinking-preview-animated {
	opacity: 0.95;
}

.thinking-body {
	margin-top: 10rpx;
	height: 220rpx;
}

.thinking-body-text {
	display: block;
	font-size: 22rpx;
	line-height: 1.7;
	color: #4b5563;
	white-space: pre-wrap;
	word-break: break-word;
	overflow-wrap: anywhere;
}

.message-card {
	width: 560rpx;
	max-width: calc(100vw - 190rpx);
	min-width: 560rpx;
	box-sizing: border-box;
	padding: 26rpx;
	border-radius: 30rpx;
	border-top-left-radius: 10rpx;
	background: rgba(255, 255, 255, 0.9);
	border: 1rpx solid rgba(166, 183, 227, 0.3);
	box-shadow: 0 18rpx 34rpx rgba(81, 103, 151, 0.08);
	backdrop-filter: blur(12px);
}

.message-tool-calls,
.thinking-card,
.message-unified-shortcut-cards,
.message-school-cards,
.message-invite-cards,
.message-choice-card {
	margin-top: 8rpx;
	width: 560rpx;
	max-width: calc(100vw - 190rpx);
	min-width: 0;
}

.message-unified-shortcut-cards {
	width: calc(100vw - 150rpx);
	max-width: calc(100vw - 150rpx);
}

@media (max-width: 750rpx) {
	.message-card,
	.thinking-card,
	.message-tool-calls,
	.message-school-cards,
	.message-invite-cards,
	.message-choice-card {
		width: calc(100vw - 190rpx);
		min-width: 0;
	}

	.message-unified-shortcut-cards {
		width: calc(100vw - 150rpx);
		max-width: calc(100vw - 150rpx);
		min-width: 0;
	}
}
</style>
