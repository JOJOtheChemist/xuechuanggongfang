// 数据初始化云函数
'use strict';

exports.main = async (event, context) => {
  const db = uniCloud.database()

  try {
    // 0. 先清空旧数据
    console.log('清空旧数据...')
    await db.collection('articles').where({}).remove()
    await db.collection('business_categories').where({}).remove()
    await db.collection('teams').where({}).remove()
    console.log('✅ 旧数据已清空')

    // 1. 插入分类数据
    console.log('开始插入分类数据...')
    const categories = [
      {
        "_id": "cat_002",
        "title": "考公考编",
        "short_name": "考公",
        "bg_color": "#fee2e2",
        "description": "最新公考资讯与题库，结合名师课程，帮助你高效备考，稳步上岸。",
        "icon": "https://picsum.photos/100/100?random=2",
        "sort_order": 2,
        "status": "active",
        "has_articles": true,
        "tag": "官方认证"
      },
      {
        "_id": "cat_004",
        "title": "考研",
        "short_name": "考研",
        "bg_color": "#e0e7ff",
        "description": "提供全程备考规划、院校专业分析与复试指导，帮你构建系统化学习路径。",
        "icon": "https://picsum.photos/100/100?random=4",
        "sort_order": 4,
        "status": "active",
        "has_articles": true,
        "tag": "新上线"
      },
      {
        "_id": "cat_005",
        "title": "专升本",
        "short_name": "专升本",
        "bg_color": "#fef3c7",
        "description": "为专科生量身打造的升学路径，提供报考指南、备考资料与院校分析，助力升学梦想。",
        "icon": "https://picsum.photos/100/100?random=5",
        "sort_order": 5,
        "status": "active",
        "has_articles": true,
        "tag": "热门推荐"
      },
      {
        "_id": "cat_008",
        "title": "朋友圈素材",
        "short_name": "素材",
        "bg_color": "#ede9fe",
        "description": "节日海报、打卡配图与文案模板一站式获取，让你的社交内容持续有灵感。",
        "icon": "https://picsum.photos/100/100?random=8",
        "sort_order": 8,
        "status": "active",
        "has_articles": true,
        "tag": "新上线"
      },
      {
        "_id": "cat_kb_001",
        "title": "销售话术",
        "short_name": "话术",
        "bg_color": "#dbeafe",
        "description": "Top Sales 实战总结，精选高转化话术模板，快速提升成交率。",
        "icon": "https://picsum.photos/100/100?random=11",
        "sort_order": 9,
        "status": "active",
        "has_articles": true,
        "tag": "知识库"
      },
      {
        "_id": "cat_kb_002",
        "title": "市场分析报告",
        "short_name": "报告",
        "bg_color": "#fef3c7",
        "description": "Q3 季度数据洞察，深度剖析市场趋势与竞品策略。",
        "icon": "https://picsum.photos/100/100?random=12",
        "sort_order": 10,
        "status": "active",
        "has_articles": true,
        "tag": "知识库"
      },
      {
        "_id": "cat_kb_003",
        "title": "成功案例",
        "short_name": "案例",
        "bg_color": "#dcfce7",
        "description": "经典成交复盘，学习顶尖销售的实战经验与技巧。",
        "icon": "https://picsum.photos/100/100?random=13",
        "sort_order": 11,
        "status": "active",
        "has_articles": true,
        "tag": "知识库"
      },
      {
        "_id": "cat_kb_004",
        "title": "培训资料",
        "short_name": "培训",
        "bg_color": "#fee2e2",
        "description": "新人入职必读，系统化培训课程助你快速上手。",
        "icon": "https://picsum.photos/100/100?random=14",
        "sort_order": 12,
        "status": "active",
        "has_articles": true,
        "tag": "知识库"
      }
    ]

    await db.collection('business_categories').add(categories)
    console.log('✅ 分类数据插入成功')

    // 2. 插入文章数据
    console.log('开始插入文章数据...')
    const articles = [
      {
        "_id": "article_001",
        "category_id": "cat_002",
        "title": "2024年国考备考全攻略",
        "summary": "详细解读国考报名流程、考试科目、复习方法",
        "content": "<h2>国考备考指南</h2><p>系统的备考计划是成功的关键。</p>",
        "cover_image": "https://picsum.photos/800/450?random=21",
        "author_name": "云创管理员",
        "stats": { "views": 1256, "likes": 89, "dislikes": 2 },
        "publish_time": Date.now()
      },
      {
        "_id": "article_002",
        "category_id": "cat_002",
        "title": "行测提分技巧大公开",
        "summary": "资深培训师分享行测各模块的答题技巧",
        "content": "<h2>行测提分</h2><p>掌握技巧快速提升正确率。</p>",
        "cover_image": "https://picsum.photos/800/450?random=22",
        "author_name": "云创管理员",
        "stats": { "views": 987, "likes": 67, "dislikes": 1 },
        "publish_time": Date.now()
      },
      {
        "_id": "article_003",
        "category_id": "cat_004",
        "title": "考研择校指南",
        "summary": "从专业实力、地理位置等维度教你科学择校",
        "content": "<h2>择校技巧</h2><p>选对学校事半功倍。</p>",
        "cover_image": "https://picsum.photos/800/450?random=24",
        "author_name": "云创管理员",
        "stats": { "views": 2134, "likes": 156, "dislikes": 4 },
        "publish_time": Date.now()
      },
      {
        "_id": "article_004",
        "category_id": "cat_004",
        "title": "英语一vs英语二备考策略",
        "summary": "深度解析两类英语的题型差异与难度区别",
        "content": "<h2>英语备考</h2><p>针对性复习更高效。</p>",
        "cover_image": "https://picsum.photos/800/450?random=25",
        "author_name": "云创管理员",
        "stats": { "views": 1678, "likes": 98, "dislikes": 2 },
        "publish_time": Date.now()
      },
      {
        "_id": "article_005",
        "category_id": "cat_005",
        "title": "专升本报名流程及注意事项",
        "summary": "详细解读报名时间、材料准备等关键信息",
        "content": "<h2>报名指南</h2><p>避免错过重要节点。</p>",
        "cover_image": "https://picsum.photos/800/450?random=26",
        "author_name": "云创管理员",
        "stats": { "views": 1890, "likes": 134, "dislikes": 3 },
        "publish_time": Date.now()
      },
      {
        "_id": "article_006",
        "category_id": "cat_005",
        "title": "专升本各科目备考攻略",
        "summary": "系统梳理英语、高数、专业课等科目复习策略",
        "content": "<h2>备考攻略</h2><p>高效备考事半功倍。</p>",
        "cover_image": "https://picsum.photos/800/450?random=27",
        "author_name": "云创管理员",
        "stats": { "views": 1567, "likes": 89, "dislikes": 1 },
        "publish_time": Date.now()
      },
      {
        "_id": "article_007",
        "category_id": "cat_008",
        "title": "春节朋友圈文案100条",
        "summary": "精选春节祝福语、拜年金句和新年愿望文案",
        "content": "<h2>春节文案</h2><p>让朋友圈充满年味。</p>",
        "cover_image": "https://picsum.photos/800/450?random=29",
        "author_name": "云创管理员",
        "stats": { "views": 3456, "likes": 267, "dislikes": 8 },
        "publish_time": Date.now()
      },
      {
        "_id": "article_008",
        "category_id": "cat_008",
        "title": "高颜值海报模板合集",
        "summary": "节日海报、活动宣传、日常打卡等多种场景模板",
        "content": "<h2>海报模板</h2><p>一键下载直接使用。</p>",
        "cover_image": "https://picsum.photos/800/450?random=30",
        "author_name": "云创管理员",
        "stats": { "views": 2789, "likes": 198, "dislikes": 6 },
        "publish_time": Date.now()
      },
      {
        "_id": "article_kb_001",
        "category_id": "cat_kb_001",
        "title": "电话销售开场白必备话术",
        "summary": "5种高转化开场白模板，让客户愿意听你说下去",
        "content": "<h2>电话销售开场白</h2><p>1. 价值前置型：您好，我是XX，专门帮助企业降低30%运营成本...</p><p>2. 问题引导型：您是否遇到过...</p>",
        "cover_image": "https://picsum.photos/800/450?random=31",
        "author_name": "销售总监",
        "stats": { "views": 1234, "likes": 89, "dislikes": 3 },
        "publish_time": Date.now()
      },
      {
        "_id": "article_kb_002",
        "category_id": "cat_kb_001",
        "title": "客户异议处理话术大全",
        "summary": "应对'太贵了'、'我再考虑考虑'等常见异议的标准话术",
        "content": "<h2>异议处理</h2><p>当客户说'太贵了'时，不要直接降价，而是...</p>",
        "cover_image": "https://picsum.photos/800/450?random=32",
        "author_name": "销售总监",
        "stats": { "views": 2156, "likes": 167, "dislikes": 5 },
        "publish_time": Date.now()
      },
      {
        "_id": "article_kb_003",
        "category_id": "cat_kb_002",
        "title": "2024 Q3市场趋势分析报告",
        "summary": "深度解析行业现状、竞争格局与未来机会",
        "content": "<h2>市场概况</h2><p>本季度市场总体规模达到...</p><h2>竞争分析</h2><p>主要竞品动态...</p>",
        "cover_image": "https://picsum.photos/800/450?random=33",
        "author_name": "市场分析师",
        "stats": { "views": 987, "likes": 76, "dislikes": 2 },
        "publish_time": Date.now()
      },
      {
        "_id": "article_kb_004",
        "category_id": "cat_kb_002",
        "title": "用户画像与需求洞察",
        "summary": "基于大数据分析的目标客户群体特征研究",
        "content": "<h2>用户画像</h2><p>年龄分布、消费能力、决策偏好...</p>",
        "cover_image": "https://picsum.photos/800/450?random=34",
        "author_name": "市场分析师",
        "stats": { "views": 1543, "likes": 112, "dislikes": 4 },
        "publish_time": Date.now()
      },
      {
        "_id": "article_kb_005",
        "category_id": "cat_kb_003",
        "title": "百万大单成交全流程复盘",
        "summary": "从初次接触到最终签约，揭秘大客户销售的每个关键节点",
        "content": "<h2>客户背景</h2><p>某上市公司采购部...</p><h2>成交关键</h2><p>信任建立、价值展示、风险把控...</p>",
        "cover_image": "https://picsum.photos/800/450?random=35",
        "author_name": "金牌销售",
        "stats": { "views": 3421, "likes": 289, "dislikes": 7 },
        "publish_time": Date.now()
      },
      {
        "_id": "article_kb_006",
        "category_id": "cat_kb_003",
        "title": "从0到1：新客户开发经典案例",
        "summary": "3个月拿下行业标杆客户的实战经验分享",
        "content": "<h2>背景介绍</h2><p>目标客户是行业TOP3企业...</p><h2>突破策略</h2>",
        "cover_image": "https://picsum.photos/800/450?random=36",
        "author_name": "金牌销售",
        "stats": { "views": 2876, "likes": 201, "dislikes": 6 },
        "publish_time": Date.now()
      },
      {
        "_id": "article_kb_007",
        "category_id": "cat_kb_004",
        "title": "新人销售入门手册",
        "summary": "从产品知识到客户沟通，7天快速上手指南",
        "content": "<h2>第一天：了解公司与产品</h2><p>...</p><h2>第二天：客户画像学习</h2>",
        "cover_image": "https://picsum.photos/800/450?random=37",
        "author_name": "培训经理",
        "stats": { "views": 1987, "likes": 143, "dislikes": 3 },
        "publish_time": Date.now()
      },
      {
        "_id": "article_kb_008",
        "category_id": "cat_kb_004",
        "title": "CRM系统使用培训",
        "summary": "客户管理系统操作指南，高效管理客户资源",
        "content": "<h2>系统登录</h2><p>...</p><h2>客户信息录入</h2><p>...</p><h2>跟进记录</h2>",
        "cover_image": "https://picsum.photos/800/450?random=38",
        "author_name": "培训经理",
        "stats": { "views": 1456, "likes": 98, "dislikes": 2 },
        "publish_time": Date.now()
      }
    ]

    await db.collection('articles').add(articles)
    console.log('✅ 文章数据插入成功')

    // 3. 插入团队数据
    console.log('开始插入团队数据...')
    const now = Date.now()
    const teams = [
      {
        "_id": "team_001",
        "team_name": "北京精英团队",
        "team_level": "钻石团队",
        "leader_id": "",
        "leader_name": "",
        "member_count": 15,
        "description": "北京地区顶尖销售团队，月度业绩持续领先",
        "status": "active",
        "create_date": now,
        "update_date": now
      },
      {
        "_id": "team_002",
        "team_name": "上海王者团队",
        "team_level": "铂金团队",
        "leader_id": "",
        "leader_name": "",
        "member_count": 22,
        "description": "上海地区核心销售力量，专注高端客户服务",
        "status": "active",
        "create_date": now,
        "update_date": now
      },
      {
        "_id": "team_003",
        "team_name": "深圳创新团队",
        "team_level": "黄金团队",
        "leader_id": "",
        "leader_name": "",
        "member_count": 18,
        "description": "年轻有活力的创新团队，擅长互联网营销",
        "status": "active",
        "create_date": now,
        "update_date": now
      },
      {
        "_id": "team_004",
        "team_name": "广州先锋团队",
        "team_level": "白银团队",
        "leader_id": "",
        "leader_name": "",
        "member_count": 12,
        "description": "广州本地优质团队，熟悉本地市场",
        "status": "active",
        "create_date": now,
        "update_date": now
      },
      {
        "_id": "team_005",
        "team_name": "成都新星团队",
        "team_level": "青铜团队",
        "leader_id": "",
        "leader_name": "",
        "member_count": 8,
        "description": "新成立的潜力团队，快速成长中",
        "status": "active",
        "create_date": now,
        "update_date": now
      }
    ]

    await db.collection('teams').add(teams)
    console.log('✅ 团队数据插入成功')

    return {
      code: 0,
      message: '初始化数据成功',
      data: {
        categories: categories.length,
        articles: articles.length,
        teams: teams.length
      }
    }

  } catch (error) {
    console.error('初始化数据失败:', error)
    return {
      code: -1,
      message: '初始化失败: ' + error.message,
      error: error
    }
  }
}
