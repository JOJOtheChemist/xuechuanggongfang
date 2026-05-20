<template>
	<view class="ai-chat-page">
		<view id="chat-page-shell" class="chat-shell" :style="shellStyle">
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
	name: 'ChatPageShell',
	props: {
		bottomReserveRpx: {
			type: Number,
			default: 184
		}
	},
	computed: {
		shellStyle() {
			const reserve = Math.max(0, Number(this.bottomReserveRpx) || 0)
			return `padding: 0 0 calc(${reserve}rpx + env(safe-area-inset-bottom, 0px));`
		}
	}
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
	box-sizing: border-box;
	display: flex;
	flex-direction: column;
	gap: 0;
}
</style>
