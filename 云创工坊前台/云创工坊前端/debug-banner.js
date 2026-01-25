// 在微信开发者工具控制台运行这段代码，检查 banner 数据

// 1. 检查数据库
const db = uniCloud.database();
db.collection('banners')
  .where({ status: 'online' })
  .get()
  .then(res => {
    console.log('=== 数据库 banner 数据 ===');
    console.log('总数:', res.result.data.length);
    console.log('数据:', res.result.data);
  })
  .catch(err => {
    console.error('查询失败:', err);
  });

// 2. 检查当前页面的 banners 数据
setTimeout(() => {
  const pages = getCurrentPages();
  const currentPage = pages[pages.length - 1];
  console.log('=== 当前页面 banners ===');
  console.log('banners 数组:', currentPage.banners);
  console.log('banners 长度:', currentPage.banners ? currentPage.banners.length : 0);
}, 1000);
