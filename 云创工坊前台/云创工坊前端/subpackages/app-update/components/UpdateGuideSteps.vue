<template>
	<view class="update-guide-card">
		<text class="update-guide-title">更新方法</text>
		<view v-for="item in steps" :key="item.index" class="update-step">
			<text class="update-step-index">{{ item.index }}</text>
			<text class="update-step-text">{{ item.text }}</text>
		</view>
	</view>
</template>

<script>
const DEFAULT_STEPS = Object.freeze([
	{ index: 1, text: '长按小程序，跳出操作选项。' },
	{ index: 2, text: '拖动小程序到删除位置，删除当前小程序。' },
	{ index: 3, text: '删除后重新进入小程序，即可更新到最新版本。' }
])

export default {
	name: 'UpdateGuideSteps',
	props: {
		steps: {
			type: Array,
			default: () => DEFAULT_STEPS.map((item) => Object.assign({}, item))
		}
	}
}
</script>

<style scoped>
	.update-guide-card {
		padding: 34rpx 28rpx 30rpx;
		border-radius: 28rpx;
		background: #ffffff;
		box-shadow: 0 18rpx 48rpx rgba(15, 23, 42, 0.08);
		display: flex;
		flex-direction: column;
		gap: 22rpx;
	}

	.update-guide-title {
		font-size: 32rpx;
		font-weight: 700;
		color: #111827;
	}

	.update-step {
		display: flex;
		align-items: flex-start;
		gap: 18rpx;
	}

	.update-step-index {
		width: 40rpx;
		height: 40rpx;
		border-radius: 999rpx;
		background: #f97316;
		color: #ffffff;
		font-size: 24rpx;
		font-weight: 700;
		line-height: 40rpx;
		text-align: center;
		flex: 0 0 40rpx;
	}

	.update-step-text {
		flex: 1;
		font-size: 26rpx;
		line-height: 1.7;
		color: #374151;
	}
</style>
