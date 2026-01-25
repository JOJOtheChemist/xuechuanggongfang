<template>
	<view class="page-root">
		<view class="app-container">

			
			<!-- 加载中 -->
			<view v-if="loading" class="loading-wrapper">
				<text class="loading-text">加载中...</text>
			</view>
			
			<!-- 错误提示 -->
			<view v-else-if="error" class="error-wrapper">
				<text class="error-text">{{ error }}</text>
				<button class="retry-btn" @tap="loadDetail">重试</button>
			</view>
			
		<!-- 未解锁提示 -->
		<view v-else-if="article && !article.unlocked" class="unlock-wrapper">
			<text class="article-title">{{ article.title }}</text>
			
			<view class="article-meta">
				<text class="meta-item">作者: {{ article.author_name || '未知' }}</text>
				<text class="meta-item">{{ publishTimeText }}</text>
			</view>
			
			<image 
				v-if="article.cover_image" 
				class="article-cover" 
				:src="article.cover_image" 
				mode="aspectFill"
			/>
			
			<view v-if="article.summary" class="article-summary">
				<text class="summary-text">{{ article.summary }}</text>
			</view>
			
			<view class="unlock-prompt">
				<view class="unlock-icon">🔒</view>
				<text class="unlock-title">此文章需要解锁</text>
				<text class="unlock-desc">需要消耗 {{ article.price_points }} 积分解锁后查看完整内容</text>
				<button class="unlock-btn" @tap="handleUnlock">
					{{ unlocking ? '解锁中...' : `消耗 ${article.price_points} 积分解锁` }}
				</button>
			</view>
		</view>
		
		<!-- 文章内容 -->
		<view v-else-if="article && article.unlocked" class="article-wrapper">
			<text class="article-title">{{ article.title }}</text>
				
				<view class="article-meta">
					<text class="meta-item">作者: {{ article.author_name || '未知' }}</text>
					<text class="meta-item">{{ publishTimeText }}</text>
				</view>

				<!-- 标签展示 -->
				<view v-if="article.tags && article.tags.length" class="tags-container">
					<view v-for="(tag, index) in article.tags" :key="index" class="tag-item">
						{{ tag }}
					</view>
				</view>
				
				<image 
					v-if="article.cover_image" 
					class="article-cover" 
					:src="article.cover_image" 
					mode="aspectFill"
					:webp="true"
				/>
				
				<view v-if="article.summary" class="article-summary">
					<text class="summary-text">{{ article.summary }}</text>
				</view>
				
				<!-- PDF 阅读入口 (提取到正文上方，更加显眼) -->
				<view v-if="originalPdfFile" class="original-pdf-link" @tap="handleAttachmentClick(originalPdfFile)">
					<view class="pdf-info-wrap">
						<text class="pdf-name">{{ originalPdfFile.name || 'PDF 文档' }}</text>
					</view>
					<view class="pdf-action-btn">
						<text class="pdf-action-text">阅读 PDF</text>
						<text class="pdf-arrow">→</text>
					</view>
				</view>

				<!-- 图文正文 -->
				<view v-if="galleryImages.length" class="gallery">
					<view v-for="(img, idx) in galleryImages" :key="idx" class="gallery-item">
						<image :src="img" mode="widthFix" class="gallery-image" :lazy-load="true" :webp="true" @tap="previewGallery(idx)" />
						<text class="page-tip">第 {{ idx + 1 }} 页 / 共 {{ galleryImages.length }} 页</text>
					</view>
				</view>
				<view v-else class="article-content">
					<rich-text :nodes="article.content || '暂无内容'"></rich-text>
				</view>
				
				<!-- 附件列表（仅显示非图集类型的附件） -->
				<view v-if="downloadableAttachments.length" class="attachments-section">
					<text class="attachments-title">附件 ({{ downloadableAttachments.length }})</text>
					<view 
						v-for="(file, index) in downloadableAttachments" 
						:key="index"
						class="attachment-item"
						@tap="handleAttachmentClick(file)"
					>
						<view class="attachment-info">
							<view class="attachment-text">
								<text class="attachment-name">{{ file.name || '附件' }}</text>
								<text v-if="file.size" class="attachment-size">{{ formatFileSize(file.size) }}</text>
								</view>
							</view>
							<text class="attachment-action">预览</text>
						</view>
					</view>
				
				<view class="article-stats">
					<text class="stat-item">阅读 {{ articleViews }}</text>
					<text class="stat-item">点赞 {{ articleLikes }}</text>
				</view>
			</view>
		</view>

		<!-- Unified Debug Footer -->
		<!-- Hidden recruitment debug tags
		<view class="global-debug" style="margin-top: 40rpx; padding-bottom: 60rpx; font-size: 20rpx; color: #ccc; text-align: center; display: flex; flex-direction: column; gap: 6rpx;">
			<text>UID: {{ global_uid || '未登录' }}</text>
			<text>终身: {{ global_lifetime_inviter }}</text>
			<text>团队: {{ global_team_inviter }}</text>
			<text>业务: {{ global_business_inviter }}</text>
		</view>
		-->
	</view>
