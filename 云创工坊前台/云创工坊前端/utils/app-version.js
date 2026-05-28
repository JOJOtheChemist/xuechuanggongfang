import {
	getCurrentUserInfo,
	getCurrentUserToken,
	getHttpService,
	normalizeUserInfo
} from './http-services'

export const CURRENT_APP_VERSION = '4.9'
export const DEFAULT_UPDATE_GUIDE_PATH = '/subpackages/app-update/index'
export const DEFAULT_UPDATE_TIP = '请及时更新'
export const DEFAULT_UPDATE_BANNER_URL = 'https://xuechuang.xyz/oss/share-assets/xuechuang/startup/banner/startup-banner-20260417-v1.jpg'

function normalizeText(value) {
	return String(value || '').trim()
}

function parseVersionParts(version) {
	return String(version || '')
		.split('.')
		.map((item) => Number(String(item || '').trim()))
		.filter((item) => Number.isFinite(item))
}

export function compareAppVersions(currentVersion, latestVersion) {
	const currentParts = parseVersionParts(currentVersion)
	const latestParts = parseVersionParts(latestVersion)
	const maxLength = Math.max(currentParts.length, latestParts.length)

	for (let index = 0; index < maxLength; index += 1) {
		const current = currentParts[index] || 0
		const latest = latestParts[index] || 0
		if (current < latest) return -1
		if (current > latest) return 1
	}

	return 0
}

export function shouldShowUpdateHint(currentVersion, latestVersion) {
	return compareAppVersions(currentVersion, latestVersion) < 0
}

export function buildDefaultAppVersionInfo(overrides = {}) {
	return Object.assign({
		currentVersion: CURRENT_APP_VERSION,
		latestVersion: CURRENT_APP_VERSION,
		updateTip: DEFAULT_UPDATE_TIP,
		updateGuidePath: DEFAULT_UPDATE_GUIDE_PATH,
		bannerUrl: DEFAULT_UPDATE_BANNER_URL
	}, overrides || {})
}

export function extractAppVersionInfo(source = {}) {
	const root = source && typeof source === 'object' ? source : {}
	const nestedCandidates = [
		root.app_version,
		root.appVersion,
		root.version_info,
		root.versionInfo,
		root.latest_app_version,
		root.latestAppVersion,
		root
	]

	for (let index = 0; index < nestedCandidates.length; index += 1) {
		const item = nestedCandidates[index]
		if (!item || typeof item !== 'object') continue

		const currentVersion = normalizeText(
			item.current_version
			|| item.currentVersion
			|| item.current_app_version
			|| item.currentAppVersion
		)

		const latestVersion = normalizeText(
			item.latest_version
			|| item.latestVersion
			|| item.version
			|| item.version_name
			|| item.versionName
		)

		const updateTip = normalizeText(
			item.update_tip
			|| item.updateTip
			|| item.tip
			|| item.message
		)

		const updateGuidePath = normalizeText(
			item.update_guide_path
			|| item.updateGuidePath
			|| item.path
		)

		const bannerUrl = normalizeText(
			item.update_banner_url
			|| item.updateBannerUrl
			|| item.banner_url
			|| item.bannerUrl
			|| item.image_url
			|| item.imageUrl
		)

		if (currentVersion || latestVersion || updateTip || updateGuidePath || bannerUrl) {
			return buildDefaultAppVersionInfo({
				currentVersion: currentVersion || CURRENT_APP_VERSION,
				latestVersion: latestVersion || CURRENT_APP_VERSION,
				updateTip: updateTip || DEFAULT_UPDATE_TIP,
				updateGuidePath: updateGuidePath || DEFAULT_UPDATE_GUIDE_PATH,
				bannerUrl: bannerUrl || DEFAULT_UPDATE_BANNER_URL
			})
		}
	}

	return buildDefaultAppVersionInfo()
}

export function readCachedAppVersionInfo() {
	return extractAppVersionInfo(getCurrentUserInfo())
}

export async function fetchStartupBannerUrl() {
	try {
		const dashboardService = getHttpService('dashboard-service')
		const res = await dashboardService.getBanners({ limit: 10 })
		const bannerList = Array.isArray(res && res.data)
			? res.data
			: Array.isArray(res && res.data && res.data.list)
				? res.data.list
				: []

		const startupBanner = bannerList.find((item) => {
			if (!item || typeof item !== 'object') return false
			const position = normalizeText(item.position)
			const imageUrl = normalizeText(item.image_url || item.imageUrl)
			return position === 'startup' && imageUrl
		})

		return normalizeText(
			startupBanner && (startupBanner.image_url || startupBanner.imageUrl)
		) || DEFAULT_UPDATE_BANNER_URL
	} catch (error) {
		console.warn('[app-version] fetch startup banner failed', error)
		return DEFAULT_UPDATE_BANNER_URL
	}
}

export async function fetchRemoteAppVersionInfo() {
	const token = getCurrentUserToken()
	const startupBannerUrl = await fetchStartupBannerUrl()
	if (!token) {
		return Object.assign({}, readCachedAppVersionInfo(), {
			bannerUrl: startupBannerUrl || DEFAULT_UPDATE_BANNER_URL
		})
	}

	try {
		const userCenter = getHttpService('user-center')
		const res = await userCenter.getUserInfo({ _token: token })
		if (res && res.code === 0 && res.data) {
			const latestUserInfo = normalizeUserInfo(res.data)
			uni.setStorageSync('userInfo', latestUserInfo)
			return Object.assign({}, extractAppVersionInfo(latestUserInfo), {
				bannerUrl: startupBannerUrl || DEFAULT_UPDATE_BANNER_URL
			})
		}
	} catch (error) {
		console.warn('[app-version] fetch remote app version failed', error)
	}

	return Object.assign({}, readCachedAppVersionInfo(), {
		bannerUrl: startupBannerUrl || DEFAULT_UPDATE_BANNER_URL
	})
}
