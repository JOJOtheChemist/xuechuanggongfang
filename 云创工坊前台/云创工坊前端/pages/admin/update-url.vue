<template>
	<view class="container">
		<view class="header">
			<text class="title">标签修复工具 (只修标签)</text>
			<text class="subtitle">仅提取标签并更新到数据库，不处理图片URL</text>
		</view>

		<view class="config-card">
			<view class="form-item">
				<text class="label">云端 Base URL</text>
				<input class="input" v-model="baseUrl" disabled />
			</view>
			<view class="form-item row">
				<text class="label">仅更新标签 (默认开启)</text>
				<switch :checked="tagsOnly" disabled />
			</view>
			<view class="form-item row">
				<text class="label">Dry Run (仅模拟)</text>
				<switch :checked="dryRun" @change="dryRun = $event.detail.value" />
			</view>
		</view>

		<view class="action-bar">
			<button class="btn primary" :loading="processing" @tap="startUpdate">开始修复标签</button>
			<button class="btn" @tap="logs = []">清空日志</button>
		</view>

		<scroll-view scroll-y class="log-window">
			<view v-for="(log, index) in logs" :key="index" class="log-item" :class="log.type">
				<text>{{ log.msg }}</text>
			</view>
		</scroll-view>
	</view>
</template>

<script>
	// 引入 JS 数据文件（比 JSON import 更稳定）
	// 注意：此文件过大，不应打包进小程序。仅在本地调试/导入时取消注释并提供文件。
	// import localArticlesData from '@/static/articles_data.js'
	const localArticlesData = [] // 默认空数据，防报错

	export default {
		data() {
			return {
				baseUrl: 'https://mp-46bd4293-7b92-444c-b936-5777a228063a.cdn.bspapp.com/all_pdf_images/',
				localPrefix: '/Users/yeya/Documents/HBuilderProjects/云创工坊/所有PDF资料/',
				dryRun: false,
				processing: false,
				logs: [],
				articles: [],
                tagsOnly: true
			}
		},
		methods: {
			addLog(msg, type = 'info') {
				this.logs.push({
					msg,
					type
				})
			},
			
			async loadArticles() {
				this.addLog('正在读取 articles_data.js...')
				try {
					// 直接赋值并增加容错
					if (localArticlesData && Array.isArray(localArticlesData) && localArticlesData.length > 0) {
						this.articles = localArticlesData
						this.addLog(`成功加载 ${this.articles.length} 篇文章数据`, 'success')
					} else {
						// 尝试即使为空也不要报错，可能是空文件
						this.articles = [] 
						this.addLog('数据加载为空或格式错误 (可能文件为空)', 'error')
					}
				} catch (e) {
					this.articles = []
					this.addLog('加载异常: ' + (e ? e.message : 'Unknown error'), 'error')
				}
			},

			convertLocalToRemote(localPath) {
				if (!localPath || typeof localPath !== 'string' || !localPath.startsWith(this.localPrefix)) {
					return null
				}
				const relativePath = localPath.substring(this.localPrefix.length)
				// Handle both slash types
				const parts = relativePath.split(/[/\\]/)
				const encodedParts = parts.map(part => encodeURIComponent(part))
				return this.baseUrl + encodedParts.join('/')
			},

			async verifyData() {
				this.addLog('正在验证数据库数据...')
				try {
					const db = uniCloud.database()
					const res = await db.collection('articles')
						.where({
							title: new RegExp('高频图推考点')
						})
						.limit(1)
						.get()
					
					if (res.result && res.result.data && res.result.data.length > 0) {
						const art = res.result.data[0]
						this.addLog('查询成功: ' + art.title, 'success')
						this.addLog('cover_image: ' + (art.cover_image || 'None'), 'detail')
						if (art.attachments && art.attachments.length > 0) {
							// 增加容错
							const firstImg = (art.attachments[0].images && art.attachments[0].images.length ) ? art.attachments[0].images[0] : 'None'
							this.addLog('attachments[0]: ' + firstImg, 'detail')
						} else {
							this.addLog('attachments: 空', 'error')
						}
					} else {
						this.addLog('未找到测试文章', 'error')
					}
				} catch (e) {
					this.addLog('验证失败: ' + (e ? e.message : 'Unknown'), 'error')
				}
			},

			extractTags(pathOrUrl) {
				if (!pathOrUrl || typeof pathOrUrl !== 'string') return []
				
				let relativePath = ''
				
				// Case 1: Local Path
				if (pathOrUrl.startsWith(this.localPrefix)) {
					relativePath = pathOrUrl.substring(this.localPrefix.length)
				} 
				// Case 2: Remote URL (already converted)
				else if (pathOrUrl.startsWith(this.baseUrl)) {
					// Remove base URL
					const rawPath = pathOrUrl.substring(this.baseUrl.length)
					// Decode URI (e.g. %E8%80%83%E7%A0%94 -> 考研)
					try {
						relativePath = decodeURIComponent(rawPath)
					} catch (e) {
						console.error('Decode failed', e)
						return []
					}
				} else {
					return []
				}

				const parts = relativePath.split(/[/\\\\]/)
				// Remove the last part (filename) and the second to last part (usually Title_图片 folder)
				if (parts.length <= 2) return [] // No category folders
				
				// Filter out the last two and return the rest
				const rawTags = parts.slice(0, parts.length - 2)
				const tags = rawTags.filter(t => t && t.trim() !== '')

                // 【关键修复】标签映射：确保包含UI所需的标准标签
                // 如果路径中包含关键词，则强制添加标准标签
                const fullPathStr = relativePath.toLowerCase();
                const stdTags = [];
                
                if (fullPathStr.includes('考研')) stdTags.push('考研');
                if (fullPathStr.includes('四级') || fullPathStr.includes('六级') || fullPathStr.includes('四六级')) stdTags.push('四六级');
                if (fullPathStr.includes('公考') || fullPathStr.includes('公务员')) stdTags.push('公考');
                if (fullPathStr.includes('计算机')) stdTags.push('计算机');
                if (fullPathStr.includes('教资') || fullPathStr.includes('教师资格')) stdTags.push('教资');
                if (fullPathStr.includes('专升本')) stdTags.push('专升本');

                // 合并并去重
                const finalTags = [...new Set([...tags, ...stdTags])];
                return finalTags;
			},

			async startUpdate() {
				if (this.processing) return
				if (!this.articles || this.articles.length === 0) {
					await this.loadArticles()
					if (!this.articles || this.articles.length === 0) {
						this.addLog('没有文章数据，无法执行更新', 'error')
						return
					}
				}

				this.processing = true
				this.addLog('====================================')
				this.addLog(`开始任务: ${this.dryRun ? 'DRY RUN' : 'REAL UPDATE'} ${this.tagsOnly ? '(仅标签)' : ''}`)
				
				let successCount = 0
				let skipCount = 0
				let errorCount = 0

				try {
					const importArticles = uniCloud.importObject('import-articles')
					
					for (let i = 0; i < this.articles.length; i++) {
						const article = this.articles[i]
						if (!article) continue

						const localImages = article.local_images || []
						
						// Strategy for Tags Extraction:
						let tags = []
						// 1. Try first local image path (contains folder info)
						if (localImages.length > 0 && typeof localImages[0] === 'string') {
							tags = this.extractTags(localImages[0])
						}
						// 2. Fallback to cover_image if it contains info
						if (tags.length === 0 && article.cover_image && typeof article.cover_image === 'string') {
							tags = this.extractTags(article.cover_image)
						}

						// Prepare Remote URLs (for full update)
						let remoteUrls = []
						if (!this.tagsOnly) {
							for (const imgPath of localImages) {
								if (typeof imgPath === 'string') {
									const remoteUrl = this.convertLocalToRemote(imgPath)
									if (remoteUrl) remoteUrls.push(remoteUrl)
								}
							}
							if (remoteUrls.length === 0 && article.cover_image && typeof article.cover_image === 'string' && article.cover_image.startsWith('http')) {
								remoteUrls = [article.cover_image] // Use existing if valid
							}
						}

						// Condition to proceed: 
						// TagsOnly mode: Always proceed (to update tags)
						// Normal mode: Proceed if we have remote URLs
						if (this.tagsOnly || remoteUrls.length > 0) {
							// Console log only to avoid UI lag for massive lists
							console.log(`[${i + 1}] Processing ${article.title || 'Untitled'}`)
                            
                            // 总是显示检测到的标签，方便调试
                            if (tags.length > 0) {
                                this.addLog(`[${i+1}] ${article.title} 标签: ${tags.join(', ')}`, 'detail')
                            } else {
                                this.addLog(`[${i+1}] ${article.title} 未检测到标签!`, 'error')
                            }
							
							if (!this.dryRun) {
								let articleData = { ...article }
								
								// 容错处理：确保 title 存在
								if (!articleData.title) {
									skipCount++
									continue
								}

								if (this.tagsOnly) {
									// In Tags Only mode, we ONLY send tags and ID/Title matches
									articleData = {
										title: article.title,
										category_id: article.category_id, // 也要保留分类ID
										tags: tags,
									}
								} else {
									const attachments = [{
										type: 'pdf-images',
										name: article.title + ' (图集)',
										images: remoteUrls,
										pageCount: remoteUrls.length
									}]
									articleData.cover_image = remoteUrls[0] || ''
									articleData.attachments = attachments
									articleData.tags = tags
									delete articleData.local_images
								}

								try {
									const res = await importArticles.importData({
										articles: [articleData],
										updateTagsOnly: this.tagsOnly 
									})
									
									if (res && res.success > 0) {
										// this.addLog(`  ✅ [${i+1}] ${article.title} 更新成功`, 'success')
										successCount++
									} else {
										this.addLog(`  ⚠️ [${i+1}] ${article.title} 更新失败`, 'error')
										if (res && res.errors && res.errors.length) {
											// this.addLog('  Err: ' + JSON.stringify(res.errors), 'error')
										}
										errorCount++
									}
								} catch (e) {
									this.addLog(`  ❌ [${i+1}] ${article.title} 请求失败: ` + e.message, 'error')
									errorCount++
								}
							} else {
								// Dry Run
								this.addLog(`[DRY] ${article.title} - Tags: ${tags.join(',')}`, 'info')
								successCount++
							}
						} else {
							skipCount++
						}
					}
				} catch(err) {
					this.addLog('初始化对象/执行过程失败: ' + (err ? err.message : 'Unknown'), 'error')
				}
				
				this.addLog('====================================')
				this.addLog(`任务完成。成功/预览: ${successCount}, 失败: ${errorCount}, 跳过: ${skipCount}`, 'success')
				this.processing = false
			}
		}
	}
