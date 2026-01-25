<template>
	<view class="page">
		<view class="container">
			<text class="title">批量更新文章积分价格</text>
			<text class="desc">将所有 price_points 为 0 或未设置的文章更新为 5 积分</text>
			
			<button class="update-btn" @tap="handleUpdate" :disabled="updating">
				{{ updating ? '更新中...' : '开始更新' }}
			</button>
			
			<view v-if="result" class="result">
				<text class="result-title">更新结果：</text>
				<text class="result-text">总文章数: {{ result.total }}</text>
				<text class="result-text">已更新: {{ result.updated }}</text>
				
				<view v-if="result.details && result.details.length" class="details">
					<text class="details-title">更新详情：</text>
					<view v-for="(item, index) in result.details" :key="index" class="detail-item">
						<text class="detail-text">《{{ item.title }}》: {{ item.oldPrice }} → {{ item.newPrice }} 积分</text>
					</view>
				</view>
			</view>
		</view>
	</view>
</template>

<script>
export default {
	data() {
		return {
			updating: false,
			result: null
		}
	},
	methods: {
		async handleUpdate() {
			if (this.updating) return
			
			this.updating = true
			uni.showLoading({ title: '更新中...' })
			
			try {
				const service = uniCloud.importObject('update-article-prices')
				const res = await service.updateAllArticlePrices()
				
				uni.hideLoading()
				
				if (res && res.code === 0) {
					this.result = res.data
					uni.showToast({ title: '更新成功', icon: 'success' })
				} else {
					uni.showModal({
						title: '更新失败',
						content: res.message || '未知错误',
						showCancel: false
					})
				}
			} catch (e) {
				uni.hideLoading()
				console.error('更新失败:', e)
				uni.showModal({
					title: '更新失败',
					content: e.message || '网络错误',
					showCancel: false
				})
			} finally {
				this.updating = false
			}
		}
	}
}
</script>

<style scoped>
.page {
	min-height: 100vh;
	background-color: #f5f5f5;
}

.container {
	padding: 48rpx;
}

.title {
	display: block;
	font-size: 36rpx;
	font-weight: 700;
	color: #0f172a;
	margin-bottom: 16rpx;
}

.desc {
	display: block;
	font-size: 26rpx;
	color: #64748b;
	margin-bottom: 48rpx;
	line-height: 1.6;
}

.update-btn {
	width: 100%;
	background-color: #6667ab;
	color: #ffffff;
	border-radius: 12rpx;
	font-size: 28rpx;
	font-weight: 600;
	border: none;
}

.update-btn::after {
	border: none;
}

.result {
	margin-top: 48rpx;
	background-color: #ffffff;
	padding: 32rpx;
	border-radius: 12rpx;
}

.result-title {
	display: block;
	font-size: 28rpx;
	font-weight: 700;
	color: #0f172a;
	margin-bottom: 16rpx;
}

.result-text {
	display: block;
	font-size: 26rpx;
	color: #334155;
	margin-bottom: 8rpx;
}

.details {
	margin-top: 24rpx;
	padding-top: 24rpx;
	border-top: 1rpx solid #e5e7eb;
}

.details-title {
	display: block;
	font-size: 26rpx;
	font-weight: 600;
	color: #0f172a;
	margin-bottom: 16rpx;
}

.detail-item {
	margin-bottom: 12rpx;
}

.detail-text {
	font-size: 24rpx;
	color: #64748b;
}
</style>
