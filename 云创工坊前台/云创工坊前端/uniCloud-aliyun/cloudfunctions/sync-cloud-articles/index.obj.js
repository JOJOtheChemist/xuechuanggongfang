// 云函数: sync-cloud-articles/index.obj.js
const db = uniCloud.database()
const dbCmd = db.command

// 目录到分类ID的映射配置 (根据文件夹名称的前缀匹配)
const FOLDER_MAP = {
    "云南专升本": "cat_005",
    "专升本": "cat_005",
    "升学": "cat_015",
    "四六级": "cat_001",
    "四级": "cat_001",
    "六级": "cat_001",
    "考公": "cat_002",
    "公务员": "cat_002",
    "考研": "cat_004",
    "考编": "cat_009",
    "事业编": "cat_009",
    "计算机": "cat_007",
    "就业": "cat_013",
    "教资": "cat_006",
    "教师资格证": "cat_006",
    "考证": "cat_014",
    "动态": "cat_010",
    "素材": "cat_008",
    "cloudstorage": "cat_other",
    "驾校": "cat_003",
    "勤工": "cat_011",
    "棉被": "cat_016"
}

module.exports = {
    _before: function () {
        // 权限校验
    },

    /**
     * 第一步：扫描云存储文件
     * @param {Object} params
     * @param {String} params.categoryName 板块名称
     * @param {String} params.baseUrl CDN 域名
     */
    async scanFiles(params = {}) {
        const categoryName = params.categoryName || ''
        const baseUrl = params.baseUrl || 'https://mp-46bd4293-7b92-444c-b936-5777a228063a.cdn.bspapp.com/'
        let prefix = ''

        if (categoryName === '全量扫描') {
            prefix = ''
        } else if (categoryName) {
            // 如果输入的是完整的 URL，尝试提取路径部分作为 prefix
            if (categoryName.startsWith('http')) {
                const urlObj = new URL(categoryName)
                const baseObj = new URL(baseUrl)
                // 如果域名相同，去掉 base 处理
                if (urlObj.host === baseObj.host) {
                    prefix = urlObj.pathname.startsWith('/') ? urlObj.pathname.substring(1) : urlObj.pathname
                } else {
                    // 如果尝试扫别的域名，这种通常不支持，但至少我们可以尝试解码
                    prefix = urlObj.pathname.startsWith('/') ? urlObj.pathname.substring(1) : urlObj.pathname
                }
                // URL 里的中文通常是编码过的，需要还原成原始的中文字符串供 aliyun listFile 使用
                prefix = decodeURIComponent(prefix)
            } else {
                prefix = categoryName.endsWith('/') ? categoryName : categoryName + '/'
            }
        }

        console.log(`正在准备扫描云端。原始输入: ${categoryName}, 处理后前缀: ${prefix}`)

        // 深入诊断环境
        console.log('uniCloud 内部诊断:', {
            keys: Object.keys(uniCloud),
            typeofStorage: typeof uniCloud.storage,
            typeofGetStorageManager: typeof uniCloud.getStorageManager,
            typeofGetBucketManager: typeof uniCloud.getBucketManager
        })
        if (uniCloud.storage) console.log('uniCloud.storage keys:', Object.keys(uniCloud.storage))

        let pdfFiles = []
        try {
            let manager = null
            // 尝试多种方法获取管理器
            const tryMethods = [
                () => typeof uniCloud.getStorageManager === 'function' ? uniCloud.getStorageManager({ provider: 'aliyun' }) : null,
                () => typeof uniCloud.initStorage === 'function' ? uniCloud.initStorage({ provider: 'aliyun' }) : null,
                () => typeof uniCloud.getBucketManager === 'function' ? uniCloud.getBucketManager() : null,
                () => typeof uniCloud.storage === 'function' ? uniCloud.storage({ provider: 'aliyun' }) : null,
                () => (uniCloud.storage && typeof uniCloud.storage.listFile === 'function') ? uniCloud.storage : null
            ]

            for (let i = 0; i < tryMethods.length; i++) {
                try {
                    manager = tryMethods[i]()
                    if (manager && typeof manager.listFile === 'function') {
                        console.log(`✅ 成功通过方案 ${i + 1} 匹配到存储管理器`)
                        break
                    }
                } catch (e) {
                    console.log(`方案 ${i + 1} 失败:`, e.message)
                }
            }

            if (manager && typeof manager.listFile === 'function') {
                console.log('✅ 最终选定管理器类型:', typeof manager)

                let marker = null
                let totalFound = 0
                while (true) {
                    const res = await manager.listFile({ prefix, marker, maxKeys: 100 })
                    // 打印原始返回的前 5 个文件，帮助诊断路径结构
                    if (res.fileList && res.fileList.length > 0) {
                        console.log(`Aliyun 返回了 ${res.fileList.length} 个项目。前 5 个示例:`,
                            res.fileList.slice(0, 5).map(f => `${f.name} (${f.size || '文件夹?'})`))
                    } else {
                        console.log('Aliyun 返回列表为空')
                    }

                    if (res.fileList && res.fileList.length > 0) {
                        totalFound += res.fileList.length
                        // 不再只过滤 .pdf，先看看都有啥
                        const pdfBatch = res.fileList.filter(f => f.name && f.name.toLowerCase().endsWith('.pdf'))
                        const folderBatch = res.fileList.filter(f => f.name && f.name.endsWith('/') || (!f.size && !f.name.includes('.')))

                        console.log(`[诊断] Prefix: [${prefix}], 本批次总计: ${res.fileList.length}, 其中 PDF: ${pdfBatch.length}, 疑似文件夹: ${folderBatch.length}`)

                        pdfFiles = pdfFiles.concat(pdfBatch.map(f => {
                            // 对路径进行 URL 编码
                            const cleanName = f.name.startsWith('/') ? f.name.substring(1) : f.name
                            const encodedPath = cleanName.split('/').map(seg => encodeURIComponent(seg)).join('/')
                            const fileUrl = baseUrl.endsWith('/') ? `${baseUrl}${encodedPath}` : `${baseUrl}/${encodedPath}`
                            return {
                                name: f.name,
                                url: fileUrl,
                                size: f.size || 0
                            }
                        }))
                    }
                    if (!res.nextMarker) break
                    marker = res.nextMarker
                }
                console.log(`[扫描完成] 云端总共返回了 ${totalFound} 个对象，过滤出 ${pdfFiles.length} 个 PDF 文件。`)
            } else {
                throw new Error('当前环境不支持扫描云存储，请检查云函数配置或使用手动模式')
            }
        } catch (e) {
            console.error('扫描失败:', e.message)
            return { code: 500, message: '扫描云端失败: ' + e.message }
        }

        return {
            code: 0,
            message: pdfFiles.length > 0 ? `扫描成功，发现 ${pdfFiles.length} 个文件` : '未发现 PDF 文件',
            data: {
                files: pdfFiles,
                total: pdfFiles.length
            }
        }
    },

    /**
     * 第二步：执行同步创建文章
     * @param {Object} params
     * @param {Array} params.fileList 扫描出的文件列表 [{name, url, size}]
     * @param {String} params.categoryName 如果是板块同步，提供板块名以清空旧数据
     */
    async syncArticles(params = {}) {
        const fileList = params.fileList || []
        const categoryName = params.categoryName || ''
        const clearExisting = params.clearExisting || false
        const targetCategoryId = FOLDER_MAP[categoryName] || null

        if (fileList.length === 0) {
            return { code: 400, message: '同步列表不能为空' }
        }

        console.log(`执行同步, 数量: ${fileList.length}, 板块: ${categoryName}, 清空旧数据: ${clearExisting}`)

        // 1. 映射为文章数据
        const now = Date.now()
        const newArticles = fileList.map((file, index) => {
            // 尝试从 URL 中解析完整路径作为标签源，比 file.name 更可靠
            let pathTags = []
            let filename = file.name

            try {
                // 如果是完整 URL，提取路径
                if (file.url.startsWith('http')) {
                    const urlObj = new URL(file.url)
                    let pathname = decodeURIComponent(urlObj.pathname)
                    if (pathname.startsWith('/')) pathname = pathname.substring(1)

                    const segs = pathname.split('/')
                    // 最后一个是文件名
                    const rawExample = segs.pop()
                    if (rawExample) {
                        filename = rawExample.replace('.pdf', '')
                    }
                    pathTags = segs
                } else {
                    // 如果不是 URL，尝试用 slash 分割 name
                    const parts = file.name.split('/')
                    const rawExample = parts.pop()
                    if (rawExample) {
                        filename = rawExample.replace('.pdf', '')
                    }
                    pathTags = parts
                }
            } catch (e) {
                // 降级处理
                const parts = file.name.split('/')
                filename = parts.pop().replace('.pdf', '')
                pathTags = parts
            }

            // 再次确保 filename 没有 .pdf 后缀
            filename = filename.replace('.pdf', '')

            let categoryId = targetCategoryId || "cat_other"

            const decodedUrl = decodeURIComponent(file.url).toLowerCase()
            const lowerFileName = file.name.toLowerCase()

            if (categoryId === "cat_other" || categoryName === "手动导入" || categoryName === "自定义路径" || categoryName === "自定义") {
                for (const [key, val] of Object.entries(FOLDER_MAP)) {
                    const nameMatch = lowerFileName.includes(key.toLowerCase())
                    const urlMatch = decodedUrl.includes(key.toLowerCase())
                    if (nameMatch || urlMatch) {
                        categoryId = val
                        break
                    }
                }
            }

            const stdTags = [];
            if (decodedUrl.includes('考研')) stdTags.push('考研');
            if (decodedUrl.includes('四级') || decodedUrl.includes('六级') || decodedUrl.includes('四六级')) stdTags.push('四六级');
            if (decodedUrl.includes('考公') || decodedUrl.includes('公务员')) stdTags.push('考公');
            if (decodedUrl.includes('计算机')) stdTags.push('计算机');
            if (decodedUrl.includes('教资') || decodedUrl.includes('教师资格')) stdTags.push('教资');
            if (decodedUrl.includes('专升本')) stdTags.push('专升本');
            if (decodedUrl.includes('升学')) stdTags.push('升学');
            if (decodedUrl.includes('就业') || decodedUrl.includes('考编') || decodedUrl.includes('事业编')) stdTags.push('考编');

            // 合并路径标签和特定关键词标签
            const finalTags = [...new Set([...pathTags, ...stdTags])].filter(t => t && t.trim() !== '');

            return {
                title: filename,
                category_id: categoryId,
                summary: filename + " 完整资料。",
                content: `<p>请点击下方按钮阅读 PDF 文档：${filename}</p>`,
                price_points: 0, // 用户要求免费 (0积分)
                author_name: "云创管家",
                publish_time: now,
                tags: finalTags,
                stats: { views: 0, likes: 0, dislikes: 0 },
                attachments: [
                    {
                        type: "pdf",
                        name: filename + ".pdf",
                        fileID: file.url,
                        size: file.size || 0
                    }
                ],
                cover_image: "",
                unlocked: true,
                // created_at and updated_at omitted as requested
            }
        })

        // 2. 执行数据库操作
        try {
            if (clearExisting) {
                if (targetCategoryId) {
                    await db.collection('articles').where({ category_id: targetCategoryId }).remove()
                } else if (categoryName === '手动导入' || categoryName === '一键同步') {
                    // 全量清空仅在特定确认下执行，或者由前端控制
                    // 此处为了安全暂不做自动全量清空
                }
            }

            const res = await db.collection('articles').add(newArticles)

            return {
                code: 0,
                message: '同步成功',
                data: {
                    inserted: newArticles.length,
                    details: `已创建 ${newArticles.length} 篇文章`
                }
            }
        } catch (e) {
            console.error('数据库同步失败:', e)
            return { code: 500, message: '数据库操作失败: ' + e.message }
        }
    },

    /**
     * 清空数据库文章 (危险操作)
     */
    async clearArticles() {
        try {
            const res = await db.collection('articles').where({ _id: dbCmd.exists(true) }).remove()
            return { code: 0, message: '清空成功', data: { deleted: res.deleted } }
        } catch (e) {
            return { code: 500, message: '清空失败: ' + e.message }
        }
    }
}
