const TEAM_DYNAMICS_CACHE_PREFIX = '__team_dynamics_cache__'

function normalizeText(value) {
	return String(value || '').trim()
}

function readStorage(key) {
	try {
		if (typeof uni !== 'undefined' && typeof uni.getStorageSync === 'function') {
			return uni.getStorageSync(key)
		}
	} catch (error) {
		console.warn('[team-dynamics-cache] 读取缓存失败', key, error)
	}
	return null
}

function writeStorage(key, value) {
	try {
		if (typeof uni !== 'undefined' && typeof uni.setStorageSync === 'function') {
			uni.setStorageSync(key, value)
			return true
		}
	} catch (error) {
		console.warn('[team-dynamics-cache] 写入缓存失败', key, error)
	}
	return false
}

function removeStorage(key) {
	try {
		if (typeof uni !== 'undefined' && typeof uni.removeStorageSync === 'function') {
			uni.removeStorageSync(key)
			return true
		}
	} catch (error) {
		console.warn('[team-dynamics-cache] 删除缓存失败', key, error)
	}
	return false
}

function isObject(value) {
	return !!value && typeof value === 'object' && !Array.isArray(value)
}

function resolveCurrentUserId() {
	const cachedUser = uni.getStorageSync('userInfo') || {}
	return normalizeText(
		uni.getStorageSync('userId') ||
		uni.getStorageSync('user_id') ||
		cachedUser.id ||
		cachedUser.uid ||
		cachedUser._id ||
		cachedUser.user_id
	)
}

function getScopedCacheKey() {
	const userId = resolveCurrentUserId()
	return userId ? `${TEAM_DYNAMICS_CACHE_PREFIX}:${userId}` : ''
}

function normalizeCachedPayload(rawPayload) {
	if (!isObject(rawPayload)) return null

	const listSource = Array.isArray(rawPayload.list)
		? rawPayload.list
		: (Array.isArray(rawPayload.data) ? rawPayload.data : null)
	if (!listSource) return null

	const fetchedLimit = Math.max(
		0,
		Number(rawPayload.fetched_limit || rawPayload.fetchedLimit || listSource.length) || 0
	)

	return {
		list: listSource.filter(item => item && typeof item === 'object'),
		fetchedLimit,
		updatedAt: normalizeText(rawPayload.updated_at || rawPayload.updatedAt)
	}
}

export function loadCachedTeamDynamics(options = {}) {
	const config = isObject(options) ? options : {}
	const minLimit = Math.max(0, Number(config.minLimit || 0) || 0)
	const allowPartial = config.allowPartial === true
	const cacheKey = getScopedCacheKey()
	if (!cacheKey) return null

	const payload = normalizeCachedPayload(readStorage(cacheKey))
	if (!payload) return null
	if (!allowPartial && minLimit > 0 && payload.fetchedLimit < minLimit) return null
	return payload
}

export function saveCachedTeamDynamics(list = [], options = {}) {
	const cacheKey = getScopedCacheKey()
	if (!cacheKey) return false

	const normalizedList = Array.isArray(list)
		? list.filter(item => item && typeof item === 'object')
		: []
	const config = isObject(options) ? options : {}

	return writeStorage(cacheKey, {
		list: normalizedList,
		fetched_limit: Math.max(
			normalizedList.length,
			Number(config.fetchedLimit || config.limit || normalizedList.length) || 0
		),
		updated_at: normalizeText(config.updatedAt) || new Date().toISOString()
	})
}

export function clearCachedTeamDynamics() {
	const cacheKey = getScopedCacheKey()
	if (!cacheKey) return false
	return removeStorage(cacheKey)
}
