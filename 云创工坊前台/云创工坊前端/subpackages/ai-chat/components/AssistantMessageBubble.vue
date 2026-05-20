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
			<ChatArticleCardList
				v-if="articleCards.length"
				class="message-article-cards"
				:cards="articleCards"
			/>
			<ChatBusinessCardList
				v-if="businessCards.length"
				class="message-business-cards"
				:cards="businessCards"
			/>
			<ChatGoalCardList
				v-if="goalCards.length"
				class="message-goal-cards"
				:cards="goalCards"
			/>
				<ChatSchoolCardList
					v-if="schoolCards.length"
					class="message-school-cards"
					:cards="schoolCards"
					@select="$emit('school-card-tap', $event)"
				/>
			<ChatInviteCardList
				v-if="inviteCards.length"
				class="message-invite-cards"
				:cards="inviteCards"
			/>
				<ChatMembershipCardList
					v-if="membershipCards.length"
					class="message-membership-cards"
					:cards="membershipCards"
					@select="$emit('membership-action', $event)"
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
import ChatBusinessCardList from './ChatBusinessCardList.vue'
import ChatGoalCardList from './ChatGoalCardList.vue'
import ChatArticleCardList from './ChatArticleCardList.vue'
import ChatSchoolCardList from './ChatSchoolCardList.vue'
import ChatInviteCardList from './ChatInviteCardList.vue'
import ChatMembershipCardList from './ChatMembershipCardList.vue'
import ChatChoiceCard from './ChatChoiceCard.vue'
import { normalizeAvatarUrl } from '@/utils/avatar.js'

export default {
	name: 'AssistantMessageBubble',
	components: {
		ChatRichText,
		ToolCallListCard,
		ChatBusinessCardList,
		ChatGoalCardList,
		ChatArticleCardList,
		ChatSchoolCardList,
		ChatInviteCardList,
		ChatMembershipCardList,
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
			avatarLoadFailed: false
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
			return this.displayMode === 'xiaochunlu' ? [] : this.toolCalls
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
		shouldRenderMessageCard() {
			return Boolean(this.text)
		}
	},
	watch: {
		avatarUrl() {
			this.avatarLoadFailed = false
		}
	},
	methods: {
		handleAvatarError() {
			this.avatarLoadFailed = true
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
	max-width: calc(100% - 170rpx);
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

.message-card {
	width: 100%;
	max-width: 100%;
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
.message-article-cards,
.message-business-cards,
.message-goal-cards,
.message-school-cards,
.message-invite-cards,
.message-membership-cards,
.message-choice-card {
	margin-top: 8rpx;
	width: 100%;
	max-width: 100%;
	min-width: 0;
}
</style>
