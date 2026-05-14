export function isValidArticleId(value) {
	if (typeof value === 'number') {
		return Number.isInteger(value) && value > 0
	}

	if (typeof value !== 'string') {
		return false
	}

	return /^\d+$/.test(value.trim())
}

export function extractArticleId(source) {
	if (source === null || source === undefined) {
		return ''
	}

	const candidates = typeof source === 'object'
		? [source.id, source.articleId, source.article_id, source._id]
		: [source]

	for (let i = 0; i < candidates.length; i += 1) {
		const value = candidates[i]
		if (isValidArticleId(value)) {
			return String(value).trim()
		}
	}

	return ''
}

export function buildArticleDetailUrl(source) {
	const articleId = extractArticleId(source)
	return articleId ? `/pages/article/detail?id=${articleId}` : ''
}

export function openArticleDetail(source, invalidToastTitle = '文章数据已失效') {
	const url = buildArticleDetailUrl(source)
	if (!url) {
		if (typeof uni !== 'undefined' && uni && typeof uni.showToast === 'function') {
			uni.showToast({
				title: invalidToastTitle,
				icon: 'none'
			})
		}
		return false
	}

	uni.navigateTo({ url })
	return true
}
