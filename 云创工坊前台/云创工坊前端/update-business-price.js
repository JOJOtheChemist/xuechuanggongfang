// 批量更新业务报名价格脚本
// 使用方法：在 HBuilderX 的 uniCloud 控制台中运行此脚本
// 目标：将 驾校(3), 勤工俭学(7), 考证(13) 的 signup_price 更新为 1

const db = uniCloud.database()
const dbCmd = db.command

async function updateBusinessPrices() {
    console.log('开始更新业务报名价格...')

    // 需要更新的业务ID列表 (数字类型)
    const targetIds = [3, 7, 13]
    // 目标价格 (元)
    const targetPrice = 1.0

    try {
        let successCount = 0
        let failCount = 0

        // 1. 获取所有业务板块
        // 为了防止 id 类型不匹配，尽可能宽泛查找
        const res = await db.collection('business_categories')
            .where(dbCmd.or([
                { id: dbCmd.in(targetIds) },
                { _id: dbCmd.in(targetIds.map(String)) },
                // 部分老数据 id 可能是字符串 '7'
                { id: dbCmd.in(targetIds.map(String)) }
            ]))
            .get()

        console.log(`查询到 ${res.data.length} 个相关业务板块`)

        // 2. 逐个更新
        for (const item of res.data) {
            try {
                await db.collection('business_categories')
                    .doc(item._id)
                    .update({
                        signup_price: targetPrice,
                        update_date: Date.now()
                    })

                console.log(`✓ 更新业务 [${item.title || item.name}] (ID: ${item.id}): 价格 -> ${targetPrice} 元`)
                successCount++
            } catch (e) {
                console.error(`✗ 更新业务 [${item.title}] 失败:`, e)
                failCount++
            }
        }

        console.log('\n=== 更新完成 ===')
        console.log(`成功: ${successCount}`)
        console.log(`失败: ${failCount}`)

        if (successCount === 0) {
            console.warn('注意：没有更新任何记录。请检查数据库中 business_categories 表是否存在 id 为 3, 7, 13 的数据。')
        }

    } catch (error) {
        console.error('脚本执行出错:', error)
    }
}

// 执行更新
updateBusinessPrices()
