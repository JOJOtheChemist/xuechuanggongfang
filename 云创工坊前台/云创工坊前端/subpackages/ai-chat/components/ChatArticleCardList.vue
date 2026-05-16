<template>
	<view v-if="cards.length" class="article-card-group">
		<view
			v-for="card in cards"
			:key="card.id || card.articleId"
			class="article-card"
			hover-class="article-card-hover"
			@tap="openArticle(card)"
		>
			<view class="article-card-head">
				<view class="article-card-copy">
					<view class="article-card-title-row">
						<text class="article-card-title">{{ card.title }}</text>
						<text class="article-card-badge">{{ card.unlocked ? '已解锁' : resolvePrice(card.pricePoints) }}</text>
					</view>
					<text v-if="card.summary" class="article-card-summary">{{ card.summary }}</text>
				</view>
				<view class="article-card-pill">
					<text class="article-card-pill-text">文章推荐</text>
				</view>
			</view>

			<view v-if="card.tags && card.tags.length" class="article-card-tags">
				<text
					v-for="tag in card.tags"
					:key="tag"
					class="article-card-tag"
				>
					{{ tag }}
				</text>
			</view>

			<view class="article-card-footer">
				<text class="article-card-meta">
					{{ card.categoryTitle || '学习文章' }}
				</text>
				<text class="article-card-button">去看详情</text>
			</view>
		</view>
	</view>
</template>

<script>
import { openArticleDetail } from '@/utils/article-navigation'

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
			openArticleDetail(card)
		}
	}
}
</script>

<style scoped>
.article-card-group {
	display: flex;
	flex-direction: column;
	gap: 16rpx;
	margin-top: 18rpx;
}

.article-card {
	display: flex;
	flex-direction: column;
	gap: 18rpx;
	padding: 24rpx;
	border-radius: 28rpx;
	background: linear-gradient(135deg, rgba(237, 246, 255, 0.98), rgba(199, 226, 255, 0.94));
	border: 1rpx solid rgba(126, 173, 227, 0.34);
	box-shadow: 0 18rpx 32rpx rgba(109, 159, 212, 0.14);
}

.article-card-hover {
	transform: translateY(2rpx) scale(0.995);
}

.article-card-head {
	display: flex;
	align-items: flex-start;
	justify-content: space-between;
	gap: 18rpx;
}

.article-card-copy {
	flex: 1;
	min-width: 0;
	display: flex;
	flex-direction: column;
	gap: 8rpx;
}

.article-card-title-row {
	display: flex;
	align-items: center;
	flex-wrap: wrap;
	gap: 10rpx;
}

.article-card-title {
	font-size: 30rpx;
	line-height: 1.45;
	font-weight: 800;
	color: #1f446d;
}

.article-card-badge {
	padding: 6rpx 14rpx;
	border-radius: 999rpx;
	font-size: 20rpx;
	font-weight: 700;
	color: #2f608f;
	background: rgba(255, 255, 255, 0.7);
}

.article-card-summary {
	font-size: 22rpx;
	line-height: 1.65;
	color: rgba(31, 68, 109, 0.78);
}

.article-card-pill {
	flex-shrink: 0;
	padding: 10rpx 14rpx;
	border-radius: 18rpx;
	background: rgba(255, 255, 255, 0.74);
}

.article-card-pill-text {
	font-size: 20rpx;
	font-weight: 700;
	color: #4f7ca7;
}

.article-card-tags {
	display: flex;
	flex-wrap: wrap;
	gap: 10rpx;
}

.article-card-tag {
	padding: 8rpx 14rpx;
	border-radius: 999rpx;
	font-size: 20rpx;
	line-height: 1.2;
	color: #3f6d98;
	background: rgba(255, 255, 255, 0.66);
}

.article-card-footer {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 16rpx;
}

.article-card-meta {
	font-size: 22rpx;
	line-height: 1.5;
	color: rgba(31, 68, 109, 0.72);
}

.article-card-button {
	padding: 16rpx 24rpx;
	border-radius: 999rpx;
	font-size: 24rpx;
	font-weight: 800;
	color: #ffffff;
	background: linear-gradient(135deg, #74baf4, #5ea6e2);
	box-shadow: 0 10rpx 20rpx rgba(88, 152, 207, 0.24);
}
</style>
