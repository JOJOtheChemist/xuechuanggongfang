<template>
  <view class="container">
    <view class="header">
      <text class="title">🔗 云端 PDF 自动关联工具</text>
      <text class="subtitle">根据文章标题预测云端 PDF 路径，并批量更新数据库</text>
    </view>

    <view class="card quick-import-card">
      <view class="section-title">🚀 方案 O：一键快速同步 (推荐)</view>
      <view class="desc">直接加载预置的 1257 个云端 URL 并开始同步。无需手动复制粘贴。</view>
      <button class="btn primary" style="background: #8b5cf6;" @click="handleQuickImport" :disabled="processing">
        {{ processing ? '正在处理中...' : '⚡️ 加载 JSON 并一键全量同步' }}
      </button>
    </view>

    <view class="card">
      <view class="section-title">⚙️ 配置与状态</view>
      <view class="form-item">
        <text class="label">云存储 URL 前缀 (CDN 域名)</text>
        <input 
          v-model="baseUrl" 
          class="input" 
          placeholder="示例: https://.../" 
        />
        <text class="tip">用于拼接文件 URL。当前已配置默认 CDN 地址。</text>
      </view>
    

      <button class="btn info" @click="fetchArticles" :disabled="loadingData">
        {{ articles.length ? `📊 数据库现有记录：${articles.length} 篇 (点击刷新)` : '🔍 点击查看数据库中已同步的文章' }}
      </button>

      <!-- 文章列表预览 -->
      <view v-if="articles.length > 0" class="article-list-preview">
        <view class="list-header">前 20 条记录预览：</view>
        <scroll-view scroll-y class="mini-list">
          <view v-for="(art, index) in articles.slice(0, 20)" :key="index" class="mini-item">
            <text class="art-title">{{ index + 1 }}. {{ art.title }}</text>
            <text class="art-status">{{ (art.attachments && art.attachments.length > 0) ? '✅ 已有关联' : '❌ 暂无 PDF' }}</text>
          </view>
        </scroll-view>
      </view>
    </view>

    <view class="card scan-result-card" v-if="scannedFiles.length > 0 || processing">
      <view class="section-title">📡 实时云端扫描结果 (Cloud Storage)</view>
      <view class="desc" v-if="processing">正在实时搜索云存储中的 PDF 文件，请稍后...</view>
      <view class="desc" v-else>扫描完成！在云端文件夹内发现以下 {{ scannedFiles.length }} 个文件。若地址正确，请执行同步：</view>
      
      <textarea 
        :value="scannedUrlsText" 
        class="path-textarea" 
        style="height: 460rpx; margin-bottom: 20rpx;" 
        readonly
      />

      <button class="btn primary" style="background: #10b981;" @click="handleConfirmSync" :disabled="processing">
        {{ processing ? '正在同步文章...' : '✅ 确认无误，同步到数据库' }}
      </button>
      <button class="btn" style="margin-top: 20rpx;" @click="scannedFiles = []; scanningCategory = null">
        取消
      </button>
    </view>

    <view class="card">
      <view class="section-title">📝 手动输入文件名列表 (方案 C)</view>
      <view class="desc">直接在下方粘贴文件名列表或完整 URL（每行一个），系统将跳过扫描直接同步：</view>
      <view class="form-item" style="margin-top: 20rpx;">
        <textarea 
          v-model="manualUrls" 
          class="path-textarea" 
          placeholder="示例：&#10;云南专升本/资料1.pdf&#10;或者完整 URL" 
          style="height: 200rpx;"
        />
        <text class="tip">只需粘贴原本应该获取出的地址列表。系统将跳过扫描直接同步。</text>
      </view>
      <button class="btn" @click="handleManualImport" :disabled="processing">
        🚚 处理手动列表并进入第二步
      </button>
    </view>

    <view class="card danger-zone">
      <view class="section-title">🛑 危险区域</view>
      <view class="desc">仅用于维护目的。请谨慎操作。</view>
      <button class="btn btn-outline-danger" @click="handleDeleteAll" :disabled="processing">
        🗑️ 清空所有文章 (慎重)
      </button>
    </view>
    


    <!-- 正在处理中的全局遮罩 -->
    <view class="loading-overlay" v-if="processing">
      <view class="loading-content">
        <view class="spinner"></view>
        <text class="loading-text">{{ progress || '正在处理中...' }}</text>
        <text class="loading-subtext">请勿关闭页面，系统正在同步文章到云端...</text>
      </view>
    </view>

    <view class="log-container" v-if="logs.length">
      <view class="log-header">
        <text>活动日志 (最新在后)</text>
        <text class="clear-btn" @click="logs = []">清空</text>
      </view>
      <scroll-view scroll-y class="log-window" :scroll-top="999999">
        <view v-for="(log, index) in logs.slice().reverse()" :key="index" class="log-item" :class="log.type">
          {{ log.msg }}
        </view>
      </scroll-view>
    </view>
  </view>
