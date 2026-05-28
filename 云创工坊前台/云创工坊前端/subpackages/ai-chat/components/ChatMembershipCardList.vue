<template>
	<view v-if="cards.length && !hidden" class="membership-card-group">
		<view
			v-for="card in cards"
			:key="card.id"
			class="membership-card"
			hover-class="membership-card-hover"
			@tap="handleSelect(card)"
		>
			<view class="membership-card-head">
				<view class="membership-card-head-main">
					<view v-if="resolveAvatarUrl(card)" class="membership-card-avatar-shell">
						<image class="membership-card-avatar" :src="resolveAvatarUrl(card)" mode="aspectFill" />
					</view>
					<view class="membership-card-copy">
						<view class="membership-card-title-row">
							<text class="membership-card-title">{{ card.title }}</text>
							<text v-if="card.badge" class="membership-card-badge">{{ card.badge }}</text>
						</view>
						<text v-if="card.summary" class="membership-card-summary">{{ card.summary }}</text>
					</view>
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
import { GAOKAO_CONSULTANT_AVATAR_URL, XIAOCHUNLU_AVATAR_URL } from '../utils/agent-ui-config.js'

export default {
	name: 'ChatMembershipCardList',
	props: {
		cards: {
			type: Array,
			default: () => []
		},
		hidden: {
			type: Boolean,
			default: false
		}
	},
	methods: {
		resolveAvatarUrl(card = {}) {
			const explicitAvatar = String(card.avatarUrl || '').trim()
			if (explicitAvatar) return explicitAvatar
			if (card.cardType === 'campus_partner') return XIAOCHUNLU_AVATAR_URL
			if (card.cardType === 'campus_score_ambassador') return GAOKAO_CONSULTANT_AVATAR_URL
			return ''
		},
		handleSelect(card) {
			this.$emit('select', card)
		}
	}
}
</script>

<style scoped>
.membership-card-group {
	display: flex;
	flex-direction: column;
	gap: 16rpx;
}

.membership-card {
	display: flex;
	flex-direction: column;
	gap: 18rpx;
	padding: 24rpx;
	border-radius: 28rpx;
	background: linear-gradient(135deg, rgba(255, 246, 235, 0.98), rgba(255, 225, 188, 0.94));
	border: 1rpx solid rgba(230, 175, 110, 0.32);
	box-shadow: 0 18rpx 32rpx rgba(214, 152, 77, 0.14);
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

.membership-card-head-main {
	display: flex;
	align-items: flex-start;
	gap: 16rpx;
	flex: 1;
	min-width: 0;
}

.membership-card-avatar-shell {
	width: 84rpx;
	height: 84rpx;
	border-radius: 24rpx;
	overflow: hidden;
	background: rgba(255, 255, 255, 0.86);
	box-shadow: 0 12rpx 24rpx rgba(214, 152, 77, 0.16);
	flex-shrink: 0;
}

.membership-card-avatar {
	display: block;
	width: 100%;
	height: 100%;
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
	color: #7a4a16;
}

.membership-card-badge {
	padding: 6rpx 14rpx;
	border-radius: 999rpx;
	font-size: 20rpx;
	font-weight: 700;
	color: #98612a;
	background: rgba(255, 255, 255, 0.66);
}

.membership-card-summary {
	font-size: 22rpx;
	line-height: 1.65;
	color: rgba(122, 74, 22, 0.78);
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
	color: #b36e26;
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
	color: rgba(122, 74, 22, 0.92);
}

.membership-card-benefit::before {
	content: '';
	position: absolute;
	left: 0;
	top: 14rpx;
	width: 8rpx;
	height: 8rpx;
	border-radius: 999rpx;
	background: #e29a48;
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
	background: linear-gradient(135deg, #f0b46b, #df9340);
	box-shadow: 0 10rpx 20rpx rgba(207, 136, 54, 0.24);
}
</style>
