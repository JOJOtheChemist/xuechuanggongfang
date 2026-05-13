<template>
	<scroll-view
		class="message-panel"
		scroll-y="true"
		scroll-with-animation
		:scroll-into-view="scrollIntoViewTarget"
	>
		<view class="message-list">
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
					:text="message.content"
					:business-cards="message.businessCards || []"
					:article-cards="message.articleCards || []"
					:invite-cards="message.inviteCards || []"
				/>
				<UserMessageBubble
					v-else
					name="我"
					:text="message.content"
				/>
			</view>

			<view v-if="isSending" class="message-row message-row-ai">
				<view class="message-avatar">AI</view>
				<view class="typing-bubble">
					<view class="typing-dot"></view>
					<view class="typing-dot"></view>
					<view class="typing-dot"></view>
				</view>
			</view>

			<view id="chat-bottom" class="chat-bottom"></view>
		</view>
	</scroll-view>
</template>

<script>
import AssistantMessageBubble from './AssistantMessageBubble.vue'
import UserMessageBubble from './UserMessageBubble.vue'

export default {
	name: 'ChatMessagePanel',
	components: {
		AssistantMessageBubble,
		UserMessageBubble
	},
	props: {
		assistantName: {
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
		scrollIntoViewTarget: {
			type: String,
			default: ''
		}
	}
}
</script>

<style scoped>
.message-panel {
	flex: 1;
	min-height: 0;
	border-radius: 30rpx;
	background: rgba(255, 255, 255, 0.76);
	border: 1rpx solid rgba(34, 78, 68, 0.08);
	box-shadow: 0 24rpx 60rpx rgba(30, 88, 74, 0.12);
	backdrop-filter: blur(12px);
}

.message-list {
	padding: 24rpx;
	display: flex;
	flex-direction: column;
	gap: 18rpx;
	box-sizing: border-box;
}

.message-row {
	display: flex;
	flex-direction: column;
}

.message-row-ai {
	align-items: flex-start;
}

.message-row-user {
	align-items: flex-end;
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

.typing-bubble {
	display: flex;
	align-items: center;
	gap: 8rpx;
	padding: 22rpx 26rpx;
	border-radius: 30rpx;
	border-top-left-radius: 10rpx;
	background: linear-gradient(135deg, #ffd700, #ffc247);
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
	height: 1rpx;
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