</template>

<script>
export default {
  data() {
    return {
      baseUrl: 'https://mp-46bd4293-7b92-444c-b936-5777a228063a.cdn.bspapp.com/',
      articles: [],
      loadingData: false,
      processing: false,
      progress: '',
      overwrite: false,
      logs: [],
      scannedFiles: [], // 当前扫描出的文件列表
      scanningCategory: null, // 当前正在扫描的板块
      manualUrls: '', // 手动输入的 URL 路由
    }
  },
  computed: {
    scannedUrlsText() {
        return this.scannedFiles.map(f => f.url).join('\n')
    }
  },
  methods: {
    addLog(msg, type = 'info') {
      this.logs.unshift({
        msg: `[${new Date().toLocaleTimeString()}] ${msg}`,
        type
      })
      // 这里的 unshift 是在开头添加，如果用户想看最新的，通常是列表顶部
    },

    async fetchArticles() {
      this.loadingData = true
      this.articles = [] // 先重置以便看到刷新效果
      this.addLog('正在拉取文章列表...', 'info')
      try {
        const db = uniCloud.database()
        // 尝试两种通用的响应结构
        const res = await db.collection('articles').limit(500).get()
        
        let data = []
        if (res.result && res.result.data) {
          data = res.result.data
        } else if (res.data) {
          data = res.data
        }

        if (data && data.length > 0) {
          this.articles = data
          this.addLog(`拉取成功: ${this.articles.length} 篇`, 'success')
        } else {
          this.addLog('数据库目前为空', 'warn')
          uni.showToast({ title: '数据库目前为空', icon: 'none' })
        }
      } catch (e) {
        console.error('Fetch error:', e)
        this.addLog('拉取异常: ' + e.message, 'error')
      } finally {
        this.loadingData = false
      }
    },

    async handleDeleteAll() {
      if (this.processing) return
      
      const confirmed = await new Promise(resolve => {
        uni.showModal({
          title: '极其危险的操作',
          content: '确定要清空数据库中所有文章吗？此操作无法恢复！',
          confirmColor: '#ef4444',
          success: res => resolve(res.confirm)
        })
      })
      
      if (!confirmed) return
      
      this.processing = true
      this.addLog('正在请求清空 articles 集合...', 'warn')
      
      try {
        const syncer = uniCloud.importObject('sync-cloud-articles', { customUI: true })
        const res = await syncer.clearArticles()
        
        if (res && res.code === 0) {
          this.addLog('清空成功!', 'success')
          this.articles = []
          uni.showToast({ title: '已清空', icon: 'success' })
        } else {
          this.addLog('清空失败: ' + (res.message || '未知错误'), 'error')
          uni.showModal({ title: '错误', content: res.message || '未知错误' })
        }
      } catch (e) {
        console.error(e)
        this.addLog('清空请求失败: ' + e.message, 'error')
        uni.showModal({ title: '调用失败', content: e.message })
      } finally {
        this.processing = false
      }
    },

    handleManualImport() {
      if (!this.manualUrls.trim()) {
        uni.showToast({ title: '请输入文件列表', icon: 'none' })
        return
      }
      
      const lines = this.manualUrls.split('\n').map(l => l.trim()).filter(l => l)
      if (lines.length === 0) return
      
      this.addLog(`🏠 正在处理手动输入的 ${lines.length} 条记录...`, 'info')
      
      const processedFiles = lines.map(line => {
        let url = line
        let name = line
        
        // 如果是完整 URL
        if (line.startsWith('http')) {
          try {
            const urlObj = new URL(line)
            const baseObj = new URL(this.baseUrl)
            
            // 如果域名相同，提取路径部分作为 name (包含文件夹层级)
            if (urlObj.host === baseObj.host) {
              let path = urlObj.pathname
              if (path.startsWith('/')) path = path.substring(1)
              name = decodeURIComponent(path)
            } else {
              // 不同域名的 URL，取最后一段作为名字
              const segments = line.split('/')
              name = decodeURIComponent(segments[segments.length - 1])
            }
          } catch (e) {
            // URL 解析失败，回退到分割法
            const segments = line.split('/')
            name = decodeURIComponent(segments[segments.length - 1])
          }
        } else {
          // 如果不是 URL，而是相对路径 (如 云南专升本/xxx.pdf)
          const cleanName = line.startsWith('/') ? line.substring(1) : line
          const encodedPath = cleanName.split('/').map(seg => encodeURIComponent(seg)).join('/')
          url = this.baseUrl.endsWith('/') ? `${this.baseUrl}${encodedPath}` : `${this.baseUrl}/${encodedPath}`
          name = cleanName
        }
        
        return {
          name: name,
          url: url,
          size: 0
        }
      })
      
      this.scannedFiles = processedFiles
      this.scanningCategory = { name: '手动导入' }
      this.addLog(`✅ 处理完成，共生成 ${processedFiles.length} 个同步地址。`, 'success')
      
      // 滚动到预览区域
      uni.showToast({ title: '处理完成，请在下方预览', icon: 'success' })
    },

    async handleQuickImport() {
      if (this.processing) return
      
      this.addLog('🚀 触发一键快速同步...', 'info')
      this.processing = true
      
      try {
        // 1. 加载本地 JSON
        this.addLog('正在读取 pages/admin/static/cloud_urls.json...', 'info')
        const res = await new Promise((resolve, reject) => {
          uni.request({
            url: '/pages/admin/static/cloud_urls.json',
            success: (res) => resolve(res),
            fail: (err) => reject(err)
          })
        })
        
        if (!res.data || !Array.isArray(res.data)) {
          throw new Error('JSON 数据格式不正确或加载失败')
        }
        
        const urls = res.data
        this.addLog(`✅ 成功加载 ${urls.length} 个 URL`, 'success')
        
        // 2. 复用手动处理逻辑生成列表
        this.manualUrls = urls.join('\n')
        this.handleManualImport()
        
        // 3. 准备调用同步
        // 关键修复：必须先取消 processing 状态，否则 handleConfirmSync 会因为防抖逻辑直接返回
        this.processing = false
        
        // 直接调用确认逻辑（那里会有弹窗）
        this.handleConfirmSync()

      } catch (e) {
        console.error(e)
        this.addLog('一键导入失败: ' + e.message, 'error')
        uni.showModal({ title: '导入失败', content: e.message, showCancel: false })
        this.processing = false
      }
    },

    async handleConfirmSync() {
      if (this.processing || this.scannedFiles.length === 0) return
      
      const count = this.scannedFiles.length
      const confirmed = await new Promise(resolve => {
        uni.showModal({
          title: '确认同步到数据库',
          content: `确定要将扫描出的 ${count} 篇文章同步到 [${this.scanningCategory.name}] 板块吗？同步过程将分批进行以确保稳定。`,
          success: res => resolve(res.confirm)
        })
      })
      
      if (!confirmed) {
        this.processing = false
        return
      }
      
      this.processing = true
      this.addLog(`🚢 开始分批同步 ${count} 篇文章...`, 'info')
      
      try {
        const BATCH_SIZE = 50
        const totalBatches = Math.ceil(count / BATCH_SIZE)
        const syncer = uniCloud.importObject('sync-cloud-articles', { customUI: true })
        
        let successCount = 0
        
        for (let i = 0; i < totalBatches; i++) {
          const start = i * BATCH_SIZE
          const end = Math.min(start + BATCH_SIZE, count)
          const batch = this.scannedFiles.slice(start, end)
          
          this.addLog(`📦 正在同步第 ${i + 1}/${totalBatches} 批 (${start + 1}~${end})...`, 'info')
          
          // 显示当前批次的一些标题作为反馈
          if (batch.length > 0) {
            this.addLog(`📝 当前处理: ${batch[0].name.split('/').pop()} 等...`, 'detail')
          }
          
          const res = await syncer.syncArticles({
            fileList: batch,
            categoryName: this.scanningCategory.name,
            clearExisting: (i === 0) // 只有第一批次时尝试清空（如果是基于板块的同步）
          })
          
          if (res && res.code === 0) {
            successCount += (res.data.inserted || batch.length)
            this.progress = `进度: ${Math.round((successCount / count) * 100)}% (${successCount}/${count})`
          } else {
            throw new Error(res.message || `第 ${i + 1} 批次同步失败`)
          }
        }
        
        this.addLog(`🎉 同步圆满完成! 共创建 ${successCount} 篇文章。`, 'success')
        uni.showModal({ title: '同步成功', content: `已成功同步 ${successCount} 篇文章到数据库。`, showCancel: false })
        
        // 清空扫描缓存
        this.scannedFiles = []
        this.scanningCategory = null
        this.progress = ''
      } catch (e) {
        console.error(e)
        this.addLog('❌ 同步中断: ' + e.message, 'error')
        uni.showModal({ title: '同步中断', content: e.message, showCancel: false })
      } finally {
        this.processing = false
      }
    },


  }
}
</script>