</template>

<script>
export default {
	components: {
	},
	data() {
		return {
			articleId: '',
			article: null,
			loading: true,
			error: '',
			userAvatar: '',
			userNickname: '',
			userUid: '',
			unlocking: false
		}
	},
	computed: {
		galleryImages() {
			try {
				const atts = (this.article && this.article.attachments) || []
				// 优先 pdf-images 类型
				const pdfImages = atts.find(a => a && a.type === 'pdf-images' && Array.isArray(a.images))
				if (pdfImages) return pdfImages.images || []
				// 兼容：若有普通图片附件，收集 fileID
				const imgs = atts.filter(a => a && a.fileID && /\.(webp|png|jpe?g|gif)$/i.test(a.name||''))
				return imgs.map(a => a.fileID)
			} catch (e) { return [] }
		},
		originalPdfFile() {
			try {
				const atts = (this.article && this.article.attachments) || []
				// 优先找带直链的新型 PDF 附件
				const newPdf = atts.find(a => a && a.type === 'pdf' && a.fileID)
				if (newPdf) return newPdf
				
				// 兜底找旧版或匹配文件名的
				return atts.find(a => a && (a.type === 'pdf-images' || (a.name && a.name.toLowerCase().endsWith('.pdf'))))
			} catch (e) { return null }
		},
		publishTimeText() {
			if (!this.article || !this.article.publish_time) {
				return ''
			}
			try {
				const date = new Date(this.article.publish_time)
				const y = date.getFullYear()
				const m = String(date.getMonth() + 1).padStart(2, '0')
				const d = String(date.getDate()).padStart(2, '0')
				return y + '-' + m + '-' + d
			} catch (e) {
				return ''
			}
		},
		articleViews() {
			if (!this.article || !this.article.stats) {
				return 0
			}
			return this.article.stats.views || 0
		},
		articleLikes() {
			if (!this.article || !this.article.stats) {
				return 0
			}
			return this.article.stats.likes || 0
		},
		downloadableAttachments() {
			if (!this.article || !this.article.attachments) return []
			
			const mainPdf = this.originalPdfFile
			
			return this.article.attachments.filter(a => {
				// 1. 过滤掉 pdf-images (已展示为图集)
				if (a.type === 'pdf-images') return false
				
				// 2. 过滤掉作为“主 PDF”已经在顶部展示的文件
				if (mainPdf && (a === mainPdf || (a.fileID && mainPdf.fileID && a.fileID === mainPdf.fileID))) {
					return false
				}
				
				return true
			})
		}
	},
	methods: {
		loadUserInfo() {
			try {
				const storedUserInfo = uni.getStorageSync('userInfo')
				const userId = uni.getStorageSync('userId')
				
				if (storedUserInfo) {
					this.userAvatar = storedUserInfo.avatar || ''
					this.userNickname = storedUserInfo.nickname || '用户'
					this.userUid = userId || storedUserInfo.uid || ''
				}
			} catch (e) {
				console.error('[article-detail] 加载用户信息失败', e)
			}
		},
		async loadDetail() {
			this.loading = true
			this.error = ''
			
			try {
				const token = uni.getStorageSync('token')
				if (!token) {
					this.error = '请先登录后再查看文章'
					this.loading = false
					return
				}
				
				const articleService = uniCloud.importObject('article-service')
				const res = await articleService.getArticleDetail({
					articleId: this.articleId,
					_token: token
				})
				
			console.log('[article-detail] 获取文章结果', res)
			
			if (!res || !res.data) {
				this.error = (res && res.message) ? res.message : '获取文章失败'
				this.loading = false
				return
			}
			
			this.article = res.data
			
			// 调试日志
			console.log('[article-detail] 文章数据:', {
				title: this.article.title,
				price_points: this.article.price_points,
				unlocked: this.article.unlocked,
				hasContent: !!this.article.content
			})
			} catch (e) {
				console.error('[article-detail] 获取失败', e)
				this.error = e.message || '获取文章失败'
			} finally {
				this.loading = false
			}
		},
		
		// 格式化文件大小
		formatFileSize(bytes) {
			if (!bytes) return '0 B'
			const k = 1024
			const sizes = ['B', 'KB', 'MB', 'GB']
			const i = Math.floor(Math.log(bytes) / Math.log(k))
			return (bytes / Math.pow(k, i)).toFixed(2) + ' ' + sizes[i]
		},
		
	// 解锁文章
	async handleUnlock() {
		if (this.unlocking) return
		
		if (!this.article || !this.article.price_points) {
			uni.showToast({ title: '文章信息异常', icon: 'none' })
			return
		}
		
		// 确认弹窗
		uni.showModal({
			title: '确认解锁',
			content: `解锁此文章需要消耗 ${this.article.price_points} 积分，确认继续？`,
			success: async (res) => {
				if (!res.confirm) return
				
				this.unlocking = true
				uni.showLoading({ title: '解锁中...' })
				
				try {
					const token = uni.getStorageSync('token')
					const articleService = uniCloud.importObject('article-service')
					const result = await articleService.unlockArticle({
						articleId: this.articleId,
						_token: token
					})
					
					uni.hideLoading()
					
					if (result && result.code === 0) {
						const spent = this.article && this.article.price_points || 0
						const remain = result.data && result.data.remainingPoints
						const title = this.article && this.article.title || ''
						const content = remain != null
							? `已扣 ${spent} 积分（剩余 ${remain} 积分），已永久解锁文章“${title}”。`
							: `已永久解锁文章“${title}”。`
						uni.showModal({ title: '解锁成功', content, showCancel: false })
						// 重新加载文章内容
						setTimeout(() => {
							this.loadDetail()
						}, 800)
					} else {
						uni.showModal({
							title: '解锁失败',
							content: result.message || '未知错误',
							showCancel: false
						})
					}
				} catch (e) {
					uni.hideLoading()
					console.error('[article-detail] 解锁失败', e)
					uni.showModal({
						title: '解锁失败',
						content: e.message || '网络错误',
						showCancel: false
					})
				} finally {
					this.unlocking = false
				}
			}
		})
	},
	
	// 处理附件点击 - 跳转到预览页面
		previewGallery(index) {
			if (!this.galleryImages || this.galleryImages.length === 0) return
			uni.previewImage({
				current: this.galleryImages[index],
				urls: this.galleryImages
			})
		},
		async handleAttachmentClick(file) {
			if (!file) {
				uni.showToast({ title: '附件信息不存在', icon: 'none' })
				return
			}
			
			// 获取文件名后缀
			const name = file.name || ''
			const ext = name.split('.').pop().toLowerCase()
			const isDoc = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'].includes(ext)
			
			// 1. 如果是 PDF/Office 文档且有直连/fileID，直接调用原生打开 (跳过预览页)
			if (isDoc && file.fileID) {
				uni.showLoading({ title: '正在打开文档...', mask: true })
				
				const openDoc = (url) => {
					// 1. 彻底清理 URL：去除首尾空格，并确保 URL 编码正确且不重复
					try {
						url = url.trim();
						// 如果包含中文或特殊字符，进行标准化编码
						if (/[^\x00-\x7F]/.test(url) || url.includes(' ')) {
							url = encodeURI(decodeURI(url));
						}
					} catch (e) {
						console.warn('[article-detail] URL 清理建议失败:', e);
					}

					console.log('[article-detail] 最终尝试打开 URL:', url)
					
					uni.downloadFile({
						url: url,
						success: (res) => {
							if (res.statusCode === 200) {
								uni.openDocument({
									filePath: res.tempFilePath,
									fileType: ext,
									showMenu: true,
									success: () => {
										console.log('[article-detail] 打开文档成功')
										uni.hideLoading()
									},
									fail: (err) => {
										console.error('[article-detail] 打开文档失败:', err)
										uni.hideLoading()
										this.navigateToPreview(url, name, ext)
									}
								})
							} else {
								console.error('[article-detail] 下载失败, statusCode:', res.statusCode, '响应结果:', res)
								uni.hideLoading()
								
								// 如果是 403，通常还是 CDN 没恢复
								if (res.statusCode === 403) {
									uni.showModal({
										title: 'CDN 访问受限',
										content: '服务器返回 403，可能是 CDN 流量虽然升级了，但由于之前的欠费停机，节点缓存还未完全刷新（通常需要 5-10 分钟）。请稍后重试。',
										showCancel: false
									})
								} else {
									this.navigateToPreview(url, name, ext)
								}
							}
						},
						fail: (err) => {
							console.error('[article-detail] 下载环节断言失败 (fail callback):', err)
							uni.hideLoading()
							
							// TLS 错误专项提示
							if (err.errMsg && err.errMsg.includes('TLS')) {
								uni.showModal({
									title: '网络安全连接失败',
									content: '检测到 TLS 连接被断开。请检查：\n1. 微信开发者工具中是否勾选了“不校验合法域名”？\n2. CDN 节点是否已完全恢复（升级流量后可能需几分钟生效）？\n3. 手机网络是否开启了代理或抓包工具？',
									showCancel: false
								})
							} else {
								uni.showToast({ title: '下载失败: ' + (err.errMsg || '网络错误'), icon: 'none' })
							}
						}
					})
				}

				try {
					let downloadUrl = file.fileID
					// 如果是云文件 ID，先换取临时链接
					if (downloadUrl.startsWith('cloud://')) {
						const res = await uniCloud.getTempFileURL({ fileList: [file.fileID] })
						if (res.fileList && res.fileList[0].tempFileURL) {
							downloadUrl = res.fileList[0].tempFileURL
						}
					}
					openDoc(downloadUrl)
				} catch (e) {
					console.error('[article-detail] 获取下载链接异常:', e)
					uni.hideLoading()
					uni.showToast({ title: '文件准备失败', icon: 'none' })
				}
				return
			}

			// 2. 旧版“PDF转图集”模式，直接预览图片
			if (file.type === 'pdf-images' && file.images && file.images.length > 0) {
				uni.previewImage({
					current: file.images[0],
					urls: file.images
				})
			} 
			// 3. 其他图片类型直接预览
			else if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext) && file.fileID) {
				uni.previewImage({
					urls: [file.fileID]
				})
			} 
			// 4. 其他类型暂时不支持
			else {
				uni.showToast({ title: '暂不支持查看此格式', icon: 'none' })
			}
		},
		navigateToPreview(url, name, type) {
			uni.showModal({
				title: '提示',
				content: '直接打开文档失败，是否尝试使用增强预览模式？',
				success: (res) => {
					if (res.confirm) {
						uni.navigateTo({
							url: `/pages/article/preview?url=${encodeURIComponent(url)}&name=${name}&type=${type}`
						})
					}
				}
			})
		}
	},
	onLoad(options) {
		this.loadUserInfo()
		
		this.articleId = options.id || ''
		
		if (!this.articleId) {
			this.error = '文章 ID 不存在'
			this.loading = false
			return
		}
		
		this.loadDetail()
	}
}
</script>

