<template>
	<view class="ai-chat-page">
		<view class="bg-glow bg-glow-a"></view>
		<view class="bg-glow bg-glow-b"></view>
		<view class="chat-shell">
			<slot name="hero"></slot>
			<slot name="prompt"></slot>
			<slot name="messages"></slot>
			<slot name="composer"></slot>
		</view>
	</view>
</template>

<script>
export default {
	name: 'ChatPageShell'
}
</script>

<style scoped>
.ai-chat-page {
	min-height: 100vh;
	background: linear-gradient(180deg, #f4fbf8 0%, #eef6f1 52%, #e8f1ed 100%);
	position: relative;
	overflow: hidden;
}

.bg-glow {
	position: fixed;
	border-radius: 999rpx;
	filter: blur(8rpx);
	opacity: 0.85;
	pointer-events: none;
}

.bg-glow-a {
	width: 320rpx;
	height: 320rpx;
	top: -70rpx;
	right: -80rpx;
	background: radial-gradient(circle, rgba(52, 168, 148, 0.26), rgba(52, 168, 148, 0));
}

.bg-glow-b {
	width: 260rpx;
	height: 260rpx;
	left: -90rpx;
	top: 260rpx;
	background: radial-gradient(circle, rgba(244, 180, 96, 0.22), rgba(244, 180, 96, 0));
}

.chat-shell {
	position: relative;
	z-index: 1;
	min-height: 100vh;
	padding: 24rpx 24rpx calc(184rpx + env(safe-area-inset-bottom, 0px));
	box-sizing: border-box;
	display: flex;
	flex-direction: column;
	gap: 20rpx;
}
</style>
