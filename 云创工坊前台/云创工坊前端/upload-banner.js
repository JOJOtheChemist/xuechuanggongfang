/**
 * 上传 banner 图片到 uniCloud 云存储并插入数据库
 * 使用方法：node upload-banner.js <图片路径>
 * 例如：node upload-banner.js ~/Downloads/banner.png
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

// uniCloud 配置 - 需要从 HBuilderX 获取
const SPACE_ID = 'uni-f6e4e2c9';  // 你的空间 ID，在 manifest.json 中可以找到
const CLIENT_SECRET = '';  // 需要在 uniCloud Web 控制台获取

async function uploadBanner(imagePath) {
  console.log('开始上传 banner 图片...');
  
  // 检查图片是否存在
  if (!fs.existsSync(imagePath)) {
    console.error('错误：图片文件不存在:', imagePath);
    process.exit(1);
  }

  const imageBuffer = fs.readFileSync(imagePath);
  const ext = path.extname(imagePath);
  const cloudPath = `banners/${Date.now()}${ext}`;

  console.log('图片路径:', imagePath);
  console.log('图片大小:', (imageBuffer.length / 1024).toFixed(2), 'KB');
  console.log('云端路径:', cloudPath);

  // 由于 uniCloud SDK 不支持 Node.js 环境直接调用，这里提供两种方案：
  
  console.log('\n=== 方案 1：使用 HBuilderX 内置终端 ===');
  console.log('在 HBuilderX 的内置终端中运行以下命令：');
  console.log(`uniCloud.uploadFile({`);
  console.log(`  filePath: '${imagePath}',`);
  console.log(`  cloudPath: '${cloudPath}'`);
  console.log(`})`);
  
  console.log('\n=== 方案 2：使用云函数上传 ===');
  console.log('1. 图片已保存为 base64，可以通过云函数上传');
  
  const base64Image = imageBuffer.toString('base64');
  
  // 生成云函数调用代码
  const cloudFunctionCode = `
// 在 HBuilderX 中右键云函数 dashboard-service，选择「云函数本地运行」
// 然后调用以下方法：

const db = uniCloud.database();

// 1. 先手动上传图片到云存储，获得 fileID
// 2. 然后插入数据库
await db.collection('banners').add({
  title: '星河回响 追逐同频',
  image_url: '你上传后的图片URL',
  link_url: '',
  status: 'online',
  sort_order: 1,
  create_date: Date.now()
});
`;

  console.log(cloudFunctionCode);
  
  // 保存 base64 到文件，方便复制粘贴
  const base64File = path.join(__dirname, 'banner-base64.txt');
  fs.writeFileSync(base64File, base64Image);
  console.log(`\n图片 base64 已保存到: ${base64File}`);
  console.log('你可以在 uniCloud Web 控制台使用 base64 上传图片');
}

// 获取命令行参数
const imagePath = process.argv[2];

if (!imagePath) {
  console.error('请提供图片路径！');
  console.error('使用方法: node upload-banner.js <图片路径>');
  console.error('例如: node upload-banner.js ~/Downloads/banner.png');
  process.exit(1);
}

// 解析完整路径
const fullPath = path.resolve(imagePath.replace(/^~/, process.env.HOME));
uploadBanner(fullPath);
