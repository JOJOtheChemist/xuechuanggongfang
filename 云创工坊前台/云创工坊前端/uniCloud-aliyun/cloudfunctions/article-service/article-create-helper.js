// 文章创建辅助模块
// 处理文章创建和附件处理逻辑

/**
 * 创建文章
 * @param {Object} params - 参数对象
 * @param {String} params.title - 文章标题
 * @param {String} params.content - 文章正文内容
 * @param {String} params.summary - 文章摘要（可选）
 * @param {String} params.category_id - 分类 ID
 * @param {String} params.cover_image - 封面图片 fileID（可选）
 * @param {Array} params.attachments - 附件 fileID 数组（可选）
 * @param {Number} params.price_points - 积分价格，默认 0
 * @param {String} params._token - 用户 token
 * @param {Object} context - 上下文对象
 * @param {Object} context.db - 数据库实例
 * @param {Object} context.authUtils - 认证工具
 */
async function createArticle({
    title,
    content,
    summary = '',
    category_id,
    cover_image = '',
    attachments = [],
    price_points = 0,
    _token
} = {}, { db, authUtils }) {
    // 验证必填字段
    if (!title || !title.trim()) {
        return {
            code: 400,
            message: '文章标题不能为空'
        }
    }

    if (!content || !content.trim()) {
        return {
            code: 400,
            message: '文章内容不能为空'
        }
    }

    if (!category_id) {
        return {
            code: 400,
            message: '分类 ID 不能为空'
        }
    }

    try {
        // 使用自定义 token 解析当前用户
        const tokenData = authUtils.parseToken(_token)
        const userId = tokenData && tokenData.uid

        if (!userId) {
            return {
                code: 401,
                message: '请先登录'
            }
        }

        // 获取用户信息
        const userRes = await db.collection('uni-id-users')
            .doc(userId)
            .field({ nickname: true, username: true })
            .get()

        const userData = userRes.data && userRes.data[0]
        const author_name = (userData && (userData.nickname || userData.username)) || '匿名用户'

        // 处理附件：PDF 转图片
        console.log('[createArticle] 开始处理附件，总数:', attachments.length)
        console.log('[createArticle] 附件数据:', JSON.stringify(attachments))

        const processedAttachments = []

        for (const att of attachments) {
            const ext = att.name ? att.name.split('.').pop().toLowerCase() : ''
            console.log('[createArticle] 处理附件:', att.name, '，扩展名:', ext)

            if (ext === 'pdf') {
                console.log('[createArticle] 检测到 PDF 文件，开始转换:', att.name)

                try {
                    // 调用转换服务
                    const converter = uniCloud.importObject('file-converter')
                    const convertResult = await converter.convertPdfToImages({
                        fileID: att.fileID,
                        _token
                    })

                    if (convertResult.code === 0) {
                        console.log('[createArticle] PDF 转换成功，共', convertResult.data.pageCount, '张图片')

                        // 保存转换后的图片数组
                        processedAttachments.push({
                            ...att,
                            type: 'pdf-images',
                            images: convertResult.data.images,
                            pageCount: convertResult.data.pageCount,
                            originalFileID: att.fileID // 保留原 PDF fileID
                        })
                    } else {
                        console.error('[createArticle] PDF 转换失败:', convertResult.message)
                        // 转换失败，保留原文件
                        processedAttachments.push(att)
                    }
                } catch (e) {
                    console.error('[createArticle] PDF 转换异常:', e)
                    // 异常时保留原文件
                    processedAttachments.push(att)
                }
            } else {
                // 非 PDF 文件直接保存
                processedAttachments.push(att)
            }
        }

        // 构建文章数据
        const articleData = {
            category_id,
            title: title.trim(),
            content: content.trim(),
            summary: summary.trim() || title.trim().substring(0, 100),
            cover_image,
            attachments: processedAttachments, // 使用处理后的附件
            price_points: Number(price_points) || 0,
            author_name,
            author_id: userId,
            stats: {
                views: 0,
                likes: 0,
                dislikes: 0
            },
            publish_time: Date.now(),
            create_time: Date.now()
        }

        // 插入文章
        const result = await db.collection('articles').add(articleData)

        return {
            code: 0,
            message: '文章创建成功',
            data: {
                id: result.id,
                ...articleData
            }
        }
    } catch (error) {
        console.error('[createArticle] error:', error)
        return {
            code: 500,
            message: '创建文章失败',
            error: error.message
        }
    }
}

module.exports = {
    createArticle
}
