<template>
	<view class="ai-chat-page">
		<view class="chat-shell">
			<slot name="hero"></slot>
			<slot name="intro-visual"></slot>
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
	background: #ffffff;
	position: relative;
}

.chat-shell {
	position: relative;
	min-height: 100vh;
	background: #ffffff;
	padding: 0 0 calc(184rpx + env(safe-area-inset-bottom, 0px));
	box-sizing: border-box;
	display: flex;
	flex-direction: column;
	gap: 0;
}
</style>
