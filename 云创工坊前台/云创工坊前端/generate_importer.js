/**
 * 批量上传图片并导入文章到 uniCloud
 * 
 * 使用方法：
 * 1. 在 HBuilderX 中打开此文件
 * 2. 确保项目已关联 uniCloud 服务空间
 * 3. 选中全部代码，右键 -> "运行本文件 (Run this file)" 
 *    或者在 HBuilderX 内置终端运行: node upload-articles-script.js
 *    (注意：node 环境必须支持 uniCloud 操作，通常建议直接在云函数本地运行环境或 JQL 交互，但最稳妥的是把这个脚本作为云函数的一部分运行，或者使用 HBuilderX 的本地 uniCloud 环境)
 * 
 * 鉴于 HBuilderX 外部 Node 无法直接调用 uniCloud，本脚本设计为：
 * 生成一个临时云函数 `import-tool`，你只需要右键上传并运行它即可。
 */

const fs = require('fs');
const path = require('path');

// 1. 读取 articles_data.json
const dataPath = path.join(__dirname, 'articles_data.json');
if (!fs.existsSync(dataPath)) {
    console.error('未找到数据文件:', dataPath);
    process.exit(1);
}

const articles = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
console.log(`准备导入 ${articles.length} 篇文章...`);

// 2. 生成云函数代码 (import-articles)
const cloudFunctionPath = path.join(__dirname, 'uniCloud-aliyun/cloudfunctions/import-articles');
if (!fs.existsSync(cloudFunctionPath)) {
    fs.mkdirSync(cloudFunctionPath, { recursive: true });
}

// 拷贝 auth-utils 依赖 (如果需要)
// 这里我们尽量简化，不依赖 auth-utils，直接操作数据库

const indexObjJs = `
const db = uniCloud.database();

module.exports = {
    async importData(event, context) {
        const { articles } = event;
        const results = { success: 0, failed: 0, errors: [] };
        
        console.log('开始批量导入，总数:', articles.length);
        
        for (const article of articles) {
            try {
                // 1. 检查是否已存在 (根据标题和分类)
                const exist = await db.collection('articles').where({
                    title: article.title,
                    category_id: article.category_id
                }).get();
                
                if (exist.data && exist.data.length > 0) {
                    console.log('跳过已存在:', article.title);
                    continue;
                }
                
                // 2. 插入数据
                // 注意：图片此时应该是 cloud:// 路径。如果本地脚本没上传，这里只是插入元数据。
                // *关键*：本方案假定图片由前端/客户端上传。但既然要"脚本一键完成"，
                // 我们需要在本地把图片上传。
                
                // 由于云函数内部无法直接读取你本地硬盘的图片，
                // *正确的路径* 是：
                // A. 本地 Node 脚本调用 uniCloud.uploadFile (需要 HBuilderX 环境)
                // B. 本地将图片转 Base64 传给云函数 (文件太大，会爆)
                
                // 修正策略：
                // 此云函数只负责"接收已上传好的 fileID 并创建文章"。
                // 上传动作必须在本地执行。
                
                const res = await db.collection('articles').add({
                    ...article,
                    create_time: Date.now(),
                    update_time: Date.now()
                });
                
                if (res.id) {
                    results.success++;
                    console.log('导入成功:', article.title);
                }
            } catch (e) {
                results.failed++;
                results.errors.push({ title: article.title, error: e.message });
                console.error('导入失败:', article.title, e);
            }
        }
        
        return results;
    }
}
`;

fs.writeFileSync(path.join(cloudFunctionPath, 'index.obj.js'), indexObjJs);
fs.writeFileSync(path.join(cloudFunctionPath, 'package.json'), JSON.stringify({
    "name": "import-articles",
    "dependencies": {},
    "extensions": {
        "uni-cloud-jql": {}
    }
}, null, 2));