</script>

<style scoped>
	.container {
		padding: 30rpx;
		background-color: #f5f7fa;
		min-height: 100vh;
	}

	.header {
		margin-bottom: 30rpx;
	}

	.title {
		font-size: 36rpx;
		font-weight: bold;
		display: block;
	}

	.subtitle {
		font-size: 24rpx;
		color: #666;
		margin-top: 10rpx;
		display: block;
	}

	.config-card {
		background: #fff;
		padding: 20rpx;
		border-radius: 12rpx;
		margin-bottom: 20rpx;
	}

	.form-item {
		margin-bottom: 20rpx;
	}

	.label {
		font-size: 26rpx;
		color: #333;
		margin-bottom: 10rpx;
		display: block;
	}

	.input {
		border: 1px solid #ddd;
		padding: 10rpx;
		border-radius: 8rpx;
		font-size: 24rpx;
	}
	
	.row {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.action-bar {
		display: flex;
		gap: 20rpx;
		margin-bottom: 20rpx;
	}

	.btn {
		flex: 1;
		font-size: 28rpx;
		background: #fff;
		color: #333;
	}

	.btn.primary {
		background: #007aff;
		color: #fff;
	}

	.log-window {
		background: #1e1e1e;
		height: 600rpx;
		border-radius: 12rpx;
		padding: 20rpx;
		box-sizing: border-box;
	}

	.log-item {
		font-size: 22rpx;
		font-family: monospace;
		margin-bottom: 8rpx;
		color: #ccc;
		word-break: break-all;
	}
	
	.log-item.success { color: #4cd964; }
	.log-item.error { color: #ff3b30; }
	.log-item.detail { color: #666; padding-left: 20rpx; }
</style>
