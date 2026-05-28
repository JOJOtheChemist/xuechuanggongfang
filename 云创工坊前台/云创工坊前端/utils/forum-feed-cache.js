const FORUM_FEED_CACHE_PREFIX = '__forum_feed_cache__'
const FORUM_FEED_STATE_CACHE_KEY = '__forum_feed_state_cache__'

function normalizeText(value) {
	return String(value || '').trim()
}

function readStorage(key) {
	try {
		if (typeof uni !== 'undefined' && typeof uni.getStorageSync === 'function') {
			return uni.getStorageSync(key)
		}
	} catch (error) {
		console.warn('[forum-feed-cache] 读取缓存失败', key, error)
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
		console.warn('[forum-feed-cache] 写入缓存失败', key, error)
	}
	return false
}

function isObject(value) {
	return !!value && typeof value === 'object' && !Array.isArray(value)
}

function resolveCurrentUserScope() {
	const cachedUser = (typeof uni !== 'undefined' && uni.getStorageSync('userInfo')) || {}
	return normalizeText(
		(typeof uni !== 'undefined' && uni.getStorageSync('userId')) ||
		(typeof uni !== 'undefined' && uni.getStorageSync('user_id')) ||
		cachedUser.id ||
		cachedUser.uid ||
		cachedUser._id ||
		cachedUser.user_id ||
		'guest'
	) || 'guest'
}

function normalizeTab(value) {
	return String(value || '').trim() === 'hot' ? 'hot' : 'local'
}

function normalizeSchool(value) {
	return normalizeText(value)
}

function normalizeMineOnly(value) {
	if (value === true || value === 'true' || value === 1 || value === '1') return true
	return false
}

function getMineOnlyValue(source = {}) {
	if (!isObject(source)) return false
	if (Object.prototype.hasOwnProperty.call(source, 'mineOnly')) {
		return normalizeMineOnly(source.mineOnly)
	}
	if (Object.prototype.hasOwnProperty.call(source, 'mine_only')) {
		return normalizeMineOnly(source.mine_only)
	}
	return false
}

function getFeedStateCacheKey() {
	return `${FORUM_FEED_STATE_CACHE_KEY}:${resolveCurrentUserScope()}`
}

function getFeedListCacheKey(options = {}) {
	const config = isObject(options) ? options : {}
	const tab = normalizeTab(config.activeTab || config.tab)
	const school = tab === 'local' ? normalizeSchool(config.currentSchool || config.school) : 'all'
	const mineOnly = getMineOnlyValue(config)
	const pageSize = Math.max(1, Number(config.pageSize || config.page_size || 10) || 10)
	return `${FORUM_FEED_CACHE_PREFIX}:${resolveCurrentUserScope()}:${tab}:${school || 'all'}:${mineOnly ? 'mine' : 'all'}:${pageSize}`
}

function normalizeFeedState(rawState) {
	if (!isObject(rawState)) return null

	const activeTab = normalizeTab(rawState.activeTab || rawState.tab)
	return {
		activeTab,
		currentSchool: activeTab === 'local' ? normalizeSchool(rawState.currentSchool || rawState.school) : '',
		mineOnly: getMineOnlyValue(rawState),
		updatedAt: normalizeText(rawState.updatedAt || rawState.updated_at)
	}
}

function normalizeFeedListPayload(rawPayload) {
	if (!isObject(rawPayload)) return null

	const listSource = Array.isArray(rawPayload.list)
		? rawPayload.list
		: (Array.isArray(rawPayload.data) ? rawPayload.data : null)
	if (!listSource) return null

	const activeTab = normalizeTab(rawPayload.activeTab || rawPayload.tab)
	return {
		list: listSource.filter(item => item && typeof item === 'object'),
		activeTab,
		currentSchool: activeTab === 'local' ? normalizeSchool(rawPayload.currentSchool || rawPayload.school) : '',
		mineOnly: getMineOnlyValue(rawPayload),
		page: Math.max(1, Number(rawPayload.page || 1) || 1),
		pageSize: Math.max(1, Number(rawPayload.pageSize || rawPayload.page_size || listSource.length || 10) || 10),
		hasMore: Boolean(rawPayload.hasMore ?? rawPayload.has_more),
		updatedAt: normalizeText(rawPayload.updatedAt || rawPayload.updated_at)
	}
}

export function loadCachedForumFeedState() {
	return normalizeFeedState(readStorage(getFeedStateCacheKey()))
}

export function saveCachedForumFeedState(state = {}) {
	const config = isObject(state) ? state : {}
	const activeTab = normalizeTab(config.activeTab || config.tab)
	const currentSchool = activeTab === 'local' ? normalizeSchool(config.currentSchool || config.school) : ''
	const mineOnly = getMineOnlyValue(config)

	return writeStorage(getFeedStateCacheKey(), {
		activeTab,
		currentSchool,
		mineOnly,
		updatedAt: new Date().toISOString()
	})
}

export function loadCachedForumPostList(options = {}) {
	return normalizeFeedListPayload(readStorage(getFeedListCacheKey(options)))
}

export function saveCachedForumPostList(list = [], options = {}) {
	const config = isObject(options) ? options : {}
	const activeTab = normalizeTab(config.activeTab || config.tab)
	const currentSchool = activeTab === 'local' ? normalizeSchool(config.currentSchool || config.school) : ''
	const mineOnly = getMineOnlyValue(config)
	const normalizedList = Array.isArray(list)
		? list.filter(item => item && typeof item === 'object')
		: []

	return writeStorage(getFeedListCacheKey(config), {
		list: normalizedList,
		activeTab,
		currentSchool,
		mine_only: mineOnly,
		page: Math.max(1, Number(config.page || 1) || 1),
		pageSize: Math.max(1, Number(config.pageSize || config.page_size || normalizedList.length || 10) || 10),
		has_more: Boolean(config.hasMore),
		updated_at: new Date().toISOString()
	})
}
