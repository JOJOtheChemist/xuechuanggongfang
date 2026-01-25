<template>
  <div class="container">
    <div class="header">
      <h2>🚀 极速关联模式</h2>
      <p>前提：你已经手动把图片上传到了云存储的 <b>all_pdf_images</b> 目录</p>
    </div>

    <div class="section">
      <h3>第一步：加载数据</h3>
      <button class="btn" @click="loadData">
        {{ articles.length ? `已加载 ${articles.length} 条数据` : '加载数据' }}
      </button>
    </div>

    <div class="section" v-if="articles.length">
      <h3>第二步：配置路径规则</h3>
      <p>请确认云端 URL 前缀：</p>
      <input v-model="urlPrefix" class="url-input" />
      <p class="tip">示例：https://.../all_pdf_images/</p>
      
      <div class="test-box">
        <button @click="testGenerate">测试生成链接</button>
        <div v-if="testUrl">
            <p>本地: {{ testLocalPath }}</p>
            <p>云端: <a :href="testUrl" target="_blank">{{ testUrl }}</a></p>
            <p class="tip">👆 请点击链接测试能否打开图片</p>
        </div>
      </div>
    </div>

    <div class="section" v-if="testUrl">
      <h3>第三步：批量更新数据库</h3>
      <button class="btn primary" @click="startLink" :disabled="processing">
        {{ processing ? `处理中 ${progress}` : '开始关联' }}
      </button>
      <div class="logs">
        <div v-for="(log,i) in logs" :key="i">{{log}}</div>
      </div>
    </div>

    <!-- 增量文件上传 -->
    <div class="section increment-section">
      <h3>📦 增量文件上传</h3>
      <p>选择增量文件或粘贴JSON数据(格式: level1, level2, level3, level4, fileName)</p>
      
      <div class="file-list">
        <button v-for="file in incrementalFiles" :key="file.name" class="btn file-btn" @click="autoUpload(file)" :disabled="incrementProcessing">
          一键上传: {{ file.label }}
        </button>
      </div>

      <div class="divider">或者手动粘贴</div>
      
      <textarea 
        v-model="incrementalJson" 
        class="json-textarea" 
        placeholder='[{"level1":"考公","level2":"知识板块","level3":"行测","level4":"资料分析","fileName":"xxx.pdf"}]'
      ></textarea>
      
      <button class="btn primary" @click="uploadIncremental" :disabled="incrementProcessing">
        {{ incrementProcessing ? `上传中 ${incrementProgress}` : '开始上传手动粘贴的数据' }}
      </button>
      
      <div class="logs">
        <div v-for="(log,i) in incrementLogs" :key="i">{{log}}</div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  data() {
    return {
      articles: [],
      // 你的云存储根路径，请根据实际情况调整
      urlPrefix: 'https://mp-46bd4293-7b92-444c-b936-5777a228063a.cdn.bspapp.com/all_pdf_images/',
      testLocalPath: '',
      testUrl: '',
      processing: false,
      progress: '',
      logs: [],
      // 增量上传相关
      incrementalJson: '',
      incrementProcessing: false,
      incrementProgress: '',
      incrementLogs: [],
      // 增量文件列表
      incrementalFiles: [
        { name: 'exam_edu', label: '教资_初中真题', path: '/pages/admin/static/教资_初中真题_增量.json' },
        { name: 'exam_high_edu', label: '教资_高中教育知识', path: '/pages/admin/static/教资_高中教育知识_增量.json' },
        { name: 'exam_pub', label: '考公_资料分析', path: '/pages/admin/static/考公_资料分析_增量.json' },
        { name: 'exam_staff', label: '考编_职测', path: '/pages/admin/static/考编_职测资料分析_增量.json' }
      ],
      // 分类映射
      categoryMapping: {
        '考公': 'cat_002',
        '教资': 'cat_006',
        '考编': 'cat_009'
      }
    }
  },
  methods: {
    addLog(msg) { this.logs.unshift(msg); },
    
    async loadData() {
      const res = await uni.request({ url: '/pages/admin/static/articles_data.json' });
      this.articles = res.data;
      this.addLog(`加载了 ${this.articles.length} 篇文章`);
    },

    getCloudUrl(localPath) {
        // 智能路径提取：
        // 本地路径形如: /Users/.../所有PDF资料/考研知识点资料/数学/xxx.webp
        // 云端目标: https://.../all_pdf_images/考研知识点资料/数学/xxx.webp
        
        // 1. 识别锚点 "所有PDF资料/"
        const keyword = '所有PDF资料/';
        const index = localPath.indexOf(keyword);
        
        let relativePath = '';
        if (index !== -1) {
            // 截取 "所有PDF资料/" 之后的部分
            relativePath = localPath.substring(index + keyword.length);
        } else {
            // 如果没找到，回退到只用文件名（虽然这可能导致路径对不上，但好过没有）
            relativePath = localPath.split('/').pop();
        }
        
        // 2. 拼接
        // 确保 urlPrefix 以 / 结尾
        let prefix = this.urlPrefix;
        if (!prefix.endsWith('/')) prefix += '/';
        
        // 这里的 relativePath 包含了子目录，例如 "考研知识点资料/数学/xxx.webp"
        // 只要你上传时是把 "所有PDF资料" 里面的文件夹拖进去的，这个路径就完全匹配
        return prefix + relativePath;
    },

    testGenerate() {
        if (!this.articles.length) return;
        // 找一个有图片的
        const art = this.articles.find(a => a.local_images && a.local_images.length);
        if (art) {
            this.testLocalPath = art.local_images[0];
            this.testUrl = this.getCloudUrl(this.testLocalPath);
            this.addLog('已生成测试链接，请点击验证');
        }
    },

    async startLink() {
        this.processing = true;
        let successCount = 0;
        
        const importObj = uniCloud.importObject('import-articles');

        for (let i = 0; i < this.articles.length; i++) {
            const art = this.articles[i];
            this.progress = `${i+1}/${this.articles.length}`;
            
            if (!art.local_images || !art.local_images.length) continue;

            // 生成该文章所有图片的 URL
            const imageUrls = art.local_images.map(path => this.getCloudUrl(path));
            
            // 构造数据
            const attachments = [{
                type: 'pdf-images',
                name: art.title + '.pdf',
                images: imageUrls,
                pageCount: imageUrls.length
            }];
            
            const articleData = {
                ...art,
                cover_image: imageUrls[0],
                attachments: attachments
            };
            
            try {
                // 调用云函数更新
                const res = await importObj.importData({
                    articles: [articleData]
                });
                
                if (res.success > 0) {
                    this.addLog(`✅ 关联成功: ${art.title}`);
                    successCount++;
                } else {
                    this.addLog(`⚠️ 关联跳过: ${art.title}`);
                }
            } catch (e) {
                this.addLog(`❌ 失败: ${art.title} - ${e.message}`);
            }
        }
        
        this.processing = false;
        this.addLog(`🎉 全部完成！成功关联 ${successCount} 篇`);
    },

    // 增量文件上传
    async uploadIncremental() {
      this.incrementProcessing = true;
      this.incrementLogs = [];
      let successCount = 0;
      let updateCount = 0;
      
      try {
        // 解析JSON
        const incrementalData = JSON.parse(this.incrementalJson);
        
        if (!Array.isArray(incrementalData) || incrementalData.length === 0) {
          this.incrementLogs.unshift('❌ 数据格式错误或为空');
          this.incrementProcessing = false;
          return;
        }
        
        this.incrementLogs.unshift(`📋 解析成功，共 ${incrementalData.length} 条数据`);
        
        const importObj = uniCloud.importObject('import-articles');
        
        for (let i = 0; i < incrementalData.length; i++) {
          const item = incrementalData[i];
          this.incrementProgress = `${i+1}/${incrementalData.length}`;
          
          // 验证必须字段
          if (!item.level1 || !item.fileName) {
            this.incrementLogs.unshift(`⚠️ 跳过(缺少必须字段): ${item.fileName || '未知'}`);
            continue;
          }
          
          // 获取分类ID
          const categoryId = this.categoryMapping[item.level1];
          if (!categoryId) {
            this.incrementLogs.unshift(`⚠️ 跳过(未知分类 ${item.level1}): ${item.fileName}`);
            continue;
          }
          
          // 提取文件名(去掉.pdf后缀)
          const title = item.fileName.replace(/\.pdf$/i, '');
          
          // 构造tags数组
          const tags = [item.level2, item.level3, item.level4].filter(Boolean);
          
          // 构造完整的文章数据
          const articleData = {
            title: title,
            category_id: categoryId,
            tags: tags,
            summary: `${item.level1} > ${tags.join(' > ')}`,
            price_points: 5, // 默认5积分
            status: 'published',
            view_count: 0,
            like_count: 0
          };
          
          try {
            // 调用云函数导入
            const res = await importObj.importData({
              articles: [articleData]
            });
            
            if (res.success > 0) {
              this.incrementLogs.unshift(`✅ 成功: ${title}`);
              successCount++;
            } else if (res.failed === 0) {
              // 可能是更新了已存在的文章
              this.incrementLogs.unshift(`🔄 更新: ${title}`);
              updateCount++;
            } else {
              this.incrementLogs.unshift(`⚠️ 跳过: ${title}`);
            }
          } catch (e) {
            this.incrementLogs.unshift(`❌ 失败: ${title} - ${e.message}`);
          }
        }
        
        this.incrementLogs.unshift(`🎉 全部完成! 新增 ${successCount} 篇, 更新 ${updateCount} 篇`);
        
      } catch (e) {
        this.incrementLogs.unshift(`❌ JSON解析失败: ${e.message}`);
      } finally {
        this.incrementProcessing = false;
        this.incrementProgress = '';
      }
    },

    // 自动化一键上传
    async autoUpload(file) {
      this.incrementProcessing = true;
      this.incrementLogs = [ `🚀 开始一键上传: ${file.label} ...` ];
      
      try {
        const res = await uni.request({ url: file.path });
        if (res.data) {
          this.incrementalJson = JSON.stringify(res.data, null, 2);
          // 调用现有的上传逻辑
          await this.uploadIncremental();
        } else {
          this.incrementLogs.unshift(`❌ 无法获取文件内容: ${file.path}`);
          this.incrementProcessing = false;
        }
      } catch (e) {
        this.incrementLogs.unshift(`❌ 请求文件失败: ${e.message}`);
        this.incrementProcessing = false;
      }
    }
  }
}
</script>

