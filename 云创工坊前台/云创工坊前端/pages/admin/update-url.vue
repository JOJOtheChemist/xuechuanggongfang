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
import { getHttpService } from '@/utils/http-services'
import { importArticlesInBatches, loadStaticJson } from '@/utils/admin-catalog'

	export default {
		data() {
			return {
				baseUrl: 'https://mp-46bd4293-7b92-444c-b936-5777a228063a.cdn.bspapp.com/',
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
				this.addLog('正在读取 articles_data.json...')
				try {
					const data = await loadStaticJson('/pages/admin/static/articles_data.json')
					if (Array.isArray(data) && data.length > 0) {
						this.articles = data
						this.addLog(`成功加载 ${this.articles.length} 篇文章数据`, 'success')
					} else {
						this.articles = [] 
						this.addLog('数据加载为空或格式错误', 'error')
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
					const articleService = getHttpService('article-service')
					const res = await articleService.getList({
						keyword: '高频图推考点',
						pageSize: 1
					})
					const articles = Array.isArray(res && res.data && res.data.list) ? res.data.list : []
					
					if (articles.length > 0) {
						const art = articles[0]
						this.addLog('查询成功: ' + art.title, 'success')
						this.addLog('cover_image: ' + (art.cover_image || art.coverImageUrl || 'None'), 'detail')
						if (art.attachments && art.attachments.length > 0) {
							// 增加容错
							const firstImg = art.attachments[0].fileUrl || art.attachments[0].fileID || 'None'
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
				if (parts.length <= 1) return []

				const lastPart = parts[parts.length - 1] || ''
				const removeCount = /\.(webp|png|jpe?g|gif)$/i.test(lastPart) ? 2 : 1
				if (parts.length <= removeCount) return []

				const rawTags = parts.slice(0, parts.length - removeCount)
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
						const payloads = this.articles
							.map((article) => {
								const attachments = Array.isArray(article.attachments) ? article.attachments : []
								const firstAttachment = attachments[0] || {}
								const sourcePath =
									firstAttachment.fileID ||
									firstAttachment.fileUrl ||
									article.cover_image ||
									article.coverImageUrl ||
									''
								const tags = this.extractTags(sourcePath)

								if (!article.title) {
									skipCount += 1
									return null
								}

								return {
									title: article.title,
									category_id: article.category_id || article.categoryId || '',
									tags: tags.length > 0 ? tags : (Array.isArray(article.tags) ? article.tags : [])
								}
							})
							.filter(Boolean)

						if (this.dryRun) {
							successCount = payloads.length
							this.addLog(`Dry Run 预览完成，共 ${successCount} 篇文章将更新标签`, 'success')
							payloads.slice(0, 20).forEach((item) => {
								this.addLog(`${item.title} -> ${item.tags.join(' / ')}`, 'detail')
							})
							this.processing = false
							return
						}

						const result = await importArticlesInBatches({
							articles: payloads,
							updateTagsOnly: true,
							batchSize: 100,
							onProgress: (progress) => {
								if (progress.stage === 'after') {
									this.addLog(`已完成第 ${progress.batchIndex}/${progress.batchCount} 批`, 'detail')
								}
							}
						})

						successCount = result.success
						errorCount = result.failed
						skipCount = Math.max(skipCount, result.total - result.success - result.failed)
						;(result.errors || []).slice(0, 20).forEach((item) => {
							this.addLog(`${item.title}: ${item.error}`, 'error')
						})
					} catch(err) {
						this.addLog('初始化对象/执行过程失败: ' + (err ? err.message : 'Unknown'), 'error')
						errorCount += 1
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
