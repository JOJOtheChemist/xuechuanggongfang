import { getApiBaseUrl } from '@/utils/api-switch.js'
import { getCurrentUserToken } from '@/utils/http-services.js'

export const DEFAULT_AGENT_ID = 'yunnan-gaokao-volunteer-consultant'
export const DAILY_NOTICE_KEY_PREFIX = 'ai_chat_daily_notice_'
export const CHAT_PATH = '/subpackages/ai-chat/index'
const SILENT_WECHAT_LOGIN_RETRY_COOLDOWN_MS = 5 * 60 * 1000

let lastSilentWechatLoginFailedAt = 0

export function createSessionId() {
	const stamp = Date.now().toString(36)
	const seed = Math.random().toString(36).slice(2, 8)
	return `ai-${stamp}-${seed}`
}

export function isPlainObject(value) {
	return Object.prototype.toString.call(value) === '[object Object]'
}

export function normalizeText(value, fallback = '') {
	const text = String(value ?? fallback).trim()
	return text || fallback
}

export function getResponseObject(rawResponse) {
	return Array.isArray(rawResponse) ? rawResponse[1] : rawResponse
}

export function getResponseStatusCode(rawResponse) {
	const response = getResponseObject(rawResponse)
	return Number(response && response.statusCode) || 0
}

export function getResponsePayload(rawResponse) {
	const response = getResponseObject(rawResponse)
	const body = response && response.data
	return isPlainObject(body) ? body : {}
}

export function unwrapPayloadData(payload) {
	if (!isPlainObject(payload)) return payload
	return payload.data !== undefined ? payload.data : payload
}

export function isJwtLikeToken(token) {
	return typeof token === 'string' && token.split('.').length === 3
}

export function maskToken(token) {
	const text = normalizeText(token, '')
	if (!text) return '空'
	if (text.length <= 16) return text
	return `${text.slice(0, 10)}...${text.slice(-6)}`
}

export function nowTimeText() {
	const now = new Date()
	const hh = String(now.getHours()).padStart(2, '0')
	const mm = String(now.getMinutes()).padStart(2, '0')
	const ss = String(now.getSeconds()).padStart(2, '0')
	return `${hh}:${mm}:${ss}`
}

export function getStoredValue(key, fallback = '') {
	try {
		const value = uni.getStorageSync(key)
		return value === undefined || value === null ? fallback : value
	} catch (error) {
		return fallback
	}
}

export function setStoredValue(key, value) {
	try {
		uni.setStorageSync(key, value)
	} catch (error) {
		console.warn('[ai-chat] set storage failed:', key, error)
	}
}

export function persistAuthSession(payload = {}) {
	const token = normalizeText(payload.accessToken || payload.access_token || payload.token, '')
	const refreshToken = normalizeText(payload.refreshToken, '')
	const userInfo = isPlainObject(payload.userInfo)
		? payload.userInfo
		: isPlainObject(payload.user)
			? payload.user
			: null
	const userId = normalizeText(
		payload.userId ||
		payload.uid ||
		(userInfo && (userInfo.uid || userInfo.userId || userInfo.user_id || userInfo.id || userInfo.username)),
		''
	)

	if (token) {
		setStoredValue('token', token)
		setStoredValue('accessToken', token)
	}

	if (refreshToken) {
		setStoredValue('refreshToken', refreshToken)
	}

	if (userId) {
		setStoredValue('userId', userId)
	}

	if (userInfo) {
		setStoredValue('userInfo', userInfo)
	}
}

export function getCurrentAuthToken() {
	return normalizeText(getCurrentUserToken(), '')
}

export function getStoredRefreshToken() {
	return normalizeText(getStoredValue('refreshToken'), '')
}

export function getStoredTokenByPriority() {
	const pairs = [
		{ key: 'token', value: normalizeText(getStoredValue('token'), '') },
		{ key: 'accessToken', value: normalizeText(getStoredValue('accessToken'), '') },
		{ key: 'uni_id_token', value: normalizeText(getStoredValue('uni_id_token'), '') }
	]

	for (let i = 0; i < pairs.length; i += 1) {
		if (pairs[i].value) return pairs[i]
	}

	return { key: 'none', value: '' }
}