<style scoped>
.page-root {
	min-height: 100vh;
	background-color: #f8fafc;
}

.app-container {
	max-width: 750rpx;
	margin: 0 auto;
}


.loading-wrapper,
.error-wrapper {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	padding: 120rpx 48rpx;
}

.loading-text,
.error-text {
	font-size: 28rpx;
	color: #64748b;
	margin-bottom: 32rpx;
}

.retry-btn {
	padding: 16rpx 48rpx;
	background-color: #4f46e5;
	color: #ffffff;
	border-radius: 12rpx;
	font-size: 28rpx;
	border: none;
}

.article-wrapper {
	background-color: #ffffff;
	padding: 32rpx;
	min-height: 100vh;
}

.article-title {
	font-size: 36rpx;
	font-weight: 700;
	color: #0f172a;
	line-height: 1.4;
	display: block;
	margin-bottom: 16rpx;
}

.article-meta {
	display: flex;
	flex-direction: column;
	gap: 8rpx;
	margin-bottom: 24rpx;
}

.meta-item {
	font-size: 24rpx;
	color: #64748b;
}

.article-cover {
	width: 100%;
	height: 400rpx;
	border-radius: 16rpx;
	background-color: #e5e7eb;
	margin-bottom: 24rpx;
}

.article-summary {
	background-color: #f8fafc;
	padding: 24rpx;
	border-radius: 12rpx;
	margin-bottom: 24rpx;
}

