const API_SOURCE_HTTP = 'http'
const API_SOURCE_UNICLOUD = 'unicloud'

const API_SOURCE_STORAGE_KEY = 'xuechuang_api_source'
const API_BASE_URL_STORAGE_KEY = 'xuechuang_api_base_url'
const API_STRICT_STORAGE_KEY = 'xuechuang_api_strict_http'

const DEFAULT_API_SOURCE = API_SOURCE_HTTP
const DEFAULT_API_BASE_URL = 'https://xuechuang.xyz/api/v1'
const LEGACY_DEVTOOLS_API_BASE_URL = 'http://127.0.0.1:3001/api/v1'
const AUTH_PROMPT_INTERVAL = 2500
const AUTH_STORAGE_KEYS = [
	'token',
	'accessToken',
	'refreshToken',
	'userInfo',
	'userId',
	'uni_id_token',
	'uni_id_token_expired'
]

let lastAuthPromptAt = 0

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
	clearAuthStorage()
	showAuthPrompt(message)
	return authRequiredResponse(message)
}

function normalizeBaseUrl(url) {
	const trimmed = String(url || DEFAULT_API_BASE_URL).trim().replace(/\/+$/, '')
	if (!trimmed) return DEFAULT_API_BASE_URL
	if (/\/api\/v\d+$/.test(trimmed)) return trimmed
	return `${trimmed}/api/v1`
}

export function getApiSource() {
	const source = getUniStorage(API_SOURCE_STORAGE_KEY, DEFAULT_API_SOURCE)
	return source === API_SOURCE_UNICLOUD ? API_SOURCE_UNICLOUD : API_SOURCE_HTTP
}

export function setApiSource(source) {
	const nextSource = source === API_SOURCE_UNICLOUD ? API_SOURCE_UNICLOUD : API_SOURCE_HTTP
	setUniStorage(API_SOURCE_STORAGE_KEY, nextSource)
	console.log(`[api-switch] source => ${nextSource}`)
	return nextSource
}

export function useHttpApi() {
	return setApiSource(API_SOURCE_HTTP)
}

export function useUniCloudApi() {
	return setApiSource(API_SOURCE_UNICLOUD)
}

export function toggleApiSource() {
	return setApiSource(getApiSource() === API_SOURCE_HTTP ? API_SOURCE_UNICLOUD : API_SOURCE_HTTP)
}

export function getApiBaseUrl() {
	const configured = normalizeBaseUrl(getUniStorage(API_BASE_URL_STORAGE_KEY, DEFAULT_API_BASE_URL))
	if (configured === LEGACY_DEVTOOLS_API_BASE_URL) return DEFAULT_API_BASE_URL
	return configured
}

export function setApiBaseUrl(url) {
	const nextUrl = normalizeBaseUrl(url)
	setUniStorage(API_BASE_URL_STORAGE_KEY, nextUrl)
	console.log(`[api-switch] baseUrl => ${nextUrl}`)
	return nextUrl
}

export function isStrictHttpApi() {
	const value = getUniStorage(API_STRICT_STORAGE_KEY, false)
	return value === true || value === 'true'
}

export function setStrictHttpApi(strict) {
	const nextValue = strict === true
	setUniStorage(API_STRICT_STORAGE_KEY, nextValue)
	console.log(`[api-switch] strictHttp => ${nextValue}`)
	return nextValue
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
	delete nextPayload.uniIdToken
	delete nextPayload.uni_id_token
	return nextPayload
}

function tokenFromPayload(payload) {
	if (isPlainObject(payload) && payload._token) return payload._token
	return (
		getUniStorage('token', '') ||
		getUniStorage('accessToken', '') ||
		getUniStorage('uni_id_token', '')
	)
}

function isJwtLikeToken(token) {
	return typeof token === 'string' && token.split('.').length === 3
}

