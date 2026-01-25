<template>
	<view class="hot">
		<text class="hot-title">热门板块</text>
		<view class="hot-grid">
			<view class="hot-item">
				<view class="hot-icon hot-icon-red">
					<image class="hot-icon-img" src="/static/icons/hot-creative.svg" mode="aspectFit" />
				</view>
				<text class="hot-name">创意广场</text>
			</view>

			<view class="hot-item">
				<view class="hot-icon hot-icon-blue">
					<image class="hot-icon-img" src="/static/icons/hot-learning.svg" mode="aspectFit" />
				</view>
				<text class="hot-name">学习资料</text>
			</view>

			<view class="hot-item">
				<view class="hot-icon hot-icon-purple">
					<image class="hot-icon-img" src="/static/icons/hot-activity.svg" mode="aspectFit" />
				</view>
				<text class="hot-name">活动预约</text>
			</view>
		</view>
	</view>
</template>

<script>
	export default {
		name: 'HotSections'
	}
</script>

<style scoped>
	.hot {
		margin-bottom: 32rpx;
	}

	.hot-title {
		font-size: 28rpx;
		font-weight: bold;
		color: #1f2937;
		margin-bottom: 16rpx;
	}

	.hot-grid {
		flex-direction: row;
		display: flex;
	}

	.hot-item {
		flex: 1;
		margin-right: 16rpx;
		border-radius: 24rpx;
		padding: 20rpx 12rpx;
		background-color: #ffffff;
		border-width: 2rpx;
		border-color: #f1f5f9;
		border-style: solid;
		align-items: center;
		justify-content: center;
		display: flex;
		flex-direction: column;
		box-shadow: 0 8rpx 20rpx rgba(148, 163, 184, 0.12);
	}

	.hot-item:last-child {
		margin-right: 0;
	}

	.hot-icon {
		width: 64rpx;
		height: 64rpx;
		border-radius: 32rpx;
		align-items: center;
		justify-content: center;
		display: flex;
		margin-bottom: 8rpx;
	}

	.hot-icon-red {
		background-color: #fee2e2;
	}

	.hot-icon-blue {
		background-color: #dbeafe;
	}

	.hot-icon-purple {
		background-color: #ede9fe;
	}

	.hot-icon-img {
		width: 32rpx;
		height: 32rpx;
	}

	.hot-name {
		font-size: 22rpx;
		color: #4b5563;
		text-align: center;
	}
</style>
