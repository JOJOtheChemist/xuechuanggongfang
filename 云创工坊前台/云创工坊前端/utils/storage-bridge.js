const STORAGE_BRIDGE_DELAY = 500
const STORAGE_RETRY_DELAY = 120
const storageBridgeUnlockedAt = isWeixinMiniProgram() ? Date.now() + STORAGE_BRIDGE_DELAY : 0

function isWeixinMiniProgram() {
	return typeof wx !== 'undefined' && typeof wx.getSystemInfo === 'function'
}

function delay(ms) {
	return new Promise((resolve) => {
		setTimeout(resolve, ms)
	})
}

function isTooEarlyStorageError(error) {
	const message = String(
		(error && (error.errMsg || error.message || error.errorMessage))
		|| ''
	).toLowerCase()

	return message.indexOf('too early') !== -1 || message.indexOf('too eayly') !== -1
}

export function isStorageBridgeReady() {
	return !storageBridgeUnlockedAt || Date.now() >= storageBridgeUnlockedAt
}

export async function waitForStorageBridgeReady() {
	if (isStorageBridgeReady()) return

	const remaining = storageBridgeUnlockedAt - Date.now()
	if (remaining > 0) {
		await delay(remaining)
	}
}

async function runStorageOperation(operation) {
	await waitForStorageBridgeReady()

	try {
		return operation()
	} catch (error) {
		if (!isTooEarlyStorageError(error)) {
			throw error
		}

		await delay(STORAGE_RETRY_DELAY)
		return operation()
	}
}

export async function readStorageSync(key, fallback = '') {
	if (typeof uni === 'undefined' || typeof uni.getStorageSync !== 'function') {
		return fallback
	}

	try {
		const value = await runStorageOperation(() => uni.getStorageSync(key))
		return value === undefined || value === null || value === '' ? fallback : value
	} catch (error) {
		if (!isTooEarlyStorageError(error)) {
			console.warn('[storage-bridge] 读取缓存失败', key, error)
		}

		return fallback
	}
}

export async function writeStorageSync(key, value) {
	if (typeof uni === 'undefined' || typeof uni.setStorageSync !== 'function') {
		return false
	}

	try {
		await runStorageOperation(() => uni.setStorageSync(key, value))
		return true
	} catch (error) {
		if (!isTooEarlyStorageError(error)) {
			console.warn('[storage-bridge] 写入缓存失败', key, error)
		}

		return false
	}
}

export async function removeStorageSync(key) {
	if (typeof uni === 'undefined' || typeof uni.removeStorageSync !== 'function') {
		return false
	}

	try {
		await runStorageOperation(() => uni.removeStorageSync(key))
		return true
	} catch (error) {
		if (!isTooEarlyStorageError(error)) {
			console.warn('[storage-bridge] 删除缓存失败', key, error)
		}

		return false
	}
}
