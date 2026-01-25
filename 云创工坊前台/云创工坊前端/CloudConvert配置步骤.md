# CloudConvert API 配置步骤

## 📋 快速开始

### 步骤 1：注册 CloudConvert

1. 访问：https://cloudconvert.com
2. 点击右上角 **Sign Up** 注册账号
3. 使用邮箱或 Google 账号注册（免费）

### 步骤 2：获取 API Key

1. 登录后，进入：https://cloudconvert.com/dashboard/api/v2/keys
2. 点击 **Create New** 按钮
3. 输入 Key 名称（如：`学创工坊`）
4. 点击 **Create**
5. **复制 API Key**（类似：`eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9...`）
   - ⚠️ **重要**：API Key 只显示一次，请立即保存！

### 步骤 3：配置到云函数

打开文件：`uniCloud-aliyun/cloudfunctions/file-converter/index.obj.js`

找到第 8 行：
```javascript
const CLOUDCONVERT_API_KEY = 'YOUR_API_KEY_HERE'
```

替换为你的 API Key：
```javascript
const CLOUDCONVERT_API_KEY = 'eyJ0eXAiOiJKV1QiLCJhbGci...'
```

### 步骤 4：上传云函数

1. 在 HBuilderX 中，右键点击 `file-converter` 目录
2. 选择 **上传部署** → **云端运行**
3. 等待上传完成

### 步骤 5：测试转换

在小程序中上传一个 PDF 文件，系统会自动调用转换服务。

---

## 💰 免费额度

- ✅ **每天 25 次**转换（免费）
- ✅ 支持 PDF、Word、Excel、PPT 等
- ✅ 每个文件最大 1GB

### 用量估算

| 场景 | 每天用户数 | PDF 平均页数 | 每天消耗 | 是否够用 |
|------|-----------|------------|---------|---------|
| 测试环境 | 5 | 10 | 5次 | ✅ 够用 |
| 小型应用 | 20 | 5 | 20次 | ✅ 够用 |
| 中型应用 | 50 | 5 | 50次 | ❌ 需付费 |

### 付费方案

如果免费额度不够，可以升级：

| 套餐 | 价格 | 转换次数 | 适合场景 |
|-----|------|---------|---------|
| 入门版 | $9/月 | 500次 | 小型应用 |
| 专业版 | $49/月 | 5000次 | 中型应用 |
| 企业版 | 定制 | 无限 | 大型应用 |

---

## 🔍 查看用量

1. 访问：https://cloudconvert.com/dashboard
2. 查看 **Usage** 部分
3. 可以看到：
   - 今日已用次数
   - 剩余次数
   - 历史记录

---

## ⚠️ 注意事项

### 1. API Key 安全
- ❌ **不要**把 API Key 提交到 Git
- ✅ 只在云函数里使用（云函数代码不会暴露）
- ✅ 定期更换 API Key

### 2. 转换限制
- 单个文件最大 1GB
- PDF 最多 1000 页
- 转换时间取决于文件大小（通常几秒到几分钟）

### 3. 错误处理
如果转换失败，检查：
- API Key 是否正确
- 免费额度是否用完
- 文件格式是否支持
- 文件是否损坏

---

##  完成后的效果

1. ✅ 用户上传 PDF → 自动转成图片
2. ✅ 每页一张图片
3. ✅ 图片上有水印覆盖层
4. ✅ 用户滚动查看，无法下载原文件
5. ✅ 截图会包含水印

---

## 🚀 下一步

配置完成后，需要修改：

1. **上传页面** - 允许上传 PDF
2. **文章服务** - 上传时自动转换
3. **预览页面** - 显示图片数组

详见：`文件转图片集成方案.md`
