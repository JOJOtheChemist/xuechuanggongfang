import cloudStaticAssetManifest from './cloud-static-assets.manifest.js'

const manifest = cloudStaticAssetManifest && typeof cloudStaticAssetManifest === 'object'
	? cloudStaticAssetManifest
	: {}

export function getStaticAssetUrl(localPath) {
	const normalizedPath = typeof localPath === 'string' ? localPath.trim() : ''
	if (!normalizedPath) {
		return ''
	}
	if (/^https?:\/\//.test(normalizedPath)) {
		return normalizedPath
	}

	const cloudUrl = manifest[normalizedPath]
	return typeof cloudUrl === 'string' && /^https?:\/\//.test(cloudUrl)
		? cloudUrl
		: normalizedPath
}

export const DEFAULT_AVATAR_URL = getStaticAssetUrl('/static/icons/default-avatar.svg')
export const BELL_ICON_URL = getStaticAssetUrl('/static/icons/bell.svg')
export const HOT_CREATIVE_ICON_URL = getStaticAssetUrl('/static/icons/hot-creative.svg')
export const HOT_LEARNING_ICON_URL = getStaticAssetUrl('/static/icons/hot-learning.svg')
export const HOT_ACTIVITY_ICON_URL = getStaticAssetUrl('/static/icons/hot-activity.svg')
export const NAV_PLUS_ICON_URL = getStaticAssetUrl('/static/icons/nav-plus.svg')
export const STATS_USERS_ICON_URL = getStaticAssetUrl('/static/icons/stats-users.svg')
export const STATS_ORDERS_ICON_URL = getStaticAssetUrl('/static/icons/stats-orders.svg')
export const FORUM_LIKE_ICON_URL = getStaticAssetUrl('/static/forum/like.png')
export const FORUM_LIKE_ACTIVE_ICON_URL = getStaticAssetUrl('/static/forum/like-active.png')

export const TABBAR_ICON_URLS = Object.freeze({
	forum: getStaticAssetUrl('/static/tabbar/nav-forum-source.png'),
	business: getStaticAssetUrl('/static/tabbar/nav-study-source.png'),
	volunteer: getStaticAssetUrl('/static/tabbar/nav-volunteer-source.png'),
	tasks: getStaticAssetUrl('/static/tabbar/nav-startup-source.png'),
	profile: getStaticAssetUrl('/static/tabbar/nav-profile-source.png')
})
