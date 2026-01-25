/**
 * Banner帮助函数
 */

/**
 * 获取首页 Banner 图片
 * @param {object} db - 数据库实例
 * @param {number} limit - 数量限制
 * @returns {object} Banner 数组
 */
async function getBanners(db, limit = 5) {
    try {
        const res = await db.collection('banners')
            .where({
                status: 'online'
            })
            .orderBy('sort_order', 'asc')
            .limit(limit)
            .get()

        // 转换 fileID 为临时 URL
        const banners = res.data || []
        const fileIDs = banners
            .map(item => item.image_url)
            .filter(url => url && url.startsWith('cloud://'))

        if (fileIDs.length > 0) {
            try {
                const fileRes = await uniCloud.getTempFileURL({
                    fileList: fileIDs
                })

                if (fileRes.fileList) {
                    const urlMap = {}
                    fileRes.fileList.forEach(file => {
                        urlMap[file.fileID] = file.tempFileURL
                    })

                    banners.forEach(item => {
                        if (item.image_url && urlMap[item.image_url]) {
                            item.image_url = urlMap[item.image_url]
                        }
                    })
                }
            } catch (e) {
                console.error('[banner-helper][getBanners] 转换 fileID 失败:', e)
            }
        }

        return {
            code: 0,
            message: '获取成功',
            data: banners
        }
    } catch (error) {
        console.error('[banner-helper][getBanners] 获取失败:', error)
        return {
            code: -1,
            message: error.message || '获取失败',
            data: []
        }
    }
}

/**
 * 更新 Banner
 * @param {object} db - 数据库实例
 * @param {string} fileID - 图片 fileID
 * @returns {object} 结果
 */
async function updateBanner(db, fileID) {
    try {
        // 删除旧 banner
        const oldBanners = await db.collection('banners').get()
        if (oldBanners.data.length > 0) {
            for (const item of oldBanners.data) {
                await db.collection('banners').doc(item._id).remove()
            }
        }

        // 插入新 banner
        await db.collection('banners').add({
            title: '首页 Banner',
            image_url: fileID,
            link_url: '',
            status: 'online',
            sort_order: 1
        })

        return {
            code: 0,
            message: '更新成功'
        }
    } catch (error) {
        console.error('[banner-helper][updateBanner] 更新失败:', error)
        return {
            code: -1,
            message: error.message || '更新失败'
        }
    }
}

module.exports = {
    getBanners,
    updateBanner
}
