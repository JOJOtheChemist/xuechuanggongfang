<template>
	<view class="article-list">
		<view class="article-title">{{ title }}</view>

		<view v-if="hasArticlesToShow">
			<view
				v-for="article in filteredArticles"
				:key="article.id"
				class="article-item"
				@tap="handleArticleClick(article)"
			>
				<view class="article-content">
					<view class="article-header">
						<text class="article-name">{{ article.title }}</text>
					</view>
					<text class="article-summary">{{ article.summary }}</text>
					<text v-if="article.unlocked" class="article-price free">已解锁</text>
					<text v-else-if="article.pricePoints && article.pricePoints > 0" class="article-price">
						{{ article.pricePoints }} 积分解锁
					</text>
					<text v-else class="article-price free">免费</text>
				</view>
				<image class="article-thumb" :src="article.image" mode="aspectFill" />
			</view>
		</view>

		<view v-else class="article-placeholder" :class="{ loading: !loaded }">
			<text class="placeholder-title">{{ placeholderTitle }}</text>
			<text class="placeholder-desc">{{ placeholderDesc }}</text>
			<button
				v-if="showLoginButton"
				class="placeholder-action"
				@tap.stop="goLogin"
			>
				立即登录查看
			</button>
		</view>
	</view>
</template>

<script>
export default {
	name: 'ArticleList',
	props: {
		articles: {
			type: Array,
			default: () => []
		},
		title: {
			type: String,
			default: '🔥 热门文章'
		},
		categoryId: {
			type: String,
			default: ''
		},
		isLoggedIn: {
			type: Boolean,
			default: false
		},
		loaded: {
			type: Boolean,
			default: false
		}
	},
	data() {
		return {
			selectedTag: '',
			tags: []
		}
	},
	watch: {
		articles: {
			handler() {
				// 保留占位，后续可根据文章变化重置筛选
			},
			immediate: true
		}
	},
	computed: {
		hasArticlesToShow() {
			return Array.isArray(this.filteredArticles) && this.filteredArticles.length > 0
		},
		allTags() {
			if (!this.articles || !this.articles.length) {
				return ['考研', '四六级', '公考']
			}
			const tagSet = new Set(['考研', '四六级', '公考'])
			try {
				const limit = Math.min(this.articles.length, 20)
				for (let i = 0; i < limit; i++) {
					const art = this.articles[i]
					if (art && Array.isArray(art.tags)) {
						for (const t of art.tags) {
							if (typeof t === 'string') tagSet.add(t)
						}
					}
				}
			} catch (e) {
				console.error('Tags computation error', e)
			}
			return Array.from(tagSet)
		},
		filteredArticles() {
			if (!this.selectedTag) return this.articles
			if (!this.articles) return []
			return this.articles.filter(art =>
				art.tags && Array.isArray(art.tags) && art.tags.includes(this.selectedTag)
			)
		},
		placeholderTitle() {
			if (!this.loaded) return '热门文章加载中...'
			if (!this.isLoggedIn) return '登录后可查看热门文章'
			return '暂时没有可展示的热门文章'
		},
		placeholderDesc() {
			if (!this.loaded) return '请稍候，我们正在为你请求最新的学习干货'
			if (!this.isLoggedIn) return '请先登录，确认账号状态后即可查看该板块的热门文章'
			return '稍后再试，或联系管理员确认该板块的文章配置'
		},
		showLoginButton() {
			return !this.isLoggedIn && this.loaded
		}
	},
	methods: {
		goLogin() {
			uni.navigateTo({
				url: '/pages/auth/login/index'
			})
		},
		selectTag(tag) {
			if (this.selectedTag === tag) {
				this.selectedTag = ''
			} else {
				this.selectedTag = tag
			}
		},
		handleArticleClick(article) {
			if (!article || !article.id) {
				return
			}
			const token = uni.getStorageSync('token')
			if (!token) {
				uni.navigateTo({
					url: '/pages/auth/login/index'
				})
				return
			}
			if (!article.unlocked && article.pricePoints && article.pricePoints > 0) {
				uni.showModal({
					title: '确认解锁',
					content: `此文章需要消耗 ${article.pricePoints} 积分解锁，确认继续？`,
					success: async (res) => {
						if (res.confirm) {
							await this.unlockArticle(article, token)
						}
					}
				})
			} else {
				uni.navigateTo({
					url: `/pages/article/detail?id=${article.id}`
				})
			}
		},
		async unlockArticle(article, token) {
			uni.showLoading({ title: '解锁中...' })
			try {
				const articleService = uniCloud.importObject('article-service')
				const result = await articleService.unlockArticle({
					articleId: article.id,
					_token: token
				})
				uni.hideLoading()
				if (result && result.code === 0) {
					const spent = (result.data && result.data.pricePoints) || article.pricePoints || 0
					const remain = (result.data && result.data.remainingPoints)
					const title = (result.data && result.data.articleTitle) || article.title || ''
					const content = remain != null
						? `已扣 ${spent} 积分（剩余 ${remain} 积分），已永久解锁文章“${title}”。`
						: `已永久解锁文章“${title}”。`
					try { article.unlocked = true } catch (e) {}
					uni.showModal({
						title: '解锁成功',
						content,
						showCancel: false
					})
					setTimeout(() => {
						uni.navigateTo({
							url: `/pages/article/detail?id=${article.id}`
						})
					}, 1000)
				} else {
					uni.showModal({
						title: '解锁失败',
						content: result.message || '未知错误',
						showCancel: false
					})
				}
			} catch (e) {
				uni.hideLoading()
				console.error('[ArticleList] 解锁失败', e)
				uni.showModal({
					title: '解锁失败',
					content: e.message || '网络错误',
					showCancel: false
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
	font-size: 26rpx;
	font-weight: 700;
	color: #1e293b;
	margin-bottom: 16rpx;
}

.article-item {
	display: flex;
	flex-direction: row;
	background-color: #ffffff;
	border-radius: 16rpx;
	padding: 20rpx;
	margin-bottom: 16rpx;
	box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.06);
	border: 1rpx solid #e5e7eb;
}

.article-item:last-child {
	margin-bottom: 0;
}

.article-item:active {
	background-color: #f8fafc;
}

.article-content {
	flex: 1;
	display: flex;
	flex-direction: column;
	justify-content: space-between;
	margin-right: 16rpx;
}

.article-name {
	flex: 1;
	font-size: 26rpx;
	font-weight: 600;
	color: #0f172a;
	line-height: 1.4;
	display: -webkit-box;
	-webkit-box-orient: vertical;
	-webkit-line-clamp: 2;
	overflow: hidden;
}

.article-summary {
	font-size: 22rpx;
	color: #64748b;
	line-height: 1.5;
	display: -webkit-box;
	-webkit-box-orient: vertical;
	-webkit-line-clamp: 2;
	overflow: hidden;
	margin-bottom: 8rpx;
}

.article-price {
	font-size: 20rpx;
	color: #f97316;
}

.article-price.free {
	color: #16a34a;
}

.article-thumb {
	width: 180rpx;
	height: 120rpx;
	border-radius: 12rpx;
	background-color: #e5e7eb;
	flex-shrink: 0;
}

.tags-scroll {
	width: 100%;
	white-space: nowrap;
	margin-bottom: 24rpx;
}

.tags-wrapper {
	display: inline-flex;
	padding: 0 4rpx;
}

.tag-filter-item {
	font-size: 24rpx;
	color: #64748b;
	background-color: #f1f5f9;
	padding: 12rpx 24rpx;
	border-radius: 999rpx;
	margin-right: 16rpx;
	transition: all 0.2s;
}

.tag-filter-item.active {
	color: #ffffff;
	background-color: #4f46e5;
	font-weight: 500;
	box-shadow: 0 4rpx 12rpx rgba(79, 70, 229, 0.3);
}

.tag-filter-item:active {
	opacity: 0.8;
}

.article-placeholder {
	margin-top: 12rpx;
	padding: 32rpx 24rpx;
	border-radius: 24rpx;
	background-color: #f8fafc;
	border: 2rpx dashed #cbd5f5;
	display: flex;
	flex-direction: column;
	gap: 12rpx;
}

.article-placeholder.loading {
	border-style: solid;
	background-color: #f1f5f9;
}

.placeholder-title {
	font-size: 26rpx;
	font-weight: 600;
	color: #1e293b;
}

.placeholder-desc {
	font-size: 22rpx;
	color: #64748b;
	line-height: 1.6;
}

.placeholder-action {
	margin-top: 4rpx;
	align-self: flex-start;
	background: linear-gradient(135deg, #6366f1, #8b5cf6);
	color: #fff;
	font-size: 24rpx;
	padding: 12rpx 28rpx;
	border-radius: 999rpx;
	border: none;
}

.placeholder-action::after {
	border: none;
}
</style>
