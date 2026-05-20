import { isAuthMessage, toFriendlyAuthMessage } from './auth-message'

const API_SOURCE_HTTP = 'http'
const API_BASE_URL_STORAGE_KEY = 'xuechuang_api_base_url'

const DEFAULT_API_BASE_URL = 'https://xuechuang.xyz/api/v1'
const LEGACY_DEVTOOLS_API_BASE_URL = 'http://127.0.0.1:3001/api/v1'
const DEFAULT_STUDY_ARTICLE_COVER_URL =
	'https://xuechuang.xyz/oss/share-assets/admission/admin/images/0/2026/05/12/a7391291-a94d-41e5-82ee-83b75f64ef0b.jpg'
const AUTH_PROMPT_INTERVAL = 2500
const AUTH_REFRESH_RETRY_COOLDOWN_MS = 5 * 60 * 1000
const AUTH_STORAGE_KEYS = [
	'token',
	'accessToken',
	'refreshToken',
	'uni_id_token',
	'uni_id_token_expired',
	'userInfo',
	'userId'
]

let lastAuthPromptAt = 0
let authRefreshPromise = null
let lastAuthRefreshFailedAt = 0

function sleep(ms) {
	return new Promise((resolve) => {
		setTimeout(resolve, ms)
	})
}

function getUniStorage(key, fallback) {
	try {
		const value = uni.getStorageSync(key)
		return value === undefined || value === null || value === '' ? fallback : value
	} catch (e) {
		return fallback
	}
}

function setUniStorage(key, value) {
	try {
		uni.setStorageSync(key, value)
	} catch (e) {
		console.warn('[api-switch] set storage failed:', key, e)
	}
}

function removeUniStorage(key) {
	try {
		uni.removeStorageSync(key)
	} catch (e) {
		console.warn('[api-switch] remove storage failed:', key, e)
	}
}

function clearAuthStorage() {
	AUTH_STORAGE_KEYS.forEach(removeUniStorage)
}

function getStoredRefreshToken() {
	return getUniStorage('refreshToken', '')
}

function hasStoredAuthEvidence() {
	if (getUniStorage('token', '')) return true
	if (getUniStorage('accessToken', '')) return true
	if (getUniStorage('uni_id_token', '')) return true
	if (getStoredRefreshToken()) return true
	if (String(getUniStorage('userId', '')).trim()) return true

	const userInfo = getUniStorage('userInfo', {})
	if (isPlainObject(userInfo)) {
		const profileUserId = String(
			userInfo.uid || userInfo.userId || userInfo.user_id || userInfo.id || ''
		).trim()
		if (profileUserId) return true
	}

	return false
}

function persistAuthSession(payload = {}) {
	const token = String(payload.accessToken || payload.token || '').trim()
	const refreshToken = String(payload.refreshToken || '').trim()
	const userInfo = isPlainObject(payload.userInfo) ? payload.userInfo : null
	const userId =
		payload.userId ||
		payload.uid ||
		(userInfo && (userInfo.uid || userInfo.userId || userInfo.id)) ||
		''

	if (token) {
		setUniStorage('token', token)
		setUniStorage('accessToken', token)
	}

	if (refreshToken) {
		setUniStorage('refreshToken', refreshToken)
	}

	if (userId !== '') {
		setUniStorage('userId', userId)
	}

	if (userInfo) {
		setUniStorage('userInfo', userInfo)
	}
}

function authRequiredResponse(message = '请先登录') {
	return {
		code: -1,
		message,
		data: null,
		error: 'AUTH_REQUIRED',
		statusCode: 401
	}
}

function showAuthPrompt(message = '请先登录') {
	const now = Date.now()
	if (now - lastAuthPromptAt < AUTH_PROMPT_INTERVAL) return
	lastAuthPromptAt = now

	try {
		uni.showToast({
			title: message || '请先登录',
			icon: 'none'
		})
	} catch (e) {
		console.warn('[api-switch] show auth prompt failed:', e)
	}
}

function handleAuthFailure(message = '请先登录') {
	const friendlyMessage = toFriendlyAuthMessage(message, '未登录')
	clearAuthStorage()
	showAuthPrompt(friendlyMessage)
	return authRequiredResponse(friendlyMessage)
}

