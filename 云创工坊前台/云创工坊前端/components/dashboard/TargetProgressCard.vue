<template>
	<view class="target-card">
		<view class="target-inner">
			<view class="target-top">
				<view class="target-left">
					<text class="target-label">本月目标进度</text>
					<view class="target-percent-row">
						<text class="target-percent">75%</text>
						<text class="target-percent-text">已完成</text>
					</view>
				</view>
				<view class="target-right">
					<text class="target-number">7,500</text>
					<text class="target-total">/ 10,000 单</text>
				</view>
			</view>
			<view class="target-progress">
				<view class="target-progress-inner" />
			</view>
		</view>
	</view>
</template>

<script>
	export default {
		name: 'TargetProgressCard'
	}
</script>

<style scoped>
	.target-card {
		border-radius: 32rpx;
		padding: 32rpx;
		background-image: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
		box-shadow: 0 24rpx 60rpx rgba(79, 70, 229, 0.35);
		margin-bottom: 32rpx;
	}

	.target-inner {
		flex-direction: column;
		display: flex;
	}

	.target-top {
		flex-direction: row;
		justify-content: space-between;
		align-items: flex-end;
		display: flex;
		margin-bottom: 24rpx;
	}

	.target-left {
		flex-direction: column;
		display: flex;
	}

	.target-label {
		font-size: 22rpx;
		color: #e0e7ff;
		margin-bottom: 8rpx;
	}

	.target-percent-row {
		flex-direction: row;
		align-items: flex-end;
		display: flex;
	}

	.target-percent {
		font-size: 56rpx;
		font-weight: 900;
		color: #ffffff;
		margin-right: 12rpx;
	}

	.target-percent-text {
		font-size: 24rpx;
		color: #e0e7ff;
	}

	.target-right {
		align-items: flex-end;
		text-align: right;
	}

	.target-number {
		font-size: 40rpx;
		font-weight: bold;
		color: #ffffff;
	}

	.target-total {
		font-size: 22rpx;
		color: #e0e7ff;
	}

	.target-progress {
		width: 100%;
		height: 12rpx;
		border-radius: 6rpx;
		background-color: rgba(15, 23, 42, 0.35);
		overflow: hidden;
	}

	.target-progress-inner {
		width: 75%;
		height: 100%;
		border-radius: 6rpx;
		background-color: #fb923c;
		box-shadow: 0 0 20rpx rgba(251, 146, 60, 0.8);
	}
</style>