<style scoped>
.container { padding: 30rpx; background: #f8fafc; min-height: 100vh; font-family: sans-serif; }
.header { margin-bottom: 40rpx; }
.title { font-size: 40rpx; font-weight: 800; color: #1e293b; display: block; }
.subtitle { font-size: 24rpx; color: #64748b; margin-top: 10rpx; display: block; }

.card { background: #fff; border-radius: 20rpx; padding: 30rpx; margin-bottom: 30rpx; box-shadow: 0 4rpx 6rpx -1rpx rgba(0,0,0,0.1); }
.section-title { font-size: 28rpx; font-weight: 700; color: #334155; margin-bottom: 20rpx; border-left: 8rpx solid #3b82f6; padding-left: 15rpx; }

.form-item { margin-bottom: 30rpx; }
.label { font-size: 24rpx; color: #475569; margin-bottom: 10rpx; display: block; }
.input { border: 1rpx solid #e2e8f0; padding: 15rpx 20rpx; border-radius: 10rpx; font-size: 26rpx; background: #fdfdfd; }
.tip { font-size: 20rpx; color: #94a3b8; margin-top: 10rpx; display: block; }

.options { display: flex; gap: 30rpx; margin-bottom: 30rpx; }
.checkbox-item { display: flex; align-items: center; gap: 8rpx; font-size: 24rpx; color: #475569; }

.btn { 
  background: #f1f5f9; color: #475569; border: 1rpx solid #e2e8f0; 
  font-size: 26rpx; padding: 22rpx; border-radius: 12rpx; width: 100%;
  text-align: center; font-weight: 600;
}
.btn.primary { background: #3b82f6; color: #fff; border: none; }
.btn:disabled { opacity: 0.5; }

.log-container { background: #0f172a; border-radius: 20rpx; padding: 20rpx; }
.log-header { 
  display: flex; justify-content: space-between; align-items: center;
  color: #f8fafc; font-size: 22rpx; font-weight: 600; margin-bottom: 15rpx; padding: 0 10rpx;
}
.clear-btn { font-weight: 400; color: #94a3b8; cursor: pointer; }
.log-window { height: 600rpx; }
.log-item { font-size: 20rpx; font-family: monospace; margin-bottom: 8rpx; color: #cbd5e1; line-height: 1.5; border-bottom: 1rpx solid #1e293b; padding-bottom: 4rpx; }
.log-item.success { color: #4ade80; }
.log-item.error { color: #f87171; }
.log-item.warn { color: #fbbf24; }
.log-item.detail { color: #64748b; padding-left: 20rpx; }

.desc { font-size: 24rpx; color: #64748b; margin-bottom: 20rpx; line-height: 1.5; }
.warning-card { border: 2rpx solid #fee2e2; }
.danger-zone { border: 2rpx dashed #ef4444; background: #fff1f2; }
.path-textarea { 
  background: #f8fafc; border: 2rpx solid #e2e8f0; border-radius: 12rpx; 
  padding: 20rpx; width: 100%; height: 300rpx; font-size: 24rpx; 
  box-sizing: border-box; font-family: monospace; 
}
.btn-danger { background: #ef4444 !important; border: none !important; }
.btn-outline-danger { background: transparent; color: #ef4444; border: 2rpx solid #ef4444; }
.btn-outline-danger:active { background: #ef4444; color: #fff; }

.category-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20rpx; margin-top: 20rpx; }
.category-btn { 
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  background: #f1f5f9; padding: 25rpx 10rpx; border-radius: 16rpx; border: 1rpx solid #e2e8f0;
  transition: all 0.2s;
}
.category-btn:active { transform: scale(0.95); background: #e2e8f0; }
.cat-icon { font-size: 40rpx; margin-bottom: 10rpx; }
.cat-name { font-size: 22rpx; font-weight: 600; color: #475569; text-align: center; }
.category-btn.active { border-color: #3b82f6; background: #eff6ff; }

.scan-result-card { border: 2rpx solid #10b981; }
.url-preview { height: 360rpx; background: #f1f5f9; border-radius: 12rpx; padding: 20rpx; box-sizing: border-box; }
.url-item { font-size: 20rpx; color: #475569; margin-bottom: 10rpx; white-space: nowrap; }
.url-item .idx { color: #94a3b8; margin-right: 10rpx; }
.url-item .url { color: #0f172a; font-family: monospace; }

/* 文章预览样式 */
.quick-import-card { 
  border: 2rpx solid #8b5cf6; 
  background: linear-gradient(135deg, #ffffff 0%, #f5f3ff 100%);
  position: relative;
  overflow: hidden;
}
.quick-import-card::after {
  content: 'HOT';
  position: absolute;
  top: 10rpx;
  right: 10rpx;
  background: #ef4444;
  color: #fff;
  font-size: 18rpx;
  padding: 4rpx 12rpx;
  border-radius: 20rpx;
  font-weight: bold;
}
/* 进度遮罩 */
.loading-overlay {
  position: fixed; top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(15, 23, 42, 0.8); backdrop-filter: blur(4px);
  z-index: 999; display: flex; align-items: center; justify-content: center;
}
.loading-content {
  background: #fff; border-radius: 30rpx; padding: 60rpx 40rpx;
  width: 80%; display: flex; flex-direction: column; align-items: center;
  box-shadow: 0 20rpx 25rpx -5rpx rgba(0,0,0,0.2);
}
.spinner {
  width: 80rpx; height: 80rpx; border: 8rpx solid #f3f3f3;
  border-top: 8rpx solid #8b5cf6; border-radius: 50%;
  animation: spin 1s linear infinite; margin-bottom: 30rpx;
}
@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
.loading-text { font-size: 32rpx; font-weight: 800; color: #1e293b; margin-bottom: 15rpx; }
.loading-subtext { font-size: 24rpx; color: #64748b; text-align: center; }

</style>
