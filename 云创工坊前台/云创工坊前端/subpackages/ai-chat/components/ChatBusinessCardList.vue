<template>
	<view v-if="cards.length" class="chat-card-group">
		<view
			v-for="card in cards"
			:key="card.id || card.businessId"
			class="chat-link-card"
			@tap="openBusiness(card)"
		>
			<view class="chat-link-main">
				<text class="chat-link-title">{{ card.title }}</text>
				<text class="chat-link-summary">{{ card.summary }}</text>
				<text class="chat-link-meta">
					{{ resolveBusinessMeta(card) }}
				</text>
			</view>
			<text class="chat-link-cta">{{ card.hasSignup ? '去报名' : '去查看' }}</text>
		</view>
	</view>
</template>

<script>
export default {
	name: 'ChatBusinessCardList',
	props: {
		cards: {
			type: Array,
			default: () => []
		}
	},
	methods: {
		resolveBusinessMeta(card = {}) {
			const parts = []
			if (card.categoryType) parts.push(card.categoryType)
			if (card.tag) parts.push(card.tag)
			if (card.hasArticles) parts.push('有文章')
			return parts.join(' · ') || '业务板块'
		},
		openBusiness(card = {}) {
			const id = card.businessId || card.id
			if (!id) return
			const title = encodeURIComponent(card.title || '')
			const type = encodeURIComponent(card.categoryType || 'signup')
			uni.navigateTo({
				url: `/pages/extra/signup/index?id=${id}&category=${title}&type=${type}`
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

.chat-link-card {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 18rpx;
	padding: 22rpx;
	border-radius: 24rpx;
	background: rgba(255, 255, 255, 0.72);
	border: 1rpx solid rgba(44, 27, 0, 0.12);
}

.chat-link-main {
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

.chat-link-cta {
	flex-shrink: 0;
	font-size: 22rpx;
	font-weight: 700;
	color: #935d00;
}
</style>
