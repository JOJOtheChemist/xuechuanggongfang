// 更新数据库里的 banner 图片地址
// 在 HBuilderX 控制台运行：右键 dashboard-service -> 云函数本地运行 -> 在调试窗口粘贴以下代码

const db = uniCloud.database();

db.collection('banners')
  .where({
    title: '星河回响 追逐同频'
  })
  .update({
    image_url: 'https://mp-46bd4293-7b92-444c-b936-5777a228063a.cdn.bspapp.com/广告1_1764211622566_0.png'
  })
  .then(res => {
    console.log('更新成功:', res);
  })
  .catch(err => {
    console.error('更新失败:', err);
  });
