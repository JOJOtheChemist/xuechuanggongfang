<template>
	<view class="user-message">
		<view class="message-content">
			<view class="message-name">{{ name }}</view>
			<view class="message-card">
				<view class="message-text">{{ text }}</view>
			</view>
		</view>

		<view class="avatar-shell">
			<image
				v-if="resolvedAvatarUrl"
				class="avatar-image"
				:src="resolvedAvatarUrl"
				mode="aspectFill"
			/>
			<view v-else class="avatar-fallback">
				<text class="avatar-fallback-text">{{ resolvedInitial }}</text>
			</view>
		</view>
	</view>
</template>

<script>
import { normalizeAvatarUrl } from '@/utils/avatar.js'

export default {
	name: 'UserMessageBubble',
	props: {
		name: {
			type: String,
			default: '我'
		},
		avatarUrl: {
			type: String,
			default: ''
		},
		text: {
			type: String,
			default: ''
		}
	},
	computed: {
		resolvedAvatarUrl() {
			return this.avatarUrl ? normalizeAvatarUrl(this.avatarUrl, '') : ''
		},
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
	width: 100%;
	max-width: 100%;
	min-width: 0;
}

.message-content {
	flex: 0 1 calc(100% - 170rpx);
	width: calc(100% - 170rpx);
	max-width: calc(100% - 170rpx);
	min-width: 0;
	display: flex;
	flex-direction: column;
	align-items: flex-end;
	gap: 10rpx;
}

.message-name {
	align-self: flex-end;
	max-width: 100%;
	font-size: 22rpx;
	line-height: 1.4;
	color: rgba(57, 77, 124, 0.72);
	padding-right: 6rpx;
	text-align: right;
	word-break: break-word;
	overflow-wrap: anywhere;
}

.message-card {
	align-self: flex-end;
	width: auto;
	max-width: 100%;
	min-width: 120rpx;
	box-sizing: border-box;
	padding: 24rpx 26rpx;
	border-radius: 30rpx;
	border-top-right-radius: 10rpx;
	background: linear-gradient(135deg, #4f84ff, #729bff);
	border: 1rpx solid rgba(79, 132, 255, 0.4);
	box-shadow: 0 14rpx 34rpx rgba(79, 132, 255, 0.2);
}

.message-text {
	font-size: 30rpx;
	line-height: 1.5;
	color: #f6fbff;
	white-space: pre-wrap;
	word-break: break-word;
	overflow-wrap: anywhere;
	text-align: left;
}

.avatar-shell {
	width: 80rpx;
	height: 80rpx;
	border-radius: 999rpx;
	overflow: hidden;
	flex-shrink: 0;
	border: 2rpx solid rgba(79, 132, 255, 0.42);
	box-shadow: 0 0 24rpx rgba(79, 132, 255, 0.18);
	background: #101828;
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
	background: linear-gradient(135deg, #4f84ff, #77a0ff);
}

.avatar-fallback-text {
	font-size: 30rpx;
	font-weight: 800;
	color: #ffffff;
}
</style>
