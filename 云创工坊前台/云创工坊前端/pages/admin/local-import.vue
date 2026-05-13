<template>
  <view class="import-container">
    <view class="header">
      <text class="title">本地数据导入工具</text>
      <text class="subtitle">直接调用独立后端批量导入，无需旧云函数</text>
    </view>

    <view class="status-box">
      <text>总数据量: {{ total }}</text>
      <text>当前进度: {{ current }}</text>
      <text>成功: {{ successCount }}</text>
      <text>失败: {{ failCount }}</text>
    </view>
    
    <view class="control-panel" style="margin-bottom: 20rpx; display: flex; gap: 20rpx;">
        <button type="warn" size="mini" @tap="clearDatabase" :disabled="importing">清空文章库</button>
    </view>

    <scroll-view scroll-y class="log-box">
      <view v-for="(log, i) in logs" :key="i" class="log-item" :class="log.type">
        {{ log.msg }}
      </view>
    </scroll-view>

    <view class="action-bar">
      <button type="primary" @tap="startImport" :disabled="importing || !total">
        {{ importing ? '导入中...' : `开始一键导入 (${total}篇)` }}
      </button>
    </view>
  </view>
</template>

<script>
import { clearImportedArticles, importArticlesInBatches, loadStaticJson, normalizeArticleForImport } from '@/utils/admin-catalog'

export default {
  data() {
    return {
      articles: [],
      total: 0,
      current: 0,
      successCount: 0,
      failCount: 0,
      importing: false,
      logs: []
    }
  },
  async onLoad() {
    this.addLog('正在加载本地数据...', 'info')
    try {
      const data = await loadStaticJson('/pages/admin/static/articles_data.json')

      if (Array.isArray(data) && data.length > 0) {
        this.articles = data.map((item) => normalizeArticleForImport(item)).filter(Boolean)
        this.total = this.articles.length
        this.addLog(`加载成功，共 ${this.total} 条数据`, 'success')
      } else {
        this.addLog('加载数据失败，请检查 static/articles_data.json 是否存在', 'error')
      }
    } catch (e) {
      this.addLog('加载异常: ' + e.message, 'error')
    }
  },
  methods: {
    addLog(msg, type = 'info') {
      this.logs.unshift({
        msg: `[${new Date().toLocaleTimeString()}] ${msg}`,
        type
      })
    },
    
    async clearDatabase() {
        const res = await uni.showModal({
            title: '危险操作',
            content: '确定要清空文章数据吗？此操作不可恢复！',
            confirmColor: '#DD524D'
        })
        
        if (res.confirm) {
            const result = await clearImportedArticles({
                resetCategoryTags: true
            })
            this.addLog(`清理完成，删除 ${result.deletedCount || 0} 篇文章`, 'success')
            uni.showToast({
                title: '清理完成',
                icon: 'success'
            })
        }
    },
    
    async startImport() {
      if (this.importing) return
      this.importing = true
      this.current = 0
      this.successCount = 0
      this.failCount = 0

      try {
        const result = await importArticlesInBatches({
          articles: this.articles,
          batchSize: 100,
          onProgress: (progress) => {
            if (progress.stage === 'after') {
              this.current = progress.processed
              this.successCount = progress.success || 0
              this.failCount = progress.failed || 0
              this.addLog(`已完成第 ${progress.batchIndex}/${progress.batchCount} 批`, 'info')
            }
          }
        })

        this.current = result.total
        this.successCount = result.success
        this.failCount = result.failed
        this.addLog(`导入完成，成功 ${result.success}，失败 ${result.failed}`, result.failed ? 'warn' : 'success')
        ;(result.errors || []).slice(0, 20).forEach((item) => {
          this.addLog(`失败: ${item.title} - ${item.error}`, 'error')
        })
        uni.showToast({
          title: '导入完成',
          icon: result.failed ? 'none' : 'success'
        })
      } catch (e) {
        this.addLog(`导入异常: ${e.message}`, 'error')
        uni.showToast({
          title: '导入失败',
          icon: 'none'
        })
      } finally {
        this.importing = false
      }
    }
  }
}
</script>

<style scoped>
.import-container { padding: 30rpx; background: #f5f7fa; min-height: 100vh; }
.header { margin-bottom: 30rpx; }
.title { font-size: 36rpx; font-weight: bold; color: #333; display: block; }
.subtitle { font-size: 24rpx; color: #666; margin-top: 10rpx; display: block; }
.status-box { background: #fff; padding: 20rpx; border-radius: 12rpx; margin-bottom: 20rpx; display: flex; justify-content: space-between; font-size: 26rpx; }
.log-box { height: 60vh; background: #1e1e1e; border-radius: 12rpx; padding: 20rpx; box-sizing: border-box; margin-bottom: 30rpx; }
.log-item { font-size: 24rpx; margin-bottom: 10rpx; font-family: monospace; }
.log-item.info { color: #fff; }
.log-item.success { color: #67c23a; }
.log-item.error { color: #f56c6c; }
.action-bar { position: fixed; bottom: 0; left: 0; right: 0; padding: 30rpx; background: #fff; box-shadow: 0 -2rpx 10rpx rgba(0,0,0,0.05); }
</style>
