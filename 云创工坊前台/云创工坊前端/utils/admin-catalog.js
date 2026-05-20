import { getHttpService } from './http-services'

const DEFAULT_AUTHOR_NAME = '云创管家'
const DEFAULT_BATCH_SIZE = 100

const CATEGORY_MAPPING = {
	'四六级': 'cat_001',
	'考公': 'cat_002',
	'考研': 'cat_004',
	'专升本': 'cat_005',
	'教资': 'cat_006',
	'计算机': 'cat_007',
	'考编': 'cat_009',
	'就业': 'cat_013',
	'考证': 'cat_014',
	'升学': 'cat_015'
}

function isPlainObject(value) {
	return Object.prototype.toString.call(value) === '[object Object]'
}

function normalizeText(value) {
	if (typeof value === 'string') return value.trim()
	if (value === undefined || value === null) return ''
	return String(value).trim()
}

function normalizeTags(value) {
	const rawList = Array.isArray(value)
		? value
		: typeof value === 'string'
			? value.split(',')
			: []

	const seen = new Set()
	const tags = []

	rawList.forEach((item) => {
		const text = normalizeText(item)
		if (!text || seen.has(text)) return
		seen.add(text)
		tags.push(text)
	})

	return tags
}

function stripExtension(fileName) {
	return normalizeText(fileName).replace(/\.[^.]+$/, '')
}

function safeDecode(text) {
	try {
		return decodeURIComponent(text)
	} catch (e) {
		return text
	}
}

function normalizeBaseUrl(baseUrl) {
	return normalizeText(baseUrl).replace(/\/+$/, '')
}

function extractPathSegments(fileUrl) {
	const rawUrl = normalizeText(fileUrl)
	if (!rawUrl) return []

	const withoutHash = rawUrl.split('#')[0]
	const withoutQuery = withoutHash.split('?')[0]
	const path = /^https?:\/\//i.test(withoutQuery)
		? withoutQuery.replace(/^https?:\/\/[^/]+\/?/, '')
		: withoutQuery.replace(/^\/+/, '')

	return path
		.split('/')
		.map((segment) => safeDecode(segment))
		.filter(Boolean)
}

function joinFileUrl(baseUrl, segments) {
	const base = normalizeBaseUrl(baseUrl)
	const encodedPath = segments
		.map((segment) => encodeURIComponent(normalizeText(segment)))
		.filter(Boolean)
		.join('/')

	return encodedPath ? `${base}/${encodedPath}` : base
}

function defaultSummary(title) {
	return `${title} 完整资料。`
}

function defaultContent(title) {
	return `<p>请点击上方按钮阅读 PDF 文档：${title}</p>`
}

function defaultArticlePayload(partial) {
	const title = normalizeText(partial.title)
	const tags = normalizeTags(partial.tags)

	return {
		title,
		category_id: normalizeText(partial.category_id || partial.categoryId || ''),
		summary: normalizeText(partial.summary) || defaultSummary(title),
		content: normalizeText(partial.content || partial.content_html || partial.contentHtml) || defaultContent(title),
		price_points: Number.isFinite(Number(partial.price_points)) ? Number(partial.price_points) : 0,
		author_name: normalizeText(partial.author_name || partial.authorName) || DEFAULT_AUTHOR_NAME,
		publish_time: partial.publish_time || partial.publishedAt || Date.now(),
		tags,
		attachments: Array.isArray(partial.attachments) ? partial.attachments : [],
		cover_image: normalizeText(partial.cover_image || partial.coverImage || partial.cover_image_url || partial.coverImageUrl)
	}
}

export function chunkArray(list, size = DEFAULT_BATCH_SIZE) {
	const source = Array.isArray(list) ? list : []
	const batchSize = Math.max(1, Number(size) || DEFAULT_BATCH_SIZE)
	const chunks = []

	for (let index = 0; index < source.length; index += batchSize) {
		chunks.push(source.slice(index, index + batchSize))
	}

	return chunks
}

