<template>
	<view class="stats-grid">
		<view class="stats-card stats-card-users">
			<view class="stats-card-top">
				<view class="stats-icon users-icon">
					<image class="stats-icon-img" src="/static/icons/stats-users.svg" mode="aspectFit" />
				</view>
				<text class="stats-tag stats-tag-green">+11 新增</text>
			</view>
			<view class="stats-card-bottom">
				<text class="stats-label">本月活跃用户</text>
				<text class="stats-value">7,500</text>
				<text class="stats-desc">当日活跃 <text class="stats-desc-strong">500</text></text>
			</view>
		</view>

		<view class="stats-card stats-card-orders">
			<view class="stats-card-top">
				<view class="stats-icon orders-icon">
					<image class="stats-icon-img" src="/static/icons/stats-orders.svg" mode="aspectFit" />
				</view>
				<text class="stats-tag stats-tag-orange">+3 订单</text>
			</view>
			<view class="stats-card-bottom">
				<text class="stats-label">累计订单量</text>
				<text class="stats-value">120</text>
				<text class="stats-desc">持续增长中</text>
			</view>
		</view>
	</view>
</template>

<script>
	export default {
		name: 'StatsGrid'
	}
</script>

<style scoped>
	.stats-grid {
		flex-direction: row;
		display: flex;
		margin-bottom: 32rpx;
	}

	.stats-card {
		flex: 1;
		margin-right: 16rpx;
		border-radius: 24rpx;
		padding: 24rpx;
		background-color: #ffffff;
		box-shadow: 0 8rpx 30rpx rgba(148, 163, 184, 0.18);
		border-width: 2rpx;
		border-color: #e5e7eb;
		border-style: solid;
	}

	.stats-card:last-child {
		margin-right: 0;
	}

	.stats-card-top {
		flex-direction: row;
		align-items: center;
		justify-content: space-between;
		display: flex;
		margin-bottom: 20rpx;
	}

	.stats-icon {
		width: 56rpx;
		height: 56rpx;
		border-radius: 16rpx;
		align-items: center;
		justify-content: center;
		display: flex;
	}

	.stats-icon-img {
		width: 32rpx;
		height: 32rpx;
	}

	.users-icon {
		background-color: #eef2ff;
	}

	.orders-icon {
		background-color: #fff7ed;
	}

	.stats-icon-text {
		font-size: 32rpx;
	}

	.stats-tag {
		font-size: 20rpx;
		padding: 6rpx 14rpx;
		border-radius: 999rpx;
		font-weight: bold;
	}

	.stats-tag-green {
		color: #16a34a;
		background-color: #dcfce7;
	}

	.stats-tag-orange {
		color: #f97316;
		background-color: #ffedd5;
	}

	.stats-card-bottom {
		flex-direction: column;
		display: flex;
	}

	.stats-label {
		font-size: 22rpx;
		color: #94a3b8;
		margin-bottom: 4rpx;
	}

	.stats-value {
		font-size: 36rpx;
		font-weight: bold;
		color: #0f172a;
		margin-bottom: 4rpx;
	}

	.stats-desc {
		font-size: 20rpx;
		color: #94a3b8;
	}

	.stats-desc-strong {
		color: #334155;
		font-weight: bold;
	}
</style>