function createAuthFailureResponse(message = '请先登录') {
	const friendlyMessage = toFriendlyAuthMessage(message, '未登录')
	showAuthPrompt(friendlyMessage)
	return authRequiredResponse(friendlyMessage)
}

function normalizeBaseUrl(url) {
	const trimmed = String(url || DEFAULT_API_BASE_URL).trim().replace(/\/+$/, '')
	if (!trimmed) return DEFAULT_API_BASE_URL
	if (/\/api\/v\d+$/.test(trimmed)) return trimmed
	return `${trimmed}/api/v1`
}

export function getApiSource() {
	return API_SOURCE_HTTP
}

export function setApiSource() {
	return API_SOURCE_HTTP
}

export function useHttpApi() {
	return API_SOURCE_HTTP
}

export function toggleApiSource() {
	return API_SOURCE_HTTP
}

export function getApiBaseUrl() {
	const configured = normalizeBaseUrl(getUniStorage(API_BASE_URL_STORAGE_KEY, DEFAULT_API_BASE_URL))
	if (configured === LEGACY_DEVTOOLS_API_BASE_URL) return DEFAULT_API_BASE_URL
	return configured
}

export function setApiBaseUrl(url) {
	const nextUrl = normalizeBaseUrl(url)
	setUniStorage(API_BASE_URL_STORAGE_KEY, nextUrl)
	return nextUrl
}

export function isStrictHttpApi() {
	return true
}

export function setStrictHttpApi() {
	return true
}

function isPlainObject(value) {
	return Object.prototype.toString.call(value) === '[object Object]'
}

function firstArg(args) {
	return args && args.length ? args[0] : {}
}

function objectPayload(args) {
	const payload = firstArg(args)
	return isPlainObject(payload) ? Object.assign({}, payload) : {}
}

function removeInternalFields(payload) {
	const nextPayload = isPlainObject(payload) ? Object.assign({}, payload) : {}
	delete nextPayload._token
	return nextPayload
}

function stripInternalFieldsForQuery(payload) {
	return removeInternalFields(payload)
}

function stripInternalFieldsForBody(payload, keepToken) {
	if (keepToken) {
		return isPlainObject(payload) ? Object.assign({}, payload) : {}
	}
	return removeInternalFields(payload)
}

function tokenFromPayload(payload) {
	if (isPlainObject(payload) && payload._token) return payload._token
	return getUniStorage('token', '') || getUniStorage('accessToken', '') || getUniStorage('uni_id_token', '')
}

function isJwtLikeToken(token) {
	return typeof token === 'string' && token.split('.').length === 3
}

function isHttpAuthTokenCompatible(token) {
	// 这里不能只认 JWT。
	// 当前项目既有 JWT，也有 uniCloud 这类 base64 自定义 token。
	return typeof token === 'string' && token.trim().length > 0
}

async function refreshAuthSession() {
	if (!hasStoredAuthEvidence()) return ''
	if (Date.now() - lastAuthRefreshFailedAt < AUTH_REFRESH_RETRY_COOLDOWN_MS) return ''

	const refreshToken = getStoredRefreshToken()
	if (!refreshToken) return ''

	if (!authRefreshPromise) {
		authRefreshPromise = (async () => {
			try {
				const response = await uni.request({
					url: `${getApiBaseUrl()}/auth/refresh`,
					method: 'POST',
					data: { refreshToken },
					header: {
						'Content-Type': 'application/json'
					}
				})
				const result = normalizeResponse(response)
				const nextAccessToken = String(result?.data?.accessToken || '').trim()

				if (result && result.code === 0 && isJwtLikeToken(nextAccessToken)) {
					lastAuthRefreshFailedAt = 0
					persistAuthSession({
						token: nextAccessToken,
						accessToken: nextAccessToken,
						refreshToken: result.data.refreshToken,
						userInfo: result.data.userInfo
					})
					return nextAccessToken
				}

				lastAuthRefreshFailedAt = Date.now()
			} catch (error) {
				lastAuthRefreshFailedAt = Date.now()
				console.warn('[api-switch] refresh auth failed:', error)
			} finally {
				authRefreshPromise = null
			}

			return ''
		})()
	}

	return authRefreshPromise
}

