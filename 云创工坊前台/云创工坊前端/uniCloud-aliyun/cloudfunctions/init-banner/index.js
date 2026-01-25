'use strict';

module.exports = {
/**
 * 初始化 banner 数据
 * 使用已上传到云存储的图片 fileID
 */
main: async (event, context) => {
  const db = uniCloud.database();
  
  try {
    // 1. 先删除所有旧的 banner 记录
    const oldBanners = await db.collection('banners').get();
    console.log(`找到 ${oldBanners.data.length} 条旧记录`);
    
    if (oldBanners.data.length > 0) {
      for (const item of oldBanners.data) {
        await db.collection('banners').doc(item._id).remove();
        console.log(`已删除旧记录: ${item._id}`);
      }
    }
    
    // 2. 使用你上传的图片 fileID（改成你云存储里的实际 fileID）
    // 如果你还没上传，先去 uniCloud Web 控制台 -> 云存储，上传图片，然后复制 fileID 到这里
    const fileID = 'cloud://mp-46bd4293-7b92-444c-b936-5777a228063a.6d70-mp-46bd4293-7b92-444c-b936-5777a228063a-1329070347/广告1_1764211622566_0.png';
    
    const bannerData = {
      title: '首页 Banner',
      image_url: fileID,
      link_url: '',
      status: 'online',
      sort_order: 1,
      create_date: Date.now()
    };
    
    // 3. 插入新的 banner 数据
    const result = await db.collection('banners').add(bannerData);
    
    return {
      code: 0,
      message: 'Banner 初始化成功，已清理旧数据',
      data: {
        id: result.id,
        deleted_count: oldBanners.data.length,
        ...bannerData
      }
    };
    
  } catch (error) {
    console.error('初始化 banner 失败:', error);
    return {
      code: -1,
      message: error.message || '初始化失败',
      error
    }
  }
},

/**
 * 保存用户上传的 banner
 */
saveBanner: async function({ fileID }) {
  console.log('[saveBanner] fileID:', fileID)
  
  if (!fileID) {
    return { code: -1, message: '未提供 fileID' }
  }
  
  const db = uniCloud.database()
  
  try {
    // 删除旧 banner
    const oldBanners = await db.collection('banners').get()
    if (oldBanners.data.length > 0) {
      for (const item of oldBanners.data) {
        await db.collection('banners').doc(item._id).remove()
      }
    }
    
    // 插入新 banner
    const addRes = await db.collection('banners').add({
      title: '首页 Banner',
      image_url: fileID,
      link_url: '',
      status: 'online',
      sort_order: 1
    })
    
    console.log('[saveBanner] 保存结果:', addRes)
    console.log('[saveBanner] 已保存 fileID:', fileID)
    
    return { code: 0, message: '保存成功', fileID }
  } catch (error) {
    console.error('保存 banner 失败:', error)
    return { code: -1, message: error.message }
  }
}
};
