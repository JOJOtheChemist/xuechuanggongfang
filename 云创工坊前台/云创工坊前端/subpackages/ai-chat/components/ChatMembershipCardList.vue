<template>
	<view v-if="cards.length" class="membership-card-group">
		<view
			v-for="card in cards"
			:key="card.id"
			class="membership-card"
			hover-class="membership-card-hover"
			@tap="$emit('tap', card)"
		>
			<view class="membership-card-head">
				<view class="membership-card-copy">
					<view class="membership-card-title-row">
						<text class="membership-card-title">{{ card.title }}</text>
						<text v-if="card.badge" class="membership-card-badge">{{ card.badge }}</text>
					</view>
					<text v-if="card.summary" class="membership-card-summary">{{ card.summary }}</text>
				</view>
				<view class="membership-card-pill">
					<text class="membership-card-pill-text">{{ card.pillText }}</text>
				</view>
			</view>

			<view v-if="card.benefits && card.benefits.length" class="membership-card-benefits">
				<text
					v-for="benefit in card.benefits"
					:key="benefit"
					class="membership-card-benefit"
				>
					{{ benefit }}
				</text>
			</view>

			<view class="membership-card-footer">
				<text class="membership-card-button">{{ card.buttonText || '立即前往' }}</text>
			</view>
		</view>
	</view>
</template>

<script>
export default {
	name: 'ChatMembershipCardList',
	props: {
		cards: {
			type: Array,
			default: () => []
		}
	}
}
</script>

<style scoped>
.membership-card-group {
	display: flex;
	flex-direction: column;
	gap: 16rpx;
	margin-top: 18rpx;
}

.membership-card {
	display: flex;
	flex-direction: column;
	gap: 18rpx;
	padding: 24rpx;
	border-radius: 28rpx;
	background: linear-gradient(135deg, rgba(223, 241, 255, 0.98), rgba(174, 214, 250, 0.94));
	border: 1rpx solid rgba(123, 177, 224, 0.35);
	box-shadow: 0 18rpx 32rpx rgba(111, 164, 211, 0.14);
}

.membership-card-hover {
	transform: translateY(2rpx) scale(0.995);
}

.membership-card-head {
	display: flex;
	align-items: flex-start;
	justify-content: space-between;
	gap: 20rpx;
}

.membership-card-copy {
	flex: 1;
	min-width: 0;
	display: flex;
	flex-direction: column;
	gap: 8rpx;
}

.membership-card-title-row {
	display: flex;
	align-items: center;
	flex-wrap: wrap;
	gap: 10rpx;
}

.membership-card-title {
	font-size: 30rpx;
	line-height: 1.45;
	font-weight: 800;
	color: #20405d;
}

.membership-card-badge {
	padding: 6rpx 14rpx;
	border-radius: 999rpx;
	font-size: 20rpx;
	font-weight: 700;
	color: #315f88;
	background: rgba(255, 255, 255, 0.66);
}

.membership-card-summary {
	font-size: 22rpx;
	line-height: 1.65;
	color: rgba(32, 64, 93, 0.76);
}

.membership-card-pill {
	flex-shrink: 0;
	padding: 10rpx 14rpx;
	border-radius: 18rpx;
	background: rgba(255, 255, 255, 0.72);
}

.membership-card-pill-text {
	font-size: 20rpx;
	font-weight: 700;
	color: #4c769d;
}

.membership-card-benefits {
	display: flex;
	flex-direction: column;
	gap: 10rpx;
}

.membership-card-benefit {
	position: relative;
	padding-left: 22rpx;
	font-size: 22rpx;
	line-height: 1.6;
	color: rgba(32, 64, 93, 0.92);
}

.membership-card-benefit::before {
	content: '';
	position: absolute;
	left: 0;
	top: 14rpx;
	width: 8rpx;
	height: 8rpx;
	border-radius: 999rpx;
	background: #5ba4e4;
}

.membership-card-footer {
	display: flex;
	justify-content: flex-end;
}

.membership-card-button {
	padding: 16rpx 24rpx;
	border-radius: 999rpx;
	font-size: 24rpx;
	font-weight: 800;
	color: #ffffff;
	background: linear-gradient(135deg, #74baf4, #5ea6e2);
	box-shadow: 0 10rpx 20rpx rgba(88, 152, 207, 0.24);
}
</style>
