const db = uniCloud.database();

module.exports = {
    async importData(event, context) {
        // 全局 try-catch 确保一定返回 JSON，避免 "unexpected end of input"
        try {
            const { articles, updateTagsOnly } = event;
            const results = { success: 0, failed: 0, errors: [] };

            if (!articles || !Array.isArray(articles)) {
                return { success: 0, failed: 0, errors: [{ title: 'Main', error: 'Input articles is empty or not an array' }] };
            }

            console.log('开始批量导入，总数:', articles.length, '仅更新标签:', updateTagsOnly);

            for (const article of articles) {
                try {
                    // 基本字段校验
                    if (!article.title) continue;

                    // 1. 检查是否已存在 (根据标题)
                    const exist = await db.collection('articles').where({
                        title: article.title
                    }).get();

                    const safeTags = (Array.isArray(article.tags)) ? article.tags : [];

                    if (exist.data && exist.data.length > 0) {
                        // 已存在 -> 更新模式 (Upsert)
                        const docId = exist.data[0]._id;
                        console.log('更新已存在文章:', article.title, docId);

                        if (updateTagsOnly) {
                            // 仅更新标签模式
                            await db.collection('articles').doc(docId).update({
                                tags: safeTags,
                                update_time: Date.now()
                            });
                        } else {
                            // 全量更新模式
                            await db.collection('articles').doc(docId).update({
                                cover_image: article.cover_image,
                                attachments: article.attachments,
                                tags: safeTags,
                                update_time: Date.now()
                            });
                        }

                        // Update Category Tags (Upsert tags into category)
                        if (article.category_id && safeTags.length > 0) {
                            const dbCmd = db.command;
                            try {
                                // 先确保 filter_tags 字段存在（如果不存在则初始化为空数组）
                                const category = await db.collection('business_categories')
                                    .doc(article.category_id)
                                    .get();

                                if (category.data && category.data.length > 0) {
                                    const currentTags = category.data[0].filter_tags || [];
                                    // 合并新旧标签并去重
                                    const mergedTags = [...new Set([...currentTags, ...safeTags])];

                                    await db.collection('business_categories')
                                        .doc(article.category_id)
                                        .update({
                                            filter_tags: mergedTags
                                        });
                                    console.log(`Tags updated for category ${article.category_id}`);
                                }
                            } catch (err) {
                                console.error(`Failed to update category tags: ${err.message} `);
                                // 如果是因为 category 不存在导致 update 失败，这里不应该中断主流程
                            }
                        }

                        results.success++;
                        console.log('更新成功:', article.title);
                    } else {
                        // 不存在 -> 插入模式
                        const res = await db.collection('articles').add({
                            ...article,
                            tags: safeTags,
                            create_time: Date.now(),
                            update_time: Date.now()
                        });

                        if (res.id) {
                            results.success++;
                            console.log('导入成功:', article.title);

                            // Update Category Tags
                            if (article.category_id && safeTags.length > 0) {
                                try {
                                    const category = await db.collection('business_categories')
                                        .doc(article.category_id)
                                        .get();

                                    if (category.data && category.data.length > 0) {
                                        const currentTags = category.data[0].filter_tags || [];
                                        const mergedTags = [...new Set([...currentTags, ...safeTags])];

                                        await db.collection('business_categories')
                                            .doc(article.category_id)
                                            .update({
                                                filter_tags: mergedTags
                                            });
                                    }
                                } catch (err) {
                                    console.error(`Failed to update category tags(insert): ${err.message} `);
                                }
                            }
                        }
                    }
                } catch (e) {
                    results.failed++;
                    results.errors.push({ title: article.title || 'Unknown', error: e.message });
                    console.error('导入失败:', article.title, e);
                }
            }

            return results;
        } catch (globalErr) {
            console.error('Fatal Cloud Function Error:', globalErr);
            return {
                success: 0,
                failed: 1,
                errors: [{ title: 'Global', error: globalErr.message }]
            }
        }
    },

    async uploadImage(event, context) {
        const { filename, content } = event;
        // content is base64 string
        if (!content) {
            return { error: 'No content provided' };
        }

        try {
            const buffer = Buffer.from(content, 'base64');
            const res = await uniCloud.uploadFile({
                cloudPath: filename,
                fileContent: buffer
            });
            return res; // returns { fileID: '...', requestId: '...' }
        } catch (e) {
            console.error('Upload failed:', e);
            return { error: e.message };
        }
    }
}