.summary-text {
	font-size: 28rpx;
	color: #334155;
	line-height: 1.6;
}

.article-content {
	font-size: 30rpx;
	color: #1e293b;
	line-height: 1.8;
	margin-bottom: 32rpx;
}

.attachments-section {
	background-color: #f8fafc;
	padding: 24rpx;
	border-radius: 12rpx;
	margin-bottom: 32rpx;
}

.attachments-title {
	display: block;
	font-size: 26rpx;
	font-weight: 600;
	color: #334155;
	margin-bottom: 16rpx;
}

.attachment-item {
	display: flex;
	align-items: center;
	justify-content: space-between;
	background-color: #ffffff;
	padding: 20rpx;
	border-radius: 12rpx;
	margin-bottom: 12rpx;
	border: 1rpx solid #e2e8f0;
}

.attachment-item:last-child {
	margin-bottom: 0;
}

.attachment-item:active {
	background-color: #f1f5f9;
}

.attachment-info {
	flex: 1;
	display: flex;
	align-items: center;
	gap: 16rpx;
}

.attachment-icon {
	font-size: 32rpx;
}

.attachment-text {
	flex: 1;
	display: flex;
	flex-direction: column;
	gap: 4rpx;
}

.attachment-name {
	font-size: 26rpx;
	color: #0f172a;
	font-weight: 500;
	word-break: break-all;
}

