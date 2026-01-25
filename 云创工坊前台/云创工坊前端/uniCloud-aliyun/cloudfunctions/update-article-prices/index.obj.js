// 批量更新文章积分价格的云函数
const db = uniCloud.database()

module.exports = {
  async updateAllArticlePrices() {
    try {
      console.log('开始批量更新文章积分价格...')
      
      // 查询所有文章
      const res = await db.collection('articles').get()
      
      console.log(`共找到 ${res.data.length} 篇文章`)
      
      const updates = []
      
      for (const article of res.data) {
        const currentPrice = article.price_points
        
        // 如果 price_points 不存在、为 null、为 undefined 或为 0，设置为 5
        if (currentPrice === undefined || currentPrice === null || currentPrice === 0) {
          updates.push({
            _id: article._id,
            title: article.title,
            oldPrice: currentPrice,
            newPrice: 5
          })
          
          await db.collection('articles')
            .doc(article._id)
            .update({
              price_points: 5
            })
        }
      }
      
      console.log('更新完成')
      
      return {
        code: 0,
        message: '更新成功',
        data: {
          total: res.data.length,
          updated: updates.length,
          details: updates
        }
      }
    } catch (error) {
      console.error('更新失败:', error)
      return {
        code: 500,
        message: '更新失败',
        error: error.message
      }
    }
  }
}
