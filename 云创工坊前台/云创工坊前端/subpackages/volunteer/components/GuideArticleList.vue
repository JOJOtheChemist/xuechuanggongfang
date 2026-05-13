<template>
	<view class="article-list">
		<view class="article-title">{{ title }}</view>

		<view v-if="hasArticlesToShow">
			<view
				v-for="article in normalizedArticles"
				:key="article.renderKey"
				class="article-item"
				:data-article-id="article.articleId"
				:data-target-url="article.targetUrl"
				@tap="handleArticleTap"
			>
				<view class="article-content">
					<view class="article-header">
						<text class="article-name">{{ article.title }}</text>
					</view>
					<text class="article-summary">{{ article.summary }}</text>
					<text v-if="article.showColumnEntry" class="article-price free">进入专栏</text>
					<text v-else-if="article.unlocked" class="article-price free">可直接查看</text>
					<text v-else-if="article.showPricePoints" class="article-price">
						{{ article.pricePoints }} 积分解锁
					</text>
					<text v-else class="article-price free">资讯精选</text>
				</view>
				<image v-if="article.image" class="article-thumb" :src="article.image" mode="aspectFill" />
			</view>
		</view>

		<view v-else class="article-placeholder" :class="{ loading: !loaded }">
			<text class="placeholder-title">{{ placeholderTitle }}</text>
			<text class="placeholder-desc">{{ placeholderDesc }}</text>
		</view>
	</view>
</template>

<script>
export default {
	name: 'GuideArticleList',
	props: {
		articles: {
			type: Array,
			default: () => []
		},
		title: {
			type: String,
			default: '高考资讯精选'
		},
		loaded: {
			type: Boolean,
			default: false
		}
	},
	computed: {
		normalizedArticles() {
			const source = Array.isArray(this.articles) ? this.articles : []
			return source
				.map((item, index) => this.normalizeArticle(item, index))
				.filter(Boolean)
		},
		hasArticlesToShow() {
			return this.normalizedArticles.length > 0
		},
		placeholderTitle() {
			return this.loaded ? '暂时没有可展示的高考资讯' : '高考资讯加载中...'
		},
		placeholderDesc() {
			return this.loaded ? '稍后再试，或先点击上方按钮进入查分页面。' : '正在为你整理查分和志愿填报相关内容。'
		}
	},
	methods: {
		normalizeArticle(article, index) {
			if (!article || typeof article !== 'object') {
				return null
			}

			const articleId = String(
				article.id || article.articleId || article.article_id || article._id || ''
			).trim()
			const targetUrl = String(
				article.targetUrl || article.target_url || ''
			).trim()
			const title = String(article.title || '').trim()

			if (!title) {
				return null
			}

			const pricePoints = Number(article.pricePoints ?? article.price_points)
			return {
				renderKey: articleId || targetUrl || title || `guide-article-${index}`,
				articleId,
				targetUrl,
				title,
				summary: String(article.summary || article.desc || '').trim(),
				image: String(article.image || article.cover_image || article.cover || '').trim(),
				pricePoints: Number.isFinite(pricePoints) ? pricePoints : 0,
				unlocked: !!article.unlocked,
				showColumnEntry: !!targetUrl && !articleId,
				showPricePoints: Number.isFinite(pricePoints) && pricePoints > 0
			}
		},
		handleArticleTap(event) {
			const dataset = event && event.currentTarget && event.currentTarget.dataset
				? event.currentTarget.dataset
				: {}
			const articleId = String(dataset.articleId || '').trim()
			const targetUrl = String(dataset.targetUrl || '').trim()

			if (articleId) {
				uni.navigateTo({
					url: `/pages/article/detail?id=${articleId}`
				})
				return
			}

			if (targetUrl) {
				uni.navigateTo({
					url: targetUrl
				})
			}
		}
	}
}
</script>

<style scoped>
.article-list {
	margin-top: 24rpx;
}

.article-title {
	font-size: 28rpx;
	font-weight: 700;
	color: #1e293b;
	margin-bottom: 16rpx;
}

.article-item {
	display: flex;
	flex-direction: row;
	background-color: #ffffff;
	border-radius: 20rpx;
	padding: 22rpx;
	margin-bottom: 16rpx;
	box-shadow: 0 8rpx 24rpx rgba(15, 23, 42, 0.06);
	border: 1rpx solid #e5e7eb;
}

.article-item:last-child {
	margin-bottom: 0;
}

.article-content {
	flex: 1;
	display: flex;
	flex-direction: column;
	justify-content: space-between;
	margin-right: 18rpx;
}

.article-name {
	font-size: 28rpx;
	font-weight: 700;
	color: #0f172a;
	line-height: 1.45;
	display: -webkit-box;
	-webkit-box-orient: vertical;
	-webkit-line-clamp: 2;
	overflow: hidden;
}

.article-summary {
	margin-top: 10rpx;
	margin-bottom: 10rpx;
	font-size: 23rpx;
	color: #64748b;
	line-height: 1.55;
	display: -webkit-box;
	-webkit-box-orient: vertical;
	-webkit-line-clamp: 2;
	overflow: hidden;
}

.article-price {
	font-size: 21rpx;
	color: #f97316;
}

.article-price.free {
	color: #16a34a;
}

.article-thumb {
	width: 148rpx;
	height: 148rpx;
	border-radius: 16rpx;
	background-color: #f8fafc;
	flex-shrink: 0;
}

.article-placeholder {
	padding: 30rpx 24rpx;
	border-radius: 20rpx;
	background: #ffffff;
	border: 1rpx dashed #cbd5e1;
}

.article-placeholder.loading {
	opacity: 0.86;
}

.placeholder-title {
	display: block;
	font-size: 26rpx;
	font-weight: 700;
	color: #334155;
}

.placeholder-desc {
	display: block;
	margin-top: 10rpx;
	font-size: 23rpx;
	line-height: 1.6;
	color: #64748b;
}
</style>
