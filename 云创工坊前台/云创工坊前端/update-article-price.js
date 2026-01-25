// 批量更新文章积分价格脚本
// 使用方法：在 HBuilderX 的 uniCloud 控制台中运行此脚本

const db = uniCloud.database()
const dbCmd = db.command

async function updateArticlePrices() {
  console.log('开始更新文章积分价格...')
  
  try {
    // 查询所有文章
    const res = await db.collection('articles').get()
    
    console.log(`共找到 ${res.data.length} 篇文章`)
    
    let successCount = 0
    let failCount = 0
    
    // 逐个更新
    for (const article of res.data) {
      try {
        const currentPrice = article.price_points || 0
        
        // 如果当前价格为 0 或未设置，设置为 5 积分
        // 如果已有价格，保持不变
        const newPrice = currentPrice > 0 ? currentPrice : 5
        
        await db.collection('articles')
          .doc(article._id)
          .update({
            price_points: newPrice
          })
        
        console.log(`✓ 更新文章《${article.title}》: ${currentPrice} -> ${newPrice} 积分`)
        successCount++
      } catch (e) {
        console.error(`✗ 更新文章《${article.title}》失败:`, e.message)
        failCount++
      }
    }
    
    console.log('\n=== 更新完成 ===')
    console.log(`成功: ${successCount} 篇`)
    console.log(`失败: ${failCount} 篇`)
    
  } catch (error) {
    console.error('更新失败:', error)
  }
}

// 执行更新
updateArticlePrices()