export function createArticleFromPdfUrl(fileUrl) {
	const segments = extractPathSegments(fileUrl)
	const fileName = segments[segments.length - 1] || ''
	const title = stripExtension(fileName)
	const tags = segments.slice(0, -1)
	const categoryTitle = tags[0] || ''

	return defaultArticlePayload({
		title,
		category_id: CATEGORY_MAPPING[categoryTitle] || '',
		tags,
		attachments: fileUrl
			? [{
				type: 'pdf',
				name: fileName,
				fileID: normalizeText(fileUrl)
			}]
			: [],
		cover_image: ''
	})
}

export function createArticleFromIncrementalItem(item, baseUrl) {
	const rawItem = isPlainObject(item) ? item : {}
	const fileName = normalizeText(rawItem.fileName || rawItem.name)
	const title = stripExtension(fileName)
	const tags = normalizeTags([
		rawItem.level1,
		rawItem.level2,
		rawItem.level3,
		rawItem.level4
	])
	const fileUrl = joinFileUrl(baseUrl, [...tags, fileName])

	return defaultArticlePayload({
		title,
		category_id: CATEGORY_MAPPING[normalizeText(rawItem.level1)] || '',
		tags,
		attachments: fileUrl
			? [{
				type: 'pdf',
				name: fileName,
				fileID: fileUrl
			}]
			: [],
		cover_image: ''
	})
}

export function normalizeArticleForImport(article) {
	if (!isPlainObject(article)) return null
	const normalized = defaultArticlePayload(article)
	return normalized.title ? Object.assign({}, article, normalized) : null
}

export async function loadStaticJson(path) {
	const response = await uni.request({
		url: path,
		method: 'GET'
	})
	const statusCode = Array.isArray(response) ? response[1] && response[1].statusCode : response.statusCode
	const data = Array.isArray(response) ? response[1] && response[1].data : response.data

	if (statusCode !== 200) {
		throw new Error(`加载失败: ${statusCode || 'unknown'}`)
	}

	if (typeof data === 'string') {
		return JSON.parse(data)
	}

	return data
}

export async function importArticlesInBatches(options = {}) {
	const articles = Array.isArray(options.articles) ? options.articles : []
	const batchSize = Math.max(1, Number(options.batchSize) || DEFAULT_BATCH_SIZE)
	const updateTagsOnly = Boolean(options.updateTagsOnly)
	const importService = getHttpService('import-articles')
	const prepared = articles
		.map((article) => normalizeArticleForImport(article))
		.filter(Boolean)
	const batches = chunkArray(prepared, batchSize)
	const result = {
		total: prepared.length,
		success: 0,
		failed: 0,
		errors: [],
		batchCount: batches.length
	}

	for (let index = 0; index < batches.length; index += 1) {
		const batch = batches[index]
		if (typeof options.onProgress === 'function') {
			options.onProgress({
				stage: 'before',
				batchIndex: index + 1,
				batchCount: batches.length,
				processed: result.success + result.failed,
				total: prepared.length
			})
		}

		const response = await importService.importData({
			articles: batch,
			updateTagsOnly
		})

		if (!response || response.code !== 0 || !response.data) {
			throw new Error((response && response.message) || '导入失败')
		}

		result.success += Number(response.data.success || 0)
		result.failed += Number(response.data.failed || 0)

		if (Array.isArray(response.data.errors) && response.data.errors.length) {
			result.errors = result.errors.concat(response.data.errors)
		}

		if (typeof options.onProgress === 'function') {
			options.onProgress({
				stage: 'after',
				batchIndex: index + 1,
				batchCount: batches.length,
				processed: Math.min((index + 1) * batchSize, prepared.length),
				total: prepared.length,
				success: result.success,
				failed: result.failed
			})
		}
	}

	return result
}

export async function clearImportedArticles(options = {}) {
	const importService = getHttpService('import-articles')
	const response = await importService.clearDatabase({
		resetCategoryTags: options.resetCategoryTags !== false
	})

	if (!response || response.code !== 0 || !response.data) {
		throw new Error((response && response.message) || '清理失败')
	}

	return response.data
}
