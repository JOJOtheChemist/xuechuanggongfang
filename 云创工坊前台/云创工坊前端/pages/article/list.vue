<template>
	<view class="page-root">
		<view class="status-bar"></view>
		<view class="nav-bar">
			<view class="back-btn" @tap="goBack">
				<text class="back-arrow">←</text>
			</view>
			<text class="nav-title">{{ pageTitle }}</text>
		</view>

		<!-- 分类筛选组件 -->
		<article-filter 
			:category-id="currentCategoryId" 
			@change="onFilterChange"
		/>

		<!-- 文章列表 -->
		<scroll-view class="list-scroll" scroll-y @scrolltolower="loadMore">
			<view class="list-content">
				<view 
					v-for="(a, index) in getDisplayList()" 
					:key="a._id ? a._id : (a.id ? a.id : index)" 
					class="row" 
					@tap="openDetail(a)"
				>
					<view class="meta">
						<text class="title">{{ a.title }}</text>
						<text class="summary">{{ a.summary || '' }}</text>
						
						<!-- 文章标签 -->
						<view class="article-tags" v-if="a.tags && a.tags.length > 0">
							<text class="tag-item" v-for="(t, ti) in a.tags" :key="ti">{{ t }}</text>
						</view>
	
						<view class="badges">
							<text v-if="(a.price_points||0) <= 0" class="badge free">免费</text>
							<text v-else class="badge pay">{{ a.price_points }} 积分</text>
						</view>
					</view>
					<image v-if="a.cover_image" :src="a.cover_image" class="thumb" mode="aspectFill" />
				</view>
				
				<view v-if="loading" class="loading">加载中...</view>
				<view v-else-if="!list.length" class="empty">暂无文章</view>
				<view v-else-if="list.length >= total" class="no-more">—— 到底了 ——</view>
			</view>
		</scroll-view>
	</view>
</template>

<script>
import ArticleFilter from '@/components/article/ArticleFilter.vue'

export default {
	components: {
		ArticleFilter
	},
	data() {
		return {
			currentCategoryId: '',
			pageTitle: '全部文章',
			
			// 选中的标签（由 Filter 组件传出）
			filterTags: {
				tag: '', 
				subTag: '', 
				thirdTag: ''
			},
			
			pageNum: 1,
			pageSize: 20,
			list: [],
			fullList: [],
			total: 0,
			loading: false
		}
	},
	onLoad(options) {
		if (options.categoryId) {
			this.currentCategoryId = options.categoryId
		}
		if (options.title) {
			this.pageTitle = decodeURIComponent(options.title) + '全部文章'
		}
		this.reload()
	},
	methods: {
		goBack() {
			uni.navigateBack()
		},
		onFilterChange(tags) {
			this.filterTags = tags
			// 标签变化时重新从后端查询
			this.reload()
		},
		async reload() {
			this.pageNum = 1
			this.list = []
			this.fullList = []
			await this.fetch()
		},
		async loadMore() {
			if (this.loading) return
			// 允许在任何标签下分页加载
			if (this.list.length >= this.total) return 
			this.pageNum += 1
			await this.fetch()
		},
		async fetch() {
			try {
				this.loading = true
				
				// 构建标签数组
				const tags = []
				if (this.filterTags.tag) tags.push(this.filterTags.tag)
				if (this.filterTags.subTag) tags.push(this.filterTags.subTag)
				if (this.filterTags.thirdTag) tags.push(this.filterTags.thirdTag)
				
				const articleService = uniCloud.importObject('article-service')
				const res = await articleService.getList({
					pageNum: this.pageNum,
					pageSize: this.pageSize,
					categoryId: this.currentCategoryId,
					keyword: '',
					tags: tags.length > 0 ? tags : undefined
				})
				
				if (res && res.code === 0 && res.data) {
					const list = res.data.list || []
					this.total = res.data.total || 0
					
					if (this.pageNum === 1) {
						this.fullList = list
					} else {
						const ids = new Set(this.fullList.map(i => i._id || i.id))
						const newItems = list.filter(i => !ids.has(i._id || i.id))
						this.fullList = this.fullList.concat(newItems)
					}
					this.list = this.fullList 
				}
			} catch (e) {
				console.error('[ArticleList] fetch error', e)
			} finally {
				this.loading = false
			}
		},
		getDisplayList() {
			// 现在后端已经按标签筛选，直接返回 fullList
			return this.fullList
		},
		openDetail(a) {
			const id = a._id || a.id || a.article_id || ''
			if (!id) return
			uni.navigateTo({ url: `/pages/article/detail?id=${id}` })
		}
	}
}
</script>

<style scoped>
.page-root {
	height: 100vh;
	display: flex;
	flex-direction: column;
	background-color: #f8fafc;
}

.status-bar {
	height: var(--status-bar-height);
	background-color: #ffffff;
}

.nav-bar {
	height: 88rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	position: relative;
	background-color: #ffffff;
	border-bottom: 1rpx solid #e2e8f0;
	z-index: 10;
}

.back-btn {
	position: absolute;
	left: 0;
	top: 0;
	height: 88rpx;
	width: 88rpx;
	display: flex;
	align-items: center;
	justify-content: center;
}

.back-arrow {
	font-size: 36rpx;
	font-weight: bold;
	color: #334155;
}

.nav-title {
	font-size: 32rpx;
	font-weight: 600;
	color: #0f172a;
}

.list-scroll {
	flex: 1;
	height: 0;
}

.list-content {
	padding: 24rpx;
}

.row {
	display: flex;
	background: #fff;
	border: 1rpx solid #e2e8f0;
	border-radius: 20rpx;
	padding: 24rpx;
	margin-bottom: 24rpx;
}

.meta {
	flex: 1;
	margin-right: 24rpx;
	display: flex;
	flex-direction: column;
}

.title {
	font-weight: 600;
	font-size: 30rpx;
	color: #0f172a;
	line-height: 1.4;
	margin-bottom: 8rpx;
}

.summary {
	font-size: 24rpx;
	color: #64748b;
	line-height: 1.4;
	margin-bottom: 16rpx;
	display: -webkit-box;
	-webkit-box-orient: vertical;
	-webkit-line-clamp: 2;
	overflow: hidden;
}

.article-tags {
	display: flex;
	flex-wrap: wrap;
	gap: 12rpx;
	margin-bottom: 16rpx;
}

.tag-item {
	font-size: 20rpx;
	color: #4f46e5;
	background: #eef2ff;
	padding: 4rpx 12rpx;
	border-radius: 6rpx;
}

.badges {
	display: flex;
	align-items: center;
}

.badge {
	font-size: 20rpx;
	padding: 4rpx 12rpx;
	border-radius: 6rpx;
}

.badge.free {
	background: #f0fdf4;
	color: #16a34a;
}

.badge.pay {
	background: #fff7ed;
	color: #ea580c;
}

.thumb {
	width: 160rpx;
	height: 160rpx;
	border-radius: 12rpx;
	background-color: #f1f5f9;
}

.loading, .empty, .no-more {
	text-align: center;
	padding: 30rpx;
	color: #94a3b8;
	font-size: 26rpx;
}
</style>
