<template>
	<view v-if="cards.length" class="article-card-group">
		<view
			v-for="(card, index) in cards"
			:key="card.id || card.articleId || index"
			class="article-card"
			hover-class="article-card-hover"
			:data-article-id="card.articleId"
			@tap="handleArticleTap"
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
		handleArticleTap(event) {
			const dataset = event && event.currentTarget && event.currentTarget.dataset
				? event.currentTarget.dataset
				: {}
			const articleId = String(dataset.articleId || '').trim()
			openArticleDetail(articleId ? { id: articleId } : null)
		}
	}
}
</script>

<style scoped>
.article-card-group {
	display: flex;
	flex-direction: column;
	gap: 12rpx;
}

.article-card {
	display: flex;
	flex-direction: column;
	gap: 12rpx;
	padding: 20rpx 22rpx;
	border-radius: 24rpx;
	background: linear-gradient(135deg, rgba(237, 246, 255, 0.98), rgba(199, 226, 255, 0.94));
	border: 1rpx solid rgba(126, 173, 227, 0.34);
	box-shadow: 0 12rpx 24rpx rgba(109, 159, 212, 0.12);
}

.article-card-hover {
	transform: translateY(2rpx) scale(0.995);
}

.article-card-head {
	display: flex;
	align-items: flex-start;
	justify-content: space-between;
	gap: 12rpx;
}

.article-card-copy {
	flex: 1;
	min-width: 0;
	display: flex;
	flex-direction: column;
	gap: 6rpx;
}

.article-card-title-row {
	display: flex;
	align-items: center;
	flex-wrap: wrap;
	gap: 8rpx;
}

.article-card-title {
	font-size: 28rpx;
	line-height: 1.4;
	font-weight: 800;
	color: #1f446d;
}

.article-card-badge {
	padding: 4rpx 12rpx;
	border-radius: 999rpx;
	font-size: 18rpx;
	font-weight: 700;
	color: #2f608f;
	background: rgba(255, 255, 255, 0.7);
}

.article-card-summary {
	font-size: 20rpx;
	line-height: 1.55;
	color: rgba(31, 68, 109, 0.78);
	display: -webkit-box;
	-webkit-box-orient: vertical;
	-webkit-line-clamp: 2;
	overflow: hidden;
}

.article-card-pill {
	flex-shrink: 0;
	padding: 8rpx 12rpx;
	border-radius: 16rpx;
	background: rgba(255, 255, 255, 0.74);
}

.article-card-pill-text {
	font-size: 18rpx;
	font-weight: 700;
	color: #4f7ca7;
}

.article-card-tags {
	display: flex;
	flex-wrap: wrap;
	gap: 8rpx;
}

.article-card-tag {
	padding: 6rpx 12rpx;
	border-radius: 999rpx;
	font-size: 18rpx;
	line-height: 1.2;
	color: #3f6d98;
	background: rgba(255, 255, 255, 0.66);
}

.article-card-footer {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 12rpx;
}

.article-card-meta {
	font-size: 20rpx;
	line-height: 1.4;
	color: rgba(31, 68, 109, 0.72);
}

.article-card-button {
	padding: 12rpx 20rpx;
	border-radius: 999rpx;
	font-size: 22rpx;
	font-weight: 800;
	color: #ffffff;
	background: linear-gradient(135deg, #74baf4, #5ea6e2);
	box-shadow: 0 8rpx 16rpx rgba(88, 152, 207, 0.2);
}
</style>
