<template>
	<view class="guide-action-card">
		<button class="guide-action-btn" @tap="handleTap">{{ label }}</button>
	</view>
</template>

<script>
export default {
	name: 'GuideActionButton',
	props: {
		label: {
			type: String,
			default: '直接查询分数'
		}
	},
	methods: {
		handleTap() {
			this.$emit('primary')
		}
	}
}
</script>

<style scoped>
.guide-action-card {
	padding: 24rpx 24rpx 12rpx;
}

.guide-action-btn {
	border-radius: 999rpx;
	background: linear-gradient(135deg, #1d4ed8 0%, #2563eb 48%, #60a5fa 100%);
	color: #ffffff;
	font-size: 28rpx;
	font-weight: 700;
}

.guide-action-btn::after {
	border: none;
}
</style>
