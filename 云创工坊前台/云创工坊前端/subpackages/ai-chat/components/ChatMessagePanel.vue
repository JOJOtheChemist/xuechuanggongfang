<template>
	<scroll-view
		class="message-panel"
		:class="displayModeClass"
		scroll-y="true"
		scroll-with-animation
		:scroll-into-view="scrollIntoViewTarget"
	>
		<view class="message-list">
			<slot name="top-content"></slot>
			<view
				v-for="message in messages"
				:id="`msg-${message.id}`"
				:key="message.id"
				class="message-row"
				:class="message.role === 'user' ? 'message-row-user' : 'message-row-ai'"
			>
				<AssistantMessageBubble
					v-if="message.role === 'assistant'"
					:name="assistantName"
					:avatar-url="assistantAvatarUrl"
					:text="message.content"
					:tool-calls="message.toolCalls || message.tools || []"
					:business-cards="message.businessCards || []"
					:goal-cards="message.goalCards || []"
					:article-cards="message.articleCards || []"
					:school-cards="message.schoolCards || []"
					:invite-cards="message.inviteCards || []"
					:membership-cards="message.membershipCards || []"
					:choice-cards="message.choiceCards || []"
					:card-disabled="isSending"
					:display-mode="displayMode"
					@membership-action="$emit('membership-action', $event)"
					@school-card-tap="$emit('school-card-tap', $event)"
					@choice-select="$emit('choice-select', $event)"
				/>
				<UserMessageBubble
					v-else
					:name="currentUserName"
					:avatar-url="currentUserAvatarUrl"
					:text="message.content"
				/>
			</view>

			<view v-if="showTypingIndicator" class="message-row message-row-ai">
				<view class="typing-message">
					<view class="message-avatar-shell" :class="messageAvatarShellClass">
						<image
							v-if="resolvedAssistantAvatarUrl"
							class="message-avatar-image"
							:src="resolvedAssistantAvatarUrl"
							mode="aspectFill"
							@error="handleAssistantAvatarError"
						/>
						<view v-else class="message-avatar" :class="messageAvatarClass">AI</view>
					</view>
					<view class="typing-bubble" :class="typingBubbleClass">
						<text class="typing-text">{{ currentTypingMessage }}</text>
						<view class="typing-dots">
							<view class="typing-dot"></view>
							<view class="typing-dot"></view>
							<view class="typing-dot"></view>
						</view>
					</view>
				</view>
			</view>

			<view id="chat-bottom" class="chat-bottom" :style="bottomAnchorStyle"></view>
		</view>
	</scroll-view>
</template>

<script>
import AssistantMessageBubble from './AssistantMessageBubble.vue'
import UserMessageBubble from './UserMessageBubble.vue'
import { normalizeAvatarUrl } from '@/utils/avatar.js'

export default {
	name: 'ChatMessagePanel',
	components: {
		AssistantMessageBubble,
		UserMessageBubble
	},
	data() {
		return {
			assistantAvatarLoadFailed: false,
			typingMessageIndex: 0,
			typingMessageTimer: null
		}
	},
	props: {
		assistantName: {
			type: String,
			default: ''
		},
		assistantAvatarUrl: {
			type: String,
			default: ''
		},
		currentUserName: {
			type: String,
			default: '我'
		},
		currentUserAvatarUrl: {
			type: String,
			default: ''
		},
		messages: {
			type: Array,
			default: () => []
		},
		isSending: {
			type: Boolean,
			default: false
		},
		showTypingIndicator: {
			type: Boolean,
			default: false
		},
		scrollIntoViewTarget: {
			type: String,
			default: ''
		},
		bottomSpaceRpx: {
			type: Number,
			default: 50
		},
		displayMode: {
			type: String,
			default: 'default'
		}
	},
	emits: ['membership-action', 'school-card-tap', 'choice-select'],
	computed: {
		displayModeClass() {
			return this.isVisualImageMode ? 'message-panel-xiaochunlu' : ''
		},
		resolvedAssistantAvatarUrl() {
			if (this.assistantAvatarLoadFailed) return ''
			return this.assistantAvatarUrl ? normalizeAvatarUrl(this.assistantAvatarUrl, '') : ''
		},
		isVisualImageMode() {
			return this.displayMode === 'xiaochunlu' || this.displayMode === 'gaokao'
		},
		messageAvatarClass() {
			return this.isVisualImageMode ? 'message-avatar-xiaochunlu' : ''
		},
		messageAvatarShellClass() {
			return this.isVisualImageMode ? 'message-avatar-shell-xiaochunlu' : ''
		},
		typingBubbleClass() {
			return this.isVisualImageMode ? 'typing-bubble-xiaochunlu' : ''
		},
		typingMessages() {
			if (this.displayMode === 'gaokao') {
				return [
					'正在结合你的分数、位次和偏好细化判断',
					'正在补充云南院校与专业方向的相关资料',
					'正在对比更适合你的志愿梯度与选择范围',
					'正在整理一份更贴近你情况的建议'
				]
			}
			if (this.displayMode === 'xiaochunlu') {
				return [
					'正在结合你的问题补充相关信息',
					'正在整理和你当前需求更接近的资料',
					'正在细化更适合你的回应方向',
					'正在把建议整理得更清楚一些'
				]
			}
			return [
				'正在结合你的问题整理信息',
				'正在补充相关资料与线索',
				'正在整理更清楚的回复内容'
			]
		},
		currentTypingMessage() {
			if (!this.typingMessages.length) return '正在思考中'
			return this.typingMessages[this.typingMessageIndex] || this.typingMessages[0]
		},
		bottomAnchorStyle() {
			return `height:${Math.max(1, Number(this.bottomSpaceRpx) || 0)}rpx;`
		}
	},
	watch: {
		assistantAvatarUrl() {
			this.assistantAvatarLoadFailed = false
		},
		showTypingIndicator: {
			immediate: true,
			handler(nextValue) {
				if (nextValue) {
					this.startTypingMessageRotation()
					return
				}
				this.stopTypingMessageRotation()
			}
		}
	},
	beforeDestroy() {
		this.stopTypingMessageRotation()
	},
	methods: {
		handleAssistantAvatarError() {
			this.assistantAvatarLoadFailed = true
		},
		startTypingMessageRotation() {
			this.stopTypingMessageRotation()
			this.typingMessageIndex = 0
			if (this.typingMessages.length <= 1) return
			this.typingMessageTimer = setInterval(() => {
				this.typingMessageIndex = (this.typingMessageIndex + 1) % this.typingMessages.length
			}, 1600)
		},
		stopTypingMessageRotation() {
			if (this.typingMessageTimer) {
				clearInterval(this.typingMessageTimer)
				this.typingMessageTimer = null
			}
			this.typingMessageIndex = 0
		}
	}
}
</script>

