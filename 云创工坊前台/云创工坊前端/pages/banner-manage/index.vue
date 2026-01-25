<template>
	<view class="page">
		<view class="header">
			<text class="title">Banner 管理</text>
		</view>

		<view class="banner-list">
			<view v-for="banner in banners" :key="banner._id" class="banner-item">
				<image class="banner-image" :src="banner.image_url" mode="aspectFill" />
				<view class="banner-info">
					<text class="banner-title">{{ banner.title }}</text>
					<text class="banner-status">{{ banner.status === 'online' ? '在线' : '离线' }}</text>
				</view>
				<view class="banner-actions">
					<button @tap="toggleStatus(banner)" size="mini">{{ banner.status === 'online' ? '下线' : '上线' }}</button>
					<button @tap="deleteBanner(banner._id)" size="mini" type="warn">删除</button>
				</view>
			</view>
		</view>

		<view class="add-section">
			<button @tap="chooseImage" type="primary">上传新 Banner</button>
		</view>
	</view>
</template>

<script>
export default {
	data() {
		return {
			banners: [],
			isUploading: false
		}
	},
	onShow() {
		this.loadBanners()
	},
	methods: {
		async loadBanners() {
			try {
				const db = uniCloud.database()
				const res = await db.collection('banners')
					.orderBy('sort_order', 'asc')
					.get()
				
				this.banners = res.result.data || []
			} catch (e) {
				console.error('加载 banner 失败:', e)
				uni.showToast({ title: '加载失败', icon: 'none' })
			}
		},
		chooseImage() {
			if (this.isUploading) return
			
			uni.chooseImage({
				count: 1,
				sizeType: ['compressed'],
				success: async (res) => {
					if (!res.tempFilePaths || !res.tempFilePaths.length) return
					const filePath = res.tempFilePaths[0]
					
					try {
						this.isUploading = true
						uni.showLoading({ title: '上传中...' })
						
						// 上传到云存储
						const cloudPath = `banners/${Date.now()}.jpg`
						const uploadRes = await uniCloud.uploadFile({
							filePath,
							cloudPath
						})
						
						console.log('上传结果:', uploadRes)
						const fileID = uploadRes.fileID
						
						if (!fileID) {
							throw new Error('上传失败，未返回 fileID')
						}
						
						// 插入数据库
						const db = uniCloud.database()
						await db.collection('banners').add({
							title: '新 Banner',
							image_url: fileID,
							link_url: '',
							status: 'online',
							sort_order: this.banners.length + 1,
							create_date: Date.now()
						})
						
						uni.hideLoading()
						uni.showToast({ title: '上传成功', icon: 'success' })
						this.loadBanners()
					} catch (e) {
						console.error('上传 banner 失败:', e)
						uni.hideLoading()
						uni.showModal({
							title: '上传失败',
							content: e.message || '未知错误',
							showCancel: false
						})
					} finally {
						this.isUploading = false
					}
				}
			})
		},
		async toggleStatus(banner) {
			try {
				const db = uniCloud.database()
				await db.collection('banners').doc(banner._id).update({
					status: banner.status === 'online' ? 'offline' : 'online'
				})
				
				uni.showToast({ title: '已更新', icon: 'success' })
				this.loadBanners()
			} catch (e) {
				console.error('更新状态失败:', e)
				uni.showToast({ title: '操作失败', icon: 'none' })
			}
		},
		async deleteBanner(id) {
			uni.showModal({
				title: '确认删除',
				content: '删除后无法恢复',
				success: async (res) => {
					if (!res.confirm) return
					
					try {
						const db = uniCloud.database()
						await db.collection('banners').doc(id).remove()
						
						uni.showToast({ title: '已删除', icon: 'success' })
						this.loadBanners()
					} catch (e) {
						console.error('删除失败:', e)
						uni.showToast({ title: '删除失败', icon: 'none' })
					}
				}
			})
		}
	}
}
</script>

<style scoped>
.page {
	padding: 24rpx;
	background-color: #f5f5f5;
	min-height: 100vh;
}

.header {
	margin-bottom: 24rpx;
}

.title {
	font-size: 36rpx;
	font-weight: bold;
	color: #333;
}

.banner-list {
	margin-bottom: 24rpx;
}

.banner-item {
	background-color: #fff;
	border-radius: 12rpx;
	padding: 24rpx;
	margin-bottom: 16rpx;
	display: flex;
	flex-direction: column;
}

.banner-image {
	width: 100%;
	height: 300rpx;
	border-radius: 8rpx;
	margin-bottom: 16rpx;
}

.banner-info {
	display: flex;
	flex-direction: row;
	justify-content: space-between;
	align-items: center;
	margin-bottom: 16rpx;
}

.banner-title {
	font-size: 28rpx;
	color: #333;
}

.banner-status {
	font-size: 24rpx;
	color: #999;
}

.banner-actions {
	display: flex;
	flex-direction: row;
	justify-content: flex-end;
}

.banner-actions button {
	margin-left: 16rpx;
}

.add-section {
	padding: 24rpx 0;
}
</style>