function appendQuery(url, query) {
	const payload = removeInternalFields(query)
	const pairs = []

	Object.keys(payload).forEach((key) => {
		const value = payload[key]
		if (value === undefined || value === null || value === '') return
		if (Array.isArray(value)) {
			if (!value.length) return
			pairs.push(`${encodeURIComponent(key)}=${encodeURIComponent(value.join(','))}`)
			return
		}
		pairs.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
	})

	if (!pairs.length) return url
	return `${url}${url.indexOf('?') === -1 ? '?' : '&'}${pairs.join('&')}`
}

function idFrom(payload, args, names, fieldName) {
	if (isPlainObject(payload)) {
		for (let i = 0; i < names.length; i += 1) {
			const value = payload[names[i]]
			if (value !== undefined && value !== null && value !== '') return value
		}
	}

	const raw = firstArg(args)
	if (!isPlainObject(raw) && raw !== undefined && raw !== null && raw !== '') return raw

	throw new Error(`${fieldName || names[0]} is required`)
}

function encodedId(payload, args, names, fieldName) {
	return encodeURIComponent(String(idFrom(payload, args, names, fieldName)))
}

function route(method, path, options = {}) {
	return Object.assign({ method, path }, options)
}

function authRoute(method, path, options = {}) {
	return route(method, path, Object.assign({ auth: true }, options))
}

function optionalAuthRoute(method, path, options = {}) {
	return route(method, path, Object.assign({ auth: 'optional' }, options))
}

function buildRequestConfig(definition, args, overrideToken = '') {
	const payload = objectPayload(args)
	const method = String(definition.method || 'GET').toUpperCase()
	const path = typeof definition.path === 'function'
		? definition.path(payload, args)
		: definition.path
	const preserveTokenInBody = definition.auth === true && method !== 'GET'
	const query = definition.query
		? definition.query(payload, args)
		: method === 'GET'
			? stripInternalFieldsForQuery(payload)
			: {}
	const data = definition.body
		? definition.body(payload, args)
		: method === 'GET'
			? undefined
			: stripInternalFieldsForBody(payload, preserveTokenInBody)

	return {
		method,
		path,
		query,
		data,
		token: overrideToken || tokenFromPayload(payload)
	}
}

function normalizeResponse(rawResponse) {
	const response = Array.isArray(rawResponse) ? rawResponse[1] : rawResponse
	const statusCode = response && response.statusCode
	let body = response && response.data

	if (!isPlainObject(body)) {
		let fallbackMessage = statusCode >= 400 ? 'request failed' : 'ok'
		if (statusCode >= 502) {
			fallbackMessage = '服务暂时不可用，请稍后重试'
		} else if (statusCode >= 500) {
			fallbackMessage = '服务开小差了，请稍后重试'
		} else if (statusCode === 404) {
			fallbackMessage = '接口不存在'
		}

		body = {
			code: statusCode >= 400 ? -1 : 0,
			message: fallbackMessage,
			data: body
		}
	}

	if (body.code === undefined) {
		let fallbackMessage = body.message || body.error || (statusCode >= 400 ? 'request failed' : 'ok')
		if ((!body.message && !body.error) && statusCode >= 502) {
			fallbackMessage = '服务暂时不可用，请稍后重试'
		} else if ((!body.message && !body.error) && statusCode >= 500) {
			fallbackMessage = '服务开小差了，请稍后重试'
		}
		body = Object.assign({
			code: statusCode >= 400 ? -1 : 0,
			message: fallbackMessage
		}, body)
	}

	return body
}

function isAuthFailure(result, statusCode) {
	if (statusCode === 401) return true

	const errorText = String(
		(result && (result.error || result.errCode || result.code)) || ''
	)
	const messageText = String(
		(result && (result.message || result.errMsg)) || ''
	)
	const combined = `${errorText} ${messageText}`

	if (/AUTH|TOKEN|ACCESS_TOKEN|REFRESH_TOKEN/i.test(errorText)) return true
	if (/token|登录状态|请先登录|未登录|认证|Authorization|Unauthorized/i.test(combined)) return true
	if (statusCode === 403 && /token|登录|认证|Forbidden/i.test(combined)) return true

	return false
}

