<template>
	<view v-if="cards.length" class="chat-card-group">
		<view
			v-for="card in cards"
			:key="card.id || card.articleId"
			class="chat-link-card"
			@tap="openArticle(card)"
		>
			<view class="chat-link-main">
				<text class="chat-link-title">{{ card.title }}</text>
				<text class="chat-link-summary">{{ card.summary }}</text>
				<text class="chat-link-meta">
					{{ card.categoryTitle || '文章' }} · {{ card.unlocked ? '已解锁' : resolvePrice(card.pricePoints) }}
				</text>
			</view>
			<text class="chat-link-cta">去查看</text>
		</view>
	</view>
</template>

<script>
export default {
	name: 'ChatArticleCardList',
	props: {
		cards: {
			type: Array,
			default: () => []
		}
	},
	methods: {
		resolvePrice(pricePoints) {
			const value = Number(pricePoints || 0)
			return value > 0 ? `${value} 积分` : '免费'
		},
		openArticle(card = {}) {
			const articleId = card.id || card.articleId || card.article_id || card._id
			if (!articleId) return
			uni.navigateTo({
				url: `/pages/article/detail?id=${articleId}`
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
