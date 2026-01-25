<template>
	<view class="activity-feed-card" @tap="navigateToFunctions">
		<view class="card-header">
			<text class="card-label">更多功能</text>
			<text class="card-arrow">查看全部 ></text>
		</view>
		<view class="card-body">
			<text class="card-title">Functions</text>
			<view class="action-btn">
				<text>去查看</text>
			</view>
		</view>
	</view>
</template>

<script>
export default {
	name: 'ActivityFeed',
	methods: {
		navigateToFunctions() {
			uni.navigateTo({
				url: '/pages/extra/functions'
			})
		}
	}
}
</script>

<style scoped>
.activity-feed-card {
	/* Match .achievements-simple-card style exactly */
	background: linear-gradient(135deg, #0f172a, #334155); /* Slightly lighter dark blue gradient to differentiate but match theme */
	padding: 30rpx 40rpx;
	border-radius: 32rpx;
	margin-bottom: 24rpx;
	color: #ffffff;
	display: flex;
	flex-direction: column;
	justify-content: space-between;
	box-shadow: 0 10rpx 30rpx rgba(15, 23, 42, 0.2);
	width: 100%;
	box-sizing: border-box;
	position: relative;
	z-index: 1;
	min-height: 180rpx; /* Ensure some height match */
}

.card-header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	margin-bottom: 20rpx;
}

.card-label {
	font-size: 24rpx;
	color: #94a3b8;
}

.card-arrow {
	font-size: 22rpx;
	color: #64748b;
}

.card-body {
	display: flex;
	justify-content: space-between;
	align-items: flex-end;
}

.card-title {
	font-size: 40rpx;
	font-weight: 800;
	line-height: 1;
	color: #ffffff;
	opacity: 0.9;
}

.action-btn {
	background: rgba(255,255,255,0.15);
	padding: 10rpx 24rpx;
	border-radius: 999rpx;
	font-size: 24rpx;
	border: 1px solid rgba(255,255,255,0.1);
}
</style>