function shouldClearAuthStorageOnFailure(definition, statusCode, result) {
	if (!definition || definition.auth !== true) {
		return false
	}

	if (statusCode === 401) {
		return true
	}

	const errorText = String(
		(result && (result.error || result.errCode || result.code)) || ''
	)
	const messageText = String(
		(result && (result.message || result.errMsg)) || ''
	)
	const combined = `${errorText} ${messageText}`

	return /ACCESS_TOKEN|REFRESH_TOKEN|AUTH_REQUIRED|登录状态已失效|重新登录|token.*(expired|invalid|无效|过期)/i.test(combined)
}

function isAuthException(error) {
	if (!error) return false
	const combined = String(error.message || error.errMsg || error.error || error)
	return /token|登录状态|请先登录|未登录|认证|Authorization|Unauthorized|AUTH|TOKEN/i.test(combined)
}

function isLikelyTransientRequestFailure(error) {
	if (!error) return false

	const combined = String(error.message || error.errMsg || error.error || error).trim()
	if (!combined) return false

	return /request:fail|network|timeout|timed out|abort|ERR_/i.test(combined)
}

function shouldRetryHttpRequestFailure(definition, error, runtime = {}) {
	if (!definition || runtime.retriedAfterTransientFailure) {
		return false
	}

	const method = String(definition.method || '').toUpperCase()
	if (method !== 'GET') {
		return false
	}

	if (isAuthException(error)) {
		return false
	}

	return isLikelyTransientRequestFailure(error)
}

function normalizeHttpRequestFailureMessage(error) {
	const rawMessage = String(error && (error.message || error.errMsg || error.error || error) || '').trim()
	if (!rawMessage) return '网络请求失败'

	if (/timeout|timed out/i.test(rawMessage)) {
		return '请求超时，请稍后重试'
	}

	if (/request:fail|network|abort|ERR_/i.test(rawMessage)) {
		return '网络连接不稳定，请稍后重试'
	}

	return rawMessage
}

function shouldAttachToken(definition) {
	return definition && (definition.auth === true || definition.auth === 'optional')
}

async function requestHttp(definition, args, runtime = {}) {
	try {
		let config = buildRequestConfig(definition, args, runtime.overrideToken)
		if (definition.auth === true && !config.token) {
			if (!hasStoredAuthEvidence()) {
				return createAuthFailureResponse('请先登录')
			}
			if (!runtime.retriedAfterRefresh) {
				const refreshedToken = await refreshAuthSession()
				if (refreshedToken) {
					return requestHttp(definition, args, Object.assign({}, runtime, { retriedAfterRefresh: true, overrideToken: refreshedToken }))
				}
			}
			return handleAuthFailure('请先登录')
		}
		if (config.token && shouldAttachToken(definition) && !isHttpAuthTokenCompatible(config.token)) {
			if (!runtime.retriedAfterRefresh) {
				const refreshedToken = await refreshAuthSession()
				if (refreshedToken) {
					return requestHttp(definition, args, Object.assign({}, runtime, { retriedAfterRefresh: true, overrideToken: refreshedToken }))
				}
			}
			return handleAuthFailure('登录状态已失效，请重新登录')
		}

		config = buildRequestConfig(definition, args, runtime.overrideToken)
		const url = appendQuery(`${getApiBaseUrl()}${config.path}`, config.query)
		const header = {
			'Content-Type': 'application/json'
		}

		if (config.token && shouldAttachToken(definition)) {
			header.Authorization = `Bearer ${config.token}`
			header['X-Access-Token'] = config.token
		}

		const response = await uni.request({
			url,
			method: config.method,
			data: config.data,
			header
		})
		const rawResponse = Array.isArray(response) ? response[1] : response
		const statusCode = rawResponse && rawResponse.statusCode
		const result = normalizeResponse(response)
		if (isAuthFailure(result, statusCode)) {
			if (definition.auth === true && !runtime.retriedAfterRefresh) {
				const refreshedToken = await refreshAuthSession()
				if (refreshedToken) {
					return requestHttp(definition, args, Object.assign({}, runtime, { retriedAfterRefresh: true, overrideToken: refreshedToken }))
				}
			}
			const message = result.message || '登录状态已失效，请重新登录'
			const authMessage = statusCode === 401 && !isAuthMessage(message) ? '未登录' : message
			if (shouldClearAuthStorageOnFailure(definition, statusCode, result)) {
				return handleAuthFailure(authMessage)
			}
			return createAuthFailureResponse(authMessage)
		}
		return definition.transform ? definition.transform(result) : result
	} catch (e) {
		if (isAuthException(e)) {
			if (definition.auth === true && !runtime.retriedAfterRefresh) {
				const refreshedToken = await refreshAuthSession()
				if (refreshedToken) {
					return requestHttp(definition, args, Object.assign({}, runtime, { retriedAfterRefresh: true, overrideToken: refreshedToken }))
				}
			}
			return handleAuthFailure(e.message || e.errMsg || '登录状态已失效，请重新登录')
		}

		if (shouldRetryHttpRequestFailure(definition, e, runtime)) {
			await sleep(300)
			return requestHttp(definition, args, Object.assign({}, runtime, {
				retriedAfterTransientFailure: true
			}))
		}

		console.error('[api-switch] HTTP request failed:', e)
		return {
			code: -1,
			message: normalizeHttpRequestFailureMessage(e),
			data: null,
			error: 'HTTP_REQUEST_FAILED'
		}
	}
}

