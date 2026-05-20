<template>
	<view v-if="cards.length" class="goal-card-group">
		<view
			v-for="card in cards"
			:key="card.id"
			class="goal-card"
			hover-class="goal-card-hover"
			@tap="openGoal(card)"
		>
			<view class="goal-card-head">
				<view class="goal-card-copy">
					<view class="goal-card-title-row">
						<text class="goal-card-title">{{ card.title }}</text>
						<text class="goal-card-badge">目标入口</text>
					</view>
					<text v-if="card.summary" class="goal-card-summary">{{ card.summary }}</text>
				</view>
				<view class="goal-card-pill">
					<text class="goal-card-pill-text">成长动作</text>
				</view>
			</view>

			<view class="goal-card-footer">
				<text class="goal-card-meta">先把月目标定下来</text>
				<text class="goal-card-button">{{ card.buttonText || '去设目标' }}</text>
			</view>
		</view>
	</view>
</template>

<script>
export default {
	name: 'ChatGoalCardList',
	props: {
		cards: {
			type: Array,
			default: () => []
		}
	},
	methods: {
		openGoal(card = {}) {
			const routeUrl = String((card && (card.routeUrl || card.url)) || '').trim()
			if (!routeUrl) return
			uni.navigateTo({
				url: routeUrl,
				fail: () => {
					uni.showToast({ title: '页面打开失败', icon: 'none' })
				}
			})
		}
	}
}
</script>

<style scoped>
.goal-card-group {
	display: flex;
	flex-direction: column;
	gap: 16rpx;
}

.goal-card {
	display: flex;
	flex-direction: column;
	gap: 18rpx;
	padding: 24rpx;
	border-radius: 28rpx;
	background: linear-gradient(135deg, rgba(230, 247, 239, 0.98), rgba(191, 232, 214, 0.94));
	border: 1rpx solid rgba(110, 190, 153, 0.32);
	box-shadow: 0 18rpx 32rpx rgba(88, 163, 129, 0.14);
}

.goal-card-hover {
	transform: translateY(2rpx) scale(0.995);
}

.goal-card-head {
	display: flex;
	align-items: flex-start;
	justify-content: space-between;
	gap: 18rpx;
}

.goal-card-copy {
	flex: 1;
	min-width: 0;
	display: flex;
	flex-direction: column;
	gap: 8rpx;
}

.goal-card-title-row {
	display: flex;
	align-items: center;
	flex-wrap: wrap;
	gap: 10rpx;
}

.goal-card-title {
	font-size: 30rpx;
	line-height: 1.45;
	font-weight: 800;
	color: #21543f;
}

.goal-card-badge {
	padding: 6rpx 14rpx;
	border-radius: 999rpx;
	font-size: 20rpx;
	font-weight: 700;
	color: #2f7357;
	background: rgba(255, 255, 255, 0.7);
}

.goal-card-summary {
	font-size: 22rpx;
	line-height: 1.65;
	color: rgba(33, 84, 63, 0.78);
}

.goal-card-pill {
	flex-shrink: 0;
	padding: 10rpx 14rpx;
	border-radius: 18rpx;
	background: rgba(255, 255, 255, 0.74);
}

.goal-card-pill-text {
	font-size: 20rpx;
	font-weight: 700;
	color: #438466;
}

.goal-card-footer {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 16rpx;
}

.goal-card-meta {
	font-size: 22rpx;
	line-height: 1.5;
	color: rgba(33, 84, 63, 0.72);
}

.goal-card-button {
	padding: 16rpx 24rpx;
	border-radius: 999rpx;
	font-size: 24rpx;
	font-weight: 800;
	color: #ffffff;
	background: linear-gradient(135deg, #6cc596, #53ac7f);
	box-shadow: 0 10rpx 20rpx rgba(80, 154, 118, 0.24);
}
</style>