<style>
/* ... existing styles ... */
.file-list {
  display: flex;
  flex-wrap: wrap;
  gap: 10rpx;
  margin-bottom: 20rpx;
}
.file-btn {
  background: #0ea5e9 !important;
  font-size: 24rpx !important;
  padding: 10rpx 20rpx !important;
}
.divider {
  text-align: center;
  margin: 30rpx 0;
  color: #94a3b8;
  font-size: 24rpx;
  position: relative;
}
.divider::before, .divider::after {
  content: "";
  position: absolute;
  top: 50%;
  width: 40%;
  height: 1px;
  background: #e2e8f0;
}
.divider::before { left: 0; }
.divider::after { right: 0; }

.container { padding: 30px; font-family: sans-serif; }

.section { margin-bottom: 30px; border: 1px solid #eee; padding: 20px; border-radius: 8px; }
.btn { padding: 10px 20px; background: #007aff; color: white; border: none; border-radius: 4px; cursor: pointer; }
.btn:disabled { background: #ccc; }
.url-input { width: 100%; padding: 10px; margin: 10px 0; border: 1px solid #ccc; }
.logs { height: 300px; overflow-y: auto; background: #f9f9f9; padding: 10px; margin-top: 10px; font-size: 12px; }
.tip { font-size: 12px; color: #666; }
.test-box { margin-top: 20px; background: #eef; padding: 10px; }
.json-textarea { 
  width: 100%; 
  min-height: 200px; 
  padding: 10px; 
  margin: 10px 0; 
  border: 1px solid #ccc; 
  border-radius: 4px;
  font-family: monospace;
  font-size: 12px;
  resize: vertical;
}
.increment-section {
  background: #f0f9ff;
  border-left: 4px solid #0ea5e9;
}
</style>