function normalizeAttachment(attachment) {
	if (!isPlainObject(attachment)) return attachment
	const extra = isPlainObject(attachment.extraPayload) ? attachment.extraPayload : {}
	const next = Object.assign({}, extra, attachment)
	next.name = next.name || attachment.fileName || attachment.file_name || '附件'
	next.fileID = next.fileID || attachment.fileUrl || attachment.file_url || ''
	next.type = next.type || attachment.fileType || attachment.file_type || ''
	return next
}

function normalizeArticle(article) {
	if (!isPlainObject(article)) return article
	const next = Object.assign({}, article)
	const category = isPlainObject(article.category) ? article.category : {}

	next.category_id = next.category_id || next.categoryId || category.id || category.legacyId
	next.cover_image =
		next.cover_image ||
		next.coverImageUrl ||
		next.cover_image_url ||
		DEFAULT_STUDY_ARTICLE_COVER_URL
	next.cover_url = next.cover_url || next.coverImageUrl || next.cover_image
	next.coverImageUrl = next.coverImageUrl || next.cover_image
	next.image = next.image || next.cover_image
	next.author_name = next.author_name || next.authorName || ''
	next.price_points = next.price_points !== undefined ? next.price_points : next.pricePoints
	next.publish_time = next.publish_time || next.publishedAt || next.createdAt || ''
	next.content = next.content || next.contentHtml || next.content_html || ''
	next.content_html = next.content_html || next.contentHtml || next.content || ''
	next.view_count = next.view_count !== undefined ? next.view_count : next.viewCount
	next.like_count = next.like_count !== undefined ? next.like_count : next.likeCount
	next.favorite_count = next.favorite_count !== undefined ? next.favorite_count : next.favoriteCount
	next.unlock_count = next.unlock_count !== undefined ? next.unlock_count : next.unlockCount
	next.stats = next.stats || {
		views: Number(next.view_count || 0),
		likes: Number(next.like_count || 0),
		favorites: Number(next.favorite_count || 0),
		unlocks: Number(next.unlock_count || 0)
	}

	if (Array.isArray(article.attachments)) {
		next.attachments = article.attachments.map(normalizeAttachment)
	}

	return next
}

function transformArticleResponse(response) {
	if (!response || !response.data) return response
	const data = response.data

	if (Array.isArray(data.list)) {
		response.data = Object.assign({}, data, {
			list: data.list.map(normalizeArticle)
		})
		return response
	}

	if (Array.isArray(data)) {
		response.data = data.map(normalizeArticle)
		return response
	}

	response.data = normalizeArticle(data)
	return response
}

function normalizeCategory(category) {
	if (!isPlainObject(category)) return category
	const next = Object.assign({}, category)
	next._id = next._id || category.legacyId || category.legacy_id || String(category.id || '')
	next.short_name = next.short_name || category.shortName || ''
	next.bg_color = next.bg_color || category.bgColor || ''
	next.icon_url = next.icon_url || category.iconUrl || ''
	next.has_articles = next.has_articles !== undefined ? next.has_articles : category.hasArticles
	next.has_signup = next.has_signup !== undefined ? next.has_signup : category.hasSignup
	next.price_points = next.price_points !== undefined ? next.price_points : category.pricePoints
	next.signup_price = next.signup_price !== undefined ? next.signup_price : category.priceAmount
	next.sort_order = next.sort_order !== undefined ? next.sort_order : category.sortOrder
	next.filter_tags = next.filter_tags || category.filterTags || []
	return next
}

