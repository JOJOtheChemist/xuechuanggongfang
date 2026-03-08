// 初始化报名类业务数据脚本
// 使用方法：在 HBuilderX 的 uniCloud 控制台中运行此脚本
// 目的：向数据库插入 驾校(3), 勤工俭学(7), 考证(13) 的记录，并设置默认价格

const db = uniCloud.database()

async function initSignupCategories() {
    console.log('开始初始化报名类业务数据...')

    // 对应前端 STATIC_BUSINESS_ITEMS 的数据
    const items = [
        {
            id: 3,
            _id: "cat_signup_003", // 确保唯一ID
            title: '驾校',
            short_name: '驾校', // 对应 short
            bg_color: '#dcfce7',
            description: '提供专业驾考咨询服务，在学创工坊报名咨询，省心报考，高效拿证。',
            signup_price: 1.0, // 默认价格
            sort_order: 103,   // 排序
            status: 'active',
            has_articles: false,
            tag: '报名'
        },
        {
            id: 7,
            _id: "cat_signup_007",
            title: '勤工俭学',
            short_name: '勤工',
            bg_color: '#cffafe',
            description: '覆盖校内勤工俭学、校外兼职与企业实习，多重审核保障岗位真实可靠。',
            signup_price: 1.0,
            sort_order: 107,
            status: 'active',
            has_articles: false,
            tag: '报名'
        },
        {
            id: 13,
            _id: "cat_signup_013",
            title: '考证',
            short_name: '考证',
            bg_color: '#f3e8ff',
            description: '应急人社考证一站式服务，提供报名咨询、考前培训与证书领取全流程支持。',
            signup_price: 1.0,
            sort_order: 113,
            status: 'active',
            has_articles: true,
            tag: '报名'
        }
    ]

    let successCount = 0
    let skipCount = 0

    for (const item of items) {
        try {
            // 检查是否存在 (通过 id 查询)
            const checkRes = await db.collection('business_categories')
                .where({ id: item.id })
                .get()

            if (checkRes.data && checkRes.data.length > 0) {
                console.log(`[跳过] 业务 ${item.title} (ID:${item.id}) 已存在，跳过插入。建议使用 update-business-price.js 更新价格。`)
                skipCount++
            } else {
                // 插入
                await db.collection('business_categories').add(item)
                console.log(`[成功] 插入业务 ${item.title} (ID:${item.id}), 价格: ${item.signup_price}元`)
                successCount++
            }
        } catch (e) {
            console.error(`[失败] 处理 ${item.title} 出错:`, e)
        }
    }

    console.log(`\n=== 初始化完成 ===`)
    console.log(`插入: ${successCount}`)
    console.log(`跳过: ${skipCount}`)
}

initSignupCategories()
