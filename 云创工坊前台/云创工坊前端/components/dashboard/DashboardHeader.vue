<template>
	<view class="header">
		<view class="header-left">
			<text class="header-date">2023年10月24日 星期二</text>
			<text class="header-title">学创工坊</text>
		</view>
		<view class="header-right">
			<view class="bell-wrapper">
				<image class="bell-image" src="/static/icons/bell.svg" mode="aspectFit" />
				<view class="bell-dot" />
			</view>
			<image class="avatar" src="https://api.dicebear.com/7.x/notionists/png?seed=Felix" mode="aspectFill" />
		</view>
	</view>
</template>

<script>
	export default {
		name: 'DashboardHeader'
	}
</script>

<style scoped>
	.header {
		padding: 40rpx 32rpx 16rpx;
		flex-direction: row;
		align-items: center;
		justify-content: space-between;
		display: flex;
		background-color: #f8fafc;
	}

	.header-left {
		flex-direction: column;
		display: flex;
		align-items: center;
	}

	.header-date {
		font-size: 20rpx;
		color: #94a3b8;
		margin-bottom: 8rpx;
	}

	.header-title {
		font-size: 64rpx;
		font-weight: bold;
		color: #0f172a;
	}

	.header-right {
		flex-direction: row;
		align-items: center;
		justify-content: flex-end;
		display: flex;
	}

	.bell-wrapper {
		width: 72rpx;
		height: 72rpx;
		border-radius: 36rpx;
		align-items: center;
		justify-content: center;
		display: flex;
		background-color: #e5e7eb;
		margin-right: 24rpx;
		position: relative;
	}

	.bell-image {
		width: 36rpx;
		height: 36rpx;
	}

	.bell-dot {
		width: 14rpx;
		height: 14rpx;
		border-radius: 7rpx;
		background-color: #ef4444;
		position: absolute;
		top: 12rpx;
		right: 14rpx;
		border-width: 2rpx;
		border-color: #ffffff;
		border-style: solid;
	}

	.avatar {
		width: 72rpx;
		height: 72rpx;
		border-radius: 36rpx;
		border-width: 4rpx;
		border-color: #ffffff;
		border-style: solid;
		background-color: #e0e7ff;
		display: none; /* Hidden requested by user */
	}
</style>