function isHttpAuthTokenCompatible(token) {
	if (!token || getApiSource() !== API_SOURCE_HTTP) return true
	return isJwtLikeToken(token)
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

function buildRequestConfig(definition, args) {
	const payload = objectPayload(args)
	const method = String(definition.method || 'GET').toUpperCase()
	const path = typeof definition.path === 'function'
		? definition.path(payload, args)
		: definition.path
	const query = definition.query
		? definition.query(payload, args)
		: method === 'GET'
			? payload
			: {}
	const data = definition.body
		? definition.body(payload, args)
		: method === 'GET'
			? undefined
			: removeInternalFields(payload)

	return {
		method,
		path,
		query,
		data,
		token: tokenFromPayload(payload)
	}
}

function normalizeResponse(rawResponse) {
	const response = Array.isArray(rawResponse) ? rawResponse[1] : rawResponse
	const statusCode = response && response.statusCode
	let body = response && response.data

	if (!isPlainObject(body)) {
		body = {
			code: statusCode >= 400 ? -1 : 0,
			message: statusCode >= 400 ? 'request failed' : 'ok',
			data: body
		}
	}

	if (body.code === undefined) {
		const fallbackMessage = body.message || body.error || (statusCode >= 400 ? 'request failed' : 'ok')
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

function isAuthException(error) {
	if (!error) return false
	const combined = String(error.message || error.errMsg || error.error || error)
	return /token|登录状态|请先登录|未登录|认证|Authorization|Unauthorized|AUTH|TOKEN/i.test(combined)
}

function shouldAttachToken(definition) {
	return definition && (definition.auth === true || definition.auth === 'optional')
}

async function requestHttp(definition, args) {
	try {
		const config = buildRequestConfig(definition, args)
		if (definition.auth === true && !config.token) {
			return handleAuthFailure('请先登录')
		}
		if (config.token && shouldAttachToken(definition) && !isHttpAuthTokenCompatible(config.token)) {
			return handleAuthFailure('登录状态已失效，请重新登录')
		}

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
			return handleAuthFailure(result.message || '登录状态已失效，请重新登录')
		}
		return definition.transform ? definition.transform(result) : result
	} catch (e) {
		if (isAuthException(e)) {
			return handleAuthFailure(e.message || e.errMsg || '登录状态已失效，请重新登录')
		}

		console.error('[api-switch] HTTP request failed:', e)
		return {
			code: -1,
			message: e.message || e.errMsg || '网络请求失败',
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
	next.cover_image = next.cover_image || next.coverImageUrl || next.cover_image_url || ''
	next.cover_url = next.cover_url || next.coverImageUrl || next.cover_image
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

function transformCategoryResponse(response) {
	if (response && response.data) response.data = normalizeCategory(response.data)
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

function transformOrderResponse(response) {
	const data = response && response.data
	if (isPlainObject(data) && isPlainObject(data.order)) {
		response.data = Object.assign({}, data, {
			order_no: data.order.orderNo || data.order.order_no,
			orderNo: data.order.orderNo || data.order.order_no,
			pay_params: data.payParams || data.pay_params || null
		})
	}
	return response
}

function transformPointsStatsResponse(response) {
	const data = response && response.data
	if (isPlainObject(data)) {
		response.data = Object.assign({}, data, {
			total_points: data.total_points !== undefined ? data.total_points : data.totalPoints,
			today_added: data.today_added !== undefined ? data.today_added : data.todayAdded,
			total_added: data.total_added !== undefined ? data.total_added : data.totalAdded
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

function transformWalletResponse(response) {
	const data = response && response.data
	if (isPlainObject(data)) {
		response.data = Object.assign({}, data, {
			balance: data.balance !== undefined ? data.balance : data.cashBalance,
			frozen_balance: data.frozen_balance !== undefined ? data.frozen_balance : data.cashFrozenBalance,
			total_income: data.total_income !== undefined ? data.total_income : data.cashTotalIncome,
			total_withdraw: data.total_withdraw !== undefined ? data.total_withdraw : data.cashTotalWithdraw,
			coins: data.coins !== undefined ? data.coins : data.coinBalance,
			coin_total_income: data.coin_total_income !== undefined ? data.coin_total_income : data.coinTotalIncome,
			payment_qrcode: data.payment_qrcode || data.paymentQrcodeUrl || ''
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

function currentStorageUserId() {
	const userId = getUniStorage('userId', '')
	return userId === undefined || userId === null ? '' : String(userId)
}

function isOtherUserPayload(payload) {
	const targetUserId = payload.user_id || payload.userId
	const currentUserId = currentStorageUserId()
	return !!targetUserId && !!currentUserId && String(targetUserId) !== currentUserId
}

function bodyForPointsRecharge(payload) {
	return {
		delta: Number(payload.points || 0),
		reason: 'points_recharge',
		source: 'payment',
		refId: payload.orderNo || payload.order_no || '',
		remark: `积分充值 ${payload.points || 0}`
	}
}

const SERVICE_ROUTES = {
	'user-center': {
		loginByWeixin: route('POST', '/auth/wechat-login'),
		getUserInfo: authRoute('GET', '/users/me'),
		updateProfile: authRoute('PATCH', '/users/me'),
		getWalletInfo: authRoute('GET', '/users/me/wallet', { transform: transformWalletResponse }),
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
		getDetail: optionalAuthRoute('GET', (payload, args) => `/catalog/articles/${encodedId(payload, args, ['id', 'articleId', 'article_id'], 'id')}`, {
			query: () => ({}),
			transform: transformArticleResponse
		}),
		likeArticle: authRoute('POST', (payload, args) => `/catalog/articles/${encodedId(payload, args, ['articleId', 'article_id', 'id'], 'articleId')}/like`),
		like: authRoute('POST', (payload, args) => `/catalog/articles/${encodedId(payload, args, ['id', 'articleId', 'article_id'], 'id')}/like`),
		collect: authRoute('POST', (payload, args) => `/catalog/articles/${encodedId(payload, args, ['id', 'articleId', 'article_id'], 'id')}/favorite`),
		unlockArticle: authRoute('POST', (payload, args) => `/catalog/articles/${encodedId(payload, args, ['articleId', 'article_id', 'id'], 'articleId')}/unlock`)
	},

	'business-service': {
		getCategoryList: route('GET', '/catalog/categories', { transform: transformCategoryListResponse }),
		getCategoryDetail: route('GET', (payload, args) => `/catalog/categories/${encodedId(payload, args, ['categoryId', 'category_id', 'id'], 'categoryId')}`, {
			query: () => ({}),
			transform: transformCategoryResponse
		}),
		getHotCategories: route('GET', '/catalog/categories/hot', { transform: transformCategoryListResponse }),
		getCategoryStats: route('GET', (payload, args) => `/catalog/categories/${encodedId(payload, args, ['categoryId', 'category_id', 'id'], 'categoryId')}/stats`, {
			query: () => ({})
		}),
		submitSignup: authRoute('POST', '/signups', { transform: transformSignupResponse }),
		getSignupDetail: authRoute('GET', (payload, args) => `/signups/${encodedId(payload, args, ['signupId', 'signup_id', 'id'], 'signupId')}`, {
			query: () => ({})
		})
	},

	'payment-service': {
		createOrder: authRoute('POST', '/orders', { transform: transformOrderResponse }),
		queryOrder: authRoute('GET', (payload, args) => `/orders/${encodedId(payload, args, ['orderNo', 'order_no'], 'orderNo')}`, {
			query: () => ({}),
			transform: transformOrderResponse
		}),
		confirmPayment: authRoute('POST', '/payments/confirm'),
		getWithdrawRecords: authRoute('GET', '/finance/withdrawals'),
		withdraw: authRoute('POST', '/finance/withdrawals')
	},

	'team-service': {
		createTeam: authRoute('POST', '/team'),
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
		getDashboardData: optionalAuthRoute('GET', '/ops/dashboard'),
		getStatsCard: optionalAuthRoute('GET', '/ops/stats-card'),
		getTeamDynamics: authRoute('GET', '/ops/team-dynamics'),
		getRecentCheckIns: route('GET', '/ops/recent-check-ins'),
		getRecentRecruits: authRoute('GET', '/ops/recent-recruits'),
		getNewPartners: authRoute('GET', '/users/me/partner/new'),
		getTodoList: authRoute('GET', '/ops/todos'),
		getBanners: route('GET', '/ops/banners'),
		updateBanner: authRoute('PUT', '/ops/banners/home')
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
		getMonthGoals: authRoute('GET', '/growth/goals', { fallbackWhen: isOtherUserPayload }),
		saveGoals: authRoute('PUT', '/growth/goals')
	},

	'checkin-service': {
		checkIn: authRoute('POST', '/growth/check-in'),
		getCheckInStatus: authRoute('GET', '/growth/check-in/status', { fallbackWhen: isOtherUserPayload }),
		getCheckInHistory: authRoute('GET', '/growth/check-in/history'),
		getCheckInStats: authRoute('GET', '/growth/check-in/stats')
	},

	'task-service': {
		getTaskList: authRoute('GET', '/growth/tasks'),
		getTaskDetail: authRoute('GET', (payload, args) => `/growth/tasks/${encodedId(payload, args, ['taskId', 'task_id', 'id'], 'taskId')}`, {
			query: () => ({})
		}),
		createTask: authRoute('POST', '/growth/tasks'),
		updateTask: authRoute('PATCH', (payload, args) => `/growth/tasks/${encodedId(payload, args, ['taskId', 'task_id', 'id'], 'taskId')}`),
		completeTask: authRoute('POST', (payload, args) => `/growth/tasks/${encodedId(payload, args, ['taskId', 'task_id', 'id'], 'taskId')}/complete`),
		deleteTask: authRoute('DELETE', (payload, args) => `/growth/tasks/${encodedId(payload, args, ['taskId', 'task_id', 'id'], 'taskId')}`, {
			query: () => ({})
		}),
		getTaskStats: authRoute('GET', '/growth/tasks/stats')
	},

	'growth-log-service': {
		createLog: authRoute('POST', '/growth/logs'),
		getLogList: authRoute('GET', '/growth/logs'),
		getLogDetail: authRoute('GET', (payload, args) => `/growth/logs/${encodedId(payload, args, ['log_id', 'logId', 'id'], 'log_id')}`, {
			query: () => ({})
		}),
		updateLog: authRoute('PATCH', (payload, args) => `/growth/logs/${encodedId(payload, args, ['log_id', 'logId', 'id'], 'log_id')}`),
		deleteLog: authRoute('DELETE', (payload, args) => `/growth/logs/${encodedId(payload, args, ['log_id', 'logId', 'id'], 'log_id')}`, {
			query: () => ({})
		})
	},

	'points-service': {
		changePoints: authRoute('POST', '/finance/points/change'),
		getUserPoints: authRoute('GET', '/finance/points', { transform: transformPointsStatsResponse }),
		getUserBadgeData: authRoute('GET', '/finance/points/stats', { transform: transformPointsStatsResponse }),
		getPointsStats: authRoute('GET', '/finance/points/stats', { transform: transformPointsStatsResponse }),
		rechargePoints: authRoute('POST', '/finance/points/change', { body: bodyForPointsRecharge, transform: transformPointsStatsResponse })
	},

	'coin-service': {
		getCoinBalance: authRoute('GET', '/finance/wallet', { transform: transformWalletResponse }),
		getCoinStats: authRoute('GET', '/finance/coins/stats', { transform: transformCoinStatsResponse }),
		getCoinLogs: authRoute('GET', '/finance/coins/logs'),
		applyWithdrawCoins: authRoute('POST', '/finance/coins/withdrawals'),
		applyExchangeCoinsToPoints: authRoute('POST', '/finance/coins/exchange'),
		getExchangeRequests: authRoute('GET', '/finance/coins/exchanges'),
		cancelExchangeRequest: authRoute('POST', (payload, args) => `/finance/coins/exchanges/${encodedId(payload, args, ['requestId', 'request_id', 'id'], 'requestId')}/cancel`)
	},

	'wallet-service': {
		getBalance: authRoute('GET', '/finance/wallet', { transform: transformWalletResponse }),
		applyWithdraw: authRoute('POST', '/finance/withdrawals'),
		getWithdrawList: authRoute('GET', '/finance/withdrawals')
	},

	'withdrawal-service': {
		getWithdrawalList: authRoute('GET', '/finance/coins/withdrawals'),
		updateWithdrawalStatus: authRoute('POST', (payload, args) => `/finance/coins/withdrawals/${encodedId(payload, args, ['withdrawal_id', 'withdrawalId', 'id'], 'withdrawal_id')}/process`)
	},

	'partner-service': {
		becomePartner: authRoute('POST', '/users/me/partner'),
		invitePartner: authRoute('POST', '/users/me/partner/invite-code'),
		getMyTeam: authRoute('GET', '/users/me/partner/team'),
		getTeamStats: authRoute('GET', '/users/me/partner/stats'),
		getNewPartners: authRoute('GET', '/users/me/partner/new'),
		getTeamDynamics: authRoute('GET', '/ops/team-dynamics')
	},

	'admin-service': {
		getSystemStats: authRoute('GET', '/ops/admin/stats')
	}
}

function makeMissingMappingResponse(serviceName, methodName) {
	return Promise.resolve({
		code: -1,
		message: `HTTP API mapping missing: ${serviceName}.${methodName}`,
		data: null,
		error: 'HTTP_API_MAPPING_MISSING'
	})
}

function legacyMethodLikelyRequiresAuth(serviceName, methodName) {
	if (serviceName === 'user-center') return methodName !== 'loginByWeixin'
	return [
		'points-service',
		'coin-service',
		'wallet-service',
		'withdrawal-service',
		'goal-service',
		'checkin-service',
		'task-service',
		'growth-log-service',
		'partner-service',
		'admin-service',
		'payment-service'
	].indexOf(serviceName) !== -1
}

function methodMustUseHttp(serviceName, methodName) {
	return serviceName === 'user-center' && methodName === 'loginByWeixin'
}

function wrapLegacyResult(result, definition) {
	const handleResult = (payload) => {
		if (definition && definition.auth === true && isAuthFailure(payload)) {
			if (getApiSource() === API_SOURCE_HTTP && isJwtLikeToken(definition.token)) {
				return {
					code: -1,
					message: '该功能暂未接入 HTTP API',
					data: null,
					error: 'HTTP_API_MAPPING_MISSING'
				}
			}
			return handleAuthFailure(payload.message || payload.errMsg || '登录状态已失效，请重新登录')
		}
		return payload
	}

	const handleError = (error) => {
		if (definition && definition.auth === true && isAuthException(error)) {
			if (getApiSource() === API_SOURCE_HTTP && isJwtLikeToken(definition.token)) {
				return {
					code: -1,
					message: '该功能暂未接入 HTTP API',
					data: null,
					error: 'HTTP_API_MAPPING_MISSING'
				}
			}
			return handleAuthFailure(error.message || error.errMsg || '登录状态已失效，请重新登录')
		}
		throw error
	}

	if (result && typeof result.then === 'function') {
		return result.then(handleResult, handleError)
	}
	return handleResult(result)
}

function createSwitchableService(serviceName, options, originalImportObject) {
	const serviceRoutes = SERVICE_ROUTES[serviceName] || {}
	let legacyService = null

	function getLegacyService() {
		if (!originalImportObject) return null
		if (!legacyService) legacyService = originalImportObject(serviceName, options)
		return legacyService
	}

	function callLegacy(methodName, args, definition) {
		const service = getLegacyService()
		if (!service || typeof service[methodName] !== 'function') {
			return makeMissingMappingResponse(serviceName, methodName)
		}
		const payload = objectPayload(args)
		const legacyDefinition = definition
			? Object.assign({}, definition, { token: tokenFromPayload(payload) })
			: definition

		try {
			return wrapLegacyResult(service[methodName].apply(service, args), legacyDefinition)
		} catch (error) {
			return wrapLegacyResult(Promise.reject(error), legacyDefinition)
		}
	}

	const target = {}
	Object.keys(serviceRoutes).forEach((methodName) => {
		target[methodName] = function () {
			const args = Array.prototype.slice.call(arguments)
			const definition = serviceRoutes[methodName]
			const payload = objectPayload(args)
			const token = tokenFromPayload(payload)

			if (definition.auth === true && !token) {
				return Promise.resolve(handleAuthFailure('请先登录'))
			}
			if (definition.auth === true && !isHttpAuthTokenCompatible(token)) {
				return Promise.resolve(handleAuthFailure('登录状态已失效，请重新登录'))
			}
			if (definition.auth === 'optional' && token && !isHttpAuthTokenCompatible(token)) {
				return Promise.resolve(handleAuthFailure('登录状态已失效，请重新登录'))
			}

				if (!methodMustUseHttp(serviceName, methodName) && getApiSource() === API_SOURCE_UNICLOUD) {
					return callLegacy(methodName, args, definition)
				}

				if (definition.fallbackWhen && definition.fallbackWhen(payload) && !isStrictHttpApi()) {
					return callLegacy(methodName, args, definition)
				}

				return requestHttp(definition, args)
			}
		})

	if (typeof Proxy !== 'function') return target

	return new Proxy(target, {
		get(obj, prop) {
			if (prop in obj) return obj[prop]
			if (prop === 'then') return undefined
			if (prop === '__isApiSwitchService') return true
			if (typeof prop !== 'string') return obj[prop]

			return function () {
				const args = Array.prototype.slice.call(arguments)
				const definition = {
					auth: legacyMethodLikelyRequiresAuth(serviceName, prop)
				}
				const payload = objectPayload(args)

				if (definition.auth === true && !tokenFromPayload(payload)) {
					return Promise.resolve(handleAuthFailure('请先登录'))
				}
				if (definition.auth === true && !isHttpAuthTokenCompatible(tokenFromPayload(payload))) {
					return Promise.resolve(handleAuthFailure('登录状态已失效，请重新登录'))
				}

				if (getApiSource() === API_SOURCE_UNICLOUD || !isStrictHttpApi()) {
					return callLegacy(prop, args, definition)
				}
				return makeMissingMappingResponse(serviceName, prop)
			}
		}
	})
}

function getHttpCurrentUserInfo() {
	const userInfo = getUniStorage('userInfo', {}) || {}
	const userId = getUniStorage('userId', userInfo.uid || userInfo.userId || userInfo.id || '')
	const token = getUniStorage('token', '')

	return Object.assign({}, userInfo, {
		uid: userInfo.uid || userId,
		userId: userInfo.userId || userInfo.id || userId,
		token,
		inviter_uid: userInfo.inviter_uid || userInfo.inviterUserId || ''
	})
}

export const apiSwitch = {
	API_SOURCE_HTTP,
	API_SOURCE_UNICLOUD,
	getApiSource,
	setApiSource,
	toggleApiSource,
	useHttp: useHttpApi,
	useUniCloud: useUniCloudApi,
	getApiBaseUrl,
	setApiBaseUrl,
	isStrictHttp: isStrictHttpApi,
	setStrictHttp: setStrictHttpApi
}

export function installApiSwitch() {
	if (typeof uni === 'undefined' || typeof uniCloud === 'undefined') return apiSwitch
	if (uniCloud.__xuechuangApiSwitchInstalled) return apiSwitch

	const originalImportObject = uniCloud.__xuechuangOriginalImportObject ||
		(typeof uniCloud.importObject === 'function' ? uniCloud.importObject.bind(uniCloud) : null)
	const originalGetCurrentUserInfo = uniCloud.__xuechuangOriginalGetCurrentUserInfo ||
		(typeof uniCloud.getCurrentUserInfo === 'function' ? uniCloud.getCurrentUserInfo.bind(uniCloud) : null)

	uniCloud.__xuechuangOriginalImportObject = originalImportObject
	uniCloud.__xuechuangOriginalGetCurrentUserInfo = originalGetCurrentUserInfo

	uniCloud.importObject = function (serviceName, options) {
		return createSwitchableService(serviceName, options, originalImportObject)
	}

	uniCloud.getCurrentUserInfo = function () {
		if (getApiSource() === API_SOURCE_HTTP) return getHttpCurrentUserInfo()
		return originalGetCurrentUserInfo ? originalGetCurrentUserInfo() : getHttpCurrentUserInfo()
	}

	uniCloud.__xuechuangApiSwitchInstalled = true
	uni.$apiSwitch = apiSwitch

	console.log(`[api-switch] installed, source=${getApiSource()}, baseUrl=${getApiBaseUrl()}`)
	return apiSwitch
}
