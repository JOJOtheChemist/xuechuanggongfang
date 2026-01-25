<template>
  <view class="import-container">
    <view class="header">
      <text class="title">本地数据导入工具</text>
      <text class="subtitle">无需配置云函数 URL，直接使用客户端 SDK</text>
    </view>

    <view class="status-box">
      <text>总数据量: {{ total }}</text>
      <text>当前进度: {{ current }}</text>
      <text>成功: {{ successCount }}</text>
      <text>失败: {{ failCount }}</text>
    </view>
    
    <view class="control-panel" style="margin-bottom: 20rpx; display: flex; gap: 20rpx;">
        <button type="warn" size="mini" @tap="clearDatabase" :disabled="importing">清空云数据库</button>
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
      // 动态请求 static 下的 json，避免打包过大
      const res = await uni.request({
        url: '/pages/admin/static/articles_data.json',
        method: 'GET'
      })
      
      if (res.statusCode === 200 && res.data) {
        this.articles = res.data
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
            content: '确定要清空云数据库中所有文章吗？此操作不可恢复！',
            confirmColor: '#DD524D'
        })
        
        if (res.confirm) {
            this.addLog('正在请求清空数据库...', 'info')
            try {
                const syncCloud = uniCloud.importObject('sync-cloud-articles')
                const result = await syncCloud.clearArticles()
                
                if (result.code === 0) {
                    this.addLog(`清空成功: ${JSON.stringify(result.data)}`, 'success')
                    uni.showToast({ title: '已清空', icon: 'success' })
                } else {
                    this.addLog(`清空失败: ${result.message}`, 'error')
                }
            } catch (e) {
                this.addLog(`调用云函数失败: ${e.message}`, 'error')
            }
        }
    },
    
    async startImport() {
      if (this.importing) return
      this.importing = true
      this.current = 0
      this.successCount = 0
      this.failCount = 0
      
      const importer = uniCloud.importObject('import-articles')
      
      // 分批处理，每批 10 条
      const BATCH_SIZE = 10
      
      for (let i = 0; i < this.articles.length; i += BATCH_SIZE) {
        const batch = this.articles.slice(i, i + BATCH_SIZE)
        this.current = i + 1
        
        try {
          // 清理数据：移除本地绝对路径等不需要上传的字段
          // 保留 title, category_id, summary, content, price_points, author_name, publish_time, stats
          const cleanBatch = batch.map(a => ({
            title: a.title,
            category_id: a.category_id,
            summary: a.summary,
            content: a.content,
            price_points: a.price_points,
            author_name: a.author_name,
            publish_time: a.publish_time,
            stats: a.stats,
            tags: a.tags || [],  // 保留标签
            cover_image: a.cover_image || '', 
            attachments: a.attachments || []  // 保留PDF附件
          }))
          
          this.addLog(`正在上传第 ${i+1}-${Math.min(i+BATCH_SIZE, this.total)} 条...`, 'info')
          
          const res = await importer.importData({
            articles: cleanBatch
          })
          
          if (res) {
            this.successCount += res.success || 0
            this.failCount += res.failed || 0
            
            if (res.errors && res.errors.length) {
              res.errors.forEach(err => {
                this.addLog(`失败 [${err.title}]: ${err.error}`, 'error')
              })
            }
          }
          
        } catch (e) {
          this.failCount += batch.length
          this.addLog(`批次上传失败: ${e.message}`, 'error')
        }
        
        // 稍微停顿一下
        await new Promise(r => setTimeout(r, 200))
      }
      
      this.importing = false
      this.addLog('导入完成！', 'success')
      uni.showModal({
        title: '完成',
        content: `成功: ${this.successCount}, 失败: ${this.failCount}`,
        showCancel: false
      })
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