function transformCategoryListResponse(response) {
	if (!response || !response.data) return response
	if (Array.isArray(response.data.list)) {
		response.data = response.data.list.map(normalizeCategory)
		return response
	}
	if (Array.isArray(response.data)) {
		response.data = response.data.map(normalizeCategory)
		return response
	}
	return response
}

function transformSignupResponse(response) {
	const data = response && response.data
	if (isPlainObject(data) && isPlainObject(data.signup)) {
		response.data = Object.assign({}, data, {
			signup_id: data.signup.id || data.signup.signup_id,
			signupId: data.signup.id || data.signup.signupId
		})
	}
	return response
}

function transformCoinStatsResponse(response) {
	const data = response && response.data
	if (isPlainObject(data)) {
		response.data = Object.assign({}, data, {
			current_balance: data.current_balance !== undefined ? data.current_balance : data.currentBalance,
			today_income: data.today_income !== undefined ? data.today_income : data.todayIncome,
			total_income: data.total_income !== undefined ? data.total_income : data.totalIncome
		})
	}
	return response
}

function toTimestamp(value) {
	if (value === undefined || value === null || value === '') return 0
	if (typeof value === 'number') return value
	const parsedNumber = Number(value)
	if (Number.isFinite(parsedNumber) && parsedNumber > 0) return parsedNumber
	const parsedDate = new Date(value).getTime()
	return Number.isFinite(parsedDate) ? parsedDate : 0
}

function normalizeForumImage(image) {
	if (typeof image === 'string') return image
	if (!isPlainObject(image)) return ''
	return image.public_url || image.publicUrl || image.url || image.fileID || image.fileId || ''
}

function normalizeForumPost(post) {
	if (!isPlainObject(post)) return post
	const next = Object.assign({}, post)
	if (Array.isArray(post.images)) {
		next.images = post.images.map(normalizeForumImage).filter(Boolean)
	}
	next.create_date = next.create_date || toTimestamp(post.created_at || post.createdAt)
	next.update_date = next.update_date || toTimestamp(post.updated_at || post.updatedAt)
	return next
}

function normalizeForumComment(comment) {
	if (!isPlainObject(comment)) return comment
	const next = Object.assign({}, comment)
	next.create_date = next.create_date || toTimestamp(comment.created_at || comment.createdAt)
	return next
}

function transformForumPostResponse(response) {
	const data = response && response.data
	if (!data) return response

	if (Array.isArray(data.list)) {
		response.data = Object.assign({}, data, {
			list: data.list.map(normalizeForumPost)
		})
		return response
	}

	if (Array.isArray(data)) {
		response.data = data.map(normalizeForumPost)
		return response
	}

	response.data = normalizeForumPost(data)
	return response
}

function transformForumCommentResponse(response) {
	const data = response && response.data
	if (!data) return response

	if (Array.isArray(data.list)) {
		response.data = Object.assign({}, data, {
			list: data.list.map(normalizeForumComment)
		})
		return response
	}

	if (Array.isArray(data)) {
		response.data = data.map(normalizeForumComment)
		return response
	}

	response.data = normalizeForumComment(data)
	return response
}

