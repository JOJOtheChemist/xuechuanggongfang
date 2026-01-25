<template>
	<view class="preview-container">
		<view v-if="loading" class="loading-state">
			<text class="loading-text">正在打开文档...</text>
			<text class="loading-tips">如果长时间未响应，请点击下方按钮重试</text>
		</view>

		<view v-else-if="error" class="error-state">
			<icon type="warn" size="64" color="#ef4444"></icon>
			<text class="error-text">{{ error }}</text>
			<button class="action-btn retry-btn" @tap="handleOpenDocument">重试打开</button>
		</view>

		<view v-else class="success-state">
			<icon type="success" size="64" color="#10b981"></icon>
			<text class="success-text">文档已下载</text>
			<button class="action-btn open-btn" @tap="handleOpenDocument">再次打开</button>
		</view>
	</view>
</template>

<script>
	export default {
		data() {
			return {
				url: '',
				fileName: '',
				fileType: '',
				loading: true,
				error: '',
				tempFilePath: ''
			}
		},
		onLoad(options) {
			if (options.url) {
				this.url = decodeURIComponent(options.url)
				this.fileName = options.name || '文档'
				// Extract file type from name if not provided
				if (!options.type && this.fileName) {
					const ext = this.fileName.split('.').pop().toLowerCase()
					this.fileType = ext
				} else {
					this.fileType = options.type || 'pdf'
				}
				
				this.handleOpenDocument()
			} else {
				this.error = '参数错误：无效的文件链接'
				this.loading = false
			}
		},
		methods: {
			async handleOpenDocument() {
				this.loading = true
				this.error = ''
				
				try {
					let downloadUrl = this.url
					
					// 智能标准化 URL：先解码再编码，确保无双重编码且中文正确被编码
					try {
						downloadUrl = encodeURI(decodeURI(downloadUrl))
					} catch(e) {
						// Fallback
						if (/[\u4e00-\u9fa5]/.test(downloadUrl)) {
							downloadUrl = encodeURI(downloadUrl)
						}
					}
					
					console.log('[preview] Start download:', downloadUrl)
					
					const downloadRes = await uni.downloadFile({
						url: downloadUrl
					})
					
					if (downloadRes.statusCode === 200) {
						this.tempFilePath = downloadRes.tempFilePath
						this.loading = false
						
						// Attempt to open
						uni.openDocument({
							filePath: this.tempFilePath,
							fileType: this.fileType,
							showMenu: true,
							success: () => {
								console.log('[preview] Open success')
							},
							fail: (err) => {
								console.error('[preview] Open failed', err)
								this.error = '无法调用系统阅读器打开文件(OpenDocument Error)'
								uni.showToast({
									title: '打开失败',
									icon: 'none'
								})
							}
						})
					} else {
						throw new Error(`下载失败: ${downloadRes.statusCode}`)
					}
				} catch (e) {
					console.error('[preview] Error:', e)
					this.loading = false
					this.error = e.message || '文件下载失败'
					
					if (e.errMsg && e.errMsg.includes('domain')) {
						this.error = '下载域名未配置，请联系管理员'
					}
				}
			}
		}
	}
</script>

<style scoped>
	.preview-container {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		height: 100vh;
		background-color: #f8fafc;
		padding: 40rpx;
	}

	.loading-state,
	.error-state,
	.success-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 32rpx;
	}

	.loading-text {
		font-size: 32rpx;
		color: #334155;
		font-weight: 600;
	}
	
	.loading-tips {
		font-size: 24rpx;
		color: #94a3b8;
	}

	.error-text {
		font-size: 30rpx;
		color: #ef4444;
		text-align: center;
	}
	
	.success-text {
		font-size: 32rpx;
		color: #334155;
		font-weight: 600;
	}

	.action-btn {
		margin-top: 48rpx;
		padding: 20rpx 64rpx;
		border-radius: 999rpx;
		font-size: 30rpx;
		font-weight: 500;
		border: none;
	}
	
	.retry-btn {
		background-color: #ffffff;
		color: #4f46e5;
		border: 2rpx solid #4f46e5;
	}
	
	.open-btn {
		background-color: #4f46e5;
		color: #ffffff;
		box-shadow: 0 4rpx 12rpx rgba(79, 70, 229, 0.3);
	}
	
	.open-btn:active {
		transform: scale(0.98);
	}
</style>