console.log(`
======================================================
[第一步] 云函数已生成: uniCloud-aliyun/cloudfunctions/import-articles
请在 HBuilderX 中：
1. 找到 uniCloud-aliyun/cloudfunctions/import-articles
2. 右键 -> "上传部署"
======================================================
`);

// 3. 生成前端上传脚本 (Run in HBuilderX Browser/App)
// 因为只有前端环境 (Browser/App) 才有 uniCloud.uploadFile 权限和能力访问本地文件(通过选择)
// *但在 Mac 本地脚本无法直接调用 HBuilderX 的 uploadFile API*

// === 最终绝杀方案 ===
// 生成一个 `uploader.js`，利用 `uni-admin` 或 `uni-id` 的思想，
// 但最快的是：生成一个 Vue 页面 `pages/admin/auto-import.vue`，
// 你运行项目到 Chrome，它会自动读取 JSON (我们把 JSON 放 static)，然后自动循环上传。

const vuePageContent = `
<template>
  <view class="import-page">
    <view class="header">
        <text class="title">自动导入工具</text>
        <text class=\"status\">进度: {{ current }}/{{ total }}</text>
    </view>
    
    <scroll-view scroll-y class="log-box">
        <view v-for="(log, i) in logs" :key="i" class="log-item">{{ log }}</view>
    </scroll-view>
    
    <button type="primary" @tap="startImport" :disabled="importing">开始自动导入</button>
  </view>
</template>

<script>
// 引入数据
import articlesData from '@/static/articles_data.json';

export default {
    data() {
        return {
            articles: articlesData,
            importing: false,
            current: 0,
            total: 0,
            logs: []
        }
    },
    onLoad() {
        this.total = this.articles.length;
        this.log('数据已加载，共 ' + this.total + ' 篇，请点击开始');
    },
    methods: {
        log(msg) {
            this.logs.unshift(\`[\${new Date().toLocaleTimeString()}] \${msg}\`);
        },
        async startImport() {
            this.importing = true;
            this.current = 0;
            
            // 引入云对象
            const importer = uniCloud.importObject('import-articles');
            
            for (const article of this.articles) {
                this.current++;
                this.log(\`正在处理: \${article.title}\`);
                
                try {
                    // 1. 处理图片上传
                    // 注意：articles_data.json 里是绝对路径 '/Users/...'
                    // 浏览器无法直接读取绝对路径。
                    // *** 关键 ***：HBuilderX 的 Web Server 无法直接读盘。
                    // 必须把图片目录挂载到 static 或者通过 HBuilderX 插件。
                    
                    // 既然图片都在项目外部，前端页面无法直接读取上传。
                    // 只有 HBuilderX 插件或 Node 脚本(需SDK)能做。
                    
                    // 回退到 Plan B：Node 脚本上传。
                    // 你需要配置 uni-cloud-admin 的 server-side SDK。
                    
                    // 鉴于环境限制，我们采用 "Base64 分片上传" 方案。
                    // 我会在本地 Python 脚本里，把图片转成 Base64，
                    // 然后直接通过 Python requests 调用 云函数 URL。
                    // (需要你开启云函数 URL)
                    
                } catch (e) {
                    this.log('失败: ' + e.message);
                }
            }
            this.importing = false;
        }
    }
}
</script>
`;

// 既然前端读取本地绝对路径受限，
// 且 Python 本地环境已经就绪。
// 最快的方法是：Python 直接调 uniCloud 的 HTTP URL。

console.log(`
======================================================
由于 uniCloud 没有本地 Node SDK (除非配置 secret)，
且前端页面无法读取 '/Users/...' 绝对路径。

推荐方案：
1. 我已生成 'import-articles' 云函数。
2. 请去 uniCloud 控制台 -> 云函数 -> import-articles -> 云函数详情。
3. **开启 "云函数URL化"**，获得一个 URL (如 https://.../import-articles)。
4. 把这个 URL 告诉我，或者填入我即将生成的 Python 上传脚本中。
======================================================
`);