const SERVICE_ROUTES = {
	'user-center': {
		loginByWeixin: route('POST', '/auth/wechat-login'),
		getUserInfo: authRoute('GET', '/users/me'),
		updateProfile: authRoute('PATCH', '/users/me'),
		getMyStats: authRoute('GET', '/users/me/stats'),
		bindInviter: authRoute('POST', '/users/me/inviter'),
		recordTeamInviteView: authRoute('POST', '/users/me/invite-views/team'),
		recordBusinessInviteView: authRoute('POST', '/users/me/invite-views/business'),
		getPaymentQrcode: authRoute('GET', '/users/me/payment-qrcode'),
		updatePaymentQrcode: authRoute('PUT', '/users/me/payment-qrcode')
	},

	'article-service': {
		getHotArticles: optionalAuthRoute('GET', '/catalog/articles/hot', { transform: transformArticleResponse }),
		getArticleDetail: optionalAuthRoute('GET', (payload, args) => `/catalog/articles/${encodedId(payload, args, ['articleId', 'article_id', 'id'], 'articleId')}`, {
			query: () => ({}),
			transform: transformArticleResponse
		}),
		getList: optionalAuthRoute('GET', '/catalog/articles', { transform: transformArticleResponse }),
		unlockArticle: authRoute('POST', (payload, args) => `/catalog/articles/${encodedId(payload, args, ['articleId', 'article_id', 'id'], 'articleId')}/unlock`),
		batchUpdatePrices: authRoute('POST', '/catalog/admin/articles/default-price')
	},

	'business-service': {
		getCategoryList: route('GET', '/catalog/categories', { transform: transformCategoryListResponse }),
		getLearningNotices: route('GET', '/catalog/learning/notices'),
		generateBusinessInviteQrcode: authRoute('GET', (payload, args) => `/catalog/business/${encodedId(payload, args, ['businessId', 'business_id', 'id'], 'businessId')}/invite-qrcode`, {
			query: () => ({})
		}),
		resolveInviteCode: route('GET', (payload, args) => `/catalog/invite-codes/${encodedId(payload, args, ['inviteCode', 'code', 'id'], 'inviteCode')}`, {
			query: () => ({})
		}),
		submitSignup: authRoute('POST', '/signups', { transform: transformSignupResponse }),
		getSignupDetail: authRoute('GET', (payload, args) => `/signups/${encodedId(payload, args, ['signupId', 'signup_id', 'id'], 'signupId')}`, {
			query: () => ({})
		}),
		initMissingCategories: authRoute('POST', '/catalog/admin/signup-categories/init'),
		batchUpdatePrices: authRoute('POST', '/catalog/admin/signup-categories/price')
	},

	'import-articles': {
		importData: authRoute('POST', '/catalog/admin/articles/import'),
		clearDatabase: authRoute('POST', '/catalog/admin/articles/clear')
	},

	'team-service': {
		getTeamList: route('GET', '/team'),
		getTeamDetail: route('GET', (payload, args) => `/team/${encodedId(payload, args, ['teamId', 'team_id', 'id'], 'teamId')}`, {
			query: () => ({})
		}),
		getTeamMembers: route('GET', (payload, args) => `/team/${encodedId(payload, args, ['teamId', 'team_id'], 'teamId')}/members`),
		applyJoinTeam: authRoute('POST', (payload, args) => `/team/${encodedId(payload, args, ['teamId', 'team_id'], 'teamId')}/join`),
		getMyTeam: authRoute('GET', '/team/mine'),
		getInviteStats: authRoute('GET', '/team/invite-stats'),
		getTeamInfoByInviter: route('GET', (payload, args) => `/team/inviter/${encodedId(payload, args, ['inviterId', 'inviter_id'], 'inviterId')}`, {
			query: () => ({})
		}),
		generateInviteQrcode: authRoute('GET', '/team/invite-scene')
	},

	'dashboard-service': {
		getStatsCard: optionalAuthRoute('GET', '/ops/stats-card'),
		getTeamDynamics: authRoute('GET', '/ops/team-dynamics'),
		getBanners: route('GET', '/ops/banners'),
		getAdminBanners: authRoute('GET', '/ops/admin/banners'),
		createBanner: authRoute('POST', '/ops/admin/banners'),
		updateBannerStatus: authRoute('PATCH', (payload, args) => `/ops/admin/banners/${encodedId(payload, args, ['bannerId', 'banner_id', 'id'], 'bannerId')}/status`),
		deleteBanner: authRoute('DELETE', (payload, args) => `/ops/admin/banners/${encodedId(payload, args, ['bannerId', 'banner_id', 'id'], 'bannerId')}`, {
			query: () => ({})
		})
	},

		'forum-service': {
			getSchoolList: optionalAuthRoute('GET', '/forum/schools'),
			addSchool: authRoute('POST', '/forum/schools'),
			deleteSchool: authRoute('DELETE', (payload, args) => `/forum/schools/${encodedId(payload, args, ['school', 'schoolName'], 'school')}`, {
				query: () => ({})
			}),
			getPostList: optionalAuthRoute('GET', '/forum/posts', { transform: transformForumPostResponse }),
			getPostDetail: optionalAuthRoute('GET', (payload, args) => `/forum/posts/${encodedId(payload, args, ['postId', 'post_id', 'id'], 'postId')}`, {
				query: () => ({}),
				transform: transformForumPostResponse
			}),
			createPost: authRoute('POST', '/forum/posts'),
			createUploadPresign: authRoute('POST', '/forum/uploads/presign'),
			deletePost: authRoute('DELETE', (payload, args) => `/forum/posts/${encodedId(payload, args, ['postId', 'post_id', 'id'], 'postId')}`, {
				query: () => ({})
			}),
			toggleLike: authRoute('POST', (payload, args) => `/forum/posts/${encodedId(payload, args, ['postId', 'post_id', 'id'], 'postId')}/like`),
			getCommentList: route('GET', (payload, args) => `/forum/posts/${encodedId(payload, args, ['postId', 'post_id'], 'postId')}/comments`, { transform: transformForumCommentResponse }),
			createComment: authRoute('POST', (payload, args) => `/forum/posts/${encodedId(payload, args, ['postId', 'post_id'], 'postId')}/comments`, { transform: transformForumCommentResponse })
		},

	'goal-service': {
		getMonthGoals: authRoute('GET', '/growth/goals'),
		saveGoals: authRoute('PUT', '/growth/goals')
	},

	'checkin-service': {
		checkIn: authRoute('POST', '/growth/check-in'),
		getCheckInStatus: authRoute('GET', '/growth/check-in/status'),
		getCheckInStats: authRoute('GET', '/growth/check-in/stats')
	},

	'growth-log-service': {
		addLog: authRoute('POST', '/growth/logs'),
		getLogList: authRoute('GET', '/growth/logs')
	},

	'coin-service': {
		getCoinStats: authRoute('GET', '/finance/coins/stats', { transform: transformCoinStatsResponse }),
		getAnnualCoinStats: authRoute('GET', '/finance/coins/annual-stats'),
		getCoinLogs: authRoute('GET', '/finance/coins/logs'),
		applyWithdrawCoins: authRoute('POST', '/finance/coins/withdrawals'),
		applyExchangeCoinsToPoints: authRoute('POST', '/finance/coins/exchange')
	},

	'withdrawal-service': {
		getWithdrawalList: authRoute('GET', '/finance/coins/withdrawals'),
		updateWithdrawalStatus: authRoute('POST', (payload, args) => `/finance/coins/withdrawals/${encodedId(payload, args, ['withdrawal_id', 'withdrawalId', 'id'], 'withdrawal_id')}/process`)
	},

	'storage-service': {
		createUploadPresign: authRoute('POST', '/storage/uploads/presign')
	}
}

