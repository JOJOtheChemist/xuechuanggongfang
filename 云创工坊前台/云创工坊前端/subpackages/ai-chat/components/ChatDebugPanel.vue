<template>
	<view class="debug-card">
		<view class="debug-head">
			<text class="debug-title">Debug Panel</text>
			<view class="debug-actions">
				<text class="debug-action" @tap="$emit('copy')">一键复制</text>
				<text class="debug-action" @tap="$emit('refresh')">刷新状态</text>
			</view>
		</view>
		<view class="debug-grid">
			<view class="debug-item">
				<text class="debug-label">本地登录态</text>
				<text class="debug-value">{{ debugInfo.localLoginState }}</text>
			</view>
			<view class="debug-item">
				<text class="debug-label">AI 认证态</text>
				<text class="debug-value">{{ debugInfo.aiAuthState }}</text>
			</view>
			<view class="debug-item">
				<text class="debug-label">Token 来源</text>
				<text class="debug-value">{{ debugInfo.tokenSource }}</text>
			</view>
			<view class="debug-item">
				<text class="debug-label">JWT 格式</text>
				<text class="debug-value">{{ debugInfo.tokenIsJwt ? '是' : '否' }}</text>
			</view>
			<view class="debug-item">
				<text class="debug-label">Access Token</text>
				<text class="debug-value">{{ debugInfo.tokenPreview }}</text>
			</view>
			<view class="debug-item">
				<text class="debug-label">Refresh Token</text>
				<text class="debug-value">{{ debugInfo.refreshTokenState }}</text>
			</view>
			<view class="debug-item">
				<text class="debug-label">User ID</text>
				<text class="debug-value">{{ debugInfo.userId }}</text>
			</view>
			<view class="debug-item">
				<text class="debug-label">昵称</text>
				<text class="debug-value">{{ debugInfo.nickname }}</text>
			</view>
			<view class="debug-item">
				<text class="debug-label">头像</text>
				<text class="debug-value">{{ debugInfo.avatar }}</text>
			</view>
			<view class="debug-item">
				<text class="debug-label">最近动作</text>
				<text class="debug-value">{{ debugInfo.lastAction }}</text>
			</view>
			<view class="debug-item">
				<text class="debug-label">最近状态码</text>
				<text class="debug-value">{{ debugInfo.lastStatusCode }}</text>
			</view>
			<view class="debug-item debug-item-wide">
				<text class="debug-label">最近响应</text>
				<text class="debug-value">{{ debugInfo.lastMessage }}</text>
			</view>
			<view class="debug-item debug-item-wide">
				<text class="debug-label">UserInfo 缓存</text>
				<text class="debug-value">{{ debugInfo.userInfoPreview }}</text>
			</view>
			<view class="debug-item debug-item-wide">
				<text class="debug-label">最近更新时间</text>
				<text class="debug-value">{{ debugInfo.updatedAt }}</text>
			</view>
		</view>
	</view>
</template>

<script>
export default {
	name: 'ChatDebugPanel',
	props: {
		debugInfo: {
			type: Object,
			default: () => ({})
		}
	}
}
</script>

<style scoped>
.debug-card {
	margin-top: 18rpx;
	padding: 20rpx;
	border-radius: 24rpx;
	background: rgba(37, 50, 88, 0.7);
	border: 1rpx solid rgba(255, 255, 255, 0.18);
	backdrop-filter: blur(18px);
	box-shadow: 0 18rpx 36rpx rgba(34, 47, 83, 0.14);
}

.debug-head {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 16rpx;
	margin-bottom: 16rpx;
}

.debug-actions {
	display: flex;
	align-items: center;
	gap: 18rpx;
}

.debug-title {
	font-size: 24rpx;
	font-weight: 800;
	color: #eef4ff;
}

.debug-action {
	font-size: 20rpx;
	color: #bfd2ff;
}

.debug-grid {
	display: grid;
	grid-template-columns: repeat(2, minmax(0, 1fr));
	gap: 12rpx;
}

.debug-item {
	padding: 14rpx 16rpx;
	border-radius: 18rpx;
	background: rgba(255, 255, 255, 0.1);
	border: 1rpx solid rgba(255, 255, 255, 0.12);
}

.debug-item-wide {
	grid-column: 1 / -1;
}

.debug-label {
	display: block;
	margin-bottom: 6rpx;
	font-size: 18rpx;
	color: rgba(233, 240, 255, 0.68);
}

.debug-value {
	display: block;
	font-size: 20rpx;
	line-height: 1.45;
	font-weight: 700;
	color: #ffffff;
	word-break: break-all;
}
</style>