export function hasStoredAuthEvidence() {
	const tokenEntry = getStoredTokenByPriority()
	if (tokenEntry.value) return true
	if (getStoredRefreshToken()) return true

	const rawUserId = normalizeText(getStoredValue('userId'), '')
	if (rawUserId) return true

	const rawUserInfo = getStoredValue('userInfo', {})
	if (isPlainObject(rawUserInfo)) {
		const profileUserId = normalizeText(
			rawUserInfo.uid || rawUserInfo.userId || rawUserInfo.user_id || rawUserInfo.id,
			''
		)
		if (profileUserId) return true
	}

	return false
}

export function extractDisplayUserInfo() {
	const rawUserInfo = getStoredValue('userInfo', {})
	const userInfo = isPlainObject(rawUserInfo) ? rawUserInfo : {}
	return {
		userId: normalizeText(
			userInfo.uid || userInfo.userId || userInfo.user_id || userInfo.id || getStoredValue('userId'),
			''
		),
		nickname: normalizeText(
			userInfo.nickname || userInfo.username || userInfo.nickName || userInfo.name,
			''
		),
		avatar: normalizeText(
			userInfo.avatar || userInfo.avatarUrl || userInfo.avatar_url || userInfo.headimgurl,
			''
		)
	}
}

export function extractPayloadMessage(payload) {
	if (!isPlainObject(payload)) return ''
	return normalizeText(payload.error || payload.message || payload.errMsg || payload.errorCode || payload.code, '')
}

export function hasAuthFailure(statusCode, payload) {
	const combined = [
		payload && payload.error,
		payload && payload.errorCode,
		payload && payload.code,
		payload && payload.message,
		payload && payload.errMsg
	]
		.map((item) => normalizeText(item, ''))
		.join(' ')

	if (statusCode === 401) return true
	if (statusCode === 403 && /token|登录|认证|Unauthorized|AUTH/i.test(combined)) return true
	return /token|登录|认证|Unauthorized|AUTH/i.test(combined)
}

export function shouldRetryAuthSilently(statusCode, payload) {
	const combined = [
		payload && payload.error,
		payload && payload.errorCode,
		payload && payload.code,
		payload && payload.message,
		payload && payload.errMsg
	]
		.map((item) => normalizeText(item, ''))
		.join(' ')

	if (statusCode === 401) return true
	return /token expired|token invalid|invalid token|jwt expired|jwt malformed|未提供认证令牌|token missing/i.test(combined)
}

export function hasPowerFailure(statusCode, payload) {
	const combined = [
		payload && payload.error,
		payload && payload.errorCode,
		payload && payload.code,
		payload && payload.message
	]
		.map((item) => normalizeText(item, ''))
		.join(' ')

	if (statusCode === 402) return true
	return /算力不足|点数不足|INSUFFICIENT_AI_POWER|AI_POWER_CHECK_FAILED/i.test(combined)
}

export function hasServiceFailure(statusCode, payload) {
	const combined = [
		payload && payload.error,
		payload && payload.errorCode,
		payload && payload.code,
		payload && payload.message,
		payload && payload.errMsg
	]
		.map((item) => normalizeText(item, ''))
		.join(' ')

	if (statusCode === 502 || statusCode === 503) return true
	return /CHAT_PROXY_FAILED|Bad Gateway|服务暂时不可用|聊天服务异常|proxy failed/i.test(combined)
}

export function isSuccessPayload(payload, response) {
	if (!payload) return false
	if (payload.ok === true) return true
	if (payload.code === 0) return true
	return getResponseStatusCode(response) === 200
}

export function buildRequestError(message, statusCode = 0, errorCode = '') {
	const error = new Error(normalizeText(message, '请求失败'))
	error.statusCode = Number(statusCode) || 0
	error.errorCode = normalizeText(errorCode, '')
	return error
}

export function requestRaw(url, method, data, token) {
	return new Promise((resolve, reject) => {
		uni.request({
			url,
			method,
			data,
			header: {
				'Content-Type': 'application/json',
				...(token ? { Authorization: `Bearer ${token}`, 'X-Access-Token': token } : {})
			},
			success: resolve,
			fail: reject
		})
	})
}