const HTTP_SERVICE_CACHE = Object.create(null)

function createHttpService(serviceName) {
	const serviceRoutes = SERVICE_ROUTES[serviceName] || {}

	const target = {}
	Object.keys(serviceRoutes).forEach((methodName) => {
		target[methodName] = function () {
			const args = Array.prototype.slice.call(arguments)
			const definition = serviceRoutes[methodName]
			return requestHttp(definition, args)
		}
	})

	return target
}

export function getHttpService(serviceName) {
	const normalizedName = String(serviceName || '').trim()
	if (!normalizedName) {
		throw new Error('serviceName is required')
	}

	if (!HTTP_SERVICE_CACHE[normalizedName]) {
		HTTP_SERVICE_CACHE[normalizedName] = createHttpService(normalizedName)
	}

	return HTTP_SERVICE_CACHE[normalizedName]
}

export const apiSwitch = {
	API_SOURCE_HTTP,
	getApiSource,
	setApiSource,
	toggleApiSource,
	useHttp: useHttpApi,
	getApiBaseUrl,
	setApiBaseUrl,
	isStrictHttp: isStrictHttpApi,
	setStrictHttp: setStrictHttpApi
}

export function installApiSwitch() {
	if (typeof uni !== 'undefined') {
		uni.$apiSwitch = apiSwitch
	}

	console.log(`[api-switch] installed, source=${API_SOURCE_HTTP}, baseUrl=${getApiBaseUrl()}`)
	return apiSwitch
}
