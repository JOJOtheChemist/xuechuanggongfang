<template>
	<view class="user-message">
		<view class="message-content">
			<text class="message-name">{{ name }}</text>
			<view class="message-card">
				<ChatRichText :text="text" tone="user" />
			</view>
		</view>

		<view class="avatar-shell">
			<view class="avatar-fallback">
				<text class="avatar-fallback-text">{{ resolvedInitial }}</text>
			</view>
		</view>
	</view>
</template>

<script>
import ChatRichText from './ChatRichText.vue'

export default {
	name: 'UserMessageBubble',
	components: {
		ChatRichText
	},
	props: {
		name: {
			type: String,
			default: '我'
		},
		text: {
			type: String,
			default: ''
		}
	},
	computed: {
		resolvedInitial() {
			return String(this.name || '我').trim().slice(0, 1).toUpperCase() || '我'
		}
	}
}
</script>

<style scoped>
.user-message {
	display: flex;
	align-items: flex-start;
	justify-content: flex-end;
	gap: 20rpx;
}

.message-content {
	max-width: calc(100% - 170rpx);
	display: flex;
	flex-direction: column;
	align-items: flex-end;
	gap: 10rpx;
}

.message-name {
	font-size: 22rpx;
	color: rgba(255, 255, 255, 0.92);
	padding-right: 6rpx;
}

.message-card {
	padding: 24rpx 26rpx;
	border-radius: 30rpx;
	border-top-right-radius: 10rpx;
	background: linear-gradient(135deg, #1d4ed8, #2563eb);
	border: 1rpx solid rgba(29, 78, 216, 0.86);
	box-shadow: 0 14rpx 34rpx rgba(29, 78, 216, 0.24);
}

.avatar-shell {
	width: 80rpx;
	height: 80rpx;
	border-radius: 999rpx;
	overflow: hidden;
	flex-shrink: 0;
	border: 2rpx solid rgba(29, 78, 216, 0.76);
	box-shadow: 0 0 24rpx rgba(29, 78, 216, 0.24);
	background: #101828;
}

.avatar-fallback {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 100%;
	height: 100%;
	background: linear-gradient(135deg, #1d4ed8, #3b82f6);
}

.avatar-fallback-text {
	font-size: 30rpx;
	font-weight: 800;
	color: #ffffff;
}
</style>
