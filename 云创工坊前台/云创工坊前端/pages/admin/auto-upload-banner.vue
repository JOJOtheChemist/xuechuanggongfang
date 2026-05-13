<template>
	<view class="page">
		<text class="title">自动上传 Banner</text>
		<button @tap="autoUpload" type="primary" :disabled="uploading">
			{{ uploading ? '上传中...' : '一键上传' }}
		</button>
		<view v-if="log" class="log">
			<text>{{ log }}</text>
		</view>
	</view>
</template>

<script>
import { getHttpService } from '@/utils/http-services'
import { uploadImageWithPresign } from '@/utils/presigned-upload'

export default {
	data() {
		return {
			uploading: false,
			log: ''
		}
	},
	methods: {
		async autoUpload() {
			this.uploading = true
			this.log = '开始自动上传...\n'
			
			try {
				// 1. 先下载 static 里的图片到临时目录
				this.log += '正在下载本地图片...\n'
				const downloadRes = await uni.downloadFile({
					url: '/pages/admin/static/ad-banner-1.png' // 这个会自动映射到本地 static
				})
				
				if (downloadRes.statusCode !== 200) {
					throw new Error('下载本地图片失败')
				}
				
				const tempFilePath = downloadRes.tempFilePath
				this.log += `临时文件: ${tempFilePath}\n\n`
				
				// 2. 上传到对象存储
				this.log += '正在上传到对象存储...\n'
				const uploadRes = await uploadImageWithPresign({
					scene: 'banner-image',
					filePath: tempFilePath,
					token: uni.getStorageSync('token'),
					fileNamePrefix: 'auto-banner'
				})
				
				console.log('上传结果:', uploadRes)
				const fileUrl = uploadRes.url
				
				if (!fileUrl) {
					throw new Error('上传失败，未返回图片地址')
				}
				
				this.log += `上传成功！\nURL: ${fileUrl}\n\n`
				
				// 3. 写入后端 Banner 表
				this.log += '正在写入 Banner 数据...\n'
				const dashboardService = getHttpService('dashboard-service')
				const createRes = await dashboardService.createBanner({
					_token: uni.getStorageSync('token'),
					title: '首页 Banner',
					image_url: fileUrl,
					link_url: '',
					status: 'online',
					position: 'home',
					sort_order: 1
				})

				if (!createRes || createRes.code !== 0) {
					throw new Error((createRes && createRes.message) || '写入 Banner 失败')
				}
				
				this.log += '✅ 全部完成！\n\n现在可以回到首页查看效果了'
				
				uni.showModal({
					title: '上传成功',
					content: '已自动上传并配置 banner',
					showCancel: false,
					success: () => {
						uni.reLaunch({ url: '/pages/volunteer/index' })
					}
				})
			} catch (e) {
				console.error('自动上传失败:', e)
				this.log += `\n❌ 失败: ${e.message || '未知错误'}`
				uni.showModal({
					title: '上传失败',
					content: e.message || '未知错误',
					showCancel: false
				})
			} finally {
				this.uploading = false
			}
		}
	}
}
</script>

<style scoped>
.page {
	padding: 60rpx;
	display: flex;
	flex-direction: column;
	align-items: center;
}

.title {
	font-size: 40rpx;
	font-weight: bold;
	margin-bottom: 60rpx;
	color: #333;
}

button {
	width: 500rpx;
	margin-bottom: 40rpx;
}

.log {
	padding: 30rpx;
	background-color: #f5f5f5;
	border-radius: 12rpx;
	width: 100%;
	max-height: 800rpx;
	overflow-y: scroll;
}

.log text {
	font-size: 24rpx;
	color: #666;
	line-height: 1.8;
	white-space: pre-wrap;
	font-family: monospace;
}
</style>
