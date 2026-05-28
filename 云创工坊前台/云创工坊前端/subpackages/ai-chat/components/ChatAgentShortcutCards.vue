<template>
	<view v-if="visibleCards.length" class="shortcut-card-group">
		<view
			v-for="card in visibleCards"
			:key="card.id"
			class="shortcut-card"
			:class="card.themeClass"
			hover-class="shortcut-card-hover"
			@tap="$emit('select', card)"
		>
			<view class="shortcut-card-head">
				<view class="shortcut-card-avatar-shell">
					<image class="shortcut-card-avatar" :src="card.avatarUrl" mode="aspectFill" />
				</view>
				<view class="shortcut-card-copy">
					<view class="shortcut-card-title-row">
						<text class="shortcut-card-title">{{ card.title }}</text>
						<text class="shortcut-card-badge">{{ card.badge }}</text>
					</view>
					<text class="shortcut-card-summary">{{ card.summary }}</text>
				</view>
			</view>

			<view class="shortcut-card-footer">
				<text class="shortcut-card-meta">{{ card.meta }}</text>
				<view class="shortcut-card-button">
					<text class="shortcut-card-button-text">{{ card.buttonText }}</text>
				</view>
			</view>
		</view>
	</view>
</template>

<script>
export default {
	name: 'ChatAgentShortcutCards',
	props: {
		cards: {
			type: Array,
			default: () => []
		}
	},
	computed: {
		visibleCards() {
			return Array.isArray(this.cards) ? this.cards.filter(Boolean) : []
		}
	}
}
</script>

<style scoped>
.shortcut-card-group {
	display: flex;
	flex-direction: column;
	gap: 16rpx;
	padding: 18rpx 24rpx 0;
}

.shortcut-card {
	display: flex;
	flex-direction: column;
	gap: 18rpx;
	padding: 24rpx;
	border-radius: 28rpx;
	background: linear-gradient(135deg, rgba(255, 248, 240, 0.98), rgba(255, 235, 214, 0.94));
	border: 1rpx solid rgba(225, 165, 110, 0.26);
	box-shadow: 0 18rpx 34rpx rgba(196, 140, 87, 0.12);
}

.shortcut-card-gaokao {
	background: linear-gradient(135deg, rgba(240, 248, 255, 0.98), rgba(221, 236, 252, 0.94));
	border-color: rgba(123, 167, 213, 0.28);
	box-shadow: 0 18rpx 34rpx rgba(112, 155, 200, 0.12);
}

.shortcut-card-hover {
	transform: translateY(2rpx) scale(0.995);
}

.shortcut-card-head {
	display: flex;
	align-items: flex-start;
	gap: 18rpx;
}

.shortcut-card-avatar-shell {
	width: 92rpx;
	height: 92rpx;
	border-radius: 28rpx;
	overflow: hidden;
	background: rgba(255, 255, 255, 0.88);
	box-shadow: 0 12rpx 24rpx rgba(0, 0, 0, 0.08);
	flex-shrink: 0;
}

.shortcut-card-avatar {
	display: block;
	width: 100%;
	height: 100%;
}

.shortcut-card-copy {
	flex: 1;
	min-width: 0;
	display: flex;
	flex-direction: column;
	gap: 8rpx;
}

.shortcut-card-title-row {
	display: flex;
	align-items: center;
	flex-wrap: wrap;
	gap: 10rpx;
}

.shortcut-card-title {
	font-size: 30rpx;
	line-height: 1.4;
	font-weight: 800;
	color: #6a3e14;
}

.shortcut-card-gaokao .shortcut-card-title {
	color: #244a75;
}

.shortcut-card-badge {
	padding: 6rpx 14rpx;
	border-radius: 999rpx;
	font-size: 20rpx;
	font-weight: 700;
	color: #9a622f;
	background: rgba(255, 255, 255, 0.76);
}

.shortcut-card-gaokao .shortcut-card-badge {
	color: #4f78a6;
}

.shortcut-card-summary {
	font-size: 22rpx;
	line-height: 1.65;
	color: rgba(106, 62, 20, 0.78);
}

.shortcut-card-gaokao .shortcut-card-summary {
	color: rgba(36, 74, 117, 0.78);
}

.shortcut-card-footer {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 16rpx;
}

.shortcut-card-meta {
	font-size: 20rpx;
	line-height: 1.5;
	color: rgba(106, 62, 20, 0.7);
}

.shortcut-card-gaokao .shortcut-card-meta {
	color: rgba(36, 74, 117, 0.7);
}

.shortcut-card-button {
	display: flex;
	align-items: center;
	justify-content: center;
	padding: 16rpx 24rpx;
	border-radius: 999rpx;
	background: linear-gradient(135deg, #f0a557, #d78531);
	box-shadow: 0 10rpx 22rpx rgba(205, 132, 54, 0.22);
}

.shortcut-card-gaokao .shortcut-card-button {
	background: linear-gradient(135deg, #75b0eb, #538fce);
	box-shadow: 0 10rpx 22rpx rgba(82, 131, 187, 0.22);
}

.shortcut-card-button-text {
	font-size: 24rpx;
	font-weight: 800;
	color: #ffffff;
}
</style>