.attachment-size {
	font-size: 22rpx;
	color: #64748b;
}

.attachment-action {
	font-size: 24rpx;
	color: #6667ab;
	font-weight: 500;
}

.article-stats {
	display: flex;
	gap: 32rpx;
	padding: 16rpx 0;
	border-top: 1rpx solid #e5e7eb;
}

.stat-item {
	font-size: 24rpx;
	color: #64748b;
}

.original-pdf-link {
	display: flex;
	align-items: center;
	justify-content: space-between;
	background-color: #f5f7ff;
	padding: 24rpx 32rpx;
	border-radius: 16rpx;
	margin-bottom: 32rpx;
	border: 1rpx solid #e0e7ff;
}

.pdf-info-wrap {
	flex: 1;
	margin-right: 20rpx;
	overflow: hidden;
}

.pdf-name {
	font-size: 26rpx;
	color: #475569;
	font-weight: 500;
	word-break: break-all;
}

.pdf-action-btn {
	display: flex;
	align-items: center;
	background-color: #ffffff;
	padding: 12rpx 24rpx;
	border-radius: 100rpx;
	box-shadow: 0 4rpx 10rpx rgba(79, 70, 229, 0.1);
}

.pdf-action-text {
	font-size: 24rpx;
	color: #4f46e5;
	font-weight: 600;
	margin-right: 4rpx;
}

.pdf-arrow {
	font-size: 28rpx;
	color: #4f46e5;
}

.unlock-wrapper {
	background-color: #ffffff;
	padding: 32rpx;
	min-height: 100vh;
}

.unlock-prompt {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	padding: 80rpx 48rpx;
	background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
	border-radius: 24rpx;
	margin-top: 48rpx;
}

.unlock-icon {
	font-size: 80rpx;
	margin-bottom: 24rpx;
}

.unlock-title {
	font-size: 32rpx;
	font-weight: 700;
	color: #0f172a;
	margin-bottom: 16rpx;
}

.unlock-desc {
	font-size: 26rpx;
	color: #64748b;
	text-align: center;
	line-height: 1.6;
	margin-bottom: 32rpx;
}

.unlock-btn {
	padding: 20rpx 64rpx;
	background: linear-gradient(135deg, #6667ab, #5558a0);
	color: #ffffff;
	border-radius: 999rpx;
	font-size: 28rpx;
	font-weight: 600;
	border: none;
	box-shadow: 0 8rpx 24rpx rgba(102, 103, 171, 0.3);
}

.unlock-btn::after {
	border: none;
}

.unlock-btn:active {
	opacity: 0.8;
}
.gallery { display:flex; flex-direction: column; gap: 16rpx; margin-bottom: 24rpx; }
.gallery-item { background:#fff; border:1rpx solid #e5e7eb; border-radius: 12rpx; padding: 8rpx; }
.gallery-image { width: 100%; border-radius: 8rpx; background:#f1f5f9; }
.page-tip { display:block; text-align:center; color:#64748b; font-size: 22rpx; margin-top: 6rpx; }

.tags-container { display: flex; flex-wrap: wrap; gap: 12rpx; margin-bottom: 24rpx; }
.tag-item { 
	font-size: 22rpx; 
	color: #4f46e5; 
	background: #eef2ff; 
	padding: 6rpx 16rpx; 
	border-radius: 8rpx; 
}
</style>
