<template>
	<view class="assistant-message">
		<view class="avatar-wrap">
			<view class="avatar-shell">
				<view class="avatar-fallback">
					<text class="avatar-fallback-text">{{ resolvedInitial }}</text>
				</view>
			</view>
			<view class="ai-badge">
				<text class="ai-badge-text">AI</text>
			</view>
		</view>

		<view class="message-content">
			<text class="message-name">{{ name }}</text>
			<view class="message-card">
				<slot>
					<ChatRichText v-if="text" :text="text" tone="assistant" />
					<ChatBusinessCardList :cards="businessCards" />
					<ChatArticleCardList :cards="articleCards" />
					<ChatInviteCardList :cards="inviteCards" />
				</slot>
			</view>
		</view>
	</view>
</template>

<script>
import ChatRichText from './ChatRichText.vue'
import ChatBusinessCardList from './ChatBusinessCardList.vue'
import ChatArticleCardList from './ChatArticleCardList.vue'
import ChatInviteCardList from './ChatInviteCardList.vue'

export default {
	name: 'AssistantMessageBubble',
	components: {
		ChatRichText,
		ChatBusinessCardList,
		ChatArticleCardList,
		ChatInviteCardList
	},
	props: {
		name: {
			type: String,
			default: 'AI 导师'
		},
		text: {
			type: String,
			default: ''
		},
		businessCards: {
			type: Array,
			default: () => []
		},
		articleCards: {
			type: Array,
			default: () => []
		},
		inviteCards: {
			type: Array,
			default: () => []
		}
	},
	computed: {
		resolvedInitial() {
			return String(this.name || 'AI').trim().slice(0, 1).toUpperCase() || 'AI'
		}
	}
}
</script>

<style scoped>
.assistant-message {
	display: flex;
	align-items: flex-start;
	gap: 20rpx;
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
	background: #151515;
}

.avatar-fallback {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 100%;
	height: 100%;
	background: linear-gradient(135deg, #ffd700, #ffc247);
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

.ai-badge-text {
	font-size: 16rpx;
	font-weight: 900;
	line-height: 1;
	color: #000000;
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
	color: rgba(255, 215, 0, 0.88);
	padding-left: 6rpx;
}

.message-card {
	padding: 26rpx;
	border-radius: 30rpx;
	border-top-left-radius: 10rpx;
	background: linear-gradient(135deg, #ffd700, #ffc247);
	border: 1rpx solid rgba(255, 215, 0, 0.82);
	box-shadow: 0 14rpx 34rpx rgba(255, 215, 0, 0.18);
}
</style>
