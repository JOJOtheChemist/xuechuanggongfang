<template>
	<view class="toolbar">
		<view class="toolbar-btn" @tap="$emit('back')">
			<text class="toolbar-btn-text">返回</text>
		</view>
		<view class="toolbar-btn toolbar-btn-primary" @tap="$emit('reset')">
			<text class="toolbar-btn-text toolbar-btn-text-primary">新会话</text>
		</view>
	</view>
</template>

<script>
export default {
	name: 'ChatHeroToolbar'
}
</script>

<style scoped>
.toolbar {
	display: flex;
	justify-content: space-between;
	gap: 14rpx;
	margin-bottom: 20rpx;
}

.toolbar-btn {
	padding: 16rpx 22rpx;
	border-radius: 18rpx;
	background: rgba(255, 255, 255, 0.9);
	border: 1rpx solid rgba(34, 78, 68, 0.08);
	box-shadow: 0 10rpx 22rpx rgba(31, 85, 72, 0.08);
}

.toolbar-btn-primary {
	background: linear-gradient(135deg, #1f7a67, #2aa88e);
	border-color: transparent;
}

.toolbar-btn-text {
	font-size: 24rpx;
	font-weight: 700;
	color: #285349;
}

.toolbar-btn-text-primary {
	color: #ffffff;
}
</style>
