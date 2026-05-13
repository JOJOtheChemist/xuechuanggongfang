const IMAGE_CACHE_STORAGE_KEY = 'remote_image_cache_v1'
const IMAGE_CACHE_TTL = 30 * 24 * 60 * 60 * 1000
const IMAGE_CACHE_MAX_ENTRIES = 40
const pendingImageTasks = {}

function callUniApi(methodName, options) {
	return new Promise((resolve, reject) => {
		if (typeof uni === 'undefined' || typeof uni[methodName] !== 'function') {
			reject(new Error(`uni.${methodName} is not available`))
			return
		}

		uni[methodName](Object.assign({}, options, {
			success: resolve,
			fail: reject
		}))
	})
}

function isRemoteImageUrl(url) {
	return typeof url === 'string' && /^https?:\/\//i.test(url)
}

function readImageCache() {
	try {
		const cache = uni.getStorageSync(IMAGE_CACHE_STORAGE_KEY)
		return cache && typeof cache === 'object' ? cache : {}
	} catch (error) {
		console.warn('[image-cache] 读取缓存失败', error)
		return {}
	}
}

function writeImageCache(cache) {
	try {
		uni.setStorageSync(IMAGE_CACHE_STORAGE_KEY, cache)
	} catch (error) {
		console.warn('[image-cache] 写入缓存失败', error)
	}
}

function isCacheEntryExpired(entry) {
	if (!entry || !entry.localPath) return true
	return Number(entry.expiresAt || 0) <= Date.now()
}

function removeSavedFile(filePath) {
	if (!filePath || typeof uni.removeSavedFile !== 'function') return
	if (isRemoteImageUrl(filePath)) return

	uni.removeSavedFile({
		filePath,
		fail(error) {
			console.warn('[image-cache] 删除旧缓存文件失败', error)
		}
	})
}

function pruneImageCache(cache, preservedUrl) {
	const now = Date.now()
	const keys = Object.keys(cache)
	const expiredKeys = []

	for (let i = 0; i < keys.length; i += 1) {
		const key = keys[i]
		if (key === preservedUrl) continue
		if (Number(cache[key] && cache[key].expiresAt) <= now) {
			expiredKeys.push(key)
		}
	}

	for (let i = 0; i < expiredKeys.length; i += 1) {
		const key = expiredKeys[i]
		removeSavedFile(cache[key] && cache[key].localPath)
		delete cache[key]
	}

	const remainingKeys = Object.keys(cache)
	if (remainingKeys.length <= IMAGE_CACHE_MAX_ENTRIES) return

	const removableKeys = remainingKeys
		.filter(key => key !== preservedUrl)
		.sort((leftKey, rightKey) => {
			const leftTime = Number(cache[leftKey] && cache[leftKey].lastAccessedAt) || 0
			const rightTime = Number(cache[rightKey] && cache[rightKey].lastAccessedAt) || 0
			return leftTime - rightTime
		})

	const overflowCount = remainingKeys.length - IMAGE_CACHE_MAX_ENTRIES
	for (let i = 0; i < overflowCount && i < removableKeys.length; i += 1) {
		const key = removableKeys[i]
		removeSavedFile(cache[key] && cache[key].localPath)
		delete cache[key]
	}
}

async function ensureLocalPathAvailable(localPath) {
	if (!localPath || isRemoteImageUrl(localPath)) return ''
	if (typeof uni.getSavedFileInfo !== 'function') return localPath

	try {
		await callUniApi('getSavedFileInfo', { filePath: localPath })
		return localPath
	} catch (error) {
		return ''
	}
}

async function persistRemoteImage(url) {
	try {
		const downloadResult = await callUniApi('downloadFile', { url })
		const statusCode = Number(downloadResult && downloadResult.statusCode) || 0
		if (statusCode && (statusCode < 200 || statusCode >= 300)) {
			return url
		}

		const tempFilePath = downloadResult && downloadResult.tempFilePath
		if (!tempFilePath) return url

		let localPath = tempFilePath

		if (typeof uni.saveFile === 'function') {
			try {
				const saveResult = await callUniApi('saveFile', { tempFilePath })
				localPath = saveResult && saveResult.savedFilePath ? saveResult.savedFilePath : tempFilePath
			} catch (error) {
				console.warn('[image-cache] 保存图片到本地失败，继续使用临时文件', error)
			}
		}

		const now = Date.now()
		const cache = readImageCache()
		cache[url] = {
			url,
			localPath,
			cachedAt: now,
			lastAccessedAt: now,
			expiresAt: now + IMAGE_CACHE_TTL
		}
		pruneImageCache(cache, url)
		writeImageCache(cache)

		return localPath
	} catch (error) {
		console.warn('[image-cache] 下载图片失败', error)
		return url
	}
}

export function getCachedImageSync(url) {
	if (!isRemoteImageUrl(url)) return url || ''

	const cache = readImageCache()
	const entry = cache[url]
	if (isCacheEntryExpired(entry)) return url

	return entry.localPath || url
}

export async function resolveCachedImage(url, options = {}) {
	if (!isRemoteImageUrl(url)) return url || ''
	if (typeof uni === 'undefined' || typeof uni.downloadFile !== 'function') return url

	const forceRefresh = !!options.forceRefresh
	const cache = readImageCache()
	const entry = cache[url]

	if (!forceRefresh && !isCacheEntryExpired(entry)) {
		const localPath = await ensureLocalPathAvailable(entry.localPath)
		if (localPath) {
			cache[url] = Object.assign({}, entry, {
				localPath,
				lastAccessedAt: Date.now()
			})
			writeImageCache(cache)
			return localPath
		}

		delete cache[url]
		writeImageCache(cache)
	}

	if (!pendingImageTasks[url]) {
		pendingImageTasks[url] = persistRemoteImage(url).finally(() => {
			delete pendingImageTasks[url]
		})
	}

	return pendingImageTasks[url]
}

export async function resolveCachedImages(urls, options = {}) {
	const list = Array.isArray(urls) ? urls : []
	if (!list.length) return []

	const results = await Promise.all(
		list.map(url => resolveCachedImage(url, options))
	)

	return results
}