export async function refreshAuthToken() {
	const refreshToken = getStoredRefreshToken()
	if (!refreshToken) return ''

	try {
		const response = await requestRaw(`${getApiBaseUrl()}/auth/refresh`, 'POST', { refreshToken })
		const statusCode = getResponseStatusCode(response)
		const payload = getResponsePayload(response)
		const data = unwrapPayloadData(payload)
		const token = normalizeText(data && (data.accessToken || data.token), '')

		if (statusCode === 200 && token && isJwtLikeToken(token)) {
			persistAuthSession({
				accessToken: token,
				token,
				refreshToken: normalizeText(data && data.refreshToken, refreshToken),
				userInfo: data && data.userInfo
			})
			return token
		}
	} catch (error) {
		console.warn('[ai-chat] refresh auth failed:', error)
	}

	return ''
}

export async function exchangeWechatCodeForAiToken() {
	if (!hasStoredAuthEvidence()) {
		return ''
	}

	if (Date.now() - lastSilentWechatLoginFailedAt < SILENT_WECHAT_LOGIN_RETRY_COOLDOWN_MS) {
		return ''
	}

	return new Promise((resolve) => {
		if (!uni || typeof uni.login !== 'function') {
			resolve('')
			return
		}

		uni.login({
			provider: 'weixin',
			success: async (loginRes) => {
				const code = normalizeText(loginRes && loginRes.code, '')
				if (!code) {
					resolve('')
					return
				}

				try {
					const response = await requestRaw(`${getApiBaseUrl()}/auth/wechat-login`, 'POST', { code })
					const statusCode = getResponseStatusCode(response)
					const payload = getResponsePayload(response)
					const data = unwrapPayloadData(payload)
					const token = normalizeText(
						data && (data.accessToken || data.access_token || data.token),
						''
					)

					if (statusCode === 200 && token && isJwtLikeToken(token)) {
						lastSilentWechatLoginFailedAt = 0
						persistAuthSession({
							accessToken: token,
							token,
							refreshToken: normalizeText(data && data.refreshToken, ''),
							userInfo: data && (data.userInfo || data.user)
						})
						resolve(token)
						return
					}

					lastSilentWechatLoginFailedAt = Date.now()
				} catch (error) {
					lastSilentWechatLoginFailedAt = Date.now()
					console.warn('[ai-chat] exchange wechat code for AI token failed:', error)
				}

				resolve('')
			},
			fail: (error) => {
				lastSilentWechatLoginFailedAt = Date.now()
				console.warn('[ai-chat] uni.login failed during AI token exchange:', error)
				resolve('')
			}
		})
	})
}

export async function resolveActiveToken() {
	const token = getCurrentAuthToken()
	if (isJwtLikeToken(token)) return token

	const refreshedToken = await refreshAuthToken()
	if (isJwtLikeToken(refreshedToken)) return normalizeText(refreshedToken, '')

	const exchangedToken = await exchangeWechatCodeForAiToken()
	return normalizeText(exchangedToken, '')
}

export async function requestJsonWithRefresh({ url, method = 'GET', data, token = '' }) {
	let activeToken = normalizeText(token || getCurrentAuthToken(), '')

	const doRequest = async (nextToken) => requestRaw(url, method, data, nextToken)

	let response = await doRequest(activeToken)
	let payload = getResponsePayload(response)
	let statusCode = getResponseStatusCode(response)

	if (shouldRetryAuthSilently(statusCode, payload)) {
		const refreshedToken = await refreshAuthToken()
		if (refreshedToken && refreshedToken !== activeToken) {
			activeToken = refreshedToken
			response = await doRequest(activeToken)
			payload = getResponsePayload(response)
			statusCode = getResponseStatusCode(response)
		}

		if (shouldRetryAuthSilently(statusCode, payload)) {
			const exchangedToken = await exchangeWechatCodeForAiToken()
			if (exchangedToken && exchangedToken !== activeToken) {
				activeToken = exchangedToken
				response = await doRequest(activeToken)
				payload = getResponsePayload(response)
				statusCode = getResponseStatusCode(response)
			}
		}
	}

	return {
		response,
		payload,
		statusCode,
		token: activeToken
	}
}

export function getDailyNoticeKey() {
	const now = new Date()
	const year = now.getFullYear()
	const month = String(now.getMonth() + 1).padStart(2, '0')
	const day = String(now.getDate()).padStart(2, '0')
	return `${DAILY_NOTICE_KEY_PREFIX}${year}-${month}-${day}`
}
