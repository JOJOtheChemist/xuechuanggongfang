// 临时脚本：修复 banner 图片地址
const db = uniCloud.database()

exports.main = async (event, context) => {
  try {
    // 查询所有 banner
    const res = await db.collection('banners').get()
    console.log('当前 banner 数据：', JSON.stringify(res.data, null, 2))
    
    // 更新所有旧链接为新链接
    const updateRes = await db.collection('banners')
      .where({
        image_url: db.command.or([
          db.command.eq('https://web-ext-storage.dcloud.net.cn/uni-app/banner-dream.png'),
          db.command.eq('https://vkceyugu.cdn.bspapp.com/VKCEYUGU-f6e4e2c9-9c1f-4e0c-a73e-2f4e8c3e9f8d/banner-dream.png')
        ])
      })
      .update({
        image_url: 'https://mp-46bd4293-7b92-444c-b936-5777a228063a.cdn.bspapp.com/广告1_1764211622566_0.png'
      })
    
    console.log('更新结果：', updateRes)
    
    // 再次查询确认
    const newRes = await db.collection('banners').get()
    console.log('更新后的 banner 数据：', JSON.stringify(newRes.data, null, 2))
    
    return { code: 0, message: '修复成功' }
  } catch (e) {
    console.error('修复失败：', e)
    return { code: -1, message: e.message }
  }
}
