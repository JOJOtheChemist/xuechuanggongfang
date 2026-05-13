<template>
	<view v-if="cards.length" class="chat-card-group">
		<view
			v-for="card in cards"
			:key="card.id || card.qrcodeUrl"
			class="chat-qr-card"
		>
			<view class="chat-qr-main">
				<text class="chat-link-title">{{ card.title }}</text>
				<text class="chat-link-summary">{{ card.summary }}</text>
				<text class="chat-link-meta">{{ resolveMeta(card) }}</text>
			</view>
			<image
				v-if="card.qrcodeUrl"
				class="chat-qr-image"
				:src="card.qrcodeUrl"
				mode="aspectFit"
				@tap="previewQr(card.qrcodeUrl)"
			/>
		</view>
	</view>
</template>

<script>
export default {
	name: 'ChatInviteCardList',
	props: {
		cards: {
			type: Array,
			default: () => []
		}
	},
	methods: {
		resolveMeta(card = {}) {
			if (card.cardType === 'team_invite') {
				return card.teamName ? `团队：${card.teamName}` : '校园合伙人邀请二维码'
			}
			return card.businessId ? `板块 ID：${card.businessId}` : '业务板块邀请二维码'
		},
		previewQr(url) {
			if (!url) return
			uni.previewImage({
				urls: [url],
				current: url
			})
		}
	}
}
</script>

<style scoped>
.chat-card-group {
	display: flex;
	flex-direction: column;
	gap: 16rpx;
	margin-top: 18rpx;
}

.chat-qr-card {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 18rpx;
	padding: 22rpx;
	border-radius: 24rpx;
	background: rgba(255, 255, 255, 0.72);
	border: 1rpx solid rgba(44, 27, 0, 0.12);
}

.chat-qr-main {
	flex: 1;
	min-width: 0;
	display: flex;
	flex-direction: column;
	gap: 8rpx;
}

.chat-link-title {
	font-size: 28rpx;
	font-weight: 700;
	color: #2a1700;
}

.chat-link-summary,
.chat-link-meta {
	font-size: 22rpx;
	color: rgba(42, 23, 0, 0.72);
	line-height: 1.5;
}

.chat-qr-image {
	width: 136rpx;
	height: 136rpx;
	flex-shrink: 0;
	border-radius: 20rpx;
	background: #ffffff;
	padding: 10rpx;
	box-sizing: border-box;
}
</style>
