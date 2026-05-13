import { getHttpService } from './api-switch'

export { getHttpService }

const HTTP_AUTH_STORAGE_KEYS = [
	'token',
	'accessToken',
	'refreshToken',
	'uni_id_token',
	'uni_id_token_expired'
]

function getStorageValue(key, fallback) {
	try {
		const value = uni.getStorageSync(key)
		return value === undefined || value === null || value === '' ? fallback : value
	} catch (error) {
		return fallback
	}
}

function removeStorageValue(key) {
	try {
		uni.removeStorageSync(key)
	} catch (error) {
		return
	}
}

export function isJwtLikeToken(token) {
	return typeof token === 'string' && token.split('.').length === 3
}

function clearInvalidHttpTokens() {
	HTTP_AUTH_STORAGE_KEYS.forEach(removeStorageValue)
}

export function getCurrentUserToken() {
	const token = (
		getStorageValue('token', '') ||
		getStorageValue('accessToken', '') ||
		getStorageValue('uni_id_token', '') ||
		''
	)

	if (!token) return ''
	if (isJwtLikeToken(token)) return token

	clearInvalidHttpTokens()
	return ''
}

export function normalizeUserInfo(userInfo = {}) {
	const source = userInfo && typeof userInfo === 'object' ? userInfo : {}
	const uid =
		source.uid ||
		source.userId ||
		source.user_id ||
		source.id ||
		getStorageValue('userId', '')
	const token = source.token || getCurrentUserToken()

	return Object.assign({}, source, {
		uid,
		userId: source.userId || source.user_id || source.id || uid,
		token,
		nickname: source.nickname || source.nickName || source.name || source.username || '',
		username: source.username || source.nickname || source.nickName || source.name || '',
		avatar: source.avatar || source.avatarUrl || source.avatar_url || source.headimgurl || '',
		inviter_uid: source.inviter_uid || source.inviterUserId || ''
	})
}

export function getCurrentUserInfo() {
	const userInfo = getStorageValue('userInfo', {}) || {}
	const userId = getStorageValue(
		'userId',
		userInfo.uid || userInfo.userId || userInfo.user_id || userInfo.id || ''
	)

	return normalizeUserInfo(Object.assign({}, userInfo, {
		uid: userInfo.uid || userInfo.user_id || userId,
		userId: userInfo.userId || userInfo.user_id || userInfo.id || userId
	}))
}