<style scoped>
.message-panel {
	flex: 1;
	min-height: 0;
	width: 100%;
	max-width: 100%;
	overflow-x: hidden;
	padding: 0 24rpx;
	box-sizing: border-box;
}

.message-panel-xiaochunlu {
	margin-top: -4rpx;
}

.message-list {
	padding: 0 0 12rpx;
	display: flex;
	flex-direction: column;
	gap: 18rpx;
	width: 100%;
	max-width: 100%;
	box-sizing: border-box;
}

.message-row {
	display: flex;
	flex-direction: column;
	width: 100%;
	max-width: 100%;
	min-width: 0;
}

.message-row-ai {
	align-items: flex-start;
}

.message-row-user {
	align-items: flex-end;
}

.typing-message {
	display: flex;
	align-items: flex-start;
	gap: 20rpx;
	width: 100%;
	max-width: 100%;
	min-width: 0;
}

.message-avatar {
	width: 54rpx;
	height: 54rpx;
	border-radius: 18rpx;
	background: linear-gradient(135deg, #1f7a67, #4db8a0);
	color: #ffffff;
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 22rpx;
	font-weight: 900;
	margin-bottom: 10rpx;
}

.message-avatar-xiaochunlu {
	background: linear-gradient(135deg, #d9f1ff, #8ecfff);
}

.message-avatar-shell {
	width: 54rpx;
	height: 54rpx;
	border-radius: 18rpx;
	overflow: hidden;
	margin-bottom: 10rpx;
	background: #ffffff;
	box-shadow: 0 10rpx 20rpx rgba(31, 122, 103, 0.14);
}

.message-avatar-shell-xiaochunlu {
	box-shadow: 0 12rpx 24rpx rgba(141, 204, 255, 0.26);
}

.message-avatar-image {
	display: block;
	width: 100%;
	height: 100%;
}

.typing-bubble {
	display: flex;
	flex-direction: column;
	align-items: flex-start;
	gap: 10rpx;
	width: auto;
	max-width: calc(100% - 74rpx);
	min-width: 0;
	padding: 22rpx 26rpx 20rpx;
	border-radius: 30rpx;
	border-top-left-radius: 10rpx;
	background: linear-gradient(135deg, #ffd700, #ffc247);
	box-sizing: border-box;
}

.typing-bubble-xiaochunlu {
	background: linear-gradient(135deg, #dff1ff, #b4d7ff);
}

.typing-text {
	font-size: 24rpx;
	line-height: 1.55;
	font-weight: 600;
	color: rgba(44, 27, 0, 0.82);
	white-space: normal;
	word-break: break-all;
}

.typing-dots {
	display: flex;
	align-items: center;
	gap: 8rpx;
}

.typing-dot {
	width: 10rpx;
	height: 10rpx;
	border-radius: 999rpx;
	background: rgba(44, 27, 0, 0.58);
	animation: typingPulse 1s infinite ease-in-out;
}

.typing-dot:nth-child(2) {
	animation-delay: 0.16s;
}

.typing-dot:nth-child(3) {
	animation-delay: 0.32s;
}

.chat-bottom {
	width: 100%;
	flex-shrink: 0;
}

@keyframes typingPulse {
	0%, 80%, 100% {
		transform: translateY(0);
		opacity: 0.45;
	}
	40% {
		transform: translateY(-5rpx);
		opacity: 1;
	}
}
</style>
