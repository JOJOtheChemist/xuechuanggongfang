import { getHttpService } from './http-services'
function getToken(token) {
	const resolved = token || uni.getStorageSync('token')
	if (!resolved) {
		throw new Error('请先登录')
	}
	return resolved
}

function sanitizeFileName(fileName) {
	return String(fileName || 'upload.jpg').replace(/[\\/]/g, '_')
}

function buildFileName(filePath, fallbackPrefix = 'upload-image') {
	const cleanPath = String(filePath || '').split('?')[0]
	let fileName = cleanPath.split('/').pop() || ''

	try {
		fileName = decodeURIComponent(fileName)
	} catch (error) {
		fileName = fileName || ''
	}

	if (/\.(jpe?g|png|webp|gif)$/i.test(fileName)) {
		return sanitizeFileName(fileName)
	}

	return `${fallbackPrefix}-${Date.now()}.jpg`
}

function inferImageContentType(fileName) {
	const safeName = String(fileName || '').toLowerCase()
	if (safeName.endsWith('.png')) return 'image/png'
	if (safeName.endsWith('.webp')) return 'image/webp'
	if (safeName.endsWith('.gif')) return 'image/gif'
	return 'image/jpeg'
}

function getLocalFileInfo(filePath) {
	return new Promise((resolve, reject) => {
		uni.getFileInfo({
			filePath,
			success: resolve,
			fail: reject
		})
	})
}

function readLocalFile(filePath) {
	return new Promise((resolve, reject) => {
		const fileManager = typeof uni.getFileSystemManager === 'function'
			? uni.getFileSystemManager()
			: typeof wx !== 'undefined' && typeof wx.getFileSystemManager === 'function'
				? wx.getFileSystemManager()
				: null

		if (!fileManager || typeof fileManager.readFile !== 'function') {
			reject(new Error('当前平台不支持读取本地文件'))
			return
		}

		fileManager.readFile({
			filePath,
			success: (res) => resolve(res.data),
			fail: reject
		})
	})
}

function uploadPresignedFile(uploadInfo, fileBuffer, contentType) {
	return new Promise((resolve, reject) => {
		const uploadUrl = uploadInfo && (uploadInfo.upload_url || uploadInfo.uploadUrl)
		if (!uploadUrl) {
			reject(new Error('后端未返回上传地址'))
			return
		}

		const headers = Object.assign({}, uploadInfo.headers || {})
		if (!headers['Content-Type'] && !headers['content-type']) {
			headers['Content-Type'] = contentType
		}

		uni.request({
			url: uploadUrl,
			method: uploadInfo.method || 'PUT',
			data: fileBuffer,
			header: headers,
			success: (res) => {
				const statusCode = Number(res && res.statusCode) || 0
				if (statusCode >= 200 && statusCode < 300) {
					resolve(res)
					return
				}
				reject(new Error(`上传失败（${statusCode}）`))
			},
			fail: reject
		})
	})
}

function extractUploadedFileUrl(uploadInfo) {
	const file = uploadInfo && uploadInfo.file ? uploadInfo.file : {}
	return (
		file.public_url
		|| file.publicUrl
		|| (uploadInfo && uploadInfo.public_url)
		|| (uploadInfo && uploadInfo.publicUrl)
		|| ''
	)
}

export async function uploadImageWithPresign(options = {}) {
	const filePath = String(options.filePath || '').trim()
	if (!filePath) {
		throw new Error('filePath 不能为空')
	}

	const token = getToken(options.token)
	const fileName = sanitizeFileName(options.fileName || buildFileName(filePath, options.fileNamePrefix || 'upload-image'))
	const fileInfo = await getLocalFileInfo(filePath)
	const fileSize = Number(fileInfo && fileInfo.size) || 0

	if (!fileSize) {
		throw new Error('无法读取文件大小')
	}

	const contentType = options.contentType || inferImageContentType(fileName)
	const storageService = getHttpService('storage-service')
	const presignRes = await storageService.createUploadPresign({
		_token: token,
		scene: options.scene || 'forum-post-image',
		fileName,
		contentType,
		fileSize
	})

	if (!presignRes || presignRes.code !== 0 || !presignRes.data) {
		throw new Error((presignRes && presignRes.message) || '创建上传地址失败')
	}

	const fileBuffer = await readLocalFile(filePath)
	await uploadPresignedFile(presignRes.data, fileBuffer, contentType)

	const url = extractUploadedFileUrl(presignRes.data)
	if (!url) {
		throw new Error('上传成功但未返回文件地址')
	}

	return {
		url,
		fileName,
		fileSize,
		contentType,
		upload: presignRes.data
	}
}
