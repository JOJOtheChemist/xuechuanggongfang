<template>
	<view class="task-center-hero-overlay">
		<view class="task-center-hero-panels">
			<view class="task-center-hero-panel task-center-hero-panel-stats">
				<text class="task-center-hero-panel-title">stats</text>
			</view>
			<view class="task-center-hero-panel task-center-hero-panel-banner">
				<text class="task-center-hero-panel-title">banner</text>
			</view>
			<view class="task-center-hero-panel task-center-hero-panel-progress">
				<text class="task-center-hero-panel-title">本月任务进度</text>
			</view>
			<view class="task-center-hero-panel-row">
				<view class="task-center-hero-panel task-center-hero-panel-half">
					<text class="task-center-hero-panel-title">积分排行</text>
				</view>
				<view class="task-center-hero-panel task-center-hero-panel-half">
					<text class="task-center-hero-panel-title">伙伴动态</text>
				</view>
			</view>
			<view class="task-center-hero-panel task-center-hero-panel-buttons">
				<text class="task-center-hero-panel-title">4个按钮区</text>
			</view>
			<view class="task-center-hero-panel task-center-hero-panel-plan">
				<text class="task-center-hero-panel-title">本月计划区</text>
			</view>
		</view>
	</view>
</template>

<script>
export default {
	name: 'TaskCenterHeroOverlay'
}
</script>

<style scoped>
.task-center-hero-overlay {
	position: absolute;
	inset: 0;
	z-index: 6;
	pointer-events: none;
}

.task-center-hero-panels {
	position: absolute;
	left: 28rpx;
	right: 28rpx;
	top: 190rpx;
	display: flex;
	flex-direction: column;
	gap: 12rpx;
}

.task-center-hero-panel-row {
	display: flex;
	gap: 16rpx;
}

.task-center-hero-panel {
	display: flex;
	align-items: center;
	justify-content: center;
	border-radius: 24rpx;
	border: 2rpx solid rgba(0, 0, 0, 0.78);
	background: rgba(255, 255, 255, 0.02);
	box-shadow: 0 2rpx 8rpx rgba(15, 23, 42, 0.04);
	backdrop-filter: blur(1rpx);
}

.task-center-hero-panel-banner {
	min-height: 146rpx;
}

.task-center-hero-panel-stats {
	min-height: 176rpx;
	margin-top: 84rpx;
}

.task-center-hero-panel-progress {
	min-height: 120rpx;
}

.task-center-hero-panel-half {
	flex: 1;
	min-height: 308rpx;
}

.task-center-hero-panel-buttons {
	min-height: 170rpx;
}

.task-center-hero-panel-plan {
	min-height: 220rpx;
}

.task-center-hero-panel-title {
	font-size: 28rpx;
	font-weight: 700;
	line-height: 1.4;
	color: #0f172a;
	text-align: center;
	text-shadow: none;
}
</style>
