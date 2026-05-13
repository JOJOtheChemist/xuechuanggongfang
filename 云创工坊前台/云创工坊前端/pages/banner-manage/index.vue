<template>
	<view class="page">
		<view class="header">
			<text class="title">Banner 管理</text>
		</view>

		<view class="banner-list">
			<view v-for="banner in banners" :key="banner.renderKey" class="banner-item">
				<image class="banner-image" :src="banner.image_url" mode="aspectFill" />
				<view class="banner-info">
					<text class="banner-title">{{ banner.title }}</text>
					<text class="banner-status">{{ banner.status === 'online' ? '在线' : '离线' }}</text>
				</view>
				<view class="banner-actions">
					<button @tap="toggleStatus(banner)" size="mini">{{ banner.status === 'online' ? '下线' : '上线' }}</button>
					<button @tap="deleteBanner(banner.bannerId)" size="mini" type="warn">删除</button>
				</view>
			</view>
		</view>

		<view class="add-section">
			<button @tap="chooseImage" type="primary">上传新 Banner</button>
		</view>
	</view>
</template>

<script>
import { getHttpService } from '@/utils/http-services'
import { uploadImageWithPresign } from '@/utils/presigned-upload'

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
				const dashboardService = getHttpService('dashboard-service')
				const token = uni.getStorageSync('token')
				const res = await dashboardService.getAdminBanners({
					_token: token,
					limit: 100
				})
				const bannerList = Array.isArray(res && res.data) ? res.data : []
				this.banners = bannerList.map((item, index) => {
					const bannerId = String((item && (item.id || item._id)) || `banner-${index}`)
					return Object.assign({}, item, {
						bannerId,
						renderKey: `banner-${bannerId}`
					})
				})
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

						const uploadResult = await uploadImageWithPresign({
							scene: 'banner-image',
							filePath,
							token: uni.getStorageSync('token'),
							fileNamePrefix: 'banner'
						})
						const dashboardService = getHttpService('dashboard-service')
						const createRes = await dashboardService.createBanner({
							_token: uni.getStorageSync('token'),
							title: '新 Banner',
							image_url: uploadResult.url,
							link_url: '',
							status: 'online',
							position: 'home',
							sort_order: this.banners.length + 1
						})

						if (!createRes || createRes.code !== 0) {
							throw new Error((createRes && createRes.message) || '保存 Banner 失败')
						}
						
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
				const dashboardService = getHttpService('dashboard-service')
				const res = await dashboardService.updateBannerStatus({
					_token: uni.getStorageSync('token'),
					bannerId: banner.bannerId,
					status: banner.status === 'online' ? 'offline' : 'online'
				})

				if (!res || res.code !== 0) {
					throw new Error((res && res.message) || '更新失败')
				}
				
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
						const dashboardService = getHttpService('dashboard-service')
						const res = await dashboardService.deleteBanner({
							_token: uni.getStorageSync('token'),
							bannerId: id
						})

						if (!res || res.code !== 0) {
							throw new Error((res && res.message) || '删除失败')
						}
						
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
